
// const { PIANO_KEYS, PIANO_KEYS_FLAT, SIGN_AS_SHARP, PIANO_KEYS_SHARP } = require("../../src/util/keys")
const { Chord } = require("../../src/util/chord")

test('test minor label chords', () => {
  let test_isMinor = (chd, base, mod="") =>{
    try {
      expect(Chord.parse(chd).isMinor).toStrictEqual(true);
    } catch(err) {
      throw new Error(`${chd} failed.`);
    }
  }
  test_isMinor("Bmin6/C", true);
  test_isMinor("Cmin7b5/D", true);
  test_isMinor("CMin6", true);
});

test('test non-minor label chords', () => {
  let test_isMajor = (chd, base, mod="") =>{
    try {
      expect(Chord.parse(chd).isMinor).toStrictEqual(false);
    } catch(err) {
      console.log(`${chd} failed.`);
      throw err;
    }
  }
  test_isMajor("F#Maj7/D#");
  test_isMajor("Bbdim/D"); // disambguiation: diminished is not considered a "minor" (well for the purpose of this test..)
  test_isMajor("Bmaj7/Db");
});

test('test slash chords', () => {
  let test_slashChord = (chd, base, mod="") =>{
    try {
      let ch = Chord.parse(chd);
      expect(ch.bassBase || "").toEqual(base);
      expect(ch.bassModifier || "").toEqual(mod);
    } catch(err) {
      console.log(`${chd} failed.`);
      throw err;
    }
  }
  test_slashChord("Bmin6/C", "C");
  test_slashChord("F#Maj7/D#", "D", "#");
  test_slashChord("Bb/D", "D");
  test_slashChord("B/Db", "D", "b");
  test_slashChord("C/D", "D");
});

// https://github.com/Glidias/gingkstep/wiki/%5BTECH%5D-Keys-and-Enharmony#enharmonic-preferences-for-key-signatures
test('key signature enharmonic preference', () => {
  let test_getSignAsSharp = (key, val) =>{
    try {
      expect(Chord.parse(key).getSignAsSharp()).toStrictEqual(val);
    } catch(err) {
      console.log(`${key} failed.`);
      throw err;
    }
  }
  test_getSignAsSharp("Cb", false); test_getSignAsSharp("Dbb", false);
  test_getSignAsSharp("C", 0);
  test_getSignAsSharp("C#", true); test_getSignAsSharp("Db", false);
  test_getSignAsSharp("E", true); test_getSignAsSharp("Fb", false);
  test_getSignAsSharp("F", false);
  test_getSignAsSharp("F#", true); test_getSignAsSharp("Gb", false);
  test_getSignAsSharp("G", true); test_getSignAsSharp("G#b", true);
  test_getSignAsSharp("G#", true); test_getSignAsSharp("Ab", false);
  test_getSignAsSharp("A", true);
  test_getSignAsSharp("A#", true); test_getSignAsSharp("Bb", false);
  test_getSignAsSharp("B", true); test_getSignAsSharp("A##", true);

  test_getSignAsSharp("Cbm", false);
  test_getSignAsSharp("Cm", false);
  test_getSignAsSharp("C#m", true); test_getSignAsSharp("Dbm", false);
  test_getSignAsSharp("Em", true); test_getSignAsSharp("Fbm", false);
  test_getSignAsSharp("Fm", false);
  test_getSignAsSharp("F#m", true); test_getSignAsSharp("Gbm", false);
  test_getSignAsSharp("Gm", false); test_getSignAsSharp("G#bm", false);
  test_getSignAsSharp("G#m", true); test_getSignAsSharp("Abm", false);
  test_getSignAsSharp("Am", 0);
  test_getSignAsSharp("A#m", true); test_getSignAsSharp("Bbm", false);
  test_getSignAsSharp("Bm", true);  test_getSignAsSharp("A##m", true);
});

// https://github.com/Glidias/gingkstep/wiki/%5BTECH%5D-Keys-and-Enharmony#enharmonic-preferencesconventions-during-modulation-over-transposed-keys


test('transposition', () => {
  // from C
  expect(Chord.parse('C').transpose(1).toString()).toStrictEqual("Db");  // with neutral enharmonic tie tolerance case, consider using C# as to follow direction of transposition?
  expect(Chord.parse('C').transpose(2).toString()).toStrictEqual("D");
  expect(Chord.parse('C').transpose(3).toString()).toStrictEqual("Eb");
  expect(Chord.parse('C').transpose(4).toString()).toStrictEqual("E");
  expect(Chord.parse('C').transpose(5).toString()).toStrictEqual("F");
  expect(Chord.parse('C').transpose(6).toString()).toStrictEqual("Gb");  // with neutral enharmonic tie tolerance case, consider using F# as to follow direction of transposition?
  expect(Chord.parse('C').transpose(7).toString()).toStrictEqual("G");
  expect(Chord.parse('C').transpose(8).toString()).toStrictEqual("Ab");
  expect(Chord.parse('C').transpose(9).toString()).toStrictEqual("A");
  expect(Chord.parse('C').transpose(10).toString()).toStrictEqual("Bb");
  expect(Chord.parse('C').transpose(11).toString()).toStrictEqual("B");
  expect(Chord.parse('C').transpose(12).toString()).toStrictEqual("C");
});

// todo: Need standalone modulation function for chord to take into account (oldChord, newChord, origKey)


/*
test('piano based relative minor/major keys', () => {
  let arr = [];
  for (let i =0; i< 12; i++) {
    let m = i;
    let M = i + 3;
    let majorKey = null;
    let minorKey = null;

    if (!PIANO_KEYS[m]) {
      minorKey = (SIGN_AS_SHARP[m] ? PIANO_KEYS_SHARP : PIANO_KEYS_FLAT)[m];
    } else {
      minorKey = PIANO_KEYS[m];
    }

    if (!PIANO_KEYS[M]) {
      majorKey = (SIGN_AS_SHARP[M] ? PIANO_KEYS_SHARP : PIANO_KEYS_FLAT)[M];
    } else {
      majorKey = PIANO_KEYS[M];
    }
    arr.push(minorKey + 'm => ' + majorKey);
  }

  //console.log(arr);

  // console.log(arr.join('\n'));
  expect(true);
});
*/
