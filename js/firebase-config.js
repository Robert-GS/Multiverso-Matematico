// js/firebase-config.js
// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
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

try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    isFirebaseAvailable = true;
    console.log("🔥 Firebase inicializado con éxito.");
} catch (error) {
    console.warn("⚠️ Error al inicializar Firebase. Se operará en modo offline:", error);
}

export { 
    db, 
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