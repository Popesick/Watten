# Watten

Digitale Umsetzung des Südtiroler Kartenspiels "Watten" für 2–4 Spieler,
wobei 1–3 Sitzplätze von einer einfachen KI übernommen werden können.
Reines Vanilla-JavaScript (ES-Module), kein Build-Schritt nötig.

## Starten

```bash
cd /home/openclaw/Dokumente/Watten
python3 -m http.server 8420
```

Danach im Browser `http://localhost:8420` öffnen. Alternativ über die
Claude-Code-Preview: `.claude/launch.json` im Ordner `Dokumente` enthält
bereits die Konfiguration `watten`.

## Umgesetzte Variante: Offenes Watten

Es ist bewusst zunächst nur **Offenes Watten** implementiert: Schlag und
Trumpf werden laut angesagt, alle Spieler kennen sie sofort. Das macht die
KI-Logik deutlich einfacher (kein Bluffen/Signalisieren nötig) und ist eine
gute Einsteiger-Variante. Blindwatten (verdeckte Ansage) kann später als
Erweiterung ergänzt werden.

Umgesetzte Grundregeln:
- 33 Karten (4 Farben × 7–Ass + Weli), Rangordnung Guete → Rechte → weitere
  Schläge → Trumpf → Farbkarten, inkl. Sonderfall "Ass als Schlag" und
  "Weli als Schlag".
- Farbzwang auf die angespielte physische Farbe (Trumpf muss zugegeben
  werden, wenn vorhanden).
- Bieten (Erhöhen/Halten/Gehen) in Ein-Punkt-Schritten.
- "Es gehen die Vier" (gestrichen-Regel) im klassischen 2-Team-Fall (2er/4er).
- Rundenwertung (3 Stiche gewinnen die Runde) und Spielwertung bis zur
  Zielpunktzahl (11/15/18).
- Varianten für 2, 3 und 4 Spieler (Kartenzahl, Teams) gemäß
  watten-suedtirol.com.

## Bewusste Vereinfachungen (Stand: erste Version)

- Kein Schlagtausch, kein "Schöner", kein "nichts ansagen".
- Beim Bieten entscheidet je Team ein Sitzplatz stellvertretend (in der
  Praxis würden sich Partner absprechen).
- "Es gehen die Vier" nur für 2 Teams (2er-/4er-Watten), nicht für die
  freie 3er-Variante.
- 3er-Watten: Variante mit 7 Karten/Spieler, alle gegeneinander.

## Grafik

- Hintergrund (urige bayerische Wirtshausstube) und drei KI-Charaktere
  (Loisl, Schorsch, Sepp) wurden mit ChatGPT (Bildgenerierung, transparenter
  Hintergrund für die Charaktere) erstellt und liegen unter `assets/img/`.
- Die KI-Sitzplätze bekommen der Reihe nach einen Charakter zugewiesen
  (`CHARACTERS` in `js/main.js`). Bei mehr als 3 KI-Sitzplätzen wird
  aktuell wiederverwendet – ein vierter Charakter kann einfach ergänzt werden.
- Die Kartenrückseiten werden per CSS über der Charaktergrafik positioniert
  (kein pixelgenaues "in die Hand legen", aber optisch stimmig).

## Team-Kommunikation

Im 4er-Team-Watten (und über `askPartner` grundsätzlich überall, wo es ein
Team gibt) können sich Partner kurze Floskeln zurufen – sowohl Mensch↔KI als
auch KI↔KI:

- **"Ich kann nicht, mach du den Stich!"** – wird angeboten, bevor der
  Partner in einem Stich seine Karte spielt. Die Reaktion des Partners
  wird automatisch aus seiner tatsächlichen Kartenwahl abgeleitet: versucht
  er zu stechen, loggt das Spiel "Ok, mach ich!", wirft er ab "Ich kann
  nicht." (echt oder geblufft macht spielmechanisch keinen Unterschied).
- **"Lass ihn, das ist meiner!"** – gleiches Prinzip umgekehrt: wirft der
  Partner Müll ab, wird "Ok." geloggt; stochert er trotzdem rein, "Nein,
  meiner!".
- **"Hast du noch was?"** – jederzeit stellbare Frage, wird bei einem
  KI-Partner sofort anhand der aktuellen Hand beantwortet (Trumpf/Kritischer
  vorhanden oder nicht).

Nur der zuerst am Zug befindliche Partner eines Stichs darf pro Stich einmal
etwas zurufen (KI entscheidet heuristisch, ob und was sie sagt).

## Architektur

- `js/cards.js` – Kartendeck, Symbole, Grundtypen.
- `js/rules.js` – Rangordnung, Kartenvergleich, Farbzwang, Stichauswertung.
- `js/variants.js` – Konfiguration je Spieleranzahl (2/3/4).
- `js/chat.js` – Floskeln für die Partner-Kommunikation.
- `js/ai.js` – Heuristische KI (Ansage, Bieten, Kartenspiel, Kommunikation).
- `js/players.js` – Einheitliches Player-Interface (`HumanController`,
  `AIController`) – die Engine unterscheidet nicht, wer entscheidet.
- `js/engine.js` – Spielablauf: Austeilen, Ansage, Bieten, Stiche, Wertung,
  Partner-Kommunikation.
- `js/ui.js` / `js/main.js` – Rendering, Charakter-Zuordnung, Einstiegspunkt.
- `assets/img/` – Hintergrund- und Charaktergrafiken.

## Mögliche nächste Schritte

- Vierter KI-Charakter (Grafik) für den seltenen Fall "0 menschliche Spieler".
- Sprachausgabe/Soundeffekte/Musik (als Nächstes geplant).
- Blindwatten-Modus (verdeckte Ansage, KI muss Partner-Signale erkennen).
- Bessere KI (Simulation/Determinisierung statt reiner Heuristik).
- Schlagtausch, Schöner, "nichts ansagen".
- Eigene Sitzplatz-Auswahl statt fixer Zuordnung Mensch/KI nach Reihenfolge.
