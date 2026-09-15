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

Umgesetzte Grundregeln (Hausregel-Variante):
- 32 Karten (4 Farben × 7 bis Sau, kein Weli/keine Sonderkarte). Farbnamen wie
  am Tisch gebräuchlich: Eichel, **Gras** (intern "Laub"), Herz, **Schelln**
  (intern "Schell"). Ass heißt **Sau**.
- Rangordnung: **Kritisch** → Guete → **der Haube** → weitere Schläge →
  Trumpf → Farbkarten.
  - **Der Haube** (bayrisch, männlich) ist die Trumpf-Karte im Rang des
    angesagten Schlags (anderswo auch "Rechte" genannt).
  - **Die drei Kritischen** sind fix und immer stark, unabhängig von
    Trumpf/Schlag, mit eigenen Namen: **Soache** (Eichel 7, sticht alles
    außer den nächsten zwei), **Welln** (Schelln 7, sticht alles außer dem
    letzten), **Maxe** (Herz König, sticht alles). Hat ein Spieler alle drei
    auf der Hand, ist das "a Maschin" – Meldung direkt nach dem Geben.
- **Kein genereller Farbzwang** – man darf grundsätzlich jede Karte spielen.
  Einzige Ausnahme: **"Trumpf oder Kritisch"** – eröffnet der Schlagansager
  den allerersten Stich der Runde mit dem Haube, müssen ab da alle in diesem
  Stich Trumpf zugeben oder mit einem Kritischen stechen.
- Ein Stich, der rein durch höheren Rang innerhalb einer normalen (nicht
  Trumpf-)Farbe gewonnen wird, heißt **"Dant"**.
- "Es gehen die Vier" (gestrichen-Regel) im klassischen 2-Team-Fall (2er/4er).
- Rundenwertung (3 Stiche gewinnen die Runde) und Spielwertung bis zur
  Zielpunktzahl (11/15/18).
- Varianten für 2, 3 und 4 Spieler (Kartenzahl, Teams) gemäß
  watten-suedtirol.com, angepasst um obige Hausregeln.
- Nach jedem Stich pausiert das Spiel (sofern ein Mensch mitspielt) mit
  Begründung ("Sitz X sticht mit Trumpf/Schlag/Kritisch/Dant/…") und
  wartet auf Bestätigung ("Weiter"), damit man auch die KI-Karten in Ruhe
  sieht.

## "Gehn?" - spontanes Bieten

Statt einer festen Bietphase vor der Runde kann **jeder Spieler, wenn er am
Zug ist**, spontan "Gehn?" spielen (Button unter der eigenen Hand) - aber
nur einmal pro Runde insgesamt:

1. Die Gegenseite antwortet **"Ja"** (Runde vorbei, Fragesteller-Team erhält
   2 Punkte), **"Nein"** (Runde läuft weiter, gewinnt jetzt 3 Punkte statt 2)
   oder **"Vier"** (Gegenvorschlag).
2. Bei "Vier" entscheidet der ursprüngliche Fragesteller: **"Ok, weiter"**
   (Runde läuft um 4 Punkte weiter) oder **"Ich bin raus"** (Gegenseite
   erhält 2 Punkte, Runde vorbei).

Ein Fold gibt also immer genau 2 Punkte, egal auf welcher Stufe - nur wenn
sich beide Seiten auf einen höheren Einsatz einigen (3 oder 4), bekommt
den am Ende, wer die Runde tatsächlich über die Stiche gewinnt. Die KI kann
"Gehn?" ebenso jederzeit selbst anbieten wie beantworten.

## Partnerfrage: "Kannst du den noch?"

Kommunikation ist bewusst auf eine einzige Situation beschränkt (keine
Ansagen beim Ausspielen des ersten Stichs): Hat mindestens ein Gegner schon
eine Karte in den laufenden Stich geworfen und der eigene Partner ist noch
nicht an der Reihe, darf man ihn fragen **"Kannst du den noch?"** (bezogen
auf die bisher höchste Karte des Stichs). Der Partner antwortet ehrlich
anhand seiner Hand mit **"Ja, lass ihn mir!"** oder **"Nein, nimm du ihn"** -
das beeinflusst direkt, ob der Fragende selbst versucht zu stechen oder
lieber abwirft. Funktioniert in beide Richtungen (Mensch↔KI, KI↔KI) und
höchstens einmal pro Team und Stich.

## Grafik

- Hintergrund (urige bayerische Wirtshausstube) und sieben KI-Charaktere
  (Loisl, Schorsch, Sepp, Hanse, Lenerl, Brigitte, Monika) wurden mit
  ChatGPT (Bildgenerierung, transparenter Hintergrund für die Charaktere)
  erstellt und liegen unter `assets/img/`.
- Die KI-Sitzplätze bekommen bei jedem Spielstart zufällig verschiedene
  Charaktere zugewiesen (`CHARACTERS` in `js/main.js`).
- Die Kartenrückseiten werden per CSS über der Charaktergrafik positioniert
  (kein pixelgenaues "in die Hand legen", aber optisch stimmig).
- Team-Zugehörigkeit ist über einen farbigen Punkt bei Sitzname und
  Punktestand erkennbar (Team A/B/C je eigene Farbe).
- Farben sind eingefärbt (Herz rot, Eichel braun, Gras grün, Schelln gold) -
  bei der Trumpfansage, auf den Karten und im Trumpf-Banner.

## Bewusste Vereinfachungen (Stand: aktuelle Version)

- Kein Schlagtausch, kein "Schöner", kein "nichts ansagen".
- Bei "Gehn?" und den erzwungenen Ansagen entscheidet je Team ein
  Sitzplatz stellvertretend (der erste Sitz des Teams).
- "Es gehen die Vier" nur für 2 Teams (2er-/4er-Watten), nicht für die
  freie 3er-Variante; in einer Runde mit "es gehen die Vier" ist "Gehn?"
  nicht zusätzlich möglich.
- 3er-Watten: Variante mit 7 Karten/Spieler, alle gegeneinander. Bei
  "Gehn?" werden die beiden Gegner nacheinander gefragt.
- Kein Blindwatten (verdeckte Ansage).

## Architektur

- `js/cards.js` – Kartendeck, Symbole, Grundtypen.
- `js/rules.js` – Rangordnung (inkl. Kritisch/Haube), Kartenvergleich,
  Legalität ("Trumpf oder Kritisch"), Stichauswertung samt Begründung.
- `js/variants.js` – Konfiguration je Spieleranzahl (2/3/4).
- `js/chat.js` – Textbausteine für "Gehn?" und "Kannst du den noch?".
- `js/ai.js` – Heuristische KI (Ansage, "Gehn?", Kartenspiel, Partnerfrage).
- `js/players.js` – Einheitliches Player-Interface (`HumanController`,
  `AIController`) – die Engine unterscheidet nicht, wer entscheidet.
- `js/engine.js` – Spielablauf: Austeilen, Ansage, Stiche, "Gehn?"-
  Verhandlung, Wertung.
- `js/ui.js` / `js/main.js` – Rendering, Charakter-Zuordnung, Einstiegspunkt.
- `assets/img/` – Hintergrund- und Charaktergrafiken.

## Mögliche nächste Schritte

- Sprachausgabe/Soundeffekte/Musik (als Nächstes geplant).
- Blindwatten-Modus (verdeckte Ansage).
- Bessere KI (Simulation/Determinisierung statt reiner Heuristik).
- Schlagtausch, Schöner, "nichts ansagen".
- Eigene Sitzplatz-/Partnerauswahl statt fixer Zuordnung nach Reihenfolge.
