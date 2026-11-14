/* ================= KALKULATOR: loan calculator with live safety status (Wasapada-style, FinWise numbers) ================= */
const CALC_TYPES = [['konsumtif', 'Konsumtif'], ['mikro', 'Produktif ≤ Rp50 jt'], ['umkm', 'Produktif > Rp50 jt']];
function calcState() {
  if (!S.calc) S.calc = { type: 'konsumtif', mode: 'real', amount: S.pilah?.need || 5000000, months: S.pilah?.months || 6, rate: null, unit: 'day', admin: null, lateOn: false, lateRate: null, lateDays: null, lender: null };
  return S.calc;
}
// the cheapest licensed lender in the FinWise database for this amount and tenor, priced at its published (RIPLAY) maximum
function cheapestReal(months, purpose, amount) {
  let best = null;
  realProducts({ months, purpose }, amount).forEach(pr => {
    if (!pr.real || pr.illegal || pr.unavailable || !(pr.rate > 0) || amount < pr.min || amount > pr.max || (pr.purpose && pr.purpose !== purpose)) return;
    const L = FW.loan({ principal: amount, rate: pr.rate, unit: pr.unit, months, feePct: pr.feePct || 0, maxTotal: amount * pr.maxTotalPct });
    if (!best || L.total < best.L.total) best = { pr, L };
  });
  return best;
}
function calcNumbers(c) {
  const purpose = c.type === 'konsumtif' ? 'konsumtif' : 'produktif';
  const amount = c.type === 'umkm' ? Math.max(c.amount, 50000001) : c.type === 'mikro' ? Math.min(c.amount, 50000000) : c.amount;
  const cap = FW.ojkCap(purpose, c.months, amount);
  const maxTotal = amount * Math.min(cap * c.months * 30, purpose === 'konsumtif' ? 1 : Infinity);
  // the OJK maximum is the worst case a licensed lender may charge
  const worst = FW.loan({ principal: amount, rate: cap, unit: 'day', months: c.months, maxTotal });
  let L = worst, rate = cap, unit = 'day', src = null;
  if (c.mode === 'real') { const b = cheapestReal(c.months, purpose, amount); if (b) { src = b.pr; L = b.L; rate = b.pr.rate; } }
  // a manual offer is shown as quoted (an offer above the cap is itself a warning sign)
  if (c.mode === 'manual') { rate = c.rate || 0; unit = c.unit; L = FW.loan({ principal: amount, rate, unit, months: c.months, feePct: c.admin || 0 }); }
  const daily = unit === 'day' ? rate : rate / 30, overCap = c.mode === 'manual' && daily > cap + 1e-9;
  return { purpose, amount, cap, rate, unit, L, overCap, src, worst, noReal: c.mode === 'real' && !src };
}
// cash-flow projection: money left each month while the loan runs
function projectionChart(p, inst, months) {
  const sur = FW.surplus(p), n = Math.min(Math.max(months, 1), 12), vals = Array.from({ length: n }, () => sur - inst);
  const max = Math.max(1, ...vals.map(Math.abs), inst), W = 560, H = 170, bw = W / n, mid = vals.some(v => v < 0) ? H * 0.6 : H - 22;
  const y = v => v >= 0 ? mid - (v / max) * (mid - 12) : mid + (-v / max) * (H - 24 - mid);
  const bars = vals.map((v, i) => `<rect x="${(i * bw + bw * 0.18).toFixed(1)}" y="${Math.min(y(v), mid).toFixed(1)}" width="${(bw * 0.3).toFixed(1)}" height="${Math.abs(y(v) - mid).toFixed(1)}" rx="3" fill="${v < 0 ? 'var(--danger)' : 'var(--safe)'}"/><rect x="${(i * bw + bw * 0.52).toFixed(1)}" y="${y(inst).toFixed(1)}" width="${(bw * 0.3).toFixed(1)}" height="${(mid - y(inst)).toFixed(1)}" rx="3" fill="var(--amber-strong)"/><text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="11" fill="var(--muted)">Bln ${i + 1}</text>`).join('');
  return `<figure class="chart" style="margin:0"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Proyeksi ${n} bulan: cicilan ${rp(inst)} per bulan, sisa uang ${rp(sur - inst, { plus: true })} per bulan">${bars}<line x1="0" x2="${W}" y1="${mid}" y2="${mid}" stroke="var(--line)"/></svg>
   <figcaption class="row tiny" style="gap:14px"><span><i class="sw" style="background:var(--safe)"></i>Sisa uang</span><span><i class="sw" style="background:var(--danger)"></i>Tekor</span><span><i class="sw" style="background:var(--amber-strong)"></i>Cicilan</span></figcaption></figure>`;
}
// three safer alternatives computed from the user's safe ceiling
function saferOptions(p, c, n) {
  const h = FW.headroom(p), out = [];
  if (h.ceiling <= 0) return [{ t: 'Tunda & perbaiki arus kas dulu', risk: 'Paling aman', d: 'Saat ini belum ada ruang cicilan baru. Gunakan rencana di CEK untuk menambah sisa uang.', href: '#cek' }];
  for (let m = c.months + 1; m <= 24; m++) { const L = calcNumbers({ ...c, months: m }).L; if (L.inst <= h.ceiling) { out.push({ t: `Perpanjang tenor jadi ${m} bulan`, risk: 'Sedang', d: `Cicilan turun ke ${rp(L.inst)}, tapi total biaya naik jadi ${rp(L.total)}.`, set: { months: m } }); break; } }
  let lo = 0, hi = c.amount; for (let k = 0; k < 40; k++) { const mid = (lo + hi) / 2; if (calcNumbers({ ...c, amount: mid }).L.inst <= h.ceiling) lo = mid; else hi = mid; }
  const amt = Math.floor(lo / 10000) * 10000;
  if (amt > 0 && amt < c.amount) out.push({ t: `Pinjaman maksimal yang aman: ${rps(amt)}`, risk: 'Rendah', d: `Dengan tenor ${c.months} bulan dan tarif ini, cicilannya masuk batas amanmu ${rp(h.ceiling)}. Sisanya tutup dari tangga dana atau tunda.`, set: { amount: amt } });
  const sur = FW.surplus(p);
  if (sur > 0) out.push({ t: 'Tunda & menabung', risk: 'Sangat rendah', d: `Dengan menyisihkan ${rp(sur)} per bulan, ${rps(c.amount)} terkumpul dalam ±${Math.ceil(c.amount / sur)} bulan tanpa bunga sama sekali.`, href: '#cek' });
  return out.slice(0, 3);
}
function vKalkulator() {
  const c = calcState(), p = P(), blank = needsSetup(), N = calcNumbers(c), L = N.L;
  const z = blank ? null : FW.zoneOf(p, L.inst), h = FW.headroom(p);
  const zi = z ? { safe: 0, stretch: 1, danger: 2 }[z.zone] : null, R = blank ? null : FW.readiness(p);
  const advice = blank ? 'Isi datamu dulu supaya FinWise bisa menilai apakah cicilan ini aman untukmu.'
    : R.level === 0 ? `Kesiapan berutangmu: belum bisa berutang. ${R.reasons[0]} Hitungan ini hanya gambaran; yang lebih aman sekarang adalah rencana tanpa utang.`
    : z.zone === 'safe' ? `Cicilan ${rp(L.inst)} masih di bawah batas amanmu ${rp(h.ceiling)}. Porsi cicilanmu jadi ${pct(z.dsr, 0)}. Tetap bandingkan total biayanya di PILAH sebelum memilih pemberi pinjaman.`
    : z.zone === 'stretch' ? `Cicilan ini melewati batas amanmu ${rp(h.ceiling)} (porsi cicilan ${pct(z.dsr, 0)}). Masih bisa dibayar, tapi sisa uangmu tinggal ${rp(z.left)} per bulan. Pertimbangkan alternatif di bawah.`
    : `Cicilan ini membuat ${z.left < 0 ? `uangmu minus ${rp(-z.left)} per bulan` : `porsi cicilanmu ${pct(z.dsr, 0)}`}. Risiko telat bayar dan berutang lagi tinggi. Lihat alternatif yang lebih aman.`;
  const lateFee = c.lateOn && c.lateRate > 0 && c.lateDays > 0 ? Math.min(L.inst * c.lateRate * c.lateDays, N.amount) : null;
  const opts = blank ? [] : saferOptions(p, c, N), safeAmt = opts.find(o => o.set && o.set.amount)?.set.amount;
  const urgentOnly = R && R.level === 1 ? ' Kesiapanmu: hanya untuk darurat, jadi pinjam hanya untuk keperluan mendesak.' : '';
  // what to do next depends on the readiness level first, then on the zone of this instalment
  const cta = blank ? `<a class="btn" href="#pilah" data-act="calc-to-pilah">Cari pinjaman legal untuk ${rps(c.amount)}</a>`
    : R.level === 0 ? `<a class="btn" href="#cek" data-act="goto-plan">Lihat rencana tanpa utang</a>${p.loans.length ? '<a class="btn ghost" href="#pulih">Atur utang yang ada di PULIH</a>' : ''}`
    : `${z.zone !== 'safe' && safeAmt ? `<button class="btn" data-act="calc-set" data-v='{"amount":${safeAmt}}'>Pakai jumlah aman ${rps(safeAmt)}</button>` : ''}<a class="btn${z.zone !== 'safe' && safeAmt ? ' ghost' : ''}" href="#pilah" data-act="calc-to-pilah">Cari pinjaman legal untuk ${rps(c.amount)}</a>${z.zone !== 'safe' ? '<a class="btn ghost" href="#alt" data-act="focus" data-id="alt">Lihat opsi yang lebih aman</a>' : ''}`;
  return banner({ tone: 'green', eyebrow: 'KALKULATOR PINJAMAN', title: 'Hitung dulu sebelum tanda tangan', sub: 'Geser jumlah dan tenor. Cicilan, total biaya, bunga sebenarnya, dan status aman langsung terlihat.', right: blank ? '<a class="btn amber" href="#mulai">Isi data untuk status pribadimu</a>' : userChip() }) + (blank ? '' : readyStrip(p)) + `
   <div class="grid g-side" style="align-items:start">
    <div class="stack">
     <div class="card stack">
      <div><div class="lab">Jenis pinjaman</div><div class="seg" role="group" aria-label="Jenis pinjaman" style="margin-top:6px">${CALC_TYPES.map(([k, l]) => `<button class="${c.type === k ? 'on' : ''}" aria-pressed="${c.type === k}" data-act="calc" data-f="type" data-v="${k}">${l}</button>`).join('')}</div>
       <p class="tiny muted" style="margin-top:6px">${term('Plafon OJK')}: ${c.type === 'konsumtif' ? 'maks 0,3%/hari untuk tenor ≤6 bulan, 0,2%/hari untuk >6 bulan' : c.type === 'mikro' ? 'maks 0,275%/hari untuk pinjaman usaha s.d. Rp50 jt' : 'maks 0,1%/hari untuk pinjaman usaha di atas Rp50 jt'}.</p></div>
      <div><div class="lab">Tarif yang dipakai</div><div class="seg" role="group" aria-label="Tarif yang dipakai" style="margin-top:6px">${[['real', 'Pindar berizin termurah'], ['ojk', 'Batas maksimum OJK'], ['manual', 'Dari penawaranmu']].map(([k, l]) => `<button class="${c.mode === k ? 'on' : ''}" aria-pressed="${c.mode === k}" data-act="calc" data-f="mode" data-v="${k}">${l}</button>`).join('')}</div>
       <p class="tiny muted" style="margin-top:6px">${c.mode === 'real' ? (N.src ? `Tarif maksimum di ${term('RIPLAY')} ${esc(N.src.name)} (${esc(N.src.rateLabel)}${N.src.note ? ', ' + esc(N.src.note) : ''}), pindar berizin dengan total biaya termurah untuk jumlah dan tenor ini di database FinWise. Tarif yang kamu dapat bisa lebih rendah.` : 'Belum ada pindar berizin di database FinWise yang melayani jumlah dan tenor ini, jadi dihitung dengan batas maksimum OJK.') : c.mode === 'ojk' ? 'Skenario terburuk: biaya tertinggi yang boleh ditagih pindar berizin. Kebanyakan penawaran lebih murah dari ini.' : 'Isi bunga dan biaya admin persis seperti di penawaran atau RIPLAY yang kamu terima.'}</p></div>
      ${c.mode === 'manual' ? `<div class="grid g3"><label class="f">Bunga (%)<input class="in num" id="c-rate" inputmode="decimal" value="${c.rate == null ? '' : (c.rate * 100).toLocaleString('id-ID', { maximumFractionDigits: 3 })}" placeholder="mis. 0,3" data-k="calc.rate" data-t="pctn"></label><label class="f">Satuan<select class="in" id="c-unit" data-k="calc.unit" data-t="text"><option value="day" ${c.unit === 'day' ? 'selected' : ''}>% per hari</option><option value="month" ${c.unit === 'month' ? 'selected' : ''}>% per bulan (flat)</option></select></label><label class="f">Biaya admin (%)<input class="in num" id="c-admin" inputmode="decimal" value="${c.admin == null ? '' : (c.admin * 100).toLocaleString('id-ID', { maximumFractionDigits: 2 })}" placeholder="0" data-k="calc.admin" data-t="pctn"></label></div>
       ${c.lender ? `<p class="tiny muted">Diisi dari tarif maksimum ${esc(c.lender)} di RIPLAY.</p>` : ''}
       ${N.overCap ? `<div class="note danger small">Bunga ini di atas plafon OJK (${nf(N.cap * 100, 3)}%/hari). Pindar berizin tidak boleh menagih sebesar ini; cek legalitasnya di <a href="#openspace">Database Pinjol</a>.</div>` : ''}` : ''}
      <div><div class="row between"><label class="lab" for="c-amount">Pinjaman yang diinginkan</label><b class="num" style="font-size:1.25rem;color:var(--green)">${rp(c.amount)}</b></div>
       <input type="range" class="range" id="c-amount" min="500000" max="${c.type === 'umkm' ? 500000000 : 50000000}" step="${c.type === 'umkm' ? 5000000 : 500000}" value="${c.amount}" data-k="calc.amount" data-t="int" aria-valuetext="${rp(c.amount)}">
       <div class="row between tiny muted"><span>Rp500 rb</span><span>${c.type === 'umkm' ? 'Rp500 jt' : 'Rp50 jt'}</span></div></div>
      <div><div class="row between"><label class="lab" for="c-months">Tenor</label><b class="num" style="font-size:1.25rem;color:var(--green)">${c.months} bulan</b></div>
       <input type="range" class="range" id="c-months" min="1" max="24" step="1" value="${c.months}" data-k="calc.months" data-t="int" aria-valuetext="${c.months} bulan">
       <div class="row between tiny muted"><span>1 bulan</span><span>24 bulan</span></div></div>
      <div class="calcsum" aria-live="polite"><span>Cicilan <b class="num">${rp(L.inst)}</b>/bln · total biaya <b class="num">${rps(L.total)}</b></span>${z ? zpill(z.zone) : ''}</div>
     </div>
     <div class="card"><div class="row between"><h3>Hitung denda keterlambatan</h3><label class="chk" style="font-size:.875rem"><input type="checkbox" data-act-change="calc-late" ${c.lateOn ? 'checked' : ''}><span>Aktifkan</span></label></div>
      ${c.lateOn ? `<div class="grid g2" style="margin-top:10px"><label class="f">Denda per hari (% dari cicilan)<input class="in num" id="c-lrate" inputmode="decimal" value="${c.lateRate == null ? '' : (c.lateRate * 100).toLocaleString('id-ID', { maximumFractionDigits: 3 })}" placeholder="lihat RIPLAY, mis. 0,3" data-k="calc.lateRate" data-t="pctn"></label><label class="f">Telat berapa hari<input class="in num" id="c-ldays" type="number" min="1" max="365" value="${blankNum(c.lateDays)}" placeholder="mis. 10" data-k="calc.lateDays" data-t="intn"></label></div>
       ${lateFee != null ? `<div class="grid g2" style="margin-top:10px"><div class="kpi warnbox"><div class="k">Estimasi denda</div><div class="v">${rp(lateFee)}</div></div><div class="kpi"><div class="k">Tagihan bulan itu jadi</div><div class="v">${rp(L.inst + lateFee)}</div></div></div><p class="tiny muted" style="margin-top:6px">Telat bayar juga tercatat di SLIK (Kol 2 untuk telat 1–90 hari) dan bisa menutup akses pinjaman murah.</p>` : '<p class="small muted" style="margin-top:8px">Isi tarif denda dan jumlah hari untuk melihat estimasinya.</p>'}` : '<p class="small muted" style="margin-top:6px">Opsional: lihat berapa tambahan biayanya jika telat bayar.</p>'}
     </div>
     ${blank ? '' : `<div class="card"><h3>Proyeksi ${Math.min(c.months, 12)} bulan ke depan</h3><p class="small muted" style="margin:4px 0 10px">Sisa uangmu setiap bulan selama cicilan berjalan.</p>${projectionChart(p, L.inst, c.months)}</div>`}
    </div>
    <div class="stack" style="position:sticky;top:84px">
     <div class="card status-card" aria-live="polite">
      <div class="lab">Status risiko ${blank ? '' : 'untukmu'}</div>
      <div class="status-big ${z ? z.zone : ''}">${z ? { safe: 'AMAN', stretch: 'MEPET', danger: 'BAHAYA' }[z.zone] : '—'}</div>
      <div class="gauge" aria-hidden="true"><i class="g-safe"></i><i class="g-stretch"></i><i class="g-danger"></i>${zi != null ? `<b style="left:${[16, 50, 84][zi]}%"></b>` : ''}</div>
      <div class="stack small" style="gap:7px;margin-top:14px">
       <div class="row between"><span>Cicilan per bulan</span><b class="num">${rp(L.inst)}</b></div>
       <div class="row between"><span>Total bunga + biaya</span><b class="num">${rp(L.total)}</b></div>
       <div class="row between"><span>${term('Total dikembalikan')}</span><b class="num">${rp(L.repay + L.fee)}</b></div>
       ${c.mode === 'real' && N.src ? `<div class="row between tiny muted"><span>Kalau dikenai batas maksimum OJK</span><span class="num">${rp(N.worst.repay + N.worst.fee)}</span></div>` : ''}
       <div class="row between"><span>${term('Bunga efektif')} per tahun</span><b class="num">${pct(L.ear, 0)}</b></div>
       ${z ? `<div class="row between"><span>${term('Porsi cicilan')}</span><b class="num">${pct(z.dsr, 1)}</b></div><div class="bar" aria-hidden="true"><i style="width:${Math.min(100, z.dsr / 0.6 * 100).toFixed(0)}%;background:var(--${z.zone})"></i></div>
       <div class="row between"><span>Sisa uang per bulan</span><b class="num" style="color:${z.left < 0 ? 'var(--danger)' : 'inherit'}">${rp(z.left, { plus: true })}</b></div>` : ''}
      </div>
      <div class="note ${z ? { safe: 'safe', stretch: 'amber', danger: 'danger' }[z.zone] : ''} small" style="margin-top:12px"><b>Saran FinWise:</b> ${esc(advice + urgentOnly)}</div>
      <div class="stack" style="gap:8px;margin-top:12px">
       ${cta}
      </div>
     </div>
    </div>
   </div>
   ${opts.length ? `<div class="card" id="alt" tabindex="-1" style="margin-top:16px"><h3>Alternatif yang lebih aman</h3><div class="grid g3" style="margin-top:12px">${opts.map(o => `<div class="opt"><div class="row between"><b>${esc(o.t)}</b><span class="pill z-safe">Risiko ${esc(o.risk.toLowerCase())}</span></div><p class="small">${esc(o.d)}</p>${o.set ? `<button class="btn ghost sm" data-act="calc-set" data-v='${JSON.stringify(o.set)}'>Coba di kalkulator</button>` : `<a class="btn ghost sm" href="${o.href}">Buka rencana di CEK</a>`}</div>`).join('')}</div></div>` : ''}`;
}
