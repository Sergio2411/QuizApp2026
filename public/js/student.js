import { db, auth, FieldValue } from './config.js'; // <--- IMPORTAMOS TODO DE AQUÍ
import * as ui from './ui.js';
import * as sounds from './sounds.js';

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
    isGodMode: false,
    isSubmitting: false
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
            if (buttonId === 'google-login-btn') {
                btn.innerHTML = isLoading ? message : `<img src="https://www.google.com/favicon.ico" alt="Google icon" class="w-5 h-5"> Ingresar con Google`;
            } else {
                btn.textContent = message;
            }
        }
    }
}

// --- FLUJO DE AUTENTICACIÓN Y UNIÓN ---

// student.js

// REEMPLAZA ESTAS DOS FUNCIONES
async function handleGoogleLogin() {
    showError('login', '');
    setButtonLoadingState('google-login-btn', true, 'Abriendo Google...');
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
    // Modo DIOS ya no se activa con el nombre, lo movemos a handleJoinGame
    showError('login', '');
    setButtonLoadingState('guest-login-btn', true, 'Ingresando...');

    try {
        await auth.signInAnonymously();
    } catch (error) {
        console.error("Error de invitado:", error);
        showError('login', 'No se pudo ingresar como invitado.');
    } finally {
        setButtonLoadingState('guest-login-btn', false, 'Jugar como Invitado');
    }
}

// student.js

// REEMPLAZA ESTA FUNCIÓN
async function handleJoinGame() {
    // 1. LEER Y VALIDAR EL NOMBRE PRIMERO
    const name = document.getElementById('student-name').value.trim();
    if (!name || name.length < 3) {
        return showError('enter-code', 'Tu nombre debe tener al menos 3 caracteres.');
    }
    state.studentName = name; // Guardar nombre en el estado global

    // Activar modo DIOS si corresponde
    if (name === 'DEVMODE_ADMIN') {
        state.isGodMode = true;
        console.log("MODO DIOS ACTIVADO");
    } else {
        state.isGodMode = false;
    }

    // 2. CONTINUAR CON LA LÓGICA PARA UNIRSE AL JUEGO
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

        // --- NUEVO: GUARDAR SESIÓN EN MEMORIA ---
        localStorage.setItem('quizSession', JSON.stringify({
            code: state.joinCode,
            name: state.studentName,
            emoji: state.playerEmoji,
            gameMode: state.gameMode,
            userId: state.userId
        }));
        // ----------------------------------------

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

        // --- SEGURIDAD: VERIFICAR SI YA TERMINÓ ---
        const studentDoc = await db.collection('rankings').doc(state.joinCode).collection('students').doc(state.userId).get();

        if (!studentDoc.exists) return goHome();
        const studentData = studentDoc.data();

        // Si el estado es 'completed', lo mandamos a la sala de espera/podio
        if (studentData.status === 'completed') {
            console.log("🚫 El estudiante ya finalizó. Bloqueando reingreso.");
            return showWaitingScreen(code, 'completed');
        }
        // ------------------------------------------

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

        displayQuestionFlow(sessionData, studentData);
    });
}


function displayQuestionFlow(sessionData, studentData) {
    ui.showScreen('quiz-screen');

    let questionIndex;
    if (state.gameMode === 'mastery_peak') {
        if (state.questionQueue.length === 0) return;
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

// student.js

async function submitAnswerAndContinue() {
    const okBtn = document.getElementById('answer-ok-btn');
    
    // 1. SEGURIDAD ANTI-DOBLE CLIC (Lógica)
    // Si el semáforo está en rojo, ignoramos el clic por completo.
    if (state.isSubmitting) return;

    // 2. Validar que haya respuesta seleccionada
    if (state.selectedOptionOriginalIndex === null || !state.currentQuestion) {
        return; 
    }
    
    // 3. ACTIVAR SEMÁFORO Y BLOQUEO VISUAL
    state.isSubmitting = true; // Semáforo en ROJO
    okBtn.disabled = true;
    okBtn.textContent = "Enviando..."; // Feedback visual para el usuario
    okBtn.classList.add('opacity-50', 'cursor-not-allowed'); // Estilo visual de desactivado

    // Preparamos referencias
    const isCorrect = state.selectedOptionOriginalIndex === state.currentQuestion.answer;
    const studentRef = db.collection('rankings').doc(state.joinCode).collection('students').doc(state.userId);
    const sessionRef = db.collection('sessions').doc(state.joinCode).collection('students').doc(state.userId);

    try {
        if (state.gameMode === 'classic') {
            // Lógica Clásica (se mantiene igual pero protegida)
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
            // --- LÓGICA PICO DE MAESTRÍA (CORREGIDA) ---
            if (isCorrect) {
                sounds.playCorrectSound();
                await ui.showCheckAnimation();
                
                const newQueue = [...state.questionQueue];
                newQueue.shift(); 

                // --- VALIDACIÓN DE LÍMITE ---
                // Obtenemos el dato actual antes de escribir para asegurar no pasarnos
                const currentDoc = await studentRef.get();
                const currentProgress = currentDoc.data().progressCount || 0;

                // Solo incrementamos si no hemos llegado al tope
                if (currentProgress < state.totalQuestionsInQuiz) {
                    const updates = {
                        progressCount: FieldValue.increment(1)
                    };
                    
                    // Si este punto nos lleva a la meta, guardamos el TIEMPO DE FIN aquí mismo
                    // (Esto soluciona el problema de que no aparezca el tiempo)
                    if (currentProgress + 1 >= state.totalQuestionsInQuiz) {
                        updates.endTime = FieldValue.serverTimestamp();
                        updates.status = 'completed'; // Marcamos como completado explícitamente
                    }

                    await studentRef.update(updates);
                }
                
                await sessionRef.update({ questionQueue: newQueue });
            } else {
                sounds.playIncorrectSound();
                await ui.showCrossAnimation();
                const newQueue = [...state.questionQueue];
                const failedQuestion = newQueue.shift();
                newQueue.push(failedQuestion);
                
                await studentRef.update({ incorrect: FieldValue.increment(1) });
                await sessionRef.update({ questionQueue: newQueue });
            }
        }
    } catch (error) {
        console.error("Error al enviar respuesta:", error);
        // Si falla (ej. internet se corta totalmente), permitimos intentar de nuevo
        alert("Hubo un error de conexión. Intenta de nuevo.");
    } finally {
        // 4. LIMPIEZA FINAL
        // Liberamos el semáforo y la UI
        state.isSubmitting = false; 
        state.selectedOptionOriginalIndex = null;
        
        // Cerramos el modal
        document.getElementById('answer-confirm-modal').classList.add('hidden');
        
        // Restauramos el botón (aunque el modal se oculte, es buena práctica)
        okBtn.disabled = false;
        okBtn.textContent = "Confirmar";
        okBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

// --- FINALIZACIÓN DEL JUEGO Y COLECCIONES ---

// student.js

async function saveMedal(finalRanking, quizTitle) { // Acepta el ranking ordenado
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

// student.js

// PEGA ESTA VERSIÓN CORREGIDA DE LA FUNCIÓN
async function showCollections() {
    ui.showScreen('collections-screen');
    const medalsTableBody = document.getElementById('medals-table-body');

    if (medalsTableBody) {
        medalsTableBody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-slate-500">Cargando medallas...</td></tr>';
    }

    try {
        const medalsSnapshot = await db.collection('users').doc(state.userId).collection('medals').orderBy('date', 'desc').get();
        const medals = medalsSnapshot.docs.map(doc => doc.data());
        ui.renderMedals(medals);
    } catch (error) { // <-- Se añadieron las llaves aquí
        console.error("Error al cargar las medallas:", error);
        if (medalsTableBody) {
            medalsTableBody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-red-500">No se pudieron cargar las medallas.</td></tr>';
        }
    } // <-- Se eliminó una llave extra que sobraba al final
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

// student.js

async function showFinalPodiumFlow(quizCode) {
    if (state.quizStateUnsubscribe) state.quizStateUnsubscribe();
    if (state.sessionUnsubscribe) state.sessionUnsubscribe();

    const quizStateDoc = await db.collection('quizState').doc('last').get();
    const quizTitle = state.quizData?.title || quizStateDoc.data()?.quizTitle || "Examen";

    const snapshot = await db.collection('rankings').doc(quizCode).collection('students').get();
    const ranking = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // --- INICIO DE LA CORRECCIÓN ---
    // Se ordena el ranking aquí, antes de hacer cualquier otra cosa.
    const sortedRanking = ranking.sort((a, b) => {
        const aScore = a.score ?? a.progressCount ?? 0;
        const bScore = b.score ?? b.progressCount ?? 0;

        if (bScore !== aScore) return bScore - aScore;

        const timeA = (a.endTime && a.startTime) ? a.endTime.toMillis() - a.startTime.toMillis() : Infinity;
        const timeB = (b.endTime && b.startTime) ? b.endTime.toMillis() - b.startTime.toMillis() : Infinity;
        return timeA - timeB;
    });
    // --- FIN DE LA CORRECCIÓN ---

    if (auth.currentUser && !auth.currentUser.isAnonymous) {
        // Se pasa la lista ordenada a la función de guardar medalla.
        await saveMedal(sortedRanking, quizTitle);
    }

    // Se pasa la lista ordenada para mostrar el podio.
    ui.showFinalPodium(sortedRanking, state.userId, state.studentName, state.gameMode, state.totalQuestionsInQuiz);
}

async function handleLogout() {
    try {
        localStorage.removeItem('quizSession');
        await auth.signOut();
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
    }
}

function showQuizReview() {
    if (!state.quizData) {
        // Como profesor de matemática, sabes que sin datos no hay solución.
        // Mostramos un error si los datos del examen no están disponibles.
        alert("No se pueden cargar los datos del examen para la revisión.");
        return;
    }
    document.getElementById('review-quiz-title').textContent = `Revisión: ${state.quizData.title}`;
    ui.renderQuizReview(state.quizData.questions);
    ui.showScreen('quiz-review-screen');
}

function goHome() {

    // --- AGREGA ESTA LÍNEA ---
    localStorage.removeItem('quizSession');
    // -------------------------

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
    safeAddListener('review-quiz-btn', 'click', showQuizReview);
    safeAddListener('review-back-btn', 'click', () => ui.showScreen('end-screen'));

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

    // --- SISTEMA ANTI-TRAMPAS ---
    
    // 1. Detectar pérdida de foco (Cambiar pestaña, minimizar, clic afuera)
    window.addEventListener('blur', () => {
        triggerAntiCheatPenalty("Saliste de la pantalla");
    });

    // 2. Detectar tecla Imprimir Pantalla (ImpPnt / PrtSc)
    document.addEventListener('keyup', (e) => {
        if (e.key === 'PrintScreen') {
            // Intentamos limpiar el portapapeles para frustrar la captura (funciona en algunos navegadores)
            navigator.clipboard.writeText('¡No se permiten capturas!'); 
            triggerAntiCheatPenalty("Captura de pantalla detectada");
        }
    });

}

async function triggerAntiCheatPenalty(reason) {
    // 1. Validaciones de seguridad
    // Si ya se está enviando una respuesta, o si NO estamos en la pantalla del examen, no hacemos nada.
    if (state.isSubmitting) return;
    const quizScreen = document.getElementById('quiz-screen');
    if (!quizScreen || !quizScreen.classList.contains('active')) return;

    // 2. Bloqueamos para evitar doble penalización
    state.isSubmitting = true;
    console.log(`⛔ Penalización activada: ${reason}`);

    // 3. Feedback Visual y Sonoro (Para que sepan qué pasó)
    sounds.playIncorrectSound();
    await ui.showCrossAnimation(); // Muestra la X gigante
    
    // Cambiamos el texto de la pregunta momentáneamente para avisar
    const questionTextEl = document.getElementById('question-text');
    if(questionTextEl) {
        questionTextEl.innerHTML = `<span class="text-red-500 font-bold">⚠️ ¡Detectado: ${reason}! <br>Pregunta anulada.</span>`;
    }

    // 4. Lógica de Base de Datos (Igual que responder incorrecto)
    const studentRef = db.collection('rankings').doc(state.joinCode).collection('students').doc(state.userId);
    const sessionRef = db.collection('sessions').doc(state.joinCode).collection('students').doc(state.userId);

    try {
        if (state.gameMode === 'classic') {
            // --- MODO CLÁSICO ---
            // Quitamos corazón y avanzamos índice
            let { newHearts } = await ui.updateStudentStats(db, studentRef, sessionRef, false); // false = incorrecto
            if (newHearts === 0) await studentRef.update({ hearts: 3 }); // Reinicio si muere
            
            await sessionRef.update({ questionIndex: firebase.firestore.FieldValue.increment(1) });

        } else {
            // --- MODO PICO DE MAESTRÍA ---
            // Movemos la pregunta al final de la cola
            const newQueue = [...state.questionQueue];
            const failedQuestion = newQueue.shift(); // Sacamos la actual
            newQueue.push(failedQuestion); // La mandamos al final
            
            await studentRef.update({ incorrect: firebase.firestore.FieldValue.increment(1) });
            await sessionRef.update({ questionQueue: newQueue });
        }
    } catch (error) {
        console.error("Error en penalización:", error);
    } finally {
        state.isSubmitting = false;
    }
}

// --- INICIO DE LA APLICACIÓN ---

document.addEventListener('DOMContentLoaded', () => {
    attachEventListeners();

    auth.onAuthStateChanged(async user => {
        const collectionsBtn = document.getElementById('collections-btn');

        if (user) {
            state.userId = user.uid;

            if (!user.isAnonymous) {
                const userRef = db.collection('users').doc(user.uid);
                // Usamos set con merge: true para no borrar sus medallas si ya existen
                await userRef.set({
                    displayName: user.displayName,
                    email: user.email,
                    photoURL: user.photoURL,
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }

            // --- INTENTO DE AUTO-RECONEXIÓN ---
            const savedSession = JSON.parse(localStorage.getItem('quizSession'));

            if (savedSession && savedSession.userId === user.uid) {
                console.log("🔄 Intentando reconectar sesión...");

                // 1. Restaurar datos en memoria
                state.joinCode = savedSession.code;
                state.studentName = savedSession.name;
                state.playerEmoji = savedSession.emoji;
                state.gameMode = savedSession.gameMode;

                // 2. Verificar si el examen sigue vivo en la nube
                try {
                    const stateDoc = await db.collection('quizState').doc('active').get();

                    if (stateDoc.exists && stateDoc.data().isActive && stateDoc.data().code === state.joinCode) {
                        const quizId = stateDoc.data().quizId;
                        const quizDoc = await db.collection('quizzes').doc(quizId).get();

                        if (quizDoc.exists) {
                            state.quizData = quizDoc.data();
                            state.totalQuestionsInQuiz = state.quizData.questions.length;

                            // 3. Reconectar
                            ui.showScreen('loading-screen');
                            await manageStudentSession(state.joinCode);
                            listenForQuizEnd(state.joinCode);
                            listenForSessionChanges(state.joinCode);
                            return; // ¡IMPORTANTE! Detiene la carga normal
                        }
                    } else {
                        localStorage.removeItem('quizSession'); // Examen ya no existe
                    }
                } catch (error) {
                    console.error("Error reconectando:", error);
                    localStorage.removeItem('quizSession');
                }
            }
            // ----------------------------------

            // Flujo normal (si no hay reconexión)
            const nameInput = document.getElementById('student-name');
            if (nameInput && !user.isAnonymous && user.displayName) {
                nameInput.value = user.displayName;
            }

            if (user.isAnonymous) {
                collectionsBtn.classList.add('hidden');
            } else {
                collectionsBtn.classList.remove('hidden');
            }

            ui.showScreen('enter-code-screen');
            document.getElementById('enter-code-greeting').textContent = `¡Bienvenido!`;

            // --- NUEVO: AUTO-RELLENAR CÓDIGO DESDE URL ---
            const urlParams = new URLSearchParams(window.location.search);
            const codeFromUrl = urlParams.get('code');
            
            if (codeFromUrl) {
                const codeInput = document.getElementById('enter-quiz-code');
                const nameInput = document.getElementById('student-name');
                
                if (codeInput) {
                    codeInput.value = codeFromUrl;
                    
                    // UX: Hacemos un pequeño efecto visual para que vean que ya está puesto
                    codeInput.classList.add('bg-yellow-50', 'border-yellow-400');
                    
                    // UX: Si ya hay código, ponemos el foco en el Nombre automáticamente
                    if (nameInput) nameInput.focus();
                }
            }

        } else {
            state.userId = '';
            state.studentName = '';
            ui.showScreen('student-login-screen');
        }
    });
});
