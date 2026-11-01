/*
  api.js
  ------
  Small shared helper so every page talks to the backend the same way.
  Change API_BASE_URL here if you deploy the backend somewhere else.
*/

const API_BASE_URL = ["localhost", "127.0.0.1"].includes(location.hostname) ? "http://127.0.0.1:8000" : "/api";

function getToken() {
  return localStorage.getItem("mb_token");
}

function setSession(token, user) {
  localStorage.setItem("mb_token", token);
  localStorage.setItem("mb_user", JSON.stringify(user));
}

function getUser() {
  const raw = localStorage.getItem("mb_user");
  return raw ? JSON.parse(raw) : null;
}

function clearSession() {
  localStorage.removeItem("mb_token");
  localStorage.removeItem("mb_user");
}

function requireAuthOrRedirect() {
  if (!getToken()) {
    window.location.href = "login.html";
  }
}

/**
 * apiRequest(path, { method, body, auth })
 * - auth defaults to true (adds the Bearer token)
 * - throws an Error with a friendly .message on failure
 */
async function apiRequest(path, { method = "GET", body = null, auth = true } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth) {
    const token = getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new Error("Can't reach the server. Please make sure the backend is running.");
  }

  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    /* no JSON body */
  }

  if (!res.ok) {
    const message = (data && data.detail) ? data.detail : `Request failed (${res.status}).`;
    if (res.status === 401) {
      clearSession();
    }
    throw new Error(typeof message === "string" ? message : "Something went wrong.");
  }

  return data;
}
