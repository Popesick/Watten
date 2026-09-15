// Kartendeck und Grundtypen für Watten (Südtiroler Blatt, 33 Karten)

export const SUITS = ['Eichel', 'Laub', 'Herz', 'Schell'];
export const RANKS = ['7', '8', '9', '10', 'U', 'O', 'K', 'A'];

export const RANK_LABEL = {
  '7': '7', '8': '8', '9': '9', '10': '10',
  'U': 'Unter', 'O': 'Ober', 'K': 'König', 'A': 'Ass',
  'Weli': 'Weli',
};

export const SUIT_SYMBOL = {
  Eichel: '🌰', Laub: '🍃', Herz: '♥', Schell: '🔔',
};

export const SUIT_COLOR = {
  Eichel: '#8a5a2b', Laub: '#2f7d32', Herz: '#c62828', Schell: '#b8860b',
};

// Fixe Rangfolge der Farben als Tiebreak für "weitere Schläge" / gleichrangige Farbkarten.
export const SUIT_PRIORITY = { Eichel: 3, Laub: 2, Herz: 1, Schell: 0 };

export function cardId(card) {
  return `${card.suit}-${card.rank}`;
}

export function cardsEqual(a, b) {
  return a.suit === b.suit && a.rank === b.rank;
}

export function isWeli(card) {
  return card.rank === 'Weli';
}

export function rankIndex(rank) {
  return RANKS.indexOf(rank);
}

export function nextRank(rank) {
  const i = rankIndex(rank);
  if (i < 0 || i >= RANKS.length - 1) return null;
  return RANKS[i + 1];
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  deck.push({ suit: 'Schell', rank: 'Weli' });
  return deck;
}

export function shuffle(deck) {
  const d = deck.slice();
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

export function cardLabel(card) {
  return `${RANK_LABEL[card.rank]} ${card.suit === 'Schell' && card.rank === 'Weli' ? '' : card.suit}`.trim();
}
