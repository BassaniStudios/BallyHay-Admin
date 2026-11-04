(function () {
  const LS_URL = "ballyhay_api_url";
  const LS_KEY = "ballyhay_api_key";

  const $ = (id) => document.getElementById(id);
  const setupScreen = $("setup-screen");
  const appShell = $("app-shell");
  const flashEl = $("flash");

  const VIEW_META = {
    dashboard: { title: "Dashboard", subtitle: "Visão geral do bot e economia GTA RP" },
    servers: { title: "Servidores", subtitle: "Guilds onde o bot está online (~5–6 servidores)" },
    actions: { title: "Ações & Backup", subtitle: "Wake, backup manual e restore de banco" },
    systems: { title: "Sistemas", subtitle: "Cogs carregados e módulos da economy" },
    tests: { title: "Testes", subtitle: "Diagnósticos de ping, economy e storage" },
    guide: { title: "Guia do Bot", subtitle: "Como o BallyHay funciona nos servidores" },
    settings: { title: "Configuração", subtitle: "URL da API e chave de acesso" },
  };

  function getUrl() {
    return (localStorage.getItem(LS_URL) || window.BALLYHAY_DEFAULT_API || "").replace(/\/$/, "");
  }
  function getKey() {
    return localStorage.getItem(LS_KEY) || "";
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
    );
  }

  function showFlash(msg, ok) {
    flashEl.hidden = false;
    flashEl.innerHTML = `<div class="flash ${ok ? "ok" : "error"}">${escapeHtml(String(msg))}</div>`;
    clearTimeout(showFlash._t);
    showFlash._t = setTimeout(() => { flashEl.hidden = true; }, 6000);
  }

  function formatUptime(sec) {
    if (sec == null || isNaN(sec)) return "—";
    sec = Math.floor(Number(sec));
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m ${sec % 60}s`;
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
      const val = typeof v === "object" ? JSON.stringify(v) : String(v);
      li.innerHTML = `<span>${escapeHtml(k)}</span><strong>${escapeHtml(val)}</strong>`;
      listEl.appendChild(li);
    });
  }

  function setConnState(ok) {
    const pill = $("conn-pill");
    const label = $("conn-label");
    if (ok) {
      pill.classList.remove("warn");
      label.textContent = "Conectado";
    } else {
      pill.classList.add("warn");
      label.textContent = "Sem dados";
    }
  }

  function showView(name) {
    document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
    const el = $(`view-${name}`);
    if (el) el.classList.add("active");
    document.querySelectorAll(".nav-item").forEach((b) => {
      b.classList.toggle("active", b.getAttribute("data-view") === name);
    });
    const meta = VIEW_META[name] || { title: name, subtitle: "" };
    $("view-title").textContent = meta.title;
    $("view-subtitle").textContent = meta.subtitle;
    if (name === "servers") {
      $("guild-detail").classList.add("hidden");
    }
    if (name === "settings") {
      $("settings-url").value = getUrl();
      $("settings-key").value = "";
    }
  }

  async function loadStatus() {
    const status = await api("GET", "/api/admin/status");
    const systems = await api("GET", "/api/admin/systems").catch(() => ({}));

    const ready = !!status.bot_ready;
    $("stat-ready").textContent = ready ? "Online" : "Offline / iniciando";
    $("stat-ready").style.color = ready ? "var(--ok)" : "var(--sun-deep)";
    $("stat-user").textContent = status.user || "bot ainda não pronto";
    $("stat-uptime").textContent = formatUptime(status.uptime_seconds);
    $("stat-guilds").textContent = String(status.guild_count ?? (status.guilds || []).length ?? 0);
    $("stat-db").textContent = status.turso ? "Turso" : "Local / SQLite";
    $("stat-db-hint").textContent = status.turso
      ? "remoto ativo — restore por arquivo limitado"
      : "arquivo .db disponível para restore";

    kv($("systems-list"), status.systems || {});

    const tags = $("cogs-tags");
    tags.innerHTML = "";
    const cogs = (systems && systems.cogs) || {};
    Object.keys(cogs).forEach((name) => {
      const span = document.createElement("span");
      span.className = "tag";
      span.textContent = name;
      tags.appendChild(span);
    });

    const body = $("systems-body");
    if (body) {
      body.innerHTML = "";
      const entries = Object.entries(cogs);
      if (!entries.length) {
        body.innerHTML = `<tr><td colspan="3">Nenhum cog reportado</td></tr>`;
      } else {
        entries.forEach(([name, info]) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `<td><strong>${escapeHtml(name)}</strong></td>
            <td class="mono">${escapeHtml((info && info.class) || "—")}</td>
            <td><span class="badge soft">${info && info.loaded !== false ? "carregado" : "—"}</span></td>`;
          body.appendChild(tr);
        });
      }
    }

    const sum = $("summary-table");
    sum.innerHTML = `
      <tr><td>Serviço</td><td><strong>${escapeHtml(status.service || "BallyHay")}</strong></td></tr>
      <tr><td>API</td><td class="mono">${escapeHtml(getUrl())}</td></tr>
      <tr><td>Support guild</td><td class="mono">${escapeHtml(status.support_guild_id || "—")}</td></tr>
      <tr><td>Latency (systems)</td><td>${systems.latency_ms != null ? systems.latency_ms + " ms" : "—"}</td></tr>
      <tr><td>Database</td><td>${status.turso ? "Turso remoto" : "SQLite local"}</td></tr>
    `;

    const gBody = $("guilds-body");
    gBody.innerHTML = "";
    const guilds = status.guilds || [];
    $("guild-count-badge").textContent = String(guilds.length);
    guilds.forEach((g) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td><strong>${escapeHtml(g.name)}</strong></td>
        <td class="mono">${escapeHtml(g.id)}</td>
        <td>${g.member_count ?? "—"}</td>
        <td><button type="button" class="btn btn-sm" data-guild="${escapeHtml(g.id)}">Gerenciar</button></td>`;
      gBody.appendChild(tr);
    });
    if (!guilds.length) {
      gBody.innerHTML = `<tr><td colspan="4">Nenhum servidor online no momento</td></tr>`;
    }

    setConnState(true);
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
      settings_keys: eco.settings_keys,
      panel_channel: eco.panel_channel_id || "—",
      staff_role_id: eco.staff_role_id || "não definido",
      economy_loaded: data.systems && data.systems.economy_loaded,
      backup_loaded: data.systems && data.systems.backup_loaded,
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
    if (!(data.roles || []).length) {
      rolesBody.innerHTML = `<tr><td colspan="3">Sem cargos listados</td></tr>`;
    }
    $("guild-detail").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function enterApp() {
    setupScreen.classList.add("hidden");
    appShell.classList.remove("hidden");
    $("api-url").value = getUrl();
    showView("dashboard");
    loadStatus().catch((e) => {
      setConnState(false);
      showFlash(e.message, false);
    });
  }

  function boot() {
    $("api-url").value = getUrl();
    if (getUrl() && getKey()) enterApp();
  }

  // Navigation
  $("sidebar-nav").addEventListener("click", (ev) => {
    const btn = ev.target.closest("[data-view]");
    if (!btn) return;
    showView(btn.getAttribute("data-view"));
  });

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
      showFlash("Conectado com sucesso.", true);
      enterApp();
    } catch (e) {
      showFlash("Falha: " + e.message, false);
    }
  });

  $("btn-logout").addEventListener("click", () => {
    localStorage.removeItem(LS_KEY);
    $("api-key").value = "";
    appShell.classList.add("hidden");
    setupScreen.classList.remove("hidden");
    showFlash("API key removida deste navegador.", true);
  });

  $("btn-refresh-nav").addEventListener("click", () => {
    loadStatus()
      .then(() => showFlash("Status atualizado.", true))
      .catch((e) => {
        setConnState(false);
        showFlash(e.message, false);
      });
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
      const box = $("test-result");
      box.textContent = `Rodando test: ${test}…`;
      try {
        const d = await api("POST", "/api/admin/test", { json: { test } });
        box.textContent = JSON.stringify(d, null, 2);
        showFlash(`test ${test}: ${d.ok ? "OK" : "falhou"}`, !!d.ok);
      } catch (e) {
        box.textContent = String(e.message || e);
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
      showFlash(
        d.ok ? (d.role_id ? `Role: ${d.role_name || ""} (${d.role_id})` : "Role removida") : d.error,
        !!d.ok
      );
      if (d.ok) openGuild(id);
    } catch (e) {
      showFlash(e.message, false);
    }
  });

  $("btn-save-settings").addEventListener("click", async () => {
    const url = ($("settings-url").value || "").trim().replace(/\/$/, "");
    const key = ($("settings-key").value || "").trim();
    if (!url) {
      showFlash("Informe a URL do bot", false);
      return;
    }
    localStorage.setItem(LS_URL, url);
    if (key) localStorage.setItem(LS_KEY, key);
    try {
      await api("GET", "/api/admin/status");
      showFlash("Conexão salva e validada.", true);
      await loadStatus();
    } catch (e) {
      showFlash("Falha ao validar: " + e.message, false);
    }
  });

  boot();
})();
