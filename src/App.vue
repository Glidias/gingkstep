<template>
  <div id="app" :class="{'show-chords':showChords, 'show-overview':showOverview, 'is-guest': isGuest, 'attempting-connect':attemptingConnect}">
    <div v-if="slides && slides.length">
      <slides-overview @goto="onGoto" :step-index="stepIndex" :slide-list="slides" v-if="showOverview" :faint-select="!isHost && !strongHighlight">
        <div class="traycontents">
          <div>
            <p><label><input type="checkbox" v-model="showChords">Show Chords?</label> <span class="keyer" v-show="curDefKeyIndex >=0">Key:
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
      <slide-show @goto="onGoto" :step-index="stepIndex" :step-list="slidesFlattened" v-if="!showOverview"></slide-show>
      <a id="hamburger" @click="showOverview = !showOverview"></a>
    </div>
    <div v-else style="padding:15px">
      <form @submit.prevent="onSubmitJoin($event)">
        <label>Join Room: <input type="text" name="roomid"></label>
        <button type="submit">Join</button>
      </form>
      <br>
      <form @submit.prevent="onSubmitLoad($event)">
        <label>Open Tree: <input type="text" name="treeid"></label>
        <button type="submit">Load</button>
      </form>
    </div>
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
      attemptingConnect: false,
      isHost: false,
      strongHighlight: false,

      slides: null,

      treeD: '',

      stepIndex: 0,
    }
  },
  computed: {
    isGuest () {
      return !this.isHost && this.sessionPin;
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

    hostingTestRoom (sessionPin) {
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
    joinedRoom: function(dataArr) { //sessionPin, treeD, keys
      let sessionPin = dataArr[0];
      let treeD = dataArr[1];
      let keys = dataArr[2];
      // attempt load treeD before

      this.attemptingConnect = false;
      this.sessionPin = sessionPin;
      this.isHost = false;
      this.slides = mockData;
    },
  },
  methods: {
    onKeyDropdownChange(event) {
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
          console.log(b);
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
      this.slides = mockData;
    },
    hostSession () {
      this.lazyEmit('host-room', this.treeD);
    }
  },
  watch: {
    showChords () {
      window.dispatchEvent(new Event('resize'));
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
  font-family: "Avenir", Helvetica, Arial, sans-serif;
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
      color:yellow;
  }

  .song ch c{

    position:absolute;
    top:-1.8em;
    display:block;
    font-size:0.75em;

     letter-spacing:1px;
    font-weight:bold;
    left:0;
  }
  .song ch:before {
    position:absolute;
    top:-1.8em;
    font-size:0.75em;
    letter-spacing:1px;
    font-weight:bold;
    left:0;
  }
  .song ch:before {
    content: attr(c);
  }
}
</style>
