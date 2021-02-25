const A = 'A'.charCodeAt(0);
const G = 'G'.charCodeAt(0);
// white keys
const PIANO_KEYS = ['C', 0, 'D', 0, 'E', 'F', 0, 'G', 0, 'A', 0, 'B', 'C', 0, 'D', 0, 'E', 'F', 0, 'G', 0, 'A', 0, 'B', 'C', 0, 'D', 0, 'E', 'F', 0, 'G', 0, 'A', 0, 'B'];
const WHITE_KEY_INDICES_FROM_A = [9, 11, 0, 2, 4, 5, 7]; //[21, 23, 24, 26, 28, 29, 31];

// console.log(WHITE_KEY_INDICES_FROM_A.map((i)=>PIANO_KEYS[i]))
// black keys
const PIANO_KEYS_SHARP = [0, 'Ch', 0, 'Dh', 0, 0, 'Fh', 0, 'Gh', 0, 'Ah', 0, 0, 'Ch', 0, 'Dh', 0, 0, 'Fh', 0, 'Gh', 0, 'Ah', 0, 0, 'Ch', 0, 'Dh', 0, 0, 'Fh', 0, 'Gh', 0, 'Ah', 0];
const PIANO_KEYS_FLAT = [0, 'Db', 0, 'Eb', 0, 0, 'Gb', 0, 'Ab', 0, 'Bb', 0, 0, 'Db', 0, 'Eb', 0, 0, 'Gb', 0, 'Ab', 0, 'Bb', 0, 0, 'Db', 0, 'Eb', 0, 0, 'Gb', 0, 'Ab', 0, 'Bb', 0];
// piano keys signature preference (for sharps)
const SIGN_AS_SHARP = [false, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1,  false, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1,  false, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1];
const SIGN_AS_SHARP_MINOR = [0, 1, 0, 0, 1, 0, 1, 0, 0, false, 0, 0,  0, 1, 0, 0, 1, 0, 1, 0, 0, false, 0, 0,  0, 1, 0, 0, 1, 0, 1, 0, 0, false, 0, 0];

// (num flats - num sharps),
const DIFF_ACCIDENTALS_KEYS = [0, -1, 0, -7, 0, 0, 0, 0, -4, 0, -8, 0, 0, -1, 0, -7, 0, 0, 0, 0, -4, 0, -8, 0, 0, -1, 0, -7, 0, 0, 0, 0, -4, 0, -8, 0]; //2

const MIDDLE_C_INDEX = WHITE_KEY_INDICES_FROM_A[2];

const PIANO_KEYS_12_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const PIANO_KEYS_12_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
//const PIANO_KEYS_12_C = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B']; // based on diff key signature accidental tolerance of 1


/**
 * Converts key to natural major key signature for CSS key signature declarations
 * @param {String} key
 * @param {number} offset Any offset in halfsteps. Defaults to zero
 * @return The piano-biased natural major key signature
 */
function normalizeKeyAsMajor(key, offset=0) {
  key = key.trim();
  key = key.charAt(0).toUpperCase() + key.slice(1);

  let index = key.charCodeAt(0) - A;
  if (index < 0 || index >= 7) { // no valid white key found in range!
    return null;
  }

  let sharpFlats = key.slice(1);
  // total delta of sharps/flats, including relative major 3rd if minor key
  let totalDelta = getSharpFlatDelta(sharpFlats);

  totalDelta +=  (key.charAt(key.length-1) === 'm' ? 3 : 0) + offset;
  index = WHITE_KEY_INDICES_FROM_A[index] + totalDelta;

  // let flatPreference = sharpFlats.charAt(0) === 'b';

  index %= PIANO_KEYS.length;
  let normKey = PIANO_KEYS[index];
  if (!normKey) {
    normKey = (SIGN_AS_SHARP[index] ? PIANO_KEYS_SHARP : PIANO_KEYS_FLAT)[index];
  }
  if (!normKey) {
    throw new Error("Norm key could not be found!" + normKey + ', at index:'+ index);
    //return null;
  }

  return normKey;
  }

  /**
 *
 * @param {String} sharpsOrFlats
 */
function getSharpFlatDelta(sharpsOrFlats) {
  let i = 0;
  let c = 0;
  for (let i =0, l=sharpsOrFlats.length; i< l; i++) {
    let ch = sharpsOrFlats.charAt(i);
    c += ch === '#' || ch === 'h' ? 1 : ch === 'b' ? -1 : 0;
   }
  return c;
  }

  module.exports = {
  normalizeKeyAsMajor,
  getSharpFlatDelta,
  MIDDLE_C_INDEX,
  A, G, PIANO_KEYS, PIANO_KEYS_FLAT, PIANO_KEYS_SHARP, WHITE_KEY_INDICES_FROM_A, SIGN_AS_SHARP, SIGN_AS_SHARP_MINOR, DIFF_ACCIDENTALS_KEYS,
  PIANO_KEYS_12_SHARP, PIANO_KEYS_12_FLAT,
  // PIANO_KEYS_12_C
  }