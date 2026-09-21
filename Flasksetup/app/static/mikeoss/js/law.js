(() => {
  "use strict";
  const KEY = "thinkerstreet.law.sessions.v1";
  const COLORS = { fast: "#33ff72", smart: "#38a7ff", deep: "#ff38e8" };
  const $ = (id) => document.getElementById(id);
  const messagesEl = $("lawMessages"), input = $("lawInput"), form = $("lawComposer");
  const send = $("lawSend"), status = $("lawStatus"), dock = document.querySelector(".law-composer-dock");
  let tier = "smart", activeId;

  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY)) || []; } catch { return []; }
  }
  function save(sessions) { sessionStorage.setItem(KEY, JSON.stringify(sessions.slice(0, 3))); }
  function id() { return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`; }
  function ensureSession() {
    let sessions = load();
    if (!sessions.length) { sessions = [{ id: id(), title: "New legal chat", messages: [] }]; save(sessions); }
    if (!activeId || !sessions.some((s) => s.id === activeId)) activeId = sessions[0].id;
    return sessions;
  }
  function active() { return ensureSession().find((s) => s.id === activeId); }
  function esc(text) { const el = document.createElement("div"); el.textContent = text; return el.innerHTML; }
  function markdown(text) {
    return esc(text).replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\*(.+?)\*/g, "<em>$1</em>")
      .split(/\n{2,}/).map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`).join("");
  }
  function render() {
    const session = active(); messagesEl.innerHTML = "";
    if (!session.messages.length) messagesEl.innerHTML = '<div class="law-empty"><p class="law-empty-kicker">PRIVATE-FIRST LEGAL TOOLS</p><h2>Review, compare, research, and draft.</h2><p>This lightweight Flask edition keeps up to three conversations in this browser. Verify authorities and important legal work.</p></div>';
    session.messages.forEach((m) => { const el = document.createElement("article"); el.className = `law-message ${m.role}`; el.innerHTML = markdown(m.content); messagesEl.appendChild(el); });
    $("lawSessionCount").textContent = ensureSession().length; renderSessions(); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }
  function renderSessions() {
    const panel = $("lawSessions"); panel.innerHTML = "";
    ensureSession().forEach((s) => { const b = document.createElement("button"); b.type = "button"; b.className = s.id === activeId ? "active" : ""; b.textContent = s.title; b.onclick = () => { activeId = s.id; panel.hidden = true; render(); }; panel.appendChild(b); });
  }
  function updateSession(fn) { const sessions = ensureSession(); const i = sessions.findIndex((s) => s.id === activeId); fn(sessions[i]); save([sessions[i], ...sessions.filter((_, n) => n !== i)]); }
  document.querySelectorAll("[data-law-tier]").forEach((button) => button.addEventListener("click", () => {
    tier = button.dataset.lawTier; document.querySelectorAll("[data-law-tier]").forEach((b) => b.classList.toggle("active", b === button)); dock.style.setProperty("--tier-color", COLORS[tier]);
  }));
  $("lawSessionsButton").onclick = () => { const panel = $("lawSessions"); panel.hidden = !panel.hidden; $("lawSessionsButton").setAttribute("aria-expanded", String(!panel.hidden)); };
  $("lawNewButton").onclick = () => { const sessions = ensureSession(); const next = { id: id(), title: "New legal chat", messages: [] }; activeId = next.id; save([next, ...sessions].slice(0, 3)); render(); input.focus(); };
  $("lawClearButton").onclick = () => { updateSession((s) => { s.title = "New legal chat"; s.messages = []; }); render(); };
  form.addEventListener("submit", async (event) => {
    event.preventDefault(); const prompt = input.value.trim(); if (!prompt || send.disabled) return;
    updateSession((s) => { if (!s.messages.length) s.title = prompt.slice(0, 48); s.messages.push({ role: "user", content: prompt }); });
    input.value = ""; send.disabled = true; status.textContent = "Thinking…"; render();
    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
      const headers = { "Content-Type": "application/json" };
      if (csrfToken) headers["X-CSRFToken"] = csrfToken;
      const response = await fetch(window.THINKERSTREET_LAW.chatUrl, { method: "POST", headers, body: JSON.stringify({ tier, messages: active().messages }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Request failed");
      updateSession((s) => s.messages.push({ role: "assistant", content: data.answer }));
      status.textContent = "Browser session · not saved by this Flask module";
    } catch (error) { updateSession((s) => s.messages.push({ role: "assistant", content: error.message || "The request failed." })); status.textContent = "Request failed"; }
    finally { send.disabled = false; render(); input.focus(); }
  });
  input.addEventListener("keydown", (event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); form.requestSubmit(); } });
  ensureSession(); render();
})();
