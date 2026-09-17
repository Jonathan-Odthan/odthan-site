(function () {
  const isLoginPage = Boolean(document.getElementById("login-form"));
  let csrfToken = null;

  async function getCsrfToken() {
    const res = await fetch("/api/csrf-token");
    const data = await res.json();
    csrfToken = data.csrfToken;
    return csrfToken;
  }

  async function api(path, options = {}) {
    const opts = Object.assign({ credentials: "same-origin" }, options);
    opts.headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
    if (options.method && options.method !== "GET") {
      if (!csrfToken) await getCsrfToken();
      opts.headers["X-CSRF-Token"] = csrfToken;
    }
    const res = await fetch(path, opts);
    let data = {};
    try { data = await res.json(); } catch { /* no body */ }
    return { res, data };
  }

  // ---------- Login page ----------
  if (isLoginPage) {
    const form = document.getElementById("login-form");
    const status = document.getElementById("login-status");
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      status.textContent = "";
      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;
      try {
        const { res, data } = await api("/api/admin/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        if (res.ok) {
          window.location.href = "/admin/dashboard.html";
        } else if (res.status === 423) {
          status.textContent = "Compte temporairement verrouillé après plusieurs échecs. Réessayez plus tard.";
        } else if (res.status === 429) {
          status.textContent = "Trop de tentatives. Réessayez plus tard.";
        } else if (res.status === 503) {
          status.textContent = data.message || "Service non configuré.";
        } else {
          status.textContent = data.message || "E-mail ou mot de passe incorrect.";
        }
      } catch {
        status.textContent = "Erreur réseau. Réessayez.";
      }
    });
    return;
  }

  // ---------- Dashboard page ----------
  const whoEl = document.getElementById("who");
  const globalStatus = document.getElementById("global-status");

  async function guardSession() {
    const { res, data } = await api("/api/admin/me");
    if (!res.ok) {
      window.location.href = "/admin/login.html";
      return null;
    }
    whoEl.textContent = data.email + " (" + data.role + ")";
    return data;
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function fmtDate(iso) {
    try { return new Date(iso).toLocaleString("fr-FR"); } catch { return iso; }
  }

  const STATUS_OPTIONS = {
    leads: ["new", "contacted", "closed"],
    starts: ["new", "contacted", "closed"],
    bookings: ["confirmed", "cancelled", "completed"],
  };

  function statusSelect(kind, id, current) {
    const opts = STATUS_OPTIONS[kind]
      .map((s) => `<option value="${s}" ${s === current ? "selected" : ""}>${s}</option>`)
      .join("");
    return `<select class="status-select" data-kind="${kind}" data-id="${id}">${opts}</select>`;
  }

  async function loadLeads() {
    const { res, data } = await api("/api/admin/leads");
    const body = document.getElementById("leads-body");
    const empty = document.getElementById("leads-empty");
    if (!res.ok) { globalStatus.textContent = data.message || "Erreur de chargement."; return; }
    body.innerHTML = "";
    if (!data.items.length) { empty.style.display = "block"; return; }
    empty.style.display = "none";
    data.items.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDate(item.created_at)}</td>
        <td>${escapeHtml(item.name)}<br><span style="color:#888">${escapeHtml(item.city || "")} ${escapeHtml(item.department || "")}</span></td>
        <td>${escapeHtml(item.phone)}<br>${escapeHtml(item.email)}${item.whatsapp ? "<br>WA: " + escapeHtml(item.whatsapp) : ""}</td>
        <td style="max-width:280px;white-space:pre-wrap">${escapeHtml(item.message)}</td>
        <td>${statusSelect("leads", item.id, item.status)}</td>
      `;
      body.appendChild(tr);
    });
  }

  async function loadBookings() {
    const { res, data } = await api("/api/admin/bookings");
    const body = document.getElementById("bookings-body");
    const empty = document.getElementById("bookings-empty");
    if (!res.ok) { globalStatus.textContent = data.message || "Erreur de chargement."; return; }
    body.innerHTML = "";
    if (!data.items.length) { empty.style.display = "block"; return; }
    empty.style.display = "none";
    data.items.forEach((item) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${escapeHtml(item.slot_date)} ${escapeHtml(String(item.slot_time).slice(0,5))}</td>
        <td>${escapeHtml(item.service)}</td>
        <td>${item.consult_type === "online" ? "En ligne" : "En personne"}</td>
        <td>${escapeHtml(item.name)}<br><span style="color:#888">${escapeHtml(item.city || "")}</span></td>
        <td>${escapeHtml(item.phone)}<br>${escapeHtml(item.email)}</td>
        <td>${statusSelect("bookings", item.id, item.status)}</td>
      `;
      body.appendChild(tr);
    });
  }

  async function loadStarts() {
    const { res, data } = await api("/api/admin/business-starts");
    const body = document.getElementById("starts-body");
    const empty = document.getElementById("starts-empty");
    if (!res.ok) { globalStatus.textContent = data.message || "Erreur de chargement."; return; }
    body.innerHTML = "";
    if (!data.items.length) { empty.style.display = "block"; return; }
    empty.style.display = "none";
    data.items.forEach((item) => {
      const needsFlags = ["website_yn","shop_yn","facebook_yn","instagram_yn","seo_yn"]
        .filter((k) => item[k]).map((k) => k.replace("_yn","")).join(", ");
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${fmtDate(item.created_at)}</td>
        <td>${escapeHtml(item.name)}<br>${escapeHtml(item.phone)}<br>${escapeHtml(item.email)}</td>
        <td>${escapeHtml(item.business_name || "—")}<br><span style="color:#888">${escapeHtml(item.industry || "")}</span></td>
        <td style="max-width:260px;white-space:pre-wrap">${escapeHtml(item.description)}</td>
        <td>${escapeHtml(needsFlags || item.needs || "—")}</td>
        <td>${statusSelect("starts", item.id, item.status)}</td>
      `;
      body.appendChild(tr);
    });
  }

  async function loadSettings() {
    const { res, data } = await api("/api/admin/settings");
    if (res.ok) {
      document.getElementById("whatsapp-number").value = (data.settings && data.settings.whatsapp_number) || "";
    }
  }

  const endpointFor = { leads: "/api/admin/leads", bookings: "/api/admin/bookings", starts: "/api/admin/business-starts" };

  document.addEventListener("change", async function (e) {
    if (!e.target.classList.contains("status-select")) return;
    const kind = e.target.getAttribute("data-kind");
    const id = e.target.getAttribute("data-id");
    const status = e.target.value;
    const { res, data } = await api(endpointFor[kind], { method: "PATCH", body: JSON.stringify({ id, status }) });
    if (!res.ok) {
      alert(data.message || "Impossible de mettre à jour le statut.");
    }
  });

  document.getElementById("save-settings").addEventListener("click", async function () {
    const value = document.getElementById("whatsapp-number").value.trim();
    const statusEl = document.getElementById("settings-status");
    statusEl.style.color = "#555";
    statusEl.textContent = "Enregistrement...";
    const { res, data } = await api("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify({ key: "whatsapp_number", value }),
    });
    if (res.ok) {
      statusEl.style.color = "#1a7a3c";
      statusEl.textContent = "Réglages enregistrés.";
    } else {
      statusEl.style.color = "#B5251F";
      statusEl.textContent = data.message || "Erreur d'enregistrement.";
    }
  });

  document.querySelectorAll(".tab-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("is-active"));
      document.querySelectorAll(".panel").forEach((p) => p.classList.remove("is-active"));
      btn.classList.add("is-active");
      document.getElementById("panel-" + btn.getAttribute("data-tab")).classList.add("is-active");
    });
  });

  document.getElementById("logout-btn").addEventListener("click", async function () {
    await api("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login.html";
  });

  (async function init() {
    const session = await guardSession();
    if (!session) return;
    await getCsrfToken();
    await Promise.all([loadLeads(), loadBookings(), loadStarts(), loadSettings()]);
  })();
})();
