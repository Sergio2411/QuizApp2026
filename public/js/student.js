import { firebaseConfig } from './config.js';
import * as ui from './ui.js';
import * as sounds from './sounds.js';

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let quizData = null, currentQuestionIndex = 0, studentName = '', deviceId = '';
let selectedOptionOriginalIndex = null;
let quizStateUnsubscribe = null;

function getDeviceId() {
    let id = localStorage.getItem('quizDeviceId');
    if (!id) {
        id = crypto.randomUUID();
        localStorage.setItem('quizDeviceId', id);
    }
    return id;
}
function saveUsername(name) { localStorage.setItem('quizUsername', name); }
function loadUsername() { return localStorage.getItem('quizUsername'); }

document.addEventListener('DOMContentLoaded', () => {
    deviceId = getDeviceId();
    attachEventListeners();
    const savedName = loadUsername();
    if (savedName) {
        document.getElementById('student-name').value = savedName;
    }
    ui.showScreen('student-login-screen');
});

function goHome() {
    if (quizStateUnsubscribe) quizStateUnsubscribe();
    window.location.href = '/index.html';
}

async function handleStudentJoin() {
    const joinBtn = document.getElementById('join-btn');
    joinBtn.disabled = true;
    joinBtn.textContent = 'Verificando...';
    const newStudentName = document.getElementById('student-name').value.trim();
    const code = document.getElementById('quiz-code').value.trim();
    const errorEl = document.getElementById('student-error');
    errorEl.textContent = '';

    if (!newStudentName || newStudentName.length < 3 || newStudentName.includes('/')) {
        errorEl.textContent = 'El nombre debe tener al menos 3 caracteres y no puede contener "/".';
        joinBtn.disabled = false;
        joinBtn.textContent = 'Entrar al Examen';
        return;
    }
    if (!code) {
        errorEl.textContent = 'Debes ingresar el código del examen.';
        joinBtn.disabled = false;
        joinBtn.textContent = 'Entrar al Examen';
        return;
    }

    try {
        const stateDoc = await db.collection('quizState').doc('active').get();
        if (!stateDoc.exists || !stateDoc.data().isActive || stateDoc.data().code !== code) {
            throw new Error("Código incorrecto o el examen no está activo.");
        }
        const quizId = stateDoc.data().quizId;
        const quizDoc = await db.collection('quizzes').doc(quizId).get();
        if (!quizDoc.exists) throw new Error("No se encontró el examen.");

        saveUsername(newStudentName);
        quizData = quizDoc.data();

        const sessionRef = db.collection('sessions').doc(code).collection('students').doc(deviceId);
        const sessionDoc = await sessionRef.get();
        const studentRef = db.collection('rankings').doc(code).collection('students').doc(deviceId);

        if (sessionDoc.exists) {
            const sessionData = sessionDoc.data();
            const studentData = await studentRef.get();
            studentName = studentData.exists ? studentData.data().name : newStudentName;
            currentQuestionIndex = sessionData.questionIndex;
            if (studentData.exists && studentData.data().name !== newStudentName) {
                await studentRef.update({ name: newStudentName });
            }
            if (sessionData.penaltyEndTime && sessionData.penaltyEndTime.toMillis() > Date.now()) {
                const remainingPenalty = (sessionData.penaltyEndTime.toMillis() - Date.now()) / 1000;
                await new Promise(resolve => ui.showPenaltyScreen(remainingPenalty, resolve));
                await sessionRef.update({ penaltyEndTime: firebase.firestore.FieldValue.delete() });
                await studentRef.update({ hearts: 3 });
            }
        } else {
            const rankingQuery = await db.collection('rankings').doc(code).collection('students').where('name', '==', newStudentName).get();
            if (!rankingQuery.empty) {
                throw new Error(`El nombre '${newStudentName}' ya está en uso.`);
            }
            studentName = newStudentName;
            currentQuestionIndex = 0;
            await sessionRef.set({ questionIndex: 0 });
            await studentRef.set({ 
                name: studentName, 
                score: 0, 
                correct: 0, 
                incorrect: 0, 
                hearts: 3, 
                startTime: firebase.firestore.FieldValue.serverTimestamp() 
            });
        }

        listenForQuizEnd(code);

        if (currentQuestionIndex >= quizData.questions.length) {
            showWaitingScreen(code);
        } else {
            ui.showScreen('quiz-screen');
            displayQuestionFlow();
        }
    } catch (error) {
        errorEl.textContent = error.message;
        joinBtn.disabled = false;
        joinBtn.textContent = 'Entrar al Examen';
    }
}

async function displayQuestionFlow() {
    const code = document.getElementById('quiz-code').value;
    const studentRef = db.collection('rankings').doc(code).collection('students').doc(deviceId);
    const studentDoc = await studentRef.get();
    if (studentDoc.exists) {
        const question = quizData.questions[currentQuestionIndex];
        ui.displayQuestion(question, currentQuestionIndex, quizData.questions.length, studentDoc.data().hearts);
        let shuffledOptions = question.options.map((optionText, originalIndex) => ({ text: optionText, originalIndex: originalIndex })).sort(() => Math.random() - 0.5);
        ui.displayOptions(shuffledOptions, (originalIndex, button) => {
            sounds.playSelectSound();
            selectedOptionOriginalIndex = originalIndex;
            document.querySelectorAll('#options-container button').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            document.getElementById('next-btn').disabled = false;
        });
        document.getElementById('next-btn').disabled = true;
    } else {
        goHome();
    }
}

async function handleNextClick() {
    document.getElementById('next-btn').disabled = true;
    const code = document.getElementById('quiz-code').value;
    const sessionRef = db.collection('sessions').doc(code).collection('students').doc(deviceId);
    const sessionDoc = await sessionRef.get();
    if (!sessionDoc.exists) return;

    const stateDoc = await db.collection('quizState').doc('active').get();
    if (!stateDoc.exists || !stateDoc.data().isActive || stateDoc.data().code !== code) {
        showFinalPodiumFlow(code);
        return;
    }

    const studentRef = db.collection('rankings').doc(code).collection('students').doc(deviceId);
    const question = quizData.questions[currentQuestionIndex];
    const isCorrect = selectedOptionOriginalIndex === question.answer;

    let points = 0, heartChange = 0, heartBonusPoints = 0;
    if (isCorrect) {
        sounds.playCorrectSound();
        heartChange = 1;
        points = 1000;
    } else {
        sounds.playIncorrectSound();
        heartChange = -1;
        points = 0;
    }
    
    await db.runTransaction(async (transaction) => {
        const studentDoc = await transaction.get(studentRef);
        if (!studentDoc.exists) return;
        const data = studentDoc.data();
        const oldHearts = data.hearts || 3;
        let newHearts = oldHearts + heartChange;
        newHearts = Math.max(0, Math.min(24, newHearts));
        if (isCorrect && newHearts > oldHearts) {
            const tierIndex = Math.floor((newHearts - 1) / 3);
            heartBonusPoints = (tierIndex + 1) * 10;
        }
        const updateData = {
            score: (data.score || 0) + points + heartBonusPoints,
            correct: (data.correct || 0) + (isCorrect ? 1 : 0),
            incorrect: (data.incorrect || 0) + (isCorrect ? 0 : 1),
            hearts: newHearts
        };
        transaction.update(studentRef, updateData);
        if (newHearts === 0) {
            const penaltyEndTime = firebase.firestore.Timestamp.fromMillis(Date.now() + 20000);
            transaction.update(sessionRef, { penaltyEndTime: penaltyEndTime });
            await new Promise(resolve => ui.showPenaltyScreen(20, resolve));
            transaction.update(studentRef, { hearts: 3 });
            transaction.update(sessionRef, { penaltyEndTime: firebase.firestore.FieldValue.delete() });
        }
    });

    currentQuestionIndex++;
    await sessionRef.update({ questionIndex: currentQuestionIndex });

    if (currentQuestionIndex < quizData.questions.length) {
        displayQuestionFlow();
    } else {
        showWaitingScreen(code);
    }
}

function listenForQuizEnd(quizCode) {
    if (quizStateUnsubscribe) quizStateUnsubscribe();
    quizStateUnsubscribe = db.collection('quizState').doc('active').onSnapshot((doc) => {
        if (!doc.exists || !doc.data().isActive) {
            showFinalPodiumFlow(quizCode);
        }
    });
}

function showWaitingScreen(quizCode) {
    const studentRef = db.collection('rankings').doc(quizCode).collection('students').doc(deviceId);
    studentRef.get().then(doc => {
        if (doc.exists && !doc.data().endTime) {
            studentRef.update({ endTime: firebase.firestore.FieldValue.serverTimestamp() });
        }
    });
    ui.showScreen('end-screen');
}

async function showFinalPodiumFlow(quizCode) {
    if (quizStateUnsubscribe) quizStateUnsubscribe();

    const studentRef = db.collection('rankings').doc(quizCode).collection('students').doc(deviceId);
    const studentDoc = await studentRef.get();
    if (studentDoc.exists && !studentDoc.data().endTime) {
        await studentRef.update({
            endTime: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    const snapshot = await db.collection('rankings').doc(quizCode).collection('students').get();
    const ranking = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    ui.showFinalPodium(ranking, deviceId, studentName);
}

window.addEventListener('online', () => {
    document.getElementById('offline-indicator').classList.add('hidden');
});
window.addEventListener('offline', () => {
    document.getElementById('offline-indicator').classList.remove('hidden');
});

function attachEventListeners() {
    document.body.addEventListener('click', sounds.unlockAudio, { once: true });
    document.getElementById('student-back-btn').addEventListener('click', goHome);
    document.getElementById('go-home-btn').addEventListener('click', goHome);
    document.getElementById('join-btn').addEventListener('click', handleStudentJoin);
    document.getElementById('next-btn').addEventListener('click', handleNextClick);
    const joinOnEnter = (e) => { if (e.key === 'Enter') handleStudentJoin(); };
    document.getElementById('student-name').addEventListener('keydown', joinOnEnter);
    document.getElementById('quiz-code').addEventListener('keydown', joinOnEnter);
    document.querySelectorAll('button, a').forEach(btn => {
        btn.addEventListener('mouseenter', sounds.playHoverSound);
        btn.addEventListener('click', sounds.playClickSound);
    });
    document.querySelectorAll('input').forEach(el => {
        el.addEventListener('keydown', sounds.playKeypressSound);
    });
}
