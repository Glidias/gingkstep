<template>
  <div id="impress" :style="`transform: scale(${scale})`">
     <splide ref="splider" :options="splideOptions" class="scrollslides">
        <splide-slide class="step" v-for="(li, i) in stepList" :key="i" v-html="li" :class="{intro:slidesHeaderIndices && slidesHeaderIndices[i]}"></splide-slide>
      </splide>
  </div>
</template>

<script>


var computeWindowScale = function( config ) {
  var hScale = window.innerHeight / config.height,
      wScale = window.innerWidth / config.width,
      scale = hScale > wScale ? wScale : hScale;

  if ( config.maxScale && scale > config.maxScale ) {
      scale = config.maxScale;
  }

  if ( config.minScale && scale < config.minScale ) {
      scale = config.minScale;
  }
  return scale;
};


export default {
   props: {
    stepList: Array,
    stepIndex: Number,
    slidesHeaderIndices: Object,
  },
  data() {
    return {
      scale: 1
    }
  },
  computed: {
    config () {
      return {
        width: 1024,
        height: 768,
        minScale: 0,
        maxScale: 1.5625,
        scale: 1
      }
    },

    splideOptions() {
      // var cols = this.testC;
      return {
        start: this.stepIndex !== undefined ? this.stepIndex : 0,
        autoWidth: true,
         easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
        type  : 'fade',
        throttle:0,
        speed:0,
        focus: "center",
        arrows: false,
        pagination: false,
        perPage: 1,
        perMove: 1,
        drag: true,
        height: '100%' //'calc(100vh - 50px)'
      };
    },
  },
  mounted () {
     this.$refs.splider.splide.on("move", (newIndex, oldIndex) => {
       this.$emit('goto', newIndex);
     });
     this._resizeHandler = this.onResize.bind(this);
     window.addEventListener('resize', this._resizeHandler);
  },
  beforeDestroy () {
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
    this.$refs.splider.splide.off('move');
  },
  watch: {
    stepIndex (newVal) {
      if (newVal !== undefined) {
        this.$refs.splider.splide.go(newVal);
      }
    }
  },
  methods: {
    onResize () {
      this.scale = computeWindowScale(this.config);
    }
  },
}
</script>

<style lang="scss" >
  #impress {
    font-family: 'Open Sans', Arial, Helvetica, sans-serif;
    line-height: .8;
    font-size: 45px;

    .song {
      >i {
        text-decoration:underline;
        margin-bottom:0.4em;
        font-size:0.8em;
      }
    }

    // todo: this will remove all pres! not good for non-song presentations!


    position: absolute; transform-origin: left top; transition: all 0ms ease-in-out 0ms; transform-style: preserve-3d; top: 50%; left: 50%;
     perspective: 1154.89px; transform: scale(0.865885);

 text-align:center;

  .splide {
    overflow: visible;
  }
   .splide__track {
    overflow: visible;
  }
   .splide__slide {
    overflow: visible;

  }

    .step {
    width: 1060px;
    &.intro {
       pre {
        display:none;
      }
    }




position: absolute; transform: translate(-50%, -50%) translate3d(0px, 0px, 0px) rotateX(0deg) rotateY(0deg) rotateZ(0deg) scale(1); transform-style: preserve-3d;
  //  padding: 40px 0;
    -webkit-box-sizing: border-box;
    -moz-box-sizing: border-box;
    -ms-box-sizing: border-box;
    -o-box-sizing: border-box;
    box-sizing: border-box;

transform-style: preserve-3d;
 transform: translate(-50%, -50%);
    /*
    -webkit-transition: opacity 1s;
    -moz-transition: opacity 1s;
    -ms-transition: opacity 1s;
    -o-transition: opacity 1s;
    transition: opacity 1s;
    //background-color: rgba(255,255,255,0.92);
   // transition-duration:0s !important;
   */


    background-color:black;
    color:white;
      strong {
        font-weight: 800;
        font-weight: bold
      }

      em {
        font-style: italic;
      }

      h1, h2 {
        font-weight: normal;
      }

      h1 {
        font-size: 120px;
        margin: 20px 0 100px;
        line-height: 130px;
      }

      h2 {
        font-weight: 400;
        letter-spacing: .1em;
        text-transform: uppercase;
        line-height: 72px;
        margin: 40px 0;
        font-size: 72px;
      }

      h3 {
        font-weight: 300;
        letter-spacing: .1em;
        text-transform: uppercase;
        line-height: 62px;
        margin: 10px 0;
        font-size: 62px;
      }

      .light {
        font-weight: 300;
        letter-spacing: .1em;
      }

      blockquote {
        text-align: justify;
        font-weight: 300;
        font-style: italic;
        line-height: 1.4;
        margin: 20px 0;
        padding: 10px 0;
        border-top: 1px solid #aaa;
        border-bottom: 1px solid #aaa;
        width: 1060px;
      }
      table {
        width:100%;
      }
      .present a {
        pointer-events: auto; /* Enable Click on link */
      }

      a {
        pointer-events: none; /* Fix Body Click */
        color: inherit;
        text-decoration: none;
        text-shadow: -1px -1px 2px rgba(100,100,100,0.9);
        -webkit-transition: 0.5s;
        -moz-transition: 0.5s;
        -ms-transition: 0.5s;
        -o-transition: 0.5s;
        transition: 0.5s;
        font-weight: normal;
        border-bottom: 1px dotted #0000ba;
      }

      a:hover {
        color: #333;
        text-shadow: -1px -1px 2px rgba(100,100,100,0.5);
      }

      p {
        font-weight: 400;
        line-height: 60px;
        margin-bottom: 20px;
      }

      ol {
        margin: 20px 0 20px 70px;
      }

      ul {
        margin: 20px 0 20px 50px;
      }

      ul ul {
        margin-top: 0px;
        margin-bottom: 0px;
      }
      ul ul li {
        line-height: 50px;
        margin-top: 0px;
        margin-bottom: 0px;
      }

      li {
        margin: 15px 0;
        line-height: 60px;
      }

      td,th {
        vertical-align: top;
        line-height: 44px;
      }


    }
  }
</style>