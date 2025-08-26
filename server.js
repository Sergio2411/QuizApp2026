// -----------------------------------------------------------------------------
// SERVIDOR LIGERO PARA APLICACIÓN DE QUIZZES (VERSIÓN 4.0 con Persistencia)
// Autor: Gemini
// Fecha: 20/08/2025
//
// Descripción:
// Esta versión no tiene cambios mayores en el servidor, ya que la persistencia
// se maneja en el lado del cliente. Se han mejorado los mensajes de error
// para dar un mejor soporte a la lógica de reanudación de sesión del cliente.
// -----------------------------------------------------------------------------

// --- 1. IMPORTACIÓN DE MÓDULOS ---
const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

// --- 2. CONFIGURACIÓN INICIAL ---
const app = express();
const PORT = 3000;
const ADMIN_PASSWORD = "admin"; // ¡IMPORTANTE! Cambia esta contraseña

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// --- 3. ESTADO DEL SERVIDOR (en memoria) ---
let activeQuiz = {
    code: null,
    quizData: null,
    studentData: new Map()
};

// --- 4. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- 5. LÓGICA DE WEBSOCKET (sin cambios) ---
wss.on('connection', (ws) => {
    console.log('Un administrador se ha conectado al ranking.');
    ws.send(JSON.stringify({ type: 'ranking_update', payload: getRanking() }));
    ws.on('close', () => console.log('Un administrador se ha desconectado.'));
});

function broadcastRanking() {
    const rankingData = { type: 'ranking_update', payload: getRanking() };
    const rankingString = JSON.stringify(rankingData);
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(rankingString);
        }
    });
}

function getRanking() {
    return Array.from(activeQuiz.studentData.values()).sort((a, b) => b.score - a.score);
}

// --- 6. FUNCIONES AUXILIARES (sin cambios) ---
function loadQuizData() {
    fs.readFile(path.join(__dirname, 'quiz.json'), 'utf8', (err, data) => {
        if (err) { console.error("FATAL: No se pudo cargar 'quiz.json'.", err); activeQuiz.quizData = null; return; }
        try {
            activeQuiz.quizData = JSON.parse(data);
            console.log(`Quiz '${activeQuiz.quizData.title}' cargado.`);
        } catch (e) { console.error("FATAL: 'quiz.json' tiene un formato incorrecto.", e); activeQuiz.quizData = null; }
    });
}

// --- 7. RUTAS DE LA API ---

// --- Rutas de Admin (sin cambios) ---
app.post('/api/admin/start-quiz', (req, res) => {
    if (!activeQuiz.quizData) return res.status(500).json({ error: 'No hay un quiz cargado.' });
    activeQuiz.studentData.clear();
    activeQuiz.code = Math.floor(1000 + Math.random() * 9000).toString();
    console.log(`Examen iniciado. Código: ${activeQuiz.code}`);
    broadcastRanking();
    res.status(200).json({ success: true, code: activeQuiz.code, title: activeQuiz.quizData.title });
});
app.post('/api/admin/stop-quiz', (req, res) => { console.log(`Examen detenido. Código ${activeQuiz.code} invalidado.`); activeQuiz.code = null; broadcastRanking(); res.status(200).json({ success: true, message: 'Examen detenido.' }); });
app.post('/api/admin/login', (req, res) => { const { password } = req.body; if (password === ADMIN_PASSWORD) { res.status(200).json({ success: true }); } else { res.status(401).json({ success: false, message: 'Contraseña incorrecta.' }); } });
app.get('/api/admin/status', (req, res) => { res.json({ isQuizActive: activeQuiz.code !== null, activeCode: activeQuiz.code, quizTitle: activeQuiz.quizData ? activeQuiz.quizData.title : "N/A" }); });
app.get('/api/admin/download-results', (req, res) => { const filePath = path.join(__dirname, 'results.csv'); res.download(filePath, 'results.csv', (err) => { if (err) { if (err.code === "ENOENT") { res.status(404).send("Aún no hay resultados."); } else { res.status(500).send("No se pudo descargar."); } } }); });

// --- Rutas de Estudiante ---
app.get('/api/quiz/:code', (req, res) => {
    const studentCode = req.params.code;
    if (!activeQuiz.code) {
        return res.status(403).json({ error: 'El examen ha finalizado o aún no ha comenzado.' });
    }
    if (studentCode && studentCode === activeQuiz.code) {
        res.status(200).json(activeQuiz.quizData);
    } else {
        res.status(403).json({ error: 'El código del examen es incorrecto.' });
    }
});

app.post('/api/submit-answer', (req, res) => {
    const { studentName, questionIndex, answerIndex, timeTaken } = req.body;
    if (!activeQuiz.code) return res.status(403).json({ error: "El examen no está activo." });
    if (!activeQuiz.studentData.has(studentName)) {
        activeQuiz.studentData.set(studentName, { name: studentName, score: 0, correct: 0, incorrect: 0, totalTime: 0, answersCount: 0 });
    }
    const student = activeQuiz.studentData.get(studentName);
    const question = activeQuiz.quizData.questions[questionIndex];
    student.totalTime += timeTaken;
    student.answersCount++;
    if (answerIndex === question.answer) {
        student.correct++;
        const basePoints = 1000;
        const maxBonus = 500;
        const bonusTimeLimit = activeQuiz.quizData.timeBonusSeconds || 10;
        const timeBonus = Math.max(0, maxBonus * (1 - (timeTaken / bonusTimeLimit)));
        student.score += basePoints + Math.floor(timeBonus);
    } else {
        student.incorrect++;
        // En la nueva especificación, las incorrectas no suman puntos.
        // Si se quisiera que sumaran 1000, sería: student.score += 1000;
    }
    broadcastRanking();
    res.status(200).json({ success: true });
});

app.post('/api/finish-quiz', (req, res) => {
    const { studentName } = req.body;
    if (!activeQuiz.studentData.has(studentName)) return res.status(404).json({ error: "Estudiante no encontrado." });
    const student = activeQuiz.studentData.get(studentName);
    const avgTime = (student.totalTime / student.answersCount).toFixed(2);
    const timestamp = new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' });
    const csvRow = `${timestamp},"${student.name}",${student.score},${student.correct},${student.incorrect},${avgTime}s\n`;
    const resultsPath = path.join(__dirname, 'results.csv');
    if (!fs.existsSync(resultsPath)) {
        const header = "Timestamp,Nombre,Puntaje,Correctas,Incorrectas,TiempoPromedio\n";
        fs.writeFileSync(resultsPath, header, 'utf8');
    }
    fs.appendFile(resultsPath, csvRow, 'utf8', (err) => { if (err) console.error("Error al guardar resultado final:", err); });
    res.status(200).json({ success: true, message: "Resultado final guardado." });
});

// --- 8. INICIAR EL SERVIDOR ---
server.listen(PORT, '0.0.0.0', () => {
    console.log(`--- Servidor de Quizzes v4 Activo ---`);
    loadQuizData();
    console.log(`Servidor escuchando en http://<TU_IP_LOCAL>:${PORT}`);
});
