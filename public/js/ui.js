// Este archivo maneja todas las interacciones con el DOM (la interfaz de usuario)

// --- DATOS Y CONSTANTES ---

export const rankData = [
    { emoji: '🥇', message: '¡Un rendimiento excepcional! Eres una estrella.' }, { emoji: '🥈', message: '¡Casi en la cima! Un esfuerzo increíble.' },
    { emoji: '🥉', message: '¡Estás en el podio! Gran trabajo.' }, { emoji: '🚀', message: '¡Despegando hacia el éxito! Sigue así.' },
    { emoji: '🎯', message: '¡Diste en el blanco! Excelente precisión.' }, { emoji: '💡', message: '¡Una mente brillante en acción! Felicidades.' },
    { emoji: '⭐', message: '¡Eres una superestrella! Brillaste con luz propia.' }, { emoji: '🧠', message: '¡Ese cerebro está en llamas! Impresionante.' },
    { emoji: '🏆', message: '¡Actitud de campeón! Un resultado fantástico.' }, { emoji: '🔥', message: '¡Estás imparable! Qué gran energía.' },
    { emoji: '🦊', message: '¡Astucia y rapidez! Muy bien jugado.' }, { emoji: '🦉', message: '¡Sabiduría en cada respuesta! Excelente.' },
    { emoji: '🦅', message: '¡Una vista de águila para los detalles!' }, { emoji: '🦁', message: '¡Rugiste con fuerza! Un gran resultado.' },
    { emoji: '💎', message: '¡Un diamante en bruto! Tu potencial es enorme.' }, { emoji: '🗺️', message: '¡Explorador del conocimiento! Sigue descubriendo.' },
    { emoji: '🧭', message: '¡Encontraste el norte! Vas por buen camino.' }, { emoji: '🏰', message: '¡Constructor de tu propio éxito! Felicidades.' },
    { emoji: '🔑', message: '¡Tienes la llave del conocimiento!' }, { emoji: '📚', message: '¡Se nota tu dedicación al estudio! Muy bien.' },
    { emoji: '⚡', message: '¡Velocidad y precisión! Como un rayo.' }, { emoji: '🌱', message: '¡Tu conocimiento está floreciendo! Sigue creciendo.' },
    { emoji: '🌻', message: '¡Brillas como el sol! Un resultado muy alegre.' }, { emoji: '🍀', message: '¡La suerte acompaña a los preparados como tú!' },
    { emoji: '🍄', message: '¡Creciendo a pasos agigantados! Excelente.' }, { emoji: '🐢', message: '¡Lento pero seguro! La constancia es tu fuerte.' },
    { emoji: '🐿️', message: '¡Agilidad mental! Muy buenas respuestas.' }, { emoji: '🐘', message: '¡Memoria de elefante! No se te escapa nada.' },
    { emoji: '🦋', message: '¡Transformando el esfuerzo en éxito!' }, { emoji: '🌠', message: '¡Eres una estrella fugaz! Rápido y brillante.' },
    { emoji: '☀️', message: '¡Iluminaste el examen con tus respuestas!' }, { emoji: '🪐', message: '¡Tu conocimiento es de otra galaxia!' },
    { emoji: '✨', message: '¡Un toque de magia en cada respuesta!' }, { emoji: '🎉', message: '¡A celebrar este gran resultado!' },
    { emoji: '🎊', message: '¡Fiesta de conocimiento! Muy bien hecho.' }, { emoji: '🎁', message: '¡Tu inteligencia es un regalo! Sigue así.' },
    { emoji: '🎨', message: '¡Pintaste una obra de arte con tus respuestas!' }, { emoji: '🎭', message: '¡Dominas el escenario del saber! Excelente.' },
    { emoji: '🎻', message: '¡Tus respuestas suenan como una sinfonía!' }, { emoji: '🎲', message: '¡Arriesgaste y ganaste! Muy bien.' },
];

export function getRankData(index) {
    return rankData[index] || { emoji: `P${index + 1}` };
}

const playerEmojis = [
    '😀', '😎', '😂', '🥳', '🤩', '🤯', '🤗', '🦄', '🦁', '🐯',
    '🦊', '🐶', '🐱', '🐭', '🐰', '🐼', '🐨', '🐻', '🐸', '🐢',
    '🦖', '🚀', '🛸', '🛰️', '⚡', '⭐', '🌟', '✨', '🔥', '💯'
];

const TIERS = ['❤️', '💖', '🔥', '🏆', '👑'];
const SCREEN_WIDTHS = {
    'admin-ranking-screen': 'max-w-5xl',
    'mastery-ranking-screen': 'max-w-5xl',
    'end-screen': 'max-w-5xl',
    'quiz-screen': 'max-w-4xl',
    'admin-preview-screen': 'max-w-4xl'
};

function getHeartsInfo(hearts) {
    if (hearts <= 0) {
        return { emoji: '💔', heartsString: '💔', currentLevel: 0, isBroken: true };
    }
    const tierIndex = Math.floor((hearts - 1) / 3);
    const heartsInTier = ((hearts - 1) % 3) + 1;
    const emoji = TIERS[tierIndex] || '🔥';
    return {
        emoji,
        heartsString: emoji.repeat(heartsInTier),
        currentLevel: tierIndex + 1,
        isBroken: false
    };
}

function getHeartsRankingString(hearts) {
    const { heartsString, currentLevel } = getHeartsInfo(hearts);
    if (hearts <= 0) return '💔';
    return `<div class="text-xs font-semibold">Nivel ${currentLevel}</div><div class="text-lg">${heartsString}</div>`;
}

export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    
    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.classList.remove('hidden');
        activeScreen.classList.add('active');
    }

    const container = document.getElementById('main-container');
    const newWidth = SCREEN_WIDTHS[screenId] || 'max-w-md';
    container.className = container.className.replace(/max-w-(md|4xl|5xl)/g, '').trim();
    container.classList.add(newWidth);
}


export function renderContent() {
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

export function renderEmojiSelector(containerId, hiddenInputId) {
    const container = document.getElementById(containerId);
    const hiddenInput = document.getElementById(hiddenInputId);
    if (!container || !hiddenInput) return;

    container.innerHTML = '';

    playerEmojis.forEach(emoji => {
        const button = document.createElement('button');
        button.className = 'p-2 text-3xl rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors';
        button.textContent = emoji;
        button.onclick = () => {
            hiddenInput.value = emoji;
            container.querySelectorAll('button').forEach(btn => btn.classList.remove('bg-blue-200'));
            button.classList.add('bg-blue-200');
        };
        container.appendChild(button);
    });
}

export function setupButtonGroup(containerId, onSelect) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const buttons = container.querySelectorAll('button');
    buttons.forEach(button => {
        button.addEventListener('click', () => {
            buttons.forEach(btn => {
                btn.classList.remove('bg-sky-500', 'text-white');
                btn.classList.add('bg-white', 'text-slate-700');
            });
            button.classList.add('bg-sky-500', 'text-white');
            button.classList.remove('bg-white', 'text-slate-700');
            
            if (typeof onSelect === 'function') {
                onSelect(button.dataset.mode);
            } else {
                console.error("Error: el callback onSelect no es una función. Revisa la llamada a setupButtonGroup.");
            }
        });
    });
}

export function updateMasteryProgress(masteredCount, totalQuestions) {
    const progressContainer = document.getElementById('mastery-progress-container');
    const progressBar = document.getElementById('mastery-progress-bar');
    const progressText = document.getElementById('mastery-progress-text');

    if (!progressContainer || !progressBar || !progressText) return;

    const progress = totalQuestions > 0 ? (masteredCount / totalQuestions) * 100 : 0;
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${masteredCount} / ${totalQuestions}`;
}

export function displayQuestion(currentQuestion, studentData, gameMode, totalQuestionsInQuiz) {
    let questionNumber;
    if (gameMode === 'classic') {
        questionNumber = (studentData.questionIndex || 0) + 1;
    } else {
        questionNumber = (studentData.progressCount || 0) + 1;
    }
    
    document.getElementById('progress-indicator').textContent = `Pregunta ${questionNumber}`;
    const imgElement = document.getElementById('question-image');
    if (currentQuestion.image) {
        imgElement.src = currentQuestion.image;
        imgElement.style.display = 'block';
    } else {
        imgElement.style.display = 'none';
    }

    const questionTextElement = document.getElementById('question-text');
    questionTextElement.innerHTML = currentQuestion.question;

    const masteryContainer = document.getElementById('mastery-progress-container');
    const heartsContainer = document.getElementById('student-hearts-display');

    if (gameMode === 'mastery_peak') {
        heartsContainer.classList.add('hidden');
        masteryContainer.classList.remove('hidden');
        updateMasteryProgress(studentData.progressCount || 0, totalQuestionsInQuiz);
    } else {
        heartsContainer.classList.remove('hidden');
        masteryContainer.classList.add('hidden');
        updateHeartsDisplay(studentData.hearts);
    }

    renderContent();
}

export function updateHeartsDisplay(hearts) {
    const heartsContainer = document.getElementById('student-hearts-display');
    if (!heartsContainer) return;
    
    const { heartsString, currentLevel, isBroken } = getHeartsInfo(hearts);
    
    heartsContainer.className = 'flex items-center space-x-2 text-right';
    if (isBroken) {
        heartsContainer.innerHTML = '<span class="text-2xl">💔</span>';
    } else {
        heartsContainer.innerHTML = `
            <div class="text-right">
                <div class="text-sm font-bold text-slate-700 whitespace-nowrap">Nivel ${currentLevel}</div>
                <div class="text-2xl h-8">${heartsString}</div>
            </div>
        `;
    }
}

export function displayOptions(options, onSelect, correctAnswerIndex = null) {
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    optionsContainer.className = 'grid grid-cols-2 grid-rows-2 gap-3 h-full';

    const optionColors = ['bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500'];
    const optionHoverColors = ['hover:bg-red-600', 'hover:bg-yellow-600', 'hover:bg-green-600', 'hover:bg-blue-600'];

    options.forEach((option, displayIndex) => {
        const button = document.createElement('button');
        const colorClass = optionColors[displayIndex % 4];
        const hoverClass = optionHoverColors[displayIndex % 4];
        
        button.className = `relative w-full h-full text-white font-bold rounded-lg transition ${colorClass} ${hoverClass} flex items-center justify-center p-3 text-center`;
        button.style.fontSize = 'clamp(1rem, 3.5vmin, 1.8rem)';
        button.dataset.originalIndex = option.originalIndex;
        button.id = `option-btn-${displayIndex}`;
        button.onclick = () => onSelect(option.originalIndex, button);
        
        button.innerHTML = `
            <div class="absolute top-2 left-3 text-xl font-bold opacity-50">${displayIndex + 1}</div>
            <div class="flex-grow text-center">${option.text}</div>
        `;

        if (option.originalIndex === correctAnswerIndex) {
            button.style.boxShadow = '0 0 10px 3px #67E8F9'; 
        }
        
        optionsContainer.appendChild(button);
    });
    renderContent();
}

export function showHeartGainAnimation(hearts) {
    return new Promise(resolve => {
        const overlay = document.getElementById('animation-overlay');
        const target = document.getElementById('student-hearts-display');
        if (!overlay || !target) {
            resolve();
            return;
        }

        const { emoji, currentLevel } = getHeartsInfo(hearts);
        const tierIndex = currentLevel - 1;

        const heart = document.createElement('div');
        heart.textContent = emoji;
        heart.className = 'heart-animation';
        heart.style.fontSize = `${5 + tierIndex}rem`;

        const targetRect = target.getBoundingClientRect();
        const endX = targetRect.left + (targetRect.width / 2) - (window.innerWidth / 2);
        const endY = targetRect.top + (targetRect.height / 2) - (window.innerHeight / 2);

        heart.style.setProperty('--target-transform', `translate(${endX}px, ${endY}px)`);
        
        overlay.appendChild(heart);
        
        triggerConfetti(20 + (tierIndex * 25));

        setTimeout(() => {
            heart.remove();
            resolve();
        }, 2000);
    });
}

export async function updateStudentStats(db, studentRef, sessionRef, isCorrect) {
    let heartsInfo = { oldHearts: 3, newHearts: 3 };
    await db.runTransaction(async (transaction) => {
        const studentDoc = await transaction.get(studentRef);
        if (!studentDoc.exists) return;
        
        const data = studentDoc.data();
        heartsInfo.oldHearts = data.hearts || 3;
        const heartChange = isCorrect ? 1 : -1;
        heartsInfo.newHearts = Math.max(0, Math.min(24, heartsInfo.oldHearts + heartChange));
        
        let points = isCorrect ? 1000 : 0;
        let heartBonusPoints = 0;
        if (isCorrect && heartsInfo.newHearts > heartsInfo.oldHearts) {
            const tierIndex = Math.floor((heartsInfo.newHearts - 1) / 3);
            heartBonusPoints = (tierIndex + 1) * 10;
        }
        
        const updateData = {
            score: (data.score || 0) + points + heartBonusPoints,
            correct: (data.correct || 0) + (isCorrect ? 1 : 0),
            incorrect: (data.incorrect || 0) + (isCorrect ? 0 : 1),
            hearts: heartsInfo.newHearts
        };

        transaction.update(studentRef, updateData);
        
        if (heartsInfo.newHearts === 0) {
            const penaltyEndTime = firebase.firestore.Timestamp.fromMillis(Date.now() + 20000);
            transaction.update(sessionRef, { penaltyEndTime });
        }
    });
    return heartsInfo;
}

export function updateRankingTable(ranking, quizCode, onDelete, showTime) {
    const table = document.querySelector('#admin-ranking-screen table');
    const thead = table.querySelector('thead tr');
    const tbody = table.querySelector('tbody');
    
    thead.innerHTML = `
        <th class="p-2">#</th> 
        <th class="p-2">👤</th> 
        <th class="p-2 text-center">❤️</th> 
        <th class="p-2 text-center">🏆</th> 
        <th class="p-2 text-center">✅</th> 
        <th class="p-2 text-center">❌</th> 
        ${showTime ? '<th class="p-2 text-center">⏱️</th>' : ''}
        <th class="p-2 text-center">Acción</th>
    `;
    
    tbody.innerHTML = '';
    if (ranking.length === 0) {
        const colspan = showTime ? 8 : 7;
        tbody.innerHTML = `<tr><td colspan="${colspan}" class="text-center p-4 text-slate-500">No hay datos para mostrar.</td></tr>`;
        return;
    }

    ranking.forEach((student, index) => {
        const rank = index + 1;
        const rankInfo = rankData[index] || { emoji: `${rank}` };
        const heartsDisplay = getHeartsRankingString(student.hearts);
        
        let timeCell = '';
        if (showTime) {
            let elapsedTime = '---';
            if (student.startTime && student.endTime) {
                const diff = student.endTime.toMillis() - student.startTime.toMillis();
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                elapsedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
            timeCell = `<td class="p-2 text-center">${elapsedTime}</td>`;
        }

        const row = `
            <tr class="border-b">
                <td class="p-2 font-bold">${rankInfo.emoji}</td>
                <td class="p-2">${student.name}</td>
                <td class="p-2 text-center">${heartsDisplay}</td>
                <td class="p-2 text-center font-bold">${student.score}</td>
                <td class="p-2 text-center text-green-600">${student.correct}</td>
                <td class="p-2 text-center text-red-600">${student.incorrect}</td>
                ${timeCell}
                <td class="p-2 text-center"><button data-student-id="${student.id}" data-student-name="${student.name}" data-quiz-code="${quizCode}" class="delete-student-btn text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Eliminar</button></td>
            </tr>`;
        tbody.innerHTML += row;
    });
    document.querySelectorAll('.delete-student-btn').forEach(btn => btn.addEventListener('click', onDelete));
}

export function updateMasteryRanking(students, totalQuestions) {
    const container = document.getElementById('climbers-container');
    const rankingList = document.getElementById('mastery-ranking-list');
    
    const sortedStudents = sortMasteryRanking(students, totalQuestions);

    // Actualizar lista vertical
    rankingList.innerHTML = sortedStudents.map((student, index) => {
        const rankInfo = rankData[index] || { emoji: `${index + 1}` };
        const progress = student.progressCount || 0;
        const penalty = student.penaltyEndTime && student.penaltyEndTime.toMillis() > Date.now();
        const penaltySeconds = penalty ? Math.round((student.penaltyEndTime.toMillis() - Date.now()) / 1000) : 0;

        return `
            <li class="flex items-center p-2 border-b border-slate-200/50">
                <span class="font-bold w-8">${rankInfo.emoji}</span>
                <span class="text-2xl w-8">${student.playerEmoji || '🧗‍♂️'}</span>
                <span class="flex-grow truncate">${student.name}</span>
                ${penalty ? `<span class="text-xs font-bold text-red-400 bg-red-900/50 px-2 py-1 rounded-full">⏱️ ${penaltySeconds}s</span>` : ''}
                <span class="font-semibold ml-2">${progress}/${totalQuestions}</span>
            </li>
        `;
    }).join('');

    // Actualizar montaña animada
    const currentClimbers = new Set();
    students.forEach((student) => {
        const climberId = `climber-${student.id}`;
        currentClimbers.add(climberId);

        let climber = document.getElementById(climberId);
        if (!climber) {
            climber = document.createElement('div');
            climber.id = climberId;
            climber.className = 'climber';
            climber.innerHTML = `
                <div class="text-3xl">${student.playerEmoji || '🧗‍♂️'}</div>
                <div class="climber-name">${student.name}</div>
            `;
            container.appendChild(climber);
        }

        const progress = (student.progressCount || 0) / totalQuestions;
        const topPosition = 90 - (progress * 80); 
        const horizontalWave = Math.sin(progress * Math.PI * 1.5) * 25;
        const leftPosition = 50 + horizontalWave;

        climber.style.top = `${topPosition}%`;
        climber.style.left = `${leftPosition}%`;
        
        if (progress >= 1) {
            climber.querySelector('.text-3xl').textContent = '🏆';
        } else {
            climber.querySelector('.text-3xl').textContent = student.playerEmoji || '🧗‍♂️';
        }
    });

    Array.from(container.children).forEach(child => {
        if (child.classList.contains('climber') && !currentClimbers.has(child.id)) {
            child.remove();
        }
    });
}

// Para el ranking final del admin
export function showFinalMasteryPodium(students, totalQuestions) {
    showScreen('mastery-ranking-screen');
    const container = document.getElementById('climbers-container');
    container.innerHTML = ''; 
    document.getElementById('mastery-ranking-list').innerHTML = '';

    const tableContainer = document.createElement('div');
    tableContainer.className = "p-4 bg-white/90 backdrop-blur-sm absolute inset-0 overflow-y-auto";

    const sortedRanking = sortMasteryRanking(students, totalQuestions);
    
    let tableHTML = `
        <h2 class="text-xl font-bold mb-2 text-slate-800">Ranking Final - Pico de Maestría</h2>
        <table class="w-full text-sm text-left">
            <thead class="bg-slate-200 sticky top-0">
                <tr>
                    <th class="p-2">#</th>
                    <th class="p-2">👤 Nombre</th>
                    <th class="p-2 text-center">🏔️ Progreso</th>
                    <th class="p-2 text-center">⏱️ Tiempo</th>
                </tr>
            </thead>
            <tbody>
    `;

    sortedRanking.forEach((student, index) => {
        const rankInfo = rankData[index] || { emoji: `${index + 1}` };
        tableHTML += masteryRankingRow(student, rankInfo, totalQuestions);
    });

    tableHTML += '</tbody></table>';
    tableContainer.innerHTML = tableHTML;
    container.parentElement.appendChild(tableContainer);
}

export function showStudentStatsSummary(allStudents, deviceId, gameMode) {
    const myData = allStudents.find(s => s.id === deviceId);
    if (!myData) return;

    let rankInfo = { emoji: '🎉' };
    if (gameMode === 'classic') {
        const sortedClassic = [...allStudents].sort((a, b) => b.score - a.score);
        const myRankIndex = sortedClassic.findIndex(s => s.id === deviceId);
        rankInfo = rankData[myRankIndex] || { emoji: '🎉' };
    }

    let elapsedTime = 'Calculando...';
    if (myData.startTime && myData.endTime) {
        const diff = myData.endTime.toMillis() - myData.startTime.toMillis();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        elapsedTime = `${minutes} min ${seconds} seg`;
    }

    document.getElementById('stats-emoji').textContent = myData.playerEmoji || rankInfo.emoji;
    document.getElementById('stats-name').textContent = myData.name;

    const heartsStats = document.getElementById('stats-hearts-container');
    const scoreStats = document.getElementById('stats-score-container');

    if (gameMode === 'classic') {
        heartsStats.classList.remove('hidden');
        scoreStats.classList.remove('hidden');
        document.getElementById('stats-hearts').textContent = `${myData.hearts} corazones`;
        document.getElementById('stats-score').textContent = `${myData.score} puntos`;
    } else {
        heartsStats.classList.add('hidden');
        scoreStats.classList.add('hidden');
    }
    
    document.getElementById('stats-correct').textContent = `${myData.correct || myData.progressCount || 0} correctas`;
    document.getElementById('stats-incorrect').textContent = `${myData.incorrect || 0} incorrectas`;
    document.getElementById('stats-time').textContent = elapsedTime;
}

function sortMasteryRanking(students, totalQuestions) {
    return students.sort((a, b) => {
        const aMastered = a.progressCount || 0;
        const bMastered = b.progressCount || 0;
        const aFinished = aMastered >= totalQuestions;
        const bFinished = bMastered >= totalQuestions;

        if (aFinished && bFinished) {
            const timeA = (a.endTime && a.startTime) ? a.endTime.toMillis() - a.startTime.toMillis() : Infinity;
            const timeB = (b.endTime && b.startTime) ? b.endTime.toMillis() - b.startTime.toMillis() : Infinity;
            return timeA - timeB;
        }
        if (aFinished) return -1;
        if (bFinished) return 1;
        return bMastered - aMastered;
    });
}

function masteryRankingRow(student, rankInfo, totalQuestions) {
    const masteredCount = student.progressCount || 0;
    
    let elapsedTime = '---';
    if (student.startTime && student.endTime && masteredCount >= totalQuestions) {
        const diff = student.endTime.toMillis() - student.startTime.toMillis();
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        elapsedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `
        <tr class="border-b">
            <td class="p-2 font-bold">${rankInfo.emoji}</td>
            <td class="p-2 flex items-center gap-2"><span class="text-xl">${student.playerEmoji || '👤'}</span> ${student.name}</td>
            <td class="p-2 text-center font-semibold">${masteredCount} / ${totalQuestions}</td>
            <td class="p-2 text-center">${masteredCount >= totalQuestions ? elapsedTime : 'No finalizó'}</td>
        </tr>`;
}


export function showFinalPodium(ranking, deviceId, studentName, gameMode, totalQuestionsInQuiz) {
    showScreen('end-screen');
    document.getElementById('waiting-view').classList.add('hidden');
    document.getElementById('results-view').classList.remove('hidden');
    
    triggerConfetti(100);
    
    let sortedRanking, myRankIndex, myRank, myData;
    
    const finalRankingHeader = document.getElementById('final-ranking-header');
    const finalRankingBody = document.getElementById('final-ranking-table-body');
    finalRankingBody.innerHTML = '';

    if (gameMode === 'classic') {
        document.getElementById('final-ranking-title').textContent = 'Ranking Final - Clásico';
        finalRankingHeader.innerHTML = `
            <th class="p-2">#</th><th class="p-2">👤</th><th class="p-2 text-center">❤️</th>
            <th class="p-2 text-center">🏆</th><th class="p-2 text-center">✅</th>
            <th class="p-2 text-center">❌</th><th class="p-2 text-center">⏱️</th>`;

        sortedRanking = ranking.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            const timeA = (a.endTime && a.startTime) ? a.endTime.toMillis() - a.startTime.toMillis() : Infinity;
            const timeB = (b.endTime && b.startTime) ? b.endTime.toMillis() - b.startTime.toMillis() : Infinity;
            return timeA - timeB;
        });
        
        myRankIndex = sortedRanking.findIndex(s => s.id === deviceId);
        myData = sortedRanking[myRankIndex];

        sortedRanking.forEach((student, index) => {
            const rank = index + 1;
            const rankInfo = getRankData(index);
            const heartsDisplay = getHeartsRankingString(student.hearts);
            
            let elapsedTime = '---';
            if (student.startTime && student.endTime) {
                const diff = student.endTime.toMillis() - student.startTime.toMillis();
                const minutes = Math.floor(diff / 60000);
                const seconds = Math.floor((diff % 60000) / 1000);
                elapsedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            }
    
            const row = `
                <tr class="border-b ${student.id === deviceId ? 'bg-sky-100' : ''}">
                    <td class="p-2 font-bold">${rankInfo.emoji}</td>
                    <td class="p-2 flex items-center gap-2"><span class="text-xl">${student.playerEmoji || '👤'}</span> ${student.name}</td>
                    <td class="p-2 text-center">${heartsDisplay}</td>
                    <td class="p-2 text-center font-bold">${student.score}</td>
                    <td class="p-2 text-center text-green-600">${student.correct}</td>
                    <td class="p-2 text-center text-red-600">${student.incorrect}</td>
                    <td class="p-2 text-center">${elapsedTime}</td>
                </tr>`;
            finalRankingBody.innerHTML += row;
        });

    } else { 
        document.getElementById('final-ranking-title').textContent = 'Ranking Final - Pico de Maestría';
        finalRankingHeader.innerHTML = `
            <th class="p-2">#</th><th class="p-2">👤 Nombre</th>
            <th class="p-2 text-center">🏔️ Progreso</th><th class="p-2 text-center">⏱️ Tiempo</th>`;
        
        sortedRanking = sortMasteryRanking(ranking, totalQuestionsInQuiz);
        myRankIndex = sortedRanking.findIndex(s => s.id === deviceId);
        myData = sortedRanking[myRankIndex];

        sortedRanking.forEach((student, index) => {
            const rank = index + 1;
            const rankInfo = getRankData(index);
            const row = masteryRankingRow(student, rankInfo, totalQuestionsInQuiz);
            finalRankingBody.innerHTML += row.replace('<tr class="border-b">', `<tr class="border-b ${student.id === deviceId ? 'bg-sky-100' : ''}">`);
        });
    }

    myRank = myRankIndex + 1;
    const myName = myData?.name || studentName;
    const rankInfo = getRankData(myRankIndex);
    document.getElementById('podium-emoji').textContent = myData?.playerEmoji || rankInfo.emoji;
    document.getElementById('podium-title').textContent = `¡${myName}, puesto #${myRank}!`;
    document.getElementById('podium-message').textContent = rankInfo.message;
}

// --- INICIO DE LA MODIFICACIÓN ---
// Se añade la función que faltaba para renderizar las medallas.
export function renderMedals(medals) {
    const container = document.getElementById('medals-container');
    if (!container) return;

    if (medals.length === 0) {
        container.innerHTML = `<p class="text-slate-500 col-span-full text-center">Aún no has ganado ninguna medalla. ¡Sigue jugando!</p>`;
        return;
    }

    container.innerHTML = medals.map(medal => `
        <div class="bg-white border rounded-lg p-4 flex flex-col items-center text-center shadow">
            <div class="text-6xl mb-2">${medal.emoji}</div>
            <p class="font-bold text-sm truncate w-full" title="${medal.quizTitle}">${medal.quizTitle}</p>
            <p class="text-xs text-slate-500">${new Date(medal.date.seconds * 1000).toLocaleDateString()}</p>
        </div>
    `).join('');
}
// --- FIN DE LA MODIFICACIÓN ---


export function showPenaltyScreen(duration, onComplete) {
    const penaltyScreen = document.getElementById('penalty-screen');
    const countdownEl = document.getElementById('penalty-countdown');
    if (!penaltyScreen || !countdownEl) return;
    penaltyScreen.classList.remove('hidden');
    let seconds = Math.ceil(duration);
    countdownEl.textContent = seconds;
    const interval = setInterval(() => {
        seconds--;
        countdownEl.textContent = seconds;
        if (seconds <= 0) {
            clearInterval(interval);
            penaltyScreen.classList.add('hidden');
            onComplete();
        }
    }, 1000);
}

function triggerConfetti(amount = 50) {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    for (let i = 0; i < amount; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.animationDelay = `${Math.random() * 1.5}s`;
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 60%)`;
        container.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }
}

// --- FUNCIONES PARA VISTA PREVIA DEL EXAMEN ---

export function displayQuestionInPreview(question, questionIndex, totalQuestions, quizTitle) {
    document.getElementById('preview-quiz-title').textContent = `Vista Previa: ${quizTitle}`;
    document.getElementById('preview-progress-indicator').textContent = `Pregunta ${questionIndex + 1} / ${totalQuestions}`;

    const imgElement = document.getElementById('preview-question-image');
    imgElement.src = question.image || '';
    imgElement.style.display = question.image ? 'block' : 'none';

    const questionTextElement = document.getElementById('preview-question-text');
    questionTextElement.innerHTML = question.question;

    renderContent();
}

export function displayOptionsInPreview(options, onSelect) {
    const optionsContainer = document.getElementById('preview-options-container');
    optionsContainer.innerHTML = '';
    
    optionsContainer.className = 'grid grid-cols-2 grid-rows-2 gap-3 h-full';

    const optionColors = ['bg-red-500', 'bg-yellow-500', 'bg-green-500', 'bg-blue-500'];
    const optionHoverColors = ['hover:bg-red-600', 'hover:bg-yellow-600', 'hover:bg-green-600', 'hover:bg-blue-600'];

    options.forEach((option, displayIndex) => {
        const button = document.createElement('button');
        const colorClass = optionColors[displayIndex % 4];
        const hoverClass = optionHoverColors[displayIndex % 4];
        
        button.className = `relative w-full h-full text-white font-bold rounded-lg transition ${colorClass} ${hoverClass} flex items-center justify-center p-3 text-center`;
        button.style.fontSize = 'clamp(1rem, 3.5vmin, 1.8rem)';
        button.dataset.originalIndex = option.originalIndex;
        button.onclick = () => onSelect(option.originalIndex, button);
        
        button.innerHTML = `
            <div class="absolute top-2 left-3 text-xl font-bold opacity-50">${displayIndex + 1}</div>
            <div class="flex-grow text-center">${option.text}</div>
        `;
        
        optionsContainer.appendChild(button);
    });
    renderContent();
}

function showFeedbackAnimation(emoji) {
    return new Promise(resolve => {
        const overlay = document.getElementById('animation-overlay');
        if (!overlay) return resolve();

        const feedback = document.createElement('div');
        feedback.textContent = emoji;
        feedback.className = 'feedback-animation';
        overlay.appendChild(feedback);

        setTimeout(() => {
            feedback.remove();
            resolve();
        }, 1500); // Duración de la animación
    });
}

export function showCheckAnimation() {
    return showFeedbackAnimation('✅');
}

export function showCrossAnimation() {
    return showFeedbackAnimation('❌');
}

