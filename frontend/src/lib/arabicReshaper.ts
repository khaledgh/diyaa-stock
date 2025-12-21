
// Custom Arabic Reshaper to avoid CommonJS/UMD issues
// Derived from standard algorithms for Arabic presentation forms

const charsMap: Record<number, number[]> = {
  0x0621: [0xFE80, 0xFE80, 0xFE80, 0xFE80], /* HAMZA */
  0x0622: [0xFE81, 0xFE82, 0xFE82, 0xFE81], /* ALEF_MADDA */
  0x0623: [0xFE83, 0xFE84, 0xFE84, 0xFE83], /* ALEF_HAMZA_ABOVE */
  0x0624: [0xFE85, 0xFE86, 0xFE86, 0xFE85], /* WAW_HAMZA */
  0x0625: [0xFE87, 0xFE88, 0xFE88, 0xFE87], /* ALEF_HAMZA_BELOW */
  0x0626: [0xFE89, 0xFE8A, 0xFE8B, 0xFE8C], /* YEH_HAMZA */
  0x0627: [0xFE8D, 0xFE8E, 0xFE8E, 0xFE8D], /* ALEF */
  0x0628: [0xFE8F, 0xFE90, 0xFE91, 0xFE92], /* BEH */
  0x0629: [0xFE93, 0xFE94, 0xFE93, 0xFE93], /* TEH_MARBUTA */
  0x062A: [0xFE95, 0xFE96, 0xFE97, 0xFE98], /* TEH */
  0x062B: [0xFE99, 0xFE9A, 0xFE9B, 0xFE9C], /* THEH */
  0x062C: [0xFE9D, 0xFE9E, 0xFE9F, 0xFEA0], /* JEEM */
  0x062D: [0xFEA1, 0xFEA2, 0xFEA3, 0xFEA4], /* HAH */
  0x062E: [0xFEA5, 0xFEA6, 0xFEA7, 0xFEA8], /* KHAH */
  0x062F: [0xFEA9, 0xFEAA, 0xFEAA, 0xFEA9], /* DAL */
  0x0630: [0xFEAB, 0xFEAC, 0xFEAC, 0xFEAB], /* THAL */
  0x0631: [0xFEAD, 0xFEAE, 0xFEAE, 0xFEAD], /* REH */
  0x0632: [0xFEAF, 0xFEB0, 0xFEB0, 0xFEAF], /* ZAIN */
  0x0633: [0xFEB1, 0xFEB2, 0xFEB3, 0xFEB4], /* SEEN */
  0x0634: [0xFEB5, 0xFEB6, 0xFEB7, 0xFEB8], /* SHEEN */
  0x0635: [0xFEB9, 0xFEBA, 0xFEBB, 0xFEBC], /* SAD */
  0x0636: [0xFEBD, 0xFEBE, 0xFEBF, 0xFEC0], /* DAD */
  0x0637: [0xFEC1, 0xFEC2, 0xFEC3, 0xFEC4], /* TAH */
  0x0638: [0xFEC5, 0xFEC6, 0xFEC7, 0xFEC8], /* ZAH */
  0x0639: [0xFEC9, 0xFECA, 0xFECB, 0xFECC], /* AIN */
  0x063A: [0xFECD, 0xFECE, 0xFECF, 0xFED0], /* GHAIN */
  0x0640: [0x0640, 0x0640, 0x0640, 0x0640], /* TATWEEL */
  0x0641: [0xFED1, 0xFED2, 0xFED3, 0xFED4], /* FEH */
  0x0642: [0xFED5, 0xFED6, 0xFED7, 0xFED8], /* QAF */
  0x0643: [0xFED9, 0xFEDA, 0xFEDB, 0xFEDC], /* KAF */
  0x0644: [0xFEDD, 0xFEDE, 0xFEDF, 0xFEE0], /* LAM */
  0x0645: [0xFEE1, 0xFEE2, 0xFEE3, 0xFEE4], /* MEEM */
  0x0646: [0xFEE5, 0xFEE6, 0xFEE7, 0xFEE8], /* NOON */
  0x0647: [0xFEE9, 0xFEEA, 0xFEEB, 0xFEEC], /* HEH */
  0x0648: [0xFEED, 0xFEEE, 0xFEEE, 0xFEED], /* WAW */
  0x0649: [0xFEEF, 0xFEF0, 0xFEEF, 0xFEEF], /* ALEF_MAKSURA */
  0x064A: [0xFEF1, 0xFEF2, 0xFEF3, 0xFEF4], /* YEH */
  0x067E: [0xFB56, 0xFB57, 0xFB58, 0xFB59], /* PEH */
  0x0686: [0xFB7A, 0xFB7B, 0xFB7C, 0xFB7D], /* TCHEH */
  0x0698: [0xFB8A, 0xFB8B, 0xFB8B, 0xFB8A], /* JEH */
  0x06A9: [0xFB8E, 0xFB8F, 0xFB90, 0xFB91], /* KEHEH */
  0x06AF: [0xFB92, 0xFB93, 0xFB94, 0xFB95], /* GAF */
  0x06CC: [0xFBFC, 0xFBFD, 0xFBFE, 0xFBFF], /* Farsi Yeh */
};

const combCharsMap: Record<number, number[][]> = {
  0x0644: [
      [0x0622, 0xFEF5, 0xFEF6], /* LAM_ALEF_MADDA */
      [0x0623, 0xFEF7, 0xFEF8], /* LAM_ALEF_HAMZA_ABOVE */
      [0x0625, 0xFEF9, 0xFEFA], /* LAM_ALEF_HAMZA_BELOW */
      [0x0627, 0xFEFB, 0xFEFC]  /* LAM_ALEF */
  ]
};

const transChars = [
  0x0610, /* ARABIC SIGN SALLALLAHOU ALAYHE WASSALLAM */
  0x0612, /* ARABIC SIGN ALAYHE ASSALAM */
  0x0613, /* ARABIC SIGN RADI ALLAHOU ANHU */
  0x0614, /* ARABIC SIGN TAKHALLUS */
  0x0615, /* ARABIC SMALL HIGH TAH */
  0x064B, /* ARABIC FATHATAN */
  0x064C, /* ARABIC DAMMATAN */
  0x064D, /* ARABIC KASRATAN */
  0x064E, /* ARABIC FATHA */
  0x064F, /* ARABIC DAMMA */
  0x0650, /* ARABIC KASRA */
  0x0651, /* ARABIC SHADDA */
  0x0652, /* ARABIC SUKUN */
  0x0653, /* ARABIC MADDAH ABOVE */
  0x0654, /* ARABIC HAMZA ABOVE */
  0x0655, /* ARABIC HAMZA BELOW */
  0x0656, /* ARABIC SUBSCRIPT ALEF */
  0x0657, /* ARABIC INVERTED DAMMA */
  0x0658, /* ARABIC MARK NOON GHUNNA */
  0x0670, /* ARABIC LETTER SUPERSCRIPT ALEF */
  0x06D6, /* ARABIC SMALL HIGH LIGATURE SAD WITH LAM WITH ALEF MAKSURA */
  0x06D7, /* ARABIC SMALL HIGH LIGATURE QAF WITH LAM WITH ALEF MAKSURA */
  0x06D8, /* ARABIC SMALL HIGH MEEM INITIAL FORM */
  0x06D9, /* ARABIC SMALL HIGH LAM ALEF */
  0x06DA, /* ARABIC SMALL HIGH JEEM */
  0x06DB, /* ARABIC SMALL HIGH THREE DOTS */
  0x06DC, /* ARABIC SMALL HIGH SEEN */
  0x06DF, /* ARABIC SMALL HIGH ROUNDED ZERO */
  0x06E0, /* ARABIC SMALL HIGH UPRIGHT RECTANGULAR ZERO */
  0x06E2, /* ARABIC SMALL HIGH MEEM ISOLATED FORM */
  0x06E3, /* ARABIC SMALL LOW SEEN */
  0x06E4, /* ARABIC SMALL HIGH MADDA */
  0x06E7, /* ARABIC SMALL HIGH YEH */
  0x06E8, /* ARABIC SMALL HIGH NOON */
  0x06EA, /* ARABIC EMPTY CENTRE LOW STOP */
  0x06EB, /* ARABIC EMPTY CENTRE HIGH STOP */
  0x06EC, /* ARABIC ROUNDED HIGH STOP WITH FILLED CENTRE */
  0x06ED, /* ARABIC SMALL LOW MEEM */
];

function characterMapContains(c: number) {
  return charsMap[c] !== undefined;
}


function getCombCharRep(c1: number, c2: number) {
  const combs = combCharsMap[c1];
  if (combs) {
    for (let i = 0; i < combs.length; i++) {
        if (combs[i][0] === c2) {
            return [combs[i][1], combs[i][2]];
        }
    }
  }
  return false;
}

function isTransparent(c: number) {
    return transChars.indexOf(c) > -1;
}

export function reshapeArabic(str: string) {
  if (!str) return '';
  let shaped = '';
  // Convert basic checks
  // Order: 0: Isolated, 1: Final, 2: Initial, 3: Medial
  // Map format in source: [Isolated, Final, Initial, Medial] ?? 
  // Wait, let's verify map format from standard online resources or logic.
  // Standard Arabic Reshaper usually puts: [Isolated, Initial, Medial, Final]?
  // Let's check typical mapping.
  // 0xFE8D (Alef Iso)
  // 0xFE8E (Alef Final)
  // Alef Inner: FE8E, Alef Init: FE8D? No. Alef only has Iso and Final.
  // My Map for Alef: [0xFE8D, 0xFE8E, 0xFE8E, 0xFE8D]
  // Index 0: Iso
  // Index 1: Final (Connects to Prev)
  // Index 2: Medial (Connects Prev & Next)? Alef doesn't connect next. So same as Final.
  // Index 3: Initial (Connects Next)? Alef doesn't. So same as Iso.
  
  // Checking BEH (0x0628): [0xFE8F, 0xFE90, 0xFE91, 0xFE92]
  // FE8F: Iso
  // FE90: Final
  // FE91: Initial
  // FE92: Medial
  // So my map indices are: 0: Iso, 1: Final, 2: Initial, 3: Medial.

  for (let i = 0; i < str.length; i++) {
    const current = str.charCodeAt(i);
    if (characterMapContains(current)) {
      let prev = null;
      let next = null;
      let prevID = i - 1;
      let nextID = i + 1;

      // Transparent handling
      while (prevID >= 0 && isTransparent(str.charCodeAt(prevID))) {
        prevID--;
      }
      while (nextID < str.length && isTransparent(str.charCodeAt(nextID))) {
        nextID++;
      }

      if (prevID >= 0) {
        prev = str.charCodeAt(prevID);
        // Only consider if previous character connects forward (Initial or Medial)
        // Or if it is a character that connects left.
        // Simplified check: If prev is in map and is not one of non-connectors.
        // But we can check map[2] or map[3].
        if (!characterMapContains(prev) || (charsMap[prev][2] === charsMap[prev][0] && charsMap[prev][3] === charsMap[prev][1])) {
             // Prev char does not connect forward (like Alef)
             // Check if prev is truly non-connecting-forward.
             // If Iso == Init and Final == Medial, it only connects backward.
             prev = null;
        }
      }
      if (nextID < str.length) {
        next = str.charCodeAt(nextID);
        if (!characterMapContains(next)) next = null;
      }
      
      const crep = charsMap[current];

      // Combinations (Lam-Alef)
      if (current === 0x0644 && next !== null && (next === 0x0622 || next === 0x0623 || next === 0x0625 || next === 0x0627)) {
         const comb = getCombCharRep(current, next);
         if (comb) {
            // Found Lam-Alef
            // We need to write the ligature.
            // Check prev to decide form 0 (iso/init) or 1 (final/medial). 
            // Since Lam-Alef doesn't connect next, it only has Iso or Final.
            if (prev !== null) {
                shaped += String.fromCharCode(comb[1]);
            } else {
                shaped += String.fromCharCode(comb[0]);
            }
            // Skip next char
            i = nextID; // Careful with transparent loop, but usually Lam-Alef is contiguous.
            // Actually i should advance. nextID might be far.
            // Simplified: Lam Alef usually assumes contiguous. 
            // If transparents exist between Lam and Alef, it's weird.
            // We just skip the specific next char.
            continue;
         }
      }

      // Determining Form
      if (prev !== null && next !== null && crep[3] !== crep[1]) { // Medial
        shaped += String.fromCharCode(crep[3]);
      } else if (prev !== null && next === null && crep[1] !== crep[0]) { // Final? 
         // Wait.
         // If connects to prev, it's Final or Medial.
         // If no next, it is Final.
         shaped += String.fromCharCode(crep[1]);
      } else if (prev !== null && next !== null && crep[3] === crep[1]) { 
         // Connects prev but not next (like Alef in middle). It acts as Final.
         shaped += String.fromCharCode(crep[1]);
      } else if (prev === null && next !== null && crep[2] !== crep[0]) { // Initial
         shaped += String.fromCharCode(crep[2]);
      } else { // Isolated
         shaped += String.fromCharCode(crep[0]);
      }

    } else {
      shaped += String.fromCharCode(current);
    }
  }
  return shaped;
}
