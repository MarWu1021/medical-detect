/**
 * Medication AI Assistant - app.js
 * Senior-friendly interaction logic
 */

const webcamElement = document.getElementById('webcam');
const scanBtn = document.getElementById('scan-btn');
const replayBtn = document.getElementById('replay-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const resultCard = document.getElementById('result-card');
const safetyAlert = document.getElementById('safety-alert');

// DOM Result Elements
const medName = document.getElementById('med-name');
const medCategory = document.getElementById('med-category');
const medInstructions = document.getElementById('med-instructions');
const medDosage = document.getElementById('med-dosage');
const medWarnings = document.getElementById('med-warnings');

let medicineData = [];
let scannedMedicines = new Set();
let currentStream = null;

// 1. Initialize App
async function init() {
    console.log('正在初始化 App...');
    try {
        // Load Medicine Data
        const response = await fetch('medicine_data.json');
        medicineData = await response.json();
        
        // Start Webcam
        await startWebcam();
    } catch (err) {
        console.error('初始化失敗:', err);
        alert('無法啟動相機，請檢查權限。');
    }
}

// 2. Camera Handling
async function startWebcam() {
    if (navigator.mediaDevices.getUserMedia) {
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            webcamElement.srcObject = currentStream;
        } catch (err) {
            console.error('相機啟動錯誤:', err);
        }
    }
}

// 3. Mock Recognition Logic
async function handleScan() {
    // Show loading UI
    loadingOverlay.classList.remove('hidden');
    scanBtn.disabled = true;

    // Simulate AI processing time (2 seconds)
    await new Promise(resolve => setTimeout(resolve, 2000));

    // For demonstration, we pick a random medicine or cycle through them
    const randomIndex = Math.floor(Math.random() * medicineData.length);
    const selectedMed = medicineData[randomIndex];

    displayResult(selectedMed);
    checkInteractions(selectedMed);

    loadingOverlay.classList.add('hidden');
    scanBtn.disabled = false;
    replayBtn.classList.remove('hidden');
}

// 4. Update UI with results
function displayResult(med) {
    medName.textContent = med.name;
    medCategory.textContent = med.category;
    medInstructions.textContent = med.instructions;
    medDosage.textContent = med.dosage;
    medWarnings.textContent = med.warnings;

    resultCard.classList.remove('hidden');
    
    // Automatic Voice Feedback
    speak(med.voice_msg || `${med.name}。服用方法：${med.instructions}。注意：${med.warnings}`);
}

// 5. Interaction Safety Check
function checkInteractions(newMed) {
    scannedMedicines.add(newMed.id);
    
    let overlaps = [];
    medicineData.forEach(med => {
        if (scannedMedicines.has(med.id) && med.id !== newMed.id) {
            // Check if the new medicine has an interaction with this one
            if (newMed.interactions.includes(med.id)) {
                overlaps.push(med.name);
            }
        }
    });

    if (overlaps.length > 0) {
        const msg = `🚨 注意！偵測到可能產生副作用的組合：${newMed.name} 不宜與 ${overlaps.join('、')} 同時服用。請務必諮詢醫師！`;
        document.getElementById('alert-msg').textContent = msg;
        safetyAlert.classList.remove('hidden');
        speak(msg);
    }
}

// 6. Voice Synthesis (TTS)
function speak(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-TW';
        utterance.rate = 0.9; // Slightly slower for seniors
        utterance.pitch = 1.0;
        
        window.speechSynthesis.speak(utterance);
    }
}

// Event Listeners
scanBtn.addEventListener('click', handleScan);
replayBtn.addEventListener('click', () => {
    const activeName = medName.textContent;
    const med = medicineData.find(m => m.name === activeName);
    if (med) speak(med.voice_msg);
});

// Run Init
window.onload = init;
