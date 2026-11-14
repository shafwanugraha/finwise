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
async def _pilah3(pg, need):
    await go(pg, 'pilah'); await pg.locator('[data-act="pilah-step"][data-v="2"]').first.click(); await pg.wait_for_timeout(150)
    await pg.fill('#n-amount', need); await pg.press('#n-amount', 'Tab'); await pg.select_option('#n-hours', '168'); await pg.select_option('#n-purpose', 'konsumtif'); await pg.select_option('#n-months', '6'); await pg.wait_for_timeout(150)
    await pg.locator('[data-act="pilah-step"][data-v="3"]').last.click(); await pg.wait_for_timeout(300)
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
    await _setp(pg, A); await go(pg, 'cek')
    check('A: Hanya untuk darurat', (await pg.inner_text('.rc-level')).strip() == 'Hanya untuk darurat')
    amts = await pg.evaluate("[...document.querySelectorAll('.rc-amts dd')].map(d => +d.innerText.replace(/[^0-9]/g, ''))")
    check(f'A: max safe 6 bln Rp380-390 rb ({amts[1] if len(amts) > 1 else None})', len(amts) == 3 and 370000 <= amts[1] <= 390000)
    await _pilah3(pg, '3000000'); t = await pg.evaluate('document.body.innerText')
    check('A: danger copy (no "paling cocok" / "Ajukan tepat", has "paling sedikit merugikan")', 'paling cocok' not in t and 'Ajukan tepat' not in t and 'paling sedikit merugikan' in t)
    await _setp(pg, B); await go(pg, 'cek')
    check('B: Belum bisa berutang', (await pg.inner_text('.rc-level')).strip() == 'Belum bisa berutang')
    check('B: health status Rentan', 'Rentan' in await pg.inner_text('.hero-sum .ring'))
    await go(pg, 'pulih')
    t = await pg.evaluate('document.body.innerText')
    check('PULIH: one loan, no phantom interest (lunas 6 bulan)', 'Lunas dalam\n6 bulan' in t or 'Lunas dalam 6 bulan' in t.replace('\n', ' '))
    print('acceptance:', 'ALL PASS' if ok else 'FAILURES')
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
        print('ratios:', await pg.evaluate("[...document.querySelectorAll('.ratios li')].map(li => li.querySelector('.r-name').innerText.replace('?','').trim() + ' = ' + li.querySelector('.r-top b').innerText).join(' | ')"))
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
        await go(pg, 'kalkulator'); await pg.screenshot(path=OUT + 'kalk.png', full_page=True)
        await go(pg, 'openspace'); await pg.screenshot(path=OUT + 'os.png', full_page=True)
        await go(pg, 'main'); await pg.screenshot(path=OUT + 'game.png'); print('game title:', await pg.inner_text('main h1'))
        await go(pg, 'uji'); print('uji ->', await pg.evaluate('location.hash'))
        await acceptance(pg)
        print('desktop errors:', errs)
        await ctx.close()
        ctx = await b.new_context(viewport={'width': 390, 'height': 844}); pg = await ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(URL + '#home'); await pg.wait_for_timeout(200); await fill_profile(pg)
        for r in ['home', 'cek', 'pilah', 'pulih', 'kalkulator', 'openspace', 'main', 'mulai']:
            await go(pg, r); print('mobile', r, await pg.evaluate('document.documentElement.scrollWidth')); await pg.screenshot(path=OUT + 'm_' + r + '.png', full_page=True)
        await go(pg, 'cek'); await pg.click('.fab'); await pg.wait_for_timeout(100); await pg.screenshot(path=OUT + 'm_drawer.png')
        print('mobile errors:', errs)
        await b.close()
asyncio.run(main())
