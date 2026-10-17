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
  var ICONES = {"chevron": "<path fill=\"currentColor\" stroke=\"none\" d=\"M5.32 9.61Q4.95 9.89 4.89 10.35Q4.83 10.8 5.11 11.18Q5.7 11.95 6.35 12.68Q7.01 13.41 7.73 14.06Q8.46 14.72 9.26 15.3Q10.05 15.89 10.9 16.38L11.41 16.71Q11.7 16.88 12 16.88Q12.3 16.88 12.59 16.71L13.1 16.38Q13.95 15.89 14.74 15.3Q15.54 14.72 16.27 14.06Q16.99 13.41 17.65 12.68Q18.3 11.95 18.89 11.18Q19.17 10.8 19.11 10.35Q19.05 9.89 18.68 9.61Q18.3 9.33 17.85 9.39Q17.39 9.45 17.11 9.82Q16.05 11.2 14.77 12.38Q13.48 13.55 12 14.44Q10.52 13.55 9.23 12.38Q7.95 11.2 6.89 9.82Q6.61 9.45 6.15 9.39Q5.7 9.33 5.32 9.61Z\"/>", "maison": "<path fill=\"currentColor\" stroke=\"none\" d=\"M22.36 7.05Q21.45 6.05 20.2 4.8Q18.96 3.59 17.57 2.52Q16.17 1.45 14.74 0.73Q13.29 0 12 0Q10.71 0 9.26 0.73Q7.83 1.45 6.43 2.52Q5.04 3.59 3.8 4.8Q2.55 6.05 1.64 7.05Q0.87 7.95 0.43 9.13Q0 10.31 0 11.55Q0 15.05 0 17.46Q0 19.88 1 21.38Q1.99 22.88 4.5 23.48Q6.98 24.12 12 24Q15.77 24 18.12 23.74Q20.46 23.51 21.77 22.68Q23.09 21.84 23.53 20.27Q24 18.7 24 16.05Q23.95 14.98 24 13.73Q24.05 12.49 23.96 11.27Q23.88 10.05 23.53 8.95Q23.2 7.83 22.36 7.05ZM14.7 21.61Q13.45 21.61 11.92 21.61Q10.38 21.61 9.14 21.61Q9.14 20.77 9.14 19.8Q9.12 18.84 9.16 17.92Q9.21 16.99 9.35 16.15Q9.47 15.33 9.75 14.7Q9.87 14.58 10.21 14.41Q10.55 14.25 12 14.25Q13.45 14.25 13.78 14.41Q14.11 14.58 14.11 14.7Q14.39 15.33 14.51 16.15Q14.65 16.99 14.68 17.92Q14.72 18.84 14.72 19.8Q14.7 20.77 14.7 21.61ZM21.75 11.55Q21.75 12.12 21.75 12.69Q21.75 13.27 21.75 13.95Q21.75 14.39 21.75 14.85Q21.75 15.3 21.75 15.75Q21.75 19.92 20.87 20.53Q19.99 21.14 16.95 21.61Q17.02 19.24 16.97 17.39Q16.9 15.56 16.44 14.32Q15.98 13.08 14.95 12.49Q13.92 11.88 12 12Q10.08 11.88 9.05 12.49Q8.02 13.08 7.56 14.32Q7.1 15.56 7.05 17.39Q6.98 19.24 7.05 21.61Q3.8 21.26 3.02 20.29Q2.25 19.31 2.25 15.14Q2.25 14.81 2.25 14.47Q2.25 14.13 2.25 13.8Q2.25 13.45 2.25 13.14Q2.25 12.82 2.25 12.61Q2.25 12.49 2.25 12.3Q2.25 12.12 2.25 12Q2.25 10.99 2.5 10.11Q2.74 9.23 3.3 8.55Q4.2 7.55 5.32 6.4Q6.45 5.25 7.8 4.36Q10.73 2.32 12 2.32Q13.27 2.32 16.2 4.36Q17.11 5.13 18.07 5.91Q19.05 6.7 19.88 7.56Q20.7 8.41 21.21 9.4Q21.75 10.36 21.75 11.55Z\"/>", "engrenage": "<path d=\"M18.70 10.34 L20.95 9.85 L20.95 14.15 L18.70 13.66 L17.91 15.56 L19.84 16.81 L16.81 19.84 L15.56 17.91 L13.66 18.70 L14.15 20.95 L9.85 20.95 L10.34 18.70 L8.44 17.91 L7.19 19.84 L4.16 16.81 L6.09 15.56 L5.30 13.66 L3.05 14.15 L3.05 9.85 L5.30 10.34 L6.09 8.44 L4.16 7.19 L7.19 4.16 L8.44 6.09 L10.34 5.30 L9.85 3.05 L14.15 3.05 L13.66 5.30 L15.56 6.09 L16.81 4.16 L19.84 7.19 L17.91 8.44Z\"/><circle cx=\"12\" cy=\"12\" r=\"2.9\"/>", "deconnexion": "<path d=\"M10 4H5v16h5\"/><path d=\"M15 8l4 4-4 4\"/><path d=\"M19 12H9\"/>", "menu": "<path fill=\"currentColor\" stroke=\"none\" d=\"M22.78 6.45Q20.09 6.21 17.39 6.07Q14.7 5.95 12 5.95Q9.3 5.95 6.61 6.07Q3.91 6.21 1.22 6.45Q0.77 6.49 0.41 6.19Q0.05 5.88 0 5.41Q-0.05 4.97 0.26 4.61Q0.56 4.24 1.03 4.2Q3.77 3.96 6.52 3.82Q9.26 3.7 12 3.7Q14.74 3.7 17.48 3.82Q20.25 3.96 22.97 4.2Q23.44 4.24 23.74 4.61Q24.05 4.97 24 5.41Q23.95 5.88 23.6 6.19Q23.25 6.49 22.78 6.45ZM22.78 13.36Q20.09 13.12 17.39 13.01Q14.7 12.87 12 12.87Q9.3 12.87 6.61 13.01Q3.91 13.12 1.22 13.36Q0.77 13.41 0.41 13.11Q0.05 12.82 0 12.35Q-0.05 11.88 0.26 11.52Q0.56 11.16 1.03 11.13Q3.77 10.88 6.52 10.76Q9.26 10.62 12 10.62Q14.74 10.62 17.48 10.76Q20.25 10.88 22.97 11.13Q23.44 11.16 23.74 11.52Q24.05 11.88 24 12.35Q23.95 12.82 23.6 13.11Q23.25 13.41 22.78 13.36ZM1.22 20.3Q3.91 20.04 6.61 19.92Q9.3 19.8 12 19.8Q14.7 19.8 17.39 19.92Q20.09 20.04 22.78 20.3Q23.25 20.32 23.6 20.03Q23.95 19.73 24 19.27Q24.05 18.8 23.74 18.45Q23.44 18.09 22.97 18.05Q20.25 17.79 17.48 17.67Q14.74 17.55 12 17.55Q9.26 17.55 6.52 17.67Q3.77 17.79 1.03 18.05Q0.56 18.09 0.26 18.45Q-0.05 18.8 0 19.27Q0.05 19.73 0.41 20.03Q0.77 20.32 1.22 20.3Z\"/>", "fermer": "<path fill=\"currentColor\" stroke=\"none\" d=\"M21.8 3.8Q22.12 3.47 22.12 3Q22.12 2.53 21.8 2.2Q21.47 1.88 21 1.88Q20.53 1.88 20.2 2.2L12 10.41L3.8 2.2Q3.47 1.88 3 1.88Q2.53 1.88 2.2 2.2Q1.88 2.53 1.88 3Q1.88 3.47 2.2 3.8L10.41 12L2.2 20.2Q1.88 20.53 1.88 21Q1.88 21.47 2.2 21.8Q2.53 22.12 3 22.12Q3.47 22.12 3.8 21.8L12 13.59L20.2 21.8Q20.53 22.12 21 22.12Q21.47 22.12 21.8 21.8Q22.12 21.47 22.12 21Q22.12 20.53 21.8 20.2L13.59 12L21.8 3.8Z\"/>"};   // nom -> contenu SVG (viewBox 24, trait) ; constantes du fichier, jamais de données du document

  // Origine de « menu », « fermer », « maison » et « chevron » : police d'icônes du design system France Travail (ft-ds-font-icons, fichier ft-icons.woff2).
  // menu = caractère \ea01 (icon-menu), fermer = caractère \e92a (icon-close). Tracés extraits tels quels avec fontTools, mis à l'échelle
  // dans un carré de 24 (axe vertical inversé), sans retouche. Ce sont des dessins pleins (fill), pas des traits : le fill est donc dans le tracé.
  // maison = caractère \e9fe (icon-home), chevron = caractère \e9db (icon-chevron-sm-d) : même police, même extraction, mêmes règles.
  // La clé « maison » est conservée (c'est une donnée de Bandeau_liens, colonne Icone) ; seul son dessin change.
  // Le bandeau ne charge pas la police : seuls ces quatre tracés sont copiés ici.

  var script = document.currentScript || document.querySelector("script[src*='bandeau'][data-titre]");
  var titreWidget = script ? (script.getAttribute("data-titre") || "").trim() : "";
  var modePublic = !!script && script.getAttribute("data-public") === "oui";   // mode « page publique » : valeur exacte « oui » seulement

  var ui = null;   // éléments du bandeau, une fois construit
  var donnees = null, erreurLecture = "";
  var groupes = [], compteur = 0;   // menus déroulants : { conteneur, btn, panneau, etat (burger seulement) }
  var SEUIL_BARRE = 992;   // en dessous : toujours le burger (point de rupture lg)
  var MARGE_RETOUR = 16;   // marge de sécurité (px) pour revenir à la barre complète : évite de basculer sans arrêt à la limite

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
      catch (e) { if (!modePublic) console.warn("[bandeau] table des personnes illisible :", msg(e)); }
    }
    var base = "";
    if (liens.some(function (l) { return vide(l.Url) && Number(l.Page) > 0; })) {
      try { base = (await avecDelai(g.docApi.getAccessToken({ readOnly: true }))).baseUrl || ""; }
      catch (e) { if (!modePublic) console.warn("[bandeau] adresse du document introuvable : les liens vers des pages sont ignorés (" + msg(e) + ")"); }
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
      return { nom: String(l.Titre).trim(), href: href, nouvelOnglet: !!l.Nouvel_onglet, icone: Object.prototype.hasOwnProperty.call(ICONES, ic) && ic !== "chevron" ? ic : "",   // seulement les clés propres de ICONES (« constructor », « __proto__ » ignorés)
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
      ".ft-inner{ min-height:6.25rem; display:flex; align-items:center; flex-wrap:nowrap; gap:.5rem 1.5rem; padding:1.25rem 0; }",
      "/* LOGOS ET TITRE */",
      "/* écart logos / titre : 1.5rem du conteneur + 1rem = 2.5rem (40 px) ; sous 576 px : 1.5rem - .5rem = 1rem (16 px) */",
      ".ft-logos{ display:flex; align-items:center; gap:1rem; flex:none; margin-right:1rem; }",
      ".ft-logo{ display:flex; border-radius:.25rem; }",
      ".ft-logo-img{ display:block; height:3.75rem; width:auto; max-width:14rem; object-fit:contain; }",
      ".ft-titre{ font-family:Marianne," + police + "; font-size:1.5rem; font-weight:700; line-height:1.2; color:var(--p); min-width:0; }",
      "/* NAVIGATION */",
      ".ft-nav{ flex:1 1 auto; min-width:0; }",
      ".ft-liste{ list-style:none; margin:0; padding:0; display:flex; flex-wrap:nowrap; gap:.5rem; }",
      ".ft-item{ position:relative; }",
      ".ft-btn{ display:inline-flex; align-items:center; gap:.5rem; min-height:3rem; padding:.5rem 1rem; border:0; border-radius:.75rem; background:transparent; color:var(--t); font:inherit; font-size:1rem; font-weight:500; line-height:1.5rem; text-decoration:none; cursor:pointer; }",
      ".ft-btn:hover, .ft-btn[aria-expanded=\"true\"]{ background:var(--g); }",
      ".ft-burger{ min-width:3rem; justify-content:center; padding:.5rem; }",
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
      ".ft-panel{ position:absolute; top:calc(100% + .5rem); left:0; z-index:50; min-width:14rem; max-width:min(90vw,22rem); padding:.5rem; background:var(--f); color:var(--t); border-radius:.75rem; box-shadow:0 0 8px rgba(15,20,56,.16); max-height:var(--hmax,none); overflow-y:auto; }",
      "/* BURGER (sous 992 px) : panneau pleine largeur sous le bandeau, rattaché au bandeau (le :host est positionné) */",
      ".ft-panel--burger{ top:100%; left:0; right:0; max-width:none; }",
      ".ft-intertitre{ margin:0; padding:1rem .75rem .5rem; font-family:Marianne," + police + "; font-size:1.125rem; font-weight:700; line-height:1.2; color:var(--t); }",
      ".ft-panel .ft-sous{ padding-left:1rem; }",
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
      "/* barre complète ou bouton burger : choisi en JavaScript (evaluer) selon la place disponible ; l'autre est retiré, pas seulement caché */",
      ":host(:not([data-burger])) .ft-mobile{ display:none; }",
      ":host([data-burger]) .ft-nav{ display:none; }",
      "/* personne connectée : en mode burger, seule la pastille reste visible ; le nom est masqué comme .ft-sr (lu par les lecteurs d'écran), au même basculement que la barre */",
      ":host([data-burger]) .ft-user-nom{ position:absolute; clip-path:inset(50%); }",
      "/* mesure de la largeur nécessaire à la barre complète : chaque bloc garde sa largeur naturelle, sur une seule ligne */",
      ":host([data-mesure]) .ft-inner > *{ flex:none; }",
      ":host([data-mesure]) .ft-titre{ white-space:nowrap; }",
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
    var mobile = el("nav", "ft-mobile", { "aria-label": "Navigation principale" }); mobile.hidden = true;   // bouton « Menu » et panneau (sous 992 px)
    droite.appendChild(statut); droite.appendChild(utilisateur); droite.appendChild(mobile);
    inner.appendChild(logos); inner.appendChild(titre); inner.appendChild(nav); inner.appendChild(droite);
    header.appendChild(inner); root.appendChild(header);

    ui = { host: host, inner: inner, style: style, logos: logos, titre: titre, nav: nav, mobile: mobile, liste: listeNav, statut: statut, utilisateur: utilisateur };
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
    if (window.ResizeObserver) new ResizeObserver(evaluer).observe(host);   // la taille du widget change : barre complète ou burger
    else window.addEventListener("resize", evaluer);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(evaluer);   // la police du titre (Marianne) change sa largeur une fois chargée
    if (!modePublic) document.body.insertBefore(host, document.body.firstChild);   // mode public : inséré seulement quand la personne est reconnue (voir demarrer)
    demarrer(0);
  }

  function fermerTout() {
    groupes.forEach(function (g) { g.panneau.hidden = true; g.btn.setAttribute("aria-expanded", "false"); if (g.etat) g.etat(false); });
  }
  // Largeur nécessaire à tout le bandeau sur une seule ligne : somme des blocs visibles, de leur marge droite et des écarts.
  // (La marge gauche automatique de la zone de droite n'est pas comptée : c'est de l'espace libre, pas une largeur.)
  function largeurNecessaire() {
    var cs = getComputedStyle(ui.inner), ecart = parseFloat(cs.columnGap) || 0, total = 0, n = 0;
    Array.prototype.forEach.call(ui.inner.children, function (b) {
      if (!b.getClientRects().length) return;   // bloc retiré ou caché
      total += b.getBoundingClientRect().width + (parseFloat(getComputedStyle(b).marginRight) || 0); n++;
    });
    return total + ecart * Math.max(0, n - 1);
  }
  // Barre complète seulement si tout tient sur une ligne et si le widget fait au moins 992 px ; sinon burger.
  function evaluer() {
    if (!ui || !ui.host.isConnected) return;
    var dispo = ui.inner.clientWidth;
    if (!dispo) return;
    var etaitBurger = ui.host.hasAttribute("data-burger"), burger = true;
    if (window.innerWidth >= SEUIL_BARRE) {
      ui.host.removeAttribute("data-burger"); ui.host.setAttribute("data-mesure", "");   // mesure en mode barre, sans affichage entre-temps
      var besoin = largeurNecessaire();
      ui.host.removeAttribute("data-mesure");
      burger = besoin > dispo - (etaitBurger ? MARGE_RETOUR : 0);   // pour revenir à la barre, il faut un peu de marge
    }
    if (burger) ui.host.setAttribute("data-burger", ""); else ui.host.removeAttribute("data-burger");
    if (burger !== etaitBurger) fermerTout();
  }
  function majHauteur() {   // hauteur maximale des menus et du panneau : hauteur visible du widget moins celle du bandeau (défilement au-delà)
    ui.host.style.setProperty("--hmax", Math.max(0, window.innerHeight - ui.host.offsetHeight) + "px");
  }
  function basculer(g) {
    var ouvrir = g.panneau.hidden;
    fermerTout();
    if (ouvrir) { majHauteur(); g.panneau.hidden = false; g.btn.setAttribute("aria-expanded", "true"); if (g.etat) g.etat(true); }
  }
  // Petit écran : un bouton burger (icône menu / croix, nom accessible « Menu » / « Fermer ») et un panneau. D'abord les liens sans groupe (Accueil), puis un bloc par groupe.
  function construireBurger(m) {
    var id = "ft-menu-" + (++compteur);
    var bouton = el("button", "ft-btn ft-burger", { type: "button", "aria-controls": id, "aria-expanded": "false" });
    var libelle = document.createTextNode("Menu"), sr = el("span", "ft-sr"), ico = icone("menu", "ft-ico");   // texte masqué à l'écran, lu par les lecteurs d'écran
    sr.appendChild(libelle); bouton.appendChild(ico); bouton.appendChild(sr);
    function etat(ouvert) {   // fermé : icône menu et « Menu » ; ouvert : croix et « Fermer »
      libelle.nodeValue = ouvert ? "Fermer" : "Menu";
      var neuve = icone(ouvert ? "fermer" : "menu", "ft-ico"); bouton.replaceChild(neuve, ico); ico = neuve;
    }
    var panneau = el("div", "ft-panel ft-panel--burger", { id: id }); panneau.hidden = true;
    var seuls = m.nav.filter(function (e) { return !e.groupe; }).map(function (e) { return e.lien; });
    if (seuls.length) panneau.appendChild(listeDeLiens(seuls));
    m.nav.filter(function (e) { return e.groupe; }).forEach(function (e) {
      var tid = "ft-groupe-" + (++compteur);
      var inter = el("p", "ft-intertitre", { id: tid }); inter.textContent = e.groupe;   // texte simple, pas un titre HTML
      var ul = listeDeLiens(e.liens); ul.className = "ft-sous"; ul.setAttribute("aria-labelledby", tid);
      panneau.appendChild(inter); panneau.appendChild(ul);
    });
    ui.mobile.appendChild(bouton); ui.mobile.appendChild(panneau);
    var g = { conteneur: ui.mobile, btn: bouton, panneau: panneau, etat: etat };
    groupes.push(g);
    bouton.addEventListener("click", function (e) { e.stopPropagation(); basculer(g); });
    panneau.addEventListener("click", function (e) {   // un clic sur un lien ferme le panneau ; le focus revient sur le bouton
      if (e.target.closest && e.target.closest("a")) { fermerTout(); bouton.focus(); }
    });
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
      img.addEventListener("load", evaluer); img.addEventListener("error", evaluer);   // la largeur du logo n'est connue qu'une fois l'image chargée
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
        if (e.lien.icone) a.appendChild(icone(e.lien.icone, "ft-ico"));   // icône à gauche du texte si la colonne Icone est remplie
        a.appendChild(document.createTextNode(e.lien.nom));
        if (e.lien.nouvelOnglet) { var sr = el("span", "ft-sr"); sr.textContent = " (nouvel onglet)"; a.appendChild(sr); }
        li.appendChild(a);
      }
      ui.liste.appendChild(li);
    });
    ui.nav.hidden = !m.nav.length;
    ui.mobile.textContent = ""; ui.mobile.hidden = !m.nav.length;   // aucun lien visible : ni navigation, ni bouton « Menu »
    if (m.nav.length) construireBurger(m);

    ui.utilisateur.textContent = "";
    if (d.aPersonnes) {
      var id = identite(d.moi), av = el("span", "ft-avatar", { "aria-hidden": "true" }), nom = el("span", "ft-user-nom");   // mode barre : pastille + nom visibles ; mode burger : nom masqué à l'écran mais lu par les lecteurs d'écran (voir la feuille)
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
    evaluer();   // bandeau rempli : barre complète ou burger (sans effet tant que le bandeau n'est pas dans la page)
  }

  function demarrer(essai) {
    lireTout().then(function (d) {
      donnees = d; erreurLecture = "";
      if (modePublic) {
        if (!d.moi) return;   // personne non reconnue (anonyme, absente, plusieurs lignes, table illisible) : rien n'est affiché
        appliquer(d);   // d'abord remplir, puis insérer : le bandeau n'apparaît jamais à moitié rempli
        if (!ui.host.isConnected) { document.body.insertBefore(ui.host, document.body.firstChild); evaluer(); }   // mesurable seulement une fois dans la page
        return;
      }
      appliquer(d);
    }, function (e) {
      if (essai + 1 < DELAIS.length) { setTimeout(function () { demarrer(essai + 1); }, DELAIS[essai + 1]); return; }
      erreurLecture = msg(e);
      if (modePublic) return;   // mode public : on abandonne en silence (ni message, ni console, ni bandeau)
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
