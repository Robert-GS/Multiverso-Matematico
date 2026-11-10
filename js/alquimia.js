import { saveScore, getTopScores } from './leaderboard.js';

// ==========================================
// 1. SISTEMA DE AUDIO Y SONIDOS
// ==========================================
const sounds = {
    bg: new Audio('audio/alquimia/bg-music.mp3'),
    correct: new Audio('audio/alquimia/correct.mp3'),
    wrong: new Audio('audio/alquimia/wrong.mp3'),
    click: new Audio('audio/alquimia/click.mp3'),
    victory: new Audio('audio/alquimia/victory.mp3')
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
// 2. CONFIGURACIÓN Y ESTADO DEL JUEGO
// ==========================================
let selectedServer = 'tomo1'; // 'tomo1', 'tomo2', 'tomo3', 'root'
let currentActiveServer = 'tomo1';
let difficultyLevel = 1;

let gameMode = 'solitario'; // 'solitario' o 'equipos'
let playerName = "Aprendiz de Magia";
let team1Name = "Fénix Dorado";
let team2Name = "Sombra Estelar";

// Puntajes
let scoreTeam1 = 0;
let scoreTeam2 = 0;
let attemptsTeam1 = 0;
let attemptsTeam2 = 0;
let duelAborted = false;
let soloCorrect = 0;
let soloTotal = 0;

// Desglose para el reporte en solitario (Modo Maestro)
let serverStats = {
    tomo1: { correct: 0, total: 0, name: "Tomo 1: Unidades y Equivalencias" },
    tomo2: { correct: 0, total: 0, name: "Tomo 2: Simplificación y Operaciones" },
    tomo3: { correct: 0, total: 0, name: "Tomo 3: Proporciones, Inversa y %" }
};

let currentTurn = 1; 
let currentRound = 1;
let maxRounds = 10;
let correctAnswer = "";
let questionType = 'mixed';
let currentQuestionMode = 'multiple';

// Estado para nuevos minijuegos
let currentSequenceOrder = [];
let targetSequenceOrder = [];
let multiSelectTarget = [];
let treeExpectedValues = {};

const screenCover = document.getElementById('screen-cover');

function startFromCover() {
    if (screenCover && !screenCover.classList.contains('hidden')) {
        openGrimoire(); 
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
    //showScreen('screen-difficulty');
    showScreen('screen-mode');
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
        alert("Ingresa tu nombre de aprendiz para registrar el pergamino.");
        return;
    }

    playerName = nameInput;
    maxRounds = Infinity; // Modo Ilimitado
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
        alert("Ingresa un nombre para ambos gremios.");
        return;
    }

    if (t1.toLowerCase() === t2.toLowerCase()) {
        alert("Los nombres de los gremios deben ser diferentes.");
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
    attemptsTeam1 = 0;
    attemptsTeam2 = 0;
    duelAborted = false;
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

function mcd(a, b) {
    return b === 0 ? a : mcd(b, a % b);
}

function isPrime(n) {
    if (n < 2) return false;
    for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) return false;
    }
    return true;
}

// Oculta todos los contenedores visuales de los reactivos
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
// 3. GENERADOR DINÁMICO DE RETOS MATEMÁTICOS
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
        const tomos = ['tomo1', 'tomo2', 'tomo3'];
        currentActiveServer = tomos[Math.floor(Math.random() * tomos.length)];
    } else {
        currentActiveServer = selectedServer;
    }

    let challengeData;
    if (currentActiveServer === 'tomo1') {
        challengeData = generateTomo1Challenge();
    } else if (currentActiveServer === 'tomo2') {
        challengeData = generateTomo2Challenge();
    } else {
        challengeData = generateTomo3Challenge();
    }

    document.getElementById('challenge-instruction').innerText = challengeData.instruction;

    // RENDERIZADO SEGÚN EL TIPO DE REACTIVO GENERADO
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

// ------------------------------------------------------------------
// RENDERIZADORES DE REACTIVOS
// ------------------------------------------------------------------

function renderStandardGame(challengeData) {
    const hackDisplay = document.getElementById('hack-display');
    hackDisplay.classList.remove('hidden');
    hackDisplay.innerHTML = `<div style="font-size: 1.8rem; color: #ffd700; letter-spacing: 1px;">${challengeData.display}</div>`;

    correctAnswer = challengeData.correct;

    if (challengeData.forceMultiple) {
        currentQuestionMode = 'multiple';
    } else if (challengeData.forceDirect) {
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

function renderSequenceGame(challengeData) {
    const sequenceContainer = document.getElementById('sequence-game-container');
    sequenceContainer.classList.remove('hidden');

    const list = document.getElementById('sequence-list');
    list.innerHTML = '';

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
            <span><strong>Paso ${idx + 1}:</strong> ${stepText}</span>
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

    correctAnswer = "Secuencia Alquímica Correcta";
    processResult(isCorrect);
}

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
            <div class="jar-icon">🧪</div>
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

function renderTreeGame(challengeData) {
    const container = document.getElementById('tree-game-container');
    container.classList.remove('hidden');

    const nodesContainer = document.getElementById('tree-nodes-container');
    nodesContainer.innerHTML = '';
    treeExpectedValues = challengeData.expected;

    const root = document.createElement('div');
    root.className = 'tree-node root-node';
    // Cápsula horizontal: solo presentación del reactivo de amplificación.
    root.style.width = 'auto';
    root.style.minWidth = '170px';
    root.style.maxWidth = '95%';
    root.style.height = '68px';
    root.style.padding = '8px 22px';
    root.style.boxSizing = 'border-box';
    root.style.borderRadius = '999px';
    root.style.whiteSpace = 'nowrap';
    root.style.fontSize = '1.35rem';
    root.innerText = challengeData.rootValue;
    nodesContainer.appendChild(root);

    const branch = document.createElement('div');
    branch.className = 'tree-branch';

    for (let key in challengeData.expected) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tree-node-input';
        input.dataset.nodeId = key;
        input.placeholder = key === 'numerador' ? 'Num' : key === 'denominador' ? 'Den' : '?';
        input.setAttribute('aria-label', key === 'numerador' ? 'Numerador' : key === 'denominador' ? 'Denominador' : 'Respuesta');
        input.style.fontSize = '0.9rem';
        branch.appendChild(input);
    }

    nodesContainer.appendChild(branch);

    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn-start';
    submitBtn.style.marginTop = '15px';
    submitBtn.innerText = '⚡ Transmutar Factores ↵';
    submitBtn.onclick = checkTreeAnswer;
    nodesContainer.appendChild(submitBtn);
}

function checkTreeAnswer() {
    const inputs = document.querySelectorAll('.tree-node-input');
    
    // Obtener las respuestas del usuario y convertirlas a números
    let userValues = [];
    inputs.forEach(input => {
        userValues.push(parseInt(input.value.trim(), 10));
        input.disabled = true;
    });

    // Obtener los valores esperados de la pregunta actual
    let expectedValues = Object.values(treeExpectedValues);

    // En amplificación el orden importa: numerador primero, denominador después.
    // No ordenar los valores: intercambiarlos representa otra fracción.

    // Comprobar si coinciden exactamente todos los factores
    let isCorrect = userValues.length === expectedValues.length &&
        userValues.every((val, index) => val === expectedValues[index]);

    correctAnswer = expectedValues.join('/');
    processResult(isCorrect);
}

// ------------------------------------------------------------------
// GENERADORES POR TOMO (INCLUYEN NUEVOS REACTIVOS)
// ------------------------------------------------------------------

// Generadores alineados con los contenidos estudiados en el aula.
// Los retos de interacción propia (balance, sequence, multiSelect, tree)
// mantienen su interfaz independientemente de multiple/direct/mixed.
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function numericOptions(answer, min = 1) {
    const values = new Set([String(answer)]);
    let offset = 1;
    while (values.size < 4) {
        if (answer - offset >= min) values.add(String(answer - offset));
        values.add(String(answer + offset));
        offset++;
    }
    return shuffleArray([...values].slice(0, 4));
}

function fractionOptions(numerator, denominator) {
    const correct = `${numerator}/${denominator}`;
    const values = new Set([correct]);
    let offset = 1;
    while (values.size < 4) {
        if (numerator + offset > 0 && (numerator + offset) * denominator !== numerator * denominator)
            values.add(`${numerator + offset}/${denominator}`);
        if (numerator - offset > 0) values.add(`${numerator - offset}/${denominator}`);
        if (denominator + offset > 0 && numerator * (denominator + offset) !== numerator * denominator)
            values.add(`${numerator}/${denominator + offset}`);
        offset++;
    }
    return shuffleArray([...values].slice(0, 4));
}

function generateTomo1Challenge() {
    if (Math.random() < 0.5) {
        // Fracción aparente -> entero. Reutiliza la balanza de cuatro opciones.
        const whole = randomInt(2, 9);
        const den = randomInt(2, 9);
        return {
            type: 'balance',
            instruction: '⚖️ DESCRISTALIZACIÓN ALQUÍMICA: ¿Cuántos frascos enteros representa esta fracción aparente?',
            leftPan: `${whole * den}/${den}`,
            rightPan: '? enteros',
            correct: String(whole),
            options: numericOptions(whole)
        };
    }

    // Entero -> fracción aparente. La respuesta directa solicita la fracción completa.
    const whole = randomInt(2, 7);
    const den = randomInt(2, 6);
    const numerator = whole * den;
    const correct = `${numerator}/${den}`;
    return {
        type: 'standard',
        instruction: '⚖️ CRISTALIZACIÓN UNIFORME: Escribe la fracción completa (numerador/denominador) que representa los enteros indicados.',
        display: `Frascos enteros: [ ${whole} ] · Denominador requerido: ${den} · Fracción = ?`,
        correct,
        options: fractionOptions(numerator, den)
    };
}

function generateTomo2Challenge() {
    const variant = randomInt(0, 5);
    if (variant === 0) {
        // Reconocer una fracción equivalente entre cuatro alternativas.
        const n = randomInt(1, 5);
        const d = randomInt(n + 1, n + 6);
        const k = randomInt(2, 5);
        const correct = `${n * k}/${d * k}`;
        const options = new Set([correct]);
        let offset = 1;
        while (options.size < 4) {
            options.add(`${n * k + offset}/${d * k}`);
            options.add(`${n * k}/${d * k + offset}`);
            offset++;
        }
        return {
            type: 'standard',
            instruction: '🔮 BALANZA DE EQUIVALENCIA: ¿Cuál de las siguientes fracciones equivale a la fórmula base?',
            display: `Fórmula base: [ ${n}/${d} ]`,
            correct,
            options: shuffleArray([...options].slice(0, 4)),
            forceMultiple: true // Varias respuestas directas serían matemáticamente válidas.
        };
    }
    if (variant === 1) {
        // Hallar el numerador desconocido mediante producto cruzado.
        const n = randomInt(1, 5);
        const d = randomInt(n + 1, n + 6);
        const k = randomInt(2, 5);
        const missing = n * k;
        return {
            type: 'balance',
            instruction: '⚖️ BALANZA DE TRANSMUTACIÓN: Encuentra el numerador faltante para equilibrar las fracciones.',
            leftPan: `${n}/${d}`,
            rightPan: `?/${d * k}`,
            correct: String(missing),
            options: numericOptions(missing)
        };
    }
    if (variant === 2) {
        // Simplificación a forma irreducible.
        const n = randomInt(1, 5);
        const d = randomInt(n + 1, n + 6);
        const common = mcd(n, d);
        const reducedN = n / common;
        const reducedD = d / common;
        const k = randomInt(2, 6);
        return {
            type: 'standard',
            instruction: '🧪 DESTILACIÓN PURA: Simplifica la mezcla a su forma irreducible. Escribe la fracción completa (numerador/denominador).',
            display: `Mezcla bruta: [ ${reducedN * k}/${reducedD * k} ] = ?`,
            correct: `${reducedN}/${reducedD}`,
            options: fractionOptions(reducedN, reducedD)
        };
    }
    if (variant === 3) {
        // Orden de simplificación con pasos inequívocos.
        const n = randomInt(1, 5);
        const d = randomInt(n + 1, n + 6);
        const common = mcd(n, d);
        const rn = n / common;
        const rd = d / common;
        const k = randomInt(2, 6);
        const rawN = rn * k;
        const rawD = rd * k;
        const steps = [
            `Calcular el MCD de ${rawN} y ${rawD}: ${k}`,
            `Dividir el numerador entre ${k}: ${rawN} ÷ ${k} = ${rn}`,
            `Dividir el denominador entre ${k}: ${rawD} ÷ ${k} = ${rd}`,
            `Escribir la fracción irreducible: ${rn}/${rd}`
        ];
        return {
            type: 'sequence',
            instruction: `🧪 SECUENCIA DE DESTILACIÓN: Ordena los pasos del procedimiento para simplificar ${rawN}/${rawD}.`,
            steps,
            correctOrder: steps
        };
    }
    if (variant === 4) {
        // Identificar todas las fracciones equivalentes de seis frascos.
        //const n = randomInt(1, 4);
        //const d = randomInt(n + 1, n + 5);
        const n = randomInt(1, 9);
        const d = randomInt(n + 1, n + 7);

        const g = mcd(n, d);
        const rn = n / g;
        const rd = d / g;
        const factors = shuffleArray([2, 3, 4, 5, 6]);
        const valid = factors.slice(0, 3).map(k => `${rn * k}/${rd * k}`);
        const invalid = factors.slice(0, 3).map((k, i) => `${rn * k + i + 1}/${rd * k}`);
        return {
            type: 'multiSelect',
            instruction: `🔮 SELECCIÓN DE ESENCIAS EQUIVALENTES: Selecciona TODOS los frascos equivalentes a ${rn}/${rd}.`,
            items: shuffleArray([...valid, ...invalid]),
            correctItems: valid
        };
    }
    // Árbol de dos campos: numerador y denominador amplificados.
    const n = randomInt(1, 5);
    const d = randomInt(n + 1, n + 6);
    const k = randomInt(2, 5);
    return {
        type: 'tree',
        instruction: `🌿 RED DE AMPLIFICACIÓN: Multiplica numerador y denominador de ${n}/${d} por k = ${k}. Escribe el numerador y el denominador resultantes en las dos casillas.`,
        rootValue: `${n}/${d} × ${k}/${k}`,
        expected: { numerador: n * k, denominador: d * k }
    };
}

function generateTomo3Challenge() {
    // Solo proporcionalidad directa, inversa y porcentajes.
    const chosen = ['directa', 'inversa', 'porcentaje'][randomInt(0, 2)];
    if (chosen === 'directa') {
        //const basePot = randomInt(4, 10);
        //const baseElix = randomInt(3, 8);  // antes 2, 4
        const basePot = randomInt(4, 10);
        const baseElix = randomIntExcept(3, 8, basePot);
        const factor = randomInt(2, 5);
        const targetElix = baseElix * factor;
        const ans = basePot * factor;
        return {
            type: 'standard',
            instruction: '📜 ESCALADO DE RECETA: Ajusta la dosis de Polvo de Estrellas para elaborar elixires múltiples:',
            display: `Si ${baseElix} pociones usan ${basePot}g de polvo, ¿cuántos gramos usan ${targetElix} pociones?`,
            correct: String(ans),
            options: numericOptions(ans)
        };
    }
    if (chosen === 'inversa') {
        //const magos1 = 2;
        //const horas1 = randomInt(1, 4) * 3;
        //const magos2 = 6;
        //const ans = magos1 * horas1 / magos2;

        let magos1, magos2;

        do {
            magos1 = randomInt(2, 12);
            magos2 = randomInt(magos1 + 1, 12);
        } while (magos2 % gcd(magos1, magos2) !== 0);

        const divisor = magos2 / gcd(magos1, magos2);
        //const horas1 = divisor * randomInt(1, 4);

        const horas1 = divisor * randomIntExcept(1, 4, magos2 / divisor);

        const ans = magos1 * horas1 / magos2;

        return {
            type: 'standard',
            instruction: '⏳ TRABAJO EN EQUIPO (PROPORCIÓN INVERSA): Tiempo de encantamiento de un pergamino:',
            display: `Si ${magos1} alquimistas tardan ${horas1} horas en canalizar una poción, ¿cuántas horas tardarán ${magos2} alquimistas?`,
            correct: String(ans),
            options: numericOptions(ans)
        };
    }
    // Porcentajes: mismo contenido, enunciado y rangos que la versión original.
    //const pct = randomInt(1, 4) * 10;
    //const pct = randomInt(1, 45);
    //const total = randomInt(2, 15) * 10;  //antes 2 a 6
    //const ans = pct * total / 100;
    
    let ans, pct, total;

    const porcentajes = [
        3, 5, 10, 15, 20, 25, 30, 40, 50,
        60, 70, 75, 80, 90,
        110, 120, 125, 130, 140, 150
    ];

    do {
        ans = randomInt(2, 50);

        pct = porcentajes[randomInt(0, porcentajes.length - 1)];

        total = ans * 100 / pct;

    } while (
        !Number.isInteger(total) ||
        total % 10 !== 0 ||
        total < 20 ||
        total > 150 ||
        total === 100
    );

    
    let options = new Set([String(ans)]);
    while (options.size < 4) {
        const fake = ans + randomInt(1, 4) * (Math.random() < 0.5 ? 2 : -2);
        if (fake >= 0) options.add(String(fake));
    }
    return {
        type: 'standard',
        instruction: '🔮 CONCENTRACIÓN DE MAGIA: Calcula la pureza de la poción:',
        display: `¿Cuánto es el ${pct}% de una esencia de ${total} ml?`,
        correct: String(ans),
        options: shuffleArray([...options])
    };
}

function gcd(a, b) {
    while (b) {
        [a, b] = [b, a % b];
    }
    return a;
}

function randomIntExcept(min, max, excluded) {
    let n;
    do {
        n = randomInt(min, max);
    } while (n === excluded);
    return n;
}

// ==========================================
// 4. EVALUACIÓN Y PROCESAMIENTO
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
            feedback.style.color = '#00ff66';
            feedback.innerText = `✨ ¡MEZCLA PERFECTA, APRENDIZ ${playerName.toUpperCase()}! (+1 Elixir)`;
        } else {
            playSFX('wrong');
            feedback.style.color = '#ff3366';
            feedback.innerText = `💥 ¡EL CALDERO HA EXPLOTADO! La respuesta correcta era: ${correctAnswer}`;
        }
    } else {
        if (currentTurn === 1) attemptsTeam1++;
        else attemptsTeam2++;
        const activeTeamName = currentTurn === 1 ? team1Name : team2Name;
        if (isCorrect) {
            playSFX('correct');
            feedback.style.color = '#00ff66';
            feedback.innerText = `✨ ¡Encantamiento exitoso de ${activeTeamName}! (+1 Punto)`;
            if (currentTurn === 1) scoreTeam1++;
            else scoreTeam2++;
        } else {
            playSFX('wrong');
            feedback.style.color = '#ff3366';
            feedback.innerText = `💥 Fallo mágico de ${activeTeamName}. La solución era ${correctAnswer}`;
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
        abortBtn.innerText = "🏁 Salir del Taller";
        container.innerHTML = `
            <div class="team-score active-team">🧙‍♂️ APRENDIZ: ${playerName}</div>
            <div id="round-info">TOMO: ${serverLabel}</div>
            <div class="team-score">🧪 POCIONES: ${soloCorrect} de ${soloTotal} (♾️ Ilimitado)</div>
        `;
    } else {
        abortBtn.innerText = "🏁 Abortar Duelo";
        let team1Class = currentTurn === 1 ? 'active-team' : '';
        let team2Class = currentTurn === 2 ? 'active-team' : '';

        container.innerHTML = `
            <div id="team1-display" class="team-score ${team1Class}">${team1Name}: ${scoreTeam1} pts</div>
            <div id="round-info">ENIGMA: ${currentRound} / ${maxRounds} (${serverLabel})</div>
            <div id="team2-display" class="team-score ${team2Class}">${team2Name}: ${scoreTeam2} pts</div>
        `;
    }
}

function confirmEndGame() {
    const msg = gameMode === 'solitario' 
        ? "¿Deseas finalizar la sesión de alquimia y obtener tu pergamino de resultados?" 
        : "¿Estás seguro de que deseas abortar el duelo místico?";

    if (confirm(msg)) {
        if (gameMode === 'equipos') duelAborted = true;
        endGame();
    }
}

// ==========================================
// 5. REPORTE FINAL DE ALQUIMIA
// ==========================================

async function endGame() {
    const resultsTitle = document.getElementById('results-title');
    const winnerMessage = document.getElementById('winner-message');
    const finalScores = document.getElementById('final-scores');

    if (gameMode === 'solitario') {
        resultsTitle.innerText = "📜 PERGAMINO DE EVALUACIÓN ALQUÍMICA 📜";
        winnerMessage.innerText = `¡Práctica Finalizada, Aprendiz ${playerName}!`;

        const accuracy = soloTotal > 0 ? Math.round((soloCorrect / soloTotal) * 100) : 0;

        let reportHTML = `
            <div style="background: rgba(255, 215, 0, 0.05); padding: 18px; border-radius: 8px; border: 1px dashed #ffd700; text-align: left; max-width: 480px; margin: 0 auto; font-family: 'Georgia', serif;">
                <p><strong>Aprendiz Alquimista:</strong> ${playerName}</p>
                <p><strong>Tomo Seleccionado:</strong> ${selectedServer === 'root' ? 'GRAN ALQUIMISTA (Prueba de Maestro)' : selectedServer.toUpperCase()}</p>
                <p><strong>Nivel de Maestría:</strong> Nivel ${difficultyLevel}</p>
                <hr style="border: 0; border-top: 1px dashed #ffd700; margin: 10px 0;">
                <p><strong>Fórmulas Intentadas:</strong> ${soloTotal}</p>
                <p><strong>Pociones Logradas:</strong> ${soloCorrect}</p>
                <p><strong>Efectividad Mágica:</strong> <span style="color:#00ff66; font-weight:bold;">${accuracy}%</span></p>
        `;

        if (selectedServer === 'root') {
            reportHTML += `
                <hr style="border: 0; border-top: 1px dashed #ffd700; margin: 10px 0;">
                <p style="font-weight: bold; color: #ffd700; text-align: center;">📊 Desglose por Tomos Místicos:</p>
            `;
            for (let key in serverStats) {
                const s = serverStats[key];
                const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                reportHTML += `<p>• <strong>${s.name}:</strong> ${s.correct}/${s.total} (${acc}%)</p>`;
            }
        }

        reportHTML += `
            </div>
            <p style="font-size: 0.95rem; color: #d1d5db; margin-top: 15px;">
                📷 <em>Captura esta pantalla como evidencia oficial de tu práctica.</em>
            </p>
        `;

        finalScores.innerHTML = reportHTML;

        // GUARDAR PUNTAJE EN FIRESTORE SI HUBO INTENTOS EN SOLITARIO
        if (soloTotal > 0) {
            try {
                const modeKey = `${selectedServer}_${difficultyLevel}_${questionType}`;

                await saveScore({
                    gameId: 'alquimia',
                    gameTitle: 'Alquimia Matemática',
                    studentName: playerName,
                    mode: modeKey, // Ej: "tomo1_1_multiple" o "root_3_mixed"
                    score: soloCorrect,
                    effectiveness: accuracy,
                    details: `Tomo: ${selectedServer.toUpperCase()} | Nivel: ${difficultyLevel} | Tipo: ${questionType}`
                });
            } catch (err) {
                console.error("Error al guardar puntuación en Alquimia Matemática:", err);
            }
        }

    } else {
        resultsTitle.innerText = "✦ EL VEREDICTO DEL CONSEJO ALQUÍMICO ✦";
        const tie = scoreTeam1 === scoreTeam2;
        const winner = scoreTeam1 > scoreTeam2 ? 1 : scoreTeam2 > scoreTeam1 ? 2 : 0;
        const completed = attemptsTeam1 + attemptsTeam2;
        const totalSuccess = scoreTeam1 + scoreTeam2;
        const duelAccuracy = completed ? Math.round(totalSuccess * 100 / completed) : 0;
        const tomeNames = { tomo1: 'Unidades y Equivalencias', tomo2: 'Destilaciones y Reducción', tomo3: 'Proporciones y Elixires', root: 'Prueba del Gran Alquimista' };
        const escapeText = (value) => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
        const card = (name, score, attempts, number) => `
            <article class="duel-guild ${!duelAborted && winner === number ? 'duel-guild-winner' : ''}">
                <div class="duel-guild-seal" aria-hidden="true">${number === 1 ? '🔥' : '🌙'}</div>
                <div class="duel-guild-name">${escapeText(name)}</div>
                <div class="duel-guild-score">${score}<small> puntos</small></div>
                <div class="duel-guild-stats">${score} aciertos de ${attempts} intentos</div>
                <div class="duel-guild-rate">Efectividad: ${attempts ? Math.round(score * 100 / attempts) : 0}%</div>
                ${!duelAborted && winner === number ? '<div class="duel-winner-tag">✦ GREMIO VENCEDOR ✦</div>' : ''}
            </article>`;
        winnerMessage.innerText = duelAborted ? '⚗️ Duelo interrumpido · Resultados parciales' : tie ? '🤝 ¡Honor compartido! Los gremios han empatado' : `👑 ¡${winner === 1 ? team1Name : team2Name} conquista el duelo! 👑`;
        finalScores.innerHTML = `
            <div class="duel-ceremony">
                <div class="duel-laurels" aria-hidden="true">${duelAborted ? '📜' : tie ? '⚖️' : '👑'}</div>
                <p class="duel-ceremony-kicker">${duelAborted ? 'ACTA DE ENFRENTAMIENTO' : tie ? 'VEREDICTO DE IGUALDAD' : 'CEREMONIA DE CORONACIÓN'}</p>
                <div class="duel-podium">${card(team1Name, scoreTeam1, attemptsTeam1, 1)}<div class="duel-versus">VS</div>${card(team2Name, scoreTeam2, attemptsTeam2, 2)}</div>
                <div class="duel-summary">
                    <div><span>Encantamientos resueltos</span><strong>${completed} / ${maxRounds}</strong></div>
                    <div><span>Aciertos combinados</span><strong>${totalSuccess}</strong></div>
                    <div><span>Efectividad global</span><strong>${duelAccuracy}%</strong></div>
                </div>
                <p class="duel-context">📜 ${escapeText(tomeNames[selectedServer] || selectedServer)} · Nivel ${difficultyLevel}${duelAborted ? ' · Duelo sin concluir' : ''}</p>
                <p class="duel-oath">✦ LA MAGIA NACE DEL EQUILIBRIO MATEMÁTICO ✦</p>
            </div>`;
    }

    document.getElementById('screen-results').classList.toggle('duel-results-active', gameMode === 'equipos');
    showScreen('screen-results');
    if (!duelAborted) playSFX('victory');
}

function resetToServerSelection() {
    showScreen('screen-server');
}

// ==========================================
// 6. TABLA GLOBAL DE LÍDERES
// ==========================================
let currentLeaderboardServer = 'tomo1'; 
let currentLeaderboardLevel = '1';
let currentLeaderboardType = 'multiple';

async function switchLeaderboardMode(server) {
    currentLeaderboardServer = String(server).toLowerCase();

    ['tomo1', 'tomo2', 'tomo3', 'root'].forEach(s => {
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

    tbody.innerHTML = '<tr><td colspan="4">Cargando puntuaciones místicas...</td></tr>';

    const combinedMode = `${currentLeaderboardServer}_${currentLeaderboardLevel}_${currentLeaderboardType}`;

    try {
        const scores = await getTopScores('alquimia', combinedMode, 10);

        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">Sin récords en ${currentLeaderboardServer.toUpperCase()} (Nivel ${currentLeaderboardLevel}) - ${currentLeaderboardType}. ¡Sé el primer alquimista!</td></tr>`;
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
// GRIMORIO VIVIENTE - HISTORIA INTRODUCTORIA
// Independiente de la lógica de los reactivos
// ==========================================
const grimoireScenes = [
    {
        chapter: 'CAPÍTULO I',
        title: 'El despertar del Grimorio',
        image: 'img/alquimia/escena01.png',
        alt: 'Los dos alquimistas descubren el Grimorio Fragmentado',
        story: 'En lo alto de una antigua torre, dos jóvenes alquimistas descubren que el legendario Grimorio de las Proporciones ha sido fragmentado por una fuerza misteriosa. Sin su magia, las pociones pierden el equilibrio, los cristales se debilitan y las fórmulas comienzan a desvanecerse. Solo quienes dominen el poder de los números podrán restaurarlo.'
    },
    {
        chapter: 'CAPÍTULO II',
        title: 'Los tres tomos perdidos',
        image: 'img/alquimia/escena02.png',
        alt: 'Los alquimistas encuentran tres tomos mágicos en una biblioteca arcana',
        story: 'Para recuperar los secretos del Grimorio, deberán superar los desafíos de tres tomos ancestrales: Unidades y Fracciones; Destilaciones y Reducción; y Proporciones y Elixires. Cada desafío superado devolverá una parte de su poder. Pero una proporción equivocada podría desestabilizar la magia del taller.'
    },
    {
        chapter: 'CAPÍTULO III',
        title: 'El pacto de los dos alquimistas',
        image: 'img/alquimia/escena03.png',
        alt: 'Ambos alquimistas unen sus poderes para restaurar el Grimorio',
        story: 'Ante el altar del Gran Alquimista, ambos descubren el secreto final: ninguna fórmula puede restaurarse sin equilibrio. Con ingenio, conocimiento y trabajo en equipo, deberán unir los tres tomos y devolver la armonía al mundo de la alquimia. ¡El destino del Grimorio está en sus manos!'
    }
];
let grimoirePage = 0;

function renderGrimoirePage() {
    const scene = grimoireScenes[grimoirePage];
    document.getElementById('grimoire-image').src = scene.image;
    document.getElementById('grimoire-image').alt = scene.alt;
    document.getElementById('grimoire-chapter').textContent = scene.chapter;
    document.getElementById('grimoire-title').textContent = scene.title;
    document.getElementById('grimoire-story').textContent = scene.story;
    document.getElementById('grimoire-oath').classList.toggle('hidden', grimoirePage !== grimoireScenes.length - 1);
    document.getElementById('grimoire-count').textContent = `Página ${grimoirePage + 1} de ${grimoireScenes.length}`;
    document.getElementById('grimoire-prev').disabled = grimoirePage === 0;
    document.getElementById('grimoire-next').textContent = grimoirePage === grimoireScenes.length - 1
        ? '✨ Comenzar aventura →' : 'Siguiente página →';
}
function openGrimoire() {
    grimoirePage = 0;
    renderGrimoirePage();
    showScreen('screen-grimoire');
}
function previousGrimoirePage() {
    if (grimoirePage > 0) {
        grimoirePage--;
        renderGrimoirePage();
    }
}
function nextGrimoirePage() {
    if (grimoirePage < grimoireScenes.length - 1) {
        grimoirePage++;
        renderGrimoirePage();
    } else {
        showScreen('screen-server');
    }
}
function skipGrimoire() {
    showScreen('screen-server');
}

// ==========================================
// 7. EXPOSICIÓN GLOBAL A WINDOW
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
window.openGrimoire = openGrimoire;
window.previousGrimoirePage = previousGrimoirePage;
window.nextGrimoirePage = nextGrimoirePage;
window.skipGrimoire = skipGrimoire;
