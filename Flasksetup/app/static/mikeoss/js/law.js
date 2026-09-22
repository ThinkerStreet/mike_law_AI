(() => {
  "use strict";
  const CFG = window.THINKERSTREET_LAW || {};
  const KEY = "thinkerstreet.law.sessions.v2";
  const MAX_SESSIONS = 3;
  const COLORS = { fast: "#33ff72", smart: "#38a7ff", deep: "#ff38e8" };
  const $ = (id) => document.getElementById(id);
  const messagesEl = $("lawMessages");
  const input = $("lawInput");
  const form = $("lawComposer");
  const send = $("lawSend");
  const dock = $("lawComposerDock");
  const tierButton = $("lawTierButton");
  const tierLabel = $("lawTierLabel");
  const tierFill = $("lawTierFill");
  const tierTokens = $("lawTierTokens");
  const tierOverlay = $("lawTierOverlay");
  const featureOverlay = $("lawFeatureOverlay");
  let tier = "smart";
  let activeId = null;
  let pools = {
    fast: { balance_tokens: 0, target_tokens: 1 },
    smart: { balance_tokens: 0, target_tokens: 1 },
    deep: { balance_tokens: 0, target_tokens: 1 }
  };

  function load() {
    try {
      const value = JSON.parse(sessionStorage.getItem(KEY));
      return Array.isArray(value) ? value.slice(0, MAX_SESSIONS) : [];
    } catch (_) {
      return [];
    }
  }

  function save(sessions) {
    sessionStorage.setItem(KEY, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  }

  function newId() {
    return window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : String(Date.now()) + "-" + Math.random().toString(16).slice(2);
  }

  function ensureSession() {
    let sessions = load();
    if (!sessions.length) {
      sessions = [{ id: newId(), title: "New legal chat", messages: [] }];
      save(sessions);
    }
    if (!activeId || !sessions.some((s) => s.id === activeId)) {
      activeId = sessions[0].id;
    }
    return sessions;
  }

  function active() {
    return ensureSession().find((s) => s.id === activeId);
  }

  function updateSession(fn) {
    const sessions = ensureSession();
    const index = sessions.findIndex((s) => s.id === activeId);
    if (index < 0) return;
    fn(sessions[index]);
    const current = sessions[index];
    save([current, ...sessions.filter((_, n) => n !== index)]);
  }

  function escapeHtml(value) {
    const el = document.createElement("div");
    el.textContent = String(value || "");
    return el.innerHTML;
  }

  function inlineMarkdown(value) {
    return value
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/__(.+?)__/g, "<strong>$1</strong>")
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      .replace(/\`([^\`]+)\`/g, "<code>$1</code>")
      .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  }

  function markdown(text) {
    let safe = escapeHtml(text);
    const blocks = [];
    safe = safe.replace(/\`\`\`([\s\S]*?)\`\`\`/g, (_, code) => {
      const token = "@@CODE" + blocks.length + "@@";
      blocks.push("<pre><code>" + code.trim() + "</code></pre>");
      return token;
    });
    const lines = safe.split("\n");
    let html = "";
    let list = null;
    function closeList() {
      if (list) {
        html += "</" + list + ">";
        list = null;
      }
    }
    lines.forEach((raw) => {
      const line = raw.trimEnd();
      const codeMatch = line.match(/^@@CODE(\d+)@@$/);
      if (codeMatch) {
        closeList();
        html += blocks[Number(codeMatch[1])] || "";
        return;
      }
      if (/^###\s+/.test(line)) {
        closeList();
        html += "<h3>" + inlineMarkdown(line.replace(/^###\s+/, "")) + "</h3>";
        return;
      }
      if (/^##\s+/.test(line)) {
        closeList();
        html += "<h2>" + inlineMarkdown(line.replace(/^##\s+/, "")) + "</h2>";
        return;
      }
      if (/^#\s+/.test(line)) {
        closeList();
        html += "<h1>" + inlineMarkdown(line.replace(/^#\s+/, "")) + "</h1>";
        return;
      }
      if (/^>\s?/.test(line)) {
        closeList();
        html += "<blockquote>" + inlineMarkdown(line.replace(/^>\s?/, "")) + "</blockquote>";
        return;
      }
      if (/^[-*]\s+/.test(line)) {
        if (list !== "ul") {
          closeList();
          list = "ul";
          html += "<ul>";
        }
        html += "<li>" + inlineMarkdown(line.replace(/^[-*]\s+/, "")) + "</li>";
        return;
      }
      if (/^\d+\.\s+/.test(line)) {
        if (list !== "ol") {
          closeList();
          list = "ol";
          html += "<ol>";
        }
        html += "<li>" + inlineMarkdown(line.replace(/^\d+\.\s+/, "")) + "</li>";
        return;
      }
      if (!line.trim()) {
        closeList();
        return;
      }
      closeList();
      html += "<p>" + inlineMarkdown(line) + "</p>";
    });
    closeList();
    return html;
  }

  function renderSessions() {
    const panel = $("lawSessions");
    panel.innerHTML = "";
    ensureSession().forEach((session) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = session.id === activeId ? "active" : "";
      row.innerHTML = "<span></span><small>OPEN</small>";
      row.querySelector("span").textContent = session.title;
      row.onclick = () => {
        activeId = session.id;
        panel.hidden = true;
        render();
      };
      panel.appendChild(row);
    });
    $("lawSessionCount").textContent = String(ensureSession().length);
  }

  function render() {
    const session = active();
    messagesEl.innerHTML = "";
    if (!session.messages.length) {
      messagesEl.innerHTML =
        '<div class="law-empty">' +
        '<p class="law-empty-kicker">THINKERSTREET LAW</p>' +
        '<h2>Analyze, research, compare, and draft.</h2>' +
        '<p>Legal AI for lawyers with privacy-oriented workflows and temporary browser sessions.</p>' +
        '<p class="law-empty-note">Verify authorities and important legal work before relying on model output.</p>' +
        "</div>";
    } else {
      session.messages.forEach((message) => {
        const el = document.createElement("article");
        el.className = "law-message " + message.role;
        el.innerHTML = markdown(message.content);
        messagesEl.appendChild(el);
      });
    }
    renderSessions();
    requestAnimationFrame(() => {
      const bottomPad = dock ? dock.getBoundingClientRect().height + 34 : 160;
      messagesEl.style.paddingBottom = bottomPad + "px";
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  }

  function formatTokens(value) {
    const n = Number(value || 0);
    if (n >= 1000000) return (n / 1000000).toFixed(n >= 10000000 ? 0 : 1) + "M";
    if (n >= 1000) return (n / 1000).toFixed(n >= 100000 ? 0 : 1) + "K";
    return String(n);
  }

  function poolPct(name) {
    const item = pools[name] || {};
    const target = Math.max(1, Number(item.target_tokens || 1));
    return Math.max(0, Math.min(100, (Number(item.balance_tokens || 0) / target) * 100));
  }

  function updateTierUi() {
    const color = COLORS[tier];
    dock.style.setProperty("--tier-color", color);
    tierLabel.textContent = tier.toUpperCase();
    tierFill.style.width = poolPct(tier) + "%";
    tierTokens.textContent = formatTokens(pools[tier].balance_tokens) + " tokens";
    document.querySelectorAll("[data-law-tier]").forEach((button) => {
      button.classList.toggle("active", button.dataset.lawTier === tier);
    });
    ["fast", "smart", "deep"].forEach((name) => {
      const tokenEl = document.querySelector('[data-tier-tokens="' + name + '"]');
      const fillEl = document.querySelector('[data-tier-fill="' + name + '"]');
      if (tokenEl) tokenEl.textContent = formatTokens(pools[name].balance_tokens) + " tokens";
      if (fillEl) fillEl.style.width = poolPct(name) + "%";
    });
  }

  async function refreshPools() {
    try {
      const response = await fetch(CFG.communityUrl || "/api/community/status", { credentials: "same-origin" });
      const data = await response.json();
      if (response.ok && data && data.buckets) pools = Object.assign(pools, data.buckets);
    } catch (_) {}
    updateTierUi();
  }

  function openOverlay(overlay) {
    overlay.hidden = false;
    document.body.style.overflow = "hidden";
  }

  function closeOverlay(overlay) {
    overlay.hidden = true;
    document.body.style.overflow = "";
  }

  tierButton.addEventListener("click", () => openOverlay(tierOverlay));
  $("lawPlus").addEventListener("click", () => openOverlay(featureOverlay));

  document.querySelectorAll(".law-overlay-backdrop").forEach((button) => {
    button.addEventListener("click", () => closeOverlay(button.closest(".law-overlay")));
  });

  document.querySelectorAll("[data-law-tier]").forEach((button) => {
    button.addEventListener("click", () => {
      tier = button.dataset.lawTier;
      updateTierUi();
      closeOverlay(tierOverlay);
      input.focus({ preventScroll: true });
    });
  });

  $("lawSessionsButton").onclick = () => {
    const panel = $("lawSessions");
    panel.hidden = !panel.hidden;
    $("lawSessionsButton").setAttribute("aria-expanded", String(!panel.hidden));
  };

  $("lawNewButton").onclick = () => {
    const sessions = ensureSession();
    if (sessions.length >= MAX_SESSIONS) {
      alert("Three temporary sessions are already open. Clear one before starting another.");
      return;
    }
    const next = { id: newId(), title: "New legal chat", messages: [] };
    activeId = next.id;
    save([next, ...sessions]);
    render();
    input.focus({ preventScroll: true });
  };

  $("lawClearButton").onclick = () => {
    updateSession((session) => {
      session.title = "New legal chat";
      session.messages = [];
    });
    render();
  };

  function autoGrow() {
    input.style.height = "auto";
    const fraction = window.innerWidth <= 680 ? 0.28 : 0.34;
    const max = Math.max(90, Math.round(window.innerHeight * fraction));
    input.style.height = Math.min(input.scrollHeight, max) + "px";
  }

  input.addEventListener("input", autoGrow);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const prompt = input.value.trim();
    if (!prompt || send.disabled) return;

    updateSession((session) => {
      if (!session.messages.length) session.title = prompt.slice(0, 52);
      session.messages.push({ role: "user", content: prompt });
    });

    input.value = "";
    input.style.height = "";
    send.disabled = true;
    render();

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
      const headers = { "Content-Type": "application/json" };
      if (csrfToken) headers["X-CSRFToken"] = csrfToken;
      const response = await fetch(CFG.chatUrl || "/api/law/chat", {
        method: "POST",
        headers,
        credentials: "same-origin",
        body: JSON.stringify({ tier, messages: active().messages })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Request failed");
      updateSession((session) => {
        session.messages.push({ role: "assistant", content: data.answer || "" });
      });
      refreshPools();
    } catch (error) {
      updateSession((session) => {
        session.messages.push({
          role: "assistant",
          content: error && error.message ? error.message : "The request failed."
        });
      });
    } finally {
      send.disabled = false;
      render();
      input.focus({ preventScroll: true });
    }
  });

  ensureSession();
  refreshPools();
  render();
})();
