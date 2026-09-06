const sounds = {
    bg: new Audio('audio/main/bg-music2.mp3'),
    click: new Audio('audio/main/click.mp3')
};
sounds.bg.loop = true;

// Leer el estado del audio guardado en el navegador (si no existe, inicia activado 'true')
let isAudioActive = localStorage.getItem('multiverse_audio_active') !== 'false';
let currentBgVolume = parseFloat(localStorage.getItem('multiverse_bg_vol')) || 0.5;
let currentSfxVolume = parseFloat(localStorage.getItem('multiverse_sfx_vol')) || 0.3;

/*document.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        const cover = document.getElementById('screen-cover');
        if (cover && !cover.classList.contains('hidden')) {
            if (isAudioActive) {
                sounds.bg.play().catch(() => {});
            }
            showScreen('screen-menu');
        }
    }
});*/

// Referencia a la portada
const screenCover = document.getElementById('screen-cover');

// Función única para ingresar al menú principal (PC y Celulares)
function enterMultiverse() {
    // Verificamos si la portada existe y está visible (sin la clase 'hidden')
    if (screenCover && !screenCover.classList.contains('hidden')) {
        // Reproduce el audio si está activo
        if (typeof isAudioActive !== 'undefined' && isAudioActive && sounds?.bg) {
            sounds.bg.play().catch(() => {});
        }
        
        // Avanza al menú principal
        showScreen('screen-menu'); 
    }
}

// 1. Escuchar tecla ENTER en PC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        enterMultiverse();
    }
});

// 2. Escuchar TAP / CLIC en Celulares, Tablets y Mouse
if (screenCover) {
    screenCover.addEventListener('click', enterMultiverse);
}

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');
}

function returnToCover() {
    showScreen('screen-cover');
}

function launchGame(url) {
    if (isAudioActive) {
        sounds.click.currentTime = 0;
        sounds.click.play().catch(() => {});
    }
    setTimeout(() => {
        window.location.href = url;
    }, 150);
}

function applyVolumes() {
    const btnAudio = document.getElementById('btn-audio');
    
    if (isAudioActive) {
        sounds.bg.volume = currentBgVolume;
        sounds.click.volume = currentSfxVolume;
        if (btnAudio) btnAudio.innerText = '🔊 Sound ON';
    } else {
        sounds.bg.pause();
        sounds.bg.volume = 0;
        sounds.click.volume = 0;
        if (btnAudio) btnAudio.innerText = '🔇 Mute';
    }

    // Guardar ajustes en la memoria del navegador
    localStorage.setItem('multiverse_audio_active', isAudioActive);
    localStorage.setItem('multiverse_bg_vol', currentBgVolume);
    localStorage.setItem('multiverse_sfx_vol', currentSfxVolume);
}

function toggleAudio() {
    isAudioActive = !isAudioActive;
    if (isAudioActive) {
        sounds.bg.play().catch(() => {});
    }
    applyVolumes();
}

function openAudioSettings() {
    document.getElementById('modal-audio-settings').classList.remove('hidden');
}

function closeAudioSettings() {
    document.getElementById('modal-audio-settings').classList.add('hidden');
}

function updateVolumes() {
    currentBgVolume = parseFloat(document.getElementById('volume-bg').value);
    currentSfxVolume = parseFloat(document.getElementById('volume-sfx').value);
    applyVolumes();
}

// Inicializar el estado guardado al cargar
applyVolumes();
if (isAudioActive) {
    // Intenta reproducir la música de fondo al cargar la página si el navegador lo permite
    sounds.bg.play().catch(() => {});
}

// Verificar si la URL pide ir directo al menú
window.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('screen') === 'menu') {
        showScreen('screen-menu');
    }
});