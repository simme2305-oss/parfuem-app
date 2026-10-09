# Gemini-Prompts für echte Produktbilder

So bekommst du fotorealistische Bilder deiner Parfüms für Widget, Galerie und Sprüh-Ansicht.

## Ablauf

1. Gemini öffnen (App oder gemini.google.com) und den Prompt unten kopieren.
2. **Am besten:** ein Foto deiner eigenen Flasche mit hochladen und vorne an den Prompt schreiben:
   `Use the perfume bottle from the attached photo exactly as it looks.`
   So stimmt der Flakon garantiert – Gemini kennt nicht jedes Detail jeder Flasche.
3. Bild speichern und umbenennen in die **id** des Dufts, z. B. `eros.jpg`.
4. Datei nach `web/images/` legen (alte Datei ersetzen). Hochformat 3 : 4 ist ideal, JPEG unter ca. 1 MB.
5. Ins Repo hochladen (git push oder auf github.com: *Add file › Upload files*). Fertig – Widget, Galerie
   und Sprüh-Ansicht nutzen das Bild automatisch (das Widget nach spätestens 12 Stunden Zwischenspeicher).

Sitzt die Flasche im Widget zu hoch oder zu tief, in `duefte.json` beim Duft ergänzen:
`"bildFokus": { "x": 0.5, "y": 0.4 }` (0 = oben/links, 1 = unten/rechts).

Tipp: Wenn Gemini Text oder Logos verfälscht, hänge an: `Keep all labels and logos on the bottle accurate, add no other text.`

## Grund-Prompt (für alle gleich)

Ersetze `[FLASCHE]` und `[SZENE]` durch die Zeilen aus der Liste darunter.

```
Photorealistic luxury product photograph of [FLASCHE]. The bottle stands alone on a glossy reflective surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space (only surface and reflection) for a text overlay. [SZENE]. Soft studio key light from the upper left, subtle rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising, crisp details on glass and metal. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

## Fertige Prompts pro Duft

**luna-rossa-black.jpg**
```
Photorealistic luxury product photograph of the Prada Luna Rossa Black Eau de Parfum bottle (dark black glass with the thin red Luna Rossa stripe). The bottle stands alone on a glossy reflective surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Moody dark backdrop in deep burgundy and black, faint warm amber smoke, soft bokeh. Soft studio key light from the upper left, subtle rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**one-million.jpg**
```
Photorealistic luxury product photograph of the Paco Rabanne 1 Million Eau de Toilette bottle (the gold ingot-shaped bottle). The bottle stands alone on a glossy reflective black surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Dark backdrop with warm golden bokeh, a few floating gold particles and a hint of cinnamon-colored haze. Soft studio key light from the upper left, golden rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**ana-abiyedh.jpg**
```
Photorealistic luxury product photograph of the Lattafa Ana Abiyedh Eau de Parfum bottle (white bottle). The bottle stands alone on a glossy pearl-white reflective surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Airy cream and ivory backdrop with soft white silk fabric folds and a few pearls, clean and powdery mood. Soft diffused studio light from the upper left, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**legend-spirit.jpg**
```
Photorealistic luxury product photograph of the Montblanc Legend Spirit Eau de Toilette bottle (frosted white glass with silver cap). The bottle stands alone on a wet reflective surface with a soft mirror reflection and a few water droplets, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Cool icy-blue and white backdrop with soft light ripples like sunlight through water. Bright studio key light from the upper left, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**scandal.jpg**
```
Photorealistic luxury product photograph of the Jean Paul Gaultier Scandal Eau de Parfum bottle (honey-colored liquid, gold details). The bottle stands alone on a glossy reflective surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Warm dark amber backdrop with flowing golden honey and caramel silk, a few glossy honey drops on the surface. Soft studio key light from the upper left, warm rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**invictus.jpg**
```
Photorealistic luxury product photograph of the Paco Rabanne Invictus Eau de Toilette bottle (the trophy-shaped bottle). The bottle stands alone on a wet reflective surface with a soft mirror reflection and water droplets, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Fresh sporty backdrop in steel blue and silver with a fine sea spray mist. Crisp studio key light from the upper left, cool rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**y-edp.jpg**
```
Photorealistic luxury product photograph of the Yves Saint Laurent Y Eau de Parfum bottle (dark navy glass with the engraved Y). The bottle stands alone on a glossy reflective surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Modern minimal backdrop in midnight blue and slate grey, a few blurred sage leaves and a sliced green apple in the soft background. Soft studio key light from the upper left, subtle rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**versace-pour-homme.jpg**
```
Photorealistic luxury product photograph of the Versace Pour Homme Eau de Toilette bottle. The bottle stands alone on a glossy reflective surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Bright Mediterranean backdrop in sky blue and white, blurred lemon slices and neroli blossoms. Bright studio key light from the upper left, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**sehr.jpg**
```
Photorealistic luxury product photograph of the Lattafa Sehr Eau de Parfum bottle. The bottle stands alone on a glossy reflective dark surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Opulent dark backdrop in plum, burgundy and gold, cinnamon sticks and jasmine blossoms softly blurred, warm golden bokeh. Soft studio key light from the upper left, warm rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**cool-water.jpg**
```
Photorealistic luxury product photograph of the Davidoff Cool Water Eau de Toilette bottle for men (tall blue glass bottle). The bottle stands alone on a wet reflective surface with a soft mirror reflection and water droplets, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Ocean backdrop in deep aqua blue with light caustics like sunlight under water, a few rising bubbles. Bright studio key light from the upper left, cool rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**eros.jpg**
```
Photorealistic luxury product photograph of the Versace Eros Eau de Toilette bottle (turquoise glass with gold Greek key details and Medusa head). The bottle stands alone on a glossy reflective surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Backdrop in deep turquoise and teal with blurred mint leaves and a green apple, a hint of white marble. Soft studio key light from the upper left, golden rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**eros-flame.jpg**
```
Photorealistic luxury product photograph of the Versace Eros Flame Eau de Parfum bottle (red glass with gold Greek key details and Medusa head). The bottle stands alone on a glossy reflective dark surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Dramatic dark backdrop in crimson and black with soft glowing embers and warm smoke. Soft studio key light from the upper left, fiery red rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**dylan-blue.jpg**
```
Photorealistic luxury product photograph of the Versace Pour Homme Dylan Blue Eau de Toilette bottle (deep blue glass with gold Medusa medallion). The bottle stands alone on a glossy reflective surface with a soft mirror reflection, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Backdrop in rich cobalt and navy blue with a blurred fig leaf and soft mineral textures. Soft studio key light from the upper left, subtle gold rim light, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

**eau-fraiche.jpg**
```
Photorealistic luxury product photograph of the Versace Man Eau Fraîche Eau de Toilette bottle (frosted pale green-blue glass with silver cap). The bottle stands alone on a wet reflective surface with a soft mirror reflection and water droplets, centered horizontally and placed in the upper half of the frame. The lower third of the image is calm, empty negative space for a text overlay. Light summery backdrop in pale mint and aqua, blurred lemon and star fruit slices. Bright studio key light from the upper left, shallow depth of field, 85 mm lens, high-end fragrance advertising. Vertical 3:4 portrait format. No people, no hands, no added text, no watermark, no packaging box.
```

## Hinweis zu Rechten

Bilder mit echten Markenflaschen sind für deine private Nutzung unproblematisch. Liegt das Repo öffentlich
auf GitHub Pages, sind sie aber für alle sichtbar. Wer ganz sicher gehen will, nimmt ein privates Repo
(GitHub Pages dafür braucht ein bezahltes Konto) oder bleibt bei den stilisierten Bildern aus dem Bildstudio.
