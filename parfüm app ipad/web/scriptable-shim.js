/*
 * scriptable-shim.js – Nachbau der wichtigsten Scriptable-APIs im Browser
 *
 * Damit läuft scriptable/DuftDesTages.js unverändert in preview.html. Widgets werden als
 * HTML/CSS gezeichnet, Alert/UITable/WebView als einfache Dialoge, FileManager speichert
 * Texte in localStorage (Bilder nur im Arbeitsspeicher).
 *
 * Das ist eine Annäherung an SwiftUI, kein Emulator: Abstände, Schriftbreiten, Zeilenumbrüche
 * und minimumScaleFactor verhalten sich ähnlich, aber nicht identisch. Endabnahme immer auf dem iPad.
 *
 * Öffentliche Schnittstelle: window.ScriptableShim
 *   umgebung            – Einstellungen (thema, bildschirm, widgetGroessen, umleitung, …)
 *   ausfuehren(code, {modus: "widget"|"app", familie, parameter, query}) → Promise<ListWidget|null>
 *   zeichneWidget(widget, familie, [breite, hoehe]) → HTMLElement
 *   textAnpassen(element)  – minimumScaleFactor nachbilden (Element muss im DOM hängen)
 *   speicherLeeren()       – simulierten FileManager zurücksetzen
 */
(function (global) {
  "use strict";

  const umgebung = {
    thema: "hell",                    // "hell" | "dunkel" – entscheidet über Color.dynamic
    bildschirm: [1194, 834],          // Device.screenSize() in Punkten
    widgetGroessen: {                 // für presentSmall() & Co.
      small: [155, 155], medium: [342, 155], large: [342, 342], extraLarge: [715.5, 342],
    },
    eckenradius: 22,
    standardRand: 16,
    skriptName: "DuftDesTages",
    umleitung: null,                  // { von: "https://…/web/", nach: "http://localhost:8000/web/" }
  };

  const $el = (tag, klasse, text) => {
    const e = document.createElement(tag);
    if (klasse) e.className = klasse;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  // ── Grundtypen ──────────────────────────────────────────────
  class Size { constructor(width = 0, height = 0) { this.width = width; this.height = height; } }
  class Point { constructor(x = 0, y = 0) { this.x = x; this.y = y; } }
  class Rect {
    constructor(x = 0, y = 0, width = 0, height = 0) { this.x = x; this.y = y; this.width = width; this.height = height; }
    get minX() { return this.x; } get minY() { return this.y; }
    get maxX() { return this.x + this.width; } get maxY() { return this.y + this.height; }
    get origin() { return new Point(this.x, this.y); } get size() { return new Size(this.width, this.height); }
  }

  // ── Color ───────────────────────────────────────────────────
  class Color {
    constructor(hex, alpha) {
      let h = String(hex || "000000").trim().replace(/^#/, "");
      if (h.length === 3) h = h.split("").map(z => z + z).join("");
      let a = 1;
      if (h.length === 8) { a = parseInt(h.slice(6, 8), 16) / 255; h = h.slice(0, 6); }
      const n = parseInt(h, 16);
      this._r = isNaN(n) ? 0 : (n >> 16) & 255;
      this._g = isNaN(n) ? 0 : (n >> 8) & 255;
      this._b = isNaN(n) ? 0 : n & 255;
      this._a = alpha === undefined || alpha === null ? a : alpha;
    }
    get hex() { return [this._r, this._g, this._b].map(v => v.toString(16).padStart(2, "0")).join("").toUpperCase(); }
    get red() { return this._r / 255; }
    get green() { return this._g / 255; }
    get blue() { return this._b / 255; }
    get alpha() { return this._a; }
    static dynamic(hell, dunkel) {
      const c = new Color(hell.hex, hell.alpha);
      c._hell = hell; c._dunkel = dunkel;
      return c;
    }
    static black() { return new Color("000000"); }
    static darkGray() { return new Color("555555"); }
    static lightGray() { return new Color("AAAAAA"); }
    static white() { return new Color("FFFFFF"); }
    static gray() { return new Color("808080"); }
    static red() { return new Color("FF0000"); }
    static green() { return new Color("00FF00"); }
    static blue() { return new Color("0000FF"); }
    static cyan() { return new Color("00FFFF"); }
    static yellow() { return new Color("FFFF00"); }
    static magenta() { return new Color("FF00FF"); }
    static orange() { return new Color("FF8000"); }
    static purple() { return new Color("800080"); }
    static brown() { return new Color("996633"); }
    static clear() { return new Color("000000", 0); }
  }

  function farbeCss(c, thema = umgebung.thema) {
    if (!c) return "";
    if (c._hell) return farbeCss(thema === "dunkel" ? c._dunkel : c._hell, thema);
    return `rgba(${c._r}, ${c._g}, ${c._b}, ${c._a})`;
  }

  // ── Font ────────────────────────────────────────────────────
  const SYSTEM = '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif';
  const RUND = `ui-rounded, "SF Pro Rounded", "Nunito", ${SYSTEM}`;
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
  // iOS-Schriften → Ersatz im Browser (preview.html lädt Bodoni Moda als Didot-Ersatz)
  const ERSATZSCHRIFTEN = [
    [/^Didot/i, '"Didot", "Bodoni Moda", "Playfair Display", Georgia, serif'],
    [/^(Bodoni|BodoniSvtyTwo)/i, '"Bodoni 72", "Bodoni Moda", Georgia, serif'],
    [/^Baskerville/i, '"Baskerville", "Libre Baskerville", Georgia, serif'],
    [/^Cochin/i, '"Cochin", "Cormorant Garamond", Georgia, serif'],
    [/^Georgia/i, "Georgia, serif"],
    [/^(AvenirNext|Avenir)/i, '"Avenir Next", "Avenir", "Nunito Sans", "Jost", sans-serif'],
    [/^Futura/i, '"Futura", "Jost", sans-serif'],
    [/^(HelveticaNeue|Helvetica)/i, '"Helvetica Neue", Helvetica, Arial, sans-serif'],
    [/^(Menlo|Courier)/i, MONO],
  ];

  class Font {
    constructor(name, size) {
      const n = String(name || "");
      const treffer = ERSATZSCHRIFTEN.find(([re]) => re.test(n));
      this.name = n;
      this.size = size;
      this._familie = treffer ? treffer[1] : `"${n.split("-")[0]}", "${n}", ${SYSTEM}`;
      this._gewicht = /UltraLight/i.test(n) ? 200 : /Thin/i.test(n) ? 100 : /Light/i.test(n) ? 300
        : /Medium/i.test(n) ? 500 : /(DemiBold|SemiBold)/i.test(n) ? 600 : /Bold/i.test(n) ? 700
        : /(Heavy|Black)/i.test(n) ? 900 : 400;
      this._stil = /(Italic|Oblique|Ita$)/i.test(n) ? "italic" : "normal";
    }
    static _sys(size, gewicht, stil = "normal", familie = SYSTEM) {
      const f = Object.create(Font.prototype);
      Object.assign(f, { name: "System", size, _familie: familie, _gewicht: gewicht, _stil: stil });
      return f;
    }
    static ultraLightSystemFont(s) { return Font._sys(s, 100); }
    static thinSystemFont(s) { return Font._sys(s, 200); }
    static lightSystemFont(s) { return Font._sys(s, 300); }
    static regularSystemFont(s) { return Font._sys(s, 400); }
    static systemFont(s) { return Font._sys(s, 400); }
    static mediumSystemFont(s) { return Font._sys(s, 500); }
    static semiboldSystemFont(s) { return Font._sys(s, 600); }
    static boldSystemFont(s) { return Font._sys(s, 700); }
    static heavySystemFont(s) { return Font._sys(s, 800); }
    static blackSystemFont(s) { return Font._sys(s, 900); }
    static italicSystemFont(s) { return Font._sys(s, 400, "italic"); }
    static ultraLightRoundedSystemFont(s) { return Font._sys(s, 100, "normal", RUND); }
    static thinRoundedSystemFont(s) { return Font._sys(s, 200, "normal", RUND); }
    static lightRoundedSystemFont(s) { return Font._sys(s, 300, "normal", RUND); }
    static regularRoundedSystemFont(s) { return Font._sys(s, 400, "normal", RUND); }
    static mediumRoundedSystemFont(s) { return Font._sys(s, 500, "normal", RUND); }
    static semiboldRoundedSystemFont(s) { return Font._sys(s, 600, "normal", RUND); }
    static boldRoundedSystemFont(s) { return Font._sys(s, 700, "normal", RUND); }
    static heavyRoundedSystemFont(s) { return Font._sys(s, 800, "normal", RUND); }
    static blackRoundedSystemFont(s) { return Font._sys(s, 900, "normal", RUND); }
    static ultraLightMonospacedSystemFont(s) { return Font._sys(s, 100, "normal", MONO); }
    static lightMonospacedSystemFont(s) { return Font._sys(s, 300, "normal", MONO); }
    static regularMonospacedSystemFont(s) { return Font._sys(s, 400, "normal", MONO); }
    static mediumMonospacedSystemFont(s) { return Font._sys(s, 500, "normal", MONO); }
    static semiboldMonospacedSystemFont(s) { return Font._sys(s, 600, "normal", MONO); }
    static boldMonospacedSystemFont(s) { return Font._sys(s, 700, "normal", MONO); }
    static largeTitle() { return Font._sys(34, 400); }
    static title1() { return Font._sys(28, 400); }
    static title2() { return Font._sys(22, 400); }
    static title3() { return Font._sys(20, 400); }
    static headline() { return Font._sys(17, 600); }
    static subheadline() { return Font._sys(15, 400); }
    static body() { return Font._sys(17, 400); }
    static callout() { return Font._sys(16, 400); }
    static footnote() { return Font._sys(13, 400); }
    static caption1() { return Font._sys(12, 400); }
    static caption2() { return Font._sys(11, 400); }
  }
  const fontCss = f => `${f._stil} ${f._gewicht} ${f.size}px ${f._familie}`;

  // ── LinearGradient ──────────────────────────────────────────
  class LinearGradient {
    constructor() { this.colors = []; this.locations = []; this.startPoint = new Point(0, 0); this.endPoint = new Point(0, 1); }
  }
  function verlaufCss(g, thema, breite, hoehe) {
    const B = breite || 1, H = hoehe || 1;
    const dx = (g.endPoint.x - g.startPoint.x) * B, dy = (g.endPoint.y - g.startPoint.y) * H;
    const winkel = Math.atan2(dx, -dy) * 180 / Math.PI;
    const n = Math.max(1, g.colors.length - 1);
    const stopps = g.colors.map((c, i) => `${farbeCss(c, thema)} ${(((g.locations || [])[i] ?? i / n) * 100).toFixed(1)}%`);
    return `linear-gradient(${winkel.toFixed(1)}deg, ${stopps.join(", ")})`;
  }

  // ── Image & Data ────────────────────────────────────────────
  class Image {
    constructor() { this._src = ""; this._quelle = null; this.size = new Size(0, 0); }
    static fromFile(pfad) { const e = bilder.get(pfad); return e ? e.bild : null; }
    static fromData(data) { return data && data._bild ? data._bild : null; }
  }
  function bildAus(quelle, src, breite, hoehe) {
    const b = new Image();
    b._quelle = quelle; b._src = src; b.size = new Size(breite, hoehe);
    return b;
  }
  function bildAusBlob(blob) {
    // onload statt img.decode(): decode() wird in Hintergrund-Tabs teils stark verzögert
    return new Promise((ok, fehler) => {
      const src = URL.createObjectURL(blob);
      const img = document.createElement("img");
      img.onload = () => ok(bildAus(img, src, img.naturalWidth, img.naturalHeight));
      img.onerror = () => fehler(new Error("Bilddaten nicht lesbar"));
      img.src = src;
    });
  }

  function alsCanvas(bild) {
    if (bild._quelle instanceof HTMLCanvasElement) return bild._quelle;
    const c = document.createElement("canvas");
    c.width = bild.size.width; c.height = bild.size.height;
    c.getContext("2d").drawImage(bild._quelle, 0, 0);
    return c;
  }

  class Data {
    constructor(bytes) { this._bytes = bytes || new Uint8Array(0); this._bild = null; }
    static fromString(s) { return new Data(new TextEncoder().encode(s)); }
    static fromBase64String(s) { return new Data(Uint8Array.from(atob(s), z => z.charCodeAt(0))); }
    static fromJPEG(bild) { const d = Data.fromBase64String(alsCanvas(bild).toDataURL("image/jpeg", 0.9).split(",")[1]); d._bild = bild; return d; }
    static fromPNG(bild) { const d = Data.fromBase64String(alsCanvas(bild).toDataURL("image/png").split(",")[1]); d._bild = bild; return d; }
    toRawString() { return new TextDecoder().decode(this._bytes); }
    toBase64String() { let s = ""; this._bytes.forEach(b => { s += String.fromCharCode(b); }); return btoa(s); }
    getBytes() { return Array.from(this._bytes); }
  }

  // ── Request ─────────────────────────────────────────────────
  function umleiten(adresse) {
    const u = umgebung.umleitung;
    return u && u.von && String(adresse).startsWith(u.von) ? u.nach + String(adresse).slice(u.von.length) : adresse;
  }

  class Request {
    constructor(url) {
      this.url = url; this.method = "GET"; this.headers = {}; this.body = null;
      this.timeoutInterval = 60; this.response = null; this.allowInsecureRequest = false;
    }
    async _holen() {
      const abbruch = new AbortController();
      const timer = setTimeout(() => abbruch.abort(), (this.timeoutInterval || 60) * 1000);
      try {
        const antwort = await fetch(umleiten(this.url), {
          method: this.method, headers: this.headers, signal: abbruch.signal, cache: "no-store",
          body: this.method === "GET" || this.method === "HEAD" ? undefined : this.body,
        });
        this.response = {
          url: antwort.url, statusCode: antwort.status, mimeType: antwort.headers.get("content-type"),
          headers: Object.fromEntries(antwort.headers.entries()), cookies: [],
        };
        return antwort;
      } catch (e) {
        throw new Error(`Anfrage fehlgeschlagen: ${this.url} (${e.name === "AbortError" ? "Zeitüberschreitung" : e.message})`);
      } finally {
        clearTimeout(timer);
      }
    }
    async loadString() { return (await this._holen()).text(); }
    async loadJSON() { return JSON.parse(await this.loadString()); }
    async loadImage() {
      const antwort = await this._holen();
      if (!antwort.ok) throw new Error(`Bild nicht ladbar (HTTP ${antwort.status}): ${this.url}`);
      return bildAusBlob(await antwort.blob());
    }
    async load() { return new Data(new Uint8Array(await (await this._holen()).arrayBuffer())); }
  }

  // ── FileManager (Texte in localStorage, Bilder im Arbeitsspeicher) ──
  const PRAEFIX = "scriptable-shim:";
  const ersatz = new Map();   // falls localStorage gesperrt ist
  const bilder = new Map();   // pfad → { bild, zeit }
  const speicher = {
    lesen(p) {
      try { const roh = localStorage.getItem(PRAEFIX + p); if (roh !== null) return JSON.parse(roh); } catch (_) { /* Ersatz */ }
      return ersatz.get(p) || null;
    },
    schreiben(p, eintrag) {
      ersatz.set(p, eintrag);
      try { localStorage.setItem(PRAEFIX + p, JSON.stringify(eintrag)); } catch (_) { /* nur im Arbeitsspeicher */ }
    },
    loeschen(p) {
      ersatz.delete(p);
      try { localStorage.removeItem(PRAEFIX + p); } catch (_) { /* egal */ }
    },
    pfade() {
      const alle = new Set([...ersatz.keys(), ...bilder.keys()]);
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(PRAEFIX)) alle.add(k.slice(PRAEFIX.length));
        }
      } catch (_) { /* egal */ }
      return [...alle];
    },
  };

  class FileManager {
    constructor(art) { this._art = art; }
    static local() { return new FileManager("local"); }
    static iCloud() { return new FileManager("icloud"); }
    documentsDirectory() { return this._art === "icloud" ? "/iCloud/Documents" : "/Local/Documents"; }
    libraryDirectory() { return "/Local/Library"; }
    cacheDirectory() { return "/Local/Caches"; }
    temporaryDirectory() { return "/Local/tmp"; }
    joinPath(a, b) { return String(a).replace(/\/+$/, "") + "/" + String(b).replace(/^\/+/, ""); }
    fileExists(p) { return !!speicher.lesen(p) || bilder.has(p) || this.isDirectory(p); }
    isDirectory(p) {
      const e = speicher.lesen(p);
      return (e && e.art === "ordner") || speicher.pfade().some(k => k.startsWith(p.replace(/\/+$/, "") + "/"));
    }
    createDirectory(p) { speicher.schreiben(p, { art: "ordner", zeit: Date.now() }); }
    readString(p) { const e = speicher.lesen(p); return e && e.art === "text" ? e.inhalt : null; }
    writeString(p, s) { speicher.schreiben(p, { art: "text", inhalt: String(s), zeit: Date.now() }); }
    readImage(p) { const e = bilder.get(p); return e ? e.bild : null; }
    writeImage(p, bild) { bilder.set(p, { bild, zeit: Date.now() }); }
    read(p) { return Data.fromString(this.readString(p) || ""); }
    write(p, data) { this.writeString(p, data.toRawString()); }
    remove(p) {
      for (const k of speicher.pfade()) if (k === p || k.startsWith(p + "/")) { speicher.loeschen(k); bilder.delete(k); }
    }
    move(von, nach) { this.copy(von, nach); this.remove(von); }
    copy(von, nach) {
      const e = speicher.lesen(von); if (e) speicher.schreiben(nach, e);
      const b = bilder.get(von); if (b) bilder.set(nach, b);
    }
    modificationDate(p) {
      const e = speicher.lesen(p) || bilder.get(p);
      return e ? new Date(e.zeit) : null;
    }
    creationDate(p) { return this.modificationDate(p); }
    listContents(ordner) {
      const basis = ordner.replace(/\/+$/, "") + "/";
      return [...new Set(speicher.pfade().filter(k => k.startsWith(basis)).map(k => k.slice(basis.length).split("/")[0]))];
    }
    fileName(p, mitEndung = false) { const n = p.split("/").pop(); return mitEndung ? n : n.replace(/\.[^.]*$/, ""); }
    fileExtension(p) { const m = p.match(/\.([^./]+)$/); return m ? m[1] : ""; }
    isFileDownloaded() { return true; }
    downloadFileFromiCloud() { return Promise.resolve(); }
    isFileStoredIniCloud() { return this._art === "icloud"; }
    bookmarkExists() { return false; }
    bookmarkedPath(name) { return "/Bookmarks/" + name; }
    fileSize(p) { const e = speicher.lesen(p); return e && e.inhalt ? e.inhalt.length / 1000 : 0; }
  }

  function speicherLeeren() {
    for (const k of speicher.pfade()) speicher.loeschen(k);
    bilder.clear();
  }

  // ── DrawContext & Path ──────────────────────────────────────
  class Path {
    constructor() { this._p = new Path2D(); }
    move(p) { this._p.moveTo(p.x, p.y); }
    addLine(p) { this._p.lineTo(p.x, p.y); }
    addLines(punkte) { punkte.forEach((p, i) => (i ? this.addLine(p) : this.move(p))); }
    addRect(r) { this._p.rect(r.x, r.y, r.width, r.height); }
    addRects(rs) { rs.forEach(r => this.addRect(r)); }
    addEllipse(r) { this._p.ellipse(r.x + r.width / 2, r.y + r.height / 2, r.width / 2, r.height / 2, 0, 0, Math.PI * 2); }
    addRoundedRect(r, bw, bh) { this._p.roundRect(r.x, r.y, r.width, r.height, Math.min(bw, bh)); }
    addCurve(p, k1, k2) { this._p.bezierCurveTo(k1.x, k1.y, k2.x, k2.y, p.x, p.y); }
    addQuadCurve(p, k) { this._p.quadraticCurveTo(k.x, k.y, p.x, p.y); }
    closeSubpath() { this._p.closePath(); }
  }

  class DrawContext {
    constructor() {
      this.size = new Size(200, 200); this.opaque = true; this.respectScreenScale = false;
      this._ctx = null; this._schrift = Font.systemFont(17); this._textfarbe = Color.black();
      this._ausrichtung = "left"; this._pfad = null;
    }
    get _c() {
      if (!this._ctx) {
        const skala = this.respectScreenScale ? 2 : 1;
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(this.size.width * skala));
        canvas.height = Math.max(1, Math.round(this.size.height * skala));
        this._ctx = canvas.getContext("2d");
        this._ctx.scale(skala, skala);
        this._skala = skala;
        if (this.opaque) { this._ctx.fillStyle = "#000"; this._ctx.fillRect(0, 0, this.size.width, this.size.height); }
      }
      return this._ctx;
    }
    setFillColor(c) { this._c.fillStyle = farbeCss(c, "hell"); }
    setStrokeColor(c) { this._c.strokeStyle = farbeCss(c, "hell"); }
    setLineWidth(w) { this._c.lineWidth = w; }
    fillRect(r) { this._c.fillRect(r.x, r.y, r.width, r.height); }
    strokeRect(r) { this._c.strokeRect(r.x, r.y, r.width, r.height); }
    fillEllipse(r) { const p = new Path(); p.addEllipse(r); this._c.fill(p._p); }
    strokeEllipse(r) { const p = new Path(); p.addEllipse(r); this._c.stroke(p._p); }
    fill(r) { this.fillRect(r); }
    stroke(r) { this.strokeRect(r); }
    addPath(p) { this._pfad = p; }
    fillPath() { if (this._pfad) this._c.fill(this._pfad._p); }
    strokePath() { if (this._pfad) this._c.stroke(this._pfad._p); }
    drawImageInRect(bild, r) { if (bild && bild._quelle) this._c.drawImage(bild._quelle, r.x, r.y, r.width, r.height); }
    drawImageAtPoint(bild, p) { if (bild && bild._quelle) this._c.drawImage(bild._quelle, p.x, p.y, bild.size.width, bild.size.height); }
    setFont(f) { this._schrift = f; }
    setTextColor(c) { this._textfarbe = c; }
    setTextAlignedLeft() { this._ausrichtung = "left"; }
    setTextAlignedCenter() { this._ausrichtung = "center"; }
    setTextAlignedRight() { this._ausrichtung = "right"; }
    drawText(text, p) {
      const c = this._c;
      c.font = fontCss(this._schrift); c.fillStyle = farbeCss(this._textfarbe, "hell");
      c.textBaseline = "top"; c.textAlign = "left";
      c.fillText(text, p.x, p.y);
    }
    drawTextInRect(text, r) {
      const c = this._c;
      c.font = fontCss(this._schrift); c.fillStyle = farbeCss(this._textfarbe, "hell");
      c.textBaseline = "top"; c.textAlign = this._ausrichtung;
      const x = this._ausrichtung === "center" ? r.x + r.width / 2 : this._ausrichtung === "right" ? r.maxX : r.x;
      const zeilen = [];
      for (const absatz of String(text).split("\n")) {
        let zeile = "";
        for (const wort of absatz.split(" ")) {
          const probe = zeile ? zeile + " " + wort : wort;
          if (c.measureText(probe).width > r.width && zeile) { zeilen.push(zeile); zeile = wort; } else zeile = probe;
        }
        zeilen.push(zeile);
      }
      const hoehe = this._schrift.size * 1.2;
      zeilen.forEach((z, i) => { if ((i + 1) * hoehe <= r.height + 1) c.fillText(z, x, r.y + i * hoehe); });
    }
    getImage() {
      const canvas = this._c.canvas;
      const src = this.opaque ? canvas.toDataURL("image/jpeg", 0.92) : canvas.toDataURL("image/png");
      return bildAus(canvas, src, canvas.width / this._skala, canvas.height / this._skala);
    }
  }

  // ── Widget-Elemente ─────────────────────────────────────────
  class WidgetText {
    constructor(text) {
      this.text = text; this.font = null; this.textColor = null; this.textOpacity = 1;
      this.lineLimit = 0; this.minimumScaleFactor = 1; this.shadowColor = null; this.shadowRadius = 0;
      this.shadowOffset = new Point(0, 0); this.url = null; this._ausrichtung = "links";
    }
    leftAlignText() { this._ausrichtung = "links"; }
    centerAlignText() { this._ausrichtung = "mitte"; }
    rightAlignText() { this._ausrichtung = "rechts"; }
  }

  class WidgetDate extends WidgetText {
    constructor(date) { super(""); this.date = date; this._stil = "datum"; }
    applyTimeStyle() { this._stil = "zeit"; }
    applyDateStyle() { this._stil = "datum"; }
    applyRelativeStyle() { this._stil = "relativ"; }
    applyOffsetStyle() { this._stil = "relativ"; }
    applyTimerStyle() { this._stil = "timer"; }
    get _anzeige() {
      const d = this.date || new Date();
      if (this._stil === "zeit") return d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
      if (this._stil === "datum") return d.toLocaleDateString("de-DE", { day: "numeric", month: "long", year: "numeric" });
      const min = Math.round((d - Date.now()) / 60000);
      return this._stil === "timer" ? `${Math.floor(Math.abs(min) / 60)}:${String(Math.abs(min) % 60).padStart(2, "0")}` : `${min >= 0 ? "in" : "vor"} ${Math.abs(min)} Min.`;
    }
  }

  class WidgetImage {
    constructor(image) {
      this.image = image; this.imageSize = null; this.imageOpacity = 1; this.cornerRadius = 0;
      this.borderWidth = 0; this.borderColor = null; this.containerRelativeShape = false;
      this.resizable = true; this.tintColor = null; this.url = null;
      this._modus = "fit"; this._ausrichtung = "mitte";
    }
    applyFittingContentMode() { this._modus = "fit"; }
    applyFillingContentMode() { this._modus = "fill"; }
    leftAlignImage() { this._ausrichtung = "links"; }
    centerAlignImage() { this._ausrichtung = "mitte"; }
    rightAlignImage() { this._ausrichtung = "rechts"; }
  }

  class WidgetSpacer { constructor(length) { this.length = length === undefined || length === null ? null : length; } }

  class Behaelter {
    constructor() {
      this._kinder = []; this.backgroundColor = null; this.backgroundImage = null;
      this.backgroundGradient = null; this.url = null; this.spacing = 0;
    }
    _neu(e) { this._kinder.push(e); return e; }
    addText(t) { return this._neu(new WidgetText(t)); }
    addDate(d) { return this._neu(new WidgetDate(d)); }
    addImage(i) { return this._neu(new WidgetImage(i)); }
    addSpacer(l) { return this._neu(new WidgetSpacer(l)); }
    addStack() { return this._neu(new WidgetStack()); }
    setPadding(oben, links, unten, rechts) { this._rand = [oben, links, unten, rechts]; }
  }

  class WidgetStack extends Behaelter {
    constructor() {
      super();
      this._achse = "h"; this._ausrichtung = "oben"; this._rand = [0, 0, 0, 0];
      this.size = new Size(0, 0); this.cornerRadius = 0; this.borderWidth = 0; this.borderColor = null;
    }
    layoutHorizontally() { this._achse = "h"; }
    layoutVertically() { this._achse = "v"; }
    topAlignContent() { this._ausrichtung = "oben"; }
    centerAlignContent() { this._ausrichtung = "mitte"; }
    bottomAlignContent() { this._ausrichtung = "unten"; }
    useDefaultPadding() { this._rand = [0, 0, 0, 0]; }
  }

  class ListWidget extends Behaelter {
    constructor() { super(); this.refreshAfterDate = null; this._rand = null; }
    useDefaultPadding() { this._rand = null; }
    presentSmall() { return widgetZeigen(this, "small"); }
    presentMedium() { return widgetZeigen(this, "medium"); }
    presentLarge() { return widgetZeigen(this, "large"); }
    presentExtraLarge() { return widgetZeigen(this, "extraLarge"); }
    presentAccessoryCircular() { return widgetZeigen(this, "small"); }
    presentAccessoryInline() { return widgetZeigen(this, "small"); }
    presentAccessoryRectangular() { return widgetZeigen(this, "small"); }
  }

  // ── Widget → HTML ───────────────────────────────────────────
  const STANDARD_TEXTFARBE = Color.dynamic(Color.black(), Color.white());

  // Ist ein Element in x/y-Richtung dehnbar? (Spacer und Stapel mit Spacern sind es, wie in SwiftUI)
  function dehnbar(knoten, achse) {
    if (knoten instanceof WidgetSpacer) return knoten.length === null ? { x: achse === "h", y: achse === "v" } : { x: false, y: false };
    if (knoten instanceof WidgetStack) {
      let x = false, y = false;
      for (const k of knoten._kinder) { const d = dehnbar(k, knoten._achse); x = x || d.x; y = y || d.y; }
      if (knoten.size && knoten.size.width > 0) x = false;
      if (knoten.size && knoten.size.height > 0) y = false;
      return { x, y };
    }
    return { x: false, y: false };
  }

  function hintergrund(el, obj, thema, breite, hoehe) {
    const schichten = [];
    if (obj.backgroundImage) schichten.push(`url("${obj.backgroundImage._src}") center / cover no-repeat`);
    if (obj.backgroundGradient) schichten.push(verlaufCss(obj.backgroundGradient, thema, breite, hoehe));
    if (schichten.length) el.style.background = schichten.join(", ");
    if (obj.backgroundColor) el.style.backgroundColor = farbeCss(obj.backgroundColor, thema);
  }

  const randCss = r => `${r[0]}px ${r[3]}px ${r[2]}px ${r[1]}px`;

  function zeichneWidget(widget, familie, [breite, hoehe], thema = umgebung.thema) {
    const el = $el("div", "sw-widget");
    el.dataset.familie = familie;
    Object.assign(el.style, { width: breite + "px", height: hoehe + "px", borderRadius: umgebung.eckenradius + "px" });
    el.style.backgroundColor = thema === "dunkel" ? "#1c1c1e" : "#ffffff";
    hintergrund(el, widget, thema, breite, hoehe);
    el.style.padding = randCss(widget._rand || [umgebung.standardRand, umgebung.standardRand, umgebung.standardRand, umgebung.standardRand]);
    if (widget.spacing) el.style.gap = widget.spacing + "px";
    for (const k of widget._kinder) el.append(zeichneKind(k, "v", thema, true));
    if (widget.url) { el.dataset.url = widget.url; el.classList.add("sw-klickbar"); }
    return el;
  }

  function zeichneKind(k, achse, thema, wurzel = false) {
    if (k instanceof WidgetSpacer) {
      const s = $el("div", "sw-spacer");
      s.style.flex = k.length === null ? "1 1 0px" : `0 0 ${k.length}px`;
      return s;
    }
    let el;
    if (k instanceof WidgetText) el = zeichneText(k, thema, wurzel);
    else if (k instanceof WidgetImage) el = zeichneBild(k, thema, wurzel);
    else if (k instanceof WidgetStack) el = zeichneStapel(k, thema);
    else el = $el("div");
    const d = dehnbar(k, achse);
    const haupt = achse === "h" ? d.x : d.y, quer = achse === "h" ? d.y : d.x;
    if (haupt) el.style.flex = "1 1 0px";
    if (quer) el.style.alignSelf = "stretch";
    // feste Größe entlang der Stapelrichtung: nicht schrumpfen (quer dazu darf SwiftUI stauchen)
    if (k instanceof WidgetStack && k.size && (achse === "h" ? k.size.width : k.size.height) > 0) el.style.flexShrink = "0";
    if (k.url) { el.dataset.url = k.url; el.classList.add("sw-klickbar"); }
    return el;
  }

  function zeichneText(t, thema, wurzel) {
    const el = $el("div", "sw-text", t instanceof WidgetDate ? t._anzeige : String(t.text));
    const f = t.font || Font.body();
    Object.assign(el.style, { fontFamily: f._familie, fontWeight: f._gewicht, fontStyle: f._stil, fontSize: f.size + "px" });
    el.style.color = farbeCss(t.textColor || STANDARD_TEXTFARBE, thema);
    if (t.textOpacity !== 1) el.style.opacity = t.textOpacity;
    el.style.textAlign = { links: "left", mitte: "center", rechts: "right" }[t._ausrichtung];
    if (t.lineLimit === 1) el.classList.add("sw-einzeilig");
    else if (t.lineLimit > 1) { el.classList.add("sw-mehrzeilig"); el.style.webkitLineClamp = String(t.lineLimit); }
    if (t.shadowColor && t.shadowRadius) {
      el.style.textShadow = `${t.shadowOffset.x}px ${t.shadowOffset.y}px ${t.shadowRadius}px ${farbeCss(t.shadowColor, thema)}`;
    }
    if (t.minimumScaleFactor < 1) { el.dataset.minSkala = t.minimumScaleFactor; el.dataset.groesse = f.size; }
    if (wurzel) el.style.alignSelf = "stretch";   // im ListWidget nimmt Text die volle Breite ein
    return el;
  }

  function zeichneBild(i, thema, wurzel) {
    const el = $el("img", "sw-bild");
    el.alt = ""; el.draggable = false;
    if (i.image) el.src = i.image._src;
    const s = i.imageSize || (i.image && !i.resizable ? i.image.size : null);
    if (s) Object.assign(el.style, { width: s.width + "px", height: s.height + "px", flex: "0 0 auto" });
    else Object.assign(el.style, { maxWidth: "100%", maxHeight: "100%", minWidth: "0", minHeight: "0" });
    el.style.objectFit = i._modus === "fill" ? "cover" : "contain";
    if (i.imageOpacity !== 1) el.style.opacity = i.imageOpacity;
    if (i.cornerRadius) el.style.borderRadius = i.cornerRadius + "px";
    if (i.containerRelativeShape) el.style.borderRadius = Math.max(0, umgebung.eckenradius - umgebung.standardRand / 2) + "px";
    if (i.borderWidth) el.style.border = `${i.borderWidth}px solid ${farbeCss(i.borderColor || Color.black(), thema)}`;
    if (wurzel) el.style.alignSelf = { links: "flex-start", mitte: "center", rechts: "flex-end" }[i._ausrichtung];
    return el;
  }

  function zeichneStapel(s, thema) {
    const el = $el("div", "sw-stack");
    const pos = { oben: "flex-start", mitte: "center", unten: "flex-end" }[s._ausrichtung];
    el.style.flexDirection = s._achse === "h" ? "row" : "column";
    if (s._achse === "h") el.style.alignItems = pos;
    else { el.style.alignItems = "flex-start"; el.style.justifyContent = pos; }
    if (s.size && s.size.width > 0) el.style.width = s.size.width + "px";
    if (s.size && s.size.height > 0) el.style.height = s.size.height + "px";
    if (s._rand) el.style.padding = randCss(s._rand);
    if (s.spacing) el.style.gap = s.spacing + "px";
    if (s.cornerRadius) { el.style.borderRadius = s.cornerRadius + "px"; el.style.overflow = "hidden"; }
    if (s.borderWidth) el.style.border = `${s.borderWidth}px solid ${farbeCss(s.borderColor || Color.black(), thema)}`;
    hintergrund(el, s, thema, s.size && s.size.width, s.size && s.size.height);
    for (const k of s._kinder) el.append(zeichneKind(k, s._achse, thema));
    return el;
  }

  // minimumScaleFactor: Schrift verkleinern, bis der Text passt (nach dem Einhängen ins DOM aufrufen)
  // Toleranz: Ober-/Unterlängen ragen ein paar Pixel über die Zeilenhöhe – eine echte
  // zusätzliche Zeile wäre dagegen ca. 1,2 em hoch.
  function zuGross(e) {
    const groesse = parseFloat(e.style.fontSize) || 16;
    return e.scrollWidth > e.clientWidth + 2 || e.scrollHeight > e.clientHeight + groesse * 0.45;
  }

  function textAnpassen(wurzel) {
    for (const e of wurzel.querySelectorAll("[data-min-skala]")) {
      const basis = parseFloat(e.dataset.groesse), min = basis * parseFloat(e.dataset.minSkala);
      let g = basis;
      for (let n = 0; n < 40 && zuGross(e) && g > min; n++) {
        g = Math.max(min, g * 0.95);
        e.style.fontSize = g + "px";
      }
    }
  }

  // ── Dialoge (Alert, UITable, WebView, Widget-Vorschau) ──────
  function ebeneOeffnen(klasse) {
    const ebene = $el("div", "sw-ebene " + klasse);
    document.body.append(ebene);
    return { ebene, schliessen: () => ebene.remove() };
  }

  class Alert {
    constructor() { this.title = ""; this.message = ""; this._aktionen = []; this._abbrechen = null; this._felder = []; this._werte = []; }
    addAction(t) { this._aktionen.push({ titel: t, art: "normal" }); }
    addDestructiveAction(t) { this._aktionen.push({ titel: t, art: "destruktiv" }); }
    addCancelAction(t) { this._abbrechen = t; }
    addTextField(platzhalter = "", text = "") { this._felder.push({ platzhalter, text, typ: "text" }); }
    addSecureTextField(platzhalter = "", text = "") { this._felder.push({ platzhalter, text, typ: "password" }); }
    textFieldValue(i) { return this._werte[i] ?? ""; }
    presentAlert() { return alertZeigen(this); }
    presentSheet() { return alertZeigen(this); }
  }

  function alertZeigen(a) {
    return new Promise(fertig => {
      const { ebene, schliessen } = ebeneOeffnen("sw-dimmer");
      const box = $el("div", "sw-alert");
      if (a.title) box.append($el("div", "sw-alert-titel", a.title));
      if (a.message) box.append($el("div", "sw-alert-text", a.message));
      const felder = a._felder.map(f => {
        const i = $el("input", "sw-alert-feld");
        i.type = f.typ; i.placeholder = f.platzhalter; i.value = f.text;
        box.append(i);
        return i;
      });
      const knoepfe = $el("div", "sw-alert-knoepfe");
      const waehlen = index => { a._werte = felder.map(f => f.value); schliessen(); fertig(index); };
      a._aktionen.forEach((akt, i) => {
        const k = $el("button", "sw-alert-knopf" + (akt.art === "destruktiv" ? " sw-rot" : ""), akt.titel);
        k.onclick = () => waehlen(i);
        knoepfe.append(k);
      });
      if (a._abbrechen !== null || !a._aktionen.length) {
        const k = $el("button", "sw-alert-knopf sw-fett", a._abbrechen || "OK");
        k.onclick = () => waehlen(-1);
        knoepfe.append(k);
      }
      box.append(knoepfe);
      ebene.append(box);
      if (felder[0]) felder[0].focus();
    });
  }

  class UITableCell {
    constructor(art, a, b) {
      this._art = art; this.title = art === "text" || art === "button" ? a : null; this.subtitle = art === "text" ? b : null;
      this.image = art === "image" ? a : null; this.imageURL = art === "imageURL" ? a : null;
      this.titleColor = null; this.subtitleColor = null; this.titleFont = null; this.subtitleFont = null;
      this.widthWeight = 1; this.onTap = null; this.dismissOnTap = false; this._ausrichtung = "left";
    }
    static text(t, s) { return new UITableCell("text", t, s); }
    static image(i) { return new UITableCell("image", i); }
    static imageAtURL(u) { return new UITableCell("imageURL", u); }
    static button(t) { return new UITableCell("button", t); }
    leftAligned() { this._ausrichtung = "left"; }
    centerAligned() { this._ausrichtung = "center"; }
    rightAligned() { this._ausrichtung = "right"; }
  }

  class UITableRow {
    constructor() {
      this._zellen = []; this.height = 44; this.cellSpacing = 0; this.isHeader = false;
      this.dismissOnSelect = true; this.onSelect = null; this.backgroundColor = null;
    }
    addCell(c) { this._zellen.push(c); }
    addText(t, s) { const c = UITableCell.text(t, s); this.addCell(c); return c; }
    addImage(i) { const c = UITableCell.image(i); this.addCell(c); return c; }
    addImageAtURL(u) { const c = UITableCell.imageAtURL(u); this.addCell(c); return c; }
    addButton(t) { const c = UITableCell.button(t); this.addCell(c); return c; }
  }

  class UITable {
    constructor() { this._reihen = []; this.showSeparators = false; this._neuZeichnen = null; }
    addRow(r) { this._reihen.push(r); }
    removeRow(r) { this._reihen = this._reihen.filter(x => x !== r); }
    removeAllRows() { this._reihen = []; }
    reload() { if (this._neuZeichnen) this._neuZeichnen(); }
    present(vollbild = false) { return tabelleZeigen(this, vollbild); }
  }

  function schriftAnwenden(e, f) {
    if (!f) return;
    Object.assign(e.style, { fontFamily: f._familie, fontWeight: f._gewicht, fontStyle: f._stil, fontSize: f.size + "px" });
  }

  function tabelleZeigen(tabelle, vollbild) {
    return new Promise(fertig => {
      const { ebene, schliessen } = ebeneOeffnen("sw-dimmer");
      const blatt = $el("div", "sw-blatt" + (vollbild ? " sw-vollbild" : ""));
      const leiste = $el("div", "sw-leiste");
      const fertigKnopf = $el("button", "sw-fertig", "Fertig");
      leiste.append(fertigKnopf);
      const liste = $el("div", "sw-liste");
      const zu = () => { schliessen(); fertig(); };
      fertigKnopf.onclick = zu;
      const zeichnen = () => {
        liste.replaceChildren();
        tabelle._reihen.forEach((reihe, index) => {
          const r = $el("div", "sw-reihe" + (reihe.isHeader ? " sw-kopf" : "") + (tabelle.showSeparators ? " sw-trenner" : ""));
          r.style.minHeight = reihe.height + "px";
          if (reihe.backgroundColor) r.style.background = farbeCss(reihe.backgroundColor);
          if (reihe.cellSpacing) r.style.gap = reihe.cellSpacing + "px";
          for (const z of reihe._zellen) {
            const c = $el("div", "sw-zelle");
            c.style.flex = `${z.widthWeight || 1} 1 0px`;
            c.style.textAlign = z._ausrichtung;
            if (z._art === "text") {
              const titel = $el("div", "sw-zelle-titel", z.title == null ? "" : String(z.title));
              schriftAnwenden(titel, z.titleFont);
              if (z.titleColor) titel.style.color = farbeCss(z.titleColor);
              c.append(titel);
              if (z.subtitle) {
                const unter = $el("div", "sw-zelle-unter", String(z.subtitle));
                schriftAnwenden(unter, z.subtitleFont);
                if (z.subtitleColor) unter.style.color = farbeCss(z.subtitleColor);
                c.append(unter);
              }
            } else if (z._art === "image" || z._art === "imageURL") {
              const img = $el("img", "sw-zelle-bild");
              img.src = z._art === "image" ? (z.image && z.image._src) : umleiten(z.imageURL);
              c.append(img);
            } else if (z._art === "button") {
              const k = $el("button", "sw-zelle-knopf", z.title);
              k.onclick = e => { e.stopPropagation(); if (z.onTap) z.onTap(); if (z.dismissOnTap) zu(); };
              c.append(k);
            }
            r.append(c);
          }
          if (reihe.onSelect && !reihe.isHeader) {
            r.classList.add("sw-waehlbar");
            r.onclick = () => { reihe.onSelect(index); if (reihe.dismissOnSelect) zu(); };
          }
          liste.append(r);
        });
      };
      tabelle._neuZeichnen = zeichnen;
      zeichnen();
      blatt.append(leiste, liste);
      ebene.append(blatt);
    });
  }

  class WebView {
    constructor() { this._url = null; this._html = null; this._skripte = []; this._frame = null; this.shouldAllowRequest = null; }
    async loadURL(u) { this._url = umleiten(u); }
    async loadHTML(html) { this._html = html; }
    async loadFile() { throw new Error("WebView.loadFile wird in der Vorschau nicht unterstützt"); }
    // Vor dem Anzeigen werden Skripte gesammelt und nach dem Laden der Seite ausgeführt
    async evaluateJavaScript(js) {
      if (this._frame && this._frame.contentWindow) return this._frame.contentWindow.eval(js);
      this._skripte.push(js);
      return null;
    }
    async getHTML() { return ""; }
    async waitForLoad() {}
    present(vollbild = false) { return webansichtZeigen(this, vollbild); }
    static async loadURL(u, groesse, vollbild) { const w = new WebView(); await w.loadURL(u); return w.present(vollbild); }
    static async loadHTML(h, basis, groesse, vollbild) { const w = new WebView(); await w.loadHTML(h); return w.present(vollbild); }
  }

  function webansichtZeigen(w, vollbild) {
    return new Promise(fertig => {
      const { ebene, schliessen } = ebeneOeffnen("sw-dimmer sw-web-ebene");
      const rahmen = $el("div", "sw-web" + (vollbild ? " sw-vollbild" : ""));
      const leiste = $el("div", "sw-leiste");
      const knopf = $el("button", "sw-fertig", "Schließen");
      leiste.append(knopf, $el("span", "sw-adresse", w._url || ""));
      const frame = $el("iframe", "sw-frame");
      w._frame = frame;
      frame.addEventListener("load", () => {
        const doc = frame.contentDocument;
        for (const js of w._skripte.splice(0)) {
          try { frame.contentWindow.eval(js); } catch (e) { console.warn("evaluateJavaScript:", e); }
        }
        if (!doc) return;
        // Links prüfen wie WebView.shouldAllowRequest in Scriptable
        doc.addEventListener("click", e => {
          const a = e.target.closest && e.target.closest("a[href]");
          if (!a) return;
          const ziel = new URL(a.getAttribute("href"), doc.baseURI).href;
          const erlaubt = w.shouldAllowRequest ? w.shouldAllowRequest({ url: ziel, method: "GET" }) !== false : true;
          if (!erlaubt || ziel.startsWith("scriptable:")) e.preventDefault();
        }, true);
      });
      if (w._html !== null) frame.srcdoc = w._html; else frame.src = w._url;
      knopf.onclick = () => { w._frame = null; schliessen(); fertig(); };
      rahmen.append(leiste, frame);
      ebene.append(rahmen);
    });
  }

  function widgetZeigen(widget, familie) {
    return new Promise(fertig => {
      const { ebene, schliessen } = ebeneOeffnen("sw-dimmer sw-widget-ebene");
      const el = zeichneWidget(widget, familie, umgebung.widgetGroessen[familie] || umgebung.widgetGroessen.medium);
      const knopf = $el("button", "sw-fertig", "Schließen");
      knopf.onclick = () => { schliessen(); fertig(); };
      ebene.append(el, knopf);
      textAnpassen(el);
    });
  }

  // ── Kleinere APIs ───────────────────────────────────────────
  const Device = {
    screenSize: () => new Size(umgebung.bildschirm[0], umgebung.bildschirm[1]),
    screenResolution: () => new Size(umgebung.bildschirm[0] * 2, umgebung.bildschirm[1] * 2),
    screenScale: () => 2,
    isPad: () => true, isPhone: () => false, model: () => "iPad", name: () => "iPad (Vorschau)",
    systemName: () => "iPadOS", systemVersion: () => "18.0",
    isUsingDarkAppearance: () => umgebung.thema === "dunkel",
    locale: () => "de_DE", language: () => "de", preferredLanguages: () => ["de-DE"],
    batteryLevel: () => 0.8, isCharging: () => false,
    isInPortrait: () => false, isInLandscapeLeft: () => true, isInLandscapeRight: () => false,
    volume: () => 0.5, setScreenBrightness: () => {}, screenBrightness: () => 0.8,
  };

  const Location = {
    setAccuracyToBest() {}, setAccuracyToTenMeters() {}, setAccuracyToHundredMeters() {},
    setAccuracyToKilometer() {}, setAccuracyToThreeKilometers() {},
    current() {
      return new Promise((ok, fehler) => {
        if (!navigator.geolocation) return fehler(new Error("Standort im Browser nicht verfügbar"));
        navigator.geolocation.getCurrentPosition(
          p => ok({ latitude: p.coords.latitude, longitude: p.coords.longitude, altitude: p.coords.altitude || 0, horizontalAccuracy: p.coords.accuracy, verticalAccuracy: 0 }),
          e => fehler(new Error(`Standort: ${e.message}`)),
          { timeout: 10000 });
      });
    },
    async reverseGeocode() { return []; },
  };

  const Safari = {
    open(u) { window.open(umleiten(u), "_blank", "noopener"); },
    openInApp(u, vollbild) { const w = new WebView(); w._url = umleiten(u); return w.present(vollbild); },
  };

  function hinweisZeigen(text) {
    const t = $el("div", "sw-toast", text);
    document.body.append(t);
    setTimeout(() => t.remove(), 3500);
  }

  class Notification {
    constructor() { this.title = ""; this.subtitle = ""; this.body = ""; this.identifier = ""; this.sound = null; this.openURL = null; this.userInfo = {}; }
    async schedule() { hinweisZeigen(`🔔 ${this.title}${this.body ? " – " + this.body : ""}`); }
    async remove() {}
    setTriggerDate() {} setDailyTrigger() {} setWeeklyTrigger() {}
    addAction() {}
    static async allPending() { return []; }
    static async allDelivered() { return []; }
    static async removeAllPending() {}
    static async removeAllDelivered() {}
    static async removePending() {}
    static async removeDelivered() {}
    static resetCurrent() {}
  }

  // Fotomediathek/Kamera → Dateiauswahl des Browsers
  function bildWaehlen() {
    return new Promise((ok, fehler) => {
      const eingabe = document.createElement("input");
      eingabe.type = "file"; eingabe.accept = "image/*";
      eingabe.addEventListener("change", async () => {
        const datei = eingabe.files && eingabe.files[0];
        if (!datei) return fehler(new Error("Abgebrochen"));
        try { ok(await bildAusBlob(datei)); } catch (e) { fehler(e); }
      });
      eingabe.addEventListener("cancel", () => fehler(new Error("Abgebrochen")));
      eingabe.click();
    });
  }
  const Photos = {
    fromLibrary: bildWaehlen,
    fromCamera: bildWaehlen,
    latestPhoto: () => Promise.reject(new Error("In der Vorschau nicht verfügbar")),
    latestPhotos: () => Promise.reject(new Error("In der Vorschau nicht verfügbar")),
    removeLatestPhoto: () => {}, removeLatestPhotos: () => {},
    latestScreenshot: () => Promise.reject(new Error("In der Vorschau nicht verfügbar")),
    save: () => {},
  };

  const schluesselbund = new Map();
  const Keychain = {
    contains: k => schluesselbund.has(k), get: k => schluesselbund.get(k),
    set: (k, v) => { schluesselbund.set(k, v); }, remove: k => { schluesselbund.delete(k); },
  };
  const Pasteboard = {
    copy(t) { if (navigator.clipboard) navigator.clipboard.writeText(String(t)).catch(() => {}); },
    copyString(t) { this.copy(t); }, paste: () => "", pasteString: () => "",
  };
  const QuickLook = { async present(x) { console.log("QuickLook:", x); } };
  const URLScheme = {
    forRunningScript: () => `scriptable:///run/${encodeURIComponent(umgebung.skriptName)}`,
    allParameters: () => ({}), parameter: () => null,
  };
  class Timer {
    constructor() { this.timeInterval = 0; this.repeats = false; this._id = null; }
    schedule(fn) { this._id = (this.repeats ? setInterval : setTimeout)(() => fn(this), this.timeInterval); }
    invalidate() { clearTimeout(this._id); clearInterval(this._id); }
    static schedule(ms, wiederholen, fn) { const t = new Timer(); t.timeInterval = ms; t.repeats = wiederholen; t.schedule(fn); return t; }
  }

  const API = {
    Alert, Color, Data, Device, DrawContext, FileManager, Font, Image, Keychain, LinearGradient, ListWidget,
    Location, Notification, Pasteboard, Path, Photos, Point, QuickLook, Rect, Request, Safari, Size, Timer,
    UITable, UITableCell, UITableRow, URLScheme, WebView, WidgetDate, WidgetImage, WidgetSpacer, WidgetStack, WidgetText,
  };

  // ── Skript ausführen ────────────────────────────────────────
  const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

  async function ausfuehren(code, { modus = "widget", familie = "medium", parameter = null, query = {} } = {}) {
    const lauf = { widget: null };
    const imWidget = modus === "widget";
    const config = {
      runsInWidget: imWidget, runsInApp: !imWidget, runsInActionExtension: false, runsWithSiri: false,
      runsInNotification: false, runsFromHomeScreen: false,
      runsInAccessoryWidget: imWidget && String(familie).startsWith("accessory"),
      widgetFamily: imWidget ? familie : null,
    };
    const args = {
      widgetParameter: imWidget ? parameter : null, queryParameters: query || {}, shortcutParameter: null,
      notification: null, plainTexts: [], urls: [], fileURLs: [], images: [], length: 0, all: [],
    };
    const Script = {
      name: () => umgebung.skriptName,
      setWidget: w => { lauf.widget = w; },
      complete: () => {},
      setShortcutOutput: () => {},
    };
    const globale = {
      ...API, config, args, Script, module: { exports: {} },
      importModule: () => { throw new Error("importModule wird in der Vorschau nicht unterstützt"); },
    };
    const namen = Object.keys(globale);
    const fn = new AsyncFunction(...namen, `${code}\n//# sourceURL=${umgebung.skriptName}.js`);
    await fn(...namen.map(n => globale[n]));
    return lauf.widget;
  }

  // ── Styles ──────────────────────────────────────────────────
  const stil = document.createElement("style");
  stil.textContent = `
    .sw-widget { position: relative; box-sizing: border-box; display: flex; flex-direction: column; justify-content: center;
      align-items: flex-start; overflow: hidden; flex: none; -webkit-font-smoothing: antialiased; }
    .sw-widget * { box-sizing: border-box; }
    .sw-stack { display: flex; min-width: 0; min-height: 0; max-width: 100%; }
    .sw-spacer { min-width: 0; min-height: 0; }
    .sw-text { line-height: 1.2; white-space: pre-wrap; overflow-wrap: break-word; min-width: 0; flex: 0 1 auto; max-width: 100%; }
    .sw-einzeilig { white-space: pre; overflow: hidden; text-overflow: ellipsis; }
    .sw-mehrzeilig { display: -webkit-box; -webkit-box-orient: vertical; overflow: hidden; }
    .sw-bild { display: block; flex: 0 1 auto; }
    .sw-klickbar { cursor: pointer; }
    .sw-ebene { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; animation: sw-ein .18s ease;
      font: 15px/1.35 -apple-system, "Segoe UI", system-ui, sans-serif; color: #111; }
    .sw-dimmer { background: rgba(0,0,0,.35); -webkit-backdrop-filter: blur(3px); backdrop-filter: blur(3px); }
    @keyframes sw-ein { from { opacity: 0; } }
    .sw-alert { width: 290px; background: rgba(246,246,246,.97); border-radius: 14px; overflow: hidden; text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,.35); }
    .sw-alert-titel { font-weight: 600; font-size: 17px; padding: 18px 16px 4px; }
    .sw-alert-text { font-size: 13px; padding: 2px 16px 16px; white-space: pre-wrap; }
    .sw-alert-feld { width: calc(100% - 32px); margin: 0 16px 14px; padding: 7px 8px; border: 1px solid #ccc; border-radius: 7px; font: inherit; }
    .sw-alert-knoepfe { display: flex; flex-direction: column; }
    .sw-alert-knopf { border: 0; border-top: 1px solid rgba(0,0,0,.12); background: none; padding: 12px; font: inherit;
      font-size: 17px; color: #0a7aff; cursor: pointer; }
    .sw-alert-knopf:hover { background: rgba(0,0,0,.05); }
    .sw-fett { font-weight: 600; }
    .sw-rot { color: #ff3b30; }
    .sw-blatt { width: min(560px, 92vw); max-height: 86vh; background: #f2f2f7; border-radius: 14px; overflow: hidden;
      display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.35); }
    .sw-vollbild { width: 100vw; height: 100vh; max-height: none; border-radius: 0; }
    .sw-leiste { display: flex; align-items: center; gap: 12px; padding: 10px 14px; background: rgba(249,249,249,.96);
      border-bottom: 1px solid rgba(0,0,0,.1); }
    .sw-fertig { border: 0; background: none; color: #0a7aff; font-family: inherit; font-size: 16px; font-weight: 600; cursor: pointer; padding: 6px 4px; }
    .sw-adresse { font-size: 12px; color: #777; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .sw-liste { overflow: auto; background: #fff; }
    .sw-reihe { display: flex; align-items: center; padding: 6px 16px; gap: 8px; }
    .sw-trenner { border-bottom: 1px solid rgba(0,0,0,.08); }
    .sw-kopf { background: #f2f2f7; }
    .sw-kopf .sw-zelle-titel { font-weight: 600; }
    .sw-waehlbar { cursor: pointer; }
    .sw-waehlbar:hover { background: #f4f4f8; }
    .sw-zelle { min-width: 0; }
    .sw-zelle-unter { font-size: 13px; color: #8e8e93; }
    .sw-zelle-bild { max-width: 100%; max-height: 44px; }
    .sw-zelle-knopf { border: 0; background: none; color: #0a7aff; font: inherit; cursor: pointer; }
    .sw-web { width: min(1024px, 94vw); height: min(768px, 90vh); background: #000; border-radius: 12px; overflow: hidden;
      display: flex; flex-direction: column; box-shadow: 0 20px 60px rgba(0,0,0,.45); }
    .sw-web.sw-vollbild { width: 100vw; height: 100vh; border-radius: 0; }
    .sw-frame { flex: 1; border: 0; width: 100%; background: #000; }
    .sw-widget-ebene { display: flex; flex-direction: column; justify-content: center; gap: 18px; }
    .sw-widget-ebene .sw-fertig { color: #fff; }
    .sw-toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 1100; background: rgba(30,30,30,.9);
      color: #fff; padding: 10px 16px; border-radius: 10px; font: 14px system-ui, sans-serif; }
  `;
  document.head.append(stil);

  global.ScriptableShim = { umgebung, ausfuehren, zeichneWidget, textAnpassen, zuGross, speicherLeeren, API };
})(window);
