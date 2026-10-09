/*
 * gemeinsam.js – Bausteine für Galerie, Sprüh-Seite, Einstellungen und Bildstudio.
 * Stellt window.Duft bereit.
 */
(function (global) {
  "use strict";

  // waerme: −2 = kühl/frisch … +2 = warm/schwer (für den Vorschlag und die Bildstimmung)
  const FAMILIEN = {
    zitrisch:     { name: "Zitrisch",     farbe: "#E2B13C", waerme: -2 },
    frisch:       { name: "Frisch",       farbe: "#4F9FB2", waerme: -2 },
    aromatisch:   { name: "Aromatisch",   farbe: "#5E8C6A", waerme: -0.5 },
    floral:       { name: "Floral",       farbe: "#D48A9E", waerme: -1 },
    moschus:      { name: "Moschus",      farbe: "#BFAE98", waerme: 0 },
    holzig:       { name: "Holzig",       farbe: "#7A6652", waerme: 1 },
    orientalisch: { name: "Orientalisch", farbe: "#9A3F2F", waerme: 2 },
    gourmand:     { name: "Gourmand",     farbe: "#B07A4F", waerme: 2 },
  };

  const JAHRESZEITEN = { "frühling": "Frühling", sommer: "Sommer", herbst: "Herbst", winter: "Winter" };

  const KONZENTRATIONEN = {
    EDC: "Eau de Cologne", EDT: "Eau de Toilette", EDP: "Eau de Parfum",
    PARFUM: "Parfum", EXTRAIT: "Extrait de Parfum", ELIXIR: "Elixir",
  };

  function rgb(hex) {
    let h = String(hex || "").replace("#", "");
    if (h.length === 3) h = [...h].map(z => z + z).join("");
    const n = parseInt(h, 16);
    return isNaN(n) || h.length !== 6 ? [176, 141, 87] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }

  function hex([r, g, b]) {
    return "#" + [r, g, b].map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0")).join("");
  }

  function mischen(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return hex(A.map((v, i) => v + (B[i] - v) * t));
  }

  // relative Helligkeit 0…1
  function helligkeit(farbe) {
    const [r, g, b] = rgb(farbe).map(v => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  const familienName = f => (FAMILIEN[f] && FAMILIEN[f].name) || f || "";
  const jahreszeitName = j => JAHRESZEITEN[j] || j;

  async function duefteLaden(pfad = "data/duefte.json") {
    const antwort = await fetch(pfad, { cache: "no-cache" });
    if (!antwort.ok) throw new Error(`${pfad}: HTTP ${antwort.status}`);
    const daten = await antwort.json();
    if (!Array.isArray(daten)) throw new Error(`${pfad} ist keine Liste`);
    return daten;
  }

  // Kleiner DOM-Helfer: el("p", { class: "x", onclick: fn }, "Text", kind)
  function el(tag, attrs = {}, ...kinder) {
    const e = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === "class") e.className = v;
      else if (k === "style") e.style.cssText = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
      else e.setAttribute(k, v === true ? "" : v);
    }
    e.append(...kinder.flat().filter(k => k !== null && k !== undefined && k !== false));
    return e;
  }

  global.Duft = { FAMILIEN, JAHRESZEITEN, KONZENTRATIONEN, rgb, hex, mischen, helligkeit, familienName, jahreszeitName, duefteLaden, el };
})(window);
