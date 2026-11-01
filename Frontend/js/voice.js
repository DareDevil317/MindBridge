/* voice.js */
requireAuthOrRedirect();

const micBtn = document.getElementById("micBtn");
const micStatus = document.getElementById("micStatus");
const voiceWindow = document.getElementById("voiceChatWindow");
const crisisBannerVoice = document.getElementById("crisisBannerVoice");
const muteBtn = document.getElementById("muteBtn");
const stopBtn = document.getElementById("stopBtn");
const retryBtn = document.getElementById("retryBtn");

let conversationId = null;
let muted = false;
let lastTranscript = "";

const SpeechRecognitionImpl = window.SpeechRecognition || window.webkitSpeechRecognition;
const speechSupported = !!SpeechRecognitionImpl && "speechSynthesis" in window;

if (!speechSupported) {
    document.getElementById("unsupportedNotice").classList.remove("hidden");
    micBtn.disabled = true;
}

function addVoiceMessage(text, sender, crisis = false) {
    const div = document.createElement("div");
    div.className = `msg ${sender === "user" ? "msg-user" : "msg-ai"}${crisis ? " msg-crisis" : ""}`;
    div.textContent = text;
    voiceWindow.appendChild(div);
    voiceWindow.scrollTop = voiceWindow.scrollHeight;
}

function speak(text) {
    if (muted || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1;
    window.speechSynthesis.speak(utterance);
}

async function sendToAI(transcript) {
    addVoiceMessage(transcript, "user");
    micStatus.textContent = "Thinking...";
    try {
        const data = await apiRequest("/chat", {
            method: "POST",
            body: { message: transcript, conversation_id: conversationId },
        });
        conversationId = data.conversation_id;
        addVoiceMessage(data.response, "ai", data.crisis);
        speak(data.response);
        if (data.crisis) crisisBannerVoice.classList.remove("hidden");
        micStatus.textContent = "Tap to talk";
    } catch (err) {
        addVoiceMessage(`Sorry, something went wrong: ${err.message}`, "ai");
        micStatus.textContent = "Tap to talk";
    }
}

if (speechSupported) {
    const recognition = new SpeechRecognitionImpl();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    recognition.onstart = () => {
        clipTranscript = "";
        startRecording();
        micBtn.classList.add("listening");
        micStatus.textContent = "Listening...";
    };
    recognition.onresult = (event) => {
        clipTranscript = event.results[0][0].transcript;
        const transcript = event.results[0][0].transcript;
        lastTranscript = transcript;
        sendToAI(transcript);
    };
    recognition.onerror = (event) => {
        micStatus.textContent = event.error === "not-allowed" ?
            "Microphone permission denied. You can use text chat instead." :
            "Didn't catch that — tap to try again.";
    };
    recognition.onend = () => {
        micBtn.classList.remove("listening");
        finishVoiceClip();
    };

    micBtn.addEventListener("click", () => {
        try { recognition.start(); } catch (_) { /* already started */ }
    });
    stopBtn.addEventListener("click", () => {
        recognition.stop();
        window.speechSynthesis.cancel();
        micStatus.textContent = "Tap to talk";
    });
    retryBtn.addEventListener("click", () => {
        if (lastTranscript) sendToAI(lastTranscript);
    });
}

muteBtn.addEventListener("click", () => {
    muted = !muted;
    muteBtn.textContent = muted ? "Unmute replies" : "Mute replies";
    if (muted) window.speechSynthesis.cancel();
});

/* ---- Voice signal (experimental): record the mic, analyze pace and pauses ---- */
let clipTranscript = "";
let recCtx = null,
    recStream = null,
    recProcessor = null,
    recSource = null;
let recChunks = [];
let recRate = 44100;

const voiceSignalEl = document.createElement("p");
voiceSignalEl.className = "muted";
voiceSignalEl.style.fontSize = "0.85rem";
micStatus.insertAdjacentElement("afterend", voiceSignalEl);

async function startRecording() {
    try {
        recStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        recCtx = new(window.AudioContext || window.webkitAudioContext)();
        recRate = recCtx.sampleRate;
        recSource = recCtx.createMediaStreamSource(recStream);
        recProcessor = recCtx.createScriptProcessor(4096, 1, 1);
        recChunks = [];
        recProcessor.onaudioprocess = (e) => {
            recChunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
        };
        recSource.connect(recProcessor);
        recProcessor.connect(recCtx.destination); // outputs silence, needed so the processor runs
    } catch (_) {
        recChunks = [];
    }
}

function stopRecording() {
    if (recProcessor) { recProcessor.disconnect();
        recProcessor.onaudioprocess = null; }
    if (recSource) recSource.disconnect();
    if (recStream) recStream.getTracks().forEach((t) => t.stop());
    if (recCtx) recCtx.close();
    const total = recChunks.reduce((n, c) => n + c.length, 0);
    const samples = new Float32Array(total);
    let off = 0;
    for (const c of recChunks) { samples.set(c, off);
        off += c.length; }
    recChunks = [];
    recProcessor = recSource = recStream = recCtx = null;
    return { samples, rate: recRate };
}

function toWavBase64(samples, rate) {
    const target = 16000;
    const ratio = rate / target;
    const outLen = Math.floor(samples.length / ratio);
    const pcm = new Int16Array(outLen);
    for (let i = 0; i < outLen; i++) {
        const start = Math.floor(i * ratio);
        const end = Math.min(samples.length, Math.floor((i + 1) * ratio));
        let sum = 0;
        for (let j = start; j < end; j++) sum += samples[j];
        const v = Math.max(-1, Math.min(1, sum / Math.max(1, end - start)));
        pcm[i] = v < 0 ? v * 0x8000 : v * 0x7fff;
    }
    const buffer = new ArrayBuffer(44 + pcm.length * 2);
    const view = new DataView(buffer);
    const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
    writeStr(0, "RIFF");
    view.setUint32(4, 36 + pcm.length * 2, true);
    writeStr(8, "WAVE");
    writeStr(12, "fmt ");
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, target, true);
    view.setUint32(28, target * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, "data");
    view.setUint32(40, pcm.length * 2, true);
    for (let i = 0; i < pcm.length; i++) view.setInt16(44 + i * 2, pcm[i], true);
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 0x8000) {
        binary += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(binary);
}

async function finishVoiceClip() {
    const { samples, rate } = stopRecording();
    if (!samples.length) return;
    if (!clipTranscript) { voiceSignalEl.textContent = ""; return; }
    voiceSignalEl.textContent = "Analyzing your voice sample...";
    try {
        const result = await apiRequest("/voice/analyze", {
            method: "POST",
            body: { audio: toWavBase64(samples, rate), transcript: clipTranscript },
        });
        voiceSignalEl.textContent = `Voice signal (experimental): ${result.signal}. ${result.message}`;
    } catch (err) {
        voiceSignalEl.textContent = err.message;
    }
}