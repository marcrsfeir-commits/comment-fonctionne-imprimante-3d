/* =====================================================
   Impression 3D — script.js
   1. Menu mobile
   2. Lien actif dans la navigation (scrollspy)
   3. Apparition des éléments au défilement
   4. Compteurs animés de la section héros
   5. Bouton « retour en haut »
   6. Atelier d'impression (simulateur + sélecteurs d'objet et de couleur)
   ===================================================== */

"use strict";

/* L'utilisateur préfère-t-il limiter les animations ? */
const mouvementReduit = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* Dans ce cas, on met aussi les vidéos décoratives en pause */
if (mouvementReduit) {
    document.querySelectorAll(".hero-video, .bande-video, .entete-video, .fond-video").forEach((v) => v.pause());
}

/* =====================================================
   1. Menu mobile
   ===================================================== */

const burger = document.querySelector(".menu-burger");
const navbar = document.querySelector(".navbar");

if (burger && navbar) {
    burger.addEventListener("click", () => {
        const ouvert = navbar.classList.toggle("nav-ouvert");
        burger.setAttribute("aria-expanded", String(ouvert));
        burger.setAttribute("aria-label", ouvert ? "Fermer le menu" : "Ouvrir le menu");
    });

    /* Le menu se referme dès qu'un lien est choisi */
    navbar.querySelectorAll(".nav-links a").forEach((lien) => {
        lien.addEventListener("click", () => {
            navbar.classList.remove("nav-ouvert");
            burger.setAttribute("aria-expanded", "false");
        });
    });
}

/* =====================================================
   2. Scrollspy : le lien de la section visible s'allume
   ===================================================== */

const liensNav = document.querySelectorAll('.nav-links a[href^="#"]');

if (liensNav.length > 0 && "IntersectionObserver" in window) {
    const sections = [...liensNav]
        .map((lien) => document.querySelector(lien.hash))
        .filter(Boolean);

    const espion = new IntersectionObserver((entrees) => {
        entrees.forEach((entree) => {
            if (entree.isIntersecting) {
                liensNav.forEach((lien) =>
                    lien.classList.toggle("actif", lien.hash === "#" + entree.target.id));
            }
        });
    }, { rootMargin: "-45% 0px -50% 0px" });

    sections.forEach((section) => espion.observe(section));
}

/* =====================================================
   3. Apparition douce des cartes au défilement
   ===================================================== */

const elementsAnimes = document.querySelectorAll(
    ".card, .media-frame, .diagramme, .table-wrap, .callout, .citation, " +
    ".liste-sources li, .simulateur-carte, .cadre-video"
);

if (!mouvementReduit && "IntersectionObserver" in window) {
    const observateur = new IntersectionObserver((entrees) => {
        entrees.forEach((entree) => {
            if (entree.isIntersecting) {
                entree.target.classList.add("visible");
                observateur.unobserve(entree.target);
            }
        });
    }, { threshold: 0.12 });

    elementsAnimes.forEach((el, i) => {
        el.classList.add("reveal");
        el.style.transitionDelay = (i % 3) * 70 + "ms";
        observateur.observe(el);
    });
}

/* =====================================================
   4. Compteurs animés (statistiques du héros)
   ===================================================== */

/* Écrit un nombre « à la française » : 0.1 devient 0,1 */
function formatFr(valeur, decimales) {
    return valeur.toFixed(decimales).replace(".", ",");
}

const compteurs = document.querySelectorAll("[data-cible]");

if (compteurs.length > 0) {
    const animeCompteur = (el) => {
        const cible = parseFloat(el.dataset.cible);
        const depart = parseFloat(el.dataset.depart || "0");
        const decimales = parseInt(el.dataset.decimales || "0", 10);
        const prefixe = el.dataset.prefixe || "";
        const suffixe = el.dataset.suffixe || "";

        if (mouvementReduit) {
            el.textContent = prefixe + formatFr(cible, decimales) + suffixe;
            return;
        }

        const duree = 1400;
        const debut = performance.now();

        const etape = (maintenant) => {
            const t = Math.min((maintenant - debut) / duree, 1);
            const progression = 1 - Math.pow(1 - t, 3);   /* départ rapide, arrivée douce */
            const valeur = depart + (cible - depart) * progression;
            el.textContent = prefixe + formatFr(valeur, decimales) + suffixe;
            if (t < 1) requestAnimationFrame(etape);
        };
        requestAnimationFrame(etape);
    };

    if ("IntersectionObserver" in window) {
        const obs = new IntersectionObserver((entrees) => {
            entrees.forEach((entree) => {
                if (entree.isIntersecting) {
                    animeCompteur(entree.target);
                    obs.unobserve(entree.target);
                }
            });
        }, { threshold: 0.6 });
        compteurs.forEach((c) => obs.observe(c));
    } else {
        compteurs.forEach(animeCompteur);
    }
}

/* =====================================================
   5. Bouton « retour en haut »
   ===================================================== */

const boutonHaut = document.getElementById("retour-haut");

if (boutonHaut) {
    window.addEventListener("scroll", () => {
        boutonHaut.hidden = window.scrollY < 600;
    }, { passive: true });

    boutonHaut.addEventListener("click", () => {
        window.scrollTo({ top: 0, behavior: mouvementReduit ? "auto" : "smooth" });
    });
}

/* =====================================================
   6. Atelier d'impression
   Le même code anime le simulateur du guide (un seul vase) ET
   l'atelier (où l'on choisit l'objet et la couleur). Les sélecteurs
   sont détectés automatiquement : absents sur le guide, présents
   dans l'atelier.
   ===================================================== */

const canvas = document.getElementById("canvas-impression");

if (canvas) {
    const ctx = canvas.getContext("2d");
    const curseur = document.getElementById("curseur-couches");
    const bouton = document.getElementById("btn-lecture");
    const texteBouton = document.getElementById("btn-lecture-texte");
    const iconePlay = document.getElementById("icone-play");
    const iconePause = document.getElementById("icone-pause");
    const affichage = document.getElementById("affichage-couches");

    /* Éléments propres à l'atelier (peuvent être absents) */
    const chipsObjet = document.querySelectorAll(".chip-objet");
    const chipsCouleur = document.querySelectorAll(".chip-couleur");
    const boutonNouvel = document.getElementById("btn-nouvel-objet");
    const faitEl = document.querySelector(".atelier-fait");

    const NB_COUCHES = 48;
    const VITESSE = 8;            /* couches imprimées par seconde */
    let progression = 0;          /* nombre de couches déposées */
    let enLecture = false;
    let derniereImage = null;
    let couleursCouches = [];     /* couleur figée de chaque couche au moment de son dépôt */

    let objetActif = 0;
    let couleurActive = null;     /* null = sarcelle par défaut (guide) */
    const finis = new Set();      /* objets terminés dans l'atelier */
    let bravoMontre = false;

    /* --- Silhouettes : largeur (fraction) selon la hauteur t [0..1] --- */
    function silVase(t) {
        const corps = 0.34 + 0.16 * Math.cos(t * Math.PI * 1.6);
        const col = t > 0.78 ? (t - 0.78) * 0.9 : 0;
        return Math.min(0.62, Math.max(0.18, corps + col));
    }
    function silTour(t) {
        return Math.max(0.12, 0.44 - 0.30 * t);            /* base large, sommet étroit */
    }
    function silChampignon(t) {
        if (t < 0.52) return 0.15;                         /* pied fin */
        const c = (t - 0.52) / 0.48;
        return Math.max(0.18, 0.58 * Math.cos(c * Math.PI * 0.5));   /* chapeau bombé */
    }
    function silToupie(t) {
        return Math.max(0.12, 0.44 * Math.sin(t * Math.PI));   /* étroit haut/bas, large au milieu */
    }

    const OBJETS = [
        { nom: "Vase",       silhouette: silVase,       fait: "Un vrai vase peut demander environ 6 heures d'impression." },
        { nom: "Tour",       silhouette: silTour,       fait: "Les plus grandes imprimantes 3D construisent des maisons en béton !" },
        { nom: "Champignon", silhouette: silChampignon, fait: "Le PLA, le plastique le plus courant, est fabriqué à partir de maïs." },
        { nom: "Toupie",     silhouette: silToupie,     fait: "Une couche mesure souvent 0,1 mm — plus fin qu'un cheveu !" },
    ];

    const ICONE_OK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>';

    /* --- Conversion couleur HEX -> HSL (pour garder la profondeur des couches) --- */
    function hexVersHsl(hex) {
        const r = parseInt(hex.slice(1, 3), 16) / 255;
        const g = parseInt(hex.slice(3, 5), 16) / 255;
        const b = parseInt(hex.slice(5, 7), 16) / 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        const l = (max + min) / 2;
        let h = 0, s = 0;
        const d = max - min;
        if (d !== 0) {
            s = d / (1 - Math.abs(2 * l - 1));
            if (max === r) h = ((g - b) / d) % 6;
            else if (max === g) h = (b - r) / d + 2;
            else h = (r - g) / d + 4;
            h *= 60;
            if (h < 0) h += 360;
        }
        return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
    }

    /* Couleur d'une couche déjà imprimée (plus claire vers le haut = profondeur).
       « coul » est la couleur figée de cette couche précise (null = sarcelle par défaut). */
    function couleurCouche(t, coul) {
        if (!coul) {
            return "hsl(174, " + Math.round(50 + t * 20) + "%, " + Math.round(32 + t * 16) + "%)";
        }
        const bas = Math.max(18, coul.l - 14);
        const haut = Math.min(90, coul.l + 8);
        const L = Math.round(bas + (haut - bas) * t);
        return "hsl(" + coul.h + ", " + coul.s + "%, " + L + "%)";
    }

    /* Couleur de la couche « chaude » en cours de dépôt */
    function couleurChaude() {
        if (!couleurActive) return "#ea580c";
        return "hsl(" + couleurActive.h + ", " + couleurActive.s + "%, " + Math.min(72, couleurActive.l + 16) + "%)";
    }

    /* Petit rectangle aux coins arrondis */
    function arrondi(x, y, l, h, r) {
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(x, y, l, h, r); }
        else { ctx.rect(x, y, l, h); }
    }

    function dessineBuse(x, y) {
        ctx.fillStyle = "#1e293b";
        arrondi(x - 9, y - 52, 18, 36, 4);
        ctx.fill();
        ctx.beginPath();                       /* pointe de la buse */
        ctx.moveTo(x - 7, y - 16);
        ctx.lineTo(x + 7, y - 16);
        ctx.lineTo(x, y - 4);
        ctx.closePath();
        ctx.fillStyle = couleurChaude();
        ctx.fill();
    }

    function dessiner() {
        const L = canvas.width;
        const H = canvas.height;
        const silhouette = OBJETS[objetActif].silhouette;
        ctx.clearRect(0, 0, L, H);

        /* Plateau d'impression */
        const plateauY = H - 58;
        ctx.fillStyle = "#475569";
        arrondi(L * 0.14, plateauY, L * 0.72, 10, 5);
        ctx.fill();
        ctx.fillStyle = "#64748b";
        ctx.font = "500 13px 'IBM Plex Mono', monospace";
        ctx.textAlign = "center";
        ctx.fillText("plateau d'impression", L / 2, plateauY + 34);

        const hauteurMax = plateauY - 70;
        const hCouche = hauteurMax / NB_COUCHES;

        /* Silhouette « fantôme » de l'objet à venir */
        for (let i = 0; i < NB_COUCHES; i++) {
            const t = i / (NB_COUCHES - 1);
            const l = silhouette(t) * L * 0.62;
            const y = plateauY - (i + 1) * hCouche;
            ctx.fillStyle = "rgba(148, 163, 184, 0.14)";
            arrondi((L - l) / 2, y, l, hCouche + 0.5, 2);
            ctx.fill();
        }

        /* Couches déjà imprimées — chacune garde la couleur active au moment du dépôt */
        const completes = Math.min(Math.floor(progression), NB_COUCHES);
        for (let i = 0; i < completes; i++) {
            if (couleursCouches[i] === undefined) couleursCouches[i] = couleurActive;
            const t = i / (NB_COUCHES - 1);
            const l = silhouette(t) * L * 0.62;
            const y = plateauY - (i + 1) * hCouche;
            ctx.fillStyle = couleurCouche(t, couleursCouches[i]);
            arrondi((L - l) / 2, y, l, hCouche + 0.5, 2);
            ctx.fill();
        }

        /* Couche « chaude » en cours de dépôt + buse qui avance */
        const fraction = progression - completes;
        if (completes < NB_COUCHES && (fraction > 0 || enLecture)) {
            couleursCouches[completes] = couleurActive;   /* fige la couleur de la couche en cours */
            const t = completes / (NB_COUCHES - 1);
            const l = silhouette(t) * L * 0.62;
            const y = plateauY - (completes + 1) * hCouche;
            const avance = Math.max(fraction, 0.05);
            ctx.fillStyle = couleurChaude();
            arrondi((L - l) / 2, y, l * avance, hCouche + 0.5, 2);
            ctx.fill();
            dessineBuse((L - l) / 2 + l * avance, y);
        }
    }

    function majInterface() {
        const n = Math.min(Math.floor(progression), NB_COUCHES);
        if (curseur) curseur.value = String(n);
        if (affichage) {
            affichage.textContent = n >= NB_COUCHES
                ? "Impression terminée — " + NB_COUCHES + " couches !"
                : "Couche " + n + " / " + NB_COUCHES;
        }
    }

    function majBouton(etat) {
        if (iconePlay) iconePlay.hidden = (etat === "pause");
        if (iconePause) iconePause.hidden = (etat !== "pause");
        if (texteBouton) {
            texteBouton.textContent =
                etat === "pause" ? "Pause" :
                etat === "fin" ? "Recommencer" : "Imprimer";
        }
    }

    /* Message ludique en fin d'impression (atelier seulement) */
    function terminer() {
        if (!faitEl) return;
        finis.add(objetActif);
        const texte = (finis.size >= 3 && !bravoMontre)
            ? (bravoMontre = true, "Bravo, tu fabriques comme un pro !")
            : "Bravo ! " + OBJETS[objetActif].fait;
        faitEl.innerHTML = ICONE_OK + "<span>" + texte + "</span>";
        faitEl.classList.add("visible");
    }

    function boucle(maintenant) {
        if (!enLecture) return;
        if (derniereImage === null) derniereImage = maintenant;
        const dt = (maintenant - derniereImage) / 1000;
        derniereImage = maintenant;
        progression = Math.min(progression + dt * VITESSE, NB_COUCHES);
        majInterface();
        dessiner();
        if (progression >= NB_COUCHES) {
            enLecture = false;
            derniereImage = null;
            majBouton("fin");
            terminer();
            return;
        }
        requestAnimationFrame(boucle);
    }

    function demarrer() {
        if (progression >= NB_COUCHES) { progression = 0; couleursCouches = []; }
        if (faitEl) faitEl.classList.remove("visible");
        if (mouvementReduit) {                 /* pas d'animation : résultat direct */
            progression = NB_COUCHES;
            majInterface();
            dessiner();
            majBouton("fin");
            terminer();
            return;
        }
        enLecture = true;
        majBouton("pause");
        requestAnimationFrame(boucle);
    }

    /* Prépare une nouvelle impression (objet changé) */
    function reinitialiser(lancer) {
        enLecture = false;
        derniereImage = null;
        progression = 0;
        couleursCouches = [];
        if (faitEl) faitEl.classList.remove("visible");
        majInterface();
        dessiner();
        majBouton("lecture");
        if (lancer) demarrer();
    }

    bouton.addEventListener("click", () => {
        if (enLecture) {                       /* pause */
            enLecture = false;
            derniereImage = null;
            majBouton("lecture");
            return;
        }
        demarrer();
    });

    curseur.addEventListener("input", () => {
        enLecture = false;
        derniereImage = null;
        if (faitEl) faitEl.classList.remove("visible");
        progression = parseInt(curseur.value, 10);
        majBouton(progression >= NB_COUCHES ? "fin" : "lecture");
        majInterface();
        dessiner();
    });

    /* --- Sélecteurs de l'atelier --- */
    chipsObjet.forEach((chip) => {
        chip.addEventListener("click", () => {
            objetActif = parseInt(chip.dataset.objet, 10) || 0;
            chipsObjet.forEach((c) => c.classList.toggle("actif", c === chip));
            reinitialiser(false);
        });
    });

    chipsCouleur.forEach((chip) => {
        chip.addEventListener("click", () => {
            couleurActive = chip.dataset.hex ? hexVersHsl(chip.dataset.hex) : null;
            chipsCouleur.forEach((c) => c.classList.toggle("actif", c === chip));
            dessiner();                        /* n'affecte que la couche en cours et les suivantes */
        });
    });

    if (boutonNouvel) {
        boutonNouvel.addEventListener("click", () => {
            objetActif = (objetActif + 1) % OBJETS.length;
            chipsObjet.forEach((c) =>
                c.classList.toggle("actif", parseInt(c.dataset.objet, 10) === objetActif));
            reinitialiser(true);
        });
    }

    /* --- Initialisation : reprend l'objet et la couleur actifs (atelier) --- */
    const chipObjActif = document.querySelector(".chip-objet.actif");
    if (chipObjActif) objetActif = parseInt(chipObjActif.dataset.objet, 10) || 0;
    const chipCoulActif = document.querySelector(".chip-couleur.actif");
    if (chipCoulActif && chipCoulActif.dataset.hex) couleurActive = hexVersHsl(chipCoulActif.dataset.hex);

    majInterface();
    dessiner();
}
