import { firebaseConfig } from './config.js';

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

let deleteConfirmCallback = null;
let allQuizzes = [];
let filteredQuizzes = [];
let currentPage = 1;
const QUIZZES_PER_PAGE = 3;

let currentQuizData = null; 
let currentFilteredQuestions = [];
let editingQuestionIndex = -1; // CAMBIO: Para saber qué pregunta se está editando

// --- NAVEGACIÓN Y VISTAS ---
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active', 'flex');
        s.classList.add('hidden');
    });
    const activeScreen = document.getElementById(screenId);
    activeScreen.classList.remove('hidden');
    activeScreen.classList.add('active', 'flex');
}

function showQuizList() {
    loadQuizzes();
    showScreen('list-quizzes-screen');
}

function showEditForm(quizData = null) {
    const titleEl = document.getElementById('edit-quiz-title');
    const idInput = document.getElementById('quiz-id');
    const titleInput = document.getElementById('quiz-title-input');
    const questionsContainer = document.getElementById('questions-editor-container');

    questionsContainer.innerHTML = '';
    
    if (quizData) {
        titleEl.textContent = 'Editar Examen Completo';
        idInput.value = quizData.id;
        titleInput.value = quizData.title;
        if (quizData.questions) {
            quizData.questions.forEach((q, index) => addQuestionToForm(q, index));
        }
    } else {
        titleEl.textContent = 'Crear Nuevo Examen';
        idInput.value = '';
        titleInput.value = '';
        addQuestionToForm();
    }
    showScreen('edit-quiz-screen');
}

async function showViewQuestionsScreen(quizId) {
    const doc = await db.collection('quizzes').doc(quizId).get();
    if (!doc.exists) {
        alert("No se encontró el examen.");
        return;
    }
    currentQuizData = { id: doc.id, ...doc.data() };
    currentFilteredQuestions = [...currentQuizData.questions];
    
    document.getElementById('view-quiz-title').textContent = currentQuizData.title;
    document.getElementById('search-question-input').value = '';
    
    renderQuestionsTable();
    showScreen('view-questions-screen');
}

// CAMBIO: Nueva función para mostrar la pantalla de edición de una sola pregunta
function showEditQuestionScreen(questionIndex) {
    editingQuestionIndex = questionIndex;
    const questionData = currentQuizData.questions[questionIndex];
    const container = document.getElementById('single-question-editor-container');
    
    document.getElementById('edit-question-title').textContent = `Editar Pregunta ${questionIndex + 1}`;
    
    let optionsHtml = '';
    for (let i = 0; i < 4; i++) {
        optionsHtml += `
            <div class="flex items-center space-x-2">
                <input type="radio" id="single-correct-answer-${i}" name="single-correct-answer" value="${i}" ${questionData.answer === i ? 'checked' : ''} class="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500">
                <input type="text" id="single-option-${i}" placeholder="Opción ${i + 1}" value="${questionData.options[i] || ''}" class="option-input flex-grow px-2 py-1 border border-slate-300 rounded-md text-sm">
            </div>
        `;
    }

    container.innerHTML = `
        <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">Texto de la Pregunta</label>
            <textarea id="single-question-text" class="w-full px-3 py-2 border border-slate-300 rounded-md">${questionData.question}</textarea>
            <label class="block text-sm font-medium text-slate-700">URL de la Imagen (opcional)</label>
            <input type="text" id="single-question-image" class="w-full px-3 py-2 border border-slate-300 rounded-md" value="${questionData.image || ''}">
            <label class="block text-sm font-medium text-slate-700">Opciones y Respuesta Correcta</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                ${optionsHtml}
            </div>
        </div>
    `;
    showScreen('edit-question-screen');
}


function renderContent() {
    if (window.MathJax) {
        MathJax.typesetPromise();
    }
}

// --- LÓGICA DEL CRUD ---

function renderQuizzesTable() {
    const tbody = document.getElementById('quizzes-table-body');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * QUIZZES_PER_PAGE;
    const endIndex = startIndex + QUIZZES_PER_PAGE;
    const paginatedQuizzes = filteredQuizzes.slice(startIndex, endIndex);

    if (paginatedQuizzes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-slate-500">No se encontraron exámenes.</td></tr>';
    } else {
        paginatedQuizzes.forEach(quiz => {
            const row = document.createElement('tr');
            row.className = 'border-b clickable-row';
            row.dataset.id = quiz.id;
            row.innerHTML = `
                <td class="p-3">
                    <div class="font-bold truncate">${quiz.title || 'Examen sin título'}</div>
                </td>
                <td class="p-3 text-center" style="width: 150px;">
                    ${quiz.questions ? quiz.questions.length : 0}
                </td>
                <td class="p-3" style="width: 100px;">
                    <div class="flex justify-center items-center space-x-2">
                        <button class="delete-btn text-xl p-1 rounded-full hover:bg-red-200 transition-colors" data-id="${quiz.id}" data-title="${quiz.title}" title="Eliminar">🗑️</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
    }
    renderPaginationControls();
}

function renderQuestionsTable() {
    const tbody = document.getElementById('questions-table-body');
    tbody.innerHTML = '';

    if (currentFilteredQuestions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-slate-500">No se encontraron preguntas.</td></tr>';
        return;
    }

    currentFilteredQuestions.forEach((question, index) => {
        const originalIndex = currentQuizData.questions.indexOf(question);
        const correctAnswer = question.options[question.answer];
        const row = document.createElement('tr');
        row.className = 'border-b';
        row.innerHTML = `
            <td class="p-3">${question.question}</td>
            <td class="p-3" style="width: 200px;">${correctAnswer}</td>
            <td class="p-3" style="width: 100px;">
                <div class="flex justify-center items-center space-x-2">
                    <button class="edit-question-btn text-xl p-1 rounded-full hover:bg-yellow-200 transition-colors" data-question-index="${originalIndex}" title="Modificar Pregunta">✏️</button>
                    <button class="delete-question-btn text-xl p-1 rounded-full hover:bg-red-200 transition-colors" data-question-index="${originalIndex}" title="Eliminar Pregunta">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    renderContent();
}


function renderPaginationControls() {
    const prevBtn = document.getElementById('prev-page-btn');
    const nextBtn = document.getElementById('next-page-btn');
    const pageIndicator = document.getElementById('page-indicator');
    const paginationControls = document.getElementById('pagination-controls');

    const totalPages = Math.ceil(filteredQuizzes.length / QUIZZES_PER_PAGE);

    if (totalPages <= 1) {
        paginationControls.classList.add('hidden');
        return;
    }
    
    paginationControls.classList.remove('hidden');
    pageIndicator.textContent = `Página ${currentPage} de ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
}

async function loadQuizzes() {
    const tbody = document.getElementById('quizzes-table-body');
    tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4">Cargando exámenes...</td></tr>';
    try {
        const snapshot = await db.collection('quizzes').get();
        let quizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        quizzes.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
        });

        allQuizzes = quizzes;
        
        document.getElementById('search-quiz-input').value = '';
        filteredQuizzes = [...allQuizzes];
        currentPage = 1;
        renderQuizzesTable();
    } catch (error) {
        console.error("Error al cargar los exámenes:", error);
        tbody.innerHTML = '<tr><td colspan="3" class="text-center p-4 text-red-500">No se pudieron cargar los exámenes.</td></tr>';
    }
}

async function saveQuiz() {
    const quizId = document.getElementById('quiz-id').value;
    const title = document.getElementById('quiz-title-input').value.trim();
    if (!title) {
        alert('El examen debe tener un título.');
        return;
    }

    const questions = [];
    const questionElements = document.querySelectorAll('.question-card');
    for (const el of questionElements) {
        const questionText = el.querySelector('.question-text-input').value.trim();
        const image = el.querySelector('.question-image-input').value.trim();
        const options = Array.from(el.querySelectorAll('.option-input')).map(input => input.value.trim());
        const answerInput = el.querySelector('input[name^="correct-answer-"]:checked');

        if (!questionText || options.some(opt => !opt) || !answerInput) {
            alert('Todas las preguntas deben estar completas (texto, 4 opciones y una respuesta correcta).');
            return;
        }
        
        questions.push({
            question: questionText,
            image: image || null,
            options: options,
            answer: parseInt(answerInput.value)
        });
    }

    const quizData = { title, questions };
    
    if (!quizId) {
        quizData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
    }

    try {
        if (quizId) {
            await db.collection('quizzes').doc(quizId).set(quizData, { merge: true });
        } else {
            await db.collection('quizzes').add(quizData);
        }
        showQuizList();
    } catch (error) {
        console.error("Error al guardar el examen:", error);
        alert('No se pudo guardar el examen.');
    }
}

// CAMBIO: Nueva función para guardar los cambios de una sola pregunta
async function saveSingleQuestion() {
    const questionText = document.getElementById('single-question-text').value.trim();
    const image = document.getElementById('single-question-image').value.trim();
    const options = [
        document.getElementById('single-option-0').value.trim(),
        document.getElementById('single-option-1').value.trim(),
        document.getElementById('single-option-2').value.trim(),
        document.getElementById('single-option-3').value.trim(),
    ];
    const answerInput = document.querySelector('input[name="single-correct-answer"]:checked');

    if (!questionText || options.some(opt => !opt) || !answerInput) {
        alert('La pregunta debe estar completa (texto, 4 opciones y una respuesta correcta).');
        return;
    }

    const updatedQuestion = {
        question: questionText,
        image: image || null,
        options: options,
        answer: parseInt(answerInput.value)
    };

    // Actualiza la pregunta en el array local
    currentQuizData.questions[editingQuestionIndex] = updatedQuestion;

    try {
        // Guarda todo el array de preguntas actualizado en Firestore
        await db.collection('quizzes').doc(currentQuizData.id).update({
            questions: currentQuizData.questions
        });
        showViewQuestionsScreen(currentQuizData.id); // Vuelve a la lista de preguntas
    } catch (error) {
        console.error("Error al guardar la pregunta:", error);
        alert("No se pudo guardar la pregunta.");
    }
}


function confirmDelete(quizId, quizTitle) {
    const message = `¿Seguro que quieres eliminar el examen "${quizTitle}"? Esta acción no se puede deshacer.`;
    document.getElementById('delete-confirm-message').textContent = message;
    deleteConfirmCallback = async () => {
        try {
            await db.collection('quizzes').doc(quizId).delete();
            hideDeleteModal();
            loadQuizzes();
        } catch (error) {
            console.error("Error al eliminar el examen:", error);
            alert('No se pudo eliminar el examen.');
            hideDeleteModal();
        }
    };
    document.getElementById('delete-confirm-modal').classList.remove('hidden');
}

async function deleteQuestion(questionIndex) {
    const questionText = currentQuizData.questions[questionIndex].question;
    const message = `¿Seguro que quieres eliminar la pregunta: "${questionText.substring(0, 50)}..."?`;
    document.getElementById('delete-confirm-message').textContent = message;

    deleteConfirmCallback = async () => {
        currentQuizData.questions.splice(questionIndex, 1);
        try {
            await db.collection('quizzes').doc(currentQuizData.id).update({ questions: currentQuizData.questions });
            hideDeleteModal();
            showViewQuestionsScreen(currentQuizData.id);
        } catch (error) {
            console.error("Error al eliminar la pregunta:", error);
            alert('No se pudo eliminar la pregunta.');
            hideDeleteModal();
        }
    };
    document.getElementById('delete-confirm-modal').classList.remove('hidden');
}


function hideDeleteModal() {
    document.getElementById('delete-confirm-modal').classList.add('hidden');
    deleteConfirmCallback = null;
}

function addQuestionToForm(questionData = null, index = -1) {
    const container = document.getElementById('questions-editor-container');
    const questionIndex = index === -1 ? container.children.length : index;
    
    const card = document.createElement('div');
    card.className = 'question-card bg-white border border-slate-200 p-4 rounded-lg';
    
    const questionText = questionData ? questionData.question : '';
    const image = questionData ? questionData.image : '';
    const options = questionData ? questionData.options : ['', '', '', ''];
    const answer = questionData ? questionData.answer : -1;

    let optionsHtml = '';
    for (let i = 0; i < 4; i++) {
        optionsHtml += `
            <div class="flex items-center space-x-2">
                <input type="radio" id="correct-answer-${questionIndex}-${i}" name="correct-answer-${questionIndex}" value="${i}" ${answer === i ? 'checked' : ''} class="h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500">
                <input type="text" id="option-${questionIndex}-${i}" name="option-${questionIndex}-${i}" placeholder="Opción ${i + 1}" value="${options[i] || ''}" class="option-input flex-grow px-2 py-1 border border-slate-300 rounded-md text-sm">
            </div>
        `;
    }

    card.innerHTML = `
        <div class="flex justify-between items-center mb-2">
            <h4 class="font-semibold">Pregunta ${questionIndex + 1}</h4>
            <button class="remove-question-btn text-sm text-red-600 hover:text-red-800">Eliminar</button>
        </div>
        <div class="space-y-2">
            <textarea id="question-text-${questionIndex}" name="question-text-${questionIndex}" class="question-text-input w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="Escribe la pregunta...">${questionText}</textarea>
            <input type="text" id="question-image-${questionIndex}" name="question-image-${questionIndex}" class="question-image-input w-full px-3 py-2 border border-slate-300 rounded-md" placeholder="URL de la imagen (opcional)" value="${image || ''}">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                ${optionsHtml}
            </div>
        </div>
    `;
    container.appendChild(card);
}

function removeQuestionFromForm(button) {
    const card = button.closest('.question-card');
    card.remove();
    const allCards = document.querySelectorAll('.question-card');
    allCards.forEach((c, index) => {
        c.querySelector('h4').textContent = `Pregunta ${index + 1}`;
        c.querySelectorAll('input[type="radio"]').forEach(radio => {
            radio.name = `correct-answer-${index}`;
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    showQuizList();

    const normalizeText = (text) => {
        if (!text) return '';
        return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };

    document.getElementById('search-quiz-input').addEventListener('input', (e) => {
        const searchTerm = normalizeText(e.target.value);
        filteredQuizzes = allQuizzes.filter(quiz => 
            normalizeText(quiz.title).includes(searchTerm)
        );
        currentPage = 1;
        renderQuizzesTable();
    });

    document.getElementById('search-question-input').addEventListener('input', (e) => {
        const searchTerm = normalizeText(e.target.value);
        currentFilteredQuestions = currentQuizData.questions.filter(q => 
            normalizeText(q.question).includes(searchTerm)
        );
        renderQuestionsTable();
    });
    
    document.getElementById('prev-page-btn').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            renderQuizzesTable();
        }
    });

    document.getElementById('next-page-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(filteredQuizzes.length / QUIZZES_PER_PAGE);
        if (currentPage < totalPages) {
            currentPage++;
            renderQuizzesTable();
        }
    });

    document.body.addEventListener('click', async (e) => {
        if (e.target.closest('#add-quiz-btn')) showEditForm();
        if (e.target.closest('#save-quiz-btn')) saveQuiz();
        if (e.target.closest('#cancel-edit-btn')) showQuizList();
        if (e.target.closest('#add-question-btn')) addQuestionToForm();
        if (e.target.closest('#back-to-panel-btn')) window.location.href = '/admin.html';
        if (e.target.closest('#back-to-list-btn')) showQuizList();
        if (e.target.closest('#save-single-question-btn')) saveSingleQuestion();
        if (e.target.closest('#cancel-single-question-edit-btn')) showViewQuestionsScreen(currentQuizData.id);
        
        const quizRow = e.target.closest('.clickable-row');
        if (quizRow && !e.target.closest('.delete-btn')) {
            showViewQuestionsScreen(quizRow.dataset.id);
        }

        const deleteQuizBtn = e.target.closest('.delete-btn');
        if (deleteQuizBtn) {
            confirmDelete(deleteQuizBtn.dataset.id, deleteQuizBtn.dataset.title);
        }

        const editQuestionBtn = e.target.closest('.edit-question-btn');
        if (editQuestionBtn) {
            showEditQuestionScreen(parseInt(editQuestionBtn.dataset.questionIndex));
        }
        
        const deleteQuestionBtn = e.target.closest('.delete-question-btn');
        if (deleteQuestionBtn) {
            deleteQuestion(parseInt(deleteQuestionBtn.dataset.questionIndex));
        }

        if (e.target.closest('.remove-question-btn')) removeQuestionFromForm(e.target);
        if (e.target.closest('#delete-cancel-btn')) hideDeleteModal();
        if (e.target.closest('#delete-ok-btn')) {
            if (deleteConfirmCallback) deleteConfirmCallback();
        }
    });
});
