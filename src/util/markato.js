/*
 * decaffeinate suggestions:
 * DS102: Remove unnecessary code created because of implicit returns
 * DS207: Consider shorter variations of null checks
 * Full docs: https://github.com/decaffeinate/decaffeinate/blob/master/docs/suggestions.md
 */

// https://github.com/jsrmath/markato
// parser.coffee - Julian Rosenblum
// Parses Markato files into Markato object

const _ = require("underscore");
const S = require("string");

const isChordLine = (line) => S(line).startsWith(":");

const parseFooterStartLine = function (state, line) {
  state.current.footer = true;
  return state;
};

const parseMetaLine = function (state, line) {
  const metaLine = S(line).chompLeft("##").s;

  if (metaLine[0] !== " ") {
    // The `##KEY` case as opposed to the `## comment` case
    const metaName = metaLine.split(" ")[0];
    const metaValue = S(metaLine).chompLeft(metaName).trim().s;
    state.meta[metaName] = metaValue;
  }

  return state;
};

const parseFooterLine = function (state, line) {
  const parts = S(line).strip(" ").split("=>");

  if (parts.length === 2) {
    const chord = parts[0];
    const alts = parts[1].split(",");
    state.alts[chord] = alts;
  }

  return state;
};

const addSection = function (state, sectionName) {
  // It's a new section if we don't already have it on the list
  const firstTime = !_.contains(state.sections, sectionName);

  state.sections.push(sectionName);
  const content = {
    section: sectionName,
    firstTime,
    lines: []
  };

  state.content.push(content);

  if (firstTime) {
    state.chords[sectionName] = [];
  }

  state.current.lastLine = null; // We're in a new section, so forget last lyric/chord line
  return state;
};

const parseSectionLine = (state, line) =>
  addSection(state, S(line.slice(1)).trim().s);

const parseLyricChordLine = function (state, line) {
  const { lastLine } = state.current;

  // If we're not in a section, create one called untitled
  if (!state.sections.length) {
    state = addSection(state, "UNTITLED");
  }

  // If we have a chord line
  if (isChordLine(line)) {
    _.last(state.content).lines.push({
      chords: S(line.slice(1)).trim().s.split(" "),
      lyrics: ""
    });

    // If we have a lyric line
  } else {
    // If last line is a chord line, add lyrics to it
    if (lastLine && !lastLine.lyrics) {
      lastLine.lyrics = line;

      // Otherwise, we have a solitary line of lyrics
    } else {
      _.last(state.content).lines.push({
        chords: [],
        lyrics: line
      });
    }
  }

  state.current.lastLine = _.last(_.last(state.content).lines);
  return state;
};

// Given a parse state, parses a line of Markato and returns updated state
const parseLine = function (state, line) {
  // Remove extraneous whitespace
  line = S(line).trim().collapseWhitespace().s;

  if (!line) {
    return state;
  }

  if (S(line).startsWith("###")) {
    return parseFooterStartLine(state, line);
  }

  if (S(line).startsWith("##")) {
    return parseMetaLine(state, line);
  }

  if (S(line).startsWith("#")) {
    return parseSectionLine(state, line);
  }

  if (state.current.footer) {
    return parseFooterLine(state, line);
  }

  return parseLyricChordLine(state, line);
};

const interpretLyricChordLine = function (state, section, lineObj, lineNum) {
  const sectionName = section.section;
  let { lyrics, chords } = lineObj;
  const phrases = [];

  const addPhrase = (obj) =>
    phrases.push(
      _.defaults(obj, {
        lyric: "",
        chord: "",
        exception: false,
        wordExtension: false
      })
    );

  // If this is a new section, add the chords to that section
  if (section.firstTime) {
    state.chords[sectionName].push(chords);
  }

  // Get the chords stored for the section
  const sectionChords = state.chords[sectionName][lineNum];

  const caretSplit = lyrics.split("^"); // Used to figure out phrases
  let chordIndex = 0; // Index in list of chords as we assemble phrases
  const exceptionIndices = []; // Chord indices that are exceptions in this section

  // If there is no above line of chords, use the section chords
  if (!chords.length) {
    chords = sectionChords != null ? sectionChords : [];

    // Otherwise, substitute * from chords where necessary
  } else {
    chords = _.map(chords, function (chord, index) {
      // For *, get the chord at the same index from the chord list
      if (chord === "*") {
        return sectionChords[index];
      } else {
        exceptionIndices.push(index);
        return chord;
      }
    });
  }

  // If there are no lyrics, just add a line of chords
  if (!lyrics) {
    _.each(chords, (chord, index) =>
      addPhrase({
        chord,
        exception: _.contains(exceptionIndices, index)
      })
    );

    // Otherwise, add lyrics based on carets
  } else {
    _.each(caretSplit, function (phrase, index) {
      // Special case first phrase
      if (index === 0) {
        if (phrase) {
          addPhrase({ lyric: caretSplit[0] });
        }
        return;
      }

      const lastPhrase = caretSplit[index - 1];

      // Get next chord
      const chord = chords[chordIndex];

      // 'foo ^ bar' case, we insert the chord with a blank lyric
      if (phrase != null && phrase[0] === " ") {
        addPhrase({
          chord,
          exception: _.contains(exceptionIndices, chordIndex)
        });

        addPhrase({ lyric: S(phrase).trim().s });
      } else {
        addPhrase({
          lyric: S(phrase).trim().s,
          chord,
          exception: _.contains(exceptionIndices, chordIndex)
        });
      }

      // Check for foo^bar case (doesn't start with space and last phrase doesn't end with one)
      if (
        phrase &&
        lastPhrase &&
        phrase[0] !== " " &&
        S(lastPhrase).right(1).s !== " "
      ) {
        _.last(phrases).wordExtension = true;
      }

      return (chordIndex += 1);
    });
  }

  return phrases;
};

// Given a parse state, interpret the lyric/chord lines
const interpretLyricSection = function (state, section) {
  section.lines = _.map(
    section.lines,
    _.partial(interpretLyricChordLine, state, section)
  );

  // If this is an empty section, retrieve the lyrics/chords from the first instance of that section
  if (!section.lines.length) {
    section.lines = _.findWhere(state.content, {
      section: section.section
    }).lines.concat();

    // None of the phrases are exceptions since we're copying them
    // We also have to clone the phrase objects so that we don't overwrite the other versions
    section.lines = _.map(section.lines, (line) =>
      _.map(line, (phrase) => _.extend(_.clone(phrase), { exception: false }))
    );
  }

  return section;
};

// Given a finished parse state, return a markato object
const markatoObjectFromState = function (state) {
  let chordId, lineId, lyricId, phraseId;
  state = _.omit(state, "current");

  // Add ids for sections, lines, and phrases
  let sectionId = (lineId = phraseId = lyricId = chordId = 0);
  _.each(state.content, function (section) {
    section.sectionId = sectionId++;
    return _.each(section.lines, function (line) {
      line.lineId = lineId++;
      return _.each(line, function (phrase) {
        phrase.phraseId = phraseId++;
        if (phrase.chord) {
          phrase.chordId = chordId++;
        }
        if (phrase.lyric) {
          return (phrase.lyricId = lyricId++);
        }
      });
    });
  });

  state.count = {
    sections: sectionId,
    lines: lineId,
    phrases: phraseId,
    lyrics: lyricId,
    chords: chordId
  };

  return state;
};

// Parses a string of Markato and returns a Markato object
const parseString = function (str) {
  const lines = S(str).lines();

  let parseState = {
    current: {
      footer: false, // Are we in the footer?
      lastLine: null
    }, // Previous lyric/chord line in this section
    meta: {},
    alts: {},
    sections: [],
    chords: {},
    content: []
  };

  // Run parser
  parseState = _.reduce(lines, parseLine, parseState);

  // Interpret lyric/chord lines
  parseState.content = _.map(
    parseState.content,
    _.partial(interpretLyricSection, parseState)
  );

  return markatoObjectFromState(parseState);
};

module.exports = {
  // In the ideally non-existent case that the parser throws an error, still return a Markato object
  parseString(str) {
    try {
      return parseString(str);
    } catch (err) {
      const errObject = parseString(
        "#Error\nYour Markato input could not be parsed."
      );
      errObject.err = err;
      return errObject;
    }
  }
};
