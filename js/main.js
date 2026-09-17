document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".year-js").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  // Numéro WhatsApp: si le backend est configuré et qu'un numéro a été
  // enregistré depuis l'admin, on l'utilise à la place de la valeur par
  // défaut codée dans le HTML.
  var waLink = document.querySelector(".whatsapp-float");
  if (waLink) {
    fetch("/api/settings")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.whatsapp_number) {
          var msg = document.documentElement.lang === "fr"
            ? "Bonjour Odthan, je souhaiterais créer une entreprise et obtenir plus d'informations."
            : "Bonjou Odthan, mwen ta renmen kreye yon biznis epi mwen ta renmen jwenn plis enfòmasyon.";
          var digits = data.whatsapp_number.replace(/[^0-9]/g, "");
          waLink.href = "https://wa.me/" + digits + "?text=" + encodeURIComponent(msg);
        }
      })
      .catch(function () { /* on garde le numéro par défaut du HTML */ });
  }

  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.querySelector(".mobile-nav");
  if (toggle && mobileNav) {
    toggle.addEventListener("click", function () {
      const open = mobileNav.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      document.body.style.overflow = open ? "hidden" : "";
    });
    mobileNav.querySelectorAll("a, button.btn").forEach(function (el) {
      el.addEventListener("click", function () {
        mobileNav.classList.remove("is-open");
        toggle.setAttribute("aria-expanded", "false");
        document.body.style.overflow = "";
      });
    });
  }
});
