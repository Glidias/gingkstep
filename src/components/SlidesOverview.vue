<template>
  <div class="slide-overview" :data-columns="testC" :class="{'no-touch':!isTouchDevice, 'faint-select':faintSelect}" @keydown.up="tapHandlerLeft2"  @keydown.down="tapHandlerRight2">
    <div
      class="offseter"
       :style="{transform: `translateX(${rootOffsetH}px)`}"
    >
      <splide ref="splider" :options="splideOptions" class="scrollslides">
        <splide-slide v-for="(ul, s) in slideList" :key="s">
          <article v-touch:swipe="swipeHandler"
            class="html-export"
            :class="{selected:s===splideIndex}"
            :style="{
              'column-count':  $data['testcc'+s],
              transform: `translate(${testC > 1 ? $data['hOffset'+s] : 0}px, ${testC <= 1 ? $data['vOffset'+s] : 0}px)`,
            }"
          >
            <div :ref="'splideh_'+s+'_'+i" v-for="(htm, i) in ul.slides" :key="i" :id="i === ul.slides.length - 1 ? `omega_slide_${s}` : undefined">
              <div :class="{selected:lastScrolledSlideIndex === s && innerIndex === i}"  class="content" v-html="htm" v-touch:tap="tapHandlerContentSlide"  :data-inner-index="i" :data-slide-index="s"></div>
              <div v-if="i === ul.slides.length - 1" class="copyright-song" :class="{'-has-copyright': !!ul.copyright}" style="pointer-events:none; ">
                <div v-html="ul.copyright || ul.slides[0]"></div>
                <div class="arial rewind-button" style="pointer-events:auto" :data-slide-index="s" v-touch:tap="tapRewindHandler">{{lastScrolledSlideIndex === s ? '⏮' : '▶'}}</div>
              </div>
            </div>
          </article>
        </splide-slide>
      </splide>
    </div>
    <div class="bottombar">
      <div class="btn left arial" v-touch:tap="tapHandlerLeft" v-show="splideIndex === lastScrolledSlideIndex">{{ testC > 1 ? '&lt;' : '↑' }}</div>
      <div class="btn right arial" v-touch:tap="tapHandlerRight" v-show="splideIndex === lastScrolledSlideIndex">{{testC > 1 ? '&gt;' : '↓' }}</div>
      <!--<div class="btn center" v-touch:swipe="swipeHandler" v-show="splideIndex === lastScrolledSlideIndex"></div>-->
      <div class="btn left" v-touch:tap="returnTap" v-show="splideIndex  > lastScrolledSlideIndex">⏎</div>
      <div class="btn right" v-touch:tap="returnTap" v-show="splideIndex < lastScrolledSlideIndex">⏎</div>
    </div>
  </div>
</template>

<script> //
function isTouchDevice() {
  return (('ontouchstart' in window) ||
     (navigator.maxTouchPoints > 0) ||
     (navigator.msMaxTouchPoints > 0));
}

const NO_ABS_RECT_COORDS = document.body.getBoundingClientRect().x === undefined;

function getNumColumnsFromViewport() {
  let w = window.innerWidth;
  return w >= 1300 ? 4 : w > 1000 ? 3 : w >= 700 ? 2 : 1;
}

export default {
  name: "HelloWorld",
  props: {
    slideList: Array,
    faintSelect: {
      type:Boolean,
      default: false
    }
  },
  data() {
    let initial = getNumColumnsFromViewport()
    let d = {
      testC: initial,
      rootOffsetH: 0,
      splideIndex: 0,

      // refactor: this should be global retrive deriove and react to it
      lastScrolledSlideIndex:0,
      innerIndex: 0,
    };
    let slideList = this.slideList;
    for (let i=0, len = slideList.length; i< len; i++) {
      d['testtwc'+i] = initial;
      d['testcc'+i] = initial;
      d['hOffset'+i] = 0;
      d['vOffset'+i] = 0;
    }
    return d;
  },
  computed: {
    isTouchDevice: isTouchDevice,
    splideOptions() {
      // var cols = this.testC;
      return {
        autoWidth: true,
        // trimSpace: cols > 1 ? true : false,

        easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
        throttle:0,
        speed:250,
        focus: "center",
        arrows: false,
        perPage: 1,
        perMove: 1,
        dragDistanceStartThreshold: 30,
        drag: true,

         height: '100%' //'calc(100vh - 50px)'
      };
    },
  },
  watch: {
    /*
    splideOptions(val) {
      this.$refs.splider.options = val;
      this.$refs.splider.refresh();
    }
    */
  },
  methods: {
    tapHandlerContentSlide(e) {
      this.goto(parseInt(e.currentTarget.getAttribute('data-slide-index')), e.currentTarget.parentNode, parseInt(e.currentTarget.getAttribute('data-inner-index')));
    },
    tapRewindHandler(e) {
      var s = parseInt(e.currentTarget.getAttribute('data-slide-index'));
      this.goto(s, 0, 0);
    },
    returnTap() {
      if (this._lastScrolledElem) this.goto(this.lastScrolledSlideIndex, this._lastScrolledElem, this.innerIndex);
    },
    tapHandlerLeft(e) {
      this.swipeHandler("bottom", e, true);
    },
     tapHandlerLeft2(e) {
       if (this.splideIndex !== this.lastScrolledSlideIndex)  this.returnTap();
      else this.swipeHandler("bottom", e, true);
    },
    tapHandlerRight(e) {
      this.swipeHandler("top");
    },
    tapHandlerRight2() {
      if (this.splideIndex !== this.lastScrolledSlideIndex) this.goto(this.splideIndex, 0, 0);
      else this.swipeHandler("top");
    },
    swipeHandler(direction, ev, skipRetConsider) {
      if (direction === 'left' || direction === 'right') {
        if (this.splideOptions.drag) {
            this.$refs.splider.splide.go(direction === 'left' ? '+' : '-')
        }
      }
      else {
        if (direction === 'top') {

           if (!skipRetConsider && this.splideIndex !== this.lastScrolledSlideIndex) return this.goto(this.splideIndex, 0, 0);
          if (this._lastScrolledElem) {
            if( this._lastScrolledElem.nextSibling) {

               this.goto(this.lastScrolledSlideIndex, this._lastScrolledElem.nextSibling, ++this.innerIndex);
            }
          }
        } else {
           if (!skipRetConsider && this.splideIndex !== this.lastScrolledSlideIndex)  return this.returnTap();


          if (this._lastScrolledElem) {
            if( this._lastScrolledElem.previousSibling) {

               this.goto(this.lastScrolledSlideIndex, this._lastScrolledElem.previousSibling, --this.innerIndex);
            }
          }
        }
      }

    },
    onResize () {
      this.$el.style.height = window.innerHeight + 'px';
     this.$refs.splider.$el.style.height = (window.innerHeight - 50) + 'px';
      let slideList = this.slideList;


       let initial = getNumColumnsFromViewport()
        this.testC = initial;
        for (let i=0, len = slideList.length; i< len; i++) {
          this['testtwc'+i] = initial;
          this['testcc'+i] = initial;
        }
      setTimeout(()=> {
      for (let i=0, len = slideList.length; i< len; i++) {
        let elem = document.getElementById("omega_slide_"+i);

        let parentRect =  elem.parentNode.getBoundingClientRect();
        let rectTest =  elem.getBoundingClientRect();
        let totalWidthCols =  ((Math.floor((rectTest.x-parentRect.x)/rectTest.width+0.01))+1);
        this['testtwc'+i] = totalWidthCols;

        if (totalWidthCols < this.testC) {
          this['testcc'+i] = totalWidthCols;
        }
      }
      }, 0);
      // this.$refs.splider.refresh();
    },
    goto(i, tt, innerIndex, suppressEvents) { //  innerIndex
      if (i !== this.splideIndex ) {
         this.$refs.splider.splide.go(i);
      }

      if (tt != null) {
        let targt = typeof tt !== 'number' ? tt : this.$refs[`splideh_${i}_${innerIndex}`][0];

        this.scrollToElem(targt, i);
        this._lastScrolledElem = targt;
        this.lastScrolledSlideIndex = i;
        this.innerIndex = innerIndex;
      }

      if (!suppressEvents) this.$emit('goto', i, innerIndex);
    },
    scrollToElem(elem, i) { // within current context of div
      let horizontalMode = this.testC > 1;
      let prop = NO_ABS_RECT_COORDS ? (horizontalMode ? "left" : "top") : (horizontalMode ? "x" : "y");
      let propD = horizontalMode ? "width" : "height";
      let parentRect = elem.parentNode.getBoundingClientRect();
      let rect = elem.getBoundingClientRect();
      let diff = rect[prop] - parentRect[prop];
      let dim = horizontalMode ? parentRect[propD] : elem.parentNode.parentNode.getBoundingClientRect().height;

      let lastRect = document.getElementById("omega_slide_"+i).getBoundingClientRect();
      let parentRectDim = lastRect[prop] - parentRect[prop] + lastRect[propD];

      // trim whitespace bounds
      let tryVal = -diff - rect[propD] * 0.5 + dim * 0.5;
      if (tryVal > 0) tryVal = 0;
      var lastTryVal = tryVal;
      if (parentRect[propD] >= dim && tryVal < -parentRectDim + dim) tryVal = -parentRectDim + dim;

      if (horizontalMode && this['testtwc'+i] >= this.testC && tryVal !== lastTryVal ) {
        this.rootOffsetH = lastTryVal - tryVal;
      } else {
        this.rootOffsetH = 0;
      }
      this[horizontalMode ? "hOffset"+i : "vOffset"+i] = tryVal;
    },
  },
  beforeDestroy() {
    if (this._resizeHandler) window.removeEventListener('resize', this._resizeHandler);
  },
  mounted() {
    this.$el.appendChild(this.$refs.splider.$el.querySelector('.splide__pagination'));
    this._lastScrolledElem = this.$refs[`splideh_${this.lastScrolledSlideIndex}_${this.innerIndex}`][0];
    this._resizeHandler = this.onResize.bind(this);
    window.addEventListener('resize', this._resizeHandler);

    this.onResize();

    this.$refs.splider.splide.on("move", (newIndex, oldIndex) => {
      if (oldIndex === newIndex) {
        //this.rootOffsetH = 0;
        //this.hOffset = 0;
        return;
      }
      // do something
      this.splideIndex = newIndex;
      // this.rootOffsetH = 0;

       if (newIndex === this.lastScrolledSlideIndex) {
        this.scrollToElem(this._lastScrolledElem, this.lastScrolledSlideIndex);
      } else {
        var i = newIndex;
        while (--i >= 0) {
          let elem = document.getElementById("omega_slide_" + i, true);
          this.scrollToElem(elem, i);
          // this['hOffset'+i] = 0;
        }
        this.rootOffsetH = 0;
        //if (newIndex !== )

        i = newIndex;
        let len = this.slideList.length;
        while (++i < len) {
          let elem = this.$refs[`splideh_${i}_${0}`][0];
          this.scrollToElem(elem, i);
          // this['hOffset'+i] = 0;
        }
      }

    });
  },
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style  lang="scss" scoped>

.arial {
  font-family:Arial, sans-serif;
}

.bottombar {
  position:absolute;
  bottom:0px;
  left:0;
  z-index:1;
  width:100%;
  height:50px;

  background-color: #110000;

  ::v-deep .btn {

    width:35%;
    height:100%;
    position:absolute;
  // padding: 3px;
    border-radius:5px;
    text-align:center;
    vertical-align:center;
    align-items:center;
    justify-items: center;
    //background-color: #333333;
    touch-action:none;
    padding-top:15px;
   // margin-top:-25px;
    top:0;
    box-sizing:content-box;
    &.left {
       border-left:3px solid white;
    }
    &.right {
       border-right:3px solid white;
    }
    &.center {
      left:50%;
      transform:translateX(-50%);
      width:30%;
      height:100vh;
      top:-100vh;
      /*
      &:before {
        content: '';
        left:0;
        top:50%;
         height:100%;

         position:absolute;
         border-left:1px solid rgba(255,255,255,0.4);
      }
        &:after {
        content: '';
        right:0;
         top:35%;

         position:absolute;
         border-left:1px solid rgba(255,255,255,0.4);
        height:100%;
      }
      */
      position:relative;

    }

  }

  .left {
    left:0;

  }
  .right {
    right:0;

  }
}
.offseter {
  transition: transform 0.25s cubic-bezier(0.37, 0, 0.63, 1);
}
.slide-overview {

    text-align: center;
  color: white;
  background-color: black;
  overflow: hidden;
  position: relative;
  height: 100%;

  ::v-deep .scrollslides {
    height: 100%;
  }

   &[data-columns='1'] {
    ::v-deep article > *{
        max-width: 100vw;
      }
     ::v-deep article {
       font-size:0.9em;
       height:auto;
       width:100vw;
     }
     .copyright-song {
       padding-bottom:45px;
     }
  }

  &[data-columns='2'] {
    ::v-deep article > *{
      max-width: (100vw / 2);
    }
  }
   &[data-columns='3'] {
    ::v-deep article > *{
      max-width: (100vw / 3);
    }
  }
  &[data-columns='4'] {
    ::v-deep article > *{
      max-width: (100vw / 4);
    }
  }

  ::v-deep article {
    column-fill: auto;
    height: 100%;
    min-height:100%;


    box-sizing: border-box;
    padding-bottom: 15px;
    column-gap: 0;

    color:#666666;
    &.selected {
      color:#ffffff;
      // background-color:#181818;
    }
    > * {
      &:first-child {
        p:first-child {
          text-decoration:underline;
        }
      }
      flex: 1;
      break-inside: avoid-column;




    }
    transition: transform 0.25s ease-in-out;
  }
  ::v-deep .splide {
    overflow: visible;
  }
  ::v-deep .splide__track {
    overflow: visible;
    height:100%;
  }
  ::v-deep .splide__list {
    height:100%;
  }

 ::v-deep .splide__slide {
    //padding-bottom:50px;
    position: relative;

    box-sizing: border-box;
    border: 1px solid #333333;
    height: 100% !important;

    overflow: hidden;
  }

  ::v-deep .splide__pagination {
    bottom:15px;
    pointer-events:none;
    touch-action:none;
  }
}



.copyright-song { // mandatory copyright per song
  cursor:auto !important;
  &:hover {
    background-color:inherit !important;
  }
    font-size:0.8em;
    color:#aaaaaa;
    position:relative;

    &:before {
      content: "";
      border-top: 1px solid #777777;
      width: 70%;
      display: block;
      position:absolute;
      top:0;
      left:50%;
      transform:translateX(-50%);
    }
    padding-top:5px;

  }

  .rewind-button {
    cursor:pointer;
    padding:5px 25px;
    border-radius:6px;

    color:white;
    margin-top:5px;
    display:inline-block;
    background-color:#888888;
  }

    .content {
      cursor: pointer;
      z-index:112;
      padding: 1px 15px;
      box-sizing: border-box;
      // outline:rgb(16, 16, 16) 1px solid;
      margin: 0;
      &.selected {
        outline:rgba(121, 78, 0) 1px solid;
        cursor:auto !important;
        background-color:#181818 !important;
      }
       .no-touch & {
        &:hover {
            background-color: #111111;
          }
      }
    }

    .faint-select .content {
       &.selected {
        outline:rgba(121, 78, 0, 0.2) 1px solid;
        cursor:auto !important;
        background-color:#111111 !important;//##181818 !important;

      }
       .no-touch & {
        &:hover {
            background-color: #080808;
          }
      }
    }
</style>
