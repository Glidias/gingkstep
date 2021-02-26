<template>
  <div id="app" :class="{'nashville': chordMode === Constants.CHORD_MODE_NASHVILLE, 'using-capo': useCapo, 'show-chords':showChords, 'show-overview':showOverview, 'is-host':isHost, 'is-guest': isGuest, 'attempting-connect':attemptingConnect}">
    <div v-if="slides && slides.length">
      <slides-overview @songFocusChange="onSongFocusChange" @goto="onGoto" :step-index="stepIndex" :slide-list="slides" v-if="showOverview" :faint-select="!isHost && !strongHighlight">
        <div class="traycontents">
          <div>
             <label><input type="checkbox" v-model="showChords" @keydown.stop>Show Chords?</label>
            <select v-show="showChords" v-model="chordMode" @keydown.stop="">
                <option :value="Constants.CHORD_MODE_LETTER">Letters</option>
                <option :value="Constants.CHORD_MODE_ROMAN">Roman</option>
                <option :value="Constants.CHORD_MODE_NASHVILLE">Nashville</option>
              </select>

             <label v-show="showChords" v-if="gotCapoMeta"><input type="checkbox" v-model="useCapo">Use Capo?</label>

              <div v-show="curDefKeyIndex >=0 && showChords" style="margin-top:10px;">
                <span class="keyer">Key:
                  <select @change="onKeyDropdownChange($event)" @keydown.stop>
                    <option v-for="(li, i) in keyOptions" :key="i" :value="li" :selected="li === curKeyLabel ? true : undefined">{{li}}</option>
                  </select>
                </span>
                <span v-if="curDefKey" v-show="curKeyLabelPrefered !== curDefKey">{{curDefKey}}</span>
                 <input type="radio" id="radioflat" :value="false" v-model="preferSharp" @keydown.stop>
                  <label for="radioflat">b</label>
                  <input type="radio" id="radiosharp" :value="true" v-model="preferSharp" @keydown.stop>
                  <label for="radiosharp">#</label>
              </div>

            <p v-if="!isHost"><label><input type="checkbox" v-model="strongHighlight">Select Highlight</label></p>
          </div>
          <form @submit.prevent="hostSession">
            <p class="pin" v-if="sessionPin"><span :style="{textDecoration:isHost ? 'underline' : 'none'}">Session Pin</span>: <b>{{sessionPin}}</b></p>
            <button class="button reset" v-else type="submit">Host Session</button>
          </form>
        </div>
      </slides-overview>
      <slide-show @goto="onGoto" :step-index="stepIndex" :step-list="slidesFlattened" :slides-header-indices="slideHeaderIndices" v-if="!showOverview"></slide-show>
      <a id="hamburger" @click="showOverview = !showOverview"></a>
    </div>
    <div v-else style="padding:15px" class="startscrn">
      <form @submit.prevent="onSubmitJoin($event)">
        <label>Join Room: <input type="text" name="roomid"></label>
        <button type="submit">Join</button>
      </form>
      <br>
      <form @submit.prevent="onSubmitLoad($event)">
        <label>Open Tree: <input type="text" name="treeid" v-model="formValueTreeId"></label>
        <button type="submit">Load</button>
      </form>
      <hr>
      <h1>GingkStep</h1>
      <p>A song lyrics/chords/transposer/page-turner/slideshow/presentation viewer utility for offline and online synced sessions across device displays</p>
      <p>WIKI For more info: [<a href="https://github.com/Glidias/gingkstep/wiki" target="_blank">link</a>]</p>
      <p><a href="https://github.com/Glidias/gingkstep/wiki/Gingkstep-Usage" target="_blank">Frontend usage guide</a></p>
    </div>
  </div>
</template>

<script>
import SlidesOverview from "./components/SlidesOverview";
import SlideShow from "./components/SlideShow";
import axios from 'axios';
import {BUS} from './components/mixins/hotkeys';
import {HOST_PREFIX} from './constants';
import {Chord} from './util/chord';
import {PIANO_KEYS_12_FLAT, PIANO_KEYS_12_SHARP} from './util/keys';
const PIANO_KEYS_12_SHARP_MINOR = PIANO_KEYS_12_SHARP.map(v => v+'m');
const PIANO_KEYS_12_FLAT_MINOR = PIANO_KEYS_12_FLAT.map(v => v+'m');

const CHORD_MODE_LETTER = 0;
const CHORD_MODE_ROMAN = 1;
const CHORD_MODE_NASHVILLE = 2;
const Constants = frozen({
    CHORD_MODE_LETTER, CHORD_MODE_ROMAN, CHORD_MODE_NASHVILLE
});

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
    let urlParams = new URLSearchParams(window.location.search);
    return {
      Constants,
      showOverview: true,
      showChords: false,
      sessionPin: '',
      attemptingConnect: false,
      isHost: false,
      strongHighlight: false,
      songFocusIndex: 0,
      useCapo: false, // ux: currently, this is simply a global setting for convention

      slides: null,

      // consider: is there a need for a 3-property data set to syncronise?
      slideActiveKeys: [], // [string] // Immutable: currently activated main key signatures for songs
      slideKeyIndices: [], // [int] // Mutable: selected halfstep index per song
      preferSharp: false, // whether to prefer enharmonically use sharp instead of flats

      formValueTreeId: urlParams.has('s') ? urlParams.get('s') : 'g1zdt6',

      stepIndex: 0,
      chordMode: CHORD_MODE_LETTER,
    }
  },
  computed: {
    showChordLetters () {
      return this.chordMode === CHORD_MODE_LETTER;
    },
    gotCapoMeta () {
      let slides = this.slides || [];
       for (let i =0, l =slides.length; i<l; i++) {
        if (slides[i].gotCapo) {
          return true;
        }
      }
      return false;
    },
    isGuest () {
      return !this.isHost && this.sessionPin;
    },
    keyOptions () {
      const fi = this.songFocusIndex;
      let isMinor = this.defKeyMinors[fi];
      let preferSharp = this.preferSharp;
      return !preferSharp ? isMinor ? PIANO_KEYS_12_FLAT_MINOR : PIANO_KEYS_12_FLAT
                          : isMinor ? PIANO_KEYS_12_SHARP_MINOR : PIANO_KEYS_12_SHARP;
    },
    defaultKeyChords () {
      let arr = [];
      let slides = this.slides;
      if (!slides) return [];
      for (let i =0; i<slides.length; i++) {
        let k = slides[i].key;
        let ch = k ? Chord.parse(k) : null;
        arr.push(ch);
      }
      return arr;
    },
    curKeyLabel() {
      return this.slideActiveKeys[this.songFocusIndex];
    },
    curKeyLabelPrefered() {
      return this.keyOptions[this.curKeyIndex];
    },
    curKeyIndex () {
      const fi = this.songFocusIndex;
      const indices = this.slideKeyIndices;
      return indices[fi] != null ? indices[fi] : -1;
    },
    defKeyIndices() {
      return this.getDefaultKeyIndices();
    },
    defKeyMinors() {
     return this.defaultKeyChords.map((c)=> {
        return c ? c.isMinor : false;
      });
    },
    defKeyAccidentals() {
      return this.defaultKeyChords.map((c)=> {
        return c ? c.getSharpFlatDelta() : 0;
      });
    },
    curDefKeyIndex () {
      const fi = this.songFocusIndex;
      const indices = this.defKeyIndices;
      return indices[fi] != null ? indices[fi] : -1;
    },
    curDefKey() {
      const fi = this.songFocusIndex;
      const chords = this.defaultKeyChords;
      return chords[fi] != null ? chords[fi].toString() : null;
    },
    slidesFlattened() {
      let arr = [];
      let slides = this.slides || [];
      for (let i =0; i<slides.length; i++) {
        let cSlide = slides[i];
        let pLen = cSlide.slides.length;
        for (let p = 0; p< pLen; p++) {
          arr.push(cSlide.slides[p]);
        }
      }
      return arr;
    },
    slideHeaderIndices () {
      let obj = {};
      let slides = this.slides || [];
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
    joinedRoom: async function(dataArr) { //sessionPin, treeD //, keys
      let sessionPin = dataArr[0];
      let treeD = dataArr[1];
      let keys = dataArr[2];
      await this.loadTree(treeD);

      this.sessionPin = sessionPin;
      this.isHost = false;


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
          this.setSlides(response.data.result);
        }
      }
      catch(err) {
        console.log(err);
        alert("Failed to load tree id: " + treeD);
      }
      this.attemptingConnect = false;
    },
    onPopState (event) {
      if (event.state === null) {
        this.resetDataModel();
      } else {
        if (event.state.s) {
          if (this._lastHistoryState && this._lastHistoryState.s === event.state.s && this._lastState && this._lastState.formValueTreeId === event.state.s) {
            Object.assign(this.$data, this._lastState);
            //this.setSlides(this._lastState.slides);
          } else {
            this.formValueTreeId = event.state.s;
          }
        }
      }
    },
    onHotkeyTriggered(ev) {
      var si;
      switch(ev) {
        case "prevStep":
        case "nextStep":
          si = this.stepIndex;
           if (ev === "prevStep") {
             if (si -1 >= 0) {
               si--;
               this.stepIndex = si;

             }
           } else {
             if (si + 1 < this.slidesFlattened.length) {
               si++;
               this.stepIndex = si;
             }
           }
        break;
      }
    },
    getDefaultKeyIndices() {
      let arr = [];
      let keyChords = this.defaultKeyChords;
      for (let i =0; i<keyChords.length; i++) {
        let ch = keyChords[i];
        arr.push(ch ? (ch.getTrebleVal()%12) : -1);
      }
      return arr;
    },
    getKeyIndexForSongIndex(fi) {
      const indices = this.slideKeyIndices;
      return indices[fi] != null ? indices[fi] : -1;
    },
    setSlides(slides) {
      this.slides = slides;
      this.slideKeyIndices = this.getDefaultKeyIndices();
      this.slideActiveKeys = this.defaultKeyChords.map((c)=>{return c ? c.toString() : null})
      this.refreshPreferSharp();
    },
    onSongFocusChange(songFocusIndex) {
      this.songFocusIndex = songFocusIndex;
      this.refreshPreferSharp();
    },
    handleNoLetterKeys() {
      let slides = this.slides || [];
      for (let i =0, l=slides.length; i < l; i++) {
        document.querySelectorAll(`.song[data-songid="${i}"]`).forEach((q)=>{
          if (!q.getAttribute('key')) return;
          q.setAttribute('keyx', q.getAttribute('key'));
          q.removeAttribute('key');
        });
        let curSlide = slides[i];
        let len = curSlide.slides.length;
        for (let s = 0; s<len; s++) {
          curSlide.slides[s] = document.getElementById(`splideh_${i}_${s}`).innerHTML;
        }
      }
    },
    handleGotLetterKeys() {
      let slides = this.slides || [];
      for (let i =0, l=slides.length; i < l; i++) {
        document.querySelectorAll(`.song[data-songid="${i}"]`).forEach((q)=>{
          if (!q.hasAttribute('keyx')) return;
          q.setAttribute('key', q.getAttribute('keyx'));
          q.removeAttribute('keyx');
       });
        let curSlide = slides[i];
        let len = curSlide.slides.length;
        for (let s = 0; s<len; s++) {
          curSlide.slides[s] = document.getElementById(`splideh_${i}_${s}`).innerHTML;
        }
      }
    },
    onKeyDropdownChange(event) {
      // consider: attempt modulation chosen key to server and wait for response back?
      this.$set(this.slideKeyIndices, this.songFocusIndex, event.currentTarget.selectedIndex);
    },
    handleTranposeSongKeys(newArr, oldArr, capoInvalidated) {
      // rather hackish block here
      if (!document.getElementById('splideh_0_0')) return;

      let slides = this.slides;

      if (!slides || newArr.length !== oldArr.length) return;
      let l = newArr.length;
      let useCapo = this.useCapo;
      for (let i =0; i < l; i++) {


        if ( (oldArr[i] && newArr[i] && newArr[i] !== oldArr[i]) || (capoInvalidated && slides[i].gotCapo) ) {
          let songPrepKey = newArr[i];

          let lastKey = songPrepKey;
          let songCapo = 0;
          let capoKey = null;

          if (useCapo && slides[i].capo) {
            songCapo = slides[i].capo;
            capoKey = Chord.parse(songPrepKey).transpose(-songCapo).toString();

          }
          if (slides[i].capo) {
            document.querySelectorAll(`.songinfo-label.capo[data-songid="${i}"] > span`).forEach((q)=>{
              q.innerHTML = capoKey || Chord.parse(songPrepKey).transpose(-slides[i].capo).toString();
            });
          }
          document.querySelectorAll(`.songinfo-label.key-signature[data-songid="${i}"]`).forEach((q)=>{
            q.innerHTML = songPrepKey;
          });

          // typical key tranpsition
          document.querySelectorAll(`.song[data-songid="${i}"]`).forEach((q, key)=>{
            let chordStr;
            let keyAttr = q.hasAttribute('key') ? 'key' : 'keyx';
            if (!q.hasAttribute(keyAttr)) return;

            let isIntro = false;
            if (q.hasAttribute('modulate')) { // Modulation
              let m = q.hasAttribute('m') ? q.getAttribute('m') : null;
              let mm = q.getAttribute('mm') ? q.getAttribute('mm') : null;
              if (m === null && mm == null) { // assumed modulate back to orignal key
                let capoKeyToUse = useCapo && q.hasAttribute('capo') ? Chord.parse(lastKey).transpose(-parseInt(q.getAttribute('capo'))).toString() :  capoKey;
                q.setAttribute(keyAttr, (capoKeyToUse || songPrepKey).replace("#", 'h'));
                q.setAttribute('modulate', lastKey+' to '+songPrepKey + (capoKeyToUse ? ` (${capoKeyToUse}:` : '')); // consider capo usage
                chordStr = songPrepKey;
              } else {
                isIntro = q.hasAttribute('intro');
                let chord = Chord.parse(!isIntro ? lastKey : songPrepKey);
                if (m !== null) {
                  chord = chord.transpose(parseInt(m));
                }
                if (mm !== null) {
                  chord = chord.getParallelChord();
                }
                chordStr = chord.toString();

                let capoChordStr = useCapo && q.hasAttribute('capo') ? chord.transpose(-parseInt(q.getAttribute('capo'))).toString() : songCapo ? chord.transpose(-songCapo).toString() : null;
                q.setAttribute(keyAttr, (capoChordStr || chordStr).replace("#", 'h'));
                if (!isIntro) q.setAttribute('modulate', lastKey + ' to '+chordStr + (capoChordStr ? ` (${capoChordStr}:`: ''));
                else q.setAttribute('modulate', 'alt key: '+chordStr + (capoChordStr ? ` (${capoChordStr}:`: ''));
              }
            } else { // use lastKey no modulation
              let capoKeyToUse = useCapo && q.hasAttribute('capo') ? Chord.parse(lastKey).transpose(-parseInt(q.getAttribute('capo'))).toString() :  capoKey;
              q.setAttribute(keyAttr, (capoKeyToUse || lastKey).replace("#", 'h'));
              chordStr = songPrepKey;
            }
            if (!isIntro) lastKey = chordStr;
          });

          let curSlide = slides[i];
          let len = curSlide.slides.length;
          for (let s = 0; s<len; s++) {
           curSlide.slides[s] = document.getElementById(`splideh_${i}_${s}`).innerHTML;
          }
          curSlide.copyright = document.getElementById(`splideh_${i}-copyright`).innerHTML;

          //splideh_s_i-copyright


        }
      }
    },
    refreshKeys() {
      // consider: attempt modulation chosen key to server and wait for response back

      let c;
      this.slideActiveKeys = c = this.slideActiveKeys.concat();
      c[this.songFocusIndex] = this.keyOptions[this.curKeyIndex];
    },
    onGoto(index) {
      this.stepIndex = index;
      if (this.isHost && this.sessionPin) {
        this.$socket.emit('slide-change', index+'');
      }
    },
    refreshPreferSharp() {
      let curKeyLabel = this.curKeyLabel;
      if (!curKeyLabel) return;
      let c = Chord.parse(curKeyLabel).getSharpFlatDelta();
      if (c!==0) this.preferSharp = c > 0;
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
    resetDataModel() {
      let slides = this.slides;
     // Object.assign(this._lastState={}, this.$data);
     this._lastState={
       slides:this.slides,
       formValueTreeId: this.formValueTreeId,
     }
     this.slides = null;
      /*
      this._lastState=getDataModel();

      this._lastState.formValueTreeId = this.formValueTreeId;
      this._lastState.slides = slides;
      */
     // Object.assign(this.$data, getDataModel());
    },
    onSubmitJoin (e) {
      if (!e.currentTarget.roomid.value) return;
      this.lazyEmit('join-room', e.currentTarget.roomid.value);
    },
     async onSubmitLoad () { //e

      let toLoad = this.formValueTreeId; //e.currentTarget.treeid.value;
      if (!toLoad) {
        return;
      }
      await this.loadTree(toLoad);


      if (this.slides) {
        /*
        if (!history.state) {
          history.pushState(this._lastHistoryState = {s:toLoad}, "", "?s="+toLoad);
        } else {
          history.replaceState(this._lastHistoryState = {s:toLoad}, "", "?s="+toLoad);
        }
        */
        //window.addEventListener('popstate', this.onPopState.bind(this));
        history.replaceState(toLoad, "", "?s="+toLoad);
      }

    },
    hostSession () {
      this.lazyEmit('host-room', this.formValueTreeId);
    }
  },
  watch: {
    showChords () {
      window.dispatchEvent(new Event('resize'));
    },
    showChordLetters(newVal, oldVal) {
      if (newVal) {
        this.handleGotLetterKeys();
      } else {
        this.handleNoLetterKeys();
      }
    },
    slideActiveKeys(newArr, oldArr) {
      this.handleTranposeSongKeys(newArr, oldArr);
    },
    curKeyLabelPrefered(newVal) {
      this.refreshKeys();
    },
    useCapo () {
      this.handleTranposeSongKeys(this.slideActiveKeys, this.slideActiveKeys, true);
    }
  },
  mounted () {
     let urlParams = new URLSearchParams(window.location.search);
     if (urlParams.has('autoload') && urlParams.has('s') && urlParams.get('s')) {
       if (this.formValueTreeId) this.onSubmitLoad();
     }
     BUS.$on('hotkeyTriggered', this.onHotkeyTriggered.bind(this));
  },
};
</script>

<style lang="scss">
@import "~@splidejs/splide/dist/css/themes/splide-default.min.css";
//@import url('https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap');
//@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:ital,wght@0,400;0,700;1,400&family=Open+Sans:wght@400;600&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Work+Sans:ital,wght@0,300;0,400;0,500;1,300;1,400&display=swap');
body {


  padding: 0;
  margin: 0;
  overflow:hidden;
  touch-action: none;

  user-select: none;

  width:100%;
  height:100%;

  font-family: 'Open Sans', 'Work Sans', sans-serif;
 // font-weight:bold;

  background-color:  #1c1c20;

  color:#aaccff;
}


  a {
    color:rgb(206, 194, 206);
  }

#impress {
  .introsong {
    .is-guest & {
      visibility: hidden;
    }
  }
}


#app {

  .dummy-cb {
    background-color: #1c1c20;
  opacity:.15;
    &:focus {
      outline:rgb(100, 100, 48) 2px solid;
    }
  }
  .startscrn {
    //font-size:14px;
    form {

      input {
        max-width:130px;
      }
    }
  }

///*
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
//*/
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
      //font-size:inherit;
    }

    /*
    &.is-host {
      .pin b {
        font-size:1.8em;
      }
    }
    */
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

  &.using-capo {
    .song > .capo-change {
      display:inline;
    }
  }


  .song {

    line-height:2.3em !important;
    //
    >* {
        vertical-align:bottom;
    }

    >i {
      display:block;
      line-height:1.3;
      color:#a3a3a3;
      font-weight:400;
      font-size:0.95em;
    }

    >.capo-change {
      display:none;

      font-size:0.8em;
      //text-decoration:italic;
    }

    &:before {
      content: attr(modulate);
      font-style:italic;
      display:block;
      color:#888888;
      font-size:0.8em;
    }
  }

  div.songinfo-label {
    display:block;
  }

  .song em {
    display:inline;
    position:relative;
    > i {
      color:#d8b236;
      //color:yellow;
    }
  }

  .song em>* {
    font-size:0.75em;
     letter-spacing:1px;
    font-weight:500;
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
