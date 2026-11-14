/* ===== FinWise engine: pure functions, no DOM ===== */
const FW = (() => {
  const sum = (a, f = x => x) => a.reduce((s, x) => s + (Number(f(x)) || 0), 0);
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const round = x => Math.round(x);

  function rp(n, opt = {}) {
    const neg = n < 0; const v = Math.round(Math.abs(n));
    const s = 'Rp' + v.toLocaleString('id-ID');
    return (neg ? '−' : (opt.plus && n > 0 ? '+' : '')) + s;
  }
  function rpShort(n) {
    const neg = n < 0, v = Math.abs(n);
    let s;
    if (v >= 1e9) s = (v / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' M';
    else if (v >= 1e6) s = (v / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 }) + ' jt';
    else if (v >= 1e3) s = Math.round(v / 1e3).toLocaleString('id-ID') + ' rb';
    else s = String(Math.round(v));
    return (neg ? '−' : '') + 'Rp' + s;
  }
  const pct = (x, d = 1) => (x * 100).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%';

  /* ---------- profile basics ---------- */
  const income = p => sum(p.incomes, i => i.amount);
  const instalments = p => sum(p.loans, l => l.instalment);
  // a single 'total' estimate counts as essential spending (the conservative reading) until the user breaks it down
  const needs = p => sum(p.spending.filter(c => c.kind === 'need' || c.kind === 'total'), c => c.amount);
  const wants = p => sum(p.spending.filter(c => c.kind === 'want'), c => c.amount);
  const spendTotal = p => needs(p) + wants(p);
  const surplus = p => income(p) - spendTotal(p) - (p.family || 0) - instalments(p);

  /* ---------- PILAH: headroom ---------- */
  function headroom(p) {
    const inc = income(p), ex = instalments(p), sur = surplus(p);
    // planned monthly saving is protected: new instalments may only use what is left after it
    const save = Math.max(0, Math.min(p.savingMonthly || 0, sur));
    const lens1 = 0.30 * inc - ex;
    const lens2 = 0.70 * (sur - save);
    const ceiling = Math.max(0, Math.min(lens1, lens2));
    const stretchMax = Math.max(0, Math.min(0.40 * inc - ex, sur));
    return { inc, ex, sur, save, dsrNow: inc ? ex / inc : 0, lens1, lens2, ceiling, stretchMax,
      binding: lens1 <= lens2 ? 'dsr' : 'cash' };
  }
  function zoneOf(p, inst) {
    const h = headroom(p);
    const dsr = h.inc ? (h.ex + inst) / h.inc : 1;
    const left = h.sur - inst;
    let zone;
    if (dsr > 0.40 || left < 0) zone = 'danger';
    else if (dsr > 0.30 || inst > h.ceiling + 0.5) zone = 'stretch';
    else zone = 'safe';
    return { zone, dsr, left };
  }

  /* ---------- loan maths (flat add-on, as Indonesian lenders quote) ---------- */
  function loan({ principal, rate, unit, months, feePct = 0, maxTotal }) {
    principal = Number(principal) || 0; months = Math.round(Number(months) || 0); rate = Number(rate) || 0;
    if (principal <= 0 || months <= 0) return { interest: 0, fee: 0, inst: 0, total: 0, ear: 0, repay: 0, empty: true };
    const days = months * 30;
    let interest = unit === 'day' ? principal * rate * days : principal * rate * months;
    let fee = principal * feePct;
    // OJK caps the whole economic benefit (interest + fees); a published maximum above the cap cannot legally be charged
    if (maxTotal != null && interest + fee > maxTotal) { fee = Math.min(fee, maxTotal); interest = Math.max(0, maxTotal - fee); }
    const inst = (principal + interest) / months;
    const total = interest + fee;
    // effective annual rate (EAR, compounded) from the cash-flow schedule: receive principal-fee, pay inst x months
    let lo = 0, hi = 1;
    for (let k = 0; k < 120; k++) {
      const r = (lo + hi) / 2; let pv = 0;
      for (let m = 1; m <= months; m++) pv += inst / Math.pow(1 + r, m);
      if (pv > principal - fee) lo = r; else hi = r;
    }
    const ear = Math.pow(1 + lo, 12) - 1;
    return { interest, fee, inst, total, ear, repay: principal + interest };
  }

  /* ---------- CEK: health score (8 indicators x 12.5) ---------- */
  function health(p) {
    const inc = income(p), outflow = spendTotal(p) + (p.family || 0) + instalments(p);
    const sav = p.savingMonthly || 0;
    const balance = surplus(p);
    const savingsRate = inc ? Math.max(0, Math.min(sav, sav + Math.min(0, balance))) / inc : 0;
    const realSaving = balance < 0 ? 0 : savingsRate;
    const h = headroom(p);
    const ind = [
      { pillar: 'Spend', key: 'savings', label: 'Rasio menabung ≥ 10% pendapatan', score: clamp(realSaving / 0.10, 0, 1) },
      { pillar: 'Spend', key: 'ontime', label: 'Semua tagihan dibayar tepat waktu', score: p.onTime ? 1 : 0 },
      { pillar: 'Save', key: 'buffer', label: 'Dana darurat ≥ 3 bulan pengeluaran', score: outflow ? clamp((p.emergencyFund || 0) / (3 * outflow), 0, 1) : 0 },
      { pillar: 'Save', key: 'regular', label: 'Menabung rutin setiap bulan', score: (sav > 0 && balance >= 0) ? 1 : 0 },
      { pillar: 'Borrow', key: 'dsr', label: 'Rasio cicilan (DSR) ≤ 30%', score: h.dsrNow <= 0.30 ? 1 : h.dsrNow <= 0.40 ? 0.5 : 0 },
      { pillar: 'Borrow', key: 'slik', label: 'Status SLIK lancar / tanpa catatan buruk', score: { lancar: 1, kosong: 1, tidaktahu: 0.5, dpk: 0.5, macet: 0 }[p.slik] ?? 0.5 },
      { pillar: 'Plan', key: 'insurance', label: 'Punya jaminan kesehatan (BPJS/asuransi)', score: p.insurance ? 1 : 0 },
      { pillar: 'Plan', key: 'plan', label: 'Punya rencana/target keuangan aktif', score: p.plan ? 1 : 0 },
    ];
    ind.forEach(i => i.points = i.score * 12.5);
    const total = Math.round(sum(ind, i => i.points));
    // a monthly deficit can never read as 'coping', whatever the habit points add up to
    const deficit = balance < 0;
    const status = deficit ? 'Rentan' : total >= 80 ? 'Sehat' : total >= 40 ? 'Bertahan' : 'Rentan';
    const weakest = [...ind].sort((a, b) => a.points - b.points)[0];
    return { total, status, ind, weakest, deficit };
  }

  /* ---------- CEK: cash runway (first day the balance goes below zero) ---------- */
  function runway(p) {
    // the month is simulated from the main income's payday (day 1 of the cycle), so a salary on the 25th is handled correctly
    const main = [...p.incomes].sort((a, b) => b.amount - a.amount)[0];
    const offset = ((main && main.payday) || 1) - 1;
    const cyc = d => ((d - 1 - offset + 300) % 30) + 1;
    const days = 30; let bal = p.openingBalance || 0;
    const incomeByDay = Array(days + 1).fill(0), spendByDay = Array(days + 1).fill(0);
    p.incomes.forEach(i => (i.split || [[i.payday || 1, 1]]).forEach(([d, f]) => incomeByDay[cyc(d)] += i.amount * f));
    const weights = []; for (let d = 1; d <= days; d++) { const dow = (d + 2) % 7; weights[d] = (dow === 5 || dow === 6) ? 1.7 : 1; }
    const wsum = sum(weights.slice(1));
    p.spending.forEach(c => { if (c.day) spendByDay[cyc(c.day)] += c.amount; else for (let d = 1; d <= days; d++) spendByDay[d] += c.amount * weights[d] / wsum; });
    p.loans.forEach(l => spendByDay[cyc(l.dueDay || 1)] += l.instalment);
    if (p.family) spendByDay[1] += p.family;
    if (p.savingMonthly && surplus(p) >= 0) spendByDay[30] += p.savingMonthly; // saved at the end of the cycle from what is left
    for (let d = 1; d <= days; d++) { bal += incomeByDay[d] - spendByDay[d]; if (bal < -1) return { day: d, date: ((d - 1 + offset) % 30) + 1, from: offset + 1 }; }
    return null;
  }

  /* ---------- CEK: 50/30/20 split ---------- */
  function split(p) {
    const inc = income(p) || 1;
    const debt = instalments(p);
    return { need: (needs(p) + (p.family || 0)) / inc, want: wants(p) / inc, debt: debt / inc,
             save: Math.max(0, surplus(p)) / inc };
  }

  /* ---------- CEK: AI-free insight rules (figures only from the engine) ---------- */
  function cutSuggestions(p) {
    const out = [];
    p.spending.filter(c => c.kind === 'want').forEach(c => {
      if (c.cap != null && c.amount > c.cap) out.push({ cat: c.name, from: c.amount, to: c.cap, save: c.amount - c.cap, why: c.capWhy });
    });
    return out;
  }

  /* ---------- CEK: goal plan ---------- */
  function goalPlan(target, phases) {
    // phases: [{months, monthly}] last phase repeats
    let acc = 0, m = 0; const series = [];
    while (acc < target && m < 120) {
      let idx = 0, cum = 0;
      for (let i = 0; i < phases.length; i++) { cum += phases[i].months || Infinity; if (m < cum) { idx = i; break; } idx = i; }
      acc += phases[idx].monthly; m++; series.push(Math.round(acc));
    }
    return { months: m, series };
  }

  /* ---------- Kesiapan berutang: one verdict for the whole app ---------- */
  // cheapest legal pricing used to turn the safe instalment into a loan size (flat add-on per month)
  const SAFE_RATE = 0.015;
  function maxSafeLoan(p, months, r = SAFE_RATE) {
    const c = headroom(p).ceiling;
    if (c <= 0 || months <= 0) return 0;
    return Math.floor(c * months / (1 + r * months) / 10000) * 10000;
  }
  const unstableIncome = p => p.stability === 'tidak' || (p.incomes.some(i => i.type && i.type !== 'tetap') && p.stability !== 'sangat');
  function readiness(p) {
    const inc = income(p), h = headroom(p), sur = h.sur, n = p.loans.length;
    const outflow = spendTotal(p) + (p.family || 0) + h.ex;
    const efM = outflow ? (p.emergencyFund || 0) / outflow : 0, efTarget = unstableIncome(p) ? 6 : 3;
    const spendR = inc ? outflow / inc : 1;
    const max = { 3: maxSafeLoan(p, 3), 6: maxSafeLoan(p, 6), 12: maxSafeLoan(p, 12) };
    const base = { h, sur, efM, efTarget, spendR, max, n, rate: SAFE_RATE };
    const run = sur > 0 ? runway(p) : null;
    const r0 = [];
    if (!inc) r0.push('Belum ada pemasukan yang tercatat.');
    else if (sur < 0) r0.push(`Pengeluaranmu lebih besar dari pemasukan: tekor ${rp(-sur)} per bulan.`);
    else if (sur === 0) r0.push('Pemasukanmu habis tepat untuk pengeluaran, tanpa sisa.');
    if (h.dsrNow > 0.40) r0.push(`Cicilanmu sudah ${pct(h.dsrNow, 0)} dari pendapatan, di atas batas bahaya 40%.`);
    if (p.slik === 'macet' || p.pinjolExp === 'masalah') r0.push('Ada riwayat telat bayar atau kredit bermasalah yang perlu dipulihkan dulu.');
    if (run) r0.push(`Uangmu habis sebelum gajian berikutnya (sekitar tanggal ${run.date}).`);
    if (inc && sur > 0 && h.dsrNow <= 0.40 && h.ceiling <= 0) r0.push('Setelah cicilan lama dan tabungan rutin, tidak ada ruang untuk cicilan baru.');
    if (r0.length) return { ...base, level: 0, reasons: r0 };
    const r1 = [];
    if (spendR > 0.90) r1.push(`${pct(spendR, 0)} pendapatanmu sudah terpakai (patokan bahaya: 90% ke atas).`);
    if (h.dsrNow > 0.30) r1.push(`Cicilanmu ${pct(h.dsrNow, 0)} dari pendapatan, di atas batas aman 30%.`);
    if (efM < 1) r1.push('Dana daruratmu belum cukup untuk 1 bulan pengeluaran.');
    if (max[6] < 0.10 * inc) r1.push(`Pinjaman yang aman sangat kecil: maksimal ${rpShort(max[6])} untuk 6 bulan.`);
    if (n >= 4) r1.push(`Kamu sudah punya ${n} kredit aktif; menambah satu lagi memperbesar risiko gali lubang.`);
    if (r1.length) return { ...base, level: 1, reasons: r1 };
    const r2 = [];
    if (efM < efTarget) r2.push(`Dana daruratmu ${efM.toLocaleString('id-ID', { maximumFractionDigits: 1 })} bulan, belum mencapai target ${efTarget} bulan.`);
    if (spendR > 0.80) r2.push(`${pct(spendR, 0)} pendapatanmu terpakai (patokan wajar: 80% ke bawah).`);
    if (r2.length) return { ...base, level: 2, reasons: r2 };
    return { ...base, level: 3, reasons: ['Arus uang, porsi cicilan, dan dana daruratmu sudah di zona sehat.'] };
  }

  /* ---------- PILAH: funding ladder ---------- */
  function ladder(need, rungs) {
    let left = need; const steps = [];
    rungs.forEach(r => { const use = Math.min(left, Math.max(0, r.amount || 0)); left -= use; steps.push({ ...r, use, leftAfter: left }); });
    return { gap: left, steps, covered: need - left };
  }

  /* ---------- PILAH: smart loan match ---------- */
  const WEIGHTS = {
    // many pindar charge the same legal maximum, so reviews weigh more than they used to
    seimbang: { cost: .30, health: .30, rep: .25, privacy: .10, speed: .05 },
  };
  function modeWeights(mode) {
    const base = WEIGHTS.seimbang; if (mode === 'seimbang') return base;
    const key = { termurah: 'cost', ringan: 'health', reputasi: 'rep' }[mode];
    if (!key) return base;
    const rest = 1 - base[key]; const w = {};
    Object.keys(base).forEach(k => w[k] = k === key ? 0.5 : base[k] * 0.5 / rest);
    return w;
  }
  function speedScore(hours) { if (hours == null) return 0.5; if (hours <= 24) return 1; if (hours <= 48) return 0.8; if (hours <= 72) return 0.6; return 0.3; }

  function match(p, { amount, deadlineHours, purpose = 'konsumtif', mode = 'seimbang', products }) {
    const h = headroom(p);
    const rows = [];
    products.forEach(pr => {
      const row = { ...pr };
      if (pr.illegal) { row.status = 'blocked'; row.reason = 'Tidak berizin OJK (daftar Satgas PASTI)'; rows.push(row); return; }
      if (pr.requires && !p.access?.[pr.requires]) { row.status = 'na'; row.reason = pr.requiresWhy; rows.push(row); return; }
      if (pr.unavailable) { row.status = 'filtered'; row.reason = pr.unavailable; rows.push(row); return; }
      if (amount < pr.min || amount > pr.max) { row.status = 'filtered'; row.reason = `Plafon ${rpShort(pr.min)}–${rpShort(pr.max)}`; rows.push(row); return; }
      if (pr.purpose && pr.purpose !== purpose) { row.status = 'filtered'; row.reason = pr.purpose === 'produktif' ? 'Khusus pinjaman usaha (produktif)' : 'Khusus pinjaman konsumtif'; rows.push(row); return; }
      const L = loan({ principal: amount, rate: pr.rate, unit: pr.unit, months: pr.months, feePct: pr.feePct || 0, maxTotal: pr.maxTotalPct != null ? amount * pr.maxTotalPct : undefined });
      Object.assign(row, L);
      const z = zoneOf(p, L.inst); Object.assign(row, z);
      if (pr.hours != null && pr.hours > deadlineHours) { row.status = 'filtered'; row.reason = `Cair ±${hoursLabel(pr.hours)}, lewat tenggatmu`; rows.push(row); return; }
      row.status = 'ok'; rows.push(row);
    });
    const ok = rows.filter(r => r.status === 'ok');
    const minC = Math.min(...ok.map(r => r.total)), maxC = Math.max(...ok.map(r => r.total));
    const w = modeWeights(mode);
    ok.forEach(r => {
      const f = {};
      f.cost = maxC > minC ? 1 - (r.total - minC) / (maxC - minC) : 1;
      if (r.zone === 'safe') f.health = 0.6 + 0.4 * (h.ceiling ? clamp(1 - r.inst / h.ceiling, 0, 1) : 0);
      else if (r.zone === 'stretch') f.health = 0.3 * clamp(1 - (r.inst - h.ceiling) / Math.max(1, h.sur - h.ceiling), 0, 1);
      else f.health = 0;
      f.rep = r.rating ? (r.rating / 5) * 0.5 + (r.positive || 0) * 0.5 : 0.7;
      f.privacy = (r.privacy ?? 7) / 10;
      f.speed = speedScore(r.hours);
      r.factors = f;
      r.score = sum(Object.keys(w), k => w[k] * f[k]);
    });
    const allDanger = ok.length > 0 && ok.every(r => r.zone === 'danger');
    const by = {
      termurah: (a, b) => a.total - b.total || a.inst - b.inst,
      ringan: (a, b) => a.inst - b.inst || a.total - b.total,
      reputasi: (a, b) => (b.rating || 0) - (a.rating || 0) || a.total - b.total,
      // when nothing is safe, the least harmful option is the one that leaves the smallest monthly shortfall
      seimbang: allDanger ? (a, b) => b.left - a.left || a.total - b.total : (a, b) => b.score - a.score,
    }[mode] || ((a, b) => b.score - a.score);
    // safer zones always come first; the chosen mode orders options inside each zone
    const tier = { safe: 0, stretch: 1, danger: 2 };
    ok.sort((a, b) => tier[a.zone] - tier[b.zone] || by(a, b));
    ok.forEach((r, i) => r.rank = i + 1);
    // only compare against "the fastest" when every option publishes its speed
    const fastest = ok.some(r => r.hours == null) ? null : [...ok].sort((a, b) => a.hours - b.hours)[0];
    const best = ok[0];
    return { rows, ok, weights: w, fastest, best, h, allDanger };
  }
  function hoursLabel(h) { if (h == null) return 'tidak dipublikasikan'; if (h < 1) return Math.round(h * 60) + ' menit'; if (h < 24) return Math.round(h) + ' jam'; return Math.round(h / 24) + ' hari'; }

  /* OJK caps on daily economic benefit (SEOJK 19/SEOJK.06/2025): consumer 0.3%/day <=6 mo, 0.2%/day >6 mo; productive 0.275%/day <=Rp50 jt, 0.1%/day above */
  function ojkCap(purpose, months, amount) {
    // SEOJK 19/SEOJK.06/2025 (in force since 31 Jul 2025): productive up to Rp50 jt 0.275%/day for tenor ≤6 months, else 0.1%
    if (purpose === 'produktif') return amount > 50e6 || months > 6 ? 0.001 : 0.00275;
    return months > 6 ? 0.002 : 0.003;
  }

  /* ---------- PULIH: repayment routing ---------- */
  // remaining principal of a loan: with a rate the user entered, the present value of the remaining instalments;
  // without one, the remaining payments themselves (interest is already inside the instalment)
  function loanBalance(l) {
    const n = l.months || 0, r = l.rateIn > 0 ? l.rateIn : 0;
    return r ? l.instalment * (1 - Math.pow(1 + r, -n)) / r : l.instalment * n;
  }
  function route(loans, extra, method) {
    // interest is only simulated for loans whose rate the user entered; guessed rates only decide the avalanche order
    let L = loans.map(l => ({ ...l, bal: loanBalance(l), rateMonthly: l.rateIn > 0 ? l.rateIn : 0, orderRate: l.rateMonthly || 0 }));
    let month = 0, interestPaid = 0; const payoff = {};
    while (L.some(l => l.bal > 1) && month < 240) {
      month++;
      let pool = extra;
      L.forEach(l => { if (l.bal <= 1) return; const i = l.bal * (l.rateMonthly || 0); interestPaid += i; l.bal += i; const pay = Math.min(l.bal, l.instalment); l.bal -= pay; });
      // freed instalments of paid-off loans roll into the pool
      L.forEach(l => { if (l.bal <= 1 && payoff[l.id] === undefined) payoff[l.id] = month; });
      pool += sum(L.filter(l => payoff[l.id] !== undefined && payoff[l.id] < month), l => l.instalment);
      const order = L.filter(l => l.bal > 1).sort(method === 'avalanche' ? (a, b) => b.orderRate - a.orderRate : (a, b) => a.bal - b.bal);
      for (const l of order) { if (pool <= 0) break; const pay = Math.min(pool, l.bal); l.bal -= pay; pool -= pay; if (l.bal <= 1 && payoff[l.id] === undefined) payoff[l.id] = month; }
    }
    return { months: month, interest: interestPaid, interestKnown: L.some(l => l.rateMonthly > 0), payoff,
      order: (method === 'avalanche' ? [...loans].sort((a, b) => (b.rateMonthly || 0) - (a.rateMonthly || 0)) : [...loans].sort((a, b) => loanBalance(a) - loanBalance(b))).map(l => l.id) };
  }

  function ringFence(p) {
    // amount to set aside from each income event so every instalment is covered before its due date
    const inc = [...p.incomes].sort((a, b) => (a.payday || 1) - (b.payday || 1));
    return p.loans.map(l => ({ ...l })).sort((a, b) => a.dueDay - b.dueDay);
  }

  return { rp, rpShort, pct, income, instalments, needs, wants, spendTotal, surplus, headroom, zoneOf, loan, health, readiness, maxSafeLoan, loanBalance, SAFE_RATE,
           runway, split, cutSuggestions, goalPlan, ladder, match, modeWeights, hoursLabel, route, ringFence, ojkCap, sum, clamp };
})();
if (typeof module !== 'undefined') module.exports = FW;
