"""End-to-end check of docs/index.html with Playwright: fills "Data saya", walks every page,
prints the ratios, checks the help panel, and screenshots desktop + mobile.

Usage:  python3 build.py && python3 tests/e2e.py [--axe]
  --axe  also runs axe-core (WCAG 2.2 AA); needs `npm i axe-core` inside tests/ or AXE_PATH set.
Screenshots go to tests/out/ (ignored by git)."""
import asyncio, os, sys, pathlib
from playwright.async_api import async_playwright
ROOT = pathlib.Path(__file__).resolve().parent.parent
URL = (ROOT / 'docs' / 'index.html').as_uri()
OUTDIR = ROOT / 'tests' / 'out'; OUTDIR.mkdir(exist_ok=True); OUT = str(OUTDIR) + '/'
DO_AXE = '--axe' in sys.argv
AXE = pathlib.Path(os.environ.get('AXE_PATH', ROOT / 'tests' / 'node_modules' / 'axe-core' / 'axe.min.js')).read_text() if DO_AXE else ''
async def axe(pg, label):
    if not DO_AXE: return
    await pg.add_script_tag(content=AXE)
    res = await pg.evaluate("""async () => { const r = await axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } });
      return r.violations.map(v => ({ id: v.id, n: v.nodes.length, sample: v.nodes.slice(0,2).map(n => n.target.join(' ') + ' :: ' + (n.failureSummary||'').slice(0,140)) })); }""")
    print('AXE', label, len(res)); [print('   ', v['id'], v['n'], v['sample']) for v in res]
async def sy(pg, path, value):
    sel = f'[data-sy="{path}"]'; await pg.fill(sel, value); await pg.press(sel, 'Tab'); await pg.wait_for_timeout(30)
async def radio(pg, path, value): await pg.check(f'input[data-sy="{path}"][value="{value}"]'); await pg.wait_for_timeout(30)
async def go(pg, h): await pg.evaluate(f"location.hash='#{h}'"); await pg.wait_for_timeout(200)
async def fill_profile(pg):
    await go(pg, 'mulai')
    await radio(pg, 'stage', 'karyawan'); await radio(pg, 'stability', 'stabil'); await pg.click('[data-act="wiz-next"]')
    await sy(pg, 'incomes.0.label', 'Gaji'); await sy(pg, 'incomes.0.amount', '8000000'); await sy(pg, 'incomes.0.payday', '25'); await radio(pg, 'incomes.0.type', 'tetap'); await pg.click('[data-act="wiz-next"]')
    await radio(pg, 'spendMode', 'rinci')
    for i, v in enumerate(['2200000', '1800000', '500000', '200000', '300000', '900000', '400000', '150000', '0']): await sy(pg, f'items.{i}.amount', v)
    await radio(pg, 'familyAns', '1'); await sy(pg, 'family', '800000'); await pg.click('[data-act="wiz-next"]')
    await radio(pg, 'hasLoans', '1'); await sy(pg, 'loans.0.name', 'Paylater Shopee'); await pg.select_option('[data-sy="loans.0.type"]', 'paylater'); await sy(pg, 'loans.0.instalment', '450000'); await sy(pg, 'loans.0.dueDay', '15'); await sy(pg, 'loans.0.months', '5')
    await pg.click('[data-act="wiz-next"]')
    await sy(pg, 'emergencyFund', '1500000'); await sy(pg, 'savingMonthly', '200000')
    for k, v in [('onTimeAns', 'ya'), ('pinjolExp', 'lancar'), ('slik', 'tidaktahu'), ('insurance', '1'), ('plan', '0'), ('access.koperasi', '0'), ('access.bank', '1')]: await radio(pg, k, v)
    await pg.click('[data-act="wiz-next"]'); await pg.wait_for_timeout(400)

# acceptance checks from the UX revision plan (Alsya, 13 Nov 2026)
def _items(needs, wants):
    return [{'id': 's0', 'name': 'Kebutuhan pokok', 'kind': 'need', 'amount': needs, 'day': None}, {'id': 's5', 'name': 'Keinginan', 'kind': 'want', 'amount': wants, 'day': None}]
async def _setp(pg, prof):
    await pg.evaluate("p => { localStorage.setItem('finwise:saya', JSON.stringify(p)); location.hash = '#home'; }", prof); await pg.reload(); await pg.wait_for_timeout(300)
async def _pilah(pg, need, cat='pokok', urg='minggu', months='6', to=3):
    await go(pg, 'pilah'); await pg.locator('[data-act="pilah-step"][data-v="0"]').first.click(); await pg.wait_for_timeout(120)
    await pg.click(f'[data-act="pilah-cat"][data-v="{cat}"]'); await pg.wait_for_timeout(60)
    await pg.fill('#n-amount', need); await pg.press('#n-amount', 'Tab'); await pg.wait_for_timeout(80)
    await pg.select_option('#n-months', months); await pg.wait_for_timeout(80)
    await pg.click(f'[data-act="pilah-urg"][data-v="{urg}"]'); await pg.wait_for_timeout(80)
    await pg.locator('.card [data-act="pilah-step"][data-v="1"]').click(); await pg.wait_for_timeout(200)
    if to == 3: await pg.locator('[data-act="pilah-step"][data-v="3"]').last.click(); await pg.wait_for_timeout(300)
async def acceptance(pg):
    import copy, json
    base = json.loads(await pg.evaluate("localStorage.getItem('finwise:saya')"))
    A = copy.deepcopy(base); A['incomes'][0]['amount'] = 5000000; A['items'] = A['spending'] = _items(3600000, 1000000); A['family'] = 0; A['familyAns'] = False
    A['loans'] = [dict(base['loans'][0], instalment=300000, months=6, name='Paylater')]; A['emergencyFund'] = 300000; A['savingMonthly'] = 0
    B = copy.deepcopy(A); B['stability'] = 'tidak'; B['incomes'][0]['amount'] = 3500000; B['incomes'][0]['type'] = 'tidak tetap'; B['items'] = B['spending'] = _items(3050000, 850000)
    B['loans'] = [dict(base['loans'][0], instalment=250000, months=6, name='Paylater')]; B['emergencyFund'] = 0
    ok = True
    def check(name, cond):
        nonlocal ok; ok = ok and cond; print(('PASS ' if cond else 'FAIL ') + name)
    await _setp(pg, A); await go(pg, 'cek'); t = await pg.evaluate('document.body.innerText')
    check('CEK: pure condition (no readiness card, debt section present)', await pg.locator('.ready-card').count() == 0 and 'Kondisi utangmu' in t and await pg.locator('.dchecks li').count() == 6)
    await _pilah(pg, '3000000', to=1)
    check('A (PILAH step 1): Hanya untuk darurat', (await pg.inner_text('.rc-level')).strip() == 'Hanya untuk darurat')
    amts = await pg.evaluate("[...document.querySelectorAll('.rc-amts dd')].map(d => +d.innerText.replace(/[^0-9]/g, ''))")
    check(f'A: max safe 6 bln Rp380-390 rb ({amts[1] if len(amts) > 1 else None})', len(amts) == 3 and 370000 <= amts[1] <= 390000)
    await pg.locator('[data-act="pilah-cap"]').first.click(); await pg.wait_for_timeout(150)
    await pg.locator('[data-act="pilah-step"][data-v="3"]').last.click(); await pg.wait_for_timeout(300); t = await pg.evaluate('document.body.innerText')
    head = await pg.inner_text('h3:has-text("Semua pindar berizin untuk")'); amt = int(''.join(c for c in head.split(',')[0] if c.isdigit()) or 0)
    check(f'A: safe amount applied on request ({amt}) with the split shown', 0 < amt <= 390000 and 'Kamu memakai jumlah aman' in t)
    names = await pg.evaluate("[...document.querySelectorAll('.top3 .opt b, .allp tbody td:nth-child(2) b')].map(x => x.textContent).join('|')")
    check('PILAH list: pindar only, benchmark shown, no Danamas for consumer loans', 'Koperasi' not in names and 'bank' not in names.lower() and 'Danamas' not in names and 'Patokan harga' in t)
    await _setp(pg, B); await go(pg, 'cek')
    check('B: health status Rentan', 'Rentan' in await pg.inner_text('.hero-sum .ring'))
    await _pilah(pg, '2000000', cat='gaya', to=1)
    check('B (PILAH step 1): Belum bisa berutang', (await pg.inner_text('.rc-level')).strip() == 'Belum bisa berutang')
    await pg.locator('[data-act="pilah-step"][data-v="3"]').last.click(); await pg.wait_for_timeout(300); t = await pg.evaluate('document.body.innerText')
    check('B + gaya hidup: warned but nothing locked (list shown)', 'Kesiapan berutangmu' in t and await pg.locator('.top3').count() == 1)
    await _pilah(pg, '2000000', cat='kesehatan', urg='hari'); t = await pg.evaluate('document.body.innerText')
    check('B + kesehatan mendesak: no acknowledgement gate, list shown', 'MODE DARURAT' not in t and await pg.locator('.top3').count() == 1)
    check('B all-red list: least-harmful copy only', 'paling cocok' not in t and 'Ajukan tepat' not in t and 'paling sedikit merugikan' in t)
    await go(pg, 'pilah'); await pg.locator('[data-act="pilah-step"][data-v="0"]').first.click(); await pg.fill('#n-label', 'buat main slot'); await pg.press('#n-label', 'Tab'); await pg.wait_for_timeout(100)
    await pg.click('[data-act="pilah-cat"][data-v="gaya"]'); await pg.fill('#n-amount', '2000000'); await pg.press('#n-amount', 'Tab'); await pg.select_option('#n-months', '6'); await pg.click('[data-act="pilah-urg"][data-v="hari"]'); await pg.wait_for_timeout(100)
    check('judi: the one exception (cannot continue)', await pg.locator('.card [data-act="pilah-step"][data-v="1"]').is_disabled())
    await go(pg, 'pulih')
    t = await pg.evaluate('document.body.innerText')
    check('PULIH: one loan, no phantom interest (lunas 6 bulan)', 'Lunas dalam\n6 bulan' in t or 'Lunas dalam 6 bulan' in t.replace('\n', ' '))
    # P1c: can't-pay section, Kalkulator by level, Cia's ratios
    check('PULIH: tidak sanggup bayar with editable message', 'Tidak sanggup bayar bulan ini?' in t and 'POJK 22/2023' in t and 'Draf surat' not in t and 'Paylater' in await pg.input_value('#pay-msg'))
    await go(pg, 'kalkulator'); t = await pg.evaluate('document.body.innerText')
    check('Kalkulator B: real rate by default, CTA = rencana tanpa utang', await pg.get_attribute('[data-act="calc"][data-v="real"]', 'aria-pressed') == 'true' and 'Lihat rencana tanpa utang' in t and 'Belum bisa berutang' in t)
    await _setp(pg, A); await go(pg, 'kalkulator'); t = await pg.evaluate('document.body.innerText')
    check('Kalkulator A: CTA offers the safe amount', 'Pakai jumlah aman' in t and 'Hanya untuk darurat' in t)
    await go(pg, 'cek'); t = await pg.evaluate("[...document.querySelectorAll('.ratios .r-name, .dchecks b')].map(x => x.textContent).join('|')")
    check('CEK: Cia ratios present', all(k in t for k in ['Total pengeluaran', 'Cicilan selain KPR', 'kredit aktif', 'Tabungan rutin']))
    print('acceptance:', 'ALL PASS' if ok else 'FAILURES')
# The game: two rounds of kilat cards around "Sebulan Bertahan", plus the 60-second quick game.
async def _setrange(pg, sel, v):
    await pg.evaluate("([s, v]) => { const e = document.querySelector(s); e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); }", [sel, v])
async def _kilat(pg, right):
    for _ in range(6):
        q = await pg.inner_text('#kl-q')
        if await pg.locator('.kl-ads').count(): await pg.click(f'[data-act="kl-pick"][data-v="{2 if right else 0}"]')
        elif await pg.locator('#kl-range').count(): await _setrange(pg, '#kl-range', ('700000' if 'cicilan' in q else '7000000') if right else '0'); await pg.click('[data-act="kl-lock"]')
        elif await pg.locator('.blk-row').count():
            if right: await pg.click('[data-act="kl-toggle"][data-v="tab"]'); await pg.click('[data-act="kl-toggle"][data-v="kak"]')
            await pg.click('[data-act="kl-lock"]')
        else: await pg.click(f'[data-act="kl-pick"][data-v="{1 if right else 0}"]')
        await pg.wait_for_timeout(30)
async def game_checks(pg, mobile=False):
    ok = True
    def check(name, cond):
        nonlocal ok; ok = ok and cond; print(('PASS ' if cond else 'FAIL ') + name)
    await pg.goto(URL + '#home'); await pg.reload(); await go(pg, 'main')
    await pg.click('[data-act="t-start"]'); await pg.check('#t-consent'); await pg.uncheck('#t-timer'); await pg.click('[data-act="t-next"]')
    check('game: Ronde Insting is kilat cards, not a quiz', await pg.locator('.kl-card').count() == 1 and await pg.locator('.qq').count() == 0)
    if not mobile: await axe(pg, 'kilat')
    await _kilat(pg, False)
    if mobile: print('mobile game', await pg.evaluate('document.documentElement.scrollWidth')); await pg.screenshot(path=OUT + 'm_sebulan.png', full_page=True)
    else: await axe(pg, 'sebulan')
    for e in ['pokok', 'keluarga', 'cicilan']: await pg.click(f'[data-act="sb-env"][data-v="{e}"]')
    await pg.click('[data-act="sb-pick"][data-v="kunci"]'); await pg.click('[data-act="sb-next"]')
    await pg.click('[data-act="sb-pick"][data-v="tunda"]'); await pg.click('[data-act="sb-next"]')
    await pg.click('[data-act="sb-block"][data-v="tab"]'); await pg.click('[data-act="sb-block"][data-v="kak"]'); await pg.click('.sb-choices [data-act="sb-pick"]'); await pg.click('[data-act="sb-next"]')
    await _setrange(pg, '#sb-range', '700000'); await pg.click('[data-act="sb-lock-slider"]'); await pg.click('[data-act="sb-next"]')
    for i in [0, 2, 4]: await pg.click(f'[data-act="sb-flag"][data-v="{i}"]')
    await pg.click('[data-act="sb-flags-done"]'); await pg.click('[data-act="sb-next"]')
    await pg.click('[data-act="sb-pick"][data-v="koperasi"]'); await pg.click('[data-act="sb-next"]')
    await pg.click('[data-act="sb-next"]')
    await pg.click('[data-act="sb-pick"][data-v="darurat"]'); await pg.click('[data-act="sb-next"]')
    t = await pg.inner_text('.sb-card')
    check('game: safest path ends Hanya untuk darurat, sisa uang +Rp346.667', 'Dimas lolos bulan ini' in t and '+Rp346.667' in t and 'Hanya untuk darurat' in t)
    if mobile: print('mobile report', await pg.evaluate('document.documentElement.scrollWidth'))
    else: await axe(pg, 'sebulan report')
    await pg.click('[data-act="t-next"]'); await _kilat(pg, True)
    for f, v in [('help', 'tidak'), ('ease', '4'), ('confidence', '4')]: await pg.click(f'[data-act="t-fb"][data-f="{f}"][data-v="{v}"]')
    await pg.click('[data-act="t-finish"]'); await pg.wait_for_timeout(150); t = await pg.inner_text('.result-card')
    check('game: 3 stars, score 0 → 100, recap shown', 'Penjaga Dompet' in t and 'naik 100 poin' in t and 'Jawaban kartu kilat' in t)
    await pg.goto(URL + '#home'); await pg.reload(); await go(pg, 'main')
    await pg.click('[data-act="qg-start"]'); await pg.wait_for_timeout(80)
    for k in ['ArrowLeft', 'ArrowRight', 'ArrowLeft']: await pg.keyboard.press(k); await pg.wait_for_timeout(40)
    s = await pg.inner_text('.qg'); check('quick game: answers recorded', s.count('Benar') + s.count('Salah') >= 1 and await pg.locator('.qg-name').count() == 1)
    if not mobile: await axe(pg, 'quick game')
    await pg.click('[data-act="qg-quit"]') if await pg.locator('[data-act="qg-quit"]').count() else None
    print('game:', 'ALL PASS' if ok else 'FAILURES')
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        ctx = await b.new_context(viewport={'width': 1366, 'height': 900}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        await pg.goto(URL + '#home'); await pg.wait_for_timeout(300)
        print('persona select present:', await pg.locator('#persona').count())
        await pg.screenshot(path=OUT + 'home.png', full_page=True); await axe(pg, 'home')
        await go(pg, 'cek'); await pg.screenshot(path=OUT + 'gate.png')
        await fill_profile(pg)
        print('after finish:', await pg.evaluate('location.hash'))
        await pg.screenshot(path=OUT + 'cek.png', full_page=True); await axe(pg, 'cek')
        print('ratios:', await pg.evaluate("[...document.querySelectorAll('.ratios li')].map(li => li.querySelector('.r-name').textContent.replace('?','').trim() + ' = ' + li.querySelector('.r-top b').textContent).join(' | ')"))
        await pg.click('.ratios .qbtn >> nth=0'); await pg.wait_for_timeout(150)
        await pg.screenshot(path=OUT + 'drawer_kamus.png'); print('drawer term:', (await pg.inner_text('.gloss .on'))[:100])
        await pg.click('.drawer [data-act="drawer"][data-v="chat"]'); await pg.wait_for_timeout(100)
        await pg.click('.drawer [data-act="chat-q"] >> nth=1'); await pg.wait_for_timeout(150)
        print('rule chat:', (await pg.inner_text('#chat-log'))[-220:].replace('\n', ' | '))
        await pg.screenshot(path=OUT + 'drawer_chat.png')
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(80)
        print('drawer closed:', await pg.locator('.drawer').count())
        await pg.click('.secnav button[data-id="s4"]'); await pg.wait_for_timeout(300)
        await go(pg, 'ringkasan'); print('ringkasan alias ->', await pg.evaluate('location.hash'))
        await go(pg, 'pilah'); await pg.screenshot(path=OUT + 'pilah.png', full_page=True); await axe(pg, 'pilah')
        await go(pg, 'pulih'); await pg.screenshot(path=OUT + 'pulih.png', full_page=True); await axe(pg, 'pulih')
        print('letter gone:', await pg.locator('text=Draf surat').count() == 0)
        await go(pg, 'kalkulator'); await pg.screenshot(path=OUT + 'kalk.png', full_page=True); await axe(pg, 'kalkulator')
        await go(pg, 'openspace'); await pg.screenshot(path=OUT + 'os.png', full_page=True)
        await go(pg, 'main'); await pg.screenshot(path=OUT + 'game.png'); print('game title:', await pg.inner_text('main h1'))
        await go(pg, 'uji'); print('uji ->', await pg.evaluate('location.hash'))
        await acceptance(pg)
        await game_checks(pg)
        print('desktop errors:', errs)
        await ctx.close()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#home'); await pg.wait_for_timeout(200); await fill_profile(pg)
        for r in ['home', 'cek', 'pilah', 'pulih', 'kalkulator', 'openspace', 'main', 'mulai']:
            await go(pg, r); print('mobile', r, await pg.evaluate('document.documentElement.scrollWidth')); await pg.screenshot(path=OUT + 'm_' + r + '.png', full_page=True)
        await go(pg, 'cek'); await pg.click('.fab'); await pg.wait_for_timeout(100); await pg.screenshot(path=OUT + 'm_drawer.png')
        await game_checks(pg, mobile=True)
        print('mobile errors:', errs)
        await b.close()
asyncio.run(main())
