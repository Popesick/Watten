import { WattenGame } from './engine.js';
import { HumanController, AIController } from './players.js';
import { Ui } from './ui.js';

const app = document.getElementById('app');

// Feste KI-Charaktere (Grafiken via ChatGPT erzeugt, siehe assets/img).
// Werden der Reihe nach an die KI-Sitzplätze vergeben.
const CHARACTERS = [
  { name: 'Loisl', img: 'assets/img/char-loisl.png' },
  { name: 'Schorsch', img: 'assets/img/char-schorsch.png' },
  { name: 'Sepp', img: 'assets/img/char-sepp.png' },
  { name: 'Hanse', img: 'assets/img/char-hanse.png' },
  { name: 'Lenerl', img: 'assets/img/char-lenerl.png' },
  { name: 'Brigitte', img: 'assets/img/char-brigitte.png' },
  { name: 'Monika', img: 'assets/img/char-monika.png' },
];

const setupState = {
  playerCount: 4,
  targetScore: 15,
  seatTypes: ['human', 'ai', 'ai', 'ai'],
};

function ensureSeatTypesLength() {
  const n = setupState.playerCount;
  while (setupState.seatTypes.length < n) setupState.seatTypes.push('ai');
  setupState.seatTypes.length = n;
}

function renderSetup() {
  ensureSeatTypesLength();
  const n = setupState.playerCount;

  const playerCountButtons = [2, 3, 4]
    .map(
      (c) =>
        `<button class="choice-btn${c === n ? ' active' : ''}" data-playercount="${c}">${c} Spieler</button>`
    )
    .join('');

  const targetButtons = [11, 15, 18]
    .map(
      (t) =>
        `<button class="choice-btn${t === setupState.targetScore ? ' active' : ''}" data-target="${t}">${t} Punkte</button>`
    )
    .join('');

  const seatRows = setupState.seatTypes
    .map((type, i) => {
      const label =
        n === 4 ? `Sitz ${i + 1} (${i % 2 === 0 ? 'Team A' : 'Team B'})` : `Sitz ${i + 1}`;
      return `
      <div class="seat-row">
        <span>${label}</span>
        <div class="choice-row">
          <button class="choice-btn${type === 'human' ? ' active' : ''}" data-seat="${i}" data-seattype="human">Mensch</button>
          <button class="choice-btn${type === 'ai' ? ' active' : ''}" data-seat="${i}" data-seattype="ai">KI</button>
        </div>
      </div>`;
    })
    .join('');

  app.innerHTML = `
    <div class="setup">
      <h1>Watten</h1>
      <div class="subtitle">Offenes Watten &middot; 2-4 Spieler &middot; KI-Gegner möglich</div>
      <div class="field">
        <label>Spieleranzahl</label>
        <div class="choice-row">${playerCountButtons}</div>
      </div>
      <div class="field">
        <label>Sitzplätze</label>
        <div class="seat-config">${seatRows}</div>
      </div>
      <div class="field">
        <label>Zielpunktzahl</label>
        <div class="choice-row">${targetButtons}</div>
      </div>
      <button class="start-btn" id="start-btn">Spiel starten</button>
    </div>
  `;

  app.querySelectorAll('[data-playercount]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setupState.playerCount = parseInt(btn.dataset.playercount, 10);
      renderSetup();
    });
  });
  app.querySelectorAll('[data-seattype]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const seat = parseInt(btn.dataset.seat, 10);
      setupState.seatTypes[seat] = btn.dataset.seattype;
      renderSetup();
    });
  });
  app.querySelectorAll('[data-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setupState.targetScore = parseInt(btn.dataset.target, 10);
      renderSetup();
    });
  });
  app.querySelector('#start-btn').addEventListener('click', startGame);
}

function assignCharacters(seatTypes) {
  const shuffled = CHARACTERS.slice();
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const characters = {};
  let nextCharacter = 0;
  seatTypes.forEach((type, seat) => {
    if (type === 'ai') {
      characters[seat] = shuffled[nextCharacter % shuffled.length];
      nextCharacter++;
    }
  });
  return characters;
}

function startGame() {
  ensureSeatTypesLength();
  app.innerHTML = '<div id="game-root"></div>';
  const gameRoot = document.getElementById('game-root');
  const characters = assignCharacters(setupState.seatTypes);
  const ui = new Ui(gameRoot, { characters });

  const game = new WattenGame({
    playerCount: setupState.playerCount,
    targetScore: setupState.targetScore,
    seatTypes: setupState.seatTypes.slice(),
    ui,
  });

  const players = setupState.seatTypes
    .slice(0, setupState.playerCount)
    .map((type, seat) => (type === 'human' ? new HumanController(seat, ui) : new AIController(seat)));
  game.setPlayers(players);

  game.playGame();
}

renderSetup();
