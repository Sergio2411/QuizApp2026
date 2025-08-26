// Este archivo maneja todas las interacciones con el DOM (la interfaz de usuario)

const rankData = [
    { emoji: '🥇', message: '¡Un rendimiento excepcional! Eres una estrella.' },
    { emoji: '🥈', message: '¡Casi en la cima! Un esfuerzo increíble.' },
    { emoji: '🥉', message: '¡Estás en el podio! Gran trabajo.' },
    { emoji: '🚀', message: '¡Despegando hacia el éxito! Sigue así.' },
    { emoji: '🎯', message: '¡Diste en el blanco! Excelente precisión.' },
    { emoji: '💡', message: '¡Una mente brillante en acción! Felicidades.' },
    { emoji: '⭐', message: '¡Eres una superestrella! Brillaste con luz propia.' },
    { emoji: '🧠', message: '¡Ese cerebro está en llamas! Impresionante.' },
    { emoji: '🏆', message: '¡Actitud de campeón! Un resultado fantástico.' },
    { emoji: '🔥', message: '¡Estás imparable! Qué gran energía.' },
    { emoji: '🦊', message: '¡Astucia y rapidez! Muy bien jugado.' },
    { emoji: '🦉', message: '¡Sabiduría en cada respuesta! Excelente.' },
    { emoji: '🦅', message: '¡Una vista de águila para los detalles!' },
    { emoji: '🦁', message: '¡Rugiste con fuerza! Un gran resultado.' },
    { emoji: '💎', message: '¡Un diamante en bruto! Tu potencial es enorme.' },
    { emoji: '🗺️', message: '¡Explorador del conocimiento! Sigue descubriendo.' },
    { emoji: '🧭', message: '¡Encontraste el norte! Vas por buen camino.' },
    { emoji: '🏰', message: '¡Constructor de tu propio éxito! Felicidades.' },
    { emoji: '🔑', message: '¡Tienes la llave del conocimiento!' },
    { emoji: '📚', message: '¡Se nota tu dedicación al estudio! Muy bien.' },
    { emoji: '⚡', message: '¡Velocidad y precisión! Como un rayo.' },
    { emoji: '🌱', message: '¡Tu conocimiento está floreciendo! Sigue creciendo.' },
    { emoji: '🌻', message: '¡Brillas como el sol! Un resultado muy alegre.' },
    { emoji: '🍀', message: '¡La suerte acompaña a los preparados como tú!' },
    { emoji: '🍄', message: '¡Creciendo a pasos agigantados! Excelente.' },
    { emoji: '🐢', message: '¡Lento pero seguro! La constancia es tu fuerte.' },
    { emoji: '🐿️', message: '¡Agilidad mental! Muy buenas respuestas.' },
    { emoji: '🐘', message: '¡Memoria de elefante! No se te escapa nada.' },
    { emoji: '🦋', message: '¡Transformando el esfuerzo en éxito!' },
    { emoji: '🌠', message: '¡Eres una estrella fugaz! Rápido y brillante.' },
    { emoji: '☀️', message: '¡Iluminaste el examen con tus respuestas!' },
    { emoji: '🪐', message: '¡Tu conocimiento es de otra galaxia!' },
    { emoji: '✨', message: '¡Un toque de magia en cada respuesta!' },
    { emoji: '🎉', message: '¡A celebrar este gran resultado!' },
    { emoji: '🎊', message: '¡Fiesta de conocimiento! Muy bien hecho.' },
    { emoji: '🎁', message: '¡Tu inteligencia es un regalo! Sigue así.' },
    { emoji: '🎨', message: '¡Pintaste una obra de arte con tus respuestas!' },
    { emoji: '🎭', message: '¡Dominas el escenario del saber! Excelente.' },
    { emoji: '🎻', message: '¡Tus respuestas suenan como una sinfonía!' },
    { emoji: '🎲', message: '¡Arriesgaste y ganaste! Muy bien.' }
];

function getHeartsRankingString(hearts) {
    if (hearts <= 0) return '💔';
    const tiers = ['❤️', '🧡', '💛', '💚', '💙', '💜', '💖', '🔥'];
    const tierIndex = Math.floor((hearts - 1) / 3);
    const heartsInTier = ((hearts - 1) % 3) + 1;
    const currentLevel = tierIndex + 1;
    let emoji = tierIndex < tiers.length ? tiers[tierIndex] : '🔥';
    const heartsString = emoji.repeat(heartsInTier);
    return `<div class="text-xs font-semibold">Nivel ${currentLevel}</div><div class="text-lg">${heartsString}</div>`;
}

export function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active', 'flex'));
    const activeScreen = document.getElementById(screenId);
    activeScreen.classList.add('active', 'flex');

    const container = document.getElementById('main-container');
    if (screenId === 'admin-ranking-screen' || screenId === 'end-screen') {
        container.classList.remove('max-w-md', 'max-w-4xl');
        container.classList.add('max-w-5xl');
    } else if (screenId === 'quiz-screen') {
        container.classList.remove('max-w-md', 'max-w-5xl');
        container.classList.add('max-w-4xl');
    } else {
        container.classList.remove('max-w-4xl', 'max-w-5xl');
        container.classList.add('max-w-md');
    }
}

export function renderContent() {
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

export function updateHeartsDisplay(hearts) {
    const heartsContainer = document.getElementById('student-hearts-display');
    if (!heartsContainer) return;
    heartsContainer.className = 'flex items-center space-x-2 text-right';
    if (hearts <= 0) {
        heartsContainer.innerHTML = '<span class="text-2xl">💔</span>';
        return;
    }
    const tiers = ['❤️', '🧡', '💛', '💚', '💙', '💜', '💖', '🔥'];
    const tierIndex = Math.floor((hearts - 1) / 3);
    const heartsInTier = ((hearts - 1) % 3) + 1;
    const currentLevel = tierIndex + 1;
    let emoji = tierIndex < tiers.length ? tiers[tierIndex] : '🔥';
    const heartsString = emoji.repeat(heartsInTier);
    heartsContainer.innerHTML = `
        <div class="text-right">
            <div class="text-sm font-bold text-slate-700 whitespace-nowrap">Nivel ${currentLevel}</div>
            <div class="text-2xl h-8">${heartsString}</div>
        </div>
    `;
}

export function displayQuestion(question, questionIndex, totalQuestions, hearts) {
    updateHeartsDisplay(hearts);
    document.getElementById('progress-indicator').textContent = `Pregunta ${questionIndex + 1} / ${totalQuestions}`;
    const imgElement = document.getElementById('question-image');
    if (question.image) {
        imgElement.src = question.image;
        imgElement.style.display = 'block';
    } else {
        imgElement.style.display = 'none';
    }

    const questionTextElement = document.getElementById('question-text');
    questionTextElement.innerHTML = question.question;

    const questionLength = question.question.length;
    questionTextElement.classList.remove('text-2xl', 'md:text-3xl', 'text-xl', 'md:text-2xl', 'text-lg', 'md:text-xl');
    
    if (questionLength < 80) {
        questionTextElement.classList.add('text-2xl', 'md:text-3xl');
    } else if (questionLength < 150) {
        questionTextElement.classList.add('text-xl', 'md:text-2xl');
    } else {
        questionTextElement.classList.add('text-lg', 'md:text-xl');
    }

    renderContent();
}

export function displayOptions(options, onSelect) {
    const optionsContainer = document.getElementById('options-container');
    optionsContainer.innerHTML = '';
    
    optionsContainer.className = 'grid grid-cols-2 grid-rows-2 gap-3 h-full';

    // Paleta de colores actualizada para las opciones
    const optionColors = ['bg-sky-600', 'bg-amber-500', 'bg-sky-500', 'bg-amber-400'];
    const optionHoverColors = ['hover:bg-sky-700', 'hover:bg-amber-600', 'hover:bg-sky-600', 'hover:bg-amber-500'];

    options.forEach((option, displayIndex) => {
        const button = document.createElement('button');
        const colorClass = optionColors[displayIndex % 4];
        const hoverClass = optionHoverColors[displayIndex % 4];
        
        button.className = `w-full h-full text-white font-medium rounded-lg transition ${colorClass} ${hoverClass} flex items-center justify-center p-3 text-center`;
        button.style.fontSize = 'clamp(0.9rem, 3vmin, 1.5rem)';
        button.dataset.originalIndex = option.originalIndex;
        button.onclick = () => onSelect(option.originalIndex, button);
        button.innerHTML = `<span>${option.text}</span>`;
        
        optionsContainer.appendChild(button);
    });
    renderContent();
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

export function showFinalPodium(ranking, deviceId, studentName) {
    showScreen('end-screen');
    document.getElementById('waiting-view').classList.add('hidden');
    document.getElementById('results-view').classList.remove('hidden');
    triggerConfetti();

    const sortedRanking = ranking.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const timeA = (a.endTime && a.startTime) ? a.endTime.toMillis() - a.startTime.toMillis() : Infinity;
        const timeB = (b.endTime && b.startTime) ? b.endTime.toMillis() - b.startTime.toMillis() : Infinity;
        return timeA - timeB;
    });

    const myRankIndex = sortedRanking.findIndex(s => s.id === deviceId);
    const myRank = myRankIndex + 1;
    const myName = sortedRanking[myRankIndex]?.name || studentName;
    const podiumEmoji = document.getElementById('podium-emoji');
    const podiumTitle = document.getElementById('podium-title');
    const podiumMessage = document.getElementById('podium-message');
    const rankInfo = rankData[myRankIndex] || { emoji: '🎉', message: `Quedaste en el puesto #${myRank}. ¡Sigue esforzándote!` };
    podiumEmoji.textContent = rankInfo.emoji;
    podiumTitle.textContent = `¡${myName}, puesto #${myRank}!`;
    podiumMessage.textContent = rankInfo.message;
    
    const tbody = document.getElementById('final-ranking-table-body');
    tbody.innerHTML = '';
    if (sortedRanking.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-4 text-slate-500">No hay datos.</td></tr>';
        return;
    }
    sortedRanking.forEach((student, index) => {
        const rank = index + 1;
        const rankInfo = rankData[index] || { emoji: `${rank}` };
        const heartsDisplay = getHeartsRankingString(student.hearts);
        
        let elapsedTime = '---';
        if (student.startTime && student.endTime) {
            const diff = student.endTime.toMillis() - student.startTime.toMillis();
            const minutes = Math.floor(diff / 60000);
            const seconds = Math.floor((diff % 60000) / 1000);
            elapsedTime = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        const row = `
            <tr class="border-b">
                <td class="p-2 font-bold">${rankInfo.emoji}</td>
                <td class="p-2">${student.name}</td>
                <td class="p-2 text-center">${heartsDisplay}</td>
                <td class="p-2 text-center font-bold">${student.score}</td>
                <td class="p-2 text-center text-green-600">${student.correct}</td>
                <td class="p-2 text-center text-red-600">${student.incorrect}</td>
                <td class="p-2 text-center">${elapsedTime}</td>
            </tr>`;
        tbody.innerHTML += row;
    });
}

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

function triggerConfetti() {
    const container = document.getElementById('confetti-container');
    if (!container) return;
    for (let i = 0; i < 50; i++) {
        const confetti = document.createElement('div');
        confetti.classList.add('confetti');
        confetti.style.left = `${Math.random() * 100}vw`;
        confetti.style.animationDelay = `${Math.random() * 2}s`;
        confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 100%, 50%)`;
        container.appendChild(confetti);
        setTimeout(() => confetti.remove(), 3000);
    }
}
