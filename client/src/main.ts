import { createApp } from 'vue';
import ConfirmationService from 'primevue/confirmationservice';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import App from './App.vue';
import router from './router.ts';
import './style.css';
import Tooltip from 'primevue/tooltip';
import 'primevue/resources/themes/aura-light-green/theme.css';
import 'primeicons/primeicons.css';
import '/node_modules/primeflex/primeflex.css';

const app = createApp(App);

app.use(router).use(PrimeVue).use(ConfirmationService).use(ToastService);

app.directive('tooltip', Tooltip);

app.mount('#app');
