/* Logiconstruct — animations, galerie, formulaire et statistiques */
(() => {
  "use strict";
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
  const LC = window.LC || {}, projects = Array.isArray(LC.projects) ? LC.projects : [];
  const STATIC = LC.mode === "static", API = "api/index.php";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fine = matchMedia("(pointer: fine)").matches;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const slug = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "x";

  /* ---------- Statistiques ---------- */
  let queue = [], qt = null;
  function send(beacon) {
    if (STATIC || !queue.length) return;
    const body = JSON.stringify({ e: queue.splice(0, 40) });
    if (beacon && navigator.sendBeacon) { navigator.sendBeacon(API + "?a=track", new Blob([body], { type: "application/json" })); return; }
    fetch(API + "?a=track", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  }
  function track(t, k = "") {
    if (STATIC) { try { window.goatcounter?.count?.({ path: t + "-" + k, title: k, event: true }); } catch {} return; }
    queue.push({ t, k }); clearTimeout(qt); qt = setTimeout(send, 1500);
  }
  track("view", "accueil");
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") send(true); });
  document.addEventListener("click", e => { const t = e.target.closest("[data-track]"); if (t) track("click", t.dataset.track); });

  /* ---------- Chargement (une fois par visite) ---------- */
  const loader = $("#loader");
  let first = true; try { first = !sessionStorage.getItem("lc_seen"); sessionStorage.setItem("lc_seen", "1"); } catch {}
  if (loader && first && !reduce) {
    loader.classList.add("on");
    setTimeout(() => loader.classList.add("out"), 1500);
    setTimeout(() => loader.remove(), 2600);
  } else loader && loader.remove();

  /* ---------- Titres découpés mot par mot ---------- */
  $$(".split").forEach(h => {
    if (h.querySelector(".w")) return;
    let i = 0;
    const walk = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(part); return; }
          const s = el("span", { style: "--i:" + i++ }, part);
          frag.append(el("span", { class: "w" }, s));
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) walk(n);
    });
    walk(h);
  });

  /* ---------- Apparitions au défilement ---------- */
  const io = new IntersectionObserver(es => es.forEach(x => {
    if (!x.isIntersecting) return;
    x.target.classList.add("in");
    x.target.querySelectorAll(".split").forEach(s => s.classList.add("in"));
    if (x.target.classList.contains("split")) x.target.classList.add("in");
    io.unobserve(x.target);
  }), { threshold: .15, rootMargin: "0px 0px -6% 0px" });
  const watch = root => $$("[data-rv], .split", root).forEach(n => io.observe(n));
  watch(document);
  const secIO = new IntersectionObserver(es => es.forEach(x => { if (x.isIntersecting) { track("section", x.target.dataset.sec); secIO.unobserve(x.target); } }), { threshold: .3 });
  $$("[data-sec]").forEach(s => secIO.observe(s));

  /* ---------- Mot qui tourne dans le titre ---------- */
  const rot = $("#rot");
  if (rot && rot.children.length > 1 && !reduce) {
    const ws = [...rot.children]; let ri = 0;
    setInterval(() => {
      const cur = ws[ri]; ri = (ri + 1) % ws.length; const nx = ws[ri];
      cur.classList.remove("on"); cur.classList.add("off");
      nx.classList.remove("off"); void nx.offsetWidth; nx.classList.add("on");
      setTimeout(() => cur.classList.remove("off"), 750);
    }, 2300);
  }

  /* ---------- Le titre s'adapte pour que le mot le plus long tienne ---------- */
  const h1 = $(".hero h1");
  function fitTitle() {
    if (!h1 || !rot) return;
    h1.style.fontSize = "";
    const avail = h1.clientWidth, need = rot.getBoundingClientRect().width;
    if (need > avail && avail > 0) h1.style.fontSize = (parseFloat(getComputedStyle(h1).fontSize) * avail / need * 0.97).toFixed(1) + "px";
  }
  fitTitle(); addEventListener("resize", fitTitle);
  document.fonts && document.fonts.ready.then(fitTitle);

  /* ---------- Menu mobile ---------- */
  const burger = $("#burger");
  burger.addEventListener("click", () => {
    const open = !document.body.classList.contains("menu-open");
    document.body.classList.toggle("menu-open", open); burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
  });
  $$("#nav a").forEach(a => a.addEventListener("click", () => { document.body.classList.remove("menu-open"); burger.setAttribute("aria-expanded", "false"); }));

  /* ---------- L'ampoule ---------- */
  const hero = $(".hero"), lamp = $("#lamp");
  lamp && lamp.addEventListener("click", () => hero.classList.toggle("dark"));

  /* ---------- Curseur ---------- */
  const cur = $("#cursor"); let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  if (fine && !reduce && cur) {
    addEventListener("pointermove", e => { mx = e.clientX; my = e.clientY; cur.classList.add("show"); }, { passive: true });
    document.addEventListener("pointerover", e => cur.classList.toggle("big", !!e.target.closest("a,button,.card,.slide,input,textarea,select")));
    document.addEventListener("pointerleave", () => cur.classList.remove("show"));
  } else cur && cur.remove();

  /* ---------- Boutons aimantés ---------- */
  if (fine && !reduce) $$(".mag").forEach(b => {
    b.addEventListener("pointermove", e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
    b.addEventListener("pointerleave", () => b.style.transform = "");
  });

  /* ---------- Cartes services : inclinaison + lumière ---------- */
  if (fine && !reduce) $$(".svc").forEach(c => {
    c.addEventListener("pointermove", e => {
      const r = c.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      c.style.setProperty("--mx", px * 100 + "%"); c.style.setProperty("--my", py * 100 + "%");
      c.style.setProperty("--rx", (.5 - py) * 8 + "deg"); c.style.setProperty("--ry", (px - .5) * 10 + "deg");
    });
    c.addEventListener("pointerleave", () => { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
  });

  /* ---------- Héros : photos et lumière qui suivent la souris ---------- */
  const stack = $("#stack");
  if (fine && !reduce && hero) hero.addEventListener("pointermove", e => {
    const r = hero.getBoundingClientRect(), px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
    stack && stack.style.setProperty("--px", px * 18 + "px"); stack && stack.style.setProperty("--py", py * 18 + "px");
    lamp && (lamp.style.rotate = clamp(px * 14, -10, 10) + "deg");
  });

  /* ---------- Boucle de défilement : progression, en-tête, bandeau, panorama, méthode, parallaxe ---------- */
  const top = $("#top"), prog = $("#progress"), marq = $("#marquee"), feature = $(".feature"), strip = $("#strip"),
        counter = $("#counter"), steps = $("#steps"), handle = $("#handle"), cbg = $("#contactBg");
  let lastY = scrollY, vel = 0, mqx = 0, last = performance.now(), mqW = 0, pinned = false, frameN = 0;
  // La page défile-t-elle vraiment dans cette fenêtre ? (faux dans un cadre qui s'agrandit avec son contenu)
  const realScroll = () => document.documentElement.scrollHeight - (pinned ? feature.offsetHeight - feature.querySelector(".pin").offsetHeight : 0) > innerHeight + 300;
  const canPin = () => !!(feature && strip && innerWidth > 760 && innerHeight >= 520 && innerHeight <= 1400 && !reduce && realScroll());
  const slides = strip ? $$(".slide", strip) : [];
  function setCounter(p) {
    if (!counter || !slides.length) return;
    const n = slides.length, k = Math.min(n, 1 + Math.floor(p * n));
    counter.textContent = String(k).padStart(2, "0") + " / " + String(n).padStart(2, "0");
  }
  function layout() {
    mqW = marq ? marq.scrollWidth / 2 : 0;
    if (!feature) return;
    const want = canPin();
    if (want !== pinned) { pinned = want; feature.classList.toggle("pinned", pinned); if (!pinned) { feature.style.height = ""; strip.style.transform = ""; } }
    if (pinned) feature.style.height = Math.round(feature.querySelector(".pin").offsetHeight + Math.max(0, strip.scrollWidth - innerWidth)) + "px";
  }
  let lt; const relayout = () => { clearTimeout(lt); lt = setTimeout(layout, 120); };
  addEventListener("resize", relayout); addEventListener("load", layout); layout();
  $$("#strip img").forEach(i => i.complete || i.addEventListener("load", relayout, { once: true }));
  strip && strip.addEventListener("scroll", () => { if (!pinned) setCounter(strip.scrollLeft / Math.max(1, strip.scrollWidth - strip.clientWidth)); }, { passive: true });

  // en-tête : fond plein dès qu'on quitte le haut de page
  if (hero) new IntersectionObserver(([x]) => top.classList.toggle("solid", !x.isIntersecting), { rootMargin: "-90px 0px 0px 0px" }).observe(hero);
  // étapes qui s'allument
  const allSteps = steps ? $$(".step", steps) : [], seenStep = new Map();
  function updateSteps() {
    if (!steps) return;
    // allumée si elle est (ou a été) passée dans l'écran : fonctionne aussi après un saut direct en bas de page
    const lim = Math.min(innerHeight, 1000) * .65;
    allSteps.forEach(s => s.classList.toggle("lit", !!seenStep.get(s) || s.getBoundingClientRect().top < lim));
    const lit = allSteps.filter(s => s.classList.contains("lit")).length;
    steps.style.setProperty("--fill", allSteps.length > 1 ? clamp((lit - 1) / (allSteps.length - 1), 0, 1) : 1);
  }
  if (steps) {
    const stepIO = new IntersectionObserver(es => { es.forEach(x => seenStep.set(x.target, x.isIntersecting || x.boundingClientRect.top < 0)); updateSteps(); }, { rootMargin: "0px 0px -35% 0px" });
    allSteps.forEach(s => stepIO.observe(s));
  }
  const vh = () => Math.min(innerHeight, 1000);
  const along = el => { const r = el.getBoundingClientRect(); return clamp((vh() - r.top) / (vh() + r.height), 0, 1); }; // 0 = sous l'écran, 1 = passé

  function frame(now) {
    const dt = Math.min(64, now - last); last = now;
    const y = scrollY, H = document.documentElement.scrollHeight - innerHeight;
    vel += ((y - lastY) - vel) * .2; lastY = y;
    prog.style.setProperty("--p", H > 0 ? clamp(y / H, 0, 1) : 0);
    top.classList.toggle("hide", y > vh() && vel > 2 && !document.body.classList.contains("menu-open"));
    if (marq && !reduce && mqW) { mqx -= (0.06 + Math.min(Math.abs(vel), 60) * .02) * dt; while (-mqx >= mqW) mqx += mqW; marq.style.transform = `translateX(${mqx}px)`; }
    if (pinned) {
      const r = feature.getBoundingClientRect(), span = feature.offsetHeight - feature.querySelector(".pin").offsetHeight;
      const p = clamp(-r.top / (span || 1), 0, 1);
      strip.style.transform = `translateX(${-p * Math.max(0, strip.scrollWidth - innerWidth)}px)`;
      setCounter(p);
    }
    if (!reduce) {
      if (handle) handle.style.setProperty("--hx", ((.5 - along(handle)) * 360).toFixed(1) + "px");
      if (cbg) cbg.style.setProperty("--cy", ((along(cbg.parentElement) - .5) * 80).toFixed(1) + "px");
    }
    if (steps && (frameN++ % 6 === 0)) updateSteps();
    if (cur && cur.isConnected) { cx += (mx - cx) * .22; cy += (my - cy) * .22; cur.style.transform = `translate(${cx}px,${cy}px)`; }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // lien actif dans le menu
  const navIO = new IntersectionObserver(es => es.forEach(x => {
    if (x.isIntersecting) $$("#nav a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + x.target.id));
  }), { rootMargin: "-45% 0px -50% 0px" });
  $$("main section[id]").forEach(s => navIO.observe(s));

  /* ---------- Galerie + filtres ---------- */
  let filter = "Tous";
  function renderGallery() {
    const g = $("#gallery"); if (!g) return;
    const cats = ["Tous", ...new Set(projects.map(p => p.category).filter(Boolean))];
    $("#filters").replaceChildren(...(cats.length > 2 ? cats : []).map(c => el("button", { class: "fchip", type: "button", "aria-pressed": String(c === filter),
      onclick: () => { filter = c; track("click", "filtre_" + slug(c)); renderGallery(); } }, c)));
    $$(".card", g).forEach(card => { const p = projects.find(x => x.id === +card.dataset.id); card.hidden = !(filter === "Tous" || (p && p.category === filter)); });
  }
  renderGallery();
  $("#gallery")?.addEventListener("click", e => { const c = e.target.closest(".card"); if (!c) return; const p = projects.find(x => x.id === +c.dataset.id); if (p) openLB(p, 0); });
  strip?.addEventListener("click", e => { const s = e.target.closest(".slide"); if (!s) return; const p = projects.find(x => x.id === +strip.dataset.project); if (p) openLB(p, +s.dataset.i); });

  /* ---------- Visionneuse ---------- */
  let curP = null, idx = 0, lastFocus = null;
  function openLB(p, start) {
    curP = p; lastFocus = document.activeElement; track("project", String(p.id));
    $("#lbTitle").textContent = p.title;
    $("#lbMeta").replaceChildren(...[p.category, p.location, p.year, p.surface ? p.surface + " m²" : "", p.peb ? "PEB " + p.peb : ""].filter(Boolean).map(t => el("span", { text: t })));
    $("#lbDesc").textContent = p.description || "";
    $("#lbThumbs").replaceChildren(...p.images.map((im, i) => el("button", { type: "button", "aria-label": "Photo " + (i + 1), onclick: () => show(i) }, el("img", { src: im.thumb, alt: "" }))));
    $("#lbPrev").hidden = $("#lbNext").hidden = p.images.length < 2;
    $("#lb").hidden = false; document.body.style.overflow = "hidden"; $("#lbClose").focus(); show(start || 0);
  }
  function show(i) {
    const imgs = curP.images; if (!imgs.length) return;
    idx = (i + imgs.length) % imgs.length;
    const img = $("#lbImg"), n = img.cloneNode(); n.src = imgs[idx].url; n.alt = curP.title + " — photo " + (idx + 1); img.replaceWith(n);
    $$("#lbThumbs button").forEach((b, j) => b.setAttribute("aria-current", String(j === idx)));
    $$("#lbThumbs button")[idx]?.scrollIntoView({ block: "nearest", inline: "center" });
    const nx = imgs[(idx + 1) % imgs.length]; if (nx) new Image().src = nx.url;
  }
  function closeLB() { $("#lb").hidden = true; document.body.style.overflow = ""; curP = null; lastFocus && lastFocus.focus(); }
  $("#lbClose").onclick = closeLB; $("#lbPrev").onclick = () => show(idx - 1); $("#lbNext").onclick = () => show(idx + 1);
  $("#lb").addEventListener("click", e => { if (e.target.classList.contains("lb-stage")) closeLB(); });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && document.body.classList.contains("menu-open")) burger.click();
    if ($("#lb").hidden) return;
    if (e.key === "Escape") closeLB(); if (e.key === "ArrowLeft") show(idx - 1); if (e.key === "ArrowRight") show(idx + 1);
  });
  let sx = null;
  $("#lb").addEventListener("touchstart", e => sx = e.touches[0].clientX, { passive: true });
  $("#lb").addEventListener("touchend", e => { if (sx == null) return; const d = e.changedTouches[0].clientX - sx; if (Math.abs(d) > 50) show(idx + (d < 0 ? 1 : -1)); sx = null; });

  /* ---------- Formulaire ---------- */
  $("#contactForm").addEventListener("submit", async e => {
    e.preventDefault();
    const f = e.currentTarget, n = $("#formNotice"), b = $("#f_submit");
    const say = (cls, txt) => { n.className = "notice " + cls; n.textContent = txt; n.hidden = false; };
    const v = Object.fromEntries(new FormData(f).entries());
    if (v.website) return;
    const errs = [];
    if (!v.name.trim()) errs.push("votre nom");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errs.push("une adresse e-mail valide");
    if (v.message.trim().length < 10) errs.push("quelques mots sur votre projet");
    if (errs.length) return say("bad", "Merci d'indiquer " + errs.join(", ") + ".");
    const tel = ($(".bigtel") || {}).textContent || "";
    const other = tel ? " Vous pouvez aussi nous appeler au " + tel + "." : "";
    let url = API + "?a=contact", headers = { "Content-Type": "application/json" };
    if (STATIC) {
      if (!/^[a-z0-9]+$/i.test(LC.formspree || "")) return say("bad", "Le formulaire en ligne n'est pas encore activé." + other);
      url = "https://formspree.io/f/" + LC.formspree; headers.Accept = "application/json"; delete v.website; v._subject = "Nouvelle demande : " + v.name;
    }
    b.disabled = true; const label = b.innerHTML; b.textContent = "Envoi…";
    try {
      const r = await fetch(url, { method: "POST", headers, body: JSON.stringify(v) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "L'envoi n'a pas abouti.");
      track("click", "form_envoi"); f.reset();
      say("ok", "C'est envoyé ! On vous recontacte très vite.");
    } catch (err) { say("bad", (err.message || "L'envoi n'a pas abouti.") + other); }
    b.disabled = false; b.innerHTML = label;
  });
})();
