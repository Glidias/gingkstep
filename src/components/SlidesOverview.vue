<template>
  <div class="slide-overview" :data-columns="testC" :class="{'no-transition': noTransition, 'no-touch':!isTouchDevice, 'faint-select':faintSelect}" @keydown.up="tapHandlerLeft2"  @keydown.down="tapHandlerRight2">
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
              <div :id="'splideh_'+s+'_'+i"  :class="{selected:lastScrolledSlideIndex === s && innerIndex === i}"  class="content" v-html="htm" v-touch:tap="tapHandlerContentSlide"  :data-inner-index="i" :data-slide-index="s"></div>
              <div v-if="i === ul.slides.length - 1" class="copyright-song" :class="{'-has-copyright': !!ul.copyright}" style="pointer-events:none; ">
                <div :id="'splideh_'+s+'-copyright'" v-html="ul.copyright || ul.slides[0]"></div>
                <div class="arial rewind-button" style="pointer-events:auto" :data-slide-index="s" v-touch:tap="tapRewindHandler">{{lastScrolledSlideIndex === s ? '⏮' : '▶'}}</div>
              </div>
            </div>
          </article>
        </splide-slide>
      </splide>
    </div>
    <div class="tray" :class="{collapsed:!showTray}">
      <slot />
      <div class="print-tray" v-if="!usingMock">
        <a class="printbtn" :href="printUrl" target="_blank">&#128438;<sub>(*)</sub></a><br>
        <a class="printbtn-single" :href="printUrlSingle" target="_blank">&#128438;<sub>[{{this.splideIndex+1}}]</sub></a>
      </div>
    </div>
    <div class="bottombar">
      <div class="btn left arial" v-touch:tap="tapHandlerLeft" v-show="splideIndex === lastScrolledSlideIndex">↑</div>
      <div class="btn right arial" v-touch:tap="tapHandlerRight" v-show="splideIndex === lastScrolledSlideIndex">↓</div>
      <div class="btn center" v-touch:tap="centerBtnTap" @keydown.stop="">

      </div>
      <div class="btn left" v-touch:tap="returnTap" v-show="splideIndex  > lastScrolledSlideIndex">⏎</div>
      <div class="btn right" v-touch:tap="returnTap" v-show="splideIndex < lastScrolledSlideIndex">⏎</div>
    </div>
  </div>
</template>

<script>
import { NO_ARROWS } from './mixins/hotkeys';

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

function getSlideIndexFromStep(stepIndex, slideList) {
  let count = 0;
  let i=0, len = slideList.length;
  for (i=0; i< len; i++) {
    if (count >= stepIndex) break;
    let slides = slideList[i].slides;
    count += slides.length;
  }
  return i;
}

export default {
  props: {
    slideList: Array,
    faintSelect: {
      type:Boolean,
      default: false
    },
    treeId: String,
    showChords: Boolean,
    usingMock: Boolean,
    chordMode: Number,
    stepIndex: {
      type: Number,
      required: false
    }
  },
  data() {
    let initial = getNumColumnsFromViewport()
    let d = {
      testC: initial,
      rootOffsetH: 0, // a horizontal root offset displacement to peek into next song slide when viewing last column of current slide
      splideIndex: 0, // the current Splide focus index
      showTray: false,
      noTransition: false,

      lastScrolledSlideIndex_:0,
      innerIndex_: 0,
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
    printUrl () {
      return `${process.env.BASE_URL}print?s=${this.treeId}` + (this.showChords ? `&showchords` : '') + (this.chordMode ? `&nummode=${this.chordMode}` : '');
    },
    printUrlSingle () {
      return this.printUrl + '&song=' + (this.splideIndex+1);
    },
    lastScrolledSlideIndex () {
      return this.stepIndex !== undefined ? this.subIndexArr[this.stepIndex][0] : this.lastScrolledSlideIndex_;
    },
    innerIndex () {
      return this.stepIndex !== undefined ? this.subIndexArr[this.stepIndex][1] : this.innerIndex_;
    },
    totalSlideAccum() {
      let arr = [];
      let count = 0;
      let slideList = this.slideList;
      for (let i=0, len = slideList.length; i< len; i++) {
        let slides = slideList[i].slides;
        arr.push(count);
        count += slides.length;
      }
      return arr;
    },
    subIndexArr () {
      let arr = [];
      let slideList = this.slideList;
      for (let i=0, len = slideList.length; i< len; i++) {
        let slides = slideList[i].slides;
        for (let u=0, uLen = slides.length; u< uLen; u++) {
          arr.push([i, u]);
        }
      }
      return arr;
    },
    isTouchDevice: isTouchDevice,
    splideOptions() {
       var cols = this.testC;
      return {
        autoWidth: true,
        start: 0, //this.stepIndex !== undefined ? getSlideIndexFromStep(this.stepIndex, this.slideList) : 0,
        //trimSpace: false, //cols > 1 ? true : false,

        easing: 'cubic-bezier(0.37, 0, 0.63, 1)',
        throttle:0,
        speed:250,
        keyboard: NO_ARROWS ? false : 'global',
        focus: "center",
        arrows: false,
        perPage: 1,
        perMove: 1,
        dragDistanceStartThreshold: 30,
        drag: true,
        height: '100%'
      };
    },
  },
  watch: {
    showChords () {
      this.$nextTick(()=>{
        this.onResize(null, true);
        // this.$refs.splider.splide.go(this.splideIndex);
        // refresh glitching workarond::  enforce slide return back to focused step's location
        setTimeout(()=>{
          // this.$refs.splider.splide.go(this.splideIndex);
          if (this.splideIndex === this.lastScrolledSlideIndex) { // refocus current slide
            let arr = this.subIndexArr;
            let val = this.stepIndex;
            let a = arr[val][0];
            let b = arr[val][1];
            this.goto(a, 0, b, true);
          } else {
            // todo somethin?
          }

          let slideList = this.slideList;
          for (let i = 0, l = slideList.length; i < l; i++) {
            if (i !== this.lastScrolledSlideIndex || i !== this.splideIndex) {
              this['hOffset'+i] = 0;
            }
          }
        }, 1);
      });
    },
    stepIndex (val) {
      if (val !== undefined) {
        let arr = this.subIndexArr;
        let a = arr[val][0];
        let b = arr[val][1];
        if (a !== this.lastScrolledSlideIndex_ || b !== this.innerIndex_) {
          this.goto(a, 0, b, true);
        }
      }
    }
  },
  methods: {
    centerBtnTap () {
      this.showTray = !this.showTray;
    },
    onTapDummy(e) {
      e.stopPropagation();
    },
    onTapSlideOverview() {
      this.showTray = false;
    },
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
      if (NO_ARROWS) return;
      //if (this.splideIndex !== this.lastScrolledSlideIndex)  this.returnTap();
      else this.swipeHandler("bottom", e, true);
    },
    tapHandlerRight(e) {
      this.swipeHandler("top");
    },
    tapHandlerRight2() {
      if (NO_ARROWS) return;
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
        if (direction === 'top') { // down key/swipe up
          //!skipRetConsider &&
          if (this.splideIndex !== this.lastScrolledSlideIndex) return this.goto(this.splideIndex, 0, 0);
          if (this._lastScrolledElem) {
            if( this._lastScrolledElem.nextSibling) {
               this.goto(this.lastScrolledSlideIndex, this._lastScrolledElem.nextSibling, ++this.innerIndex_);
            }
          }
        } else { // up key/swipe down
           //if (!skipRetConsider && this.splideIndex !== this.lastScrolledSlideIndex)  return this.returnTap();

          if (this.splideIndex !== this.lastScrolledSlideIndex) return this.goto(this.splideIndex, 0, this.slideList[this.splideIndex].slides.length-1);
          if (this._lastScrolledElem) {
            if( this._lastScrolledElem.previousSibling) {

               this.goto(this.lastScrolledSlideIndex, this._lastScrolledElem.previousSibling, --this.innerIndex_);
            }
          }
        }
      }
    },
    onResize (e) {
      this.$el.style.height = window.innerHeight + 'px';
      // let dontHaveNoTrans = !this.$el.classList.contains('no-transition');
      // this.$el.classList.add('no-transition');
      this.$refs.splider.$el.style.height = (window.innerHeight - 50) + 'px';
      let slideList = this.slideList;
      let initial = getNumColumnsFromViewport()
      this.testC = initial;

      // Predict number of columns (for width) due to CSS flexbox/columns width limitation (consider: CSS Grid for this)
      for (let i=0, len = slideList.length; i< len; i++) {
        this['testtwc'+i] = initial;
        this['testcc'+i] = initial;
      }


      for (let i=0, len = slideList.length; i< len; i++) {
        let elem = document.getElementById("omega_slide_"+i);
        if (!elem) return;
        let parentRect =  elem.parentNode.getBoundingClientRect();
        let rectTest =  elem.getBoundingClientRect();
        let totalWidthCols =  ((Math.floor((rectTest.x-parentRect.x)/rectTest.width+0.01))+1);
        this['testtwc'+i] = totalWidthCols;

        if (totalWidthCols < this.testC) {
          this['testcc'+i] = totalWidthCols;
        }
      }

      if (!e) return;
      setTimeout(()=>{ // call refresh again (repeat of above) for better prediction
       for (let i=0, len = slideList.length; i< len; i++) {
        this['testtwc'+i] = initial;
        this['testcc'+i] = initial;
      }
        for (let i=0, len = slideList.length; i< len; i++) {
          let elem = document.getElementById("omega_slide_"+i);
          if (!elem) return;
          let parentRect =  elem.parentNode.getBoundingClientRect();
          let rectTest =  elem.getBoundingClientRect();
          let totalWidthCols =  ((Math.floor((rectTest.x-parentRect.x)/rectTest.width+0.01))+1);
          this['testtwc'+i] = totalWidthCols;

          if (totalWidthCols < this.testC) {
            this['testcc'+i] = totalWidthCols;
          }
        }
        // if (dontHaveNoTrans) this.$el.classList.remove('no-transition');
      },0);
    },
    goto (i, tt, innerIndex, suppressEvents) {
        if (i !== this.splideIndex) {
          this.$refs.splider.splide.go(i);
        }

        if (tt != null) {
          let targt = typeof tt !== 'number' ? tt : this.$refs[`splideh_${i}_${innerIndex}`][0];

          this.scrollToElem(targt, i);
          this._lastScrolledElem = targt;
          this.lastScrolledSlideIndex_ = i;
          this.innerIndex_ = innerIndex;
        }
      if (!suppressEvents) this.$emit('goto', this.totalSlideAccum[i]+innerIndex);
    },
    scrollToElem(elem, i) {
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

    this.onResize(null, true);
    if (this.stepIndex !== undefined && this.stepIndex !== 0) {
      this.$el.classList.add('no-transition');
      this.noTransition = true;
      this.$nextTick(()=>{
        setTimeout(()=> {
          let arr = this.subIndexArr;
          let val = this.stepIndex;
          this.goto(arr[val][0], null, arr[val][1], true);
          setTimeout(()=>{
            this.noTransition = false;
            this.$el.classList.remove('no-transition');
          }, 0);
        },0);
      });
    }

    this.$refs.splider.splide.on("move", (newIndex, oldIndex) => {
      if (oldIndex === newIndex) {
        return;
      }
      this.splideIndex = newIndex;
      // this.rootOffsetH = 0;

       if (newIndex === this.lastScrolledSlideIndex) {
        this.scrollToElem(this._lastScrolledElem, this.lastScrolledSlideIndex);
      } else {
        var i = newIndex;
        while (--i >= 0) {
          let elem = document.getElementById("omega_slide_" + i, true);
          this.scrollToElem(elem, i);
        }
        this.rootOffsetH = 0;

        i = newIndex;
        let len = this.slideList.length;
        while (++i < len) {
          let elem = this.$refs[`splideh_${i}_${0}`][0];
          this.scrollToElem(elem, i);
        }
      }
      this.$emit('songFocusChange', newIndex);
    });
  },
};
</script>


<style lang="scss" scoped>

$bottom-bar-height:50px;

.clipboardbtn {

}

.print-tray {
  position:absolute;
  right:25px;
  transform:translateY(-50%);
  top:50%;
  text-align:right;
  line-height:3em;
  >* {
      font-size:18px;

        width:auto;

    text-decoration: none;
  }
  ::v-deep sub {
    font-size:0.5em;
  }
}


.bottombar {
  position:absolute;
  bottom:0px;
  left:0;
  z-index:1;
  width:100%;
  height:$bottom-bar-height;

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
    // background-color: #333333;
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
      position:relative;
      &:before {
        content: '';
        left:0;
        top:0%;
         height:100%;

         position:absolute;
         border-left:1px solid rgba(255,255,255,0.4);
      }
        &:after {
        content: '';
        right:0;
         top:0%;

         position:absolute;
         border-left:1px solid rgba(255,255,255,0.4);
        height:100%;
      }
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
  .no-transition & {
    transition:none !important;
  }
}

.slide-overview {
  font-size:var(--overview-font-size);
  text-align: center;
  background-color:#1e1e1e;//#1b1a1a;
  overflow: hidden;
  position: relative;
  height: 100%;

  ::v-deep .scrollslides {
    height: 100%;
  }

  &[data-columns='1'] {
    ::v-deep article > *{
      width: 100vw;
    }
    ::v-deep article {
      font-size:0.94em;
      height:auto;
      width:100vw;
    }
    .copyright-song {
      padding-bottom:45px;
    }
  }

  &[data-columns='2'] {
    ::v-deep article > *{
      width: (100vw / 2);
    }
  }
   &[data-columns='3'] {
    ::v-deep article > *{
      width: (100vw / 3);
    }
  }
  &[data-columns='4'] {
    ::v-deep article > *{
      width: (100vw / 4);
    }
  }

  ::v-deep article {
    column-fill: auto;
    height: 100%;
    min-height:100%;
    a {
      pointer-events:none;
      touch-action: none;
    }


    box-sizing: border-box;
    padding-bottom: 15px;
    column-gap: 0;
    color:#666666;
    &.selected {
    color:#aaccff;

    }
    > * {

        p.song {
          font-weight:300;
          > i {
          font-size:0.9em;
          margin-bottom:0.4em;
          text-decoration:underline;
        }

      }

      &:first-child {
         pre {
          display:none;
        }
        p:first-child {
          text-decoration:underline;
        }


        p + br {
          display:none;
        }
        pre + br {
          display:none
        }

      }
      flex: 1;
      break-inside: avoid-column;




    }
    transition: transform 0.25s ease-in-out;
  }

  &.no-transition ::v-deep article {
    transition:none !important;

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
    &__page {
      background-color:#666666;
      &.is-active {
        background-color:#aaccff;
      }
    }
  }
}



.copyright-song { // mandatory copyright per song
  ::v-deep em {
    display:none;
    .show-chords & {
      display:inline;
    }
  }
  cursor:auto !important;
  ::v-deep .song {
    display:none;
  }
  ::v-deep pre {
    display:none;
  }
  &:hover {
    background-color:inherit !important;
  }
  font-size:0.8em;
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
}

.content {



  &[data-inner-index='0'] {
    ::v-deep .song {
      display:none;
      .show-chords & {
        display:block;
      }
    }
  }
  cursor: pointer;
  z-index:112;
  padding: 1px 15px;
  box-sizing: border-box;
  // outline:rgb(16, 16, 16) 1px solid;
  margin: 0;

  ::v-deep > * {
    pointer-events: none;
  }

  &.selected {
    outline:rgba(121, 78, 0, 1) 1px solid;
    cursor:auto !important;
    background-color:#1c1c20 !important;
    ::v-deep > * {
      pointer-events:auto;
    }
  }
}

.faint-select .content {
    &.selected {
    outline:rgba(121, 78, 0, 0.3) 1px solid;
    cursor:auto !important;
  }
}

.tray {
  position:fixed;bottom:$bottom-bar-height;left:0;width:100%;height:auto;
  transition:transform .35s cubic-bezier(0.165, 0.84, 0.44, 1);
  transform:translateY(0);
  font-size:16px;
  backdrop-filter: blur(10px);
  color:white;
  background-color:rgb(104, 98, 98); padding:10px;
  display:flex;
  z-index:1;
}
.tray > div {
  font-size:11px;
  margin-left:15px;
}
.tray.collapsed {
    transform:translateY(100%);
}
</style>
