document.addEventListener("DOMContentLoaded", function () {
  const T = {
    ht: {
      sending: "N ap voye...",
      ok: "Mèsi! Nou resevwa demand ou. Nou pral kontakte w byento.",
      okBooking: "Rezèvasyon konfime! Nou pral kontakte w pou konfime detay yo.",
      err: "Gen yon pwoblèm. Tanpri verifye enfòmasyon yo epi eseye ankò.",
      slotTaken: "Yon lòt moun sot rezève kreno sa a. Chwazi yon lòt lè.",
      rate: "Twòp eseye. Tann kèk minit epi eseye ankò.",
      notConfigured: "Sèvis la poko konfigire konplètman sou sèvè a. Tanpri kontakte nou dirèkteman sou WhatsApp.",
      pickDateFirst: "Chwazi yon dat anvan",
      noSlots: "Pa gen kreno disponib jou sa a",
    },
    fr: {
      sending: "Envoi en cours...",
      ok: "Merci ! Nous avons bien reçu votre demande. Nous vous recontacterons bientôt.",
      okBooking: "Réservation confirmée ! Nous vous contacterons pour confirmer les détails.",
      err: "Un problème est survenu. Vérifiez les informations et réessayez.",
      slotTaken: "Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez un autre horaire.",
      rate: "Trop de tentatives. Patientez quelques minutes puis réessayez.",
      notConfigured: "Le service n'est pas encore entièrement configuré côté serveur. Contactez-nous directement sur WhatsApp.",
      pickDateFirst: "Choisissez d'abord une date",
      noSlots: "Aucun créneau disponible ce jour-là",
    },
  };
  function t(key) {
    const lang = document.documentElement.lang === "fr" ? "fr" : "ht";
    return T[lang][key];
  }

  // ---------- Disponibilité des créneaux (page réservation) ----------
  const dateInput = document.getElementById("r-date");
  const timeSelect = document.getElementById("r-time");
  if (dateInput && timeSelect) {
    dateInput.addEventListener("change", async function () {
      timeSelect.innerHTML = "";
      if (!dateInput.value) return;
      const loading = document.createElement("option");
      loading.textContent = "...";
      timeSelect.appendChild(loading);
      try {
        const res = await fetch("/api/reservation?date=" + encodeURIComponent(dateInput.value));
        const data = await res.json();
        timeSelect.innerHTML = "";
        if (!res.ok || !data.available) {
          const opt = document.createElement("option");
          opt.textContent = t("notConfigured");
          opt.disabled = true;
          timeSelect.appendChild(opt);
          return;
        }
        if (data.available.length === 0) {
          const opt = document.createElement("option");
          opt.textContent = t("noSlots");
          opt.disabled = true;
          timeSelect.appendChild(opt);
          return;
        }
        data.available.forEach(function (h) {
          const opt = document.createElement("option");
          opt.value = h;
          opt.textContent = h;
          timeSelect.appendChild(opt);
        });
      } catch {
        timeSelect.innerHTML = "";
        const opt = document.createElement("option");
        opt.textContent = t("notConfigured");
        opt.disabled = true;
        timeSelect.appendChild(opt);
      }
    });
  }

  // ---------- Soumission des formulaires publics ----------
  document.querySelectorAll("form[data-odthan-form][data-endpoint]").forEach(function (form) {
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      const note = form.querySelector(".form-status");
      const submitBtn = form.querySelector('button[type="submit"]');
      const endpoint = form.getAttribute("data-endpoint");
      const isBooking = endpoint === "/api/reservation";

      const payload = {};
      new FormData(form).forEach(function (value, key) {
        if (form.elements[key] && form.elements[key].type === "checkbox") {
          payload[key] = form.elements[key].checked;
        } else {
          payload[key] = value;
        }
      });

      if (submitBtn) submitBtn.disabled = true;
      if (note) { note.style.color = "#555"; note.textContent = t("sending"); }

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Lang": document.documentElement.lang === "fr" ? "fr" : "ht",
          },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(function () { return {}; });

        if (res.ok) {
          if (note) { note.style.color = "#1a7a3c"; note.textContent = isBooking ? t("okBooking") : t("ok"); }
          form.reset();
          if (timeSelect) timeSelect.innerHTML = "";
        } else if (res.status === 409) {
          if (note) { note.style.color = "#B5251F"; note.textContent = t("slotTaken"); }
        } else if (res.status === 429) {
          if (note) { note.style.color = "#B5251F"; note.textContent = t("rate"); }
        } else if (res.status === 503) {
          if (note) { note.style.color = "#B5251F"; note.textContent = t("notConfigured"); }
        } else {
          if (note) { note.style.color = "#B5251F"; note.textContent = (data && data.message) || t("err"); }
        }
      } catch {
        if (note) { note.style.color = "#B5251F"; note.textContent = t("err"); }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  });
});
