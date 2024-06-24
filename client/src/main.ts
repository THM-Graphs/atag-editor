import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ConfirmationService from 'primevue/confirmationservice';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import App from './App.vue';
import router from './router.ts';
import './style.css';
import 'primevue/resources/themes/aura-light-green/theme.css';
import 'primeicons/primeicons.css';
import '/node_modules/primeflex/primeflex.css';

createApp(App)
  .use(router)
  .use(createPinia())
  .use(PrimeVue)
  .use(ConfirmationService)
  .use(ToastService)
  .mount('#app');
