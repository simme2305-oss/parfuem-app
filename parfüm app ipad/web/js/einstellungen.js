/*
 * einstellungen.js – alle Einstellungen an einer Stelle.
 *
 * SCHEMA beschreibt jede Option (Typ, Titel, Standardwert). Daraus entstehen die Formulare in
 * einstellungen.html und preview.html. Gespeichert wird als flaches Objekt { "widget.stil": "auto", … }:
 *   - im Browser in localStorage (Galerie, Sprüh-Vorschau, PC-Vorschau)
 *   - in Scriptable in zustand.json (per Link scriptable:///run/DuftDesTages?action=einstellungen&daten=…)
 *
 * WICHTIG: Die Standardwerte stehen ein zweites Mal in scriptable/DuftDesTages.js (STANDARD_EINSTELLUNGEN),
 * weil Scriptable diese Datei nicht laden kann. Bei neuen Optionen beide Stellen pflegen.
 */
(function (global) {
  "use strict";

  const SPEICHER_SCHLUESSEL = "duft-einstellungen";

  const SCHEMA = [
    {
      gruppe: "widget", titel: "Widget", text: "Aussehen des Widgets auf dem Homescreen.",
      felder: [
        { key: "widget.stil", typ: "auswahl", titel: "Gestaltung", standard: "auto",
          optionen: [["auto", "Automatisch"], ["bild", "Bild vollflächig"], ["karte", "Bildkarte"], ["typo", "Nur Schrift"]],
          hilfe: "Automatisch: klein und groß mit Bild im Hintergrund, mittel und extragroß als Karte." },
        { key: "widget.farbschema", typ: "auswahl", titel: "Farbschema", standard: "system",
          optionen: [["system", "Wie iPad"], ["hell", "Hell"], ["dunkel", "Dunkel"]] },
        { key: "widget.schrift", typ: "auswahl", titel: "Schrift für Namen", standard: "didot",
          optionen: [["didot", "Didot"], ["bodoni", "Bodoni"], ["baskerville", "Baskerville"], ["cochin", "Cochin"], ["georgia", "Georgia"], ["avenir", "Avenir"]] },
        { key: "widget.textgroesse", typ: "regler", titel: "Textgröße", standard: 1, min: 0.8, max: 1.25, schritt: 0.05, format: "prozent" },
        { key: "widget.abdunkeln", typ: "regler", titel: "Abdunklung über dem Bild", standard: 0.9, min: 0.4, max: 1, schritt: 0.05, format: "prozent" },
        { key: "widget.titel", typ: "text", titel: "Überschrift", standard: "Duft des Tages", max: 28 },
        { key: "widget.zeigeMarke", typ: "schalter", titel: "Marke zeigen", standard: true },
        { key: "widget.zeigeNoten", typ: "schalter", titel: "Duftnoten zeigen", standard: true },
        { key: "widget.zeigeInfo", typ: "schalter", titel: "Begründung bzw. „zuletzt getragen“", standard: true },
        { key: "widget.zeigeDatum", typ: "schalter", titel: "Datum zeigen", standard: true },
        { key: "widget.zeigeBeschreibung", typ: "schalter", titel: "Beschreibung (extragroß)", standard: true },
        { key: "widget.zeigeVerlauf", typ: "schalter", titel: "Zuletzt getragen als Punkte (extragroß)", standard: true },
        { key: "widget.aktualisierung", typ: "auswahl", titel: "Neu laden", standard: "30",
          optionen: [["15", "15 Min."], ["30", "30 Min."], ["60", "1 Std."], ["180", "3 Std."]],
          hilfe: "Wunsch an iOS – das System entscheidet selbst, wann Widgets wirklich neu laden." },
      ],
    },
    {
      gruppe: "vorschlag", titel: "Vorschlag", text: "Wie der Duft des Tages ausgesucht wird.",
      felder: [
        { key: "vorschlag.modus", typ: "auswahl", titel: "Das Widget zeigt", standard: "manuell",
          optionen: [["manuell", "Meine Auswahl"], ["automatisch", "Täglichen Vorschlag"]] },
        { key: "vorschlag.ort", typ: "ort", titel: "Ort für das Wetter", standard: { name: "Berlin", lat: 52.52, lon: 13.41 } },
        { key: "vorschlag.festhalten", typ: "schalter", titel: "Nach dem Sprühen für den Tag festhalten", standard: true },
        { key: "vorschlag.gTemperatur", typ: "regler", titel: "Gewicht: Temperatur", standard: 1, min: 0, max: 2, schritt: 0.25, format: "gewicht" },
        { key: "vorschlag.gWetter", typ: "regler", titel: "Gewicht: Wetter (Sonne, Regen …)", standard: 1, min: 0, max: 2, schritt: 0.25, format: "gewicht" },
        { key: "vorschlag.gJahreszeit", typ: "regler", titel: "Gewicht: Jahreszeit", standard: 1, min: 0, max: 2, schritt: 0.25, format: "gewicht" },
        { key: "vorschlag.gAbwechslung", typ: "regler", titel: "Gewicht: Abwechslung", standard: 1, min: 0, max: 2, schritt: 0.25, format: "gewicht" },
        { key: "vorschlag.gAnlass", typ: "regler", titel: "Gewicht: Anlass & Wochentag", standard: 1, min: 0, max: 2, schritt: 0.25, format: "gewicht" },
        { key: "vorschlag.zufall", typ: "regler", titel: "Überraschung", standard: 1, min: 0, max: 3, schritt: 0.25, format: "gewicht" },
        { key: "vorschlag.ausgeschlossen", typ: "duefte", titel: "Nie vorschlagen", standard: [] },
      ],
    },
    {
      gruppe: "spray", titel: "Sprüh-Animation", text: "Was beim Antippen des Widgets passiert.",
      felder: [
        { key: "spray.animation", typ: "schalter", titel: "Animation abspielen", standard: true, hilfe: "Aus: das große Bild erscheint sofort." },
        { key: "spray.tempo", typ: "regler", titel: "Tempo", standard: 1, min: 0.5, max: 1.6, schritt: 0.1, format: "faktor" },
        { key: "spray.menge", typ: "regler", titel: "Nebelmenge", standard: 1, min: 0.3, max: 2, schritt: 0.1, format: "faktor" },
        { key: "spray.winkel", typ: "regler", titel: "Sprührichtung (nach oben)", standard: 30, min: 0, max: 75, schritt: 5, format: "grad" },
        { key: "spray.nebelfarbe", typ: "auswahl", titel: "Farbe des Nebels", standard: "akzent",
          optionen: [["akzent", "Duftfarbe"], ["weiss", "Weiß"], ["gold", "Gold"]] },
        { key: "spray.flakon", typ: "regler", titel: "Flakongröße", standard: 1, min: 0.7, max: 1.25, schritt: 0.05, format: "prozent" },
        { key: "spray.glitzer", typ: "schalter", titel: "Glitzer im Nebel", standard: true },
        { key: "spray.ton", typ: "schalter", titel: "Sprühgeräusch", standard: true, hilfe: "iOS spielt Töne meist erst nach dem ersten Antippen ab." },
        { key: "spray.kenBurns", typ: "schalter", titel: "Langsamer Zoom auf dem Bild", standard: true },
        { key: "spray.zeigeNoten", typ: "schalter", titel: "Duftnoten zeigen", standard: true },
        { key: "spray.zeigeBeschreibung", typ: "schalter", titel: "Beschreibung zeigen", standard: true },
        { key: "spray.zeigeGrund", typ: "schalter", titel: "Begründung des Vorschlags zeigen", standard: true },
      ],
    },
    {
      gruppe: "galerie", titel: "Galerie", text: "Darstellung der Sammlung in Safari bzw. als Web-App.",
      felder: [
        { key: "galerie.thema", typ: "auswahl", titel: "Farbschema", standard: "system",
          optionen: [["system", "Wie iPad"], ["hell", "Hell"], ["dunkel", "Dunkel"]] },
        { key: "galerie.sortierung", typ: "auswahl", titel: "Reihenfolge", standard: "sammlung",
          optionen: [["sammlung", "Wie in der Datei"], ["name", "Name"], ["marke", "Marke"], ["familie", "Duftfamilie"]] },
        { key: "galerie.kartengroesse", typ: "auswahl", titel: "Kartengröße", standard: "mittel",
          optionen: [["klein", "Klein"], ["mittel", "Mittel"], ["gross", "Groß"]] },
      ],
    },
  ];

  const FELDER = Object.fromEntries(SCHEMA.flatMap(g => g.felder.map(f => [f.key, f])));

  function standard() {
    return Object.fromEntries(Object.values(FELDER).map(f => [f.key, JSON.parse(JSON.stringify(f.standard))]));
  }

  // Nur bekannte Schlüssel mit gültigen Werten übernehmen
  function bereinigen(roh) {
    const werte = standard();
    if (!roh || typeof roh !== "object") return werte;
    for (const [k, v] of Object.entries(roh)) {
      const f = FELDER[k];
      if (!f) continue;
      if (f.typ === "schalter" && typeof v === "boolean") werte[k] = v;
      else if (f.typ === "regler" && typeof v === "number" && isFinite(v)) werte[k] = Math.min(f.max, Math.max(f.min, v));
      else if (f.typ === "auswahl" && f.optionen.some(o => o[0] === v)) werte[k] = v;
      else if (f.typ === "text" && typeof v === "string") werte[k] = v.slice(0, f.max || 60);
      else if (f.typ === "ort" && v && isFinite(v.lat) && isFinite(v.lon)) werte[k] = { name: String(v.name || "Ort"), lat: +v.lat, lon: +v.lon };
      else if (f.typ === "duefte" && Array.isArray(v)) werte[k] = v.filter(x => typeof x === "string");
    }
    return werte;
  }

  function ausUrl() {
    try {
      const e = new URLSearchParams(location.search).get("e");
      return e ? JSON.parse(e) : null;
    } catch (_) { return null; }
  }

  function gespeichert() {
    try { return JSON.parse(localStorage.getItem(SPEICHER_SCHLUESSEL) || "null"); } catch (_) { return null; }
  }

  // URL-Parameter ?e=… (aus Scriptable) hat Vorrang vor dem Browser-Speicher
  function laden() {
    return bereinigen({ ...(gespeichert() || {}), ...(ausUrl() || {}) });
  }

  function speichern(werte) {
    try { localStorage.setItem(SPEICHER_SCHLUESSEL, JSON.stringify(werte)); return true; } catch (_) { return false; }
  }

  function teil(werte, praefix) {
    return Object.fromEntries(Object.entries(werte).filter(([k]) => k.startsWith(praefix + ".")));
  }

  // Nur Abweichungen vom Standard – hält Links kurz
  function abweichungen(werte) {
    const s = standard();
    return Object.fromEntries(Object.entries(werte).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(s[k])));
  }

  function scriptableLink(werte, skriptName = "DuftDesTages") {
    return `scriptable:///run/${encodeURIComponent(skriptName)}?action=einstellungen&daten=${encodeURIComponent(JSON.stringify(werte))}`;
  }

  // ── Formular ───────────────────────────────────────────────
  const formatieren = (f, v) => {
    if (f.format === "prozent") return `${Math.round(v * 100)} %`;
    if (f.format === "grad") return `${v}°`;
    if (f.format === "faktor") return `× ${v.toFixed(1).replace(".", ",")}`;
    if (f.format === "gewicht") return v === 0 ? "aus" : `× ${v.toFixed(2).replace(/0$/, "").replace(".", ",")}`;
    return String(v);
  };

  function stilEinfuegen() {
    if (document.getElementById("eg-stil")) return;
    const s = document.createElement("style");
    s.id = "eg-stil";
    s.textContent = `
      .eg-gruppe { margin: 0 0 22px; }
      .eg-gruppe > h2 { margin: 0 0 4px; font: 400 1.5rem/1.2 var(--serif, Georgia, serif); }
      .eg-gruppe > p { margin: 0 0 12px; color: var(--leise); font-size: .88rem; }
      .eg-liste { border: 1px solid var(--linie); border-radius: 14px; background: var(--flaeche); overflow: hidden; }
      .eg-feld { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 16px; align-items: center; padding: 13px 16px; }
      .eg-feld + .eg-feld { border-top: 1px solid var(--linie); }
      .eg-feld.eg-breit { grid-template-columns: 1fr; }
      .eg-titel { font-size: .95rem; }
      .eg-hilfe { grid-column: 1 / -1; font-size: .78rem; color: var(--leise); margin-top: -2px; }
      .eg-segmente { display: inline-flex; flex-wrap: wrap; border: 1px solid var(--linie); border-radius: 10px; padding: 2px; gap: 2px; background: var(--bg); }
      .eg-segmente button { border: 0; background: none; color: inherit; font: inherit; font-size: .82rem; padding: 6px 11px; border-radius: 8px; cursor: pointer; }
      .eg-segmente button[aria-pressed="true"] { background: var(--text); color: var(--bg); }
      .eg-auswahl, .eg-text, .eg-ort input { font: inherit; font-size: .88rem; color: inherit; background: var(--bg); border: 1px solid var(--linie); border-radius: 10px; padding: 8px 10px; }
      .eg-text { width: min(240px, 50vw); }
      .eg-schalter { position: relative; width: 50px; height: 30px; flex: none; }
      .eg-schalter input { position: absolute; inset: 0; opacity: 0; margin: 0; cursor: pointer; z-index: 1; }
      .eg-schalter span { position: absolute; inset: 0; border-radius: 999px; background: var(--linie); transition: background .25s; }
      .eg-schalter span::after { content: ""; position: absolute; top: 3px; left: 3px; width: 24px; height: 24px; border-radius: 50%; background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.25); transition: transform .25s cubic-bezier(.3,.7,.2,1.2); }
      .eg-schalter input:checked + span { background: var(--akzent-ui, #34c759); }
      .eg-schalter input:checked + span::after { transform: translateX(20px); }
      .eg-schalter input:focus-visible + span { outline: 2px solid var(--text); outline-offset: 2px; }
      .eg-regler { display: flex; align-items: center; gap: 10px; }
      .eg-regler input { width: min(200px, 40vw); accent-color: var(--akzent-ui, var(--text)); }
      .eg-wert { min-width: 52px; text-align: right; font-variant-numeric: tabular-nums; font-size: .85rem; color: var(--leise); }
      .eg-ort { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
      .eg-ort input { width: min(200px, 46vw); }
      .eg-ort button, .eg-treffer button { font: inherit; font-size: .85rem; border: 1px solid var(--linie); background: var(--bg); color: inherit; border-radius: 10px; padding: 8px 12px; cursor: pointer; }
      .eg-ort-aktuell { font-size: .85rem; color: var(--leise); width: 100%; }
      .eg-treffer { display: flex; flex-wrap: wrap; gap: 6px; width: 100%; }
      .eg-chips { display: flex; flex-wrap: wrap; gap: 6px; }
      .eg-chips button { font: inherit; font-size: .8rem; border: 1px solid var(--linie); background: var(--bg); color: inherit; border-radius: 999px; padding: 6px 12px; cursor: pointer; display: inline-flex; gap: 7px; align-items: center; }
      .eg-chips button i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
      .eg-chips button[aria-pressed="true"] { text-decoration: line-through; opacity: .55; }
    `;
    document.head.append(s);
  }

  function formular(container, werte, { gruppen, duefte = [], onChange } = {}) {
    stilEinfuegen();
    const el = global.Duft ? global.Duft.el : null;
    if (!el) throw new Error("gemeinsam.js muss vor einstellungen.js geladen werden");
    const melden = () => onChange && onChange({ ...werte });
    const setze = (k, v) => { werte[k] = v; melden(); };

    function steuerung(f) {
      const v = werte[f.key];
      if (f.typ === "schalter") {
        const input = el("input", { type: "checkbox", "aria-label": f.titel });
        input.checked = !!v;
        input.addEventListener("change", () => setze(f.key, input.checked));
        return el("label", { class: "eg-schalter" }, input, el("span"));
      }
      if (f.typ === "regler") {
        const wert = el("span", { class: "eg-wert" }, formatieren(f, v));
        const input = el("input", { type: "range", min: f.min, max: f.max, step: f.schritt, value: v, "aria-label": f.titel });
        input.addEventListener("input", () => { const z = parseFloat(input.value); wert.textContent = formatieren(f, z); setze(f.key, z); });
        return el("div", { class: "eg-regler" }, input, wert);
      }
      if (f.typ === "auswahl") {
        if (f.optionen.length <= 4) {
          const box = el("div", { class: "eg-segmente", role: "group", "aria-label": f.titel });
          for (const [wert, name] of f.optionen) {
            box.append(el("button", { type: "button", "aria-pressed": String(wert === v), onclick: () => {
              box.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", "false"));
              box.querySelector(`[data-w="${wert}"]`).setAttribute("aria-pressed", "true");
              setze(f.key, wert);
            }, "data-w": wert }, name));
          }
          return box;
        }
        const select = el("select", { class: "eg-auswahl", "aria-label": f.titel }, ...f.optionen.map(([wert, name]) => el("option", { value: wert }, name)));
        select.value = v;
        select.addEventListener("change", () => setze(f.key, select.value));
        return select;
      }
      if (f.typ === "text") {
        const input = el("input", { class: "eg-text", type: "text", maxlength: f.max || 60, value: v, "aria-label": f.titel });
        input.addEventListener("input", () => setze(f.key, input.value));
        return input;
      }
      if (f.typ === "ort") {
        const aktuell = el("div", { class: "eg-ort-aktuell" }, `Aktuell: ${v.name} (${v.lat.toFixed(2)}, ${v.lon.toFixed(2)})`);
        const input = el("input", { type: "search", placeholder: "Stadt suchen …", "aria-label": "Stadt" });
        const treffer = el("div", { class: "eg-treffer" });
        const suchen = async () => {
          const name = input.value.trim();
          if (!name) return;
          treffer.replaceChildren(el("span", { class: "eg-hilfe" }, "Suche …"));
          try {
            const a = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=6&language=de&format=json`);
            const liste = (await a.json()).results || [];
            treffer.replaceChildren(...(liste.length ? liste.map(t => el("button", { type: "button", onclick: () => {
              const ort = { name: t.name, lat: Math.round(t.latitude * 100) / 100, lon: Math.round(t.longitude * 100) / 100 };
              aktuell.textContent = `Aktuell: ${ort.name} (${ort.lat.toFixed(2)}, ${ort.lon.toFixed(2)})`;
              treffer.replaceChildren();
              input.value = "";
              setze(f.key, ort);
            } }, [t.name, t.admin1, t.country_code].filter(Boolean).join(", "))) : [el("span", { class: "eg-hilfe" }, "Nichts gefunden.")]));
          } catch (e) {
            treffer.replaceChildren(el("span", { class: "eg-hilfe" }, "Ortssuche nicht erreichbar."));
          }
        };
        input.addEventListener("keydown", e => { if (e.key === "Enter") { e.preventDefault(); suchen(); } });
        return el("div", { class: "eg-ort" }, input, el("button", { type: "button", onclick: suchen }, "Suchen"), aktuell, treffer);
      }
      if (f.typ === "duefte") {
        const box = el("div", { class: "eg-chips" });
        if (!duefte.length) box.append(el("span", { class: "eg-hilfe" }, "Sammlung wird geladen …"));
        for (const d of duefte) {
          const knopf = el("button", { type: "button", "aria-pressed": String(v.includes(d.id)), onclick: () => {
            const liste = new Set(werte[f.key]);
            liste.has(d.id) ? liste.delete(d.id) : liste.add(d.id);
            knopf.setAttribute("aria-pressed", String(liste.has(d.id)));
            setze(f.key, [...liste]);
          } }, el("i", { style: `background:${d.farbe}` }), d.name);
          box.append(knopf);
        }
        return box;
      }
      return el("span", {}, "?");
    }

    function zeichnen() {
      container.replaceChildren(...SCHEMA.filter(g => !gruppen || gruppen.includes(g.gruppe)).map(g =>
        el("section", { class: "eg-gruppe", id: `gruppe-${g.gruppe}` },
          el("h2", {}, g.titel),
          g.text ? el("p", {}, g.text) : null,
          el("div", { class: "eg-liste" }, ...g.felder.map(f => {
            const breit = f.typ === "ort" || f.typ === "duefte";
            return el("div", { class: "eg-feld" + (breit ? " eg-breit" : "") },
              el("div", { class: "eg-titel" }, f.titel), steuerung(f), f.hilfe ? el("div", { class: "eg-hilfe" }, f.hilfe) : null);
          })))));
    }

    zeichnen();
    return {
      setzen(neu) { Object.assign(werte, neu); zeichnen(); },
      duefteSetzen(liste) { duefte = liste; zeichnen(); },
    };
  }

  global.DuftEinstellungen = { SCHEMA, FELDER, standard, bereinigen, laden, speichern, ausUrl, teil, abweichungen, scriptableLink, formular, formatieren };
})(window);
