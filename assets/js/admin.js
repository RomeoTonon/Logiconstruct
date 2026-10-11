/* Logic Construct — espace admin */
(() => {
  "use strict";
  const API = "../api/index.php";
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const el = (tag, attrs = {}, ...kids) => {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === "class") e.className = v; else if (k === "text") e.textContent = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? "" : v);
    }
    for (const k of kids.flat()) if (k != null) e.append(k.nodeType ? k : document.createTextNode(String(k)));
    return e;
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const imgUrl = u => /^(data:|blob:|https?:|\/)/.test(u || "") ? u : "../" + u;  // chemin d'une photo vu depuis /admin/
  let csrf = "";
  let toastT; function toast(m) { const t = $("#toast"); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 3000); }

  async function api(action, { method = "GET", data, form, query = "" } = {}) {
    const opt = { method, headers: {}, credentials: "same-origin" };
    if (method !== "GET") opt.headers["X-CSRF"] = csrf;
    if (form) opt.body = form;
    else if (data !== undefined) { opt.headers["Content-Type"] = "application/json"; opt.body = JSON.stringify(data); }
    const r = await fetch(API + "?a=" + action + query, opt);
    const j = await r.json().catch(() => ({ error: "Réponse du serveur illisible (" + r.status + "). Vérifiez que PHP fonctionne." }));
    if (r.status === 401 && action !== "login") { showLock("Votre session a expiré. Reconnectez-vous."); throw new Error(j.error); }
    if (!r.ok || j.error) throw new Error(j.error || "Erreur " + r.status);
    return j;
  }
  const post = (a, data) => api(a, { method: "POST", data });

  /* ---------- Connexion ---------- */
  function showLock(msg) {
    $("#admin").hidden = true; $("#lockScreen").hidden = false;
    $("#lockErr").hidden = !msg; $("#lockErr").textContent = msg || "";
    setTimeout(() => $("#lock_pw").focus(), 30);
  }
  function showAdmin() { $("#lockScreen").hidden = true; $("#admin").hidden = false; loadAll(); }
  $("#lockForm").addEventListener("submit", async e => {
    e.preventDefault();
    try { const j = await post("login", { password: $("#lock_pw").value }); csrf = j.csrf; $("#lock_pw").value = ""; showAdmin(); }
    catch (err) { $("#lockErr").textContent = err.message; $("#lockErr").hidden = false; $("#lock_pw").select(); }
  });
  $("#logout").onclick = async () => { try { await post("logout", {}); } catch {} csrf = ""; showLock(); };

  /* ---------- Onglets ---------- */
  const pane = () => $(".tab[aria-selected='true']").dataset.tab;
  $$(".tab").forEach(t => t.onclick = () => {
    $$(".tab").forEach(x => x.setAttribute("aria-selected", String(x === t)));
    $$("[data-pane]").forEach(p => p.hidden = p.dataset.pane !== t.dataset.tab);
    try { history.replaceState(null, "", "#" + t.dataset.tab); } catch {}
    refresh();
  });
  const hashTab = $(`.tab[data-tab="${location.hash.slice(1)}"]`);

  let messages = [], projects = [], content = null, range = 30, msgFilter = "all", charts = {};
  async function loadAll() {
    if (hashTab) hashTab.click(); else refresh();
    loadMessages(true);
  }
  function refresh() {
    const p = pane();
    if (p === "stats") loadStats();
    if (p === "messages") loadMessages();
    if (p === "projects") loadProjects();
    if (p === "content" && !$("#contentForm").dataset.dirty) loadContent();
  }
  setInterval(() => { if (!$("#admin").hidden && document.visibilityState === "visible") loadMessages(true); }, 60000);

  /* ---------- Statistiques ---------- */
  $$("#range button").forEach(b => b.onclick = () => { range = +b.dataset.d; $$("#range button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); loadStats(); });
  const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const CLICK_LABELS = { cta_devis: "« Demander un devis »", cta_realisations: "« Voir nos réalisations »", tel_entete: "Téléphone (en-tête)", contact_tel: "Téléphone (contact)", contact_email: "E-mail (contact)", form_envoi: "Formulaire envoyé", nav_services: "Menu : Services", nav_methode: "Menu : Méthode", nav_realisations: "Menu : Réalisations", nav_contact: "Menu : Contact", nav_logo: "Logo" };
  const clickLabel = k => CLICK_LABELS[k] || (k.startsWith("filtre_") ? "Filtre : " + k.slice(7).replace(/_/g, " ") : k.replace(/_/g, " "));
  function chart(id, cfg) { if (charts[id]) charts[id].destroy(); delete $("#" + id).parentElement.dataset.empty; if (window.Chart) charts[id] = new Chart($("#" + id), cfg); }
  function empty(id, msg) { if (charts[id]) { charts[id].destroy(); delete charts[id]; } $("#" + id).parentElement.dataset.empty = msg; }
  function baseOpts(horizontal) {
    const ink = css("--muted"), line = css("--line");
    return { responsive: true, maintainAspectRatio: false, indexAxis: horizontal ? "y" : "x",
      plugins: { legend: { display: false }, tooltip: { backgroundColor: css("--ink"), titleColor: css("--bg"), bodyColor: css("--bg") } },
      scales: { x: { grid: { color: horizontal ? line : "transparent" }, ticks: { color: ink, font: { family: "IBM Plex Mono", size: 11 }, precision: 0, maxRotation: 0, autoSkip: true, maxTicksLimit: horizontal ? 6 : 8 }, border: { color: line }, beginAtZero: true },
                y: { grid: { color: horizontal ? "transparent" : line }, ticks: { color: ink, font: { family: horizontal ? "Instrument Sans" : "IBM Plex Mono", size: 12 }, precision: 0 }, border: { display: false }, beginAtZero: true } } };
  }
  async function loadStats() {
    let s; try { s = await api("stats", { query: "&days=" + range }); } catch (e) { toast(e.message); return; }
    const c = s.current, p = s.previous;
    const delta = (a, b) => {
      if (!b) return a ? el("small", { class: "delta up", text: "nouveau" }) : el("small", { text: "période précédente : 0" });
      const pc = Math.round((a - b) / b * 100);
      return el("small", { class: "delta " + (pc >= 0 ? "up" : "down"), text: (pc >= 0 ? "+" : "") + pc + " % vs période précédente" });
    };
    const conv = c.visitors ? c.messages / c.visitors * 100 : 0;
    const k = [["Pages vues", c.views, delta(c.views, p.views)], ["Visiteurs", c.visitors, delta(c.visitors, p.visitors)], ["Clics", c.clicks, delta(c.clicks, p.clicks)],
               ["Demandes reçues", c.messages, delta(c.messages, p.messages)], ["Taux de contact", conv.toFixed(1).replace(".", ",") + " %", el("small", { text: "demandes / visiteurs" })]];
    $("#kpis").replaceChildren(...k.map(([l, v, d]) => el("div", { class: "kpi" }, el("span", { class: "label", text: l }), el("b", { text: typeof v === "number" ? v.toLocaleString("fr-BE") : v }), d)));
    const acc = css("--accent"), ink = css("--ink");
    const ds = Object.keys(s.perDay);
    const lbl = d => new Date(d + "T12:00").toLocaleDateString("fr-BE", { day: "numeric", month: "short" });
    chart("chDays", { type: "line", data: { labels: ds.map(lbl), datasets: [
      { label: "Pages vues", data: ds.map(d => s.perDay[d].views), borderColor: acc, backgroundColor: acc + "33", fill: true, tension: .3, pointRadius: 0, pointHoverRadius: 4, borderWidth: 2 },
      { label: "Visiteurs", data: ds.map(d => s.perDay[d].visitors), borderColor: ink, borderDash: [4, 4], pointRadius: 0, borderWidth: 1.5, tension: .3 }] },
      options: { ...baseOpts(), interaction: { mode: "index", intersect: false }, plugins: { ...baseOpts().plugins, legend: { display: true, position: "bottom", labels: { color: css("--muted"), boxWidth: 12, font: { size: 12 } } } } } });
    const bar = (id, rows, label, color, msg) => rows.length
      ? chart(id, { type: "bar", data: { labels: rows.map(r => label(r.k)), datasets: [{ data: rows.map(r => r.n), backgroundColor: color, borderRadius: 2, barThickness: 16 }] }, options: baseOpts(true) })
      : empty(id, msg);
    bar("chClicks", s.clicks, clickLabel, acc, "Aucun clic sur cette période");
    bar("chProjects", s.projects, k => s.projectNames[k] || "Projet supprimé", ink, "Aucun projet consulté sur cette période");
    bar("chTypes", s.types, k => k, acc, "Aucune demande sur cette période");
    if (s.devices.length) chart("chDevices", { type: "doughnut", data: { labels: s.devices.map(r => r.k), datasets: [{ data: s.devices.map(r => r.n), backgroundColor: [acc, ink, css("--muted"), css("--line")], borderColor: css("--surface"), borderWidth: 2 }] },
      options: { responsive: true, maintainAspectRatio: false, cutout: "62%", plugins: { legend: { position: "bottom", labels: { color: css("--muted"), boxWidth: 12 } } } } });
    else empty("chDevices", "Pas encore de visites");
    const steps = [["Arrivés sur le site", c.visitors], ["Ont vu les services", s.sections.services || 0], ["Ont vu les réalisations", s.sections.realisations || 0], ["Ont vu le contact", s.sections.contact || 0], ["Ont envoyé une demande", c.messages]];
    $("#funnel").replaceChildren(...steps.map(([l, v]) => {
      const pc = c.visitors ? Math.min(100, v / c.visitors * 100) : 0;
      return el("div", { class: "fn" }, el("div", { class: "row" }, el("span", { text: l }), el("span", { text: v + " · " + Math.round(pc) + " %" })), el("div", { class: "bar" }, el("i", { style: "width:" + pc + "%" })));
    }));
    if (!c.visitors) $("#funnel").append(el("p", { class: "hint", text: "Aucune visite sur cette période. Les chiffres apparaîtront dès les premières visites." }));
  }

  /* ---------- Messages ---------- */
  $$("#msgFilter button").forEach(b => b.onclick = () => { msgFilter = b.dataset.f; $$("#msgFilter button").forEach(x => x.setAttribute("aria-pressed", String(x === b))); renderMsgs(); });
  async function loadMessages(badgeOnly) {
    try { messages = (await api("messages")).messages; } catch (e) { if (!badgeOnly) toast(e.message); return; }
    const n = messages.filter(m => m.status === "nouveau").length; $("#msgBadge").hidden = !n; $("#msgBadge").textContent = n;
    if (!badgeOnly || pane() === "messages") renderMsgs();
  }
  function confirmBtn(label, fn) {
    const b = el("button", { class: "btn danger sm", type: "button" }, label); let t;
    b.onclick = () => { if (b.classList.contains("armed")) { clearTimeout(t); fn(); } else { b.classList.add("armed"); b.textContent = "Confirmer ?"; t = setTimeout(() => { b.classList.remove("armed"); b.textContent = label; }, 4000); } };
    return b;
  }
  async function copy(text, btn) {
    try { await navigator.clipboard.writeText(text); btn.textContent = "Copié"; } catch { btn.textContent = text; }
    setTimeout(() => btn.textContent = "Copier l'e-mail", 1800);
  }
  function renderMsgs() {
    const list = messages.filter(m => msgFilter === "all" || m.status === msgFilter);
    if (!list.length) { $("#msgList").replaceChildren(el("div", { class: "empty" }, el("b", { text: "Aucun message" }), el("span", { text: "Les demandes envoyées via le formulaire de contact apparaîtront ici." }))); return; }
    $("#msgList").replaceChildren(...list.map(m => el("article", { class: "msg" + (m.status === "nouveau" ? " new" : "") },
      el("div", { class: "msg-head" }, el("div", {}, el("b", { text: m.name }), "  ", el("span", { class: "pill " + (m.status === "nouveau" ? "new" : "done"), text: m.status })),
        el("span", { class: "label", text: new Date(m.created_at).toLocaleString("fr-BE", { dateStyle: "medium", timeStyle: "short" }) })),
      el("div", { class: "meta" }, el("a", { href: "mailto:" + m.email, text: m.email }), m.phone ? el("a", { href: "tel:" + m.phone.replace(/[^+\d]/g, ""), text: m.phone }) : null, m.type ? el("span", { text: m.type }) : null, m.commune ? el("span", { text: m.commune }) : null),
      el("p", { class: "body", text: m.message }),
      el("div", { class: "acts" },
        el("a", { class: "btn accent sm", href: "mailto:" + m.email + "?subject=" + encodeURIComponent("Votre projet — Logic Construct") }, "Répondre"),
        el("button", { class: "btn ghost sm", type: "button", onclick: async () => { try { await post("message_update", { id: m.id, status: m.status === "nouveau" ? "traité" : "nouveau" }); loadMessages(); } catch (e) { toast(e.message); } } }, m.status === "nouveau" ? "Marquer comme traité" : "Remettre en nouveau"),
        el("button", { class: "btn ghost sm", type: "button", onclick: e => copy(m.email, e.currentTarget) }, "Copier l'e-mail"),
        confirmBtn("Supprimer", async () => { try { await post("message_delete", { id: m.id }); toast("Message supprimé"); loadMessages(); } catch (e) { toast(e.message); } })))));
  }

  /* ---------- Réalisations ---------- */
  async function loadProjects() { try { projects = (await api("projects")).projects; renderProjList(); } catch (e) { toast(e.message); } }
  function renderProjList() {
    if (!projects.length) { $("#projList").replaceChildren(el("div", { class: "empty" }, el("b", { text: "Aucun projet" }), el("span", { text: "Ajoutez votre premier chantier avec « Nouveau projet » : titre, photos, commune, année. Il apparaîtra dans la galerie du site." }))); return; }
    $("#projList").replaceChildren(...projects.map((p, i) => el("div", { class: "pitem" },
      el("div", { class: "th" }, p.thumb ? el("img", { src: imgUrl(p.thumb), alt: "" }) : null),
      el("div", { class: "info" }, el("b", { text: p.title }), el("div", { class: "meta" }, el("span", { class: "pill " + (p.published ? "done" : ""), text: p.published ? "publié" : "brouillon" }), p.category ? el("span", { text: p.category }) : null, el("span", { text: p.images.length + " photo(s)" }))),
      el("div", { class: "acts" },
        el("button", { class: "btn ghost sm", type: "button", "aria-label": "Monter", disabled: i === 0, onclick: () => move(i, -1) }, "↑"),
        el("button", { class: "btn ghost sm", type: "button", "aria-label": "Descendre", disabled: i === projects.length - 1, onclick: () => move(i, 1) }, "↓"),
        el("button", { class: "btn ghost sm", type: "button", onclick: () => editProject(p) }, "Modifier"),
        confirmBtn("Supprimer", async () => { try { await post("project_delete", { id: p.id }); toast("Projet supprimé"); loadProjects(); } catch (e) { toast(e.message); } })))));
  }
  async function move(i, d) {
    const ids = projects.map(p => p.id); [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    try { await post("project_order", { ids }); loadProjects(); } catch (e) { toast(e.message); }
  }
  $("#newProject").onclick = () => editProject(null);

  // Compression dans le navigateur avant l'envoi (photos de téléphone de 5-10 Mo → ~500 Ko)
  function shrink(file, max = 2000) {
    return new Promise(res => {
      if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return res(file);
      const u = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        if (s === 1 && file.size < 2.5e6) { URL.revokeObjectURL(u); return res(file); }
        const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        c.toBlob(b => { URL.revokeObjectURL(u); res(b ? new File([b], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file); }, "image/jpeg", .86);
      };
      img.onerror = () => { URL.revokeObjectURL(u); res(file); };
      img.src = u;
    });
  }

  function editProject(p) {
    const isNew = !p;
    const d = p ? clone(p) : { id: 0, title: "", category: "", location: "", year: String(new Date().getFullYear()), surface: "", peb: "", description: "", images: [], published: true };
    const box = $("#projEditor"); box.hidden = false;
    const f = (key, label, extra = {}) => el("div", { class: "field" }, el("label", { for: "pe_" + key, text: label }), el("input", { id: "pe_" + key, value: d[key] || "", ...extra }));
    const imgs = el("div", { class: "imgs" });
    const fileIn = el("input", { type: "file", accept: "image/jpeg,image/png,image/webp", multiple: true, hidden: true, id: "pe_files" });
    let uploading = 0;
    function drawImgs() {
      imgs.replaceChildren(...d.images.map((r, i) => el("div", { class: "it" + (i === 0 ? " cover" : "") }, el("img", { src: imgUrl(r.thumb), alt: "" }),
        el("div", { class: "ctl" },
          el("button", { type: "button", disabled: i === 0, onclick: () => { d.images.unshift(d.images.splice(i, 1)[0]); drawImgs(); } }, i === 0 ? "Couverture" : "Mettre en couverture"),
          el("button", { type: "button", onclick: () => { d.images.splice(i, 1); drawImgs(); } }, "Retirer")))),
        el("label", { class: "drop", for: "pe_files" }, el("span", {}, uploading ? "Envoi de " + uploading + " photo(s)…" : "+ Ajouter des photos", el("br"), el("small", { text: "JPG, PNG ou WebP" }))));
    }
    fileIn.onchange = async () => {
      const files = [...fileIn.files]; fileIn.value = ""; uploading += files.length; drawImgs(); save.disabled = true;
      for (const file of files) {
        try {
          const fd = new FormData(); fd.append("photo", await shrink(file));
          const r = await api("upload", { method: "POST", form: fd });
          d.images.push({ id: r.id, url: r.url, thumb: r.thumb });
        } catch (e) { toast(file.name + " : " + e.message); }
        uploading--; drawImgs();
      }
      save.disabled = uploading > 0;
    };
    const pub = el("input", { type: "checkbox", id: "pe_pub", checked: d.published });
    const save = el("button", { class: "btn accent", type: "button" }, isNew ? "Créer le projet" : "Enregistrer");
    box.replaceChildren(el("div", { class: "editor" },
      el("h3", { text: isNew ? "Nouveau projet" : "Modifier « " + d.title + " »", style: "font-size:24px;text-transform:uppercase" }),
      f("title", "Titre du projet *", { maxlength: 160 }),
      el("div", { class: "row2" }, f("category", "Catégorie", { list: "cats", maxlength: 60 }), f("location", "Commune", { maxlength: 80 })),
      el("div", { class: "row2" }, f("year", "Année", { maxlength: 10 }), el("div", { class: "row2" }, f("surface", "Surface (m²)", { inputmode: "numeric", maxlength: 12 }), f("peb", "Classe PEB", { placeholder: "A, B, A++…", maxlength: 6 }))),
      el("div", { class: "field" }, el("label", { for: "pe_description", text: "Description" }), el("textarea", { id: "pe_description", maxlength: 5000 }, d.description || "")),
      el("div", { class: "field" }, el("span", { class: "label", text: "Photos — la première sert de couverture" }), imgs, fileIn),
      el("label", { class: "switch", for: "pe_pub" }, pub, "Publié sur le site"),
      el("div", { class: "acts" }, save, el("button", { class: "btn ghost", type: "button", onclick: () => { box.hidden = true; box.replaceChildren(); } }, "Annuler"))));
    drawImgs(); box.scrollIntoView({ behavior: "smooth", block: "start" }); $("#pe_title").focus();
    save.onclick = async () => {
      for (const k of ["title", "category", "location", "year", "surface", "peb", "description"]) d[k] = $("#pe_" + k).value.trim();
      d.published = pub.checked;
      if (!d.title) { toast("Donnez un titre au projet."); $("#pe_title").focus(); return; }
      save.disabled = true; save.textContent = "Enregistrement…";
      try {
        await post("project_save", { ...d, images: d.images.map(i => i.id) });
        toast(isNew ? "Projet créé et publié" : "Projet enregistré"); box.hidden = true; box.replaceChildren(); loadProjects();
      } catch (e) { toast(e.message); save.disabled = false; save.textContent = "Réessayer"; }
    };
  }

  /* ---------- Contenu ---------- */
  async function loadContent() { try { content = (await api("public")).content; renderContentForm(); } catch (e) { toast(e.message); } }
  function renderContentForm() {
    const F = $("#contentForm"); const d = clone(content);
    const status = el("span", { class: "hint", text: "" });
    const dirty = () => { F.dataset.dirty = "1"; status.textContent = "Modifications non enregistrées"; };
    const inp = (k, label, ta) => el("div", { class: "field" }, el("label", { for: "cf_" + k, text: label }),
      ta ? el("textarea", { id: "cf_" + k, "data-k": k }, d[k] || "") : el("input", { id: "cf_" + k, "data-k": k, value: d[k] || "" }));
    const group = (title, ...kids) => el("div", { class: "panel" }, el("h3", { text: title }), ...kids);
    const rep = (key, a, b, labelA, labelB, max) => {
      const box = el("div", { class: "repeat" });
      const draw = () => box.replaceChildren(...d[key].map((it, i) => el("div", { class: "ri" },
        el("input", { "aria-label": labelA, value: it[a] || "", oninput: e => { it[a] = e.target.value; dirty(); } }),
        el("input", { "aria-label": labelB, value: it[b] || "", oninput: e => { it[b] = e.target.value; dirty(); } }),
        el("button", { class: "btn ghost sm", type: "button", onclick: () => { d[key].splice(i, 1); dirty(); draw(); } }, "Retirer"))),
        d[key].length < max ? el("button", { class: "btn ghost sm", type: "button", style: "justify-self:start", onclick: () => { d[key].push({ [a]: "", [b]: "" }); dirty(); draw(); } }, "+ Ajouter") : null);
      draw();
      return el("div", { class: "field" }, el("span", { class: "label", text: labelA + " · " + labelB }), box);
    };
    F.replaceChildren(
      group("Accroche", el("div", { class: "row2" }, inp("company", "Nom de l'entreprise"), inp("owner", "Gérant")), inp("tagline", "Activité (sous le logo)"),
        el("div", { class: "field" }, el("label", { for: "cf_words", text: "Mots qui défilent dans le titre « On … chez vous. »" }),
          el("input", { id: "cf_words", value: (d.heroWords || []).join(", "), oninput: e => { d.heroWords = e.target.value.split(",").map(w => w.trim()).filter(Boolean); dirty(); } }),
          el("span", { class: "hint", text: "Séparés par des virgules, ex. : rénove, construit, transforme" })),
        inp("heroTitle", "Phrase d'accroche"), inp("heroText", "Texte d'introduction", true), rep("figures", "value", "label", "Mot clé", "Précision", 4)),
      group("Coordonnées", el("div", { class: "row2" }, inp("phone", "Téléphone"), inp("email", "E-mail")), inp("address", "Adresse"), el("div", { class: "row2" }, inp("zone", "Zone d'intervention"), inp("hours", "Horaires")), inp("vat", "Numéro de TVA"), inp("instagram", "Compte Instagram (sans @)")),
      group("Services", inp("about", "Texte de présentation", true), rep("services", "title", "text", "Titre", "Description", 8)),
      group("Méthode", rep("steps", "title", "text", "Étape", "Description", 6)),
      el("div", { class: "savebar" }, status,
        el("button", { class: "btn ghost", type: "button", onclick: () => { delete F.dataset.dirty; renderContentForm(); } }, "Annuler"),
        el("button", { class: "btn accent", type: "submit" }, "Enregistrer et publier")));
    F.oninput = e => { if (e.target.dataset.k) { d[e.target.dataset.k] = e.target.value; dirty(); } };
    F.onsubmit = async e => {
      e.preventDefault();
      try { const j = await post("content_save", d); content = j.content; delete F.dataset.dirty; status.textContent = ""; toast("Contenu publié sur le site"); }
      catch (err) { toast(err.message); }
    };
  }
  window.addEventListener("beforeunload", e => { if ($("#contentForm").dataset.dirty) { e.preventDefault(); e.returnValue = ""; } });

  /* ---------- Sécurité ---------- */
  $("#pwForm").addEventListener("submit", async e => {
    e.preventDefault();
    const n = $("#pwNotice"), say = (c, t) => { n.className = "notice " + c; n.textContent = t; n.hidden = false; };
    if ($("#pw_new").value !== $("#pw_new2").value) return say("bad", "Les deux nouveaux mots de passe ne sont pas identiques.");
    try { await post("password_change", { current: $("#pw_cur").value, new: $("#pw_new").value }); e.target.reset(); say("ok", "Mot de passe changé. Utilisez-le à votre prochaine connexion."); }
    catch (err) { say("bad", err.message); }
  });

  /* ---------- Démarrage ---------- */
  api("me").then(j => { if (j.admin) { csrf = j.csrf; showAdmin(); } else showLock(); }).catch(() => showLock("Le serveur ne répond pas. Vérifiez que PHP est activé."));
})();
