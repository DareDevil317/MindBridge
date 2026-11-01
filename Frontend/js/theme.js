/* theme.js — shared color-theme preference */
const THEME_STORAGE_KEY = "mb_theme";

function applyTheme(theme) {
  const isDark = theme === "dark";
  document.documentElement.dataset.theme = isDark ? "dark" : "light";

  document.querySelectorAll("[data-theme-toggle]").forEach((button) => {
    button.textContent = isDark ? "☀️ Light mode" : "🌙 Dark mode";
    button.setAttribute("aria-pressed", String(isDark));
    button.setAttribute("aria-label", `Switch to ${isDark ? "light" : "dark"} mode`);
  });
  document.dispatchEvent(new CustomEvent("mindbridge:themechange", { detail: { theme: isDark ? "dark" : "light" } }));
}

function ensureThemeToggle() {
  if (!document.querySelector("[data-theme-toggle]")) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "btn btn-secondary theme-toggle theme-toggle-floating";
    button.setAttribute("data-theme-toggle", "");
    button.setAttribute("aria-pressed", "false");
    button.textContent = "🌙 Dark mode";
    document.body.appendChild(button);
  }

  applyTheme(document.documentElement.dataset.theme);
}

applyTheme(localStorage.getItem(THEME_STORAGE_KEY) || "light");
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ensureThemeToggle, { once: true });
} else {
  ensureThemeToggle();
}

document.addEventListener("click", (event) => {
  const toggle = event.target.closest("[data-theme-toggle]");
  if (!toggle) return;

  const theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
});
