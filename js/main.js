import { WattenGame } from './engine.js';
import { HumanController, AIController } from './players.js';
import { Ui } from './ui.js';
import { audioManager } from './audio.js';

const app = document.getElementById('app');

// Feste KI-Charaktere (Grafiken via ChatGPT erzeugt, siehe assets/img).
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
  avatars: [null, null, null, null], // Index in CHARACTERS, oder null = zufällig
};

function ensureSeatTypesLength() {
  const n = setupState.playerCount;
  while (setupState.seatTypes.length < n) setupState.seatTypes.push('ai');
  setupState.seatTypes.length = n;
  while (setupState.avatars.length < n) setupState.avatars.push(null);
  setupState.avatars.length = n;
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
      const avatarThumbs = CHARACTERS.map(
        (c, idx) =>
          `<button class="avatar-thumb${setupState.avatars[i] === idx ? ' active' : ''}" data-seat="${i}" data-avatar="${idx}" title="${c.name}" style="background-image:url('${c.img}')"></button>`
      ).join('');
      const randomThumb = `<button class="avatar-thumb avatar-random${setupState.avatars[i] === null ? ' active' : ''}" data-seat="${i}" data-avatar="random" title="Zufällig">🎲</button>`;
      return `
      <div class="seat-row">
        <div class="seat-row-top">
          <span>${label}</span>
          <div class="choice-row">
            <button class="choice-btn${type === 'human' ? ' active' : ''}" data-seat="${i}" data-seattype="human">Mensch</button>
            <button class="choice-btn${type === 'ai' ? ' active' : ''}" data-seat="${i}" data-seattype="ai">KI</button>
          </div>
        </div>
        <div class="avatar-row">${randomThumb}${avatarThumbs}</div>
      </div>`;
    })
    .join('');

  const volumePct = Math.round(audioManager.volume * 100);

  app.innerHTML = `
    <div class="setup">
      <h1>Watten</h1>
      <div class="subtitle">Offenes Watten &middot; 2-4 Spieler &middot; KI-Gegner möglich</div>
      <div class="field">
        <label>Spieleranzahl</label>
        <div class="choice-row">${playerCountButtons}</div>
      </div>
      <div class="field">
        <label>Sitzplätze &amp; Avatare</label>
        <div class="seat-config">${seatRows}</div>
      </div>
      <div class="field">
        <label>Zielpunktzahl</label>
        <div class="choice-row">${targetButtons}</div>
      </div>
      <div class="field">
        <label>Musik</label>
        <div class="choice-row music-row">
          <button class="choice-btn${audioManager.enabled ? ' active' : ''}" id="music-toggle">${audioManager.enabled ? '🔊 An' : '🔇 Aus'}</button>
          <input type="range" id="music-volume" min="0" max="100" value="${volumePct}" />
          <span id="music-volume-label">${volumePct}%</span>
        </div>
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
  app.querySelectorAll('[data-avatar]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const seat = parseInt(btn.dataset.seat, 10);
      const val = btn.dataset.avatar;
      setupState.avatars[seat] = val === 'random' ? null : parseInt(val, 10);
      renderSetup();
    });
  });
  app.querySelectorAll('[data-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      setupState.targetScore = parseInt(btn.dataset.target, 10);
      renderSetup();
    });
  });
  app.querySelector('#music-toggle').addEventListener('click', () => {
    audioManager.setEnabled(!audioManager.enabled);
    renderSetup();
  });
  app.querySelector('#music-volume').addEventListener('input', (e) => {
    const v = parseInt(e.target.value, 10) / 100;
    audioManager.setVolume(v);
    app.querySelector('#music-volume-label').textContent = `${e.target.value}%`;
  });
  app.querySelector('#start-btn').addEventListener('click', startGame);
}

function resolveCharacters(seatTypes, avatarChoices) {
  const n = seatTypes.length;
  const characters = {};
  const usedIdx = new Set();

  for (let seat = 0; seat < n; seat++) {
    const choice = avatarChoices[seat];
    if (choice !== null && choice !== undefined) {
      characters[seat] = CHARACTERS[choice];
      usedIdx.add(choice);
    }
  }

  const remaining = CHARACTERS.map((_, i) => i).filter((i) => !usedIdx.has(i));
  for (let i = remaining.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [remaining[i], remaining[j]] = [remaining[j], remaining[i]];
  }
  let nextRemaining = 0;
  for (let seat = 0; seat < n; seat++) {
    if (characters[seat] === undefined) {
      const idx = remaining[nextRemaining % remaining.length];
      characters[seat] = CHARACTERS[idx];
      nextRemaining++;
    }
  }
  return characters;
}

function startGame() {
  ensureSeatTypesLength();
  audioManager.unlock();
  app.innerHTML = '<div id="game-root"></div>';
  const gameRoot = document.getElementById('game-root');
  const characters = resolveCharacters(setupState.seatTypes, setupState.avatars);
  const ui = new Ui(gameRoot, { characters, audioManager });

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
