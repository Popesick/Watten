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

- Hintergrund (urige bayerische Wirtshausstube) und sieben Charaktere
  (Loisl, Schorsch, Sepp, Hanse, Lenerl, Brigitte, Monika) wurden mit
  ChatGPT (Bildgenerierung, transparenter Hintergrund für die Charaktere)
  erstellt und liegen unter `assets/img/`.
- Im Startmenü kann jedem Sitzplatz (Mensch wie KI) explizit einer der
  sieben Charaktere als Avatar zugewiesen werden, oder "🎲 Zufällig"
  bleiben; unbesetzte Sitze werden beim Spielstart aus den noch nicht
  gewählten Charakteren zufällig aufgefüllt.
- Die Kartenrückseiten (KI) bzw. die eigenen Karten (Mensch) werden per CSS
  über der Charaktergrafik positioniert (kein pixelgenaues "in die Hand
  legen", aber optisch stimmig).
- Team-Zugehörigkeit ist über einen farbigen Punkt bei Sitzname und
  Punktestand erkennbar (Team A/B/C je eigene Farbe).
- Farben sind eingefärbt (Herz rot, Eichel braun, Gras grün, Schelln gold) -
  bei der Trumpfansage, auf den Karten und im Trumpf-Banner.

## Sound & Musik

- Vier Musikstücke (`assets/audio/music-*.mp3`) laufen als Playlist
  nacheinander in Dauerschleife. Lautstärke und An/Aus sind im Startmenü
  einstellbar (Standard: an, 30 % Lautstärke) und werden im Browser
  gespeichert; ein 🔊/🔇-Button oben rechts im Spiel schaltet jederzeit um.
  Musik startet beim Klick auf "Spiel starten" (Browser verlangen eine
  Nutzer-Interaktion, bevor Audio automatisch abgespielt werden darf).
- Karten werden zu Beginn jeder Runde animiert ausgeteilt: kurze
  Misch-Pause (3 Sekunden, aktuell ohne eigenen Mischsound - dafür wurde
  keine Datei mitgeliefert), danach fliegt jede Karte einzeln mit einem
  Deal-Sound (`assets/audio/sfx-deal-card.mp3`) ins Bild.

## Eigene Hand: Sortierung & Umsortieren

Die eigene Hand wird automatisch absteigend nach Stärke sortiert - sobald
Trumpf/Schlag bekannt sind nach Maxe/Welln/Soache (Kritische) → Guete →
Haube → weitere Schläge → Trumpf → Farbkarten, jeweils Sau bis Sieben,
gleichrangige Farben in fester Reihenfolge. Einzelne Karten lassen sich
per Drag & Drop frei umsortieren; das bleibt für den Rest der Runde
erhalten (nur gespielte Karten fallen raus), bis das nächste Blatt kommt.

Wenn man selbst am Zug ist und der eigene Partner in diesem Stich schon
gespielt hat, wird das direkt in der Aufforderung angezeigt ("Sitz 1: wähle
eine Karte. Dein Mitspieler hat schon den Stich gemacht!").

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
- `js/engine.js` – Spielablauf: animiertes Austeilen, Ansage, Stiche,
  "Gehn?"-Verhandlung, Wertung.
- `js/audio.js` – Musik-Playlist und Soundeffekte (`AudioManager`).
- `js/ui.js` / `js/main.js` – Rendering, Avatar-/Musikauswahl, Hand-
  Sortierung/Drag&Drop, Einstiegspunkt.
- `assets/img/` – Hintergrund- und Charaktergrafiken.
- `assets/audio/` – Musikstücke und Soundeffekte.

## Mögliche nächste Schritte

- Eigener Mischsound (aktuell nur stille 3-Sekunden-Pause beim Mischen).
- Sprachausgabe.
- Blindwatten-Modus (verdeckte Ansage).
- Bessere KI (Simulation/Determinisierung statt reiner Heuristik).
- Schlagtausch, Schöner, "nichts ansagen".
