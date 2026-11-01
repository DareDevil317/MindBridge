/* chat.js */
requireAuthOrRedirect();

let conversationId = null;
const chatWindow = document.getElementById("chatWindow");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const crisisBanner = document.getElementById("crisisBanner");
const suggestionsRow = document.getElementById("suggestionsRow");

function appendMessage(text, sender, crisis = false) {
  const div = document.createElement("div");
  div.className = `msg ${sender === "user" ? "msg-user" : "msg-ai"}${crisis ? " msg-crisis" : ""}`;
  div.textContent = text;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function renderSuggestions(suggestions) {
  suggestionsRow.innerHTML = "";
  (suggestions || []).forEach((s) => {
    const btn = document.createElement("button");
    btn.className = "btn btn-secondary";
    btn.style.fontSize = "0.85rem";
    btn.textContent = s;
    btn.type = "button";
    btn.onclick = () => {
      chatInput.value = s;
      chatForm.dispatchEvent(new Event("submit"));
    };
    suggestionsRow.appendChild(btn);
  });
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const message = chatInput.value.trim();
  if (!message) return;

  appendMessage(message, "user");
  chatInput.value = "";
  suggestionsRow.innerHTML = "";

  const typingDiv = document.createElement("div");
  typingDiv.className = "msg msg-ai";
  typingDiv.textContent = "Typing...";
  chatWindow.appendChild(typingDiv);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  try {
    const data = await apiRequest("/chat", {
      method: "POST",
      body: { message, conversation_id: conversationId },
    });
    conversationId = data.conversation_id;
    typingDiv.remove();
    appendMessage(data.response, "ai", data.crisis);
    renderSuggestions(data.suggestions);

    if (data.crisis) {
      crisisBanner.classList.remove("hidden");
    }
  } catch (err) {
    typingDiv.remove();
    appendMessage(`Sorry, something went wrong: ${err.message}`, "ai");
  }
});
