<template>
  <div id="app" :class="{'show-chords':showChords, 'show-overview':showOverview}">
    <div id="attempting-connection" v-show="attemptingConnect">Attempting connection...</div>
    <slide-show :step-list="slidesFlattened" v-if="!showOverview"></slide-show>
    <slides-overview :slide-list="slides" v-if="showOverview">
      <div class="traycontents">
        <div>
          <p><label><input type="checkbox" v-model="showChords">Show Chords?</label> <span class="keyer" v-show="curDefKeyIndex >=0">Key: <select><option v-for="(li, i) in keyOptions" :key="i" :value="i" :selected="i === curKeyIndex ? true : undefined">{{li}}</option></select></span> <span v-show="curDefKeyIndex !== i && curDefKeyIndex>=0">{{curDefKeyIndex}}</span></p>
        </div>
        <div>
          <p class="pin" v-if="sessionPin">Session Pin: <b>{{sessionPin}}</b></p>
          <div class="button" v-else type="submit">Host Session</div>
        </div>
      </div>
    </slides-overview>
    <a id="hamburger" @click="showOverview = !showOverview"></a>
  </div>
</template>

<script>
import SlidesOverview from "./components/SlidesOverview";
import SlideShow from "./components/SlideShow";
import mockData from '././model/mockdata';

export default {
  name: "App",
  components: {
    SlidesOverview, SlideShow
  },
  data () {
    return {
      showOverview: true,
      showChords: false,
      sessionPin: '',
      attemptingConnect: false
    }
  },
  computed: {
    slides () {
      return mockData;
    },
    keyOptions () {
      return ['C', 'C#', 'D', 'E', 'Eb', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
    },
    curKeyIndex () {
      return -1;
    },
    curDefKeyIndex () {
      return -1;
    },
    slidesFlattened() {
      let arr = [];
      for (let i =0; i<mockData.length; i++) {
        arr.push(...mockData[i].slides);
      }
      return arr;
    }
  },
  watch: {
    showChords () {
      window.dispatchEvent(new Event('resize'));
    }
  }
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


#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;

  .traycontents {
    text-align:center; margin:0 auto 0 auto;

  }
  .keyer {
    font-style: italic;
  }


  .pin {
    font-size:13px;
    b {
      font-size:1.8em;
    }
  }

  .button {
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

  line-height:1.4em;
 font-size:0.9em;
}

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
          width:30px;
          height:30px;
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

  .song ch {

    &:after {
      display:none;
    }
    &:before {
      display:none;
    }
    c {
      display:none;
    }
  }

.show-chords {
  .song {
    vertical-align:bottom;
    line-height:2.2em !important;
    //
  }

  .song ch {
    display:inline;
    position:relative;
  }

  .song ch c{

    position:absolute;
    top:-1.8em;
    display:block;
    font-size:0.75em;
    font-weight:bold;
    left:0;
  }

  .song ch[n=c] c:before{
    content: "Cm";
  }
  .song ch[n=C] c:before{
    content: "C";
  }

  .song ch:before {
    position:absolute;
    top:-1.8em;
    font-size:0.75em;
    font-weight:bold;
    left:0;
  }
  .song ch:before {
    content: attr(c);
  }
}
</style>
