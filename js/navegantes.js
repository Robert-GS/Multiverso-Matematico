import { saveScore, getTopScores } from './leaderboard.js';

// 1. SISTEMA DE AUDIO NAVAL
const sounds = {
    bg: new Audio('audio/navegantes/bg-music.mp3'),
    correct: new Audio('audio/navegantes/correct.mp3'),
    wrong: new Audio('audio/navegantes/wrong.mp3'),
    click: new Audio('audio/navegantes/click.mp3'),
    victory: new Audio('audio/navegantes/victory.mp3')
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

function openAudioSettings() { document.getElementById('modal-audio-settings').classList.remove('hidden'); }
function closeAudioSettings() { document.getElementById('modal-audio-settings').classList.add('hidden'); }

document.addEventListener('click', e => {
    if (e.target.tagName === 'BUTTON' || e.target.closest('button')) playSFX('click');
});

applyVolumes();

// 2. ESTADO DEL JUEGO Y LOGICA DE EVENTOS
let selectedServer = 'isla1'; 
let currentActiveServer = 'isla1';
let difficultyLevel = 1;

let gameMode = 'solitario';
let playerName = "Capitán Corsario";
let team1Name = "La Perla Negra";
let team2Name = "El Holandés Yerto";

let scoreTeam1 = 0;
let scoreTeam2 = 0;
let soloCorrect = 0;
let soloTotal = 0;

let serverStats = {
    isla1: { correct: 0, total: 0, name: "Isla 1: Reglas de Potencias" },
    isla2: { correct: 0, total: 0, name: "Isla 2: Exponentes Negativos" },
    isla3: { correct: 0, total: 0, name: "Isla 3: Radicación y Cancelación" }
};

let currentTurn = 1; 
let currentRound = 1;
let maxRounds = 10;
let correctAnswer = "";
let questionType = 'mixed';
let currentQuestionMode = 'multiple';

const screenCover = document.getElementById('screen-cover');

let cableState = { selectedLeft: null, matches: [], pairs: [] };
let sequenceExpectedOrder = [];
let currentSequenceOrder = [];

function startFromCover() {
    if (screenCover && !screenCover.classList.contains('hidden')) showScreen('screen-server');
}

document.addEventListener('keydown', e => {
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

function selectServer(server) { selectedServer = server; showScreen('screen-difficulty'); }
function selectDifficulty(level) { difficultyLevel = level; showScreen('screen-mode'); }
function selectGameMode(mode) {
    gameMode = mode;
    showScreen(mode === 'solitario' ? 'screen-setup-solo' : 'screen-setup');
}

function startSoloGame(e) {
    e.preventDefault();
    const input = document.getElementById('player-name').value.trim();
    if (!input) return alert("Ingresa tu nombre de navegante para firmar la bitácora.");
    playerName = input;
    maxRounds = Infinity;
    questionType = document.getElementById('question-type-solo').value;
    resetStats();
    showScreen('screen-game');
    loadNextQuestion();
}

function startGame(e) {
    e.preventDefault();
    const t1 = document.getElementById('team1-name').value.trim();
    const t2 = document.getElementById('team2-name').value.trim();
    if (!t1 || !t2) return alert("Ingresa el nombre de ambos galeones.");
    if (t1.toLowerCase() === t2.toLowerCase()) return alert("Los galeones deben tener nombres distintos.");
    team1Name = t1;
    team2Name = t2;
    maxRounds = parseInt(document.getElementById('total-rounds').value, 10);
    questionType = document.getElementById('question-type').value;
    resetStats();
    showScreen('screen-game');
    loadNextQuestion();
}

function resetStats() {
    scoreTeam1 = 0; scoreTeam2 = 0; soloCorrect = 0; soloTotal = 0;
    currentTurn = 1; currentRound = 1;
    for (let k in serverStats) { serverStats[k].correct = 0; serverStats[k].total = 0; }
}

function shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// 3. GENERADOR DE RETOS DE POTENCIACIÓN Y RADICACIÓN

// Oculta todos los contenedores de preguntas
function hideAllQuestionContainers() {
    document.getElementById('options-container').classList.add('hidden');
    document.getElementById('direct-input-container').classList.add('hidden');
    document.getElementById('drag-game-container').classList.add('hidden');
    document.getElementById('cable-game-container').classList.add('hidden');
    document.getElementById('sequence-game-container').classList.add('hidden');
}

// Modificación del despachador loadNextQuestion
function loadNextQuestion() {
    if (gameMode !== 'solitario' && currentRound - 1 >= maxRounds) return endGame();

    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('feedback').innerText = '';
    hideAllQuestionContainers();

    currentActiveServer = selectedServer === 'root'
        ? ['isla1', 'isla2', 'isla3'][Math.floor(Math.random() * 3)]
        : selectedServer;

    // Selección aleatoria de tipo de mecánica
    const availableMechanics = ['standard', 'drag', 'cable', 'sequence'];
    const chosenMechanic = (questionType === 'mixed') 
        ? availableMechanics[Math.floor(Math.random() * availableMechanics.length)] 
        : 'standard';

    if (chosenMechanic === 'drag') {
        renderDragGame();
    } else if (chosenMechanic === 'cable') {
        renderCableGame();
    } else if (chosenMechanic === 'sequence') {
        renderSequenceGame();
    } else {
        renderStandardGame();
    }

    updateUI();
}

// --- 1. JUEGO ESTÁNDAR (Opción Múltiple / Directa) ---
function renderStandardGame() {
    let challenge;
    if (currentActiveServer === 'isla1') challenge = generateIsla1Challenge();
    else if (currentActiveServer === 'isla2') challenge = generateIsla2Challenge();
    else challenge = generateIsla3Challenge();

    document.getElementById('challenge-instruction').innerText = challenge.instruction;
    document.getElementById('hack-display').innerHTML = `<div style="font-size: 1.8rem; color: #f39c12;">${challenge.display}</div>`;
    correctAnswer = challenge.correct;

    const optGrid = document.getElementById('options-container');
    const dirContainer = document.getElementById('direct-input-container');

    if (questionType === 'direct' || (questionType === 'mixed' && Math.random() < 0.5)) {
        dirContainer.classList.remove('hidden');
        const input = document.getElementById('direct-answer');
        const submitBtn = document.getElementById('btn-submit-answer');
        input.value = ''; input.disabled = false; submitBtn.disabled = false; input.focus();
    } else {
        optGrid.classList.remove('hidden');
        optGrid.innerHTML = '';
        challenge.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.innerText = opt;
            btn.onclick = () => checkAnswer(opt);
            optGrid.appendChild(btn);
        });
    }
}

// --- 2. DRAG & DROP DE COORDENADAS / EXPONENTES ---
function renderDragGame() {
    document.getElementById('challenge-instruction').innerText = "⚓ NAVEGACIÓN PRECISA: Arrastra la potencia hacia la simplificación correspondiente.";
    document.getElementById('hack-display').innerHTML = `<div style="font-size: 1.2rem; color: #f39c12;">Arrastra la cápsula al contenedor correcto</div>`;
    document.getElementById('drag-game-container').classList.remove('hidden');

    const sourceBox = document.getElementById('drag-source-container');
    const targetsBox = document.getElementById('drag-targets-container');
    sourceBox.innerHTML = ''; targetsBox.innerHTML = '';

    const base = Math.floor(Math.random() * 3) + 2;
    const exp1 = Math.floor(Math.random() * 3) + 1;
    const exp2 = Math.floor(Math.random() * 3) + 1;
    const correctVal = Math.pow(base, exp1 + exp2);

    const targetData = [
        { label: `${base}^${exp1 + exp2} (${correctVal})`, isCorrect: true },
        { label: `${base}^${exp1 * exp2}`, isCorrect: false },
        { label: `${base}^${exp1 - exp2}`, isCorrect: false },
        { label: `${base * (exp1 + exp2)}`, isCorrect: false }
    ];

    // Elemento arrastrable
    const dragItem = document.createElement('div');
    dragItem.className = 'drag-item';
    dragItem.draggable = true;
    dragItem.innerText = `${base}^${exp1} × ${base}^${exp2}`;
    dragItem.ondragstart = (e) => e.dataTransfer.setData('text/plain', 'dragged-item');
    sourceBox.appendChild(dragItem);

    // Contenedores destino
    shuffleArray(targetData).forEach(target => {
        const targetDiv = document.createElement('div');
        targetDiv.className = 'drag-target';
        targetDiv.innerHTML = `<span>Contenedor</span><strong>${target.label}</strong>`;
        
        targetDiv.ondragover = (e) => { e.preventDefault(); targetDiv.classList.add('drag-over'); };
        targetDiv.ondragleave = () => targetDiv.classList.remove('drag-over');
        targetDiv.ondrop = (e) => {
            e.preventDefault();
            targetDiv.classList.remove('drag-over');
            processResult(target.isCorrect);
        };
        targetsBox.appendChild(targetDiv);
    });
}

// --- 3. TRAZO Y CONEXIÓN DE LÍNEAS NÁUTICAS ---
// Banco global de parejas para la conexión de rutas marinas
// Bancos ampliados con alta diversidad por Isla
const CABLE_BANKS = {
    isla1: [
        // Reglas de potencias algebraicas y numéricas
        { left: "x^a × x^b", right: "x^(a+b)" },
        { left: "x^a ÷ x^b", right: "x^(a-b)" },
        { left: "(x^a)^b", right: "x^(a·b)" },
        { left: "x^0", right: "1" },
        { left: "(x · y)^a", right: "x^a · y^a" },
        { left: "(x / y)^a", right: "x^a / y^a" },
        { left: "2^3 × 2^2", right: "2^5 (32)" },
        { left: "3^5 ÷ 3^3", right: "3^2 (9)" },
        { left: "(2^2)^3", right: "2^6 (64)" },
        { left: "5^0 + 2^3", right: "9" },
        { left: "10^4 ÷ 10^2", right: "100" },
        { left: "a^7 × a^(-2)", right: "a^5" }
    ],
    isla2: [
        // Exponentes negativos, fracciones e inversos
        { left: "x^(-a)", right: "1 / x^a" },
        { left: "(a/b)^(-1)", right: "b / a" },
        { left: "(a/b)^(-n)", right: "(b/a)^n" },
        { left: "2^(-2)", right: "1 / 4" },
        { left: "3^(-1)", right: "1 / 3" },
        { left: "5^(-2)", right: "1 / 25" },
        { left: "(1/3)^(-2)", right: "9" },
        { left: "(2/5)^(-1)", right: "5 / 2" },
        { left: "(1/2)^(-4)", right: "16" },
        { left: "x^(-3) · x^5", right: "x^2" },
        { left: "4^(-1) + 2^(-1)", right: "3 / 4" },
        { left: "10^(-3)", right: "0.001" }
    ],
    isla3: [
        // Radicación, exponentes fraccionarios y cancelación
        { left: "a√x", right: "x^(1/a)" },
        { left: "a√(x^b)", right: "x^(b/a)" },
        { left: "a√(x^a)", right: "x" },
        { left: "√(16)", right: "4" },
        { left: "3√(27)", right: "3" },
        { left: "4√(16)", right: "2" },
        { left: "x^(1/2)", right: "√x" },
        { left: "x^(2/3)", right: "3√(x^2)" },
        { left: "√(x^6)", right: "x^3" },
        { left: "3√(x^9)", right: "x^3" },
        { left: "√(25 · 4)", right: "10" },
        { left: "3√(-8)", right: "-2" }
    ]
};

// --- 3. TRAZO Y CONEXIÓN DE LÍNEAS NÁUTICAS (CON PAREJAS ALEATORIAS) ---
function renderCableGame() {
    document.getElementById('challenge-instruction').innerText = "🗺️ RUTAS MARÍTIMAS: Conecta cada regla con su desarrollo algebraico correcto.";
    document.getElementById('hack-display').innerHTML = `<div style="font-size: 1.1rem; color: #f39c12;">Selecciona un nodo de la izquierda y conéctalo con el de la derecha</div>`;
    document.getElementById('cable-game-container').classList.remove('hidden');

    // 1. Obtener el banco según la isla actual (o combinar todos si es 'root' / Tesoro del Calamar)
    let availablePairs = [];
    if (currentActiveServer === 'root') {
        availablePairs = [...CABLE_BANKS.isla1, ...CABLE_BANKS.isla2, ...CABLE_BANKS.isla3];
    } else {
        availablePairs = CABLE_BANKS[currentActiveServer] || CABLE_BANKS.isla1;
    }

    // 2. Desordenar y tomar 3 parejas al azar para este intento
    const selectedPairs = shuffleArray([...availablePairs])
        .slice(0, 3)
        .map((pair, index) => ({ id: index + 1, left: pair.left, right: pair.right }));

    cableState = { 
        selectedLeft: null, 
        matches: [], 
        pairs: selectedPairs
    };

    const leftCol = document.getElementById('cable-left-col');
    const rightCol = document.getElementById('cable-right-col');
    const svg = document.getElementById('cable-svg-canvas');
    leftCol.innerHTML = ''; rightCol.innerHTML = ''; svg.innerHTML = '';

    // 3. Mezclar la columna derecha independientemente
    const shuffledRight = shuffleArray([...cableState.pairs]);

    cableState.pairs.forEach(pair => {
        const leftNode = document.createElement('div');
        leftNode.className = 'cable-node';
        leftNode.innerText = pair.left;
        leftNode.dataset.id = pair.id;
        leftNode.onclick = () => selectCableNode('left', pair.id, leftNode);
        leftCol.appendChild(leftNode);
    });

    shuffledRight.forEach(pair => {
        const rightNode = document.createElement('div');
        rightNode.className = 'cable-node';
        rightNode.innerText = pair.right;
        rightNode.dataset.id = pair.id;
        rightNode.onclick = () => selectCableNode('right', pair.id, rightNode);
        rightCol.appendChild(rightNode);
    });
}

function selectCableNode(side, id, element) {
    if (element.classList.contains('matched')) return;

    if (side === 'left') {
        document.querySelectorAll('#cable-left-col .cable-node').forEach(n => n.classList.remove('selected'));
        element.classList.add('selected');
        cableState.selectedLeft = { id, element };
    } else if (side === 'right' && cableState.selectedLeft) {
        const leftEl = cableState.selectedLeft.element;
        const rightEl = element;

        if (cableState.selectedLeft.id === id) {
            // Conexión Correcta: Dibujar línea verde y marcar nodos
            leftEl.classList.remove('selected');
            leftEl.classList.add('matched');
            rightEl.classList.add('matched');
            
            drawCableLine(leftEl, rightEl, true);
            cableState.matches.push(id);
            cableState.selectedLeft = null;

            if (cableState.matches.length === cableState.pairs.length) {
                setTimeout(() => processResult(true), 600);
            }
        } else {
            // Conexión Incorrecta: Dibujar línea de error temporal y procesar fallo
            drawCableLine(leftEl, rightEl, false);
            setTimeout(() => processResult(false), 500);
        }
    }
}

// Función encargada de calcular posiciones exactas y agregar el elemento <line> al SVG
function drawCableLine(fromNode, toNode, isCorrect) {
    const svg = document.getElementById('cable-svg-canvas');
    const containerRect = document.getElementById('cable-game-container').getBoundingClientRect();
    
    const fromRect = fromNode.getBoundingClientRect();
    const toRect = toNode.getBoundingClientRect();

    // Cálculo del punto central derecho del nodo izquierdo
    const x1 = fromRect.right - containerRect.left;
    const y1 = fromRect.top + (fromRect.height / 2) - containerRect.top;

    // Cálculo del punto central izquierdo del nodo derecho
    const x2 = toRect.left - containerRect.left;
    const y2 = toRect.top + (toRect.height / 2) - containerRect.top;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', isCorrect ? 'cable-line correct' : 'cable-line');

    svg.appendChild(line);
}

// --- 4. SECUENCIA DE PASOS DE NAVEGACIÓN ---
const SEQUENCE_BANKS = {
    isla1: [
        {
            display: "Expresión: (2^3 × 2^2)^2",
            steps: [
                "Sumar exponentes dentro del paréntesis: 2^(3+2) = 2^5",
                "Aplicar regla de potencia de una potencia: (2^5)^2",
                "Multiplicar los exponentes: 2^(5×2) = 2^10",
                "Evaluar la potencia final: 1024"
            ]
        },
        {
            display: "Expresión: (3^5 ÷ 3^2) × 3^1",
            steps: [
                "Restar exponentes en la división interna: 3^(5-2) = 3^3",
                "Expresar el producto resultante: 3^3 × 3^1",
                "Sumar exponentes de igual base: 3^(3+1) = 3^4",
                "Evaluar la potencia resultante: 81"
            ]
        },
        {
            display: "Expresión: (4^2 × 4^0)^2",
            steps: [
                "Aplicar la regla del exponente cero: 4^0 = 1",
                "Simplificar el producto dentro del paréntesis: 4^2 × 1 = 4^2",
                "Aplicar la potencia de potencia: (4^2)^2 = 4^4",
                "Calcular el resultado numérico: 256"
            ]
        }
    ],
    isla2: [
        {
            display: "Expresión: (2/3)^(-2)",
            steps: [
                "Identificar el exponente negativo en la base fraccionaria",
                "Invertir la fracción para cambiar el signo: (3/2)^2",
                "Distribuir el exponente al numerador y denominador: 3^2 / 2^2",
                "Calcular la fracción final: 9/4"
            ]
        },
        {
            display: "Expresión: 5^(-1) + 2^(-1)",
            steps: [
                "Convertir los exponentes negativos a fracciones: 1/5 + 1/2",
                "Buscar un denominador común para las fracciones: 10",
                "Convertir a fracciones equivalentes: 2/10 + 5/10",
                "Sumar los numeradores resultantes: 7/10"
            ]
        },
        {
            display: "Expresión: (x^(-3) × x^5)^(-1)",
            steps: [
                "Sumar exponentes dentro del paréntesis: x^(-3+5) = x^2",
                "Escribir la expresión simplificada: (x^2)^(-1)",
                "Multiplicar exponentes: x^(2 × -1) = x^(-2)",
                "Expresar con exponente positivo: 1 / x^2"
            ]
        }
    ],
    isla3: [
        {
            display: "Expresión: √(16 × 9)",
            steps: [
                "Aplicar la propiedad distributiva de la raíz: √16 × √9",
                "Calcular la raíz del primer factor: √16 = 4",
                "Calcular la raíz del segundo factor: √9 = 3",
                "Multiplicar los valores obtenidos: 4 × 3 = 12"
            ]
        },
        {
            display: "Expresión: 3√(8^2)",
            steps: [
                "Expresar la raíz como exponente fraccionario: 8^(2/3)",
                "Escribir la base como potencia de 2: (2^3)^(2/3)",
                "Multiplicar exponentes cancelando el 3: 2^(3 × 2/3) = 2^2",
                "Obtener el valor final: 4"
            ]
        },
        {
            display: "Expresión: √(x^8) ÷ 3√(x^6)",
            steps: [
                "Convertir la primera raíz a potencia: x^(8/2) = x^4",
                "Convertir la segunda raíz a potencia: x^(6/3) = x^2",
                "Plantear la división de potencias: x^4 ÷ x^2",
                "Restar los exponentes: x^(4-2) = x^2"
            ]
        }
    ]
};

function renderSequenceGame() {
    document.getElementById('challenge-instruction').innerText = "📜 ORDEN EN CUBIERTA: Ordena correctamente los pasos para resolver la expresión.";
    document.getElementById('sequence-game-container').classList.remove('hidden');

    // 1. Obtener el banco según la isla actual (o combinar todos si es 'root')
    let availableSequences = [];
    if (currentActiveServer === 'root') {
        availableSequences = [...SEQUENCE_BANKS.isla1, ...SEQUENCE_BANKS.isla2, ...SEQUENCE_BANKS.isla3];
    } else {
        availableSequences = SEQUENCE_BANKS[currentActiveServer] || SEQUENCE_BANKS.isla1;
    }

    // 2. Seleccionar un ejercicio al azar
    const selectedExercise = availableSequences[Math.floor(Math.random() * availableSequences.length)];

    // 3. Renderizar el enunciado de la pregunta
    document.getElementById('hack-display').innerHTML = `<div style="font-size: 1.2rem; color: #f39c12;">${selectedExercise.display}</div>`;

    // 4. Guardar la secuencia correcta original (sin números estáticos)
    sequenceExpectedOrder = [...selectedExercise.steps];

    // 5. Desordenar para la interfaz del usuario
    currentSequenceOrder = shuffleArray([...sequenceExpectedOrder]);
    
    // Evitar que por azar el shuffle devuelva el orden correcto desde el inicio
    while (JSON.stringify(currentSequenceOrder) === JSON.stringify(sequenceExpectedOrder)) {
        currentSequenceOrder = shuffleArray([...sequenceExpectedOrder]);
    }

    updateSequenceUI();
}

function updateSequenceUI() {
    const list = document.getElementById('sequence-list');
    list.innerHTML = '';
    currentSequenceOrder.forEach((step, idx) => {
        const li = document.createElement('li');
        li.className = 'sequence-item';
        li.innerHTML = `
            <span>${step}</span>
            <div class="sequence-controls">
                <button onclick="moveSequence(${idx}, -1)">⬆</button>
                <button onclick="moveSequence(${idx}, 1)">⬇</button>
            </div>
        `;
        list.appendChild(li);
    });
}

function moveSequence(index, direction) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= currentSequenceOrder.length) return;
    const temp = currentSequenceOrder[index];
    currentSequenceOrder[index] = currentSequenceOrder[newIndex];
    currentSequenceOrder[newIndex] = temp;
    updateSequenceUI();
}

function checkSequenceAnswer() {
    const isCorrect = JSON.stringify(currentSequenceOrder) === JSON.stringify(sequenceExpectedOrder);
    processResult(isCorrect);
}



// --- ISLA 1: Potenciación y Reglas ---
function generateIsla1Challenge() {
    const isMult = Math.random() < 0.5;
    const base = Math.floor(Math.random() * 4) + 2; 
    const exp1 = Math.floor(Math.random() * 4) + 1;
    const exp2 = Math.floor(Math.random() * 4) + 1;

    if (isMult) {
        const expAns = exp1 + exp2;
        const valAns = Math.pow(base, expAns);
        const ansStr = `${valAns}`;
        let options = new Set([ansStr, `${Math.pow(base, exp1 * exp2)}`, `${Math.pow(base, exp1)}`, `${valAns + base}`]);
        return {
            instruction: `💨 VIENTO EN POPA: Multiplica potencias de igual base para desplegar las velas.`,
            display: `${base}<sup>${exp1}</sup> × ${base}<sup>${exp2}</sup> = ?`,
            correct: ansStr,
            options: shuffleArray(Array.from(options))
        };
    } else {
        const bigExp = Math.max(exp1, exp2) + Math.min(exp1, exp2);
        const smallExp = Math.min(exp1, exp2);
        const expAns = bigExp - smallExp;
        const valAns = Math.pow(base, expAns);
        const ansStr = `${valAns}`;
        let options = new Set([ansStr, `${Math.pow(base, bigExp + smallExp)}`, `${expAns}`, `${valAns + 2}`]);
        return {
            instruction: `💨 NAVEGACIÓN EN CORRIENTE: Divide potencias de igual base.`,
            display: `${base}<sup>${bigExp}</sup> ÷ ${base}<sup>${smallExp}</sup> = ?`,
            correct: ansStr,
            options: shuffleArray(Array.from(options))
        };
    }
}

// --- ISLA 2: Exponentes Negativos e Inverso ---
function generateIsla2Challenge() {
    const base = Math.floor(Math.random() * 5) + 2;
    const exp = Math.floor(Math.random() * 3) + 1;
    const ansFrac = `1/${Math.pow(base, exp)}`;

    let options = new Set([
        ansFrac,
        `-${Math.pow(base, exp)}`,
        `1/${base * exp}`,
        `${Math.pow(base, exp)}`
    ]);

    return {
        instruction: `🌀 EL REMOLINO DEL INVERSO: Convierte el exponente negativo a su equivalente positivo (Inverso multiplicativo).`,
        display: `${base}<sup>-${exp}</sup> = ?`,
        correct: ansFrac,
        options: shuffleArray(Array.from(options))
    };
}

// --- ISLA 3: Radicación y Cancelación ---
function generateIsla3Challenge() {
    const isCancel = Math.random() < 0.5;
    const base = Math.floor(Math.random() * 9) + 2;

    if (isCancel) {
        const power = Math.floor(Math.random() * 4) + 2;
        const ansStr = `${base}`;
        let options = new Set([ansStr, `${Math.pow(base, 2)}`, `${base * power}`, `${base + power}`]);
        return {
            instruction: `🗝️ CERROJO DE LA GRUTA: Cancela la potencia y la raíz de igual índice para liberar el cofre.`,
            display: `<sup>${power}</sup>√(${base}<sup>${power}</sup>) = ?`,
            correct: ansStr,
            options: shuffleArray(Array.from(options))
        };
    } else {
        const square = base * base;
        const ansStr = `${base}`;
        let options = new Set([ansStr, `${square * 2}`, `${Math.floor(base / 2)}`, `${square}`]);
        return {
            instruction: `🗝️ RAÍZ DEL CAPITÁN: Determina la raíz cuadrada exacta.`,
            display: `√(${square}) = ?`,
            correct: ansStr,
            options: shuffleArray(Array.from(options))
        };
    }
}

// 4. EVALUACIÓN DE RESPUESTAS
function checkAnswer(selected) {
    document.querySelectorAll('#options-container button').forEach(b => b.disabled = true);
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
            playSFX('correct'); soloCorrect++;
            feedback.style.color = '#2ecc71';
            feedback.innerText = `⚓ ¡RUMBO CORRECTO, CAPITÁN ${playerName.toUpperCase()}! (+1 Millas Navales)`;
        } else {
            playSFX('wrong');
            feedback.style.color = '#e74c3c';
            feedback.innerText = `🌊 ¡GALEÓN ENCALLADO! Las coordenadas correctas eran: ${correctAnswer}`;
        }
    } else {
        const teamName = currentTurn === 1 ? team1Name : team2Name;
        if (isCorrect) {
            playSFX('correct'); feedback.style.color = '#2ecc71';
            feedback.innerText = `💥 ¡RÁFAGA DE CAÑÓN EXITOSA DE ${teamName}! (+1 Punto)`;
            if (currentTurn === 1) scoreTeam1++; else scoreTeam2++;
        } else {
            playSFX('wrong'); feedback.style.color = '#e74c3c';
            feedback.innerText = `💨 DISPARO FALLIDO DE ${teamName}. La respuesta era ${correctAnswer}`;
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
    const label = currentActiveServer.toUpperCase();

    if (gameMode === 'solitario') {
        abortBtn.innerText = "🏁 Regresar al Puerto";
        container.innerHTML = `
            <div class="team-score active-team">🏴‍☠️ CAPITÁN: ${playerName}</div>
            <div id="round-info">ISLA: ${label}</div>
            <div class="team-score">💰 ACIERTOS: ${soloCorrect} de ${soloTotal} (♾️ Libre)</div>
        `;
    } else {
        abortBtn.innerText = "🏁 Abortar Batalla";
        container.innerHTML = `
            <div class="team-score ${currentTurn === 1 ? 'active-team' : ''}">${team1Name}: ${scoreTeam1} pts</div>
            <div id="round-info">DISPARO: ${currentRound} / ${maxRounds} (${label})</div>
            <div class="team-score ${currentTurn === 2 ? 'active-team' : ''}">${team2Name}: ${scoreTeam2} pts</div>
        `;
    }
}

function confirmEndGame() {
    const msg = gameMode === 'solitario' 
        ? "¿Deseas atracar en el puerto y cerrar tu bitácora de navegación?" 
        : "¿Estás seguro de que deseas abortar la batalla naval?";
    if (confirm(msg)) endGame();
}

// 5. REPORTE FINAL DE BITÁCORA
async function endGame() {
    const resultsTitle = document.getElementById('results-title');
    const winnerMessage = document.getElementById('winner-message');
    const finalScores = document.getElementById('final-scores');

    if (gameMode === 'solitario') {
        resultsTitle.innerText = "📜 BITÁCORA OFICIAL DE EXPEDICIÓN 📜";
        winnerMessage.innerText = `¡Expedición Concluida, Capitán ${playerName}!`;
        const accuracy = soloTotal > 0 ? Math.round((soloCorrect / soloTotal) * 100) : 0;

        let reportHTML = `
            <div style="background: rgba(212, 175, 55, 0.05); padding: 18px; border-radius: 8px; border: 1px dashed #d4af37; text-align: left; max-width: 480px; margin: 0 auto;">
                <p><strong>Navegante / Capitán:</strong> ${playerName}</p>
                <p><strong>Isla Explorada:</strong> ${selectedServer === 'root' ? 'EL CALAMAR REAL (Prueba del Capitán)' : selectedServer.toUpperCase()}</p>
                <p><strong>Rango Naval:</strong> Rango ${difficultyLevel}</p>
                <hr style="border: 0; border-top: 1px dashed #d4af37; margin: 10px 0;">
                <p><strong>Coordenadas Calculadas:</strong> ${soloTotal}</p>
                <p><strong>Aciertos Logrados:</strong> ${soloCorrect}</p>
                <p><strong>Efectividad Naviera:</strong> <span style="color:#2ecc71; font-weight:bold;">${accuracy}%</span></p>
        `;

        if (selectedServer === 'root') {
            reportHTML += `<hr style="border: 0; border-top: 1px dashed #d4af37; margin: 10px 0;">
                <p style="font-weight: bold; color: #f39c12; text-align: center;">📊 Desglose por Islas del Archipiélago:</p>`;
            for (let k in serverStats) {
                const s = serverStats[k];
                const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                reportHTML += `<p>• <strong>${s.name}:</strong> ${s.correct}/${s.total} (${acc}%)</p>`;
            }
        }

        reportHTML += `</div><p style="font-size: 0.95rem; color: #d1d5db; margin-top: 15px;">📷 <em>Captura esta pantalla para evidenciar tu travesía.</em></p>`;
        finalScores.innerHTML = reportHTML;

        if (soloTotal > 0) {
            try {
                await saveScore({
                    gameId: 'navegantes',
                    gameTitle: 'Navegantes del Abismo',
                    studentName: playerName,
                    mode: `${selectedServer}_${difficultyLevel}_${questionType}`,
                    score: soloCorrect,
                    effectiveness: accuracy,
                    details: `Isla: ${selectedServer.toUpperCase()} | Rango: ${difficultyLevel} | Catalejo: ${questionType}`
                });
            } catch (err) { console.error("Error al guardar en Firestore:", err); }
        }
    } else {
        resultsTitle.innerText = "🏆 BATALLA NAVAL FINALIZADA 🏆";
        winnerMessage.innerText = scoreTeam1 > scoreTeam2 ? `🏆 ¡Galeón Victorioso: ${team1Name}! 🏆` :
                                 scoreTeam2 > scoreTeam1 ? `🏆 ¡Galeón Victorioso: ${team2Name}! 🏆` :
                                 "🤝 ¡Empate Marítimo Perfecto! 🤝";
        finalScores.innerHTML = `<p><strong>${team1Name}:</strong> ${scoreTeam1} pts</p><p><strong>${team2Name}:</strong> ${scoreTeam2} pts</p>`;
    }
    showScreen('screen-results');
    playSFX('victory');
}

function resetToServerSelection() { showScreen('screen-server'); }

// 6. LEADERBOARD / BITÁCORA NAVAL CON FIRESTORE
let currentLeaderboardServer = 'isla1'; 
let currentLeaderboardLevel = '1';
let currentLeaderboardType = 'multiple';

async function switchLeaderboardMode(server) {
    currentLeaderboardServer = String(server).toLowerCase();
    ['isla1', 'isla2', 'isla3', 'root'].forEach(s => {
        const btn = document.getElementById(`btn-tab-${s}`);
        if (btn) btn.classList.toggle('active', currentLeaderboardServer === s);
    });
    await loadLeaderboard();
}

async function onLeaderboardLevelChange() {
    currentLeaderboardLevel = document.getElementById('leaderboard-level-select').value;
    await loadLeaderboard();
}

async function onLeaderboardTypeChange() {
    currentLeaderboardType = document.getElementById('leaderboard-type-select').value;
    await loadLeaderboard();
}

async function openLeaderboardModal() {
    document.getElementById('modal-leaderboard').classList.remove('hidden');
    await loadLeaderboard();
}

function closeLeaderboardModal() { document.getElementById('modal-leaderboard').classList.add('hidden'); }

async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;
    tbody.innerHTML = '<tr><td colspan="4">Consultando la bitácora del mar...</td></tr>';
    const combinedMode = `${currentLeaderboardServer}_${currentLeaderboardLevel}_${currentLeaderboardType}`;

    try {
        const scores = await getTopScores('navegantes', combinedMode, 10);
        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">Sin récords registrados en ${currentLeaderboardServer.toUpperCase()} (Rango ${currentLeaderboardLevel}). ¡Sé el primer Capitán!</td></tr>`;
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
        tbody.innerHTML = '<tr><td colspan="4">No se pudo obtener la bitácora naval.</td></tr>';
    }
}

// 7. EXPOSICIÓN GLOBAL
window.showScreen = showScreen;
window.selectServer = selectServer;
window.selectDifficulty = selectDifficulty;
window.selectGameMode = selectGameMode;
window.startSoloGame = startSoloGame;
window.startGame = startGame;
window.checkAnswer = checkAnswer;
window.checkDirectAnswer = checkDirectAnswer;
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
// Exposición global
window.checkSequenceAnswer = checkSequenceAnswer;
window.moveSequence = moveSequence;