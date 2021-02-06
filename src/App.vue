<template>
  <div id="app" :class="{'show-chords':showChords, 'show-overview':showOverview}">
    <div id="attempting-connection" v-show="false">Attempting connection...</div>
    <slide-show :step-list="slidesFlattened" v-if="!showOverview"></slide-show>
    <slides-overview :slide-list="slides" v-if="showOverview" />
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
      showChords: false
    }
  },
  computed: {
    slides () {
      return mockData;
    },
    slidesFlattened() {
      let arr = [];
      for (let i =0; i<mockData.length; i++) {
        arr.push(...mockData[i].slides);
      }
      return arr;
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

.show-chords {
  .song {
    vertical-align:bottom;
    line-height:2.0em;
    //
  }

  .song ch {
    display:inline;
    position:relative;
  }

  .song ch c{
    position:absolute;
    top:-1.7em;
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
    top:-1.7em;
    font-size:0.75em;
    font-weight:bold;
    left:0;
  }
  .song ch:before {
    content: attr(c);
  }
}
</style>
