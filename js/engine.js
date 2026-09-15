// Spiel-Engine für "Offenes Watten", 2-4 Spieler.
// Orchestriert Runde für Runde: Austeilen, Ansage (Schlag/Trumpf),
// Stiche spielen, Punkte vergeben. Fragt Entscheidungen bei den jeweiligen
// Player-Controllern (Human/AI) ab, ohne zu unterscheiden, wer dahintersteckt.
//
// Dokumentierte Vereinfachungen gegenüber den vollen Grundregeln:
// - Nur "Offenes Watten" (keine verdeckte Ansage / kein Blindspiel).
// - Kein Schlagtausch, kein "Schöner", kein "nichts ansagen".
// - "Gehn?" (spontanes Bieten) ist jederzeit möglich, wenn ein Spieler am
//   Zug ist, aber nur EINMAL pro Runde. Beim Bieten/Antworten entscheidet
//   je Team ein "Wortführer" (der erste Sitzplatz des Teams).
// - "Es gehen die Vier" wird nur im klassischen 2-Team-Fall (2er/4er)
//   angewendet; in dieser Runde ist "Gehn?" dann nicht zusätzlich möglich.

import { createDeck, shuffle, suitLabel, cardLabel } from './cards.js';
import { legalPlays, trickWinner, cardsEqual, compareInTrick, haubeCard, describeWin, hasMaschin } from './rules.js';
import { VARIANTS, teamOfSeat } from './variants.js';
import { ASK_TEXT, GEHN_TEXT } from './chat.js';

export class WattenGame {
  constructor({ playerCount, targetScore, seatTypes, ui }) {
    this.variant = VARIANTS[playerCount];
    this.n = playerCount;
    this.targetScore = targetScore;
    this.ui = ui;
    this.seatTypes = seatTypes; // ['human'|'ai', ...] Länge n
    this.scores = this.variant.teams.map(() => 0);
    this.dealerIndex = 0;
    this.roundNumber = 0;
    this.hands = [];
    this.announcement = null;
    this.roundValue = 2;
    this.stitches = [];
    this.messages = [];
    this.phase = 'setup';
    this.gameOver = false;
    this.winnerTeam = null;
    this.gehnUsedThisRound = false;
  }

  setPlayers(players) {
    this.players = players; // Array<HumanController|AIController>, Index = Sitzplatz
  }

  log(msg) {
    this.messages.push(msg);
    if (this.messages.length > 200) this.messages.shift();
    this.ui.onLog(msg);
  }

  captainOf(teamIdx) {
    return this.variant.teams[teamIdx][0];
  }

  emit() {
    this.ui.onStateChange(this.getPublicState());
  }

  getPublicState() {
    return {
      variant: this.variant,
      n: this.n,
      dealerIndex: this.dealerIndex,
      scores: this.scores,
      targetScore: this.targetScore,
      roundNumber: this.roundNumber,
      announcement: this.announcement,
      roundValue: this.roundValue,
      stitches: this.stitches,
      hands: this.hands,
      currentTrick: this.currentTrick || { ledCard: null, plays: [] },
      phase: this.phase,
      seatTypes: this.seatTypes,
      gameOver: this.gameOver,
      winnerTeam: this.winnerTeam,
      messages: this.messages,
    };
  }

  async playGame() {
    while (Math.max(...this.scores) < this.targetScore) {
      await this.playRound();
    }
    this.gameOver = true;
    this.winnerTeam = this.scores.indexOf(Math.max(...this.scores));
    this.phase = 'gameOver';
    this.log(
      `🏆 ${this.variant.teamNames[this.winnerTeam]} gewinnt das Spiel mit ${this.scores[this.winnerTeam]} Punkten!`
    );
    this.emit();
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Mischt und teilt aus. Wenn die UI Sound-Hooks anbietet (onShuffle/
   * onCardDealt), läuft das animiert ab: kurze Misch-Pause, dann werden die
   * Karten einzeln der Reihe nach ausgeteilt statt alle auf einmal.
   */
  async deal() {
    const deck = shuffle(createDeck());
    const hands = Array.from({ length: this.n }, () => []);

    if (typeof this.ui.onShuffle === 'function') {
      this.ui.onShuffle();
      await this.sleep(3000);
    }

    let idx = 0;
    for (let round = 0; round < this.variant.cardsPerHand; round++) {
      for (let s = 0; s < this.n; s++) {
        hands[s].push(deck[idx]);
        idx++;
        this.hands = hands.map((h) => h.slice());
        this.emit();
        if (typeof this.ui.onCardDealt === 'function') {
          this.ui.onCardDealt();
          await this.sleep(140);
        }
      }
    }
    this.hands = hands;
  }

  checkForcedFour() {
    if (!this.variant.forcedFourApplies || this.variant.teams.length !== 2) return null;
    const target = this.targetScore;
    const gestrichen = this.scores.map((s) => target - s <= 2);
    if (!gestrichen[0] && !gestrichen[1]) return null;
    if (gestrichen[0] && gestrichen[1]) return null; // beide gestrichen -> normal
    const gap = Math.abs(this.scores[0] - this.scores[1]);
    if (gap < 4) return null;
    const gestrichenTeam = gestrichen[0] ? 0 : 1;
    return gestrichenTeam;
  }

  async playRound() {
    this.roundNumber++;
    this.phase = 'dealing';
    this.announcement = null;
    this.currentTrick = { ledCard: null, plays: [] };
    this.stitches = this.variant.teams.map(() => 0);
    this.roundValue = 2;
    this.hands = Array.from({ length: this.n }, () => []);
    this.emit();

    await this.deal();

    for (let seat = 0; seat < this.n; seat++) {
      if (hasMaschin(this.hands[seat])) {
        this.log(`Sitz ${seat + 1}: du hast a Maschin!`);
      }
    }

    const schlagSeat = (this.dealerIndex + 1) % this.n;
    const trumpSeat = this.dealerIndex;

    this.log(`--- Runde ${this.roundNumber}: ${this.variant.teamNames.map((n, i) => `${n}: ${this.scores[i]}`).join(' | ')} ---`);

    this.phase = 'announcing';
    const schlagRank = await this.players[schlagSeat].chooseSchlag(this.hands[schlagSeat]);
    this.log(`Sitz ${schlagSeat + 1} sagt Schlag an.`);
    this.emit();

    const trumpSuit = await this.players[trumpSeat].chooseTrumpf(this.hands[trumpSeat], schlagRank);
    this.announcement = { trumpSuit, schlagRank };
    this.log(
      `Sitz ${trumpSeat + 1} sagt Trumpf an: ${suitLabel(trumpSuit)}, Schlag: ${schlagRank}.`
    );
    this.emit();

    const forcedGestrichenTeam = this.checkForcedFour();
    if (forcedGestrichenTeam !== null) {
      this.roundValue = 4;
      this.gehnUsedThisRound = true; // "Gehn?" entfällt, wenn "es gehen die Vier" bereits greift
      this.phase = 'bidding';
      this.emit();
      const captain = this.captainOf(forcedGestrichenTeam);
      const decision = await this.players[captain].decideHoldOrFoldForcedFour(
        this.hands[captain],
        this.announcement
      );
      const otherTeam = forcedGestrichenTeam === 0 ? 1 : 0;
      if (decision === 'fold') {
        this.log(
          `${this.variant.teamNames[forcedGestrichenTeam]} ist gestrichen und geht bei "es gehen die Vier" – ${this.variant.teamNames[otherTeam]} erhält 2 Punkte.`
        );
        this.scores[otherTeam] += 2;
        this.log(`Runde beendet ohne Stichspiel. ${this.variant.teamNames[otherTeam]} erhält 2 Punkte.`);
        this.dealerIndex = (this.dealerIndex + 1) % this.n;
        this.emit();
        return;
      }
      this.log(`${this.variant.teamNames[forcedGestrichenTeam]} hält bei "es gehen die Vier" – es wird um 4 Punkte gespielt.`);
    } else {
      this.gehnUsedThisRound = false;
    }

    const activeTeams = this.variant.teams.map((_, i) => i);
    await this.playTricks(schlagSeat, activeTeams);
    this.dealerIndex = (this.dealerIndex + 1) % this.n;
  }

  /**
   * "Gehn?" - spontanes Bieten, das jederzeit möglich ist, wenn ein Spieler
   * am Zug ist (siehe playTricks). challengerSeat fragt die Gegenseite.
   * Rückgabe: true, wenn die Runde dadurch sofort beendet wurde (Punkte
   * sind bereits vergeben), sonst false (Runde läuft weiter, ggf. mit
   * erhöhtem roundValue).
   */
  async runGehnNegotiation(challengerSeat) {
    const challengerTeam = teamOfSeat(this.variant, challengerSeat);
    const opponentTeams = this.variant.teams.map((_, i) => i).filter((t) => t !== challengerTeam);
    this.log(`Sitz ${challengerSeat + 1}: "${GEHN_TEXT.QUESTION}"`);
    this.emit();

    // Bei mehr als einer Gegenseite (3er-Watten) einzeln nacheinander fragen;
    // die erste Antwort, die nicht "Ja" ist, bestimmt das weitere Vorgehen.
    let deciding = null;
    for (const oppTeam of opponentTeams) {
      const oppCaptain = this.captainOf(oppTeam);
      const resp = await this.players[oppCaptain].decideGehnResponse({
        hand: this.hands[oppCaptain],
        announcement: this.announcement,
      });
      this.log(`${this.variant.teamNames[oppTeam]}: "${GEHN_TEXT[resp]}"`);
      this.emit();
      if (resp !== 'JA') {
        deciding = { oppTeam, resp };
        break;
      }
    }

    if (!deciding) {
      // Alle Gegner sind gegangen.
      this.scores[challengerTeam] += 2;
      this.log(`${this.variant.teamNames[challengerTeam]} erhält 2 Punkte. Runde beendet.`);
      this.emit();
      return true;
    }

    if (deciding.resp === 'NEIN') {
      this.roundValue = 3;
      this.log(`Es wird um 3 Punkte weitergespielt.`);
      this.emit();
      return false;
    }

    // 'VIER' - der Herausforderer muss nun entscheiden: weiter auf 4, oder raus.
    const resp2 = await this.players[challengerSeat].decideGehnFourResponse({
      hand: this.hands[challengerSeat],
      announcement: this.announcement,
    });
    this.log(`${this.variant.teamNames[challengerTeam]}: "${GEHN_TEXT[resp2]}"`);
    if (resp2 === 'WEITER') {
      this.roundValue = 4;
      this.log(`Es wird um 4 Punkte weitergespielt.`);
      this.emit();
      return false;
    }
    this.scores[deciding.oppTeam] += 2;
    this.log(`${this.variant.teamNames[deciding.oppTeam]} erhält 2 Punkte. Runde beendet.`);
    this.emit();
    return true;
  }

  rotateFrom(seats, startSeat) {
    const idx = seats.indexOf(startSeat);
    const start = idx >= 0 ? idx : 0;
    return seats.map((_, i) => seats[(start + i) % seats.length]);
  }

  async playTricks(schlagSeat, activeTeams) {
    this.phase = 'playing';
    const activeSeats = activeTeams
      .flatMap((t) => this.variant.teams[t])
      .sort((a, b) => a - b);

    let leaderSeat = activeSeats.includes(schlagSeat)
      ? schlagSeat
      : this.rotateFrom(activeSeats, schlagSeat)[0];
    let trickNumber = 0;

    while (Math.max(...this.stitches) < 3) {
      trickNumber++;
      const order = this.rotateFrom(activeSeats, leaderSeat);
      const trickPlays = [];
      let ledCard = null;
      let trumpfOderKritisch = false;
      this.currentTrick = { ledCard: null, plays: [], trumpfOderKritisch: false };
      const askedThisTrick = new Set();
      this.emit();

      for (const seat of order) {
        const hand = this.hands[seat];
        const teamOfCurrent = teamOfSeat(this.variant, seat);
        const currentBestPlay = trickPlays.length
          ? trickPlays.reduce((best, p) =>
              compareInTrick(p.card, best.card, ledCard.suit, this.announcement) > 0 ? p : best
            )
          : null;
        const partnerSeats = this.variant.teams[teamOfCurrent].filter((s) => s !== seat);
        const partnerIsWinning = currentBestPlay ? partnerSeats.includes(currentBestPlay.seat) : false;
        const isDecisiveTrick = this.stitches.some((s) => s === 2);
        const hasPartner = partnerSeats.length === 1;
        const partnerSeat = hasPartner ? partnerSeats[0] : null;
        const partnerAlreadyPlayed = partnerSeat !== null && trickPlays.some((p) => p.seat === partnerSeat);

        let context = {
          hand,
          ledCard,
          trickPlays,
          announcement: this.announcement,
          isDecisiveTrick,
          mySeat: seat,
          partnerSeats,
          partnerIsWinning,
          partnerAlreadyPlayed,
          trumpfOderKritisch,
          gehnAvailable: !this.gehnUsedThisRound,
          canAsk: hasPartner && !partnerAlreadyPlayed && ledCard !== null && !askedThisTrick.has(teamOfCurrent),
          receivedAnswer: null,
        };

        let action = await this.players[seat].choosePlay(context);

        // "Gehn?" und "Kannst du den noch?" sind Nebenhandlungen, die dem
        // eigentlichen Kartenausspielen vorausgehen können - danach ist
        // wieder derselbe Sitz mit der (aktualisierten) Karte am Zug.
        let guard = 0;
        while ((action === 'GEHN' || action === 'ASK') && guard < 4) {
          guard++;
          if (action === 'GEHN' && context.gehnAvailable) {
            this.gehnUsedThisRound = true;
            const ended = await this.runGehnNegotiation(seat);
            if (ended) return; // Runde vorbei, Punkte bereits vergeben
            context = { ...context, gehnAvailable: false };
          } else if (action === 'ASK' && context.canAsk) {
            askedThisTrick.add(teamOfCurrent);
            this.log(`Sitz ${seat + 1} zu Sitz ${partnerSeat + 1}: "${ASK_TEXT.QUESTION}"`);
            this.emit();
            const currentBestCard = trickPlays.reduce((best, p) =>
              compareInTrick(p.card, best.card, ledCard.suit, this.announcement) > 0 ? p : best
            ).card;
            const answer = await this.players[partnerSeat].answerAskPartner({
              hand: this.hands[partnerSeat],
              currentBest: currentBestCard,
              ledSuit: ledCard.suit,
              announcement: this.announcement,
            });
            this.log(`Sitz ${partnerSeat + 1}: "${ASK_TEXT[answer]}"`);
            this.emit();
            context = { ...context, canAsk: false, receivedAnswer: answer };
          } else {
            break; // Option nicht (mehr) verfügbar - Sicherheitsnetz
          }
          action = await this.players[seat].choosePlay(context);
        }

        let card = action;
        const legal = legalPlays(hand, ledCard, this.announcement, { trumpfOderKritisch });
        if (!card || typeof card !== 'object' || !legal.some((c) => cardsEqual(c, card))) {
          card = legal[0]; // Absicherung gegen ungültige/leere Antworten
        }

        this.hands[seat] = hand.filter((c) => !cardsEqual(c, card));

        const wasLeader = !ledCard;
        trickPlays.push({ seat, card });
        if (!ledCard) ledCard = card;

        // Eröffnet der Schlagansager den allerersten Stich der Runde mit dem
        // Haube, gilt ab jetzt "Trumpf oder Kritisch" für alle Folgenden.
        if (wasLeader && trickNumber === 1 && seat === schlagSeat) {
          const haube = haubeCard(this.announcement);
          if (haube && cardsEqual(card, haube)) {
            trumpfOderKritisch = true;
            this.log(`Sitz ${seat + 1} eröffnet mit dem Haube – Trumpf oder Kritisch!`);
          }
        }

        this.currentTrick = { ledCard, plays: trickPlays.slice(), trumpfOderKritisch };
        this.log(`Sitz ${seat + 1} spielt ${cardLabel(card)}.`);
        this.emit();
      }

      const winnerSeat = trickWinner(trickPlays, this.announcement);
      const winnerTeam = teamOfSeat(this.variant, winnerSeat);
      const winningCard = trickPlays.find((p) => p.seat === winnerSeat).card;
      const reasonText = describeWin(winningCard, this.announcement);
      this.stitches[winnerTeam]++;
      this.log(`Stich geht an Sitz ${winnerSeat + 1} (${this.variant.teamNames[winnerTeam]}), ${reasonText}. Stand: ${this.stitches.join(':')}`);
      this.emit();

      if (this.seatTypes.includes('human') && typeof this.ui.confirmTrick === 'function') {
        await this.ui.confirmTrick({ winnerSeat, winnerTeam, reasonText, stitches: this.stitches.slice() });
      }

      leaderSeat = winnerSeat;
    }

    const roundWinnerTeam = this.stitches.findIndex((s) => s >= 3);
    this.scores[roundWinnerTeam] += this.roundValue;
    this.log(`${this.variant.teamNames[roundWinnerTeam]} gewinnt die Runde und erhält ${this.roundValue} Punkte.`);
    this.emit();
  }
}
