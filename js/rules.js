// Kernregeln: Rangordnung der Karten (Kritisch/Haube/weitere Schläge/
// Trumpf/Farbkarten), Kartenvergleich und Legalität für "Offenes Watten"
// (Hausregeln - kein "Guete", siehe Diskussion im Projekt). Kein genereller
// Farbzwang - nur beim Sonderfall "Trumpf oder Kritisch" muss zugegeben
// bzw. mit einem Kritischen gestochen werden.

import { SUIT_PRIORITY, rankIndex, cardsEqual } from './cards.js';

// Kategorien, höher = stärker
export const CAT = {
  KRITISCH: 5, // fixe kritische Karten, immer über der Haube
  RECHTE: 4, // "Haube": Trumpf-Karte im Rang des Schlags
  WEITERER_SCHLAG: 3,
  TRUMPF: 2,
  FARBE: 1,
};

// Die drei kritischen Karten (immer stark, unabhängig von Trumpf/Schlag),
// Rangfolge untereinander: Soache < Welln < Maxe.
// Soache sticht alles außer den nächsten zwei, Welln alles außer dem
// letzten, Maxe sticht alles.
const KRITISCH_CARDS = [
  { suit: 'Eichel', rank: '7', name: 'Soache' },
  { suit: 'Schell', rank: '7', name: 'Welln' },
  { suit: 'Herz', rank: 'K', name: 'Maxe' },
];

export function kritischIndex(card) {
  return KRITISCH_CARDS.findIndex((k) => cardsEqual(k, card));
}

export function isKritisch(card) {
  return kritischIndex(card) >= 0;
}

export function kritischName(card) {
  const i = kritischIndex(card);
  return i >= 0 ? KRITISCH_CARDS[i].name : null;
}

/** Hat eine Hand alle drei Kritischen (Soache, Welln, Maxe), ist das "a Maschin". */
export function hasMaschin(hand) {
  return KRITISCH_CARDS.every((k) => hand.some((c) => cardsEqual(c, k)));
}

// announcement: { trumpSuit: 'Eichel'|'Laub'|'Herz'|'Schell', schlagRank: '7'..'A' }

/** Der "Haube": die Trumpf-Karte im Rang des angesagten Schlags. */
export function haubeCard(announcement) {
  return { suit: announcement.trumpSuit, rank: announcement.schlagRank };
}

/** Liefert {cat, val, suitPr} zur Stärke einer Karte unter der aktuellen Ansage. */
export function cardStrength(card, announcement) {
  const { trumpSuit, schlagRank } = announcement;

  // Kritische Karten stehen immer über der Haube.
  const ki = kritischIndex(card);
  if (ki >= 0) return { cat: CAT.KRITISCH, val: ki, suitPr: 0 };

  const haube = haubeCard(announcement);
  if (haube && cardsEqual(card, haube)) return { cat: CAT.RECHTE, val: 0, suitPr: 0 };

  if (card.rank === schlagRank && card.suit !== trumpSuit) {
    return { cat: CAT.WEITERER_SCHLAG, val: 0, suitPr: SUIT_PRIORITY[card.suit] };
  }

  if (card.suit === trumpSuit) {
    return { cat: CAT.TRUMPF, val: rankIndex(card.rank), suitPr: 0 };
  }

  return { cat: CAT.FARBE, val: rankIndex(card.rank), suitPr: SUIT_PRIORITY[card.suit] };
}

/** > 0 wenn a stärker als b, < 0 wenn schwächer, 0 nie (alle 32 Karten sind eindeutig stark). */
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
 * ersten Stich der Runde mit dem Haube, müssen alle Folgenden für DIESEN
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
 * Haube/Kritisch/weitere Schläge und farbgleiche Farbkarten werden normal
 * verglichen.
 */
function trickCardRank(card, ledSuit, announcement) {
  const s = cardStrength(card, announcement);
  const eCat = s.cat === CAT.FARBE && card.suit !== ledSuit ? 0 : s.cat;
  return { eCat, val: s.val };
}

/**
 * Vergleich zweier Karten IM STICH. Bei echtem Gleichstand (z.B. zwei
 * "weitere Schläge" in unterschiedlichen Farben) liefert das 0 - es gibt
 * KEINE künstliche Farbrangfolge als Tiebreak. Stattdessen entscheidet beim
 * Auswerten des Stichs die zuerst gespielte Karte (siehe trickWinner).
 */
export function compareInTrick(a, b, ledSuit, announcement) {
  const ra = trickCardRank(a, ledSuit, announcement);
  const rb = trickCardRank(b, ledSuit, announcement);
  if (ra.eCat !== rb.eCat) return ra.eCat - rb.eCat;
  return ra.val - rb.val;
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
    case CAT.KRITISCH: {
      const name = kritischName(winningCard);
      return name ? `mit dem ${name}` : 'mit einem Kritischen';
    }
    case CAT.RECHTE:
      return 'mit dem Haube';
    case CAT.WEITERER_SCHLAG:
      return 'mit dem Schlag';
    case CAT.TRUMPF:
      return 'mit Trumpf';
    default:
      return 'mit Dant';
  }
}
