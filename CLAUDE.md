# FinWise – notes for Claude

## What this is
A single-page web app for young Indonesians with three main functions, which are also the main menu:
1. Asesmen Pinjaman: CEK (financial health) → PILAH (choose a safe, legal loan) → PULIH (get out of debt). It is shown as one route with a step bar (`journeyBar()` in `src/app/00_core.js`).
2. Database Pinjol (`#openspace`, OJK legality lookup).
3. Kalkulator.

The game ("Lolos Jebakan Pinjol", menu "Game", route `#main`) is an extra: pre-quiz → "Sebulan Bertahan" (one month as Dimas, `src/app/68_sebulan.js`; every figure from `FW` on a copy of his profile, compared with the safest path) → post-quiz, used for user testing (Gate 1 fields kept). The 60-second "Legal atau ilegal?" (`69_legal.js`) uses names only from the OJK and Satgas PASTI lists. The hero image is `src/img/hero.webp` (copied to `docs/img/` by build.py); the step illustrations are hand-made inline SVG (`STAGE_ART` in `src/app/10_home.js`), and the icons are in `ICONS` in `00_core.js`. It is built from `src/` into one self-contained file, `docs/index.html`, which GitHub Pages serves.

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

## Core rule: decide first, size second, compare third, always show an exit
- `FW.readiness(p)` gives one verdict for the whole app. Level 0 is "Belum bisa berutang", 1 is "Hanya untuk darurat", 2 is "Boleh, dengan batas", and 3 is "Siap berutang dengan sehat". It also returns the reasons and `max` (the largest safe loan for 3/6/12 months).
  - Show it as the CEK hero, as the strip at the top of PILAH, and as the chip in the header.
  - The names and colours are in `READY` in `00_core.js`.
- `FW.headroom(p).ceiling` is the safe instalment, after protecting planned monthly saving. `FW.maxSafeLoan(p, months)` converts it into a loan size at ±1.5%/month.
- Never write "paling cocok" or "Ajukan tepat" for an option in the Bahaya zone. When every option is red, the result is "pilihan yang paling sedikit merugikan", sorted by the smallest monthly shortfall.
- The health score keeps 8 indicators (FinHealth), and a monthly deficit always reads "Rentan". It is labelled "Kondisi keuangan" on screen.
- Emergency fund months are the fund ÷ total monthly outflow, including instalments (Cia's benchmark).
- In PULIH, interest is only simulated for loans whose rate the user entered. Otherwise the instalments already include it.
- One vocabulary: Porsi cicilan, Sisa uang, Total dikembalikan, Pinjaman maksimal yang aman, Kesiapan berutang.
- Kalkulator defaults to the cheapest licensed lender in the database at its RIPLAY maximum (`cheapestReal` in `35_kalkulator.js`, real lenders only, never the illegal list); the OJK cap is shown as the worst case.

## Open work (after P1, 14 Nov 2026)
- **P2**
  - Intent question at entry ("Apa yang kamu butuhkan sekarang?").
  - CEK: collapsed ratios, a sticky mobile summary, and smaller banners.
  - Monthly re-check loop and data export/import.
  - Restyle the inner pages.
- **Later:** accounts and a database (Supabase with Google login, row-level security, an anonymous research snapshot with explicit consent per UU PDP / PP 33/2026, and a team dashboard).
