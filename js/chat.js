// Kurze Floskeln zur Partner-Kommunikation beim Watten.

export const SIGNALS = {
  MACH_DU: 'MACH_DU', // "Ich kann nicht, mach du den Stich"
  LASS_IHN: 'LASS_IHN', // "Lass ihn, das ist meiner"
};

export const SIGNAL_TEXT = {
  MACH_DU: 'Ich kann nicht, mach du den Stich!',
  LASS_IHN: 'Lass ihn, das ist meiner!',
};

// Deutsche Zahlwörter fürs Bieten ("Geht ihr?" -> "Vier!" -> "Fünf!" ...).
const NUMBER_WORDS = {
  2: 'Zwei', 3: 'Drei', 4: 'Vier', 5: 'Fünf', 6: 'Sechs',
  7: 'Sieben', 8: 'Acht', 9: 'Neun', 10: 'Zehn',
};

export function numberWord(n) {
  return NUMBER_WORDS[n] || String(n);
}
