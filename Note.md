# 📋 คู่มือการย้ายระบบ Plant Log Analyzer ไปยัง PC เครื่องใหม่ (PC Migration Guide)

> **กำหนดการเปลี่ยนเครื่อง:** วันที่ 30 ตุลาคม 2026  
> **ผู้ใช้งาน:** พี่ A (`PTTGC\26007294`) — Process/Production Engineer, GC-M PTA  
> **โปรเจกต์:** Plant Log Analyzer (เวอร์ชันปัจจุบัน V29.132)  
> **Production URL:** [https://monitor-log-sheet-boardman.supasiao.workers.dev](https://monitor-log-sheet-boardman.supasiao.workers.dev)  
> **GitHub Repository:** [https://github.com/supasiao7896TH/Monitor-log-sheet-boardman](https://github.com/supasiao7896TH/Monitor-log-sheet-boardman)

---

## 🎯 ภาพรวมและเป้าหมาย
เพื่อให้การใช้งานระบบเฝ้าระวังพารามิเตอร์โรงงาน (Plant Log Analyzer) และระบบ Local Bridge ที่ควบคุม Excel PI DataLink บนเครื่องใหม่ ทำงานได้อย่างต่อเนื่อง **ไร้รอยต่อ 100% (Zero-Downtime)** โดยที่ข้อมูลประวัติและสูตรใน Excel ไม่สูญหาย

---

## 📦 ขั้นตอนที่ 1: เตรียมการก่อนส่งมอบเครื่องเก่า (วันที่ 28–29 ต.ค. 2026)

ให้สำรองข้อมูล 3 ส่วนสำคัญนี้ไว้ใน **OneDrive ของบริษัท (`OneDrive - PTT Global Chemical Public Company Limited`)** หรือสำรองใส่ **External Flash Drive / USB**:

### 1.1 ดาวน์โหลด Backup จาก Web App (1 คลิก)
1. เปิด Web App: [https://monitor-log-sheet-boardman.supasiao.workers.dev](https://monitor-log-sheet-boardman.supasiao.workers.dev)
2. ไปที่เมนู "ตั้งค่า / สำรองข้อมูล" ➔ กดปุ่ม **"สำรองข้อมูล" (Backup Data)**
3. จะได้ไฟล์ชื่อ `PlantLogAnalyzer_Backup_<วันที่>.json` ให้เก็บไฟล์นี้ไว้ใน OneDrive

### 1.2 สำรอง 2 โฟลเดอร์หลักบนไดรฟ์ `D:\`
ก๊อปปี้ทั้ง 2 โฟลเดอร์นี้ไปเก็บไว้ใน OneDrive หรือ External Drive:
- 📁 `D:\Monitor log sheet boardman` *(ขนาด ~107 MB: ซอร์สโค้ด, โมดูล Bridge, และ Shared Database)*
- 📁 `D:\PTA COMMONT WORK\Log sheet Digital` *(ขนาด ~12 MB: ไฟล์ Log Sheet สดและ Archive ย้อนหลังทั้งหมด)*

> 💡 **หมายเหตุ:** โค้ดเวอร์ชันล่าสุด V29.132 ได้ถูก `git push` สำรองไว้บน GitHub เรียบร้อยแล้ว

---

## 🛠️ ขั้นตอนที่ 2: สิ่งที่ต้องแจ้งเจ้าหน้าที่ IT ตอนตั้งค่าเครื่องใหม่

แจ้งข้อกำหนดทางเทคนิคให้ช่าง IT ทราบล่วงหน้า:

1. **ขอให้แบ่ง Partition ไดรฟ์ `D:\` (Fixed Disk):** *(สำคัญที่สุด!)*
   - เนื่องจากระบบไฟล์ Log Sheet, สคริปต์ Background และสูตรเชื่อมโยงใน Excel อ้างอิง Path บนไดรฟ์ `D:\`
2. **ติดตั้ง Microsoft Office & OSIsoft PI DataLink:**
   - ติดตั้ง Excel พร้อม Add-in **"PI DataLink"**
   - *วิธีตรวจสอบ:* เปิด Excel เปล่าขึ้นมา ต้องมีแท็บ **"PI DataLink"** ปรากฏบน Ribbon ด้านบน
3. **ติดตั้ง Software Dependencies:**
   - ติดตั้ง **Git for Windows**
   - ติดตั้ง **Node.js (LTS version)** *(สามารถใช้ไฟล์ติดตั้ง `D:\node-v24.19.0-x64.msi` ที่สำรองไว้ได้เลย)*

---

## 🚀 ขั้นตอนที่ 3: ขั้นตอนการตั้งค่าบนเครื่องใหม่ (วันที่ 30 ต.ค. 2026)

เมื่อได้รับ PC เครื่องใหม่และเข้าสู่ระบบด้วย Windows User พี่ A (`26007294`) เรียบร้อยแล้ว:

### 3.1 วางโฟลเดอร์กลับตำแหน่งเดิม
นำ 2 โฟลเดอร์ที่สำรองไว้มาวางที่ Path เดิมเป๊ะๆ:
- `D:\Monitor log sheet boardman`
- `D:\PTA COMMONT WORK\Log sheet Digital`

### 3.2 เชื่อมต่อ OneDrive และสร้าง Shortcut ไปยัง SharePoint
1. ล็อกอินโปรแกรม OneDrive บนเครื่องด้วยอีเมลบริษัท `26007294@pttgcgroup.com`
2. เปิดเบราว์เซอร์ไปยัง SharePoint แผนก PE:
   `https://pttgcgroup.sharepoint.com/sites/GCMPIntranet/pe/SitePages/Home.aspx?RootFolder=%2Fsites%2FGCMPIntranet%2Fpe%2FPEDoc%2F02%20-%20Plant%201%2FLog%20sheet%20digital%20PTA%231`
3. คลิกเข้าไปในโฟลเดอร์ `Log sheet digital PTA#1` ➔ กดปุ่ม **"Add shortcut to OneDrive"**
4. ตรวจสอบว่าในเครื่องมีโฟลเดอร์นี้ปรากฏขึ้นมา:
   `C:\Users\26007294\OneDrive - PTT Global Chemical Public Company Limited\Shortcuts\Production - PE Documents\02 - Plant 1\Log sheet digital PTA#1`

---

### 3.3 คำสั่ง PowerShell ตั้งค่าอัตโนมัติ (One-Click Setup)
เปิดโปรแกรม **PowerShell** (ไม่ต้องเป็น Admin) แล้ว Copy คำสั่งบล็อกนี้วางแล้วกด Enter:

```powershell
# 1. ตั้งสิทธิ์ NTFS ให้ Operator กะอื่นบนเครื่อง Shared PC อ่านและรันไฟล์ได้
icacls "D:\Monitor log sheet boardman" /grant "BUILTIN\Users:(OI)(CI)RX" /T

# 2. ลงทะเบียน Custom URI Protocol (plantlogbridge://) เพื่อให้ปุ่มบน Web App สั่งเปิด Bridge ได้
reg import "D:\Monitor log sheet boardman\bridge\register-protocol.reg"

# 3. ตั้งค่า Windows Task Scheduler ให้เปิด Excel Bridge อัตโนมัติทุกครั้งที่พี่ A ล็อกอินเข้า Windows
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument '-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File "D:\Monitor log sheet boardman\bridge\excel-bridge.ps1"'
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
Register-ScheduledTask -TaskName "Plant Log Analyzer - Excel Bridge" -Action $action -Trigger $trigger -Description "Auto-start Excel Bridge on login" -Force
```

---

### 3.4 ทดสอบและตรวจสอบความพร้อม (Smoke Test Checklist)

1. [ ] **เปิด Bridge ทดสอบ:**
   - ดับเบิลคลิกไฟล์ `D:\Monitor log sheet boardman\bridge\start-bridge.bat`
   - หน้าต่าง Console จะรายงานสถานะว่า Listener เริ่มทำงานที่ Port 5175
2. [ ] **เปิด Web App:**
   - เข้าลิงก์ [https://monitor-log-sheet-boardman.supasiao.workers.dev](https://monitor-log-sheet-boardman.supasiao.workers.dev)
   - แถบสถานะด้านล่างของ Web App ต้องขึ้นสีเขียว: **"SHARED MODE (SYNCED)"**
3. [ ] **ทดสอบเปิดไฟล์ Log Sheet ใน Excel:**
   - เปิดไฟล์ `D:\PTA COMMONT WORK\Log sheet Digital\P1-F-2002-22 (..-..-26) (Digital).xlsm`
   - ตรวจดูว่าสูตร PI DataLink คำนวณค่าได้ถูกต้อง ไม่ขึ้น `#NAME?`
4. [ ] **ทดสอบซิงก์ SharePoint:**
   - เช็คว่าไฟล์ Log Sheet สดของวันนั้นถูกซิงก์เข้าไปยังโฟลเดอร์เดือน (เช่น `10.Oct'26`) ใน OneDrive Shortcut เรียบร้อย

---

## 🔧 แนวทางการแก้ไขปัญหาหน้างาน (Troubleshooting)

| อาการที่อาจพบ | สาเหตุ | วิธีแก้ไข |
|---|---|---|
| **Web App ขึ้นสถานะ LOCAL MODE** | Excel Bridge ยังไม่ได้รัน หรือ Task Scheduler ยังไม่เริ่ม | ดับเบิลคลิก `D:\Monitor log sheet boardman\bridge\start-bridge.bat` หรือกดปุ่ม "เปิด Excel Bridge" ในหน้าเว็บ |
| **สูตรใน Excel ขึ้น `#NAME?` ทั้งหมด** | Add-in PI DataLink ไม่โหลดเข้า Excel | ปิด Excel ทั้งหมด ➔ เปิด Excel ใหม่จาก Shortcut บน Desktop ➔ ตรวจดูว่ามีแท็บ "PI DataLink" ขึ้นที่ Ribbon ก่อนเปิดไฟล์ Log Sheet |
| **เปิด Bridge แล้วหน้าต่างเด้งปิดทันที** | มี Bridge อีกตัวรันค้างอยู่บน Port 5175 | เปิด Task Manager ➔ End Process `powershell.exe` ที่ค้างอยู่ แล้วลองเปิดใหม่อีกครั้ง |
| **ไฟล์ไม่ซิงก์ไปที่ SharePoint** | ยังไม่ได้กด Add Shortcut ใน OneDrive | ทำตามข้อ 3.2 ซ้ำอีกครั้ง และตรวจดูว่าสถานะ OneDrive ที่มุมขวาล่างของ Windows กำลังทำงานอยู่ |

---
*เอกสารนี้สร้างขึ้นเมื่อวันที่ 09/10/2026 โดย Assistant เพื่อการย้ายเครื่องของพี่ A*
