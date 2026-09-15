// Kernregeln: Rangordnung der Karten (Guete/Rechte/Schläge/Trumpf/Farbkarten),
// Kartenvergleich und Zugzwang (Farbe zugeben) für "Offenes Watten".

import { SUIT_PRIORITY, rankIndex, nextRank, cardsEqual, isWeli } from './cards.js';

// Kategorien, höher = stärker
export const CAT = {
  WELI_SCHLAG: 6, // Weli wurde als Schlag angesagt -> alleinige Spitzenkarte
  GUETE: 5,
  RECHTE: 4,
  WEITERER_SCHLAG: 3,
  TRUMPF: 2,
  FARBE: 1,
};

// announcement: { trumpSuit: 'Eichel'|'Laub'|'Herz'|'Schell', schlagRank: '7'..'A' oder 'Weli' }

export function guessGueteCard(announcement) {
  const { trumpSuit, schlagRank } = announcement;
  if (schlagRank === 'Weli') return null; // kein Gueter, wenn Weli der Schlag ist
  if (schlagRank === 'A') return { suit: trumpSuit, rank: '7' };
  const nr = nextRank(schlagRank);
  if (!nr) return null;
  return { suit: trumpSuit, rank: nr };
}

export function rechteCard(announcement) {
  if (announcement.schlagRank === 'Weli') return null;
  return { suit: announcement.trumpSuit, rank: announcement.schlagRank };
}

/** Liefert {cat, val, suitPr} zur Stärke einer Karte unter der aktuellen Ansage. */
export function cardStrength(card, announcement) {
  const { trumpSuit, schlagRank } = announcement;

  if (schlagRank === 'Weli') {
    if (isWeli(card)) return { cat: CAT.WELI_SCHLAG, val: 0, suitPr: 0 };
    if (card.suit === trumpSuit) return { cat: CAT.TRUMPF, val: rankIndex(card.rank), suitPr: 0 };
    return { cat: CAT.FARBE, val: rankIndex(card.rank), suitPr: SUIT_PRIORITY[card.suit] };
  }

  const guete = guessGueteCard(announcement);
  const rechte = rechteCard(announcement);

  if (guete && cardsEqual(card, guete)) return { cat: CAT.GUETE, val: 0, suitPr: 0 };
  if (rechte && cardsEqual(card, rechte)) return { cat: CAT.RECHTE, val: 0, suitPr: 0 };

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
 * Legale Karten für einen Zug: Farbzwang auf die angespielte (physische) Farbe.
 * Wird Trumpf angespielt, muss Trumpf zugegeben werden, sofern vorhanden.
 * Der Weli zählt dabei als Schell.
 */
export function legalPlays(hand, ledCard, announcement) {
  if (!ledCard) return hand.slice();
  const ledSuit = ledCard.suit;
  const matching = hand.filter((c) => c.suit === ledSuit);
  return matching.length > 0 ? matching : hand.slice();
}

export { cardsEqual };

/**
 * Stärke einer Karte IM KONTEXT eines Stichs (angespielte Farbe zählt):
 * Eine reine Farbkarte (Kategorie FARBE), die nicht die angespielte Farbe
 * bedient, kann den Stich nie gewinnen - unabhängig von ihrem Rang. Trumpf,
 * Rechte/Guete/weitere Schläge und farbgleiche Farbkarten werden normal verglichen.
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
