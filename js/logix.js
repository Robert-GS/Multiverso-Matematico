import { saveScore, getTopScores } from './leaderboard.js';

// ==========================================
// 1. ESTADO DEL JUEGO Y VARIABLES
// ==========================================
let numVariables = 2;
let maxAttempts = 3;
let currentAttempts = 3;
let currentExpression = "";
let currentTableData = [];
let userSwitches = [];
let isTableLocked = false;

// Variables de estadísticas y reporte
let studentName = "";
let totalAttemptedExercises = 0;
let totalCorrectExercises = 0;
let totalCheckAttempts = 0;
let hasAttemptedCurrentExercise = false;

// Variables del modo de juego
let gameMode = 'solo';

// Variables de competencia
let team1Name = "";
let team2Name = "";
let totalTeamDoors = 10;

let currentTeamDoor = 1;
let currentTeam = 1;
let team1Score = 0;
let team2Score = 0;

let teamDoorResolved = false;

// ==========================================
// 2. SISTEMA DE AUDIO Y SONIDOS
// ==========================================
const sounds = {
    bg: new Audio('audio/logix/bg-music2.mp3'),
    correct: new Audio('audio/logix/correct.mp3'),
    wrong: new Audio('audio/logix/incorrect.mp3'),
    click: new Audio('audio/logix/click.mp3')
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
    const bgInput = document.getElementById('volume-bg');
    const sfxInput = document.getElementById('volume-sfx');
    if (bgInput) bgVolume = parseFloat(bgInput.value);
    if (sfxInput) sfxVolume = parseFloat(sfxInput.value);
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
    const modal = document.getElementById('modal-audio-settings');
    if (modal) modal.classList.remove('hidden');
}

function closeAudioSettings() {
    const modal = document.getElementById('modal-audio-settings');
    if (modal) modal.classList.add('hidden');
}

document.addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
        playSFX('click');
    }
});

// Inicializar volúmenes al cargar
document.addEventListener('DOMContentLoaded', () => {
    applyVolumes();
    
    const bgInput = document.getElementById('volume-bg');
    const sfxInput = document.getElementById('volume-sfx');
    if (bgInput) bgInput.value = bgVolume;
    if (sfxInput) sfxInput.value = sfxVolume;
});

// ==========================================
// 3. NAVEGACIÓN Y TECLADO
// ==========================================
function startFromCover() {
    const screenCover = document.getElementById('screen-cover');
    if (screenCover && !screenCover.classList.contains('hidden')) {
        showScreen('screen-story'); 
    }
}

function continueFromStory() {
    showScreen('screen-mode');
}

function selectGameMode(mode) {
    gameMode = mode;

    if (mode === 'solo') {
        showScreen('screen-setup');
        return;
    }

    if (mode === 'team') {
        showScreen('screen-team-setup');
    }
}

//document.addEventListener('keydown', function(e) {
//    if (e.key === 'Enter') {
//        startFromCover();
//    }
//});
//------------------------------------------------------------------
function handleEnterNavigation(event) {

    if (event.key !== 'Enter') return;

    const screenCover = document.getElementById('screen-cover');
    const screenStory = document.getElementById('screen-story');

    // PORTADA → HISTORIA
    if (screenCover && !screenCover.classList.contains('hidden')) {
        startFromCover();
        return;
    }

    // HISTORIA → SELECCIÓN DE MODO
    if (screenStory && !screenStory.classList.contains('hidden')) {
        continueFromStory();
    }
}

document.addEventListener('keydown', handleEnterNavigation);

//---------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    const screenCover = document.getElementById('screen-cover');
    if (screenCover) {
        screenCover.addEventListener('click', startFromCover);
    }
});

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

// ==========================================
// 4. GENERADOR DE EXPRESIONES Y TABLAS
// ==========================================
function generateRandomExpression(numVars) {
    if (numVars === 2) {
        const vars = ['A', 'B'];
        let parts = vars.map(v => (Math.random() < 0.5 ? `${v}'` : v));
        let op = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
        return parts.join(op);
    } 

    if (numVars === 3) {
        const patternType = Math.floor(Math.random() * 3);

        if (patternType === 0) {
            const vars = ['A', 'B', 'C'];
            let parts = vars.map(v => (Math.random() < 0.5 ? `${v}'` : v));
            let op1 = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            let op2 = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            return `${parts[0]}${op1}${parts[1]}${op2}${parts[2]}`;
        } 
        else if (patternType === 1) {
            const p1 = Math.random() < 0.5 ? "A'" : "A";
            const p2 = Math.random() < 0.5 ? "B'" : "B";
            const p3 = Math.random() < 0.5 ? "C'" : "C";

            const innerOp = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';
            const outerOp = Math.random() < 0.5 ? ' ∧ ' : ' ∨ ';

            return `(${p1}${innerOp}${p2})${outerOp}${p3}`;
        } 
        else {
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
// 5. INICIO DE PARTIDA Y RENDERING
// ==========================================
function startGame() {
    const nameInput = document.getElementById('student-name');
    studentName = nameInput.value.trim();

    if (!studentName) {
        alert("Por favor, ingresa tu nombre para continuar.");
        nameInput.focus();
        return;
    }

    gameMode = 'solo';

    totalAttemptedExercises = 0;
    totalCorrectExercises = 0;
    totalCheckAttempts = 0;

    updateSoloProgressDisplay();

    numVariables = parseInt(document.getElementById('num-vars-select').value);
    maxAttempts = parseInt(document.getElementById('max-attempts').value);
    
    showScreen('screen-game');

    updateTeamPanel();

    loadNextDoor();
}

function startTeamGame() {
    const team1Input = document.getElementById('team-1-name');
    const team2Input = document.getElementById('team-2-name');

    team1Name = team1Input.value.trim();
    team2Name = team2Input.value.trim();

    if (!team1Name) {
        alert("Por favor, ingresa el nombre del Equipo 1.");
        team1Input.focus();
        return;
    }

    if (!team2Name) {
        alert("Por favor, ingresa el nombre del Equipo 2.");
        team2Input.focus();
        return;
    }

    if (team1Name.toLowerCase() === team2Name.toLowerCase()) {
        alert("Los equipos deben tener nombres diferentes.");
        team2Input.focus();
        return;
    }

    gameMode = 'team';

    numVariables = parseInt(
        document.getElementById('team-num-vars').value
    );

    totalTeamDoors = parseInt(
        document.getElementById('team-total-doors').value
    );

    // Reiniciar estado de la competencia
    currentTeamDoor = 1;
    currentTeam = 1;
    team1Score = 0;
    team2Score = 0;

    teamDoorResolved = false;


    // En competencia habrá una sola oportunidad por puerta
    maxAttempts = 1;

    showScreen('screen-game');

    updateTeamPanel();

    loadNextDoor();
}

function updateTeamPanel() {
    const panel = document.getElementById('team-game-panel');

    if (!panel) return;

    // El panel competitivo sólo debe aparecer en modo equipos
    if (gameMode !== 'team') {
        panel.classList.add('hidden');
        return;
    }

    panel.classList.remove('hidden');

    document.getElementById('team1-display-name').innerText = team1Name;
    document.getElementById('team2-display-name').innerText = team2Name;

    document.getElementById('team1-display-score').innerText = team1Score;
    document.getElementById('team2-display-score').innerText = team2Score;

    const currentTeamName = currentTeam === 1
        ? team1Name
        : team2Name;

    document.getElementById('team-turn-display').innerText =
        `TURNO: ${currentTeamName}`;

    document.getElementById('team-door-display').innerText =
        `Puerta ${currentTeamDoor} de ${totalTeamDoors}`;

    const team1Card = document.querySelector('.team-score-1');
    const team2Card = document.querySelector('.team-score-2');

    team1Card.classList.toggle('active-team', currentTeam === 1);
    team2Card.classList.toggle('active-team', currentTeam === 2);
}

function updateNextButton() {
    const nextButton = document.getElementById('btn-next');

    if (!nextButton) return;

    if (gameMode === 'team' && currentTeamDoor >= totalTeamDoors) {
        nextButton.innerText = "🏁 VER RESULTADO";
    } else {
        nextButton.innerText = "Siguiente Puerta ➔";
    }
}

function loadNextDoor() {
    currentAttempts = maxAttempts;
    isTableLocked = false;
    hasAttemptedCurrentExercise = false;
    
    document.getElementById('door-status').className = "door-status locked";
    document.getElementById('door-status').innerText = "🔒 PUERTA BLOQUEADA";
    
    document.getElementById('feedback').innerText = "";
    document.getElementById('btn-submit').classList.remove('hidden');
    document.getElementById('btn-next').classList.add('hidden');
    updateNextButton();
    updateAttemptsDisplay();

    currentExpression = generateRandomExpression(numVariables);
    document.getElementById('target-expression').innerText = currentExpression;

    currentTableData = generateTruthTableData(numVariables);
    userSwitches = new Array(currentTableData.length).fill(false);

    renderTable();
}

function goToNextDoor() {

    // Modo individual: conservar comportamiento original
    if (gameMode !== 'team') {
        loadNextDoor();
        return;
    }

    // Si ya se resolvió la última puerta, finalizar competencia
    if (currentTeamDoor >= totalTeamDoors) {
        finishTeamGame();
        return;
    }

    // Avanzar número de puerta
    currentTeamDoor++;

    // Alternar equipo
    currentTeam = currentTeam === 1 ? 2 : 1;

    // Preparar la nueva puerta
    teamDoorResolved = false;

    updateTeamPanel();
    loadNextDoor();
}

function finishTeamGame() {

    const protocol = document.getElementById('team-result-protocol');
    const winnerText = document.getElementById('team-result-winner');
    const message = document.getElementById('team-result-message');

    const card1 = document.getElementById('team-result-card-1');
    const card2 = document.getElementById('team-result-card-2');

    // Limpiar estados visuales anteriores
    card1.classList.remove('winner', 'tie');
    card2.classList.remove('winner', 'tie');

    // Mostrar nombres y puntuaciones
    document.getElementById('team-result-name-1').innerText = team1Name;
    document.getElementById('team-result-name-2').innerText = team2Name;

    document.getElementById('team-result-score-1').innerText = team1Score;
    document.getElementById('team-result-score-2').innerText = team2Score;

    // Mostrar configuración utilizada
    document.getElementById('team-result-details').innerText =
        `${totalTeamDoors} PUERTAS • ${numVariables} VARIABLES`;

    // Determinar resultado
    if (team1Score > team2Score) {

        protocol.innerText = "PROTOCOLO DE ESCAPE COMPLETADO";
        winnerText.innerText = `🏆 ${team1Name}`;

        message.innerText =
            `${team1Name} ha descifrado más sistemas de seguridad.`;

        card1.classList.add('winner');

    }
    else if (team2Score > team1Score) {

        protocol.innerText = "PROTOCOLO DE ESCAPE COMPLETADO";
        winnerText.innerText = `🏆 ${team2Name}`;

        message.innerText =
            `${team2Name} ha descifrado más sistemas de seguridad.`;

        card2.classList.add('winner');

    }
    else {

        protocol.innerText = "EQUILIBRIO LÓGICO DETECTADO";
        winnerText.innerText = "🤝 EMPATE LÓGICO";

        message.innerText =
            "Ambos equipos han alcanzado el mismo nivel de acceso.";

        card1.classList.add('tie');
        card2.classList.add('tie');
    }

    showScreen('screen-team-results');
}

function rematchTeamGame() {

    // Reiniciar estado competitivo
    currentTeamDoor = 1;
    currentTeam = 1;
    team1Score = 0;
    team2Score = 0;
    teamDoorResolved = false;

    // Mantener nombres y configuración de la competencia anterior
    gameMode = 'team';
    maxAttempts = 1;

    // Volver al área de juego
    showScreen('screen-game');

    // Actualizar panel competitivo
    updateTeamPanel();

    // Preparar la primera puerta de la revancha
    loadNextDoor();
}

function returnToCover() {

    // Restablecer modo general
    gameMode = 'solo';

    // Reiniciar estado competitivo
    team1Name = "";
    team2Name = "";
    totalTeamDoors = 10;

    currentTeamDoor = 1;
    currentTeam = 1;

    team1Score = 0;
    team2Score = 0;

    teamDoorResolved = false;

    // Restaurar texto normal del botón siguiente
    const nextButton = document.getElementById('btn-next');

    if (nextButton) {
        nextButton.innerText = "Siguiente Puerta ➔";
    }

    // Ocultar cualquier estado competitivo
    updateTeamPanel();

    // Regresar a portada
    showScreen('screen-cover');
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
    playSFX('click');
    userSwitches[index] = !userSwitches[index];
    renderTable();
}

function updateAttemptsDisplay() {
    document.getElementById('attempts-left').innerText = `Intentos: ${'❤️'.repeat(currentAttempts)}`;
}

function updateSoloProgressDisplay() {
    const progress = document.getElementById('solo-progress');

    if (!progress) return;

    if (gameMode === 'solo') {
        progress.classList.remove('hidden');
        progress.innerText =
            `🎯 Aciertos: ${totalCorrectExercises} / ${totalAttemptedExercises}`;
    } else {
        progress.classList.add('hidden');
    }
}

// ==========================================
// 6. VERIFICACIÓN DE CÓDIGO
// ==========================================
function checkAnswer() {
    if (!hasAttemptedCurrentExercise) {
        totalAttemptedExercises++;
        hasAttemptedCurrentExercise = true;
    }

    updateSoloProgressDisplay();

    totalCheckAttempts++;

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
        playSFX('correct');
        isTableLocked = true;
        totalCorrectExercises++;
        updateSoloProgressDisplay();

        // Registrar punto en modo competencia
        if (gameMode === 'team' && !teamDoorResolved) {
            if (currentTeam === 1) {
                team1Score++;
            } else {
                team2Score++;
            }

            teamDoorResolved = true;
            updateTeamPanel();
        }

        updateNextButton();
 
        document.getElementById('door-status').className = "door-status unlocked";
        document.getElementById('door-status').innerText = "🔓 ¡PUERTA DESBLOQUEADA!";
        feedback.style.color = "#00ff88";
        feedback.innerText = "¡Excelente! Has configurado la clave correctamente.";
        
        document.getElementById('btn-submit').classList.add('hidden');
        document.getElementById('btn-next').classList.remove('hidden');
        renderTable();
    } else {
        playSFX('wrong');
        currentAttempts--;
        updateAttemptsDisplay();

        if (currentAttempts > 0) {
            feedback.style.color = "#ff0055";
            feedback.innerText = "❌ Código incorrecto. Revisa las reglas de los operadores ∧ / ∨.";
        } else {
            feedback.style.color = "#ff0055";
            feedback.innerText = "⚠️ Has agotado los intentos. Revelando clave correcta...";
            
            if (gameMode === 'team') {
                teamDoorResolved = true;
            }
            updateNextButton();
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
    if (confirm("¿Deseas concluir la partida y ver tu reporte de resultados?")) {
        showReportScreen();
    }
}

// ==========================================
// 7. MOSTRAR REPORTE DE RESULTADOS
// ==========================================
async function showReportScreen() {
    const avgAttempts = totalAttemptedExercises > 0 
        ? (totalCheckAttempts / totalAttemptedExercises).toFixed(1) 
        : "0.0";

    const effectiveness = totalAttemptedExercises > 0 
        ? Math.round((totalCorrectExercises / totalAttemptedExercises) * 100) 
        : 0;

    document.getElementById('res-student-name').innerText = studentName;
    document.getElementById('res-game-type').innerText = `${numVariables} Variables (${numVariables === 2 ? '4 Filas' : '8 Filas'})`;
    document.getElementById('res-max-attempts').innerText = maxAttempts;
    document.getElementById('res-total-exercices').innerText = totalAttemptedExercises;
    document.getElementById('res-avg-attempts').innerText = avgAttempts;
    document.getElementById('res-total-correct').innerText = totalCorrectExercises;
    document.getElementById('res-effectiveness').innerText = `${effectiveness}%`;

    showScreen('screen-results');

    if (totalAttemptedExercises > 0) {
        try {
            await saveScore({
                gameId: 'logix',
                gameTitle: 'Salida Lógica',
                studentName: studentName,
                mode: numVariables,
                score: totalCorrectExercises,
                effectiveness: effectiveness,
                details: `${numVariables} Variables (${maxAttempts} int/puerta)`
            });
        } catch (err) {
            console.error("Error al guardar puntuación:", err);
        }
    }
}

// ==========================================
// 8. TABLA GLOBAL DE LÍDERES
// ==========================================
let currentLeaderboardMode = 2; // Estado global: por defecto inicia en 2 variables

// FUNCIÓN PARA CAMBIAR DE PESTAÑA (2 O 3 VARIABLES)
async function switchLeaderboardMode(mode) {
    currentLeaderboardMode = Number(mode);
    
    // Actualizar visualmente la pestaña activa
    const btn2 = document.getElementById('btn-tab-2');
    const btn3 = document.getElementById('btn-tab-3');
    
    if (btn2 && btn3) {
        btn2.classList.toggle('active', currentLeaderboardMode === 2);
        btn3.classList.toggle('active', currentLeaderboardMode === 3);
    }

    // Volver a cargar la tabla con el modo seleccionado
    await loadLeaderboard();
}

// ABRIR EL MODAL (POR DEFECTO EN EL MODO ACTUAL)
async function openLeaderboardModal() {
    const modal = document.getElementById('modal-leaderboard');
    if (modal) modal.classList.remove('hidden');
    await loadLeaderboard();
}

function closeLeaderboardModal() {
    const modal = document.getElementById('modal-leaderboard');
    if (modal) modal.classList.add('hidden');
}

// CARGAR LA TABLA DESDE FIREBASE
async function loadLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    tbody.innerHTML = '<tr><td colspan="4">Cargando puntuaciones...</td></tr>';

    try {
        // Le pasamos la constante 'logix' y el modo actual (2 o 3)
        const scores = await getTopScores('logix', currentLeaderboardMode, 10);

        if (!scores || scores.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4">Aún no hay puntuaciones en el modo ${currentLeaderboardMode} variables. ¡Sé el primero!</td></tr>`;
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
// 9. EXPOSICIÓN GLOBAL A WINDOW
// ==========================================
window.startGame = startGame;
window.checkAnswer = checkAnswer;
window.loadNextDoor = loadNextDoor;
window.confirmEndGame = confirmEndGame;
window.showScreen = showScreen;
window.toggleAudio = toggleAudio;
window.openAudioSettings = openAudioSettings;
window.closeAudioSettings = closeAudioSettings;
window.updateVolumes = updateVolumes;
window.toggleSwitch = toggleSwitch;
window.openLeaderboardModal = openLeaderboardModal;
window.closeLeaderboardModal = closeLeaderboardModal;
// Al final de tu archivo JavaScript (donde declaraste la función)
window.switchLeaderboardMode = switchLeaderboardMode;
window.openLeaderboardModal = openLeaderboardModal;
window.closeLeaderboardModal = closeLeaderboardModal;
window.selectGameMode = selectGameMode;
window.startTeamGame = startTeamGame;
window.goToNextDoor = goToNextDoor;
window.finishTeamGame = finishTeamGame;
window.rematchTeamGame = rematchTeamGame;
window.returnToCover = returnToCover;
window.continueFromStory = continueFromStory;