/*
 * flakons.js – stilisierte Parfümflakons als SVG.
 *
 * Flakons.svg(duft, { id, breite, hoehe }) → SVG-Text (viewBox 0 0 400 600, Boden bei y = 580)
 * Flakons.geometrie(duft) → { koerper: {x0,y0,x1,y1}, duese: {x,y}, oben }
 *
 * Gesteuert über duft.flakon (alles optional):
 *   form:    rechteck | flach | kurvig | barren | pokal | facette | zylinder
 *   breite, hoehe, radius        – Maße des Körpers in SVG-Einheiten
 *   art:     transparent | opak | milchig
 *   glas, fluessig               – Farben (#rrggbb)
 *   deckel:  zylinder | quader | kugel | flach | kuppel | medaillon | facette
 *   metall:  gold | silber | schwarz | weiss | rotgold   (Deckel und Beschläge)
 *   deckelRing                   – Metall für einen Ring am Deckel
 *   detail:  [streifen | medaillon | griechisch | y | gravur]
 *   akzent                       – Farbe für Streifen/Medaillon/Gravur
 *
 * Für die Animation gibt es Gruppen mit festen ids: <id>-ganz (Wackeln), <id>-kopf (Drücken),
 * <id>-schimmer (Lichtband) und den Punkt <id>-duese (Austritt des Sprühnebels).
 */
(function (global) {
  "use strict";

  const BODEN = 580, MITTE = 200;

  const METALLE = {
    gold:    ["#5a3f15", "#e6c987", "#a07733", "#fff2cc", "#b08740", "#4e3612"],
    silber:  ["#454a51", "#eceff3", "#8f97a1", "#ffffff", "#a2a9b2", "#3f444b"],
    schwarz: ["#020202", "#3d3d42", "#0f0f11", "#66666c", "#141416", "#020202"],
    weiss:   ["#a9a49c", "#fdfbf8", "#d8d3cb", "#ffffff", "#d2cdc5", "#9d988f"],
    rotgold: ["#5c3020", "#f3c3a6", "#ad674a", "#ffe8d9", "#b46f4d", "#552b1c"],
  };
  const METALL_STOPPS = [0, 0.17, 0.38, 0.55, 0.74, 1];

  // ── Farbe ──────────────────────────────────────────────────
  function rgb(hex) {
    let h = String(hex || "").replace("#", "");
    if (h.length === 3) h = [...h].map(z => z + z).join("");
    const n = parseInt(h, 16);
    return isNaN(n) ? [128, 128, 128] : [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  }
  function mischen(a, b, t) {
    const A = rgb(a), B = rgb(b);
    return "#" + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, "0")).join("");
  }
  function helligkeit(hex) {
    const [r, g, b] = rgb(hex);
    return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  }
  // Metallverlauf aus einer beliebigen Farbe (für farbige Medaillons/Streifen)
  function farbMetall(hex) {
    return [mischen(hex, "#000", 0.6), mischen(hex, "#fff", 0.45), mischen(hex, "#000", 0.15),
      mischen(hex, "#fff", 0.75), hex, mischen(hex, "#000", 0.62)];
  }
  const metallVon = name => METALLE[name] || (/^#/.test(name || "") ? farbMetall(name) : METALLE.silber);
  const n = v => Math.round(v * 100) / 100;

  // ── Definitionen (Verläufe, Clips) ──────────────────────────
  function neueDefs(id) {
    let zaehler = 0;
    const teile = [];
    const stoppsSvg = stopps => stopps.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join("");
    return {
      linear(stopps, x1 = 0, y1 = 0, x2 = 1, y2 = 0) {
        const gid = `${id}-v${zaehler++}`;
        teile.push(`<linearGradient id="${gid}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stoppsSvg(stopps)}</linearGradient>`);
        return `url(#${gid})`;
      },
      radial(stopps, cx = 0.5, cy = 0.5, r = 0.5) {
        const gid = `${id}-r${zaehler++}`;
        teile.push(`<radialGradient id="${gid}" cx="${cx}" cy="${cy}" r="${r}">${stoppsSvg(stopps)}</radialGradient>`);
        return `url(#${gid})`;
      },
      clip(pfad) {
        const cid = `${id}-c${zaehler++}`;
        teile.push(`<clipPath id="${cid}"><path d="${pfad}"/></clipPath>`);
        return cid;
      },
      markup() { return `<defs>${teile.join("")}</defs>`; },
    };
  }
  const metallVerlauf = (d, M, x1 = 0, y1 = 0, x2 = 1, y2 = 0) => d.linear(M.map((c, i) => [METALL_STOPPS[i], c]), x1, y1, x2, y2);

  function rundRechteck(x0, y0, x1, y1, ro, ru = ro) {
    return `M${n(x0 + ro)} ${n(y0)}H${n(x1 - ro)}A${ro} ${ro} 0 0 1 ${n(x1)} ${n(y0 + ro)}V${n(y1 - ru)}` +
      `A${ru} ${ru} 0 0 1 ${n(x1 - ru)} ${n(y1)}H${n(x0 + ru)}A${ru} ${ru} 0 0 1 ${n(x0)} ${n(y1 - ru)}` +
      `V${n(y0 + ro)}A${ro} ${ro} 0 0 1 ${n(x0 + ro)} ${n(y0)}Z`;
  }

  // ── Glaskörper mit Flüssigkeit, Schattierung und Glanzlichtern ──
  function glasKoerper(d, id, pfad, box, f) {
    const { x0, y0, x1, y1 } = box, w = x1 - x0, h = y1 - y0;
    const clip = d.clip(pfad);
    const glas = f.glas;
    const hellesGlas = helligkeit(glas) > 0.7;
    const s = [];

    if (f.art === "opak") {
      const k = hellesGlas ? 0.22 : 0.6;
      s.push(`<path d="${pfad}" fill="${d.linear([[0, mischen(glas, "#000", k)], [0.16, glas], [0.34, mischen(glas, "#fff", hellesGlas ? 0.6 : 0.22)],
        [0.52, glas], [0.82, mischen(glas, "#000", k * 0.45)], [1, mischen(glas, "#000", k)]])}"/>`);
      s.push(`<path d="${pfad}" fill="${d.linear([[0, "#fff", 0.16], [0.28, "#fff", 0], [0.78, "#000", 0], [1, "#000", 0.22]], 0, 0, 0, 1)}"/>`);
    } else if (f.art === "milchig") {
      s.push(`<path d="${pfad}" fill="${d.linear([[0, mischen(glas, "#000", 0.2)], [0.18, glas], [0.42, mischen(glas, "#fff", 0.5)],
        [0.68, glas], [1, mischen(glas, "#000", 0.24)]])}" fill-opacity=".96"/>`);
      s.push(`<path d="${pfad}" fill="${d.radial([[0, "#fff", 0.6], [1, "#fff", 0]], 0.38, 0.32, 0.62)}"/>`);
      if (f.fluessig) {
        const spiegel = y0 + h * (f.fuellung ?? 0.2);
        s.push(`<g clip-path="url(#${clip})"><rect x="${n(x0)}" y="${n(spiegel)}" width="${n(w)}" height="${n(y1 - spiegel)}" fill="${f.fluessig}" opacity=".18"/></g>`);
      }
    } else {
      const fl = f.fluessig || glas;
      const spiegel = y0 + h * (f.fuellung ?? 0.17);
      const wand = Math.max(6, w * 0.035), boden = Math.max(16, h * 0.075);
      s.push(`<path d="${pfad}" fill="${glas}" fill-opacity=".24"/>`);
      s.push(`<g clip-path="url(#${clip})">`);
      const fx = x0 + wand, fw = w - 2 * wand, fh = y1 - boden - spiegel;
      s.push(`<rect x="${n(fx)}" y="${n(spiegel)}" width="${n(fw)}" height="${n(fh)}" fill="${d.linear([[0, mischen(fl, "#fff", 0.25), 0.9], [0.55, fl, 0.95], [1, mischen(fl, "#000", 0.38), 0.97]], 0, 0, 0, 1)}"/>`);
      s.push(`<rect x="${n(fx)}" y="${n(spiegel)}" width="${n(fw)}" height="${n(fh)}" fill="${d.linear([[0, "#000", 0.38], [0.22, "#000", 0], [0.7, "#000", 0], [1, "#000", 0.42]])}"/>`);
      s.push(`<rect x="${n(fx)}" y="${n(spiegel + 1.5)}" width="${n(fw)}" height="${n(h * 0.06)}" fill="${d.linear([[0, "#fff", 0.3], [1, "#fff", 0]], 0, 0, 0, 1)}"/>`);
      s.push(`<rect x="${n(fx)}" y="${n(spiegel - 1.4)}" width="${n(fw)}" height="2.8" fill="#fff" opacity=".6"/>`);
      // dicker Glasboden mit Lichtbrechung
      s.push(`<rect x="${n(x0)}" y="${n(y1 - boden)}" width="${n(w)}" height="${n(boden)}" fill="${d.linear([[0, mischen(glas, "#fff", 0.55), 0.6], [0.5, mischen(fl, "#fff", 0.2), 0.45], [1, glas, 0.4]], 0, 0, 0, 1)}"/>`);
      s.push(`<rect x="${n(x0)}" y="${n(y1 - boden)}" width="${n(w)}" height="1.5" fill="#fff" opacity=".5"/>`);
      // Glaswand: helle Innenkante
      s.push(`<path d="${pfad}" fill="none" stroke="${mischen(glas, "#fff", 0.65)}" stroke-opacity=".38" stroke-width="${n(wand * 2)}"/>`);
      s.push(`</g>`);
    }

    // Kanten dunkler – gibt dem Körper Volumen
    s.push(`<path d="${pfad}" fill="${d.linear([[0, "#000", 0.3], [0.1, "#000", 0], [0.88, "#000", 0], [1, "#000", 0.36]])}"/>`);

    // Glanzlichter und Schimmerband
    s.push(`<g clip-path="url(#${clip})">`);
    s.push(`<rect x="${n(x0 + w * 0.085)}" y="${n(y0 + h * 0.05)}" width="${n(w * 0.075)}" height="${n(h * 0.86)}" rx="${n(w * 0.037)}" fill="${d.linear([[0, "#fff", 0], [0.1, "#fff", 0.62], [0.75, "#fff", 0.28], [1, "#fff", 0]], 0, 0, 0, 1)}"/>`);
    s.push(`<rect x="${n(x0 + w * 0.2)}" y="${n(y0 + h * 0.07)}" width="${n(w * 0.016)}" height="${n(h * 0.62)}" rx="2" fill="#fff" opacity=".22"/>`);
    s.push(`<rect x="${n(x1 - w * 0.08)}" y="${n(y0 + h * 0.08)}" width="${n(w * 0.022)}" height="${n(h * 0.8)}" rx="2" fill="${d.linear([[0, "#fff", 0], [0.2, "#fff", 0.45], [1, "#fff", 0.1]], 0, 0, 0, 1)}"/>`);
    s.push(`<path d="M${n(x0)} ${n(y0 + h * 0.58)}L${n(x1)} ${n(y0 + h * 0.26)}L${n(x1)} ${n(y0 + h * 0.4)}L${n(x0)} ${n(y0 + h * 0.72)}Z" fill="#fff" opacity=".055"/>`);
    s.push(`<path d="M${n(x0)} ${n(y0)}H${n(x1)}V${n(y0 + h * 0.06)}H${n(x0)}Z" fill="${d.linear([[0, "#fff", 0.28], [1, "#fff", 0]], 0, 0, 0, 1)}"/>`);
    const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
    s.push(`<g id="${id}-schimmer" transform="translate(${n(-w * 1.7)} 0)"><rect x="${n(mx - w * 0.12)}" y="${n(y0 - h * 0.4)}" width="${n(w * 0.24)}" height="${n(h * 1.8)}" fill="${d.linear([[0, "#fff", 0], [0.5, "#fff", 0.55], [1, "#fff", 0]])}" transform="rotate(18 ${n(mx)} ${n(my)})"/></g>`);
    s.push(`</g>`);

    s.push(`<path d="${pfad}" fill="none" stroke="#fff" stroke-opacity="${f.art === "opak" ? 0.2 : 0.5}" stroke-width="1.5"/>`);
    return { markup: s.join(""), clip };
  }

  // ── Verzierungen auf dem Körper ─────────────────────────────
  function rosette(cx, cy, r, farbe) {
    let s = "";
    for (let i = 0; i < 8; i++) {
      s += `<ellipse cx="${n(cx)}" cy="${n(cy - r * 0.5)}" rx="${n(r * 0.17)}" ry="${n(r * 0.5)}" fill="${farbe}" opacity=".5" transform="rotate(${i * 45} ${n(cx)} ${n(cy)})"/>`;
    }
    return s + `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.24)}" fill="${farbe}" opacity=".6"/>`;
  }

  function details(d, f, box, clip) {
    const { x0, y0, x1, y1 } = box, w = x1 - x0, h = y1 - y0, cx = (x0 + x1) / 2;
    const M = f.akzent ? farbMetall(f.akzent) : metallVon(f.metall);
    const s = [];
    for (const art of [].concat(f.detail || [])) {
      if (art === "streifen") {
        const y = y0 + h * 0.4, sh = Math.max(7, h * 0.028);
        s.push(`<g clip-path="url(#${clip})"><rect x="${n(x0)}" y="${n(y)}" width="${n(w)}" height="${n(sh)}" fill="${d.linear([[0, M[5]], [0.25, M[4]], [0.45, M[1]], [0.7, M[4]], [1, M[5]]])}"/>` +
          `<rect x="${n(x0)}" y="${n(y)}" width="${n(w)}" height="1.2" fill="#fff" opacity=".4"/></g>`);
      }
      if (art === "medaillon") {
        const cy = y0 + h * 0.37, r = w * 0.16;
        s.push(`<circle cx="${n(cx)}" cy="${n(cy + 2)}" r="${n(r + 2)}" fill="#000" opacity=".3"/>`);
        s.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}" fill="${metallVerlauf(d, M, 0, 0, 1, 1)}"/>`);
        s.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.8)}" fill="none" stroke="${M[0]}" stroke-opacity=".55" stroke-width="1.4"/>`);
        s.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(r * 0.86)}" fill="none" stroke="${M[3]}" stroke-opacity=".6" stroke-width=".8"/>`);
        s.push(rosette(cx, cy, r * 0.6, M[0]));
      }
      if (art === "griechisch") {
        const bh = Math.max(14, h * 0.06), yt = y1 - h * 0.17, yb = yt + bh, zelle = bh * 0.95;
        let muster = "";
        for (let x = x0 + 4; x < x1 - zelle * 0.6; x += zelle) {
          muster += `M${n(x)} ${n(yb - bh * 0.18)}V${n(yt + bh * 0.18)}H${n(x + zelle * 0.72)}V${n(yb - bh * 0.42)}H${n(x + zelle * 0.32)}V${n(yt + bh * 0.48)}`;
        }
        s.push(`<g clip-path="url(#${clip})">` +
          `<rect x="${n(x0)}" y="${n(yt)}" width="${n(w)}" height="${n(bh)}" fill="${metallVerlauf(d, M)}" opacity=".95"/>` +
          `<path d="${muster}" fill="none" stroke="${M[0]}" stroke-width="${n(bh * 0.1)}" stroke-opacity=".8"/>` +
          `<rect x="${n(x0)}" y="${n(yt)}" width="${n(w)}" height="1.2" fill="#fff" opacity=".55"/></g>`);
      }
      if (art === "y") {
        const oben = y0 + h * 0.2, gabel = y0 + h * 0.42, unten = y0 + h * 0.72, arm = w * 0.22, sw = w * 0.05;
        const pfad = `M${n(cx - arm)} ${n(oben)}L${n(cx)} ${n(gabel)}L${n(cx + arm)} ${n(oben)}M${n(cx)} ${n(gabel)}V${n(unten)}`;
        s.push(`<path d="${pfad}" fill="none" stroke="#000" stroke-opacity=".4" stroke-width="${n(sw)}" transform="translate(1.5 2)"/>`);
        s.push(`<path d="${pfad}" fill="none" stroke="${d.linear([[0, M[2]], [0.5, M[3]], [1, M[4]]])}" stroke-width="${n(sw)}"/>`);
      }
      if (art === "gravur") {
        const ix = x0 + w * 0.16, iy = y0 + h * 0.3, iw = w * 0.68, ih = h * 0.32;
        s.push(`<rect x="${n(ix)}" y="${n(iy)}" width="${n(iw)}" height="${n(ih)}" fill="none" stroke="${M[2]}" stroke-opacity=".7" stroke-width="1.2"/>`);
        s.push(`<rect x="${n(ix + 5)}" y="${n(iy + 5)}" width="${n(iw - 10)}" height="${n(ih - 10)}" fill="none" stroke="${M[2]}" stroke-opacity=".45" stroke-width=".7"/>`);
        [[0.4, 0.5], [0.55, 0.34]].forEach(([py, pb]) => {
          s.push(`<rect x="${n(cx - iw * pb / 2)}" y="${n(iy + ih * py)}" width="${n(iw * pb)}" height="${n(Math.max(3, ih * 0.05))}" rx="1.5" fill="${M[2]}" opacity=".65"/>`);
        });
      }
    }
    return s.join("");
  }

  // ── Hals & Deckel ───────────────────────────────────────────
  function hals(d, f, oben) {
    const M = metallVon(f.metall);
    const s = `<rect x="${MITTE - 24}" y="${n(oben - 10)}" width="48" height="11" fill="${d.linear([[0, M[5]], [0.3, M[2]], [0.55, M[1]], [1, M[5]]])}"/>` +
      `<rect x="${MITTE - 32}" y="${n(oben - 22)}" width="64" height="13" rx="2" fill="${metallVerlauf(d, M)}"/>` +
      `<rect x="${MITTE - 32}" y="${n(oben - 22)}" width="64" height="2" fill="#fff" opacity=".5"/>`;
    return { markup: s, oben: oben - 22 };
  }

  function deckel(d, f, unten) {
    const M = metallVon(f.metall), cx = MITTE, typ = f.deckel || "zylinder";
    const s = [];
    let w, h, duese;
    const ring = (y, breite) => {
      if (!f.deckelRing) return;
      const R = metallVon(f.deckelRing);
      s.push(`<rect x="${n(cx - breite / 2)}" y="${n(y - 11)}" width="${n(breite)}" height="11" fill="${metallVerlauf(d, R)}"/>`);
      s.push(`<rect x="${n(cx - breite / 2)}" y="${n(y - 11)}" width="${n(breite)}" height="1.4" fill="#fff" opacity=".55"/>`);
    };
    if (typ === "kugel") {
      const r = f.deckelBreite ? f.deckelBreite / 2 : 44, cy = unten - r * 0.96;
      s.push(`<circle cx="${cx}" cy="${n(cy)}" r="${r}" fill="${d.radial([[0, M[3]], [0.35, M[1]], [0.75, M[2]], [1, M[0]]], 0.36, 0.3, 0.75)}"/>`);
      s.push(`<ellipse cx="${n(cx - r * 0.32)}" cy="${n(cy - r * 0.38)}" rx="${n(r * 0.28)}" ry="${n(r * 0.16)}" fill="#fff" opacity=".55" transform="rotate(-30 ${n(cx - r * 0.32)} ${n(cy - r * 0.38)})"/>`);
      w = 2 * r; h = 2 * r; duese = { x: cx + r * 0.97, y: cy - r * 0.15 };
    } else if (typ === "quader" || typ === "flach") {
      w = f.deckelBreite ?? (typ === "flach" ? 140 : 90);
      h = f.deckelHoehe ?? (typ === "flach" ? 40 : 72);
      const t = Math.min(14, h * 0.2), x0 = cx - w / 2, y0 = unten - h;
      s.push(`<path d="M${n(x0)} ${n(y0 + t)}L${n(x0 + t)} ${n(y0)}H${n(x0 + w + t * 0.2)}L${n(x0 + w)} ${n(y0 + t)}Z" fill="${d.linear([[0, M[1]], [0.6, M[3]], [1, M[2]]])}"/>`);
      s.push(`<rect x="${n(x0)}" y="${n(y0 + t)}" width="${n(w)}" height="${n(h - t)}" fill="${metallVerlauf(d, M)}"/>`);
      s.push(`<rect x="${n(x0)}" y="${n(y0 + t)}" width="${n(w)}" height="${n(h - t)}" fill="${d.linear([[0, "#fff", 0.12], [0.5, "#fff", 0], [1, "#000", 0.25]], 0, 0, 0, 1)}"/>`);
      s.push(`<rect x="${n(x0)}" y="${n(y0 + t)}" width="${n(w)}" height="1.4" fill="#fff" opacity=".6"/>`);
      ring(unten, w);
      duese = { x: x0 + w, y: y0 + t + (h - t) * 0.42 };
    } else if (typ === "kuppel") {
      w = f.deckelBreite ?? 84; h = f.deckelHoehe ?? 92;
      const x0 = cx - w / 2, y0 = unten - h;
      const pfad = `M${n(x0)} ${n(unten)}V${n(y0 + h * 0.48)}C${n(x0)} ${n(y0 + h * 0.08)} ${n(cx - w * 0.2)} ${n(y0)} ${n(cx)} ${n(y0)}` +
        `C${n(cx + w * 0.2)} ${n(y0)} ${n(x0 + w)} ${n(y0 + h * 0.08)} ${n(x0 + w)} ${n(y0 + h * 0.48)}V${n(unten)}Z`;
      s.push(`<path d="${pfad}" fill="${metallVerlauf(d, M)}"/>`);
      s.push(`<path d="${pfad}" fill="${d.radial([[0, "#fff", 0.55], [1, "#fff", 0]], 0.35, 0.22, 0.4)}"/>`);
      s.push(`<rect x="${n(x0)}" y="${n(unten - 12)}" width="${n(w)}" height="12" fill="#000" opacity=".18"/>`);
      ring(unten, w);
      duese = { x: x0 + w, y: y0 + h * 0.55 };
    } else if (typ === "facette") {
      w = f.deckelBreite ?? 92; h = f.deckelHoehe ?? 112;
      const y0 = unten - h, p = [
        [cx - w * 0.36, unten], [cx + w * 0.36, unten], [cx + w / 2, unten - h * 0.36],
        [cx + w * 0.24, y0], [cx - w * 0.24, y0], [cx - w / 2, unten - h * 0.36]];
      const mittel = [cx, unten - h * 0.42];
      const toene = [M[2], M[4], M[3], M[1], M[0], M[2]];
      p.forEach((a, i) => {
        const b = p[(i + 1) % p.length];
        s.push(`<path d="M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}L${n(mittel[0])} ${n(mittel[1])}Z" fill="${toene[i]}"/>`);
      });
      s.push(`<path d="M${p.map(q => `${n(q[0])} ${n(q[1])}`).join("L")}Z" fill="none" stroke="${M[3]}" stroke-opacity=".6" stroke-width="1.2"/>`);
      duese = { x: cx + w / 2, y: unten - h * 0.4 };
    } else {
      // zylinder & medaillon
      w = f.deckelBreite ?? 74; h = f.deckelHoehe ?? 84;
      const x0 = cx - w / 2, y0 = unten - h;
      s.push(`<rect x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" rx="3" fill="${metallVerlauf(d, M)}"/>`);
      s.push(`<rect x="${n(x0)}" y="${n(y0)}" width="${n(w)}" height="${n(h)}" rx="3" fill="${d.linear([[0, "#fff", 0.18], [0.35, "#fff", 0], [1, "#000", 0.28]], 0, 0, 0, 1)}"/>`);
      s.push(`<ellipse cx="${cx}" cy="${n(y0 + 1)}" rx="${n(w / 2)}" ry="${n(w * 0.1)}" fill="${d.linear([[0, M[2]], [0.45, M[3]], [1, M[1]]])}"/>`);
      ring(unten, w + 2);
      if (typ === "medaillon") {
        const r = w * 0.3, cy = y0 + h * 0.46;
        s.push(`<circle cx="${cx}" cy="${n(cy)}" r="${n(r + 1.5)}" fill="#000" opacity=".25"/>`);
        s.push(`<circle cx="${cx}" cy="${n(cy)}" r="${n(r)}" fill="${metallVerlauf(d, M, 0, 0, 1, 1)}"/>`);
        s.push(rosette(cx, cy, r * 0.62, M[0]));
      }
      duese = { x: x0 + w, y: y0 + h * 0.38 };
    }
    return { markup: s.join(""), duese, hoehe: h, breite: w };
  }

  // ── Körperformen ────────────────────────────────────────────
  const FORMEN = {
    rechteck(d, id, f) {
      const w = f.breite ?? 210, h = f.hoehe ?? 300, r = f.radius ?? 16;
      const box = { x0: MITTE - w / 2, y0: BODEN - h, x1: MITTE + w / 2, y1: BODEN };
      const pfad = rundRechteck(box.x0, box.y0, box.x1, box.y1, r, Math.min(r + 6, 34));
      const glas = glasKoerper(d, id, pfad, box, f);
      return { markup: glas.markup + details(d, f, box, glas.clip), box, oben: box.y0 };
    },

    zylinder(d, id, f) {
      const w = f.breite ?? 180, h = f.hoehe ?? 300;
      const box = { x0: MITTE - w / 2, y0: BODEN - h, x1: MITTE + w / 2, y1: BODEN };
      const e = w * 0.12;
      const pfad = `M${n(box.x0)} ${n(box.y0 + e)}A${n(w / 2)} ${n(e)} 0 0 1 ${n(box.x1)} ${n(box.y0 + e)}V${n(box.y1 - e)}A${n(w / 2)} ${n(e)} 0 0 1 ${n(box.x0)} ${n(box.y1 - e)}Z`;
      const glas = glasKoerper(d, id, pfad, box, f);
      return { markup: glas.markup + details(d, f, box, glas.clip), box, oben: box.y0 + e };
    },

    flach(d, id, f) {
      const w = f.breite ?? 252, h = f.hoehe ?? 236, r = f.radius ?? 10;
      const box = { x0: MITTE - w / 2, y0: BODEN - h, x1: MITTE + w / 2, y1: BODEN };
      const glas = glasKoerper(d, id, rundRechteck(box.x0, box.y0, box.x1, box.y1, r), box, f);
      // dickes Glas: innere Fläche
      const i = 18, innen = rundRechteck(box.x0 + i, box.y0 + i, box.x1 - i, box.y1 - i, Math.max(2, r - 4));
      const extra = `<path d="${innen}" fill="${d.linear([[0, "#000", 0.08], [0.5, "#fff", 0.18], [1, "#000", 0.1]])}"/>` +
        `<path d="${innen}" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="1.2"/>` +
        `<path d="${innen}" fill="none" stroke="#000" stroke-opacity=".12" stroke-width="1" transform="translate(1.5 1.5)"/>`;
      return { markup: glas.markup + extra + details(d, f, box, glas.clip), box, oben: box.y0 };
    },

    kurvig(d, id, f) {
      const y0 = BODEN - (f.hoehe ?? 282), y1 = BODEN;
      const oben = (f.breite ?? 150) / 2, taille = oben * 0.78, unten = oben * 1.32, hh = y1 - y0;
      const L = x => n(MITTE - x), R = x => n(MITTE + x);
      const pfad = `M${L(oben - 14)} ${n(y0)}H${R(oben - 14)}Q${R(oben)} ${n(y0)} ${R(oben)} ${n(y0 + 16)}` +
        `C${R(oben)} ${n(y0 + hh * 0.22)} ${R(taille)} ${n(y0 + hh * 0.3)} ${R(taille)} ${n(y0 + hh * 0.42)}` +
        `C${R(taille)} ${n(y0 + hh * 0.6)} ${R(unten)} ${n(y1 - hh * 0.28)} ${R(unten)} ${n(y1 - 26)}` +
        `Q${R(unten)} ${n(y1)} ${R(unten - 30)} ${n(y1)}H${L(unten - 30)}Q${L(unten)} ${n(y1)} ${L(unten)} ${n(y1 - 26)}` +
        `C${L(unten)} ${n(y1 - hh * 0.28)} ${L(taille)} ${n(y0 + hh * 0.6)} ${L(taille)} ${n(y0 + hh * 0.42)}` +
        `C${L(taille)} ${n(y0 + hh * 0.3)} ${L(oben)} ${n(y0 + hh * 0.22)} ${L(oben)} ${n(y0 + 16)}Q${L(oben)} ${n(y0)} ${L(oben - 14)} ${n(y0)}Z`;
      const box = { x0: MITTE - unten, y0, x1: MITTE + unten, y1 };
      const glas = glasKoerper(d, id, pfad, box, f);
      return { markup: glas.markup + details(d, f, box, glas.clip), box, oben: y0 };
    },

    facette(d, id, f) {
      const w = f.breite ?? 220, h = f.hoehe ?? 286, c = f.radius ?? 42;
      const x0 = MITTE - w / 2, x1 = MITTE + w / 2, y0 = BODEN - h, y1 = BODEN;
      const aussen = [[x0 + c, y0], [x1 - c, y0], [x1, y0 + c], [x1, y1 - c], [x1 - c, y1], [x0 + c, y1], [x0, y1 - c], [x0, y0 + c]];
      const i = 26;
      const innen = [[x0 + c, y0 + i], [x1 - c, y0 + i], [x1 - i, y0 + c], [x1 - i, y1 - c], [x1 - c, y1 - i], [x0 + c, y1 - i], [x0 + i, y1 - c], [x0 + i, y0 + c]];
      const pfad = "M" + aussen.map(p => `${n(p[0])} ${n(p[1])}`).join("L") + "Z";
      const box = { x0, y0, x1, y1 };
      const glas = glasKoerper(d, id, pfad, box, f);
      const s = [];
      const toene = [["#fff", 0.16], ["#fff", 0.1], ["#000", 0.12], ["#000", 0.22], ["#000", 0.3], ["#000", 0.2], ["#fff", 0.04], ["#fff", 0.12]];
      aussen.forEach((a, k) => {
        const b = aussen[(k + 1) % 8], ib = innen[(k + 1) % 8], ia = innen[k];
        s.push(`<path d="M${n(a[0])} ${n(a[1])}L${n(b[0])} ${n(b[1])}L${n(ib[0])} ${n(ib[1])}L${n(ia[0])} ${n(ia[1])}Z" fill="${toene[k][0]}" opacity="${toene[k][1]}"/>`);
      });
      s.push(`<path d="M${innen.map(p => `${n(p[0])} ${n(p[1])}`).join("L")}Z" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width="1.2"/>`);
      const M = metallVon(f.metall);
      s.push(`<rect x="${n(MITTE - w * 0.28)}" y="${n(y0 + h * 0.44)}" width="${n(w * 0.56)}" height="${n(h * 0.1)}" fill="${metallVerlauf(d, M)}" opacity=".9"/>`);
      s.push(`<rect x="${n(MITTE - w * 0.28)}" y="${n(y0 + h * 0.44)}" width="${n(w * 0.56)}" height="1.2" fill="#fff" opacity=".6"/>`);
      return { markup: glas.markup + s.join("") + details(d, f, box, glas.clip), box, oben: y0 };
    },

    barren(d, id, f) {
      const w = f.breite ?? 196, h = f.hoehe ?? 300, b = 24;
      const x0 = MITTE - w / 2, x1 = MITTE + w / 2, y0 = BODEN - h, y1 = BODEN;
      const M = metallVon(f.metall || "gold");
      const poly = pts => `M${pts.map(p => `${n(p[0])} ${n(p[1])}`).join("L")}Z`;
      const s = [];
      s.push(`<path d="${poly([[x0, y0], [x1, y0], [x1 - b, y0 + b], [x0 + b, y0 + b]])}" fill="${d.linear([[0, M[3]], [1, M[1]]], 0, 0, 0, 1)}"/>`);
      s.push(`<path d="${poly([[x0, y0], [x0 + b, y0 + b], [x0 + b, y1 - b], [x0, y1]])}" fill="${d.linear([[0, M[0]], [1, M[2]]])}"/>`);
      s.push(`<path d="${poly([[x1, y0], [x1, y1], [x1 - b, y1 - b], [x1 - b, y0 + b]])}" fill="${d.linear([[0, M[4]], [1, M[5]]])}"/>`);
      s.push(`<path d="${poly([[x0, y1], [x0 + b, y1 - b], [x1 - b, y1 - b], [x1, y1]])}" fill="${d.linear([[0, M[2]], [1, M[5]]], 0, 0, 0, 1)}"/>`);
      const fx = x0 + b, fy = y0 + b, fw = w - 2 * b, fh = h - 2 * b;
      s.push(`<rect x="${n(fx)}" y="${n(fy)}" width="${n(fw)}" height="${n(fh)}" fill="${d.linear([[0, M[2]], [0.28, M[1]], [0.5, M[3]], [0.78, M[4]], [1, M[2]]])}"/>`);
      s.push(`<rect x="${n(fx)}" y="${n(fy)}" width="${n(fw)}" height="${n(fh)}" fill="${d.linear([[0, "#fff", 0.22], [0.45, "#fff", 0], [1, "#000", 0.28]], 0, 0, 0, 1)}"/>`);
      // Prägung
      const px = fx + 14, py = fy + 14, pw = fw - 28, ph = fh - 28;
      s.push(`<rect x="${n(px + 1)}" y="${n(py + 1)}" width="${n(pw)}" height="${n(ph)}" fill="none" stroke="${M[3]}" stroke-opacity=".7" stroke-width="1.3"/>`);
      s.push(`<rect x="${n(px)}" y="${n(py)}" width="${n(pw)}" height="${n(ph)}" fill="none" stroke="${M[0]}" stroke-opacity=".55" stroke-width="1.3"/>`);
      [[0.36, 0.42], [0.47, 0.6], [0.58, 0.32]].forEach(([yy, bb]) => {
        const rx = MITTE - pw * bb / 2, ry = py + ph * yy;
        s.push(`<rect x="${n(rx)}" y="${n(ry)}" width="${n(pw * bb)}" height="8" rx="4" fill="${M[0]}" opacity=".42"/>`);
        s.push(`<rect x="${n(rx)}" y="${n(ry + 7)}" width="${n(pw * bb)}" height="1.4" rx=".7" fill="${M[3]}" opacity=".7"/>`);
      });
      const kante = poly([[x0, y0], [x1, y0], [x1, y1], [x0, y1]]);
      const clip = d.clip(kante);
      const mx = MITTE, my = (y0 + y1) / 2;
      s.push(`<g clip-path="url(#${clip})"><g id="${id}-schimmer" transform="translate(${n(-w * 1.7)} 0)"><rect x="${n(mx - w * 0.12)}" y="${n(y0 - h * 0.4)}" width="${n(w * 0.24)}" height="${n(h * 1.8)}" fill="${d.linear([[0, "#fff", 0], [0.5, "#fff", 0.5], [1, "#fff", 0]])}" transform="rotate(18 ${n(mx)} ${n(my)})"/></g></g>`);
      s.push(`<path d="${kante}" fill="none" stroke="${M[5]}" stroke-opacity=".5" stroke-width="1"/>`);
      return { markup: s.join(""), box: { x0, y0, x1, y1 }, oben: y0 + 3, ohneHals: true };
    },

    pokal(d, id, f) {
      const oben = 252, rand = f.breite ? f.breite / 2 : 106, stielY = 462, stiel = 30, fussY = 512;
      const pfad = `M${n(MITTE - rand)} ${oben}H${n(MITTE + rand)}C${n(MITTE + rand - 2)} ${oben + 120} ${MITTE + stiel + 46} ${stielY - 24} ${MITTE + stiel} ${stielY}` +
        `H${MITTE - stiel}C${MITTE - stiel - 46} ${stielY - 24} ${n(MITTE - rand + 2)} ${oben + 120} ${n(MITTE - rand)} ${oben}Z`;
      const box = { x0: MITTE - rand, y0: oben, x1: MITTE + rand, y1: stielY };
      const glas = glasKoerper(d, id, pfad, box, { ...f, fuellung: f.fuellung ?? 0.22 });
      const M = metallVon(f.metall || "silber");
      const s = [glas.markup];
      // Henkel (hinter dem Glas wäre schöner, aber so bleibt es eine Gruppe)
      for (const seite of [-1, 1]) {
        const x = v => n(MITTE + seite * v);
        const henkel = `M${x(rand - 8)} ${oben + 22}C${x(rand + 52)} ${oben + 18} ${x(rand + 56)} ${oben + 120} ${x(rand - 30)} ${oben + 150}`;
        s.push(`<path d="${henkel}" fill="none" stroke="${M[0]}" stroke-width="16" stroke-linecap="round"/>`);
        s.push(`<path d="${henkel}" fill="none" stroke="${metallVerlauf(d, M, seite < 0 ? 1 : 0, 0, seite < 0 ? 0 : 1, 0)}" stroke-width="11" stroke-linecap="round"/>`);
        s.push(`<path d="${henkel}" fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="2" stroke-linecap="round" transform="translate(${seite * -2} -2)"/>`);
      }
      s.push(`<rect x="${MITTE - stiel * 0.72}" y="${stielY - 2}" width="${stiel * 1.44}" height="${fussY - stielY + 2}" fill="${metallVerlauf(d, M)}"/>`);
      s.push(`<rect x="${MITTE - stiel * 0.95}" y="${stielY + 10}" width="${stiel * 1.9}" height="9" rx="4" fill="${metallVerlauf(d, M)}"/>`);
      const fuss = `M${MITTE - 56} ${fussY}H${MITTE + 56}L${MITTE + 94} ${BODEN - 6}Q${MITTE + 96} ${BODEN} ${MITTE + 88} ${BODEN}H${MITTE - 88}Q${MITTE - 96} ${BODEN} ${MITTE - 94} ${BODEN - 6}Z`;
      s.push(`<path d="${fuss}" fill="${metallVerlauf(d, M)}"/>`);
      s.push(`<path d="${fuss}" fill="${d.linear([[0, "#fff", 0.3], [0.4, "#fff", 0], [1, "#000", 0.3]], 0, 0, 0, 1)}"/>`);
      s.push(`<ellipse cx="${MITTE}" cy="${oben}" rx="${n(rand)}" ry="8" fill="${metallVerlauf(d, M)}"/>`);
      s.push(`<ellipse cx="${MITTE}" cy="${oben - 1}" rx="${n(rand - 6)}" ry="4" fill="#fff" opacity=".35"/>`);
      return { markup: s.join(""), box: { x0: MITTE - rand - 50, y0: oben, x1: MITTE + rand + 50, y1: BODEN }, oben: oben - 2 };
    },
  };

  // ── Zusammenbau ─────────────────────────────────────────────
  function optionen(duft) {
    const f = { form: "rechteck", art: "transparent", deckel: "zylinder", metall: "silber", detail: [], ...(duft && duft.flakon) };
    f.glas = f.glas || (duft && duft.farbe) || "#b08d57";
    if (f.form === "barren" && !(duft.flakon && duft.flakon.deckel)) { f.deckel = "quader"; f.deckelBreite = 62; f.deckelHoehe = 40; }
    if (f.form === "pokal" && !(duft.flakon && duft.flakon.deckelHoehe)) { f.deckelBreite = 70; f.deckelHoehe = 50; }
    return f;
  }

  function bauen(duft, id) {
    const f = optionen(duft);
    const d = neueDefs(id);
    const koerper = (FORMEN[f.form] || FORMEN.rechteck)(d, id, f);
    let oben = koerper.oben, halsMarkup = "";
    if (!koerper.ohneHals && f.hals !== false) {
      const h = hals(d, f, oben);
      halsMarkup = h.markup;
      oben = h.oben;
    }
    const kopf = deckel(d, f, oben);
    return { d, f, koerper, halsMarkup, kopf };
  }

  function svg(duft, { id = "flakon", breite, hoehe } = {}) {
    const { d, koerper, halsMarkup, kopf } = bauen(duft, id);
    const groesse = breite ? ` width="${breite}" height="${hoehe || Math.round(breite * 1.5)}"` : "";
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"${groesse}>${d.markup()}` +
      `<g id="${id}-ganz">${koerper.markup}${halsMarkup}` +
      `<g id="${id}-kopf">${kopf.markup}<circle id="${id}-duese" cx="${n(kopf.duese.x)}" cy="${n(kopf.duese.y)}" r=".6" fill="none"/></g>` +
      `</g></svg>`;
  }

  function geometrie(duft) {
    const { koerper, kopf } = bauen(duft, "geo");
    return { koerper: koerper.box, duese: kopf.duese, oben: kopf.duese.y - kopf.hoehe * 0.6 };
  }

  global.Flakons = { svg, geometrie, METALLE, BODEN };
})(typeof window !== "undefined" ? window : globalThis);
