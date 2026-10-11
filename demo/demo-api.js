/* Logiconstruct — VERSION DÉMO (GitHub Pages)
   Remplace le serveur PHP : toutes les actions de l'API sont simulées dans le navigateur
   et enregistrées dans le stockage local (localStorage) de chaque visiteur.
   Rien n'est envoyé nulle part : chaque visiteur a sa propre copie de la démo. */
(() => {
  "use strict";
  const KEY = "lcdemo_v1";
  const SEED = window.LC_SEED || { content: {}, projects: [] };
  // empreinte SHA-256 du mot de passe de démo
  const PW_DEFAULT = "bb6fac25ad87d14ae997aed6c802883ca95f744d886d2e5960b7283a1dd2cfc0";
  const today = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
  const clone = o => JSON.parse(JSON.stringify(o));
  const ls = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return e && (e.name === "QuotaExceededError" || e.code === 22) ? "quota" : false; } },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  const ss = {
    get(k) { try { return sessionStorage.getItem(k); } catch { return mem[k] || null; } },
    set(k, v) { try { sessionStorage.setItem(k, v); } catch { mem[k] = v; } },
    del(k) { try { sessionStorage.removeItem(k); } catch { delete mem[k]; } },
  };
  const mem = {};
  let memStore = null; // si le stockage local est bloqué (navigation privée stricte), la démo marche le temps de la visite

  /* ---------- Données d'exemple pour l'admin (clairement marquées comme démo) ---------- */
  function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
  function exampleEvents(projects) {
    const r = rng(20261011), ev = [], devices = ["ordinateur", "mobile", "mobile", "mobile", "tablette"];
    const clicks = ["cta_devis", "cta_devis", "tel_entete", "nav_realisations", "cta_realisations", "instagram", "contact_tel", "nav_contact", "ampoule", "contact_email", "filtre_salle_de_bain"];
    for (let i = 89; i >= 1; i--) {
      const d = today(new Date(Date.now() - i * 864e5)), wd = new Date(d).getDay();
      const base = 6 + Math.round(10 * (1 - i / 90)) + (wd === 0 || wd === 6 ? -3 : 2);
      const n = Math.max(1, Math.round(base * (0.6 + r() * 0.8)));
      for (let v = 0; v < n; v++) {
        const vis = "ex" + d + "_" + v, dev = devices[Math.floor(r() * devices.length)];
        const pages = 1 + (r() < 0.3 ? 1 : 0);
        for (let p = 0; p < pages; p++) ev.push({ day: d, visitor: vis, type: "view", k: "accueil", device: dev });
        ev.push({ day: d, visitor: vis, type: "section", k: "services", device: dev });
        if (r() < 0.7) ev.push({ day: d, visitor: vis, type: "section", k: "realisations", device: dev });
        if (r() < 0.45) ev.push({ day: d, visitor: vis, type: "section", k: "contact", device: dev });
        if (r() < 0.55) ev.push({ day: d, visitor: vis, type: "click", k: clicks[Math.floor(r() * clicks.length)], device: dev });
        if (r() < 0.35 && projects.length) ev.push({ day: d, visitor: vis, type: "project", k: String(projects[Math.floor(r() * projects.length)].id), device: dev });
      }
    }
    return ev;
  }
  function exampleMessages() {
    const d = n => new Date(Date.now() - n * 864e5 - 3.6e6 * 5).toISOString();
    return [
      { id: 3, created_at: d(1), name: "Exemple — Client démo", email: "client.demo@exemple.be", phone: "0470 00 00 00", type: "Salle de bain", commune: "Namur", message: "Message d'exemple pour la démo : rénovation complète d'une salle de bain d'environ 6 m², remplacement de la baignoire par une douche à l'italienne.", status: "nouveau" },
      { id: 2, created_at: d(4), name: "Exemple — Particulier", email: "particulier.demo@exemple.be", phone: "", type: "Parquet / sols", commune: "Gembloux", message: "Message d'exemple pour la démo : pose de parquet dans un séjour de 35 m² avec plinthes assorties.", status: "nouveau" },
      { id: 1, created_at: d(12), name: "Exemple — Propriétaire", email: "proprio.demo@exemple.be", phone: "0499 00 00 00", type: "Rénovation complète", commune: "Wavre", message: "Message d'exemple pour la démo : remise à neuf d'un appartement avant location (sols, murs, portes).", status: "traité" },
    ];
  }
  function fresh(withExamples = true) {
    let imgId = 0; // identifiants d'images uniques (négatifs pour les photos d'origine)
    const projects = clone(SEED.projects || []).map((p, i) => ({ ...p, id: i + 1, published: p.published !== false, sort: i,
      images: (p.images || []).map(im => ({ id: --imgId, url: im.url, thumb: im.thumb || im.url })) }));
    return { v: 1, content: clone(SEED.content || {}), projects, messages: withExamples ? exampleMessages() : [], events: withExamples ? exampleEvents(projects) : [],
             pw: PW_DEFAULT, nextId: 100, examples: withExamples };
  }
  function load() {
    if (memStore) return memStore;
    const raw = ls.get(KEY);
    if (raw) { try { const s = JSON.parse(raw); if (s && s.v === 1) return s; } catch {} }
    const s = fresh(true); save(s); return s;
  }
  function save(s) {
    const r = ls.set(KEY, JSON.stringify(s));
    if (r === true) { memStore = null; return true; }
    if (r === "quota") return "quota";
    memStore = s; return true;
  }

  /* ---------- Utilitaires ---------- */
  const str = (v, max) => String(v == null ? "" : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max);
  const isAdmin = () => ss.get("lcdemo_admin") === "1";
  async function sha256(t) {
    if (window.crypto && crypto.subtle) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join(""); }
    return "nocrypto:" + t; // très vieux navigateur : comparaison simple (démo)
  }
  const device = () => /iPad|Tablet/i.test(navigator.userAgent) ? "tablette" : /Mobi|iPhone|Android/i.test(navigator.userAgent) ? "mobile" : "ordinateur";
  function visitor() {
    const d = today(); let v = null; try { v = JSON.parse(ls.get("lcdemo_vis") || "null"); } catch {}
    if (!v || v.d !== d) { v = { d, id: "v" + Math.random().toString(36).slice(2, 10) }; ls.set("lcdemo_vis", JSON.stringify(v)); }
    return v.id;
  }
  function readImage(file, max, q) {
    return new Promise((res, rej) => {
      const u = URL.createObjectURL(file), img = new Image();
      img.onload = () => {
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement("canvas"); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
        const x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height); x.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(u); res(c.toDataURL("image/jpeg", q));
      };
      img.onerror = () => { URL.revokeObjectURL(u); rej(new Error("Format non accepté. Utilisez une photo JPG, PNG ou WebP.")); };
      img.src = u;
    });
  }
  const sortProjects = ps => ps.slice().sort((a, b) => (a.sort - b.sort) || (b.id - a.id));
  const withThumb = p => ({ ...p, thumb: (p.images[0] || {}).thumb || "" });

  class Fail extends Error { constructor(msg, status = 400) { super(msg); this.status = status; } }
  const requireAdmin = () => { if (!isAdmin()) throw new Fail("Session expirée. Reconnectez-vous.", 401); };

  /* ---------- Statistiques (même calcul que la version serveur) ---------- */
  function stats(s, days) {
    days = Math.max(1, Math.min(730, days | 0 || 30));
    const day = n => today(new Date(Date.now() - n * 864e5));
    const start = day(days - 1), end = day(0), pstart = day(2 * days - 1), pend = day(days);
    const inR = (d, a, b) => d >= a && d <= b;
    const totals = (a, b) => {
      const ev = s.events.filter(e => inR(e.day, a, b));
      const vis = new Set(ev.filter(e => e.type === "view").map(e => e.day + e.visitor));
      return { views: ev.filter(e => e.type === "view").length, visitors: vis.size, clicks: ev.filter(e => e.type === "click").length,
               messages: s.messages.filter(m => inR(m.created_at.slice(0, 10), a, b)).length };
    };
    const perDay = {}; for (let i = days - 1; i >= 0; i--) perDay[day(i)] = { views: 0, visitors: 0 };
    const vset = {};
    s.events.forEach(e => { if (e.type !== "view" || !perDay[e.day]) return; perDay[e.day].views++; (vset[e.day] = vset[e.day] || new Set()).add(e.visitor); });
    Object.entries(vset).forEach(([d, set]) => perDay[d].visitors = set.size);
    const cur = s.events.filter(e => inR(e.day, start, end));
    const top = (type, n) => { const c = {}; cur.filter(e => e.type === type).forEach(e => c[e.k] = (c[e.k] || 0) + 1); return Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, n).map(([k, v]) => ({ k, n: v })); };
    const sections = {}; const seen = new Set();
    cur.filter(e => e.type === "section").forEach(e => { const id = e.k + "|" + e.day + e.visitor; if (!seen.has(id)) { seen.add(id); sections[e.k] = (sections[e.k] || 0) + 1; } });
    const dv = {}, dseen = new Set();
    cur.filter(e => e.type === "view").forEach(e => { const id = e.day + e.visitor; if (!dseen.has(id)) { dseen.add(id); dv[e.device] = (dv[e.device] || 0) + 1; } });
    const types = {}; s.messages.filter(m => inR(m.created_at.slice(0, 10), start, end)).forEach(m => { const t = m.type || "Autre"; types[t] = (types[t] || 0) + 1; });
    return { days, current: totals(start, end), previous: totals(pstart, pend), perDay, clicks: top("click", 10), projects: top("project", 10), sections,
             devices: Object.entries(dv).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ k, n })),
             types: Object.entries(types).sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ k, n })),
             projectNames: Object.fromEntries(s.projects.map(p => [p.id, p.title])), demo: !!s.examples };
  }

  /* ---------- Les actions de l'API ---------- */
  async function handle(action, method, body, query) {
    const s = load();
    const post = () => { if (method !== "POST") throw new Fail("Méthode non autorisée.", 405); };
    const commit = () => { const r = save(s); if (r === "quota") throw new Fail("L'espace de stockage de la démo est plein (environ 5 Mo par navigateur). Supprimez des photos ou réinitialisez la démo.", 507); };
    switch (action) {
      case "public": return { content: s.content, projects: sortProjects(s.projects.filter(p => p.published)).map(withThumb) };
      case "track": {
        post(); if (isAdmin()) return { ok: true };
        const d = today(), vid = visitor(), dev = device();
        (body.e || []).slice(0, 40).forEach(e => { if (["view", "click", "section", "project"].includes(e.t)) s.events.push({ day: d, visitor: vid, type: e.t, k: String(e.k || "").toLowerCase().replace(/[^a-z0-9_\-]/g, "").slice(0, 60), device: dev }); });
        const cutoff = today(new Date(Date.now() - 400 * 864e5)); s.events = s.events.filter(e => e.day >= cutoff);
        save(s); return { ok: true };
      }
      case "contact": {
        post(); if (body.website) return { ok: true };
        const name = str(body.name, 120), email = str(body.email, 160), msg = str(body.message, 4000);
        if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || msg.length < 10) throw new Fail("Merci d'indiquer votre nom, une adresse e-mail valide et quelques mots sur votre projet.");
        s.messages.unshift({ id: s.nextId++, created_at: new Date().toISOString(), name, email, phone: str(body.phone, 40), type: str(body.type, 40), commune: str(body.commune, 80), message: msg, status: "nouveau" });
        commit(); return { ok: true };
      }
      case "login": {
        post(); const h = await sha256(String(body.password || ""));
        if (h !== s.pw) { await new Promise(r => setTimeout(r, 400)); throw new Fail("Mot de passe incorrect.", 401); }
        ss.set("lcdemo_admin", "1"); return { ok: true, csrf: "demo" };
      }
      case "logout": ss.del("lcdemo_admin"); return { ok: true };
      case "me": return isAdmin() ? { admin: true, csrf: "demo" } : { admin: false };
      case "stats": requireAdmin(); return stats(s, +(query.get("days") || 30));
      case "messages": requireAdmin(); return { messages: s.messages.slice().sort((a, b) => b.created_at < a.created_at ? -1 : 1) };
      case "message_update": { post(); requireAdmin(); const m = s.messages.find(x => x.id === +body.id); if (m) m.status = body.status === "nouveau" ? "nouveau" : "traité"; commit(); return { ok: true }; }
      case "message_delete": post(); requireAdmin(); s.messages = s.messages.filter(x => x.id !== +body.id); commit(); return { ok: true };
      case "projects": requireAdmin(); return { projects: sortProjects(s.projects).map(withThumb) };
      case "upload": {
        post(); requireAdmin();
        const f = body instanceof FormData ? body.get("photo") : null;
        if (!f || !f.size) throw new Fail("Aucune photo reçue.");
        if (f.size > 15 * 1024 * 1024) throw new Fail("Photo trop lourde (15 Mo maximum).");
        const url = await readImage(f, 1400, 0.78), thumb = await readImage(f, 520, 0.72);
        const id = s.nextId++; (s.pending = s.pending || {})[id] = { id, url, thumb };
        commit(); return { id, url, thumb };
      }
      case "project_save": {
        post(); requireAdmin();
        const title = str(body.title, 160); if (!title) throw new Fail("Donnez un titre au projet.");
        let p = s.projects.find(x => x.id === +body.id);
        if (!p) { p = { id: s.nextId++, images: [], sort: Math.min(0, ...s.projects.map(x => x.sort)) - 1 }; s.projects.push(p); }
        Object.assign(p, { title, category: str(body.category, 60), location: str(body.location, 80), year: str(body.year, 10), surface: str(body.surface, 12),
                           peb: str(body.peb, 6), description: str(body.description, 5000), published: !!body.published });
        const pool = new Map([...s.projects.flatMap(x => x.images), ...Object.values(s.pending || {})].map(i => [i.id, i]));
        p.images = (body.images || []).map(Number).map(id => pool.get(id)).filter(Boolean);
        const used = new Set(s.projects.flatMap(x => x.images.map(i => i.id)));
        Object.keys(s.pending || {}).forEach(k => { if (used.has(+k)) delete s.pending[k]; });
        commit(); return { ok: true, id: p.id };
      }
      case "project_delete": post(); requireAdmin(); s.projects = s.projects.filter(x => x.id !== +body.id); commit(); return { ok: true };
      case "project_order": post(); requireAdmin(); (body.ids || []).forEach((id, i) => { const p = s.projects.find(x => x.id === +id); if (p) p.sort = i; }); commit(); return { ok: true };
      case "content_save": {
        post(); requireAdmin();
        const c = {};
        Object.entries({ company: 80, tagline: 120, heroTitle: 160, heroText: 600, about: 800, phone: 40, email: 160, address: 200, zone: 120, vat: 40, hours: 120, owner: 80 }).forEach(([k, m]) => c[k] = str(body[k], m));
        c.instagram = str(body.instagram, 40).replace(/[^A-Za-z0-9._]/g, "");
        c.heroWords = (Array.isArray(body.heroWords) ? body.heroWords : String(body.heroWords || "").split(",")).map(w => str(w, 30)).filter(Boolean).slice(0, 8);
        const list = (v, keys, n) => (Array.isArray(v) ? v : []).slice(0, n).map(it => Object.fromEntries(Object.entries(keys).map(([k, m]) => [k, str(it && it[k], m)]))).filter(r => Object.values(r).join(""));
        c.figures = list(body.figures, { value: 40, label: 120 }, 4);
        c.services = list(body.services, { title: 80, text: 500 }, 8);
        c.steps = list(body.steps, { title: 80, text: 400 }, 6);
        c.formspree = s.content.formspree || ""; c.goatcounter = s.content.goatcounter || "";
        s.content = c; commit(); return { ok: true, content: c };
      }
      case "password_change": {
        post(); requireAdmin();
        if ((await sha256(String(body.current || ""))) !== s.pw) throw new Fail("Le mot de passe actuel est incorrect.");
        if (String(body.new || "").length < 8) throw new Fail("Le nouveau mot de passe doit contenir au moins 8 caractères.");
        s.pw = await sha256(String(body.new)); commit(); return { ok: true };
      }
      default: throw new Fail("Action inconnue.", 404);
    }
  }

  /* ---------- Interception des appels à api/index.php ---------- */
  const realFetch = window.fetch ? window.fetch.bind(window) : null;
  window.fetch = async function (input, init = {}) {
    const url = typeof input === "string" ? input : (input && input.url) || "";
    if (!/api\/index\.php/.test(url)) return realFetch(input, init);
    const u = new URL(url, location.href), action = u.searchParams.get("a") || "", method = (init.method || "GET").toUpperCase();
    let body = {};
    if (init.body instanceof FormData) body = init.body;
    else if (typeof init.body === "string") { try { body = JSON.parse(init.body) || {}; } catch { body = {}; } }
    else if (init.body instanceof Blob) { try { body = JSON.parse(await init.body.text()) || {}; } catch { body = {}; } }
    let status = 200, data;
    try { data = await handle(action, method, body, u.searchParams); }
    catch (e) { status = e.status || 500; data = { error: e.message || "Erreur de la démo." }; }
    return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
  };
  if (navigator.sendBeacon) {
    const realBeacon = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url, data) => { if (/api\/index\.php/.test(String(url))) { window.fetch(url, { method: "POST", body: data }); return true; } return realBeacon(url, data); };
  }

  /* ---------- Accès pour la page (rendu) et l'admin (bandeau démo) ---------- */
  window.LCDemo = {
    data: () => { const s = load(); return { content: s.content, projects: sortProjects(s.projects.filter(p => p.published)).map(withThumb), examples: !!s.examples }; },
    reset(withExamples) { ls.del(KEY); memStore = null; save(fresh(withExamples)); },
    usage() { const r = ls.get(KEY); return r ? r.length * 2 : 0; },
    persistent() { return !memStore && ls.set("lcdemo_test", "1") === true; },
  };
})();
