/* ==========================================================
   bandeau.js — bandeau de navigation « France Travail » pour widgets Grist (version 0.3.0)

   UTILISATION, dans le <head> d'un widget personnalisé, APRÈS le script de l'API Grist :

     <script src="https://grist.example/grist-plugin-api.js"></script>
     <script src="https://VOTRE-HEBERGEMENT/ft/bandeau.js" data-titre="Nom du widget"></script>

   et, dans le widget :  grist.ready({ requiredAccess: "full" });

   - data-titre est facultatif : il s'ajoute au titre du menu (« Titre du menu - Nom du widget »), sauf si le réglage
     titre_widget de Bandeau_config vaut « non ».
   - Tout le reste (titre, logos, couleurs, liens, groupes, menu utilisateur, rôles) est lu dans les tables
     du document : Bandeau_config, Bandeau_liens et la table des personnes. Aucun fichier à régénérer.
   - Appels externes : les logos (adresses fournies) et, sauf si police_marianne = non, la police Marianne (gras) depuis
     cdn.jsdelivr.net. Le reste utilise la police système, comme le prévoit le design system France Travail.
   - Dépannage : dans la console du widget, taper  BandeauMenu.etat()

   Les rôles ne servent qu'à masquer des liens dans le menu : ce n'est PAS une sécurité.
   La vraie protection reste dans les règles d'accès de Grist.
   ========================================================== */
(function () {
  "use strict";

  var NOM = "BandeauMenu";
  if (window[NOM]) return;   // fichier chargé deux fois : une seule instance

  var VERSION = "bandeau-ft-0.3.0";
  var T_CONFIG = "Bandeau_config", T_LIENS = "Bandeau_liens";
  var DELAIS = [0, 400, 1000, 2000, 4000, 8000];   // le widget peut appeler grist.ready() après le chargement de ce fichier
  var DELAI_LECTURE = 5000;                         // une lecture sans réponse est abandonnée puis retentée
  // Palette par défaut = design system France Travail : white, gray-90, france-travail-50, gray-05, gray-90.
  var DEFAUT = { fond: "#ffffff", texte: "#2e2e31", primaire: "#283276", gris: "#f5f5f8", sombre: "#2e2e31" };
  var ALT_DEFAUT = ["République Française", "France Travail"];
  // Police des titres du design system de l'État (Marianne), chargée seulement en gras, une seule fois, et désactivable (police_marianne = non).
  // Elle doit être déclarée dans le document : un @font-face placé dans un Shadow DOM n'est pas chargé.
  var URL_MARIANNE = "https://cdn.jsdelivr.net/npm/@gouvfr/dsfr/dist/fonts/Marianne-Bold.woff2";
  var ICONES = {"chevron": "<path d=\"M6 9l6 6 6-6\"/>", "maison": "<path d=\"M4 11.2 12 4l8 7.2\"/><path d=\"M6 10v10h12V10\"/><path d=\"M10 20v-5.5h4V20\"/>", "engrenage": "<path d=\"M18.70 10.34 L20.95 9.85 L20.95 14.15 L18.70 13.66 L17.91 15.56 L19.84 16.81 L16.81 19.84 L15.56 17.91 L13.66 18.70 L14.15 20.95 L9.85 20.95 L10.34 18.70 L8.44 17.91 L7.19 19.84 L4.16 16.81 L6.09 15.56 L5.30 13.66 L3.05 14.15 L3.05 9.85 L5.30 10.34 L6.09 8.44 L4.16 7.19 L7.19 4.16 L8.44 6.09 L10.34 5.30 L9.85 3.05 L14.15 3.05 L13.66 5.30 L15.56 6.09 L16.81 4.16 L19.84 7.19 L17.91 8.44Z\"/><circle cx=\"12\" cy=\"12\" r=\"2.9\"/>", "deconnexion": "<path d=\"M10 4H5v16h5\"/><path d=\"M15 8l4 4-4 4\"/><path d=\"M19 12H9\"/>"};   // nom -> contenu SVG (viewBox 24, trait) ; constantes du fichier, jamais de données du document

  var script = document.currentScript || document.querySelector("script[src*='bandeau'][data-titre]");
  var titreWidget = script ? (script.getAttribute("data-titre") || "").trim() : "";

  var ui = null;   // éléments du bandeau, une fois construit
  var donnees = null, erreurLecture = "";
  var groupes = [], compteur = 0;   // menus déroulants : { conteneur, btn, panneau }

  // ---------- Utilitaires ----------
  function el(tag, cls, attrs) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    Object.keys(attrs || {}).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function msg(e) { return e && e.message ? e.message : String(e); }
  function vide(v) { return v === undefined || v === null || v === ""; }
  function normaliser(s) { return String(s == null ? "" : s).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""); }
  function liste(v) {   // texte ou liste de choix Grist ["L", "a", "b"] ; ["C"] = cellule masquée
    if (typeof v === "string") return v.trim() ? [v.trim()] : [];
    if (!Array.isArray(v) || v[0] === "C") return [];
    return (v[0] === "L" ? v.slice(1) : v).filter(function (x) { return !vide(x); });
  }
  function urlHttps(u) {
    u = String(u == null ? "" : u).trim();
    if (!/^https:\/\/[^\s]+$/i.test(u)) return "";
    try { return new URL(u).protocol === "https:" ? u : ""; } catch (e) { return ""; }
  }
  function couleur(v, defaut) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(v || "").trim()) ? String(v).trim().toLowerCase() : defaut; }   // jamais de valeur libre dans le CSS
  function luminance(hex) {
    var c = hex.length === 4 ? "#" + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3] : hex;
    var v = [1, 3, 5].map(function (i) { var x = parseInt(c.substr(i, 2), 16) / 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); });
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  }
  function texteSur(hex) {   // blanc ou noir : celui qui contraste le plus avec le fond donné
    var l = luminance(hex);
    return (1.05 / (l + 0.05)) >= ((l + 0.05) / 0.05) ? "#ffffff" : "#000000";
  }
  function lignes(t) {
    var cles = Object.keys(t).filter(function (c) { return c !== "id"; });
    return t.id.map(function (id, i) { var l = { id: id }; cles.forEach(function (c) { l[c] = t[c][i]; }); return l; });
  }
  function avecDelai(p) {
    return new Promise(function (ok, ko) {
      var t = setTimeout(function () { ko(new Error("délai dépassé")); }, DELAI_LECTURE);
      p.then(function (v) { clearTimeout(t); ok(v); }, function (e) { clearTimeout(t); ko(e); });
    });
  }
  function trierLiens(liens) {   // par Ordre ; sans Ordre : après, dans l'ordre de la table
    return liens.map(function (l, i) { return { l: l, i: i }; }).sort(function (a, b) {
      var oa = vide(a.l.Ordre), ob = vide(b.l.Ordre);
      if (oa && ob) return a.i - b.i;
      if (oa) return 1;
      if (ob) return -1;
      return (Number(a.l.Ordre) - Number(b.l.Ordre)) || (a.i - b.i);
    }).map(function (x) { return x.l; });
  }
  // Adresse d'une page du document, déduite de l'adresse d'accès à l'API que Grist fournit :
  //   https://hote/o/org/api/docs/ID  ->  https://hote/o/org/ID/NOM/p/N
  // Grist écrit ses pages avec le nom du document avant « p/N » (…/ID/Menu-France-Travail/p/4). Sans ce segment, « p » est pris pour
  // le nom du document et le numéro de page est perdu : Grist ouvre alors la première page. Le nom exact n'a pas d'importance (Grist
  // le remplace par le vrai), on met un nom neutre.
  function urlPage(base, n) {
    if (!/\/api\/docs\//.test(base || "")) return "";
    return base.replace(/\/api\/docs\//, "/").replace(/\/+$/, "") + "/doc/p/" + n;
  }
  function identite(m) {
    if (!m) return { label: "Non identifié·e", initiales: "?" };
    var complet = String(m.nomComplet || "").trim(), prenom = String(m.prenom || "").trim(), nom = String(m.nom || "").trim();
    var initiales = prenom.charAt(0) + nom.charAt(0);
    if (complet) { var mots = complet.split(/\s+/); initiales = mots[0].charAt(0) + (mots.length > 1 ? mots[mots.length - 1].charAt(0) : ""); }
    return { label: complet || (prenom + " " + nom).trim(), initiales: initiales.toUpperCase() };
  }
  function chargerMarianne(actif) {
    var present = document.getElementById("bm-marianne");
    if (!actif) { if (present) present.remove(); return; }
    if (present) return;
    var st = el("style", null, { id: "bm-marianne" });
    st.textContent = '@font-face{ font-family:"Marianne"; src:url("' + URL_MARIANNE + '") format("woff2"); font-weight:700; font-display:swap; }';
    document.head.appendChild(st);   // sans la police (réseau, blocage) : retour automatique à la police système
  }
  function icone(nom, cls) {   // SVG décoratif : le texte du lien porte le sens
    var t = document.createElement("template");
    t.innerHTML = '<svg class="' + cls + '" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + ICONES[nom] + "</svg>";
    return t.content.firstChild;
  }

  // ---------- Lecture des tables ----------
  // La personne connectée est LA seule ligne dont l'Email est lisible (les autres sont masqués
  // par une règle d'accès). S'il y en a plusieurs ou aucune, on ne devine pas.
  function personne(tab, cfg) {
    var emails = tab[cfg["users.email"]];
    if (!emails) return null;
    var vis = [];
    emails.forEach(function (v, i) { if (typeof v === "string" && v.indexOf("@") > 0) vis.push(i); });
    if (vis.length !== 1) return null;
    var k = vis[0];
    function champ(cle) { var c = cfg[cle] && tab[cfg[cle]]; return c ? c[k] : ""; }
    var roles = [];
    if (cfg["users.role"] && tab[cfg["users.role"]]) roles = liste(tab[cfg["users.role"]][k]);
    return { nomComplet: champ("users.nom_complet"), prenom: champ("users.prenom"), nom: champ("users.nom"), roles: roles };
  }

  async function lireTout() {
    var g = window.grist;
    if (!g || !g.docApi || typeof g.docApi.fetchTable !== "function") throw new Error("API Grist absente (le widget doit charger grist-plugin-api.js)");
    var cfg = {};
    lignes(await avecDelai(g.docApi.fetchTable(T_CONFIG))).forEach(function (l) { if (!vide(l.Cle)) cfg[l.Cle] = vide(l.Valeur) ? "" : String(l.Valeur); });
    var liens = lignes(await avecDelai(g.docApi.fetchTable(T_LIENS)));
    var aPersonnes = !!(cfg["users.table"] && cfg["users.email"]), moi = null;
    if (aPersonnes) {
      try { moi = personne(await avecDelai(g.docApi.fetchTable(cfg["users.table"])), cfg); }
      catch (e) { console.warn("[bandeau] table des personnes illisible :", msg(e)); }
    }
    var base = "";
    if (liens.some(function (l) { return vide(l.Url) && Number(l.Page) > 0; })) {
      try { base = (await avecDelai(g.docApi.getAccessToken({ readOnly: true }))).baseUrl || ""; }
      catch (e) { console.warn("[bandeau] adresse du document introuvable : les liens vers des pages sont ignorés (" + msg(e) + ")"); }
    }
    return { cfg: cfg, liens: liens, aPersonnes: aPersonnes, moi: moi, base: base };
  }

  // Liens visibles pour la personne, rangés en barre de navigation (liens simples ou groupes déroulants) et menu utilisateur.
  // Un groupe apparaît à la place de son premier lien ; un groupe sans lien visible disparaît.
  function preparerMenus(d) {
    var roles = d.moi ? d.moi.roles.map(normaliser).filter(Boolean) : [];
    var visibles = trierLiens(d.liens).filter(function (l) { return l.Actif && !vide(l.Titre); }).map(function (l) {
      var href = !vide(l.Url) ? urlHttps(l.Url) : (Number(l.Page) > 0 ? urlPage(d.base, Number(l.Page)) : "");
      if (!href) return null;
      var ic = normaliser(l.Icone);
      return { nom: String(l.Titre).trim(), href: href, nouvelOnglet: !!l.Nouvel_onglet, icone: ICONES[ic] && ic !== "chevron" ? ic : "",
        utilisateur: /^utilisateur|^menu utilisateur/.test(normaliser(l.Emplacement)), groupe: String(l.Groupe == null ? "" : l.Groupe).trim(),
        roles: liste(l.Roles).map(normaliser).filter(Boolean) };
    }).filter(Boolean).filter(function (l) {
      return !l.roles.length || l.roles.some(function (r) { return roles.indexOf(r) !== -1; });   // rôle inconnu : seuls les liens sans rôle
    });
    var nav = [], parNom = {}, utilisateur = [];
    visibles.forEach(function (l) {
      if (l.utilisateur) { utilisateur.push(l); return; }
      if (l.groupe) {
        var k = normaliser(l.groupe);
        if (!parNom[k]) { parNom[k] = { groupe: l.groupe, liens: [] }; nav.push(parNom[k]); }
        parNom[k].liens.push(l);
      } else nav.push({ lien: l });
    });
    return { nav: nav, utilisateur: utilisateur };
  }

  // ---------- Style (valeurs de couleur validées, jamais de texte libre) ----------
  function couleurs(cfg) {
    var c = { fond: couleur(cfg.couleur_fond, DEFAUT.fond), texte: couleur(cfg.couleur_texte, DEFAUT.texte), primaire: couleur(cfg.couleur_primaire, DEFAUT.primaire),
      gris: couleur(cfg.couleur_gris, DEFAUT.gris), sombre: couleur(cfg.couleur_sombre, DEFAUT.sombre) };
    c.surPrimaire = texteSur(c.primaire); c.surSombre = texteSur(c.sombre);
    return c;
  }
  function feuille(c) {
    var police = "'SF Pro Text',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";
    return [
      ":host{ display:block; position:sticky; top:0; z-index:20; font-family:" + police + "; --f:" + c.fond + "; --t:" + c.texte + "; --p:" + c.primaire + "; --g:" + c.gris + "; --s:" + c.sombre + "; --tp:" + c.surPrimaire + "; --ts:" + c.surSombre + "; }",
      "*{ box-sizing:border-box; }",
      "[hidden]{ display:none !important; }",
      "/* EN-TÊTE */",
      ".ft-header{ background:var(--f); color:var(--t); box-shadow:0 4px 8px rgba(15,20,56,.08); padding:0 1rem; }",
      ".ft-inner{ min-height:6.25rem; display:flex; align-items:center; flex-wrap:wrap; gap:.5rem 1.5rem; padding:1.25rem 0; }",
      "/* LOGOS ET TITRE */",
      "/* écart logos / titre : 1.5rem du conteneur + 1rem = 2.5rem (40 px) ; sous 576 px : 1.5rem - .5rem = 1rem (16 px) */",
      ".ft-logos{ display:flex; align-items:center; gap:1rem; flex:none; margin-right:1rem; }",
      ".ft-logo{ display:flex; border-radius:.25rem; }",
      ".ft-logo-img{ display:block; height:3.75rem; width:auto; max-width:14rem; object-fit:contain; }",
      ".ft-titre{ font-family:Marianne," + police + "; font-size:1.5rem; font-weight:700; line-height:1.2; color:var(--p); }",
      "/* NAVIGATION */",
      ".ft-nav{ flex:1 1 auto; min-width:0; }",
      ".ft-liste{ list-style:none; margin:0; padding:0; display:flex; flex-wrap:wrap; gap:.5rem; }",
      ".ft-item{ position:relative; }",
      ".ft-btn{ display:inline-flex; align-items:center; gap:.5rem; min-height:3rem; padding:.5rem 1rem; border:0; border-radius:.75rem; background:transparent; color:var(--t); font:inherit; font-size:1rem; font-weight:500; line-height:1.5rem; text-decoration:none; cursor:pointer; }",
      ".ft-btn:hover, .ft-btn[aria-expanded=\"true\"]{ background:var(--g); }",
      ".ft-chev{ width:1rem; height:1rem; flex:none; transition:transform .15s; }",
      "[aria-expanded=\"true\"] > .ft-chev{ transform:rotate(180deg); }",
      "/* UTILISATEUR */",
      ".ft-user-zone{ position:relative; }",
      ".ft-droite{ display:flex; align-items:center; gap:.75rem; margin-left:auto; flex:none; max-width:100%; }",
      ".ft-statut{ font-size:.875rem; }",
      ".ft-user{ display:inline-flex; align-items:center; gap:.5rem; min-height:3rem; max-width:100%; padding:.25rem 0; border:0; background:none; color:var(--t); font:inherit; font-size:1rem; font-weight:500; line-height:1.5rem; }",
      "button.ft-user{ cursor:pointer; }",
      "button.ft-user:hover, button.ft-user[aria-expanded=\"true\"]{ background:var(--s); color:var(--ts); }",
      ".ft-avatar{ width:2.5rem; height:2.5rem; border-radius:50%; background:var(--p); color:var(--tp); display:grid; place-items:center; flex:none; font-size:.875rem; font-weight:700; }",
      "button.ft-user:hover .ft-avatar, button.ft-user[aria-expanded=\"true\"] .ft-avatar{ background:var(--ts); color:var(--s); }",
      ".ft-user-nom{ overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:14rem; }",
      "/* MENUS DÉROULANTS */",
      ".ft-panel{ position:absolute; top:calc(100% + .5rem); left:0; z-index:50; min-width:14rem; max-width:min(90vw,22rem); padding:.5rem; background:var(--f); color:var(--t); border-radius:.75rem; box-shadow:0 0 8px rgba(15,20,56,.16); }",
      ".ft-panel--droite{ left:auto; right:0; }",
      ".ft-panel ul{ list-style:none; margin:0; padding:0; }",
      ".ft-panel a{ display:flex; align-items:center; gap:.75rem; min-height:2.75rem; padding:.5rem .75rem; border-radius:.5rem; color:var(--t); font-size:1rem; font-weight:500; line-height:1.5rem; text-decoration:none; }",
      ".ft-panel a:hover{ background:var(--g); }",
      ".ft-ico{ width:1.25rem; height:1.25rem; flex:none; }",
      ".ft-vide{ margin:0; padding:.5rem .75rem; font-size:.875rem; }",
      ".ft-sr{ position:absolute; clip-path:inset(50%); overflow:hidden; white-space:nowrap; }",
      "/* ACCESSIBILITÉ */",
      ".ft-btn:focus-visible, .ft-user:focus-visible, .ft-panel a:focus-visible{ outline:3px solid var(--t); outline-offset:2px; }",
      "/* au clic de souris, pas d'anneau de focus : il reste affiché pour la navigation au clavier */",
      ":host([data-pointeur]) .ft-btn:focus, :host([data-pointeur]) .ft-user:focus, :host([data-pointeur]) .ft-panel a:focus{ outline:none; }",
      "@media (prefers-reduced-motion: reduce){ .ft-chev{ transition:none; } }",
      "/* ADAPTATION */",
      "@media (min-width:1240px){ .ft-header{ padding:0 1.25rem; } }",
      "@media (max-width:899px){ .ft-nav{ order:3; flex-basis:100%; } }",
      "@media (max-width:575px){ .ft-inner{ min-height:4rem; padding:.75rem 0; } .ft-logos{ margin-right:-.5rem; } .ft-logo-img{ height:2.5rem; } .ft-titre{ font-size:1.125rem; } .ft-user-nom{ max-width:9rem; } }"
    ].join("\n");
  }

  // ---------- Construction ----------
  function construire() {
    if (document.getElementById("bm-bandeau")) return;
    var host = el("div", null, { id: "bm-bandeau" });
    var root = host.attachShadow({ mode: "open" });
    var style = el("style");
    style.textContent = feuille(couleurs({}));
    root.appendChild(style);

    var header = el("header", "ft-header"), inner = el("div", "ft-inner");
    var logos = el("div", "ft-logos"); logos.hidden = true;
    var titre = el("div", "ft-titre");
    var nav = el("nav", "ft-nav", { "aria-label": "Navigation principale" }); nav.hidden = true;
    var listeNav = el("ul", "ft-liste"); nav.appendChild(listeNav);
    var droite = el("div", "ft-droite");
    var statut = el("span", "ft-statut", { role: "status" });
    var utilisateur = el("div", "ft-user-zone"); utilisateur.hidden = true;
    droite.appendChild(statut); droite.appendChild(utilisateur);
    inner.appendChild(logos); inner.appendChild(titre); inner.appendChild(nav); inner.appendChild(droite);
    header.appendChild(inner); root.appendChild(header);

    ui = { host: host, style: style, logos: logos, titre: titre, nav: nav, liste: listeNav, statut: statut, utilisateur: utilisateur };
    titre.hidden = true;   // le titre s'affiche une fois les réglages lus (le nom du widget peut être désactivé)

    host.addEventListener("pointerdown", function () { host.setAttribute("data-pointeur", ""); }, true);   // interaction à la souris
    document.addEventListener("keydown", function () { host.removeAttribute("data-pointeur"); }, true);    // clavier : l'anneau de focus revient
    document.addEventListener("click", function (e) {   // un clic ailleurs ferme les menus
      var chemin = e.composedPath();
      if (!groupes.some(function (g) { return chemin.indexOf(g.conteneur) !== -1; })) fermerTout();
    });
    document.addEventListener("focusin", function (e) {   // le focus sort du menu ouvert (Tab) : il se referme
      var ouvert = groupes.filter(function (g) { return !g.panneau.hidden; })[0];
      if (ouvert && e.composedPath().indexOf(ouvert.conteneur) === -1) fermerTout();
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      var ouvert = groupes.filter(function (g) { return !g.panneau.hidden; })[0];
      if (ouvert) { fermerTout(); ouvert.btn.focus(); }
    });
    document.body.insertBefore(host, document.body.firstChild);
    demarrer(0);
  }

  function fermerTout() {
    groupes.forEach(function (g) { g.panneau.hidden = true; g.btn.setAttribute("aria-expanded", "false"); });
  }
  function basculer(g) {
    var ouvrir = g.panneau.hidden;
    fermerTout();
    if (ouvrir) { g.panneau.hidden = false; g.btn.setAttribute("aria-expanded", "true"); }
  }
  function listeDeLiens(liens) {
    var ul = el("ul");
    liens.forEach(function (l) {
      var li = el("li"), a = el("a", null, { href: l.href, target: l.nouvelOnglet ? "_blank" : "_top", rel: "noopener" });
      if (l.icone) a.appendChild(icone(l.icone, "ft-ico"));
      var t = el("span"); t.textContent = l.nom; a.appendChild(t);
      if (l.nouvelOnglet) { var sr = el("span", "ft-sr"); sr.textContent = " (nouvel onglet)"; a.appendChild(sr); }   // RGAA 13.2 : le changement de fenêtre est annoncé
      li.appendChild(a); ul.appendChild(li);
    });
    return ul;
  }
  function menuDeroulant(conteneur, bouton, liens, cls) {
    var id = "ft-menu-" + (++compteur);
    var panneau = el("div", "ft-panel" + (cls ? " " + cls : ""), { id: id }); panneau.hidden = true;
    panneau.appendChild(listeDeLiens(liens));
    bouton.setAttribute("aria-controls", id); bouton.setAttribute("aria-expanded", "false");
    bouton.appendChild(icone("chevron", "ft-chev"));
    conteneur.appendChild(bouton); conteneur.appendChild(panneau);
    var g = { conteneur: conteneur, btn: bouton, panneau: panneau };
    groupes.push(g);
    bouton.addEventListener("click", function (e) { e.stopPropagation(); basculer(g); });
  }

  function appliquer(d) {
    var c = couleurs(d.cfg);
    ui.style.textContent = feuille(c);
    chargerMarianne(String(d.cfg.police_marianne || "oui").trim().toLowerCase() !== "non");

    ui.logos.textContent = "";   // deux logos facultatifs : adresse vide = rien d'affiché
    [1, 2].forEach(function (n) {
      var src = urlHttps(d.cfg["logo" + n + "_url"]);
      if (!src) return;
      var alt = String(d.cfg["logo" + n + "_alt"] || "").trim() || ALT_DEFAUT[n - 1];
      var img = el("img", "ft-logo-img", { src: src, alt: alt });
      var cadre = el("span", "ft-logo");
      cadre.appendChild(img); ui.logos.appendChild(cadre);
    });
    ui.logos.hidden = !ui.logos.childNodes.length;

    var avecNom = String(d.cfg.titre_widget || "oui").trim().toLowerCase() !== "non";   // réglage « nom du widget » (oui par défaut)
    var titre = [String(d.cfg.titre || "").trim(), avecNom ? titreWidget : ""].filter(Boolean).join(" - ");
    ui.titre.textContent = titre; ui.titre.hidden = !titre;

    groupes = [];
    var m = preparerMenus(d);
    ui.liste.textContent = "";
    m.nav.forEach(function (e) {
      var li = el("li", "ft-item");
      if (e.groupe) {
        var b = el("button", "ft-btn", { type: "button" });
        b.appendChild(document.createTextNode(e.groupe));
        menuDeroulant(li, b, e.liens);
      } else {
        var a = el("a", "ft-btn", { href: e.lien.href, target: e.lien.nouvelOnglet ? "_blank" : "_top", rel: "noopener" });
        a.appendChild(document.createTextNode(e.lien.nom));
        if (e.lien.nouvelOnglet) { var sr = el("span", "ft-sr"); sr.textContent = " (nouvel onglet)"; a.appendChild(sr); }
        li.appendChild(a);
      }
      ui.liste.appendChild(li);
    });
    ui.nav.hidden = !m.nav.length;

    ui.utilisateur.textContent = "";
    if (d.aPersonnes) {
      var id = identite(d.moi), av = el("span", "ft-avatar", { "aria-hidden": "true" }), nom = el("span", "ft-user-nom");
      av.textContent = id.initiales; nom.textContent = id.label;
      var chip;
      if (m.utilisateur.length) {
        chip = el("button", "ft-user", { type: "button" });
        chip.appendChild(av); chip.appendChild(nom);
        menuDeroulant(ui.utilisateur, chip, m.utilisateur, "ft-panel--droite");
      } else {   // aucun lien dans le menu utilisateur : simple affichage, pas un bouton qui ne mène nulle part
        chip = el("div", "ft-user"); chip.appendChild(av); chip.appendChild(nom); ui.utilisateur.appendChild(chip);
      }
      ui.utilisateur.hidden = false;
    } else ui.utilisateur.hidden = true;
    ui.statut.textContent = "";
  }

  function demarrer(essai) {
    lireTout().then(function (d) { donnees = d; erreurLecture = ""; appliquer(d); }, function (e) {
      if (essai + 1 < DELAIS.length) { setTimeout(function () { demarrer(essai + 1); }, DELAIS[essai + 1]); return; }
      erreurLecture = msg(e);
      console.warn("[bandeau] menu indisponible :", erreurLecture);
      ui.statut.textContent = "Menu indisponible";   // discret : le détail est dans la console
      ui.titre.textContent = titreWidget; ui.titre.hidden = !titreWidget;   // réglages illisibles : on garde au moins le nom du widget
    });
  }

  // ---------- API de diagnostic ----------
  window[NOM] = {
    version: VERSION,
    etat: function () {
      var m = donnees ? preparerMenus(donnees) : null;
      return {
        version: VERSION, titreWidget: titreWidget, erreur: erreurLecture || "(aucune)",
        config: donnees ? donnees.cfg : "(pas encore lue)",
        personne: donnees ? (donnees.moi || (donnees.aPersonnes ? "(non identifiée)" : "(table des personnes non configurée)")) : "(pas encore lue)",
        navigation: m ? m.nav.map(function (e) { return e.groupe ? { groupe: e.groupe, liens: e.liens.map(function (l) { return l.nom; }) } : { lien: e.lien.nom }; }) : "(pas encore lue)",
        menuUtilisateur: m ? m.utilisateur.map(function (l) { return l.nom; }) : "(pas encore lu)"
      };
    }
  };

  if (document.body) construire();
  else document.addEventListener("DOMContentLoaded", construire);
})();
