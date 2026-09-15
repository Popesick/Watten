// Heuristische KI für Watten: Ansage (Schlag/Trumpf), Kartenspiel, "Gehn?"
// und die Partnerfrage "Kannst du den noch?".
// Kein perfektes Spiel, aber solide Grundtaktik als Ausgangspunkt (Stufe 1).

import { SUITS, RANKS, rankIndex } from './cards.js';
import { cardStrength, compareInTrick, sortByStrength, legalPlays } from './rules.js';

function cardWeight(card, announcement) {
  const s = cardStrength(card, announcement);
  // Grobe, monoton steigende Gewichtung je Kategorie, für Handstärke-Schätzung.
  const catBase = { 1: 0, 2: 8, 3: 16, 4: 20, 5: 24 }[s.cat] || 0;
  return catBase + Math.max(0, s.val);
}

export function estimateHandStrength(hand, announcement) {
  const total = hand.reduce((sum, c) => sum + cardWeight(c, announcement), 0);
  return total / hand.length;
}

/** Schlag-Ansage: Spieler kennt Trumpf noch nicht. Wählt Rang mit bestem Potenzial. */
export function chooseSchlag(hand) {
  const scoreByRank = {};
  for (const rank of RANKS) {
    const count = hand.filter((c) => c.rank === rank).length;
    const heightBonus = rankIndex(rank); // hohe Ränge (König/Sau) leicht bevorzugt
    scoreByRank[rank] = count * 10 + heightBonus;
  }
  let best = RANKS[0];
  for (const rank of RANKS) {
    if (scoreByRank[rank] > scoreByRank[best]) best = rank;
  }
  return best;
}

/** Trumpf-Ansage: Spieler kennt den Schlag bereits (Offenes Watten: Schlag zuerst). */
export function chooseTrumpf(hand, schlagRank) {
  let bestSuit = SUITS[0];
  let bestScore = -Infinity;
  for (const suit of SUITS) {
    const ann = { trumpSuit: suit, schlagRank };
    let score = 0;
    for (const card of hand) {
      const s = cardStrength(card, ann);
      score += cardWeight(card, ann);
      if (s.cat >= 4) score += 15; // Haube/Kritisch im eigenen Blatt ist viel wert
    }
    if (score > bestScore) {
      bestScore = score;
      bestSuit = suit;
    }
  }
  return bestSuit;
}

/** Entscheidung bei "gestrichen" (es gehen die Vier): halten oder gehen? */
export function decideHoldForcedFour(hand, announcement) {
  const strength = estimateHandStrength(hand, announcement);
  return strength >= 13;
}

/** Soll die KI diese Runde spontan "Gehn?" fragen? Nur wenn noch verfügbar. */
export function decideGehn(hand, announcement, isDecisiveTrick) {
  if (isDecisiveTrick) return false; // mitten in einer entscheidenden Situation nicht ablenken
  const strength = estimateHandStrength(hand, announcement);
  return strength > 17 && Math.random() < 0.35;
}

/** Antwort auf ein "Gehn?": Ja (gehen), Nein (halten auf 3) oder Vier (nachlegen). */
export function decideGehnResponse(hand, announcement) {
  const strength = estimateHandStrength(hand, announcement);
  if (strength < 10) return 'JA';
  if (strength > 18) return 'VIER';
  return 'NEIN';
}

/** Als Herausforderer, nachdem die Gegenseite mit "Vier" gekontert hat. */
export function decideGehnFourResponse(hand, announcement) {
  const strength = estimateHandStrength(hand, announcement);
  return strength >= 14 ? 'WEITER' : 'RAUS';
}

/** Soll die KI ihren (noch nicht gezogenen) Partner fragen "Kannst du den noch?" */
export function decideAskPartner(hand, announcement, isDecisiveTrick) {
  if (isDecisiveTrick) return false; // hier lieber gleich selbst handeln
  return Math.random() < 0.5;
}

/** Antwort auf "Kannst du den noch?": ehrlich anhand der eigenen Hand. */
export function answerAskPartner({ hand, currentBest, ledSuit, announcement }) {
  const canBeat = hand.some((c) => compareInTrick(c, currentBest, ledSuit, announcement) > 0);
  return canBeat ? 'JA' : 'NEIN';
}

/**
 * Kartenwahl - kann statt einer Karte auch 'GEHN' (spontan bieten) oder
 * 'ASK' (Partner fragen "Kannst du den noch?") zurückgeben; die Engine
 * ruft choosePlay danach mit aktualisiertem Kontext erneut auf.
 * context: { hand, ledCard, trickPlays: [{seat,card}], announcement,
 *   isDecisiveTrick, mySeat, partnerSeats, partnerIsWinning, trumpfOderKritisch,
 *   gehnAvailable, canAsk, receivedAnswer }
 */
export function choosePlay(context) {
  const {
    hand, ledCard, trickPlays, announcement, isDecisiveTrick, partnerIsWinning,
    trumpfOderKritisch, gehnAvailable, canAsk, receivedAnswer,
  } = context;

  if (gehnAvailable && decideGehn(hand, announcement, isDecisiveTrick)) return 'GEHN';
  if (canAsk && receivedAnswer == null && decideAskPartner(hand, announcement, isDecisiveTrick)) return 'ASK';

  const legal = legalPlays(hand, ledCard, announcement, { trumpfOderKritisch });
  const sorted = sortByStrength(legal, announcement); // schwächste zuerst

  if (!ledCard) {
    // Ich eröffne den Stich.
    if (isDecisiveTrick) return sorted[sorted.length - 1]; // stärkste Karte, um den Stich zu holen
    return sorted[0]; // sonst niedrig anspielen, starke Karten aufsparen
  }

  // Ich muss auf einen laufenden Stich reagieren.
  const ledSuit = ledCard.suit;
  let currentBest = trickPlays[0];
  for (const p of trickPlays.slice(1)) {
    if (compareInTrick(p.card, currentBest.card, ledSuit, announcement) > 0) currentBest = p;
  }

  const winningCards = sorted.filter((c) => compareInTrick(c, currentBest.card, ledSuit, announcement) > 0);

  if (receivedAnswer === 'JA' && !isDecisiveTrick) {
    // Partner hat gesagt, er übernimmt den Stich - selbst nichts verschwenden.
    return sorted[0];
  }

  if (partnerIsWinning && !isDecisiveTrick) {
    // Partner führt bereits: nicht überstechen, niedrigste Karte abwerfen.
    return sorted[0];
  }

  if (winningCards.length > 0) {
    return winningCards[0]; // knapp und effizient gewinnen
  }
  return sorted[0]; // kann/will nicht gewinnen: niedrigste Karte abwerfen
}
