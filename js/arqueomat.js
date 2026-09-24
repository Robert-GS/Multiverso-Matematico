import { saveScore, getTopScores } from './leaderboard.js';

// ==========================================
// 1. SISTEMA DE AUDIO Y SONIDOS
// ==========================================
const sounds = {
    bg: new Audio('audio/arqueomat/bg-music2.mp3'),
    correct: new Audio('audio/arqueomat/correct.mp3'),
    wrong: new Audio('audio/arqueomat/wrong.mp3'),
    click: new Audio('audio/arqueomat/click.mp3'),
    victory: new Audio('audio/arqueomat/victory.mp3')
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
const SYMBOLS_EGYPT = [
    { val: 1000000, char: '𓁨' },
    { val: 100000,  char: '𓆐' },
    { val: 10000,   char: '𓂭' },
    { val: 1000,    char: '𓆼' },
    { val: 100,     char: '𓍢' },
    { val: 10,      char: '∩' },
    { val: 1,       char: '|' }
];

let selectedSystem = 'egipcia';
let currentActiveSystem = 'egipcia'; 
let minRange = 1;
let maxRange = 9999;

// Control de Modos
let gameMode = 'equipos'; // 'solitario' o 'equipos'
let playerName = "Estudiante";
let team1Name = "Equipo 1";
let team2Name = "Equipo 2";

// Puntajes
let scoreTeam1 = 0;
let scoreTeam2 = 0;
let soloCorrect = 0;
let soloTotal = 0;

// Desglose para modo mixto / solitario
let soloMultipleTotal = 0;
let soloMultipleCorrect = 0;
let soloDirectTotal = 0;
let soloDirectCorrect = 0;

let currentTurn = 1; 
let currentRound = 1;
let maxRounds = 10;
let correctAnswer = 0;
let questionType = 'multiple';
let currentQuestionMode = 'multiple';

const screenCover = document.getElementById('screen-cover');

function startFromCover() {
    if (screenCover && !screenCover.classList.contains('hidden')) {
        showScreen('screen-system'); 
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

if (screenCover) {
    screenCover.addEventListener('click', startFromCover);
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function selectSystem(system) {
    selectedSystem = system;
    showScreen('screen-difficulty');
}

function selectDifficulty(min, max) {
    minRange = min;
    maxRange = max;
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
        alert("Por favor ingresa tu nombre completo para el registro de tu práctica.");
        return;
    }

    playerName = nameInput;
    questionType = document.getElementById('question-type-solo').value;

    soloCorrect = 0;
    soloTotal = 0;
    soloMultipleTotal = 0;
    soloMultipleCorrect = 0;
    soloDirectTotal = 0;
    soloDirectCorrect = 0;

    showScreen('screen-game');
    loadNextQuestion();
}

// Iniciar Juego en Competencia (Equipos)
function startGame(event) {
    event.preventDefault();

    const t1 = document.getElementById('team1-name').value.trim();
    const t2 = document.getElementById('team2-name').value.trim();

    if (!t1 || !t2) {
        alert("Por favor ingresa un nombre válido para ambos equipos.");
        return;
    }

    if (t1.toLowerCase() === t2.toLowerCase()) {
        alert("Los nombres de los equipos no pueden ser iguales. Elige nombres distintos.");
        return;
    }

    team1Name = t1;
    team2Name = t2;
    maxRounds = parseInt(document.getElementById('total-rounds').value, 10);
    questionType = document.getElementById('question-type').value;

    scoreTeam1 = 0;
    scoreTeam2 = 0;
    currentTurn = 1;
    currentRound = 1;

    showScreen('screen-game');
    loadNextQuestion();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function generateNumber() {
    return Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
}

// ==========================================
// 3. RENDERIZADORES DE SISTEMAS NUMÉRICOS
// ==========================================

function renderNumber(num) {
    const displayContainer = document.getElementById('egypt-display');
    displayContainer.innerHTML = '';
    displayContainer.className = "egypt-number-container"; 

    if (selectedSystem === 'mixta') {
        const sysList = ['egipcia', 'mesopotamica', 'maya'];
        currentActiveSystem = sysList[Math.floor(Math.random() * sysList.length)];
    } else {
        currentActiveSystem = selectedSystem;
    }

    if (currentActiveSystem === 'egipcia') {
        renderEgyptian(num, displayContainer);
    } else if (currentActiveSystem === 'mesopotamica') {
        renderMesopotamian(num, displayContainer);
    } else if (currentActiveSystem === 'maya') {
        renderMaya(num, displayContainer);
    }
}

function renderEgyptian(num, container) {
    let temp = num;
    
    if (num >= 100000) {
        container.classList.add('egypt-scale-compact');
    } else if (num >= 1000) {
        container.classList.add('egypt-scale-medium');
    }

    for (let item of SYMBOLS_EGYPT) {
        let count = Math.floor(temp / item.val);
        temp %= item.val;

        if (count > 0) {
            const digitGroup = document.createElement('div');
            digitGroup.className = 'digit-group';

            let fullRows = Math.floor(count / 3);
            let remainder = count % 3;

            for (let r = 0; r < fullRows; r++) {
                const row = document.createElement('div');
                row.className = 'symbol-row';
                row.innerHTML = `<span>${item.char}</span>`.repeat(3);
                digitGroup.appendChild(row);
            }

            if (remainder > 0) {
                const row = document.createElement('div');
                row.className = 'symbol-row';
                row.innerHTML = `<span>${item.char}</span>`.repeat(remainder);
                digitGroup.appendChild(row);
            }

            container.appendChild(digitGroup);
        }
    }
}

function renderMesopotamian(num, container) {
    let temp = num;
    let base60Digits = [];

    if (temp === 0) base60Digits.push(0);
    while (temp > 0) {
        base60Digits.unshift(temp % 60);
        temp = Math.floor(temp / 60);
    }

    base60Digits.forEach(val => {
        const digitGroup = document.createElement('div');
        digitGroup.className = 'meso-digit-group';

        let tens = Math.floor(val / 10);
        let ones = val % 10;

        if (tens > 0) {
            const tensGroup = document.createElement('div');
            tensGroup.className = 'meso-subgroup';

            let fullRows = Math.floor(tens / 3);
            let remainder = tens % 3;

            for (let r = 0; r < fullRows; r++) {
                const row = document.createElement('div');
                row.className = 'meso-row';
                row.innerHTML = `<span class="meso-ten">𒌋</span>`.repeat(3);
                tensGroup.appendChild(row);
            }

            if (remainder > 0) {
                const row = document.createElement('div');
                row.className = 'meso-row';
                row.innerHTML = `<span class="meso-ten">𒌋</span>`.repeat(remainder);
                tensGroup.appendChild(row);
            }

            digitGroup.appendChild(tensGroup);
        }

        if (ones > 0) {
            const onesGroup = document.createElement('div');
            onesGroup.className = 'meso-subgroup';

            let fullRows = Math.floor(ones / 3);
            let remainder = ones % 3;

            for (let r = 0; r < fullRows; r++) {
                const row = document.createElement('div');
                row.className = 'meso-row';
                row.innerHTML = `<span class="meso-one">𒁹</span>`.repeat(3);
                onesGroup.appendChild(row);
            }

            if (remainder > 0) {
                const row = document.createElement('div');
                row.className = 'meso-row';
                row.innerHTML = `<span class="meso-one">𒁹</span>`.repeat(remainder);
                onesGroup.appendChild(row);
            }

            digitGroup.appendChild(onesGroup);
        }

        if (val === 0) {
            digitGroup.innerHTML = `<span style="font-size: 1.5rem; color: #888;">[0]</span>`;
        }

        container.appendChild(digitGroup);
    });
}

function renderMaya(num, container) {
    container.classList.add('maya-number-container');
    let temp = num;
    let base20Digits = [];

    if (temp === 0) base20Digits.push(0);
    while (temp > 0) {
        base20Digits.push(temp % 20);
        temp = Math.floor(temp / 20);
    }

    base20Digits.forEach((val, index) => {
        const levelGroup = document.createElement('div');
        levelGroup.className = 'maya-level';

        const multiplier = Math.pow(20, index);
        const tag = document.createElement('span');
        tag.className = 'maya-level-tag';
        tag.innerText = `(x${multiplier.toLocaleString()})`;
        levelGroup.appendChild(tag);

        const symbolBox = document.createElement('div');
        symbolBox.className = 'maya-symbol-box';

        if (val === 0) {
            symbolBox.innerHTML = `<div class="maya-zero">🐚</div>`;
        } else {
            let bars = Math.floor(val / 5);
            let dots = val % 5;

            if (dots > 0) {
                const dotsDiv = document.createElement('div');
                dotsDiv.className = 'maya-dots';
                dotsDiv.innerHTML = '•'.repeat(dots);
                symbolBox.appendChild(dotsDiv);
            }

            for (let b = 0; b < bars; b++) {
                const barDiv = document.createElement('div');
                barDiv.className = 'maya-bar';
                symbolBox.appendChild(barDiv);
            }
        }

        levelGroup.appendChild(symbolBox);
        container.appendChild(levelGroup);
    });
}

// ==========================================
// 4. DINÁMICA DE PREGUNTAS Y EVALUACIÓN
// ==========================================

function generateOptions(correct) {
    let options = new Set([correct]);
    while (options.size < 4) {
        let step = minRange >= 100 ? 10 : 1;
        let offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? step : -step);
        let fakeOption = Math.abs(correct + offset);
        if (fakeOption > 0 && fakeOption !== correct) options.add(fakeOption);
    }
    return shuffleArray(Array.from(options));
}

function loadNextQuestion() {
    if (gameMode === 'equipos' && currentRound > maxRounds) {
        endGame();
        return;
    }

    document.getElementById('btn-next').classList.add('hidden');
    document.getElementById('feedback').innerText = '';

    correctAnswer = generateNumber();
    renderNumber(correctAnswer);

    if (questionType === 'mixed') {
        currentQuestionMode = Math.random() < 0.5 ? 'multiple' : 'direct';
    } else {
        currentQuestionMode = questionType;
    }

    const optionsContainer = document.getElementById('options-container');
    const directContainer = document.getElementById('direct-input-container');

    if (currentQuestionMode === 'multiple') {
        directContainer.classList.add('hidden');
        optionsContainer.classList.remove('hidden');

        const options = generateOptions(correctAnswer);
        optionsContainer.innerHTML = '';

        options.forEach(option => {
            const btn = document.createElement('button');
            btn.innerText = option.toLocaleString(); 
            btn.onclick = () => checkMultipleAnswer(option);
            optionsContainer.appendChild(btn);
        });
    } else {
        optionsContainer.classList.add('hidden');
        directContainer.classList.remove('hidden');

        const input = document.getElementById('direct-answer');
        const submitBtn = document.getElementById('btn-submit-answer');
        input.value = '';
        input.disabled = false;
        submitBtn.disabled = false;
        input.focus();
    }

    updateUI();
}

function checkMultipleAnswer(selected) {
    const allButtons = document.querySelectorAll('#options-container button');
    allButtons.forEach(btn => btn.disabled = true);
    processResult(selected === correctAnswer);
}

function checkDirectAnswer() {
    const input = document.getElementById('direct-answer');
    const feedback = document.getElementById('feedback');
    const rawValue = input.value.trim();
    const cleanValue = rawValue.replace(/,/g, '');

    if (cleanValue === '' || isNaN(cleanValue) || !/^\d+$/.test(cleanValue)) {
        feedback.style.color = '#d9534f';
        feedback.innerText = '⚠️ Ingresa solo números enteros positivos sin letras ni caracteres especiales.';
        input.focus();
        return;
    }

    const userNumber = parseInt(cleanValue, 10);
    input.disabled = true;
    document.getElementById('btn-submit-answer').disabled = true;

    processResult(userNumber === correctAnswer);
}

function processResult(isCorrect) {
    const feedback = document.getElementById('feedback');

    if (gameMode === 'solitario') {
        soloTotal++;

        if (currentQuestionMode === 'multiple') {
            soloMultipleTotal++;
            if (isCorrect) soloMultipleCorrect++;
        } else if (currentQuestionMode === 'direct') {
            soloDirectTotal++;
            if (isCorrect) soloDirectCorrect++;
        }

        if (isCorrect) {
            playSFX('correct');
            soloCorrect++;
            feedback.style.color = 'green';
            feedback.innerText = `¡Correcto, ${playerName}! ✨ (+1 Resuelto)`;
        } else {
            playSFX('wrong');
            feedback.style.color = 'red';
            feedback.innerText = `Incorrecto. La respuesta era ${correctAnswer.toLocaleString()}`;
        }
    } else {
        const activeTeamName = currentTurn === 1 ? team1Name : team2Name;
        if (isCorrect) {
            playSFX('correct');
            feedback.style.color = 'green';
            feedback.innerText = `¡Correcto, ${activeTeamName}! (+1 Punto)`;
            if (currentTurn === 1) scoreTeam1++;
            else scoreTeam2++;
        } else {
            playSFX('wrong');
            feedback.style.color = 'red';
            feedback.innerText = `Incorrecto (${activeTeamName}). La respuesta era ${correctAnswer.toLocaleString()}`;
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
    let systemLabel = currentActiveSystem.toUpperCase();

    if (gameMode === 'solitario') {
        abortBtn.innerText = "🏁 Terminar Práctica";
        container.innerHTML = `
            <div class="team-score active-team">👤 ${playerName}</div>
            <div id="round-info">Sistema: ${systemLabel}</div>
            <div class="team-score">🎯 Correctos: ${soloCorrect} / ${soloTotal}</div>
        `;
    } else {
        abortBtn.innerText = "🏁 Terminar Partida";
        let team1Class = currentTurn === 1 ? 'active-team' : '';
        let team2Class = currentTurn === 2 ? 'active-team' : '';

        container.innerHTML = `
            <div id="team1-display" class="team-score ${team1Class}">${team1Name}: ${scoreTeam1} pts</div>
            <div id="round-info">Reactivo: ${currentRound} / ${maxRounds} (${systemLabel})</div>
            <div id="team2-display" class="team-score ${team2Class}">${team2Name}: ${scoreTeam2} pts</div>
        `;
    }
}

function confirmEndGame() {
    const msg = gameMode === 'solitario' 
        ? "¿Deseas finalizar tu sesión de práctica y ver tu reporte de ejercicios?" 
        : "¿Estás seguro de que deseas terminar la partida actual?";

    if (confirm(msg)) {
        endGame();
    }
}

async function endGame() {
    const resultsTitle = document.getElementById('results-title');
    const winnerMessage = document.getElementById('winner-message');
    const finalScores = document.getElementById('final-scores');

    if (gameMode === 'solitario') {
        resultsTitle.innerText = "📋 REPORTE DE PRÁCTICA INDIVIDUAL 📋";
        winnerMessage.innerText = `¡Gran trabajo, ${playerName}!`;

        const accuracy = soloTotal > 0 ? Math.round((soloCorrect / soloTotal) * 100) : 0;

        let typeLabel = "Opción Múltiple";
        if (questionType === 'direct') typeLabel = "Respuesta Directa";
        if (questionType === 'mixed') typeLabel = "Mixto (Aleatorio)";

        let reportHTML = `
            <div style="background: rgba(0,0,0,0.05); padding: 15px; border-radius: 8px; border: 1px dashed #c8a261; text-align: left; max-width: 450px; margin: 0 auto;">
                <p><strong>Alumno:</strong> ${playerName}</p>
                <p><strong>Sistema Practicado:</strong> ${selectedSystem.toUpperCase()}</p>
                <p><strong>Rango Dificultad:</strong> ${minRange.toLocaleString()} a ${maxRange.toLocaleString()}</p>
                <p><strong>Tipo de Reactivo:</strong> ${typeLabel}</p>
                <hr style="border: 0; border-top: 1px dashed #c8a261; margin: 10px 0;">
                <p><strong>Total de Ejercicios Intentados:</strong> ${soloTotal}</p>
                <p><strong>Aciertos Totales:</strong> ${soloCorrect}</p>
                <p><strong>Efectividad Global:</strong> ${accuracy}%</p>
        `;

        if (questionType === 'mixed') {
            const multAcc = soloMultipleTotal > 0 ? Math.round((soloMultipleCorrect / soloMultipleTotal) * 100) : 0;
            const dirAcc = soloDirectTotal > 0 ? Math.round((soloDirectCorrect / soloDirectTotal) * 100) : 0;

            reportHTML += `
                <hr style="border: 0; border-top: 1px dashed #c8a261; margin: 10px 0;">
                <p style="font-weight: bold; color: #8b0000; text-align: center;">📊 Desglose por Tipo de Reactivo:</p>
                <p>• <strong>Opción Múltiple:</strong> ${soloMultipleCorrect} / ${soloMultipleTotal} correctos (${multAcc}%)</p>
                <p>• <strong>Respuesta Directa:</strong> ${soloDirectCorrect} / ${soloDirectTotal} correctos (${dirAcc}%)</p>
            `;
        }

        reportHTML += `
            </div>
            <p style="font-size: 0.95rem; color: #555; margin-top: 15px;">
                📷 <em>Por favor toma una captura de pantalla a este reporte como evidencia de tu tarea.</em>
            </p>
        `;

        finalScores.innerHTML = reportHTML;

        // GUARDAR PUNTAJE EN FIRESTORE SI HUBO INTENTOS
        // DENTRO DE endGame() (Sección de Solitario)
        if (soloTotal > 0) {
            try {
                // Clave combinada: sistema + rango + tipo de reactivo
                const modeKey = `${selectedSystem}_${minRange}-${maxRange}_${questionType}`;

                await saveScore({
                    gameId: 'arqueomat',
                    gameTitle: 'ArqueoMat',
                    studentName: playerName,
                    mode: modeKey, // Ej: "egipcia_1-9_multiple" o "maya_100-999_direct"
                    score: soloCorrect,
                    effectiveness: accuracy,
                    details: `Sistema: ${selectedSystem.toUpperCase()} | Rango: ${minRange}-${maxRange} | Tipo: ${questionType}`
                });
            } catch (err) {
                console.error("Error al guardar puntuación en ArqueoMat:", err);
            }
        }
    } else {
        resultsTitle.innerText = "🏆 ¡FIN DEL JUEGO! 🏆";
        let winnerText = "";
        if (scoreTeam1 > scoreTeam2) {
            winnerText = `🏆 ¡Ganador: ${team1Name}! 🏆`;
        } else if (scoreTeam2 > scoreTeam1) {
            winnerText = `🏆 ¡Ganador: ${team2Name}! 🏆`;
        } else {
            winnerText = "🤝 ¡Empate Espectacular! 🤝";
        }

        winnerMessage.innerText = winnerText;
        finalScores.innerHTML = `
            <p><strong>${team1Name}:</strong> ${scoreTeam1} puntos</p>
            <p><strong>${team2Name}:</strong> ${scoreTeam2} puntos</p>
        `;
    }

    showScreen('screen-results');
    playSFX('victory');
}

function resetToSystemSelection() {
    showScreen('screen-system');
}

// ==========================================
// 5. TABLA GLOBAL DE LÍDERES
// ==========================================
let currentLeaderboardSystem = 'egipcia'; 
let currentLeaderboardRange = '1-9';
let currentLeaderboardType = 'multiple';

async function switchLeaderboardMode(system) {
    currentLeaderboardSystem = String(system).toLowerCase();
    
    ['egipcia', 'mesopotamica', 'maya', 'mixta'].forEach(s => {
        const btn = document.getElementById(`btn-tab-${s}`);
        if (btn) btn.classList.toggle('active', currentLeaderboardSystem === s);
    });

    await loadLeaderboard();
}

async function onLeaderboardRangeChange() {
    const rangeSelect = document.getElementById('leaderboard-range-select');
    if (rangeSelect) {
        currentLeaderboardRange = rangeSelect.value;
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
    
    // Sincronizar selectores
    const rangeSelect = document.getElementById('leaderboard-range-select');
    if (rangeSelect) currentLeaderboardRange = rangeSelect.value;

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

    // Construir la clave tripartita
    const combinedMode = `${currentLeaderboardSystem}_${currentLeaderboardRange}_${currentLeaderboardType}`;

    try {
        const scores = await getTopScores('arqueomat', combinedMode, 10);

        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">Sin récords en ${currentLeaderboardSystem.toUpperCase()} (${currentLeaderboardRange}) - ${currentLeaderboardType}. ¡Sé el primero!</td></tr>`;
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
// 6. EXPOSICIÓN GLOBAL A WINDOW
// ==========================================
window.showScreen = showScreen;
window.selectSystem = selectSystem;
window.selectDifficulty = selectDifficulty;
window.selectGameMode = selectGameMode;
window.startSoloGame = startSoloGame;
window.startGame = startGame;
window.checkDirectAnswer = checkDirectAnswer;
window.loadNextQuestion = loadNextQuestion;
window.confirmEndGame = confirmEndGame;
window.resetToSystemSelection = resetToSystemSelection;
window.toggleAudio = toggleAudio;
window.openAudioSettings = openAudioSettings;
window.closeAudioSettings = closeAudioSettings;
window.updateVolumes = updateVolumes;
window.switchLeaderboardMode = switchLeaderboardMode;
window.openLeaderboardModal = openLeaderboardModal;
window.closeLeaderboardModal = closeLeaderboardModal;
// Registro global de funciones
window.onLeaderboardRangeChange = onLeaderboardRangeChange;
window.onLeaderboardTypeChange = onLeaderboardTypeChange;
window.switchLeaderboardMode = switchLeaderboardMode;
window.openLeaderboardModal = openLeaderboardModal;
window.closeLeaderboardModal = closeLeaderboardModal;