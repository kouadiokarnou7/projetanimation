let scene, camera, renderer;
        let sensors = [];
        let heartRate = 72;
        let ecgPhase = 0;
        let animateNumbers = { oxygen: 0, sleep: 0, steps: 0 };
        const targets = { oxygen: 98, sleep: 7.5, steps: 8234 };

        function initThreeJS() {
            const canvas = document.getElementById('canvas3d');
            scene = new THREE.Scene();
            scene.background = new THREE.Color(0x0a0e27);
            
            camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
            camera.position.z = 5;
            
            renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
            renderer.setSize(canvas.clientWidth, canvas.clientHeight);
            renderer.setPixelRatio(window.devicePixelRatio);

            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            scene.add(ambientLight);
            
            const pointLight = new THREE.PointLight(0x06b6d4, 1.5);
            pointLight.position.set(5, 5, 5);
            scene.add(pointLight);

            createSensors();

            window.addEventListener('resize', () => {
                const w = canvas.clientWidth, h = canvas.clientHeight;
                camera.aspect = w / h;
                camera.updateProjectionMatrix();
                renderer.setSize(w, h);
            });

            animate3D();
        }

        function createSensors() {
            const data = [
                { x: -2.5, y: 1, color: 0xef4444, label: 'Cœur' },
                { x: -0.8, y: 1, color: 0x3b82f6, label: 'O2' },
                { x: 0.8, y: 1, color: 0xf97316, label: 'Temp' },
                { x: 2.5, y: 1, color: 0x10b981, label: 'Activité' }
            ];

            data.forEach((d, i) => {
                const group = new THREE.Group();
                
                const geom = new THREE.IcosahedronGeometry(0.4, 4);
                const mat = new THREE.MeshPhongMaterial({ 
                    color: d.color,
                    emissive: d.color,
                    emissiveIntensity: 0.4
                });
                const mesh = new THREE.Mesh(geom, mat);
                group.add(mesh);

                const orbitGeom = new THREE.BufferGeometry();
                const points = [];
                for (let j = 0; j < 64; j++) {
                    const angle = (j / 64) * Math.PI * 2;
                    points.push(Math.cos(angle) * 0.7, 0, Math.sin(angle) * 0.7);
                }
                orbitGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(points), 3));
                const orbitMat = new THREE.LineBasicMaterial({ color: d.color, transparent: true, opacity: 0.4 });
                const orbit = new THREE.Line(orbitGeom, orbitMat);
                group.add(orbit);

                group.position.set(d.x, d.y, 0);
                group.userData = { speed: 0.01 + Math.random() * 0.01, radius: 0.7 };
                
                scene.add(group);
                sensors.push(group);
            });
        }

        function animate3D() {
            requestAnimationFrame(animate3D);

            sensors.forEach((sensor, i) => {
                sensor.children[0].rotation.x += 0.01;
                sensor.children[0].rotation.y += 0.015;
                
                const time = Date.now() * 0.001 + i;
                const orbit = sensor.children[1];
                orbit.rotation.z = time * sensor.userData.speed;
                
                const pulse = Math.sin(time * 2) * 0.1 + 0.9;
                sensor.children[0].scale.set(pulse, pulse, pulse);
            });

            renderer.render(scene, camera);
        }

        function updateScrollProgress() {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
            document.querySelector('.progress-bar').style.width = scrollPercent + '%';

            if (scrollPercent > 20) document.getElementById('bubble1').classList.add('visible');
            if (scrollPercent > 50) document.getElementById('bubble2').classList.add('visible');
            if (scrollPercent > 70) document.getElementById('bubble3').classList.add('visible');

            if (scrollPercent > 15) {
                document.querySelectorAll('.sensor-card').forEach(card => {
                    card.classList.add('visible');
                });
            }
        }

        function updateHeartRate() {
            const change = (Math.random() - 0.5) * 10;
            heartRate = Math.max(60, Math.min(120, heartRate + change));
            document.getElementById('heartRateText').textContent = Math.round(heartRate);
            document.getElementById('freqValue').textContent = Math.round(heartRate) + ' BPM';
        }

        function animateProgressiveNumbers() {
            Object.entries(targets).forEach(([key, target]) => {
                if (animateNumbers[key] < target) {
                    const inc = (target - animateNumbers[key]) / 20;
                    animateNumbers[key] += inc;
                    
                    if (key === 'oxygen') {
                        document.getElementById('oxygenText').textContent = Math.round(animateNumbers[key]);
                        const dash = (animateNumbers[key] / 100) * 314;
                        document.getElementById('oxygenGauge').setAttribute('stroke-dasharray', dash + ' 314');
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
            initThreeJS();
            initECG();
            initInteractions();

            // start periodic updates
            setInterval(updateHeartRate, 1500);
            // run progressive numbers smoothly
            function numbersLoop() {
                animateProgressiveNumbers();
                requestAnimationFrame(numbersLoop);
            }
            numbersLoop();

            // scroll progress
            updateScrollProgress();
            window.addEventListener('scroll', updateScrollProgress);

            // show alert if heartRate crosses threshold
            setInterval(() => {
                if (heartRate > 105) showAlert('Alerte: fréquence cardiaque élevée (' + Math.round(heartRate) + ' BPM)');
            }, 3000);
        });