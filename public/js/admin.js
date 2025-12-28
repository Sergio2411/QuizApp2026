import { db, FieldValue } from './config.js'; // <--- Solo importamos lo que usa admin
import * as ui from './ui.js';
import * as sounds from './sounds.js';
import { playerEmojis } from './data.js';

// AÑADIR ESTAS CONSTANTES Y VARIABLES DEBAJO DE LA INICIALIZACIÓN DE 'db'
const BOT_NAMES = ["Newton", "Einstein", "Galileo", "Curie", "Ada Lovelace", "Copérnico", "Sagan", "Turing", "Hypatia"];
let botSimulationInterval = null;
let mountainUpdateInterval = null; // <-- AÑADIR ESTA LÍNEA
let latestMasteryStudents = []; // <-- AÑADIR ESTA LÍNEA
let activeGameCode = null;
let totalQuestionsInQuiz = 0;

let cachedPassword = null;

let rankingUnsubscribe = null;
let confirmCallback = null;
let allQuizzesList = [];
let quizzesDisplayedCount = 4;
let previewState = {
    quizData: null,
    currentQuestionIndex: 0,
};

document.addEventListener('DOMContentLoaded', () => {
    attachEventListeners();
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        ui.showScreen('admin-dashboard-screen');
        updateAdminDashboard();
    } else {
        ui.showScreen('admin-login-screen');
        // 1. Traemos la contraseña de Firebase silenciosamente al cargar
        db.collection('admin').doc('config').get().then(doc => {
            if (doc.exists) {
                cachedPassword = doc.data().password;
                console.log("Sistema listo para detección automática.");
            }
        }).catch(error => console.error("No se pudo precargar configuración", error));

        // 2. Escuchamos cada tecla que escribes en el input
        const passwordInput = document.getElementById('admin-password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                // Si lo que escribiste coincide EXACTAMENTE con la contraseña guardada...
                if (cachedPassword && e.target.value === cachedPassword) {
                    // ...Simulamos un clic en el botón de Ingresar
                    document.getElementById('admin-login-btn').click();
                }
            });
        }
    }
});

function stopMountainUpdates() {
    if (mountainUpdateInterval) {
        clearInterval(mountainUpdateInterval);
        mountainUpdateInterval = null;
    }
}

async function handleAdminLogin() {
    const passwordInput = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-error');
    if (!errorEl) return;
    errorEl.textContent = '';

    try {
        const configDoc = await db.collection('admin').doc('config').get();
        if (configDoc.exists && configDoc.data().password === passwordInput) {
            sessionStorage.setItem('isAdminLoggedIn', 'true');
            ui.showScreen('admin-dashboard-screen');
            updateAdminDashboard();
        } else {
            errorEl.textContent = "Contraseña incorrecta.";
        }
    } catch (error) {
        console.error("Error al verificar contraseña:", error);
        errorEl.textContent = "No se pudo verificar la contraseña.";
    }
}

async function updateAdminDashboard() {
    const stateDoc = await db.collection('quizState').doc('active').get();
    const status = stateDoc.exists ? stateDoc.data() : { isActive: false };
    const showRankingBtn = document.getElementById('show-ranking-btn');

    if (status.isActive) {
        document.getElementById('quiz-active-view').classList.remove('hidden');
        document.getElementById('quiz-inactive-view').classList.add('hidden');
        document.getElementById('active-code-display').textContent = status.code;
        if (showRankingBtn) showRankingBtn.textContent = "Ver Ranking en Vivo";
    } else {
        document.getElementById('quiz-active-view').classList.add('hidden');
        document.getElementById('quiz-inactive-view').classList.remove('hidden');
        if (showRankingBtn) showRankingBtn.textContent = "Ver Último Ranking";
        loadQuizzesIntoSelector();
    }
}

async function loadQuizzesIntoSelector() {
    const quizOptionsContainer = document.getElementById('quiz-options-container');
    const startBtn = document.getElementById('start-quiz-btn');
    const previewBtn = document.getElementById('preview-quiz-btn');
    const hiddenInput = document.getElementById('selected-quiz-id');
    const selectedQuizText = document.getElementById('selected-quiz-text');

    if (!quizOptionsContainer || !startBtn || !hiddenInput || !selectedQuizText || !previewBtn) {
        console.error('Error: Faltan elementos del DOM para el selector de examen.');
        return;
    }

    quizOptionsContainer.innerHTML = '<div class="p-2 text-slate-500 text-sm">Cargando exámenes...</div>';
    startBtn.disabled = true;
    previewBtn.disabled = true;
    hiddenInput.value = '';
    selectedQuizText.textContent = 'Selecciona un examen...';
    selectedQuizText.classList.add('text-slate-500');

    try {
        const quizzesSnapshot = await db.collection('quizzes').orderBy('createdAt', 'desc').get();
        allQuizzesList = quizzesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        quizzesDisplayedCount = 4;

        if (allQuizzesList.length === 0) {
            quizOptionsContainer.innerHTML = '<div class="p-2 text-slate-500 text-sm">No hay exámenes creados</div>';
        } else {
            renderQuizOptions();
        }

    } catch (error) {
        console.error("Error cargando los exámenes:", error);
        quizOptionsContainer.innerHTML = '<div class="p-2 text-red-500 text-sm">Error al cargar</div>';
    }

    const autoId = sessionStorage.getItem('autoSelectQuizId');
    
    // Si hay un ID guardado y la lista ya cargó...
    if (autoId && allQuizzesList.length > 0) {
        const foundQuiz = allQuizzesList.find(q => q.id === autoId);
        
        if (foundQuiz) {
            // Simulamos la selección visual
            hiddenInput.value = foundQuiz.id;
            selectedQuizText.textContent = foundQuiz.title || foundQuiz.id;
            selectedQuizText.classList.remove('text-slate-500');
            
            // Habilitamos los botones
            startBtn.disabled = false;
            previewBtn.disabled = false;
            
            // Borramos el ID de memoria para que no se seleccione siempre al refrescar
            sessionStorage.removeItem('autoSelectQuizId');
            
            console.log(`Examen auto-seleccionado: ${foundQuiz.title}`);
        }
    }

}

function renderQuizOptions() {
    const quizOptionsContainer = document.getElementById('quiz-options-container');
    const startBtn = document.getElementById('start-quiz-btn');
    const previewBtn = document.getElementById('preview-quiz-btn');
    const hiddenInput = document.getElementById('selected-quiz-id');
    const selectedQuizText = document.getElementById('selected-quiz-text');

    if (!quizOptionsContainer || !startBtn || !hiddenInput || !selectedQuizText || !previewBtn) return;

    quizOptionsContainer.innerHTML = '';

    const quizzesToRender = allQuizzesList.slice(0, quizzesDisplayedCount);

    quizzesToRender.forEach(quiz => {
        const option = document.createElement('div');
        option.className = 'quiz-option p-2 rounded-md cursor-pointer hover:bg-slate-100 transition-colors text-sm';
        option.textContent = quiz.title || quiz.id;
        option.dataset.quizId = quiz.id;

        option.addEventListener('click', (e) => {
            e.stopPropagation();
            hiddenInput.value = quiz.id;
            selectedQuizText.textContent = quiz.title || quiz.id;
            selectedQuizText.classList.remove('text-slate-500');
            startBtn.disabled = false;
            previewBtn.disabled = false;
            quizOptionsContainer.classList.add('hidden');
        });
        quizOptionsContainer.appendChild(option);
    });

    if (allQuizzesList.length > quizzesDisplayedCount) {
        const loadMoreBtn = document.createElement('button');
        loadMoreBtn.className = 'w-full text-center p-2 mt-1 text-sm text-slate-600 font-semibold hover:bg-slate-100 rounded-md transition-colors';
        loadMoreBtn.textContent = 'Mostrar más (+)';

        loadMoreBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            quizzesDisplayedCount += 4;
            renderQuizOptions();
        });
        quizOptionsContainer.appendChild(loadMoreBtn);
    }
}

async function handleStartQuiz() {
    const quizId = document.getElementById('selected-quiz-id').value;
    const gameMode = document.getElementById('selected-game-mode').value;

    if (!quizId) {
        alert("Por favor, selecciona un examen de la lista.");
        return;
    }
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const quizDoc = await db.collection('quizzes').doc(quizId).get();
    if (!quizDoc.exists) {
        alert(`Error: El examen con ID '${quizId}' no existe.`);
        return;
    }
    await db.collection('quizState').doc('active').set({
        isActive: true,
        code: code,
        quizId: quizId,
        quizTitle: quizDoc.data().title,
        gameMode: gameMode
    });
    updateAdminDashboard();
}

async function handleStopQuiz() {
    showConfirmModal("¿Seguro que quieres detener el examen para todos?", async () => {
        stopBotSimulation();
        stopMountainUpdates()
        const activeStateDoc = await db.collection('quizState').doc('active').get();
        if (activeStateDoc.exists && activeStateDoc.data().code) {
            const lastCode = activeStateDoc.data().code;
            const gameMode = activeStateDoc.data().gameMode;
            await db.collection('quizState').doc('last').set({ code: lastCode, gameMode: gameMode });
        }
        await db.collection('quizState').doc('active').set({ isActive: false, code: null, quizId: null, quizTitle: null, gameMode: null });
        updateAdminDashboard();
    });
}

async function showRankingView() {
    // Busca y elimina cualquier tabla de ranking final que haya quedado de una partida anterior.
    const oldFinalTable = document.getElementById('final-ranking-table-container');
    if (oldFinalTable) {
        oldFinalTable.remove();
    }

    if (rankingUnsubscribe) rankingUnsubscribe();
    stopBotSimulation();

    const activeStateDoc = await db.collection('quizState').doc('active').get();
    const lastStateDoc = await db.collection('quizState').doc('last').get();

    let code, gameMode, isLive;

    if (activeStateDoc.exists && activeStateDoc.data().isActive) {
        code = activeStateDoc.data().code;
        gameMode = activeStateDoc.data().gameMode;
        isLive = true;
    } else if (lastStateDoc.exists && lastStateDoc.data().code) {
        code = lastStateDoc.data().code;
        gameMode = lastStateDoc.data().gameMode;
        isLive = false;
    } else {
        ui.updateRankingTable([], null, handleDeleteStudentClick, true);
        return;
    }

    if (gameMode === 'mastery_peak') {
        ui.showScreen('mastery-ranking-screen');
        const quizId = activeStateDoc.data()?.quizId;
        
        // Obtenemos el total de preguntas una sola vez al inicio
        if (quizId) {
            const quizDoc = await db.collection('quizzes').doc(quizId).get();
            if (quizDoc.exists) {
                totalQuestionsInQuiz = quizDoc.data().questions.length;
            }
        }
        
        startBotSimulation(code, gameMode);

        if (isLive) {
            document.getElementById('ranking-title-mastery').textContent = "Pico de Maestría - En Vivo";

            // CORRECCIÓN: Actualizamos la UI directamente al recibir datos
            rankingUnsubscribe = db.collection('rankings').doc(code).collection('students').onSnapshot(snapshot => {
                const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                
                // Llamamos a la UI inmediatamente, sin esperar 10 segundos
                ui.updateMasteryRanking(students, totalQuestionsInQuiz, code, handleDeleteStudentClick);
            });

        } else {
            // (El código del ranking final se mantiene igual)
            document.getElementById('ranking-title-mastery').textContent = "Pico de Maestría - Ranking Final";
            const snapshot = await db.collection('rankings').doc(code).collection('students').get();
            const students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            ui.showFinalMasteryPodium(students, totalQuestionsInQuiz);
        }

    } else { 
        // ... lógica del modo Clásico ...
        ui.showScreen('admin-ranking-screen');
        const rankingTitle = document.getElementById('ranking-title');
        if (isLive) {
            rankingTitle.textContent = "Ranking en Vivo";
            if (rankingUnsubscribe) rankingUnsubscribe(); // Detiene cualquier intervalo anterior

            const rankingInterval = setInterval(async () => {
                const activeStateDoc = await db.collection('quizState').doc('active').get();
                if (!activeStateDoc.exists || !activeStateDoc.data().isActive) {
                    clearInterval(rankingInterval); // Detiene las actualizaciones si el juego termina
                    return;
                }

                const snapshot = await db.collection('rankings').doc(code).collection('students').get();
                let students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                students.sort((a, b) => b.score - a.score);
                ui.updateRankingTable(students, code, handleDeleteStudentClick, false);
            }, 10000); // Actualiza el ranking cada 10 segundos

            rankingUnsubscribe = () => clearInterval(rankingInterval); // Función para limpiar el intervalo al salir
        } else {
            rankingTitle.textContent = "Último Ranking";
            const snapshot = await db.collection('rankings').doc(code).collection('students').get();
            let students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            students.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const timeA = (a.endTime && a.startTime) ? a.endTime.toMillis() - a.startTime.toMillis() : Infinity;
                const timeB = (b.endTime && b.startTime) ? b.endTime.toMillis() - b.startTime.toMillis() : Infinity;
                return timeA - timeB;
            });
            ui.updateRankingTable(students, code, handleDeleteStudentClick, true);
        }
    }
}

function logoutAdmin() {
    sessionStorage.removeItem('isAdminLoggedIn');
    if (rankingUnsubscribe) rankingUnsubscribe();
    stopBotSimulation();
    stopMountainUpdates()
    window.location.href = '/index.html';
}

function handleDeleteStudentClick(event) {
    const studentId = event.target.dataset.studentId;
    const studentName = event.target.dataset.studentName;
    const quizCode = event.target.dataset.quizCode;

    showConfirmModal(`¿Seguro que quieres eliminar a ${studentName} del ranking?`, () => {
        const studentRankingRef = db.collection('rankings').doc(quizCode).collection('students').doc(studentId);
        const studentSessionRef = db.collection('sessions').doc(quizCode).collection('students').doc(studentId);
        const batch = db.batch();
        batch.delete(studentRankingRef);
        batch.delete(studentSessionRef);
        batch.commit().catch(error => console.error("Error al eliminar al estudiante:", error));
    });
}

function showConfirmModal(message, onConfirm) {
    document.getElementById('confirm-message').textContent = message;
    confirmCallback = onConfirm;
    document.getElementById('confirm-modal').classList.remove('hidden');
}

function hideConfirmModal() {
    document.getElementById('confirm-modal').classList.add('hidden');
    confirmCallback = null;
}

async function handlePreviewQuiz() {
    const quizId = document.getElementById('selected-quiz-id').value;
    if (!quizId) return;

    try {
        const quizDoc = await db.collection('quizzes').doc(quizId).get();
        if (!quizDoc.exists) {
            console.error("No se encontró el examen para la vista previa.");
            return;
        }
        previewState.quizData = { id: quizDoc.id, ...quizDoc.data() };
        previewState.currentQuestionIndex = 0;

        ui.showScreen('admin-preview-screen');
        displayPreviewQuestion();

    } catch (error) {
        console.error("Error al iniciar la vista previa:", error);
    }
}

function displayPreviewQuestion() {
    const { quizData, currentQuestionIndex } = previewState;
    if (!quizData || currentQuestionIndex >= quizData.questions.length) {
        alert("Fin de la vista previa.");
        ui.showScreen('admin-dashboard-screen');
        return;
    }

    const question = quizData.questions[currentQuestionIndex];
    ui.displayQuestionInPreview(question, currentQuestionIndex, quizData.questions.length, quizData.title);

    let shuffledOptions = question.options
        .map((text, originalIndex) => ({ text, originalIndex }))
        .sort(() => Math.random() - 0.5);

    ui.displayOptionsInPreview(shuffledOptions, handlePreviewAnswer);
}

async function handlePreviewAnswer(selectedIndex, button) {
    const { quizData, currentQuestionIndex } = previewState;
    const question = quizData.questions[currentQuestionIndex];
    const isCorrect = selectedIndex === question.answer;

    document.querySelectorAll('#preview-options-container button').forEach(btn => btn.disabled = true);

    if (isCorrect) {
        await ui.showCheckAnimation();
        previewState.currentQuestionIndex++;
        setTimeout(displayPreviewQuestion, 500);
    } else {
        await ui.showCrossAnimation();
        button.style.visibility = 'hidden';
        document.querySelectorAll('#preview-options-container button').forEach(btn => {
            if (btn.style.visibility !== 'hidden') {
                btn.disabled = false;
            }
        });
    }
}


function attachEventListeners() {
    const safeAddListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener(event, handler);
    };

    safeAddListener('ranking-back-btn', 'click', () => {
        stopBotSimulation(); // <-- AÑADIR ESTA LÍNEA
        stopMountainUpdates()
        ui.showScreen('admin-dashboard-screen');
    });
    safeAddListener('mastery-back-btn', 'click', () => {
        stopBotSimulation(); // <-- AÑADIR ESTA LÍNEA
        stopMountainUpdates()
        ui.showScreen('admin-dashboard-screen');
    });
    // AÑADIR ESTOS DOS LISTENERS
    safeAddListener('add-bot-classic-btn', 'click', handleAddBot);
    safeAddListener('add-bot-mastery-btn', 'click', handleAddBot);

    safeAddListener('admin-login-btn', 'click', handleAdminLogin);
    safeAddListener('start-quiz-btn', 'click', handleStartQuiz);
    safeAddListener('preview-quiz-btn', 'click', handlePreviewQuiz);
    safeAddListener('preview-back-btn', 'click', () => ui.showScreen('admin-dashboard-screen'));
    safeAddListener('stop-quiz-btn', 'click', handleStopQuiz);
    safeAddListener('show-ranking-btn', 'click', showRankingView);
    safeAddListener('logout-btn', 'click', logoutAdmin);
    safeAddListener('confirm-cancel-btn', 'click', hideConfirmModal);
    safeAddListener('confirm-ok-btn', 'click', () => {
        if (confirmCallback) confirmCallback();
        hideConfirmModal();
    });

    // --- INICIO DE LA CORRECCIÓN ---
    // Se asegura de que la función onSelect sea siempre una función válida.
    const gameModeInput = document.getElementById('selected-game-mode');
    if (gameModeInput) {
        const handleModeSelection = (mode) => {
            gameModeInput.value = mode;
        };
        ui.setupButtonGroup('game-mode-selector', handleModeSelection);
    }
    // --- FIN DE LA CORRECCIÓN ---

    const adminPasswordInput = document.getElementById('admin-password');
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAdminLogin(); });
    }

    const quizSelectorWrapper = document.getElementById('quiz-selector-wrapper');
    const quizSelectorTrigger = document.getElementById('quiz-selector-trigger');
    const quizOptionsContainer = document.getElementById('quiz-options-container');

    if (quizSelectorTrigger && quizOptionsContainer) {
        quizSelectorTrigger.addEventListener('click', () => {
            quizOptionsContainer.classList.toggle('hidden');
        });
        document.addEventListener('click', (e) => {
            if (quizSelectorWrapper && !quizSelectorWrapper.contains(e.target)) {
                quizOptionsContainer.classList.add('hidden');
            }
        });
    }

    document.body.addEventListener('click', sounds.unlockAudio, { once: true });

    document.querySelectorAll('button, a[href], .quiz-option').forEach(el => {
        el.addEventListener('mouseenter', sounds.playHoverSound);
        el.addEventListener('click', sounds.playClickSound);
    });
    document.querySelectorAll('input').forEach(el => {
        el.addEventListener('keydown', sounds.playKeypressSound);
    });
    const codeDisplay = document.getElementById('active-code-display');
    if (codeDisplay) {
        codeDisplay.addEventListener('click', async () => {
            const code = codeDisplay.textContent.trim();
            
            // Evitamos copiar si aún no hay código (si dice "----")
            if (!code || code === '----') return;

            // 1. Generamos el enlace usando la dirección actual del sitio
            // El resultado será tipo: https://misitio.com/student.html?code=1307
            const inviteLink = `${window.location.origin}/student.html?code=${code}`;

            try {
                // 2. Copiamos al portapapeles
                await navigator.clipboard.writeText(inviteLink);

                // 3. Feedback visual (Efecto "Flash")
                const originalText = codeDisplay.textContent;
                codeDisplay.textContent = "¡Copiado!";
                codeDisplay.classList.add("text-green-600", "text-3xl"); // Hacemos la letra un poco más chica para que quepa
                codeDisplay.classList.remove("text-5xl", "tracking-widest");

                // 4. Restauramos el número después de 1 segundo
                setTimeout(() => {
                    codeDisplay.textContent = originalText;
                    codeDisplay.classList.remove("text-green-600", "text-3xl");
                    codeDisplay.classList.add("text-5xl", "tracking-widest");
                }, 1000);

            } catch (err) {
                console.error('Error al copiar:', err);
                alert("No se pudo copiar el enlace automáticamente.");
            }
        });
    }
}

// admin.js

function stopBotSimulation() {
    if (botSimulationInterval) {
        clearInterval(botSimulationInterval);
        botSimulationInterval = null;
        activeGameCode = null;
        console.log("Simulación de bots detenida.");
    }
}

async function handleAddBot() {
    if (!activeGameCode) return;

    const botId = `bot_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const botName = BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
    const botEmoji = playerEmojis[Math.floor(Math.random() * playerEmojis.length)];

    const botData = {
        name: `${botName} (Bot)`,
        playerEmoji: botEmoji,
        startTime: FieldValue.serverTimestamp(),
        // Classic mode initial data
        score: 0,
        correct: 0,
        incorrect: 0,
        hearts: 3,
        // Mastery Peak mode initial data
        progressCount: 0,
    };

    try {
        await db.collection('rankings').doc(activeGameCode).collection('students').doc(botId).set(botData);
        console.log(`Bot ${botData.name} añadido al juego ${activeGameCode}.`);
    } catch (error) {
        console.error("Error al añadir el bot:", error);
    }
}

// admin.js

// REEMPLAZA LA FUNCIÓN ANTERIOR CON ESTA
// admin.js -> Revisa que tu función se vea así:

function startBotSimulation(code, gameMode) {
    stopBotSimulation(); // Detener cualquier simulación anterior
    activeGameCode = code;
    console.log(`Iniciando simulación de bots para el juego ${code} en modo ${gameMode}.`);

    botSimulationInterval = setInterval(async () => {
        if (!activeGameCode) {
            stopBotSimulation();
            return;
        }

        const botsSnapshot = await db.collection('rankings').doc(activeGameCode).collection('students').where('name', '>=', ' (Bot)').where('name', '<=', ' (Bot)\uf8ff').get();

        botsSnapshot.forEach(botDoc => {
            const bot = botDoc.data();
            const shouldUpdate = Math.random() < 0.5;

            if (shouldUpdate) {
                const isCorrect = Math.random() < 0.75;
                let updateData = {};

                if (gameMode === 'mastery_peak') {
                    // VERIFICA ESTAS DOS LÍNEAS
                    if (isCorrect && bot.progressCount < totalQuestionsInQuiz) {
                        updateData.progressCount = FieldValue.increment(1);
                        if (bot.progressCount + 1 === totalQuestionsInQuiz) {
                            updateData.endTime = FieldValue.serverTimestamp();
                        }
                    }
                } else { // Classic mode
                    if (isCorrect) {
                        updateData.score = FieldValue.increment(1000 + Math.floor(Math.random() * 50));
                        updateData.correct = FieldValue.increment(1);
                    } else {
                        updateData.incorrect = FieldValue.increment(1);
                    }
                }

                if (Object.keys(updateData).length > 0) {
                    botDoc.ref.update(updateData);
                }
            }
        });
    }, 6000);
}
