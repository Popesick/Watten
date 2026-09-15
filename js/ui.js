// Rendert den Spieltisch und löst menschliche Eingaben als Promises auf.
// Die Engine ruft diese Methoden auf, ohne zu wissen, dass ein Mensch dahintersteckt.

import { SUIT_SYMBOL, SUIT_COLOR, SUIT_PRIORITY, RANKS, RANK_LABEL, cardId, suitLabel, rankIndex } from './cards.js';
import { legalPlays, sortByStrength, isKritisch } from './rules.js';
import { ASK_TEXT, GEHN_TEXT } from './chat.js';

const TEAM_COLOR = ['#d4af37', '#6fa8dc', '#8bc34a', '#e07a5f'];

export class Ui {
  constructor(container, { characters = {}, audioManager = null } = {}) {
    this.container = container;
    this.state = null;
    this.pending = null;
    this.pendingConfirm = null;
    this.characters = characters; // seat -> { name, img }
    this.audioManager = audioManager;
    this.handOrder = {}; // seat -> [cardId, ...] Anzeige-/Wunschreihenfolge der eigenen Hand
    this.handOrderMeta = {}; // seat -> { size, annKey } zur Erkennung von neuem Blatt/neuer Ansage
    this._dragSeat = null;
  }

  onLog() {
    // Rendering erfolgt zentral über onStateChange (Engine ruft danach emit() auf).
  }

  onStateChange(state) {
    this.state = state;
    this.render();
  }

  /** Hook für die Engine: Mischen beginnt (nur Existenz schaltet die Animation frei). */
  onShuffle() {
    // Kein eigener Mischsound vorhanden - die Pause/Anzeige übernimmt render()
    // rein anhand des Spielzustands (Phase "dealing" + leere Hände).
  }

  /** Hook für die Engine: eine einzelne Karte wurde gerade ausgeteilt. */
  onCardDealt() {
    if (this.audioManager) this.audioManager.playSfx('deal');
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

  requestGehnResponse(seat, context) {
    return new Promise((resolve) => {
      this.pending = { type: 'gehnResponse', seat, context, resolve };
      this.render();
    });
  }

  requestGehnFourResponse(seat, context) {
    return new Promise((resolve) => {
      this.pending = { type: 'gehnFourResponse', seat, context, resolve };
      this.render();
    });
  }

  requestAskAnswer(seat, context) {
    return new Promise((resolve) => {
      this.pending = { type: 'askAnswer', seat, context, resolve };
      this.render();
    });
  }

  /** Pausiert nach jedem Stich, bis ein Mensch die Begründung bestätigt hat. */
  confirmTrick(info) {
    return new Promise((resolve) => {
      this.pendingConfirm = { info, resolve };
      this.render();
    });
  }

  resolvePending(value) {
    if (!this.pending) return;
    const { resolve } = this.pending;
    this.pending = null;
    resolve(value);
  }

  resolveConfirm() {
    if (!this.pendingConfirm) return;
    const { resolve } = this.pendingConfirm;
    this.pendingConfirm = null;
    resolve();
  }

  /**
   * Liefert die Hand eines Sitzes in Anzeige-Reihenfolge: automatisch absteigend
   * sortiert (Maxe/Welln/Soache > Haube > Schlag > Trumpf > Farbe, je
   * Sau bis Sieben), neu berechnet bei frischem Blatt oder sobald Trumpf/Schlag
   * bekannt wird - danach bleibt eine manuelle Umsortierung (Drag & Drop) erhalten.
   */
  getOrderedHand(seat, hand, announcement) {
    const annKey = announcement ? `${announcement.trumpSuit}-${announcement.schlagRank}` : null;
    const meta = this.handOrderMeta[seat];
    const isNewDeal = !meta || hand.length > meta.size;
    const annJustKnown = !!meta && meta.annKey === null && annKey !== null;

    if (isNewDeal || annJustKnown || !this.handOrder[seat]) {
      const sorted = announcement
        ? sortByStrength(hand, announcement).reverse()
        : hand
            .slice()
            .sort((a, b) => SUIT_PRIORITY[b.suit] - SUIT_PRIORITY[a.suit] || rankIndex(b.rank) - rankIndex(a.rank));
      this.handOrder[seat] = sorted.map(cardId);
    } else {
      const presentIds = new Set(hand.map(cardId));
      this.handOrder[seat] = this.handOrder[seat].filter((id) => presentIds.has(id));
      for (const c of hand) {
        if (!this.handOrder[seat].includes(cardId(c))) this.handOrder[seat].push(cardId(c));
      }
    }
    this.handOrderMeta[seat] = { size: hand.length, annKey };

    const byId = new Map(hand.map((c) => [cardId(c), c]));
    return this.handOrder[seat].map((id) => byId.get(id)).filter(Boolean);
  }

  reorderHand(seat, draggedId, targetId) {
    if (draggedId === targetId) return;
    const order = this.handOrder[seat];
    if (!order) return;
    const from = order.indexOf(draggedId);
    const to = order.indexOf(targetId);
    if (from === -1 || to === -1) return;
    order.splice(from, 1);
    order.splice(to, 0, draggedId);
    this.render();
  }

  cardHtml(card, { faceUp = true, clickable = false, disabled = false, draggable = false, highlightKritisch = false } = {}) {
    if (!faceUp) {
      return `<div class="card back"></div>`;
    }
    const kritisch = highlightKritisch && isKritisch(card);
    const cls = `card${clickable && !disabled ? ' clickable' : ''}${disabled ? ' disabled' : ''}${kritisch ? ' kritisch-played' : ''}`;
    const color = SUIT_COLOR[card.suit];
    const label = RANK_LABEL[card.rank];
    const symbol = SUIT_SYMBOL[card.suit];
    return `<div class="${cls}" style="color:${color}" data-suit="${card.suit}" data-rank="${card.rank}"${draggable ? ' draggable="true"' : ''}>
      <div class="rank">${label}</div>
      <div class="suit-symbol">${symbol}</div>
    </div>`;
  }

  render() {
    if (!this.state) return;
    const s = this.state;

    if (s.gameOver) {
      this.container.innerHTML = this.renderGameOver(s);
      this.wireEvents();
      return;
    }

    const isDealing = s.phase === 'dealing' && s.hands.every((h) => h.length === 0);

    const scoreboard = `
      <div class="scoreboard">
        ${s.variant.teamNames.map((name, i) => `<div class="score-item"><span class="team-dot" style="background:${TEAM_COLOR[i]}"></span>${name}: <b>${s.scores[i]}</b> / ${s.targetScore}</div>`).join('')}
        <div class="score-item">Runde ${s.roundNumber}${s.roundValue ? ` · Einsatz: ${s.roundValue}` : ''}</div>
        ${this.renderMusicToggle()}
      </div>`;

    const announcementBanner = isDealing
      ? `<div class="announcement-banner">🃏 Karten werden gemischt…</div>`
      : s.announcement
      ? `<div class="announcement-banner">Trumpf: <b style="color:${SUIT_COLOR[s.announcement.trumpSuit]}">${suitLabel(s.announcement.trumpSuit)}</b> ${SUIT_SYMBOL[s.announcement.trumpSuit]} &nbsp;|&nbsp; Schlag: <b>${RANK_LABEL[s.announcement.schlagRank]}</b>${s.currentTrick.trumpfOderKritisch ? ' &nbsp;|&nbsp; <span style="color:#ffb347">Trumpf oder Kritisch!</span>' : ''}</div>`
      : `<div class="announcement-banner">Ansage läuft…</div>`;

    const seatsHtml = s.seatTypes
      .map((type, seat) => this.renderSeat(seat, type, s))
      .join('');

    const pendingCardPlay = this.pending && this.pending.type === 'cardPlay' ? this.pending : null;
    const partnerSeatsInView = pendingCardPlay ? pendingCardPlay.context.partnerSeats || [] : [];

    const trickHtml = s.currentTrick.plays.length
      ? s.currentTrick.plays
          .map((p) => {
            const isPartner = partnerSeatsInView.includes(p.seat);
            return `<div class="trick-card-wrap${isPartner ? ' partner-card' : ''}"><div class="who">Sitz ${p.seat + 1}${isPartner ? ' 🤝' : ''}</div>${this.cardHtml(p.card, { highlightKritisch: true })}</div>`;
          })
          .join('')
      : `<div style="color:var(--muted)">Noch keine Karte gespielt</div>`;

    const actionPanel = this.renderActionPanel();
    const confirmPanel = this.renderConfirmPanel();

    const logHtml = s.messages
      .slice(-40)
      .map((m) => `<div>${this.escape(m)}</div>`)
      .join('');

    this.container.innerHTML = `
      <div class="table-wrap">
        ${scoreboard}
        ${announcementBanner}
        ${actionPanel}
        ${confirmPanel}
        <div class="trick-area">${trickHtml}</div>
        <div class="seats-grid">${seatsHtml}</div>
        <div class="log-panel" id="log-panel">${logHtml}</div>
      </div>
    `;

    const logPanel = this.container.querySelector('#log-panel');
    if (logPanel) logPanel.scrollTop = logPanel.scrollHeight;

    this.wireEvents();
  }

  renderMusicToggle() {
    if (!this.audioManager) return '';
    const on = this.audioManager.enabled;
    return `<button class="music-toggle-btn" id="ingame-music-toggle" title="Musik ${on ? 'ausschalten' : 'einschalten'}">${on ? '🔊' : '🔇'}</button>`;
  }

  teamOf(seat, s) {
    return s.variant.teams.findIndex((t) => t.includes(seat));
  }

  hasPartner(seat, s) {
    const team = s.variant.teams.find((t) => t.includes(seat));
    return team && team.length === 2;
  }

  renderSeat(seat, type, s) {
    const rawHand = s.hands[seat] || [];
    const isTurn = this.pending && this.pending.seat === seat;
    const character = this.characters[seat];
    const badge = character ? character.name : type === 'human' ? 'Mensch' : 'KI';
    const teamIdx = this.teamOf(seat, s);
    let handHtml;
    if (type === 'human') {
      const hand = this.getOrderedHand(seat, rawHand, s.announcement);
      const isCardPlayTurn = this.pending && this.pending.type === 'cardPlay' && this.pending.seat === seat;
      const legal = isCardPlayTurn
        ? legalPlays(rawHand, s.currentTrick.ledCard, s.announcement, { trumpfOderKritisch: s.currentTrick.trumpfOderKritisch })
        : [];
      handHtml = hand
        .map((c) => {
          const isLegal = legal.some((lc) => cardId(lc) === cardId(c));
          return this.cardHtml(c, {
            faceUp: true,
            clickable: isCardPlayTurn,
            disabled: isCardPlayTurn && !isLegal,
            draggable: true,
          });
        })
        .join('');
    } else {
      handHtml = rawHand.map(() => this.cardHtml(null, { faceUp: false })).join('');
    }

    const portraitStyle = character
      ? ` style="background-image:url('${character.img}')"`
      : '';

    return `
      <div class="seat-box${isTurn ? ' turn' : ''}${character ? ' has-portrait' : ''}" data-seat="${seat}"${portraitStyle}>
        <div class="seat-title">
          <span><span class="team-dot" style="background:${TEAM_COLOR[teamIdx]}"></span>Sitz ${seat + 1}</span>
          <span class="badge">${badge}</span>
        </div>
        <div class="hand" data-hand-seat="${seat}">${handHtml}</div>
      </div>`;
  }

  renderActionPanel() {
    const p = this.pending;
    if (!p) return '';
    if (p.type === 'schlag') {
      const buttons = RANKS
        .map((r) => `<button class="action-btn" data-schlag="${r}">${RANK_LABEL[r]}</button>`)
        .join('');
      return `<div class="action-panel"><div class="prompt">Sitz ${p.seat + 1}: Schlag ansagen</div><div class="action-buttons">${buttons}</div></div>`;
    }
    if (p.type === 'trumpf') {
      const buttons = Object.keys(SUIT_SYMBOL)
        .map(
          (suit) =>
            `<button class="action-btn" data-trumpf="${suit}" style="color:${SUIT_COLOR[suit]};border-color:${SUIT_COLOR[suit]}">${suitLabel(suit)} ${SUIT_SYMBOL[suit]}</button>`
        )
        .join('');
      return `<div class="action-panel"><div class="prompt">Sitz ${p.seat + 1}: Trumpf ansagen (Schlag ist ${RANK_LABEL[p.schlagRank]})</div><div class="action-buttons">${buttons}</div></div>`;
    }
    if (p.type === 'holdOrFoldForced') {
      return `<div class="action-panel"><div class="prompt">Sitz ${p.seat + 1}: Ihr seid gestrichen – "es gehen die Vier"</div>
        <div class="action-buttons">
          <button class="action-btn" data-bid="hold">Halten (um 4 spielen)</button>
          <button class="action-btn danger" data-bid="fold">Gehen (Gegner bekommt 2)</button>
        </div></div>`;
    }
    if (p.type === 'gehnResponse') {
      return `<div class="action-panel gehn-panel"><div class="prompt">Sitz ${p.seat + 1}: "${GEHN_TEXT.QUESTION}"</div>
        <div class="action-buttons">
          <button class="action-btn" data-gehn="JA">Ja</button>
          <button class="action-btn" data-gehn="NEIN">Nein</button>
          <button class="action-btn" data-gehn="VIER">Vier</button>
        </div></div>`;
    }
    if (p.type === 'gehnFourResponse') {
      return `<div class="action-panel gehn-panel"><div class="prompt">Sitz ${p.seat + 1}: Gegner sagt "Vier!"</div>
        <div class="action-buttons">
          <button class="action-btn" data-gehn="WEITER">Ok, weiter</button>
          <button class="action-btn danger" data-gehn="RAUS">Ich bin raus</button>
        </div></div>`;
    }
    if (p.type === 'askAnswer') {
      return `<div class="action-panel ask-panel"><div class="prompt">Sitz ${p.seat + 1}: Partner fragt "${ASK_TEXT.QUESTION}"</div>
        <div class="action-buttons">
          <button class="action-btn" data-ask="JA">${ASK_TEXT.JA}</button>
          <button class="action-btn" data-ask="NEIN">${ASK_TEXT.NEIN}</button>
        </div></div>`;
    }
    if (p.type === 'cardPlay') {
      const ctx = p.context || {};
      const metaButtons = [];
      if (ctx.gehnAvailable) metaButtons.push(`<button class="action-btn meta-btn" data-meta="GEHN">🎲 Gehn?</button>`);
      if (ctx.canAsk) metaButtons.push(`<button class="action-btn meta-btn" data-meta="ASK">🗣️ ${ASK_TEXT.QUESTION}</button>`);
      const infoLine = ctx.receivedAnswer
        ? `<div class="prompt" style="margin-top:6px">Partner: "${ASK_TEXT[ctx.receivedAnswer]}"</div>`
        : '';
      const partnerNote = ctx.partnerIsWinning
        ? ' Der Stich gehört gerade euch!'
        : '';
      return `<div class="action-panel"><div class="prompt">Sitz ${p.seat + 1}: wähle eine Karte.${partnerNote}</div>${infoLine}${
        metaButtons.length ? `<div class="action-buttons">${metaButtons.join('')}</div>` : ''
      }</div>`;
    }
    return '';
  }

  renderConfirmPanel() {
    const p = this.pendingConfirm;
    if (!p) return '';
    return `<div class="action-panel confirm-panel">
      <div class="prompt">Sitz ${p.info.winnerSeat + 1} sticht ${p.info.reasonText}. Stand: ${p.info.stitches.join(':')}</div>
      <div class="action-buttons">
        <button class="action-btn" data-confirm="1">Weiter</button>
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
      const map = { hold: 'hold', fold: 'fold' };
      btn.addEventListener('click', () => this.resolvePending(map[btn.dataset.bid]));
    });
    this.container.querySelectorAll('[data-gehn]').forEach((btn) => {
      btn.addEventListener('click', () => this.resolvePending(btn.dataset.gehn));
    });
    this.container.querySelectorAll('[data-ask]').forEach((btn) => {
      btn.addEventListener('click', () => this.resolvePending(btn.dataset.ask));
    });
    this.container.querySelectorAll('[data-meta]').forEach((btn) => {
      btn.addEventListener('click', () => this.resolvePending(btn.dataset.meta));
    });
    this.container.querySelectorAll('[data-confirm]').forEach((btn) => {
      btn.addEventListener('click', () => this.resolveConfirm());
    });
    const musicBtn = this.container.querySelector('#ingame-music-toggle');
    if (musicBtn && this.audioManager) {
      musicBtn.addEventListener('click', () => {
        this.audioManager.setEnabled(!this.audioManager.enabled);
        this.render();
      });
    }
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
    // Drag & Drop: eigene Hand jederzeit manuell umsortierbar.
    this.container.querySelectorAll('.hand').forEach((handEl) => {
      const seat = parseInt(handEl.dataset.handSeat, 10);
      if (!this.state || this.state.seatTypes[seat] !== 'human') return;
      handEl.querySelectorAll('.card[draggable="true"]').forEach((cardEl) => {
        cardEl.addEventListener('dragstart', (e) => {
          this._dragSeat = seat;
          if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', `${cardEl.dataset.suit}-${cardEl.dataset.rank}`);
          }
        });
        cardEl.addEventListener('dragover', (e) => {
          if (this._dragSeat !== seat) return;
          e.preventDefault();
        });
        cardEl.addEventListener('drop', (e) => {
          e.preventDefault();
          if (this._dragSeat !== seat) return;
          const draggedId = e.dataTransfer.getData('text/plain');
          const targetId = `${cardEl.dataset.suit}-${cardEl.dataset.rank}`;
          this.reorderHand(seat, draggedId, targetId);
        });
      });
    });
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
