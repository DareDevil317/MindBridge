/* stress.js */
requireAuthOrRedirect();

document.getElementById("stress_level").addEventListener("input", (e) => {
  document.getElementById("stressLevelVal").textContent = e.target.value;
});
document.getElementById("concentration_difficulty").addEventListener("input", (e) => {
  document.getElementById("concVal").textContent = e.target.value;
});

const bandClass = { Low: "badge-low", Moderate: "badge-moderate", Elevated: "badge-elevated", High: "badge-high" };

document.getElementById("checkinForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const alertBox = document.getElementById("formAlert");
  alertBox.classList.add("hidden");

  const payload = {
    stress_level: parseInt(document.getElementById("stress_level").value, 10),
    sleep_quality: document.getElementById("sleep_quality").value,
    overwhelmed: document.getElementById("overwhelmed").value,
    energy_level: document.getElementById("energy_level").value,
    stress_cause: document.getElementById("stress_cause").value,
    concentration_difficulty: parseInt(document.getElementById("concentration_difficulty").value, 10),
    stress_frequency: document.getElementById("stress_frequency").value,
  };

  const submitBtn = e.target.querySelector("button[type=submit]");
  submitBtn.disabled = true;
  submitBtn.textContent = "Calculating...";

  try {
    const result = await apiRequest("/checkins", { method: "POST", body: payload });

    document.getElementById("questionnaireView").classList.add("hidden");
    document.getElementById("resultView").classList.remove("hidden");
    document.getElementById("resultScore").textContent = result.score;
    const bandBadge = document.getElementById("resultBand");
    bandBadge.textContent = result.band;
    bandBadge.className = `badge ${bandClass[result.band]}`;
    document.getElementById("resultMessage").textContent = result.message;

    if (result.show_support_options) {
      document.getElementById("supportOptions").classList.remove("hidden");
    }
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.classList.remove("hidden");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "See My Wellness Indicator";
  }
});
