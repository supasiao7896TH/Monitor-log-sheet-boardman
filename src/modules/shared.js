import { STATE } from './state.js';

// V29.74/V29.78: shared by excel-writeback.js and excel-autoimport.js — both talk to the same
// Local Bridge (bridge/excel-bridge.ps1) over localhost HTTP, so the URL and timeout wrapper live
// here once instead of being duplicated per module.
export const BRIDGE_URL = 'http://localhost:5175';
const FETCH_TIMEOUT_MS = 4000;
export async function fetchWithTimeout(url, options) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

export function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
}

export function getTagId(r) { return `${r.machine}_${r.tagNo}_${r.paramType}`; }

export function parseNum(x) { return parseFloat(String(x).replace(/,/g, '')); }

export function cleanStr(s, keepDigits = false) {
    return String(s).toLowerCase().replace(keepDigits ? /[^a-z0-9]/g : /[^a-z]/g, '');
}

// V29.67 FIX: เดิมเช็คแค่ range 1-31/1-12 ไม่เช็คจำนวนวันจริงต่อเดือน — วันที่แบบ 31/04 (เม.ย.มี 30 วัน)
// ผ่าน validation ไปได้ทั้งที่ new Date(...) จะ auto-rollover เป็น 01/05 แบบเงียบๆ ทีหลัง
export function isValidDayMonth(dd, mm, yyyy) {
    if (!(mm >= 1 && mm <= 12) || !(dd >= 1)) return false;
    if (yyyy) return dd <= new Date(yyyy, mm, 0).getDate();
    // ไม่รู้ปี (เผื่อปีอธิกสุรทิน) ใช้ตารางวันสูงสุดต่อเดือนแบบ leap-year (Feb 29)
    const maxDays = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    return dd <= maxDays[mm - 1];
}

export function excelSerialToDateStr(n, rawText) {
    if (isNaN(n) || n <= 40000 || n >= 60000 || rawText.includes(':')) return null;
    const jsDate = new Date(Math.round((n - 25569) * 86400 * 1000));
    return `${String(jsDate.getUTCDate()).padStart(2, '0')}/${String(jsDate.getUTCMonth() + 1).padStart(2, '0')}/${jsDate.getUTCFullYear()}`;
}

export function excelSerialToTime(n) {
    const frac = n - Math.floor(n);
    const sec = Math.round(frac * 86400);
    return String(Math.floor(sec / 3600)).padStart(2, '0') + ':' + String(Math.floor((sec % 3600) / 60)).padStart(2, '0');
}

export function classifyDeviation(val, eMin, eMax) {
    if (eMax !== null && val > eMax) return 'high';
    if (eMin !== null && val < eMin) return 'low';
    return 'deviation';
}

export function resolveEffectiveLimits(tagDef, master) {
    const t = tagDef || {};
    const eMin = (master && master.min !== null && master.min !== '') ? parseFloat(master.min) : (t.min !== undefined ? t.min : null);
    const eMax = (master && master.max !== null && master.max !== '') ? parseFloat(master.max) : (t.max !== undefined ? t.max : null);
    const eExact = (master && master.exactNum !== null && master.exactNum !== '') ? parseFloat(master.exactNum) : (t.exactNum !== undefined ? t.exactNum : null);
    return { eMin, eMax, eExact };
}

export function formatLimitText(eMin, eMax, eExact, fallback) {
    return (eMin !== null ? `Min: ${eMin}` : '') + (eMin !== null && eMax !== null ? ' / ' : '') + (eMax !== null ? `Max: ${eMax}` : '') || (eExact !== null ? `Exact: ${eExact}` : fallback);
}

export function getMasterMap() { return new Map(STATE.get('masterTags').map(m => [m.id, m])); }
// V29.52 PERF: O(1) tag lookup by id — replaces repeated tags.find(...) inside per-record loops
export function getTagMap() { return new Map(STATE.get('tags').map(t => [t.id, t])); }

export function showModal(id) { const el = document.getElementById(id); if (el) el.classList.remove('hidden'); }
export function hideModal(id) { const el = document.getElementById(id); if (el) el.classList.add('hidden'); }

// V29.71 FEAT: ข้อความสถานะชั่วคราว (เช่น "Synced to Excel" / error) — ไม่มี toast library ในแอปนี้
// เลยใช้ text บน element เป้าหมายแทน ตั้งค่าแล้วหายเองหลัง duration
const TRANSIENT_MESSAGE_TIMERS = new Map();
export function showTransientMessage(elId, text, variant = 'info', duration = 4000) {
    const el = document.getElementById(elId);
    if (!el) return;
    const variantClass = { success: 'text-emerald-600', warning: 'text-amber-600', error: 'text-red-600', info: 'text-slate-500' }[variant] || 'text-slate-500';
    el.className = el.className.replace(/\btext-(emerald|amber|red|slate)-\d+\b/g, '').trim() + ' ' + variantClass;
    el.textContent = text;

    if (TRANSIENT_MESSAGE_TIMERS.has(elId)) clearTimeout(TRANSIENT_MESSAGE_TIMERS.get(elId));
    if (duration > 0) {
        const timer = setTimeout(() => { el.textContent = ''; TRANSIENT_MESSAGE_TIMERS.delete(elId); }, duration);
        TRANSIENT_MESSAGE_TIMERS.set(elId, timer);
    }
}

export const STORE_TAGS = 'Tags', STORE_RECORDS = 'Records', STORE_MASTERTAGS = 'MasterTags', STORE_IMPORTHISTORY = 'ImportHistory', STORE_COUNTERMEASURES = 'UserCountermeasures';
// V29.90 FEAT: เก็บ snapshot ของ record ที่เคยเป็น Abnormal/Stat Deviation แยกจาก STORE_RECORDS โดยตั้งใจ —
// "ล้างฐานข้อมูล" (STORAGE_ENGINE.clearImportedData) เคลียร์แค่ STORE_RECORDS เท่านั้น ไม่แตะ store นี้เลย
// ดู APP.syncAbnormalHistory ใน app-core.js สำหรับ logic การ upsert เข้า store นี้
export const STORE_ABNORMAL_HISTORY = 'AbnormalHistory';

// Zero-shield / abnormal-detection tolerances (V29.40/V29.42-tuned — values frozen, names only)
export const LIMIT_EPSILON = 0.0001;
export const ZERO_SHIELD_ABS = 0.1;
export const ZERO_SHIELD_REF_MAGNITUDE = 10;
export const ZERO_SHIELD_REF_ABS = 1.5;
export const ZERO_SHIELD_REF_RATIO = 0.03;
export const NEIGHBOR_COLUMN_VALIDITY_THRESHOLD = 0.1;

// V29.84 FEAT: Statistical Deviation detection (opt-in per-tag via Tag Master) — จับ reading ที่ยัง
// อยู่ใน hard-limit spec แต่ผิดปกติเทียบกับ baseline จริงของ tag เอง (เช่น TI-2301 spec กว้าง 220-262
// แต่ค่าจริงเสถียรแคบมากที่ 253-254 — ค่า 238.7 ยัง "ใน spec" แต่คือสัญญาณ sensor clogging)
// Known limitation (v1, ไม่ต้อง auto-fix): ถ้า process เปลี่ยน setpoint จริงถาวร (ไม่ใช่ fault) จะเกิด
// false-positive ต่อเนื่องจนกว่า window นี้จะเลื่อนผ่าน mean เก่าไปหมด — mitigation ระยะสั้น: operator
// ปิด enableStatDeviation ชั่วคราวเองผ่าน Tag Master จนกว่า baseline ใหม่จะสะสมพอ
// Known limitation #2 (v1, ไม่ต้อง auto-fix): variance คำนวณแบบ sumSq/n - mean² (ไม่ใช่ Welford's online
// algorithm) มีความเสี่ยง catastrophic cancellation เมื่อ magnitude ค่าจริงสูงแต่ variance เล็กมาก (เช่น
// mean≈254, variance≈0.006) — float64 ยังพอมี precision เหลือพอในทางปฏิบัติ แต่ถ้า windowSize ใหญ่ขึ้นมาก
// หรือใช้กับ tag magnitude สูงกว่านี้มาก (เช่น pressure หลักพัน) ควรพิจารณาเปลี่ยนเป็น Welford's algorithm
export const STAT_DEVIATION_WINDOW_SAMPLES = 120; // ~30 วัน ที่ 4 samples/วัน (ดู CANONICAL_TIMES)
export const STAT_DEVIATION_MIN_SAMPLES = 20;      // cold-start guard — tag ที่เพิ่งเปิดใช้ยังไม่มี baseline พอ ห้ามจับ
export const STAT_DEVIATION_SIGMA_K = 3;           // เกณฑ์ mean ± 3σ

// รับ samples ที่เรียงตาม timestamp ascending มาแล้ว: [{ value, isBaselineEligible }, ...]
// isBaselineEligible: caller ต้อง set เป็น false สำหรับ record ที่ isAbnormal===1 หรือ isStandby===true
// (กัน reading แย่มากลากค่าเฉลี่ยเพี้ยน) — คืนค่า array ขนาดเท่ากัน: [{ isStatDeviation: 0|1, zScore }, ...]
// Causal + leave-one-out จริง: ประเมินค่าปัจจุบันจาก baseline "ก่อนหน้า" เท่านั้น แล้วค่อยเอาค่านั้นเข้า
// baseline pool หลังประเมินแล้ว — และเงื่อนไขเข้า pool ต้องไม่ใช่ตัวมันเองที่ถูก flag ด้วย (ไม่ใช่แค่
// isBaselineEligible เฉยๆ) ไม่งั้น clog ที่ลากยาวหลายวันจะค่อยๆ "ลาก" mean ของตัวเองตามจนระบบเลิกจับไปเอง
export function computeCausalStatDeviation(samples, opts = {}) {
    const windowSize = opts.windowSize ?? STAT_DEVIATION_WINDOW_SAMPLES;
    const minSamples = opts.minSamples ?? STAT_DEVIATION_MIN_SAMPLES;
    const sigmaK = opts.sigmaK ?? STAT_DEVIATION_SIGMA_K;

    const results = new Array(samples.length);
    const buf = new Array(windowSize); // ring buffer ขนาดคงที่ — เก็บเฉพาะค่าที่ผ่านเกณฑ์เข้า baseline pool
    let bufStart = 0, bufLen = 0, sum = 0, sumSq = 0;

    for (let i = 0; i < samples.length; i++) {
        const val = Number(samples[i].value);
        const validVal = !isNaN(val);

        if (validVal && bufLen >= minSamples) {
            const mean = sum / bufLen;
            const variance = Math.max(sumSq / bufLen - mean * mean, 0); // กัน float error ติดลบเล็กน้อย
            const std = Math.sqrt(variance);
            if (std > 0) {
                const z = (val - mean) / std;
                results[i] = { isStatDeviation: Math.abs(z) > sigmaK ? 1 : 0, zScore: z };
            } else {
                // baseline คงที่เป๊ะ (std=0) — ค่าใดๆที่ต่างจาก mean คือผิดปกติทันที ไม่ต้องหารด้วยศูนย์
                const dev = val !== mean;
                results[i] = { isStatDeviation: dev ? 1 : 0, zScore: dev ? Infinity * Math.sign(val - mean) : 0 };
            }
        } else {
            results[i] = { isStatDeviation: 0, zScore: null }; // cold-start หรือค่าไม่ใช่ตัวเลข
        }

        // เพิ่มเข้า baseline pool "หลังประเมินแล้ว" เท่านั้น และห้ามเป็นค่าที่ตัวมันเองถูก flag ด้วย
        if (validVal && samples[i].isBaselineEligible && results[i].isStatDeviation !== 1) {
            if (bufLen < windowSize) {
                buf[bufLen] = val; bufLen++;
            } else {
                sum -= buf[bufStart]; sumSq -= buf[bufStart] * buf[bufStart];
                buf[bufStart] = val;
                bufStart = (bufStart + 1) % windowSize;
            }
            sum += val; sumSq += val * val;
        }
    }
    return results;
}

export const SELECT_ALL_CAP = 300;
// V29.89 FIX: แยกจาก SELECT_ALL_CAP โดยตั้งใจ — เดิมสองอย่างนี้ผูกค่าเดียวกัน ทำให้ตอนเลือก Dashboard
// filter "All Time" ที่มี Abnormal สะสมเกิน 300 รายการ (เช่นสะสมมาเป็นปี) จะ render แค่ 300 รายการที่เก่า
// ที่สุด (list เรียงเก่า→ใหม่) ทำให้รายการล่าสุดไม่โผล่เลยแบบเงียบๆ — ตอนนี้ dashboard slice จากท้าย list
// แทน (ดู app-dashboard.js) ให้เหลือ "300 รายการล่าสุด" ไม่ใช่ "300 รายการเก่าที่สุด" ส่วนดูข้อมูลทั้งหมด
// จริงๆ ให้ไปหน้า History แทน (app-history.js) ซึ่งไม่มี cap นี้ (มี pagination ของตัวเอง)
export const DASHBOARD_RENDER_CAP = 300;
export const TABLE_RENDER_CAP = 350;
export const DEFAULT_TIME_BREAKDOWN_DAYS = 3; // V29.78 PERF: Time Breakdown bar shows only the N most recent distinct dates by default; older dates move to the "ดูวันที่เก่ากว่านี้" dropdown instead of rendering forever-growing buttons
export const RECURRING_ABNORMAL_THRESHOLD = 3; // V29.51 FEAT: min abnormal occurrences (all-time) before a tag gets the "recurring" badge
export const BACKUP_REMINDER_STALE_DAYS = 3; // V29.51 FEAT: prompt to back up if last backup is older than this (or never)
export const LS_LAST_BACKUP_KEY = 'plantLogAnalyzer_lastBackupAt';
export const LS_BACKUP_SNOOZE_KEY = 'plantLogAnalyzer_backupSnoozeUntil';

// V29.78 FEAT: auto-import จาก Excel Bridge (ดู excel-autoimport.js / app-core.js APP.pollAutoImport)
export const AUTOIMPORT_POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 นาที — ข้อมูลจริงเปลี่ยนแค่ 4 รอบ/วัน (03:00/09:00/15:00/21:00) ไม่ต้องถี่กว่านี้ และเว้นระยะพอสมควรลดโอกาสชนช่วง PI Datalink กำลังเขียนไฟล์
export const LS_AUTOIMPORT_LAST_MTIME_KEY = 'plantLogAnalyzer_autoImportLastMtime';

// V29.85 FIX: ป้องกัน pull-on-load (APP.init) ทับข้อมูล local ที่ยัง push ไป shared-db ไม่สำเร็จ (เช่น
// operator บันทึก remark ตอน Bridge ดับพอดี push ล้มเหลวเงียบๆ แล้ว reload หน้าเว็บก่อนมี mutation ครั้ง
// ใหม่มา retry ให้) — ตั้ง flag นี้ก่อนพยายาม push ทุกครั้ง แล้วเคลียร์เมื่อ push สำเร็จเท่านั้น ถ้า init
// เจอ flag นี้ค้างอยู่ ต้อง retry push ก่อน (ด้วยข้อมูล local ปัจจุบันที่ยังไม่ถูกแตะ) แล้วค่อย pull ทีหลัง
export const LS_SYNC_DIRTY_KEY = 'plantLogAnalyzer_syncDirty';
export const CANONICAL_TIMES = ['03:00', '09:00', '15:00', '21:00']; // รอบเวลาที่ PI Datalink ดึงค่าเข้ามาอัตโนมัติ

// V29.78 FEAT: เช็คว่าวันล่าสุดที่มีข้อมูล (dateStr) มีครบทั้ง 4 รอบเวลาหรือยัง — แทนที่ operator ต้องเปิด
// ไฟล์ Excel เช็คด้วยตาเอง ใช้ทั้งแสดงผล (chip ใน Dashboard) และตัดสินใจ trigger archive อัตโนมัติ
// V29.82 FIX: เดิม record ที่มี timeStr ตรงกับ CANONICAL_TIMES ถูกนับว่า "มีจริง" ทันทีที่เจอ แม้เวลานั้นยัง
// ไม่มาถึงจริงตามนาฬิกา — เพราะ excel-worker.js สร้าง timeStr จาก label โครงสร้างของแถว (regex ล้วนๆ) แยก
// อิสระจากค่า value ในเซลล์ ถ้าเซลล์ของรอบ 21:00 ดันมีค่า (เช่น 0 เปล่าๆ หรือค่าเก่าค้างจาก PI Datalink ที่ยัง
// ไม่ได้คำนวณใหม่) ก็จะได้ record ของ 21:00 ทั้งที่ยังไม่ถึง 21:00 จริง ทำให้ chip ขึ้นเขียว "ครบ 4 รอบ" ก่อนเวลา
// และลาม trigger auto-archive ก่อนที่ข้อมูลวันนั้นจะเสร็จจริง — แก้โดยเพิ่มเงื่อนไข "เวลานั้นต้องผ่านไปแล้วจริง"
// สำหรับวันที่ล่าสุด = วันนี้ (เทียบตามนาฬิกาเครื่อง); ถ้าวันที่ล่าสุด "อยู่ในอนาคต" เทียบกับนาฬิกา (date ผิด/
// นาฬิกาเครื่องคลาดเคลื่อน) ให้ถือว่ายังไม่มีรอบไหนจริงเลยแม้ record จะมี timeStr ตรงกันก็ตาม; วันที่ที่ผ่านไป
// แล้ว (ก่อนวันนี้) ไม่ต้อง gate ด้วยเวลา — ถ้ามี record ครบ 4 เวลาก็ถือว่าครบเสมอ ไม่ขึ้นกับ now
export function getCanonicalTimesStatus(records, now = new Date()) {
    if (!records || records.length === 0) return { dateStr: null, missingTimes: [...CANONICAL_TIMES], isComplete: false };

    // หา dateStr ล่าสุด (รูปแบบ DD/MM/YYYY) — เทียบแบบ reverse เป็น YYYYMMDD ให้ sort ตามเวลาจริงถูกต้อง
    let latestDateStr = null, latestKey = '';
    records.forEach(r => {
        if (!r.dateStr) return;
        const key = r.dateStr.includes('/') ? r.dateStr.split('/').reverse().join('') : r.dateStr;
        if (key > latestKey) { latestKey = key; latestDateStr = r.dateStr; }
    });
    if (!latestDateStr) return { dateStr: null, missingTimes: [...CANONICAL_TIMES], isComplete: false };

    const timesPresent = new Set(records.filter(r => r.dateStr === latestDateStr).map(r => r.timeStr));

    const todayKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const nowHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let missingTimes;
    if (latestKey > todayKey) {
        missingTimes = [...CANONICAL_TIMES]; // วันที่ล่าสุดยังไม่มาถึงจริงตามนาฬิกา — ไม่นับว่ามีรอบไหนจริงเลย
    } else if (latestKey === todayKey) {
        missingTimes = CANONICAL_TIMES.filter(t => !timesPresent.has(t) || nowHHMM < t);
    } else {
        missingTimes = CANONICAL_TIMES.filter(t => !timesPresent.has(t)); // วันที่ผ่านไปแล้ว ไม่ gate ด้วยเวลา
    }
    return { dateStr: latestDateStr, missingTimes, isComplete: missingTimes.length === 0 };
}

// V29.89 FEAT: History view (app-history.js) + Export (app-export.js) — เปรียบเทียบ dateStr (รูปแบบ
// DD/MM/YYYY จาก excelSerialToDateStr หรือ import อื่นๆ) กับ date-range ที่ operator เลือกผ่าน
// <input type="date"> (รูปแบบ YYYY-MM-DD ของ HTML เอง ไม่มีขีดหลัง .replace(/-/g,'')) โดยแปลงทั้งคู่เป็น
// key แบบ YYYYMMDD สำหรับเทียบ string ตรงๆ ได้ (เรียงตามเวลาจริงถูกต้อง) — ตรรกะเดียวกับที่ใช้กระจายอยู่
// ในหลายจุดของโค้ด (getCanonicalTimesStatus, dashboard sortedKeys) แต่แยกเป็น helper ให้เรียกซ้ำได้ ไม่
// duplicate logic เพิ่มอีกจุด
export function dateStrToKey(dateStrVal) {
    if (!dateStrVal) return '';
    return dateStrVal.includes('/') ? dateStrVal.split('/').reverse().join('') : dateStrVal;
}

// fromKey/toKey เป็น YYYYMMDD string หรือ null/'' (=ไม่จำกัดขอบด้านนั้น)
export function isDateInRange(dateStrVal, fromKey, toKey) {
    const key = dateStrToKey(dateStrVal);
    if (fromKey && key < fromKey) return false;
    if (toKey && key > toKey) return false;
    return true;
}

export const HISTORY_DEFAULT_DAYS = 30; // V29.89 FEAT: หน้า History เปิดครั้งแรกโชว์ 30 วันล่าสุด ไม่ใช่ทั้งหมด กันโหลด/render ช้าตอนข้อมูลสะสมเยอะ
export const HISTORY_PAGE_SIZE = 50;    // V29.89 FEAT: จำนวนแถวต่อหน้าในตาราง History (pagination)

// V29.56 FEAT: ขยายความสูง textarea ให้พอดีกับเนื้อหา แทนที่จะให้เลื่อน scroll ทีละบรรทัด
export function autoResizeTextarea(el) {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 320) + 'px'; // cap ~320px กันกรณีเนื้อหายาวผิดปกติ เกินจากนี้ scroll ในกล่องเอง
}

// V29.57 FEAT: แปลวลีอังกฤษที่ซ้ำบ่อยในคู่มือ MPS เป็นไทย (เฉพาะ pattern ที่มั่นใจว่าแปลถูก) เก็บ tag code ไว้เป็นอังกฤษเดิม
const TAG_CODE = '[A-Z][A-Za-z0-9\\-\\/]*(?:\\s*\\([A-Za-z]\\))?(?:\\s*(?:and|,)\\s*[A-Z][A-Za-z0-9\\-\\/]*(?:\\s*\\([A-Za-z]\\))?)*';
const verbCase = (w) => `[${w[0].toUpperCase()}${w[0].toLowerCase()}]${w.slice(1)}`;
const COMMON_PHRASES = [
    [new RegExp(`${verbCase('compare')} the indication on (${TAG_CODE}) with that on (${TAG_CODE})`, 'g'), 'เทียบค่าที่ $1 กับ $2'],
    [new RegExp(`${verbCase('check')} the indication on (${TAG_CODE}) with that on (${TAG_CODE})`, 'g'), 'ตรวจสอบค่าที่ $1 เทียบกับ $2'],
    [new RegExp(`${verbCase('compare')} the indication (?:of|on) (${TAG_CODE})`, 'g'), 'เทียบค่าที่ $1'],
    [new RegExp(`${verbCase('check')} the indication on (${TAG_CODE})`, 'g'), 'ตรวจสอบค่าที่ $1'],
    [new RegExp(`${verbCase('check')} the working condition of (${TAG_CODE})`, 'g'), 'ตรวจสอบสภาพการทำงานของ $1'],
    [new RegExp(`${verbCase('confirm')} that (${TAG_CODE}) is functioning properly`, 'g'), 'ยืนยันว่า $1 ทำงานปกติ'],
    [new RegExp(`${verbCase('switch')} (${TAG_CODE}) over to the stand-by side`, 'g'), 'สลับ $1 ไปฝั่งสำรอง'],
    [/[Ss]witch the operation over to the Recycle Solvent Run/g, 'สลับการทำงานไปที่ Recycle Solvent Run'],
    [new RegExp(`${verbCase('adjust')} the flow rate of (${TAG_CODE})`, 'g'), 'ปรับอัตราการไหลของ $1'],
];
function translateCommonPhrases(text) {
    let out = text;
    COMMON_PHRASES.forEach(([re, replacement]) => { out = out.replace(re, replacement); });
    return out;
}

// V29.55 FEAT: แยก action text จากคู่มือเป็น bullet สั้นๆ ตามเลขวงกลม (①②③...) ที่คู่มือใช้เป็น step marker อยู่แล้ว
// แล้วแยกต่อทีละประโยคถ้า step หนึ่งมีหลายประโยคมัดรวมกัน พร้อมตัดคำฟุ่มเฟือยที่ไม่กระทบความหมาย
export function formatCountermeasureAction(action) {
    const cleaned = translateCommonPhrases(action)
        .replace(/\bto be sure that\b/gi, 'that')
        .replace(/\s+in the field\b/gi, '')
        .replace(/\s+\./g, '.')
        .replace(/\s{2,}/g, ' ')
        .trim();

    // แยก step เฉพาะเลขวงกลมที่เป็นจุดเริ่ม step จริง (ต้นข้อความ / หลังจบประโยค / หลัง group marker "a)-")
    // ไม่แยกที่เลขวงกลมซึ่งถูกอ้างอิงกลางประโยค เช่น "the items ① and ② above"
    const stepBoundary = /(?:^|(?<=[.;]\s)|(?<=\)-))(?=[①②③④⑤⑥⑦⑧⑨⑩])/;
    const steps = cleaned.split(stepBoundary).map(s => s.trim()).filter(Boolean);
    if (steps.length > 1 && !/^[①②③④⑤⑥⑦⑧⑨⑩]/.test(steps[0])) {
        const prefix = steps.shift();
        steps[0] = prefix + steps[0];
    }

    // แยก step ที่มีหลายประโยคมัดรวมกันออกเป็น bullet ย่อย โดยไม่ตัดเนื้อหา แค่จัดบรรทัดใหม่
    const bullets = [];
    steps.forEach(step => {
        const parts = step.split(/([.;])\s+(?=[A-Z])/);
        for (let i = 0; i < parts.length; i += 2) {
            const sentence = (parts[i] + (parts[i + 1] || '')).trim();
            if (sentence) bullets.push(sentence);
        }
    });

    if (bullets.length <= 1) return cleaned;
    return bullets.map(s => `• ${s}`).join('\n');
}
