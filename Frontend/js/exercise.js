/* exercise.js */
requireAuthOrRedirect();

let timerInterval = null;
let secondsLeft = 20 * 60;

function formatTime(s) {
  const m = Math.floor(s / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
}

document.querySelectorAll(".activity-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const activity = btn.dataset.activity;
    document.getElementById("sessionTitle").textContent = activity;
    document.getElementById("activeSession").classList.remove("hidden");
    document.getElementById("completeMsg").classList.add("hidden");
    secondsLeft = 20 * 60;
    document.getElementById("timerDisplay").textContent = formatTime(secondsLeft);
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      secondsLeft -= 1;
      document.getElementById("timerDisplay").textContent = formatTime(Math.max(secondsLeft, 0));
      if (secondsLeft <= 0) clearInterval(timerInterval);
    }, 1000);
  });
});

document.getElementById("snoozeBtn").addEventListener("click", () => {
  clearInterval(timerInterval);
  document.getElementById("activeSession").classList.add("hidden");
});

document.getElementById("completeBtn").addEventListener("click", async () => {
  clearInterval(timerInterval);
  document.getElementById("completeMsg").classList.remove("hidden");
  // Mark today's wellness-plan exercise item complete, if present
  try {
    const plan = await apiRequest("/wellness-plan");
    const items = plan.items.map((i) =>
      i.activity.toLowerCase().includes("walk") || i.activity.toLowerCase().includes("stretch")
        ? { ...i, done: true }
        : i
    );
    await apiRequest("/wellness-plan", { method: "POST", body: items });
  } catch (_) { /* non-fatal for the demo */ }
});

document.getElementById("saveReminderBtn").addEventListener("click", async () => {
  const status = document.getElementById("reminderStatus");
  try {
    if ("Notification" in window && Notification.permission === "default") {
      await Notification.requestPermission();
    }
    await apiRequest("/reminders", {
      method: "POST",
      body: {
        kind: "exercise",
        time: document.getElementById("reminderTime").value,
        frequency: document.getElementById("reminderFrequency").value,
      },
    });
    status.textContent = "Reminder saved.";
    status.className = "alert alert-success";
  } catch (err) {
    status.textContent = err.message;
    status.className = "alert alert-error";
  }
});
