// Einheitliches Player-Interface: HumanController wartet auf UI-Events,
// AIController entscheidet per Heuristik (ai.js). Die Engine unterscheidet nicht,
// wer am Zug ist.

import {
  chooseSchlag, chooseTrumpf, decideHoldForcedFour, choosePlay,
  decideGehnResponse, decideGehnFourResponse, answerAskPartner,
} from './ai.js';

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

  async decideHoldOrFoldForcedFour(hand, announcement) {
    return this.ui.requestHoldOrFoldForcedFour(this.seat, hand, announcement);
  }

  async choosePlay(context) {
    return this.ui.requestCardPlay(this.seat, context);
  }

  async decideGehnResponse(context) {
    return this.ui.requestGehnResponse(this.seat, context);
  }

  async decideGehnFourResponse(context) {
    return this.ui.requestGehnFourResponse(this.seat, context);
  }

  async answerAskPartner(context) {
    return this.ui.requestAskAnswer(this.seat, context);
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

  async decideHoldOrFoldForcedFour(hand, announcement) {
    await thinkDelay();
    return decideHoldForcedFour(hand, announcement) ? 'hold' : 'fold';
  }

  async choosePlay(context) {
    await thinkDelay();
    return choosePlay(context);
  }

  async decideGehnResponse(context) {
    await thinkDelay();
    return decideGehnResponse(context.hand, context.announcement);
  }

  async decideGehnFourResponse(context) {
    await thinkDelay();
    return decideGehnFourResponse(context.hand, context.announcement);
  }

  async answerAskPartner(context) {
    await thinkDelay();
    return answerAskPartner(context);
  }
}
