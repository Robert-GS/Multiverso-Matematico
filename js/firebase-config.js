// js/firebase-config.js
// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getAuth,
    signInAnonymously,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";


import { 
    getFirestore, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAkit61BQ4TbOb1P535Sbet3FKXINQ12Zc",
    authDomain: "multiverso-matematico.firebaseapp.com",
    projectId: "multiverso-matematico",
    storageBucket: "multiverso-matematico.firebasestorage.app",
    messagingSenderId: "879040191989",
    appId: "1:879040191989:web:c93f56e3efc1f16fb194bc"
};

let db = null;
let isFirebaseAvailable = false;


let auth = null;

// Promesa que permitirá esperar a que Firebase autentique al jugador.
let resolveAuthReady;

const authReady = new Promise((resolve) => {
    resolveAuthReady = resolve;
});


try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);

    auth = getAuth(app);

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            console.log("🔐 Jugador autenticado:", user.uid);
            resolveAuthReady(user);
        } else {
            try {
                const credential = await signInAnonymously(auth);
                console.log("🔐 Sesión anónima iniciada.");
                resolveAuthReady(credential.user);
            } catch (error) {
                console.error("❌ Error de autenticación:", error);
                resolveAuthReady(null);
            }
        }
    });

    isFirebaseAvailable = true;
    console.log("🔥 Firebase inicializado con éxito.");
} catch (error) {
    console.warn("⚠️ Error al inicializar Firebase. Se operará en modo offline:", error);
}

export { 
    db, 
    auth,
    authReady,
    isFirebaseAvailable, 
    collection, 
    addDoc, 
    query, 
    where, 
    orderBy, 
    limit, 
    getDocs,
    serverTimestamp 
};