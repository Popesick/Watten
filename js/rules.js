// Kernregeln: Rangordnung der Karten (Kritisch/Guete/Haube/weitere Schläge/
// Trumpf/Farbkarten), Kartenvergleich und Legalität für "Offenes Watten"
// (mit den kritischen Karten aus "Kritisch Watten"). Kein genereller
// Farbzwang - nur beim Sonderfall "Trumpf oder Kritisch" muss zugegeben
// bzw. mit einem Kritischen gestochen werden.

import { SUIT_PRIORITY, rankIndex, nextRank, cardsEqual, isWeli } from './cards.js';

// Kategorien, höher = stärker
export const CAT = {
  WELI_SCHLAG: 7, // Weli wurde als Schlag angesagt -> alleinige Spitzenkarte
  KRITISCH: 6, // fixe kritische Karten, immer über Guete/Haube
  GUETE: 5,
  RECHTE: 4, // "Haube": Trumpf-Karte im Rang des Schlags
  WEITERER_SCHLAG: 3,
  TRUMPF: 2,
  FARBE: 1,
};

// Die drei kritischen Karten (immer stark, unabhängig von Trumpf/Schlag),
// Rangfolge untereinander: Eichel 7 < Schelln 7 < Herz König.
const KRITISCH_CARDS = [
  { suit: 'Eichel', rank: '7' },
  { suit: 'Schell', rank: '7' },
  { suit: 'Herz', rank: 'K' },
];

export function kritischIndex(card) {
  return KRITISCH_CARDS.findIndex((k) => cardsEqual(k, card));
}

export function isKritisch(card) {
  return kritischIndex(card) >= 0;
}

// announcement: { trumpSuit: 'Eichel'|'Laub'|'Herz'|'Schell', schlagRank: '7'..'A' oder 'Weli' }

export function guessGueteCard(announcement) {
  const { trumpSuit, schlagRank } = announcement;
  if (schlagRank === 'Weli') return null; // kein Gueter, wenn Weli der Schlag ist
  if (schlagRank === 'A') return { suit: trumpSuit, rank: '7' };
  const nr = nextRank(schlagRank);
  if (!nr) return null;
  return { suit: trumpSuit, rank: nr };
}

/** Die "Haube": die Trumpf-Karte im Rang des angesagten Schlags. */
export function haubeCard(announcement) {
  if (announcement.schlagRank === 'Weli') return null;
  return { suit: announcement.trumpSuit, rank: announcement.schlagRank };
}

// Rückwärtskompatibler Alias.
export const rechteCard = haubeCard;

/** Liefert {cat, val, suitPr} zur Stärke einer Karte unter der aktuellen Ansage. */
export function cardStrength(card, announcement) {
  const { trumpSuit, schlagRank } = announcement;

  if (schlagRank === 'Weli') {
    if (isWeli(card)) return { cat: CAT.WELI_SCHLAG, val: 0, suitPr: 0 };
    const ki = kritischIndex(card);
    if (ki >= 0) return { cat: CAT.KRITISCH, val: ki, suitPr: 0 };
    if (card.suit === trumpSuit) return { cat: CAT.TRUMPF, val: rankIndex(card.rank), suitPr: 0 };
    return { cat: CAT.FARBE, val: rankIndex(card.rank), suitPr: SUIT_PRIORITY[card.suit] };
  }

  // Kritische Karten stehen immer über Guete und Haube.
  const ki = kritischIndex(card);
  if (ki >= 0) return { cat: CAT.KRITISCH, val: ki, suitPr: 0 };

  const guete = guessGueteCard(announcement);
  const haube = haubeCard(announcement);

  if (guete && cardsEqual(card, guete)) return { cat: CAT.GUETE, val: 0, suitPr: 0 };
  if (haube && cardsEqual(card, haube)) return { cat: CAT.RECHTE, val: 0, suitPr: 0 };

  if (isWeli(card)) {
    // Weli nicht als Schlag angesagt: gilt als kleinste Schell-Karte.
    if (trumpSuit === 'Schell') return { cat: CAT.TRUMPF, val: -1, suitPr: 0 };
    return { cat: CAT.FARBE, val: -1, suitPr: SUIT_PRIORITY['Schell'] };
  }

  if (card.rank === schlagRank && card.suit !== trumpSuit) {
    return { cat: CAT.WEITERER_SCHLAG, val: 0, suitPr: SUIT_PRIORITY[card.suit] };
  }

  if (card.suit === trumpSuit) {
    return { cat: CAT.TRUMPF, val: rankIndex(card.rank), suitPr: 0 };
  }

  return { cat: CAT.FARBE, val: rankIndex(card.rank), suitPr: SUIT_PRIORITY[card.suit] };
}

/** > 0 wenn a stärker als b, < 0 wenn schwächer, 0 nie (alle 33 Karten sind eindeutig stark). */
export function compareCards(a, b, announcement) {
  const sa = cardStrength(a, announcement);
  const sb = cardStrength(b, announcement);
  if (sa.cat !== sb.cat) return sa.cat - sb.cat;
  if (sa.val !== sb.val) return sa.val - sb.val;
  return sa.suitPr - sb.suitPr;
}

/** Karten eines Blatts nach Stärke sortiert (schwächste zuerst). */
export function sortByStrength(cards, announcement) {
  return cards.slice().sort((a, b) => compareCards(a, b, announcement));
}

/**
 * Legale Karten für einen Zug. In diesem (normalen) Watten gibt es KEINEN
 * generellen Farbzwang - man darf grundsätzlich jede Karte spielen.
 *
 * Einzige Ausnahme "Trumpf oder Kritisch": eröffnet der Schlagansager den
 * ersten Stich der Runde mit der Haube, müssen alle Folgenden für DIESEN
 * Stich Trumpf zugeben oder dürfen (auch ohne Trumpf in der Hand) mit einem
 * Kritischen stechen.
 */
export function legalPlays(hand, ledCard, announcement, options = {}) {
  if (!ledCard) return hand.slice();
  if (options.trumpfOderKritisch) {
    const eligible = hand.filter((c) => c.suit === ledCard.suit || isKritisch(c));
    return eligible.length > 0 ? eligible : hand.slice();
  }
  return hand.slice();
}

export { cardsEqual };

/**
 * Stärke einer Karte IM KONTEXT eines Stichs (angespielte Farbe zählt):
 * Eine reine Farbkarte (Kategorie FARBE), die nicht die angespielte Farbe
 * bedient, kann den Stich nie gewinnen - unabhängig von ihrem Rang. Trumpf,
 * Haube/Guete/Kritisch/weitere Schläge und farbgleiche Farbkarten werden
 * normal verglichen.
 */
function trickCardRank(card, ledSuit, announcement) {
  const s = cardStrength(card, announcement);
  const eCat = s.cat === CAT.FARBE && card.suit !== ledSuit ? 0 : s.cat;
  return { eCat, val: s.val, suitPr: s.suitPr };
}

export function compareInTrick(a, b, ledSuit, announcement) {
  const ra = trickCardRank(a, ledSuit, announcement);
  const rb = trickCardRank(b, ledSuit, announcement);
  if (ra.eCat !== rb.eCat) return ra.eCat - rb.eCat;
  if (ra.val !== rb.val) return ra.val - rb.val;
  return ra.suitPr - rb.suitPr;
}

/** Ermittelt den Gewinner eines Stichs. plays: [{seat, card}] */
export function trickWinner(plays, announcement) {
  const ledSuit = plays[0].card.suit;
  let best = plays[0];
  for (const p of plays.slice(1)) {
    if (compareInTrick(p.card, best.card, ledSuit, announcement) > 0) best = p;
  }
  return best.seat;
}

/** Kurzbegründung, WOMIT ein Stich gewonnen wurde (für die UI). */
export function describeWin(winningCard, announcement) {
  const s = cardStrength(winningCard, announcement);
  switch (s.cat) {
    case CAT.WELI_SCHLAG:
      return 'mit dem Weli';
    case CAT.KRITISCH:
      return 'mit einem Kritischen';
    case CAT.GUETE:
      return 'mit dem Gueten';
    case CAT.RECHTE:
      return 'mit der Haube';
    case CAT.WEITERER_SCHLAG:
      return 'mit dem Schlag';
    case CAT.TRUMPF:
      return 'mit Trumpf';
    default:
      return 'mit Dant';
  }
}
