(function () {
  const LS_URL = "ballyhay_api_url";
  const LS_KEY = "ballyhay_api_key";

  const $ = (id) => document.getElementById(id);
  const setupCard = $("setup-card");
  const appEl = $("app");
  const flashEl = $("flash");

  function getUrl() {
    return (localStorage.getItem(LS_URL) || window.BALLYHAY_DEFAULT_API || "").replace(/\/$/, "");
  }
  function getKey() {
    return localStorage.getItem(LS_KEY) || "";
  }

  function showFlash(msg, ok) {
    flashEl.hidden = false;
    flashEl.innerHTML = `<div class="flash ${ok ? "ok" : "error"}">${escapeHtml(String(msg))}</div>`;
  }

  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  async function api(method, path, { json, formData } = {}) {
    const url = getUrl();
    const key = getKey();
    if (!url || !key) throw new Error("Configure URL e API key");
    const headers = { "X-API-Key": key };
    if (json !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(url + path, {
      method,
      headers,
      body: formData || (json !== undefined ? JSON.stringify(json) : undefined),
    });
    let data = null;
    try {
      data = await res.json();
    } catch (_) {
      data = { error: "invalid_json", status: res.status };
    }
    if (!res.ok) {
      const err = (data && (data.error || data.hint || data.message)) || `HTTP ${res.status}`;
      throw new Error(err);
    }
    return data;
  }

  function kv(listEl, obj) {
    listEl.innerHTML = "";
    if (!obj || typeof obj !== "object") {
      listEl.innerHTML = "<li><span>—</span><strong>sem dados</strong></li>";
      return;
    }
    Object.entries(obj).forEach(([k, v]) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(k)}</span><strong>${escapeHtml(typeof v === "object" ? JSON.stringify(v) : String(v))}</strong>`;
      listEl.appendChild(li);
    });
  }

  async function loadStatus() {
    const status = await api("GET", "/api/admin/status");
    const systems = await api("GET", "/api/admin/systems").catch(() => ({}));

    kv($("status-list"), {
      service: status.service,
      bot: status.user,
      ready: status.bot_ready,
      uptime_seconds: status.uptime_seconds,
      guilds: status.guild_count,
      turso: status.turso,
      api: getUrl(),
    });
    kv($("systems-list"), status.systems || {});

    const tags = $("cogs-tags");
    tags.innerHTML = "";
    Object.keys((systems && systems.cogs) || {}).forEach((name) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = name;
      tags.appendChild(span);
    });

    const body = $("guilds-body");
    body.innerHTML = "";
    (status.guilds || []).forEach((g) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(g.name)}</td><td class="mono">${escapeHtml(g.id)}</td><td>${g.member_count ?? ""}</td>
        <td><button type="button" class="linkbtn" data-guild="${escapeHtml(g.id)}">Abrir</button></td>`;
      body.appendChild(tr);
    });
    if (!(status.guilds || []).length) {
      body.innerHTML = `<tr><td colspan="4">Nenhum servidor</td></tr>`;
    }
    return status;
  }

  async function openGuild(id) {
    const data = await api("GET", `/api/admin/guild/${id}`);
    $("guild-detail").classList.remove("hidden");
    $("guild-title").textContent = (data.guild && data.guild.name) || id;
    const eco = data.economy || {};
    kv($("guild-kv"), {
      guild_id: (data.guild && data.guild.id) || id,
      members: data.guild && data.guild.member_count,
      owner_id: data.guild && data.guild.owner_id,
      economy_users: eco.users,
      wallet_sum: eco.wallet_sum,
      panel_channel: eco.panel_channel_id || "—",
      staff_role_id: eco.staff_role_id || "não definido",
    });
    $("staff-role-id").value = eco.staff_role_id || "";
    $("staff-role-id").dataset.guildId = id;

    const rolesBody = $("roles-body");
    rolesBody.innerHTML = "";
    (data.roles || []).forEach((r) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td>${escapeHtml(r.name)}</td><td class="mono">${escapeHtml(r.id)}</td><td>${r.members ?? ""}</td>`;
      rolesBody.appendChild(tr);
    });
    $("guild-detail").scrollIntoView({ behavior: "smooth" });
  }

  function enterApp() {
    setupCard.classList.add("hidden");
    appEl.classList.remove("hidden");
    $("api-url").value = getUrl();
    loadStatus().catch((e) => showFlash(e.message, false));
  }

  function boot() {
    $("api-url").value = getUrl();
    if (getUrl() && getKey()) enterApp();
  }

  $("btn-save-key").addEventListener("click", async () => {
    const url = ($("api-url").value || "").trim().replace(/\/$/, "");
    const key = ($("api-key").value || "").trim();
    if (!url || !key) {
      showFlash("Preencha URL e API key", false);
      return;
    }
    localStorage.setItem(LS_URL, url);
    localStorage.setItem(LS_KEY, key);
    try {
      await api("GET", "/api/admin/status");
      showFlash("Conectado.", true);
      enterApp();
    } catch (e) {
      showFlash("Falha: " + e.message, false);
    }
  });

  $("btn-logout").addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    $("api-key").value = "";
    appEl.classList.add("hidden");
    setupCard.classList.remove("hidden");
    showFlash("API key removida deste navegador.", true);
  });

  $("btn-refresh-nav").addEventListener("click", () => {
    loadStatus().then(() => showFlash("Status atualizado.", true)).catch((e) => showFlash(e.message, false));
  });

  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const action = btn.getAttribute("data-action");
      try {
        if (action === "wake") {
          const d = await api("POST", "/api/admin/wake");
          showFlash(d.message || "Wake OK", true);
        } else if (action === "backup") {
          const d = await api("POST", "/api/admin/backup");
          showFlash(d.ok ? `Backup OK (canal ${d.channel_id})` : d.error || "falhou", !!d.ok);
        }
        await loadStatus();
      } catch (e) {
        showFlash(e.message, false);
      }
    });
  });

  document.querySelectorAll("[data-test]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const test = btn.getAttribute("data-test");
      try {
        const d = await api("POST", "/api/admin/test", { json: { test } });
        showFlash(`test ${test}: ${JSON.stringify(d)}`, !!d.ok);
      } catch (e) {
        showFlash(e.message, false);
      }
    });
  });

  $("btn-restore").addEventListener("click", async () => {
    const file = $("restore-file").files[0];
    if (!file) {
      showFlash("Selecione um arquivo .db", false);
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
      const d = await api("POST", "/api/admin/restore", { formData: fd });
      showFlash(d.ok ? `Restore OK (${d.bytes} bytes)` : d.error || d.hint || "falhou", !!d.ok);
    } catch (e) {
      showFlash(e.message, false);
    }
  });

  $("guilds-body").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-guild]");
    if (!btn) return;
    openGuild(btn.getAttribute("data-guild")).catch((e) => showFlash(e.message, false));
  });

  $("btn-close-guild").addEventListener("click", () => {
    $("guild-detail").classList.add("hidden");
  });

  $("btn-save-role").addEventListener("click", async () => {
    const id = $("staff-role-id").dataset.guildId;
    const roleId = ($("staff-role-id").value || "").trim();
    if (!id) return;
    try {
      const d = await api("POST", `/api/admin/guild/${id}/staff-role`, {
        json: { role_id: roleId || null },
      });
      showFlash(d.ok ? (d.role_id ? `Role: ${d.role_name} (${d.role_id})` : "Role removida") : d.error, !!d.ok);
      if (d.ok) openGuild(id);
    } catch (e) {
      showFlash(e.message, false);
    }
  });

  boot();
})();
