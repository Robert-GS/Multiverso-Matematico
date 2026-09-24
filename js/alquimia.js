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
    root.innerText = challengeData.rootValue;
    nodesContainer.appendChild(root);

    const branch = document.createElement('div');
    branch.className = 'tree-branch';

    for (let key in challengeData.expected) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'tree-node-input';
        input.dataset.nodeId = key;
        input.placeholder = '?';
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

    // Ordenar ambos arreglos de menor a mayor para ignorar el orden de ingreso
    userValues.sort((a, b) => a - b);
    expectedValues.sort((a, b) => a - b);

    // Comprobar si coinciden exactamente todos los factores
    let isCorrect = userValues.length === expectedValues.length &&
        userValues.every((val, index) => val === expectedValues[index]);

    correctAnswer = expectedValues.join(' × ');
    processResult(isCorrect);
}

// ------------------------------------------------------------------
// GENERADORES POR TOMO (INCLUYEN NUEVOS REACTIVOS)
// ------------------------------------------------------------------

function generateTomo1Challenge() {
    const rand = Math.random();

    if (rand < 0.35) {
        // REACTIVO DE BALANZA DE TRANSMUTACIÓN
        const targetVal = Math.floor(Math.random() * 8) + 2;
        const knownVal = Math.floor(Math.random() * (targetVal - 1)) + 1;
        const missingVal = targetVal - knownVal;

        let options = new Set([missingVal.toString()]);
        while (options.size < 4) {
            let fake = missingVal + (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
            if (fake > 0 && fake !== missingVal) options.add(fake.toString());
        }

        return {
            type: 'balance',
            instruction: `⚖️ BALANZA DE TRANSMUTACIÓN: Coloca el reactivo en el platillo izquierdo para equilibrar la masa de ${targetVal} unidades:`,
            leftPan: `? + ${knownVal}`,
            rightPan: `${targetVal}`,
            correct: missingVal.toString(),
            options: shuffleArray(Array.from(options))
        };

    } else if (rand < 0.7) {
        // EQUIVALENCIA ESTÁNDAR
        const num = Math.floor(Math.random() * 5) + 1;
        const den = Math.floor(Math.random() * 5) + num + 1;
        const mult = Math.floor(Math.random() * 3) + 2;

        const ans = `${num * mult}/${den * mult}`;

        let options = new Set([ans]);
        while (options.size < 4) {
            let fNum = Math.floor(Math.random() * 12) + 1;
            let fDen = Math.floor(Math.random() * 12) + 1;
            if (fNum / fDen !== num / den) options.add(`${fNum}/${fDen}`);
        }

        return {
            type: 'standard',
            instruction: `🔮 BALANZA DE EQUIVALENCIA: ¿Cuál de las siguientes esencias tiene el mismo valor volumétrico que la fórmula base?`,
            display: `Fórmula Base: [ ${num}/${den} ]`,
            correct: ans,
            options: shuffleArray(Array.from(options)),
            forceDirect: false
        };

    } else {
        // CRISTALIZACIÓN UNIFORME ESTÁNDAR
        const entero = Math.floor(Math.random() * 6) + 2;
        const den = Math.floor(Math.random() * 4) + 2;
        const num = entero * den;

        const ans = `${num}/${den}`;

        let options = new Set([ans]);
        while (options.size < 4) {
            let fakeNum = num + (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? 1 : -1);
            if (fakeNum > 0 && fakeNum !== num) options.add(`${fakeNum}/${den}`);
        }

        return {
            type: 'standard',
            instruction: `⚖️ CRISTALIZACIÓN UNIFORME: Convierte la cantidad exacta de frascos enteros a la fracción correspondiente:`,
            display: `Frascos Enteros: [ ${entero} ] en denominadores de ${den} partes = ?`,
            correct: ans,
            options: shuffleArray(Array.from(options))
        };
    }
}

function generateTomo2Challenge() {
    const rand = Math.random();

    if (rand < 0.3) {
        // REACTIVO DE SECUENCIA DE PASOS
        const num1 = Math.floor(Math.random() * 4) + 1;
        const den1 = 3;
        const num2 = Math.floor(Math.random() * 4) + 1;
        const den2 = 2;

        const stepsCorrect = [
            `Obtener común denominador (6)`,
            `Convertir primera fracción (${num1}/${den1} ➔ ${num1 * 2}/6)`,
            `Convertir segunda fracción (${num2}/${den2} ➔ ${num2 * 3}/6)`,
            `Sumar numeradores (${num1 * 2} + ${num2 * 3} = ${num1 * 2 + num2 * 3}/6)`
        ];

        return {
            type: 'sequence',
            instruction: `🧪 SECUENCIA DE DESTILACIÓN: Ordena cronológicamente los pasos para resolver la suma de elixires: (${num1}/${den1} + ${num2}/${den2})`,
            steps: stepsCorrect,
            correctOrder: stepsCorrect
        };

    } else if (rand < 0.6) {
        // REACTIVO DE SELECCIÓN MÚLTIPLE DE FRASCOS
        let numbers = [];
        let primes = [];
        while (numbers.length < 6) {
            let n = Math.floor(Math.random() * 20) + 2;
            if (!numbers.includes(n)) {
                numbers.push(n);
                if (isPrime(n)) primes.push(n);
            }
        }

        if (primes.length === 0) {
            numbers[0] = 7;
            primes.push(7);
        }

        return {
            type: 'multiSelect',
            instruction: `🔮 SELECCIÓN MÚLTIPLE: Selecciona únicamente los frascos que contengan Elementos Primos (números primos):`,
            items: numbers,
            correctItems: primes
        };

    } else {
        // SIMPLIFICACIÓN ESTÁNDAR
        const factor = Math.floor(Math.random() * 4) + 2;
        const simpleNum = Math.floor(Math.random() * 4) + 1;
        let simpleDen = Math.floor(Math.random() * 5) + simpleNum + 1;

        const divisor = mcd(simpleNum, simpleDen);
        const finalNum = simpleNum / divisor;
        const finalDen = simpleDen / divisor;

        const rawNum = finalNum * factor;
        const rawDen = finalDen * factor;

        const ans = `${finalNum}/${finalDen}`;

        let options = new Set([ans]);
        while (options.size < 4) {
            let fakeN = Math.floor(Math.random() * 6) + 1;
            let fakeD = Math.floor(Math.random() * 8) + 2;
            if (fakeN / fakeD !== finalNum / finalDen) options.add(`${fakeN}/${fakeD}`);
        }

        return {
            type: 'standard',
            instruction: `🧪 DESTILACIÓN PURA: Simplifica la siguiente mezcla a su forma irreducible para evitar una explosión:`,
            display: `Mezcla Bruta: [ ${rawNum}/${rawDen} ] = ?`,
            correct: ans,
            options: shuffleArray(Array.from(options))
        };
    }
}

function generateTomo3Challenge() {
    const rand = Math.random();

    if (rand < 0.3) {
        // REACTIVO DE ÁRBOLES DE FACTORIZACIÓN ALQUÍMICA
        const primes = [2, 3, 5, 7];
        const p1 = primes[Math.floor(Math.random() * primes.length)];
        const p2 = primes[Math.floor(Math.random() * primes.length)];
        const rootVal = p1 * p2;

        return {
            type: 'tree',
            instruction: `🌿 RED DE TRANSMUTACIÓN: Descompón el elixir principal en sus factores primos base:`,
            rootValue: rootVal,
            expected: { n1: p1, n2: p2 }
        };

    } else {
        // PROPORCIONES ESTÁNDAR
        const types = ['directa', 'inversa', 'porcentaje'];
        const chosen = types[Math.floor(Math.random() * types.length)];

        if (chosen === 'directa') {
            const basePot = Math.floor(Math.random() * 4) + 2;
            const baseElix = Math.floor(Math.random() * 3) + 2;
            const factor = Math.floor(Math.random() * 3) + 2;

            const targetElix = baseElix * factor;
            const ans = (basePot * factor).toString();

            let options = new Set([ans]);
            while (options.size < 4) {
                let fake = parseInt(ans) + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
                if (fake > 0) options.add(fake.toString());
            }

            return {
                type: 'standard',
                instruction: `📜 ESCALADO DE RECETA: Ajusta la dosis de Polvo de Estrellas para elaborar elixires múltiples:`,
                display: `Si ${baseElix} pociones usan ${basePot}g de polvo, ¿cuántos gramos usan ${targetElix} pociones?`,
                correct: ans,
                options: shuffleArray(Array.from(options))
            };
        } else if (chosen === 'inversa') {
            const magos1 = 2;
            const horas1 = (Math.floor(Math.random() * 4) + 1) * 3; 
            const magos2 = 6;

            const ans = ((magos1 * horas1) / magos2).toString();

            let options = new Set([ans]);
            while (options.size < 4) {
                let fake = parseInt(ans) + (Math.floor(Math.random() * 3) + 1);
                if (fake > 0) options.add(fake.toString());
            }

            return {
                type: 'standard',
                instruction: `⏳ TRABAJO EN EQUIPO (PROPORCIÓN INVERSA): Tiempo de encantamiento de un pergamino:`,
                display: `Si ${magos1} alquimistas tardan ${horas1} horas en canalizar una poción, ¿cuántas horas tardarán ${magos2} alquimistas?`,
                correct: ans,
                options: shuffleArray(Array.from(options))
            };
        } else {
            const pct = (Math.floor(Math.random() * 4) + 1) * 10;
            const total = (Math.floor(Math.random() * 5) + 2) * 10;
            const ans = ((pct * total) / 100).toString();

            let options = new Set([ans]);
            while (options.size < 4) {
                let fake = parseInt(ans) + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 2 : -2);
                if (fake >= 0) options.add(fake.toString());
            }

            return {
                type: 'standard',
                instruction: `🔮 CONCENTRACIÓN DE MAGIA: Calcula la pureza de la poción:`,
                display: `¿Cuánto es el ${pct}% de una esencia de ${total} ml?`,
                correct: ans,
                options: shuffleArray(Array.from(options))
            };
        }
    }
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

    if (confirm(msg)) endGame();
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
        resultsTitle.innerText = "🏆 DUELO MÍSTICO FINALIZADO 🏆";
        let winnerText = "";
        if (scoreTeam1 > scoreTeam2) winnerText = `🏆 ¡Gremio Ganador: ${team1Name}! 🏆`;
        else if (scoreTeam2 > scoreTeam1) winnerText = `🏆 ¡Gremio Ganador: ${team2Name}! 🏆`;
        else winnerText = "🤝 ¡Empate Alquímico Perfecto! 🤝";

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