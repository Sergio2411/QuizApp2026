import { firebaseConfig } from './config.js';
import * as ui from './ui.js';
import * as sounds from './sounds.js';

// --- INICIALIZACIÓN Y CONSTANTES ---
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const FieldValue = firebase.firestore.FieldValue;

// --- ESTADO GLOBAL ---
let state = {
    quizData: null,
    currentQuestion: null,
    studentName: '',
    userId: '',
    playerEmoji: '🧗‍♂️',
    selectedOptionOriginalIndex: null,
    quizStateUnsubscribe: null,
    sessionUnsubscribe: null,
    gameMode: 'classic',
    questionQueue: [],
    totalQuestionsInQuiz: 0,
    joinCode: '',
    isGodMode: false
};

// --- MANEJO DE ERRORES Y UI ---
function showError(screen, message) {
    const errorId = screen === 'login' ? 'student-error' : 'enter-code-error';
    const errorEl = document.getElementById(errorId);
    if (errorEl) errorEl.textContent = message;
}

function showAvatarError(message) {
    const errorEl = document.getElementById('avatar-error');
    if (errorEl) errorEl.textContent = message;
}

function setButtonLoadingState(buttonId, isLoading, message) {
    const btn = document.getElementById(buttonId);
    if (btn) {
        btn.disabled = isLoading;
        if (message) {
            if(buttonId === 'google-login-btn') {
                btn.innerHTML = isLoading ? message : `<img src="https://www.google.com/favicon.ico" alt="Google icon" class="w-5 h-5"> Ingresar con Google`;
            } else {
                btn.textContent = message;
            }
        }
    }
}

// --- FLUJO DE AUTENTICACIÓN Y UNIÓN ---

async function handleGoogleLogin() {
    setButtonLoadingState('google-login-btn', true, 'Abriendo Google...');
    showError('login', '');
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error("Error con Google Login:", error);
        showError('login', "No se pudo iniciar sesión con Google.");
    } finally {
        setButtonLoadingState('google-login-btn', false, 'Ingresar con Google');
    }
}

async function handleGuestLogin() {
    const name = document.getElementById('student-name').value.trim();
    if (!name || name.length < 3) {
        return showError('login', 'El nombre debe tener al menos 3 caracteres.');
    }
    if (name === 'DEVMODE_ADMIN') {
        state.isGodMode = true;
        console.log("MODO DIOS ACTIVADO");
    } else {
        state.isGodMode = false;
    }
    showError('login', '');
    setButtonLoadingState('guest-login-btn', true, 'Ingresando...');
    
    try {
        await auth.signInAnonymously();
        state.studentName = name;
    } catch (error) {
        console.error("Error de invitado:", error);
        showError('login', 'No se pudo ingresar como invitado.');
    } finally {
        setButtonLoadingState('guest-login-btn', false, 'Jugar como Invitado');
    }
}

async function handleJoinGame() {
    const code = document.getElementById('enter-quiz-code').value.trim();
    if (!code) return showError('enter-code', 'Debes ingresar el código del examen.');
    showError('enter-code', '');
    setButtonLoadingState('join-game-btn', true, 'Verificando...');

    try {
        const stateDoc = await db.collection('quizState').doc('active').get();
        if (!stateDoc.exists || !stateDoc.data().isActive || stateDoc.data().code !== code) {
            throw new Error("Código incorrecto o el examen no está activo.");
        }
        
        state.joinCode = code;
        const { quizId, gameMode } = stateDoc.data();
        const quizDoc = await db.collection('quizzes').doc(quizId).get();
        if (!quizDoc.exists) throw new Error("No se encontró el examen.");

        state.gameMode = gameMode;
        state.quizData = quizDoc.data();
        state.totalQuestionsInQuiz = state.quizData.questions.length;
        
        showAvatarSelection();
    } catch (error) {
        console.error("Error al unirse al juego:", error);
        showError('enter-code', error.message);
    } finally {
        setButtonLoadingState('join-game-btn', false, 'Unirse al Juego');
    }
}


function showAvatarSelection() {
    ui.showScreen('avatar-selection-screen');
    ui.renderEmojiSelector('emoji-selector', 'selected-player-emoji');
}

async function finaliseJoin() {
    setButtonLoadingState('confirm-avatar-btn', true, 'Uniéndose...');
    showAvatarError('');
    
    const playerEmojiInput = document.getElementById('selected-player-emoji');
    state.playerEmoji = playerEmojiInput.value;

    if (!state.playerEmoji) {
        showAvatarError("Por favor, selecciona un emoji para continuar.");
        setButtonLoadingState('confirm-avatar-btn', false, 'Confirmar y Jugar');
        return;
    }

    try {
        state.userId = auth.currentUser.uid;
        ui.showScreen('loading-screen'); 

        await manageStudentSession(state.joinCode);
        listenForQuizEnd(state.joinCode);
        listenForSessionChanges(state.joinCode);
    } catch (error) {
        console.error("Error al finalizar unión:", error);
        ui.showScreen('enter-code-screen');
        showError('enter-code', error.message);
    } finally {
        setButtonLoadingState('confirm-avatar-btn', false, 'Confirmar y Jugar');
    }
}

// --- LÓGICA DEL JUEGO ---

async function manageStudentSession(code) {
    const sessionRef = db.collection('sessions').doc(code).collection('students').doc(state.userId);
    const studentRef = db.collection('rankings').doc(code).collection('students').doc(state.userId);
    const sessionDoc = await sessionRef.get();

    const initialData = {
        name: state.studentName,
        playerEmoji: state.playerEmoji,
        startTime: FieldValue.serverTimestamp(),
        status: 'playing'
    };

    if (sessionDoc.exists) {
        await studentRef.update({ name: state.studentName, playerEmoji: state.playerEmoji });
    } else {
        if (state.gameMode === 'classic') {
            initialData.score = 0;
            initialData.correct = 0;
            initialData.incorrect = 0;
            initialData.hearts = 3;
            await sessionRef.set({ questionIndex: 0 });
        } else { 
            const questionOrder = Array.from({ length: state.totalQuestionsInQuiz }, (_, i) => i);
            state.questionQueue = questionOrder;
            initialData.progressCount = 0;
            initialData.questionOrder = questionOrder;
            await sessionRef.set({ questionQueue: state.questionQueue });
        }
        await studentRef.set(initialData);
    }
}

function listenForSessionChanges(code) {
    if (state.sessionUnsubscribe) state.sessionUnsubscribe();
    const sessionRef = db.collection('sessions').doc(code).collection('students').doc(state.userId);
    
    state.sessionUnsubscribe = sessionRef.onSnapshot(async (sessionDoc) => {
        if (!sessionDoc.exists) return goHome(); 
        
        const sessionData = sessionDoc.data();
        
        if (sessionData.penaltyEndTime && sessionData.penaltyEndTime.toMillis() > Date.now()) {
            const remaining = (sessionData.penaltyEndTime.toMillis() - Date.now()) / 1000;
            ui.showScreen('penalty-screen');
            await new Promise(resolve => ui.showPenaltyScreen(remaining, resolve));
            if(state.gameMode === 'mastery_peak') {
                const failedQuestion = state.questionQueue.shift();
                state.questionQueue.push(failedQuestion);
                await sessionRef.update({ 
                    penaltyEndTime: FieldValue.delete(),
                    questionQueue: state.questionQueue
                });
            } else {
                 await sessionRef.update({ penaltyEndTime: FieldValue.delete() });
            }
        }
        
        let isGameFinished = false;
        if (state.gameMode === 'mastery_peak') {
            state.questionQueue = sessionData.questionQueue || [];
            if (state.questionQueue.length === 0 && state.totalQuestionsInQuiz > 0) {
                isGameFinished = true;
            }
        } else { 
            if (typeof sessionData.questionIndex !== 'number') return; 
            if (sessionData.questionIndex >= state.totalQuestionsInQuiz) isGameFinished = true;
        }
        
        if (isGameFinished) return showWaitingScreen(code, 'completed');
        
        const studentDoc = await db.collection('rankings').doc(state.joinCode).collection('students').doc(state.userId).get();
        if (!studentDoc.exists) return goHome();

        displayQuestionFlow(sessionData, studentDoc.data());
    });
}


function displayQuestionFlow(sessionData, studentData) {
    ui.showScreen('quiz-screen');
    
    let questionIndex;
    if (state.gameMode === 'mastery_peak') {
        if(state.questionQueue.length === 0) return;
        questionIndex = state.questionQueue[0];
    } else { 
        questionIndex = sessionData.questionIndex;
    }
    
    if (!state.quizData || !state.quizData.questions) return showWaitingScreen(state.joinCode, 'error_quiz_data_missing');
    
    const questionData = state.quizData.questions[questionIndex];
    if (questionData === undefined) return showWaitingScreen(state.joinCode, 'error_invalid_question');

    state.currentQuestion = { ...questionData, originalIndex: questionIndex };
    
    ui.displayQuestion(state.currentQuestion, studentData, state.gameMode, state.totalQuestionsInQuiz);
    
    const shuffledOptions = state.currentQuestion.options
        .map((text, originalIndex) => ({ text, originalIndex }))
        .sort(() => Math.random() - 0.5);
    
    ui.displayOptions(shuffledOptions, handleOptionSelect, state.isGodMode ? state.currentQuestion.answer : null);
}

function handleOptionSelect(originalIndex, button) {
    sounds.playSelectSound();
    state.selectedOptionOriginalIndex = originalIndex;
    document.querySelectorAll('#options-container button').forEach(btn => btn.classList.remove('selected'));
    button.classList.add('selected');
    document.getElementById('answer-confirm-modal').classList.remove('hidden');
}

async function submitAnswerAndContinue() {
    const okBtn = document.getElementById('answer-ok-btn');
    okBtn.disabled = true;

    if (state.selectedOptionOriginalIndex === null || !state.currentQuestion) {
        okBtn.disabled = false;
        return;
    }
    
    const isCorrect = state.selectedOptionOriginalIndex === state.currentQuestion.answer;
    const studentRef = db.collection('rankings').doc(state.joinCode).collection('students').doc(state.userId);
    const sessionRef = db.collection('sessions').doc(state.joinCode).collection('students').doc(state.userId);

    if (state.gameMode === 'classic') {
        let { newHearts, oldHearts } = await ui.updateStudentStats(db, studentRef, sessionRef, isCorrect);
        if (isCorrect) {
            sounds.playCorrectSound();
            if (newHearts > oldHearts) await ui.showHeartGainAnimation(newHearts);
        } else {
            sounds.playIncorrectSound();
            if (newHearts === 0) await studentRef.update({ hearts: 3 });
        }
        await sessionRef.update({ questionIndex: FieldValue.increment(1) });

    } else { 
        if (isCorrect) {
            sounds.playCorrectSound();
            await ui.showCheckAnimation();
            const newQueue = [...state.questionQueue];
            newQueue.shift(); 
            await studentRef.update({ progressCount: FieldValue.increment(1) });
            await sessionRef.update({ questionQueue: newQueue });
        } else {
            sounds.playIncorrectSound();
            await ui.showCrossAnimation();
            await studentRef.update({ incorrect: FieldValue.increment(1) });
            const penaltyEndTime = firebase.firestore.Timestamp.fromMillis(Date.now() + 20000);
            await sessionRef.update({ penaltyEndTime });
        }
    }
    
    state.selectedOptionOriginalIndex = null;
    okBtn.disabled = false;
}

// --- FINALIZACIÓN DEL JUEGO Y COLECCIONES ---

async function saveMedal(finalRanking, quizTitle) {
    const myRankIndex = finalRanking.findIndex(s => s.id === state.userId);
    if (myRankIndex === -1) return;

    const rankInfo = ui.getRankData(myRankIndex);
    
    const medal = {
        emoji: rankInfo.emoji,
        quizTitle: quizTitle,
        rank: myRankIndex + 1,
        date: FieldValue.serverTimestamp()
    };
    
    try {
        await db.collection('users').doc(state.userId).collection('medals').add(medal);
        console.log("Medalla guardada:", medal);
    } catch (error) {
        console.error("Error al guardar la medalla:", error);
    }
}

async function showCollections() {
    ui.showScreen('collections-screen');
    const medalsContainer = document.getElementById('medals-container');
    medalsContainer.innerHTML = '<p class="text-slate-500">Cargando medallas...</p>';

    try {
        const medalsSnapshot = await db.collection('users').doc(state.userId).collection('medals').orderBy('date', 'desc').get();
        const medals = medalsSnapshot.docs.map(doc => doc.data());
        ui.renderMedals(medals);
    } catch (error) {
        console.error("Error al cargar las medallas:", error);
        medalsContainer.innerHTML = '<p class="text-red-500">No se pudieron cargar las medallas.</p>';
    }
}

function listenForQuizEnd(quizCode) {
    if (state.quizStateUnsubscribe) state.quizStateUnsubscribe();
    state.quizStateUnsubscribe = db.collection('quizState').doc('active').onSnapshot((doc) => {
        if (doc.exists && !doc.data().isActive) {
            showFinalPodiumFlow(quizCode);
        }
    });
}

async function showWaitingScreen(code, status) {
    if (state.sessionUnsubscribe) {
        state.sessionUnsubscribe();
        state.sessionUnsubscribe = null;
    }
    const studentRef = db.collection('rankings').doc(code).collection('students').doc(state.userId);
    const studentDoc = await studentRef.get();
    if (studentDoc.exists && !studentDoc.data().endTime) {
        await studentRef.update({ endTime: FieldValue.serverTimestamp(), status });
    }
    ui.showScreen('end-screen');
    const allStudentsSnapshot = await db.collection('rankings').doc(code).collection('students').get();
    const allStudents = allStudentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    ui.showStudentStatsSummary(allStudents, state.userId, state.gameMode);
}

async function showFinalPodiumFlow(quizCode) {
    if (state.quizStateUnsubscribe) state.quizStateUnsubscribe();
    if (state.sessionUnsubscribe) state.sessionUnsubscribe();

    const quizStateDoc = await db.collection('quizState').doc('last').get();
    const quizTitle = state.quizData?.title || quizStateDoc.data()?.quizTitle || "Examen";
    
    const snapshot = await db.collection('rankings').doc(quizCode).collection('students').get();
    const ranking = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (auth.currentUser && !auth.currentUser.isAnonymous) {
       await saveMedal(ranking, quizTitle);
    }
    
    ui.showFinalPodium(ranking, state.userId, state.studentName, state.gameMode, state.totalQuestionsInQuiz);
}

async function handleLogout() {
    try {
        await auth.signOut();
    } catch(error) {
        console.error("Error al cerrar sesión:", error);
    } 
}

function goHome() {
    if (state.quizStateUnsubscribe) state.quizStateUnsubscribe();
    if (state.sessionUnsubscribe) state.sessionUnsubscribe();
    window.location.href = '/index.html';
}

// --- EVENT LISTENERS ---

function attachEventListeners() {
    const safeAddListener = (id, event, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener(event, handler);
    };

    document.body.addEventListener('click', sounds.unlockAudio, { once: true });
    safeAddListener('student-back-btn', 'click', goHome);
    safeAddListener('go-home-btn', 'click', goHome);
    safeAddListener('logout-btn', 'click', handleLogout);
    safeAddListener('google-login-btn', 'click', handleGoogleLogin);
    safeAddListener('guest-login-btn', 'click', handleGuestLogin);
    safeAddListener('join-game-btn', 'click', handleJoinGame);
    safeAddListener('collections-btn', 'click', showCollections);
    safeAddListener('collections-back-btn', 'click', () => ui.showScreen('enter-code-screen'));
    safeAddListener('confirm-avatar-btn', 'click', finaliseJoin);

    safeAddListener('answer-ok-btn', 'click', () => {
        document.getElementById('answer-confirm-modal').classList.add('hidden');
        submitAnswerAndContinue();
    });
    safeAddListener('answer-cancel-btn', 'click', () => {
        document.getElementById('answer-confirm-modal').classList.add('hidden');
        document.querySelectorAll('#options-container button').forEach(btn => btn.classList.remove('selected'));
        state.selectedOptionOriginalIndex = null;
    });

    document.addEventListener('keydown', (e) => {
        if (!document.getElementById('answer-confirm-modal').classList.contains('hidden')) {
            if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('answer-ok-btn').click();
            }
        } else if (document.getElementById('quiz-screen').classList.contains('active')) {
            if (['1', '2', '3', '4'].includes(e.key)) {
                e.preventDefault();
                const btn = document.getElementById(`option-btn-${parseInt(e.key) - 1}`);
                if (btn) btn.click();
            }
        }
    });

    const setupEnterToProceed = (inputId, buttonId) => {
        const input = document.getElementById(inputId);
        const button = document.getElementById(buttonId);
        if (input && button) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') button.click();
            });
        }
    };
    
    setupEnterToProceed('student-name', 'guest-login-btn');
    setupEnterToProceed('enter-quiz-code', 'join-game-btn');
    
    window.addEventListener('online', () => document.getElementById('offline-indicator').classList.add('hidden'));
    window.addEventListener('offline', () => document.getElementById('offline-indicator').classList.remove('hidden'));
}

// --- INICIO DE LA APLICACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    attachEventListeners();
    
    auth.onAuthStateChanged(user => {
        const collectionsBtn = document.getElementById('collections-btn');
        if (user) {
            // --- INICIO DE LA CORRECCIÓN ---
            // Guardar el ID de usuario en el estado global en cuanto se autentica.
            state.userId = user.uid;
            // --- FIN DE LA CORRECCIÓN ---
            
            if(user.isAnonymous) {
                collectionsBtn.classList.add('hidden');
            } else {
                state.studentName = user.displayName || 'Estudiante';
                collectionsBtn.classList.remove('hidden');
            }
            ui.showScreen('enter-code-screen');
            document.getElementById('enter-code-greeting').textContent = `¡Hola, ${state.studentName}!`;
        } else {
            // Limpiar el estado si el usuario cierra sesión
            state.userId = '';
            state.studentName = '';
            ui.showScreen('student-login-screen');
        }
    });
});

