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
        const savedKey = localStorage.getItem('geminiApiKey');
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
            // Needed for iOS Safari inline playback
            webcamElement.setAttribute('playsinline', '');
            webcamElement.play();
        } catch (err) {
            console.warn('無法開啟後置鏡頭，嘗試開啟預設鏡頭...', err);
            try {
                currentStream = await navigator.mediaDevices.getUserMedia({ 
                    video: true 
                });
                webcamElement.srcObject = currentStream;
                webcamElement.setAttribute('playsinline', '');
                webcamElement.play();
            } catch (err2) {
                console.error('所有相機啟動均失敗:', err2);
            }
        }
    }
}

// 3. Capture Image from Video
function captureBase64Image() {
    canvas.width = webcamElement.videoWidth || 640;
    canvas.height = webcamElement.videoHeight || 480;
    ctx.drawImage(webcamElement, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
    return dataUrl.split(',')[1];
}

// 4. API Call to Gemini
async function analyzeWithGemini(base64Image) {
    const prompt = `請辨識這張圖片中的物品。
如果你沒有看到任何像是藥盒、藥瓶、藥錠或保健食品的東西（例如畫面中只有人臉、背景、文具、電器等非藥物），請嚴格且只回覆字串："NO_MEDICINE"。
如果確定畫面中有藥物或保健食品，請根據包裝上的文字，回覆一段 JSON 格式的資料，包含以下欄位：
{
  "name": "藥物/物品名稱 (例如：普拿疼伏冒加強錠)",
  "category": "類別",
  "instructions": "包裝上寫的用途或使用說明",
  "dosage": "包裝上寫的用法用量",
  "warnings": "包裝上的注意事項",
  "voice_msg": "一段友善的語音提示文字，大約30字。"
}
請注意，你的回答必須只包含 JSON 本身，或是 "NO_MEDICINE" 這個字串，絕對不要加上任何其他說明文字。`;

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
            temperature: 0.1,
        }
    };

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
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
    
    if (!data.candidates || data.candidates.length === 0 || !data.candidates[0].content) {
        throw new Error("AI 拒絕回答或被安全機制阻擋：" + JSON.stringify(data));
    }

    let text = data.candidates[0].content.parts[0].text.trim();
    
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

    loadingOverlay.classList.remove('hidden');
    scanBtn.disabled = true;
    resultCard.classList.add('hidden');
    errorCard.classList.add('hidden');

    try {
        const base64Img = captureBase64Image();
        const aiResponse = await analyzeWithGemini(base64Img);

        if (aiResponse.includes('NO_MEDICINE')) {
            showError("AI 回傳了 NO_MEDICINE");
        } else {
            try {
                const medData = JSON.parse(aiResponse);
                displayResult(medData);
            } catch (parseErr) {
                console.error("JSON 解析失敗", aiResponse);
                showError("AI 回傳的格式有誤：" + aiResponse.substring(0, 100));
            }
        }
    } catch (err) {
        console.error("辨識過程中發生錯誤:", err);
        showError("發生錯誤：" + err.message);
    } finally {
        loadingOverlay.classList.add('hidden');
        scanBtn.disabled = false;
        replayBtn.classList.remove('hidden');
        // Restart video just in case it froze
        if (webcamElement.paused) {
            webcamElement.play().catch(e => console.error(e));
        }
    }
}

function showError(customMsg) {
    errorCard.classList.remove('hidden');
    const subText = document.querySelector('#error-card .error-sub');
    if (customMsg) {
        subText.textContent = customMsg;
        subText.style.color = 'red';
        subText.style.wordBreak = 'break-all';
    } else {
        subText.textContent = '請確保藥物包裝完整出現在鏡頭內，並保持光線明亮後再試一次。';
        subText.style.color = '';
    }
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
    
    const disclaimer = " (詳細用藥請依醫師或藥師指示為準)";
    medWarnings.textContent += disclaimer;

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
    if (!errorCard.classList.contains('hidden')) {
        speak('未偵測到藥物，或是畫面不清楚，請重新拍攝。');
        return;
    }
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
