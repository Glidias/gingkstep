const marked = require('marked');
/**
 * @type {import('chordsheetjs')}
 */
const CS = require('chordsheetjs').default;
const cheerio = require('cheerio');
const e = require('express');
const {Chord} = require("./chord.js");

// Piano key constants
const A = 'A'.charCodeAt(0);
const G = 'G'.charCodeAt(0);
// white keys
const PIANO_KEYS = ['C', 0, 'D', 0, 'E', 'F', 0, 'G', 0, 'A', 0, 'B', 'C', 0, 'D', 0, 'E', 'F', 0, 'G', 0, 'A', 0, 'B', 'C', 0, 'D', 0, 'E', 'F', 0, 'G', 0, 'A', 0, 'B'];
const WHITE_KEY_INDICES_FROM_A = [21, 23, 24, 26, 28, 29, 31];
// console.log(WHITE_KEY_INDICES_FROM_A.map((i)=>PIANO_KEYS[i]))
// black keys
const PIANO_KEYS_SHARP = [0, 'Ch', 0, 'Dh', 0, 0, 'Fh', 0, 'Gh', 0, 'Ah', 0, 0, 'Ch', 0, 'Dh', 0, 0, 'Fh', 0, 'Gh', 0, 'Ah', 0, 0, 'Ch', 0, 'Dh', 0, 0, 'Fh', 0, 'Gh', 0, 'Ah', 0];
const PIANO_KEYS_FLAT = [0, 'Db', 0, 'Eb', 0, 0, 'Gb', 0, 'Ab', 0, 'Bb', 0, 0, 'Db', 0, 'Eb', 0, 0, 'Gb', 0, 'Ab', 0, 'Bb', 0, 0, 'Db', 0, 'Eb', 0, 0, 'Gb', 0, 'Ab', 0, 'Bb', 0];

// piano keys signature preference (for sharps)
const SIGN_AS_SHARP = [0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1,  0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1,  0, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0, 1];

console.log(Chord.parse('##7minor6/#3').toHTMLString());
console.log(Chord.parse('Bmin6/C').toHTMLString());

/*
function test_pianoBiasedRelativeMajorKeys() {
  let arr = [];
  for (let i =0; i< 12; i++) {
    let m = i;
    let M = i + 3;s
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

  console.log(arr.join('\n'));
}
test_pianoBiasedRelativeMajorKeys();
*/


marked.setOptions({
  gfm: true,
  /*
  highlight: function (code, lang, callback) {
    pygmentize({ lang: lang, format: 'html' }, code, function (err, result) {
      if (err) return callback(err);
      callback(null, result.toString());
    });
  },
  */
  tables: true,
  breaks: true,
  //pedantic: false,
  smartLists: true,
  //smartypants: false,
  //langPrefix: 'lang-'
});

/**
 *
 * @param {String} content
 */
function markDownParse(content) {
  var promise = new Promise((resolve, reject) => {
    marked(content, function(err, parseResult) {
      resolve((parseResult ? parseResult : content).trim().replace(/\n/g, '<br>'));
    });
  });
  return promise;
}

function findAttrIn(els, attr) {
  let len = els.length;
  for (let i =0; i<len; i++) {
    if (els[i].attribs[attr]) {
      return els[i].attribs[attr];
    }
  }
  return null;
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


/**
 *
 * @param {String} chordStr
 */
function getChordHTML(chordStr) {
  /*
  let chords = chordStr.split('/');
  let bass = null;
  if (chords.length >= 2) {
    chords.pop();
    bass = chords[chords.length - 1];
    bass = bass.toUpperCase();
  }
  return '<em t="'+chords[0]+'"'+(bass ? ` b="${bass}"` : '')+'>'+`<i></i></em>`;
  */

}

/**
 * Converts to natural major key signature (piano-biased)
 * @param {String} key
 * @return The piano-biased key signature
 */
function normalizeKeyAsMajor(key) {
  console.log(key);
  key = key.trim();
  key = key.charAt(0).toUpperCase() + key.slice(1);

  let index = key.charCodeAt(0) - A;
  if (index < 0 || index >= 7) { // no valid white key found in range!
    return null;
  }

  let sharpFlats = key.slice(1);
  // total delta of sharps/flats, including relative major 3rd if minor key
  let totalDelta = getSharpFlatDelta(sharpFlats);

  totalDelta +=  (key.charAt(key.length-1) === 'm' ? 3 : 0);
  index = WHITE_KEY_INDICES_FROM_A[index] + totalDelta;

  // let flatPreference = sharpFlats.charAt(0) === 'b';

  let normKey = PIANO_KEYS[index];
  if (!normKey) {
    normKey = (!!SIGN_AS_SHARP[index] ? PIANO_KEYS_SHARP : PIANO_KEYS_FLAT)[index];
  }
  if (!normKey) {
    console.error("Norm key could not be found!" + normKey + ', at index:'+ index);
    return null;
  }

  return normKey;
}

/**
 *
 * @param {import('chordsheetjs').Song} song
 * @param {String} [firstSlideContent] Any first slide content to refer to for backup song key/capo sniffing
 */
function formatSongToHTML(song, headerSlideContent) {
  let $ = null;
  let songKey = null;
  let songKeyLabel = null;
  let songCapo = null;
  if (song.metadata.key) {
    songKey = normalizeKeyAsMajor(song.metadata.key);
    if (songKey !== null) {
      songKeyLabel = song.metadata.key;
    }
  } else if (headerSlideContent) {
    if ($ === null) $ = cheerio.load('<div>'+headerSlideContent+"</div>");
    let key = findAttrIn($('.song'), 'key');
    if (key !== null) {
      songKey = normalizeKeyAsMajor(key);
      if (songKey !== null) {
        songKeyLabel = key;
      }
    }
  }
  if (song.metadata.capo) {
    let capoAmt = parseInt(song.metadata.capoAmt);
    if (!isNaN(capoAmt) && capoAmt > 0) {
      songCapo = capoAmt;
    }
  } else if (headerSlideContent) {
    if ($ === null) $ = cheerio.load('<div>'+headerSlideContent+"</div>");
    let capo = findAttrIn($('.song'), 'capo');
    if (capo !== null) {
      let capoAmt = parseInt(capo);
      if (!isNaN(capoAmt) && capoAmt > 0) {
        songCapo = capoAmt;
      }
    }
  }



}


/**
 * Parse gingko tree to a format similar to one in /src/mockdata.js
 * @param {Object} tree
 */
async function parseGingkoTree(tree) {
  var shows = [];

  for (let i = 0, l = tree.length; i< l; i++) {
    let c = tree[i];
    if (c.content === '') continue;

    let content = c.content.trim();// c.content.replace(/^\s+|\n|\s+$/g);
    let ht = await markDownParse(content);
    let slides = [ht];
    /**
     * @type {Array}
     */
    let children = c.children;

    for (let ci = 0, cl = children.length; ci< cl; ci++) {
      let c = children[ci];
      if (c.content === '') continue;
      let content = c.content.trim();

      if (content.slice(0, 3) === '```') {
        let firstLineSpl = content.indexOf('\n');
        /**
         * @type String
         */
        let parserTag = content.slice(3, firstLineSpl);
        if (parserTag) {
          parserTag = parserTag.trim().toLowerCase();
        }
        // console.log(parserTag);
        content = content.slice(firstLineSpl + 1);
        // console.log(content);
        if (content.slice(content.length - 3) === '```') {
          content = content.slice(0, content.length - 3);
        } else if (!parserTag) {
          parserTag = 'cp';
        }
        content = content.trim();
        let p = parserTag === 'cp' ? new CS.ChordProParser() : parserTag === 'ug' ? new CS.UltimateGuitarParser() : new CS.ChordSheetParser();
        let song = p.parse(content);
        formatSongToHTML(song, slides[0]);

      } else {
        content = await markDownParse(content);
      }
      slides.push(content);
    }
    let obj = {
      slides
    };
    shows.push(obj);
  }
  // const $ = cheerio.load('<h2 class="title">Hello world</h2>');

  return shows;
}

module.exports = {
  parseGingkoTree,
  markDownParse,
  formatSongToHTML,
  normalizeKeyAsMajor,
  PIANO_KEYS,
  PIANO_KEYS_SHARP,
  PIANO_KEYS_FLAT
}