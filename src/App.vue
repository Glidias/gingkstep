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
}
body {
  touch-action: none;
}
#app {
  font-family: "Avenir", Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
</style>
