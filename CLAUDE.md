# FinWise – notes for Claude

## What this is
A single-page web app for young Indonesians with three main functions, which are also the main menu:
1. Asesmen Pinjaman: CEK (financial health) → PILAH (choose a safe, legal loan) → PULIH (get out of debt). It is shown as one route with a step bar (`journeyBar()` in `src/app/00_core.js`).
2. Database Pinjol (`#openspace`, OJK legality lookup).
3. Kalkulator.

The game ("Lolos Jebakan Pinjol", menu "Game", route `#main`) is an extra, ±5 minutes: Ronde Insting (6 kilat cards in `src/app/66_kilat.js`: tap, slider, or blocks, 10 s each, timer can be switched off) → "Sebulan Bertahan" (`68_sebulan.js`: one month as Dimas told as phone notifications, with envelope, fund-block, slider and red-flag mini-games; every figure from `FW` on a copy of his profile, compared with the safest path; long explanations sit behind "Kenapa?") → Ronde Final (the same cards) → feedback. Gate 1 fields are kept; records carry `instr: 2` (kilat scores 0/0.5/1), older records (`instr` 1) are scored against `DATA.quiz`. The 60-second "Legal atau ilegal?" (`69_legal.js`) uses names only from the OJK and Satgas PASTI lists. The hero image is `src/img/hero.webp` (copied to `docs/img/` by build.py); the step illustrations are hand-made inline SVG (`STAGE_ART` in `src/app/10_home.js`), and the icons are in `ICONS` in `00_core.js`. It is built from `src/` into one self-contained file, `docs/index.html`, which GitHub Pages serves.

## Build and test
- `python3 build.py` writes `docs/index.html`. Always rebuild after editing `src/`, and commit `src/` and `docs/` together.
- `python3 tests/e2e.py --axe` fills "Data saya", visits every page, prints the ratios, runs axe (WCAG 2.2 AA), and checks for horizontal scroll at 390 px. Keep it at 0 axe violations and no JS errors.
- Modules in `src/app/` are concatenated in file-name order inside one closure. Routing is hash-based, with plain ASCII hash names (`#cek`, `#pilah`, `#pulih`, `#openspace`, `#main`, …).

## Conventions
- UI copy is Indonesian, plain and casual ("kamu"). Every hard term gets a "?" button wired to the `TERMS` glossary in `src/app/00_core.js`.
- "Data saya" starts empty. Never prefill answers or add example personas to the form.
- The engine computes every number. AI (claude.ai artifact only, via `window.claude.use('sample')`) may only explain numbers it is given, and a rule-based fallback must always render.
- `data/raw/` is never committed: it holds raw Google Play reviews with reviewer names. Only aggregated data goes into `src/realdata.js`.
- Do not name or link to illegal lending apps beyond what the Satgas PASTI list states. Do not show developers' personal names.

## Core rule: CEK describes, PILAH decides, PULIH acts, nothing is locked
- **CEK** is the present only: Kondisi keuangan (8 indicators, the hero), money in and out, the debts already there (`debtChecks` benchmarks + `loanAnalysis` per loan), emergency fund and savings, and the plan. It never shows the borrowing verdict. The header chip shows the health status.
- **PILAH** order: 1 Rencana (purpose, amount, tenor, urgency in one form) → 2 Dampaknya (instalment, Porsi cicilan, Sisa uang, zone, `readyCard` with `FW.readiness`, levers, and an offer of the safe amount) → 3 Pinjam lebih sedikit (optional fund ladder) → 4 Bandingkan pinjol.
  - Nothing is locked. Risk is a warning above the content (`pilahWarn`). The single exception is gambling (`isJudi`).
  - The list holds licensed pindar only. Bank (KTA), koperasi, the database's cheapest and median pindar, and the OJK cap are reference prices in `benchCard`, each cited (`BENCH` in `40_pilah.js`).
  - The safe amount is applied only when the user presses it (`S.pilah.cap`).
- `FW.readiness(p)` levels: 0 "Belum bisa berutang", 1 "Hanya untuk darurat", 2 "Boleh, dengan batas", 3 "Siap berutang dengan sehat"; names and colours in `READY` (`00_core.js`). Shown on PILAH step 2, as the strip on Kalkulator, and in the phone summary on PILAH/Kalkulator.
- `FW.headroom(p).ceiling` is the safe instalment, after protecting planned monthly saving. `FW.maxSafeLoan(p, months)` converts it into a loan size at ±1.5%/month.
- Never write "paling cocok" or "Ajukan tepat" for an option in the Bahaya zone. When every option is red, the result is "pilihan yang paling sedikit merugikan", sorted by the smallest monthly shortfall.
- The health score keeps 8 indicators (FinHealth), and a monthly deficit always reads "Rentan". It is labelled "Kondisi keuangan" on screen.
- Emergency fund months are the fund ÷ total monthly outflow, including instalments (Cia's benchmark).
- In PULIH, interest is only simulated for loans whose rate the user entered. Otherwise the instalments already include it.
- One vocabulary: Porsi cicilan, Sisa uang, Total dikembalikan, Pinjaman maksimal yang aman, Kesiapan berutang.
- OJK caps follow SEOJK 19/SEOJK.06/2025 (`FW.ojkCap`): konsumtif 0,3%/day (≤6 months) or 0,2% (>6); produktif up to Rp50 jt 0,275% (≤6 months) or 0,1%; above Rp50 jt 0,1%; total ≤100% of principal.
- Kalkulator defaults to the cheapest licensed lender in the database at its RIPLAY maximum (`cheapestReal` in `35_kalkulator.js`, real lenders only, never the illegal list); the OJK cap is shown as the worst case.
- Danamas is productive-only in the data: its published rate is for Dana Usaha; the Dana Tunai rate is not in the team sheet.

## Storage and moving data
- `finwise:saya` holds "Data saya"; `finwise:history` holds one small snapshot per day the data is saved (`recordCheck` in `src/app/27_history.js`), which CEK uses for "Dibanding cek …". Deleting "Data saya" clears both.
- "Unduh data (.json)" exports `{ app: 'FinWise', kind: 'data-saya', v: 1, profile, history }`. Import passes the file through `plainData` (plain values only, bounded sizes, no prototype keys) and `wizFinalize`, and refuses anything without income.
- The home page asks "Apa yang kamu butuhkan sekarang?"; `S.intent` sends a new user to PILAH or PULIH after the form instead of CEK.

## Open work (after P2, 14 Nov 2026)
- **Later:** accounts and a database (Supabase with Google login, row-level security, an anonymous research snapshot with explicit consent per UU PDP / PP 33/2026, and a team dashboard).
- Ideas not yet scheduled: a deeper restyle of the Database Pinjol pages, and removing the old PILAH test-mode code paths (`ctx.test`, `t-step`, `t-pick`) now that the game no longer uses PILAH.
