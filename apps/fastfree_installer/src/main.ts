import { createApp } from 'vue';
import {
  Quasar,
  Notify,
  Dialog,
  QBtn,
  QIcon,
  QBadge,
  QBanner,
  QTabs,
  QTab,
  QSplitter,
  QTooltip,
  QSeparator,
  QBtnToggle,
  QBtnGroup,
  QCard,
  QCardSection,
  QCardActions,
  QSlider,
  QInput,
  QToggle,
  QLinearProgress,
  QChip,
} from 'quasar';
import App from './App.vue';
import 'quasar/dist/quasar.css';
import '@quasar/extras/exports/material-icons/material-icons.css';
import '@fontsource/ibm-plex-sans-arabic/400.css';
import '@fontsource/ibm-plex-sans-arabic/600.css';
import '@fontsource/ibm-plex-sans-arabic/700.css';
// Canonical screen tokens AFTER the App import: App.vue styles are emitted
// first, so these `:root` values keep beating App.vue's navy tokens in dark
// mode (preserving the previously-rendered pixels), while the
// `html[data-theme="light"]` / oled blocks win everywhere via attribute
// specificity.
import './assets/styles/tokens.css';

const app = createApp(App);

app.use(Quasar, {
  plugins: { Notify, Dialog },
  components: {
    QBtn,
    QIcon,
    QBadge,
    QBanner,
    QTabs,
    QTab,
    QSplitter,
    QTooltip,
    QSeparator,
    QBtnToggle,
    QBtnGroup,
    QCard,
    QCardSection,
    QCardActions,
    QSlider,
    QInput,
    QToggle,
    QLinearProgress,
    QChip,
  },
});

app.mount('#app');
