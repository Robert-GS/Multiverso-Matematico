// ==========================================
// 1. SISTEMA DE AUDIO Y SONIDOS (CORREGIDO)
// ==========================================
const sounds = {
    bg: new Audio('audio/arqueomat/bg-music2.mp3'),
    correct: new Audio('audio/arqueomat/correct.mp3'),
    wrong: new Audio('audio/arqueomat/wrong.mp3'),
    click: new Audio('audio/arqueomat/click.mp3'),
    victory: new Audio('audio/arqueomat/victory.mp3')
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
let currentActiveSystem = 'egipcia'; // Para cuando el modo es 'mixta'
let minRange = 1;
let maxRange = 9999;
let team1Name = "Equipo 1";
let team2Name = "Equipo 2";
let scoreTeam1 = 0;
let scoreTeam2 = 0;
let currentTurn = 1; 
let currentRound = 1;
let maxRounds = 10;
let correctAnswer = 0;
let questionType = 'multiple';
let currentQuestionMode = 'multiple';

/*document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const coverScreen = document.getElementById('screen-cover');
        if (!coverScreen.classList.contains('hidden')) {
            //if (!isMuted) sounds.bg.play().catch(() => {});
            showScreen('screen-system');
        } else {
            const directContainer = document.getElementById('direct-input-container');
            if (!directContainer.classList.contains('hidden')) {
                const submitBtn = document.getElementById('btn-submit-answer');
                if (!submitBtn.disabled) checkDirectAnswer();
            }
        }
    }
});*/

// Referencia a la portada del juego
const screenCover = document.getElementById('screen-cover');

// Función central para iniciar el juego desde la portada
function startFromCover() {
    // Verifica que la portada esté visible (sin la clase 'hidden')
    if (screenCover && !screenCover.classList.contains('hidden')) {
        // Descomenta esta línea si deseas activar el audio al presionar/tocar
        // if (sounds && sounds.bg) sounds.bg.play().catch(err => console.log("Audio bloqueado:", err));

        // Transición a la siguiente pantalla (Ajusta la pantalla destino según el juego)
        showScreen('screen-system'); 
    }
}

// 1. Escuchar tecla ENTER en PC
document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        startFromCover();
    }
});

// 2. Escuchar TAP / CLIC en Celulares, Tablets y Mouse
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
    showScreen('screen-setup');
}

function startGame(event) {
    event.preventDefault();

    team1Name = document.getElementById('team1-name').value || "Equipo 1";
    team2Name = document.getElementById('team2-name').value || "Equipo 2";
    maxRounds = parseInt(document.getElementById('total-rounds').value);
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
    displayContainer.className = "egypt-number-container"; // Reset clases

    // Selección de sistema activo
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

// --- EGIPCIO ---
function renderEgyptian(num, container) {
    let temp = num;
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

// --- MESOPOTÁMICO (BASE 60) ---
// --- MESOPOTÁMICO CON AGRUPACIÓN EN FILAS DE 3 (IGUAL A LA TABLILLA) ---
function renderMesopotamian(num, container) {
    let temp = num;
    let base60Digits = [];

    // Descomponer en potencias de 60
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

        // --- DIBUJAR DECENAS (Cuñas 𒌋) ---
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

        // --- DIBUJAR UNIDADES (Clavos 𒁹) ---
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

        // Si la cifra es 0
        if (val === 0) {
            digitGroup.innerHTML = `<span style="font-size: 1.5rem; color: #888;">[0]</span>`;
        }

        container.appendChild(digitGroup);
    });
}

// --- MAYA (BASE 20 VERTICAL) ---
function renderMaya(num, container) {
    container.classList.add('maya-number-container');
    let temp = num;
    let base20Digits = [];

    if (temp === 0) base20Digits.push(0);
    while (temp > 0) {
        base20Digits.push(temp % 20); // Posiciones inferiores primero
        temp = Math.floor(temp / 20);
    }

    // Dibujar verticalmente (los niveles superiores irán arriba por CSS column-reverse)
    base20Digits.forEach(val => {
        const levelGroup = document.createElement('div');
        levelGroup.className = 'maya-level';

        if (val === 0) {
            levelGroup.innerHTML = `<div class="maya-zero">🐚</div>`;
        } else {
            let bars = Math.floor(val / 5);
            let dots = val % 5;

            // Puntos
            if (dots > 0) {
                const dotsDiv = document.createElement('div');
                dotsDiv.className = 'maya-dots';
                dotsDiv.innerHTML = '•'.repeat(dots);
                levelGroup.appendChild(dotsDiv);
            }

            // Rayas
            for (let b = 0; b < bars; b++) {
                const barDiv = document.createElement('div');
                barDiv.className = 'maya-bar';
                levelGroup.appendChild(barDiv);
            }
        }

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
    if (currentRound > maxRounds) {
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

    document.getElementById('btn-next').classList.remove('hidden');
}

function updateUI() {
    document.getElementById('team1-display').innerText = `${team1Name}: ${scoreTeam1} pts`;
    document.getElementById('team2-display').innerText = `${team2Name}: ${scoreTeam2} pts`;
    
    let systemLabel = currentActiveSystem.toUpperCase();
    document.getElementById('round-info').innerText = `Reactivo: ${currentRound} / ${maxRounds} (${systemLabel})`;

    if (currentTurn === 1) {
        document.getElementById('team1-display').classList.add('active-team');
        document.getElementById('team2-display').classList.remove('active-team');
    } else {
        document.getElementById('team2-display').classList.add('active-team');
        document.getElementById('team1-display').classList.remove('active-team');
    }
}

function confirmEndGame() {
    const confirmExit = confirm("¿Estás seguro de que deseas terminar la partida actual?");
    if (confirmExit) {
        endGame();
    }
}

function endGame() {
    let winnerMessage = "";
    if (scoreTeam1 > scoreTeam2) {
        winnerMessage = `🏆 ¡Ganador: ${team1Name}! 🏆`;
    } else if (scoreTeam2 > scoreTeam1) {
        winnerMessage = `🏆 ¡Ganador: ${team2Name}! 🏆`;
    } else {
        winnerMessage = "🤝 ¡Empate Espectacular! 🤝";
    }

    document.getElementById('winner-message').innerText = winnerMessage;
    document.getElementById('final-scores').innerHTML = `
        <p><strong>${team1Name}:</strong> ${scoreTeam1} puntos</p>
        <p><strong>${team2Name}:</strong> ${scoreTeam2} puntos</p>
    `;

    showScreen('screen-results');
    playSFX('victory');
}

function resetToSystemSelection() {
    showScreen('screen-system');
}