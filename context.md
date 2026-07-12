# context.md

Domain and business background for this repository. `CLAUDE.md`/`AGENTS.md` cover how the code works; this file covers why it works that way.

## Who this is for

A single-operator (or small-team) tool used by plant/machine monitoring engineers at an industrial site to process shift log sheets — Excel/CSV exports from a plant's SCADA or monitoring system listing instrument readings (PV/MV/SV) taken at intervals throughout a shift. The primary user works in Thai and reviews readings against normal operating ranges to catch abnormal parameters, annotate them with corrective-action remarks, and hand a summary to the next shift.

## Glossary

- **Tag / Tag No.** — an instrument tag number, e.g. `VI-2401A`, `FI-2407`, `TI-2405`. Globally unique within the plant by convention.
- **Machine** — the equipment/sheet grouping a tag belongs to, e.g. `PM-401A`, `PM-401B`. Combined with tag number and param type to form a tag's identity (`machine_tagNo_paramType`) so the same tag number reused on different equipment doesn't collide.
- **PV / MV / SV** — Process Value / Measured Value / Set Value — the parameter type read alongside a tag number.
- **Norm / Limit** — the acceptable operating range for a tag (min/max, or an exact required value), normally parsed from a "Normal"/"Limit" row in the imported sheet.
- **Standby** — an instrument or piece of equipment that is not currently running. Its reading is often near-zero, but not always (see forced Standby below) — a Standby reading should not be reported as an abnormal alarm.
- **Master override** — an operator-entered correction to a tag's limits/behavior (via the "Master" tab), used when the Excel-derived data is wrong, missing, or needs special handling.
- **Infographic Report** — the exported JPG shift-handover summary built from a hand-picked set of abnormal (or otherwise selected) parameters.

## Notable feature decisions (most recent first)

- **"เลือกทั้งหมด" (Select All) + removal of the 10-item report cap.** Operators previously could select at most 10 parameters into the Infographic Report before hitting an alert; there was also no way to select everything in one click. The user confirmed they sometimes want to put the entire current filtered list into one report, so the cap was removed system-wide and a "Select All" button was added that selects everything currently visible under the active View/Time filter.
- **Clearing the database no longer wipes Tag definitions.** "ล้างฐานข้อมูล" (Clear Database) used to clear both `Records` (shift readings) and `Tags` (the Excel-derived tag/limit catalog), forcing a re-import just to get limits back in the Tags/Master tabs. It now only clears `Records`; `Tags` and `MasterTags` persist and get upserted on the next import. (Master overrides were never cleared by this button in the first place — that part was already correct.)
- **Per-tag "Force Standby" override.** Some equipment (e.g. `PM-401A` / `PM-401B`) sits idle for a shift, but its instruments (e.g. `VI-2401A`, a vibration sensor) don't read near true zero when idle — they show sensor baseline noise (e.g. ~13 against a norm of 20-100), which the existing near-zero "zero shield" heuristic doesn't catch. Rather than widen that heuristic globally (risking false negatives on genuinely abnormal readings elsewhere), a manual per-tag override (`master.forceStandby`) was added in the Master tab so an operator can flag a specific tag as Standby regardless of its value, until unflagged.
- **Removed the "Smart Shift Executive Summary" card from the Infographic Report.** This was a template-generated Thai paragraph summarizing the shift (via `SMART_AGENT.generateShiftSummary`, rule-based text, not a real AI call). The user asked to drop it from the report entirely; the dead code path was removed along with the UI.

## Where to go for more detail

- `CLAUDE.md` / `AGENTS.md` — architecture, module responsibilities, and where in the code each of the above lives.
- `git log` — every change above corresponds to a dedicated commit with a fuller message.
