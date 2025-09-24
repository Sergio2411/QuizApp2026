// --- GESTIÓN DE SONIDOS ---
// Este archivo maneja todos los efectos de sonido de la aplicación.

/**
 * @type {Object<string, HTMLAudioElement>}
 * Caché para almacenar los elementos de audio y evitar búsquedas repetidas en el DOM.
 */
const soundCache = {};
let audioUnlocked = false;

/**
 * Recupera un elemento de audio del DOM o de la caché.
 * @param {string} id - El ID del elemento <audio>.
 * @returns {HTMLAudioElement | null} El elemento de audio encontrado o null.
 */
function getSoundById(id) {
    if (soundCache[id]) {
        return soundCache[id];
    }
    const sound = document.getElementById(id);
    if (sound) {
        soundCache[id] = sound; // Almacena el elemento en la caché para futuros usos
    }
    return sound;
}

/**
 * Reproduce un sonido específico por su ID.
 * @param {string} id - El ID del sonido a reproducir.
 */
function playSound(id) {
    if (!audioUnlocked) return;

    const sound = getSoundById(id);
    if (sound) {
        sound.currentTime = 0; // Reinicia el audio para que se pueda reproducir varias veces seguidas
        sound.play().catch(() => {
            // Silencia errores en caso de que la reproducción sea interrumpida, etc.
        });
    }
}

/**
 * Desbloquea la reproducción de audio. Debe ser llamado por la primera interacción del usuario.
 * Los navegadores modernos requieren un gesto del usuario (como un clic) para permitir el audio.
 */
export async function unlockAudio() {
    if (audioUnlocked) return;
    try {
        const sound = getSoundById('sound-click'); // Usa un sonido de referencia para el desbloqueo
        if (sound) {
            await sound.play();
            sound.pause();
            sound.currentTime = 0;
            audioUnlocked = true;
        }
    } catch (error) {
        // Falla silenciosamente. Se reintentará en la siguiente interacción del usuario.
    }
}

// --- API PÚBLICA DE SONIDOS ---
// Funciones exportadas para ser usadas en otras partes de la aplicación.

export function playHoverSound() {
    playSound('sound-hover');
}

export function playClickSound() {
    playSound('sound-click');
}

export function playSelectSound() {
    playSound('sound-select');
}

export function playKeypressSound() {
    playSound('sound-keypress');
}

export function playCorrectSound() {
    playSound('sound-correct');
}

export function playIncorrectSound() {
    playSound('sound-incorrect');
}
