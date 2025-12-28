// js/config.js

const firebaseConfig = {
    apiKey: "AIzaSyCgk70RacAfm5w0IDwshuNUykeO7u0BwkQ",
    authDomain: "quizapp-preparatoria-cie-4d142.firebaseapp.com",
    projectId: "quizapp-preparatoria-cie-4d142",
    storageBucket: "quizapp-preparatoria-cie-4d142.appspot.com",
    messagingSenderId: "543814839558",
    appId: "1:543814839558:web:007004bd7cd5f974f44287"
};

// 1. Inicialización única
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
} else {
    firebase.app(); // Usa la instancia existente si ya hay una
}

// 2. Exportamos las instancias listas para usar
export const db = firebase.firestore();
export const auth = firebase.auth();
export const FieldValue = firebase.firestore.FieldValue;
export const Timestamp = firebase.firestore.Timestamp;

// Opcional: Habilitar persistencia sin conexión (ayuda si se va el internet)
db.enablePersistence()
  .catch((err) => {
      if (err.code == 'failed-precondition') {
          console.warn('Persistencia falló: Múltiples pestañas abiertas.');
      } else if (err.code == 'unimplemented') {
          console.warn('El navegador no soporta persistencia.');
      }
  });