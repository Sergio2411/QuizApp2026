import { firebaseConfig } from './config.js';
import * as ui from './ui.js';
import * as sounds from './sounds.js';

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let rankingUnsubscribe = null;
let confirmCallback = null;

document.addEventListener('DOMContentLoaded', () => {
    attachEventListeners();
    // CAMBIO: Comprueba si el admin ya ha iniciado sesión en esta sesión del navegador.
    if (sessionStorage.getItem('isAdminLoggedIn') === 'true') {
        ui.showScreen('admin-dashboard-screen');
        updateAdminDashboard();
    } else {
        ui.showScreen('admin-login-screen');
    }
});

async function handleAdminLogin() {
    const passwordInput = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-error');
    if (!errorEl) return;
    errorEl.textContent = '';

    try {
        const configDoc = await db.collection('admin').doc('config').get();
        if (configDoc.exists && configDoc.data().password === passwordInput) {
            // CAMBIO: Guarda el estado de login en la sesión.
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
        showRankingBtn.textContent = "Ver Ranking en Vivo";
    } else {
        document.getElementById('quiz-active-view').classList.add('hidden');
        document.getElementById('quiz-inactive-view').classList.remove('hidden');
        showRankingBtn.textContent = "Ver Último Ranking";
        await loadQuizzesIntoSelector();
    }
}

async function loadQuizzesIntoSelector() {
    const quizSelector = document.getElementById('quiz-selector');
    const startBtn = document.getElementById('start-quiz-btn');
    quizSelector.innerHTML = '<option value="">Cargando exámenes...</option>';
    startBtn.disabled = true;
    try {
        const quizzesSnapshot = await db.collection('quizzes').get();
        quizSelector.innerHTML = '';
        if (quizzesSnapshot.empty) {
            quizSelector.innerHTML = '<option value="">No hay exámenes creados</option>';
        } else {
            quizzesSnapshot.forEach(doc => {
                const option = document.createElement('option');
                option.value = doc.id;
                option.textContent = doc.data().title || doc.id;
                quizSelector.appendChild(option);
            });
            startBtn.disabled = false;
        }
    } catch (error) {
        console.error("Error cargando los exámenes:", error);
        quizSelector.innerHTML = '<option value="">Error al cargar</option>';
    }
}

async function handleStartQuiz() {
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const quizId = document.getElementById('quiz-selector').value;
    if (!quizId) { 
        alert("Por favor, selecciona un examen de la lista."); 
        return; 
    }
    const quizDoc = await db.collection('quizzes').doc(quizId).get();
    if (!quizDoc.exists) { 
        alert(`Error: El examen con ID '${quizId}' no existe.`); 
        return; 
    }
    await db.collection('quizState').doc('active').set({ 
        isActive: true, 
        code: code, 
        quizId: quizId, 
        quizTitle: quizDoc.data().title 
    });
    updateAdminDashboard();
}

async function handleStopQuiz() {
    showConfirmModal("¿Seguro que quieres detener el examen para todos?", async () => {
        const activeStateDoc = await db.collection('quizState').doc('active').get();
        if (activeStateDoc.exists && activeStateDoc.data().code) {
            const lastCode = activeStateDoc.data().code;
            await db.collection('quizState').doc('last').set({ code: lastCode });
        }
        await db.collection('quizState').doc('active').set({ isActive: false, code: null, quizId: null, quizTitle: null });
        updateAdminDashboard();
    });
}

async function showRankingView() {
    ui.showScreen('admin-ranking-screen');
    if (rankingUnsubscribe) rankingUnsubscribe();

    const rankingTitle = document.getElementById('ranking-title');
    const activeStateDoc = await db.collection('quizState').doc('active').get();

    if (activeStateDoc.exists && activeStateDoc.data().isActive) {
        rankingTitle.textContent = "Ranking en Vivo";
        const code = activeStateDoc.data().code;
        rankingUnsubscribe = db.collection('rankings').doc(code).collection('students').onSnapshot(snapshot => {
            let students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            students.sort((a, b) => b.score - a.score);
            ui.updateRankingTable(students, code, handleDeleteStudentClick, false);
        }, error => console.error("Error al escuchar ranking:", error));
    } else {
        rankingTitle.textContent = "Último Ranking";
        const lastStateDoc = await db.collection('quizState').doc('last').get();
        if (lastStateDoc.exists && lastStateDoc.data().code) {
            const code = lastStateDoc.data().code;
            const snapshot = await db.collection('rankings').doc(code).collection('students').get();
            let students = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            students.sort((a, b) => {
                if (b.score !== a.score) return b.score - a.score;
                const timeA = (a.endTime && a.startTime) ? a.endTime.toMillis() - a.startTime.toMillis() : Infinity;
                const timeB = (b.endTime && b.startTime) ? b.endTime.toMillis() - b.startTime.toMillis() : Infinity;
                return timeA - timeB;
            });
            ui.updateRankingTable(students, code, handleDeleteStudentClick, true);
        } else {
            ui.updateRankingTable([], null, handleDeleteStudentClick, true);
        }
    }
}

function logoutAdmin() {
    // CAMBIO: Limpia el estado de login al salir.
    sessionStorage.removeItem('isAdminLoggedIn');
    if (rankingUnsubscribe) rankingUnsubscribe();
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

function attachEventListeners() {
    document.body.addEventListener('click', sounds.unlockAudio, { once: true });
    const safeAddListener = (id, event, handler) => {
        const element = document.getElementById(id);
        if (element) element.addEventListener(event, handler);
    };
    safeAddListener('ranking-back-btn', 'click', () => ui.showScreen('admin-dashboard-screen'));
    safeAddListener('admin-login-btn', 'click', handleAdminLogin);
    safeAddListener('start-quiz-btn', 'click', handleStartQuiz);
    safeAddListener('stop-quiz-btn', 'click', handleStopQuiz);
    safeAddListener('show-ranking-btn', 'click', showRankingView);
    safeAddListener('logout-btn', 'click', logoutAdmin);
    safeAddListener('confirm-cancel-btn', 'click', hideConfirmModal);
    safeAddListener('confirm-ok-btn', 'click', () => {
        if (confirmCallback) confirmCallback();
        hideConfirmModal();
    });
    const adminPasswordInput = document.getElementById('admin-password');
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleAdminLogin(); });
    }
    document.querySelectorAll('button, select, a').forEach(el => {
        el.addEventListener('mouseenter', sounds.playHoverSound);
        el.addEventListener('click', sounds.playClickSound);
    });
    document.querySelectorAll('input').forEach(el => {
        el.addEventListener('keydown', sounds.playKeypressSound);
    });
}
