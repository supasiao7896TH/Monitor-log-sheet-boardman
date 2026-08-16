import { APP } from './modules/app/app.js';
import './modules/app/app-core.js';
import './modules/app/app-dashboard.js';
import './modules/app/app-import.js';
import './modules/app/app-tags.js';
import './modules/app/app-master.js';
import './modules/app/app-countermeasure.js';
import './modules/app/app-modal.js';
import './modules/app/app-chart.js';
import './modules/app/app-report.js';
import './modules/app/app-history.js';
import './modules/app/app-export.js';

document.addEventListener('DOMContentLoaded', APP.init);
