// Variables d'état
let heartRate = 72;
let ecgPhase = 0;
let animateNumbers = { oxygen: 0, sleep: 0, steps: 0 };
const targets = { oxygen: 98, sleep: 7.5, steps: 8234 };

// Barre de progression du scroll
function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    document.querySelector('.progress-bar').style.width = scrollPercent + '%';

    // Afficher les bulles au scroll
    if (scrollPercent > 20) {
        document.getElementById('bubble1').classList.add('visible');
    }
    if (scrollPercent > 50) {
        document.getElementById('bubble2').classList.add('visible');
    }
    if (scrollPercent > 70) {
        document.getElementById('bubble3').classList.add('visible');
    }

    // Afficher les cartes capteurs
    if (scrollPercent > 15) {
        document.querySelectorAll('.sensor-card').forEach(card => {
            card.classList.add('visible');
        });
    }
}

// Simulation des battements cardiaques
function updateHeartRate() {
    const change = (Math.random() - 0.5) * 10;
    heartRate = Math.max(60, Math.min(120, heartRate + change));
    document.getElementById('heartRateText').textContent = Math.round(heartRate);
    document.getElementById('freqValue').textContent = Math.round(heartRate) + ' BPM';
}

// Animation des nombres progressifs
function animateProgressiveNumbers() {
    Object.entries(targets).forEach(([key, target]) => {
        if (animateNumbers[key] < target) {
            const increment = (target - animateNumbers[key]) / 20;
            animateNumbers[key] += increment;
            
            if (key === 'oxygen') {
                document.getElementById('oxygenText').textContent = Math.round(animateNumbers[key]);
                const dasharray = (animateNumbers[key] / 100) * 314;
                document.getElementById('oxygenGauge').setAttribute('stroke-dasharray', dasharray + ' 314');
            } else if (key === 'sleep') {
                document.getElementById('sleepValue').textContent = (Math.round(animateNumbers[key] * 10) / 10).toFixed(1);
                document.getElementById('sleepProgress').style.width = ((animateNumbers[key] / 8) * 100) + '%';
            } else if (key === 'steps') {
                document.getElementById('stepsValue').textContent = Math.round(animateNumbers[key]).toLocaleString();
                document.getElementById('stepsProgress').style.width = ((animateNumbers[key] / 10000) * 100) + '%';
            }
        }
    });
}

// --- ECG animation ---
let ecgCtx, ecgWidth, ecgHeight, ecgSamples = [];

function initECG() {
    const canvas = document.getElementById('ecgCanvas');
    if (!canvas) return;
    
    ecgCtx = canvas.getContext('2d');
    
    function resize() {
        ecgWidth = canvas.clientWidth;
        ecgHeight = 200;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = ecgWidth * dpr;
        canvas.height = ecgHeight * dpr;
        canvas.style.height = ecgHeight + 'px';
        ecgCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // ensure samples match width
        ecgSamples = new Array(ecgWidth).fill(0);
    }
    
    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(drawECG);
}

function drawECG() {
    if (!ecgCtx) return requestAnimationFrame(drawECG);
    
    // background
    ecgCtx.clearRect(0, 0, ecgWidth, ecgHeight);
    
    // subtle grid
    ecgCtx.strokeStyle = 'rgba(255,255,255,0.03)';
    ecgCtx.lineWidth = 1;
    for (let x = 0; x < ecgWidth; x += 20) {
        ecgCtx.beginPath();
        ecgCtx.moveTo(x, 0);
        ecgCtx.lineTo(x, ecgHeight);
        ecgCtx.stroke();
    }
    for (let y = 0; y < ecgHeight; y += 20) {
        ecgCtx.beginPath();
        ecgCtx.moveTo(0, y);
        ecgCtx.lineTo(ecgWidth, y);
        ecgCtx.stroke();
    }

    // push new sample
    const speedFactor = Math.max(0.5, heartRate / 72);
    ecgPhase += 0.3 * speedFactor;
    
    // simulate QRS spike occasionally based on heartRate
    const spikeProb = 0.04 * (heartRate / 72);
    let spike = 0;
    if (Math.random() < spikeProb) {
        spike = 1 + Math.random() * 0.8;
    }
    const base = Math.sin(ecgPhase * 2.5) * 0.25 + (Math.random() - 0.5) * 0.02;
    const sample = base + spike;
    ecgSamples.push(sample);
    if (ecgSamples.length > ecgWidth) ecgSamples.shift();

    // draw waveform
    ecgCtx.lineWidth = 2;
    const grad = ecgCtx.createLinearGradient(0, 0, ecgWidth, 0);
    grad.addColorStop(0, '#ef4444');
    grad.addColorStop(1, '#22d3ee');
    ecgCtx.strokeStyle = grad;
    ecgCtx.beginPath();
    for (let i = 0; i < ecgSamples.length; i++) {
        const x = i;
        const y = ecgHeight / 2 - ecgSamples[i] * (ecgHeight * 0.35);
        if (i === 0) ecgCtx.moveTo(x, y);
        else ecgCtx.lineTo(x, y);
    }
    ecgCtx.stroke();

    requestAnimationFrame(drawECG);
}

// Show temporary alert when heart rate is high
let alertTimeout;
function showAlert(message, duration = 4000) {
    const container = document.getElementById('alertContainer');
    const text = container.querySelector('.alert-content p');
    text.textContent = message;
    container.style.display = 'block';
    clearTimeout(alertTimeout);
    alertTimeout = setTimeout(() => {
        container.style.display = 'none';
    }, duration);
}

// Floating bubble on sensor click
function initInteractions() {
    document.querySelectorAll('.sensor-card').forEach(card => {
        card.addEventListener('click', () => {
            const title = card.querySelector('.sensor-title').textContent.trim();
            const value = card.querySelector('.sensor-value').textContent.trim();
            showBubble(title + ' — ' + value);
        });
    });
}

function showBubble(text) {
    const bubble = document.createElement('div');
    bubble.className = 'floating-bubble visible';
    bubble.style.left = (50 + (Math.random() - 0.5) * 20) + '%';
    bubble.style.top = (30 + (Math.random() - 0.5) * 40) + '%';
    bubble.textContent = text;
    document.body.appendChild(bubble);
    setTimeout(() => {
        bubble.classList.remove('visible');
        bubble.style.opacity = '0';
    }, 1600);
    setTimeout(() => bubble.remove(), 2000);
}

// Main init
document.addEventListener('DOMContentLoaded', () => {
    // Initialiser l'ECG
    initECG();
    
    // Initialiser les interactions
    initInteractions();

    // Démarrer les mises à jour périodiques
    setInterval(updateHeartRate, 1500);
    
    // Boucle d'animation pour les nombres progressifs
    function numbersLoop() {
        animateProgressiveNumbers();
        requestAnimationFrame(numbersLoop);
    }
    numbersLoop();

    // Progression du scroll
    updateScrollProgress();
    window.addEventListener('scroll', updateScrollProgress);

    // Afficher l'alerte si la fréquence cardiaque dépasse le seuil
    setInterval(() => {
        if (heartRate > 105) {
            showAlert('Alerte: fréquence cardiaque élevée (' + Math.round(heartRate) + ' BPM)');
        }
    }, 3000);
    
    // Afficher la première alerte après 4 secondes
    setTimeout(() => {
        showAlert('Fréquence cardiaque élevée détectée. Prenez du repos.');
    }, 4000);
});