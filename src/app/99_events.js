/* ================= render & events ================= */
let lastRoute = null, lastOverlay = null, returnKey = null;
const DATA_KEYS = ['id', 'v', 'k', 'list', 'i', 'f', 'scope', 'src', 'key', 'set'];
function keyOf(el) {
  if (!el || el === document.body) return null;
  if (el.id) return '#' + CSS.escape(el.id);
  if (el.dataset?.act) return `[data-act="${el.dataset.act}"]` + DATA_KEYS.filter(a => el.dataset[a] != null).map(a => `[data-${a}="${CSS.escape(el.dataset[a])}"]`).join('');
  return null;
}
const FOC = 'a[href],button,input,select,textarea,summary,[tabindex]:not([tabindex="-1"])';
function render() {
  pendingRender = false; clearTimeout(renderTimer);
  const app = document.getElementById('app'); if (!app) return;
  document.documentElement.style.fontSize = ['100%', '112.5%', '125%'][S.textSize] || '100%';
  const act = document.activeElement, fkey = keyOf(act), sel = act && 'selectionStart' in act ? [act.selectionStart, act.selectionEnd] : null;
  const fidx = act && act !== document.body && app.contains(act) ? [...app.querySelectorAll(FOC)].indexOf(act) : -1;
  const gate = (['cek', 'pilah', 'pulih'].includes(S.route)) && needsSetup();
  const view = gate ? vNeedSetup : ({ home: vHome, mulai: vMulai, cek: vCek, pilah: vPilah, pulih: vPulih, kalkulator: vKalkulator, openspace: vOpenspace, berizin: vBerizin, pinjol: vPinjol, ilegal: vIlegal, keluhan: vKeluhan, bandingkan: vBandingkan, statistik: vStatistik, main: vUji, hasil: vHasil }[S.route] || vHome);
  let main; try { main = view(); } catch (e) { console.error(e); main = `<div class="note danger" role="alert">Terjadi kesalahan saat menampilkan halaman ini. Muat ulang atau pilih profil lain.</div>`; }
  const ov = S.overlay?.type === 'edit' ? profileEditor() : S.overlay?.type === 'import' ? importSheet() : S.overlay?.type === 'pick' ? pickSheet() : S.overlay?.type === 'chat' ? chatSheet() : S.overlay?.type === 'glossary' ? glossarySheet() : '';
  app.innerHTML = `<div id="page" class="${S.drawer ? 'with-drawer' : ''}"${S.overlay ? ' inert' : ''}><button class="skip" data-act="skip">Lewati ke konten utama</button>` + header() + `<main id="main" tabindex="-1"><div class="wrap">${main}</div></main>` + footer()
    + (!S.drawer && !S.overlay && !(S.route === 'main' && S.test && S.test.stage > 0 && S.test.stage < 5) ? '<button class="btn fab amber" data-act="drawer" data-v="chat">✦ Tanya FinWise</button>' : '') + '</div>' + (S.drawer ? drawerPanel() : '') + ov
    + (S.toast ? `<div class="toast" aria-hidden="true">${esc(S.toast)}</div>` : '');
  document.title = `${TITLES[S.route] || 'FinWise'} · FinWise`;
  const opened = S.overlay && !lastOverlay, closed = !S.overlay && lastOverlay;
  if (opened) { returnKey = fkey; const first = app.querySelector('.sheet [autofocus], .sheet h2'); if (first) { first.setAttribute('tabindex', '-1'); first.focus(); } }
  else if (closed) { const el = returnKey && app.querySelector(returnKey); (el || document.getElementById('main')).focus({ preventScroll: true }); }
  else if (lastRoute !== null && lastRoute !== S.route) { const h1 = app.querySelector('main h1'); if (h1) { h1.setAttribute('tabindex', '-1'); h1.focus({ preventScroll: true }); } }
  else if (fkey || fidx >= 0) { let el = null; try { el = fkey && app.querySelector(fkey); } catch {} if (!el && fidx >= 0) el = app.querySelectorAll(FOC)[fidx]; if (el) { el.focus({ preventScroll: true }); if (sel && el.setSelectionRange && el.type !== 'number') try { el.setSelectionRange(sel[0], sel[1]); } catch {} } }
  lastOverlay = S.overlay;
  if (lastRoute !== S.route) { lastRoute = S.route; window.scrollTo(0, 0); }
  const log = document.getElementById('chat-log'); if (log) log.scrollTop = log.scrollHeight;
}
let ptrDown = false, pendingRender = false, renderTimer = null;
function flushRender() { if (pendingRender) render(); }
function queueRender() { pendingRender = true; clearTimeout(renderTimer); if (!ptrDown) renderTimer = setTimeout(flushRender, 0); }
document.addEventListener('pointerdown', () => { ptrDown = true; }, true);
['pointerup', 'pointercancel'].forEach(t => document.addEventListener(t, () => { ptrDown = false; if (pendingRender) { clearTimeout(renderTimer); renderTimer = setTimeout(flushRender, 0); } }, true));
function announce(msg) { const l = document.getElementById('live'); if (l) { l.textContent = ''; setTimeout(() => { l.textContent = msg; }, 30); } }
function toast(msg) { S.toast = msg; announce(msg); render(); clearTimeout(toast.t); toast.t = setTimeout(() => { S.toast = ''; render(); }, 2200); }
function setPath(obj, path, val) { const ks = path.split('.'); let o = obj; ks.slice(0, -1).forEach(k => { if (o[k] == null) o[k] = {}; o = o[k]; }); o[ks[ks.length - 1]] = val; }
function parseVal(el) {
  const t = el.dataset.t;
  if (t === 'rp') return digits(el.value);
  if (t === 'rpn') return String(el.value).trim() === '' ? null : digits(el.value);
  if (t === 'intn') return String(el.value).trim() === '' ? null : Math.max(0, parseInt(el.value, 10) || 0);
  if (t === 'pctn') return String(el.value).trim() === '' ? null : (parseFloat(String(el.value).replace(',', '.')) || 0) / 100;
  if (t === 'bool1') return el.value === '1';
  if (t === 'int') return Math.max(0, parseInt(el.value, 10) || 0);
  if (t === 'pct') return (parseFloat(String(el.value).replace(',', '.')) || 0) / 100;
  if (t === 'bool') return el.checked;
  return el.value;
}
function persist() { store.set('saya', S.profiles.saya); }
function route() {
  let h = (location.hash || '').replace('#', '');
  if (ALIAS[h]) { history.replaceState(null, '', '#' + ALIAS[h]); h = ALIAS[h]; }
  S.route = ROUTES.includes(h) ? h : 'home';
  if (S.route === 'hasil') subscribeTests();
  render();
}
function setPersona(id) { if (!S.profiles[id] || S.personaId === id) return; S.personaId = id; S.ai = {}; S.chat = []; resetStageState(); persist(); }

/* legality check: licensed → straight to the profile; anything else → result note on Openspace */
function showLookup(R) {
  S.os.result = R;
  const msg = R ? { licensed: 'Berizin OJK. Profil dibuka.', clone: 'Berizin OJK, tapi ada tiruan ilegal dengan nama mirip. Profil dibuka.', illegal: 'Tidak berizin OJK', multi: 'Ada beberapa nama yang mirip', scenario: 'Nama fiktif', unknown: 'Tidak ada di daftar resmi' }[R.kind] : '';
  if (R && (R.kind === 'licensed' || R.kind === 'clone')) {
    Object.assign(S.os, { lender: R.lender.id, found: R.lender.id, reviewPreview: '', rv: {}, rvErr: '' });
    if (S.route !== 'pinjol') location.hash = '#pinjol'; else { lastRoute = null; render(); lastRoute = 'pinjol'; window.scrollTo(0, 0); }
  } else if (S.route !== 'openspace') location.hash = '#openspace'; else render();
  announce(msg);
}
/* type-ahead dropdown (combobox) */
const SUG = { list: [], active: -1 };
const sugList = inp => inp && document.getElementById(inp.id + '-list');
function closeSug(inp) { const ul = sugList(inp); if (ul) ul.hidden = true; if (inp) { inp.setAttribute('aria-expanded', 'false'); inp.removeAttribute('aria-activedescendant'); } SUG.active = -1; }
function renderSug(inp) {
  const ul = sugList(inp); if (!ul) return;
  if (norm(inp.value).length < 2) { closeSug(inp); return; }
  SUG.list = suggest(inp.value); SUG.active = -1;
  ul.innerHTML = sugItems(inp.id, SUG.list); ul.hidden = false; inp.setAttribute('aria-expanded', 'true'); inp.removeAttribute('aria-activedescendant');
}
function moveSug(inp, d) {
  const n = SUG.list.length; if (!n) return;
  SUG.active = SUG.active + d >= n ? 0 : SUG.active + d < 0 ? n - 1 : SUG.active + d;
  sugList(inp).querySelectorAll('[role=option]').forEach((li, j) => li.setAttribute('aria-selected', String(j === SUG.active)));
  const li = document.getElementById(`${inp.id}-o${SUG.active}`); if (li) { inp.setAttribute('aria-activedescendant', li.id); li.scrollIntoView({ block: 'nearest' }); }
}
function pickSug(inp, j) {
  const s = SUG.list[j]; if (!s) return; closeSug(inp); inp.value = s.name;
  if (inp.id === 'osq') S.os.q = s.name; else S.os.qc = s.name;
  if (s.t === 'lic') { const l = licById(s.id); let R = lookup(l.name); if (!R || !['licensed', 'clone'].includes(R.kind) || R.lender.id !== l.id) R = { kind: 'licensed', lender: l }; showLookup(R); }
  else showLookup({ kind: 'illegal', item: ILL[s.n] });
}
document.addEventListener('mousedown', e => { if (e.target.closest?.('.sugg')) e.preventDefault(); });
document.addEventListener('focusout', e => { const inp = e.target; if (inp.matches?.('[data-sug-input]')) setTimeout(() => { if (document.activeElement !== inp) closeSug(inp); }, 120); });

function finishWizard() {
  const p = S.profiles.saya; wizFinalize(p); S.personaId = 'saya'; resetStageState(); S.ai = {}; S.chat = []; S.wiz.errors = {};
  persist(); location.hash = '#cek';
}
const ACT = {
  'go-persona': () => {},
  drawer: el => {
    const tab = el.dataset.v, keep = el.dataset.keep;
    if (S.drawer && S.drawer.tab === tab && !keep && !el.dataset.term) S.drawer = null;
    else S.drawer = { ...(S.drawer || {}), tab, term: el.dataset.term || (keep ? S.drawer?.term : null), q: el.dataset.term ? '' : S.drawer?.q || '' };
    render();
    setTimeout(() => { const t = S.drawer && (S.drawer.tab === 'chat' ? document.getElementById('chat-in') : document.querySelector('.gloss .on') || document.getElementById('kamus-q')); if (t) { t.setAttribute('tabindex', t.getAttribute('tabindex') || '-1'); t.focus(); t.scrollIntoView?.({ block: 'nearest' }); } }, 0);
  },
  'drawer-close': () => { S.drawer = null; render(); document.querySelector('[data-act="drawer"]')?.focus(); },
  'ask-term': el => { S.drawer = { tab: 'chat' }; render(); sendChat(`Jelaskan arti "${el.dataset.v}" dengan bahasa sederhana dan apa artinya untuk kondisiku.`); },
  'goto-sec': el => { const t = document.getElementById(el.dataset.id); if (t) { t.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); t.focus({ preventScroll: true }); } },
  skip: () => { const m = document.getElementById('main'); m?.focus(); m?.scrollIntoView(); },
  focus: (el, e) => { e.preventDefault(); document.getElementById(el.dataset.id)?.focus(); },
  textsize: () => { S.textSize = (S.textSize + 1) % 3; store.set('textSize', S.textSize); render(); announce('Ukuran teks: ' + SIZES[S.textSize]); },
  'goal-suggest': el => { S.cek.goal = { label: 'Dana darurat 3 bulan', amount: +el.dataset.v }; render(); },
  'wiz-edit': el => { S.wiz.step = el.dataset.v != null ? +el.dataset.v : S.profiles.saya.setup ? 0 : Math.min(4, S.profiles.saya.wstep || 0); S.wiz.errors = {}; S.profiles.saya.items = S.profiles.saya.items || []; if (el.dataset.mode) S.profiles.saya.spendMode = el.dataset.mode; },
  'wiz-goto': el => { S.wiz.step = +el.dataset.v; S.wiz.errors = {}; render(); focusWizTop(); },
  'wiz-back': () => { S.wiz.step = Math.max(0, S.wiz.step - 1); S.wiz.errors = {}; render(); focusWizTop(); },
  'wiz-next': () => {
    const p = S.profiles.saya, k = S.wiz.step, e = wizValidate(k, p);
    S.wiz.errors = e;
    if (Object.keys(e).length) { render(); const first = Object.keys(e).find(x => x !== '_step'); const el = first && document.getElementById(fid(first)) || document.getElementById(fid(first) + '-0'); (el || document.getElementById('wiz-errors'))?.focus(); return; }
    if (k === 4) { finishWizard(); return; }
    S.wiz.step = k + 1; p.wstep = Math.max(p.wstep || 0, S.wiz.step); persist(); render(); focusWizTop();
  },
  'wiz-save': () => {
    const p = S.profiles.saya;
    for (let k = 0; k <= 4; k++) { const e = wizValidate(k, p); if (Object.keys(e).length) { S.wiz.step = k; S.wiz.errors = e; render(); focusWizTop(); return; } }
    finishWizard();
  },
  'wiz-add': el => {
    const p = S.profiles.saya, L = el.dataset.list;
    if (L === 'incomes') p.incomes.push({ id: 'i' + Date.now(), label: '', amount: null, type: null, payday: null });
    if (L === 'items') p.items.push({ id: 's' + Date.now(), name: '', kind: 'want', amount: null, day: null, custom: true });
    if (L === 'loans') p.loans.push({ id: 'l' + Date.now(), name: '', type: '', instalment: null, dueDay: null, months: null, rateIn: null });
    persist(); render(); const n = p[L].length - 1; document.getElementById(fid(`${L}.${n}.${L === 'loans' || L === 'items' ? 'name' : 'label'}`))?.focus();
  },
  'wiz-del': el => { const p = S.profiles.saya; p[el.dataset.list].splice(+el.dataset.i, 1); S.wiz.errors = {}; persist(); render(); announce('Baris dihapus'); },
  'wiz-wipe': el => {
    if (el.dataset.v === '1') S.wiz.confirmWipe = true;
    else if (el.dataset.v === '0') S.wiz.confirmWipe = false;
    else { S.profiles.saya = blankSaya(); S.wiz = { step: 0, errors: {}, confirmWipe: false }; if (S.personaId === 'saya') resetStageState(); persist(); toast('Data saya sudah dihapus'); return; }
    render();
  },
  'cek-applied': el => { S.cek.applied = el.dataset.v === '1'; render(); },
  'pilah-step': el => { S.pilah.step = +el.dataset.v; render(); window.scrollTo({ top: 0 }); },
  mode: el => { (el.dataset.scope === 't' ? S.test.st : S.pilah).mode = el.dataset.v; render(); },
  'slik-set': el => { const p = S.profiles.saya; p.slik = el.dataset.v; persist(); toast('Hasil SLIK dicatat. Skor dan kesiapan berutang diperbarui.'); render(); },
  'pilah-cat': el => { const st = S.pilah; st.cat = el.dataset.v; st.purpose = st.cat === 'usaha' ? 'produktif' : 'konsumtif'; st.cap = undefined; st.ack = false; st.ackBox = false; render(); announce('Tujuan: ' + purposeName(st.cat)); },
  'pilah-urg': el => { const st = S.pilah, u = URGENCY.find(x => x[0] === el.dataset.v); st.urg = u[0]; st.hours = u[2]; st.cap = undefined; st.ack = false; render(); announce('Urgensi: ' + u[1]); },
  'pilah-ack': () => { if (!S.pilah.ackBox) return; S.pilah.ack = true; render(); },
  'pilah-cap': el => { S.pilah.cap = +el.dataset.v || 0; S.pilah.picked = null; render(); announce(S.pilah.cap ? 'Jumlah pinjaman diganti ke jumlah aman' : 'Jumlah pinjaman dikembalikan'); },
  'goto-plan': (el, e) => { e?.preventDefault?.(); location.hash = '#cek'; setTimeout(() => { const t = document.getElementById('s4'); t?.scrollIntoView(); t?.focus({ preventScroll: true }); }, 120); },
  toggle: el => { const [scope, k] = el.dataset.k.split('.'); const o = scope === 't' ? S.test.st : S.pilah; o[k] = !o[k]; render(); },
  pick: el => { S.overlay = { type: 'pick', id: el.dataset.id, ack: false }; render(); },
  't-pick': el => { S.overlay = { type: 'pick', id: el.dataset.id, ack: false, test: true }; render(); },
  'pick-confirm': () => {
    const o = S.overlay; if (o.test) { const t = S.test; const { m } = pilahCalc(t.p, t.st); const r = m.ok.find(x => x.id === o.id); t.st.picked = r.id; t.chosen = { id: r.id, name: r.name, zone: r.zone, rank: r.rank }; t.ack = !!o.ack; }
    else S.pilah.picked = o.id;
    S.overlay = null; render();
  },
  'to-pulih': () => {
    const p = P(); const { m } = pilahCalc(p, S.pilah); const r = m.ok.find(x => x.id === S.pilah.picked); if (!r) return;
    const amt = Math.max(1, r.repay - r.interest);
    p.loans = p.loans.filter(l => l.id !== 'new'); p.loans.push({ id: 'new', name: r.name, type: r.kind, instalment: Math.round(r.inst), outstanding: Math.round(r.repay), months: r.months, dueDay: Math.min(...p.incomes.map(i => i.payday || 1)), rateMonthly: (r.interest + (r.fee || 0)) / amt / r.months });
    if (isSaya(p)) p.hasLoans = true;
    persist(); location.hash = '#pulih'; toast('Cicilan baru ditambahkan ke jadwal PULIH');
  },
  'to-pilah': el => { S.pilah.need = +el.dataset.amount || S.pilah.need; S.pilah.step = 2; },
  'loan-del': el => { const p = P(); p.loans = p.loans.filter(l => l.id !== el.dataset.id); persist(); render(); },
  edit: () => { S.overlay = { type: 'edit' }; render(); },
  close: () => { S.overlay = null; render(); },
  'close-bg': (el, e) => { if (e.target === el) { S.overlay = null; render(); } },
  'pf-add': el => { const p = P(); if (el.dataset.list === 'incomes') p.incomes.push({ id: 'i' + Date.now(), label: 'Pemasukan lain', amount: 0, type: 'tidak tetap', payday: 15 }); else p.spending.push({ id: 's' + Date.now(), name: 'Pengeluaran lain', kind: 'want', amount: 0 }); persist(); render(); },
  'pf-del': el => { const p = P(); p[el.dataset.list].splice(+el.dataset.i, 1); persist(); render(); },
  'pf-reset': () => { S.profiles[S.personaId] = clone(DATA.personas[S.personaId]); resetStageState(); render(); },
  import: () => { S.overlay = { type: 'import' }; render(); },
  'imp-sample': () => { S.importText = SAMPLE_CSV; S.importRes = parseStatement(SAMPLE_CSV); render(); },
  'imp-run': () => { S.importText = document.getElementById('imp-text').value; S.importRes = parseStatement(S.importText); render(); },
  'imp-apply': () => {
    const r = S.importRes; if (!r) return; const s = S.profiles.saya;
    s.items = Object.values(r.cats).filter(c => c.kind !== 'debt').map((c, i) => ({ id: 'm' + i, name: c.name, kind: c.kind, amount: Math.round(c.amount), day: null, custom: true })); s.spendMode = 'rinci'; if (s.setup) wizFinalizeLight(s);
    if (r.income && !s.incomes.some(i => i.amount > 0)) s.incomes = [{ id: 'i1', label: 'Pemasukan dari mutasi', amount: r.income, type: null, payday: null }];
    S.overlay = null; persist();
    if (S.route !== 'mulai') { S.personaId = 'saya'; resetStageState(); if (!s.setup) { S.wiz.step = 2; location.hash = '#mulai'; } }
    toast('Pengeluaran dari mutasi dipakai untuk “Data saya”. Periksa lagi angkanya.');
  },
  copy: async el => { const src = document.getElementById(el.dataset.src); const txt = src?.value ?? src?.textContent ?? ''; try { await navigator.clipboard.writeText(txt); toast('Tersalin'); } catch { if (src?.select) { src.classList.remove('sr'); src.select(); } toast('Tekan Ctrl/⌘+C untuk menyalin'); } },
  ai: el => askAI(el.dataset.key, el.dataset.prompt),
  chat: () => { S.drawer = { tab: 'chat' }; render(); setTimeout(() => document.getElementById('chat-in')?.focus(), 0); },
  'chat-q': el => sendChat(el.dataset.q),
  lender: (el, e) => { e?.preventDefault?.(); const id = LIC.some(l => l.id === el.dataset.id) ? el.dataset.id : (LIC.find(l => l.d?.id === el.dataset.id) || {}).id; if (!id) return; S.os.lender = id; S.os.found = el.dataset.found ? id : null; S.os.reviewPreview = ''; S.os.rv = {}; S.os.rvErr = ''; if (S.route !== 'pinjol') location.hash = '#pinjol'; else { lastRoute = null; render(); lastRoute = 'pinjol'; window.scrollTo(0, 0); } },
  'os-illegal': el => { const i = S.os.result?.ill?.[+el.dataset.v]; if (i) { S.os.result = { kind: 'illegal', item: i }; render(); } },
  'os-pick-ill': el => { const i = ILL[+el.dataset.v]; if (i) showLookup({ kind: 'illegal', item: i }); },
  'os-set': el => { S.os[el.dataset.f] = el.dataset.v; render(); },
  cmp: el => { const id = el.dataset.id, c = S.os.cmp; if (c.includes(id)) S.os.cmp = c.filter(x => x !== id); else { if (c.length >= 3) toast('Maksimal 3 pinjol; yang pertama dikeluarkan'); S.os.cmp = [...c, id].slice(-3); announce(`${licById(id)?.name} masuk perbandingan`); } store.set('cmp', S.os.cmp); render(); },
  'il-more': () => { S.os.ilN += 60; render(); },
  calc: el => { const c = calcState(); c[el.dataset.f] = el.dataset.v; if (el.dataset.f === 'type' && el.dataset.v === 'umkm' && c.amount <= 50000000) c.amount = 100000000; if (el.dataset.f === 'type' && el.dataset.v !== 'umkm' && c.amount > 50000000) c.amount = 50000000; render(); },
  'calc-set': el => { Object.assign(calcState(), JSON.parse(el.dataset.v)); render(); window.scrollTo({ top: 0 }); announce('Kalkulator diperbarui'); },
  'calc-to-pilah': () => { const c = calcState(); Object.assign(S.pilah, { need: c.amount, months: c.months, purpose: c.type === 'konsumtif' ? 'konsumtif' : 'produktif', step: 2 }); },
  'calc-lender': el => { const l = licById(el.dataset.id), d = l?.d, ri = d && rateInfo(d); if (!ri || ri.daily == null) return; Object.assign(calcState(), { mode: 'manual', rate: ri.daily, unit: 'day', admin: d.adminPct != null && d.adminUnit !== 'month' ? d.adminPct / 100 : null, lender: l.name, type: d.purpose === 'produktif' ? 'mikro' : 'konsumtif' }); },
  print: () => window.print(),
  glossary: el => { S.drawer = { tab: 'kamus', term: el.dataset.v || null, q: '' }; render(); },
  ai3: el => askAI(el.dataset.key, el.dataset.prompt, { json: true }),
  // test mode
  't-start': () => { S.test = newTest(); if (location.hash !== '#main') location.hash = '#main'; render(); window.scrollTo(0, 0); },
  't-quit': () => { S.test = null; location.hash = '#home'; },
  't-next': () => { const t = S.test; if (t.stage === 2) t.taskEnd = Date.now(); t.stage++; t.hint = ''; render(); window.scrollTo({ top: 0 }); },
  't-step': el => { const t = S.test; if (el.dataset.mark) t.marks[el.dataset.mark] = true; t.st.step = +el.dataset.v; t.hint = ''; render(); window.scrollTo({ top: 0 }); },
  't-help': () => { const t = S.test; t.help++; t.hint = DATA.hints[['headroom', 'ladder', 'match'][t.st.step - 1]]; render(); },
  't-fb': el => { const f = S.test.feedback; f[el.dataset.f] = el.dataset.f === 'help' ? el.dataset.v : +el.dataset.v; render(); },
  't-finish': async () => { const t = S.test; t.endedAt = Date.now(); t.stage = 5; const rec = testRecord(t); t.saved = (S.cap.canWrite && S.cap.team) ? 'saving' : 'code'; render(); if (t.saved === 'saving') { t.saved = (await saveTest(rec)) ? 'db' : 'code'; render(); } },
  'import-code': async () => { const v = document.getElementById('imp-code').value; try { const rec = decodeRecord(v); const ok = await saveTest(rec); S.importMsg = ok ? 'Hasil tersimpan.' : 'Gagal menyimpan. Pastikan kamu pemilik/editor.'; } catch { S.importMsg = 'Kode tidak valid. Pastikan disalin utuh, diawali FW1.'; } render(); },
};
const CHG = {
  persona: () => {},
  ack: el => { S.overlay.ack = el.checked; render(); },
  quiz: el => { S.test[el.dataset.set][+el.dataset.i] = +el.value; render(); },
  't-field': el => { const t = S.test; const f = el.dataset.f; if (f === 'consent') t.consent = el.checked; else if (f === 'comment') t.feedback.comment = el.value; else t[f] = el.value; render(); },
  'todo-done': el => { const p = S.profiles.saya, id = el.dataset.id; p.done = p.done || {}; p.done[id] = el.checked;
    if (id === 'bpjs' && el.checked) { p.insurance = true; toast('BPJS dicatat. Skor kondisi keuangan diperbarui.'); }
    persist(); render(); if (id === 'slik' && el.checked) announce('Pilih hasil cek SLIK-mu'); },
  'pilah-ackbox': el => { S.pilah.ackBox = el.checked; queueRender(); },
  'plan-toggle': el => { S.cek.off = S.cek.off || {}; S.cek.off[el.dataset.id] = !el.checked; queueRender(); },
  'calc-late': el => { calcState().lateOn = el.checked; render(); },
  'cmp-add': el => { if (el.value) { S.os.cmp = [...S.os.cmp.filter(x => x !== el.value), el.value].slice(-3); store.set('cmp', S.os.cmp); render(); } },
  'pulih-toggle': el => { S.pulih[el.dataset.k] = el.checked; render(); },
  'imp-file': el => { const f = el.files?.[0]; if (!f) return; const rd = new FileReader(); rd.onload = () => { S.importText = String(rd.result).slice(0, 200000); S.importRes = parseStatement(S.importText); render(); }; rd.readAsText(f); },
};
async function sendChat(q) {
  q = (q || '').trim(); if (!q || S.chatBusy) return;
  if (!S.cap.sample) { S.chat.push({ role: 'user', content: q }, { role: 'assistant', content: ruleAnswer(q) || 'Pertanyaan bebas belum bisa dijawab di versi ini. Coba pertanyaan cepat di atas atau lihat Kamus istilah.' }); S.drawer = S.drawer || { tab: 'chat' }; render(); return; }
  S.chat.push({ role: 'user', content: q }); S.chat.push({ role: 'assistant', content: 'Sedang berpikir…' }); S.chatBusy = true; render();
  const turns = [{ role: 'user', content: AI_RULES + '\n\nData pengguna:\n' + context() + '\n\nJawab pertanyaan berikutnya berdasarkan data ini.' }, ...S.chat.slice(0, -1).slice(-8)];
  try {
    const { text } = await S.cap.sample(turns, { cache: false, onText: ({ text }) => { S.chat[S.chat.length - 1].content = text; const el = document.getElementById('chat-last'); if (el) el.textContent = text; } });
    S.chat[S.chat.length - 1].content = text;
  } catch (e) { if (HIDE.includes(e?.code)) S.cap.sample = null; S.chat[S.chat.length - 1].content = e?.text || AI_ERR[e?.code] || 'AI belum bisa menjawab sekarang.'; }
  S.chatBusy = false; render();
}

document.addEventListener('click', e => {
  const sg = e.target.closest('[data-sug]'); if (sg) { const ul = sg.closest('.sugg'); pickSug(document.getElementById(ul.id.replace(/-list$/, '')), +sg.dataset.sug); return; }
  const el = e.target.closest('[data-act]'); if (!el) return;
  if (el.dataset.act === 'close-bg' && e.target !== el) return;
  const fn = ACT[el.dataset.act]; if (!fn) return;
  if (el.tagName === 'BUTTON' || el.dataset.act === 'close-bg') e.preventDefault();
  if (el.tagName === 'A' && el.getAttribute('href')?.startsWith('#')) { fn(el, e); return; }
  fn(el, e);
});
document.addEventListener('keydown', e => {
  if (e.target.matches?.('[data-sug-input]')) {
    const inp = e.target, open = sugList(inp) && !sugList(inp).hidden;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!open) renderSug(inp); else moveSug(inp, e.key === 'ArrowDown' ? 1 : -1); return; }
    if (e.key === 'Enter' && open && SUG.active >= 0) { e.preventDefault(); pickSug(inp, SUG.active); return; }
    if (e.key === 'Escape' && open) { e.preventDefault(); closeSug(inp); return; }
  }
  if (e.key === 'Escape' && S.overlay) { S.overlay = null; render(); }
  else if (e.key === 'Escape' && S.drawer) { S.drawer = null; render(); document.querySelector('[data-act="drawer"]')?.focus(); }
  if (e.key === 'Enter' && e.target.matches('tr[data-act]')) ACT[e.target.dataset.act]?.(e.target, e);
  if (e.key === 'Enter' && e.target.matches('input[data-k],input[data-pf],input[data-sy]:not([type=radio])')) { e.preventDefault(); e.target.dispatchEvent(new Event('change', { bubbles: true })); }
});
document.addEventListener('change', e => {
  const el = e.target;
  if (el.dataset.actChange) { CHG[el.dataset.actChange]?.(el, e); return; }
  if (el.dataset.k) {
    const path = el.dataset.k; const val = parseVal(el);
    if (path.startsWith('t.')) setPath(S.test.st, path.slice(2), val); else setPath(S, path, val);
    if (path === 'pilah.need' || path === 't.need') { const st = path === 't.need' ? S.test.st : S.pilah; if (st.useSavings != null && st.need != null) st.useSavings = Math.min(st.useSavings, st.need); }
    queueRender(); return;
  }
  if (el.dataset.pf) { setPath(P(), el.dataset.pf, parseVal(el)); persist(); queueRender(); return; }
  if (el.dataset.sy) {
    const p = S.profiles.saya, path = el.dataset.sy; setPath(p, path, parseVal(el));
    if (path === 'hasLoans' && p.hasLoans && !p.loans.length) p.loans.push({ id: 'l' + Date.now(), name: '', type: '', instalment: null, dueDay: null, months: null, rateIn: null });
    if (path === 'familyAns' && !p.familyAns) p.family = null;
    if (p.setup) wizFinalizeLight(p);
    delete S.wiz.errors[path]; if (S.wiz.errors._step && Object.keys(S.wiz.errors).length === 1) delete S.wiz.errors._step;
    persist(); queueRender(); return;
  }
  if (el.dataset.rv) { S.os.rv[el.dataset.rv] = el.value; if (el.type === 'radio') { S.os.rvErr = ''; } }
});
let liveTimer = null;
document.addEventListener('input', e => {
  const el = e.target;
  if (el.dataset?.rv && el.type !== 'radio') S.os.rv[el.dataset.rv] = el.value;
  // sliders: update the number next to them while dragging, full recalculation on release
  if (el.type === 'range' && el.dataset.k) { const v = parseVal(el); setPath(S, el.dataset.k, v); const b = el.parentElement?.querySelector('.row b.num'); if (b) b.textContent = el.dataset.k === 'calc.months' ? v + ' bulan' : rp(v); }
  // live search boxes
  if (el.dataset?.live === 'kamus') { S.drawer.q = el.value; clearTimeout(liveTimer); liveTimer = setTimeout(queueRender, 150); }
  if (el.matches?.('[data-sug-input]')) { if (el.id === 'osq') S.os.q = el.value; else S.os.qc = el.value; renderSug(el); }
  if (el.id === 'listq' || el.id === 'ilq') { setPath(S, el.dataset.k, el.value); if (el.id === 'ilq') S.os.ilN = 60; clearTimeout(liveTimer); liveTimer = setTimeout(queueRender, 180); }
});
document.addEventListener('submit', e => {
  const f = e.target.dataset.form; if (!f) return; e.preventDefault();
  if (f === 'quickcheck' || f === 'oscheck') { const inp = e.target.querySelector('[data-sug-input]'); const q = inp ? inp.value : ''; closeSug(inp); S.os.q = q; showLookup(lookup(q)); }
  if (f === 'addloan') { const p = P(); const name = document.getElementById('nl-name').value.trim(); const inst = digits(document.getElementById('nl-inst').value); if (!name || !inst) { toast('Isi nama dan cicilan'); return; } const months = +document.getElementById('nl-months').value || 1; p.loans.push({ id: 'l' + Date.now(), name, type: 'lainnya', instalment: inst, outstanding: inst * months, months, dueDay: Math.min(31, Math.max(1, +document.getElementById('nl-due').value || 1)), rateMonthly: 0.02 }); if (isSaya(p)) p.hasLoans = true; persist(); render(); }
  if (f === 'chat') { const v = document.getElementById('chat-in').value; sendChat(v); }
  if (f === 'review') {
    const v = S.os.rv || {};
    if (!v.collection || !v.fees) { S.os.rvErr = 'Pilih nilai 1–5 untuk cara penagihan dan keterbukaan biaya.'; render(); document.querySelector('[data-rv="collection"]')?.focus(); return; }
    if (!String(v.text || '').trim() && !digits(v.amount || '')) { S.os.rvErr = 'Tulis cerita singkat atau isi jumlah pinjaman.'; render(); document.getElementById('rv-text')?.focus(); return; }
    S.os.rvErr = '';
    const rec = { lender: S.os.lender, amount: digits(v.amount || ''), months: +v.months || 0, paid: digits(v.paid || ''), collection: +v.collection, fees: +v.fees, text: String(v.text || '').slice(0, 400), at: new Date().toISOString() };
    if (S.cap.db && S.cap.canWrite) { S.cap.db.collection('reviews').add(rec).then(() => toast('Ulasan terkirim'), () => toast('Ulasan gagal dikirim')); S.os.reviewPreview = ''; S.os.rv = {}; render(); }
    else { S.os.reviewPreview = `${rec.amount ? rp(rec.amount) : ''} ${rec.months ? rec.months + ' bln' : ''} · penagihan ${rec.collection}/5 · transparansi ${rec.fees}/5 · ${rec.text}`; render(); }
  }

});
window.addEventListener('hashchange', route);
route();
initCaps();
