// Kartendeck und Grundtypen für Watten (traditionelles Blatt, 32 Karten)

export const SUITS = ['Eichel', 'Laub', 'Herz', 'Schell'];
export const RANKS = ['7', '8', '9', '10', 'U', 'O', 'K', 'A'];

export const RANK_LABEL = {
  '7': '7', '8': '8', '9': '9', '10': '10',
  'U': 'Unter', 'O': 'Ober', 'K': 'König', 'A': 'Sau',
};

// Eigene flache SVG-Icons statt Emoji: Emoji-Schriftarten zeichnen "🌰"/"🍃"/"🔔"
// als bunte, realistische Miniaturbilder, die den echten Blatt-Symbolen (Eichel,
// Gras, Schelle) kaum ähneln und je nach Betriebssystem unterschiedlich aussehen.
// Diese Icons sind einfarbig (currentColor), skalieren sauber mit der Schriftgröße
// und sind an die traditionellen Bayerischen Kartensymbole angelehnt.
function svgIcon(inner) {
  return `<svg viewBox="0 0 24 24" width="1em" height="1em" style="vertical-align:-0.15em" fill="currentColor" stroke="currentColor">${inner}</svg>`;
}

export const SUIT_SYMBOL = {
  Eichel: svgIcon(
    '<path stroke="none" d="M12 3c-2.8 0-5 1.3-5 3 0 0.7 0.4 1.3 1 1.8-0.6 0.4-1 1-1 1.7 0 2.8 2.2 8 4.2 10.9 0.3 0.4 0.5 0.6 0.8 0.6s0.5-0.2 0.8-0.6C14.8 17.5 17 12.3 17 9.5c0-0.7-0.4-1.3-1-1.7 0.6-0.5 1-1.1 1-1.8 0-1.7-2.2-3-5-3z"/>'
  ),
  Laub: svgIcon(
    '<path stroke="none" d="M12 2c4.5 2 7 6.5 7 10.5C19 17.5 15.5 21 12 21S5 17.5 5 12.5C5 8.5 7.5 4 12 2z"/>' +
    '<path fill="none" stroke-width="1.1" stroke-linecap="round" d="M12 6v13"/>'
  ),
  Herz: '♥',
  Schell: svgIcon(
    '<path stroke="none" d="M12 22c1.1 0 2-0.9 2-2h-4c0 1.1 0.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-0.83-0.67-1.5-1.5-1.5s-1.5 0.67-1.5 1.5v0.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>'
  ),
};

export const SUIT_COLOR = {
  Eichel: '#8a5a2b', Laub: '#2f7d32', Herz: '#c62828', Schell: '#b8860b',
};

// Anzeige-Namen (Hausregel-Dialekt): intern bleibt 'Laub'/'Schell', angezeigt wird 'Gras'/'Schelln'.
export const SUIT_DISPLAY = {
  Eichel: 'Eichel', Laub: 'Gras', Herz: 'Herz', Schell: 'Schelln',
};

export function suitLabel(suit) {
  return SUIT_DISPLAY[suit] || suit;
}

// Fixe Rangfolge der Farben als Tiebreak für "weitere Schläge" / gleichrangige Farbkarten.
export const SUIT_PRIORITY = { Eichel: 3, Laub: 2, Herz: 1, Schell: 0 };

export function cardId(card) {
  return `${card.suit}-${card.rank}`;
}

export function cardsEqual(a, b) {
  return a.suit === b.suit && a.rank === b.rank;
}

export function rankIndex(rank) {
  return RANKS.indexOf(rank);
}

export function createDeck() {
  const deck = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
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
  return `${RANK_LABEL[card.rank]} ${suitLabel(card.suit)}`.trim();
}
