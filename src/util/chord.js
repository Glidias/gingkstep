/**
 * https://github.com/martijnversluis/ChordJS
 *  @author martijnversluis
 *  @author Glenn Ko
 */

const chordRegex = /(^[A-G])([h#b]*)?([^/\s]*)(\/([A-G])([h#b]*)?)?$/; ///([A-G])(h|#|b)?([^/\s]*)(\/([A-G])(h|#|b)?)?/i;
const romanRegex = /(^([h#b]*)?([ivIV]+))([^/\s]*)(\/([h#b]*)?([ivIV]+))?$/;
const nashVilleRegex = /(^([h#b]*)?([1-7]+))([^/\s]*)(\/([h#b]*)?([1-7]+))?$/;
const { root } = require("cheerio");
const {
	getSharpFlatDelta,
	A, G, PIANO_KEYS, WHITE_KEY_INDICES_FROM_A, SIGN_AS_SHARP, MINOR_SCALE_FLATS
  } = require("./keys");
//, SIGN_AS_SHARP_MINOR

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
const PIANO_ROMAN_KEYS = ['I', 0, 'II', 0, 'III', 'IV', 0, 'V', 0, 'VI', 0, 'VII',  'I', 0, 'II', 0, 'III', 'IV', 0, 'V', 0, 'VI', 0, 'VII'];
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
   * Get roman numeral symbol of a given val against key root chord via naive method (only maximum 1 flat or 1 sharp used for non-diatonics).
   * Prefers use of symbol or flat against key signature of rootchord to minimise amount of sharp/flat accidentals via prefered natural.
   * @param {Number} theVal getTrebleVal() or getBassVal() result
   * @param {String} modifier
   * @param {Chord} rootChord Either a natural major or minor chord representation for the key
   * @return {String} The chord representation in roman symbol format
   */
  const getSimpleRoman = (theVal, modifier, rootChord) => {
     let rootKeyVal = rootChord.getTrebleVal(); // rootChord.getKeyVal(); // relative minor mode

      let offset = theVal - rootKeyVal;

      offset %=12;
      if (offset < 0) offset = 12 + offset;
      else if (offset >= 12) offset = offset - 12;
      //console.log(offset);

      if (offset < 0 || offset >= PIANO_ROMAN_KEYS.length) {
        //if (offset < 0) offset = PIANO_ROMAN_KEYS.length + offset;
        //else if (offset >= PIANO_ROMAN_KEYS.length) offset -= PIANO_ROMAN_KEYS.length;
        throw new Error("Assertion failed:: Offset of half-steps still out of range between 0 to 11! " + offset)
      }

      if (rootChord.isMinor) { // natural minor offset on minor 3rd, 6th and 7th considerations
        if (offset === 3 || offset === 8 || offset === 10) offset += 1;
      }

      let chord;


      if (PIANO_ROMAN_KEYS[offset]) { // diatonic natural major match keynote
        chord = PIANO_ROMAN_KEYS[offset];
      } else { // display  either sharp or flat for non-diatonic keynote?
        let signatureSharps = rootChord.getSignAsSharp();
        let delta = modifier ? getSharpFlatDelta(modifier) : 0;

        if (signatureSharps !== 0) {
          if (PIANO_KEYS[theVal]) {
            // prefer against signature for natural possibilities
            let thePrefix = (signatureSharps ? 'b' : 'h');
            let theEnharmonicOffset = thePrefix === 'b' ? 1 : -1;
            chord = thePrefix + PIANO_ROMAN_KEYS[offset+theEnharmonicOffset];
          } else { // follow current chord delta
            let thePrefix = (delta > 0 ? 'h' : 'b');
            let theEnharmonicOffset = thePrefix === 'b' ? 1 : -1;
            chord = thePrefix + PIANO_ROMAN_KEYS[offset+theEnharmonicOffset];
          }
        }  else { // follow current chord delta
          let thePrefix = (delta > 0 ? 'h' : 'b');
          let theEnharmonicOffset = thePrefix === 'b' ? 1 : -1;
          chord = thePrefix + PIANO_ROMAN_KEYS[offset+theEnharmonicOffset];
        }
      }
      return chord;
  }




/**
 * Infers whether chord suffix represents a minor chord
 * @param {String} suffix
 */
const isMinorFromSuffixLen = (suffix) => {
  suffix = suffix.toLowerCase();
  if (suffix.charAt(0) !== 'm') return false;
  suffix = suffix.split(/[^a-z]|(sus)?(dim)?(maj)?/)[0];
  return (suffix === 'm' || suffix === 'min' || suffix ==='minor') ? suffix.length : 0;
}

class Chord {
  static parse(chordString) {
    chordString = chordString.trim();
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

    this.dimed = this.suffix !== null ? this.suffix.toLowerCase().slice(0, 3) === 'dim' || this.suffix.charAt(0) === 'o' : false;

    this.extension = this.isMinor ? suffix.slice(minorLen) : this.suffix;
    if (this.extension) this.extension = this.extension.replace('/"/g', `'`);
    this.bassBase = bassBase || null;
    this.bassModifier = bassModifier || null;
    this.mode = mode;
  }

  getTrebleComponent() {
    return !this.mode ? this.base + (this.modifier || "") : (this.modifier || "") + this.base;
  }

  getRelativeChord() {
    let result;
    result = this.transpose(this.isMinor ? 3 : -3);
    result.isMinor = !this.isMinor;
    if (result.isMinor) { // add "m" to suffix again
      let rLen = result.suffix ? isMinorFromSuffixLen(result.suffix) : false;
      if (!rLen) result.suffix = "m" + (result.suffix || "");
    } else { // strip out m
      let rLen = result.suffix ? isMinorFromSuffixLen(result.suffix) : false;
      if (rLen && rLen >=1) {
        result.suffix = result.suffix.slice(rLen);
      }
    }
    return result;
  }


  getParallelChord() {
    let result = this.clone();
    result.isMinor = !this.isMinor;
    if (result.isMinor) { // add "m" to suffix again
      let rLen = result.suffix ? isMinorFromSuffixLen(result.suffix) : false;
      if (!rLen) result.suffix = "m" + (result.suffix || "");
    } else { // strip out m
      let rLen = result.suffix ? isMinorFromSuffixLen(result.suffix) : false;
      if (rLen && rLen >=1) {
        result.suffix = result.suffix.slice(rLen);
      }
    }
    return result;
  }

  clone() {
    const { base, modifier, suffix, bassBase, bassModifier, mode} = this;
    return new Chord({ base, modifier, suffix, bassBase, bassModifier, mode });
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
    let result = processChord(this, transpose, delta);
    if (!result.getSignAsSharp() !== !this.getSignAsSharp()) {
      result = result.switchModifier();
    }
    return result;
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

  /*
  getBaseTrebleVal() { // in relation toA
    let index = this.base.charCodeAt(0) - A;
    index = WHITE_KEY_INDICES_FROM_A[index];
    if (index < MIDDLE_C_INDEX) index += 12;
    index -= MIDDLE_C_INDEX;

    return index;
  }
  */

  // deprecrte
  getMajorScaleVal() {
    let index = this.base.charCodeAt(0) - A;
    index = WHITE_KEY_INDICES_FROM_A[index] + (this.modifier ? getSharpFlatDelta(this.modifier) : 0);
    index += this.isMinor ? 3 : 0;
    return index;
  }

  /**
   * @return Zero if neutral (all-natural). False if prefer flats. True if prefer sharps.
   */
  getSignAsSharp() {
    let index = this.base.charCodeAt(0) - A;
    let delta = (this.modifier ? getSharpFlatDelta(this.modifier) : 0);
    index = WHITE_KEY_INDICES_FROM_A[index] + delta;

    let isWhiteKey = PIANO_KEYS[index];
    if (this.isMinor) {
      index += 3; // relative major
      if (SIGN_AS_SHARP[index] === false) {
        if (delta !== 0) {
          return delta > 0;
        }
        return 0;
      }
      if (isWhiteKey && delta ===0) {
        index -= 2;
        return !!PIANO_KEYS[index];
      } else { // follow sharp/flat delta of chord representation
        if (delta !== 0) {
          return delta > 0;
        } else {
          return 0;
        }
      }
    } else { // whole tone step back check method

      if (SIGN_AS_SHARP[index] === false) {
        if (delta !== 0) {
          return delta > 0;
        }
        return 0;
      }

      if (isWhiteKey && delta ===0) {
        index -= 2;
        return  !!PIANO_KEYS[index];
      }
      if (delta !== 0) {
        return delta > 0;
      } else {
        return 0;
      }

      //return (!!PIANO_KEYS[index]) ? delta > 0 === (!!PIANO_KEYS[index]) : delta < 0 === ((!!PIANO_KEYS[index])); // white key@wholetone back  => sharp,  black key@wholetone back => flat
    }
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
        trebleChord = getSimpleRoman(this.getTrebleVal(), this.modifier, rootChord);
        if (this.dimed || this.isMinor) trebleChord = trebleChord.toLowerCase();
        if (this.bassBase) {
          bassChord = getSimpleRoman(this.getBassVal(), this.bassModifier, rootChord);
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
    return `<em t="${trebleChord}"${this.bassBase ? ` b="${bassChord}"` : ''}><i>${this.extension ? `<sup e="${this.extension}"></sup>` : ''}</i></em>`;
  }
}

module.exports = {
  Chord,
  PIANO_ROMAN_KEYS
}