/* appointment.js */
requireAuthOrRedirect();

let professionalsCache = [];

const professionalSelect = document.getElementById("professionalSelect");
const apptTime = document.getElementById("apptTime");
const apptDate = document.getElementById("apptDate");

function todayISO() {
  return new Date().toISOString().split("T")[0];
}
apptDate.min = todayISO();
apptDate.value = todayISO();

function populateSlots() {
  const selected = professionalsCache.find((p) => p.id === professionalSelect.value);
  apptTime.innerHTML = "";
  (selected ? selected.available_slots : []).forEach((slot) => {
    const opt = document.createElement("option");
    opt.value = slot;
    opt.textContent = slot;
    apptTime.appendChild(opt);
  });
}

async function loadProfessionalsForBooking() {
  const data = await apiRequest("/professionals", { auth: false });
  professionalsCache = data.professionals;
  professionalSelect.innerHTML = professionalsCache
    .map((p) => `<option value="${p.id}">${p.name} — ${p.specialization} (${p.city})</option>`)
    .join("");

  const params = new URLSearchParams(window.location.search);
  const preselect = params.get("professional");
  if (preselect && professionalsCache.some((p) => p.id === preselect)) {
    professionalSelect.value = preselect;
  }
  populateSlots();
}
professionalSelect.addEventListener("change", populateSlots);

document.getElementById("confirmBtn").addEventListener("click", async () => {
  const alertBox = document.getElementById("bookAlert");
  alertBox.classList.add("hidden");

  const payload = {
    professional_id: professionalSelect.value,
    date: apptDate.value,
    time: apptTime.value,
    appointment_type: document.getElementById("apptType").value,
  };

  try {
    const data = await apiRequest("/appointments", { method: "POST", body: payload });
    const a = data.appointment;
    document.getElementById("confirmationCard").classList.remove("hidden");
    document.getElementById("confirmationDetails").textContent =
      `${a.professional_name} · ${a.date} at ${a.time} · ${a.appointment_type}`;
    loadAppointments();
  } catch (err) {
    alertBox.textContent = err.message;
    alertBox.classList.remove("hidden");
  }
});

async function loadAppointments() {
  const list = document.getElementById("appointmentsList");
  try {
    const data = await apiRequest("/appointments");
    if (data.appointments.length === 0) {
      list.innerHTML = `<p class="muted">You have no appointments yet.</p>`;
      return;
    }
    list.innerHTML = data.appointments.map((a) => `
      <div class="card">
        <span class="badge ${a.status === "cancelled" ? "badge-high" : "badge-low"}">${a.status}</span>
        <h3 style="margin-top:8px;">${a.professional_name}</h3>
        <p class="muted">${a.date} at ${a.time} · ${a.appointment_type}</p>
        ${a.status !== "cancelled" ? `<button class="btn btn-danger" onclick="cancelAppointment('${a._id}')">Cancel</button>` : ""}
      </div>
    `).join("");
  } catch (err) {
    list.innerHTML = `<p class="muted">${err.message}</p>`;
  }
}

async function cancelAppointment(id) {
  try {
    await apiRequest(`/appointments/${id}`, { method: "DELETE" });
    loadAppointments();
  } catch (err) {
    alert(err.message);
  }
}

loadProfessionalsForBooking();
loadAppointments();
