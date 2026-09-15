// Heuristische KI für Watten: Ansage (Schlag/Trumpf), Bieten, Kartenspiel.
// Kein perfektes Spiel, aber solide Grundtaktik als Ausgangspunkt (Stufe 1).

import { SUITS, RANKS, rankIndex, isWeli } from './cards.js';
import { cardStrength, compareInTrick, sortByStrength, legalPlays } from './rules.js';
import { SIGNALS } from './chat.js';

function cardWeight(card, announcement) {
  const s = cardStrength(card, announcement);
  // Grobe, monoton steigende Gewichtung je Kategorie, für Handstärke-Schätzung.
  const catBase = { 1: 0, 2: 8, 3: 16, 4: 20, 5: 22, 6: 23, 7: 24 }[s.cat] || 0;
  return catBase + Math.max(0, s.val);
}

export function estimateHandStrength(hand, announcement) {
  const total = hand.reduce((sum, c) => sum + cardWeight(c, announcement), 0);
  return total / hand.length;
}

/** Schlag-Ansage: Spieler kennt Trumpf noch nicht. Wählt Rang mit bestem Potenzial. */
export function chooseSchlag(hand) {
  if (hand.some((c) => isWeli(c))) {
    return 'Weli'; // Weli in der Hand: fast immer die stärkste Wahl (garantiert Spitzenkarte).
  }
  const scoreByRank = {};
  for (const rank of RANKS) {
    const count = hand.filter((c) => c.rank === rank).length;
    const heightBonus = rankIndex(rank); // hohe Ränge (König/Ass) leicht bevorzugt
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
      if (s.cat >= 4) score += 15; // Rechte/Guete/Weli-Schlag im eigenen Blatt ist viel wert
    }
    if (score > bestScore) {
      bestScore = score;
      bestSuit = suit;
    }
  }
  return bestSuit;
}

/** Bietentscheidung als Anbieter: soll erhöht oder gepasst werden? */
export function decideRaise(hand, announcement, currentValue) {
  const strength = estimateHandStrength(hand, announcement);
  // Je höher der Einsatz schon ist, desto stärker muss die Hand sein.
  const threshold = 9 + currentValue * 1.6;
  return strength >= threshold;
}

/** Bietentscheidung als Antwortender: halten oder gehen? */
export function decideHold(hand, announcement, newValue) {
  const strength = estimateHandStrength(hand, announcement);
  const threshold = 8 + newValue * 1.4;
  return strength >= threshold;
}

/** Entscheidung bei "gestrichen" (es gehen die Vier): halten oder gehen? */
export function decideHoldForcedFour(hand, announcement) {
  const strength = estimateHandStrength(hand, announcement);
  return strength >= 13;
}

/**
 * Kartenwahl. context: { hand, ledCard, trickPlays: [{seat,card}], announcement,
 *   isDecisiveTrick: bool, mySeat, partnerSeat, partnerIsWinning }
 */
export function choosePlay(context) {
  const { hand, ledCard, trickPlays, announcement, isDecisiveTrick, partnerIsWinning, trumpfOderKritisch } = context;
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

  if (partnerIsWinning && !isDecisiveTrick) {
    // Partner führt bereits: nicht überstechen, niedrigste Karte abwerfen.
    return sorted[0];
  }

  if (winningCards.length > 0) {
    return winningCards[0]; // knapp und effizient gewinnen
  }
  return sorted[0]; // kann/will nicht gewinnen: niedrigste Karte abwerfen
}

/**
 * Entscheidet, ob die KI ihrem Partner vor dem eigenen Zug eine Floskel zuruft.
 * Nur relevant, wenn der Partner in diesem Stich noch nicht gespielt hat.
 */
export function chooseSignal({ hand, announcement }) {
  if (!announcement) return null;
  const hasStrong = hand.some((c) => cardStrength(c, announcement).cat >= 2);
  const hasCritical = hand.some((c) => cardStrength(c, announcement).cat >= 4);

  if (!hasStrong && Math.random() < 0.7) return SIGNALS.MACH_DU;
  if (hasCritical && Math.random() < 0.55) return SIGNALS.LASS_IHN;
  return null;
}
