/* Logiconstruct — VERSION DÉMO : redessine la page d'accueil avec les données de la démo
   (textes et chantiers modifiés dans l'admin). Exécuté avant site.js, qui ajoute ensuite les animations. */
(() => {
  "use strict";
  if (!window.LCDemo) return;
  const { content: C, projects: P } = window.LCDemo.data();
  window.LC = Object.assign(window.LC || {}, { projects: P, mode: "demo" });
  const $ = s => document.querySelector(s);
  const h = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const pad = n => String(n).padStart(2, "0");
  const set = (sel, html) => { const e = $(sel); if (e) e.innerHTML = html; };
  const icons = [
    '<path d="M3 11 12 4l9 7v9H3z"/><path d="M9 20v-6h6v6"/>',
    '<path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z"/><path d="M7 12V6a2 2 0 0 1 4 0"/><path d="M8 19l-1 2M16 19l1 2"/>',
    '<path d="M7 3h6v7H7z"/><path d="M5 10h14a6 6 0 0 1-6 6h-2a6 6 0 0 1-6-6z"/><path d="M9 16l-1 5h8l-1-5"/>',
    '<path d="M3 6h18M3 12h18M3 18h18"/><path d="M8 6v6M15 12v6M12 18v3M17 3v3"/>',
    '<rect x="6" y="3" width="12" height="18" rx="1"/><path d="M14 12h1"/>',
    '<path d="M4 20h16"/><path d="M6 20V9h5v11M13 20V5h5v15"/><path d="M8 12h1M15 8h1M15 12h1"/>'];
  const stepIcons = ['<circle cx="12" cy="12" r="3"/><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/>',
    '<path d="M6 3h9l4 4v14H6z"/><path d="M9 12h7M9 16h5"/>', '<path d="M14 6l4 4-9 9H5v-4z"/><path d="M12 8l4 4"/>',
    '<circle cx="8" cy="14" r="4"/><path d="M11 11l9-9M17 5l2 2M15 7l2 2"/>'];
  const tel = String(C.phone || "").replace(/[^+\d]/g, "");
  const pool = P.flatMap(p => p.images);

  // textes simples
  document.querySelectorAll("[data-c]").forEach(n => { const v = C[n.dataset.c]; if (v != null) n.textContent = v; });
  if (C.company) document.title = C.company + (C.tagline ? " — " + C.tagline : "");
  document.querySelectorAll('a[href^="tel:"]').forEach(a => a.href = "tel:" + tel);
  const bt = $(".bigtel"); if (bt) bt.textContent = C.phone || "";

  // titre : mots qui défilent
  const words = (C.heroWords && C.heroWords.length ? C.heroWords : ["construit"]);
  set("#rot", words.map((w, i) => `<span class="${i ? "" : "on"}">${h(w)}</span>`).join(""));

  // mots clés, photos du haut de page
  const chips = $("#chips");
  if (chips) { chips.innerHTML = (C.figures || []).map(f => `<span class="chip"><b>${h(f.value)}</b><span>${h(f.label)}</span></span>`).join(""); chips.hidden = !(C.figures || []).length; }
  const stack = $("#stack");
  if (stack) { stack.querySelectorAll(".polaroid").forEach(e => e.remove()); stack.insertAdjacentHTML("afterbegin", pool.slice(0, 3).map(im => `<div class="polaroid"><img src="${h(im.thumb)}" alt="" loading="eager"></div>`).join("")); }

  // services
  set("#servicesList", (C.services || []).map((s, i) => `<article class="svc" data-rv style="--d:${i % 3}"><span class="n">${pad(i + 1)}</span>
    <div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${icons[i % icons.length]}</svg></div>
    <h3>${h(s.title)}</h3><p>${h(s.text)}</p></article>`).join(""));

  // chantier vedette (le premier avec au moins 3 photos)
  const feat = P.find(p => p.images.length >= 3), old = $("#vedette");
  const featHTML = feat ? `<section class="feature" id="vedette" data-sec="vedette"><div class="pin">
      <div class="wrap feature-head"><div><span class="kicker" style="color:var(--bulb)">Dernier chantier</span><h2 style="margin-top:14px">${h(feat.title)}</h2></div>
      <div style="display:grid;gap:10px;justify-items:start"><p>${h(feat.description)}</p><span class="counter" id="counter">01 / ${pad(feat.images.length)}</span><span class="strip-hint">Glissez pour voir les photos →</span></div></div>
      <div class="strip" id="strip" data-project="${feat.id}">${feat.images.map((im, k) => `<button class="slide" type="button" data-i="${k}" aria-label="Agrandir la photo ${k + 1}"><img src="${h(im.url)}" alt="${h(feat.title)} — photo ${k + 1}" loading="lazy"></button>`).join("")}
      <div class="strip-end"><h3>Le vôtre, c'est le prochain ?</h3><a class="btn btn-bulb mag" href="#contact" data-track="cta_vedette">Parlons-en <span class="arr">→</span></a></div></div>
    </div></section>` : "";
  if (old) old.outerHTML = featHTML; else if (featHTML) $("#chantiers").insertAdjacentHTML("beforebegin", featHTML);

  // galerie
  set("#gallery", P.length ? P.map((p, i) => `<button class="card" type="button" data-id="${p.id}" data-rv style="--d:${i % 3}">
      <div class="ph">${p.thumb ? `<img src="${h(p.thumb)}" alt="${h(p.title)}" loading="lazy">` : ""}<span class="badge">${p.images.length} photo${p.images.length > 1 ? "s" : ""}</span></div>
      <div class="meta">${[p.category, p.location, p.year].filter(Boolean).map(m => `<span>${h(m)}</span>`).join("")}</div><h3>${h(p.title)}</h3></button>`).join("")
    : `<div class="empty"><b>Galerie en préparation</b><span>Les prochains chantiers arrivent très bientôt.</span></div>`);

  // étapes
  set("#steps", (C.steps || []).map((s, i) => `<div class="step" data-rv><div class="dot"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${stepIcons[i % 4]}</svg></div>
    <div><span class="n">Étape ${pad(i + 1)}</span><h3>${h(s.title)}</h3><p>${h(s.text)}</p></div></div>`).join(""));

  // Instagram
  const ig = C.instagram || "", insta = $(".insta");
  if (insta && !ig) insta.remove();
  if (insta && ig) {
    const url = "https://www.instagram.com/" + encodeURIComponent(ig) + "/";
    insta.querySelectorAll('a[href*="instagram.com"]').forEach(a => a.href = url);
    $("#handle").textContent = "@" + ig;
    const tiles = insta.querySelector(".tiles");
    if (tiles) tiles.innerHTML = pool.slice(0, 4).map((im, k) => `<a class="tile" href="${url}" target="_blank" rel="noopener" style="--t:${[-6, 4, -3, 7][k]}deg" data-track="instagram_photo" aria-label="Voir sur Instagram"><img src="${h(im.thumb)}" alt="" loading="lazy"></a>`).join("");
  }

  // coordonnées + pied de page
  const coords = $(".contact .coords");
  if (coords) coords.innerHTML = [["E-mail", C.email, "mailto:" + C.email, "contact_email"], ["Adresse", C.address], ["Zone", C.zone], ["Horaires", C.hours]]
    .filter(r => r[1]).map(([k, v, href, tr]) => `<span class="k">${k}</span>` + (href ? `<a href="${h(href)}" data-track="${tr}">${h(v)}</a>` : `<span>${h(v)}</span>`)).join("");
  const fl = $("footer .fl");
  if (fl) fl.innerHTML = `<span>© ${new Date().getFullYear()} ${h(C.company)}${C.owner ? " · " + h(C.owner) : ""}</span>${C.vat ? `<span>TVA ${h(C.vat)}</span>` : ""}
    <a href="tel:${h(tel)}">${h(C.phone)}</a>${C.email ? `<a href="mailto:${h(C.email)}">${h(C.email)}</a>` : ""}<a href="admin/">Espace admin (démo)</a>`;
})();
