// Este archivo maneja todos los efectos de sonido usando los elementos <audio> de HTML.

let audioUnlocked = false;

// Esta función debe ser llamada por la primera interacción del usuario (click) para habilitar el audio.
export function unlockAudio() {
    if (audioUnlocked) return;
    // Se intenta reproducir un sonido vacío para que el navegador permita futuros audios.
    const sound = document.getElementById('sound-click');
    if (sound) {
        sound.play().then(() => {
            sound.pause();
            sound.currentTime = 0;
            audioUnlocked = true;
        }).catch(() => {
            // Si falla, se intentará de nuevo en la siguiente interacción.
        });
    }
}

// Función para reproducir un sonido por su ID
function playSound(id) {
    if (!audioUnlocked) return; 

    const sound = document.getElementById(id);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(error => {
            // Silencia cualquier error posterior.
        });
    }
}

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
