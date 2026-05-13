const webcamElement = document.getElementById("webcam");
const photoPreview = document.getElementById("photo-preview");
const scanBtn = document.getElementById("scan-btn");
const analyzeBtn = document.getElementById("analyze-btn");
const retakeBtn = document.getElementById("retake-btn");
const uploadInput = document.getElementById("upload-input");
const uploadLabel = document.querySelector("label[for='upload-input']");
const replayBtn = document.getElementById("replay-btn");
const loadingOverlay = document.getElementById("loading-overlay");
const resultCard = document.getElementById("result-card");
const errorCard = document.getElementById("error-card");

const medName = document.getElementById("med-name");
const medCategory = document.getElementById("med-category");
const medConfidence = document.getElementById("med-confidence");
const medInstructions = document.getElementById("med-instructions");
const medDosage = document.getElementById("med-dosage");
const medWarnings = document.getElementById("med-warnings");
const medSafetyNote = document.getElementById("med-safety-note");
const medSource = document.getElementById("med-source");

const chatContainer = document.getElementById("chat-container");
const chatHistory = document.getElementById("chat-history");
const chatInput = document.getElementById("chat-input");
const sendBtn = document.getElementById("send-btn");
const micBtn = document.getElementById("mic-btn");

const apiKeyInput = document.getElementById("api-key-input");
const saveKeyBtn = document.getElementById("save-key-btn");
const apiStatus = document.getElementById("api-status");
const reminderNameInput = document.getElementById("reminder-name");
const reminderTimeInput = document.getElementById("reminder-time");
const addReminderBtn = document.getElementById("add-reminder-btn");
const reminderList = document.getElementById("reminder-list");
const reminderAlert = document.getElementById("reminder-alert");
const reminderAlertTitle = document.getElementById("reminder-alert-title");
const reminderAlertBody = document.getElementById("reminder-alert-body");
const dismissReminderBtn = document.getElementById("dismiss-reminder-btn");

const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite"];
const BUSY_STATUS = new Set([500, 502, 503, 504]);

let currentStream = null;
let geminiApiKey = null;
let currentMedicineContext = null;
let recognition = null;
let pendingBase64Image = null;
let trustedMedicines = [];
let reminders = [];
let firedReminderKeys = new Set();

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

const zh = {
    keySaved: "API Key 已儲存，可以開始辨識。",
    keyMissingStatus: "尚未設定 API Key，無法使用 AI 辨識。",
    noCamera: "這個瀏覽器不支援相機功能，請改用 Chrome、Edge 或 Safari。",
    readImageFailed: "無法讀取上傳的照片。",
    cameraNotReady: "相機尚未準備好，請稍等一下再拍照。",
    enterKey: "請先在下方輸入並儲存 Google Gemini API Key。",
    needPhoto: "請先拍照或選擇一張照片。",
    noMedicine: "無法從照片中確認藥品。",
    retryPhoto: "請重新拍攝清楚的藥盒、藥袋標籤或藥丸正面。",
    retryVoice: "目前無法確認照片中的藥品，請重新拍攝清楚一點。",
    defaultInstructions: "請依藥袋、醫師或藥師指示。",
    defaultDosage: "無法從照片確認，請依藥袋、醫師或藥師指示。",
    defaultWarnings: "若有過敏、懷孕、慢性病或正在使用其他藥物，請先詢問藥師或醫師。",
    defaultSafety: "辨識結果僅供參考，實際用藥請依藥袋、醫師或藥師指示。",
    chatFallback: "目前無法回答這個問題。若與劑量、過敏、併用藥或身體不適有關，請直接詢問藥師或醫師。",
    imageOnly: "請選擇圖片檔案。",
    serviceBusyTitle: "AI 服務暫時忙碌",
    serviceBusy: "AI 模型目前使用量較高，請稍後再試一次。",
    quotaTitle: "API 額度已用完",
    quotaExceeded: "這個 Gemini API Key 今天的免費請求額度可能已經用完。請明天再試，或換一個有額度的 API Key。",
    apiFailed: "AI 辨識服務發生問題，請稍後再試。",
    reminderNeedName: "請輸入藥名。",
    reminderNeedTime: "請選擇提醒時間。",
    reminderEmpty: "尚未設定用藥提醒。",
    reminderTitle: "用藥提醒",
    reminderBodyPrefix: "該用藥了："
};

async function init() {
    const savedKey = localStorage.getItem("geminiApiKey");
    if (savedKey) {
        apiKeyInput.value = savedKey;
        geminiApiKey = savedKey;
    }
    updateApiStatus(Boolean(geminiApiKey));

  await loadTrustedMedicines();
  initReminders();
  initSpeechRecognition();
    await startWebcam();
}

async function loadTrustedMedicines() {
    try {
        const response = await fetch("trusted_medicines.json?v=1");
        trustedMedicines = response.ok ? await response.json() : [];
    } catch {
        trustedMedicines = [];
    }
}

function updateApiStatus(hasKey) {
    apiStatus.textContent = hasKey ? zh.keySaved : zh.keyMissingStatus;
    apiStatus.style.color = hasKey ? "var(--secondary)" : "var(--warning)";
}

async function startWebcam() {
    if (!navigator.mediaDevices?.getUserMedia) {
        showError(zh.noCamera);
        return;
    }

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
    } catch {
        try {
            currentStream = await navigator.mediaDevices.getUserMedia({ video: true });
        } catch {
            showError(zh.noCamera);
            return;
        }
    }

    webcamElement.srcObject = currentStream;
    webcamElement.setAttribute("playsinline", "");
    await webcamElement.play();
}

function captureImageDataUrl() {
    canvas.width = webcamElement.videoWidth || 640;
    canvas.height = webcamElement.videoHeight || 480;
    ctx.drawImage(webcamElement, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
}

function dataUrlToBase64(dataUrl) {
    return dataUrl.split(",")[1] || "";
}

function showPhotoPreview(dataUrl) {
    pendingBase64Image = dataUrlToBase64(dataUrl);
    photoPreview.src = dataUrl;
    photoPreview.classList.remove("hidden");
    webcamElement.classList.add("hidden");
    document.getElementById("scanner-line").classList.add("hidden");
    scanBtn.classList.add("hidden");
    uploadLabel.classList.add("hidden");
    analyzeBtn.classList.remove("hidden");
    retakeBtn.classList.remove("hidden");
    replayBtn.classList.add("hidden");
    resultCard.classList.add("hidden");
    errorCard.classList.add("hidden");
    chatContainer.classList.add("hidden");
    uploadInput.value = "";
}

function resetPhotoPreview() {
    pendingBase64Image = null;
    photoPreview.removeAttribute("src");
    photoPreview.classList.add("hidden");
    webcamElement.classList.remove("hidden");
    document.getElementById("scanner-line").classList.remove("hidden");
    scanBtn.classList.remove("hidden");
    uploadLabel.classList.remove("hidden");
    analyzeBtn.classList.add("hidden");
    retakeBtn.classList.add("hidden");
    replayBtn.classList.add("hidden");
    chatContainer.classList.add("hidden");
    webcamElement.play().catch(() => {});
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
    const isQuota = status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(bodyText);
    const isBusy = BUSY_STATUS.has(status);
    const error = new Error(isQuota ? zh.quotaExceeded : (isBusy ? zh.serviceBusy : zh.apiFailed));
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
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw makeFriendlyApiError(response.status, await response.text());
                }

                return await response.json();
            } catch (err) {
                lastError = err;
                if (err.isQuotaExceeded) break;
                if (!err.isServiceBusy && err.name !== "TypeError") throw err;
                await wait(500 * attempt);
            }
        }
    }

    throw lastError || new Error(zh.apiFailed);
}

async function analyzeWithGemini(base64Image) {
    const prompt = `你是台灣使用者的謹慎藥品辨識助手。請分析圖片是否包含藥袋、藥盒、藥品包裝、鋁箔或藥丸。
規則：
1. 如果看不清楚、不是藥品、或無法確認，name 請回 NO_MEDICINE。
2. 不要假裝確定。無法確認的劑量或警語要明說。
3. 不可診斷疾病，不可叫使用者自行調整劑量。
4. 使用台灣繁體中文，讓長者容易理解。
5. 只回 JSON，不要 Markdown。
格式：
{
  "name": "藥名或 NO_MEDICINE",
  "category": "藥品分類或無法確認",
  "confidence": "高 / 中 / 低",
  "reason": "辨識依據或不確定原因",
  "instructions": "常見用法；若不清楚請使用者依藥袋或詢問醫師藥師",
  "dosage": "常見劑量資訊；若不清楚請說無法由照片確認",
  "warnings": "重要注意事項、禁忌或交互作用；若不清楚請詢問藥師",
  "safety_note": "辨識結果僅供參考，實際用藥請依藥袋、醫師或藥師指示。",
  "voice_msg": "80字內給長者的語音說明"
}`;

    const payload = {
        contents: [{
            parts: [
                { text: prompt },
                { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]
        }],
        generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
        }
    };

    const data = await callGemini(payload);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
    if (!text) throw new Error("Gemini returned no readable result.");
    return text.match(/\{[\s\S]*\}/)?.[0] || text;
}

function normalizeText(value) {
    return String(value || "").toLowerCase().replace(/[()\[\]{}"'.,\s-]/g, "");
}

function findTrustedMedicine(med) {
    const haystack = normalizeText([med.name, med.category, med.reason, med.instructions, med.warnings].join(" "));
    return trustedMedicines.find((item) => {
        const names = [item.official_name, item.display_name, item.active_ingredient, ...(item.aliases || [])];
        return names.some((name) => {
            const needle = normalizeText(name);
            return needle && (haystack.includes(needle) || needle.includes(haystack));
        });
    }) || null;
}

function enrichWithTrustedMedicine(med) {
    const trusted = findTrustedMedicine(med);
    if (!trusted) return { ...med, trusted_source: null };

    return {
        ...med,
        name: trusted.display_name || med.name,
        category: trusted.category || med.category,
        instructions: trusted.plain_indication || med.instructions,
        dosage: trusted.plain_dosage || med.dosage,
        warnings: trusted.plain_warnings || med.warnings,
        safety_note: trusted.plain_safety || med.safety_note,
        trusted_source: {
            name: trusted.source_name,
            url: trusted.source_url,
            official_name: trusted.official_name,
            active_ingredient: trusted.active_ingredient
        }
    };
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

    loadingOverlay.classList.remove("hidden");
    analyzeBtn.disabled = true;
    retakeBtn.disabled = true;
    resultCard.classList.add("hidden");
    errorCard.classList.add("hidden");
    chatContainer.classList.add("hidden");
    chatHistory.innerHTML = "";
    currentMedicineContext = null;

    try {
        const medData = JSON.parse(await analyzeWithGemini(pendingBase64Image));
        if (medData.name === "NO_MEDICINE") {
            showError(medData.reason || zh.noMedicine);
            return;
        }
        const enrichedData = enrichWithTrustedMedicine(medData);
        displayResult(enrichedData);
        currentMedicineContext = enrichedData;
        chatContainer.classList.remove("hidden");
    } catch (err) {
        console.error("Analyze failed:", err);
        showError(err.message || zh.apiFailed);
    } finally {
        loadingOverlay.classList.add("hidden");
        analyzeBtn.disabled = false;
        retakeBtn.disabled = false;
        replayBtn.classList.remove("hidden");
    }
}

function showError(customMsg) {
    errorCard.classList.remove("hidden");
    const mainText = document.querySelector("#error-card .error-msg");
    const subText = document.querySelector("#error-card .error-sub");
    const isServiceBusy = customMsg === zh.serviceBusy;
    const isQuotaExceeded = customMsg === zh.quotaExceeded;
    mainText.textContent = isQuotaExceeded ? zh.quotaTitle : (isServiceBusy ? zh.serviceBusyTitle : zh.noMedicine);
    subText.textContent = customMsg || zh.retryPhoto;
    speak(isQuotaExceeded || isServiceBusy ? subText.textContent : zh.retryVoice);
}

function displayResult(med) {
    medName.textContent = med.name || "無法確認藥名";
    medCategory.textContent = med.category || "無法確認";
    medConfidence.textContent = `信心程度：${med.confidence || "未提供"}${med.reason ? `，${med.reason}` : ""}`;
    medInstructions.textContent = med.instructions || zh.defaultInstructions;
    medDosage.textContent = med.dosage || zh.defaultDosage;
    medWarnings.textContent = med.warnings || zh.defaultWarnings;
    medSafetyNote.textContent = med.safety_note || zh.defaultSafety;
    updateSourceNote(med.trusted_source);
    resultCard.classList.remove("hidden");
    speak(med.voice_msg || `${medName.textContent}。${zh.defaultSafety}`);
}

function updateSourceNote(source) {
    if (!source) {
        medSource.classList.add("hidden");
        medSource.textContent = "";
        return;
    }

    medSource.classList.remove("hidden");
    medSource.innerHTML = "";
    const label = document.createElement("span");
    label.textContent = `資料來源：${source.name || "可信藥品資料"}，${source.official_name || ""} ${source.active_ingredient || ""}`;
    medSource.appendChild(label);
    if (source.url) {
        const link = document.createElement("a");
        link.href = source.url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.textContent = "查看來源";
        medSource.appendChild(document.createTextNode(" "));
        medSource.appendChild(link);
    }
}

function speak(text) {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = "zh-TW";
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
}

function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        micBtn.style.display = "none";
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "zh-TW";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onstart = () => micBtn.classList.add("recording");
    recognition.onend = () => micBtn.classList.remove("recording");
    recognition.onresult = (event) => {
        chatInput.value = event.results[0][0].transcript;
        handleChatSend();
    };
}

function appendChatBubble(text, sender) {
    const bubble = document.createElement("div");
    bubble.className = `chat-bubble ${sender}`;
    bubble.textContent = text;
    chatHistory.appendChild(bubble);
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

async function handleChatSend() {
    const text = chatInput.value.trim();
    if (!text || !currentMedicineContext || !geminiApiKey) return;

    chatInput.value = "";
    appendChatBubble(text, "user");
    sendBtn.disabled = true;
    micBtn.disabled = true;
    chatInput.disabled = true;

    try {
        const prompt = `你是台灣使用者的謹慎用藥資訊助手。請用 50 到 120 字繁體中文回答，容易讓長者理解。
已辨識藥品資訊：
${JSON.stringify(currentMedicineContext, null, 2)}
使用者問題：${text}
規則：不可診斷疾病，不可叫使用者自行調整劑量；若涉及過敏、懷孕、兒童、肝腎疾病、慢性病或併用藥，請建議詢問醫師或藥師。`;

        const data = await callGemini({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.2 }
        });
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        if (!reply) throw new Error("Gemini returned no answer.");
        appendChatBubble(reply, "ai");
        speak(reply);
    } catch {
        appendChatBubble(zh.chatFallback, "ai");
        speak(zh.chatFallback);
    } finally {
        sendBtn.disabled = false;
        micBtn.disabled = false;
        chatInput.disabled = false;
        chatInput.focus();
    }
}

function initReminders() {
    reminders = JSON.parse(localStorage.getItem("medicineReminders") || "[]");
    renderReminders();
    addReminderBtn.addEventListener("click", addReminder);
    dismissReminderBtn.addEventListener("click", () => reminderAlert.classList.add("hidden"));
    setInterval(checkReminders, 10000);
    checkReminders();
}

function saveReminders() {
    localStorage.setItem("medicineReminders", JSON.stringify(reminders));
}

function addReminder() {
    const name = reminderNameInput.value.trim();
    const time = reminderTimeInput.value;
    if (!name) {
        alert(zh.reminderNeedName);
        return;
    }
    if (!time) {
        alert(zh.reminderNeedTime);
        return;
    }
    reminders.push({ id: String(Date.now()), name, time });
    reminderNameInput.value = "";
    reminderTimeInput.value = "";
    saveReminders();
    renderReminders();
}

function deleteReminder(id) {
    reminders = reminders.filter((reminder) => reminder.id !== id);
    saveReminders();
    renderReminders();
}

function renderReminders() {
    reminderList.innerHTML = "";
    if (!reminders.length) {
        const empty = document.createElement("p");
        empty.className = "helper-text";
        empty.textContent = zh.reminderEmpty;
        reminderList.appendChild(empty);
        return;
    }

    reminders.slice().sort((a, b) => a.time.localeCompare(b.time)).forEach((reminder) => {
        const item = document.createElement("div");
        item.className = "reminder-item";
        const text = document.createElement("div");
        text.innerHTML = `<strong>${reminder.name}</strong><span>${reminder.time}</span>`;
        const button = document.createElement("button");
        button.className = "delete-reminder-btn";
        button.textContent = "刪除";
        button.addEventListener("click", () => deleteReminder(reminder.id));
        item.appendChild(text);
        item.appendChild(button);
        reminderList.appendChild(item);
    });
}

function checkReminders() {
    if (!reminders.length) return;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const currentDate = now.toISOString().slice(0, 10);
    firedReminderKeys = new Set([...firedReminderKeys].filter((key) => key.startsWith(currentDate)));

    reminders.filter((reminder) => reminder.time === currentTime).forEach((reminder) => {
        const key = `${currentDate}-${reminder.id}-${currentTime}`;
        if (firedReminderKeys.has(key)) return;
        firedReminderKeys.add(key);
        const body = `${zh.reminderBodyPrefix}${reminder.name}`;
        reminderAlertTitle.textContent = zh.reminderTitle;
        reminderAlertBody.textContent = body;
        reminderAlert.classList.remove("hidden");
        speak(body);
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification(zh.reminderTitle, { body });
        }
    });
}

scanBtn.addEventListener("click", () => {
    if (!webcamElement.videoWidth) {
        alert(zh.cameraNotReady);
        return;
    }
    showPhotoPreview(captureImageDataUrl());
});

analyzeBtn.addEventListener("click", handleAnalyze);
retakeBtn.addEventListener("click", resetPhotoPreview);

uploadInput.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
        alert(zh.imageOnly);
        return;
    }
    try {
        showPhotoPreview(await readUploadedImage(file));
    } catch (err) {
        alert(err.message || zh.readImageFailed);
    }
});

replayBtn.addEventListener("click", () => {
    if (!errorCard.classList.contains("hidden")) {
        speak(zh.retryVoice);
        return;
    }
    speak(`${medName.textContent}。${medInstructions.textContent}。${medWarnings.textContent}。${medSafetyNote.textContent}`);
});

sendBtn.addEventListener("click", handleChatSend);
chatInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") handleChatSend();
});
micBtn.addEventListener("click", () => {
    if (!recognition) return;
    try {
        recognition.start();
    } catch {
        // Speech recognition may already be active.
    }
});

saveKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    if (key) {
        geminiApiKey = key;
        localStorage.setItem("geminiApiKey", key);
        updateApiStatus(true);
        alert(zh.keySaved);
    } else {
        geminiApiKey = null;
        localStorage.removeItem("geminiApiKey");
        updateApiStatus(false);
    }
});

window.addEventListener("load", init);
