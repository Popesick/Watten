// Spiel-Engine für "Offenes Watten", 2-4 Spieler.
// Orchestriert Runde für Runde: Austeilen, Ansage (Schlag/Trumpf), Bieten,
// Stiche spielen, Punkte vergeben. Fragt Entscheidungen bei den jeweiligen
// Player-Controllern (Human/AI) ab, ohne zu unterscheiden, wer dahintersteckt.
//
// Dokumentierte Vereinfachungen gegenüber den vollen Grundregeln:
// - Nur "Offenes Watten" (keine verdeckte Ansage / kein Blindspiel).
// - Kein Schlagtausch, kein "Schöner", kein "nichts ansagen".
// - Beim Bieten entscheidet je Team ein "Wortführer" (der erste Sitzplatz
//   des Teams) stellvertretend für das ganze Team.
// - "Es gehen die Vier" wird nur im klassischen 2-Team-Fall (2er/4er) angewendet.

import { createDeck, shuffle } from './cards.js';
import { legalPlays, trickWinner, cardsEqual, compareInTrick, cardStrength } from './rules.js';
import { VARIANTS, teamOfSeat } from './variants.js';
import { SIGNALS, SIGNAL_TEXT } from './chat.js';

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

  deal() {
    const deck = shuffle(createDeck());
    const hands = Array.from({ length: this.n }, () => []);
    let idx = 0;
    for (let s = 0; s < this.n; s++) {
      hands[s] = deck.slice(idx, idx + this.variant.cardsPerHand);
      idx += this.variant.cardsPerHand;
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
    this.deal();
    this.announcement = null;
    this.currentTrick = { ledCard: null, plays: [] };
    this.stitches = this.variant.teams.map(() => 0);
    this.emit();

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
      `Sitz ${trumpSeat + 1} sagt Trumpf an: ${trumpSuit}, Schlag: ${schlagRank === 'Weli' ? 'Weli' : schlagRank}.`
    );
    this.emit();

    let activeTeams = this.variant.teams.map((_, i) => i);
    let roundResult = null;

    const forcedGestrichenTeam = this.checkForcedFour();
    if (forcedGestrichenTeam !== null) {
      this.roundValue = 4;
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
        roundResult = { fold: true, winnerTeam: otherTeam, points: 2 };
      } else {
        this.log(`${this.variant.teamNames[forcedGestrichenTeam]} hält bei "es gehen die Vier" – es wird um 4 Punkte gespielt.`);
      }
    } else {
      this.phase = 'bidding';
      this.emit();
      roundResult = await this.biddingPhase(schlagSeat, activeTeams);
      if (roundResult) activeTeams = roundResult.activeTeams || activeTeams;
    }

    if (roundResult && roundResult.fold) {
      this.scores[roundResult.winnerTeam] += roundResult.points;
      this.log(`Runde beendet ohne Stichspiel. ${this.variant.teamNames[roundResult.winnerTeam]} erhält ${roundResult.points} Punkte.`);
      this.dealerIndex = (this.dealerIndex + 1) % this.n;
      this.emit();
      return;
    }

    const finalActiveTeams = roundResult && roundResult.activeTeams ? roundResult.activeTeams : activeTeams;
    await this.playTricks(schlagSeat, finalActiveTeams);
    this.dealerIndex = (this.dealerIndex + 1) % this.n;
  }

  async biddingPhase(schlagSeat, allTeams) {
    let value = 2;
    let activeTeams = allTeams.slice();
    let proposer = teamOfSeat(this.variant, schlagSeat);

    while (true) {
      const captainProposer = this.captainOf(proposer);
      const action = await this.players[captainProposer].decideRaiseOrPass(
        this.hands[captainProposer],
        this.announcement,
        value
      );
      if (action === 'pass') {
        this.roundValue = value;
        this.log(`${this.variant.teamNames[proposer]} spielt ohne weitere Erhöhung um ${value} Punkte.`);
        this.emit();
        return { fold: false, activeTeams };
      }

      const newValue = value + 1;
      this.log(`${this.variant.teamNames[proposer]} erhöht auf ${newValue} Punkte.`);
      this.emit();

      const responderTeams = activeTeams.filter((t) => t !== proposer);
      const holds = [];
      for (const t of responderTeams) {
        const captain = this.captainOf(t);
        const decision = await this.players[captain].decideHoldOrFold(this.hands[captain], this.announcement, newValue);
        if (decision === 'hold') {
          holds.push(t);
          this.log(`${this.variant.teamNames[t]} hält.`);
        } else {
          this.log(`${this.variant.teamNames[t]} geht.`);
        }
      }
      this.emit();

      if (holds.length === 0) {
        return { fold: true, winnerTeam: proposer, points: value };
      }
      activeTeams = [proposer, ...holds];
      value = newValue;
      proposer = holds[0];
    }
  }

  /** "Hast du noch was?" - jederzeit stellbare Frage an den eigenen Partner. */
  askPartner(fromSeat) {
    const team = teamOfSeat(this.variant, fromSeat);
    const partnerSeat = this.variant.teams[team].find((s) => s !== fromSeat);
    if (partnerSeat === undefined) return;
    this.log(`Sitz ${fromSeat + 1}: "Hast du noch was?"`);
    if (this.seatTypes[partnerSeat] === 'ai' && this.announcement) {
      const hand = this.hands[partnerSeat] || [];
      const hasCritical = hand.some((c) => cardStrength(c, this.announcement).cat >= 4);
      const hasStrong = hand.some((c) => cardStrength(c, this.announcement).cat >= 2);
      let answer;
      if (hasCritical) answer = 'Ja, hab noch was Gutes.';
      else if (hasStrong) answer = 'Ja, einen Trumpf.';
      else answer = 'Nein, nichts mehr.';
      this.log(`Sitz ${partnerSeat + 1}: "${answer}"`);
    }
    this.emit();
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

    while (Math.max(...this.stitches) < 3) {
      const order = this.rotateFrom(activeSeats, leaderSeat);
      const trickPlays = [];
      let ledCard = null;
      this.currentTrick = { ledCard: null, plays: [] };
      const signaledTeams = new Set();
      const pendingSignals = {}; // teamIdx -> { fromSeat, toSeat, signal }
      this.emit();

      for (const seat of order) {
        const hand = this.hands[seat];
        const teamOfCurrent = teamOfSeat(this.variant, seat);
        const currentBest = trickPlays.length
          ? trickPlays.reduce((best, p) =>
              compareInTrick(p.card, best.card, ledCard.suit, this.announcement) > 0 ? p : best
            )
          : null;
        const partnerSeats = this.variant.teams[teamOfCurrent].filter((s) => s !== seat);
        const partnerIsWinning = currentBest ? partnerSeats.includes(currentBest.seat) : false;
        const isDecisiveTrick = this.stitches.some((s) => s === 2);
        const hasPartner = partnerSeats.length === 1;
        const partnerSeat = hasPartner ? partnerSeats[0] : null;
        const partnerAlreadyPlayed = partnerSeat !== null && trickPlays.some((p) => p.seat === partnerSeat);

        // Vor dem eigenen Zug: darf (und will) dieser Sitz seinem Partner eine Floskel zurufen?
        const canSignal = hasPartner && !partnerAlreadyPlayed && !signaledTeams.has(teamOfCurrent);
        if (canSignal) {
          const signal = await this.players[seat].chooseSignal({
            hand,
            ledCard,
            trickPlays,
            announcement: this.announcement,
            isDecisiveTrick,
            mySeat: seat,
            partnerSeat,
            canSignal: true,
          });
          signaledTeams.add(teamOfCurrent);
          if (signal) {
            pendingSignals[teamOfCurrent] = { fromSeat: seat, toSeat: partnerSeat, signal };
            this.log(`Sitz ${seat + 1} zu Sitz ${partnerSeat + 1}: "${SIGNAL_TEXT[signal]}"`);
            this.emit();
          }
        }

        const incoming = pendingSignals[teamOfCurrent];
        const receivedSignal = incoming && incoming.toSeat === seat ? incoming.signal : null;
        if (receivedSignal) delete pendingSignals[teamOfCurrent];

        const context = {
          hand,
          ledCard,
          trickPlays,
          announcement: this.announcement,
          isDecisiveTrick,
          mySeat: seat,
          partnerSeats,
          partnerIsWinning,
          receivedSignal,
        };

        let card = await this.players[seat].choosePlay(context);
        const legal = legalPlays(hand, ledCard, this.announcement);
        if (!card || !legal.some((c) => cardsEqual(c, card))) {
          card = legal[0]; // Absicherung gegen ungültige/leere Antworten
        }

        this.hands[seat] = hand.filter((c) => !cardsEqual(c, card));

        if (receivedSignal) {
          const priorBest = trickPlays.length
            ? trickPlays.reduce((best, p) =>
                compareInTrick(p.card, best.card, ledCard ? ledCard.suit : card.suit, this.announcement) > 0 ? p : best
              )
            : null;
          const triedToWin = priorBest
            ? compareInTrick(card, priorBest.card, ledCard.suit, this.announcement) > 0
            : cardStrength(card, this.announcement).cat >= 2;
          let response;
          if (receivedSignal === SIGNALS.MACH_DU) {
            response = triedToWin ? 'Ok, mach ich!' : 'Ich kann nicht.';
          } else {
            response = triedToWin ? 'Nein, meiner!' : 'Ok.';
          }
          this.log(`Sitz ${seat + 1}: "${response}"`);
        }

        trickPlays.push({ seat, card });
        if (!ledCard) ledCard = card;
        this.currentTrick = { ledCard, plays: trickPlays.slice() };
        this.log(`Sitz ${seat + 1} spielt ${card.rank === 'Weli' ? 'Weli' : `${card.rank} ${card.suit}`}.`);
        this.emit();
      }

      const winnerSeat = trickWinner(trickPlays, this.announcement);
      const winnerTeam = teamOfSeat(this.variant, winnerSeat);
      this.stitches[winnerTeam]++;
      this.log(`Stich geht an Sitz ${winnerSeat + 1} (${this.variant.teamNames[winnerTeam]}). Stand: ${this.stitches.join(':')}`);
      leaderSeat = winnerSeat;
      this.emit();
    }

    const roundWinnerTeam = this.stitches.findIndex((s) => s >= 3);
    this.scores[roundWinnerTeam] += this.roundValue;
    this.log(`${this.variant.teamNames[roundWinnerTeam]} gewinnt die Runde und erhält ${this.roundValue} Punkte.`);
    this.emit();
  }
}
