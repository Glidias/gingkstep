import Vue from "vue";
import App from "./App.vue";
import VueSplide from "@splidejs/vue-splide";
import Vue2TouchEvents from 'vue2-touch-events';
import VueSocketIO from 'vue-socket.io';
import io from 'socket.io-client';
import {HOST_PREFIX} from './constants';


Vue.use(Vue2TouchEvents, {
  touchClass: '',
  tapTolerance: 10,
  touchHoldTolerance: 400,
  swipeTolerance: 25
});
Vue.use(VueSplide);

const connection = io(HOST_PREFIX, {
  withCredentials: true
});

Vue.use(new VueSocketIO({
  connection,
  debug: process.env.NODE_ENV === 'development'
}))


Vue.config.productionTip = false;


new Vue({
  render: (h) => h(App)
}).$mount("#app");
