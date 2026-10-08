import { saveScore, getTopScores } from './leaderboard.js';

// ==========================================
// 1. SISTEMA DE AUDIO Y SONIDOS
// ==========================================
const sounds = {
    bg: new Audio('audio/hackers/bg-music.mp3'),
    correct: new Audio('audio/hackers/correct.mp3'),
    wrong: new Audio('audio/hackers/wrong.mp3'),
    click: new Audio('audio/hackers/click.mp3'),
    victory: new Audio('audio/hackers/victory.mp3')
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
let selectedServer = 'servidor1'; // 'servidor1', 'servidor2', 'servidor3', 'root'
let currentActiveServer = 'servidor1';
let difficultyLevel = 1; // 1: Novato, 2: Analista, 3: Elite

let gameMode = 'solitario'; // 'solitario' o 'equipos'
let playerName = "Agente Hacker";
let team1Name = "CyberPhantom";
let team2Name = "NetGuardians";

// Puntajes y métricas
let scoreTeam1 = 0;
let scoreTeam2 = 0;
let soloCorrect = 0;
let soloTotal = 0;

// Desglose por servidor para reporte individual (Modo Root)
let serverStats = {
    servidor1: { correct: 0, total: 0, name: "Servidor 1: Clasificación y Enteros" },
    servidor2: { correct: 0, total: 0, name: "Servidor 2: Propiedades y Signos" },
    servidor3: { correct: 0, total: 0, name: "Servidor 3: Factorización, MCD y mcm" }
};

let currentTurn = 1; 
let currentRound = 1;
let maxRounds = 10;
let correctAnswer = "";
let questionType = 'mixed';
let currentQuestionMode = 'multiple';

// Variables para Minijuego de Cables (Servidor 2)
let activeSelectedNode = null;
let activeConnections = [];

const screenCover = document.getElementById('screen-cover');

function startFromCover() {
    if (screenCover && !screenCover.classList.contains('hidden')) {
        showScreen('screen-story');
    }
}

function acceptMission() {
    showScreen('screen-server');
}

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {

        const storyScreen = document.getElementById('screen-story');

        // PORTADA → HISTORIA
        if (screenCover && !screenCover.classList.contains('hidden')) {
            startFromCover();
            return;
        }

        // HISTORIA → SELECCIÓN DE SERVIDOR
        if (storyScreen && !storyScreen.classList.contains('hidden')) {
            acceptMission();
            return;
        }

        // RESPUESTA DIRECTA DURANTE EL JUEGO
        const directContainer = document.getElementById('direct-input-container');

        if (directContainer && !directContainer.classList.contains('hidden')) {
            const submitBtn = document.getElementById('btn-submit-answer');

            if (submitBtn && !submitBtn.disabled) {
                checkDirectAnswer();
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

// Iniciar Juego en Solitario
function startSoloGame(event) {
    event.preventDefault();

    const nameInput = document.getElementById('player-name').value.trim();
    if (!nameInput) {
        alert("Por favor ingresa tu nombre de Agente para el registro de auditoría.");
        return;
    }

    playerName = nameInput;
    questionType = document.getElementById('question-type-solo').value;

    resetStats();
    showScreen('screen-game');
    loadNextQuestion();
}

// Iniciar Juego en Competencia
function startGame(event) {
    event.preventDefault();

    const t1 = document.getElementById('team1-name').value.trim();
    const t2 = document.getElementById('team2-name').value.trim();

    if (!t1 || !t2) {
        alert("Ingresa un nombre válido para ambos escuadrones.");
        return;
    }

    if (t1.toLowerCase() === t2.toLowerCase()) {
        alert("Los nombres de los escuadrones no pueden ser iguales.");
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
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==========================================
// 3. GENERADOR DINÁMICO DE RETOS CIBERNÉTICOS
// ==========================================

function loadNextQuestion() {
    if (gameMode === 'equipos' && (currentRound - 1) >= maxRounds) {
        endGame();
        return;
    }

    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('feedback').innerText = '';

    // Determinar servidor activo
    if (selectedServer === 'root') {
        const servers = ['servidor1', 'servidor2', 'servidor3'];
        currentActiveServer = servers[Math.floor(Math.random() * servers.length)];
    } else {
        currentActiveServer = selectedServer;
    }

    // Generar el enigma según el servidor activo
    let challengeData;
    if (currentActiveServer === 'servidor1') {
        challengeData = generateServer1Challenge();
    } else if (currentActiveServer === 'servidor2') {
        challengeData = generateServer2Challenge();
    } else {
        challengeData = generateServer3Challenge();
    }

    // Dentro de loadNextQuestion():
    const optionsContainer = document.getElementById('options-container');
    const directContainer = document.getElementById('direct-input-container');
    const cableContainer = document.getElementById('cable-game-container');
    const treeContainer = document.getElementById('tree-game-container'); // NEW
    const hackDisplay = document.getElementById('hack-display');

    // Ocultar todos por defecto
    if (optionsContainer) optionsContainer.classList.add('hidden');
    if (directContainer) directContainer.classList.add('hidden');
    if (cableContainer) cableContainer.classList.add('hidden');
    if (treeContainer) treeContainer.classList.add('hidden'); // NEW

    document.getElementById('challenge-instruction').innerText = challengeData.instruction;

    // --- MODO CABLES (SERVIDOR 2) ---
    if (challengeData.isCableGame) {
        if (hackDisplay) hackDisplay.classList.add('hidden');
        if (cableContainer) cableContainer.classList.remove('hidden');
        
        initCableGameCustom(challengeData.pairs);
        updateUI();
        return;
    }

    // --- MODO ÁRBOL PRIMO (SERVIDOR 3) ---
    if (challengeData.isTreeGame) {
        if (hackDisplay) hackDisplay.classList.add('hidden');
        if (treeContainer) treeContainer.classList.remove('hidden');
        initTreeGame(challengeData.treeData);
        updateUI();
        return;
    }

    // --- OTROS MODOS (HABILITAR RECUADRO HACK DISPLAY) ---
    if (challengeData.isInteractiveMatrix) {
        hackDisplay.classList.add('hidden');
    } else {
        hackDisplay.classList.remove('hidden');
        hackDisplay.innerHTML = `<div style="font-size: 1.8rem; color: #00f0ff; letter-spacing: 2px;">${challengeData.display}</div>`;
    }

    correctAnswer = challengeData.correct;

    // Configurar Tipo de Reactivo
    if (challengeData.forceDirect) {
        currentQuestionMode = 'direct';
    } else if (questionType === 'mixed') {
        currentQuestionMode = Math.random() < 0.5 ? 'multiple' : 'direct';
    } else {
        currentQuestionMode = questionType;
    }

    if (challengeData.isInteractiveMatrix) {
        optionsContainer.classList.remove('hidden');
        optionsContainer.classList.add('matrix-active');

        optionsContainer.innerHTML = `
            <div class="matrix-container">
                <div style="margin-bottom: 20px; display: flex; justify-content: center; width: 100%;">
                    <div id="drag-capsule" class="draggable-capsule" draggable="true">
                        [ ${challengeData.targetVal} ]
                    </div>
                </div>

                <div class="ports-grid">
                    <div class="port-target" data-category="Enteros">
                        <h4>🔌 [ ENTEROS ]</h4>
                        <span>... -2, -1, 0, 1 ...</span>
                    </div>

                    <div class="port-target" data-category="Racionales">
                        <h4>🛡️ [ RACIONALES ]</h4>
                        <span>Fracciones / Decimales</span>
                    </div>

                    <div class="port-target" data-category="Irracionales">
                        <h4>🔐 [ IRRACIONALES ]</h4>
                        <span>Raíces, π, e</span>
                    </div>
                </div>
            </div>
        `;

        setupMatrixDragAndDrop();
    } else {
        optionsContainer.classList.remove('matrix-active');
        
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

    updateUI();
}

// --- SERVIDOR 1: Clasificación Dinámica por Cápsulas y Operaciones ---
function generateServer1Challenge() {
    const isMatrixType = Math.random() < 0.6;

    if (isMatrixType) {
        const numbersPool = [
            { val: '-8', cat: 'Enteros' },
            { val: '15', cat: 'Enteros' },
            { val: '3/4', cat: 'Racionales' },
            { val: '-0.25', cat: 'Racionales' },
            { val: 'π', cat: 'Irracionales' },
            { val: '11/16', cat: 'Racionales' },
            { val: '√2', cat: 'Irracionales' },
            { val: '0', cat: 'Enteros' },
            { val: '-5/2', cat: 'Racionales' },
            { val: '15', cat: 'Enteros' },
            { val: '-4/7', cat: 'Racionales' },
            { val: '√9', cat: 'Irracionales' },
            { val: '1.38', cat: 'Racionales' },
            { val: '-43', cat: 'Enteros' },
            { val: '9.81', cat: 'Racionales' },
            { val: '-54', cat: 'Enteros' },
            { val: '9/17', cat: 'Racionales' },
            { val: '-0.5', cat: 'Racionales' },
            { val: '√17', cat: 'Irracionales' },
            { val: 'e', cat: 'Irracionales' }
        ];

        const targetObj = numbersPool[Math.floor(Math.random() * numbersPool.length)];

        return {
            instruction: `📡 PUERTO DE RED: Selecciona la cápsula de datos [ ${targetObj.val} ] y deposítala en su contenedor de clasificación correspondiente:`,
            display: `<div style="font-size: 2.2rem; color: #00ff66; font-weight: bold;">[ ${targetObj.val} ]</div>`,
            correct: targetObj.cat,
            options: ['Enteros', 'Racionales', 'Irracionales'],
            isInteractiveMatrix: true,
            targetVal: targetObj.val
        };
    } else {
        const a = (Math.floor(Math.random() * 10) + 1) * (Math.random() < 0.5 ? 1 : -1);
        const b = (Math.floor(Math.random() * 10) + 1) * (Math.random() < 0.5 ? 1 : -1);
        const op = Math.random() < 0.5 ? '+' : '-';
        
        const ans = op === '+' ? (a + b) : (a - b);
        const exp = `(${a}) ${op} (${b})`;

        let options = new Set([ans.toString()]);
        while(options.size < 4) {
            let offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
            options.add((ans + offset).toString());
        }

        return {
            instruction: `💻 PROCESADOR DE MEMORIA: Resuelve la siguiente operación de enteros para estabilizar el sistema:`,
            display: `${exp} = ?`,
            correct: ans.toString(),
            options: shuffleArray(Array.from(options)),
            isInteractiveMatrix: false
        };
    }
}

// ==========================================
// DELEGACIÓN DRAG AND DROP REAL (SERVIDOR 1)
// ==========================================
function setupMatrixDragAndDrop() {
    const capsule = document.getElementById('drag-capsule');
    const ports = document.querySelectorAll('.port-target');

    if (!capsule) return;

    capsule.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', capsule.innerText.trim());
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => capsule.style.opacity = '0.4', 0);
    });

    capsule.addEventListener('dragend', () => {
        capsule.style.opacity = '1';
    });

    ports.forEach(port => {
        port.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            port.classList.add('drag-over');
        });

        port.addEventListener('dragenter', (e) => {
            e.preventDefault();
            port.classList.add('drag-over');
        });

        port.addEventListener('dragleave', () => {
            port.classList.remove('drag-over');
        });

        port.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            port.classList.remove('drag-over');

            const category = port.getAttribute('data-category');
            checkAnswer(category);
        });

        port.addEventListener('click', () => {
            const category = port.getAttribute('data-category');
            checkAnswer(category);
        });
    });
}

// --- SERVIDOR 2: Propiedades, Cables y Operaciones ---
function generateServer2Challenge() {
    const isCableType = Math.random() < 0.5; // 50% probabilidad de activar conexión de cables

    if (isCableType) {
        const cablePool = [
            // Opción 1: Propiedades Aritméticas Básicas
            [
                { id: 'p1', left: 'Propiedad Conmutativa', right: 'a + b = b + a' },
                { id: 'p2', left: 'Propiedad Asociativa', right: '(a · b) · c = a · (b · c)' },
                { id: 'p3', left: 'Elemento Neutro (Suma)', right: 'a + 0 = a' },
                { id: 'p4', left: 'Propiedad Distributiva', right: 'a · (b + c) = a·b + a·c' }
            ],
            // Opción 2: Leyes de los Signos / Operaciones
            [
                { id: 'p1', left: 'Positivo × Positivo', right: '(+) · (+) = +' },
                { id: 'p2', left: 'Positivo × Negativo', right: '(+) · (-) = -' },
                { id: 'p3', left: 'Negativo × Negativo', right: '(-) · (-) = +' },
                { id: 'p4', left: 'Inverso Aditivo', right: 'a + (-a) = 0' }
            ],
            // Opción 3: Leyes de Exponentes Básicas
            [
                { id: 'p1', left: 'Producto de igual base', right: 'aᵐ · aⁿ = aᵐ⁺ⁿ' },
                { id: 'p2', left: 'Cociente de igual base', right: 'aᵐ / aⁿ = aᵐ⁻ⁿ' },
                { id: 'p3', left: 'Exponente Cero', right: 'a⁰ = 1' },
                { id: 'p4', left: 'Potencia de una potencia', right: '(aᵐ)ⁿ = aᵐ·ⁿ' }
            ],
            // Opción 4: Jerarquía de Operaciones y Estructura
            [
                { id: 'p1', left: 'Prioridad Máxima', right: 'Paréntesis y Corchetes' },
                { id: 'p2', left: 'Segunda Prioridad', right: 'Potencias y Raíces' },
                { id: 'p3', left: 'Tercera Prioridad', right: 'Multiplicación y División' },
                { id: 'p4', left: 'Última Prioridad', right: 'Suma y Resta' }
            ],
            // Opción 5: Elementos y Propiedades Especiales
            [
                { id: 'p1', left: 'Elemento Neutro (Multiplicación)', right: 'a · 1 = a' },
                { id: 'p2', left: 'Elemento Absorbente', right: 'a · 0 = 0' },
                { id: 'p3', left: 'Inverso Multiplicativo', right: 'a · (1/a) = 1' },
                { id: 'p4', left: 'Conmutativa (Producto)', right: 'a · b = b · a' }
            ]
        ];

        // Seleccionar una plantilla al azar de la lista
        const selectedPairs = cablePool[Math.floor(Math.random() * cablePool.length)];

        return {
            instruction: `⚡ SERVIDOR 2: Reestablece las líneas de comunicación enlazando cada regla con su concepto correspondiente:`,
            isCableGame: true,
            pairs: selectedPairs
        };
    } else {
        const types = ['propiedad', 'inverso_aditivo', 'inverso_mult'];
        const chosen = types[Math.floor(Math.random() * types.length)];

        if (chosen === 'propiedad') {
            const props = [
                { name: 'Conmutativa', exp: 'a + b = b + a' },
                { name: 'Distributiva', exp: 'a · (b + c) = a·b + a·c' },
                { name: 'Asociativa', exp: '(a + b) + c = a + (b + c)' }
            ];
            const item = props[Math.floor(Math.random() * props.length)];
            let options = shuffleArray(['Conmutativa', 'Distributiva', 'Asociativa', 'Cerradura']);

            return {
                instruction: `🔓 DECODIFICADOR: Identifica la propiedad aritmética expresada en la siguiente regla de código:`,
                display: `${item.exp}`,
                correct: item.name,
                options: options,
                forceDirect: false,
                isCableGame: false
            };
        } else if (chosen === 'inverso_aditivo') {
            const val = (Math.floor(Math.random() * 20) + 1) * (Math.random() < 0.5 ? 1 : -1);
            const ans = (-val).toString();

            let options = new Set([ans]);
            while(options.size < 4) {
                let offset = (Math.floor(Math.random() * 6) + 1) * (Math.random() < 0.5 ? 1 : -1);
                options.add(((-val) + offset).toString());
            }

            return {
                instruction: `⚡ ANULADOR DE ENERGÍA: Encuentra el INVERSO ADITIVO para neutralizar la carga a 0:`,
                display: `Carga Actual: [ ${val} ]`,
                correct: ans,
                options: shuffleArray(Array.from(options)),
                isCableGame: false
            };
        } else {
            const val = Math.floor(Math.random() * 8) + 2;
            const ans = `1/${val}`;

            let options = shuffleArray([ans, `-${val}`, `1`, `0`]);

            return {
                instruction: `🧪 MODULADOR DE FACTOR: Selecciona el INVERSO MULTIPLICATIVO para escalar la señal a 1:`,
                display: `Factor de red: [ ${val} ]`,
                correct: ans,
                options: options,
                forceDirect: false,
                isCableGame: false
            };
        }
    }
}

// ==========================================
// FASE 2: LÓGICA DE CONEXIÓN DE CABLES (SERVIDOR 2)
// ==========================================

function initCableGameCustom(pairsData) {
    const leftCol = document.getElementById('cable-left-column');
    const rightCol = document.getElementById('cable-right-column');
    const svgCanvas = document.getElementById('cable-svg-canvas');

    if (!leftCol || !rightCol || !svgCanvas) return;

    leftCol.innerHTML = '';
    rightCol.innerHTML = '';
    svgCanvas.innerHTML = '';
    activeConnections = [];
    activeSelectedNode = null;

    const leftItems = [...pairsData].sort(() => Math.random() - 0.5);
    const rightItems = [...pairsData].sort(() => Math.random() - 0.5);

    leftItems.forEach(item => {
        const node = document.createElement('div');
        node.className = 'cable-node';
        node.dataset.id = item.id;
        node.dataset.side = 'left';
        node.innerText = item.left;
        node.onclick = (e) => handleCableNodeClick(e.currentTarget);
        leftCol.appendChild(node);
    });

    rightItems.forEach(item => {
        const node = document.createElement('div');
        node.className = 'cable-node';
        node.dataset.id = item.id;
        node.dataset.side = 'right';
        node.innerText = item.right;
        node.onclick = (e) => handleCableNodeClick(e.currentTarget);
        rightCol.appendChild(node);
    });
}

function handleCableNodeClick(node) {
    if (node.classList.contains('matched')) return;

    if (!activeSelectedNode) {
        activeSelectedNode = node;
        node.classList.add('selected');
        return;
    }

    if (activeSelectedNode === node) {
        node.classList.remove('selected');
        activeSelectedNode = null;
        return;
    }

    if (activeSelectedNode.dataset.side === node.dataset.side) {
        activeSelectedNode.classList.remove('selected');
        activeSelectedNode = node;
        node.classList.add('selected');
        return;
    }

    const leftNode = activeSelectedNode.dataset.side === 'left' ? activeSelectedNode : node;
    const rightNode = activeSelectedNode.dataset.side === 'right' ? activeSelectedNode : node;

    const isCorrect = leftNode.dataset.id === rightNode.dataset.id;

    if (isCorrect) {
        playSFX('correct');
        drawSvgLine(leftNode, rightNode, true);
        leftNode.classList.remove('selected');
        rightNode.classList.remove('selected');
        leftNode.classList.add('matched');
        rightNode.classList.add('matched');
        
        activeSelectedNode = null;
        checkCableVictory();
    } else {
        playSFX('wrong');
        const tempLine = drawSvgLine(leftNode, rightNode, false);
        leftNode.classList.remove('selected');
        activeSelectedNode = null;

        setTimeout(() => {
            if (tempLine) tempLine.remove();
        }, 600);
    }
}

function drawSvgLine(nodeA, nodeB, isCorrect) {
    const svgCanvas = document.getElementById('cable-svg-canvas');
    const container = document.getElementById('cable-game-container');
    if (!svgCanvas || !container) return null;

    const containerRect = container.getBoundingClientRect();
    const rectA = nodeA.getBoundingClientRect();
    const rectB = nodeB.getBoundingClientRect();

    const x1 = (rectA.right - containerRect.left);
    const y1 = (rectA.top + rectA.height / 2) - containerRect.top;
    const x2 = (rectB.left - containerRect.left);
    const y2 = (rectB.top + rectB.height / 2) - containerRect.top;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('class', `cable-line ${isCorrect ? 'correct' : 'pending'}`);

    svgCanvas.appendChild(line);
    return line;
}

function checkCableVictory() {
    const totalMatched = document.querySelectorAll('.cable-node.matched').length;
    const totalNodes = document.querySelectorAll('.cable-node').length;

    if (totalMatched === totalNodes && totalNodes > 0) {
        setTimeout(() => {
            processResult(true);
        }, 500);
    }
}

// --- SERVIDOR 3: Factorización Prima, MCD y mcm ---
function generateServer3Challenge() {

    const isTreeType = Math.random() < 0.4;

    if (isTreeType) {
        const treePool = [
            // Raíces pequeñas a medianas
            { root: 12, left: 2, right: 6, rightLeft: 2, rightRight: 3 }, // 2*6=12, 2*3=6
            { root: 18, left: 2, right: 9, rightLeft: 3, rightRight: 3 }, // 2*9=18, 3*3=9
            { root: 20, left: 2, right: 10, rightLeft: 2, rightRight: 5 }, // 2*10=20, 2*5=10
            { root: 24, left: 3, right: 8, rightLeft: 2, rightRight: 4 }, // 3*8=24, 2*4=8
            { root: 28, left: 7, right: 4, rightLeft: 2, rightRight: 2 }, // 7*4=28, 2*2=4
            { root: 30, left: 3, right: 10, rightLeft: 2, rightRight: 5 }, // 3*10=30, 2*5=10
            { root: 32, left: 2, right: 16, rightLeft: 4, rightRight: 4 }, // 2*16=32, 4*4=16
            { root: 36, left: 4, right: 9, rightLeft: 3, rightRight: 3 }, // 4*9=36, 3*3=9
            { root: 40, left: 5, right: 8, rightLeft: 2, rightRight: 4 }, // 5*8=40, 2*4=8
            { root: 42, left: 7, right: 6, rightLeft: 2, rightRight: 3 }, // 7*6=42, 2*3=6
            
            // Raíces más altas (hasta 60)
            { root: 44, left: 11, right: 4, rightLeft: 2, rightRight: 2 }, // 11*4=44, 2*2=4
            { root: 45, left: 5, right: 9, rightLeft: 3, rightRight: 3 }, // 5*9=45, 3*3=9
            { root: 48, left: 3, right: 16, rightLeft: 4, rightRight: 4 }, // 3*16=48, 4*4=16
            { root: 50, left: 2, right: 25, rightLeft: 5, rightRight: 5 }, // 2*25=50, 5*5=25
            { root: 52, left: 13, right: 4, rightLeft: 2, rightRight: 2 }, // 13*4=52, 2*2=4
            { root: 54, left: 2, right: 27, rightLeft: 3, rightRight: 9 }, // 2*27=54, 3*9=27
            { root: 56, left: 7, right: 8, rightLeft: 2, rightRight: 4 }, // 7*8=56, 2*4=8
            { root: 60, left: 5, right: 12, rightLeft: 3, rightRight: 4 }, // 5*12=60, 3*4=12
            { root: 60, left: 6, right: 10, rightLeft: 2, rightRight: 5 }, // Opción alternativa para 60: 6*10=60, 2*5=10
            { root: 50, left: 5, right: 10, rightLeft: 2, rightRight: 5 }  // Opción alternativa para 50: 5*10=50, 2*5=10
        ];

        const selectedTree = treePool[Math.floor(Math.random() * treePool.length)];

        return {
            instruction: `🧩 DESCOMPOSICIÓN CORE: Completa los valores faltantes en las ramificaciones de factores primos:`,
            isTreeGame: true,
            treeData: selectedTree,
            correctAnswer: selectedTree.right // Muestra 8 en el mensaje de error en lugar de 12
        };
    }

    const types = ['factor', 'mcd', 'mcm'];
    const chosen = types[Math.floor(Math.random() * types.length)];

    function getMCD2(a, b) { return b === 0 ? a : getMCD2(b, a % b); }
    function getMCD3(a, b, c) { return getMCD2(getMCD2(a, b), c); }

    function getMCM2(a, b) { return (a * b) / getMCD2(a, b); }
    function getMCM3(a, b, c) { return getMCM2(getMCM2(a, b), c); }

    if (chosen === 'mcd') {
        const useThreeNumbers = Math.random() < 0.5;

        let n1 = (Math.floor(Math.random() * 5) + 2) * 4;
        let n2;
        do {
            n2 = (Math.floor(Math.random() * 5) + 2) * 6;
        } while (n2 === n1);

        let ans = 0;
        let displayStr = "";

        if (useThreeNumbers) {
            let n3;
            do {
                n3 = (Math.floor(Math.random() * 5) + 2) * 3;
            } while (n3 === n1 || n3 === n2);

            ans = getMCD3(n1, n2, n3).toString();
            displayStr = `MCD( ${n1}, ${n2}, ${n3} ) = ?`;
        } else {
            ans = getMCD2(n1, n2).toString();
            displayStr = `MCD( ${n1}, ${n2} ) = ?`;
        }

        let options = new Set([ans]);
        while (options.size < 4) {
            let offset = (Math.floor(Math.random() * 3) + 1) * 2;
            let fake = Math.abs(parseInt(ans) + (Math.random() < 0.5 ? offset : -offset));
            if (fake > 0) options.add(fake.toString());
        }

        return {
            instruction: `🔐 CLAVE CRYPTO: Calcula el Máximo Común Divisor (MCD) para fragmentar los datos en bloques iguales:`,
            display: displayStr,
            correct: ans,
            options: shuffleArray(Array.from(options))
        };

    } else if (chosen === 'mcm') {
        const useThreeNumbers = Math.random() < 0.5;

        let n1 = Math.floor(Math.random() * 5) + 3;
        let n2;
        do {
            n2 = Math.floor(Math.random() * 5) + 4;
        } while (n2 === n1);

        let ans = 0;
        let displayStr = "";

        if (useThreeNumbers) {
            let n3;
            do {
                n3 = Math.floor(Math.random() * 5) + 2;
            } while (n3 === n1 || n3 === n2);

            ans = getMCM3(n1, n2, n3).toString();
            displayStr = `mcm( ${n1}, ${n2}, ${n3} ) = ?`;
        } else {
            ans = getMCM2(n1, n2).toString();
            displayStr = `mcm( ${n1}, ${n2} ) = ?`;
        }

        let options = new Set([ans]);
        while (options.size < 4) {
            let fake = parseInt(ans) + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 2 : -2);
            if (fake > 0) options.add(fake.toString());
        }

        return {
            instruction: `📡 SINCRONIZADOR DE FRECUENCIA: Calcula el Mínimo Común Múltiplo (mcm) para hacer coincidir las señales:`,
            display: displayStr,
            correct: ans,
            options: shuffleArray(Array.from(options))
        };

    } else {
        const primos = [2, 3, 5, 7];
        const p1 = primos[Math.floor(Math.random() * primos.length)];
        let p2;
        do {
            p2 = primos[Math.floor(Math.random() * primos.length)];
        } while (p2 === p1);

        const num = p1 * p2;
        const ans = [p1, p2].sort((a, b) => a - b).join(' x ');

        let options = shuffleArray([
            ans,
            `${p1} x ${p2 + 1}`,
            `${num} x 1`,
            `${p1 + 1} x ${p2}`
        ]);

        return {
            instruction: `🧩 DESCOMPOSICIÓN CORE: Selecciona la factorización en factores primos del módulo de cifrado:`,
            display: `Clave: [ ${num} ]`,
            correct: ans,
            options: options,
            forceDirect: false
        };
    }
}

let currentTreeAnswer = {};

function initTreeGame(treeData) {
    const canvas = document.getElementById('tree-canvas');
    if (!canvas) return;

    currentTreeAnswer = treeData;

    // Renderizar estructura con IDs para medir coordenadas
    canvas.innerHTML = `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center; gap: 35px; padding: 10px 0;">
            <!-- Lienzo SVG para trazar líneas exactas -->
            <svg id="tree-svg-canvas" style="position: absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:1;"></svg>

            <!-- Nivel 1: Raíz -->
            <div class="tree-level" style="z-index: 2;">
                <div id="tn-root" class="tree-node">${treeData.root}</div>
            </div>
            
            <!-- Nivel 2: Ramas Principales -->
            <div class="tree-level" style="z-index: 2; gap: 50px;">
                <div id="tn-left" class="tree-node prime">${treeData.left}</div>
                <input type="number" id="tree-input-right" class="tree-input" placeholder="?" />
            </div>

            <!-- Nivel 3: Sub-Ramas -->
            <div class="tree-level" style="z-index: 2; margin-left: 110px; gap: 50px;">
                <input type="number" id="tree-input-rl" class="tree-input" placeholder="?" />
                <div id="tn-rr" class="tree-node prime">${treeData.rightRight}</div>
            </div>
        </div>

        <button id="btn-verify-tree" class="cyber-button" style="margin-top: 20px;" onclick="checkTreeAnswer()">Verificar Factores</button>
    `;

    // Esperar un ciclo para medir posiciones físicas de los nodos en pantalla
    setTimeout(() => {
        drawTreeBranch('tn-root', 'tn-left');
        drawTreeBranch('tn-root', 'tree-input-right');
        drawTreeBranch('tree-input-right', 'tree-input-rl');
        drawTreeBranch('tree-input-right', 'tn-rr');
    }, 50);
}

// Función auxiliar para dibujar cada rama del árbol
function drawTreeBranch(idA, idB) {
    const elA = document.getElementById(idA);
    const elB = document.getElementById(idB);
    const svg = document.getElementById('tree-svg-canvas');

    if (!elA || !elB || !svg) return;

    const rectContainer = svg.getBoundingClientRect();
    const rectA = elA.getBoundingClientRect();
    const rectB = elB.getBoundingClientRect();

    // Calcular centros X, Y
    const x1 = (rectA.left + rectA.width / 2) - rectContainer.left;
    const y1 = (rectA.top + rectA.height / 2) - rectContainer.top;
    const x2 = (rectB.left + rectB.width / 2) - rectContainer.left;
    const y2 = (rectB.top + rectB.height / 2) - rectContainer.top;

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1);
    line.setAttribute('y1', y1);
    line.setAttribute('x2', x2);
    line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#00f0ff');
    line.setAttribute('stroke-width', '2');
    line.setAttribute('stroke-dasharray', '4'); // Estilo punteado cibernético
    line.setAttribute('style', 'filter: drop-shadow(0 0 5px #00f0ff);');

    svg.appendChild(line);
}

function checkTreeAnswer() {
    const btn = document.getElementById('btn-verify-tree');
    
    // Deshabilitar botón para evitar reenvíos
    if (btn) {
        btn.disabled = true;
        btn.style.opacity = '0.5';
        btn.style.cursor = 'not-allowed';
    }

    const valRight = parseInt(document.getElementById('tree-input-right').value, 10);
    const valRL = parseInt(document.getElementById('tree-input-rl').value, 10);

    const isCorrect = (valRight === currentTreeAnswer.right && valRL === currentTreeAnswer.rightLeft);

    processResult(isCorrect);
}

// Exponer a window
window.checkTreeAnswer = checkTreeAnswer;


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
            feedback.innerText = `¡ACCESO CONCEDIDO, AGENTE ${playerName.toUpperCase()}! ⚡ (+1 Hackeo)`;
        } else {
            playSFX('wrong');
            feedback.style.color = '#ff0055';
            feedback.innerText = `¡ALERTA DE SEGURIDAD! Respuesta incorrecta. Clave válida: ${correctAnswer}`;
        }
    } else {
        const activeTeamName = currentTurn === 1 ? team1Name : team2Name;
        if (isCorrect) {
            playSFX('correct');
            feedback.style.color = '#00ff66';
            feedback.innerText = `¡Infiltración exitosa de ${activeTeamName}! (+1 Punto)`;
            if (currentTurn === 1) scoreTeam1++;
            else scoreTeam2++;
        } else {
            playSFX('wrong');
            feedback.style.color = '#ff0055';
            feedback.innerText = `Acceso denegado a ${activeTeamName}. La clave era ${correctAnswer}`;
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
        abortBtn.innerText = "🏁 Finalizar Misión";
        container.innerHTML = `
            <div class="team-score active-team">👤 AGENTE: ${playerName}</div>
            <div id="round-info">NODO: ${serverLabel}</div>
            <div class="team-score">🎯 ÉXITO: ${soloCorrect} / ${soloTotal}</div>
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
        ? "¿Deseas finalizar la sesión de infiltración y generar tu reporte de auditoría?" 
        : "¿Estás seguro de que deseas abortar el duelo actual?";

    if (confirm(msg)) endGame();
}

// ==========================================
// 5. REPORTE FINAL DE AUDITORÍA
// ==========================================

async function endGame() {
    const resultsTitle = document.getElementById('results-title');
    const winnerMessage = document.getElementById('winner-message');
    const finalScores = document.getElementById('final-scores');

    if (gameMode === 'solitario') {
        resultsTitle.innerText = "📋 REPORTE DE AUDITORÍA CIBERNÉTICA 📋";
        winnerMessage.innerText = `¡Misión Finalizada, Agente ${playerName}!`;

        const accuracy = soloTotal > 0 ? Math.round((soloCorrect / soloTotal) * 100) : 0;

        let reportHTML = `
            <div style="background: rgba(0, 240, 255, 0.05); padding: 18px; border-radius: 8px; border: 1px dashed #00f0ff; text-align: left; max-width: 480px; margin: 0 auto; font-family: 'Consolas', monospace;">
                <p><strong>Agente Analista:</strong> ${playerName}</p>
                <p><strong>Modo Infiltración:</strong> ${selectedServer === 'root' ? 'MODO ROOT (Infiltración Total)' : selectedServer.toUpperCase()}</p>
                <p><strong>Cifrado / Dificultad:</strong> Nivel ${difficultyLevel}</p>
                <hr style="border: 0; border-top: 1px dashed #00f0ff; margin: 10px 0;">
                <p><strong>Enigmas Intentados:</strong> ${soloTotal}</p>
                <p><strong>Módulos Decodificados:</strong> ${soloCorrect}</p>
                <p><strong>Efectividad de Hackeo:</strong> <span style="color:#00ff66; font-weight:bold;">${accuracy}%</span></p>
        `;

        if (selectedServer === 'root') {
            reportHTML += `
                <hr style="border: 0; border-top: 1px dashed #00f0ff; margin: 10px 0;">
                <p style="font-weight: bold; color: #00f0ff; text-align: center;">📊 Desglose por Servidor Infiltrado:</p>
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
                📷 <em>Captura esta pantalla como evidencia oficial de tu práctica.</em>
            </p>
        `;

        finalScores.innerHTML = reportHTML;

        if (soloTotal > 0) {
            try {
                const modeKey = `${selectedServer}_${difficultyLevel}_${questionType}`;

                await saveScore({
                    gameId: 'hackers',
                    gameTitle: 'Operación Hackers',
                    studentName: playerName,
                    mode: modeKey,
                    score: soloCorrect,
                    effectiveness: accuracy,
                    details: `Servidor: ${selectedServer.toUpperCase()} | Nivel: ${difficultyLevel} | Tipo: ${questionType}`
                });
            } catch (err) {
                console.error("Error al guardar puntuación en Operación Hackers:", err);
            }
        }    

    } else {
        resultsTitle.innerText = "🏆 DUELO CIBERNÉTICO FINALIZADO 🏆";
        let winnerText = "";
        if (scoreTeam1 > scoreTeam2) winnerText = `🏆 ¡Escuadrón Ganador: ${team1Name}! 🏆`;
        else if (scoreTeam2 > scoreTeam1) winnerText = `🏆 ¡Escuadrón Ganador: ${team2Name}! 🏆`;
        else winnerText = "🤝 ¡Empate de Hackeo Perfecto! 🤝";

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
// 6. TABLA GLOBAL DE LÍDERES
// ==========================================
let currentLeaderboardServer = 'servidor1'; 
let currentLeaderboardLevel = '1';
let currentLeaderboardType = 'multiple';

async function switchLeaderboardMode(server) {
    currentLeaderboardServer = String(server).toLowerCase();

    ['servidor1', 'servidor2', 'servidor3', 'root'].forEach(s => {
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

    tbody.innerHTML = '<tr><td colspan="4">Cargando puntuaciones...</td></tr>';

    const combinedMode = `${currentLeaderboardServer}_${currentLeaderboardLevel}_${currentLeaderboardType}`;

    try {
        const scores = await getTopScores('hackers', combinedMode, 10);

        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">Sin récords en ${currentLeaderboardServer.toUpperCase()} (Nivel ${currentLeaderboardLevel}) - ${currentLeaderboardType}. ¡Sé el primero!</td></tr>`;
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
// 7. EXPOSICIÓN GLOBAL A WINDOW
// ==========================================
window.startFromCover = startFromCover;
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
window.acceptMission = acceptMission;