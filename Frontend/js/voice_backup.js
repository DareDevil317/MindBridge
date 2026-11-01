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
        micBtn.classList.add("listening");
        micStatus.textContent = "Listening...";
    };
    recognition.onresult = (event) => {
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