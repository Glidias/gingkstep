import Vue from "vue";
import App from "./App.vue";
import VueSplide from "@splidejs/vue-splide";
import Vue2TouchEvents from 'vue2-touch-events'

Vue.use(Vue2TouchEvents, {
  touchClass: '',
  tapTolerance: 10,
  touchHoldTolerance: 400,
  swipeTolerance: 25
});
Vue.use(VueSplide);
Vue.config.productionTip = false;

new Vue({
  render: (h) => h(App)
}).$mount("#app");
