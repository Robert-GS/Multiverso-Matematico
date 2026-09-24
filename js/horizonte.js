import { saveScore, getTopScores } from './leaderboard.js';

// ==========================================
// 1. SISTEMA DE AUDIO ESPACIAL
// ==========================================
const sounds = {
    bg: new Audio('audio/horizonte/bg-music.mp3'),
    correct: new Audio('audio/horizonte/correct.mp3'),
    wrong: new Audio('audio/horizonte/wrong.mp3'),
    click: new Audio('audio/horizonte/click.mp3'),
    victory: new Audio('audio/horizonte/victory.mp3')
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

applyVolumes();

// ==========================================
// 2. ESTADO Y CONFIGURACIÓN DEL JUEGO
// ==========================================
let selectedServer = 'sector1'; // 'sector1', 'sector2', 'sector3', 'root'
let currentActiveServer = 'sector1';
let difficultyLevel = 1;

let gameMode = 'solitario';
let playerName = "Comandante Nova";
let team1Name = "Nave Orion";
let team2Name = "Nave Andromeda";

let scoreTeam1 = 0;
let scoreTeam2 = 0;
let soloCorrect = 0;
let soloTotal = 0;

let serverStats = {
    sector1: { correct: 0, total: 0, name: "Sector 1: Estación SI (Medidas)" },
    sector2: { correct: 0, total: 0, name: "Sector 2: Nebulosa Notación (Magnitudes)" },
    sector3: { correct: 0, total: 0, name: "Sector 3: Órbita Razón (Proporciones y Escalas)" }
};

let currentTurn = 1; 
let currentRound = 1;
let maxRounds = 10;
let correctAnswer = "";
let questionType = 'mixed';
let currentQuestionMode = 'multiple';

// Variables de estado para nuevos tipos de reactivos
let currentSequenceOrder = [];
let targetSequenceOrder = [];
let multiSelectTarget = [];
let treeExpectedValues = {};

const screenCover = document.getElementById('screen-cover');

function startFromCover() {
    if (screenCover && !screenCover.classList.contains('hidden')) {
        showScreen('screen-server'); 
    }
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        if (screenCover && !screenCover.classList.contains('hidden')) {
            startFromCover();
        } else {
            const directContainer = document.getElementById('direct-input-container');
            if (directContainer && !directContainer.classList.contains('hidden')) {
                const submitBtn = document.getElementById('btn-submit-answer');
                if (submitBtn && !submitBtn.disabled) checkDirectAnswer();
            }
        }
    }
});

if (screenCover) screenCover.addEventListener('click', startFromCover);

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function selectServer(server) {
    selectedServer = server;
    showScreen('screen-difficulty');
}

function selectDifficulty(level) {
    difficultyLevel = level;
    showScreen('screen-mode');
}

function selectGameMode(mode) {
    gameMode = mode;
    if (mode === 'solitario') {
        showScreen('screen-setup-solo');
    } else {
        showScreen('screen-setup');
    }
}

function startSoloGame(event) {
    event.preventDefault();
    const nameInput = document.getElementById('player-name').value.trim();
    if (!nameInput) {
        alert("Ingresa tu nombre de piloto para registrar la bitácora.");
        return;
    }
    playerName = nameInput;
    maxRounds = Infinity;
    questionType = document.getElementById('question-type-solo').value;

    resetStats();
    showScreen('screen-game');
    loadNextQuestion();
}

function startGame(event) {
    event.preventDefault();
    const t1 = document.getElementById('team1-name').value.trim();
    const t2 = document.getElementById('team2-name').value.trim();

    if (!t1 || !t2) {
        alert("Ingresa el nombre de ambos escuadrones.");
        return;
    }
    if (t1.toLowerCase() === t2.toLowerCase()) {
        alert("Los nombres de los escuadrones deben ser diferentes.");
        return;
    }

    team1Name = t1;
    team2Name = t2;
    maxRounds = parseInt(document.getElementById('total-rounds').value, 10);
    questionType = document.getElementById('question-type').value;

    resetStats();
    showScreen('screen-game');
    loadNextQuestion();
}

function resetStats() {
    scoreTeam1 = 0;
    scoreTeam2 = 0;
    soloCorrect = 0;
    soloTotal = 0;
    currentTurn = 1;
    currentRound = 1;

    for (let key in serverStats) {
        serverStats[key].correct = 0;
        serverStats[key].total = 0;
    }
}

function shuffleArray(array) {
    let arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

function hideAllQuestionContainers() {
    document.getElementById('hack-display').classList.add('hidden');
    document.getElementById('balance-game-container').classList.add('hidden');
    document.getElementById('sequence-game-container').classList.add('hidden');
    document.getElementById('multi-select-container').classList.add('hidden');
    document.getElementById('tree-game-container').classList.add('hidden');
    document.getElementById('options-container').classList.add('hidden');
    document.getElementById('direct-input-container').classList.add('hidden');
}

// ==========================================
// 3. GENERADOR Y RENDERIZADORES DE REACTIVOS
// ==========================================

function loadNextQuestion() {
    if (gameMode !== 'solitario' && currentRound - 1 >= maxRounds) {
        endGame();
        return;
    }

    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('feedback').innerText = '';
    hideAllQuestionContainers();

    if (selectedServer === 'root') {
        const sectores = ['sector1', 'sector2', 'sector3'];
        currentActiveServer = sectores[Math.floor(Math.random() * sectores.length)];
    } else {
        currentActiveServer = selectedServer;
    }

    let challengeData;
    if (currentActiveServer === 'sector1') {
        challengeData = generateSector1Challenge();
    } else if (currentActiveServer === 'sector2') {
        challengeData = generateSector2Challenge();
    } else {
        challengeData = generateSector3Challenge();
    }

    document.getElementById('challenge-instruction').innerText = challengeData.instruction;

    switch (challengeData.type) {
        case 'balance':
            renderBalanceGame(challengeData);
            break;
        case 'sequence':
            renderSequenceGame(challengeData);
            break;
        case 'multiSelect':
            renderMultiSelectGame(challengeData);
            break;
        case 'tree':
            renderTreeGame(challengeData);
            break;
        case 'standard':
        default:
            renderStandardGame(challengeData);
            break;
    }

    updateUI();
}

// RENDERIZADOR: ESTÁNDAR
function renderStandardGame(challengeData) {
    const hackDisplay = document.getElementById('hack-display');
    hackDisplay.classList.remove('hidden');
    hackDisplay.innerHTML = `<div style="font-size: 1.8rem; color: #00f3ff; letter-spacing: 1px;">${challengeData.display}</div>`;

    correctAnswer = challengeData.correct;

    if (challengeData.forceDirect) {
        currentQuestionMode = 'direct';
    } else if (questionType === 'mixed') {
        currentQuestionMode = Math.random() < 0.5 ? 'multiple' : 'direct';
    } else {
        currentQuestionMode = questionType;
    }

    const optionsContainer = document.getElementById('options-container');
    const directContainer = document.getElementById('direct-input-container');

    if (currentQuestionMode === 'multiple') {
        optionsContainer.classList.remove('hidden');
        optionsContainer.innerHTML = '';
        challengeData.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(opt);
            optionsContainer.appendChild(btn);
        });
    } else {
        directContainer.classList.remove('hidden');
        const input = document.getElementById('direct-answer');
        const submitBtn = document.getElementById('btn-submit-answer');
        input.value = '';
        input.disabled = false;
        submitBtn.disabled = false;
        input.focus();
    }
}

// RENDERIZADOR: BALANZA GRAVITATORIA
function renderBalanceGame(challengeData) {
    const balanceContainer = document.getElementById('balance-game-container');
    const optionsContainer = document.getElementById('options-container');

    balanceContainer.classList.remove('hidden');
    optionsContainer.classList.remove('hidden');

    document.getElementById('balance-left-pan').innerText = challengeData.leftPan;
    document.getElementById('balance-right-pan').innerText = challengeData.rightPan;

    correctAnswer = challengeData.correct;
    optionsContainer.innerHTML = '';

    challengeData.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(opt);
        optionsContainer.appendChild(btn);
    });
}

// RENDERIZADOR: SECUENCIA DE TELEMETRÍA
function renderSequenceGame(challengeData) {
    const sequenceContainer = document.getElementById('sequence-game-container');
    sequenceContainer.classList.remove('hidden');

    targetSequenceOrder = challengeData.correctOrder;
    currentSequenceOrder = shuffleArray([...challengeData.steps]);

    document.getElementById('btn-submit-sequence').disabled = false;
    renderSequenceItems();
}

function renderSequenceItems() {
    const list = document.getElementById('sequence-list');
    list.innerHTML = '';

    currentSequenceOrder.forEach((stepText, idx) => {
        const div = document.createElement('div');
        div.className = 'sequence-item';
        div.innerHTML = `
            <span><strong>Fase ${idx + 1}:</strong> ${stepText}</span>
            <div class="sequence-arrows">
                ${idx > 0 ? `<button onclick="moveSequenceItem(${idx}, -1)" type="button">⬆</button>` : ''}
                ${idx < currentSequenceOrder.length - 1 ? `<button onclick="moveSequenceItem(${idx}, 1)" type="button">⬇</button>` : ''}
            </div>
        `;
        list.appendChild(div);
    });
}

function moveSequenceItem(index, direction) {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= currentSequenceOrder.length) return;

    const temp = currentSequenceOrder[index];
    currentSequenceOrder[index] = currentSequenceOrder[targetIndex];
    currentSequenceOrder[targetIndex] = temp;

    renderSequenceItems();
}

function checkSequenceAnswer() {
    document.getElementById('btn-submit-sequence').disabled = true;

    let isCorrect = true;
    for (let i = 0; i < targetSequenceOrder.length; i++) {
        if (currentSequenceOrder[i] !== targetSequenceOrder[i]) {
            isCorrect = false;
            break;
        }
    }

    correctAnswer = "Secuencia Espacial Calibrada";
    processResult(isCorrect);
}

// RENDERIZADOR: ESCÁNER MÚLTIPLE
function renderMultiSelectGame(challengeData) {
    const container = document.getElementById('multi-select-container');
    container.classList.remove('hidden');

    const grid = document.getElementById('jars-grid');
    grid.innerHTML = '';

    multiSelectTarget = challengeData.correctItems.map(String);
    document.getElementById('btn-submit-multi').disabled = false;

    challengeData.items.forEach(item => {
        const label = document.createElement('label');
        label.className = 'jar-card';
        label.innerHTML = `
            <input type="checkbox" value="${item}">
            <div class="jar-icon">🛰️</div>
            <div class="jar-label">${item}</div>
        `;
        grid.appendChild(label);
    });
}

function checkMultiSelectAnswer() {
    document.getElementById('btn-submit-multi').disabled = true;

    const checkboxes = document.querySelectorAll('#jars-grid input[type="checkbox"]');
    let selected = [];
    checkboxes.forEach(cb => {
        if (cb.checked) selected.push(cb.value.toString());
    });

    selected.sort();
    let targets = [...multiSelectTarget].sort();

    let isCorrect = selected.length === targets.length && selected.every((val, index) => val === targets[index]);
    correctAnswer = targets.join(', ');

    processResult(isCorrect);
}

// RENDERIZADOR: RED DE NODOS ESPACIALES
function renderTreeGame(challengeData) {
    const container = document.getElementById('tree-game-container');
    container.classList.remove('hidden');

    const nodesContainer = document.getElementById('tree-nodes-container');
    nodesContainer.innerHTML = '';
    
    // Guardamos el valor objetivo para la validación
    treeExpectedValues = {
        rootValue: challengeData.rootValue,
        count: Object.keys(challengeData.expected).length
    };

    const root = document.createElement('div');
    root.className = 'tree-node root-node';
    root.innerText = challengeData.rootValue;
    nodesContainer.appendChild(root);

    const branch = document.createElement('div');
    branch.className = 'tree-branch';

    for (let key in challengeData.expected) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'tree-node-input';
        input.dataset.nodeId = key;
        input.placeholder = '?';
        branch.appendChild(input);
    }

    nodesContainer.appendChild(branch);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-start';
    submitBtn.style.marginTop = '15px';
    submitBtn.innerText = '⚡ Transmitir Nodos ↵';
    submitBtn.onclick = checkTreeAnswer;
    nodesContainer.appendChild(submitBtn);
}

function checkTreeAnswer() {
    const inputs = document.querySelectorAll('.tree-node-input');
    let userValues = [];
    let hasInvalidInput = false;

    inputs.forEach(input => {
        const val = parseInt(input.value.trim(), 10);
        if (isNaN(val) || val <= 0) {
            hasInvalidInput = true;
        }
        userValues.push(val);
        input.disabled = true;
    });

    const targetProduct = treeExpectedValues.rootValue;

    // Calculamos la multiplicación de todos los factores ingresados por el usuario
    const userProduct = userValues.reduce((acc, curr) => acc * curr, 1);

    // Es correcto si ningún campo estuvo vacío/inválido y el producto de los nodos da exactamente el valor objetivo
    let isCorrect = !hasInvalidInput && (userProduct === targetProduct);

    correctAnswer = `Cualquier combinación que multiplique ${targetProduct} (ej. ${userValues.join(' × ')})`;
    
    processResult(isCorrect);
}

// ==========================================
// 4. GENERADORES POR SECTOR ESPACIAL
// ==========================================

function generateSector1Challenge() {
    const rand = Math.random();

    if (rand < 0.35) {
        // BALANZA GRAVITATORIA (Equilibrio de masa en kg)
        const totalMass = Math.floor(Math.random() * 80) + 20;
        const mass1 = Math.floor(Math.random() * (totalMass - 10)) + 5;
        const missingMass = totalMass - mass1;

        let options = new Set([`${missingMass} kg`]);
        while (options.size < 4) {
            let fake = missingMass + (Math.floor(Math.random() * 10) + 1) * (Math.random() < 0.5 ? 1 : -1);
            if (fake > 0 && fake !== missingMass) options.add(`${fake} kg`);
        }

        return {
            type: 'balance',
            instruction: `⚖️ BALANZA GRAVITATORIA: Ajusta la masa del propulsor izquierdo para equilibrar la nave a ${totalMass} kg:`,
            leftPan: `? + ${mass1} kg`,
            rightPan: `${totalMass} kg`,
            correct: `${missingMass} kg`,
            options: shuffleArray(Array.from(options))
        };

    } else if (rand < 0.7) {
        // ESCÁNER MÚLTIPLE (Unidades fundamentales del SI)
        const fundamentalSI = ['Metro (m)', 'Kilogramo (kg)', 'Segundo (s)', 'Kelvin (K)'];
        const derivedSI = ['Joule (J)', 'Watt (W)', 'Newton (N)', 'Pascal (Pa)'];

        const selectedFundamental = shuffleArray(fundamentalSI).slice(0, 2);
        const selectedDerived = shuffleArray(derivedSI).slice(0, 4);
        const allItems = shuffleArray([...selectedFundamental, ...selectedDerived]);

        return {
            type: 'multiSelect',
            instruction: `📡 ESCÁNER DEL S.I.: Selecciona únicamente las Unidades Fundamentales del Sistema Internacional:`,
            items: allItems,
            correctItems: selectedFundamental
        };

    } else {
        // CONVERSIÓN ESTÁNDAR
        const km = Math.floor(Math.random() * 9) + 1;
        const meters = km * 1000;
        const ans = `${meters} m`;

        let options = new Set([ans]);
        while (options.size < 4) {
            let fake = (km + Math.floor(Math.random() * 5) + 1) * 100;
            options.add(`${fake} m`);
        }

        return {
            type: 'standard',
            instruction: `📏 TELEMETRÍA DE DISTANCIA: Convierte la distancia del asteroide a metros:`,
            display: `Distancia: [ ${km} km ] = ?`,
            correct: ans,
            options: shuffleArray(Array.from(options))
        };
    }
}

function generateSector2Challenge() {
    const rand = Math.random();

    if (rand < 0.15) {  // antes 0.35
        // SECUENCIA DE PASOS (Pasar a Notación Científica)
        const baseNum = Math.floor(Math.random() * 8) + 1;
        const numZeroes = Math.floor(Math.random() * 3) + 3;
        const zeroesStr = "0".repeat(numZeroes);
        const fullNum = `${baseNum}${zeroesStr}`;

        const stepsCorrect = [
            `Identificar el punto decimal al final del número (${fullNum}.)`,
            `Mover el punto a la izquierda hasta dejar un solo dígito (${baseNum})`,
            `Contar el número de lugares recorridos (${numZeroes} posiciones)`,
            `Expresar en potencia de 10 (${baseNum} × 10^${numZeroes})`
        ];

        return {
            type: 'sequence',
            instruction: `🌌 SECUENCIA DE NOTACIÓN: Reordena los pasos para convertir la masa de la estrella [ ${fullNum} kg ] a notación científica:`,
            steps: stepsCorrect,
            correctOrder: stepsCorrect
        };

    } else if (rand < 0.4) { // antes 0.7
        // RED DE NODOS (Descomposición de potencia de 10)
        const exp = Math.floor(Math.random() * 3) + 2; // ej. 10^2 o 10^3
        const rootVal = Math.pow(10, exp);
        const factor1 = Math.pow(10, Math.floor(exp / 2));
        const factor2 = Math.pow(10, exp - Math.floor(exp / 2));

        return {
            type: 'tree',
            instruction: `🌿 RED DE NODOS ESTELARES: Descompón la energía orbital en factores de potencia base:`,
            rootValue: rootVal,
            expected: { n1: factor1, n2: factor2 }
        };

    } else {
        // NOTACIÓN CIENTÍFICA ESTÁNDAR (Corregido)
        const exp = Math.floor(Math.random() * 4) + 3; // exponentes entre 3 y 6
        const val = Math.floor(Math.random() * 8) + 1;
        const zeroesStr = "0".repeat(exp);
        const fullNumberDisplay = `${val}${zeroesStr}`;
        const ans = `${val} × 10^${exp}`;

        let options = new Set([ans]);
        while (options.size < 4) {
            let fakeExp = exp + (Math.floor(Math.random() * 5) - 2);
            if (fakeExp !== exp && fakeExp > 0) {
                options.add(`${val} × 10^${fakeExp}`);
            }
        }

        return {
            type: 'standard',
            instruction: `🌌 TELEMETRÍA NEBULOSA: Expresa la distancia estelar en notación científica:`,
            display: `Distancia registrada: [ ${fullNumberDisplay} m ]`,
            correct: ans,
            options: shuffleArray(Array.from(options))
        };
    }
}

function generateSector3Challenge() {
    const rand = Math.random();

    if (rand < 0.4) {
        // BALANZA DE PROPORCIONES (VARIADA)
        const proportionContexts = [
            { label: 'Años Luz (AL)', unit: 'AL', minRatio: 40, maxRatio: 300, step: 10 },
            { label: 'Parsecs (pc)', unit: 'pc', minRatio: 15, maxRatio: 80, step: 5 },
            { label: 'Unidades Astronómicas (UA)', unit: 'UA', minRatio: 100, maxRatio: 500, step: 50 },
            { label: 'Megavoltios (MV)', unit: 'MV', minRatio: 25, maxRatio: 150, step: 25 }
        ];

        // 1. Seleccionamos un contexto/unidad al azar
        const ctx = proportionContexts[Math.floor(Math.random() * proportionContexts.length)];

        // 2. Generamos una razón de proporción aleatoria (ej. 1 celda = 120 AL)
        const ratioSteps = Math.floor((ctx.maxRatio - ctx.minRatio) / ctx.step) + 1;
        const ratio = ctx.minRatio + (Math.floor(Math.random() * ratioSteps) * ctx.step);

        // 3. Generamos las celdas/unidades del lado izquierdo y derecho
        const fuel1 = Math.floor(Math.random() * 5) + 2; // ej. 2 a 6
        const multiplier = Math.floor(Math.random() * 3) + 2; // multiplicador x2, x3 o x4
        const fuel2 = fuel1 * multiplier;

        // 4. Calculamos las distancias/valores reales
        const dist1 = fuel1 * ratio;
        const targetDist = fuel2 * ratio;
        const ans = `${targetDist} ${ctx.unit}`;

        // 5. Generamos distractores verosímiles
        let options = new Set([ans]);
        while (options.size < 4) {
            let offsetSteps = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
            let fake = targetDist + (offsetSteps * ctx.step * multiplier);
            if (fake > 0 && fake !== targetDist) {
                options.add(`${fake} ${ctx.unit}`);
            }
        }

        return {
            type: 'balance',
            instruction: `⚖️ BALANZA DE ESCALA: Equilibra la relación de consumo espacial (${ctx.label}):`,
            leftPan: `${fuel1} Celdas ➔ ${dist1} ${ctx.unit}`,
            rightPan: `${fuel2} Celdas ➔ ?`,
            correct: ans,
            options: shuffleArray(Array.from(options))
        };

    } else {
        // ESCALAS ESTELARES CON VARIACIONES DIVERSAS
        const conversionTypes = [
            {
                unitFrom: 'cm',
                unitTo: 'm',
                scaleLabel: '1 cm : 1000 m',
                factor: 1000,
                stepFake: 200
            },
            {
                unitFrom: 'm',
                unitTo: 'cm',
                scaleLabel: '1 m : 100 cm',
                factor: 100,
                stepFake: 50
            },
            {
                unitFrom: 'm',
                unitTo: 'km',
                scaleLabel: '1000 m : 1 km',
                factor: 0.001,
                stepFake: 1
            },
            {
                unitFrom: 'km',
                unitTo: 'm',
                scaleLabel: '1 km : 1000 m',
                factor: 1000,
                stepFake: 500
            }
        ];

        // Seleccionamos un tipo de conversión al azar
        const config = conversionTypes[Math.floor(Math.random() * conversionTypes.length)];
        
        let valueFrom, realValue;

        if (config.unitFrom === 'm' && config.unitTo === 'km') {
            // Genera metros en múltiplos de 1000 (ej. 2000 m, 5000 m) para obtener km enteros
            valueFrom = (Math.floor(Math.random() * 8) + 2) * 1000;
            realValue = valueFrom * config.factor;
        } else {
            valueFrom = Math.floor(Math.random() * 8) + 2;
            realValue = valueFrom * config.factor;
        }

        const ans = `${realValue} ${config.unitTo}`;

        let options = new Set([ans]);
        while (options.size < 4) {
            let offset = (Math.floor(Math.random() * 5) + 1) * config.stepFake * (Math.random() < 0.5 ? 1 : -1);
            let fake = realValue + offset;
            if (fake > 0 && fake !== realValue) {
                options.add(`${fake} ${config.unitTo}`);
            }
        }

        return {
            type: 'standard',
            instruction: `⚖️ ESCALA DE MAPA GALÁCTICO: La relación de escala es [ ${config.scaleLabel} ].`,
            display: `Si el sector mide [ ${valueFrom} ${config.unitFrom} ] en la telemetría, ¿cuál es el tamaño real en ${config.unitTo}?`,
            correct: ans,
            options: shuffleArray(Array.from(options))
        };
    }
}

// ==========================================
// 5. EVALUACIÓN Y PROCESAMIENTO
// ==========================================

function checkAnswer(selected) {
    const buttons = document.querySelectorAll('#options-container button');
    buttons.forEach(btn => btn.disabled = true);
    processResult(selected.toString().trim() === correctAnswer.toString().trim());
}

function checkDirectAnswer() {
    const input = document.getElementById('direct-answer');
    const userVal = input.value.trim();

    if (!userVal) return;

    input.disabled = true;
    document.getElementById('btn-submit-answer').disabled = true;

    processResult(userVal.toLowerCase() === correctAnswer.toLowerCase());
}

function processResult(isCorrect) {
    const feedback = document.getElementById('feedback');

    serverStats[currentActiveServer].total++;
    if (isCorrect) serverStats[currentActiveServer].correct++;

    if (gameMode === 'solitario') {
        soloTotal++;
        if (isCorrect) {
            playSFX('correct');
            soloCorrect++;
            feedback.style.color = '#06d6a0';
            feedback.innerText = `🚀 ¡TELEMETRÍA EXACTA, COMANDANTE ${playerName.toUpperCase()}! (+1 Orbita)`;
        } else {
            playSFX('wrong');
            feedback.style.color = '#ff4d6d';
            feedback.innerText = `💥 ¡FALLO EN SENSORES! La respuesta correcta era: ${correctAnswer}`;
        }
    } else {
        const activeTeamName = currentTurn === 1 ? team1Name : team2Name;
        if (isCorrect) {
            playSFX('correct');
            feedback.style.color = '#06d6a0';
            feedback.innerText = `🚀 ¡Transmisión exitosa de ${activeTeamName}! (+1 Punto)`;
            if (currentTurn === 1) scoreTeam1++;
            else scoreTeam2++;
        } else {
            playSFX('wrong');
            feedback.style.color = '#ff4d6d';
            feedback.innerText = `💥 Interferencia en ${activeTeamName}. La solución era: ${correctAnswer}`;
        }
        currentTurn = currentTurn === 1 ? 2 : 1;
        currentRound++;
    }

    document.getElementById('btn-next').classList.remove('hidden');
    updateUI();
}

function updateUI() {
    const container = document.getElementById('scoreboard-container');
    const abortBtn = document.getElementById('btn-abort-game');
    const serverLabel = currentActiveServer.toUpperCase();

    if (gameMode === 'solitario') {
        abortBtn.innerText = "🏁 Regresar a la Base";
        container.innerHTML = `
            <div class="team-score active-team">🚀 PILOTO: ${playerName}</div>
            <div id="round-info">SECTOR: ${serverLabel}</div>
            <div class="team-score">🛰️ ACIERTOS: ${soloCorrect} de ${soloTotal} (♾️ Libre)</div>
        `;
    } else {
        abortBtn.innerText = "🏁 Abortar Misión";
        let team1Class = currentTurn === 1 ? 'active-team' : '';
        let team2Class = currentTurn === 2 ? 'active-team' : '';

        container.innerHTML = `
            <div id="team1-display" class="team-score ${team1Class}">${team1Name}: ${scoreTeam1} pts</div>
            <div id="round-info">MISIÓN: ${currentRound} / ${maxRounds} (${serverLabel})</div>
            <div id="team2-display" class="team-score ${team2Class}">${team2Name}: ${scoreTeam2} pts</div>
        `;
    }
}

function confirmEndGame() {
    const msg = gameMode === 'solitario' 
        ? "¿Deseas finalizar el vuelo de exploración y obtener el reporte de telemetría?" 
        : "¿Estás seguro de que deseas abortar la misión de escuadrones?";

    if (confirm(msg)) endGame();
}

// ==========================================
// 6. REPORTE FINAL Y LÍDERES
// ==========================================

async function endGame() {
    const resultsTitle = document.getElementById('results-title');
    const winnerMessage = document.getElementById('winner-message');
    const finalScores = document.getElementById('final-scores');

    if (gameMode === 'solitario') {
        resultsTitle.innerText = "📜 TELEMETRÍA FINAL DE MISIÓN 📜";
        winnerMessage.innerText = `¡Exploración Concluida, Comandante ${playerName}!`;

        const accuracy = soloTotal > 0 ? Math.round((soloCorrect / soloTotal) * 100) : 0;

        let reportHTML = `
            <div style="background: rgba(0, 243, 255, 0.05); padding: 18px; border-radius: 8px; border: 1px dashed #00f3ff; text-align: left; max-width: 480px; margin: 0 auto;">
                <p><strong>Piloto Comandante:</strong> ${playerName}</p>
                <p><strong>Sector Explorado:</strong> ${selectedServer === 'root' ? 'DESAFÍO COSMOS (Prueba del Comandante)' : selectedServer.toUpperCase()}</p>
                <p><strong>Rango Astronáutico:</strong> Rango ${difficultyLevel}</p>
                <hr style="border: 0; border-top: 1px dashed #00f3ff; margin: 10px 0;">
                <p><strong>Enigmas Transmitidos:</strong> ${soloTotal}</p>
                <p><strong>Aciertos de Telemetría:</strong> ${soloCorrect}</p>
                <p><strong>Efectividad Estelar:</strong> <span style="color:#06d6a0; font-weight:bold;">${accuracy}%</span></p>
        `;

        if (selectedServer === 'root') {
            reportHTML += `
                <hr style="border: 0; border-top: 1px dashed #00f3ff; margin: 10px 0;">
                <p style="font-weight: bold; color: #ffd166; text-align: center;">📊 Desglose por Sectores Galácticos:</p>
            `;
            for (let key in serverStats) {
                const s = serverStats[key];
                const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                reportHTML += `<p>• <strong>${s.name}:</strong> ${s.correct}/${s.total} (${acc}%)</p>`;
            }
        }

        reportHTML += `
            </div>
            <p style="font-size: 0.95rem; color: #a0aec0; margin-top: 15px;">
                📷 <em>Captura esta pantalla como evidencia de tu vuelo cósmico.</em>
            </p>
        `;

        finalScores.innerHTML = reportHTML;

        if (soloTotal > 0) {
            try {
                const modeKey = `${selectedServer}_${difficultyLevel}_${questionType}`;

                await saveScore({
                    gameId: 'horizonte',
                    gameTitle: 'Horizonte Cósmico',
                    studentName: playerName,
                    mode: modeKey,
                    score: soloCorrect,
                    effectiveness: accuracy,
                    details: `Sector: ${selectedServer.toUpperCase()} | Rango: ${difficultyLevel} | Tipo: ${questionType}`
                });
            } catch (err) {
                console.error("Error al guardar puntuación en Horizonte Cósmico:", err);
            }
        }

    } else {
        resultsTitle.innerText = "🏆 GUERRA DE ESCUADRONES FINALIZADA 🏆";
        let winnerText = "";
        if (scoreTeam1 > scoreTeam2) winnerText = `🏆 ¡Escuadrón Ganador: ${team1Name}! 🏆`;
        else if (scoreTeam2 > scoreTeam1) winnerText = `🏆 ¡Escuadrón Ganador: ${team2Name}! 🏆`;
        else winnerText = "🤝 ¡Empate Cósmico Perfecto! 🤝";

        winnerMessage.innerText = winnerText;
        finalScores.innerHTML = `
            <p><strong>${team1Name}:</strong> ${scoreTeam1} puntos</p>
            <p><strong>${team2Name}:</strong> ${scoreTeam2} puntos</p>
        `;
    }

    showScreen('screen-results');
    playSFX('victory');
}

function resetToServerSelection() {
    showScreen('screen-server');
}

// ==========================================
// 7. TABLA DE LÍDERES ESPACIAL
// ==========================================
let currentLeaderboardServer = 'sector1'; 
let currentLeaderboardLevel = '1';
let currentLeaderboardType = 'multiple';

async function switchLeaderboardMode(server) {
    currentLeaderboardServer = String(server).toLowerCase();

    ['sector1', 'sector2', 'sector3', 'root'].forEach(s => {
        const btn = document.getElementById(`btn-tab-${s}`);
        if (btn) btn.classList.toggle('active', currentLeaderboardServer === s);
    });

    await loadLeaderboard();
}

async function onLeaderboardLevelChange() {
    const levelSelect = document.getElementById('leaderboard-level-select');
    if (levelSelect) {
        currentLeaderboardLevel = levelSelect.value;
        await loadLeaderboard();
    }
}

async function onLeaderboardTypeChange() {
    const typeSelect = document.getElementById('leaderboard-type-select');
    if (typeSelect) {
        currentLeaderboardType = typeSelect.value;
        await loadLeaderboard();
    }
}

async function openLeaderboardModal() {
    const modal = document.getElementById('modal-leaderboard');
    if (modal) modal.classList.remove('hidden');

    const levelSelect = document.getElementById('leaderboard-level-select');
    if (levelSelect) currentLeaderboardLevel = levelSelect.value;

    const typeSelect = document.getElementById('leaderboard-type-select');
    if (typeSelect) currentLeaderboardType = typeSelect.value;

    await loadLeaderboard();
}

function closeLeaderboardModal() {
    const modal = document.getElementById('modal-leaderboard');
    if (modal) modal.classList.add('hidden');
}

async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4">Conectando con la red galáctica...</td></tr>';

    const combinedMode = `${currentLeaderboardServer}_${currentLeaderboardLevel}_${currentLeaderboardType}`;

    try {
        const scores = await getTopScores('horizonte', combinedMode, 10);

        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">Sin registros en ${currentLeaderboardServer.toUpperCase()} (Rango ${currentLeaderboardLevel}) - ${currentLeaderboardType}. ¡Sé el primer comandante!</td></tr>`;
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
        tbody.innerHTML = '<tr><td colspan="4">No se pudo obtener la telemetría global.</td></tr>';
    }
}

// ==========================================
// 8. EXPOSICIÓN GLOBAL A WINDOW
// ==========================================
window.showScreen = showScreen;
window.selectServer = selectServer;
window.selectDifficulty = selectDifficulty;
window.selectGameMode = selectGameMode;
window.startSoloGame = startSoloGame;
window.startGame = startGame;
window.checkAnswer = checkAnswer;
window.checkDirectAnswer = checkDirectAnswer;
window.checkSequenceAnswer = checkSequenceAnswer;
window.checkMultiSelectAnswer = checkMultiSelectAnswer;
window.moveSequenceItem = moveSequenceItem;
window.loadNextQuestion = loadNextQuestion;
window.confirmEndGame = confirmEndGame;
window.resetToServerSelection = resetToServerSelection;
window.toggleAudio = toggleAudio;
window.openAudioSettings = openAudioSettings;
window.closeAudioSettings = closeAudioSettings;
window.updateVolumes = updateVolumes;
window.switchLeaderboardMode = switchLeaderboardMode;
window.onLeaderboardLevelChange = onLeaderboardLevelChange;
window.onLeaderboardTypeChange = onLeaderboardTypeChange;
window.openLeaderboardModal = openLeaderboardModal;
window.closeLeaderboardModal = closeLeaderboardModal;