/* emergency.js — fills locally saved emergency call shortcuts */
const CONTACT_NAME_KEY = "mb_emergency_contact_name";
const CONTACT_PHONE_KEY = "mb_emergency_contact_phone";
const HELPLINE_PHONE_KEY = "mb_medical_helpline_phone";
const DEFAULT_HELPLINE_PHONE = "14416";

function phoneHref(phone) {
    const digits = phone.replace(/\D/g, "");
    return `tel:${phone.trim().startsWith("+") ? "+" : ""}${digits}`;
}

const contactName = localStorage.getItem(CONTACT_NAME_KEY) || "";
const contactPhone = localStorage.getItem(CONTACT_PHONE_KEY) || "";
const helplinePhone = localStorage.getItem(HELPLINE_PHONE_KEY) || DEFAULT_HELPLINE_PHONE;

document.querySelectorAll("[data-emergency-contact-name]").forEach((element) => {
    element.textContent = contactName || "No emergency contact saved";
});

document.querySelectorAll("[data-emergency-contact-call]").forEach((element) => {
    if (contactPhone) {
        element.href = phoneHref(contactPhone);
        if (element.hasAttribute("data-emergency-contact-dashboard")) {
            element.textContent = `Call ${contactName || "trusted contact"}`;
        }
        element.classList.remove("hidden");
    } else {
        element.classList.add("hidden");
    }
});

document.querySelectorAll("[data-medical-helpline]").forEach((element) => {
    element.href = phoneHref(helplinePhone);
    element.textContent = `Call medical helpline (${helplinePhone})`;
});

document.querySelectorAll("[data-emergency-contact-empty]").forEach((element) => {
    element.classList.toggle("hidden", Boolean(contactPhone));
});

/* ---- Share my location ---- */
const shareBtn = document.getElementById("shareLocationBtn");
if (shareBtn) {
    const shareStatus = document.getElementById("shareStatus");
    const shareActions = document.getElementById("shareActions");
    const shareWhatsApp = document.getElementById("shareWhatsApp");
    const shareSms = document.getElementById("shareSms");
    const shareMap = document.getElementById("shareMap");
    const shareCopy = document.getElementById("shareCopy");
    let shareMessage = "";

    function whatsappNumber(phone) {
        let digits = phone.replace(/\D/g, "");
        if (digits.length === 10) digits = "91" + digits; // assumes India when no country code is saved
        return digits;
    }

    shareBtn.addEventListener("click", () => {
        if (!navigator.geolocation) {
            shareStatus.textContent = "Location isn't supported in this browser.";
            return;
        }
        shareBtn.disabled = true;
        shareStatus.textContent = "Getting your location... please allow the browser permission prompt.";
        shareActions.classList.add("hidden");

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                const acc = Math.round(accuracy);
                const mapUrl = `https://www.google.com/maps?q=${latitude.toFixed(6)},${longitude.toFixed(6)}`;
                shareMessage = `I need help right now. My current location (accuracy about ${acc} m): ${mapUrl} - sent from MindBridge`;
                const encoded = encodeURIComponent(shareMessage);

                shareMap.href = mapUrl;
                if (contactPhone) {
                    shareWhatsApp.href = `https://wa.me/${whatsappNumber(contactPhone)}?text=${encoded}`;
                    shareSms.href = `sms:${contactPhone.replace(/[^\d+]/g, "")}?body=${encoded}`;
                    shareWhatsApp.classList.remove("hidden");
                    shareSms.classList.remove("hidden");
                    shareStatus.textContent = `Location found (accuracy about ${acc} m). Choose how to send it to ${contactName || "your trusted person"}.`;
                } else {
                    shareWhatsApp.classList.add("hidden");
                    shareSms.classList.add("hidden");
                    shareStatus.textContent = `Location found (accuracy about ${acc} m). No trusted person is saved, so copy the message and send it yourself, or add one in Settings.`;
                }
                shareActions.classList.remove("hidden");
                shareBtn.disabled = false;
                shareBtn.textContent = "📍 Refresh my location";
            },
            (err) => {
                const reasons = {
                    1: "Location permission was denied. Allow it in the browser's address bar and try again.",
                    2: "Your location couldn't be determined. Check that location is turned on for this device.",
                    3: "Getting your location took too long. Please try again.",
                };
                shareStatus.textContent = reasons[err.code] || "Couldn't get your location.";
                shareBtn.disabled = false;
            }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    });

    shareCopy.addEventListener("click", async() => {
        try {
            await navigator.clipboard.writeText(shareMessage);
            shareStatus.textContent = "Message copied. Paste it into any chat app.";
        } catch (_) {
            shareStatus.textContent = shareMessage;
        }
    });
}