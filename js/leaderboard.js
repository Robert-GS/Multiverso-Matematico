// js/leaderboard.js
import { db } from './firebase-config.js';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, orderBy, limit } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

const isFirebaseAvailable = typeof db !== 'undefined' && db !== null;

/**
 * Guarda una partida terminada en la colección 'highscores' de Firestore.
 * @param {Object} scoreData Datos del resultado del alumno
 */
export async function saveScore(scoreData) {
    if (!isFirebaseAvailable || !db) {
        console.warn("Firebase no disponible. Puntaje no guardado en la nube.");
        return false;
    }

    try {
        const scoresRef = collection(db, "highscores");
        
        const cleanStudentName = scoreData.studentName.trim().toLowerCase();
        // Permite modos numéricos (Logix) o de texto/string (ArqueoMat)
        const targetMode = typeof scoreData.mode === 'number' ? scoreData.mode : String(scoreData.mode).toLowerCase();

        // 1. Buscar si el alumno ya tiene un registro en este juego y modo
        const q = query(
            scoresRef,
            where("gameId", "==", scoreData.gameId),
            where("mode", "==", targetMode),
            where("studentNameLower", "==", cleanStudentName)
        );

        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
            const existingDoc = querySnapshot.docs[0];
            const existingData = existingDoc.data();

            const newScore = Number(scoreData.score);
            const newEffectiveness = Number(scoreData.effectiveness);
            const oldScore = Number(existingData.score);
            const oldEffectiveness = Number(existingData.effectiveness);

            const isBetterScore = newScore > oldScore;
            const isTieWithBetterEffectiveness = (newScore === oldScore && newEffectiveness > oldEffectiveness);

            if (isBetterScore || isTieWithBetterEffectiveness) {
                await updateDoc(doc(db, "highscores", existingDoc.id), {
                    studentName: scoreData.studentName.trim(),
                    score: newScore,
                    effectiveness: newEffectiveness,
                    details: scoreData.details || "",
                    timestamp: serverTimestamp()
                });
                console.log("🏆 ¡Récord personal superado y actualizado con éxito!");
                return true;
            } else {
                console.log("ℹ️ El puntaje no superó el récord previo del alumno. No se guardó.");
                return false;
            }

        } else {
            const payload = {
                gameId: scoreData.gameId,
                gameTitle: scoreData.gameTitle,
                studentName: scoreData.studentName.trim(),
                studentNameLower: cleanStudentName,
                mode: targetMode,
                score: Number(scoreData.score),
                effectiveness: Number(scoreData.effectiveness),
                details: scoreData.details || "",
                timestamp: serverTimestamp()
            };

            const docRef = await addDoc(scoresRef, payload);
            console.log("🏆 Primer récord del alumno guardado con ID:", docRef.id);
            return true;
        }

    } catch (error) {
        console.error("Error al guardar en Firestore:", error);
        return false;
    }
}

/**
 * Consulta el Top 10 de mejores puntajes de un juego.
 * @param {string} gameId Identificador del juego
 * @param {number|string} mode Modo de juego (2/3 o egipcia/mesopotamica/maya/mixta)
 * @param {number} limitCount Cantidad de registros a traer
 */
export async function getTopScores(gameId, mode, limitCount = 10) {
    if (!isFirebaseAvailable || !db) return [];

    const selectedMode = typeof mode === 'number' ? mode : String(mode).toLowerCase();

    try {
        const q = query(
            collection(db, "highscores"),
            where("gameId", "==", gameId),
            where("mode", "==", selectedMode),
            orderBy("score", "desc"),
            orderBy("effectiveness", "desc"),
            limit(limitCount)
        );

        const querySnapshot = await getDocs(q);
        const scores = [];
        querySnapshot.forEach((docSnapshot) => {
            scores.push({ id: docSnapshot.id, ...docSnapshot.data() });
        });
        return scores;
    } catch (error) {
        console.error("Error al obtener los HighScores:", error);
        return [];
    }
}