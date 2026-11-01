/* auth.js — handles the login and signup forms */

function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId).closest(".field");
  field.classList.add("has-error");
  field.querySelector(".error").textContent = message;
}

function clearFieldErrors(form) {
  form.querySelectorAll(".field").forEach((f) => f.classList.remove("has-error"));
}

function showFormAlert(box, message, type = "error") {
  box.className = `alert alert-${type}`;
  box.textContent = message;
  box.classList.remove("hidden");
}

// ---------------- LOGIN ----------------
const loginForm = document.getElementById("loginForm");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(loginForm);
    const alertBox = document.getElementById("formAlert");
    alertBox.classList.add("hidden");

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitBtn = loginForm.querySelector("button[type=submit]");

    if (!email || !password) {
      showFormAlert(alertBox, "Please enter your email and password.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Logging in...";
    try {
      const data = await apiRequest("/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      setSession(data.access_token, data.user);
      window.location.href = "dashboard.html";
    } catch (err) {
      showFormAlert(alertBox, err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Log In";
    }
  });
}

// ---------------- SIGNUP ----------------
const signupForm = document.getElementById("signupForm");
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(signupForm);
    const alertBox = document.getElementById("formAlert");
    alertBox.classList.add("hidden");

    const full_name = document.getElementById("full_name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm_password").value;
    const age = parseInt(document.getElementById("age").value, 10);
    const role = document.getElementById("role").value;
    const agree = document.getElementById("agree").checked;

    let hasError = false;
    if (full_name.length < 2) { showFieldError("full_name", "Please enter your full name."); hasError = true; }
    if (password.length < 8) { showFieldError("password", "Password must be at least 8 characters."); hasError = true; }
    if (password !== confirm) { showFieldError("confirm_password", "Passwords do not match."); hasError = true; }
    if (!age || age < 13) { showFieldError("age", "You must be at least 13 to use MindBridge."); hasError = true; }
    if (!agree) { showFormAlert(alertBox, "Please agree to the Terms & Conditions to continue."); hasError = true; }
    if (hasError) return;

    const submitBtn = signupForm.querySelector("button[type=submit]");
    submitBtn.disabled = true;
    submitBtn.textContent = "Creating account...";
    try {
      const data = await apiRequest("/auth/register", {
        method: "POST",
        auth: false,
        body: { full_name, email, password, age, role },
      });
      setSession(data.access_token, data.user);
      window.location.href = "profile.html?setup=1";
    } catch (err) {
      showFormAlert(alertBox, err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Create Account";
    }
  });
}

function logout() {
  clearSession();
  window.location.href = "login.html";
}
