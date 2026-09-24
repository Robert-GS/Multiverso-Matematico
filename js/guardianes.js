import { saveScore, getTopScores } from './leaderboard.js';

// 1. SISTEMA DE AUDIO TEMPLARIO
const sounds = {
    bg: new Audio('audio/guardianes/bg-music.mp3'),
    correct: new Audio('audio/guardianes/correct.mp3'),
    wrong: new Audio('audio/guardianes/wrong.mp3'),
    click: new Audio('audio/guardianes/click.mp3'),
    victory: new Audio('audio/guardianes/victory.mp3')
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

// 2. ESTADO DEL JUEGO Y LÓGICA DE EVENTOS
let selectedServer = 'sala1'; 
let currentActiveServer = 'sala1';
let difficultyLevel = 1;

let gameMode = 'solitario';
let playerName = "Explorador Ancestral";
let team1Name = "Gremio del Fuego";
let team2Name = "Gremio del Sol";

let scoreTeam1 = 0;
let scoreTeam2 = 0;
let soloCorrect = 0;
let soloTotal = 0;

let serverStats = {
    sala1: { correct: 0, total: 0, name: "Sala 1: Altar de la Jerarquía" },
    sala2: { correct: 0, total: 0, name: "Sala 2: Sellos Concéntricos" },
    sala3: { correct: 0, total: 0, name: "Sala 3: Espejo del Opuesto" }
};

let currentTurn = 1; 
let currentRound = 1;
let maxRounds = 10;
let correctAnswer = "";
let questionType = 'mixed';
let currentQuestionMode = 'multiple';
let selectedStamps = [];

const screenCover = document.getElementById('screen-cover');

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
    if (!input) return alert("Ingresa tu nombre para registrar tu sello en la entrada del templo.");
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
    if (!t1 || !t2) return alert("Ingresa el nombre de ambos gremios.");
    if (t1.toLowerCase() === t2.toLowerCase()) return alert("Los gremios deben tener nombres distintos.");
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

function hideAllQuestionContainers() {
    const containers = [
        'options-container',
        'direct-input-container',
        'balance-game-container',
        'sequence-game-container',
        'tree-game-container',
        'multi-select-container'
    ];
    containers.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('hidden');
    });
}

// 3. GENERADOR DE RETOS DE JERARQUÍA Y OPERACIONES COMBINADAS
function loadNextQuestion() {
    if (gameMode !== 'solitario' && currentRound - 1 >= maxRounds) return endGame();

    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('feedback').innerText = '';
    hideAllQuestionContainers();

    currentActiveServer = selectedServer === 'root'
        ? ['sala1', 'sala2', 'sala3'][Math.floor(Math.random() * 3)]
        : selectedServer;

    let challenge;
    if (currentActiveServer === 'sala1') challenge = generateSala1Challenge();
    else if (currentActiveServer === 'sala2') challenge = generateSala2Challenge();
    else challenge = generateSala3Challenge();

    document.getElementById('challenge-instruction').innerText = challenge.instruction;
    document.getElementById('hack-display').innerHTML = `<div style="font-size: 1.8rem; color: #2ecc71;">${challenge.display}</div>`;

    if (challenge.type === 'balance') {
        renderBalanceGame(challenge);
    } else if (challenge.type === 'multi-select') {
        renderMultiSelectGame(challenge);
    } else {
        correctAnswer = challenge.correct;
        currentQuestionMode = (questionType === 'mixed') ? (Math.random() < 0.5 ? 'multiple' : 'direct') : questionType;

        const optGrid = document.getElementById('options-container');
        const dirContainer = document.getElementById('direct-input-container');

        if (currentQuestionMode === 'multiple') {
            optGrid.classList.remove('hidden');
            optGrid.innerHTML = '';
            challenge.options.forEach(opt => {
                const btn = document.createElement('button');
                btn.innerText = opt;
                btn.onclick = () => checkAnswer(opt);
                optGrid.appendChild(btn);
            });
        } else {
            dirContainer.classList.remove('hidden');
            const input = document.getElementById('direct-answer');
            const submitBtn = document.getElementById('btn-submit-answer');
            input.value = ''; input.disabled = false; submitBtn.disabled = false; input.focus();
        }
    }
    updateUI();
}

// RENDERIZADO DE NUEVOS MÓDULOS
function renderBalanceGame(data) {
    correctAnswer = data.correct;
    const container = document.getElementById('balance-game-container');
    if (!container) return;
    container.classList.remove('hidden');
    document.getElementById('balance-left').innerText = data.leftPan;
    document.getElementById('balance-right').innerText = data.rightPan || '?';

    const optionsContainer = document.getElementById('balance-options');
    optionsContainer.innerHTML = '';
    data.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'btn-option';
        btn.innerText = opt;
        btn.onclick = () => checkAnswer(opt);
        optionsContainer.appendChild(btn);
    });
}

function renderMultiSelectGame(data) {
    selectedStamps = [];
    const container = document.getElementById('multi-select-container');
    if (!container) return;
    container.classList.remove('hidden');
    const grid = document.getElementById('multi-select-grid');
    grid.innerHTML = '';

    data.stamps.forEach((stamp, idx) => {
        const card = document.createElement('div');
        card.className = 'stamp-card';
        card.innerText = stamp.text;
        card.onclick = () => {
            card.classList.toggle('selected');
            if (selectedStamps.includes(idx)) {
                selectedStamps = selectedStamps.filter(i => i !== idx);
            } else {
                selectedStamps.push(idx);
            }
        };
        grid.appendChild(card);
    });
    
    window.currentMultiSelectCorrect = data.correctIndices;
}

function checkMultiSelectAnswer() {
    const correctIndices = window.currentMultiSelectCorrect || [];
    const isCorrect = JSON.stringify(selectedStamps.sort()) === JSON.stringify(correctIndices.sort());
    processResult(isCorrect);
}

// --- SALA 1: Jerarquía de Operaciones ---
function generateSala1Challenge() {
    const a = Math.floor(Math.random() * 6) + 2;
    const b = Math.floor(Math.random() * 4) + 2;
    const c = Math.floor(Math.random() * 5) + 1;
    
    const valAns = a + (Math.pow(b, 2) * c);
    const ansStr = `${valAns}`;

    const wrong1 = Math.pow(a + b, 2) * c;
    const wrong2 = (a + Math.pow(b, 2)) * c;
    const wrong3 = valAns + b;

    let options = new Set([ansStr, `${wrong1}`, `${wrong2}`, `${wrong3}`]);

    return {
        type: 'standard',
        instruction: "🏛️ ALTAR DE LA JERARQUÍA: Aplica la prioridad operacional exacta para activar el mecanismo.",
        display: `${a} + ${b}<sup>2</sup> × ${c} = ?`,
        correct: ansStr,
        options: shuffleArray(Array.from(options))
    };
}

// --- SALA 2: Símbolos de Agrupación Concéntricos ---
function generateSala2Challenge() {
    const isMulti = Math.random() < 0.3;

    if (isMulti) {
        const multiVariants = [
            {
                instruction: "📜 SELLOS MÚLTIPLES: Selecciona TODOS los sellos cuyo resultado sea un número PAR.",
                stamps: [
                    { text: "2 + 3 × 4" },    // 14 (Par)
                    { text: "(5 - 2) × 3" },  // 9 (Impar)
                    { text: "4² - 6" },       // 10 (Par)
                    { text: "15 / 3 + 1" }    // 6 (Par)
                ],
                correctIndices: [0, 2, 3]
            },
            {
                instruction: "📜 SELLOS MÚLTIPLES: Selecciona TODOS los sellos cuyo resultado sea un número NEGATIVO.",
                stamps: [
                    { text: "5 - 3 × 4" },    // -7 (Negativo)
                    { text: "(2 - 8) + 1" },  // -5 (Negativo)
                    { text: "-4 + 10" },      // 6 (Positivo)
                    { text: "3 × (1 - 4)" }   // -9 (Negativo)
                ],
                correctIndices: [0, 1, 3]
            },
            {
                instruction: "📜 SELLOS MÚLTIPLES: Selecciona TODOS los sellos cuyo resultado sea MAYOR QUE 10.",
                stamps: [
                    { text: "3 + 2 × 5" },    // 13 (Mayor que 10)
                    { text: "(4 + 2)² - 3" }, // 33 (Mayor que 10)
                    { text: "18 / 2 - 1" },   // 8 (Menor)
                    { text: "2³ + 5" }        // 13 (Mayor que 10)
                ],
                correctIndices: [0, 1, 3]
            },
            {
                instruction: "📜 SELLOS MÚLTIPLES: Selecciona TODOS los sellos donde se deba resolver PRIMERO una multiplicación.",
                stamps: [
                    { text: "8 + 4 × 2" },    // Jerarquía directa
                    { text: "(6 + 3) × 5" },  // Primero paréntesis
                    { text: "10 - 2 × 3" },   // Jerarquía directa
                    { text: "4 × (9 - 1)" }   // Primero paréntesis
                ],
                correctIndices: [0, 2]
            },
            {
                instruction: "📜 SELLOS MÚLTIPLES: Selecciona TODOS los sellos cuyo resultado sea IGUAL A 12.",
                stamps: [
                    { text: "4 + 2 × 4" },    // 12
                    { text: "(10 - 4) × 2" }, // 12
                    { text: "3² + 5" },       // 14
                    { text: "24 / (4 - 2)" }  // 12
                ],
                correctIndices: [0, 1, 3]
            },
            {
                instruction: "📜 SELLOS MÚLTIPLES: Selecciona TODOS los sellos cuyo resultado sea un número IMPAR.",
                stamps: [
                    { text: "7 + 3 × 2" },    // 13 (Impar)
                    { text: "(8 - 2) / 2" },  // 3 (Impar)
                    { text: "5² - 4" },       // 21 (Impar)
                    { text: "6 + 4 × 3" }     // 18 (Par)
                ],
                correctIndices: [0, 1, 2]
            }
        ];

        // Seleccionar una variante al azar
        const selectedVariant = multiVariants[Math.floor(Math.random() * multiVariants.length)];

        return {
            type: 'multi-select',
            instruction: selectedVariant.instruction,
            display: "Filtra los sellos del templo:",
            stamps: selectedVariant.stamps,
            correctIndices: selectedVariant.correctIndices
        };
    }

    const x = Math.floor(Math.random() * 5) + 2;
    const y = Math.floor(Math.random() * 4) + 1;
    const z = Math.floor(Math.random() * 3) + 2;

    const inner = z + 2;
    const bracket = y * inner;
    const valAns = x + bracket;
    const ansStr = `${valAns}`;

    const wrong1 = (x + y) * (z + 2);
    const wrong2 = x + y * z + 2;
    const wrong3 = valAns - y;

    let options = new Set([ansStr, `${wrong1}`, `${wrong2}`, `${wrong3}`]);

    return {
        type: 'standard',
        instruction: "🔮 SELLOS CONCÉNTRICOS: Desata los símbolos de agrupación desde el núcleo (interior a exterior).",
        display: `{ ${x} + [ ${y} × ( ${z} + 2 ) ] } = ?`,
        correct: ansStr,
        options: shuffleArray(Array.from(options))
    };
}

// --- SALA 3: Resta como Suma con Opuesto y Números Reales ---
function generateSala3Challenge() {
    const randType = Math.random();

    if (randType < 0.35) {
        // Modo Balanza Templaria
        const val = Math.floor(Math.random() * 10) + 1;
        const leftVal = `-(-${val}) + 3`;
        const correctVal = `${val + 3}`;

        return {
            type: 'balance',
            instruction: "⚖️ BALANZA TEMPLARIA: Encuentra la expresión o número equivalente para equilibrar el altar.",
            display: "Equilibra la balanza sagrada:",
            leftPan: leftVal,
            rightPan: "?",
            correct: correctVal,
            options: shuffleArray([correctVal, `${val - 3}`, `${-val + 3}`, `${val * 2}`])
        };
    } else if (randType < 0.70) {
        const numA = Math.floor(Math.random() * 12) - 6;
        const numB = Math.floor(Math.random() * 9) + 1;

        const valAns = numA - numB;
        const ansStr = `${valAns}`;

        let options = new Set([ansStr, `${numA + numB}`, `${Math.abs(valAns)}`, `${-valAns}`]);

        return {
            type: 'standard',
            instruction: "📜 ESPEJO DEL OPUESTO: Resuelve la resta convirtiéndola en la suma con el opuesto del número.",
            display: `${numA} - (${numB}) = ?`,
            correct: ansStr,
            options: shuffleArray(Array.from(options))
        };
    } else {
        const a = Math.floor(Math.random() * 5) + 1;
        const b = Math.floor(Math.random() * 4) + 2;
        const square = b * b;

        const valAns = b - (-a * 3);
        const ansStr = `${valAns}`;

        let options = new Set([ansStr, `${b - (a * 3)}`, `${square + a}`, `${valAns + 3}`]);

        return {
            type: 'standard',
            instruction: "⚖️ EQUILIBRIO REAL: Combina raíces, signos negativos y multiplicaciones con precisión.",
            display: `√(${square}) - (-${a}) × 3 = ?`,
            correct: ansStr,
            options: shuffleArray(Array.from(options))
        };
    }
}

// 4. EVALUACIÓN DE RESPUESTAS
function checkAnswer(selected) {
    document.querySelectorAll('#options-container button, #balance-options button').forEach(b => b.disabled = true);
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
            feedback.innerText = `🏛️ ¡CÓDIGO ANCESTRAL CORRECTO, GUARDIÁN ${playerName.toUpperCase()}! (+1 Reliquia)`;
        } else {
            playSFX('wrong');
            feedback.style.color = '#e74c3c';
            feedback.innerText = `💥 ¡TRAMPA ACTIVADA! La respuesta exacta de la runa era: ${correctAnswer}`;
        }
    } else {
        const teamName = currentTurn === 1 ? team1Name : team2Name;
        if (isCorrect) {
            playSFX('correct'); feedback.style.color = '#2ecc71';
            feedback.innerText = `✨ ¡SELLO RESUELTO POR ${teamName}! (+1 Punto)`;
            if (currentTurn === 1) scoreTeam1++; else scoreTeam2++;
        } else {
            playSFX('wrong'); feedback.style.color = '#e74c3c';
            feedback.innerText = `❌ FALLO DE SECUENCIA EN ${teamName}. La respuesta era ${correctAnswer}`;
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
        abortBtn.innerText = "🏛️ Salir del Templo";
        container.innerHTML = `
            <div class="team-score active-team">🧙‍♂️ GUARDIÁN: ${playerName}</div>
            <div id="round-info">SALA: ${label}</div>
            <div class="team-score">🏺 ACIERTOS: ${soloCorrect} de ${soloTotal} (♾️ Libre)</div>
        `;
    } else {
        abortBtn.innerText = "🏁 Abortar Expedición";
        container.innerHTML = `
            <div class="team-score ${currentTurn === 1 ? 'active-team' : ''}">${team1Name}: ${scoreTeam1} pts</div>
            <div id="round-info">RUNA: ${currentRound} / ${maxRounds} (${label})</div>
            <div class="team-score ${currentTurn === 2 ? 'active-team' : ''}">${team2Name}: ${scoreTeam2} pts</div>
        `;
    }
}

function confirmEndGame() {
    const msg = gameMode === 'solitario' 
        ? "¿Deseas salir del templo y guardar tu pergamino de expedición?" 
        : "¿Estás seguro de que deseas abortar el desafío de gremios?";
    if (confirm(msg)) endGame();
}

// 5. REPORTE FINAL DE PERGAMINO
async function endGame() {
    const resultsTitle = document.getElementById('results-title');
    const winnerMessage = document.getElementById('winner-message');
    const finalScores = document.getElementById('final-scores');

    if (gameMode === 'solitario') {
        resultsTitle.innerText = "📜 PERGAMINO DEL GUARDIÁN DEL ORDEN 📜";
        winnerMessage.innerText = `¡Expedición Concluida, Guardián ${playerName}!`;
        const accuracy = soloTotal > 0 ? Math.round((soloCorrect / soloTotal) * 100) : 0;

        let reportHTML = `
            <div style="background: rgba(46, 204, 113, 0.05); padding: 18px; border-radius: 8px; border: 1px dashed #d4af37; text-align: left; max-width: 480px; margin: 0 auto;">
                <p><strong>Guardián Explorador:</strong> ${playerName}</p>
                <p><strong>Cámara Explorada:</strong> ${selectedServer === 'root' ? 'EL SANTO GRIAL DEL ORDEN' : selectedServer.toUpperCase()}</p>
                <p><strong>Grado de Infiltración:</strong> Nivel ${difficultyLevel}</p>
                <hr style="border: 0; border-top: 1px dashed #d4af37; margin: 10px 0;">
                <p><strong>Enigmas Abordados:</strong> ${soloTotal}</p>
                <p><strong>Sellos Desactivados:</strong> ${soloCorrect}</p>
                <p><strong>Dominio de la Jerarquía:</strong> <span style="color:#2ecc71; font-weight:bold;">${accuracy}%</span></p>
        `;

        if (selectedServer === 'root') {
            reportHTML += `<hr style="border: 0; border-top: 1px dashed #d4af37; margin: 10px 0;">
                <p style="font-weight: bold; color: #d4af37; text-align: center;">📊 Rendimiento por Salas del Templo:</p>`;
            for (let k in serverStats) {
                const s = serverStats[k];
                const acc = s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0;
                reportHTML += `<p>• <strong>${s.name}:</strong> ${s.correct}/${s.total} (${acc}%)</p>`;
            }
        }

        reportHTML += `</div><p style="font-size: 0.95rem; color: #d1d5db; margin-top: 15px;">📷 <em>Toma una captura de pantalla como evidencia de tu hazaña.</em></p>`;
        finalScores.innerHTML = reportHTML;

        if (soloTotal > 0) {
            try {
                await saveScore({
                    gameId: 'guardianes',
                    gameTitle: 'Guardianes del Orden',
                    studentName: playerName,
                    mode: `${selectedServer}_${difficultyLevel}_${questionType}`,
                    score: soloCorrect,
                    effectiveness: accuracy,
                    details: `Sala: ${selectedServer.toUpperCase()} | Nivel: ${difficultyLevel} | Entrada: ${questionType}`
                });
            } catch (err) { console.error("Error al guardar en Firestore:", err); }
        }
    } else {
        resultsTitle.innerText = "🏆 EXPEDICIÓN CONCLUIDA 🏆";
        winnerMessage.innerText = scoreTeam1 > scoreTeam2 ? `🏆 ¡Gremio Victorioso: ${team1Name}! 🏆` :
                                 scoreTeam2 > scoreTeam1 ? `🏆 ¡Gremio Victorioso: ${team2Name}! 🏆` :
                                 "🤝 ¡Armonía y Empate Absoluto! 🤝";
        finalScores.innerHTML = `<p><strong>${team1Name}:</strong> ${scoreTeam1} pts</p><p><strong>${team2Name}:</strong> ${scoreTeam2} pts</p>`;
    }
    showScreen('screen-results');
    playSFX('victory');
}

function resetToServerSelection() { showScreen('screen-server'); }

// 6. LEADERBOARD / REGISTRO DE LÍDERES CON FIRESTORE
let currentLeaderboardServer = 'sala1'; 
let currentLeaderboardLevel = '1';
let currentLeaderboardType = 'multiple';

async function switchLeaderboardMode(server) {
    currentLeaderboardServer = String(server).toLowerCase();
    ['sala1', 'sala2', 'sala3', 'root'].forEach(s => {
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
    tbody.innerHTML = '<tr><td colspan="4">Consultando los perfiles antiguos del templo...</td></tr>';
    const combinedMode = `${currentLeaderboardServer}_${currentLeaderboardLevel}_${currentLeaderboardType}`;

    try {
        const scores = await getTopScores('guardianes', combinedMode, 10);
        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">Sin registros antiguos en ${currentLeaderboardServer.toUpperCase()} (Nivel ${currentLeaderboardLevel}). ¡Sé el primer Guardián!</td></tr>`;
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
        tbody.innerHTML = '<tr><td colspan="4">No se pudo obtener el registro ancestral.</td></tr>';
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
window.checkMultiSelectAnswer = checkMultiSelectAnswer;
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