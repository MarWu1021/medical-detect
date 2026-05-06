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

// Chat UI Elements
const chatContainer = document.getElementById('chat-container');
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');

// Settings Elements
const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const apiStatus = document.getElementById('api-status');

let currentStream = null;
let geminiApiKey = null;
let currentMedicineContext = null;
let recognition = null;

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
        
        // Init Speech Recognition
        initSpeechRecognition();

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
    const prompt = `你是一個專業的藥物辨識系統與藥師小幫手。請分析圖片內容並嚴格回傳 JSON 格式。
1. 若圖片中沒有任何藥物、藥盒、藥錠或保健食品（例如只是文具、電動刮鬍刀、電器、人臉、背景等），請務必回傳以下 JSON：
{"name": "NO_MEDICINE", "category": "", "instructions": "", "dosage": "", "warnings": "", "voice_msg": ""}

2. 若圖片中確定有藥物或保健食品，請先辨識出藥物名稱，接著**結合你的醫藥與保健知識**來填寫以下 JSON（就算包裝上沒寫，也請用你的知識補充）：
{
  "name": "藥物名稱 (不可超過15個字)",
  "category": "類別 (例如：止痛藥、感冒藥)",
  "instructions": "用途與功效 (若包裝沒寫，請用你的知識補充)",
  "dosage": "一般建議的用法用量 (若包裝沒寫，請用你的知識補充一般成人劑量)",
  "warnings": "重要交互作用或副作用警告 (例如：不可與酒精同服、傷胃、嗜睡等，務必運用你的知識給予貼心提醒)",
  "voice_msg": "一段友善的語音提示，大約30字，可以包含最重要的警告"
}

請確保你的回答是純 JSON 格式，不要加上任何 Markdown 標記 (\`\`\`json) 或其他文字。`;

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
    
    // Clear previous chat context
    chatContainer.classList.add('hidden');
    chatHistory.innerHTML = '';
    currentMedicineContext = null;

    try {
        const base64Img = captureBase64Image();
        const aiResponse = await analyzeWithGemini(base64Img);

        try {
            const medData = JSON.parse(aiResponse);
            if (medData.name === "NO_MEDICINE") {
                showError("AI 回傳了 NO_MEDICINE");
            } else {
                displayResult(medData);
                currentMedicineContext = aiResponse; // Save context for chat
                chatContainer.classList.remove('hidden'); // Show chat UI
            }
        } catch (parseErr) {
            console.error("JSON 解析失敗", aiResponse);
            showError("AI 回傳的格式有誤：" + aiResponse.substring(0, 100));
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

// --- Speech & Chat Logic ---
function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
        recognition = new SpeechRecognition();
        recognition.lang = 'zh-TW';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = function() {
            micBtn.classList.add('recording');
        };

        recognition.onresult = function(event) {
            const speechResult = event.results[0][0].transcript;
            chatInput.value = speechResult;
            handleChatSend(); // Auto-send when speaking stops
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            micBtn.classList.remove('recording');
            alert('語音辨識發生錯誤，請重試或改用打字。');
        };

        recognition.onend = function() {
            micBtn.classList.remove('recording');
        };
    } else {
        micBtn.style.display = 'none'; // Hide if not supported
    }
}

function appendChatBubble(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    chatHistory.appendChild(bubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleChatSend() {
    const text = chatInput.value.trim();
    if (!text || !currentMedicineContext || !geminiApiKey) return;

    chatInput.value = '';
    appendChatBubble(text, 'user');
    
    sendBtn.disabled = true;
    micBtn.disabled = true;
    chatInput.disabled = true;

    try {
        const prompt = `你是一位專業、親切的藥師小幫手。
使用者剛才掃描了以下藥物資訊（JSON格式）：
${currentMedicineContext}

使用者現在對這個藥物有疑問：
「${text}」

請根據藥物資訊，用繁體中文、簡明扼要、且體貼長輩的語氣回答問題。回答大約在50~100字內，直接輸出回答文字就好，不要包含任何 Markdown 或 JSON 標籤。`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
        };

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Chat API Error');
        const data = await response.json();
        const reply = data.candidates[0].content.parts[0].text.trim();
        
        appendChatBubble(reply, 'ai');
        speak(reply); // Auto speak the AI response

    } catch (err) {
        console.error(err);
        appendChatBubble('抱歉，藥師小幫手現在有點忙碌，請稍後再試。', 'ai');
    } finally {
        sendBtn.disabled = false;
        micBtn.disabled = false;
        chatInput.disabled = false;
    }
}

sendBtn.addEventListener('click', handleChatSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSend();
});
micBtn.addEventListener('click', () => {
    if (recognition) {
        try {
            recognition.start();
        } catch(e) {
            console.error("Microphone already started", e);
        }
    }
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
