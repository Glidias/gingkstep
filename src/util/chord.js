/*
https://github.com/martijnversluis/ChordJS
*/

const chordRegex = /(^[A-Ga-g])([h#b]+)?([^/\s]*)(\/([A-Ga-g])([h#b]+)?)?$/; ///([A-G])(h|#|b)?([^/\s]*)(\/([A-G])(h|#|b)?)?/i;
const romanRegex = /(^([h#b]+)?([ivIV]+))([^/\s]*)(\/([h#b]+)?([ivIV]+))?$/;
const nashVilleRegex = /(^([h#b]+)?([1-7]+))([^/\s]*)(\/([h#b]+)?([1-7]+))?$/;

const A = 'A'.charCodeAt(0);
const G = 'G'.charCodeAt(0);

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
        return new Chord({ base, modifier, suffix, bassBase, bassModifier });
      }
    }

    parts = romanRegex.exec(chordString);

    if (parts) {
      let [, , modifier, base, suffix, , bassModifier, bassBase] = parts;
      let mode = 1;
      if (base) {
        base = base.charAt(0).toUpperCase() === base.charAt(0) ? base.toUpperCase() : base.toLowerCase();
        return new Chord({ base, modifier, suffix, bassBase, bassModifier, mode });
      }
    }

    parts = nashVilleRegex.exec(chordString);
    if (parts) {
      let [, , modifier, base, suffix, , bassModifier, bassBase] = parts;
      let mode = 2;
      if (base) {
        return new Chord({ base, modifier, suffix, bassBase, bassModifier, mode });
      }
    }


    return null;
  }

  constructor({ base, modifier, suffix, bassBase, bassModifier, mode }) {
    this.base = base || null;
    this.modifier = modifier || null;
    this.suffix = suffix || null;

    let minorLen = 0;
    if (mode !== 1) {
      minorLen = this.suffix !== null ? isMinorFromSuffixLen(this.suffix) : 0;
      this.isMinor = minorLen >= 1;
    } else {
      this.isMinor = base.charAt(0).toLowerCase() === base.charAt(0);
    }
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

  toHTMLString() {
    // modifier+base in roman


    // bassModifier + bass in roman
    if (this.bassBase) {

    }
    return `<em t=""${this.bassBase ? ` b=""` : ''}><i>${this.extension || ''}</i></em>`;
  }
}

module.exports = {
  Chord
}