import { createApp } from 'vue';
import { createPinia } from 'pinia';
import TDesign from 'tdesign-vue-next';
import App from './App.vue';
import router from './router';
import { useThemeStore } from './stores/theme';
import 'tdesign-vue-next/es/style/index.css';
import './styles/global.css';
import './styles/transitions.css';
const app = createApp(App);
const pinia = createPinia();
app.use(pinia);
// Theme store must run on boot; it was only imported by ThemeSettings.vue, so
// applyTheme() never ran after refresh — pages kept global.css :root defaults.
useThemeStore();
app.use(router);
app.use(TDesign);
app.mount('#app');
//# sourceMappingURL=main.js.map