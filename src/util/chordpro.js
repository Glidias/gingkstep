/**
 * @type {import('chordsheetjs')}
 */
const CS = require('chordsheetjs').default;

/**
 * Monkey patch fix
 * @param {string} content
 * @param {boolean} [assertNoErr]
 */
function parseChordProBody(content, assertNoErr=false) {
    /**
     *  @type {import('chordsheetjs').Song}
     */
    let song = null;
    content = content.replace(/#/g, "h").replace(/\]\[/g, '] [');
    try {
        song = new CS.ChordProParser().parse(content);
    }
    catch(err) {
        if (assertNoErr) {
            throw err;
        } else {
            return null;
        }
    }
    if (song.metadata.key) {
        song.metadata.key = song.metadata.key.replace(/h/g, "#");
    }
    return song;
}

module.exports = {
    parseChordProBody
}