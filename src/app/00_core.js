const rp = FW.rp, rps = FW.rpShort, pct = FW.pct;
const clone = o => JSON.parse(JSON.stringify(o));
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const digits = v => Number(String(v).replace(/[^\d]/g, '')) || 0;
const fmtIn = n => (Math.round(n) || 0).toLocaleString('id-ID');
const ROUTES = ['home', 'mulai', 'cek', 'pilah', 'pulih', 'kalkulator', 'openspace', 'berizin', 'pinjol', 'ilegal', 'keluhan', 'bandingkan', 'statistik', 'main', 'hasil'];
const ALIAS = { uji: 'main', ringkasan: 'cek', misi: 'main' };
const OS_ROUTES = ['openspace', 'berizin', 'pinjol', 'ilegal', 'keluhan', 'bandingkan', 'statistik'];
const TITLES = { home: 'Beranda', mulai: 'Isi data saya', ringkasan: 'Hasil keuanganmu', cek: 'CEK', pilah: 'PILAH', pulih: 'PULIH', kalkulator: 'Kalkulator pinjaman', openspace: 'Openspace', berizin: 'Pindar berizin', pinjol: 'Profil pinjol', ilegal: 'Pinjol ilegal', keluhan: 'Pemantau keluhan', bandingkan: 'Bandingkan pinjol', statistik: 'Statistik industri', main: 'Tantangan 3 Hari', hasil: 'Data validasi' };
const ZONE = { safe: ['Aman', 'z-safe'], stretch: ['Mepet', 'z-stretch'], danger: ['Bahaya', 'z-danger'] };
const zpill = z => `<span class="pill ${ZONE[z][1]}">${ZONE[z][0]}</span>`;
const AV = { kirana: '#2E8B6A', dimas: '#C9801A', bima: '#134A36', saya: '#5B6B8A' };
const store = { get(k) { try { return JSON.parse(localStorage.getItem('finwise:' + k)); } catch { return null; } }, set(k, v) { try { localStorage.setItem('finwise:' + k, JSON.stringify(v)); } catch {} } };

/* ---------- state ---------- */
// "Data saya" starts completely empty: no amounts, no answers. The wizard (#mulai) fills it.
const SAYA_CATS = [['Tempat tinggal & tagihan', 'need', true], ['Makan & kebutuhan harian', 'need'], ['Transport', 'need'], ['Pulsa & internet', 'need', true], ['Pendidikan & kesehatan', 'need'], ['Nongkrong & belanja', 'want'], ['Pesan-antar makanan', 'want'], ['Langganan & hiburan', 'want', true], ['Lainnya', 'want']];
function blankSaya() {
  return { id: 'saya', v: 3, setup: false, nick: '', name: 'Kamu', tag: 'Data milikmu', stage: null, stability: null, pinjolExp: null, story: 'Data milikmu, hanya tersimpan di browser ini.', home: 'cek',
    incomes: [{ id: 'i1', label: '', amount: null, type: null, payday: null }],
    spendMode: null, totalSpend: null,
    items: SAYA_CATS.map((c, i) => ({ id: 's' + i, name: c[0], kind: c[1], amount: null, day: null, fixed: !!c[2] })), spending: [],
    familyAns: null, family: null, hasLoans: null, loans: [], emergencyFund: null, savingMonthly: null,
    onTimeAns: null, onTime: null, slik: null, insurance: null, plan: null, access: { koperasi: null, bank: null } };
}
// older saved profiles (v2) keep their numbers: their spending rows become the itemised list
function migrateSaya(x) {
  if (!x || typeof x !== 'object') return blankSaya();
  if (x.v === 3) return x;
  if (x.v === 2) { const b = blankSaya(); return { ...b, ...x, v: 3, items: (x.spending || b.items).map(c => ({ ...c })), spendMode: 'rinci', totalSpend: null }; }
  return blankSaya();
}
const storedSaya = store.get('saya');
const S = {
  route: 'home',
  personaId: 'saya', // example personas were removed from the interface; everything runs on the user's own data
  profiles: { kirana: clone(DATA.personas.kirana), dimas: clone(DATA.personas.dimas), bima: clone(DATA.personas.bima), saya: migrateSaya(storedSaya) },
  cek: {}, pilah: {}, pulih: {},
  os: { q: '', result: null, lender: 'adakami', sort: 'skor', filter: 'semua', only: 'lengkap', listQ: '', rv: {}, rvErr: '', cmp: store.get('cmp') || [], cmpAmount: 5000000, cmpMonths: 6, ilQ: '', ilCh: 'semua', ilN: 60 },
  calc: null,
  wiz: { step: 0, errors: {}, tried: false, confirmWipe: false },
  test: null, results: [], reviews: [], resultsState: 'idle', importMsg: '',
  cap: { db: null, sample: null, user: null, canWrite: false, team: false, ready: false },
  ai: {}, chat: [], overlay: null, drawer: null, toast: '', textSize: store.get('textSize') || 0,
};
if (!S.profiles[S.personaId]) S.personaId = 'saya';
S.wiz.step = S.profiles.saya.setup ? 0 : Math.min(4, S.profiles.saya.wstep || 0);
const P = () => S.profiles[S.personaId];
const isSaya = p => (p || P()).id === 'saya';
const needsSetup = () => S.personaId === 'saya' && !S.profiles.saya.setup;
const displayName = p => p.id === 'saya' ? (p.nick || 'Kamu') : p.name;
const STAGES = [['mahasiswa', 'Pelajar/mahasiswa'], ['karyawan', 'Karyawan'], ['sandwich', 'Karyawan yang ikut menanggung keluarga'], ['wirausaha', 'Wirausaha / pekerja lepas'], ['lainnya', 'Lainnya']];
const STABILITY = [['sangat', 'Sangat stabil'], ['stabil', 'Stabil'], ['tidak', 'Tidak stabil / naik-turun']];
const PINJOL_EXP = [['belum', 'Belum pernah'], ['lancar', 'Pernah, selalu lancar'], ['masalah', 'Pernah telat / bermasalah']];
const totalMode = p => p.id === 'saya' && p.spendMode === 'total';

function resetStageState() {
  const p = P();
  if (isSaya(p)) {
    S.cek = { applied: false, off: {}, extraIn: null, offer: { amount: null, rate: null, unit: 'month', months: null }, goal: { label: '', amount: null } };
    S.pilah = { step: 1, needLabel: '', need: null, hours: null, useSavings: null, family: null, purpose: null, months: null, mode: 'seimbang', picked: null, why: false, showOut: false };
    S.pulih = { extra: null, method: 'avalanche', restructure: false, split: false, temp: { label: 'Pinjaman baru untuk menutup cicilan', amount: null, rate: null, unit: 'day', months: null }, letterLoan: (p.loans[0] || {}).id };
    return;
  }
  const need = p.need || (p.goal ? { label: p.goal.label, amount: p.goal.amount, hours: 720, family: 0 } : p.temptation ? { label: 'Menutup kekurangan kas', amount: p.temptation.amount, hours: 72, family: 0 } : { label: 'Kebutuhan dana', amount: 5000000, hours: 168, family: 0 });
  S.cek = { applied: false, off: {}, extraIn: null, offer: p.goal?.offer ? { amount: p.goal.amount, ...p.goal.offer } : { amount: 3000000, rate: 0.03, unit: 'month', months: 6 }, goal: p.goal ? { label: p.goal.label, amount: p.goal.amount } : { label: 'Dana darurat 3 bulan', amount: 3 * (FW.needs(p) + (p.family || 0)) } };
  S.pilah = { step: 1, needLabel: need.label, need: need.amount, hours: need.hours, useSavings: Math.min(p.emergencyFund || 0, need.amount), family: need.family || 0, purpose: p.temptation ? 'produktif' : 'konsumtif', months: null, mode: 'seimbang', picked: null, why: false, showOut: false };
  S.pulih = { extra: 1000000, method: 'avalanche', restructure: false, split: false, temp: p.temptation ? { ...p.temptation } : { label: 'Pinjaman baru untuk menutup cicilan', amount: 5000000, rate: 0.003, unit: 'day', months: 3 }, letterLoan: (p.loans.find(l => l.restructure) || p.loans[0] || {}).id };
}
resetStageState();

/* ---------- capabilities ---------- */
let unsubReviews = null, unsubTests = null;
async function initCaps() {
  if (!window.claude || typeof window.claude.use !== 'function') { S.cap.ready = true; return; }
  try {
    const [db, sample, user] = await Promise.all(['db', 'sample', 'user'].map(n => window.claude.use(n).catch(() => null)));
    S.cap.db = db; S.cap.sample = sample; S.cap.user = user;
    if (user) {
      try { S.cap.isOwner = !!(await user.isOwner()); } catch {}
      try { S.cap.canEdit = !!(await user.canEdit()); } catch {}
      let cw = null; try { cw = await user.can('data.write'); } catch {}
      S.cap.canWrite = !!db && (cw === null || cw === undefined ? true : !!cw);
    } else S.cap.canWrite = !!db;
    S.cap.team = !!(S.cap.isOwner || S.cap.canEdit);
  } catch {}
  S.cap.ready = true;
  subscribeReviews();
  if (S.route === 'hasil') subscribeTests();
  render();
}
function subscribeReviews() {
  if (!S.cap.db || unsubReviews) return;
  try {
    unsubReviews = S.cap.db.collection('reviews').orderBy('at', 'desc').limit(200).onSnapshot(s => { S.reviews = s.docs.map(d => ({ id: d.id, ...d.data() })); if (S.route === 'openspace') render(); }, () => {});
  } catch {}
}
function subscribeTests() {
  if (!S.cap.db || unsubTests || !S.cap.team) return;
  S.resultsState = 'loading';
  const t = setTimeout(() => { if (S.resultsState === 'loading') { S.resultsState = 'slow'; render(); } }, 10000);
  try {
    unsubTests = S.cap.db.collection('tests').orderBy('at', 'desc').limit(500).onSnapshot(s => {
      clearTimeout(t); S.results = s.docs.map(d => ({ id: d.id, ...d.data() })); S.resultsState = 'ok'; if (S.route === 'hasil') render();
    }, () => { clearTimeout(t); S.resultsState = 'error'; render(); });
  } catch { S.resultsState = 'error'; }
}

/* ---------- AI (optional, explanations only; numbers always come from the engine) ---------- */
const AI_RULES = 'Kamu adalah asisten FinWise, pendamping keuangan untuk anak muda Indonesia. Jawab dalam Bahasa Indonesia yang santai tapi sopan (pakai "kamu"). Pakai HANYA angka yang diberikan di data; jangan menghitung atau mengarang angka baru. Jangan merekomendasikan pinjaman tidak berizin. Jangan menjanjikan hasil. Maksimal 120 kata kecuali diminta lain. Akhiri dengan satu langkah konkret berikutnya. Ini bukan nasihat keuangan profesional.';
function context() {
  const p = P(), h = FW.headroom(p), hs = FW.health(p);
  const lines = [
    `Profil: ${displayName(p)} (${isSaya(p) ? (STAGES.find(x => x[0] === p.stage)?.[1] || 'data sendiri') : p.tag})${p.stability ? `, penghasilan ${STABILITY.find(x => x[0] === p.stability)?.[1].toLowerCase()}` : ''}.`,
    totalMode(p) ? 'Catatan: pengguna baru mengisi TOTAL pengeluaran (belum dirinci per pos), jadi pemisahan pokok vs keinginan belum diketahui.' : '',
    `Dana darurat ${rp(p.emergencyFund || 0)}; menabung rutin ${rp(p.savingMonthly || 0)}/bulan.`,
    `Pemasukan/bulan ${rp(FW.income(p))}; pengeluaran pokok ${rp(FW.needs(p))}; keinginan ${rp(FW.wants(p))}; kirim keluarga ${rp(p.family || 0)}; cicilan ${rp(FW.instalments(p))}; sisa/bulan ${rp(h.sur)}.`,
    `DSR sekarang ${pct(h.dsrNow)}. Batas cicilan baru aman ${rp(h.ceiling)}/bulan (lensa DSR ${rp(h.lens1)}, lensa arus kas ${rp(h.lens2)}).`,
    `Skor kesehatan ${hs.total}/100 (${hs.status}); indikator terlemah: ${hs.weakest.label}.`,
    `Utang aktif: ${p.loans.map(l => `${l.name} ${rp(l.instalment)}/bln jatuh tempo tgl ${l.dueDay}`).join('; ') || 'tidak ada'}.`,
  ];
  return lines.filter(Boolean).join('\n');
}
const AI_ERR = { rate_limited: 'Terlalu banyak permintaan. Coba lagi sebentar lagi.', refused: 'AI tidak bisa menjawab ini. Coba pertanyaan lain.', session_expired: 'Masuk kembali ke Claude untuk memakai AI.', upstream_error: 'Koneksi ke AI terputus. Coba lagi.', empty_completion: 'AI tidak memberi jawaban. Coba lagi.' };
const HIDE = ['not_granted', 'sampling_disabled', 'not_declared', 'capability_disabled', 'capability_removed'];
async function askAI(key, prompt, { json = false } = {}) {
  const sample = S.cap.sample; if (!sample) return;
  S.ai[key] = { loading: true, text: '', prompt }; render();
  try {
    if (json) {
      const { text } = await sample(AI_RULES + '\n\n' + prompt + '\n\nBalas HANYA dengan JSON valid tanpa teks lain.', { cache: true });
      const m = String(text).match(/\{[\s\S]*\}/); const val = m ? JSON.parse(m[0]) : null;
      S.ai[key] = val ? { json: val, prompt } : { error: 'AI belum memberi jawaban yang bisa dibaca. Coba lagi.', prompt };
    } else {
      const { text } = await sample(AI_RULES + '\n\n' + prompt, { cache: true, onText: ({ text }) => { if (S.ai[key]) S.ai[key].text = text; const el = document.getElementById('ai-' + key); if (el) el.textContent = text; } });
      S.ai[key] = { text, prompt };
    }
  } catch (e) {
    if (HIDE.includes(e?.code)) { S.cap.sample = null; S.ai[key] = null; }
    else S.ai[key] = { text: e?.text || '', error: AI_ERR[e?.code] || 'AI belum bisa menjawab sekarang.', prompt };
  }
  render();
}
// run once per stable prompt when a result page opens (the platform asks the viewer's consent on the first call)
function aiAuto(key, prompt, opts) {
  if (!S.cap.sample) return;
  const st = S.ai[key]; if (st && (st.prompt === prompt || st.loading)) return;
  S.ai[key] = { loading: true, text: '', prompt };
  setTimeout(() => askAI(key, prompt, opts), 0);
}
function aiBlock(key, label, prompt) {
  const st = S.ai[key];
  if (!S.cap.sample && !st) return '';
  return `<div class="stack" style="gap:8px">
    ${st?.text || st?.loading ? `<div class="ai-out" id="ai-${key}" aria-live="polite">${esc(st.text || 'Sedang berpikir…')}</div>` : ''}
    ${st?.error ? `<p class="small" style="color:var(--danger)">${esc(st.error)}</p>` : ''}
    ${S.cap.sample ? `<div><button class="btn ghost sm" data-act="ai" data-key="${key}" data-prompt="${esc(prompt)}" ${st?.loading ? 'disabled' : ''}>${st?.text ? 'Jelaskan ulang' : label}</button> <span class="tiny muted">AI hanya menjelaskan; semua angka dari mesin hitung FinWise.</span></div>` : ''}
  </div>`;
}
// three-column AI analysis (fits / watch out / next step) with a rule-based version that always shows
function ai3(key, prompt, fallback, { auto = false, label = 'Analisis dengan AI', noAI = false } = {}) {
  if (auto && !noAI) aiAuto(key, prompt, { json: true });
  const st = noAI ? null : S.ai[key], j = st?.json;
  const cols = j ? { cocok: j.cocok, waspada: j.waspada, saran: j.saran } : fallback;
  const list = v => (Array.isArray(v) ? v : [v]).filter(Boolean).slice(0, 4).map(x => `<li>${esc(x)}</li>`).join('');
  return `<div class="ai3"><div class="row between"><div class="row" style="gap:8px"><span class="ai-badge">${j ? 'Analisis AI' : 'Analisis FinWise'}</span>${st?.loading ? '<span class="tiny muted" role="status">AI sedang menganalisis…</span>' : ''}</div>
    ${S.cap.sample && !noAI && !auto && !st?.loading ? `<button class="btn ghost sm" data-act="ai3" data-key="${key}" data-prompt="${esc(prompt)}">${j ? 'Analisis ulang' : label}</button>` : ''}</div>
    <div class="grid g3" style="margin-top:10px">
     <div class="ai3c ok"><b>Kenapa cocok</b><ul>${list(cols.cocok)}</ul></div>
     <div class="ai3c warn"><b>Yang perlu diwaspadai</b><ul>${list(cols.waspada)}</ul></div>
     <div class="ai3c tip"><b>Saran spesifik</b><ul>${list(cols.saran)}</ul></div>
    </div>
    ${st?.error ? `<p class="tiny" style="color:var(--danger);margin-top:6px">${esc(st.error)}</p>` : ''}
    <p class="tiny muted" style="margin-top:6px">${j ? 'Ditulis AI dari angka mesin hitung FinWise; bukan nasihat keuangan profesional.' : S.cap.sample || noAI ? 'Disusun dari aturan FinWise.' : 'Disusun dari aturan FinWise. Penjelasan AI muncul jika FinWise dibuka di claude.ai dalam keadaan login.'}</p></div>`;
}
const AI3_FORMAT = 'Format JSON: {"cocok":["…"],"waspada":["…"],"saran":["…"]}, masing-masing 2–3 poin singkat (maks 25 kata per poin), Bahasa Indonesia santai.';

/* ---------- small renderers ---------- */
function rpInput(id, value, attrs = '') { return `<div class="rp"><input class="in num" id="${id}" inputmode="numeric" autocomplete="off" value="${value == null || value === '' ? '' : fmtIn(value)}" ${attrs}></div>`; }
const blankNum = v => v == null || v === '' ? '' : v;
function monthStrip(markers) {
  const sorted = [...markers].sort((a, b) => a.day - b.day);
  const desc = 'Peta tanggal: ' + sorted.map(m => `tanggal ${m.day} ${m.label}`).join(', ');
  // markers on the same day share one dot; labels that would collide drop to a second row under the dates
  const groups = []; sorted.forEach(m => { const g = groups.find(x => x.day === m.day); if (g) g.items.push(m); else groups.push({ day: m.day, items: [m] }); });
  let lastTop = -99, low = false;
  const html = groups.map(g => {
    const x = ((g.day - 0.5) / 30 * 100).toFixed(2), label = g.items.map(m => m.label).join(' + ');
    low = g.day - lastTop < 4 + label.length / 3 ? !low : false; if (!low) lastTop = g.day;
    return `<div class="mk" style="left:${x}%;background:${g.items[0].color}"></div><div class="tx${low ? ' low' : ''}${g.day <= 4 ? ' l' : g.day >= 27 ? ' r' : ''}" style="left:${x}%;color:${g.items.length > 1 ? 'var(--ink)' : g.items[0].color}">${esc(label)}</div><div class="dd" style="left:${x}%">${g.day}</div>`;
  }).join('');
  return `<div class="month${groups.some((g, i) => i && g.day - groups[i - 1].day < 4 + groups[i].items.map(m => m.label).join(' + ').length / 3) ? ' two' : ''}" role="img" aria-label="${esc(desc)}"><div class="ln"></div>${html}</div>`;
}
function zoneBar(h, mark) {
  const max = Math.max(h.stretchMax * 1.25, h.ceiling * 1.6, 100000, mark ? mark * 1.1 : 0);
  const a = h.ceiling / max * 100, b = Math.max(0, h.stretchMax - h.ceiling) / max * 100, c = 100 - a - b;
  return `<div class="zbar" aria-hidden="true"><i style="width:${a}%;background:var(--safe)"></i><i style="width:${b}%;background:var(--stretch)"></i><i style="width:${c}%;background:var(--danger)"></i></div>
   <div class="zlabels"><span style="width:${a}%;color:var(--safe)">Aman ≤ ${rps(h.ceiling)}</span><span style="width:${b}%;color:var(--stretch)">${b > 8 ? 'Mepet' : ''}</span><span style="flex:1;text-align:right;color:var(--danger)">Bahaya &gt; ${rps(h.stretchMax)}</span></div>`;
}
function whoCard() { return ''; }

/* ---------- real lender data (team spreadsheets; see realdata.js) ---------- */
const RL = REAL.lenders;
const nf = (x, d = 2) => Number(x).toLocaleString('id-ID', { maximumFractionDigits: d });
const dateID = iso => { const [y, m, d] = String(iso).split('-').map(Number); return (d ? d + ' ' : '') + ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][(m || 1) - 1] + ' ' + y; };
const REV_TOTAL = FW.sum(RL, l => l.reviews ? l.reviews.n : 0), CLUSTER_TOTAL = FW.sum(RL, l => l.clusters.length), REV_APPS = RL.filter(l => l.reviews).length;
const REV_TO = RL.filter(l => l.reviews).map(l => l.reviews.to).sort().pop();
const CAMILAN = ['Kamera', 'Mikrofon', 'Lokasi'];
function rateInfo(l) {
  if (l.rateIsMin) return { daily: null, label: `mulai ${nf(l.monthly)}%/bulan`, min: true };
  if (l.dailyMax) return { daily: l.dailyMax / 100, label: `maks ${nf(l.dailyMax)}%/hari` };
  if (l.monthly) return { daily: l.monthly / 100 / 30, label: `${nf(l.monthly)}%/bulan` };
  if (l.aprMax) return { daily: l.aprMax / 100 / 365, label: `maks ${nf(l.aprMax)}%/tahun` };
  return null;
}
const adminFee = (l, months) => l.adminPct == null ? 0 : (l.adminUnit === 'month' ? l.adminPct / 100 * months : l.adminPct / 100);
const kindLabel = l => l.kind === 'Syariah' ? 'Syariah · produktif' : l.purpose === 'both' ? 'Konsumtif & produktif' : l.purpose === 'produktif' ? 'Produktif (usaha)' : 'Konsumtif';
// maximum legal cost of borrowing Rp1 jt for 3 months, from the published (RIPLAY) rate + admin, capped by OJK
function sampleCost(l) {
  const ri = rateInfo(l); if (!ri || ri.daily == null) return null;
  const cap = FW.ojkCap(l.purpose === 'produktif' ? 'produktif' : 'konsumtif', 3, 1e6);
  return Math.round(1e6 * Math.min(ri.daily * 90 + adminFee(l, 3), cap * 90, 1));
}
// Smart Loan Match products for "Data saya": real licensed lenders, priced at their published maximum
function realProducts(st, amount) {
  const months = st.months || 0, purpose = st.purpose || 'konsumtif';
  const generic = DATA.products.filter(x => x.id === 'koperasi' || x.id === 'bank').map(x => ({ ...x, months: months || x.months, generic: true }));
  const real = RL.map(l => {
    const ri = rateInfo(l);
    const base = { id: 'r-' + l.id, real: l.id, name: l.name, kind: 'pindar', legal: 'Berizin OJK', hours: null, min: l.min || 0, max: l.max || Infinity,
      rating: l.reviews?.avg, positive: l.reviews?.pos, privacy: 7 + (l.iso27001 ? 1.5 : 0) + (l.iso27701 ? 1.5 : 0), months, unit: 'day' };
    if (l.purpose !== 'both') base.purpose = l.purpose;
    if (!ri || ri.daily == null) return { ...base, rate: 0, unavailable: 'Biaya maksimum tidak dipublikasikan lengkap' };
    const days = months * 30;
    if (l.tenorMinDays && days + 5 < l.tenorMinDays) return { ...base, rate: ri.daily, unavailable: `Tenor minimal ±${Math.round(l.tenorMinDays / 30)} bulan` };
    if (l.tenorMaxDays && days - 5 > l.tenorMaxDays) return { ...base, rate: ri.daily, unavailable: `Tenor maksimal ±${Math.round(l.tenorMaxDays / 30)} bulan` };
    const cap = FW.ojkCap(purpose, months, amount);
    return { ...base, rate: ri.daily, feePct: adminFee(l, months), maxTotalPct: Math.min(cap * days, purpose === 'konsumtif' ? 1 : Infinity),
      rateLabel: ri.label, note: l.adminPct ? `admin ${l.adminUnit === 'month' ? nf(l.adminPct) + '%/bulan' : 'hingga ' + nf(l.adminPct) + '%'}` : '' };
  });
  const ill = REAL.illegal.map(i => ({ id: 'x-' + i.short.toLowerCase().replace(/\W/g, ''), name: i.short, kind: 'ilegal', illegal: true }));
  return [...generic, ...real, ...ill];
}
// for "Data saya", want categories above the 50/30/20 guideline get a suggested cap (same rule for everyone, no guessing)
function autoCaps(p0) {
  const p = clone(p0), inc = FW.income(p), w = FW.wants(p);
  if (!inc || w <= 0.30 * inc) return p;
  const f = 0.30 * inc / w;
  p.spending.forEach(c => { if (c.kind === 'want' && c.amount > 0) { c.cap = Math.floor(c.amount * f / 10000) * 10000; c.capWhy = 'Agar total keinginan ≤30% pendapatan (pedoman 50/30/20)'; } });
  return p;
}

/* ---------- header / footer ---------- */
const LOGO = `<a class="logo" href="#home" aria-label="FinWise, ke beranda"><svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20C4 10 10 4 21 3c0 11-6 17-15 17" fill="var(--green)"/><path d="M4 20 14 10" stroke="var(--card)" stroke-width="1.6"/></svg><span><span class="fin">Fin</span><span class="wise">Wise</span></span></a>`;
const SIZES = ['Normal', 'Besar', 'Sangat besar'];
const sizeBtn = () => `<button class="btn ghost sm textsize" data-act="textsize" aria-label="Ukuran teks: ${SIZES[S.textSize]}. Klik untuk ganti">Aa<span class="tiny">${['', '+', '++'][S.textSize]}</span></button>`;
function header() {
  const r = S.route, on = (...ss) => ss.includes(r) ? ' on" aria-current="page' : '', p = P(), blank = needsSetup();
  if (r === 'main' && S.test && S.test.stage > 0 && S.test.stage < 5) return `<header class="top"><div class="wrap">${LOGO}<span class="pill z-amber">Tantangan 3 Hari sedang berjalan</span><div class="who">${sizeBtn()}</div></div></header>`;
  return `<header class="top"><div class="wrap">
    ${LOGO}
    <nav class="mainnav" aria-label="Menu utama">
      <a href="#cek" class="${on('cek', 'mulai')}"><b>CEK</b> Keuangan</a>
      <a href="#pilah" class="${on('pilah')}"><b>PILAH</b> Pinjaman</a>
      <a href="#pulih" class="${on('pulih')}"><b>PULIH</b> Utang</a>
      <a href="#kalkulator" class="${on('kalkulator')}">Kalkulator</a>
      <a href="#openspace" class="${on(...OS_ROUTES)}">Cek Pinjol</a>
      <a href="#main" class="game${on('main')}">Tantangan</a>
      ${S.cap.team ? `<a href="#hasil" class="${on('hasil')}">Data validasi</a>` : ''}
    </nav>
    <div class="who">${blank ? '<a class="btn sm" href="#mulai">Isi data saya</a>' : `<a class="userchip" href="#mulai" data-act="wiz-edit" title="Ubah data"><span class="avatar sm" aria-hidden="true">${esc(displayName(p)[0])}</span><span>${esc(displayName(p))}<span class="tiny muted"> · ubah</span></span></a>`}<button class="btn sm amber" data-act="drawer" data-v="chat" aria-expanded="${!!S.drawer}">✦ Tanya FinWise</button>${sizeBtn()}</div>
  </div></header>`;
}
// page banner (Wasapada-style): one title, one sentence of purpose, the user's key number on the right
function banner({ tone = 'green', eyebrow, title, sub, right = '' }) {
  return `<section class="pbanner ${tone}"><div><div class="eyebrow">${eyebrow}</div><h1 tabindex="-1">${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div>${right ? `<div class="pb-right">${right}</div>` : ''}</section>`;
}
function userChip() {
  const p = P(); if (needsSetup()) return '';
  return `<div class="pbchip"><span class="avatar sm" aria-hidden="true">${esc(displayName(p)[0])}</span><div><b>${esc(displayName(p))}</b><div class="tiny">Masuk ${rps(FW.income(p))}/bln · aman cicil ≤ ${rps(FW.headroom(p).ceiling)}</div></div><a class="btn sm ghost" href="#mulai" data-act="wiz-edit">Ubah data</a></div>`;
}
// numbered section header so every page reads top-to-bottom as a sequence
const secHead = (n, id, title, sub) => `<div class="sec-h" id="${id}" tabindex="-1"><span class="sec-n" aria-hidden="true">${n}</span><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</div></div>`;
const secNav = items => `<nav class="secnav" aria-label="Bagian di halaman ini">${items.map(([id, l], i) => `<button data-act="goto-sec" data-id="${id}"><span>${i + 1}</span>${l}</button>`).join('')}</nav>`;
function footer() {
  return `<footer><div class="wrap"><span><b>FinWise</b> · prototipe Tim 20 elevATE untuk validasi pengguna. Data: daftar pindar berizin OJK (${OJK.licensedPeriod}), daftar pinjol ilegal Satgas PASTI (${OJK.illegalPeriod}), statistik LPBBTI OJK (${OJK.stats.period}), tarif RIPLAY per ${dateID('2026-04-30')}, dan ulasan Google Play. Tokoh dan pemberi pinjaman di Tantangan 3 Hari adalah fiktif. Bukan nasihat keuangan.</span><span class="row" style="gap:12px"><button class="linkbtn" data-act="glossary">Kamus istilah</button><span>Cek legalitas resmi: Kontak OJK 157 · WhatsApp 081-157-157-157</span></span></div></footer>`;
}
/* glossary: plain-language definitions, opened from any underlined term */
const TERMS = {
  'DSR': 'Debt Service Ratio: persentase pendapatan bulanan yang dipakai untuk membayar cicilan. Aman ≤30%, bahaya >40%.',
  'SLIK': 'Sistem Layanan Informasi Keuangan OJK, catatan resmi riwayat kreditmu. Bisa dicek gratis lewat iDebKu OJK.',
  'Kolektibilitas': 'Nilai kelancaran bayar di SLIK: Kol 1 lancar, Kol 2 telat 1–90 hari, Kol 3–5 bermasalah sampai macet.',
  'RIPLAY': 'Ringkasan Informasi Produk dan Layanan: dokumen resmi pemberi pinjaman yang wajib memuat bunga, biaya, dan denda.',
  'Pindar': 'Pinjaman daring (pinjol) yang berizin dan diawasi OJK. Nama resminya LPBBTI.',
  'Satgas PASTI': 'Satuan Tugas Pemberantasan Aktivitas Keuangan Ilegal, yang merilis daftar pinjol dan investasi ilegal.',
  'Bunga efektif': 'Biaya pinjaman yang sebenarnya per tahun setelah memperhitungkan cicilan yang terus mengecilkan sisa utang. Biasanya jauh di atas bunga "flat" yang diiklankan.',
  'Bunga flat': 'Bunga dihitung dari pokok awal setiap bulan, walaupun sisa utangmu terus berkurang.',
  'Plafon OJK': 'Batas biaya maksimum yang boleh ditagih pindar: konsumtif 0,3%/hari (tenor ≤6 bulan) atau 0,2%/hari (>6 bulan); produktif 0,275%/hari (≤Rp50 jt) atau 0,1%/hari (>Rp50 jt).',
  'TWP90': 'Tingkat Wanprestasi 90 hari: porsi pinjaman yang telat bayar lebih dari 90 hari. Makin tinggi, makin banyak kredit macet.',
  'TKB90': 'Tingkat Keberhasilan Bayar 90 hari: kebalikan TWP90 (100% − TWP90).',
  'Dana darurat': 'Tabungan khusus untuk kejadian mendadak. Patokan umum: 3 bulan kebutuhan pokok, atau 6 bulan jika penghasilan tidak stabil.',
  '50/30/20': 'Pedoman membagi pendapatan: ≤50% kebutuhan pokok, ≤30% keinginan, ≥20% tabungan atau pelunasan utang.',
  'Tangga dana': 'Urutan sumber dana dari yang paling murah: tabungan sendiri, keluarga, koperasi, bank, baru pindar.',
  'Avalanche': 'Strategi pelunasan: dahulukan utang berbunga paling tinggi. Total bunga paling kecil.',
  'Snowball': 'Strategi pelunasan: dahulukan utang dengan saldo terkecil. Cepat terasa ada yang lunas.',
  'Restrukturisasi': 'Permintaan resmi ke pemberi pinjaman untuk mengubah jadwal bayar (mis. tenor diperpanjang) agar cicilan lebih ringan.',
  'CAMILAN': 'Aturan OJK: pindar hanya boleh mengakses kamera, mikrofon, dan lokasi di ponselmu.',
  'Skor kesehatan': 'Nilai 0–100 dari 8 kebiasaan keuangan (menabung, bayar tepat waktu, dana darurat, cicilan, riwayat kredit, asuransi, rencana). Sehat 80–100, Bertahan 40–79, Rentan 0–39.',
  'Batas cicilan aman': 'Cicilan baru per bulan yang masih aman untukmu. Diambil dari angka yang lebih kecil antara (30% pendapatan − cicilan lama) dan 70% sisa uangmu per bulan.',
  'Zona': 'Aman: cicilan masih dalam batas aman. Mepet: masih bisa dibayar tapi sisa uang tipis. Bahaya: porsi cicilan di atas 40% atau uangmu jadi minus.',
  'Rasio likuiditas': 'Berapa bulan kebutuhan pokok bisa ditutup dengan tabungan yang bisa langsung dipakai. Patokan: minimal 3 bulan (6 bulan jika penghasilan tidak stabil).',
  'Rasio tabungan': 'Porsi pendapatan yang benar-benar disisihkan untuk ditabung setiap bulan. Patokan: minimal 10%.',
  'Rasio tempat tinggal': 'Porsi pendapatan untuk sewa/kos dan tagihan rumah. Patokan umum: maksimal 30%.',
  'Rasio cicilan konsumtif': 'Porsi pendapatan untuk cicilan konsumtif seperti paylater, pinjol, dan kartu kredit. Patokan umum: maksimal 15%.',
  'Tanggungan keluarga': 'Porsi pendapatan yang dikirim untuk orang tua atau keluarga. Tidak ada patokan baku, tapi makin besar makin sempit ruang menabung.',
  'Daya tahan uang': 'Tanggal ketika uangmu diperkirakan habis dalam sebulan, dihitung dari jadwal uang masuk dan pengeluaran.',
  'Pokok': 'Kebutuhan yang tidak bisa ditunda: tempat tinggal, makan, transport, pulsa, pendidikan, kesehatan.',
  'Keinginan': 'Pengeluaran yang bisa dikurangi atau ditunda: nongkrong, belanja, pesan-antar, langganan hiburan.',
  'Tenor': 'Lama waktu pinjaman dicicil, misalnya 6 bulan.',
  'Skor keamanan FinWise': 'Nilai 0–100 untuk pemberi pinjaman: legalitas, keterbukaan biaya, biaya dibanding batas OJK, suara peminjam, dan sertifikasi keamanan data.',
};
const term = (t, label) => `<span class="termwrap">${esc(label || t)}<button class="qbtn" data-act="drawer" data-v="kamus" data-term="${esc(t)}" aria-label="Apa itu ${esc(t)}?">?</button></span>`;

