// Rendert den Spieltisch und löst menschliche Eingaben als Promises auf.
// Die Engine ruft diese Methoden auf, ohne zu wissen, dass ein Mensch dahintersteckt.

import { SUIT_SYMBOL, SUIT_COLOR, RANKS, RANK_LABEL, cardId } from './cards.js';
import { legalPlays } from './rules.js';
import { SIGNALS, SIGNAL_TEXT } from './chat.js';

export class Ui {
  constructor(container, { characters = {} } = {}) {
    this.container = container;
    this.state = null;
    this.pending = null;
    this.pendingSignal = null;
    this.characters = characters; // seat -> { name, img }
    this.game = null; // wird von main.js gesetzt, für askPartner()
  }

  onLog() {
    // Rendering erfolgt zentral über onStateChange (Engine ruft danach emit() auf).
  }

  onStateChange(state) {
    this.state = state;
    this.render();
  }

  requestSchlag(seat) {
    return new Promise((resolve) => {
      this.pending = { type: 'schlag', seat, resolve };
      this.render();
    });
  }

  requestTrumpf(seat, hand, schlagRank) {
    return new Promise((resolve) => {
      this.pending = { type: 'trumpf', seat, schlagRank, resolve };
      this.render();
    });
  }

  requestRaiseOrPass(seat, hand, announcement, currentValue) {
    return new Promise((resolve) => {
      this.pending = { type: 'raiseOrPass', seat, currentValue, resolve };
      this.render();
    });
  }

  requestHoldOrFold(seat, hand, announcement, newValue) {
    return new Promise((resolve) => {
      this.pending = { type: 'holdOrFold', seat, newValue, resolve };
      this.render();
    });
  }

  requestHoldOrFoldForcedFour(seat) {
    return new Promise((resolve) => {
      this.pending = { type: 'holdOrFoldForced', seat, resolve };
      this.render();
    });
  }

  requestCardPlay(seat, context) {
    return new Promise((resolve) => {
      this.pending = { type: 'cardPlay', seat, context, resolve };
      this.render();
    });
  }

  requestSignal(seat, context) {
    return new Promise((resolve) => {
      this.pendingSignal = { seat, context, resolve };
      this.render();
    });
  }

  resolvePending(value) {
    if (!this.pending) return;
    const { resolve } = this.pending;
    this.pending = null;
    resolve(value);
  }

  resolveSignal(value) {
    if (!this.pendingSignal) return;
    const { resolve } = this.pendingSignal;
    this.pendingSignal = null;
    resolve(value);
  }

  cardHtml(card, { faceUp = true, clickable = false, disabled = false } = {}) {
    if (!faceUp) {
      return `<div class="card back"></div>`;
    }
    const weliClass = card.rank === 'Weli' ? ' weli' : '';
    const cls = `card${weliClass}${clickable && !disabled ? ' clickable' : ''}${disabled ? ' disabled' : ''}`;
    const color = SUIT_COLOR[card.suit];
    const label = card.rank === 'Weli' ? 'Weli' : RANK_LABEL[card.rank];
    const symbol = SUIT_SYMBOL[card.suit];
    return `<div class="${cls}" style="color:${color}" data-suit="${card.suit}" data-rank="${card.rank}">
      <div class="rank">${label}</div>
      <div class="suit-symbol">${symbol}</div>
    </div>`;
  }

  render() {
    if (!this.state) return;
    const s = this.state;

    if (s.gameOver) {
      this.container.innerHTML = this.renderGameOver(s);
      return;
    }

    const scoreboard = `
      <div class="scoreboard">
        ${s.variant.teamNames.map((name, i) => `<div class="score-item">${name}: <b>${s.scores[i]}</b> / ${s.targetScore}</div>`).join('')}
        <div class="score-item">Runde ${s.roundNumber}${s.roundValue ? ` · Einsatz: ${s.roundValue}` : ''}</div>
      </div>`;

    const announcementBanner = s.announcement
      ? `<div class="announcement-banner">Trumpf: <b>${s.announcement.trumpSuit}</b> ${SUIT_SYMBOL[s.announcement.trumpSuit]} &nbsp;|&nbsp; Schlag: <b>${s.announcement.schlagRank === 'Weli' ? 'Weli' : RANK_LABEL[s.announcement.schlagRank]}</b></div>`
      : `<div class="announcement-banner">Ansage läuft…</div>`;

    const seatsHtml = s.seatTypes
      .map((type, seat) => this.renderSeat(seat, type, s))
      .join('');

    const trickHtml = s.currentTrick.plays.length
      ? s.currentTrick.plays
          .map((p) => `<div class="trick-card-wrap"><div class="who">Sitz ${p.seat + 1}</div>${this.cardHtml(p.card)}</div>`)
          .join('')
      : `<div style="color:var(--muted)">Noch keine Karte gespielt</div>`;

    const actionPanel = this.renderActionPanel();
    const signalPanel = this.renderSignalPanel();

    const logHtml = s.messages
      .slice(-40)
      .map((m) => `<div>${this.escape(m)}</div>`)
      .join('');

    this.container.innerHTML = `
      <div class="table-wrap">
        ${scoreboard}
        ${announcementBanner}
        ${actionPanel}
        ${signalPanel}
        <div class="trick-area">${trickHtml}</div>
        <div class="seats-grid">${seatsHtml}</div>
        <div class="log-panel" id="log-panel">${logHtml}</div>
      </div>
    `;

    const logPanel = this.container.querySelector('#log-panel');
    if (logPanel) logPanel.scrollTop = logPanel.scrollHeight;

    this.wireEvents();
  }

  hasPartner(seat, s) {
    const team = s.variant.teams.find((t) => t.includes(seat));
    return team && team.length === 2;
  }

  renderSeat(seat, type, s) {
    const hand = s.hands[seat] || [];
    const isTurn = this.pending && this.pending.seat === seat;
    const character = this.characters[seat];
    const badge = type === 'human' ? 'Mensch' : character ? character.name : 'KI';
    let handHtml;
    if (type === 'human') {
      const isCardPlayTurn = this.pending && this.pending.type === 'cardPlay' && this.pending.seat === seat;
      const legal = isCardPlayTurn ? legalPlays(hand, s.currentTrick.ledCard, s.announcement) : [];
      handHtml = hand
        .map((c) => {
          const isLegal = legal.some((lc) => cardId(lc) === cardId(c));
          return this.cardHtml(c, { faceUp: true, clickable: isCardPlayTurn, disabled: isCardPlayTurn && !isLegal });
        })
        .join('');
    } else {
      handHtml = hand.map(() => this.cardHtml(null, { faceUp: false })).join('');
    }

    const portraitStyle = character
      ? ` style="background-image:url('${character.img}')"`
      : '';
    const askBtn =
      type === 'human' && s.phase === 'playing' && this.hasPartner(seat, s)
        ? `<button class="ask-partner-btn" data-ask-partner="${seat}">🗣️ Hast du noch was?</button>`
        : '';

    return `
      <div class="seat-box${isTurn ? ' turn' : ''}${character ? ' has-portrait' : ''}" data-seat="${seat}"${portraitStyle}>
        <div class="seat-title"><span>Sitz ${seat + 1}</span><span class="badge">${badge}</span></div>
        <div class="hand" data-hand-seat="${seat}">${handHtml}</div>
        ${askBtn}
      </div>`;
  }

  renderActionPanel() {
    const p = this.pending;
    if (!p) return '';
    if (p.type === 'schlag') {
      const buttons = [...RANKS, 'Weli']
        .map((r) => `<button class="action-btn" data-schlag="${r}">${r === 'Weli' ? 'Weli' : RANK_LABEL[r]}</button>`)
        .join('');
      return `<div class="action-panel"><div class="prompt">Sitz ${p.seat + 1}: Schlag ansagen</div><div class="action-buttons">${buttons}</div></div>`;
    }
    if (p.type === 'trumpf') {
      const buttons = Object.keys(SUIT_SYMBOL)
        .map((suit) => `<button class="action-btn" data-trumpf="${suit}">${suit} ${SUIT_SYMBOL[suit]}</button>`)
        .join('');
      return `<div class="action-panel"><div class="prompt">Sitz ${p.seat + 1}: Trumpf ansagen (Schlag ist ${p.schlagRank === 'Weli' ? 'Weli' : RANK_LABEL[p.schlagRank]})</div><div class="action-buttons">${buttons}</div></div>`;
    }
    if (p.type === 'raiseOrPass') {
      return `<div class="action-panel"><div class="prompt">Sitz ${p.seat + 1}: Bieten (aktuell ${p.currentValue} Punkte)</div>
        <div class="action-buttons">
          <button class="action-btn" data-bid="raise">Erhöhen auf ${p.currentValue + 1}</button>
          <button class="action-btn" data-bid="pass">Passen (bei ${p.currentValue} bleiben)</button>
        </div></div>`;
    }
    if (p.type === 'holdOrFold') {
      return `<div class="action-panel"><div class="prompt">Sitz ${p.seat + 1}: Gegner erhöht auf ${p.newValue} Punkte</div>
        <div class="action-buttons">
          <button class="action-btn" data-bid="hold">Halten (auf ${p.newValue})</button>
          <button class="action-btn danger" data-bid="fold">Gehen</button>
        </div></div>`;
    }
    if (p.type === 'holdOrFoldForced') {
      return `<div class="action-panel"><div class="prompt">Sitz ${p.seat + 1}: Ihr seid gestrichen – "es gehen die Vier"</div>
        <div class="action-buttons">
          <button class="action-btn" data-bid="hold">Halten (um 4 spielen)</button>
          <button class="action-btn danger" data-bid="fold">Gehen (Gegner bekommt 2)</button>
        </div></div>`;
    }
    if (p.type === 'cardPlay') {
      return `<div class="action-panel"><div class="prompt">Sitz ${p.seat + 1}: wähle eine Karte</div></div>`;
    }
    return '';
  }

  renderSignalPanel() {
    const p = this.pendingSignal;
    if (!p) return '';
    return `<div class="action-panel signal-panel">
      <div class="prompt">Sitz ${p.seat + 1} zu Sitz ${p.context.partnerSeat + 1}: dem Partner etwas zurufen?</div>
      <div class="action-buttons">
        <button class="action-btn" data-signal="${SIGNALS.MACH_DU}">🗣️ Ich kann nicht, mach du den Stich!</button>
        <button class="action-btn" data-signal="${SIGNALS.LASS_IHN}">🗣️ Lass ihn, das ist meiner!</button>
        <button class="action-btn" data-signal="NONE">… (nichts sagen)</button>
      </div>
    </div>`;
  }

  renderGameOver(s) {
    return `
      <div class="table-wrap">
        <div class="game-over-banner">
          <h2>🏆 ${s.variant.teamNames[s.winnerTeam]} gewinnt!</h2>
          <div>${s.variant.teamNames.map((n, i) => `${n}: ${s.scores[i]}`).join(' | ')}</div>
          <button class="start-btn" id="restart-btn" style="max-width:240px;margin:16px auto 0;">Neues Spiel</button>
        </div>
        <div class="log-panel">${s.messages.slice(-60).map((m) => `<div>${this.escape(m)}</div>`).join('')}</div>
      </div>`;
  }

  wireEvents() {
    this.container.querySelectorAll('[data-schlag]').forEach((btn) => {
      btn.addEventListener('click', () => this.resolvePending(btn.dataset.schlag));
    });
    this.container.querySelectorAll('[data-trumpf]').forEach((btn) => {
      btn.addEventListener('click', () => this.resolvePending(btn.dataset.trumpf));
    });
    this.container.querySelectorAll('[data-bid]').forEach((btn) => {
      const map = { raise: 'raise', pass: 'pass', hold: 'hold', fold: 'fold' };
      btn.addEventListener('click', () => this.resolvePending(map[btn.dataset.bid]));
    });
    this.container.querySelectorAll('[data-signal]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = btn.dataset.signal;
        this.resolveSignal(v === 'NONE' ? null : v);
      });
    });
    this.container.querySelectorAll('[data-ask-partner]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const seat = parseInt(btn.dataset.askPartner, 10);
        if (this.game) this.game.askPartner(seat);
      });
    });
    if (this.pending && this.pending.type === 'cardPlay') {
      const handEl = this.container.querySelector(`[data-hand-seat="${this.pending.seat}"]`);
      if (handEl) {
        handEl.querySelectorAll('.card.clickable').forEach((el) => {
          el.addEventListener('click', () => {
            const card = { suit: el.dataset.suit, rank: el.dataset.rank };
            this.resolvePending(card);
          });
        });
      }
    }
    const restartBtn = this.container.querySelector('#restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => window.location.reload());
    }
  }

  escape(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
