<template>
  <div id="app">
    <slides-overview :slide-list="slides" />
  </div>
</template>

<script>
import SlidesOverview from "./components/SlidesOverview";
import mockData from '././model/mockdata';

export default {
  name: "App",
  components: {
    SlidesOverview
  },
  computed: {
    slides () {
      return mockData;
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
}

#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
