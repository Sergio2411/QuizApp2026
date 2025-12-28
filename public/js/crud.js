import { db } from './config.js';

// --- ESTADO GLOBAL Y CONSTANTES ---
const state = {
    allQuizzes: [],       // LISTA MAESTRA: Todos los exámenes descargados
    filteredQuizzes: [],  // LISTA FILTRADA: Resultados de búsqueda
    currentPage: 1,       // Página actual
    quizzesPerPage: 5,    // Exámenes por página
    
    // Bandera de "Semáforo": true = Descargar de Firebase / false = Usar memoria
    needsReload: true,    
    
    // Variables que ya tenías (se quedan igual)
    currentQuizData: null,
    currentFilteredQuestions: [],
    editingQuestionIndex: -1,
    deleteConfirmCallback: null,
};

const QUIZZES_PER_PAGE = 5; 

// --- GESTIÓN DE LA INTERFAZ (UI) ---

/**
 * Muestra una pantalla específica y oculta las demás.
 * @param {string} screenId - El ID de la pantalla a mostrar.
 */
function showScreen(screenId) {
    // Oculta todas las pantallas y quita el estado 'active'
    document.querySelectorAll('.screen').forEach(s => {
        s.classList.remove('active');
        s.classList.add('hidden');
    });
    // Muestra la pantalla deseada y la marca como 'active'
    const activeScreen = document.getElementById(screenId);
    if (activeScreen) {
        activeScreen.classList.remove('hidden');
        activeScreen.classList.add('active');
    }
}

/**
 * Muestra un modal por su ID.
 * @param {string} modalId - El ID del modal a mostrar.
 */
function showModal(modalId) {
    document.getElementById(modalId)?.classList.remove('hidden');
}

/**
 * Oculta un modal por su ID.
 * @param {string} modalId - El ID del modal a ocultar.
 */
function hideModal(modalId) {
    document.getElementById(modalId)?.classList.add('hidden');
}

/**
 * Muestra un modal de confirmación genérico.
 * @param {string} message - El mensaje a mostrar.
 * @param {Function} onConfirm - La función a ejecutar al confirmar.
 */
function showConfirmation(message, onConfirm) {
    document.getElementById('delete-confirm-message').textContent = message;
    state.deleteConfirmCallback = onConfirm;
    showModal('delete-confirm-modal');
}

/**
 * Muestra un modal de alerta simple. Reemplaza los `alert()` nativos.
 * @param {string} message - El mensaje de la alerta.
 */
function showAlert(message) {
    document.getElementById('alert-message').textContent = message;
    showModal('alert-modal');
}


// --- RENDERIZADO DE CONTENIDO ---

/**
 * Renderiza la tabla de exámenes basándose en el estado actual.
 */
function renderQuizzesTable() {
    const tbody = document.getElementById('quizzes-table-body');
    if (state.paginatedQuizzes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-slate-500">No se encontraron exámenes.</td></tr>';
    } else {
        tbody.innerHTML = state.paginatedQuizzes.map(quiz => createQuizRowHTML(quiz)).join('');
    }
}

/**
 * Renderiza la tabla de preguntas para un examen específico.
 */
function renderQuestionsTable() {
    const container = document.getElementById('questions-list-container');
    if (state.currentFilteredQuestions.length === 0) {
        container.innerHTML = '<p class="text-center p-4 text-slate-500">No se encontraron preguntas.</p>';
        return;
    }
    // Usamos el índice original para las acciones de editar/borrar
    container.innerHTML = state.currentFilteredQuestions.map(question => {
        const originalIndex = state.currentQuizData.questions.indexOf(question);
        return createQuestionCardHTML(question, originalIndex);
    }).join('');
    window.MathJax?.typesetPromise();
}

/**
 * Actualiza los controles de paginación.
 */
function renderPaginationControls() {
    const controls = document.getElementById('pagination-controls');
    const totalPages = Math.ceil(state.filteredQuizzes.length / QUIZZES_PER_PAGE);

    if (totalPages <= 1) {
        controls.classList.add('hidden');
        return;
    }
    controls.classList.remove('hidden');
    document.getElementById('page-indicator').textContent = `Página ${state.currentPage} de ${totalPages}`;
    document.getElementById('prev-page-btn').disabled = state.currentPage === 1;
    document.getElementById('next-page-btn').disabled = state.currentPage === totalPages;
}


// --- GENERACIÓN DE HTML (TEMPLATES) ---

/**
 * Crea el HTML para una fila de la tabla de exámenes.
 * @param {object} quiz - El objeto del examen.
 * @returns {string} El string HTML de la fila.
 */
function createQuizRowHTML(quiz) {
    const date = quiz.createdAt?.toDate();
    const formattedDate = date ? `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : '---';
    const questionCount = quiz.questions?.length || 0;

    return `
        <tr class="border-b hover:bg-slate-50 transition-colors"> <td class="p-3 font-bold truncate cursor-pointer" data-action="viewQuestions" data-id="${quiz.id}">${quiz.title || 'Examen sin título'}</td>
            <td class="p-3 text-center w-40">${formattedDate}</td>
            <td class="p-3 text-center w-40">${questionCount}</td>
            <td class="p-3 w-28">
                <div class="flex justify-center items-center space-x-2">
                    <button data-action="playQuiz" data-id="${quiz.id}" title="Jugar ahora"
                        class="text-xl p-1 rounded-full hover:bg-green-200 transition-colors">
                        ▶️
                    </button>
                    <button data-action="confirmDeleteQuiz" data-id="${quiz.id}" data-title="${quiz.title}" title="Eliminar"
                        class="text-xl p-1 rounded-full hover:bg-red-200 transition-colors">
                        🗑️
                    </button>
                </div>
            </td>
        </tr>`;
}


function createQuestionCardHTML(question, originalIndex) {
    // Mapea las opciones para generar el HTML de cada una
    const optionsHTML = question.options.map((option, index) => {
        const isCorrect = index === question.answer;
        return `
            <p class="flex items-center gap-2 ${isCorrect ? 'font-bold text-green-700' : 'text-slate-600'}">
                <span>${isCorrect ? '✅' : '➖'}</span>
                <span>${option}</span>
            </p>
        `;
    }).join('');

    // Devuelve la estructura completa de la tarjeta
    return `
        <div class="border bg-white rounded-lg p-4 mb-4 shadow-sm">
            <div class="flex justify-between items-center mb-3 pb-3 border-b">
                <h3 class="font-bold text-slate-500 text-sm">PREGUNTA ${originalIndex + 1}</h3>
                <div class="flex items-center space-x-2">
                    <button data-action="editQuestion" data-index="${originalIndex}" title="Modificar"
                        class="text-xl p-1 rounded-full hover:bg-yellow-200 transition-colors">✏️</button>
                    <button data-action="confirmDeleteQuestion" data-index="${originalIndex}" title="Eliminar"
                        class="text-xl p-1 rounded-full hover:bg-red-200 transition-colors">🗑️</button>
                </div>
            </div>
            <p class="text-lg text-slate-800 mb-4">${question.question}</p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                ${optionsHTML}
            </div>
        </div>
    `;
}

/**
 * Crea el HTML para un editor de preguntas dentro del formulario principal.
 * @param {object} [questionData={}] - Los datos de la pregunta (opcional).
 * @param {number} index - El índice de la pregunta en el formulario.
 * @returns {string} El string HTML del editor.
 */
function createQuestionEditorHTML(questionData = {}, index) {
    const { question = '', image = '', options = ['', '', '', ''], answer = -1 } = questionData;
    const optionsHTML = options.map((opt, i) => `
        <div class="flex items-center space-x-2">
            <input type="radio" name="correct-answer-${index}" value="${i}" ${answer === i ? 'checked' : ''} class="h-4 w-4">
            <input type="text" placeholder="Opción ${i + 1}" value="${opt || ''}" class="option-input flex-grow px-2 py-1 border border-slate-300 rounded-md text-sm">
        </div>
    `).join('');

    return `
        <div class="question-card bg-white border border-slate-200 p-4 rounded-lg">
            <div class="flex justify-between items-center mb-2">
                <h4 class="font-semibold">Pregunta ${index + 1}</h4>
                <button type="button" data-action="removeQuestionFromForm" class="text-sm text-red-600 hover:text-red-800">Eliminar</button>
            </div>
            <div class="space-y-2">
                <textarea class="question-text-input w-full px-3 py-2 border rounded-md" placeholder="Escribe la pregunta...">${question}</textarea>
                <input type="text" class="question-image-input w-full px-3 py-2 border rounded-md" placeholder="URL de la imagen (opcional)" value="${image || ''}">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-2">${optionsHTML}</div>
            </div>
        </div>`;
}

/**
 * Crea el HTML para el editor de una única pregunta.
 * @param {object} questionData - Los datos de la pregunta.
 * @returns {string} El string HTML del editor.
 */
function createSingleQuestionEditorHTML(questionData) {
    const { question = '', image = '', options = [], answer = -1 } = questionData;
    const optionsHTML = Array.from({ length: 4 }).map((_, i) => `
        <div class="flex items-center space-x-2">
            <input type="radio" id="single-correct-answer-${i}" name="single-correct-answer" value="${i}" ${answer === i ? 'checked' : ''} class="h-4 w-4">
            <input type="text" id="single-option-${i}" placeholder="Opción ${i + 1}" value="${options[i] || ''}" class="option-input flex-grow px-2 py-1 border border-slate-300 rounded-md text-sm">
        </div>
    `).join('');

    return `
        <div class="space-y-2">
            <label class="block text-sm font-medium text-slate-700">Texto de la Pregunta</label>
            <textarea id="single-question-text" class="w-full px-3 py-2 border border-slate-300 rounded-md">${question}</textarea>
            <label class="block text-sm font-medium text-slate-700">URL de la Imagen (opcional)</label>
            <input type="text" id="single-question-image" class="w-full px-3 py-2 border border-slate-300 rounded-md" value="${image || ''}">
            <label class="block text-sm font-medium text-slate-700">Opciones y Respuesta Correcta</label>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-2">
                ${optionsHTML}
            </div>
        </div>`;
}

// --- LÓGICA DE DATOS (CRUD) ---

/**
 * Carga todos los exámenes desde Firestore y los renderiza.
 */
/**
 * Carga TODOS los exámenes.
 * Si state.needsReload es false, usa la memoria local (GRATIS).
 * Si es true, descarga de Firebase.
 */
async function loadQuizzes() {
    const tbody = document.getElementById('quizzes-table-body');

    // 1. SI EL SEMÁFORO ESTÁ VERDE Y TENEMOS DATOS: USAR MEMORIA
    if (!state.needsReload && state.allQuizzes.length > 0) {
        console.log("⚡ Usando memoria local (Ahorro de lecturas)");
        renderCurrentPage(); 
        return;
    }

    // 2. SI NO, DESCARGAMOS DE FIREBASE
    tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4">Cargando exámenes...</td></tr>';
    
    try {
        // Pedimos la lista COMPLETA ordenada por fecha
        const snapshot = await db.collection('quizzes').orderBy('createdAt', 'desc').get();
        
        if (snapshot.empty) {
            state.allQuizzes = [];
            state.filteredQuizzes = [];
        } else {
            // Guardamos en la lista maestra
            state.allQuizzes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Al inicio, la lista filtrada es igual a la maestra
            state.filteredQuizzes = [...state.allQuizzes];
        }

        // ¡IMPORTANTE! Apagamos el semáforo. Ya estamos actualizados.
        state.needsReload = false; 
        
        state.currentPage = 1;
        renderCurrentPage();

    } catch (error) {
        console.error("Error al cargar:", error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-red-500">Error de conexión.</td></tr>';
    }
}

/**
 * Recorta la lista de memoria para mostrar solo 5 exámenes.
 */
function renderCurrentPage() {
    const tbody = document.getElementById('quizzes-table-body');
    
    if (state.filteredQuizzes.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-4 text-slate-500">No se encontraron exámenes.</td></tr>';
        updatePaginationUI(); // Ocultar botones
        return;
    }

    // Matemáticas de recorte (Slice)
    const startIndex = (state.currentPage - 1) * state.quizzesPerPage;
    const endIndex = startIndex + state.quizzesPerPage;
    const quizzesToShow = state.filteredQuizzes.slice(startIndex, endIndex);

    // Generar HTML
    tbody.innerHTML = quizzesToShow.map(quiz => createQuizRowHTML(quiz)).join('');
    
    updatePaginationUI();
}

function updatePaginationUI() {
    const controls = document.getElementById('pagination-controls');
    const totalPages = Math.ceil(state.filteredQuizzes.length / state.quizzesPerPage);

    if (totalPages <= 1) {
        controls.classList.add('hidden');
    } else {
        controls.classList.remove('hidden');
        document.getElementById('page-indicator').textContent = `Página ${state.currentPage} de ${totalPages}`;
        document.getElementById('prev-page-btn').disabled = state.currentPage === 1;
        document.getElementById('next-page-btn').disabled = state.currentPage === totalPages;
    }
}

function renderPaginatedQuizzes(quizzes) {
    const tbody = document.getElementById('quizzes-table-body');
    tbody.innerHTML = quizzes.map(quiz => createQuizRowHTML(quiz)).join('');
}

function updatePaginationControls(isLastPage = false) {
    document.getElementById('page-indicator').textContent = `Página ${state.currentPage}`;
    document.getElementById('prev-page-btn').disabled = state.currentPage === 1;
    document.getElementById('next-page-btn').disabled = isLastPage;
}

/**
 * Guarda un examen completo (nuevo o existente).
 */
async function saveQuiz() {
    const quizId = document.getElementById('quiz-id').value;
    const title = document.getElementById('quiz-title-input').value.trim();
    if (!title) return showAlert('El examen debe tener un título.');

    const questions = [];
    const questionElements = document.querySelectorAll('.question-card');
    for (const el of questionElements) {
        const questionText = el.querySelector('.question-text-input').value.trim();
        const options = Array.from(el.querySelectorAll('.option-input')).map(input => input.value.trim());
        const answerInput = el.querySelector('input[type="radio"]:checked');

        if (!questionText || options.some(opt => !opt) || !answerInput) {
            return showAlert('Todas las preguntas deben estar completas (texto, 4 opciones y respuesta correcta).');
        }
        questions.push({
            question: questionText,
            image: el.querySelector('.question-image-input').value.trim() || null,
            options,
            answer: parseInt(answerInput.value)
        });
    }

    const quizData = { title, questions };
    try {
        if (quizId) {
            await db.collection('quizzes').doc(quizId).set(quizData, { merge: true });
        } else {
            quizData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            await db.collection('quizzes').add(quizData);
        }

        state.needsReload = true;
        showScreen('list-quizzes-screen');
        loadQuizzes();
    } catch (error) {
        console.error("Error al guardar el examen:", error);
        showAlert('No se pudo guardar el examen.');
    }
}

/**
 * Guarda una única pregunta (nueva o editada).
 */
async function saveSingleQuestion() {
    const questionText = document.getElementById('single-question-text').value.trim();
    const options = Array.from({ length: 4 }, (_, i) => document.getElementById(`single-option-${i}`).value.trim());
    const answerInput = document.querySelector('input[name="single-correct-answer"]:checked');

    if (!questionText || options.some(opt => !opt) || !answerInput) {
        return showAlert('La pregunta debe estar completa (texto, 4 opciones y respuesta correcta).');
    }

    const newOrUpdatedQuestion = {
        question: questionText,
        image: document.getElementById('single-question-image').value.trim() || null,
        options,
        answer: parseInt(answerInput.value)
    };

    if (state.editingQuestionIndex === -1) {
        state.currentQuizData.questions.push(newOrUpdatedQuestion);
    } else {
        state.currentQuizData.questions[state.editingQuestionIndex] = newOrUpdatedQuestion;
    }

    try {
        await db.collection('quizzes').doc(state.currentQuizData.id).update({
            questions: state.currentQuizData.questions
        });
        showViewQuestionsScreen(state.currentQuizData.id);
    } catch (error) {
        console.error("Error al guardar la pregunta:", error);
        showAlert("No se pudo guardar la pregunta.");
    }
}

/**
 * Guarda un examen importado desde un string CSV.
 * Esta función CONTIENE a su propio parser.
 */
async function saveQuizFromCsv() {
    
    /**
     * Parsea una línea de CSV, manejando comillas simples.
     */
    function parseCsvLine(line) {
        const columns = [];
        let currentField = '';
        let inQuote = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuote && line[i + 1] === '"') {
                    // Es una comilla doble escapada ""
                    currentField += '"';
                    i++; // Saltar la siguiente comilla
                } else {
                    // Es el inicio o fin de un campo entre comillas
                    inQuote = !inQuote;
                }
            } else if (char === ',' && !inQuote) {
                // Fin de un campo
                columns.push(currentField.trim());
                currentField = '';
            } else {
                // Carácter normal
                currentField += char;
            }
        }
        // Añadir el último campo
        columns.push(currentField.trim());
        return columns;
    }

    // --- Inicio de la lógica principal ---
    const jsonTextarea = document.getElementById('json-textarea');
    const csvText = jsonTextarea.value.trim();
    if (!csvText) return showAlert("El campo CSV no puede estar vacío.");

    const lines = csvText.split('\n').filter(line => line.trim() !== '');
    if (lines.length < 2) return showAlert("El CSV debe tener al menos una fila de TÍTULO y una de PREGUNTA.");

    const quizData = {
        title: "",
        questions: []
    };

    try {
        // Procesar líneas
        for (const line of lines) {
            if (line.trim().toUpperCase().startsWith('TIPO,DATO1')) {
                continue; // Saltar la cabecera de ejemplo
            }

            const columns = parseCsvLine(line);
            const type = columns[0]?.toUpperCase();

            if (type === 'TITULO') {
                if (quizData.title) throw new Error("Se encontró más de una fila 'TITULO'.");
                quizData.title = columns[1];
                if (!quizData.title) throw new Error("La fila 'TITULO' está vacía o mal formada.");
            
            } else if (type === 'PREGUNTA') {
                if (columns.length < 8) throw new Error(`La fila de pregunta "${columns[1]?.substring(0, 20)}..." está incompleta. Se esperan 8 columnas.`);
                
                const questionText = columns[1];
                const image = columns[2] || null; // La columna 2 (índice 2) es la imagen
                const options = [columns[3], columns[4], columns[5], columns[6]];
                const answer = parseInt(columns[7]);

                if (!questionText || options.some(opt => !opt) || isNaN(answer) || answer < 0 || answer > 3) {
                    throw new Error(`Fila de pregunta inválida: "${questionText?.substring(0, 20)}..." (Revisa que las 4 opciones existan y la respuesta sea un número 0-3)`);
                }

                quizData.questions.push({
                    question: questionText,
                    image: image,
                    options: options,
                    answer: answer
                });
            }
        }

        if (!quizData.title) throw new Error("No se encontró la fila 'TITULO' en el CSV.");
        if (quizData.questions.length === 0) throw new Error("No se encontró ninguna fila 'PREGUNTA'.");
        
        // Si todo está bien, guarda en Firebase
        quizData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const docRef = await db.collection('quizzes').add(quizData);

        state.needsReload = true;
        
        jsonTextarea.value = '';
        showViewQuestionsScreen(docRef.id);
        
    } catch (error) {
        // Muestra el mensaje de error
        showAlert(`Error al procesar el CSV: ${error.message}`);
    }
}


// --- FLUJO DE PANTALLAS ---

/**
 * Muestra el formulario para editar o crear un examen.
 * @param {object|null} quizData - Los datos del examen a editar, o null para crear uno nuevo.
 */
function showEditForm(quizData = null) {
    document.getElementById('edit-quiz-title').textContent = quizData ? 'Editar Examen Completo' : 'Crear Nuevo Examen';
    document.getElementById('quiz-id').value = quizData?.id || '';
    document.getElementById('quiz-title-input').value = quizData?.title || '';
    
    const container = document.getElementById('questions-editor-container');
    if (quizData?.questions?.length) {
        container.innerHTML = quizData.questions.map((q, i) => createQuestionEditorHTML(q, i)).join('');
    } else {
        container.innerHTML = createQuestionEditorHTML({}, 0);
    }
    showScreen('edit-quiz-screen');
}

/**
 * Muestra la pantalla de visualización de preguntas de un examen.
 * @param {string} quizId - El ID del examen a visualizar.
 */
async function showViewQuestionsScreen(quizId) {
    const doc = await db.collection('quizzes').doc(quizId).get();
    if (!doc.exists) return showAlert("No se encontró el examen.");
    
    state.currentQuizData = { id: doc.id, ...doc.data() };
    state.currentFilteredQuestions = [...state.currentQuizData.questions];
    
    document.getElementById('view-quiz-title').textContent = state.currentQuizData.title;
    document.getElementById('search-question-input').value = '';
    
    renderQuestionsTable();
    showScreen('view-questions-screen');
}

/**
 * Muestra el formulario para editar o crear una única pregunta.
 * @param {number} [questionIndex=-1] - El índice de la pregunta a editar, o -1 para crear una nueva.
 */
function showEditQuestionScreen(questionIndex = -1) {
    state.editingQuestionIndex = questionIndex;
    const isNew = questionIndex === -1;
    const questionData = isNew ? {} : state.currentQuizData.questions[questionIndex];
    
    document.getElementById('edit-question-title').textContent = isNew ? 'Añadir Nueva Pregunta' : `Editar Pregunta ${questionIndex + 1}`;
    
    const container = document.getElementById('single-question-editor-container');
    container.innerHTML = createSingleQuestionEditorHTML(questionData);
    
    showScreen('edit-question-screen');
}


// --- MANEJADORES DE ACCIONES (Delegación de eventos) ---

const actions = {
    // --- Navegación y Modales ---
    playQuiz: (dataset) => {
        // 1. Guardamos el ID del examen en la memoria temporal
        sessionStorage.setItem('autoSelectQuizId', dataset.id);
        // 2. Nos vamos al panel de control
        window.location.href = '/admin.html';
    },
    showList: () => { showScreen('list-quizzes-screen'); loadQuizzes(); },
    backToPanel: () => window.location.href = '/admin.html',
    openCreationChoice: () => showModal('creation-choice-modal'),
    closeCreationChoice: () => hideModal('creation-choice-modal'),
    showJsonImport: () => { hideModal('creation-choice-modal'); showScreen('json-import-screen'); },
    showNormalForm: () => { hideModal('creation-choice-modal'); showEditForm(); },
    viewQuestions: (dataset) => showViewQuestionsScreen(dataset.id),
    closeAlert: () => hideModal('alert-modal'),

    // --- CRUD Exámenes ---
    saveQuiz: () => saveQuiz(),
    saveCsvQuiz: () => saveQuizFromCsv(),
    confirmDeleteQuiz: (dataset) => {
        showConfirmation(`¿Eliminar "${dataset.title}"? Esta acción es irreversible.`, async () => {
            await db.collection('quizzes').doc(dataset.id).delete();
            
            state.needsReload = true;

            hideModal('delete-confirm-modal');
            loadQuizzes();
        });
    },

    // --- CRUD Preguntas (Formulario Completo) ---
    addQuestionToForm: () => {
        const container = document.getElementById('questions-editor-container');
        const newIndex = container.children.length;
        container.insertAdjacentHTML('beforeend', createQuestionEditorHTML({}, newIndex));
    },
    removeQuestionFromForm: (_, target) => {
        target.closest('.question-card').remove();
        document.querySelectorAll('.question-card').forEach((card, index) => {
            card.querySelector('h4').textContent = `Pregunta ${index + 1}`;
            card.querySelectorAll('input[type="radio"]').forEach(radio => radio.name = `correct-answer-${index}`);
        });
    },

    // --- CRUD Preguntas (Vista individual) ---
    addQuestionToQuiz: () => showEditQuestionScreen(),
    editQuestion: (dataset) => showEditQuestionScreen(parseInt(dataset.index)),
    saveSingleQuestion: () => saveSingleQuestion(),
    cancelSingleQuestionEdit: () => showViewQuestionsScreen(state.currentQuizData.id),
    confirmDeleteQuestion: (dataset) => {
        const index = parseInt(dataset.index);
        const questionText = state.currentQuizData.questions[index].question.substring(0, 50);
        showConfirmation(`¿Eliminar la pregunta: "${questionText}..."?`, async () => {
            state.currentQuizData.questions.splice(index, 1);
            await db.collection('quizzes').doc(state.currentQuizData.id).update({ questions: state.currentQuizData.questions });
            hideModal('delete-confirm-modal');
            state.currentFilteredQuestions = [...state.currentQuizData.questions];
            renderQuestionsTable();
        });
    },
};

// --- INICIALIZACIÓN Y EVENT LISTENERS ---

// crud.js

function initializeCrudApp() {
    showScreen('list-quizzes-screen');
    
    // 1. CORRECCIÓN: Llamamos sin argumentos ('initial' ya no es necesario)
    loadQuizzes(); 

    // Utilidad para limpiar texto (tildes, mayúsculas)
    const normalizeText = (text) => text.normalize("NFD").replace(/[\u00c0-\u017f]/g, "").toLowerCase();

    // --- NUEVO: BUSCADOR DE EXÁMENES (LISTA PRINCIPAL) ---
    const searchQuizInput = document.getElementById('search-quiz-input');
    if (searchQuizInput) {
        searchQuizInput.addEventListener('input', (e) => {
            const term = normalizeText(e.target.value);
            
            // Filtramos la lista maestra (allQuizzes) que tenemos en memoria
            state.filteredQuizzes = state.allQuizzes.filter(quiz => 
                normalizeText(quiz.title || '').includes(term)
            );
            
            // Volvemos a la página 1 de los resultados y repintamos
            state.currentPage = 1;
            renderCurrentPage();
        });
    }
    // ----------------------------------------------------

    // Buscador de PREGUNTAS (Dentro de un examen) - ESTE SE QUEDA IGUAL
    document.getElementById('search-question-input').addEventListener('input', (e) => {
        const searchTerm = normalizeText(e.target.value);
        if (state.currentQuizData) {
            state.currentFilteredQuestions = state.currentQuizData.questions.filter(q => normalizeText(q.question).includes(searchTerm));
            renderQuestionsTable();
        }
    });

    // Delegación de eventos (Clicks botones editar/borrar/crear) - SE QUEDA IGUAL
    document.body.addEventListener('click', (e) => {
        const target = e.target.closest('[data-action]');
        if (target) {
            e.preventDefault();
            const action = actions[target.dataset.action];
            action?.(target.dataset, target);
        }
    });

    // --- CORRECCIÓN: PAGINACIÓN LOCAL ---
    // Ya no llamamos a loadQuizzes('prev'), solo cambiamos página y pintamos
    document.getElementById('prev-page-btn').addEventListener('click', () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderCurrentPage(); // <--- Repintado instantáneo
        }
    });

    document.getElementById('next-page-btn').addEventListener('click', () => {
        const totalPages = Math.ceil(state.filteredQuizzes.length / state.quizzesPerPage);
        if (state.currentPage < totalPages) {
            state.currentPage++;
            renderCurrentPage(); // <--- Repintado instantáneo
        }
    });
    // ------------------------------------

    // Listeners de modales (SE QUEDAN IGUAL)
    document.getElementById('delete-cancel-btn').addEventListener('click', () => hideModal('delete-confirm-modal'));
    document.getElementById('delete-ok-btn').addEventListener('click', () => state.deleteConfirmCallback?.());
}

document.addEventListener('DOMContentLoaded', initializeCrudApp);

