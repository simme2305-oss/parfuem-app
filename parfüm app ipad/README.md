# Duft des Tages – Parfüm-App fürs iPad

Ein Homescreen-Widget zeigt deinen Duft des Tages. Tippst du darauf, sprüht dein Flakon im Studiolicht,
danach erscheint ein großes Bild mit Name, Marke und Duftnoten. Den Duft wählst du selbst oder lässt ihn dir
anhand von Wetter, Jahreszeit und „länger nicht getragen“ vorschlagen – fast alles ist einstellbar.

- **Widget:** [Scriptable](https://scriptable.app) (JavaScript, `ListWidget`), weil native Widgets einen Mac bräuchten
- **Web:** reines HTML/CSS/JS ohne Framework und Build-Schritt, läuft direkt auf GitHub Pages
- **Daten:** eine JSON-Datei im Repo

## Projektstruktur

| Pfad | Inhalt |
|---|---|
| `web/index.html` | Galerie: Suche, Filter, Sortierung, Detailansicht mit Duftpyramide, Hell/Dunkel, PWA |
| `web/spray.html` | Sprüh-Animation + Vollbild, gesteuert über `?id=<duft-id>` |
| `web/einstellungen.html` | alle Einstellungen, Übertragung an Scriptable |
| `web/data/duefte.json` | deine Düfte |
| `web/images/` | Produktbilder (aus dem Bildstudio oder eigene) |
| `web/js/gemeinsam.js` | Duftfamilien, Farben, Hilfsfunktionen |
| `web/js/flakons.js` | zeichnet die stilisierten Flakons (SVG) für Animation und Bildstudio |
| `web/js/einstellungen.js` | Beschreibung aller Einstellungen + Formular |
| `web/manifest.json`, `web/sw.js`, `web/icons/` | PWA: installierbar und offline nutzbar |
| `web/preview.html`, `web/scriptable-shim.js` | PC-Vorschau des Widgets mit Scriptable-Nachbau |
| `scriptable/DuftDesTages.js` | das Scriptable-Skript (Widget, Menü, Sprühen) |
| `tools/server.py` | lokaler Entwicklungsserver (nur Python) |
| `tools/bildstudio.html` | rendert die Produktbilder und App-Icons |
| `tools/gemini-prompts.md` | Prompts für fotorealistische Bilder mit Gemini |

## Lokal starten

Im **Hauptordner** des Repos (nicht in `web/`):

```bash
python tools/server.py
```

- Galerie: <http://localhost:8000/web/>
- Einstellungen: <http://localhost:8000/web/einstellungen.html>
- Sprühen: <http://localhost:8000/web/spray.html?id=eros>
- Widget-Vorschau: <http://localhost:8000/web/preview.html>
- Bildstudio: <http://localhost:8000/tools/bildstudio.html>

Nach Änderungen an `tools/server.py` den Server neu starten (Strg + C, dann wieder starten).
Der Service Worker (Offline-Modus) ist nur auf GitHub Pages aktiv, lokal siehst du Änderungen also immer sofort.

Zum Feintunen der Animation: `spray.html?id=…&tempo=0.25` (Zeitlupe) und `spray.html?id=…&standbild=1.2`
(hält bei 1,2 s an). Zeitplan und Teilchenarten stehen oben im Skript von `spray.html` (`T`, `ART`).

## Düfte eintragen

`web/data/duefte.json` ist eine Liste, pro Duft:

| Feld | Beispiel | Hinweis |
|---|---|---|
| `id` | `"eros"` | eindeutig, nur `a–z`, `0–9`, `-` – auch der Bild-Dateiname |
| `name`, `marke` | `"Eros"`, `"Versace"` | |
| `konzentration` | `"EDT"` | `EDC`, `EDT`, `EDP`, `PARFUM`, `EXTRAIT`, `ELIXIR` |
| `duftfamilie` | `"aromatisch"` | `zitrisch`, `frisch`, `aromatisch`, `floral`, `moschus`, `holzig`, `orientalisch`, `gourmand` |
| `kopfnoten`, `herznoten`, `basisnoten` | `["Minze", "Zitrone"]` | Listen |
| `jahreszeiten` | `["herbst", "winter"]` | `frühling`, `sommer`, `herbst`, `winter` |
| `temperaturbereich` | `{ "min": 0, "max": 20 }` | °C, für den Vorschlag |
| `anlass` | `["Abend", "Date"]` | „Büro“/„Alltag“ zählen werktags, „Freizeit“/„Ausgehen“/„Date“/„Party“ … am Wochenende |
| `bild` | `"images/eros.jpg"` | relativ zu `web/` |
| `farbe` | `"#1E9E9A"` | Akzentfarbe für Widget, Animation und Galerie |
| `beschreibung` | `"Minze und grüner Apfel …"` | optional |
| `flakon` | `{ "form": "rechteck", … }` | Aussehen des gezeichneten Flakons, siehe Kopf von `web/js/flakons.js` |
| `bildFokus` | `{ "x": 0.5, "y": 0.4 }` | optional: welcher Bildausschnitt im Widget gezeigt wird |

## Bilder

Drei Wege, vom schnellsten zum echtesten:

1. **Bildstudio** (`tools/bildstudio.html`): rendert für jeden Duft ein Produktbild mit stilisiertem Flakon,
   Studiolicht und Requisiten. „Alle Bilder speichern“ legt sie nach `web/images/`. Eigene Bilder überschreibt
   das Studio nicht ungefragt (die Liste der Studio-Bilder steht in `tools/studio-bilder.json`).
2. **Gemini:** fertige Prompts pro Duft in `tools/gemini-prompts.md`. Bild als `<id>.jpg` nach `web/images/`
   legen und hochladen.
3. **Eigenes Foto in Scriptable:** Menü › „Eigenes Foto für einen Duft …“ – aus der Fotomediathek oder direkt mit
   der Kamera. Das Foto liegt in iCloud und erscheint in Widget und Sprüh-Ansicht (nicht in der Galerie).

## Auf GitHub Pages veröffentlichen

1. Neues Repository auf GitHub anlegen, z. B. `parfuem-app`.
2. Dateien hochladen:

   ```bash
   git init
   git add .
   git commit -m "Duft des Tages"
   git branch -M main
   git remote add origin https://github.com/DEIN-NAME/parfuem-app.git
   git push -u origin main
   ```

3. Auf GitHub: **Settings → Pages → Build and deployment → Source: „Deploy from a branch“**, Branch `main`,
   Ordner `/ (root)` → **Save**.
4. Nach ein bis zwei Minuten: `https://DEIN-NAME.github.io/parfuem-app/web/`.
5. In `scriptable/DuftDesTages.js` ganz oben `BASE_URL` auf diese Adresse setzen (**mit `/web/` am Ende**), pushen.

GitHub Pages ist bei kostenlosen Konten nur für öffentliche Repos verfügbar – Sammlung und Bilder sind dann
öffentlich sichtbar.

## Skript in Scriptable einrichten

1. [Scriptable](https://apps.apple.com/app/scriptable/id1405459188) aus dem App Store installieren.
2. In Scriptable oben rechts **+** tippen, oben auf den Titel tippen und das Skript **exakt `DuftDesTages`** nennen.
3. Inhalt von `scriptable/DuftDesTages.js` einfügen – am einfachsten in Safari
   `https://DEIN-NAME.github.io/parfuem-app/scriptable/DuftDesTages.js` öffnen, alles kopieren, einfügen.
4. `BASE_URL` oben im Skript prüfen.
5. Einmal mit ▶ starten. Das Menü:
   - **Duft auswählen** – Liste deiner Sammlung
   - **Vorschlagen lassen** – mit Begründung, z. B. „21 °C und sonnig: etwas Frisches“
   - **Sprühen** – Animation im Vollbild, trägt den Duft als „heute getragen“ ein
   - **Jeden Tag automatisch vorschlagen** – das Widget rechnet selbst
   - **Einstellungen …** – öffnet die Einstellungsseite direkt in Scriptable; „Speichern“ übernimmt alles
   - **Eigenes Foto für einen Duft …**
   - **Widget-Vorschau** – das Widget in jeder Größe

Zustand, Einstellungen und eigene Fotos liegen in *iCloud Drive › Scriptable › DuftDesTages-Daten*.

## Einstellungen

Auf `einstellungen.html` (oder im Skript-Menü) lässt sich fast alles anpassen:

- **Widget:** Gestaltung (*Automatisch*, *Bild vollflächig*, *Bildkarte*, *Nur Schrift*), Farbschema, Schrift
  (Didot, Bodoni, Baskerville, Cochin, Georgia, Avenir), Textgröße, Abdunklung, Überschrift, welche Angaben
  sichtbar sind, Aktualisierungs-Wunsch
- **Vorschlag:** Modus, Ort fürs Wetter, Gewichte für Temperatur/Wetter/Jahreszeit/Abwechslung/Anlass,
  Überraschung, „nie vorschlagen“
- **Sprüh-Animation:** an/aus, Tempo, Nebelmenge, Richtung, Nebelfarbe, Flakongröße, Glitzer, Geräusch, Zoom,
  welche Texte erscheinen
- **Galerie:** Farbschema, Reihenfolge, Kartengröße

Im Browser wird sofort gespeichert. **„An Scriptable übertragen“** öffnet Scriptable und übernimmt die Werte
für Widget und Animation. Unter „Sichern“ gibt es alles als Text zum Kopieren.

## Widget auf den Homescreen legen

1. Homescreen lange drücken → **Bearbeiten → Widget hinzufügen** → **Scriptable**, Größe wählen.
2. Widget antippen (im Bearbeiten-Modus) → **Script:** `DuftDesTages`, **When Interacting:** egal (das Skript
   setzt selbst, was beim Tippen passiert), **Parameter:**

| Parameter | Wirkung |
|---|---|
| *(leer)* | deine Auswahl bzw. der Tagesvorschlag (je nach Einstellung) |
| `auto` | immer der automatische Vorschlag |
| `eros` (eine `id`) | genau dieser Duft, fest |

Tippen auf das Widget öffnet kurz Scriptable und startet die Sprüh-Animation – Widgets selbst können keine
Animationen abspielen.

## Galerie als App installieren

In Safari `https://DEIN-NAME.github.io/parfuem-app/web/` öffnen → Teilen → **Zum Home-Bildschirm**.
„Als Duft des Tages“ öffnet Scriptable; zurück geht es über den Pfeil oben links in der Statusleiste.

## PC-Vorschau

`web/preview.html` führt das echte Skript im Browser aus (`web/scriptable-shim.js` baut die Scriptable-API
nach). Links stehen die Widget- und Vorschlags-Einstellungen – Änderungen wirken sofort. Oben: Parameter, Gerät,
Hell/Dunkel, Zoom, „Vorschlag berechnen“, „App-Menü öffnen“ (Menü, Listen, Einstellungsseite und Sprühen als
Dialoge). Widget antippen = Sprühen. Rot gestrichelt = Inhalt zu hoch.

> **Wichtig:** Die Vorschau ist eine Annäherung. Die iOS-Schriften werden durch Webschriften ersetzt
> (Bodoni Moda statt Didot usw.), das SwiftUI-Layout ist nur nachgebildet, und iPadOS skaliert Widgets je nach
> Homescreen-Einstellung. Das echte Aussehen musst du auf dem iPad prüfen (Menü › „Widget-Vorschau“).

## So rechnet der Vorschlag

| Kriterium | Punkte (× Gewicht aus den Einstellungen) |
|---|---|
| aktuelle Temperatur im `temperaturbereich` | +3, sonst bis −4 je nach Abstand |
| sonnig und ≥ 18 °C / Regen, Schnee, Nebel oder < 8 °C | bis +1 für frische bzw. warme Familien |
| passende Jahreszeit | +2 |
| noch nie getragen / ≥ 14 Tage / ≥ 7 Tage / gestern oder heute | +1,5 / +2 / +1 / −2 |
| Anlass passt zum Wochentag | +0,5 |
| pro Tag feste Zufallsprise | bis +0,4 × „Überraschung“ |

## Gut zu wissen

- **Aktualisierung:** iOS entscheidet, wann Widgets neu laden (meist alle 15–60 Minuten).
- **Bilder im Widget** werden 12 Stunden zwischengespeichert – ein neues Bild im Repo erscheint also nicht sofort.
- **Speicher:** Widgets haben ein Limit von etwa 30 MB; Bilder um 1500 × 2000 px sind ideal.
- **Neue Option?** `web/js/einstellungen.js` und `STANDARD_EINSTELLUNGEN` im Skript gemeinsam pflegen.
- **Service Worker:** nach Änderungen an `web/sw.js` die `VERSION` erhöhen.
