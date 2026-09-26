import { generarPoolNexus, probarHackers } from './nexus_questions.js';
import { saveScore, getTopScores } from './leaderboard.js';

// ==========================================
// 1. SISTEMA DE AUDIO Y NAVEGACIÓN
// ==========================================
const sounds = {
    bg: new Audio('audio/nexus/bg-music.mp3'),
    correct: new Audio('audio/nexus/correct.mp3'),
    wrong: new Audio('audio/nexus/wrong.mp3'),
    victory: new Audio('audio/nexus/victory.mp3'),
    click: new Audio('audio/nexus/click.mp3')
};
sounds.bg.loop = true;

let isAudioActive = true;
let bgVolume = 0.8;
let sfxVolume = 0.9;

function applyVolumes() {
    const btn = document.getElementById('btn-audio');
    if (isAudioActive) {
        sounds.bg.volume = bgVolume;
        if (btn) btn.innerText = '🔊 Sound ON';
        sounds.bg.play().catch(() => {});
    } else {
        sounds.bg.pause();
        if (btn) btn.innerText = '🔇 Sound OFF';
    }
}

function updateVolumes() {
    bgVolume = parseFloat(document.getElementById('vol-music').value);
    sfxVolume = parseFloat(document.getElementById('vol-sfx').value);
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
    document.getElementById('modal-settings').classList.remove('hidden');
}

function closeAudioSettings() {
    document.getElementById('modal-settings').classList.add('hidden');
}

function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(screenId);
    if (target) target.classList.remove('hidden');
}

document.addEventListener('click', function(event) {
    if (event.target.tagName === 'BUTTON' || event.target.closest('button')) {
        playSFX('click');
    }
});

// Función para procesar y renderizar expresiones de MathJax / KaTeX ($...$)
function renderizarMath(contenedorId = 'question-card') {
    if (window.renderMathInElement) {
        const elem = document.getElementById(contenedorId);
        if (elem) {
            window.renderMathInElement(elem, {
                delimiters: [
                    { left: "$$", right: "$$", display: true },
                    { left: "$", right: "$", display: false }
                ],
                throwOnError: false
            });
        }
    }
}

// Eventos de Portada
const screenCover = document.getElementById('screen-cover');
function startFromCover() {
    if (screenCover && !screenCover.classList.contains('hidden')) {
        showScreen('screen-config-1');
    }
}

if (screenCover) screenCover.addEventListener('click', startFromCover);

document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        if (screenCover && !screenCover.classList.contains('hidden')) {
            startFromCover();
        } else {
            const consoleBox = document.getElementById('answers-console');
            if (consoleBox && !consoleBox.classList.contains('hidden')) {
                checkConsoleAnswer();
            }
        }
    }
});

// ==========================================
// 2. ESTADO DEL JUEGO
// ==========================================
let gameState = {
    modo: 'solitario',
    jugador: 'CyberPhantom',
    equipoA: 'CyberPhantom',
    equipoB: 'NetGuardians',
    turnoActual: 0,
    cantidadTotal: 21,
    tiempoMaximo: 0,
    poolPreguntas: [],
    indicePregunta: 0,
    puntuacionSolitario: 0,
    puntuacionEquipoA: 0,
    puntuacionEquipoB: 0,
    timerInterval: null,
    tiempoRestante: 0,
    estadisticas: null,
    respuestaBloqueada: false
};

let nexusTruthSwitches = [];

let nexusCableState = {
    seleccionadoIzquierda: null,
    seleccionadoDerecha: null,
    conectados: new Set(),
    errores: 0,
    total: 0
};

function selectGameMode(mode) {
    gameState.modo = mode;
    const playerInputs = document.getElementById('player-inputs');
    const teamInputs = document.getElementById('team-inputs');
    const selectQuantity = document.getElementById('select-quantity');

    if (mode === 'solitario') {
        playerInputs.classList.remove('hidden');
        teamInputs.classList.add('hidden');
        selectQuantity.innerHTML = `
            <option value="14" selected>14 Reactivos Aleatorios (2 por Mundo)</option>
            <option value="21">21 Reactivos Aleatorios (3 por Mundo)</option>
            <option value="35">35 Reactivos Aleatorios (5 por Mundo)</option>
        `;
    } else {
        playerInputs.classList.add('hidden');
        teamInputs.classList.remove('hidden');
        selectQuantity.innerHTML = `
            <option value="10" selected>10 Reactivos (5 por Equipo)</option>
            <option value="20">20 Reactivos (10 por Equipo)</option>
            <option value="30">30 Reactivos (15 por Equipo)</option>
        `;
    }
    showScreen('screen-config-2');
}

function crearEstadisticasPartida() {
    return {
        totalRespondidos: 0,
        correctas: 0,
        incorrectas: 0,
        agotadosPorTiempo: 0,

        porMundo: {
            logica: {
                total: 0,
                correctas: 0
            },
            numeracion: {
                total: 0,
                correctas: 0
            },
            reales: {
                total: 0,
                correctas: 0
            },
            fracciones: {
                total: 0,
                correctas: 0
            },
            potencias: {
                total: 0,
                correctas: 0
            },
            medicion: {
                total: 0,
                correctas: 0
            },
            jerarquia: {
                total: 0,
                correctas: 0
            }
        }
    };
}


function iniciarPartida(event) {
    if (event) event.preventDefault();

    if (gameState.modo === 'solitario') {
        const val = document.getElementById('player-name').value.trim();
        gameState.jugador = val !== "" ? val : "CyberPhantom";
    } else {
        const tA = document.getElementById('team-1-name').value.trim();
        const tB = document.getElementById('team-2-name').value.trim();
        gameState.equipoA = tA !== "" ? tA : "CyberPhantom";
        gameState.equipoB = tB !== "" ? tB : "NetGuardians";
    }

    gameState.cantidadTotal = parseInt(document.getElementById('select-quantity').value, 10);
    gameState.tiempoMaximo = parseInt(document.getElementById('select-timer').value, 10);

    gameState.indicePregunta = 0;
    gameState.turnoActual = 0;
    gameState.estadisticas = crearEstadisticasPartida();
    gameState.puntuacionSolitario = 0;
    gameState.puntuacionEquipoA = 0;
    gameState.puntuacionEquipoB = 0;

    

    // Se generan reactivos aleatorios con la misma lógica dinámica de Hackers
    gameState.poolPreguntas = generarPoolNexus(gameState.cantidadTotal);

    console.table(
        gameState.poolPreguntas.map((r, i) => ({
            numero: i + 1,
            mundo: r?.areaNombre ?? '⚠️ UNDEFINED',
            tipo: r?.tipo ?? '⚠️ UNDEFINED',
            pregunta: r?.pregunta ?? '⚠️ SIN REACTIVO',
            opciones: r?.opciones?.length ?? 0
        }))
    );

    gameState.poolPreguntas.forEach((r, i) => {
        if (!r) {
            console.error(
                `🚨 Reactivo undefined en posición ${i + 1}`
            );
        }
    });

    showScreen('screen-game');
    cargarPreguntaActual();
}

// ==========================================
// 3. DESPLIEGUE DE REACTIVOS Y CONTROL
// ==========================================
function cargarPreguntaActual() {
    detenerTemporizador();

    gameState.respuestaBloqueada = false;

    // Limpiar retroalimentación anterior
    const feedback = document.getElementById('answer-feedback');
    const feedbackTitle = document.getElementById('feedback-title');
    const feedbackDetail = document.getElementById('feedback-detail');

    if (feedback) {
        feedback.classList.add('hidden');
        feedback.classList.remove('correct', 'incorrect');
    }

    if (feedbackTitle) {
        feedbackTitle.innerHTML = '';
    }

    if (feedbackDetail) {
        feedbackDetail.innerHTML = '';
    }


    const reactivo = gameState.poolPreguntas[gameState.indicePregunta];
    console.log('🔬 REACTIVO ACTUAL:', reactivo);
    console.log('🔬 TIPO:', reactivo.tipo);
    console.log('🔬 OPCIONES:', reactivo.opciones);
    const turnIndicator = document.getElementById('turn-indicator');
    const areaBadge = document.getElementById('area-badge');
    const questionProgress = document.getElementById('question-progress');
    const questionText = document.getElementById('question-text');
    const answersMultiple = document.getElementById('answers-multiple');
    const answersConsole = document.getElementById('answers-console');
    const answersTruthTable = document.getElementById('answers-truth-table');
    const ancientContainer = document.getElementById('ancient-number-container');
    const timerVal = document.getElementById('timer-val');
    const classificationContainer = document.getElementById('real-classification-container');
    const cablesContainer = document.getElementById('hackers-cables-container');
    const factorTreeContainer = document.getElementById('factor-tree-container');

    answersMultiple.classList.add('hidden');
    answersConsole.classList.add('hidden');
    answersTruthTable.classList.add('hidden');
    ancientContainer.classList.add('hidden');
    classificationContainer.classList.add('hidden');
    cablesContainer.classList.add('hidden');
    factorTreeContainer.classList.add('hidden');
    
    answersMultiple.innerHTML = '';

    if (gameState.modo === 'solitario') {
        turnIndicator.innerText = `Jugador: ${gameState.jugador}`;
        turnIndicator.style.color = 'var(--cyan-neon)';
    } else {
        const equipoActivo = gameState.turnoActual === 0 ? gameState.equipoA : gameState.equipoB;
        turnIndicator.innerText = `Turno: ${equipoActivo}`;
        turnIndicator.style.color = gameState.turnoActual === 0 ? 'var(--cyan-neon)' : 'var(--gold-accent)';
    }

    areaBadge.innerHTML = `${reactivo.areaIcono || '⚡'} ${reactivo.areaNombre || 'Nexus Math'}`;
    questionProgress.innerText = `Enigma ${gameState.indicePregunta + 1} de ${gameState.cantidadTotal}`;
    questionText.innerHTML = reactivo.pregunta;

    // Renderizar según el tipo de reactivo (Opción Múltiple, Verdadero/Falso o Consola)
    if (reactivo.tipo === 'opcion_multiple' || reactivo.tipo === 'verdadero_falso') {
        answersConsole.classList.add('hidden');
        answersMultiple.classList.remove('hidden');
        
        answersMultiple.innerHTML = '';
        const opciones = reactivo.opciones || ["Verdadero", "Falso"];
        opciones.forEach(opc => {
            const btn = document.createElement('button');
            btn.className = 'answer-btn';
            btn.innerHTML = opc;
            btn.onclick = () => procesarRespuesta(opc);
            answersMultiple.appendChild(btn);
        });
    } else if (reactivo.tipo === 'tabla_verdad') {
        answersTruthTable.classList.remove('hidden');
        renderizarTablaVerdadNexus(reactivo);
    }
    
    else if (reactivo.tipo === 'numero_antiguo') {
        // Mostrar representación visual de ArqueoMat
        ancientContainer.classList.remove('hidden');
        renderizarNumeroAntiguoNexus(reactivo);

        // ==========================================
        // OPCIÓN MÚLTIPLE
        // ==========================================

        if (reactivo.modoRespuesta === 'opcion_multiple') {

            answersConsole.classList.add('hidden');
            answersMultiple.classList.remove('hidden');

            // Limpiar botones del reactivo anterior
            answersMultiple.innerHTML = '';

            const opciones = reactivo.opciones || [];

            opciones.forEach(opcion => {

                const btn =
                    document.createElement('button');

                btn.className = 'answer-btn';

                btn.innerHTML = opcion;

                btn.onclick = () =>
                    procesarRespuesta(opcion);

                answersMultiple.appendChild(btn);
            });
        }

        // ==========================================
        // RESPUESTA DIRECTA / CONSOLA
        // ==========================================

        else {

            answersMultiple.classList.add('hidden');
            answersConsole.classList.remove('hidden');

            const input =
                document.getElementById('console-input');

            const submitButton =
                document.getElementById(
                    'btn-submit-console'
                );

            if (input) {
                input.disabled = false;
                input.value = '';
                input.focus();
            }

            if (submitButton) {
                submitButton.disabled = false;
            }
        }
    }

    else if (reactivo.tipo === 'clasificacion_real') {
        classificationContainer.classList.remove('hidden');
        renderizarClasificacionRealNexus(reactivo);
    }

    else if (reactivo.tipo === 'cables_hackers') {
        cablesContainer.classList.remove('hidden');
        renderizarCablesHackersNexus(reactivo);
    }

    else if (reactivo.tipo === 'arbol_factorizacion') {
        factorTreeContainer.classList.remove('hidden');
        renderizarArbolFactorizacionNexus(reactivo);
    }

    else {

        answersMultiple.classList.add('hidden');
        answersConsole.classList.remove('hidden');

        const input =
            document.getElementById('console-input');

        const submitButton =
            document.getElementById('btn-submit-console');

        input.disabled = false;
        input.value = '';

        if (submitButton) {
            submitButton.disabled = false;
        }

        input.focus();
    }

    // Renderizado visual de LaTeX con KaTeX
    setTimeout(() => {
        renderizarMath('question-card');
    }, 10);

    if (gameState.tiempoMaximo > 0) {
        gameState.tiempoRestante = gameState.tiempoMaximo;
        timerVal.innerText = gameState.tiempoRestante;
        gameState.timerInterval = setInterval(actualizarCronometro, 1000);
    } else {
        timerVal.innerText = '∞';
    }

    console.log('🧭 FIN DE RENDER:', {
        pregunta: reactivo.pregunta,
        tipo: reactivo.tipo,
        opciones: reactivo.opciones,
        multipleHidden: answersMultiple.classList.contains('hidden'),
        cantidadBotones: answersMultiple.children.length,
        consoleHidden: answersConsole.classList.contains('hidden')
    });

    if (
        (reactivo.tipo === 'opcion_multiple' ||
        reactivo.tipo === 'verdadero_falso') &&
        (
            answersMultiple.classList.contains('hidden') ||
            answersMultiple.children.length === 0
        )
    ) {
        console.error(
            '🚨 FALLO DE RENDER DETECTADO:',
            {
                reactivo,
                multipleHidden:
                    answersMultiple.classList.contains('hidden'),
                cantidadBotones:
                    answersMultiple.children.length
            }
        );
    }
}

function actualizarCronometro() {
    gameState.tiempoRestante--;
    document.getElementById('timer-val').innerText = gameState.tiempoRestante;

    if (gameState.tiempoRestante <= 0) {
        detenerTemporizador();
        procesarRespuesta(null);
    }
}

function detenerTemporizador() {
    if (gameState.timerInterval) {
        clearInterval(gameState.timerInterval);
        gameState.timerInterval = null;
    }
}

function checkConsoleAnswer() {
    const input = document.getElementById('console-input');
    const userVal = input.value.trim();
    if (userVal !== "") {
        procesarRespuesta(userVal);
    }
}

function registrarEstadisticaReactivo(reactivo, esCorrecta, respuestaUsuario) {

    if (!gameState.estadisticas || !reactivo) {
        return;
    }

    const stats = gameState.estadisticas;

    // -----------------------------
    // Estadísticas globales
    // -----------------------------

    stats.totalRespondidos++;

    if (esCorrecta) {
        stats.correctas++;
    } else {
        stats.incorrectas++;
    }

    if (respuestaUsuario === null) {
        stats.agotadosPorTiempo++;
    }


    // -----------------------------
    // Estadísticas por mundo
    // -----------------------------

    const areaId = reactivo.areaId;

    if (
        areaId &&
        stats.porMundo[areaId]
    ) {
        stats.porMundo[areaId].total++;

        if (esCorrecta) {
            stats.porMundo[areaId].correctas++;
        }
    } else {
        console.warn(
            'Reactivo sin área válida para estadísticas:',
            reactivo
        );
    }
}

function procesarRespuesta(respuestaUsuario) {

    // Evitar respuestas dobles durante la retroalimentación
    if (gameState.respuestaBloqueada) return;

    gameState.respuestaBloqueada = true;

    detenerTemporizador();

    const reactivo =
        gameState.poolPreguntas[gameState.indicePregunta];

    // Normalización flexible de respuestas
    const normalizar = str =>
        String(str || '')
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '');

    //const esCorrecta =
    //    respuestaUsuario !== null &&
    //    normalizar(respuestaUsuario) ===
    //   normalizar(reactivo.respuestaCorrecta);
    let esCorrecta = false;

    if (
        reactivo.tipo === 'tabla_verdad' &&
        Array.isArray(respuestaUsuario) &&
        Array.isArray(reactivo.respuestaCorrecta)
    ) {

        esCorrecta =
            respuestaUsuario.length ===
            reactivo.respuestaCorrecta.length &&

            respuestaUsuario.every(
                (valor, index) =>
                    valor ===
                    reactivo.respuestaCorrecta[index]
            );

    } else {

        esCorrecta =
            respuestaUsuario !== null &&
            normalizar(respuestaUsuario) ===
            normalizar(reactivo.respuestaCorrecta);

    }


    registrarEstadisticaReactivo(
        reactivo,
        esCorrecta,
        respuestaUsuario
    );

    // ==========================================
    // BLOQUEAR CONTROLES
    // ==========================================

    const botones =
        document.querySelectorAll('#answers-multiple button');

    botones.forEach(btn => {
        btn.disabled = true;
    });

    const consoleInput =
        document.getElementById('console-input');

    const consoleButton =
        document.getElementById('btn-submit-console');

    if (consoleInput) {
        consoleInput.disabled = true;
    }

    if (consoleButton) {
        consoleButton.disabled = true;
    }

    document
        .querySelectorAll('.nexus-switch-btn')
        .forEach(btn => {
            btn.disabled = true;
        });

    const truthSubmit =
        document.getElementById('btn-submit-truth');

    if (truthSubmit) {
        truthSubmit.disabled = true;
    }

    // BLOQUEO HACKERS
    document
        .querySelectorAll('.nexus-classification-port')
        .forEach(port => {

            port.disabled = true;

        });


    const dataCapsule =
        document.getElementById('real-data-capsule');

    if (dataCapsule) {

        dataCapsule.setAttribute(
            'draggable',
            'false'
        );
    }



    // ==========================================
    // ACTUALIZAR PUNTUACIÓN
    // ==========================================

    if (esCorrecta) {

        playSFX('correct');

        if (gameState.modo === 'solitario') {
            gameState.puntuacionSolitario++;
        }

        else if (gameState.turnoActual === 0) {
            gameState.puntuacionEquipoA++;
        }

        else {
            gameState.puntuacionEquipoB++;
        }

    } else {

        playSFX('wrong');

    }


    if (
        reactivo.tipo === 'tabla_verdad' &&
        !esCorrecta
    ) {

        revelarTablaVerdadCorrecta(
            reactivo.respuestaCorrecta
        );
    }

    // ==========================================
    // MOSTRAR RETROALIMENTACIÓN
    // ==========================================

    mostrarRetroalimentacion(
        esCorrecta,
        reactivo.respuestaCorrecta,
        respuestaUsuario
    );


    // ==========================================
    // ESPERAR 2 SEGUNDOS
    // ==========================================

    setTimeout(() => {

        if (gameState.modo === 'equipos') {

            gameState.turnoActual =
                gameState.turnoActual === 0 ? 1 : 0;

        }

        gameState.indicePregunta++;


        if (
            gameState.indicePregunta <
            gameState.cantidadTotal
        ) {

            cargarPreguntaActual();

        } else {

            finalizarPartida();

        }

    }, 2000);

}

function mostrarRetroalimentacion(
    esCorrecta,
    respuestaCorrecta,
    respuestaUsuario
) {

    const feedback =
        document.getElementById('answer-feedback');

    const title =
        document.getElementById('feedback-title');

    const detail =
        document.getElementById('feedback-detail');


    if (!feedback || !title || !detail) return;


    feedback.classList.remove(
        'hidden',
        'correct',
        'incorrect'
    );


    if (esCorrecta) {

        feedback.classList.add('correct');

        title.innerHTML =
            '✓ ACCESO CONCEDIDO';

        detail.innerHTML =
            'Respuesta correcta.';

    } else {

        feedback.classList.add('incorrect');

        title.innerHTML =
            '✕ ACCESO DENEGADO';

        if (Array.isArray(respuestaCorrecta)) {

            detail.innerHTML =
                `Clave correcta revelada en la tabla.`;

        } else if (respuestaUsuario === null) {

            detail.innerHTML =
                `Tiempo agotado.<br>
                Respuesta correcta:
                <strong>${respuestaCorrecta}</strong>`;

        } else {

            detail.innerHTML =
                `Respuesta correcta:
                <strong>${respuestaCorrecta}</strong>`;
        }
    }


    // Renderizar LaTeX si la respuesta contiene fórmulas
    setTimeout(() => {
        renderizarMath('answer-feedback');
    }, 10);
}

function confirmEndGame() {
    if (confirm("¿Deseas abortar la sesión actual de El Nexus?")) {
        detenerTemporizador();
        showScreen('screen-cover');
    }
}

function finalizarPartida() {

    detenerTemporizador();

    if (gameState.modo === 'solitario') {
        mostrarReporteSolitario();
    } else {
        mostrarResultadoEquipos();
    }
}

function mostrarResultadoEquipos() {

    const nombreEquipo1 =
        document.getElementById('team-result-name-1');

    const nombreEquipo2 =
        document.getElementById('team-result-name-2');

    const puntajeEquipo1 =
        document.getElementById('team-result-score-1');

    const puntajeEquipo2 =
        document.getElementById('team-result-score-2');

    const ganador =
        document.getElementById('team-winner-name');

    const etiquetaGanador =
        document.querySelector('.team-winner-label');


    const tarjetas =
        document.querySelectorAll('.team-score-card');

    const tarjetaEquipoA = tarjetas[0];
    const tarjetaEquipoB = tarjetas[1];

    tarjetaEquipoA.classList.remove('winner');
    tarjetaEquipoB.classList.remove('winner');

    // ==========================================
    // MOSTRAR MARCADOR FINAL
    // ==========================================

    nombreEquipo1.textContent =
        gameState.equipoA;

    nombreEquipo2.textContent =
        gameState.equipoB;

    puntajeEquipo1.textContent =
        gameState.puntuacionEquipoA;

    puntajeEquipo2.textContent =
        gameState.puntuacionEquipoB;


    // ==========================================
    // DETERMINAR GANADOR O EMPATE
    // ==========================================

    if (
        gameState.puntuacionEquipoA >
        gameState.puntuacionEquipoB
    ) {

        etiquetaGanador.textContent =
            '🏆 EQUIPO GANADOR';

        ganador.textContent =
            gameState.equipoA;

        tarjetaEquipoA.classList.add('winner');
    }

    else if (
        gameState.puntuacionEquipoB >
        gameState.puntuacionEquipoA
    ) {

        etiquetaGanador.textContent =
            '🏆 EQUIPO GANADOR';

        ganador.textContent =
            gameState.equipoB;
        
        tarjetaEquipoB.classList.add('winner');
    }

    else {

        etiquetaGanador.textContent =
            '⚔️ RESULTADO FINAL';

        ganador.textContent =
            '¡EMPATE!';
    }


    // ==========================================
    // MOSTRAR PANTALLA
    // ==========================================

    showScreen('screen-team-result');
    playSFX('victory');
}

// ==========================================
// REPORTE FINAL - MODO SOLITARIO
// ==========================================

function mostrarReporteSolitario() {

    const stats = gameState.estadisticas;

    if (!stats) {
        console.error('No existen estadísticas para generar el reporte.');
        return;
    }

    // --------------------------------------
    // DATOS GENERALES
    // --------------------------------------

    document.getElementById('report-player').innerText =
        gameState.jugador;

    document.getElementById('report-quantity').innerText =
        gameState.cantidadTotal;

    document.getElementById('report-timer').innerText =
        gameState.tiempoMaximo === 0
            ? 'Sin límite'
            : `${gameState.tiempoMaximo} segundos`;


    // --------------------------------------
    // RESULTADO GLOBAL
    // --------------------------------------

    const efectividad =
        stats.totalRespondidos > 0
            ? Math.round(
                (stats.correctas / stats.totalRespondidos) * 100
              )
            : 0;


    document.getElementById('report-correct').innerText =
        stats.correctas;

    document.getElementById('report-total').innerText =
        stats.totalRespondidos;

    document.getElementById('report-effectiveness').innerText =
        `${efectividad}%`;

    document.getElementById('report-summary-correct').innerText =
        stats.correctas;

    document.getElementById('report-summary-wrong').innerText =
        stats.incorrectas;

    document.getElementById('report-summary-timeout').innerText =
        stats.agotadosPorTiempo;


    // --------------------------------------
    // RESULTADO POR MUNDO
    // --------------------------------------

    const mundos = [
        { id: 'logica',      icono: '🧠', nombre: 'Salida Lógica' },
        { id: 'numeracion',  icono: '🏺', nombre: 'ArqueoMat' },
        { id: 'reales',      icono: '💻', nombre: 'Operación Hackers' },
        { id: 'fracciones',  icono: '⚗️', nombre: 'Alquimia Matemática' },
        { id: 'potencias',   icono: '🏴‍☠️', nombre: 'Navegantes del Abismo' },
        { id: 'medicion',    icono: '🚀', nombre: 'Horizonte Cósmico' },
        { id: 'jerarquia',   icono: '🛡️', nombre: 'Guardianes del Orden' }
    ];


    const contenedor =
        document.getElementById('report-worlds-list');

    contenedor.innerHTML = '';


    mundos.forEach(mundo => {

        const datos =
            stats.porMundo[mundo.id] || {
                total: 0,
                correctas: 0
            };

        const porcentaje =
            datos.total > 0
                ? Math.round(
                    (datos.correctas / datos.total) * 100
                  )
                : 0;


        const fila = document.createElement('div');

        fila.className = 'report-world-item';

        fila.innerHTML = `
            <div class="report-world-top">

                <div class="report-world-name">
                    <span class="report-world-icon">
                        ${mundo.icono}
                    </span>

                    <span>
                        ${mundo.nombre}
                    </span>
                </div>

                <div class="report-world-result">
                    <strong>
                        ${datos.correctas} / ${datos.total}
                    </strong>

                    <span class="report-world-percent">
                        ${porcentaje}%
                    </span>
                </div>

            </div>

            <div class="report-world-bar">
                <div
                    class="report-world-bar-fill"
                    style="width: ${porcentaje}%;">
                </div>
            </div>
        `;

        contenedor.appendChild(fila);
    });


    showScreen('screen-report');
    playSFX('victory');

    // ==========================================
    // GUARDAR RESULTADO EN LEADERBOARD
    // ==========================================

    if (stats.totalRespondidos > 0) {

        try {

            const modeKey =
                `solo_${gameState.cantidadTotal}_${gameState.tiempoMaximo}`;

            saveScore({
                gameId: 'nexus',
                gameTitle: 'El Nexus',
                studentName: gameState.jugador,
                mode: modeKey,
                score: stats.correctas,
                effectiveness: efectividad,
                details:
                    `Reactivos: ${gameState.cantidadTotal} | ` +
                    `Tiempo: ${
                        gameState.tiempoMaximo === 0
                            ? 'Sin límite'
                            : gameState.tiempoMaximo + ' s'
                    }`
            }).catch(error => {

                console.error(
                    'Error al guardar puntuación de Nexus:',
                    error
                );

            });

        } catch (error) {

            console.error(
                'Error al guardar puntuación de Nexus:',
                error
            );
        }
    }
    
}


// ==========================================
// NAVEGACIÓN DESDE RESULTADOS
// ==========================================

function restartGame() {

    detenerTemporizador();

    showScreen('screen-config-1');
}


function returnToCover() {

    detenerTemporizador();

    showScreen('screen-cover');
}

// ==========================================
// TABLA DE POSICIONES - NEXUS
// ==========================================

async function openLeaderboardModal() {

    const modal =
        document.getElementById('modal-leaderboard');

    if (modal) {
        modal.classList.remove('hidden');
    }

    await loadLeaderboard();
}


function closeLeaderboardModal() {

    const modal =
        document.getElementById('modal-leaderboard');

    if (modal) {
        modal.classList.add('hidden');
    }
}


async function onLeaderboardFilterChange() {

    await loadLeaderboard();
}


async function loadLeaderboard() {

    const tbody =
        document.getElementById('leaderboard-body');

    const quantitySelect =
        document.getElementById(
            'leaderboard-quantity-select'
        );

    const timerSelect =
        document.getElementById(
            'leaderboard-timer-select'
        );


    if (
        !tbody ||
        !quantitySelect ||
        !timerSelect
    ) {
        return;
    }


    const cantidad =
        parseInt(quantitySelect.value, 10);

    const tiempo =
        parseInt(timerSelect.value, 10);


    const modeKey =
        `solo_${cantidad}_${tiempo}`;


    tbody.innerHTML = `
        <tr>
            <td colspan="4">
                Cargando puntuaciones...
            </td>
        </tr>
    `;


    try {

        const scores =
            await getTopScores(
                'nexus',
                modeKey,
                10
            );


        if (!scores || scores.length === 0) {

            tbody.innerHTML = `
                <tr>
                    <td colspan="4">
                        Sin registros para esta modalidad.
                        ¡Sé el primero en conquistar El Nexus!
                    </td>
                </tr>
            `;

            return;
        }


        tbody.innerHTML = '';


        scores.forEach((item, index) => {

            const fila =
                document.createElement('tr');


            const posicion =
                index === 0
                    ? '🥇'
                    : index === 1
                        ? '🥈'
                        : index === 2
                            ? '🥉'
                            : index + 1;


            fila.innerHTML = `
                <td>${posicion}</td>
                <td>
                    <strong>${item.studentName}</strong>
                </td>
                <td>${item.score} / ${cantidad}</td>
                <td>${item.effectiveness}%</td>
            `;


            tbody.appendChild(fila);
        });


    } catch (error) {

        console.error(
            'Error cargando leaderboard de Nexus:',
            error
        );

        tbody.innerHTML = `
            <tr>
                <td colspan="4">
                    No se pudo cargar la tabla de posiciones.
                </td>
            </tr>
        `;
    }
}

// ----------------------------------------
// FUNCIONES PARA SALIDA LOGICA
// ----------------------------------------

function renderizarTablaVerdadNexus(reactivo) {

    const container =
        document.getElementById('nexus-truth-table');

    nexusTruthSwitches =
        new Array(reactivo.filas.length).fill(false);

    let html = `
        <div class="nexus-truth-expression">
            EXPRESIÓN:
            <strong>${reactivo.expresion}</strong>
        </div>

        <div class="nexus-truth-scroll">

            <table class="nexus-truth-table">

                <thead>
                    <tr>
    `;


    reactivo.variables.forEach(variable => {

        html += `<th>${variable}</th>`;

    });


    html += `
                        <th>RESULTADO</th>
                    </tr>
                </thead>

                <tbody>
    `;


    reactivo.filas.forEach((fila, index) => {

        html += `<tr>`;

        reactivo.variables.forEach(variable => {

            html += `
                <td>
                    ${fila[variable] ? 'V' : 'F'}
                </td>
            `;

        });


        html += `
            <td>

                <button
                    type="button"
                    class="nexus-switch-btn"
                    id="truth-switch-${index}"
                    onclick="toggleNexusTruthSwitch(${index})">

                    F

                </button>

            </td>
        `;

        html += `</tr>`;
    });


    html += `
                </tbody>

            </table>

        </div>
    `;


    container.innerHTML = html;


    const submit =
        document.getElementById('btn-submit-truth');

    if (submit) {
        submit.disabled = false;
    }
}

function toggleNexusTruthSwitch(index) {

    if (gameState.respuestaBloqueada) return;

    nexusTruthSwitches[index] =
        !nexusTruthSwitches[index];

    const btn =
        document.getElementById(
            `truth-switch-${index}`
        );

    if (!btn) return;


    const valor =
        nexusTruthSwitches[index];


    btn.innerText =
        valor ? 'V' : 'F';

    btn.classList.toggle(
        'is-true',
        valor
    );
}

function checkTruthTableAnswer() {

    if (gameState.respuestaBloqueada) return;

    procesarRespuesta(
        [...nexusTruthSwitches]
    );
}

function revelarTablaVerdadCorrecta(
    respuestaCorrecta
) {

    respuestaCorrecta.forEach(
        (valor, index) => {

            nexusTruthSwitches[index] =
                valor;

            const btn =
                document.getElementById(
                    `truth-switch-${index}`
                );

            if (!btn) return;

            btn.innerText =
                valor ? 'V' : 'F';

            btn.classList.toggle(
                'is-true',
                valor
            );

            btn.classList.add('revealed');

            btn.disabled = true;
        }
    );
}

// Fin de funciones de salida logica

//-------------------------
// FUNCIONES DE ARQUEOMAT
//-------------------------
function renderizarNumeroAntiguoNexus(reactivo) {

    const container =
        document.getElementById(
            'ancient-number-display'
        );

    const label =
        document.getElementById(
            'ancient-system-label'
        );

    if (!container) return;

    container.innerHTML = '';

    container.className =
        'nexus-ancient-display';

    if (label) {
        label.innerText =
            `SISTEMA ${reactivo.sistemaNombre}`;
    }


    switch (reactivo.sistema) {

        case 'egipcia':

            renderizarEgipcioNexus(
                reactivo.numero,
                container
            );

            break;


        case 'mesopotamica':

            renderizarMesopotamicoNexus(
                reactivo.numero,
                container
            );

            break;


        case 'maya':

            renderizarMayaNexus(
                reactivo.numero,
                container
            );

            break;


        default:

            container.innerHTML =
                'Sistema no reconocido.';
    }
}

const NEXUS_SYMBOLS_EGYPT = [

    { val: 1000000, char: '𓁨' },
    { val: 100000,  char: '𓆐' },
    { val: 10000,   char: '𓂭' },
    { val: 1000,    char: '𓆼' },
    { val: 100,     char: '𓍢' },
    { val: 10,      char: '∩' },
    { val: 1,       char: '|' }

];

function crearMatrizSimbolosNexus(
    cantidad,
    caracter,
    claseSimbolo
) {

    const matriz =
        document.createElement('div');

    matriz.className =
        'nexus-symbol-matrix';


    /*
        Distribución estilo ArqueoMat:

        4 = 1 + 3
        5 = 2 + 3
        6 = 3 + 3
        7 = 1 + 3 + 3
        8 = 2 + 3 + 3
        9 = 3 + 3 + 3
    */

    const filas = [];

    let restantes = cantidad;


    while (restantes > 3) {

        filas.unshift(3);

        restantes -= 3;
    }


    if (restantes > 0) {
        filas.unshift(restantes);
    }


    filas.forEach(cantidadFila => {

        const fila =
            document.createElement('div');

        fila.className =
            'nexus-symbol-row';


        for (
            let i = 0;
            i < cantidadFila;
            i++
        ) {

            const simbolo =
                document.createElement('span');

            simbolo.className =
                claseSimbolo;

            simbolo.innerText =
                caracter;

            fila.appendChild(simbolo);
        }


        matriz.appendChild(fila);
    });


    return matriz;
}

function renderizarEgipcioNexus(
    numero,
    container
) {

    let restante = numero;

    container.classList.add(
        'nexus-egyptian-number'
    );


    NEXUS_SYMBOLS_EGYPT.forEach(item => {

        const cantidad =
            Math.floor(restante / item.val);

        restante %= item.val;


        if (cantidad <= 0) return;


        const grupo =
            document.createElement('div');

        grupo.className =
            'nexus-egypt-digit-group';


        const matriz =
            crearMatrizSimbolosNexus(
                cantidad,
                item.char,
                'nexus-egypt-symbol'
            );

        grupo.appendChild(matriz);


        container.appendChild(grupo);
    });
}

function renderizarMesopotamicoNexus(
    numero,
    container
) {

    let restante = numero;

    const digitosBase60 = [];


    while (restante > 0) {

        digitosBase60.unshift(
            restante % 60
        );

        restante =
            Math.floor(restante / 60);
    }


    container.classList.add(
        'nexus-mesopotamian-number'
    );


    digitosBase60.forEach(
        (valor, posicion) => {

            const grupo =
                document.createElement('div');

            grupo.className =
                'nexus-meso-digit-group';


            const decenas =
                Math.floor(valor / 10);

            const unidades =
                valor % 10;


            const simbolos =
                document.createElement('div');

            simbolos.className =
                'nexus-meso-symbols';


            if (decenas > 0) {

                const tens =
                    crearMatrizSimbolosNexus(
                        decenas,
                        '𒌋',
                        'nexus-meso-symbol'
                    );

                tens.classList.add(
                    'nexus-meso-tens'
                );

                simbolos.appendChild(tens);
            }


            if (unidades > 0) {

                const ones =
                    crearMatrizSimbolosNexus(
                        unidades,
                        '𒁹',
                        'nexus-meso-symbol'
                    );

                ones.classList.add(
                    'nexus-meso-ones'
                );

                simbolos.appendChild(ones);
            }


            if (valor === 0) {

                const cero =
                    document.createElement('span');

                cero.className =
                    'nexus-meso-zero';

                cero.innerText = '[0]';

                simbolos.appendChild(cero);
            }


            grupo.appendChild(simbolos);


            /*
                Etiqueta posicional.
                Ejemplo:
                x60 | x1
            */

            const potencia =
                digitosBase60.length -
                posicion -
                1;

            const multiplicador =
                60 ** potencia;


            const etiqueta =
                document.createElement('small');

            etiqueta.className =
                'nexus-position-label';

            etiqueta.innerText =
                `×${multiplicador.toLocaleString()}`;


            grupo.appendChild(etiqueta);

            container.appendChild(grupo);
        }
    );
}

function renderizarMayaNexus(
    numero,
    container
) {

    let restante = numero;

    const digitosBase20 = [];


    while (restante > 0) {

        digitosBase20.push(
            restante % 20
        );

        restante =
            Math.floor(restante / 20);
    }


    container.classList.add(
        'nexus-maya-number'
    );


    digitosBase20.forEach(
        (valor, posicion) => {

            const nivel =
                document.createElement('div');

            nivel.className =
                'nexus-maya-level';


            const multiplicador =
                20 ** posicion;


            const etiqueta =
                document.createElement('span');

            etiqueta.className =
                'nexus-position-label';

            etiqueta.innerText =
                `×${multiplicador.toLocaleString()}`;


            nivel.appendChild(etiqueta);


            const simbolos =
                document.createElement('div');

            simbolos.className =
                'nexus-maya-symbols';


            if (valor === 0) {

                const cero =
                    document.createElement('div');

                cero.className =
                    'nexus-maya-zero';

                cero.innerText = '🐚';

                simbolos.appendChild(cero);

            } else {

                const barras =
                    Math.floor(valor / 5);

                const puntos =
                    valor % 5;


                if (puntos > 0) {

                    const dots =
                        document.createElement('div');

                    dots.className =
                        'nexus-maya-dots';

                    dots.innerText =
                        '•'.repeat(puntos);

                    simbolos.appendChild(dots);
                }


                for (
                    let i = 0;
                    i < barras;
                    i++
                ) {

                    const barra =
                        document.createElement('div');

                    barra.className =
                        'nexus-maya-bar';

                    simbolos.appendChild(barra);
                }
            }


            nivel.appendChild(simbolos);

            container.appendChild(nivel);
        }
    );
}

// FIN DE FUNCIONES DE ARQUEOMAT

// --------------------------------
// FUNCIONES DE OPERACION HACKERS
// --------------------------------
// ==========================================================
// FUNCIONES DE OPERACIÓN HACKERS
// Cápsula de clasificación de números reales
// ==========================================================

function renderizarClasificacionRealNexus(reactivo) {

    const capsule =
        document.getElementById('real-data-capsule');

    const value =
        document.getElementById('real-capsule-value');

    const ports =
        document.querySelectorAll(
            '.nexus-classification-port'
        );


    if (!capsule || !value) return;


    // Mostrar valor dentro de la cápsula
    //value.innerHTML =
    //    `\\(${reactivo.valor}\\)`;
    if (typeof katex !== 'undefined') {

        try {

            katex.render(
                reactivo.valor,
                value,
                {
                    throwOnError: false,
                    displayMode: false
                }
            );

        } catch (error) {

            value.textContent = reactivo.valor;
        }

    } else {

        value.textContent = reactivo.valor;
    }

    // Restaurar cápsula
    capsule.style.opacity = '1';

    capsule.setAttribute(
        'draggable',
        'true'
    );


    // Restaurar puertos
    ports.forEach(port => {

        port.disabled = false;

        port.classList.remove(
            'drag-over',
            'selected'
        );

        // Respuesta mediante clic / toque
        port.onclick = () => {

            if (gameState.respuestaBloqueada) return;

            const categoria =
                port.dataset.category;

            procesarRespuesta(categoria);
        };
    });


    // ==========================================
    // DRAG AND DROP
    // ==========================================

    capsule.ondragstart = event => {

        if (gameState.respuestaBloqueada) {
            event.preventDefault();
            return;
        }

        event.dataTransfer.setData(
            'text/plain',
            reactivo.valor
        );

        event.dataTransfer.effectAllowed =
            'move';

        capsule.style.opacity = '0.45';
    };


    capsule.ondragend = () => {

        capsule.style.opacity = '1';

        ports.forEach(port => {
            port.classList.remove('drag-over');
        });
    };


    ports.forEach(port => {

        port.ondragover = event => {

            event.preventDefault();

            if (gameState.respuestaBloqueada) return;

            event.dataTransfer.dropEffect =
                'move';

            port.classList.add('drag-over');
        };


        port.ondragleave = () => {

            port.classList.remove('drag-over');
        };


        port.ondrop = event => {

            event.preventDefault();

            port.classList.remove('drag-over');

            if (gameState.respuestaBloqueada) return;

            const categoria =
                port.dataset.category;

            procesarRespuesta(categoria);
        };
    });


    // Renderizar KaTeX dentro de la cápsula
    //setTimeout(() => {
    //    renderizarMath(
    //        'real-classification-container'
    //    );
    //}, 10);
}

// ==========================================================
// OPERACIÓN HACKERS
// Panel interactivo de cables
// ==========================================================

function renderizarCablesHackersNexus(reactivo) {

    const left =
        document.getElementById('hackers-cables-left');

    const right =
        document.getElementById('hackers-cables-right');

    const svg =
        document.getElementById('hackers-cables-svg');

    const progress =
        document.getElementById('hackers-cables-progress');

    const message =
        document.getElementById('hackers-cables-message');


    if (!left || !right || !svg) return;


    // ------------------------------------------
    // Reiniciar estado
    // ------------------------------------------

    nexusCableState = {
        seleccionadoIzquierda: null,
        seleccionadoDerecha: null,
        conectados: new Set(),
        errores: 0,
        total: reactivo.pares.length
    };


    left.innerHTML = '';
    right.innerHTML = '';
    svg.innerHTML = '';


    progress.textContent =
        `0 / ${reactivo.pares.length} conexiones`;

    message.textContent =
        'Selecciona un conector de cada columna.';


    // ------------------------------------------
    // Mezclar únicamente la columna derecha
    // ------------------------------------------

    const paresDerecha =
        [...reactivo.pares].sort(
            () => Math.random() - 0.5
        );


    // ------------------------------------------
    // Crear nodos izquierdos
    // ------------------------------------------

    reactivo.pares.forEach(par => {

        const nodo =
            crearNodoCableNexus(
                par.id,
                par.izquierda,
                'left'
            );

        left.appendChild(nodo);
    });


    // ------------------------------------------
    // Crear nodos derechos
    // ------------------------------------------

    paresDerecha.forEach(par => {

        const nodo =
            crearNodoCableNexus(
                par.id,
                par.derecha,
                'right'
            );

        right.appendChild(nodo);
    });
}

function crearNodoCableNexus(id, texto, lado) {

    const nodo = document.createElement('button');

    nodo.type = 'button';

    nodo.className =
        `nexus-cable-node nexus-cable-${lado}`;

    nodo.dataset.id = id;
    nodo.dataset.side = lado;


    const textoNodo =
        document.createElement('span');

    textoNodo.className =
        'nexus-cable-text';

    textoNodo.textContent = texto;


    const conector =
        document.createElement('span');

    conector.className =
        'nexus-cable-connector';

    conector.textContent = '●';


    if (lado === 'left') {

        nodo.appendChild(textoNodo);
        nodo.appendChild(conector);

    } else {

        nodo.appendChild(conector);
        nodo.appendChild(textoNodo);
    }


    nodo.addEventListener(
        'click',
        () => seleccionarNodoCableNexus(nodo)
    );

    


    return nodo;
}

function seleccionarNodoCableNexus(nodo) {

    if (gameState.respuestaBloqueada) return;

    if (nodo.classList.contains('matched')) return;


    const lado =
        nodo.dataset.side;


    // ------------------------------------------
    // Selección izquierda
    // ------------------------------------------

    if (lado === 'left') {

        if (nexusCableState.seleccionadoIzquierda) {

            nexusCableState
                .seleccionadoIzquierda
                .classList
                .remove('selected');
        }

        nexusCableState.seleccionadoIzquierda =
            nodo;

        nodo.classList.add('selected');
    }


    // ------------------------------------------
    // Selección derecha
    // ------------------------------------------

    else {

        if (nexusCableState.seleccionadoDerecha) {

            nexusCableState
                .seleccionadoDerecha
                .classList
                .remove('selected');
        }

        nexusCableState.seleccionadoDerecha =
            nodo;

        nodo.classList.add('selected');
    }


    // ------------------------------------------
    // ¿Ya tenemos un nodo de cada lado?
    // ------------------------------------------

    if (
        nexusCableState.seleccionadoIzquierda &&
        nexusCableState.seleccionadoDerecha
    ) {

        verificarConexionCableNexus();
    }
}

function verificarConexionCableNexus() {

    const izquierdo =
        nexusCableState.seleccionadoIzquierda;

    const derecho =
        nexusCableState.seleccionadoDerecha;


    if (!izquierdo || !derecho) return;


    const message =
        document.getElementById(
            'hackers-cables-message'
        );


    const correcto =
        izquierdo.dataset.id ===
        derecho.dataset.id;


    // ==========================================
    // CONEXIÓN CORRECTA
    // ==========================================

    if (correcto) {

        izquierdo.classList.remove('selected');
        derecho.classList.remove('selected');

        izquierdo.classList.add('matched');
        derecho.classList.add('matched');

        izquierdo.disabled = true;
        derecho.disabled = true;


        nexusCableState.conectados.add(
            izquierdo.dataset.id
        );


        dibujarCableNexus(
            izquierdo,
            derecho,
            true
        );


        const completados =
            nexusCableState.conectados.size;


        const progress =
            document.getElementById(
                'hackers-cables-progress'
            );

        progress.textContent =
            `${completados} / ${nexusCableState.total} conexiones`;


        message.textContent =
            '✓ Conexión establecida.';


        // --------------------------------------
        // ¿Panel completo?
        // --------------------------------------

        if (
            completados ===
            nexusCableState.total
        ) {

            finalizarPanelCablesNexus();
        }
    }


    // ==========================================
    // CONEXIÓN INCORRECTA
    // ==========================================

    else {

        nexusCableState.errores++;


        dibujarCableNexus(
            izquierdo,
            derecho,
            false
        );


        izquierdo.classList.add('error');
        derecho.classList.add('error');


        message.textContent =
            '✕ Conexión incorrecta. Intenta nuevamente.';


        setTimeout(() => {

            izquierdo.classList.remove(
                'selected',
                'error'
            );

            derecho.classList.remove(
                'selected',
                'error'
            );

        }, 600);
    }


    nexusCableState.seleccionadoIzquierda =
        null;

    nexusCableState.seleccionadoDerecha =
        null;
}

function dibujarCableNexus(
    nodoIzquierdo,
    nodoDerecho,
    permanente
) {

    const board =
        document.getElementById(
            'hackers-cables-board'
        );

    const svg =
        document.getElementById(
            'hackers-cables-svg'
        );


    if (!board || !svg) return;


    const boardRect =
        board.getBoundingClientRect();

    const leftConnector =
        nodoIzquierdo.querySelector(
            '.nexus-cable-connector'
        );

    const rightConnector =
        nodoDerecho.querySelector(
            '.nexus-cable-connector'
        );


    const leftRect =
        leftConnector.getBoundingClientRect();

    const rightRect =
        rightConnector.getBoundingClientRect();


    const x1 =
        leftRect.left +
        leftRect.width / 2 -
        boardRect.left;

    const y1 =
        leftRect.top +
        leftRect.height / 2 -
        boardRect.top;

    const x2 =
        rightRect.left +
        rightRect.width / 2 -
        boardRect.left;

    const y2 =
        rightRect.top +
        rightRect.height / 2 -
        boardRect.top;


    const linea =
        document.createElementNS(
            'http://www.w3.org/2000/svg',
            'line'
        );


    linea.setAttribute('x1', x1);
    linea.setAttribute('y1', y1);
    linea.setAttribute('x2', x2);
    linea.setAttribute('y2', y2);

    linea.classList.add(
        permanente
            ? 'nexus-cable-line-correct'
            : 'nexus-cable-line-error'
    );


    svg.appendChild(linea);


    // Una conexión incorrecta desaparece
    if (!permanente) {

        setTimeout(() => {

            linea.remove();

        }, 600);
    }
}

function finalizarPanelCablesNexus() {

    const message =
        document.getElementById(
            'hackers-cables-message'
        );


    if (nexusCableState.errores === 0) {

        message.textContent =
            '⚡ Sistema conectado sin errores.';

        procesarRespuesta(
            'panel_completo'
        );

    } else {

        message.textContent =
            `⚠ Sistema conectado con ${nexusCableState.errores} error(es).`;

        procesarRespuesta(
            'panel_con_errores'
        );
    }
}

// ==========================================================
// OPERACIÓN HACKERS
// Árbol interactivo de factorización
// ==========================================================

function renderizarArbolFactorizacionNexus(reactivo) {

    const number =
        document.getElementById('factor-tree-number');

    const inputLeft =
        document.getElementById('factor-tree-input-left');

    const inputRight =
        document.getElementById('factor-tree-input-right');

    const message =
        document.getElementById('factor-tree-message');

    const button =
        document.getElementById('btn-submit-factor-tree');


    if (!number || !inputLeft || !inputRight) return;


    // ------------------------------------------
    // Mostrar número principal
    // ------------------------------------------

    number.textContent = reactivo.numero;


    // ------------------------------------------
    // Restaurar campos
    // ------------------------------------------

    inputLeft.value = '';
    inputRight.value = '';

    inputLeft.disabled = false;
    inputRight.disabled = false;

    inputLeft.classList.remove(
        'correct',
        'incorrect'
    );

    inputRight.classList.remove(
        'correct',
        'incorrect'
    );


    if (button) {
        button.disabled = false;
    }


    if (message) {
        message.textContent =
            'Introduce dos factores del número.';
    }


    // ------------------------------------------
    // ENTER para verificar
    // ------------------------------------------

    inputLeft.onkeydown = event => {

        if (event.key === 'Enter') {

            event.preventDefault();

            inputRight.focus();
        }
    };


    inputRight.onkeydown = event => {

        if (event.key === 'Enter') {

            event.preventDefault();

            checkFactorTreeAnswer();
        }
    };


    // ------------------------------------------
    // Dibujar ramas después de que el navegador
    // haya calculado posiciones
    // ------------------------------------------

    requestAnimationFrame(() => {
        dibujarRamasArbolNexus();
    });


    // Foco inicial
    setTimeout(() => {
        inputLeft.focus();
    }, 100);
}

function dibujarRamasArbolNexus() {

    const board =
        document.getElementById('factor-tree-board');

    const root =
        document.getElementById('factor-tree-number');

    const left =
        document.getElementById('factor-tree-input-left');

    const right =
        document.getElementById('factor-tree-input-right');

    const lineLeft =
        document.getElementById('factor-tree-line-left');

    const lineRight =
        document.getElementById('factor-tree-line-right');


    if (
        !board ||
        !root ||
        !left ||
        !right ||
        !lineLeft ||
        !lineRight
    ) return;


    const boardRect =
        board.getBoundingClientRect();

    const rootRect =
        root.getBoundingClientRect();

    const leftRect =
        left.getBoundingClientRect();

    const rightRect =
        right.getBoundingClientRect();


    // Centro inferior del número principal
    const rootX =
        rootRect.left +
        rootRect.width / 2 -
        boardRect.left;

    const rootY =
        rootRect.bottom -
        boardRect.top;


    // Centro superior del factor izquierdo
    const leftX =
        leftRect.left +
        leftRect.width / 2 -
        boardRect.left;

    const leftY =
        leftRect.top -
        boardRect.top;


    // Centro superior del factor derecho
    const rightX =
        rightRect.left +
        rightRect.width / 2 -
        boardRect.left;

    const rightY =
        rightRect.top -
        boardRect.top;


    lineLeft.setAttribute('x1', rootX);
    lineLeft.setAttribute('y1', rootY);
    lineLeft.setAttribute('x2', leftX);
    lineLeft.setAttribute('y2', leftY);


    lineRight.setAttribute('x1', rootX);
    lineRight.setAttribute('y1', rootY);
    lineRight.setAttribute('x2', rightX);
    lineRight.setAttribute('y2', rightY);
}

function checkFactorTreeAnswer() {

    //console.log('🌳 BOTÓN DEL ÁRBOL ACTIVADO');
    //console.log('🌳 gameState actual:', gameState);
    //return;
    if (gameState.respuestaBloqueada) return;


    const reactivo =
        gameState.poolPreguntas[
            gameState.indicePregunta
        ];


    if (
        !reactivo ||
        reactivo.tipo !== 'arbol_factorizacion'
    ) return;


    const inputLeft =
        document.getElementById('factor-tree-input-left');

    const inputRight =
        document.getElementById('factor-tree-input-right');

    const message =
        document.getElementById('factor-tree-message');


    const factorA =
        Number(inputLeft.value);

    const factorB =
        Number(inputRight.value);


    // ------------------------------------------
    // Campos vacíos o valores inválidos
    // ------------------------------------------

    if (
        inputLeft.value.trim() === '' ||
        inputRight.value.trim() === '' ||
        !Number.isFinite(factorA) ||
        !Number.isFinite(factorB)
    ) {

        message.textContent =
            '⚠ Introduce ambos factores.';

        return;
    }


    // ------------------------------------------
    // Evitar factorización trivial 1 × n
    // ------------------------------------------

    if (factorA <= 1 || factorB <= 1) {

        message.textContent =
            '⚠ Utiliza factores mayores que 1.';

        return;
    }


    // ------------------------------------------
    // Verificar producto
    // ------------------------------------------

    const correcto =
        factorA * factorB === reactivo.numero;


    inputLeft.disabled = true;
    inputRight.disabled = true;

    document
        .getElementById('btn-submit-factor-tree')
        .disabled = true;


    if (correcto) {

        inputLeft.classList.add('correct');
        inputRight.classList.add('correct');

        message.textContent =
            `✓ ${factorA} × ${factorB} = ${reactivo.numero}`;

        procesarRespuesta('arbol_correcto');

    } else {

        inputLeft.classList.add('incorrect');
        inputRight.classList.add('incorrect');

        message.textContent =
            `✕ ${factorA} × ${factorB} ≠ ${reactivo.numero}`;

        procesarRespuesta('arbol_incorrecto');
    }
}

// FIN DE FUNCIONES DE OPERACION HACKERS

// EXPOSICIÓN GLOBAL A WINDOW
window.showScreen = showScreen;
window.selectGameMode = selectGameMode;
window.iniciarPartida = iniciarPartida;
window.checkConsoleAnswer = checkConsoleAnswer;
window.confirmEndGame = confirmEndGame;
window.toggleAudio = toggleAudio;
window.openAudioSettings = openAudioSettings;
window.closeAudioSettings = closeAudioSettings;
window.updateVolumes = updateVolumes;
window.openLeaderboardModal = openLeaderboardModal;
window.toggleNexusTruthSwitch = toggleNexusTruthSwitch;
window.checkTruthTableAnswer = checkTruthTableAnswer;
window.checkFactorTreeAnswer = checkFactorTreeAnswer;
window.restartGame = restartGame;
window.returnToCover = returnToCover;
window.closeLeaderboardModal = closeLeaderboardModal;
window.onLeaderboardFilterChange = onLeaderboardFilterChange;


window.probarHackers = probarHackers;