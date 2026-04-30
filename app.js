/**
 * Medication AI Assistant - app.js
 * Senior-friendly interaction logic with Google Gemini API Integration
 */

const webcamElement = document.getElementById('webcam');
const scanBtn = document.getElementById('scan-btn');
const replayBtn = document.getElementById('replay-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const resultCard = document.getElementById('result-card');
const errorCard = document.getElementById('error-card');

// DOM Result Elements
const medName = document.getElementById('med-name');
const medCategory = document.getElementById('med-category');
const medInstructions = document.getElementById('med-instructions');
const medDosage = document.getElementById('med-dosage');
const medWarnings = document.getElementById('med-warnings');

// Settings Elements
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const apiStatus = document.getElementById('api-status');

let currentStream = null;
let geminiApiKey = null;

// Use an offscreen canvas to capture image
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// 1. Initialize App
async function init() {
    console.log('正在初始化 App...');
    try {
        // Check if there is a saved API key
        const savedKey = localStorage.getItem('geminiApiKey') || 'AIzaSyDmXzUEWfYyHtHDx1BA7dk_-vySN-e-N2A';
        if (savedKey) {
            apiKeyInput.value = savedKey;
            geminiApiKey = savedKey;
            updateApiStatus(true);
        } else {
            updateApiStatus(false);
        }
        
        // Start Webcam
        await startWebcam();
    } catch (err) {
        console.error('初始化失敗:', err);
        alert('無法啟動相機，請檢查權限。');
    }
}

function updateApiStatus(hasKey) {
    if (hasKey) {
        apiStatus.textContent = "✅ API Key 已設定！啟用強大雲端 AI。";
        apiStatus.style.color = "var(--secondary)";
    } else {
        apiStatus.textContent = "❌ 尚未設定 API Key，請輸入後儲存。";
        apiStatus.style.color = "var(--warning)";
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
            console.warn('無法開啟後置鏡頭，嘗試開啟預設鏡頭...', err);
            try {
                currentStream = await navigator.mediaDevices.getUserMedia({ 
                    video: true 
                });
                webcamElement.srcObject = currentStream;
            } catch (err2) {
                console.error('所有相機啟動均失敗:', err2);
            }
        }
    }
}

// 3. Capture Image from Video
function captureBase64Image() {
    // Set canvas dimensions to match video stream
    canvas.width = webcamElement.videoWidth;
    canvas.height = webcamElement.videoHeight;
    // Draw current frame to canvas
    ctx.drawImage(webcamElement, 0, 0, canvas.width, canvas.height);
    // Convert to base64 jpeg
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    // Strip the "data:image/jpeg;base64," prefix
    return dataUrl.split(',')[1];
}

// 4. API Call to Gemini
async function analyzeWithGemini(base64Image) {
    const prompt = `請辨識這張圖片中的包裝盒或物品。
如果你沒有看到任何像是藥盒、藥瓶或保健食品的東西，請嚴格回覆字串："NO_MEDICINE"。
如果確定有，請根據包裝上的文字，回覆一段 JSON 格式的文字，包含以下欄位：
{
  "name": "物品名稱 (例如：普拿疼伏冒加強錠)",
  "category": "類別",
  "instructions": "包裝上寫的用途或使用說明",
  "dosage": "包裝上寫的用法用量",
  "warnings": "包裝上的注意事項",
  "voice_msg": "一段友善的語音提示文字，大約30字。"
}
請只回傳 JSON 格式本身，不要加上任何其他說明文字。`;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: base64Image
                    }
                }
            ]
        }],
        generationConfig: {
            temperature: 0.1, // Keep it deterministic
        }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API 錯誤碼 ${response.status}: ${errText}`);
    }

    const data = await response.json();
    
    // Check if Gemini blocked it due to safety
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        throw new Error("AI 拒絕回答或被安全機制阻擋：" + JSON.stringify(data));
    }

    let text = data.candidates[0].content.parts[0].text.trim();
    
    // Robust JSON extraction using regex
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        text = jsonMatch[0];
    }

    return text;
}

// 5. Recognition Logic
async function handleScan() {
    if (!geminiApiKey) {
        alert("請先在下方輸入並儲存 Google Gemini API Key！");
        return;
    }

    // Show loading UI
    loadingOverlay.classList.remove('hidden');
    scanBtn.disabled = true;
    
    // Hide previous results
    resultCard.classList.add('hidden');
    errorCard.classList.add('hidden');

    try {
        const base64Img = captureBase64Image();
        const aiResponse = await analyzeWithGemini(base64Img);

        if (aiResponse.includes('NO_MEDICINE')) {
            showError();
        } else {
            try {
                const medData = JSON.parse(aiResponse);
                displayResult(medData);
            } catch (parseErr) {
                console.error("JSON 解析失敗", aiResponse);
                alert("AI 回傳的格式有誤：\n" + aiResponse.substring(0, 100)); // Show to user for debugging
                showError();
            }
        }
    } catch (err) {
        console.error("辨識過程中發生錯誤:", err);
        alert("發生錯誤：\n" + err.message); // Pop up the actual error on the phone
        showError();
    } finally {
        loadingOverlay.classList.add('hidden');
        scanBtn.disabled = false;
        replayBtn.classList.remove('hidden');
    }
}

function showError() {
    errorCard.classList.remove('hidden');
    speak('未偵測到藥物，或是畫面不清楚，請重新拍攝。');
}

// 6. Update UI with results
function displayResult(med) {
    medName.textContent = med.name;
    medCategory.textContent = med.category;
    medInstructions.textContent = med.instructions;
    medDosage.textContent = med.dosage;
    medWarnings.textContent = med.warnings;

    resultCard.classList.remove('hidden');
    
    // Appending a disclaimer since AI might hallucinate
    const disclaimer = " (詳細用藥請依醫師或藥師指示為準)";
    medWarnings.textContent += disclaimer;

    // Automatic Voice Feedback
    speak(med.voice_msg || `${med.name}。服用方法：${med.instructions}。注意：${med.warnings}`);
}

// 7. Voice Synthesis (TTS)
function speak(text) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'zh-TW';
        utterance.rate = 0.9; 
        utterance.pitch = 1.0;
        
        window.speechSynthesis.speak(utterance);
    }
}

// Event Listeners
scanBtn.addEventListener('click', handleScan);

replayBtn.addEventListener('click', () => {
    // If error card is shown, replay error message
    if (!errorCard.classList.contains('hidden')) {
        speak('未偵測到藥物，或是畫面不清楚，請重新拍攝。');
        return;
    }
    
    // To replay, we construct the message from the UI since we don't store the AI response globally
    const textToSpeak = `${medName.textContent}。服用方法：${medInstructions.textContent}。注意：${medWarnings.textContent}`;
    speak(textToSpeak);
});

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        geminiApiKey = key;
        localStorage.setItem('geminiApiKey', key);
        updateApiStatus(true);
        alert("API Key 儲存成功！");
    } else {
        localStorage.removeItem('geminiApiKey');
        geminiApiKey = null;
        updateApiStatus(false);
    }
});

// Run Init
window.onload = init;
