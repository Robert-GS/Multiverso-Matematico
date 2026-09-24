import { saveScore, getTopScores } from './leaderboard.js';

// ==========================================
// 1. ESTADO DEL JUEGO Y VARIABLES
// ==========================================
let numVariables = 2;
let maxAttempts = 3;
let currentAttempts = 3;
let currentExpression = "";
let currentTableData = [];
let userSwitches = [];
let isTableLocked = false;

// Variables de estadísticas y reporte
let studentName = "";
let totalAttemptedExercises = 0;
let totalCorrectExercises = 0;
let totalCheckAttempts = 0;
let hasAttemptedCurrentExercise = false;

// ==========================================
// 2. SISTEMA DE AUDIO Y SONIDOS
// ==========================================
const sounds = {
    bg: new Audio('audio/logix/bg-music2.mp3'),
    correct: new Audio('audio/logix/correct.mp3'),
    wrong: new Audio('audio/logix/incorrect.mp3'),
    click: new Audio('audio/logix/click.mp3')
};

sounds.bg.loop = true;

let isAudioActive = localStorage.getItem('multiverse_audio_active') !== 'false';
let bgVolume = parseFloat(localStorage.getItem('multiverse_bg_vol')) || 0.5;
let sfxVolume = parseFloat(localStorage.getItem('multiverse_sfx_vol')) || 0.3;

function applyVolumes() {
    const btn = document.getElementById('btn-audio');

    if (isAudioActive) {
        sounds.bg.volume = bgVolume;
        if (btn) btn.innerText = '🔊 Sound ON';
        sounds.bg.play().catch(() => {});
    } else {
        sounds.bg.pause();
        sounds.bg.volume = 0;
        if (btn) btn.innerText = '🔇 Sound OFF';
    }

    localStorage.setItem('multiverse_audio_active', isAudioActive);
    localStorage.setItem('multiverse_bg_vol', bgVolume);
    localStorage.setItem('multiverse_sfx_vol', sfxVolume);
}

function updateVolumes() {
    const bgInput = document.getElementById('volume-bg');
    const sfxInput = document.getElementById('volume-sfx');
    if (bgInput) bgVolume = parseFloat(bgInput.value);
    if (sfxInput) sfxVolume = parseFloat(sfxInput.value);
    applyVolumes();
}

function toggleAudio() {
    isAudioActive = !isAudioActive;
    applyVolumes();
}

function playSFX(type) {
    if (isAudioActive && sounds[type]) {
        sounds[type].currentTime = 0;
        sounds[type].volume = sfxVolume;
        sounds[type].play().catch(() => {});
    }
}

function openAudioSettings() {
    const modal = document.getElementById('modal-audio-settings');
    if (modal) modal.classList.remove('hidden');
}

function closeAudioSettings() {
    const modal = document.getElementById('modal-audio-settings');
    if (modal) modal.classList.add('hidden');
}

document.addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
        playSFX('click');
    }
});

// Inicializar volúmenes al cargar
document.addEventListener('DOMContentLoaded', () => {
    applyVolumes();
    
    const bgInput = document.getElementById('volume-bg');
    const sfxInput = document.getElementById('volume-sfx');
    if (bgInput) bgInput.value = bgVolume;
    if (sfxInput) sfxInput.value = sfxVolume;
});

// ==========================================
// 3. NAVEGACIÓN Y TECLADO
// ==========================================
function startFromCover() {
    const screenCover = document.getElementById('screen-cover');
    if (screenCover && !screenCover.classList.contains('hidden')) {
        showScreen('screen-setup'); 
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        startFromCover();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    const screenCover = document.getElementById('screen-cover');
    if (screenCover) {
        screenCover.addEventListener('click', startFromCover);
    }
});

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

// ==========================================
// 4. GENERADOR DE EXPRESIONES Y TABLAS
// ==========================================
function generateRandomExpression(numVars) {
    if (numVars === 2) {
        const vars = ['A', 'B'];
        let parts = vars.map(v => (Math.random() < 0.5 ? `${v}'` : v));
        let op = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
        return parts.join(op);
    } 

    if (numVars === 3) {
        const patternType = Math.floor(Math.random() * 3);

        if (patternType === 0) {
            const vars = ['A', 'B', 'C'];
            let parts = vars.map(v => (Math.random() < 0.5 ? `${v}'` : v));
            let op1 = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            let op2 = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            return `${parts[0]}${op1}${parts[1]}${op2}${parts[2]}`;
        } 
        else if (patternType === 1) {
            const p1 = Math.random() < 0.5 ? "A'" : "A";
            const p2 = Math.random() < 0.5 ? "B'" : "B";
            const p3 = Math.random() < 0.5 ? "C'" : "C";

            const innerOp = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            const outerOp = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

            return `(${p1}${innerOp}${p2})${outerOp}${p3}`;
        } 
        else {
            const a1 = Math.random() < 0.5 ? "A'" : "A";
            const b1 = Math.random() < 0.5 ? "B'" : "B";
            const a2 = Math.random() < 0.5 ? "A'" : "A";
            const c2 = Math.random() < 0.5 ? "C'" : "C";

            const op1 = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            const op2 = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            const mainOp = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

            return `(${a1}${op1}${b1})${mainOp}(${a2}${op2}${c2})`;
        }
    }
}

function generateTruthTableData(numVars) {
    const totalRows = Math.pow(2, numVars);
    const table = [];

    for (let i = 0; i < totalRows; i++) {
        const row = {};
        if (numVars === 2) {
            row.A = (i >= 2);
            row.B = (i % 2 !== 0);
        } else {
            row.A = (i >= 4);
            row.B = (Math.floor(i / 2) % 2 !== 0);
            row.C = (i % 2 !== 0);
        }
        table.push(row);
    }
    return table;
}

function evaluateRow(expr, values) {
    let evalStr = expr
        .replace(/A'/g, '!a').replace(/A/g, 'a')
        .replace(/B'/g, '!b').replace(/B/g, 'b')
        .replace(/C'/g, '!c').replace(/C/g, 'c')
        .replace(/∧/g, '&&').replace(/∨/g, '||');

    const a = values.A;
    const b = values.B;
    const c = values.C || false;

    try {
        return Function('a', 'b', 'c', `return ${evalStr};`)(a, b, c);
    } catch (e) {
        return false;
    }
}

// ==========================================
// 5. INICIO DE PARTIDA Y RENDERING
// ==========================================
function startGame() {
    const nameInput = document.getElementById('student-name');
    studentName = nameInput.value.trim();

    if (!studentName) {
        alert("Por favor, ingresa tu nombre para continuar.");
        nameInput.focus();
        return;
    }

    totalAttemptedExercises = 0;
    totalCorrectExercises = 0;
    totalCheckAttempts = 0;

    numVariables = parseInt(document.getElementById('num-vars-select').value);
    maxAttempts = parseInt(document.getElementById('max-attempts').value);
    
    showScreen('screen-game');
    loadNextDoor();
}

function loadNextDoor() {
    currentAttempts = maxAttempts;
    isTableLocked = false;
    hasAttemptedCurrentExercise = false;
    
    document.getElementById('door-status').className = "door-status locked";
    document.getElementById('door-status').innerText = "🔒 PUERTA BLOQUEADA";
    
    document.getElementById('feedback').innerText = "";
    document.getElementById('btn-submit').classList.remove('hidden');
    document.getElementById('btn-next').classList.add('hidden');
    
    updateAttemptsDisplay();

    currentExpression = generateRandomExpression(numVariables);
    document.getElementById('target-expression').innerText = currentExpression;

    currentTableData = generateTruthTableData(numVariables);
    userSwitches = new Array(currentTableData.length).fill(false);

    renderTable();
}

function renderTable() {
    const thead = document.getElementById('table-head');
    const tbody = document.getElementById('table-body');

    let headHTML = '<tr>';
    if (numVariables >= 2) headHTML += '<th>A</th><th>B</th>';
    if (numVariables === 3) headHTML += '<th>C</th>';
    headHTML += '<th>CÓDIGO (INTERRUPTOR)</th></tr>';
    thead.innerHTML = headHTML;

    tbody.innerHTML = '';
    currentTableData.forEach((row, index) => {
        let tr = document.createElement('tr');
        let rowHTML = '';
        
        if (numVariables >= 2) {
            rowHTML += `<td>${row.A ? 'V' : 'F'}</td><td>${row.B ? 'V' : 'F'}</td>`;
        }
        if (numVariables === 3) {
            rowHTML += `<td>${row.C ? 'V' : 'F'}</td>`;
        }

        const isTrue = userSwitches[index];
        const revealedClass = isTableLocked ? 'revealed' : '';
        const disabledAttr = isTableLocked ? 'disabled' : '';

        rowHTML += `
            <td>
                <button class="switch-btn ${isTrue ? 'is-true' : ''} ${revealedClass}" 
                        onclick="toggleSwitch(${index})" 
                        ${disabledAttr}>
                    ${isTrue ? 'V' : 'F'}
                </button>
            </td>
        `;
        tr.innerHTML = rowHTML;
        tbody.appendChild(tr);
    });
}

function toggleSwitch(index) {
    if (isTableLocked) return;
    playSFX('click');
    userSwitches[index] = !userSwitches[index];
    renderTable();
}

function updateAttemptsDisplay() {
    document.getElementById('attempts-left').innerText = `Intentos: ${'❤️'.repeat(currentAttempts)}`;
}

// ==========================================
// 6. VERIFICACIÓN DE CÓDIGO
// ==========================================
function checkAnswer() {
    if (!hasAttemptedCurrentExercise) {
        totalAttemptedExercises++;
        hasAttemptedCurrentExercise = true;
    }

    totalCheckAttempts++;

    let isCorrect = true;

    currentTableData.forEach((rowValues, index) => {
        const expected = evaluateRow(currentExpression, rowValues);
        const userVal = userSwitches[index];
        if (expected !== userVal) {
            isCorrect = false;
        }
    });

    const feedback = document.getElementById('feedback');

    if (isCorrect) {
        playSFX('correct');
        isTableLocked = true;
        totalCorrectExercises++;
        
        document.getElementById('door-status').className = "door-status unlocked";
        document.getElementById('door-status').innerText = "🔓 ¡PUERTA DESBLOQUEADA!";
        feedback.style.color = "#00ff88";
        feedback.innerText = "¡Excelente! Has configurado la clave correctamente.";
        
        document.getElementById('btn-submit').classList.add('hidden');
        document.getElementById('btn-next').classList.remove('hidden');
        renderTable();
    } else {
        playSFX('wrong');
        currentAttempts--;
        updateAttemptsDisplay();

        if (currentAttempts > 0) {
            feedback.style.color = "#ff0055";
            feedback.innerText = "❌ Código incorrecto. Revisa las reglas de los operadores ∧ / ∨.";
        } else {
            feedback.style.color = "#ff0055";
            feedback.innerText = "⚠️ Has agotado los intentos. Revelando clave correcta...";
            revealCorrectAnswer();
            document.getElementById('btn-submit').classList.add('hidden');
            document.getElementById('btn-next').classList.remove('hidden');
        }
    }
}

function revealCorrectAnswer() {
    isTableLocked = true;
    currentTableData.forEach((rowValues, index) => {
        userSwitches[index] = evaluateRow(currentExpression, rowValues);
    });
    renderTable();
}

function confirmEndGame() {
    if (confirm("¿Deseas concluir la partida y ver tu reporte de resultados?")) {
        showReportScreen();
    }
}

// ==========================================
// 7. MOSTRAR REPORTE DE RESULTADOS
// ==========================================
async function showReportScreen() {
    const avgAttempts = totalAttemptedExercises > 0 
        ? (totalCheckAttempts / totalAttemptedExercises).toFixed(1) 
        : "0.0";

    const effectiveness = totalAttemptedExercises > 0 
        ? Math.round((totalCorrectExercises / totalAttemptedExercises) * 100) 
        : 0;

    document.getElementById('res-student-name').innerText = studentName;
    document.getElementById('res-game-type').innerText = `${numVariables} Variables (${numVariables === 2 ? '4 Filas' : '8 Filas'})`;
    document.getElementById('res-max-attempts').innerText = maxAttempts;
    document.getElementById('res-total-exercices').innerText = totalAttemptedExercises;
    document.getElementById('res-avg-attempts').innerText = avgAttempts;
    document.getElementById('res-total-correct').innerText = totalCorrectExercises;
    document.getElementById('res-effectiveness').innerText = `${effectiveness}%`;

    showScreen('screen-results');

    if (totalAttemptedExercises > 0) {
        try {
            await saveScore({
                gameId: 'logix',
                gameTitle: 'Salida Lógica',
                studentName: studentName,
                mode: numVariables,
                score: totalCorrectExercises,
                effectiveness: effectiveness,
                details: `${numVariables} Variables (${maxAttempts} int/puerta)`
            });
        } catch (err) {
            console.error("Error al guardar puntuación:", err);
        }
    }
}

// ==========================================
// 8. TABLA GLOBAL DE LÍDERES
// ==========================================
let currentLeaderboardMode = 2; // Estado global: por defecto inicia en 2 variables

// FUNCIÓN PARA CAMBIAR DE PESTAÑA (2 O 3 VARIABLES)
async function switchLeaderboardMode(mode) {
    currentLeaderboardMode = Number(mode);
    
    // Actualizar visualmente la pestaña activa
    const btn2 = document.getElementById('btn-tab-2');
    const btn3 = document.getElementById('btn-tab-3');
    
    if (btn2 && btn3) {
        btn2.classList.toggle('active', currentLeaderboardMode === 2);
        btn3.classList.toggle('active', currentLeaderboardMode === 3);
    }

    // Volver a cargar la tabla con el modo seleccionado
    await loadLeaderboard();
}

// ABRIR EL MODAL (POR DEFECTO EN EL MODO ACTUAL)
async function openLeaderboardModal() {
    const modal = document.getElementById('modal-leaderboard');
    if (modal) modal.classList.remove('hidden');
    await loadLeaderboard();
}

function closeLeaderboardModal() {
    const modal = document.getElementById('modal-leaderboard');
    if (modal) modal.classList.add('hidden');
}

// CARGAR LA TABLA DESDE FIREBASE
async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4">Cargando puntuaciones...</td></tr>';

    try {
        // Le pasamos la constante 'logix' y el modo actual (2 o 3)
        const scores = await getTopScores('logix', currentLeaderboardMode, 10);

        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">Aún no hay puntuaciones en el modo ${currentLeaderboardMode} variables. ¡Sé el primero!</td></tr>`;
            return;
        }

        tbody.innerHTML = '';
        scores.forEach((item, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}</td>
                <td><strong>${item.studentName}</strong></td>
                <td>${item.score}</td>
                <td>${item.effectiveness}%</td>
            `;
            tbody.appendChild(tr);
        });
    } catch (e) {
        console.error("Error cargando leaderboard:", e);
        tbody.innerHTML = '<tr><td colspan="4">No se pudo cargar la tabla de líderes.</td></tr>';
    }
}

// ==========================================
// 9. EXPOSICIÓN GLOBAL A WINDOW
// ==========================================
window.startGame = startGame;
window.checkAnswer = checkAnswer;
window.loadNextDoor = loadNextDoor;
window.confirmEndGame = confirmEndGame;
window.showScreen = showScreen;
window.toggleAudio = toggleAudio;
window.openAudioSettings = openAudioSettings;
window.closeAudioSettings = closeAudioSettings;
window.updateVolumes = updateVolumes;
window.toggleSwitch = toggleSwitch;
window.openLeaderboardModal = openLeaderboardModal;
window.closeLeaderboardModal = closeLeaderboardModal;
// Al final de tu archivo JavaScript (donde declaraste la función)
window.switchLeaderboardMode = switchLeaderboardMode;
window.openLeaderboardModal = openLeaderboardModal;
window.closeLeaderboardModal = closeLeaderboardModal;