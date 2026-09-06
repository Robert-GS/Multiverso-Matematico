// ==========================================
// 1. ESTADO DEL JUEGO Y VARIABLES
// ==========================================
let numVariables = 2;
let maxAttempts = 3;
let currentAttempts = 3;
let currentExpression = "";
let currentTableData = [];
let userSwitches = []; // Array de booleans [true, false, ...]
let isTableLocked = false;

// ==========================================
// 1. SISTEMA DE AUDIO Y SONIDOS (CORREGIDO)
// ==========================================
const sounds = {
    bg: new Audio('audio/logix/bg-music2.mp3'),
    correct: new Audio('audio/logix/correct.mp3'),
    wrong: new Audio('audio/logix/incorrect.mp3'),
    click: new Audio('audio/logix/click.mp3')
};

sounds.bg.loop = true;

// Leer si el audio está ACTIVO (si no existe previa configuración, inicia activado 'true')
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

    // Guardar estado sincronizado en memoria local
    localStorage.setItem('multiverse_audio_active', isAudioActive);
    localStorage.setItem('multiverse_bg_vol', bgVolume);
    localStorage.setItem('multiverse_sfx_vol', sfxVolume);
}

function updateVolumes() {
    bgVolume = parseFloat(document.getElementById('volume-bg').value);
    sfxVolume = parseFloat(document.getElementById('volume-sfx').value);
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

// Abrir y Cerrar Modal de Configuración
function openAudioSettings() {
    document.getElementById('modal-audio-settings').classList.remove('hidden');
}

function closeAudioSettings() {
    document.getElementById('modal-audio-settings').classList.add('hidden');
}

document.addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
        playSFX('click');
    }
});

// Inicializar el estado de audio inmediatamente al cargar la página
applyVolumes();


// Tecla Enter en Portada
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const cover = document.getElementById('screen-cover');
        if (cover && !cover.classList.contains('hidden')) {
            //sounds.bg.play().catch(err => console.log("Audio bloqueado:", err));
            showScreen('screen-setup');
        }
    }
});

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

function selectVariables(num) {
    numVariables = num;
}

// ==========================================
// 2. GENERADOR DE EXPRESIONES Y TABLAS
// ==========================================
function generateRandomExpression(numVars) {
    if (numVars === 2) {
        // Expresiones simples de 2 variables
        const vars = ['A', 'B'];
        let parts = vars.map(v => (Math.random() < 0.5 ? `${v}'` : v));
        let op = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
        return parts.join(op);
    } 

    if (numVars === 3) {
        // Elegimos de manera equitativa entre los 3 patrones (33% probabilidad cada uno)
        const patternType = Math.floor(Math.random() * 3);

        if (patternType === 0) {
            // PATRÓN 1: SIN AGRUPACIÓN (Ejemplo: A' ∧ B ∨ C')
            const vars = ['A', 'B', 'C'];
            let parts = vars.map(v => (Math.random() < 0.5 ? `${v}'` : v));
            let op1 = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            let op2 = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            return `${parts[0]}${op1}${parts[1]}${op2}${parts[2]}`;
        } 
        else if (patternType === 1) {
            // PATRÓN 2: UN GRUPO Y UNA LIBRE (Ejemplo: (A ∧ B') ∨ C)
            const p1 = Math.random() < 0.5 ? "A'" : "A";
            const p2 = Math.random() < 0.5 ? "B'" : "B";
            const p3 = Math.random() < 0.5 ? "C'" : "C";

            const innerOp = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            const outerOp = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

            return `(${p1}${innerOp}${p2})${outerOp}${p3}`;
        } 
        else {
            // PATRÓN 3: DOBLE AGRUPACIÓN (Ejemplo: (A ∧ B) ∨ (A' ∧ C'))
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
// 3. INICIO DE PARTIDA Y RENDERING
// ==========================================
function startGame() {
    numVariables = parseInt(document.getElementById('num-vars-select').value);
    maxAttempts = parseInt(document.getElementById('max-attempts').value);
    currentAttempts = maxAttempts;
    
    showScreen('screen-game');
    loadNextDoor();
}

function loadNextDoor() {
    currentAttempts = maxAttempts;
    isTableLocked = false;
    
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
    sounds.click.currentTime = 0;
    sounds.click.play().catch(() => {});
    userSwitches[index] = !userSwitches[index];
    renderTable();
}

function updateAttemptsDisplay() {
    document.getElementById('attempts-left').innerText = `Intentos: ${'❤️'.repeat(currentAttempts)}`;
}

// ==========================================
// 4. VERIFICACIÓN DE CÓDIGO
// ==========================================
function checkAnswer() {
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
        sounds.correct.currentTime = 0;
        sounds.correct.play().catch(() => {});
        isTableLocked = true;
        document.getElementById('door-status').className = "door-status unlocked";
        document.getElementById('door-status').innerText = "🔓 ¡PUERTA DESBLOQUEADA!";
        feedback.style.color = "#00ff88";
        feedback.innerText = "¡Excelente! Has configurado la clave correctamente.";
        
        document.getElementById('btn-submit').classList.add('hidden');
        document.getElementById('btn-next').classList.remove('hidden');
        renderTable();
    } else {
        sounds.wrong.currentTime = 0;
        sounds.wrong.play().catch(() => {});
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
    if (confirm("¿Deseas abandonar el laboratorio?")) {
        showScreen('screen-setup');
    }
}
