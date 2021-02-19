/**
 * https://github.com/martijnversluis/ChordJS
 *  @author martijnversluis
 *  @author Glenn Ko
 */

const chordRegex = /(^[A-Ga-g])([h#b]+)?([^/\s]*)(\/([A-Ga-g])([h#b]+)?)?$/; ///([A-G])(h|#|b)?([^/\s]*)(\/([A-G])(h|#|b)?)?/i;
const romanRegex = /(^([h#b]+)?([ivIV]+))([^/\s]*)(\/([h#b]+)?([ivIV]+))?$/;
const nashVilleRegex = /(^([h#b]+)?([1-7]+))([^/\s]*)(\/([h#b]+)?([1-7]+))?$/;

const A = 'A'.charCodeAt(0);
const G = 'G'.charCodeAt(0);
// white keys
const PIANO_KEYS = ['C', 0, 'D', 0, 'E', 'F', 0, 'G', 0, 'A', 0, 'B', 'C', 0, 'D', 0, 'E', 'F', 0, 'G', 0, 'A', 0, 'B', 'C', 0, 'D', 0, 'E', 'F', 0, 'G', 0, 'A', 0, 'B'];
const WHITE_KEY_INDICES_FROM_A = [21, 23, 24, 26, 28, 29, 31];
const MIDDLE_C_INDEX = WHITE_KEY_INDICES_FROM_A[2];
const PIANO_ROMAN_KEYS = ['I', 0, 'II', 0, 'III', 'IV', 0, 'V', 0, 'VI', 0, 'VII'];
// console.log(WHITE_KEY_INDICES_FROM_A.map((i)=>PIANO_KEYS[i]))
// black keys
const PIANO_KEYS_SHARP = [0, 'Ch', 0, 'Dh', 0, 0, 'Fh', 0, 'Gh', 0, 'Ah', 0, 0, 'Ch', 0, 'Dh', 0, 0, 'Fh', 0, 'Gh', 0, 'Ah', 0, 0, 'Ch', 0, 'Dh', 0, 0, 'Fh', 0, 'Gh', 0, 'Ah', 0];
const PIANO_KEYS_FLAT = [0, 'Db', 0, 'Eb', 0, 0, 'Gb', 0, 'Ab', 0, 'Bb', 0, 0, 'Db', 0, 'Eb', 0, 0, 'Gb', 0, 'Ab', 0, 'Bb', 0, 0, 'Db', 0, 'Eb', 0, 0, 'Gb', 0, 'Ab', 0, 'Bb', 0];
// piano keys signature preference (for sharps)
const SIGN_AS_SHARP = [0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1,  0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1,  0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1];
/*
const ROMAN_TO_DECIMAL_MAP = {
  'i': '1',
  'I': '1',
  'ii': '2',
  'II': '2',
  'iii': '3',
  'III': '3',
  'iv': '4',
  'IV': '4',
  'V': '5',
  'V': '5',
  'vi': '6',
  'VI': '6',
  'vii': '7',
  'VII': '7',
};
*/
const DECIMAL_TO_ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];

const decimalToRoman = (s, isMinor) => {
  s = parseInt(s);
  s--;
  s = DECIMAL_TO_ROMAN[s];
  if (!s) {
    return s;
  }
  if (isMinor) {
    s = s.toLowerCase();
  }
  return s;
}


const keyChange = (key, delta) => {
  let charCode;
  charCode = key.toUpperCase().charCodeAt(0);
  charCode += delta;

  if (charCode > G) {
    charCode = A;
  }

  if (charCode < A) {
    charCode = G;
  }

  return String.fromCharCode(charCode);
};

const keyUp = key => keyChange(key, 1);

const keyDown = key => keyChange(key, -1);

const normalize = (base, modifier) => {
  if (modifier === '#' && /^(B|E)$/.test(base)) {
    return [keyUp(base), null];
  }

  if (modifier === 'b' && /^(C|F)$/.test(base)) {
    return [keyDown(base), null];
  }

  return [base, modifier];
};

const internalSwitchModifier = (base, modifier) => {
  if (modifier === '#') {
    return [keyUp(base), 'b'];
  }

  if (modifier === 'b') {
    return [keyDown(base), '#'];
  }

  throw new Error(`Unexpected modifier ${modifier}`);
};

const switchModifier = (base, modifier) => {
  const [normalizedBase, normalizedModifier] = normalize(base, modifier);

  if (modifier) {
    return internalSwitchModifier(normalizedBase, normalizedModifier);
  }

  return [normalizedBase, normalizedModifier];
};

const useModifier = (base, modifier, newModifier) => {
  if (modifier && modifier !== newModifier) {
    return internalSwitchModifier(base, modifier);
  }

  return [base, modifier];
};

const repeatProcessor = (base, modifier, processor, amount) => {
  let [processedBase, processedModifier] = [base, modifier];

  for (let i = 0; i < amount; i += 1) {
    [processedBase, processedModifier] = processor(processedBase, processedModifier);
  }

  return [processedBase, processedModifier];
};

const transposeUp = (base, modifier) => {
  const [normalizedBase, normalizedModifier] = normalize(base, modifier);

  if (normalizedModifier === 'b') {
    return [normalizedBase, null];
  }

  if (normalizedModifier === '#') {
    return [keyUp(normalizedBase), null];
  }

  if (/^(B|E)$/.test(normalizedBase)) {
    return [keyUp(normalizedBase), null];
  }

  return [normalizedBase, '#'];
};

const transposeDown = (base, modifier) => {
  const [normalizedBase, normalizedModifier] = normalize(base, modifier);

  if (normalizedModifier === 'b') {
    return [keyDown(normalizedBase), null];
  }

  if (normalizedModifier === '#') {
    return [normalizedBase, null];
  }

  if (/^(C|F)$/.test(normalizedBase)) {
    return [keyDown(normalizedBase), null];
  }

  return [normalizedBase, 'b'];
};

const transpose = (base, modifier, delta) => {
  let [newBase, newModifier] = [base, modifier];

  if (delta < 0) {
    [newBase, newModifier] = repeatProcessor(base, modifier, transposeDown, Math.abs(delta));
  } else if (delta > 0) {
    [newBase, newModifier] = repeatProcessor(base, modifier, transposeUp, delta);
  }

  return useModifier(newBase, newModifier, modifier);
};

const processChord = (sourceChord, processor, processorArg) => {
  const chord = sourceChord.clone();
  [chord.base, chord.modifier] = processor(sourceChord.base, sourceChord.modifier, processorArg);

  if (sourceChord.bassBase) {
    [chord.bassBase, chord.bassModifier] = processor(sourceChord.bassBase, sourceChord.bassModifier, processorArg);
  }

  return chord;
};

/**
 * @param {String} sharpsOrFlats
 */
const getSharpFlatDelta = (sharpsOrFlats) => {
  let i = 0;
  let c = 0;
  for (let i =0, l=sharpsOrFlats.length; i< l; i++) {
    let ch = sharpsOrFlats.charAt(i);
    c += ch === '#' ? 1 : ch === 'b' ? -1 : 0;
   }
  return c;
}



/**
 *
 * @param {String} suffix
 */
const isMinorFromSuffixLen = (suffix) => {
  suffix = suffix.toLowerCase();
  if (suffix.charAt(0) !== 'm') return false;

  suffix = suffix.split(/[0-9]/)[0];
  return (suffix === 'm' || suffix === 'min' || suffix ==='minor') ? suffix.length : 0;
}

class Chord {
  static parse(chordString) {
    let parts = chordRegex.exec(chordString);

    if (parts) {
      let [, base, modifier, suffix, , bassBase, bassModifier] = parts;
      if (base) {
        base = base.toUpperCase();
        if (modifier) modifier = modifier.replace(/h/g, '#');
        if (bassModifier) bassModifier = bassModifier.replace(/h/g, '#');
        return new Chord({ base, modifier, suffix, bassBase, bassModifier });
      }
    }

    parts = romanRegex.exec(chordString);
    if (parts) {
      let [, , modifier, base, suffix, , bassModifier, bassBase] = parts;
      let mode = 1;
      if (base) {
        base = base.charAt(0).toUpperCase() === base.charAt(0) ? base.toUpperCase() : base.toLowerCase();
        if (modifier) modifier = modifier.replace(/h/g, '#');
        if (bassModifier) bassModifier = bassModifier.replace(/h/g, '#');
        return new Chord({ base, modifier, suffix, bassBase, bassModifier, mode });
      }
    }

    parts = nashVilleRegex.exec(chordString);
    if (parts) {
      let [, , modifier, base, suffix, , bassModifier, bassBase] = parts;
      let mode = 2;
      if (base) {
        if (modifier) modifier = modifier.replace(/h/g, '#');
        if (bassModifier) bassModifier = bassModifier.replace(/h/g, '#');
        return new Chord({ base, modifier, suffix, bassBase, bassModifier, mode });
      }
    }


    return null;
  }

  constructor({ base, modifier, suffix, bassBase, bassModifier, mode }) {
    this.base = base || null;
    this.modifier = modifier || null;
    this.suffix = suffix || null;

    if (bassBase) bassBase = bassBase.toUpperCase();

    let minorLen = 0;
    if (mode !== 1) {
      minorLen = this.suffix !== null ? isMinorFromSuffixLen(this.suffix) : 0;
      this.isMinor = minorLen >= 1;
    } else {
      this.isMinor = base.charAt(0).toLowerCase() === base.charAt(0);
    }

    this.dimed = this.suffix !== null ? this.suffix.toLowerCase().slice(0, 3) === 'dim' : false;

    this.extension = this.isMinor ? suffix.slice(minorLen) : this.suffix;
    this.bassBase = bassBase || null;
    this.bassModifier = bassModifier || null;
    this.mode = mode;
  }

  clone() {
    const { base, modifier, suffix, bassBase, bassModifier } = this;
    return new Chord({ base, modifier, suffix, bassBase, bassModifier });
  }

  normalize() {
    return processChord(this, normalize);
  }

  switchModifier() {
    return processChord(this, switchModifier);
  }

  useModifier(newModifier) {
    return processChord(this, useModifier, newModifier);
  }

  transposeUp() {
    return processChord(this, transposeUp);
  }

  transposeDown() {
    return processChord(this, transposeDown);
  }

  transpose(delta) {
    return processChord(this, transpose, delta);
  }

  toString() {
    let chordString = "[Chord]"
    let minorSuffix = this.isMinor ? 'm' : '';
    if (!this.mode) {
      chordString = this.base + (this.modifier || '') + minorSuffix + (this.extension || '');

      if (this.bassBase) {
        chordString += `/${this.bassBase}${this.bassModifier || ''}`;
      }
    } else if (this.mode === 1) { // roman
       chordString =  (this.modifier || '') + this.base + minorSuffix + (this.extension || '');
      if (this.bassBase) {
        chordString += `/${this.bassModifier || ''}${this.bassBase}`;
      }
    } else if (this.mode === 2) {
      chordString =  (this.modifier || '') + this.base + minorSuffix + (this.extension || '');
      if (this.bassBase) {
        chordString += `/${this.bassModifier || ''}${this.bassBase}`;
      }
    }
    return chordString;
  }

  getBaseTrebleVal() { // in relation toA
    let index = this.base.charCodeAt(0) - A;
    index = WHITE_KEY_INDICES_FROM_A[index];
    if (index < MIDDLE_C_INDEX) index += 12;
    index -= MIDDLE_C_INDEX;

    return index;
  }

  getKeyVal() {
    let index = this.base.charCodeAt(0) - A;
    index = WHITE_KEY_INDICES_FROM_A[index] + (this.modifier ? getSharpFlatDelta(this.modifier) : 0);
    index += this.isMinor ? 3 : 0;
    return index;
  }

  getTrebleVal() {
    let index = this.base.charCodeAt(0) - A;
    index = WHITE_KEY_INDICES_FROM_A[index] + (this.modifier ? getSharpFlatDelta(this.modifier) : 0);
    // index += this.isMinor ? 3 : 0;
    return index;
  }

  getBassVal() {
    if (!this.bassBase) return null;
    let index = this.bassBase.charCodeAt(0) - A;
    index = WHITE_KEY_INDICES_FROM_A[index] + (this.bassModifier ? getSharpFlatDelta(this.bassModifier) : 0);
    return index;
  }

  /**
   *
   * @param {Chord} [rootChord] Either a natural major or minor chord representation
   */
  toHTMLString(rootChord) {
    let bassChord;
    let trebleChord;
    if (this.mode === 1) {
      trebleChord = (this.modifier ? this.modifier.replace(/#/g, 'h') : '') + this.base;
      bassChord = this.bassBase ? `${this.bassModifier ?  this.bassModifier.replace(/#/g, 'h') : ''}${this.bassBase}` : '';
    } else if (this.mode === 2) { // nashville to roman numerals
      // modifier+base in roman
      trebleChord = (this.modifier ? this.modifier.replace(/#/g, 'h') : '') + decimalToRoman(this.base, this.isMinor || this.dimed);
      // bassModifier + bass in roman
      if (this.bassBase) {
        bassChord = this.bassBase ? `${this.bassModifier ?  this.bassModifier.replace(/#/g, 'h') : ''}${decimalToRoman(this.bassBase, this.isMinor || this.dimed)}` : '';
      }
    } else { // letters in roman
      if (rootChord != null) { // convert to roman in relation to rootKeyVal
        let rootKeyVal = rootChord.getKeyVal();
        let offset = this.getTrebleVal() - rootKeyVal;
        if (offset < 0) offset = 12 + offset;
        else if (offset >= 12) offset = offset - 12;
        //console.log(offset);
        if (offset < 0 || offset >= 12) {
          throw new Error("Assertion failed:: Offset of half-steps still out of range between 0 to 11!")
        }
        if (PIANO_ROMAN_KEYS[offset] && !this.modifier) { // diatonic natural major match keynote
          console.log("CASE 0:")
          trebleChord = this.isMinor ? PIANO_ROMAN_KEYS[offset].toLowerCase() : PIANO_ROMAN_KEYS[offset];
        } else { // display as either sharp or flat for non-diatonic keynote?
          if (PIANO_ROMAN_KEYS[offset]) { // match modifier with white key
            console.log("CASE 1:");
            let offsetBase = this.getBaseTrebleVal() - rootChord.getBaseTrebleVal();
            if (offsetBase < 0) offsetBase = 12 + offsetBase;
            else if (offsetBase >= 12) offsetBase = offsetBase - 12;

            if (offsetBase < 0 || offsetBase >= 12) {
              throw new Error("Assertion failed 2:: Offset of half-steps still out of range between 0 to 11!")
            }
            if (!PIANO_ROMAN_KEYS[offsetBase]) {
              throw new Error("Assertion failed 2b:: Base offset should get a roman value!")
            }

            trebleChord = this.isMinor || this.dimed ? PIANO_ROMAN_KEYS[offsetBase].toLowerCase() : PIANO_ROMAN_KEYS[offsetBase];
            trebleChord = this.modifier + trebleChord;
          } else {
            console.log("CASE 2:");
            let nonDiatonicPreferSharp = SIGN_AS_SHARP[rootKeyVal + offset];
            let nonDiatonicRep = nonDiatonicPreferSharp ? PIANO_KEYS_SHARP[offset] : PIANO_KEYS_FLAT[offset];
            trebleChord = this.isMinor || this.dimed ? nonDiatonicRep.toLowerCase() :nonDiatonicRep;
          }


        }
        //trebleChord = (this.modifier ? this.modifier.replace(/#/g, 'h') : '') + this.base;
        //bassChord = this.bassBase ? `${this.bassModifier ?  this.bassModifier.replace(/#/g, 'h') : ''}${this.bassBase}` : '';
      } else {
        trebleChord = this.base + (this.modifier ? this.modifier.replace(/#/g, 'h') : '') + (this.isMinor ? 'm' : '');
        if (this.bassBase) {
          bassChord = this.bassBase ? `${this.bassBase}${this.bassModifier ?  this.bassModifier.replace(/#/g, 'h') : ''}` : '';
        }
      }
    }
    return `<em t="${trebleChord}"${this.bassBase ? ` b="${bassChord}"` : ''}><i>${this.extension || ''}</i></em>`;
  }
}

module.exports = {
  Chord, A, G, PIANO_KEYS, PIANO_KEYS_FLAT, PIANO_KEYS_SHARP, WHITE_KEY_INDICES_FROM_A, SIGN_AS_SHARP
}