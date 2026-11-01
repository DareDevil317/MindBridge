/* professionals.js */
requireAuthOrRedirect();

const grid = document.getElementById("professionalsGrid");
const locationStatus = document.getElementById("locationStatus");

function renderProfessionals(list) {
  grid.innerHTML = "";
  if (list.length === 0) {
    grid.innerHTML = `<p class="muted">No demo professionals found for that city. Try "Kanpur", "Lucknow", or "Delhi".</p>`;
    return;
  }
  list.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <span class="badge badge-demo">DEMO</span>
      <h3 style="margin-top:8px;">${p.name}</h3>
      <p class="muted">${p.specialization} · ${p.experience_years} yrs experience</p>
      <p class="muted">📍 ${p.city}</p>
      <p style="font-size:0.9rem;">${p.bio}</p>
      <p style="font-size:0.85rem;"><strong>Available:</strong> ${p.available_slots.join(", ")}</p>
      <div style="display:flex; gap:8px; margin-top:10px;">
        <a class="btn btn-secondary" href="appointment.html?professional=${p.id}">View / Book</a>
        ${p.phone_verified ? `<a class="btn btn-primary" href="tel:${p.phone}">Call</a>` : ""}
      </div>
    `;
    grid.appendChild(card);
  });
}

async function loadProfessionals(city) {
  locationStatus.textContent = "Loading professionals...";
  try {
    const query = city ? `?city=${encodeURIComponent(city)}` : "";
    const data = await apiRequest(`/professionals${query}`, { auth: false });
    renderProfessionals(data.professionals);
    locationStatus.textContent = city ? `Showing demo professionals near "${city}".` : "Showing all demo professionals.";
  } catch (err) {
    locationStatus.textContent = err.message;
  }
}

document.getElementById("useLocationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    locationStatus.textContent = "Location isn't supported in this browser. Please enter a city instead.";
    return;
  }
  locationStatus.textContent = "Requesting location permission...";
  navigator.geolocation.getCurrentPosition(
    () => {
      // Prototype note: we don't reverse-geocode to avoid exposing exact coordinates.
      // In a full build, send lat/lng to the backend over HTTPS to find nearby providers.
      locationStatus.textContent = "Location received. Showing nearby demo professionals.";
      loadProfessionals("Kanpur");
    },
    () => {
      locationStatus.textContent = "Location permission denied. Please enter a city instead.";
    }
  );
});

document.getElementById("searchCityBtn").addEventListener("click", () => {
  const city = document.getElementById("cityInput").value.trim();
  loadProfessionals(city);
});

loadProfessionals();
