// Variables used by Scriptable.
// These must be at the very top of the file. Do not edit.
// icon-color: deep-brown; icon-glyph: spray-can;

/*
 * Duft des Tages – Widget & Sprüh-Starter für Scriptable (iPad)
 *
 * Aufrufe
 *   Widget, Parameter leer        → deine Auswahl bzw. der Tagesvorschlag (je nach Einstellung)
 *   Widget, Parameter "auto"      → immer automatischer Vorschlag
 *   Widget, Parameter "<duft-id>" → dieser Duft fest
 *   scriptable:///run/DuftDesTages?action=spray[&id=…]              → Sprüh-Animation, als „heute getragen“ eintragen
 *   scriptable:///run/DuftDesTages?action=set&id=…                  → Duft des Tages setzen (aus der Galerie)
 *   scriptable:///run/DuftDesTages?action=vorschlag                 → Vorschlag berechnen und anzeigen
 *   scriptable:///run/DuftDesTages?action=einstellungen&daten=…     → Einstellungen übernehmen (aus einstellungen.html)
 *   in der App ohne Parameter                                       → Menü
 */

// ═════════════════════════════════════════════════════════════
//  Grundeinstellungen (alles andere: Menü › Einstellungen)
// ═════════════════════════════════════════════════════════════

// Adresse des Ordners web/ auf GitHub Pages – mit "/" am Ende.
const BASE_URL = "https://simme2305-oss.github.io/parfuem-app/web/";

// Ordner für Zustand und eigene Fotos (iCloud Drive › Scriptable) und Zwischenspeicher (lokal).
const DATEN_ORDNER = "DuftDesTages-Daten";

// Wie lange Zwischengespeichertes genutzt wird, bevor neu geladen wird (Minuten).
const CACHE_MINUTEN = { sammlung: 60, bild: 12 * 60, wetter: 30 };

// Richtwerte für Widget-Größen in Punkten (nach Apples Human Interface Guidelines).
// Schlüssel = längere Bildschirmseite des iPads. Scriptable kennt die echte Widget-Größe nicht –
// die Werte dienen nur dazu, Bilder passend zuzuschneiden.
const WIDGET_GROESSEN = {
  1366: { small: [170, 170], medium: [378.5, 170], large: [378.5, 378.5], extraLarge: [795, 378.5] }, // iPad Pro 12,9″ / 13″
  1194: { small: [155, 155], medium: [342, 155], large: [342, 342], extraLarge: [715.5, 342] },        // iPad Pro 11″, iPad Air
  1133: { small: [141, 141], medium: [305.5, 141], large: [305.5, 305.5], extraLarge: [634.5, 305.5] }, // iPad mini
  1080: { small: [146, 146], medium: [320.5, 146], large: [320.5, 320.5], extraLarge: [669, 320.5] },  // iPad 10,2″
};

// Standardwerte – müssen zu web/js/einstellungen.js passen (Scriptable kann die Datei nicht laden).
const STANDARD_EINSTELLUNGEN = {
  "widget.stil": "auto", "widget.farbschema": "system", "widget.schrift": "didot", "widget.textgroesse": 1,
  "widget.abdunkeln": 0.9, "widget.titel": "Duft des Tages", "widget.zeigeMarke": true, "widget.zeigeNoten": true,
  "widget.zeigeInfo": true, "widget.zeigeDatum": true, "widget.zeigeBeschreibung": true, "widget.zeigeVerlauf": true,
  "widget.aktualisierung": "30",
  "vorschlag.modus": "manuell", "vorschlag.ort": { name: "Berlin", lat: 52.52, lon: 13.41 }, "vorschlag.festhalten": true,
  "vorschlag.gTemperatur": 1, "vorschlag.gWetter": 1, "vorschlag.gJahreszeit": 1, "vorschlag.gAbwechslung": 1,
  "vorschlag.gAnlass": 1, "vorschlag.zufall": 1, "vorschlag.ausgeschlossen": [],
  "spray.animation": true, "spray.tempo": 1, "spray.menge": 1, "spray.winkel": 30, "spray.nebelfarbe": "akzent",
  "spray.flakon": 1, "spray.glitzer": true, "spray.ton": true, "spray.kenBurns": true, "spray.zeigeNoten": true,
  "spray.zeigeBeschreibung": true, "spray.zeigeGrund": true,
  "galerie.thema": "system", "galerie.sortierung": "sammlung", "galerie.kartengroesse": "mittel",
};

const SCHRIFTEN = {
  didot: ["Didot", "Didot-Italic"],
  bodoni: ["BodoniSvtyTwoITCTT-Book", "BodoniSvtyTwoITCTT-BookIta"],
  baskerville: ["Baskerville", "Baskerville-Italic"],
  cochin: ["Cochin", "Cochin-Italic"],
  georgia: ["Georgia", "Georgia-Italic"],
  avenir: ["AvenirNext-Regular", "AvenirNext-Italic"],
};

// waerme: −2 = kühl/frisch … +2 = warm/schwer
const FAMILIEN = {
  zitrisch:     { name: "Zitrisch",     lust: "etwas Zitrisches",       waerme: -2 },
  frisch:       { name: "Frisch",       lust: "etwas Frisches",         waerme: -2 },
  aromatisch:   { name: "Aromatisch",   lust: "etwas Aromatisches",     waerme: -0.5 },
  floral:       { name: "Floral",       lust: "etwas Blumiges",         waerme: -1 },
  moschus:      { name: "Moschus",      lust: "etwas Weiches, Sauberes", waerme: 0 },
  holzig:       { name: "Holzig",       lust: "etwas Holziges",         waerme: 1 },
  orientalisch: { name: "Orientalisch", lust: "etwas Warmes, Würziges", waerme: 2 },
  gourmand:     { name: "Gourmand",     lust: "etwas Süßes, Wärmendes", waerme: 2 },
};
const JAHRESZEITEN = { "frühling": "Frühling", sommer: "Sommer", herbst: "Herbst", winter: "Winter" };
const SAISON_STIMMUNG = { "frühling": "Frühlingshaft", sommer: "Sommerlich", herbst: "Herbstlich", winter: "Winterlich" };

// ═════════════════════════════════════════════════════════════
//  Speicher
// ═════════════════════════════════════════════════════════════

const HEUTE = datumsSchluessel(new Date());

// Zustand und Fotos in iCloud (synchronisiert); ohne iCloud lokal
const fmZustand = (() => {
  try {
    const fm = FileManager.iCloud();
    fm.documentsDirectory();
    return fm;
  } catch (_) {
    return FileManager.local();
  }
})();
const fmCache = FileManager.local();
const ZUSTAND_ORDNER = fmZustand.joinPath(fmZustand.documentsDirectory(), DATEN_ORDNER);
const ZUSTAND_DATEI = fmZustand.joinPath(ZUSTAND_ORDNER, "zustand.json");
const FOTO_ORDNER = fmZustand.joinPath(ZUSTAND_ORDNER, "fotos");
const CACHE_ORDNER = fmCache.joinPath(fmCache.cacheDirectory(), DATEN_ORDNER);

async function zustandLaden() {
  const leer = { aktuell: null, verlauf: [], einstellungen: {} };
  let z = leer;
  try {
    if (fmZustand.fileExists(ZUSTAND_DATEI)) {
      if (!fmZustand.isFileDownloaded(ZUSTAND_DATEI)) await fmZustand.downloadFileFromiCloud(ZUSTAND_DATEI);
      z = { ...leer, ...JSON.parse(fmZustand.readString(ZUSTAND_DATEI)) };
    }
  } catch (e) {
    console.warn(`Zustand nicht lesbar, starte leer: ${e}`);
  }
  // ältere Version: modus/ort lagen direkt im Zustand
  if (z.modus) { z.einstellungen = { ...z.einstellungen, "vorschlag.modus": z.modus }; delete z.modus; }
  if (z.ort) { z.einstellungen = { ...z.einstellungen, "vorschlag.ort": z.ort }; delete z.ort; }
  return z;
}

function zustandSpeichern(zustand) {
  if (!fmZustand.fileExists(ZUSTAND_ORDNER)) fmZustand.createDirectory(ZUSTAND_ORDNER, true);
  zustand.verlauf = (zustand.verlauf || []).slice(0, 120);
  fmZustand.writeString(ZUSTAND_DATEI, JSON.stringify(zustand, null, 2));
}

// Einstellungen mit Standardwerten auffüllen; nur bekannte Schlüssel mit passendem Typ
function einstellungen(zustand) {
  const e = { ...STANDARD_EINSTELLUNGEN };
  for (const [k, v] of Object.entries((zustand && zustand.einstellungen) || {})) {
    if (!(k in STANDARD_EINSTELLUNGEN) || v === null || v === undefined) continue;
    const s = STANDARD_EINSTELLUNGEN[k];
    if (Array.isArray(s) ? Array.isArray(v) : typeof v === typeof s) e[k] = v;
  }
  return e;
}

function cachePfad(name) {
  if (!fmCache.fileExists(CACHE_ORDNER)) fmCache.createDirectory(CACHE_ORDNER, true);
  return fmCache.joinPath(CACHE_ORDNER, name);
}

function cacheFrisch(pfad, minuten) {
  if (!minuten || !fmCache.fileExists(pfad)) return false;
  const geaendert = fmCache.modificationDate(pfad);
  return !!geaendert && Date.now() - geaendert.getTime() < minuten * 60000;
}

// Lädt JSON aus dem Netz; ist es frisch im Zwischenspeicher oder das Netz weg, kommt es von dort.
async function jsonMitCache(adresse, name, minuten) {
  const pfad = cachePfad(name);
  if (cacheFrisch(pfad, minuten)) {
    try { return JSON.parse(fmCache.readString(pfad)); } catch (_) { /* neu laden */ }
  }
  try {
    const req = new Request(adresse);
    req.timeoutInterval = 12;
    const text = await req.loadString();
    const status = req.response && req.response.statusCode;
    if (status && status >= 400) throw new Error(`HTTP ${status} für ${adresse}`);
    const daten = JSON.parse(text);
    fmCache.writeString(pfad, text);
    return daten;
  } catch (e) {
    if (fmCache.fileExists(pfad)) {
      console.warn(`Nutze Zwischenspeicher für ${name} (${e})`);
      return JSON.parse(fmCache.readString(pfad));
    }
    throw e;
  }
}

function fotoPfad(id) {
  return fmZustand.joinPath(FOTO_ORDNER, `${id.replace(/[^a-z0-9-]/gi, "_")}.png`);
}

async function eigenesFoto(id) {
  const pfad = fotoPfad(id);
  try {
    if (!fmZustand.fileExists(pfad)) return null;
    if (!fmZustand.isFileDownloaded(pfad)) await fmZustand.downloadFileFromiCloud(pfad);
    return fmZustand.readImage(pfad);
  } catch (e) {
    console.warn(`Eigenes Foto für ${id} nicht lesbar: ${e}`);
    return null;
  }
}

// Bild eines Dufts: eigenes Foto (iCloud) vor Bild aus dem Repo
async function bildLaden(duft) {
  const foto = await eigenesFoto(duft.id);
  if (foto) return foto;
  if (!duft.bild) return null;
  const pfad = cachePfad(`bild-${duft.id.replace(/[^a-z0-9-]/gi, "_")}.png`);
  if (cacheFrisch(pfad, CACHE_MINUTEN.bild)) {
    try { return fmCache.readImage(pfad); } catch (_) { /* neu laden */ }
  }
  try {
    const relativ = /%[0-9a-f]{2}/i.test(duft.bild) ? duft.bild : encodeURI(duft.bild);
    const req = new Request(url(relativ));
    req.timeoutInterval = 15;
    const bild = await req.loadImage();
    fmCache.writeImage(pfad, bild);
    return bild;
  } catch (e) {
    console.warn(`Bild für ${duft.id} nicht ladbar: ${e}`);
    return fmCache.fileExists(pfad) ? fmCache.readImage(pfad) : null;
  }
}

function url(pfad) {
  if (/^https?:\/\//.test(pfad)) return pfad;
  return BASE_URL.replace(/\/?$/, "/") + pfad.replace(/^\.?\//, "");
}

function sprayLink(id) {
  return `scriptable:///run/${encodeURIComponent(Script.name())}?action=spray&id=${encodeURIComponent(id)}`;
}

function queryAus(adresse) {
  const q = {}, i = adresse.indexOf("?");
  if (i < 0) return q;
  for (const teil of adresse.slice(i + 1).split("&")) {
    const [k, v = ""] = teil.split("=");
    try { q[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " ")); } catch (_) { /* kaputter Parameter */ }
  }
  return q;
}

// ═════════════════════════════════════════════════════════════
//  Daten, Wetter, Vorschlag
// ═════════════════════════════════════════════════════════════

async function kontextLaden() {
  const [duefte, zustand] = await Promise.all([sammlungLaden(), zustandLaden()]);
  return { duefte, zustand, E: einstellungen(zustand) };
}

async function sammlungLaden() {
  // In der App immer frisch versuchen, im Widget den Zwischenspeicher nutzen
  const minuten = config.runsInWidget ? CACHE_MINUTEN.sammlung : 0;
  const daten = await jsonMitCache(url("data/duefte.json"), "duefte.json", minuten);
  if (!Array.isArray(daten) || !daten.length) throw new Error("duefte.json ist leer oder hat ein falsches Format.");
  return daten;
}

async function wetterLaden(ort) {
  const lat = Number(ort.lat), lon = Number(ort.lon);
  const adresse = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    "&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=1";
  const d = await jsonMitCache(adresse, `wetter-${lat.toFixed(2)}_${lon.toFixed(2)}.json`, CACHE_MINUTEN.wetter);
  return {
    temp: d.current.temperature_2m, code: d.current.weather_code, tag: d.current.is_day === 1,
    max: d.daily.temperature_2m_max[0], min: d.daily.temperature_2m_min[0],
  };
}

async function wetterSicher(E) {
  try { return await wetterLaden(E["vorschlag.ort"]); }
  catch (e) { console.warn(`Kein Wetter verfügbar: ${e}`); return null; }
}

// WMO-Wettercodes → kurzer Text
function wetterText(code, tag) {
  if (code === 0) return tag ? "sonnig" : "klar";
  if (code <= 2) return tag ? "heiter" : "leicht bewölkt";
  if (code === 3) return "bewölkt";
  if (code === 45 || code === 48) return "neblig";
  if (code >= 51 && code <= 57) return "Nieselregen";
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return "Regen";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "Schnee";
  if (code >= 95) return "Gewitter";
  return "wechselhaft";
}

// Punktesystem: Temperatur, Wetter, Jahreszeit, Abwechslung, Wochentag – jeweils mit Gewicht aus den Einstellungen
function vorschlagBerechnen(duefte, zustand, E, wetter, jetzt = new Date()) {
  const saison = jahreszeit(jetzt);
  const heute = datumsSchluessel(jetzt);
  const wochenende = jetzt.getDay() === 0 || jetzt.getDay() === 6;
  const nass = !!wetter && /Regen|Schnee|Gewitter|neblig/.test(wetterText(wetter.code, true));
  const sonnig = !!wetter && wetter.code <= 1 && wetter.tag;
  const ausgeschlossen = new Set(E["vorschlag.ausgeschlossen"] || []);
  const kandidaten = duefte.filter(d => !ausgeschlossen.has(d.id));

  const rangliste = (kandidaten.length ? kandidaten : duefte).map(duft => {
    let temperatur = 0, wetterPunkte = 0, saisonPunkte = 0, abwechslung = 0, anlassPunkte = 0;
    const waerme = (FAMILIEN[duft.duftfamilie] || {}).waerme || 0;

    if (wetter && duft.temperaturbereich) {
      const { min, max } = duft.temperaturbereich, t = wetter.temp;
      temperatur = t >= min && t <= max ? 3 : -Math.min(4, (t < min ? min - t : t - max) / 3);
    }
    if (sonnig && wetter.temp >= 18) wetterPunkte += Math.max(0, -waerme) / 2;
    if (nass || (wetter && wetter.temp < 8)) wetterPunkte += Math.max(0, waerme) / 2;
    if ((duft.jahreszeiten || []).includes(saison)) saisonPunkte = 2;

    const tage = tageSeitGetragen(zustand, duft.id, heute);
    if (tage === null) abwechslung = 1.5;
    else if (tage >= 14) abwechslung = 2;
    else if (tage >= 7) abwechslung = 1;
    else if (tage <= 1) abwechslung = -2;

    const anlass = (duft.anlass || []).map(a => a.toLowerCase());
    if (!wochenende && anlass.some(a => a === "büro" || a === "alltag")) anlassPunkte = 0.5;
    if (wochenende && anlass.some(a => ["freizeit", "ausgehen", "date", "brunch", "urlaub", "party"].includes(a))) anlassPunkte = 0.5;

    const punkte = temperatur * E["vorschlag.gTemperatur"] + wetterPunkte * E["vorschlag.gWetter"] +
      saisonPunkte * E["vorschlag.gJahreszeit"] + abwechslung * E["vorschlag.gAbwechslung"] +
      anlassPunkte * E["vorschlag.gAnlass"] + pseudoZufall(heute + duft.id) * 0.4 * E["vorschlag.zufall"];
    return { duft, punkte, tage };
  }).sort((a, b) => b.punkte - a.punkte);

  const beste = rangliste[0];
  const lust = (FAMILIEN[beste.duft.duftfamilie] || {}).lust || "etwas Passendes";
  const begruendung = wetter
    ? `${Math.round(wetter.temp)} °C und ${wetterText(wetter.code, wetter.tag)}: ${lust}`
    : `${SAISON_STIMMUNG[saison]}: ${lust}`;
  const zusatz = beste.tage === null ? "Noch nie getragen" : beste.tage >= 7 ? `Seit ${beste.tage} Tagen nicht getragen` : null;
  return { duft: beste.duft, begruendung, zusatz, rangliste };
}

// Welcher Duft wird angezeigt? Liefert { duft, quelle, text, zusatz }.
async function anzeigeBestimmen({ duefte, zustand, E }, parameter) {
  const p = String(parameter || "").trim();
  const finde = id => duefte.find(d => d.id === id);

  if (p && p.toLowerCase() !== "auto") {
    const fest = finde(p);
    if (fest) return { duft: fest, quelle: "fest", text: getragenText(zustand, fest.id) };
    console.warn(`Widget-Parameter "${p}" ist keine bekannte Duft-id – nutze den Standard.`);
  }
  const automatisch = p.toLowerCase() === "auto" || E["vorschlag.modus"] === "automatisch";
  if (!automatisch) {
    const gewaehlt = finde(zustand.aktuell);
    if (gewaehlt) return { duft: gewaehlt, quelle: "manuell", text: getragenText(zustand, gewaehlt.id) };
  }
  if (E["vorschlag.festhalten"]) {
    const heute = (zustand.verlauf || []).find(v => v.datum === HEUTE && finde(v.id));
    if (heute) return { duft: finde(heute.id), quelle: "getragen", text: "Heute getragen" };
  }
  const v = vorschlagBerechnen(duefte, zustand, E, await wetterSicher(E));
  return { duft: v.duft, quelle: "vorschlag", text: v.begruendung, zusatz: v.zusatz };
}

function getragenEintragen(zustand, id) {
  zustand.verlauf = [{ id, datum: HEUTE }, ...(zustand.verlauf || []).filter(v => !(v.id === id && v.datum === HEUTE))];
  if (!zustand.aktuell) zustand.aktuell = id;
}

function getragenText(zustand, id) {
  const tage = tageSeitGetragen(zustand, id, HEUTE);
  if (tage === null) return "Noch nicht getragen";
  if (tage === 0) return "Heute getragen";
  if (tage === 1) return "Gestern getragen";
  return `Vor ${tage} Tagen getragen`;
}

// ═════════════════════════════════════════════════════════════
//  Widget
// ═════════════════════════════════════════════════════════════

// Werden pro Widget aus den Einstellungen gesetzt
let FARBSCHEMA = "system", TEXTSKALA = 1, SCHRIFT = SCHRIFTEN.didot;

async function widgetModus() {
  const kontext = await kontextLaden();
  const auswahl = await anzeigeBestimmen(kontext, args.widgetParameter);
  Script.setWidget(await widgetBauen(config.widgetFamily || "medium", auswahl, kontext));
}

async function widgetBauen(familie, auswahl, kontext) {
  const { E } = kontext;
  FARBSCHEMA = E["widget.farbschema"];
  TEXTSKALA = E["widget.textgroesse"];
  SCHRIFT = SCHRIFTEN[E["widget.schrift"]] || SCHRIFTEN.didot;

  const duft = auswahl.duft;
  const w = { familie, auswahl, duft, E, kontext, pal: palette(duft.farbe), groesse: widgetGroesse(familie), fokus: duft.bildFokus || { x: 0.5, y: 0.45 } };
  let widget;
  if (familie.startsWith("accessory")) {
    widget = sperrbildschirmWidget(w);
  } else {
    let stil = E["widget.stil"];
    if (stil === "auto") stil = familie === "small" || familie === "large" ? "bild" : "karte";
    w.bild = stil === "typo" ? null : await bildLaden(duft);
    if (stil !== "typo" && !w.bild) stil = "typo";   // ohne Bild bleibt nur Schrift
    const bauplan = { bild: BILD_WIDGETS, karte: KARTEN_WIDGETS, typo: TYPO_WIDGETS }[stil] || BILD_WIDGETS;
    widget = (bauplan[familie] || bauplan.medium)(w);
  }
  widget.url = sprayLink(duft.id);
  const minuten = auswahl.quelle === "vorschlag" ? Math.min(30, Number(E["widget.aktualisierung"])) : Number(E["widget.aktualisierung"]);
  widget.refreshAfterDate = new Date(Date.now() + minuten * 60000);
  return widget;
}

// ── Stil „Bild vollflächig“ ─────────────────────────────────
const BILD_WIDGETS = {
  small(w) {
    const [b, h] = w.groesse;
    const widget = neuesWidget(null, vollbildVertikal(w, b, h, 0.3));
    widget.setPadding(14, 14, 13, 12);
    kopfzeile(widget, w, Color.white(), false, 0.82);
    widget.addSpacer();
    text(widget, w.duft.name, { schrift: titel(21), farbe: Color.white(), zeilen: 2, min: 0.6, schatten: true });
    if (w.E["widget.zeigeMarke"]) {
      widget.addSpacer(3);
      text(widget, sperren(w.duft.marke), { schrift: label(7), farbe: Color.white(), deckkraft: 0.75, zeilen: 1, min: 0.7 });
    }
    return widget;
  },
  medium(w) {
    const [b, h] = w.groesse, rand = 14;
    const widget = neuesWidget(null, vollbildSeitlich(w, b, h));
    widget.setPadding(rand, rand + 2, rand, rand);
    const zeile = widget.addStack();
    zeile.layoutHorizontally();
    const spalte = zeile.addStack();
    spalte.layoutVertically();
    spalte.size = new Size(Math.round(b * 0.54), Math.round(h - 2 * rand));
    kopfzeile(spalte, w, Color.white(), false, 0.82);
    spalte.addSpacer();
    if (w.E["widget.zeigeMarke"]) {
      text(spalte, sperren(w.duft.marke), { schrift: label(7.5), farbe: Color.white(), deckkraft: 0.7, zeilen: 1, min: 0.7 });
      spalte.addSpacer(3);
    }
    text(spalte, w.duft.name, { schrift: titel(23), farbe: Color.white(), zeilen: 2, min: 0.6, schatten: true });
    if (w.E["widget.zeigeNoten"]) {
      spalte.addSpacer(5);
      text(spalte, notenAuszug(w.duft), { schrift: Font.systemFont(groesse(9.5)), farbe: Color.white(), deckkraft: 0.75, zeilen: 1, min: 0.8 });
    }
    if (w.E["widget.zeigeInfo"]) {
      spalte.addSpacer(3);
      text(spalte, w.auswahl.text, { schrift: kursiv(11.5), farbe: Color.white(), deckkraft: 0.9, zeilen: 1, min: 0.75 });
    }
    zeile.addSpacer();
    return widget;
  },
  large(w) {
    const [b, h] = w.groesse;
    const widget = neuesWidget(null, vollbildVertikal(w, b, h, 0.2));
    widget.setPadding(20, 20, 20, 20);
    kopfzeile(widget, w, Color.white(), true, 0.85);
    widget.addSpacer();
    if (w.E["widget.zeigeMarke"]) {
      text(widget, sperren(w.duft.marke), { schrift: label(8), farbe: Color.white(), deckkraft: 0.75, zeilen: 1 });
      widget.addSpacer(4);
    }
    text(widget, w.duft.name, { schrift: titel(34), farbe: Color.white(), zeilen: 2, min: 0.55, schatten: true });
    if (w.E["widget.zeigeNoten"]) {
      widget.addSpacer(12);
      linie(widget, 28, new Color("#ffffff", 0.5));
      widget.addSpacer(12);
      notenTabelle(widget, w.duft, { labelFarbe: new Color("#ffffff", 0.6), textFarbe: Color.white(), groesse: 11.5, breite: 44, abstand: 5, max: 3 });
    }
    if (w.E["widget.zeigeInfo"]) {
      widget.addSpacer(12);
      text(widget, w.auswahl.text, { schrift: kursiv(13), farbe: Color.white(), deckkraft: 0.9, zeilen: 2, min: 0.8 });
    }
    return widget;
  },
  extraLarge(w) {
    const [b, h] = w.groesse, rand = 20;
    const widget = neuesWidget(null, vollbildSeitlich(w, b, h));
    widget.setPadding(rand, rand + 4, rand, rand);
    const zeile = widget.addStack();
    zeile.layoutHorizontally();
    const spalte = zeile.addStack();
    spalte.layoutVertically();
    spalte.size = new Size(Math.round(b * 0.5), Math.round(h - 2 * rand));
    kopfzeile(spalte, w, Color.white(), true, 0.85);
    spalte.addSpacer(14);
    if (w.E["widget.zeigeMarke"]) {
      text(spalte, sperren(w.duft.marke), { schrift: label(8.5), farbe: Color.white(), deckkraft: 0.72, zeilen: 1 });
      spalte.addSpacer(4);
    }
    text(spalte, w.duft.name, { schrift: titel(40), farbe: Color.white(), zeilen: 2, min: 0.55, schatten: true });
    spalte.addSpacer(6);
    familienZeile(spalte, w, Color.white(), 0.75, 11);
    if (w.E["widget.zeigeBeschreibung"] && w.duft.beschreibung) {
      spalte.addSpacer(12);
      text(spalte, w.duft.beschreibung, { schrift: kursiv(13), farbe: Color.white(), deckkraft: 0.78, zeilen: 3, min: 0.85 });
    }
    spalte.addSpacer();
    if (w.E["widget.zeigeNoten"]) notenTabelle(spalte, w.duft, { labelFarbe: new Color("#ffffff", 0.6), textFarbe: Color.white(), groesse: 12.5, breite: 50, abstand: 5, max: 3 });
    fusszeile(spalte, w, Color.white(), new Color("#ffffff", 0.7));
    zeile.addSpacer();
    return widget;
  },
};

// ── Stil „Bildkarte“ ────────────────────────────────────────
const KARTEN_WIDGETS = {
  small(w) {
    const [b, h] = w.groesse, rand = 12;
    const widget = neuesWidget(flaechenVerlauf(w.pal));
    widget.setPadding(rand, rand, rand, rand);
    const bb = Math.round(b - 2 * rand), bh = Math.round((h - 2 * rand) * 0.58);
    bildKarte(widget, w, bb, bh, 9);
    widget.addSpacer(7);
    text(widget, w.duft.name, { schrift: titel(16), farbe: w.pal.tinte, zeilen: 1, min: 0.6 });
    if (w.E["widget.zeigeMarke"]) text(widget, w.duft.marke, { schrift: kursiv(10.5), farbe: w.pal.leise, zeilen: 1, min: 0.8 });
    return widget;
  },
  medium(w) {
    const [b, h] = w.groesse, rand = 12;
    const widget = neuesWidget(flaechenVerlauf(w.pal));
    widget.setPadding(rand, rand, rand, rand + 4);
    const zeile = widget.addStack();
    zeile.layoutHorizontally();
    zeile.centerAlignContent();
    const bh = Math.round(h - 2 * rand), bb = Math.round(bh * 0.78);
    bildKarte(zeile, w, bb, bh, 10);
    zeile.addSpacer(16);
    const spalte = zeile.addStack();
    spalte.layoutVertically();
    spalte.size = new Size(0, bh);
    spalte.addSpacer(2);
    kopfzeile(spalte, w, w.pal.akzentText, false);
    spalte.addSpacer(6);
    text(spalte, w.duft.name, { schrift: titel(22), farbe: w.pal.tinte, zeilen: 2, min: 0.6 });
    if (w.E["widget.zeigeMarke"]) {
      spalte.addSpacer(1);
      text(spalte, w.duft.marke, { schrift: kursiv(11.5), farbe: w.pal.leise, zeilen: 1 });
    }
    spalte.addSpacer();
    if (w.E["widget.zeigeNoten"]) {
      text(spalte, notenAuszug(w.duft), { schrift: Font.systemFont(groesse(9.5)), farbe: w.pal.leise, zeilen: 1, min: 0.8 });
      spalte.addSpacer(3);
    }
    if (w.E["widget.zeigeInfo"]) text(spalte, w.auswahl.text, { schrift: kursiv(11.5), farbe: w.pal.akzentText, zeilen: 2, min: 0.8 });
    zeile.addSpacer();
    return widget;
  },
  large(w) {
    const [b, h] = w.groesse, rand = 16;
    const widget = neuesWidget(flaechenVerlauf(w.pal));
    widget.setPadding(rand, rand, rand, rand);
    const bb = Math.round(b - 2 * rand), bh = Math.round((h - 2 * rand) * 0.5);
    bildKarte(widget, w, bb, bh, 12);
    widget.addSpacer(12);
    const kopf = widget.addStack();
    kopf.layoutHorizontally();
    kopf.bottomAlignContent();
    const links = kopf.addStack();
    links.layoutVertically();
    if (w.E["widget.zeigeMarke"]) text(links, sperren(w.duft.marke), { schrift: label(7.5), farbe: w.pal.leise, zeilen: 1 });
    text(links, w.duft.name, { schrift: titel(26), farbe: w.pal.tinte, zeilen: 1, min: 0.6 });
    kopf.addSpacer();
    if (w.E["widget.zeigeDatum"]) text(kopf, datumKurz(), { schrift: Font.systemFont(groesse(9)), farbe: w.pal.leise });
    if (w.E["widget.zeigeNoten"]) {
      widget.addSpacer(8);
      notenTabelle(widget, w.duft, { labelFarbe: w.pal.akzentText, textFarbe: w.pal.tinte, groesse: 10.5, breite: 40, abstand: 3, max: 3 });
    }
    widget.addSpacer();
    if (w.E["widget.zeigeInfo"]) text(widget, w.auswahl.text, { schrift: kursiv(12), farbe: w.pal.akzentText, zeilen: 1, min: 0.75 });
    return widget;
  },
  extraLarge(w) {
    const [b, h] = w.groesse, rand = 16;
    const widget = neuesWidget(flaechenVerlauf(w.pal));
    widget.setPadding(rand, rand, rand, rand + 8);
    const zeile = widget.addStack();
    zeile.layoutHorizontally();
    zeile.centerAlignContent();
    const bh = Math.round(h - 2 * rand), bb = Math.round(bh * 0.8);
    bildKarte(zeile, w, bb, bh, 14);
    zeile.addSpacer(28);
    const spalte = zeile.addStack();
    spalte.layoutVertically();
    spalte.size = new Size(0, bh);
    kopfzeile(spalte, w, w.pal.akzentText, true);
    spalte.addSpacer(16);
    if (w.E["widget.zeigeMarke"]) {
      text(spalte, sperren(w.duft.marke), { schrift: label(8.5), farbe: w.pal.leise, zeilen: 1 });
      spalte.addSpacer(4);
    }
    text(spalte, w.duft.name, { schrift: titel(40), farbe: w.pal.tinte, zeilen: 2, min: 0.55 });
    spalte.addSpacer(6);
    familienZeile(spalte, w, w.pal.leise, 1, 11);
    if (w.E["widget.zeigeBeschreibung"] && w.duft.beschreibung) {
      spalte.addSpacer(14);
      text(spalte, w.duft.beschreibung, { schrift: kursiv(13.5), farbe: w.pal.leise, zeilen: 3, min: 0.85 });
    }
    spalte.addSpacer();
    if (w.E["widget.zeigeNoten"]) notenTabelle(spalte, w.duft, { labelFarbe: w.pal.akzentText, textFarbe: w.pal.tinte, groesse: 13, breite: 52, abstand: 6 });
    fusszeile(spalte, w, w.pal.akzentText, w.pal.leise);
    return widget;
  },
};

// ── Stil „Nur Schrift“ ──────────────────────────────────────
const TYPO_WIDGETS = {
  small(w) {
    const widget = neuesWidget(flaechenVerlauf(w.pal, true));
    widget.setPadding(14, 14, 14, 12);
    kopfzeile(widget, w, w.pal.akzentText, false);
    widget.addSpacer();
    text(widget, w.duft.name, { schrift: titel(24), farbe: w.pal.tinte, zeilen: 3, min: 0.55 });
    widget.addSpacer(6);
    linie(widget, 22, new Color(w.pal.akzent));
    if (w.E["widget.zeigeMarke"]) {
      widget.addSpacer(6);
      text(widget, sperren(w.duft.marke), { schrift: label(7), farbe: w.pal.leise, zeilen: 1, min: 0.7 });
    }
    return widget;
  },
  medium(w) {
    const [b, h] = w.groesse, rand = 16;
    const widget = neuesWidget(flaechenVerlauf(w.pal, true));
    widget.setPadding(rand, rand + 2, rand, rand + 2);
    const zeile = widget.addStack();
    zeile.layoutHorizontally();
    const links = zeile.addStack();
    links.layoutVertically();
    links.size = new Size(Math.round(b * 0.4), Math.round(h - 2 * rand));
    kopfzeile(links, w, w.pal.akzentText, false);
    links.addSpacer();
    text(links, w.duft.name, { schrift: titel(25), farbe: w.pal.tinte, zeilen: 2, min: 0.55 });
    if (w.E["widget.zeigeMarke"]) text(links, w.duft.marke, { schrift: kursiv(12), farbe: w.pal.leise, zeilen: 1 });
    zeile.addSpacer(12);
    const rechts = zeile.addStack();
    rechts.layoutVertically();
    rechts.size = new Size(0, Math.round(h - 2 * rand));
    rechts.addSpacer();
    if (w.E["widget.zeigeNoten"]) notenTabelle(rechts, w.duft, { labelFarbe: w.pal.akzentText, textFarbe: w.pal.tinte, groesse: 10.5, breite: 34, abstand: 4, max: 2 });
    if (w.E["widget.zeigeInfo"]) {
      rechts.addSpacer(8);
      text(rechts, w.auswahl.text, { schrift: kursiv(11.5), farbe: w.pal.akzentText, zeilen: 2, min: 0.8 });
    }
    return widget;
  },
  large(w) {
    const widget = neuesWidget(flaechenVerlauf(w.pal, true));
    widget.setPadding(20, 20, 20, 20);
    kopfzeile(widget, w, w.pal.akzentText, true);
    widget.addSpacer();
    if (w.E["widget.zeigeMarke"]) {
      text(widget, sperren(w.duft.marke), { schrift: label(8), farbe: w.pal.leise, zeilen: 1 });
      widget.addSpacer(4);
    }
    text(widget, w.duft.name, { schrift: titel(38), farbe: w.pal.tinte, zeilen: 2, min: 0.55 });
    widget.addSpacer(6);
    familienZeile(widget, w, w.pal.leise, 1, 11);
    widget.addSpacer();
    if (w.E["widget.zeigeNoten"]) notenTabelle(widget, w.duft, { labelFarbe: w.pal.akzentText, textFarbe: w.pal.tinte, groesse: 12, breite: 46, abstand: 5, max: 3 });
    if (w.E["widget.zeigeInfo"]) {
      widget.addSpacer(12);
      text(widget, w.auswahl.text, { schrift: kursiv(13), farbe: w.pal.akzentText, zeilen: 2, min: 0.8 });
    }
    return widget;
  },
  extraLarge(w) {
    const [b, h] = w.groesse, rand = 22;
    const widget = neuesWidget(flaechenVerlauf(w.pal, true));
    widget.setPadding(rand, rand + 4, rand, rand + 4);
    const zeile = widget.addStack();
    zeile.layoutHorizontally();
    const links = zeile.addStack();
    links.layoutVertically();
    links.size = new Size(Math.round(b * 0.5), Math.round(h - 2 * rand));
    kopfzeile(links, w, w.pal.akzentText, true);
    links.addSpacer();
    if (w.E["widget.zeigeMarke"]) {
      text(links, sperren(w.duft.marke), { schrift: label(8.5), farbe: w.pal.leise, zeilen: 1 });
      links.addSpacer(4);
    }
    text(links, w.duft.name, { schrift: titel(46), farbe: w.pal.tinte, zeilen: 2, min: 0.5 });
    links.addSpacer(6);
    familienZeile(links, w, w.pal.leise, 1, 11);
    if (w.E["widget.zeigeBeschreibung"] && w.duft.beschreibung) {
      links.addSpacer(12);
      text(links, w.duft.beschreibung, { schrift: kursiv(13.5), farbe: w.pal.leise, zeilen: 3, min: 0.85 });
    }
    zeile.addSpacer(30);
    const rechts = zeile.addStack();
    rechts.layoutVertically();
    rechts.size = new Size(0, Math.round(h - 2 * rand));
    rechts.addSpacer();
    if (w.E["widget.zeigeNoten"]) notenTabelle(rechts, w.duft, { labelFarbe: w.pal.akzentText, textFarbe: w.pal.tinte, groesse: 13, breite: 52, abstand: 7, max: 3 });
    fusszeile(rechts, w, w.pal.akzentText, w.pal.leise);
    return widget;
  },
};

function sperrbildschirmWidget(w) {
  const widget = new ListWidget();
  if (w.familie === "accessoryInline") {
    text(widget, `✦ ${w.duft.name}`);
  } else if (w.familie === "accessoryCircular") {
    widget.addSpacer();
    const z = widget.addStack();
    z.addSpacer();
    text(z, initialen(w.duft.name), { schrift: titel(18) });
    z.addSpacer();
    widget.addSpacer();
  } else {
    if (w.E["widget.titel"]) text(widget, sperren(w.E["widget.titel"]), { schrift: label(8), deckkraft: 0.7 });
    text(widget, w.duft.name, { schrift: titel(17), zeilen: 1, min: 0.7 });
    text(widget, w.auswahl.text, { schrift: Font.systemFont(11), deckkraft: 0.8, zeilen: 1, min: 0.8 });
  }
  return widget;
}

function fehlerWidget(fehler) {
  const pal = palette("#B08D57");
  const widget = neuesWidget(flaechenVerlauf(pal));
  widget.setPadding(16, 16, 16, 16);
  text(widget, sperren("Duft des Tages"), { schrift: label(8), farbe: pal.akzentText });
  widget.addSpacer(6);
  text(widget, "Keine Daten", { schrift: titel(20), farbe: pal.tinte });
  widget.addSpacer(4);
  text(widget, "Internetverbindung und BASE_URL im Skript prüfen.", { schrift: Font.systemFont(10), farbe: pal.leise, zeilen: 3 });
  widget.addSpacer(4);
  text(widget, String((fehler && fehler.message) || fehler).slice(0, 140), { schrift: Font.systemFont(8), farbe: pal.leise, zeilen: 2 });
  return widget;
}

// ── Widget-Bausteine ────────────────────────────────────────

function neuesWidget(verlauf, hintergrundBild) {
  const widget = new ListWidget();
  if (verlauf) widget.backgroundGradient = verlauf;
  if (hintergrundBild) widget.backgroundImage = hintergrundBild;
  return widget;
}

function text(stack, inhalt, { schrift, farbe, deckkraft, zeilen, min, schatten } = {}) {
  const t = stack.addText(String(inhalt == null ? "" : inhalt));
  if (schrift) t.font = schrift;
  if (farbe) t.textColor = farbe;
  if (deckkraft !== undefined) t.textOpacity = deckkraft;
  if (zeilen) t.lineLimit = zeilen;
  if (min) t.minimumScaleFactor = min;
  if (schatten) {
    t.shadowColor = new Color("#000000", 0.35);
    t.shadowRadius = 6;
    t.shadowOffset = new Point(0, 1);
  }
  return t;
}

// Überschrift („Duft des Tages“) und optional Datum
function kopfzeile(stack, w, farbe, mitDatum, deckkraft = 1) {
  const titelText = w.E["widget.titel"];
  const datum = mitDatum && w.E["widget.zeigeDatum"];
  if (!titelText && !datum) return;
  const z = stack.addStack();
  z.layoutHorizontally();
  z.centerAlignContent();
  if (titelText) text(z, sperren(titelText), { schrift: label(w.familie === "small" ? 7.5 : 8), farbe, deckkraft });
  if (datum) {
    z.addSpacer();
    text(z, datumKurz(), { schrift: Font.systemFont(groesse(9)), farbe, deckkraft: deckkraft * 0.8 });
  }
}

// max = höchstens so viele Noten pro Stufe (lange Listen würden sonst mit „…“ gekürzt)
function notenTabelle(stack, duft, { labelFarbe, textFarbe, groesse: g, breite, abstand, max = 4 }) {
  const reihen = [["Kopf", duft.kopfnoten], ["Herz", duft.herznoten], ["Basis", duft.basisnoten]].map(([t, l]) => [t, (l || []).slice(0, max)]);
  reihen.forEach(([titelText, noten], i) => {
    const z = stack.addStack();
    z.layoutHorizontally();
    z.centerAlignContent();
    const l = z.addStack();
    l.layoutHorizontally();
    l.size = new Size(Math.round(breite * TEXTSKALA), 0);
    text(l, sperren(titelText), { schrift: label(g * 0.62), farbe: labelFarbe });
    l.addSpacer();
    text(z, (noten || []).join(" · "), { schrift: Font.systemFont(groesse(g)), farbe: textFarbe, zeilen: 1, min: 0.7 });
    if (i < reihen.length - 1) stack.addSpacer(abstand);
  });
}

function familienZeile(stack, w, farbe, deckkraft, g) {
  const duft = w.duft;
  const z = stack.addStack();
  z.layoutHorizontally();
  z.centerAlignContent();
  text(z, "●", { schrift: Font.systemFont(groesse(g * 0.8)), farbe: new Color(w.pal.akzentHell) });
  z.addSpacer(6);
  const teile = [(FAMILIEN[duft.duftfamilie] || {}).name || duft.duftfamilie];
  if (duft.jahreszeiten && duft.jahreszeiten.length) teile.push(duft.jahreszeiten.map(j => JAHRESZEITEN[j] || j).join(", "));
  if (duft.temperaturbereich) teile.push(`${duft.temperaturbereich.min}–${duft.temperaturbereich.max} °C`);
  text(z, teile.join("  ·  "), { schrift: Font.systemFont(groesse(g)), farbe, deckkraft, zeilen: 1, min: 0.8 });
}

// Unterste Zeile im extragroßen Widget: Begründung links, „zuletzt getragen“-Punkte rechts
function fusszeile(stack, w, infoFarbe, leiseFarbe) {
  const zeigeInfo = w.E["widget.zeigeInfo"], zeigeVerlauf = w.E["widget.zeigeVerlauf"];
  if (!zeigeInfo && !zeigeVerlauf) return;
  stack.addSpacer(14);
  linie(stack, 28, w.pal.linie);
  stack.addSpacer(12);
  const fuss = stack.addStack();
  fuss.layoutHorizontally();
  fuss.bottomAlignContent();
  if (zeigeInfo) {
    const links = fuss.addStack();
    links.layoutVertically();
    text(links, w.auswahl.text, { schrift: kursiv(14), farbe: infoFarbe, zeilen: 1, min: 0.75 });
    if (w.auswahl.zusatz) {
      links.addSpacer(3);
      text(links, w.auswahl.zusatz, { schrift: Font.systemFont(groesse(10)), farbe: leiseFarbe, zeilen: 1 });
    }
  }
  fuss.addSpacer();
  if (zeigeVerlauf) verlaufPunkte(fuss, w, leiseFarbe);
}

function verlaufPunkte(stack, w, farbe) {
  const { zustand, duefte } = w.kontext;
  const eintraege = (zustand.verlauf || []).slice(0, 7);
  const rechts = stack.addStack();
  rechts.layoutVertically();
  if (!eintraege.length) {
    text(rechts, "Tippen zum Sprühen", { schrift: Font.systemFont(groesse(10)), farbe });
    return;
  }
  text(rechts, sperren("Zuletzt"), { schrift: label(7), farbe });
  rechts.addSpacer(5);
  const reihe = rechts.addStack();
  reihe.layoutHorizontally();
  reihe.spacing = 5;
  for (const eintrag of eintraege.slice().reverse()) {
    const d = duefte.find(x => x.id === eintrag.id);
    const punkt = reihe.addStack();
    punkt.size = new Size(9, 9);
    punkt.cornerRadius = 4.5;
    punkt.backgroundColor = new Color(d ? palette(d.farbe).akzentHell : "#999999");
  }
}

function linie(stack, breite, farbe) {
  const l = stack.addStack();
  l.size = new Size(breite, 1);
  l.backgroundColor = farbe;
  l.addSpacer();
}

function bildKarte(stack, w, b, h, radius) {
  const img = stack.addImage(zugeschnitten(w.bild, b, h, w.fokus));
  img.imageSize = new Size(b, h);
  img.cornerRadius = radius;
  img.applyFillingContentMode();
  return img;
}

function flaechenVerlauf(pal, kraeftiger = false) {
  const g = new LinearGradient();
  g.colors = kraeftiger
    ? [dyn(pal.cremeTief, pal.nacht), dyn(mischen(pal.akzent, "#efe6d9", 0.62), pal.nachtTief)]
    : [dyn(pal.creme, pal.nacht), dyn(pal.cremeTief, pal.nachtTief)];
  g.locations = [0, 1];
  g.startPoint = new Point(0, 0);
  g.endPoint = new Point(1, 1);
  return g;
}

// ── Bildbearbeitung mit DrawContext ─────────────────────────

function zeichenflaeche(breite, hoehe) {
  const dc = new DrawContext();
  dc.size = new Size(Math.round(breite), Math.round(hoehe));
  dc.opaque = true;
  dc.respectScreenScale = false;
  return dc;
}

// Bild so zeichnen, dass es die Fläche füllt (wie object-fit: cover) – fokus bestimmt den Ausschnitt
function deckendZeichnen(dc, bild, x, y, breite, hoehe, fokus = { x: 0.5, y: 0.5 }) {
  const s = bild.size, f = Math.max(breite / s.width, hoehe / s.height);
  const bw = s.width * f, bh = s.height * f;
  dc.drawImageInRect(bild, new Rect(x + (breite - bw) * fokus.x, y + (hoehe - bh) * fokus.y, bw, bh));
}

// Zuschnitt in doppelter Auflösung – spart Speicher im Widget (Limit ca. 30 MB)
function zugeschnitten(bild, b, h, fokus) {
  const dc = zeichenflaeche(b * 2, h * 2);
  deckendZeichnen(dc, bild, 0, 0, b * 2, h * 2, fokus);
  return dc.getImage();
}

// Bild über die ganze Fläche, unten abgedunkelt (klein, groß)
function vollbildVertikal(w, b, h, verlaufAb) {
  const B = Math.round(b * 2), H = Math.round(h * 2), tief = w.pal.tief;
  const dc = zeichenflaeche(B, H);
  dc.setFillColor(new Color(tief));
  dc.fillRect(new Rect(0, 0, B, H));
  deckendZeichnen(dc, w.bild, 0, 0, B, H, w.fokus);
  verlaufStreifen(dc, tief, 0, H * 0.3, 0.38, 0, B);
  verlaufStreifen(dc, tief, H * verlaufAb, H, 0, w.E["widget.abdunkeln"], B);
  return dc.getImage();
}

// Bild rechts, links weich in die Akzentfarbe übergehend (mittel, extragroß)
function vollbildSeitlich(w, b, h) {
  const B = Math.round(b * 2), H = Math.round(h * 2), tief = w.pal.tief;
  const dc = zeichenflaeche(B, H);
  dc.setFillColor(new Color(tief));
  dc.fillRect(new Rect(0, 0, B, H));
  const x0 = Math.round(B * 0.42);
  dc.drawImageInRect(zugeschnitten(w.bild, (B - x0) / 2, H / 2, w.fokus), new Rect(x0, 0, B - x0, H));
  verlaufSpalten(dc, tief, x0, x0 + (B - x0) * 0.45, 1, 0, H);
  verlaufStreifen(dc, tief, H * 0.55, H, 0, w.E["widget.abdunkeln"] * 0.6, B);
  return dc.getImage();
}

// DrawContext kennt keine Verläufe → feine Streifen
function verlaufStreifen(dc, hex, y0, y1, a0, a1, breite, schritte = 96) {
  for (let i = 0; i < schritte; i++) {
    const t = (i + 0.5) / schritte, weich = t * t * (3 - 2 * t);
    const ya = Math.round(y0 + (y1 - y0) * i / schritte), yb = Math.round(y0 + (y1 - y0) * (i + 1) / schritte);
    dc.setFillColor(new Color(hex, a0 + (a1 - a0) * weich));
    dc.fillRect(new Rect(0, ya, breite, yb - ya));
  }
}

function verlaufSpalten(dc, hex, x0, x1, a0, a1, hoehe, schritte = 96) {
  for (let i = 0; i < schritte; i++) {
    const t = (i + 0.5) / schritte, weich = t * t * (3 - 2 * t);
    const xa = Math.round(x0 + (x1 - x0) * i / schritte), xb = Math.round(x0 + (x1 - x0) * (i + 1) / schritte);
    dc.setFillColor(new Color(hex, a0 + (a1 - a0) * weich));
    dc.fillRect(new Rect(xa, 0, xb - xa, hoehe));
  }
}

function widgetGroesse(familie) {
  let seite = 1194;
  try { const s = Device.screenSize(); seite = Math.max(s.width, s.height); } catch (_) { /* Standard */ }
  const schluessel = Object.keys(WIDGET_GROESSEN).map(Number)
    .reduce((a, b) => (Math.abs(b - seite) < Math.abs(a - seite) ? b : a));
  const tabelle = WIDGET_GROESSEN[schluessel];
  return tabelle[familie] || tabelle.medium;
}

// ── Farben & Schrift ────────────────────────────────────────

function palette(hex) {
  const a = /^#?[0-9a-f]{6}$/i.test(hex || "") ? "#" + hex.replace("#", "") : "#B08D57";
  // sehr dunkle Akzentfarben (z. B. Schwarz/Navy) für Text und Punkte etwas aufhellen
  const akzentHell = helligkeit(a) < 0.25 ? mischen(a, "#ffffff", 0.35) : a;
  return {
    akzent: a,
    akzentHell,
    tief: mischen(a, "#100c0a", 0.74),
    creme: mischen(a, "#fbf8f3", 0.9),
    cremeTief: mischen(a, "#f1e9dd", 0.76),
    nacht: mischen(a, "#16120f", 0.84),
    nachtTief: mischen(a, "#0c0a09", 0.72),
    tinte: dyn("#2b2420", "#f3ece3"),
    leise: dyn("#85786d", "#a99d92"),
    akzentText: dyn(mischen(akzentHell, "#2b2420", 0.35), mischen(akzentHell, "#ffffff", 0.35)),
    linie: dyn("#2b2420", "#f3ece3", 0.18),
  };
}

function rgb(hex) {
  const h = hex.replace("#", "");
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16));
}

function mischen(a, b, t) {
  const A = rgb(a), B = rgb(b);
  return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function helligkeit(hex) {
  const [r, g, b] = rgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

// Farbe für Hell- und Dunkelmodus – oder fest, wenn in den Einstellungen gewählt
function dyn(hell, dunkel, alpha = 1) {
  if (FARBSCHEMA === "hell") return new Color(hell, alpha);
  if (FARBSCHEMA === "dunkel") return new Color(dunkel, alpha);
  return Color.dynamic(new Color(hell, alpha), new Color(dunkel, alpha));
}

const groesse = g => Math.round(g * TEXTSKALA * 10) / 10;
const titel = g => new Font(SCHRIFT[0], groesse(g));
const kursiv = g => new Font(SCHRIFT[1], groesse(g));
const label = g => Font.mediumSystemFont(groesse(g));
// Sperrsatz für kleine Versalien (Haarspatien zwischen den Buchstaben)
const sperren = s => String(s || "").toUpperCase().split("").join(" ");
const initialen = s => s.split(/\s+/).map(w => w[0]).join("").slice(0, 2).toUpperCase();
const notenAuszug = d => [d.kopfnoten, d.herznoten, d.basisnoten].map(l => (l || [])[0]).filter(Boolean).join(" · ");
const datumKurz = () => new Date().toLocaleDateString("de-DE", { weekday: "short", day: "numeric", month: "short" });

// ── Datum ───────────────────────────────────────────────────

function datumsSchluessel(d) {
  const p = n => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function tageZwischen(von, bis) {
  const utc = s => { const [j, m, d] = s.split("-").map(Number); return Date.UTC(j, m - 1, d); };
  return Math.round((utc(bis) - utc(von)) / 86400000);
}

function tageSeitGetragen(zustand, id, heute = HEUTE) {
  const eintrag = (zustand.verlauf || []).find(v => v.id === id);
  return eintrag ? tageZwischen(eintrag.datum, heute) : null;
}

function jahreszeit(d) {
  const m = d.getMonth();
  if (m >= 2 && m <= 4) return "frühling";
  if (m >= 5 && m <= 7) return "sommer";
  if (m >= 8 && m <= 10) return "herbst";
  return "winter";
}

function pseudoZufall(textWert) {
  let h = 2166136261;
  for (let i = 0; i < textWert.length; i++) { h ^= textWert.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) / 4294967296;
}

// ═════════════════════════════════════════════════════════════
//  App: Menü, Auswahl, Vorschlag, Einstellungen, Fotos, Sprühen
// ═════════════════════════════════════════════════════════════

async function menue() {
  const kontext = await kontextLaden();
  const { E } = kontext;
  const aktuell = await anzeigeBestimmen(kontext, "");

  const a = new Alert();
  a.title = "Duft des Tages";
  a.message = `${aktuell.duft.name} · ${aktuell.duft.marke}\n${aktuell.text}\n\n` +
    `Modus: ${E["vorschlag.modus"] === "automatisch" ? "täglicher Vorschlag" : "eigene Wahl"} · Wetter: ${E["vorschlag.ort"].name}`;
  const aktionen = [
    ["Duft auswählen", () => auswahlListe(kontext)],
    ["Vorschlagen lassen", () => vorschlagDialog(kontext)],
    ["Sprühen", () => spruehen(kontext, aktuell.duft, aktuell)],
    [E["vorschlag.modus"] === "automatisch" ? "Automatik ausschalten" : "Jeden Tag automatisch vorschlagen", () => modusWechseln(kontext)],
    ["Einstellungen …", () => einstellungenOeffnen(kontext)],
    ["Eigenes Foto für einen Duft …", () => fotoMenue(kontext)],
    ["Widget-Vorschau", () => widgetVorschau(kontext)],
  ];
  for (const [titelText] of aktionen) a.addAction(titelText);
  a.addCancelAction("Schließen");
  const wahl = await a.presentAlert();
  if (wahl >= 0) await aktionen[wahl][1]();
}

async function duftWaehlen(kontext, ueberschrift, unterzeile) {
  const { duefte, zustand } = kontext;
  const tabelle = new UITable();
  tabelle.showSeparators = true;
  const kopf = new UITableRow();
  kopf.isHeader = true;
  kopf.height = 70;
  const t = kopf.addText(ueberschrift, unterzeile);
  t.titleFont = new Font(SCHRIFTEN.didot[0], 26);
  t.subtitleFont = Font.systemFont(12);
  t.subtitleColor = Color.gray();
  tabelle.addRow(kopf);
  let gewaehlt = null;
  for (const d of duefte) {
    const reihe = new UITableRow();
    reihe.height = 64;
    reihe.dismissOnSelect = true;
    const punkt = reihe.addText("●");
    punkt.titleColor = new Color(palette(d.farbe).akzentHell);
    punkt.titleFont = Font.systemFont(20);
    punkt.widthWeight = 8;
    const name = reihe.addText(d.name, `${d.marke} · ${(FAMILIEN[d.duftfamilie] || {}).name || d.duftfamilie}`);
    name.titleFont = new Font(SCHRIFTEN.didot[0], 19);
    name.subtitleFont = Font.systemFont(12);
    name.subtitleColor = Color.gray();
    name.widthWeight = 80;
    const haken = reihe.addText(d.id === zustand.aktuell ? "✓" : "");
    haken.rightAligned();
    haken.widthWeight = 12;
    reihe.onSelect = () => { gewaehlt = d; };
    tabelle.addRow(reihe);
  }
  await tabelle.present(false);
  return gewaehlt;
}

async function auswahlListe(kontext) {
  const d = await duftWaehlen(kontext, "Duft auswählen", `${kontext.duefte.length} Düfte in deiner Sammlung`);
  if (d) await auswahlSpeichern(kontext, d);
}

async function auswahlSpeichern(kontext, duft) {
  kontext.zustand.aktuell = duft.id;
  kontext.zustand.einstellungen = { ...kontext.E, "vorschlag.modus": "manuell" };
  kontext.E = einstellungen(kontext.zustand);
  zustandSpeichern(kontext.zustand);
  const a = new Alert();
  a.title = duft.name;
  a.message = "ist jetzt dein Duft des Tages.\nDas Widget zeigt ihn, sobald iOS es neu lädt.";
  a.addAction("Jetzt sprühen");
  a.addCancelAction("Fertig");
  if ((await a.presentAlert()) === 0) await spruehen(kontext, duft);
}

async function vorschlagDialog(kontext) {
  const v = vorschlagBerechnen(kontext.duefte, kontext.zustand, kontext.E, await wetterSicher(kontext.E));
  const auchPassend = v.rangliste.slice(1, 3).map(e => e.duft.name).join(", ");
  const a = new Alert();
  a.title = v.duft.name;
  a.message = [v.duft.marke, "", v.begruendung, v.zusatz, auchPassend ? `\nAuch passend: ${auchPassend}` : null]
    .filter(z => z !== null && z !== undefined).join("\n");
  a.addAction("Übernehmen & sprühen");
  a.addAction("Übernehmen");
  a.addAction("Jeden Tag automatisch");
  a.addCancelAction("Abbrechen");
  const wahl = await a.presentAlert();
  if (wahl === 0 || wahl === 1) {
    kontext.zustand.aktuell = v.duft.id;
    kontext.zustand.einstellungen = { ...kontext.E, "vorschlag.modus": "manuell" };
    zustandSpeichern(kontext.zustand);
  }
  if (wahl === 0) await spruehen(kontext, v.duft, { quelle: "vorschlag", text: v.begruendung });
  if (wahl === 2) {
    kontext.zustand.einstellungen = { ...kontext.E, "vorschlag.modus": "automatisch" };
    zustandSpeichern(kontext.zustand);
  }
}

async function modusWechseln(kontext) {
  const neu = kontext.E["vorschlag.modus"] === "automatisch" ? "manuell" : "automatisch";
  kontext.zustand.einstellungen = { ...kontext.E, "vorschlag.modus": neu };
  zustandSpeichern(kontext.zustand);
  await hinweis(neu === "automatisch" ? "Automatik an" : "Automatik aus",
    neu === "automatisch"
      ? "Das Widget schlägt jeden Tag passend zu Wetter, Jahreszeit und Verlauf einen Duft vor."
      : "Das Widget zeigt wieder deine eigene Wahl.");
}

// Einstellungsseite im WebView öffnen; „Speichern“ dort ruft scriptable:///…?action=einstellungen auf – das fangen wir ab
async function einstellungenOeffnen(kontext) {
  let neu = null;
  const wv = new WebView();
  wv.shouldAllowRequest = req => {
    const adresse = String((req && req.url) || "");
    if (!adresse.startsWith("scriptable:")) return true;
    const q = queryAus(adresse);
    if (q.action === "einstellungen" && q.daten) neu = q.daten;
    return false;
  };
  await wv.loadURL(url(`einstellungen.html?quelle=scriptable&e=${encodeURIComponent(JSON.stringify(kontext.E))}`));
  await wv.present(true);
  if (neu && einstellungenUebernehmen(kontext.zustand, neu)) {
    zustandSpeichern(kontext.zustand);
    await hinweis("Einstellungen gespeichert", "Widget und Sprüh-Animation nutzen sie ab sofort. Das Widget aktualisiert sich, sobald iOS es neu lädt.");
  }
}

// Übernimmt Einstellungen (JSON-Text). Fehlende Schlüssel = Standardwert.
function einstellungenUebernehmen(zustand, daten) {
  try {
    const roh = typeof daten === "string" ? JSON.parse(daten) : daten;
    zustand.einstellungen = einstellungen({ einstellungen: roh });
    return true;
  } catch (e) {
    console.error(`Einstellungen nicht lesbar: ${e}`);
    return false;
  }
}

async function einstellungenAktion(daten, still) {
  const zustand = await zustandLaden();
  if (!einstellungenUebernehmen(zustand, daten)) return hinweis("Einstellungen nicht lesbar", "Der Link aus der Einstellungsseite war unvollständig.");
  zustandSpeichern(zustand);
  if (!still) await hinweis("Einstellungen übernommen", "Widget und Sprüh-Animation nutzen sie ab sofort.");
}

async function fotoMenue(kontext) {
  const duft = await duftWaehlen(kontext, "Eigenes Foto", "Für welchen Duft?");
  if (!duft) return;
  const vorhanden = !!(await eigenesFoto(duft.id));
  const a = new Alert();
  a.title = duft.name;
  a.message = vorhanden ? "Es gibt schon ein eigenes Foto." : "Das Foto erscheint im Widget und nach dem Sprühen.";
  a.addAction("Aus der Fotomediathek");
  a.addAction("Mit der Kamera aufnehmen");
  if (vorhanden) a.addDestructiveAction("Eigenes Foto entfernen");
  a.addCancelAction("Abbrechen");
  const wahl = await a.presentAlert();
  if (wahl < 0) return;
  if (wahl === 2) {
    fmZustand.remove(fotoPfad(duft.id));
    return hinweis("Entfernt", `${duft.name} nutzt wieder das Bild aus der Sammlung.`);
  }
  let foto;
  try {
    foto = wahl === 0 ? await Photos.fromLibrary() : await Photos.fromCamera();
  } catch (_) {
    return;   // abgebrochen
  }
  if (!foto) return;
  if (!fmZustand.fileExists(FOTO_ORDNER)) fmZustand.createDirectory(FOTO_ORDNER, true);
  fmZustand.writeImage(fotoPfad(duft.id), verkleinert(foto, 1800));
  await hinweis("Foto gespeichert", `${duft.name} zeigt ab jetzt dein Foto. Sitzt der Ausschnitt im Widget nicht, hilft "bildFokus" in duefte.json.`);
}

// Längste Seite auf max Pixel begrenzen (Speicher im Widget)
function verkleinert(bild, max) {
  const s = bild.size, f = Math.min(1, max / Math.max(s.width, s.height));
  if (f >= 1) return bild;
  const dc = zeichenflaeche(s.width * f, s.height * f);
  dc.drawImageInRect(bild, new Rect(0, 0, s.width * f, s.height * f));
  return dc.getImage();
}

async function widgetVorschau(kontext) {
  const groessen = [["Klein", "small"], ["Mittel", "medium"], ["Groß", "large"], ["Extragroß", "extraLarge"]];
  const a = new Alert();
  a.title = "Widget-Vorschau";
  for (const [name] of groessen) a.addAction(name);
  a.addCancelAction("Abbrechen");
  const i = await a.presentAlert();
  if (i < 0) return;
  const familie = groessen[i][1];
  const widget = await widgetBauen(familie, await anzeigeBestimmen(kontext, ""), kontext);
  if (familie === "small") await widget.presentSmall();
  else if (familie === "medium") await widget.presentMedium();
  else if (familie === "large") await widget.presentLarge();
  else await widget.presentExtraLarge();
}

async function spruehAktion(id) {
  const kontext = await kontextLaden();
  const auswahl = await anzeigeBestimmen(kontext, "");
  const duft = kontext.duefte.find(d => d.id === id) || auswahl.duft;
  await spruehen(kontext, duft, duft.id === auswahl.duft.id ? auswahl : null);
}

async function setzAktion(id) {
  const kontext = await kontextLaden();
  const duft = kontext.duefte.find(d => d.id === id);
  if (!duft) return hinweis("Unbekannter Duft", `In der Sammlung gibt es keinen Duft mit der id „${id}“.`);
  await auswahlSpeichern(kontext, duft);
}

// Trägt den Duft als heute getragen ein und zeigt die Sprüh-Animation im Vollbild.
async function spruehen(kontext, duft, auswahl = null) {
  const { zustand, E } = kontext;
  getragenEintragen(zustand, duft.id);
  zustandSpeichern(zustand);
  const spray = Object.fromEntries(Object.entries(E).filter(([k]) => k.startsWith("spray.")));
  let adresse = `spray.html?id=${encodeURIComponent(duft.id)}&quelle=scriptable&getragen=1&e=${encodeURIComponent(JSON.stringify(spray))}`;
  if (auswahl && auswahl.quelle === "vorschlag" && auswahl.text) adresse += `&grund=${encodeURIComponent(auswahl.text)}`;
  const wv = new WebView();
  await wv.loadURL(url(adresse));
  const foto = await eigenesFoto(duft.id);
  if (foto) {
    try {
      const daten = Data.fromJPEG(verkleinert(foto, 1600)).toBase64String();
      await wv.evaluateJavaScript(`window.eigenesBild && window.eigenesBild("data:image/jpeg;base64,${daten}")`);
    } catch (e) {
      console.warn(`Eigenes Foto nicht übergeben: ${e}`);
    }
  }
  await wv.present(true);
}

async function hinweis(titelText, nachricht) {
  const a = new Alert();
  a.title = titelText;
  a.message = nachricht;
  a.addCancelAction("OK");
  await a.presentAlert();
}

// ═════════════════════════════════════════════════════════════
//  Start
// ═════════════════════════════════════════════════════════════

async function start() {
  const q = args.queryParameters || {};
  if (config.runsInWidget) return widgetModus();
  if (q.action === "spray") return spruehAktion(q.id);
  if (q.action === "set") return setzAktion(q.id);
  if (q.action === "einstellungen") return einstellungenAktion(q.daten, q.still === "1");
  if (q.action === "vorschlag") return vorschlagDialog(await kontextLaden());
  return menue();
}

try {
  await start();
} catch (fehler) {
  console.error(fehler);
  if (config.runsInWidget) Script.setWidget(fehlerWidget(fehler));
  else await hinweis("Etwas ist schiefgelaufen", String((fehler && fehler.message) || fehler));
} finally {
  Script.complete();
}
