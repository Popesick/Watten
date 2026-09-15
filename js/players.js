// Einheitliches Player-Interface: HumanController wartet auf UI-Events,
// AIController entscheidet per Heuristik (ai.js). Die Engine unterscheidet nicht,
// wer am Zug ist.

import { chooseSchlag, chooseTrumpf, decideRaise, decideHold, decideHoldForcedFour, choosePlay, chooseSignal } from './ai.js';

export class HumanController {
  constructor(seat, ui) {
    this.seat = seat;
    this.type = 'human';
    this.ui = ui;
  }

  async chooseSchlag(hand) {
    return this.ui.requestSchlag(this.seat, hand);
  }

  async chooseTrumpf(hand, schlagRank) {
    return this.ui.requestTrumpf(this.seat, hand, schlagRank);
  }

  async decideRaiseOrPass(hand, announcement, currentValue) {
    return this.ui.requestRaiseOrPass(this.seat, hand, announcement, currentValue);
  }

  async decideHoldOrFold(hand, announcement, newValue) {
    return this.ui.requestHoldOrFold(this.seat, hand, announcement, newValue);
  }

  async decideHoldOrFoldForcedFour(hand, announcement) {
    return this.ui.requestHoldOrFoldForcedFour(this.seat, hand, announcement);
  }

  async choosePlay(context) {
    return this.ui.requestCardPlay(this.seat, context);
  }

  async chooseSignal(context) {
    return this.ui.requestSignal(this.seat, context);
  }
}

function thinkDelay() {
  return new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 500));
}

export class AIController {
  constructor(seat) {
    this.seat = seat;
    this.type = 'ai';
  }

  async chooseSchlag(hand) {
    await thinkDelay();
    return chooseSchlag(hand);
  }

  async chooseTrumpf(hand, schlagRank) {
    await thinkDelay();
    return chooseTrumpf(hand, schlagRank);
  }

  async decideRaiseOrPass(hand, announcement, currentValue) {
    await thinkDelay();
    return decideRaise(hand, announcement, currentValue) ? 'raise' : 'pass';
  }

  async decideHoldOrFold(hand, announcement, newValue) {
    await thinkDelay();
    return decideHold(hand, announcement, newValue) ? 'hold' : 'fold';
  }

  async decideHoldOrFoldForcedFour(hand, announcement) {
    await thinkDelay();
    return decideHoldForcedFour(hand, announcement) ? 'hold' : 'fold';
  }

  async choosePlay(context) {
    await thinkDelay();
    return choosePlay(context);
  }

  async chooseSignal(context) {
    await thinkDelay();
    return chooseSignal(context);
  }
}
