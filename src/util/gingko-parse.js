const marked = require('marked');
/**
 * @type {import('chordsheetjs')}
 */
const CS = require('chordsheetjs').default;
const cheerio = require('cheerio');
const e = require('express');
const {Chord, A, G, PIANO_KEYS, PIANO_KEYS_SHARP, PIANO_KEYS_FLAT, WHITE_KEY_INDICES_FROM_A, SIGN_AS_SHARP} = require("./chord.js");

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
 * Converts to natural major key signature (piano-biased)
 * @param {String} key
 * @return The piano-biased key signature
 */
function normalizeKeyAsMajor(key) {
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
 * @param {String|Object} [headerSlide] Any first slide content to refer to for backup song key/capo sniffing or already parsed songInfo
 * @param {Boolean} [noTranspose]
 */
function getSongOutput(song, headerSlide, noTranspose) {
  let $ = null;
  let songKey = null;
  let songKeyLabel = null;
  let songCapo = null;

  if (headerSlide) {
    if (typeof headerSlide === 'object') {
      songKey = headerSlide.songKey;
      songCapo = headerSlide.songCapo;
      songKeyLabel = headerSlide.songKeyLabel;
      if ( song.metadata.key) {
        let newKey = normalizeKeyAsMajor(song.metadata.key);

        // modulation
        if (songKey && newKey !== songKey ) {
          let a =  Chord.parse(songKey).getTrebleVal() !== Chord.parse(newKey).getTrebleVal();
          let b =  Chord.parse(songKey).getTrebleVal() !== Chord.parse(newKey).getTrebleVal();
          if (a !== b) {
            songKey = newKey;

          }
        }
      }

      if ( song.metadata.capo) {
        let capoAmt = parseInt(song.metadata.capoAmt);
        if (!isNaN(capoAmt) && capoAmt > 0) {
          songCapo = capoAmt;
        }
      }

    } else {
      if ($ === null) $ = cheerio.load('<div>'+headerSlide+"</div>");
      let key = findAttrIn($('.song'), 'key');
      if (key !== null) {
        songKey = normalizeKeyAsMajor(key);
        if (songKey !== null) {
          songKeyLabel = key;
        }
      }
      let capo = findAttrIn($('.song'), 'capo');
      if (capo !== null) {
        let capoAmt = parseInt(capo);
        if (!isNaN(capoAmt) && capoAmt > 0) {
          songCapo = capoAmt;
        }
      }
    }

    if (songKey === null && song.metadata.key) {
      songKey = normalizeKeyAsMajor(song.metadata.key);
      if (songKey !== null) {
        songKeyLabel = song.metadata.key;
      }
    }

    if (songCapo === null && song.metadata.capo) {
      let capoAmt = parseInt(song.metadata.capoAmt);
      if (!isNaN(capoAmt) && capoAmt > 0) {
        songCapo = capoAmt;
      }
    }

  }


  let rootChord = (songKey && songKeyLabel) || song.metadata.key ? Chord.parse(song.metadata.key || songKeyLabel) : null;

  return {
    songCapo,
    songKey,
    songKeyLabel,
    paragraphs: getSongParagraphs(song, noTranspose ? null : songKey, noTranspose ? null : rootChord)
  }
}

/**
 *
 * @param {import('chordsheetjs').Song} song
 * @param {String} songKey key attribute
 * @param {Chord} rootChord
 * @param {String} keyChange indicator for key change
 * @retur {[string]}
 */
function getSongParagraphs(song, songKey, rootChord, keyChange) {

  let arr = [];
  song.paragraphs.forEach((p)=>{
    //if (p.type === 'none') return;
    let output = `<p class="song"${songKey ? ` key="${songKey}"` : ''}>`;

    p.lines.forEach((line, lineIndex, linesArr)=> {
      //if (line.type === 'none') return;
      let numLinesE = linesArr.length - 1;
      if (line.items && line.items.length) {
        let lle = line.items.length - 1;
        for (let i =0, l=line.items.length; i<l; i++) {
          let li = line.items[i];
          let lyric = li.lyrics; //.trim();
          let chordStr = li.chords ? li.chords.trim() : null;
          if (!lyric && !chordStr) {
            continue;
          }

          let chord = chordStr ? Chord.parse(chordStr) : null;
          output += (chord ? chord.toHTMLString(rootChord) : '') + (lyric || "");

          //output += i < lle ? ' ' : '';
        }

      }
      output += lineIndex < numLinesE ? '<br>' : '';
    });
    output += '</p>';
    arr.push(output);
  })

  return arr;
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

    // look for enclosing content
    // /^```([a-z|\- ]*$\n)/gm

    // look for ending
    // /^``` *$/gm

    let ht = await markDownParse(content);

    let slides = [ht];
    /**
     * @type {Array}
     */
    let children = c.children ? c.children : [];

    let isSongMode = false;
    let parserParams;
    let parserTag;
    let songOutput;

    for (let ci = 0, cl = children.length; ci< cl; ci++) {
      let c = children[ci];
      if (c.content === '') continue;
      let content = c.content.trim();
      let toContinue = false;

      if (content.slice(0, 3) === '```' || (toContinue = isSongMode)) {
        if (!toContinue) {
          let firstLineSpl = content.indexOf('\n');
          /**
           * @type String
           */
          parserParams = content.slice(3, firstLineSpl).split("-");
          parserTag = parserParams[0];
          if (parserTag) {
            parserTag = parserTag.trim().toLowerCase();
          }
          // console.log(parserTag);
          content = content.slice(firstLineSpl + 1);
        }
        // console.log(content);

        if (content.slice(content.length - 3) === '```') {
          content = content.slice(0, content.length - 3);
        } if (!parserTag) {
          parserTag = 'cp';
        }
        content = content.trim();

        let p = parserTag === 'cp' ? new CS.ChordProParser() : parserTag === 'ug' ? new CS.UltimateGuitarParser() : new CS.ChordSheetParser();
        if (parserTag === 'cp') {
          content = content.replace(/#/g, "h").replace(/\]\[/g, '] [');
        }
        let song = p.parse(content);
        songOutput = getSongOutput(song, songOutput ? songOutput : slides[0], parserParams[parserParams.length -  1] === 'notranspose');

        if (songOutput.paragraphs) {
          slides.push(...songOutput.paragraphs);
        }
        isSongMode = true;
        /*
        if (ci === 0) {
          if (songOutput.paragraphs) {

          }
        }
        */
      } else {
        content = await markDownParse(content);
        slides.push(content);
      }

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
  getSongOutput,
  normalizeKeyAsMajor,
}

// ---- TESTS

/*
let testKeyChord = Chord.parse("Bb");
console.log(Chord.parse("F#Maj7/D").toHTMLString(testKeyChord));
testKeyChord = Chord.parse("F");
console.log(Chord.parse("Bb/D").toHTMLString(testKeyChord));
console.log(Chord.parse("B/D").toHTMLString(testKeyChord));
console.log(Chord.parse("C/D").toHTMLString(testKeyChord));
*/

/*
function test_KeyChord(key){
  console.log(key + " => " + Chord.parse(key).getSignAsSharp());
}
test_KeyChord("Cb"); test_KeyChord("Dbb");
test_KeyChord("C");
test_KeyChord("C#"); test_KeyChord("Db");
test_KeyChord("E"); test_KeyChord("Fb");
test_KeyChord("F");
test_KeyChord("F#"); test_KeyChord("Gb");
test_KeyChord("G"); test_KeyChord("G#b");
test_KeyChord("G#"); test_KeyChord("Ab");
test_KeyChord("A");
test_KeyChord("A#"); test_KeyChord("Bb");
test_KeyChord("B"); test_KeyChord("A##");


test_KeyChord("Cbm");
test_KeyChord("Cm");
test_KeyChord("C#m"); test_KeyChord("Dbm");
test_KeyChord("Em"); test_KeyChord("Fbm");
test_KeyChord("Fm");
test_KeyChord("F#m"); test_KeyChord("Gbm");
test_KeyChord("Gm"); test_KeyChord("G#bm");
test_KeyChord("G#m"); test_KeyChord("Abm");
test_KeyChord("Am");
test_KeyChord("A#m"); test_KeyChord("Bbm");
test_KeyChord("Bm");  test_KeyChord("A##m");
*/

//console.log(Chord.parse('##7minor6/#3').toHTMLString());
//console.log(Chord.parse('Bmin6/C').toHTMLString());
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