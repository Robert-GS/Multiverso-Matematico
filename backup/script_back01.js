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
let questionType = 'multiple'; // 'multiple', 'direct', 'mixed'
let currentQuestionMode = 'multiple'; // Modo del reactivo actual

// --- SISTEMA DE AUDIO ---
const sounds = {
    bg: new Audio('audio/bg-music.mp3'),
    correct: new Audio('audio/correct.mp3'),
    wrong: new Audio('audio/wrong.mp3'),
    click: new Audio('audio/click2.mp3'),
    victory: new Audio('audio/victory.mp3')
};

// Configuración de música de fondo
sounds.bg.loop = true;
sounds.bg.volume = 0.2; // Volumen bajo para que no distraiga

let isMuted = false;

function toggleAudio() {
    isMuted = !isMuted;
    const btn = document.getElementById('btn-audio');
    
    if (isMuted) {
        sounds.bg.pause();
        btn.innerText = '🔇 Sound OFF';
    } else {
        sounds.bg.play().catch(() => {}); // Evitar bloqueos de navegador
        btn.innerText = '🔊 Sound ON';
    }
}

function playSFX(type) {
    if (!isMuted && sounds[type]) {
        sounds[type].currentTime = 0; // Reinicia el sonido para poder reproducirlo rápido
        sounds[type].play().catch(() => {});
    }
}

document.addEventListener('click', function(event) {
    // Si lo que se presionó es un botón (o está dentro de un botón)
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
        playSFX('click');
    }
});


/*document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const coverScreen = document.getElementById('screen-cover');
        if (!coverScreen.classList.contains('hidden')) {
            showScreen('screen-system');
        } else {
            // Escuchar ENTER cuando se responde en cuadro de texto
            const directContainer = document.getElementById('direct-input-container');
            if (!directContainer.classList.contains('hidden')) {
                const submitBtn = document.getElementById('btn-submit-answer');
                if (!submitBtn.disabled) checkDirectAnswer();
            }
        }

        if (!isMuted) sounds.bg.play(); // Arranca la música de fondo
    }
}); */
document.addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
        const coverScreen = document.getElementById('screen-cover');
        if (!coverScreen.classList.contains('hidden')) {
            if (!isMuted) sounds.bg.play().catch(() => {}); // Arranca la música
            showScreen('screen-system');
        } else {
            const directContainer = document.getElementById('direct-input-container');
            if (!directContainer.classList.contains('hidden')) {
                const submitBtn = document.getElementById('btn-submit-answer');
                if (!submitBtn.disabled) checkDirectAnswer();
            }
        }
    }
});


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

function generateNumber() {
    return Math.floor(Math.random() * (maxRange - minRange + 1)) + minRange;
}

function renderEgyptianNumber(num) {
    const displayContainer = document.getElementById('egypt-display');
    displayContainer.innerHTML = ''; 

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

            displayContainer.appendChild(digitGroup);
        }
    }
}

// Algoritmo de mezclado Fisher-Yates para aleatoriedad uniforme real
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

/*function generateOptions(correct) {
    let options = new Set([correct]);
    while (options.size < 4) {
        let step = minRange >= 100 ? 10 : 1;
        let offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? step : -step);
        let fakeOption = Math.abs(correct + offset);
        if (fakeOption > 0 && fakeOption !== correct) options.add(fakeOption);
    }
    return Array.from(options).sort(() => Math.random() - 0.5);
}*/

function generateOptions(correct) {
    let options = new Set([correct]);
    
    while (options.size < 4) {
        let step = minRange >= 100 ? 10 : 1;
        let offset = (Math.floor(Math.random() * 5) + 1) * (Math.random() < 0.5 ? step : -step);
        let fakeOption = Math.abs(correct + offset);
        if (fakeOption > 0 && fakeOption !== correct) options.add(fakeOption);
    }

    // Convertimos el Set a Array y lo mezclamos de forma equitativa
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
    renderEgyptianNumber(correctAnswer);

    // Determinar modo del reactivo
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

// Evaluación para Opción Múltiple
function checkMultipleAnswer(selected) {
    const allButtons = document.querySelectorAll('#options-container button');
    allButtons.forEach(btn => btn.disabled = true);
    processResult(selected === correctAnswer);

}

// Evaluación para Respuesta Directa con Validación
function checkDirectAnswer() {
    const input = document.getElementById('direct-answer');
    const feedback = document.getElementById('feedback');
    const rawValue = input.value.trim();

    // Reemplazar comas si el alumno escribe con formato numérico (ej. 1,200)
    const cleanValue = rawValue.replace(/,/g, '');

    // Validar que no esté vacío y contenga solo números
    if (cleanValue === '' || isNaN(cleanValue) || !/^\d+$/.test(cleanValue)) {
        feedback.style.color = '#d9534f';
        feedback.innerText = '⚠️ Ingresa solo números enteros positivos sin letras ni caracteres especiales.';
        input.focus();
        return;
    }

    const userNumber = parseInt(cleanValue, 10);
    
    // Bloquear campos para evitar reenvíos
    input.disabled = true;
    document.getElementById('btn-submit-answer').disabled = true;

    processResult(userNumber === correctAnswer);

}

// Procesar el resultado y sumar puntos
/*function processResult(isCorrect) {
    const feedback = document.getElementById('feedback');
    const activeTeamName = currentTurn === 1 ? team1Name : team2Name;

    if (isCorrect) {
        feedback.style.color = 'green';
        feedback.innerText = `¡Correcto, ${activeTeamName}! (+1 Punto)`;
        if (currentTurn === 1) scoreTeam1++;
        else scoreTeam2++;
    } else {
        feedback.style.color = 'red';
        feedback.innerText = `Incorrecto (${activeTeamName}). La respuesta era ${correctAnswer.toLocaleString()}`;
    }

    currentTurn = currentTurn === 1 ? 2 : 1;
    currentRound++;

    document.getElementById('btn-next').classList.remove('hidden');
} */

function processResult(isCorrect) {
    const feedback = document.getElementById('feedback');
    const activeTeamName = currentTurn === 1 ? team1Name : team2Name;

    if (isCorrect) {
        playSFX('correct'); // <--- Sonido de Acierto
        feedback.style.color = 'green';
        feedback.innerText = `¡Correcto, ${activeTeamName}! (+1 Punto)`;
        if (currentTurn === 1) scoreTeam1++;
        else scoreTeam2++;
    } else {
        playSFX('wrong'); // <--- Sonido de Error
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
    document.getElementById('round-info').innerText = `Reactivo: ${currentRound} / ${maxRounds}`;

    if (currentTurn === 1) {
        document.getElementById('team1-display').classList.add('active-team');
        document.getElementById('team2-display').classList.remove('active-team');
    } else {
        document.getElementById('team2-display').classList.add('active-team');
        document.getElementById('team1-display').classList.remove('active-team');
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

// Confirmar finalización anticipada de la partida
function confirmEndGame() {
    const confirmExit = confirm("¿Estás seguro de que deseas terminar la partida actual?");
    if (confirmExit) {
        endGame();
    }
}