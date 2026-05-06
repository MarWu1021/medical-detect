/**
 * Medication AI Assistant
 * Browser-only prototype with Google Gemini API integration.
 */

const webcamElement = document.getElementById('webcam');
const photoPreview = document.getElementById('photo-preview');
const scanBtn = document.getElementById('scan-btn');
const analyzeBtn = document.getElementById('analyze-btn');
const retakeBtn = document.getElementById('retake-btn');
const uploadInput = document.getElementById('upload-input');
const uploadLabel = document.querySelector('label[for="upload-input"]');
const replayBtn = document.getElementById('replay-btn');
const loadingOverlay = document.getElementById('loading-overlay');
const resultCard = document.getElementById('result-card');
const errorCard = document.getElementById('error-card');

const medName = document.getElementById('med-name');
const medCategory = document.getElementById('med-category');
const medConfidence = document.getElementById('med-confidence');
const medInstructions = document.getElementById('med-instructions');
const medDosage = document.getElementById('med-dosage');
const medWarnings = document.getElementById('med-warnings');
const medSafetyNote = document.getElementById('med-safety-note');

const chatContainer = document.getElementById('chat-container');
const chatHistory = document.getElementById('chat-history');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const micBtn = document.getElementById('mic-btn');

const apiKeyInput = document.getElementById('api-key-input');
const saveKeyBtn = document.getElementById('save-key-btn');
const apiStatus = document.getElementById('api-status');

const zh = {
    initFailed: '\u7121\u6cd5\u555f\u52d5\u76f8\u6a5f\u6216\u521d\u59cb\u5316\u61c9\u7528\u7a0b\u5f0f\uff0c\u8acb\u78ba\u8a8d\u700f\u89bd\u5668\u6b0a\u9650\u3002',
    keySaved: 'API Key \u5df2\u5132\u5b58\uff0c\u53ef\u4ee5\u958b\u59cb\u8fa8\u8b58\u3002',
    keyMissingStatus: '\u5c1a\u672a\u8a2d\u5b9a API Key\uff0c\u7121\u6cd5\u4f7f\u7528 AI \u8fa8\u8b58\u3002',
    noCamera: '\u9019\u500b\u700f\u89bd\u5668\u4e0d\u652f\u63f4\u76f8\u6a5f\u529f\u80fd\uff0c\u8acb\u6539\u7528 Chrome\u3001Edge \u6216 Safari\u3002',
    readImageFailed: '\u7121\u6cd5\u8b80\u53d6\u4e0a\u50b3\u7684\u7167\u7247\u3002',
    cameraNotReady: '\u76f8\u6a5f\u5c1a\u672a\u6e96\u5099\u597d\uff0c\u8acb\u7a0d\u7b49\u4e00\u4e0b\u518d\u62cd\u7167\u3002',
    enterKey: '\u8acb\u5148\u5728\u4e0b\u65b9\u8f38\u5165\u4e26\u5132\u5b58 Google Gemini API Key\u3002',
    needPhoto: '\u8acb\u5148\u62cd\u7167\u6216\u9078\u64c7\u4e00\u5f35\u7167\u7247\u3002',
    noMedicine: '\u7121\u6cd5\u5f9e\u7167\u7247\u4e2d\u78ba\u8a8d\u85e5\u54c1\u3002',
    retryPhoto: '\u8acb\u91cd\u65b0\u62cd\u651d\u6e05\u695a\u7684\u85e5\u76d2\u3001\u85e5\u888b\u6a19\u7c64\u6216\u85e5\u4e38\u6b63\u9762\u3002',
    retryVoice: '\u76ee\u524d\u7121\u6cd5\u78ba\u8a8d\u7167\u7247\u4e2d\u7684\u85e5\u54c1\uff0c\u8acb\u91cd\u65b0\u62cd\u651d\u6e05\u695a\u4e00\u9ede\u3002',
    unknownName: '\u7121\u6cd5\u78ba\u8a8d\u85e5\u540d',
    unknown: '\u7121\u6cd5\u78ba\u8a8d',
    confidence: '\u4fe1\u5fc3\u7a0b\u5ea6',
    notProvided: '\u672a\u63d0\u4f9b',
    followLabel: '\uff0c',
    defaultInstructions: '\u8acb\u4f9d\u85e5\u888b\u3001\u91ab\u5e2b\u6216\u85e5\u5e2b\u6307\u793a\u3002',
    defaultDosage: '\u7121\u6cd5\u5f9e\u7167\u7247\u78ba\u8a8d\uff0c\u8acb\u4f9d\u85e5\u888b\u3001\u91ab\u5e2b\u6216\u85e5\u5e2b\u6307\u793a\u3002',
    defaultWarnings: '\u82e5\u6709\u904e\u654f\u3001\u61f7\u5b55\u3001\u6162\u6027\u75c5\u6216\u6b63\u5728\u4f7f\u7528\u5176\u4ed6\u85e5\u7269\uff0c\u8acb\u5148\u8a62\u554f\u85e5\u5e2b\u6216\u91ab\u5e2b\u3002',
    defaultSafety: '\u8fa8\u8b58\u7d50\u679c\u50c5\u4f9b\u53c3\u8003\uff0c\u5be6\u969b\u7528\u85e5\u8acb\u4f9d\u85e5\u888b\u3001\u91ab\u5e2b\u6216\u85e5\u5e2b\u6307\u793a\u3002',
    speechFailed: '\u8a9e\u97f3\u8fa8\u8b58\u5931\u6557\uff0c\u8acb\u6539\u7528\u6587\u5b57\u8f38\u5165\u6216\u518d\u8a66\u4e00\u6b21\u3002',
    chatFallback: '\u76ee\u524d\u7121\u6cd5\u56de\u7b54\u9019\u500b\u554f\u984c\u3002\u82e5\u8207\u5291\u91cf\u3001\u904e\u654f\u3001\u4f75\u7528\u85e5\u6216\u8eab\u9ad4\u4e0d\u9069\u6709\u95dc\uff0c\u8acb\u76f4\u63a5\u8a62\u554f\u85e5\u5e2b\u6216\u91ab\u5e2b\u3002',
    imageOnly: '\u8acb\u9078\u64c7\u5716\u7247\u6a94\u6848\u3002',
    serviceBusyTitle: 'AI \u670d\u52d9\u66ab\u6642\u5fd9\u788c',
    serviceBusy: 'AI \u6a21\u578b\u76ee\u524d\u4f7f\u7528\u91cf\u904e\u9ad8\uff0c\u7cfb\u7d71\u5df2\u7d93\u81ea\u52d5\u91cd\u8a66\u548c\u5207\u63db\u5099\u7528\u6a21\u578b\u3002\u8acb\u7a0d\u5f8c\u518d\u6309\u4e00\u6b21\u78ba\u8a8d\u8fa8\u8b58\u3002',
    serviceBusyVoice: 'AI \u670d\u52d9\u76ee\u524d\u6bd4\u8f03\u5fd9\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u4e00\u6b21\u3002',
    quotaTitle: 'API \u984d\u5ea6\u5df2\u7528\u5b8c',
    quotaExceeded: '\u9019\u500b Gemini API Key \u4eca\u5929\u7684\u514d\u8cbb\u8acb\u6c42\u984d\u5ea6\u5df2\u7d93\u7528\u5b8c\u3002\u8acb\u660e\u5929\u518d\u8a66\uff0c\u6216\u63db\u4e00\u500b\u6709\u984d\u5ea6\u7684 API Key\u3002',
    quotaVoice: 'Gemini API Key \u4eca\u5929\u984d\u5ea6\u5df2\u7528\u5b8c\uff0c\u8acb\u660e\u5929\u518d\u8a66\u6216\u66f4\u63db API Key\u3002',
    apiFailed: 'AI \u8fa8\u8b58\u670d\u52d9\u767c\u751f\u554f\u984c\uff0c\u8acb\u7a0d\u5f8c\u518d\u8a66\u3002'
};

const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite'];
const BUSY_STATUS = new Set([500, 502, 503, 504]);

let currentStream = null;
let geminiApiKey = null;
let currentMedicineContext = null;
let recognition = null;
let pendingBase64Image = null;

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

async function init() {
    try {
        const savedKey = localStorage.getItem('geminiApiKey');
        if (savedKey) {
            apiKeyInput.value = savedKey;
            geminiApiKey = savedKey;
            updateApiStatus(true);
        } else {
            updateApiStatus(false);
        }

        initSpeechRecognition();
        await startWebcam();
    } catch (err) {
        console.error('Init failed:', err);
        alert(zh.initFailed);
    }
}

function updateApiStatus(hasKey) {
    apiStatus.textContent = hasKey ? zh.keySaved : zh.keyMissingStatus;
    apiStatus.style.color = hasKey ? 'var(--secondary)' : 'var(--warning)';
}

async function startWebcam() {
    if (!navigator.mediaDevices?.getUserMedia) {
        showError(zh.noCamera);
        return;
    }

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'environment' }
        });
    } catch (err) {
        console.warn('Rear camera failed, using default camera:', err);
        currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
    }

    webcamElement.srcObject = currentStream;
    webcamElement.setAttribute('playsinline', '');
    await webcamElement.play();
}

function captureImageDataUrl() {
    canvas.width = webcamElement.videoWidth || 640;
    canvas.height = webcamElement.videoHeight || 480;
    ctx.drawImage(webcamElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.85);
}

function dataUrlToBase64(dataUrl) {
    return dataUrl.split(',')[1];
}

function showPhotoPreview(dataUrl) {
    pendingBase64Image = dataUrlToBase64(dataUrl);
    photoPreview.src = dataUrl;
    photoPreview.classList.remove('hidden');
    webcamElement.classList.add('hidden');
    scannerLineVisible(false);
    scanBtn.classList.add('hidden');
    uploadLabel.classList.add('hidden');
    analyzeBtn.classList.remove('hidden');
    retakeBtn.classList.remove('hidden');
    replayBtn.classList.add('hidden');
    uploadInput.value = '';
    resultCard.classList.add('hidden');
    errorCard.classList.add('hidden');
    chatContainer.classList.add('hidden');
}

function resetPhotoPreview() {
    pendingBase64Image = null;
    photoPreview.removeAttribute('src');
    photoPreview.classList.add('hidden');
    webcamElement.classList.remove('hidden');
    scannerLineVisible(true);
    scanBtn.classList.remove('hidden');
    uploadLabel.classList.remove('hidden');
    analyzeBtn.classList.add('hidden');
    retakeBtn.classList.add('hidden');
    chatContainer.classList.add('hidden');
    if (webcamElement.paused) {
        webcamElement.play().catch(console.error);
    }
}

function scannerLineVisible(isVisible) {
    document.getElementById('scanner-line').classList.toggle('hidden', !isVisible);
}

function readUploadedImage(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error(zh.readImageFailed));
        reader.readAsDataURL(file);
    });
}

function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeFriendlyApiError(status, bodyText) {
    const isQuota = status === 429 || bodyText.includes('RESOURCE_EXHAUSTED') || bodyText.includes('quota');
    const isBusy = BUSY_STATUS.has(status);
    const error = new Error(isQuota ? zh.quotaExceeded : (isBusy ? zh.serviceBusy : zh.apiFailed));
    error.status = status;
    error.bodyText = bodyText;
    error.isQuotaExceeded = isQuota;
    error.isServiceBusy = isBusy;
    return error;
}

async function callGemini(payload) {
    let lastError = null;

    for (const model of GEMINI_MODELS) {
        for (let attempt = 1; attempt <= 2; attempt += 1) {
            try {
                const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    const bodyText = await response.text();
                    throw makeFriendlyApiError(response.status, bodyText);
                }

                return await response.json();
            } catch (err) {
                lastError = err;
                if (err.isQuotaExceeded) break;
                const shouldRetry = err.isServiceBusy || err.name === 'TypeError';
                if (!shouldRetry) throw err;
                await wait(500 * attempt);
            }
        }
    }

    throw lastError || new Error(zh.apiFailed);
}

async function analyzeWithGemini(base64Image) {
    const prompt = `
You are a careful medication identification assistant for users in Taiwan.
Analyze the image and decide whether it contains a medicine package, medicine bag label, box, blister pack, or pill.

Rules:
1. If there is no medicine, the image is blurry, text is unreadable, lighting is poor, or you are not sure, return "name": "NO_MEDICINE".
2. Do not pretend certainty. If a drug name, dosage, or warning cannot be confirmed from the image, say so clearly.
3. Do not diagnose disease, do not tell users to change dosage by themselves, and do not replace a doctor or pharmacist.
4. Respond in Traditional Chinese used in Taiwan. Make the text easy for older adults to understand.
5. Return pure JSON only. Do not use Markdown or code fences.

Return this exact JSON shape:
{
  "name": "drug name, or NO_MEDICINE if unsure",
  "category": "drug category, or unable to confirm",
  "confidence": "high / medium / low, translated to Traditional Chinese",
  "reason": "what evidence you used, or why you are unsure",
  "instructions": "common use instructions; if unclear, tell user to follow the medicine bag or ask a doctor/pharmacist",
  "dosage": "common dosage information; if unclear, say it cannot be confirmed from the photo",
  "warnings": "important warnings, contraindications, or interactions; if unclear, advise asking a pharmacist",
  "safety_note": "辨識結果僅供參考，實際用藥請依藥袋、醫師或藥師指示。",
  "voice_msg": "1 to 2 short Traditional Chinese sentences for older adults, under 80 Chinese characters"
}
`;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
            ]
        }],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json'
        }
    };

    const data = await callGemini(payload);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) {
        throw new Error('Gemini returned no readable result.');
    }

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? jsonMatch[0] : text;
}

function handleCapture() {
    if (!webcamElement.videoWidth) {
        alert(zh.cameraNotReady);
        return;
    }

    showPhotoPreview(captureImageDataUrl());
}

async function handleAnalyze() {
    if (!geminiApiKey) {
        alert(zh.enterKey);
        return;
    }

    if (!pendingBase64Image) {
        alert(zh.needPhoto);
        return;
    }

    loadingOverlay.classList.remove('hidden');
    analyzeBtn.disabled = true;
    retakeBtn.disabled = true;
    resultCard.classList.add('hidden');
    errorCard.classList.add('hidden');
    chatContainer.classList.add('hidden');
    chatHistory.innerHTML = '';
    currentMedicineContext = null;

    try {
        const aiResponse = await analyzeWithGemini(pendingBase64Image);
        const medData = JSON.parse(aiResponse);

        if (medData.name === 'NO_MEDICINE') {
            showError(medData.reason || zh.noMedicine);
            return;
        }

        displayResult(medData);
        currentMedicineContext = medData;
        chatContainer.classList.remove('hidden');
    } catch (err) {
        console.error('Analyze failed:', err);
        showError(err.message);
    } finally {
        loadingOverlay.classList.add('hidden');
        analyzeBtn.disabled = false;
        retakeBtn.disabled = false;
        replayBtn.classList.remove('hidden');
    }
}

function showError(customMsg) {
    errorCard.classList.remove('hidden');
    const mainText = document.querySelector('#error-card .error-msg');
    const subText = document.querySelector('#error-card .error-sub');
    const isServiceBusy = customMsg === zh.serviceBusy;
    const isQuotaExceeded = customMsg === zh.quotaExceeded;
    mainText.textContent = isQuotaExceeded ? zh.quotaTitle : (isServiceBusy ? zh.serviceBusyTitle : zh.noMedicine);
    subText.textContent = customMsg || zh.retryPhoto;
    subText.style.color = customMsg ? 'var(--warning)' : '';
    subText.style.wordBreak = customMsg ? 'break-word' : '';
    speak(isQuotaExceeded ? zh.quotaVoice : (isServiceBusy ? zh.serviceBusyVoice : zh.retryVoice));
}

function displayResult(med) {
    medName.textContent = med.name || zh.unknownName;
    medCategory.textContent = med.category || zh.unknown;
    medConfidence.textContent = `${zh.confidence}：${med.confidence || zh.notProvided}${med.reason ? `${zh.followLabel}${med.reason}` : ''}`;
    medInstructions.textContent = med.instructions || zh.defaultInstructions;
    medDosage.textContent = med.dosage || zh.defaultDosage;
    medWarnings.textContent = med.warnings || zh.defaultWarnings;
    medSafetyNote.textContent = med.safety_note || zh.defaultSafety;

    resultCard.classList.remove('hidden');
    speak(med.voice_msg || `${medName.textContent}。${zh.defaultSafety}`);
}

function speak(text) {
    if (!('speechSynthesis' in window) || !text) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-TW';
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = 'none';
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'zh-TW';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => micBtn.classList.add('recording');
    recognition.onend = () => micBtn.classList.remove('recording');
    recognition.onresult = (event) => {
        chatInput.value = event.results[0][0].transcript;
        handleChatSend();
    };
    recognition.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        micBtn.classList.remove('recording');
        alert(zh.speechFailed);
    };
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
        const prompt = `
You are a careful medication information assistant for users in Taiwan.
Answer in Traditional Chinese, 50 to 120 Chinese characters, easy for older adults.

Recognized medicine context:
${JSON.stringify(currentMedicineContext, null, 2)}

User question:
${text}

Rules:
1. Use only the recognized context and general medication safety principles.
2. Do not diagnose disease or tell the user to change dosage by themselves.
3. If the question involves personal illness, pregnancy, children, allergies, liver/kidney disease, chronic disease, or combined medicines, advise asking a doctor or pharmacist.
4. If information is insufficient, say you are not sure.
`;

        const payload = {
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
        };

        const data = await callGemini(payload);
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!reply) throw new Error('Gemini returned no answer.');

        appendChatBubble(reply, 'ai');
        speak(reply);
    } catch (err) {
        console.error('Chat failed:', err);
        appendChatBubble(zh.chatFallback, 'ai');
        speak(zh.chatFallback);
    } finally {
        sendBtn.disabled = false;
        micBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

scanBtn.addEventListener('click', handleCapture);
analyzeBtn.addEventListener('click', handleAnalyze);
retakeBtn.addEventListener('click', resetPhotoPreview);

uploadInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
        alert(zh.imageOnly);
        return;
    }

    try {
        showPhotoPreview(await readUploadedImage(file));
    } catch (err) {
        console.error(err);
        alert(err.message);
    }
});

replayBtn.addEventListener('click', () => {
    if (!errorCard.classList.contains('hidden')) {
        speak(zh.retryVoice);
        return;
    }

    speak(`${medName.textContent}。${medInstructions.textContent}。${medWarnings.textContent}。${medSafetyNote.textContent}`);
});

sendBtn.addEventListener('click', handleChatSend);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSend();
});
micBtn.addEventListener('click', () => {
    if (!recognition) return;
    try {
        recognition.start();
    } catch (err) {
        console.error('Speech recognition already started:', err);
    }
});

saveKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        geminiApiKey = key;
        localStorage.setItem('geminiApiKey', key);
        updateApiStatus(true);
        alert(zh.keySaved);
    } else {
        localStorage.removeItem('geminiApiKey');
        geminiApiKey = null;
        updateApiStatus(false);
    }
});

window.onload = init;
