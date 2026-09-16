// Konfiguration je Spieleranzahl (Grundregeln: klassisches 4er-Watten als Basis,
// mit den Anpassungen für 2 und 3 Spieler laut watten-suedtirol.com).

export const VARIANTS = {
  2: {
    players: 2,
    cardsPerHand: 5,
    // Kein Team, jeder für sich.
    teams: [[0], [1]],
    teamNames: ['Spieler 1', 'Spieler 2'],
    forcedFourApplies: true,
  },
  3: {
    players: 3,
    cardsPerHand: 5,
    // Jeder Sitz hat einen eigenen, dauerhaften Punktestand (teams bleibt
    // deshalb je Sitz ein Einzel-"Team") - wer mit wem gegen wen spielt,
    // wechselt aber jede Runde: der Spieler links vom Geber sagt allein
    // Schlag und Trumpf an, die anderen beiden bilden für diese Runde ein
    // Team gegen ihn (dynamicTeams, siehe engine.js: roundTeams).
    teams: [[0], [1], [2]],
    teamNames: ['Spieler 1', 'Spieler 2', 'Spieler 3'],
    forcedFourApplies: false,
    dynamicTeams: true,
  },
  4: {
    players: 4,
    cardsPerHand: 5,
    // Sitzordnung 0-1-2-3 im Uhrzeigersinn, Team = sich gegenübersitzende Spieler.
    teams: [[0, 2], [1, 3]],
    teamNames: ['Team A (Du + Partner gg.über)', 'Team B'],
    forcedFourApplies: true,
  },
};

export function teamOfSeat(teams, seat) {
  return teams.findIndex((t) => t.includes(seat));
}
