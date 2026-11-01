/* dashboard.js */
requireAuthOrRedirect();

(async function initDashboard() {
  const user = getUser();
  if (user) {
    document.getElementById("greeting").textContent = `Good day, ${user.full_name.split(" ")[0]} 👋`;
  }

  try {
    const { checkins } = await apiRequest("/checkins?limit=7");

    if (checkins.length === 0) {
      document.getElementById("chartEmpty").classList.remove("hidden");
      document.getElementById("statWellness").textContent = "—";
      document.getElementById("statMood").textContent = "—";
    } else {
      const latest = checkins[0];
      document.getElementById("statWellness").textContent = `${latest.score} (${latest.band})`;
      document.getElementById("statMood").textContent = `${latest.stress_level}/5`;

      const ordered = [...checkins].reverse();
      const ctx = document.getElementById("trendChart");
      const chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: ordered.map((c) => new Date(c.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })),
          datasets: [{
            label: "Wellness indicator",
            data: ordered.map((c) => c.score),
            borderColor: "#4F46E5",
            backgroundColor: "rgba(79,70,229,0.12)",
            tension: 0.35,
            fill: true,
          }],
        },
        options: {
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } },
            y: { min: 0, max: 100, ticks: { color: chartTextColor() }, grid: { color: chartGridColor() } },
          },
        },
      });
      document.addEventListener("mindbridge:themechange", () => {
        chart.options.scales.x.ticks.color = chartTextColor();
        chart.options.scales.y.ticks.color = chartTextColor();
        chart.options.scales.x.grid.color = chartGridColor();
        chart.options.scales.y.grid.color = chartGridColor();
        chart.update();
      });
    }

    // Streak: count consecutive days with a check-in ending today (simple heuristic)
    let streak = 0;
    let cursor = new Date();
    const dateStrings = new Set(checkins.map((c) => new Date(c.created_at).toDateString()));
    while (dateStrings.has(cursor.toDateString())) {
      streak += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    document.getElementById("statStreak").textContent = `${streak} day${streak === 1 ? "" : "s"}`;
  } catch (err) {
    // Likely the DB isn't connected yet — show placeholders rather than break the page.
    document.getElementById("chartEmpty").classList.remove("hidden");
    document.getElementById("chartEmpty").textContent = err.message;
  }

  try {
    const plan = await apiRequest("/wellness-plan");
    const done = plan.items.filter((i) => i.done).length;
    document.getElementById("statExercise").textContent = `${done}/${plan.items.length} today`;
  } catch (_) {
    document.getElementById("statExercise").textContent = "—";
  }
})();

function chartTextColor() {
  return document.documentElement.dataset.theme === "dark" ? "#AAB4C3" : "#5B667A";
}

function chartGridColor() {
  return document.documentElement.dataset.theme === "dark" ? "rgba(170,180,195,0.18)" : "rgba(91,102,122,0.12)";
}
