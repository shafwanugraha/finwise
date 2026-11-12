# FinWise – notes for Claude

## What this is
A single-page web app for young Indonesians with three main functions, which are also the main menu:
1. Asesmen Pinjaman: CEK (financial health) → PILAH (choose a safe, legal loan) → PULIH (get out of debt). It is shown as one route with a step bar (`journeyBar()` in `src/app/00_core.js`).
2. Database Pinjol (`#openspace`, OJK legality lookup).
3. Kalkulator.

A 3-round game ("Tantangan 3 Hari") used for user testing is an extra. The illustrations are hand-made inline SVG (`HERO_ART` and `STAGE_ART` in `src/app/10_home.js`), and the icons are in `ICONS` in `00_core.js`. It is built from `src/` into one self-contained file, `docs/index.html`, which GitHub Pages serves.

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

## Open work (Nov 2026)
1. Feedback from user testing:
   - CEK plan tasks (SLIK, BPJS) need to be checkable and update the score.
   - PILAH cards should be split into 3 parts (about the lender / about this loan / impact on you), with "total yang dikembalikan" instead of "total biaya maks".
   - PULIH payoff order should become a real choice ("Hemat bunga" / "Cepat lega") and be hidden when there is only one debt.
   - Remove the game's result code.
2. Cia's benchmark doc:
   - Add total spending ÷ income (≤80% wajar, ≥90% bahaya) and make the Safe zone require ≤90%.
   - Add a red flag for ≥4 active credits.
   - Non-KPR instalments: ≤15% / ≥20%.
   - Savings: 10% minimum, 20% target.
   - Emergency fund ÷ total monthly spending including instalments.
   - Self-employed income should be profit, not turnover.
   - Change the game star "zona Aman" to "opsi legal termurah".
3. Accounts and database (planned: Supabase with Google login, row-level security, an anonymous research snapshot with explicit consent per UU PDP / PP 33/2026, and a team dashboard).
