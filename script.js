// Variables globales
let scene, camera, renderer, globe;
let isAutoRotating = true;
let mouseDown = false;
let mouseX = 0, mouseY = 0;
let targetRotationX = 0, targetRotationY = 0;
const countries = [];
let countryData = {}; // Will be populated dynamically

// Function to get flag emoji from CCA2 code
function getFlagEmoji(cca2) {
    return cca2
        .toUpperCase()
        .split('')
        .map((char) => 0x1F1E6 + (char.charCodeAt(0) - 65))
        .map((code) => String.fromCodePoint(code))
        .join('');
}

// Function to load all country data from API
async function loadCountries() {
    try {
        const response = await fetch('https://restcountries.com/v3.1/all?fields=name,capitalInfo,region,subregion,population,languages,cca2,flags');
        const data = await response.json();
        
        countryData = {};
        data.forEach((country) => {
            const cca2 = country.cca2;
            const flagEmoji = getFlagEmoji(cca2);
            const lat = country.capitalInfo?.latlng?.[0] || null;
            const lon = country.capitalInfo?.latlng?.[1] || null;
            
            if (lat === null || lon === null) return; // Skip countries without capital coordinates
            
            const langs = country.languages ? Object.values(country.languages).join(', ') : 'Multiple';
            
            countryData[country.name.common] = {
                position: { lat, lon },
                name: `${flagEmoji} ${country.name.common}`,
                description: `A vibrant nation in ${country.region}${country.subregion ? ` (${country.subregion})` : ''} known for its rich cultural heritage and diverse landscapes.`,
                culture: langs,
                monuments: ['National Monument', 'Historical Site', 'Cultural Landmark'], // Placeholders; can be enhanced
                population: country.population ? country.population.toLocaleString() : 'N/A',
                langues: langs
            };
        });
        
        console.log(`Loaded ${Object.keys(countryData).length} countries with coordinates.`);
    } catch (error) {
        console.error('Error loading country data:', error);
        // Fallback to original static data
        countryData = {
            'France': {
                position: { lat: 46.2276, lon: 2.2137 },
                name: '🇫🇷 France',
                description: 'Pays de la gastronomie et de l\'art de vivre, la France séduit par sa diversité culturelle.',
                culture: 'Gastronomie, mode, littérature',
                monuments: ['Tour Eiffel', 'Louvre', 'Versailles'],
                population: '67 millions',
                langues: 'Français'
            },
            // ... add other static if needed
        };
    }
}

// Initialisation du globe
function initGlobe() {
    const container = document.getElementById('globe-container');
    
    // Configuration de la scène
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Création du globe
    const geometry = new THREE.SphereGeometry(2, 32, 32);
    
    // Texture simple du globe
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    
    // Fond océan
    ctx.fillStyle = '#4a90e2';
    ctx.fillRect(0, 0, 512, 256);
    
    // Continents simples
    ctx.fillStyle = '#27ae60';
    // Europe
    ctx.fillRect(250, 80, 40, 30);
    // Afrique
    ctx.fillRect(260, 120, 30, 60);
    // Asie
    ctx.fillRect(320, 70, 80, 50);
    // Amérique
    ctx.fillRect(100, 100, 40, 80);
    // Australie
    ctx.fillRect(380, 180, 30, 20);
    
    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.MeshPhongMaterial({ 
        map: texture,
        transparent: true,
        opacity: 0.9
    });
    
    globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Ajout des marqueurs de pays
    Object.entries(countryData).forEach(([name, data]) => {
        addCountryMarker(name, data.position.lat, data.position.lon);
    });

    // Éclairage
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 3, 5);
    scene.add(directionalLight);

    // Position de la caméra
    camera.position.z = 5;

    // Interaction souris
    setupMouseControls();

    // Démarrage de l'animation
    animate();
}

// Ajout des marqueurs de pays
function addCountryMarker(name, lat, lon) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    
    const x = -2.05 * Math.sin(phi) * Math.cos(theta);
    const y = 2.05 * Math.cos(phi);
    const z = 2.05 * Math.sin(phi) * Math.sin(theta);

    const geometry = new THREE.SphereGeometry(0.05, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xff6b6b });
    const marker = new THREE.Mesh(geometry, material);
    
    marker.position.set(x, y, z);
    marker.userData = { country: name };
    
    globe.add(marker);
    countries.push(marker);
}

// Contrôles souris
function setupMouseControls() {
    const container = document.getElementById('globe-container');
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    container.addEventListener('mousedown', (event) => {
        mouseDown = true;
        mouseX = event.clientX;
        mouseY = event.clientY;
        isAutoRotating = false;
    });

    container.addEventListener('mouseup', () => {
        mouseDown = false;
    });

    container.addEventListener('mousemove', (event) => {
        if (mouseDown) {
            const deltaX = event.clientX - mouseX;
            const deltaY = event.clientY - mouseY;
            
            targetRotationY += deltaX * 0.01;
            targetRotationX += deltaY * 0.01;
            
            mouseX = event.clientX;
            mouseY = event.clientY;
        }

        // Effet de survol
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(countries);

        countries.forEach(marker => {
            marker.material.color.setHex(0xff6b6b);
            marker.scale.set(1, 1, 1);
        });

        if (intersects.length > 0) {
            const marker = intersects[0].object;
            marker.material.color.setHex(0xfeca57);
            marker.scale.set(1.5, 1.5, 1.5);
            container.style.cursor = 'pointer';
        } else {
            container.style.cursor = 'grab';
        }
    });

    container.addEventListener('click', (event) => {
        const rect = container.getBoundingClientRect();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        raycaster.setFromCamera(mouse, camera);
        const intersects = raycaster.intersectObjects(countries);

        if (intersects.length > 0) {
            const marker = intersects[0].object;
            showCountryInfo(marker.userData.country);
        }
    });
}

// Affichage des informations pays
function showCountryInfo(countryName) {
    const country = countryData[countryName];
    if (!country) return;

    document.getElementById('country-name').textContent = country.name;
    document.getElementById('country-description').textContent = country.description;
    document.getElementById('country-details').innerHTML = `
        <div><strong>🎭 Culture:</strong><br>${country.culture}</div>
        <div><strong>🏛️ Monuments:</strong><br>${country.monuments.join('<br>')}</div>
        <div><strong>👥 Population:</strong><br>${country.population}</div>
        <div><strong>🗣️ Langues:</strong><br>${country.langues}</div>
    `;

    document.getElementById('country-info').style.display = 'block';
    document.getElementById('country-info').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// Boucle d'animation
function animate() {
    requestAnimationFrame(animate);

    if (isAutoRotating && !mouseDown) {
        globe.rotation.y += 0.005;
    } else {
        globe.rotation.x += (targetRotationX - globe.rotation.x) * 0.05;
        globe.rotation.y += (targetRotationY - globe.rotation.y) * 0.05;
    }

    renderer.render(scene, camera);
}

// Fonctions de contrôle
function resetGlobe() {
    targetRotationX = 0;
    targetRotationY = 0;
    camera.position.set(0, 0, 5);
    document.getElementById('country-info').style.display = 'none';
    isAutoRotating = true;
}

function toggleAutoRotation() {
    isAutoRotating = !isAutoRotating;
    const btn = document.getElementById('auto-rotate-btn');
    btn.textContent = isAutoRotating ? '⏸️ Pause Rotation' : '▶️ Démarrer Rotation';
}

// Redimensionnement
window.addEventListener('resize', () => {
    const container = document.getElementById('globe-container');
    if (container && renderer && camera) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    }
});

// Quiz functionality
const quizData = [
    {
        question: "Quelle est la capitale du Japon ?",
        options: ["Kyoto", "Tokyo", "Osaka", "Hiroshima"],
        correct: 1
    },
    {
        question: "Quel continent abrite le plus de langues différentes ?",
        options: ["Asie", "Afrique", "Europe", "Amérique"],
        correct: 1
    },
    {
        question: "Quelle est la danse traditionnelle argentine ?",
        options: ["Flamenco", "Samba", "Tango", "Salsa"],
        correct: 2
    },
    {
        question: "Dans quel pays trouve-t-on le Taj Mahal ?",
        options: ["Pakistan", "Inde", "Bangladesh", "Sri Lanka"],
        correct: 1
    },
    {
        question: "Quelle est la langue la plus parlée au monde ?",
        options: ["Anglais", "Espagnol", "Chinois Mandarin", "Hindi"],
        correct: 2
    }
];

let currentQuestion = 0;
let score = 0;
let answered = false;

function loadQuestion() {
    const question = quizData[currentQuestion];
    document.getElementById('question-text').textContent = question.question;
    
    const optionsContainer = document.getElementById('quiz-options');
    optionsContainer.innerHTML = '';
    
    question.options.forEach((option, index) => {
        const button = document.createElement('button');
        button.className = 'quiz-option';
        button.textContent = option;
        button.onclick = () => selectAnswer(index);
        optionsContainer.appendChild(button);
    });
    
    document.getElementById('next-btn').style.display = 'none';
    answered = false;
    updateScore();
}

function selectAnswer(selectedIndex) {
    if (answered) return;
    
    answered = true;
    const question = quizData[currentQuestion];
    const options = document.querySelectorAll('.quiz-option');
    
    options[question.correct].classList.add('correct');
    
    if (selectedIndex === question.correct) {
        score++;
    } else {
        options[selectedIndex].classList.add('incorrect');
    }
    
    document.getElementById('next-btn').style.display = 'inline-block';
    updateScore();
}

function nextQuestion() {
    currentQuestion++;
    
    if (currentQuestion < quizData.length) {
        loadQuestion();
    } else {
        showQuizResult();
    }
}

function updateScore() {
    document.getElementById('quiz-score').textContent = `Score: ${score}/${currentQuestion + (answered ? 1 : 0)}`;
}

function showQuizResult() {
    const quizContent = document.getElementById('quiz-content');
    const percentage = Math.round((score / quizData.length) * 100);
    
    let message = '';
    if (percentage >= 80) {
        message = 'Excellent ! Vous êtes un vrai citoyen du monde ! 🌟';
    } else if (percentage >= 60) {
        message = 'Bien joué ! Continuez à explorer les cultures ! 🌍';
    } else {
        message = 'C\'est un bon début ! Il y a tant à découvrir ! 🎓';
    }
    
    quizContent.innerHTML = `
        <h3 style="color: white; margin-bottom: 2rem;">Quiz Terminé !</h3>
        <div style="font-size: 3rem; margin-bottom: 1rem;">${percentage >= 80 ? '🏆' : percentage >= 60 ? '🥇' : '📚'}</div>
        <div class="quiz-score">Score Final: ${score}/${quizData.length} (${percentage}%)</div>
        <p style="color: white; margin: 2rem 0; font-size: 1.2rem;">${message}</p>
        <button class="cta-button" onclick="restartQuiz()">Recommencer le Quiz</button>
    `;
}

function restartQuiz() {
    currentQuestion = 0;
    score = 0;
    answered = false;
    
    document.getElementById('quiz-content').innerHTML = `
        <div class="question" id="question-text"></div>
        <div class="quiz-options" id="quiz-options"></div>
        <button class="cta-button" onclick="nextQuestion()" id="next-btn" style="display: none;">Question Suivante</button>
        <div class="quiz-score" id="quiz-score">Score: 0/0</div>
    `;
    
    loadQuestion();
}

// Navigation et animations
window.addEventListener('scroll', () => {
    const navbar = document.getElementById('navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Scrolling fluide
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        target.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    });
});

// Animations au scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Initialiser le globe quand la section devient visible
            if (entry.target.id === 'map' && !scene) {
                setTimeout(async () => {
                    // Ensure data is loaded
                    if (Object.keys(countryData).length === 0) {
                        await loadCountries();
                    }
                    try {
                        initGlobe();
                    } catch (error) {
                        console.error('Erreur lors de l\'initialisation du globe:', error);
                        // Fallback si Three.js ne fonctionne pas
                        document.getElementById('globe-container').innerHTML = `
                            <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: white; text-align: center; flex-direction: column;">
                                <div style="font-size: 4rem; margin-bottom: 1rem;">🌍</div>
                                <p>Globe 3D en cours de chargement... (${Object.keys(countryData).length} pays chargés)</p>
                                <p style="margin-top: 1rem; opacity: 0.7;">Si le globe ne s'affiche pas, vérifiez que JavaScript est activé.</p>
                            </div>
                        `;
                    }
                }, 500);
            }
        }
    });
}, observerOptions);

document.querySelectorAll('.animate-on-scroll').forEach(el => {
    observer.observe(el);
});

// Initialisation du quiz
loadQuestion();

// Éléments flottants
document.addEventListener('DOMContentLoaded', () => {
    const floatingElements = ['🌍', '🎭', '🎵', '🍽️', '🎨', '📚'];
    
    setInterval(() => {
        if (Math.random() > 0.8) {
            const element = document.createElement('div');
            element.textContent = floatingElements[Math.floor(Math.random() * floatingElements.length)];
            element.style.position = 'fixed';
            element.style.left = Math.random() * window.innerWidth + 'px';
            element.style.top = window.innerHeight + 'px';
            element.style.fontSize = '2rem';
            element.style.zIndex = '1';
            element.style.pointerEvents = 'none';
            element.style.animation = 'float-up 6s linear forwards';
            
            document.body.appendChild(element);
            
            setTimeout(() => {
                if (element.parentNode) {
                    element.remove();
                }
            }, 6000);
        }
    }, 4000);

    // Load countries on DOM ready
    loadCountries();
});

// CSS pour l'animation flottante
const style = document.createElement('style');
style.textContent = `
    @keyframes float-up {
        0% {
            transform: translateY(0) rotate(0deg);
            opacity: 0;
        }
        10% {
            opacity: 1;
        }
        90% {
            opacity: 1;
        }
        100% {
            transform: translateY(-100vh) rotate(360deg);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

// Fonction de recherche de pays
function setupSearch() {
    const searchInput = document.getElementById('country-search');
    const searchResults = document.getElementById('search-results');
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        
        if (query.length < 2) {
            searchResults.classList.remove('active');
            return;
        }
        
        const matches = Object.keys(countryData).filter(country => 
            country.toLowerCase().includes(query)
        ).slice(0, 10);
        
        if (matches.length > 0) {
            searchResults.innerHTML = matches.map(country => `
                <div class="search-result-item" data-country="${country}">
                    ${countryData[country].name}
                </div>
            `).join('');
            searchResults.classList.add('active');
            
            // Ajouter les événements de clic
            searchResults.querySelectorAll('.search-result-item').forEach(item => {
                item.addEventListener('click', () => {
                    const countryName = item.dataset.country;
                    showCountryInfo(countryName);
                    searchInput.value = '';
                    searchResults.classList.remove('active');
                    
                    // Faire tourner le globe vers le pays
                    const country = countryData[countryName];
                    if (country && globe) {
                        const phi = (90 - country.position.lat) * (Math.PI / 180);
                        const theta = (lon + 180) * (Math.PI / 180);
                        targetRotationX = phi - Math.PI / 2;
                        targetRotationY = -theta;
                    }
                });
            });
        } else {
            searchResults.innerHTML = '<div class="search-result-item">Aucun pays trouvé</div>';
            searchResults.classList.add('active');
        }
    });
    
    // Fermer les résultats en cliquant ailleurs
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
            searchResults.classList.remove('active');
        }
    });
}

// Appelez cette fonction après le chargement des pays
document.addEventListener('DOMContentLoaded', async () => {
    await loadCountries();
    setupSearch();
    // ... reste du code
});