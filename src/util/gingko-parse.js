const marked = require('marked');
/**
 * @type {import('chordsheetjs')}
 */
const CS = require('chordsheetjs').default;
const cheerio = require('cheerio');
const e = require('express');
const {Chord} = require('./chord.js');
const {parseChordProBody} = require("./chordpro.js");

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

function getModulationInfo(newKeyChord, oldChordKey, rootChord, songKeyLabelPrefered, songKey, origPreferedKeyChord, modulateIntro ) {
    let modulate, modulateDelta, modulateMode;

    // a new key signature always created per song slide
    if (newKeyChord && rootChord) {
      // modulation (by key scale offset delta)
      let a = newKeyChord.getTrebleVal(); //newKeyChord.getMajorScaleVal();
      let b = rootChord.getTrebleVal(); //rootChord.getMajorScaleVal();
      let delta = a - b;
      let toSwitchMode = newKeyChord.isMinor !== oldChordKey.isMinor;
      if (delta !== 0 ||  toSwitchMode) {
        rootChord = newKeyChord;
        newKeyChord = oldChordKey.transpose(delta);
        if (toSwitchMode) {
          newKeyChord = newKeyChord.getParallelChord();
          modulateMode = newKeyChord.isMinor ? 1 : 2;
        }
        if (delta !== 0) modulateDelta = delta;

        let backToOriginalChord = origPreferedKeyChord && (origPreferedKeyChord.getTrebleVal()===newKeyChord.getTrebleVal());
        if (backToOriginalChord) {
          newKeyChord = origPreferedKeyChord;
          modulateMode = null;
          modulateDelta = null;
        }
        songKeyLabelPrefered = newKeyChord.toString();
        modulate = modulateIntro ? `alt key: ${newKeyChord}`: oldChordKey + ` to ` + newKeyChord;
        songKey = newKeyChord.toString().replace('#', 'h'); //normalizeKeyAsMajor(songKey, delta);
      }
    }
    return {
      modulate, modulateDelta, modulateMode, rootChord, songKeyLabelPrefered, songKey, modulateIntro
    }
}

/**
 *
 * @param {import('chordsheetjs').Song} song
 * @param {String|Object} [headerSlide] Any first slide content to refer to for backup song key/capo sniffing or already parsed songInfo
 * @param {Boolean} [noTranspose]
 * @param {Number} [songIndex]
 * @return {Object}
 */
function getSongOutput(song, headerSlide, noTranspose, songIndex) {
  let $ = null;
  let songKey = null;
  let songKeyLabel = null;
  let songCapo = null;
  let headerSlideAddedIntros;
  let rootChord = null;
  let songBitMetaData;
  let songHeaderTitle;
  let origPreferedKeyChord;
  let capoChange;

  let modulate;
  let modulateDelta;
  let modulateMode;

  let songKeyLabelPrefered;
  let songCapoPrefered;
  if (headerSlide) {
    if (typeof headerSlide === 'object') {
      songKey = headerSlide.songKey;
      songCapo = headerSlide.songCapo;
      songKeyLabel = headerSlide.songKeyLabel;
      rootChord = headerSlide.rootChord;
      songKeyLabelPrefered = headerSlide.songKeyLabelPrefered;
      origPreferedKeyChord = headerSlide.origPreferedKeyChord;

      if (song.metadata.key) {
        // a new key signature always created per song slide
        if (rootChord) {
          let newKeyChord = Chord.parse(song.metadata.key);
          let oldChordKey =  headerSlide.songKeyLabelPrefered instanceof Chord ? headerSlide.songKeyLabelPrefered : Chord.parse(headerSlide.songKeyLabelPrefered);
          ({modulate, modulateDelta, modulateMode, rootChord, songKeyLabelPrefered, songKey} = getModulationInfo(newKeyChord, oldChordKey, rootChord, songKeyLabelPrefered, songKey, origPreferedKeyChord));
        }
      }

       // possible overwrites from headerSlide
      if ( song.metadata.capo !== undefined) {
        let capoAmt = parseInt(song.metadata.capo);
        if (!isNaN(capoAmt)) { // && capoAmt > 0
          capoAmt %= 12;
          if (capoAmt !== songCapo) {
            songCapo = capoAmt;
            capoChange = true;
          }
        }
      }

    } else { // process headerSlide html body
      if ($ === null) $ = cheerio.load('<body>'+headerSlide+"</body>");
      songHeaderTitle = $('p:first-child').text();
      let lastSongKeyLabel = song.metadata.key;
      let extraSongBits = [];
      songBitMetaData = {};
      $('pre > code').each((index, el) =>{
        let elContent = $(el).text().trim();
        let songBit = parseChordProBody(elContent);
        if (songBit) {
           /*
          if (song.metadata.key)  lastSongKeyLabel = song.metadata.key;

          if (songBit.metadata.key) {
            lastSongKeyLabel = songBit.metadata.key;
          }
          */

          if (songBit.metadata.capo) {
            let capoAmt = parseInt(songBit.metadata.capo);
            if (!isNaN(capoAmt) && capoAmt > 0) {
              songCapo = capoAmt;
              songCapo %= 12;
            }
          }

           // also check if the song an empty song or not?
          let songParas = getSongParagraphs(songBit);


          if (!songParas) {  // process header information
            //console.log("Processing empty directive:" + elContent);


            if (songBit.metadata.key) {
              lastSongKeyLabel = songBit.metadata.key;
            }

            if (songBit.metadata.key) {
              //songKeyLabel = songBit.metadata.key;
              if (!songKeyLabelPrefered) {
                songKey = Chord.parse(songBit.metadata.key).toString().replace('#', 'h');
                songKeyLabelPrefered = songBit.metadata.key;
              }
            }
            if (songBit.metadata.capo) {
              let capoAmt = parseInt(songBit.metadata.capo);
              if (!isNaN(capoAmt) && capoAmt > 0) {
                songCapo = capoAmt;
                songCapo %= 12;
                if (!songCapoPrefered) {
                  songCapoPrefered = songCapo;
                }
              }
            }
          } else { // assumed song has started from this point onwards
            /*
            if (!songKeyLabelPrefered && song.metadata.key) {
              songKeyLabelPrefered = song.metadata.key;
              songKey = Chord.parse(song.metadata.key).getTrebleComponent().replace('#', 'h'); //normalizeKeyAsMajor( song.metadata.key);
              songKeyLabel = song.metadata.key;
            }
            */


            ////*
            if (!origPreferedKeyChord) {
              let det =  songKey ? songKey : lastSongKeyLabel  ? lastSongKeyLabel.toString().replace('#', 'h') : song.metadata.key ? song.metadata.key : null;
              origPreferedKeyChord = det ? Chord.parse(det) : null;
              songKeyLabelPrefered = det;
            }
            rootChord = song.metadata.key ? Chord.parse(song.metadata.key) : lastSongKeyLabel ? Chord.parse(lastSongKeyLabel) : null;
            if ( origPreferedKeyChord && songBit.metadata.key && songKeyLabelPrefered && rootChord && songBit.metadata.key !== rootChord.toString()) {

              let modInfo =  getModulationInfo(Chord.parse(songBit.metadata.key), origPreferedKeyChord, rootChord, songKeyLabelPrefered, songKey, origPreferedKeyChord, true);

              songParas = getSongParagraphs(songBit,
                modInfo.songKey ? modInfo.songKey : lastSongKeyLabel  ? lastSongKeyLabel.toString().replace('#', 'h') : null,
                 modInfo.rootChord,
                  {songCapo}, songIndex, modInfo );
            } else {
                songParas = getSongParagraphs(songBit,
                  songKey ? songKey : lastSongKeyLabel  ? lastSongKeyLabel.toString().replace('#', 'h') : null,
                  songBit.metadata.key || song.metadata.key ? Chord.parse(songBit.metadata.key || song.metadata.key) : lastSongKeyLabel ? Chord.parse(lastSongKeyLabel) : null,
                  {songCapo, capoChange}, songIndex
                );
            }
            //*/

            extraSongBits.push(songParas);
          }
          Object.assign(songBitMetaData, songBit.metadata);
        }
      });

      if (extraSongBits.length) {
        headerSlideAddedIntros = extraSongBits.join("");
      }

      if (lastSongKeyLabel) {
        songKeyLabel = lastSongKeyLabel;
      }

      // pick from last metadata if not available on root slide
      if (!songKeyLabelPrefered && song.metadata.key) {
        songKeyLabelPrefered = song.metadata.key;
        songKey = Chord.parse(song.metadata.key).getTrebleComponent().replace('#', 'h'); //normalizeKeyAsMajor( song.metadata.key);
        songKeyLabel = song.metadata.key;
      }


      if (song.metadata.capo) {
        let capoAmt = parseInt(song.metadata.capo);
        if (!isNaN(capoAmt) && capoAmt > 0) {
          capoAmt %= 12;
          songCapo = capoAmt;
          if (!songCapoPrefered) {
            songCapoPrefered = songCapo;
          }
        }
      }

      // finalise starting rootchord
      if (song.metadata.key) {
        //if (!songKeyLabel) {
        songKeyLabel = song.metadata.key;
        //}
      }

      if (songKeyLabel) {
        rootChord = Chord.parse(songKeyLabel);
      }

    }
  }

  return {
    songCapoPrefered,
    songKeyLabelPrefered,
    songCapo,
    songKey,
    songKeyLabel,
    headerSlideAddedIntros,
    songBitMetaData,
    rootChord,
    songHeaderTitle,
    modulate,
    origPreferedKeyChord,
    paragraphs: getSongParagraphs(song, noTranspose ? null : songKey, noTranspose ? null : rootChord, {capoChange, songCapo}, songIndex, {modulate, modulateDelta, modulateMode})
  }
}

/**
 *
 * @param {import('chordsheetjs').Song} song
 * @param {String} [songKey] key attribute
 * @param {Chord} [rootChord]
 * @param {Object} [songCapoInfo]
 * @param {Number} [songIndex]
 * @param {Object} [modulationInfo]
 * @return {[Array]}
 */
function getSongParagraphs(song, songKey, rootChord, {songCapo, capoChange}={}, songIndex=0, {modulate, modulateDelta, modulateMode, modulateIntro}={}) {

  let arr = [];
  let tagInfo = "";

  if (songCapo) rootChord = rootChord.transpose(-songCapo);
  let signatureChord = songKey ? Chord.parse(songKey) : null;
  song.paragraphs.forEach((p)=>{

    //if (p.type === 'none') return;
    let output = `<p class="song"${songKey ? ` key="${songKey}"` : ''}${songIndex != null ? ` data-songid="${songIndex}"` : ''}${modulateIntro ? ` intro` : ''}${modulate ? ` modulate="${modulate}"` : ''}${modulateDelta ? ` m="${modulateDelta}"` : ''}${modulateMode ? ` mm="${modulateMode}"` : ''}${capoChange ? ` capo=${songCapo ? songCapo : 0}` : ''}>`;
    if (capoChange) {
      output += `<em class="capo-change">(${songCapo ? 'Capo: '+songCapo : 'Capo: '+songCapo})<br></em>`;
    }
    let gotContent = false;

    p.lines.forEach((line, lineIndex, linesArr)=> {
      //if (line.type === 'none') return;
      let numLinesE = linesArr.length - 1;
      if (line.items && line.items.length) { // line.isEmpty() ?  .hasRenderableItems() ?
        let lle = line.items.length - 1;

        for (let i =0, l=line.items.length; i<l; i++) {
          let li = line.items[i];

          if (li instanceof CS.Tag) {
            if(!li.isMetaTag()) {
              if (li.name === "comment" && li.value.trim()) {
                (tagInfo = `<i>${li.value}</i>`);
              }
            }
          }
          let lyric = li.lyrics || ""; //.trim();
          let chordStr = li.chords ? li.chords : null; //
          let trimLyric = lyric.trim();
          if (!trimLyric && !chordStr) {
            continue;
          }
          output += tagInfo;
          tagInfo = "";
          let chord = chordStr ? Chord.parse(chordStr) : null;
          //let lastLength = lyric.length;

          let prefixSpaces = '';
          let suffixSpaces = '';
          let whitespaceMatch = lyric.match(/(^ +)|( +$)/g);
          if (whitespaceMatch) {
            if (whitespaceMatch.length === 1) {
              if (lyric.charAt(0) === ' ') {
                prefixSpaces = whitespaceMatch[0];
              } else {
                suffixSpaces = whitespaceMatch[0];
              }
            } else {
              prefixSpaces = whitespaceMatch[0];
              suffixSpaces = whitespaceMatch[1];
            }
          }

          output += prefixSpaces + '<span>'+(chord ? chord.toHTMLString(rootChord, signatureChord) : '') + (trimLyric || "&nbsp;") + '</span>'+ suffixSpaces;
          gotContent = true;
          //output += i < lle ? ' ' : '';
        }

      }
      output += gotContent && lineIndex < numLinesE ? '<br>' : '';
    });
    output += '</p>';
    if (gotContent) {
      arr.push(output);
      modulate = null;
    }
  })

  return arr.length ? arr : null;
}


/**
 * Parse gingko tree to a format similar to one in /src/mockdata.js
 * @param {Object} tree
 */
async function parseGingkoTree(tree) {
  var shows = [];
  let songIndex = 0;

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
    let songKeyLabel;
    let songKey;
    let origSongKeyLabel;
    let songCapo;
    let songMeta;
    let copyright;
    let gotCapo;

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

        let enclosed = false;
        if (content.slice(content.length - 3) === '```') {
          content = content.slice(0, content.length - 3);
          enclosed = true;
        }
        content = content.trim();

        let p = parserTag === 'cp' ? null : parserTag === 'ug' ? new CS.UltimateGuitarParser() : (enclosed ? new CS.ChordSheetParser() : null);
        /**
         * @type {import('chordsheetjs').Song}
         */
        let song = p === null ? parseChordProBody(content, true) : p.parse(content);
        let alreadyGotSongOutput = !!songOutput;
        songOutput = getSongOutput(song, alreadyGotSongOutput ? songOutput : slides[0], parserParams.indexOf('notranspose') >= 0, shows.length, songIndex);
        if (songOutput.songBitMetaData) {
          Object.assign(songMeta = songOutput.songBitMetaData, song.metadata);
        } else {
          songMeta = song.metadata;
        }
        if (!alreadyGotSongOutput) { // fresh first songOutput to process
          if (songOutput.songKeyLabelPrefered) {
            slides[0] += `<div class="songinfo-label key-signature" data-songid="${songIndex}">${songOutput.songKeyLabelPrefered}</div>`;
            songKeyLabel = songOutput.songKeyLabelPrefered;
            if (songKeyLabel) songOutput.origPreferedKeyChord = Chord.parse(songKeyLabel);
            songKey = songOutput.songKeyLabelPrefered;
            origSongKeyLabel =  songMeta.key ? songMeta.key : null;
          }
          if (songOutput.songCapoPrefered) {
            let resolvedKeySpan = songOutput.songKeyLabelPrefered ?  ` <span>${Chord.parse(songOutput.songKeyLabelPrefered).transpose(-songOutput.songCapoPrefered).toString()}</span>` : '';
            slides[0] += `<div class="songinfo-label capo" data-songid="${songIndex}">${songOutput.songCapoPrefered}${resolvedKeySpan}</div>`;
            songCapo = songOutput.songCapoPrefered;
            gotCapo = true;
          }
          if (songOutput.headerSlideAddedIntros) slides[0] += songOutput.headerSlideAddedIntros;
          if (songOutput.songHeaderTitle || songMeta.title || songMeta.copyright || songMeta.artist || (origSongKeyLabel && origSongKeyLabel!==songKeyLabel)) {
            copyright = (songMeta.title ? songMeta.title + (songOutput.songHeaderTitle && songOutput.songHeaderTitle !== songMeta.title ? '<br><i>['+songOutput.songHeaderTitle+']</i>' : '') +"<br>" :
            songOutput.songHeaderTitle ? songOutput.songHeaderTitle + "<br>" : "")
            + (songMeta.artist ? 'artist: '+songMeta.artist + "<br>" : "")
            + (origSongKeyLabel && origSongKeyLabel!==songKeyLabel ? '<em>original key: '+origSongKeyLabel + `<br>(&gt;<span class="songinfo-label key-signature" data-songid="${songIndex}">${songKeyLabel}</span>)<br></em>` : "")
            + (songMeta.copyright ? "&copy; " + songMeta.copyright : "")
          }
        } else {
          if (songOutput.songCapo) {
            gotCapo = true;
          }
        }

        if (songOutput.paragraphs) {
          if (parserParams.indexOf("join") < 0) {
            slides.push(...songOutput.paragraphs);
          } else {
            slides.push(songOutput.paragraphs.join(""));
          }
        }

        isSongMode = true;
      } else {
        content = await markDownParse(content);
        slides.push(content);
      }

    }

    let obj = {
      slides,
      origKey: origSongKeyLabel,
      key: songKey,
      capo: songCapo,
      meta: songMeta,
      copyright,
      gotCapo
    };
    shows.push(obj);
    songIndex++;
  }

  return shows;
}

module.exports = {
  parseGingkoTree,
  markDownParse,
  getSongOutput,
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