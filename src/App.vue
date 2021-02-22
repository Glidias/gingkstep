<template>
  <div id="app" :class="{'nashville': chordMode === Constants.CHORD_MODE_NASHVILLE, 'using-capo': useCapo, 'show-chords':showChords, 'show-overview':showOverview, 'is-guest': isGuest, 'attempting-connect':attemptingConnect}">
    <div v-if="slides && slides.length">
      <slides-overview @songFocusChange="onSongFocusChange" @goto="onGoto" :step-index="stepIndex" :slide-list="slides" v-if="showOverview" :faint-select="!isHost && !strongHighlight">
        <div class="traycontents">
          <div>
            <p><label><input type="checkbox" v-model="showChords">Show Chords?</label>
            <select v-show="showChords" v-model="chordMode" @keydown.stop="">
                <option :value="Constants.CHORD_MODE_LETTER">Letters</option>
                <option :value="Constants.CHORD_MODE_ROMAN">Roman</option>
                <option :value="Constants.CHORD_MODE_NASHVILLE">Nashville</option>
              </select>
             <label v-show="showChords" v-if="gotCapoMeta"><input type="checkbox" v-model="useCapo">Use Capo?</label>

            <span class="keyer" v-show="curDefKeyIndex >=0">Key:
              <select @change="onKeyDropdownChange($event)">
                <option v-for="(li, i) in keyOptions" :key="i" :value="i" :selected="i === curKeyIndex ? true : undefined">{{li}}</option>
              </select></span> <span v-show="curDefKeyIndex !== curKeyIndex && curDefKeyIndex>=0">{{keyOptions[curDefKeyIndex]}}</span></p>
            <p v-if="!isHost"><label><input type="checkbox" v-model="strongHighlight">Select Highlight</label></p>
          </div>
          <form @submit.prevent="hostSession">
            <p class="pin" v-if="sessionPin">Session Pin: <b>{{sessionPin}}</b></p>
            <button class="button reset" v-else type="submit">Host Session</button>
          </form>
        </div>
      </slides-overview>
      <slide-show @goto="onGoto" :step-index="stepIndex" :step-list="slidesFlattened" :slides-header-indices="slideHeaderIndices" v-if="!showOverview"></slide-show>
      <a id="hamburger" @click="showOverview = !showOverview"></a>
    </div>
    <div v-else style="padding:15px">
      <form @submit.prevent="onSubmitJoin($event)">
        <label>Join Room: <input type="text" name="roomid"></label>
        <button type="submit">Join</button>
      </form>
      <br>
      <form @submit.prevent="onSubmitLoad($event)">
        <label>Open Tree: <input type="text" name="treeid" v-model="formValueTreeId"></label>
        <button type="submit">Load</button>
      </form>
    </div>
  </div>
</template>

<script>
import SlidesOverview from "./components/SlidesOverview";
import SlideShow from "./components/SlideShow";
import axios from 'axios';
import {HOST_PREFIX} from './constants';
import {Chord} from './util/chord';

const CHORD_MODE_LETTER = 0;
const CHORD_MODE_ROMAN = 1;
const CHORD_MODE_NASHVILLE = 2;

function frozen(obj) {
  Object.freeze(obj);
  return obj;
}

export default {
  name: "App",
  components: {
    SlidesOverview, SlideShow
  },
  data () {
    return {
      Constants: frozen({
        CHORD_MODE_LETTER, CHORD_MODE_ROMAN, CHORD_MODE_NASHVILLE
      }),
      showOverview: true,
      showChords: false,
      sessionPin: '',
      attemptingConnect: false,
      isHost: false,
      strongHighlight: false,
      songFocusIndex: 0,
      useCapo: false, // ux: currently, this is simply a global setting for convention

      slides: null,

      formValueTreeId: 'g1zdt6',

      stepIndex: 0,
      chordMode: CHORD_MODE_LETTER,
    }
  },
  computed: {
    showChordLetters () {
      return this.chordMode === CHORD_MODE_LETTER;
    },
    gotCapoMeta () {
      let slides = this.slides;
       for (let i =0, l =slides.length; i<l; i++) {
        if (slides[i].capo) {
          return true;
        }
      }
      return false;
    },
    transposeSongKeys () {
      let slides = this.slides;
      if (!this.slides) return [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0];

      let usingCapo = this.useCapo;
      let keys = [];
      for (let i =0, l =slides.length; i<l; i++) {
        let song = slides[i];
        let transposeAmt = 0;
        let keyLabel = song.keyLabel ?song.keyLabel : null;
        if (usingCapo && keyLabel && song.capo) {
          transposeAmt = -song.capo;
        }
        keys[i] = transposeAmt;
      }
      return keys;
    },
    isGuest () {
      return !this.isHost && this.sessionPin;
    },
    keyOptions () {
      return ['C', 'C#', 'D', 'E', 'Eb', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    },
    curKeyIndex () {
      // based off this.songFocusIndex
      return -1;
    },
    curDefKeyIndex () {
      // based off this.songFocusIndex
      return -1;
    },
    slidesFlattened() {
      let arr = [];
      let slides = this.slides;
      for (let i =0; i<slides.length; i++) {
        arr.push(...slides[i].slides);
      }
      return arr;
    },
    slideHeaderIndices () {
      let obj = {};
      let slides = this.slides;
      let count = 0;
      for (let i =0; i<slides.length; i++) {
        obj[count] = true;
        count += slides[i].slides.length;
      }
      return obj;
    }
  },
  sockets: {
    connect: function () {
      console.log('socket connected: ' + this.$socket.id);
      this.attemptingConnect = false;
    },
    disconnect: function () {
      console.log('socket disconnected');
      this.sessionPin = '';
      this.isHost = false;
    },
    connect_error: function (err) {
      console.log('socket connect error');
       alert("Error with connection...");
    },

    hostingRoom (sessionPin) {
      this.attemptingConnect = false;
      this.sessionPin = sessionPin;
      this.isHost = true;
    },
    roomDoesntExist (id) {
      alert("Room doesn't exist: "+id);
      this.attemptingConnect = false;

    },
    slideChange(slideId) {
      if (!this.isHost && this.sessionPin) {
        this.stepIndex = parseInt(slideId);
      }
    },
    joinedRoom: async function(dataArr) { //sessionPin, treeD, keys
      let sessionPin = dataArr[0];
      let treeD = dataArr[1];
      let keys = dataArr[2];
      await this.loadTree(treeD);

      this.sessionPin = sessionPin;
      this.isHost = false;

      // check for modulations from keys and apply them
    },
  },
  methods: {
     async loadTree(treeD) {
       this.attemptingConnect = true;
        // attempt load treeD before
      try {
        const response = await axios.get(HOST_PREFIX + 'loadtree', {
          params: {
            s: treeD
          }
        });
        if (response.data.error) {
          console.log(response.data.error + ":: error code found.");
          alert(`Error code: ${response.data.error}, found.`);
        } else {
          this.slides = response.data.result;
        }
      }
      catch(err) {
        console.log(err);
        alert("Failed to load tree id: " + treeD);
      }
      this.attemptingConnect = false;
    },
    onSongFocusChange(songFocusIndex) {
      this.songFocusIndex = songFocusIndex;
    },
    handleNoLetterKeys() {
      let slides = this.slides;
      for (let i =0, l=slides.length; i < l; i++) {
        document.querySelectorAll(`.song[data-songid="${i}"]`).forEach((q)=>{
          if (!q.getAttribute('key')) return;
          q.setAttribute('keyx', q.getAttribute('key'));
          q.removeAttribute('key');
        });
      }
    },
    handleGotLetterKeys() {
      let slides = this.slides;
      for (let i =0, l=slides.length; i < l; i++) {
        document.querySelectorAll(`.song[data-songid="${i}"]`).forEach((q)=>{
          if (!q.hasAttribute('keyx')) return;
          q.setAttribute('key', q.getAttribute('keyx'));
          q.removeAttribute('keyx');
       });
      }
    },
    handleTranposeSongKeys(newArr, oldArr) {
      let slides = this.slides;
      for (let i =0, l=newArr.length; i < l; i++) {

        if (newArr[i] !== oldArr[i]) {
          let songPrepKey = slides[i].key;
          let songPrepKeyLabel = slides[i].keyLabel;


          // precompute songPrepKey tranposition

          // typical key tranpsition
          document.querySelectorAll(`.song[data-songid="${i}"]`).forEach((q)=>{
            let keyAttr = q.hasAttribute('key') ? 'key' : 'keyx';
            if (!q.hasAttribute(keyAttr)) return;

            if (!q.getAttribute('origkey')) {
              q.setAttribute('origkey', q.getAttribute(keyAttr));
            }
            // transpose from local origkey
            if (q.getAttribute('origkey') != songPrepKey) {
              // todo: calculate local tranposed section key

            } else { // use songPrepKey transposition precomputed
              q.setAttribute(keyAttr, songPrepKey);
            }

          });
          document.querySelectorAll(`.songinfo-label.key-signature[data-songid="${i}"]`).forEach((q)=>{});
          document.querySelectorAll(`.songinfo-label.capo[data-songid="${i}"] > span`).forEach((q)=>{});
        }
      }
    },
    onKeyDropdownChange(event) {
      // attempt modulation chosen key to server and wait for response back
      console.log(event.currentTarget.selectedIndex);

    },
    onGoto(index) {
      this.stepIndex = index;
      if (this.isHost && this.sessionPin) {
        this.$socket.emit('slide-change', index+'');
      }
    },
    async lazyEmit(event, data, data2) {
      this.attemptingConnect = true;
      if (!this.$socket.connected) {
        try {
          let b = await this.$socket.connect();
          // console.log(b);
        }
        catch(err) {
          console.log(err);
          return;
        }
      }
      this.$socket.emit(event, data, data2);
    },
    onSubmitJoin (e) {
      if (!e.currentTarget.roomid.value) return;
      this.lazyEmit('join-room', e.currentTarget.roomid.value);
    },
     onSubmitLoad (e) {
      if (!e.currentTarget.treeid.value) {
        return;
      }
      this.loadTree(e.currentTarget.treeid.value);
    },
    hostSession () {
      this.lazyEmit('host-room', this.formValueTreeId);
    }
  },
  watch: {
    showChords () {
      window.dispatchEvent(new Event('resize'));
    },
    showChordLetters(newVal) {
      if (newVal) {
        this.handleGotLetterKeys();
      } else {
        this.handleNoLetterKeys();
      }
    },
    transposeSongKeys(newArr, oldArr) {
      this.handleTranposeSongKeys(newArr, oldArr);
    }
  },
  mounted () {

  },
};
</script>

<style lang="scss">
@import "~@splidejs/splide/dist/css/themes/splide-default.min.css";

body {
  padding: 0;
  margin: 0;
  overflow:hidden;
  touch-action: none;
  user-select: none;

  width:100%;
  height:100%;

  background-color: black;
  color:white;
}

#impress {
  .introsong {
    .is-guest & {
      visibility: hidden;
    }
  }
}


#app {
  font-family: Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  .hidden-vis {
    opacity:0;
    pointer-events:none;
    touch-action:none;
  }
   &.attempting-connect {
    form {
      opacity:.5;
      pointer-events:none;
      touch-action: none;
    }
  }

  button.reset {
    background: none;
    color: inherit;
    border: none;
    padding: 0;
    font: inherit;
    cursor: pointer;
    outline: inherit;

    &:focus, &:active {
      outline:none;
      border:none;
    }
  }

  .traycontents {
    text-align:center; margin:0 auto 0 auto;

  }
  .keyer {
    font-style: italic;
  }


  .pin {
    font-size:13px;
    b {
      user-select: auto;
      font-size:1.8em;
    }
  }

  button.button {
    $btnColor: #3e68ff;


    // Display
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: start; // Optional - see "Gotchas"

    // Visual
    background-color: $btnColor;
    color: #fff;
    border-radius: 8px;
    box-shadow: 0 3px 5px rgba(0, 0, 0, 0.18);

    // Size
    padding: 0.15em 0.85em;
    min-width: 10ch;
    min-height: 44px;

    // Text
    text-align: center;
    line-height: 1.1;

    transition: 220ms all ease-in-out;

    //&:hover,
    &:active {
      background-color: scale-color($btnColor, $lightness: -20%);
    }


    &:focus {
      outline-style: solid;
      outline-color: transparent;
      box-shadow: 0 0 0 4px scale-color($btnColor, $lightness: -40%);
    }

    &--small {
      font-size: 1.15rem;
    }

    &--block {
      width: 100%;
    }
  }
}



.song {
  >br + br {
    display:none;
  }
  >i + br {
    display:none;
  }
  line-height:1.4em;
 font-size:0.9em;
}

///*
.song {
  em {
    font-weight:normal;
    text-decoration:none;
    text-transform:none;
    font-style:normal;
    >* {
      font-weight:inherit;
      text-decoration:inherit;
      text-transform:inherit;
      font-style:inherit;
    }
    &.alt {
      display:none !important;
    }
  }
}
//*/


  #hamburger {
        position:fixed;top:0;right:0;width:60px; height:60px;
        //background-color:#00FF00;
        border-top:1px solid #222222;
        border-right:1px solid #222222;
        box-sizing: border-box;
        cursor:pointer;
        z-index:2;
        display:block;

        .show-overview & {
          width:40px;
          height:40px;
        }
        &:active {
         border-color:#00FF00;
        }
      }
  #hamburger.admin-connected {
    &:active {
      border-color:#FF0000;
    }
  }
  #hamburger.admin-connected.you-are-admin {
    &:active {
      border-color:#AF4400;
    }
  }

 .song  {
   > i {
     display:none;
   }
   > div {
     display:none;
   }

   em {
     display:none;
   }
  }



/*
.song > span del {
  display:none;
  text-decoration:none;
}
*/

div.songinfo-label {
  display:none;

  line-height:1.2;
  font-size:0.8em;
  &.key-signature {
    &:before {
      content: "Key: ";
    }
  }
  &.capo {
    &:before {
      content: "Capo: ";
    }
    > span {
      display:none;
      &:before {
        content:"(key: ";
      }
      &:after {
        content:")";
      }
    }
    text-decoration: line-through;
    .using-capo & {
       text-decoration: underline;
       > span {
         display:inline;
       }
    }
  }
}


.show-chords {
  .song {

    line-height:2.3em !important;
    //
    >* {
        vertical-align:bottom;
    }

    >i {
      display:block;
      line-height:1.3;
    }
  }

  div.songinfo-label {
    display:block;
  }

  .song em {
    display:inline;
    position:relative;
    > i {
      color:yellow;
    }
  }

  .song em>* {
    font-size:0.75em;
     letter-spacing:1px;
    font-weight:bold;
  }
  .song>em>*{
    position:absolute;
    top:-2.1em;
    display:block;

    left:0;
  }
  .song em>i>sup:after {
    content: attr(e);
  }


  .song >span {
    display:inline-flex;
    flex-direction:column;
    align-items:flex-start;
    justify-content: flex-end;
    line-height:1.6;
    /*
    del {
      display:inline;
    }
    */

    /*
    ins:before {
      content: ' ';
    }
    */
    >* {
      line-height:1;
    }
    >em {
      margin-right:0.65em;
    }
    /*
    &.spaced {
      margin-right:0.5em;
    }
    */
  }


}
</style>
