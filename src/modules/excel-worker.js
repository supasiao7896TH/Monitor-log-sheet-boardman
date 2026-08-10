import { isValidDayMonth, parseNum, excelSerialToDateStr, cleanStr, excelSerialToTime, getTagId, NEIGHBOR_COLUMN_VALIDITY_THRESHOLD } from './shared.js';

export const EXCEL_WORKER = {
            // V29.71 FEAT: แปลง 0-based column index เป็นตัวอักษรคอลัมน์ Excel (0->A, 25->Z, 26->AA)
            // ใช้คำนวณ cellRef ของแต่ละ record เพื่อให้ฟีเจอร์ sync remark กลับไฟล์ Excel รู้ตำแหน่ง cell ที่แท้จริง
            colIdxToLetter: (idx) => {
                let n = idx, letter = '';
                while (n >= 0) {
                    letter = String.fromCharCode((n % 26) + 65) + letter;
                    n = Math.floor(n / 26) - 1;
                }
                return letter;
            },

            parseCSV: (text) => {
                let ret = [], inQuote = false, value = '';
                for (let i = 0; i < text.length; i++) {
                    let char = text[i];
                    if (char === '"') {
                        // V29.65 FIX: รองรับ RFC4180 escaped-quote ("" ภายใน field ที่ quote ไว้ = quote ตัวเดียว
                        // ตามตัวอักษร) — เดิมไม่รองรับ ทำให้ cell ที่มี quote ฝังอยู่ (เช่น remark แบบ
                        // "Valve ""A"" closed") นับ quote เพี้ยนจน column หลังจากนั้นเลื่อนผิดตำแหน่งทั้งแถว
                        if (inQuote && text[i + 1] === '"') { value += '"'; i++; }
                        else { inQuote = !inQuote; }
                    }
                    else if (char === ',' && !inQuote) { ret.push(value); value = ''; }
                    else { value += char; }
                }
                ret.push(value);
                return ret;
            },

            normalizeYear: (yStr) => {
                let y;
                if (yStr.length === 2) {
                    let n = parseInt(yStr, 10);
                    y = (n <= 49) ? (2000 + n) : (2500 + n - 543);
                } else {
                    y = parseInt(yStr, 10);
                    if (y > 2500) y -= 543;
                }
                return y;
            },

            extractGlobalDate: (lines, fileName) => {
                let fileDateMatch = fileName.match(/\b(\d{1,2})[\.\-\/](\d{1,2})[\.\-\/](\d{2,4})\b/);
                if (fileDateMatch) {
                    let dd = parseInt(fileDateMatch[1], 10), mm = parseInt(fileDateMatch[2], 10);
                    let yNum = EXCEL_WORKER.normalizeYear(fileDateMatch[3]);
                    if (isValidDayMonth(dd, mm, yNum)) {
                        let d = fileDateMatch[1].padStart(2, '0');
                        let m = fileDateMatch[2].padStart(2, '0');
                        return `${d}/${m}/${yNum}`;
                    }
                }

                for (let i = 0; i < Math.min(20, lines.length); i++) {
                    let cols = EXCEL_WORKER.parseCSV(lines[i]);
                    for (let c = 0; c < cols.length; c++) {
                        let txt = (cols[c] || '').trim();
                        if (!txt) continue;

                        let m1 = txt.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
                        if (m1) {
                            let dd = parseInt(m1[1]), mm = parseInt(m1[2]);
                            let yNum = EXCEL_WORKER.normalizeYear(m1[3]);
                            if (isValidDayMonth(dd, mm, yNum)) {
                                return `${m1[1].padStart(2, '0')}/${m1[2].padStart(2, '0')}/${yNum}`;
                            }
                        }

                        let lowerTxt = txt.toLowerCase();
                        if (lowerTxt.includes('date') || lowerTxt.includes('วันที่')) {
                            for (let nextC = c + 1; nextC <= c + 5 && nextC < cols.length; nextC++) {
                                let nextTxt = (cols[nextC] || '').trim();
                                if (!nextTxt) continue;

                                let nm = nextTxt.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})\b/);
                                if (nm) {
                                    let ndd = parseInt(nm[1], 10), nmm = parseInt(nm[2], 10);
                                    let yNum = EXCEL_WORKER.normalizeYear(nm[3]);
                                    // V29.67 FIX: จุดนี้เดิมไม่เช็ค isValidDayMonth เลย ต่างจากอีก 2 จุดข้างบน
                                    if (isValidDayMonth(ndd, nmm, yNum)) {
                                        return `${nm[1].padStart(2, '0')}/${nm[2].padStart(2, '0')}/${yNum}`;
                                    }
                                }
                                
                                let n = parseNum(nextTxt);
                                let serialDate = excelSerialToDateStr(n, nextTxt);
                                if (serialDate) return serialDate;
                            }
                        }
                    }
                }

                for (let i = 0; i < Math.min(50, lines.length); i++) {
                    let cols = EXCEL_WORKER.parseCSV(lines[i]);
                    for (let c = 0; c < cols.length; c++) {
                        let txt = (cols[c] || '').trim();
                        if (!txt) continue;
                        let n = parseNum(txt);
                        let serialDate = excelSerialToDateStr(n, txt);
                        if (serialDate) return serialDate;
                    }
                }

                return null;
            },

            // V29.68 FIX: skipIdx (ปกติคือ activeTagsMap) กันไม่ให้คอลัมน์ที่รู้อยู่แล้วว่าเป็น tag/reading
            // (เช่น totalizer/flow value ที่บังเอิญตัวเลขอยู่ในช่วงเดียวกับ Excel-serial time) ถูกอ่านผิดเป็นเวลา
            extractTime: (cols, skipIdx = null) => {
                for(let c = 0; c < Math.min(30, cols.length); c++) {
                    if (skipIdx && skipIdx[c] !== undefined) continue;
                    let s = (cols[c] || '').toString().trim();
                    if(!s) continue;
                    
                    let mStrict = s.match(/^([01]?\d|2[0-4]):([0-5]\d)$/);
                    if(mStrict) return mStrict[1].padStart(2, '0') + ':' + mStrict[2];
                    
                    let n = parseNum(s);
                    if(!isNaN(n)) {
                        if (n > 40000 && n < 60000 && s.includes('.')) {
                            return excelSerialToTime(n);
                        }
                    }

                    if (c <= 2) {
                        let mLoose = s.match(/^([01]?\d|2[0-4])\.([0-5]\d)$/);
                        if(mLoose) return mLoose[1].padStart(2, '0') + ':' + mLoose[2];

                        if (!isNaN(n) && n > 0 && n < 1 && s.includes('.')) {
                            return excelSerialToTime(n);
                        }
                    }
                }
                return null;
            },
            
            processData: async (csvContent, sheetName, fileName, sharedDate, logger) => {
                const lines = csvContent.split(/\r\n|\n/);
                let tagsOut = [], recordsOut = [];
                let lastRowTime = null, tagCounter = 0;
                let activeTagsMap = {}; 
                let lastDescMap = {}; 

                for (let i = 0; i < lines.length; i++) {
                    if (i % 100 === 0) await new Promise(r => setTimeout(r, 0)); 
                    
                    let cols = EXCEL_WORKER.parseCSV(lines[i]);
                    if (cols.length === 0 || cols.every(c => !c.trim())) continue;

                    let nonEmptyCols = cols.filter(c => c.trim() !== '');
                    if (nonEmptyCols.length === 0) continue;
                    
                    // V29.69 FIX: เดิม join('') ก่อน cleanStr ทำให้คำจากคนละ cell ที่บังเอิญอยู่ติดกันเรียง
                    // ต่อกันเป็น keyword ปลอมได้ (เช่น cell ท้ายด้วย "...Nam" ต่อด้วย cell ที่ขึ้นต้น "e..."
                    // กลายเป็น "...name...") — cleanStr แยกทีละ cell ก่อน (ยังคง fuse คำภายใน cell เดียวกันไว้
                    // ตามเดิม เช่น "Tag No" -> "tagno" ซึ่งจำเป็นสำหรับ keyword ที่เช็คด้านล่าง) แล้วค่อย join
                    // ด้วย space จริงที่ไม่ถูกลบทิ้งซ้ำ
                    let headerDetectStr = nonEmptyCols.slice(0, 8).map(v => cleanStr(v)).join(' ');
                    // V29.69 FIX: ใช้ regex คงรักษา word boundary (แปลงเครื่องหมาย/ช่องว่างเป็น space เดียว)
                    // แทน cleanStr ที่ fuse ทุกคำในเซลล์เดียวกันเป็นก้อนเดียว — กันคำที่บังเอิญมี "min"/"max"
                    // เป็นส่วนหนึ่งของคำอื่น (เช่น "Maximum", "aluminum", "administrator") ถูกตีความผิดว่าเป็น
                    // label ที่ต้อง ignore ทั้งแถว
                    let firstColsForIgnore = nonEmptyCols.slice(0, 5).map(v => String(v).toLowerCase().replace(/[^a-z0-9]+/g, ' ')).join(' ');

                    if (headerDetectStr.includes('name') || headerDetectStr.includes('item') || headerDetectStr.includes('description')) {
                        lastDescMap = {};
                        cols.forEach((v, idx) => {
                            let cln = cleanStr(v);
                            if (v.trim() && cln !== 'name' && cln !== 'item' && cln !== 'description') {
                                lastDescMap[idx] = v.trim();
                            }
                        });
                        continue;
                    } 
                    
                    else if (headerDetectStr.includes('tagno') || headerDetectStr.includes('tagnumber') || (headerDetectStr.includes('tag') && headerDetectStr.replace(/ /g, '').length < 15)) {
                        activeTagsMap = {};
                        const ignore = ['time','date','shift','remark','tagno','tag','name','item','unit','normal'];
                        cols.forEach((v, idx) => {
                            let val = v.trim();
                            if (val.length >= 3 && val.length <= 30 && /[0-9]/.test(val)) {
                                let clnVal = cleanStr(val, true);
                                if (!ignore.includes(clnVal)) {
                                    tagCounter++;
                                    let pType = "PV";
                                    if (cols[idx-1]) {
                                        let prevCln = cleanStr(cols[idx-1], true);
                                        if (['pv','mv','sv','set'].includes(prevCln)) pType = cols[idx-1].trim().toUpperCase();
                                    }
                                    let tag = {
                                        machine: sheetName, tagNo: val, paramType: pType,
                                        description: lastDescMap[idx] || '', normalText: '',
                                        min: null, max: null, exactNum: null, sortIndex: tagCounter
                                    };
                                    activeTagsMap[idx] = tag;
                                    tagsOut.push(tag);
                                }
                            }
                        });
                        continue;
                    } 
                    
                    else if (headerDetectStr.includes('normal') || headerDetectStr.includes('norm') || headerDetectStr.includes('limit')) {
                        for (let idx in activeTagsMap) {
                            let normText = (cols[idx] || '').trim();
                            let normCln = cleanStr(normText, true);
                            if (normText && !normCln.includes('normal') && !normCln.includes('norm') && !normCln.includes('limit')) {
                                let tag = activeTagsMap[idx];
                                tag.normalText = normText;

                                let cleanTxt = normText.replace(/,/g, '').toLowerCase();
                                
                                let processedTxt = cleanTxt.replace(/\s*(to|ถึง|~|จนถึง)\s*/g, '|');
                                processedTxt = processedTxt.replace(/(?<=\d|\))\s*[-\u2013\u2014]\s*(?=-?\d|\()/g, '|');
                                
                                let parts = processedTxt.split('|');
                                let numbers = [];
                                for (let p of parts) {
                                    let m = p.match(/-?\d+(\.\d+)?/);
                                    if (m) numbers.push(parseFloat(m[0]));
                                }
                                
                                // V29.66 FIX: ใช้ word-boundary แทน substring match — เดิม includes('min')/includes('max')
                                // ทำให้คำที่บังเอิญมี "min"/"max" เป็นส่วนหนึ่งของคำอื่น (เช่น "minor", "aluminum")
                                // ถูกตีความผิดว่าเป็น limit label
                                const hasMinWord = /\bmin\b/.test(cleanTxt);
                                const hasMaxWord = /\bmax\b/.test(cleanTxt);

                                if (hasMinWord && hasMaxWord) {
                                    // V29.66 FIX: cell มีทั้ง Min และ Max ในก้อนเดียวกันแบบไม่มี range separator
                                    // เช่น "Min: 10 Max: 20" — เดิมดึงตัวเลขตัวแรกที่เจอมาตัวเดียวแล้วเข้า branch
                                    // max/min ตามลำดับ if/else แบบตายตัว ทำให้ค่าที่ 2 หายไปเงียบๆ และค่าแรกอาจถูก
                                    // ติดป้ายผิด (เช่นเจอ "10" ก่อนแต่ดันไปเข้า branch max)
                                    const minM = cleanTxt.match(/min\D*(-?\d+(?:\.\d+)?)/);
                                    const maxM = cleanTxt.match(/max\D*(-?\d+(?:\.\d+)?)/);
                                    if (minM) tag.min = parseFloat(minM[1]);
                                    if (maxM) tag.max = parseFloat(maxM[1]);
                                } else if (cleanTxt.includes('<') || hasMaxWord) {
                                    if (numbers.length > 0) tag.max = numbers[0];
                                } else if (cleanTxt.includes('>') || hasMinWord) {
                                    if (numbers.length > 0) tag.min = numbers[0];
                                } else if (numbers.length >= 2) {
                                    let v1 = numbers[0], v2 = numbers[1];
                                    tag.min = Math.min(v1, v2); tag.max = Math.max(v1, v2);
                                } else if (numbers.length === 1) { 
                                    tag.exactNum = numbers[0]; 
                                }
                            }
                        }
                        continue;
                    }
                    
                    else {
                        if (Object.keys(activeTagsMap).length === 0) continue;
                        
                        // V29.69 FIX: word-boundary แทน substring match (firstColsForIgnore ตอนนี้เป็น word-preserving แล้ว)
                        if (/\b(target|unit|alarm|remark|max|min)\b/.test(firstColsForIgnore)) {
                            continue;
                        }

                        let timeStr = EXCEL_WORKER.extractTime(cols, activeTagsMap);
                        
                        let validPvCount = 0;
                        let rowDataExtracted = {};
                        // V29.69 FIX: เดิม cell ข้างเคียงที่ถูก "ยืม" ไม่ถูก mark ว่าใช้แล้ว ทำให้ 2 tag ที่ค่า
                        // หายพร้อมกันในแถวเดียวกันอาจแอบยืมค่าเดียวกันซ้ำ (duplicate ค่าดิบเข้า 2 tag)
                        const consumedNeighborIdx = new Set();

                        for (let idxStr in activeTagsMap) {
                            let idx = parseInt(idxStr);
                            let tag = activeTagsMap[idx];

                            let vStr = (cols[idx] || '').trim();
                            let val = parseNum(vStr);

                            if (isNaN(val) || vStr === '') {
                                let leftIdx = idx - 1;
                                let rightIdx = idx + 1;

                                let leftStr = (cols[leftIdx] || '').trim();
                                let rightStr = (cols[rightIdx] || '').trim();

                                if (!activeTagsMap[leftIdx] && !consumedNeighborIdx.has(leftIdx) && leftStr !== '' && !isNaN(parseNum(leftStr))) {
                                    vStr = leftStr; val = parseNum(leftStr);
                                    consumedNeighborIdx.add(leftIdx);
                                } else if (!activeTagsMap[rightIdx] && !consumedNeighborIdx.has(rightIdx) && rightStr !== '' && !isNaN(parseNum(rightStr))) {
                                    vStr = rightStr; val = parseNum(rightStr);
                                    consumedNeighborIdx.add(rightIdx);
                                }
                            }

                            // V29.40 FIX: Strict Numeric Data Only! ไม่รับตัวอักษรใดๆ ทั้งสิ้น
                            if (!isNaN(val) && vStr !== '') {
                                validPvCount++;
                                rowDataExtracted[idx] = val;
                            }
                        }

                        if (!timeStr) {
                            if (validPvCount >= Math.max(1, Object.keys(activeTagsMap).length * NEIGHBOR_COLUMN_VALIDITY_THRESHOLD)) {
                                if (lastRowTime) {
                                    timeStr = lastRowTime;
                                } else {
                                    continue; 
                                }
                            } else {
                                continue; 
                            }
                        }

                        if (!timeStr || validPvCount === 0) continue;

                        if (timeStr) {
                            lastRowTime = timeStr;

                            let safeTimeStr = timeStr;
                            if (safeTimeStr.startsWith('24:')) safeTimeStr = '23:59';
                            let ts = new Date(sharedDate.split('/').reverse().join('-') + 'T' + safeTimeStr + ':00').getTime();
                            // V29.67 FIX: ถ้า sharedDate/timeStr ผิดรูปแบบจนได้ ts = NaN เดิมจะบันทึกค่านี้ต่อไปเงียบๆ
                            // จน sort ลำดับเวลา/trend chart เพี้ยนทั้งชีท — ข้าม row นี้แทนที่จะเก็บ timestamp ที่เสีย
                            if (isNaN(ts)) continue;

                            for (let idx in rowDataExtracted) {
                                let tag = activeTagsMap[idx];
                                let val = rowDataExtracted[idx];

                                const cleanTag = tag.tagNo.replace(/[^a-zA-Z0-9_]/g, '_');
                                const cleanMachine = sheetName.replace(/[^a-zA-Z0-9_]/g, '_');

                                // V29.71 FEAT: ตำแหน่ง cell จริงใน Excel ของ record นี้ — i (บรรทัด CSV) ตรงกับ
                                // Excel row เป๊ะๆ (sheet_to_csv ไม่ตัด blank row ทิ้ง) และ idx (คอลัมน์ CSV) ตรงกับ
                                // Excel column เป๊ะๆ เช่นกัน ใช้สำหรับ sync remark กลับไปเป็น cell comment ในไฟล์ต้นฉบับ
                                const sheetRow = i + 1;
                                const sheetCol = parseInt(idx, 10);
                                const cellRef = EXCEL_WORKER.colIdxToLetter(sheetCol) + sheetRow;

                                recordsOut.push({
                                    id: `rec_${cleanMachine}_${sharedDate}_${timeStr}_${cleanTag}_${tag.paramType}_${idx}`,
                                    machine: sheetName, tagNo: tag.tagNo, paramType: tag.paramType,
                                    dateStr: sharedDate, timeStr: timeStr, timestamp: ts,
                                    value: val,
                                    isAbnormal: 0, sortIndex: tag.sortIndex,
                                    remark: '', actionStatus: 'new',
                                    sheetRow, sheetCol, cellRef
                                });
                            }
                        }
                    }
                }

                const finalTagsMap = new Map();
                tagsOut.forEach(t => {
                    let key = getTagId(t);
                    if(finalTagsMap.has(key)) {
                        let ext = finalTagsMap.get(key);
                        if(t.normalText && !ext.normalText) Object.assign(ext, t);
                    } else finalTagsMap.set(key, t);
                });

                return { tags: Array.from(finalTagsMap.values()), records: recordsOut };
            }
        };
