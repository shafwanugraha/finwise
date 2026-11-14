/* ================= PILAH =================
   Order: the plan first (what for, how much, how long, how soon), then what it does to the user's money,
   then optional ways to borrow less, then every licensed lender side by side with reference prices.
   Nothing is locked: risk is shown as a warning above the list. The one exception is gambling. */
const PURPOSES = [
  ['kesehatan', 'Kesehatan', 'rumah sakit, obat, berobat'], ['pendidikan', 'Pendidikan', 'UKT, SPP, kursus'], ['pokok', 'Sewa & kebutuhan pokok', 'kos, makan, listrik'],
  ['usaha', 'Modal usaha / alat kerja', 'stok, modal, alat kerja'], ['utang', 'Bayar utang lain', 'tutup pinjol, paylater'], ['gaya', 'Barang atau gaya hidup', 'HP baru, liburan, konser'],
];
const URGENCY = [['hari', 'Hari ini', 24], ['minggu', 'Minggu ini', 168], ['tunda', 'Bisa ditunda', 720]];
const ESSENTIAL = ['kesehatan', 'pendidikan', 'pokok'];
// plain keyword recognition (works without AI); order matters: specific before generic
const PURPOSE_WORDS = [
  ['judi', /judi|judol|slot|taruhan|togel|casino|kasino/i],
  ['utang', /(bayar|tutup|lunasi|lunas)\s*(utang|hutang|pinjol|pindar|paylater|cicilan|kartu kredit|kredit)|gali lubang/i],
  ['kesehatan', /rumah ?sakit|\brs\b|obat|operasi|berobat|dokter|klinik|persalinan|melahirkan|sakit|kecelakaan|gigi|rawat inap/i],
  ['pendidikan', /\bukt\b|\bspp\b|kuliah|sekolah|kursus|wisuda|skripsi|semester|seminar|sertifikasi|les\b/i],
  ['usaha', /modal|usaha|jualan|dagang|stok|warung|toko|bisnis|produksi|laptop (kerja|untuk kerja)|alat kerja|motor kerja|ojol/i],
  ['pokok', /\bkos\b|kontrakan|sewa|makan|listrik|\bair\b|pdam|token|beras|sembako|transport|ongkos|tagihan/i],
  ['gaya', /\bhp\b|handphone|iphone|samsung|gadget|laptop|liburan|healing|konser|tiket|nonton|baju|sepatu|skincare|make ?up|game|nongkrong|motor baru|jam tangan|kamera/i],
];
const classifyPurpose = t => { const x = String(t || ''); for (const [k, re] of PURPOSE_WORDS) if (re.test(x)) return k; return null; };
const purposeName = k => k === 'judi' ? 'Judi online' : (PURPOSES.find(x => x[0] === k) || [, 'Belum dipilih'])[1];
const planReady = st => !!st.cat && st.need > 0 && st.months > 0 && !!st.urg;
const isJudi = st => st.cat === 'judi' || classifyPurpose(st.needLabel) === 'judi';
// reference prices for the scorecard; each one is cited on screen
const BENCH = {
  bank: { lo: 0.0088, hi: 0.0179, admin: 0.04, src: 'CIMB Niaga Xtra Dana, RIPLAY versi Feb 2026: 0,88–1,79% flat per bulan + admin 4%' },
  kop: { month: 0.02, src: 'Permenkop UKM 8/2023 Pasal 27: bunga pinjaman koperasi simpan pinjam paling tinggi 24% per tahun' },
};
// the warning shown above the impact and the list; it never hides anything (gambling aside)
function pilahWarn(p, st) {
  const R = FW.readiness(p), cat = st.cat, urgent = !!st.urg && st.urg !== 'tunda', f = facts(p);
  const plan = applyPlan(autoCaps(p), planActions(autoCaps(p))), per = Math.max(f.sur, Math.max(0, FW.surplus(plan)));
  const mo = per > 0 && st.need > 0 ? Math.ceil(st.need / per) : null;
  const save = mo ? ` Tanpa utang: menyisihkan ${rp(per)} per bulan, ${rp(st.need)} terkumpul dalam ±${mo} bulan.` : '';
  if (cat === 'judi' || classifyPurpose(st.needLabel) === 'judi') return { tone: 'danger', stop: true, title: 'FinWise tidak membandingkan pinjaman untuk judi online.', text: 'Utang untuk judi hampir selalu bertambah, bukan tertutup. Kalau terasa sulit berhenti, ceritakan ke orang terdekat atau tenaga profesional.' };
  if (cat === 'utang') return { tone: 'danger', title: 'Meminjam untuk membayar utang lain biasanya hanya memindahkan masalah ke bulan depan.', text: 'Coba dulu minta keringanan ke pemberi pinjaman lama sebelum jatuh tempo; langkahnya ada di PULIH.', link: ['#pulih', 'Langkahnya di PULIH'] };
  if (R.level === 0) return { tone: 'danger', title: `Kesiapan berutangmu: ${READY[0].name}.`, text: `${R.reasons[0]}${ESSENTIAL.includes(cat) && urgent ? ' Kalau kebutuhan ini memang tidak bisa ditunda, pinjam sekecil mungkin.' : save}` };
  if (cat === 'gaya' && R.level <= 2) return { tone: 'amber', title: 'Untuk barang atau gaya hidup, menabung dulu hampir selalu lebih murah daripada bunga.', text: save.trim() };
  if (R.level === 1 && !ESSENTIAL.includes(cat)) return { tone: 'amber', title: `Kesiapan berutangmu: ${READY[1].name}.`, text: R.reasons[0] };
  return null;
}
const warnBox = w => w ? `<div class="note ${w.tone} pwarn" role="status"><b>${esc(w.title)}</b>${w.text ? ` ${esc(w.text)}` : ''}${w.link ? ` <a href="${w.link[0]}">${w.link[1]}</a>` : ''}</div>` : '';
function pilahCalc(p, st) {
  const h = FW.headroom(p);
  const lad = FW.ladder(st.need || 0, [{ key: 'savings', amount: Math.min(st.useSavings || 0, p.emergencyFund || 0) }, { key: 'family', amount: st.family || 0 },
    { key: 'reduce', amount: st.reduce || 0 }, { key: 'relief', amount: st.relief || 0 }, { key: 'fund', amount: st.fund || 0 }, { key: 'cash', amount: st.cash || 0 }]);
  const amt = st.cap > 0 ? Math.min(lad.gap, st.cap) : lad.gap;
  // only licensed pindar: koperasi and bank appear as reference prices, not as options
  const products = (isSaya(p) ? realProducts(st, amt) : DATA.products).filter(x => !x.generic);
  const m = FW.match(p, { amount: amt, deadlineHours: st.hours || 0, purpose: st.purpose || 'konsumtif', mode: st.mode, products });
  return { h, lad, m, amt };
}
// compact readiness line used on Kalkulator and on PILAH's later steps
function readyStrip(p) {
  const R = FW.readiness(p), RD = READY[R.level];
  return `<div class="ready-strip lv-${RD.tone}"><div><div class="lab">${term('Kesiapan berutang')}</div><b class="rs-level">${RD.name}</b><p class="small">${esc(R.reasons[0])} ${esc(readyNext(R))}</p></div>
   ${R.level ? `<div class="rs-max"><div class="lab">${term('Pinjaman maksimal yang aman')}</div><b class="num">${rp(R.max[6])}</b><span class="tiny muted">untuk 6 bulan · 12 bulan: ${rps(R.max[12])}</span></div>` : ''}</div>`;
}
function readyCard(p, months) {
  const R = FW.readiness(p), RD = READY[R.level], lv = R.level < 3 ? levers(p) : [];
  return `<div class="ready-card one lv-${RD.tone}">
    <div class="rc-main"><div class="lab">${term('Kesiapan berutang')}</div><h3 class="rc-level">${RD.name}</h3>
     <ul class="rc-why">${R.reasons.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
     ${lv.length ? `<div class="levers"><div class="lab">Jalan naik level</div><ul>${lv.map(x => `<li><b>${esc(x.t)}</b>: ${esc(x.txt)}</li>`).join('')}</ul></div>` : ''}</div>
    <div class="rc-max"><div class="lab">${term('Pinjaman maksimal yang aman')}</div>
     ${R.max[6] <= 0 ? `<p class="rc-zero">Rp0</p><p class="small">Belum ada ruang untuk cicilan baru. Angka ini naik begitu sisa uangmu positif dan cicilan lama turun.</p>`
       : `<dl class="rc-amts">${[...new Set([3, 6, 12, months].filter(Boolean))].sort((a, b) => a - b).map(m => `<div class="${m === months ? 'on' : ''}"><dt>${m} bulan${m === months ? ' (rencanamu)' : ''}</dt><dd class="num">${rp(m === 3 || m === 6 || m === 12 ? R.max[m] : FW.maxSafeLoan(p, m))}</dd></div>`).join('')}</dl>
     <p class="tiny muted" style="margin-top:8px">Cicilan maksimal ${rp(FW.headroom(p).ceiling)} per bulan, dihitung dengan bunga legal ±1,5% per bulan.</p>`}</div></div>`;
}
function pilahStep0(p, st) {
  const guess = !st.cat ? classifyPurpose(st.needLabel) : null, ready = planReady(st);
  return `<div class="grid g-side">
   <div class="card">
    <h3>Rencana pinjamanmu</h3>
    <p class="small muted" style="margin-top:4px">Isi sekali di sini. Semua langkah berikutnya memakai angka ini.</p>
    <label class="f" style="margin-top:12px">Ceritakan singkat <span class="tiny muted">(opsional)</span><input class="in" id="n-label" value="${esc(st.needLabel)}" placeholder="mis. biaya rumah sakit ibu, modal jualan" data-k="pilah.needLabel" data-t="text"></label>
    ${guess ? `<p class="small" style="margin-top:8px" role="status">Dari ceritamu, sepertinya untuk <b>${esc(purposeName(guess))}</b>. ${guess === 'judi' ? '' : `<button class="linkbtn" data-act="pilah-cat" data-v="${guess}">Pakai ini</button>`}</p>` : ''}
    <div class="lab" style="margin-top:14px">Untuk apa?</div>
    <div class="purp" role="radiogroup" aria-label="Untuk apa" style="margin-top:6px">${PURPOSES.map(([k, l, d]) => `<button role="radio" aria-checked="${st.cat === k}" class="${st.cat === k ? 'on' : ''}" data-act="pilah-cat" data-v="${k}"><b>${l}</b><span class="tiny muted">${d}</span></button>`).join('')}</div>
    ${isJudi(st) ? warnBox(pilahWarn(p, { ...st, cat: 'judi' })) : ''}
    <div class="grid g2" style="margin-top:14px">
     <label class="f">Berapa yang kamu butuhkan?${rpInput('n-amount', st.need, 'data-k="pilah.need" data-t="rpn" placeholder="mis. 5.000.000"')}</label>
     <label class="f">Mau dicicil berapa lama?<select class="in" id="n-months" data-k="pilah.months" data-t="intn">${st.months ? '' : '<option value="" selected>Pilih</option>'}${[1, 3, 6, 9, 12, 18, 24].map(m => `<option value="${m}" ${m === st.months ? 'selected' : ''}>${m} bulan</option>`).join('')}</select></label>
    </div>
    <div class="lab" style="margin-top:14px">Kapan dananya dibutuhkan?</div>
    <div class="seg" role="radiogroup" aria-label="Kapan dibutuhkan" style="margin-top:6px">${URGENCY.map(([k, l]) => `<button role="radio" aria-checked="${st.urg === k}" class="${st.urg === k ? 'on' : ''}" data-act="pilah-urg" data-v="${k}">${l}</button>`).join('')}</div>
    <div style="margin-top:16px"><button class="btn" data-act="pilah-step" data-v="1" ${ready && !isJudi(st) ? '' : 'disabled'}>Lihat dampaknya ke keuanganku</button>${ready ? '' : `<p class="tiny muted" style="margin-top:6px">Lengkapi: ${[!st.cat && 'untuk apa', !(st.need > 0) && 'jumlahnya', !st.months && 'lama cicilan', !st.urg && 'kapan dibutuhkan'].filter(Boolean).join(', ')}.</p>`}</div>
   </div>
   <div class="card flat"><div class="lab">Setelah ini kamu akan melihat</div><ol class="small" style="margin:8px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:6px">
    <li>Dampak rencanamu ke cicilan dan sisa uang, plus kesiapan berutang dan pinjaman maksimal yang aman.</li>
    <li>Cara meminjam lebih sedikit, misalnya dari tabungan atau bantuan keluarga. Ini opsional.</li>
    <li>Semua pindar berizin untuk jumlah dan tenor itu, dengan patokan harga bank, koperasi, dan batas OJK.</li></ol>
    <p class="tiny muted" style="margin-top:10px">Tidak ada yang dikunci. Kalau rencanamu berisiko, FinWise memberi tahu di atas, tapi semua pilihan tetap bisa kamu lihat.</p></div>
  </div>`;
}
function pilahStep1(p, st) {
  const { h, amt } = pilahCalc(p, st), w = pilahWarn(p, st), mo = st.months || 6, mx = FW.maxSafeLoan(p, mo);
  const best = amt > 0 ? cheapestReal(mo, st.purpose || 'konsumtif', amt) : null;
  const cap = FW.ojkCap(st.purpose || 'konsumtif', mo, amt);
  const worst = FW.loan({ principal: amt, rate: cap, unit: 'day', months: mo, maxTotal: amt * Math.min(cap * mo * 30, st.purpose === 'produktif' ? Infinity : 1) });
  const L = best ? best.L : worst, z = FW.zoneOf(p, L.inst);
  const zt = { safe: ['Cicilannya masih dalam batas amanmu.', 'safe'], stretch: [`Cicilannya melewati batas amanmu ${rp(h.ceiling)} per bulan.`, 'amber'], danger: [z.left < 0 ? `Sisa uangmu jadi minus ${rp(-z.left)} per bulan.` : `Porsi cicilanmu jadi ${pct(z.dsr, 0)}, di atas 40%.`, 'danger'] }[z.zone];
  return `${warnBox(w)}<div class="grid g-side" style="align-items:start">
   <div class="card">
    <div class="row between"><div class="lab">Rencanamu</div><button class="linkbtn small" data-act="pilah-step" data-v="0">Ubah</button></div>
    <h3 style="margin-top:2px">${esc(purposeName(st.cat))} · ${rp(st.need)} · ${mo} bulan</h3>
    ${amt < st.need ? `<p class="small muted">Yang dihitung: ${rp(amt)}${st.cap > 0 ? ' (jumlah aman)' : ' (setelah dikurangi)'}.</p>` : ''}
    <div class="facts f3" style="margin-top:12px">
     <div><div class="k">Cicilan per bulan</div><div class="v">${rp(L.inst)}</div></div>
     <div><div class="k">${term('Porsi cicilan')}</div><div class="v">${pct(h.dsrNow, 0)} → ${pct(z.dsr, 0)}</div></div>
     <div><div class="k">${term('Sisa uang')} per bulan</div><div class="v" style="color:${z.left < 0 ? 'var(--danger)' : 'inherit'}">${rps(h.sur)} → ${rp(z.left, { plus: true })}</div></div>
    </div>
    <div class="note ${zt[1]} small" style="margin-top:12px">${zpill(z.zone)} ${esc(zt[0])}</div>
    <p class="tiny muted" style="margin-top:8px">${best ? `Dihitung dengan tarif maksimum ${esc(best.pr.name)}, pindar berizin dengan total biaya termurah untuk jumlah dan tenor ini. Kalau dikenai batas maksimum OJK, cicilannya ${rp(worst.inst)}.` : 'Belum ada pindar berizin di database yang melayani jumlah dan tenor ini, jadi dihitung dengan batas maksimum OJK.'}</p>
    ${mx < st.need ? `<div class="capbox"><p class="small"><b>Pinjaman maksimal yang aman untuk ${mo} bulan: ${rp(mx)}.</b> ${mx > 0 ? `Sisanya, ${rp(st.need - mx)}, bisa ditutup dari tabungan, keluarga, atau ditunda.` : 'Saat ini belum ada ruang untuk cicilan baru.'}</p>
     <div class="row" role="group" aria-label="Jumlah yang dihitung" style="margin-top:8px">${mx > 0 ? `<button class="btn sm ${st.cap > 0 ? '' : 'ghost'}" data-act="pilah-cap" data-v="${mx}" aria-pressed="${st.cap > 0}">Pakai jumlah aman ${rps(mx)}</button>` : ''}<button class="btn sm ${st.cap > 0 ? 'ghost' : ''}" data-act="pilah-cap" data-v="0" aria-pressed="${!(st.cap > 0)}">Tetap ${rps(st.need)}</button></div></div>` : ''}
    <details class="more"><summary>Cara FinWise menghitung batas aman</summary>
     <div class="stack small" style="margin-top:8px;gap:8px">
      <div class="note ${h.binding === 'dsr' ? 'amber' : ''}"><b>Hitungan 1 · cicilan maks 30% pendapatan</b><div class="num">30% × ${rp(h.inc)} − cicilan ${rp(h.ex)} = <b>${rp(h.lens1)}</b></div></div>
      <div class="note ${h.binding === 'cash' ? 'amber' : ''}"><b>Hitungan 2 · 70% sisa uangmu setelah tabungan rutin</b><div class="num">${h.sur <= 0 ? `Sisa uangmu ${rp(h.sur, { plus: true })}, jadi tidak ada ruang dari hitungan ini.` : `70% × (sisa ${rp(h.sur)}${h.save ? ` − tabungan rutin ${rp(h.save)}` : ''}) = <b>${rp(Math.max(0, h.lens2))}</b>`}</div></div>
      <p>Yang dipakai: yang lebih kecil. Di atas ${rps(h.stretchMax)} per bulan, cicilanmu masuk zona Bahaya.</p></div></details>
   </div>
   ${readyCard(p, mo)}
  </div>
  ${w && w.stop ? '' : `<div class="row" style="margin-top:14px"><button class="btn" data-act="pilah-step" data-v="2">Lanjut: pinjam lebih sedikit (opsional)</button><button class="btn ghost" data-act="pilah-step" data-v="3">Langsung bandingkan pinjol</button></div>`}`;
}
const RUNG_TIPS = {
  reduce: { kesehatan: 'mis. pakai kelas rawat BPJS, tunda tindakan yang tidak mendesak', pendidikan: 'mis. bayar sebagian dulu, tunda kursus tambahan', pokok: 'mis. kurangi belanja, pindah ke tempat lebih murah', usaha: 'mis. mulai dari stok lebih kecil', gaya: 'mis. pilih yang lebih murah atau bekas', utang: 'mis. hentikan belanja paylater baru' },
  relief: { kesehatan: 'minta cicilan biaya ke rumah sakit, cek tanggungan BPJS', pendidikan: 'minta cicilan atau penundaan UKT ke kampus', pokok: 'minta tempo ke pemilik kos atau penagih tagihan', utang: 'minta restrukturisasi ke pemberi pinjaman lama (lihat PULIH)' },
};
function pilahStep2(p, st) {
  const { lad } = pilahCalc(p, st);
  const r = (k, n, title, tip, aria, used) => `<div class="rung ${used > 0 ? 'used' : 'cur'}"><span class="n">${n}</span><div><b>${title}</b><div class="tiny muted">${tip}</div></div><div class="rin">${rpInput('r-' + k, st[k === 'savings' ? 'useSavings' : k], `data-k="pilah.${k === 'savings' ? 'useSavings' : k}" data-t="rpn" placeholder="0" aria-label="${aria}"`)}</div></div>`;
  return `<div class="grid g-side">
   <div class="card">
    <h3>${term('Tangga dana')}: pinjam lebih sedikit</h3>
    <p class="small muted" style="margin-top:4px">Opsional. Setiap rupiah yang tertutup di sini tidak berbunga. Kosongkan yang tidak ada.</p>
    <div style="margin-top:8px">
     ${r('savings', 1, 'Dana darurat sendiri', `Saldo ${rp(p.emergencyFund || 0)} · tanpa biaya`, 'Dana darurat yang dipakai', lad.steps[0].use)}
     ${r('family', 2, 'Bantuan atau patungan keluarga', 'tanpa bunga, sepakati waktu kembali', 'Bantuan keluarga', lad.steps[1].use)}
     ${r('reduce', 3, 'Kurangi atau tunda sebagian', RUNG_TIPS.reduce[st.cat] || 'bagian mana yang bisa dikurangi atau ditunda', 'Jumlah yang dikurangi atau ditunda', st.reduce)}
     ${r('relief', 4, 'Minta keringanan ke pihak yang menagih', RUNG_TIPS.relief[st.cat] || 'minta cicilan atau tempo bayar', 'Jumlah yang bisa dicicil atau ditunda', st.relief)}
     ${r('fund', 5, 'Dana bantuan', 'beasiswa atau dana darurat kampus, bantuan kantor, BPJS, zakat atau donasi', 'Dana bantuan', st.fund)}
     ${r('cash', 6, 'Tambah uang cepat', 'jual barang yang tidak terpakai, kerja tambahan atau freelance', 'Uang tambahan', st.cash)}
    </div>
   </div>
   <div class="card" aria-live="polite">
    <div class="lab">${esc(st.needLabel || purposeName(st.cat))}</div>
    ${lad.covered > 0 ? `<div class="num" style="margin-top:6px;color:var(--muted);font-weight:700"><s style="text-decoration-color:var(--danger);text-decoration-thickness:2px">${rp(st.need)}</s></div>` : ''}<div class="big" style="margin:2px 0 6px;font-size:clamp(1.875rem,3.6vw,2.625rem)">${rp(lad.gap)}</div>
    <div class="small muted">${lad.gap > 0 ? 'yang perlu dipinjam' : 'tertutup tanpa utang baru'}</div>
    <div class="prog" style="margin:14px 0 6px"><i style="width:${(lad.covered / Math.max(1, st.need) * 100).toFixed(1)}%"></i></div>
    <div class="row between small"><span style="color:var(--safe)" class="num">Tertutup ${rp(lad.covered)}</span><span style="color:var(--amber)" class="num">Sisa ${rp(lad.gap)}</span></div>
    ${lad.gap === 0 ? '<div class="note safe" style="margin-top:14px">Kamu tidak perlu pinjaman baru. Catat kesepakatan dengan keluarga, lalu isi lagi dana daruratmu di CEK.</div>' : ''}
    <div class="row" style="margin-top:14px"><button class="btn" data-act="pilah-step" data-v="3" ${lad.gap === 0 ? 'disabled' : ''}>Bandingkan pinjol untuk ${rps(lad.gap)}</button></div>
   </div>
  </div>`;
}
// reference prices for the same amount and tenor: bank, koperasi, the pindar in the database, and the legal maximum
function benchCard(st, amt, m) {
  const n = st.months || 6, purpose = st.purpose || 'konsumtif';
  const bank = r => amt * r * n + amt * BENCH.bank.admin, kop = amt * BENCH.kop.month * n;
  const totals = m.ok.map(r => r.total).sort((a, b) => a - b), med = totals.length ? totals[Math.floor((totals.length - 1) / 2)] : null;
  const cap = FW.ojkCap(purpose, n, amt), ojk = amt * Math.min(cap * n * 30, purpose === 'konsumtif' ? 1 : Infinity);
  const rows = [
    ['Bank (KTA)', bank(BENCH.bank.lo), bank(BENCH.bank.hi), 'perlu pengajuan dan syarat bank, cair beberapa hari'],
    ['Koperasi simpan pinjam', null, kop, 'batas aturan; hanya kalau kamu anggota'],
    totals.length ? ['Pindar termurah di database', totals[0], null, 'tarif maksimum di RIPLAY'] : null,
    med != null ? ['Pindar, nilai tengah di database', med, null, `dari ${totals.length} pindar yang melayani rencanamu`] : null,
    ['Batas maksimum OJK', ojk, null, `${nf(cap * 100, 3)}% per hari, total paling banyak 100% pokok`],
  ].filter(Boolean);
  const max = Math.max(...rows.map(r => r[2] ?? r[1]));
  return `<div class="card bench"><h3>Patokan harga: pinjam ${rp(amt)} selama ${n} bulan</h3>
    <p class="small muted" style="margin-top:4px">Total biaya (bunga + admin) kalau pinjam dari tempat lain. Ini patokan, bukan pilihan di daftar.</p>
    <ul class="bench-rows">${rows.map(([k, a, b, note]) => { const v = b ?? a; return `<li><div class="row between" style="flex-wrap:nowrap;gap:10px"><b>${k}</b><span class="num"><b>${a != null && b != null ? `${rps(a)}–${rps(b)}` : (a == null ? 'maks ' : '') + rp(v)}</b><span class="tiny muted"> · cicilan ${a != null && b != null ? `${rps((amt + a) / n)}–${rps((amt + b) / n)}` : rps((amt + v) / n)}/bln</span></span></div>
      <div class="bar" aria-hidden="true">${a != null && b != null ? `<i style="margin-left:${(a / max * 100).toFixed(1)}%;width:${Math.max(1.5, (b - a) / max * 100).toFixed(1)}%;background:var(--green)"></i>` : `<i style="width:${Math.max(1.5, v / max * 100).toFixed(1)}%;background:${k.startsWith('Batas') ? 'var(--danger)' : k.startsWith('Pindar') ? 'var(--amber-strong)' : 'var(--green)'}"></i>`}</div>
      <div class="tiny muted">${note}</div></li>`; }).join('')}</ul>
    <p class="tiny muted" style="margin-top:8px">Sumber: ${esc(BENCH.bank.src)}. ${esc(BENCH.kop.src)}. Batas OJK: SEOJK 19/SEOJK.06/2025. Pindar: tarif maksimum RIPLAY di database FinWise (per ${dateID('2026-04-30')}).</p></div>`;
}
// "why is #1 on top" in plain words; when every option is in the red it says so and never calls the loan a good fit
function whyFirst(p, st, m, lad, h, ctx, amt) {
  const [a, b, c] = m.ok; if (!a) return '';
  const rl = a.real ? RL.find(l => l.id === a.real) : null;
  const topComplaint = rl?.clusters.filter(x => x.type === 'complaint').sort((x, y) => y.n - x.n)[0];
  const mx = FW.maxSafeLoan(p, a.months), danger = a.zone === 'danger', payday = Math.min(...p.incomes.map(i => i.payday || 1));
  const fb = {
    cocok: [`Total yang dikembalikan ${rp(a.repay)} untuk ${rp(amt)} selama ${a.months} bulan${b ? `, ${a.total <= b.total ? rp(b.total - a.total) + ' lebih murah' : rp(a.total - b.total) + ' lebih mahal'} dari ${b.name}` : ''}.`,
      danger ? `Di antara semua pilihan, ini yang ${a.left < 0 ? `menyisakan minus paling kecil (${rp(a.left)} per bulan)` : 'beban cicilannya paling ringan'}.` : a.zone === 'safe' ? `Cicilan ${rp(a.inst)} masih di bawah batas amanmu ${rp(h.ceiling)}.` : '',
      a.rating ? `Rating sampel ulasan ${nf(a.rating, 1)} dengan ${pct(a.positive || 0, 0)} ulasan positif.` : a.generic ? '' : ''],
    waspada: [danger ? `Bahaya: ${a.left < 0 ? `sisa uangmu jadi minus ${rp(-a.left)} per bulan` : `porsi cicilanmu jadi ${pct(a.dsr, 0)}`}. Kekurangan ini biasanya ditutup dengan utang baru.` : a.zone === 'stretch' ? `Cicilan ${rp(a.inst)} melebihi batas amanmu ${rp(h.ceiling)}; sisa uangmu tinggal ${rp(a.left)}.` : '',
      `Bunga sebenarnya ±${pct(a.ear, 0)} per tahun, jauh di atas angka bulanan yang diiklankan.`,
      topComplaint ? `Keluhan terbanyak di ${a.name}: ${topComplaint.label.toLowerCase()} (${topComplaint.n} sebutan).` : a.generic ? 'Persetujuan bisa lebih lama dan butuh dokumen; ajukan lebih awal.' : 'Telat bayar dikenai denda harian dan tercatat di SLIK.'],
    saran: [danger || a.zone === 'stretch' ? (mx > 0 ? `Jika tetap harus meminjam, pinjam maksimal ${rp(mx)}. Sisanya dari tangga dana, minta keringanan ke pihak yang ditagih, atau tunda.` : 'Jika tetap harus meminjam, pinjam sekecil mungkin dan siapkan dari mana menutup minus tiap bulan sebelum mengajukan.') : `Ajukan tepat ${rp(amt)}, bukan lebih, dengan tenor ${a.months} bulan.`,
      `Pasang jatuh tempo di tanggal ${payday}, tepat setelah uang masuk, lalu kunci cicilannya di rekening terpisah.`, 'Unduh aplikasinya hanya dari Play Store/App Store resmi; cocokkan nama perusahaan di Database Pinjol.'],
  };
  const prompt = `Data:\n${context()}\nKebutuhan ${rp(st.need)}, ditutup tanpa utang ${rp(lad.covered)}, dibandingkan pinjaman ${rp(amt)}. Batas cicilan aman ${rp(h.ceiling)}/bulan; pinjaman maksimal yang aman ${rp(mx)}.\nTiga opsi teratas: ${m.ok.slice(0, 3).map(r => `${r.rank}. ${r.name}: total dikembalikan ${rp(r.repay)}, biaya ${rp(r.total)}, cicilan ${rp(r.inst)} x ${r.months}, bunga efektif ${pct(r.ear, 0)}/thn, zona ${ZONE[r.zone][0]}, sisa uang setelahnya ${rp(r.left)}`).join('; ')}.\n${danger ? 'PENTING: semua opsi berstatus Bahaya. Jangan menyebut opsi ini cocok atau menyarankan mengajukan jumlah penuh; sebut sebagai pilihan yang paling sedikit merugikan dan arahkan ke jumlah aman atau tanpa utang.\n' : ''}Tugas: analisis opsi nomor 1 untuk pengguna ini. ${AI3_FORMAT}`;
  const head = danger ? `${esc(a.name)}: pilihan yang paling sedikit merugikan` : `${esc(a.name)} paling cocok untuk prioritas “${MODES.find(x => x[0] === st.mode)[1]}”`;
  return `<div class="card why1 ${danger ? 'danger' : ''}" style="margin-top:16px"><div class="row between" style="align-items:flex-start"><div><div class="eyebrow e-pilah" style="font-weight:800;font-size:.8125rem;letter-spacing:.04em">${danger ? 'JIKA TETAP HARUS MEMINJAM' : 'KENAPA #1'}</div><h3 style="margin-top:4px">${head}</h3></div>
    <div class="row">${[b, c].filter(Boolean).map((r, i) => `<span class="chip">vs #${i + 2} ${esc(r.name)}: ${r.total >= a.total ? 'hemat ' + rps(r.total - a.total) : 'lebih mahal ' + rps(a.total - r.total)}</span>`).join('')}</div></div>
    <div style="margin-top:12px">${ai3(ctx.test ? 'none' : 'pilah3', prompt, { cocok: fb.cocok.filter(Boolean), waspada: fb.waspada.filter(Boolean), saran: fb.saran }, { auto: !ctx.test, noAI: !!ctx.test, heads: danger ? ['Kenapa yang ini', 'Yang perlu diwaspadai', 'Saran'] : null })}</div></div>`;
}
const MODES = [['seimbang', 'Seimbang'], ['termurah', 'Termurah'], ['ringan', 'Cicilan teringan'], ['reputasi', 'Reputasi terbaik']];
const SORT_TXT = { seimbang: 'gabungan biaya, kecocokan dengan batas amanmu, reputasi, dan keamanan data', termurah: 'total biaya (bunga + admin), dari yang paling murah', ringan: 'cicilan per bulan, dari yang paling ringan', reputasi: 'rating ulasan peminjam, dari yang tertinggi' };
function pilahStep3(p, st) {
  const w = pilahWarn(p, st);
  if (w && w.stop) return warnBox(w);
  const { lad, m, h, amt } = pilahCalc(p, st);
  if (!(amt > 0)) return '<div class="note safe">Tidak ada yang perlu dipinjam. <button class="linkbtn" data-act="pilah-step" data-v="2">Lihat tangga dana</button></div>';
  const other = m.rows.filter(r => r.status === 'filtered' || r.status === 'na'), blocked = m.rows.filter(r => r.status === 'blocked');
  const anySafe = m.ok.some(x => x.zone !== 'danger'), mo = st.months || 6, mx = FW.maxSafeLoan(p, mo);
  const card = r => {
    const best = r.rank === 1 && r.zone !== 'danger';
    const perMonth = amt ? r.total / amt / Math.max(1, r.months) : 0;
    const why = r.zone === 'danger' ? (r.left < 0 ? `sisa uangmu jadi minus ${rp(-r.left)} per bulan` : `porsi cicilanmu jadi ${pct(r.dsr, 0)}, di atas batas bahaya 40%`) : r.zone === 'stretch' ? `cicilannya melebihi batas amanmu ${rp(h.ceiling)}` : '';
    return `<div class="opt ${best ? 'best' : ''} ${st.picked === r.id ? 'picked' : ''}">
     <div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div class="row" style="gap:10px;align-items:flex-start;flex-wrap:nowrap;min-width:0"><span class="rank">${r.rank}</span><div><b style="font-size:1rem">${esc(r.name)}</b></div></div>${zpill(r.zone)}</div>
     <div class="op-part"><div class="op-h">Tentang pemberi pinjaman</div><p class="tiny muted">${esc(r.legal)} · biaya ±${nf(perMonth * 100, 1)}% per bulan (tarif maks RIPLAY)${r.rating ? ` · ★ ${nf(r.rating, 1)}` : ''}${r.note ? ' · ' + esc(r.note) : ''}</p></div>
     <div class="op-part"><div class="op-h">Pinjaman ini</div><div class="facts f2"><div>${lab('Cicilan', 'per bulan')}<div class="v">${rp(r.inst)} <span class="tiny muted">×${r.months}</span></div></div><div>${lab('Total dikembalikan', `biaya ${rps(r.total)}${r.fee > 0 ? `, termasuk admin ${rps(r.fee)}` : ''}`, 'Total dikembalikan')}<div class="v">${rp(r.repay)}</div></div></div></div>
     <div class="op-part"><div class="op-h">Dampaknya ke keuanganmu</div><div class="facts f2"><div>${lab('Porsi cicilan', 'semua cicilan ÷ gajimu', 'Porsi cicilan')}<div class="v">${pct(h.dsrNow, 0)} → ${pct(r.dsr, 0)}</div></div><div>${lab('Sisa uang', 'per bulan setelah semua', 'Sisa uang')}<div class="v" style="color:${r.left < 0 ? 'var(--danger)' : 'inherit'}">${rps(h.sur)} → ${rp(r.left, { plus: true })}</div></div></div></div>
     ${why ? `<div class="note ${r.zone === 'danger' ? 'danger' : 'amber'} small">${r.zone === 'danger' ? (anySafe ? 'Ditaruh di bawah karena ' : 'Bahaya karena ') : 'Mepet karena '}${why}.</div>` : ''}
     <div class="row between"><span class="tiny muted">${term('Bunga efektif', 'Bunga sebenarnya')} ±${pct(r.ear, 0)}/tahun${r.real ? ` · <a href="#openspace" data-act="lender" data-id="${r.real}">profil & ulasan</a>` : ''}</span><button class="btn sm ${r.zone === 'danger' ? 'ghost' : ''}" data-act="pick" data-id="${r.id}" aria-pressed="${st.picked === r.id}" aria-label="Pilih ${esc(r.name)}">${st.picked === r.id ? 'Dipilih' : 'Pilih opsi ini'}</button></div>
    </div>`;
  };
  const capNote = amt < lad.gap ? `<div class="note safe" style="margin-bottom:12px">Kamu memakai jumlah aman: <b>${rp(amt)}</b>. Sisanya, <b>${rp(lad.gap - amt)}</b>, dari tangga dana, keringanan, atau ditunda. <button class="linkbtn" data-act="pilah-cap" data-v="0">Kembalikan ke ${rp(lad.gap)}</button></div>` : '';
  const dangerNote = m.allDanger ? `<div class="note danger" role="status" style="margin-bottom:12px"><b>Tidak ada pinjaman yang aman untuk ${rp(amt)}.</b> ${mx > 0 ? `Pinjaman maksimal yang aman untuk ${mo} bulan: <b>${rp(mx)}</b>.` : 'Saat ini belum ada ruang untuk cicilan baru.'} Daftar di bawah tetap lengkap, diurutkan dari minus per bulan yang paling kecil.
    <div class="row" style="margin-top:8px">${mx > 0 && mx < amt ? `<button class="btn sm" data-act="pilah-cap" data-v="${mx}">Hitung dengan ${rps(mx)}</button>` : ''}<button class="btn sm ghost" data-act="pilah-step" data-v="2">Pinjam lebih sedikit</button></div></div>` : '';
  const sortTxt = m.allDanger && st.mode === 'seimbang' ? 'minus per bulan yang paling kecil (pilihan paling sedikit merugikan)' : SORT_TXT[st.mode];
  return `${warnBox(w)}${capNote}${dangerNote}${benchCard(st, amt, m)}
   <div class="row between" style="margin:18px 0 12px"><div><h3>Semua pindar berizin untuk ${rp(amt)}, ${mo} bulan</h3><p class="small muted">${m.ok.length} pindar dari database FinWise, dihitung dengan tarif maksimum di RIPLAY dan dibatasi plafon OJK. Diurutkan menurut ${sortTxt}. Urutan tidak bisa dibeli pemberi pinjaman.</p></div>
    <div><div class="lab" style="margin-bottom:4px">Urutkan menurut</div><div class="seg" role="group" aria-label="Urutkan menurut">${MODES.map(([k, l]) => `<button class="${st.mode === k ? 'on' : ''}" aria-pressed="${st.mode === k}" data-act="mode" data-scope="pilah" data-v="${k}">${l}</button>`).join('')}</div></div></div>
   ${m.ok.length ? `<div class="grid g3 top3">${m.ok.slice(0, 3).map(card).join('')}</div>
    ${m.ok.length > 3 ? `<div class="card allp" style="margin-top:14px"><h3>Semua pilihan (${m.ok.length})</h3><div class="tbl-wrap" style="margin-top:8px"><table><thead><tr><th>#</th><th>Pindar</th><th>Cicilan</th><th>Total dikembalikan</th><th>Ulasan</th><th>Zona</th><th><span class="sr">Aksi</span></th></tr></thead><tbody>
      ${m.ok.map(r => `<tr class="${st.picked === r.id ? 'picked' : ''}"><td class="num">${r.rank}</td><td><b>${esc(r.name)}</b>${r.real ? ` <a class="tiny" href="#openspace" data-act="lender" data-id="${r.real}">profil</a>` : ''}</td><td class="num">${rp(r.inst)} ×${r.months}</td><td class="num">${rp(r.repay)}</td><td class="num">${r.rating ? '★ ' + nf(r.rating, 1) : '–'}</td><td>${zpill(r.zone)}</td><td><button class="btn sm ghost" data-act="pick" data-id="${r.id}" aria-label="Pilih ${esc(r.name)}">${st.picked === r.id ? 'Dipilih' : 'Pilih'}</button></td></tr>`).join('')}
     </tbody></table></div></div>` : ''}
    ${whyFirst(p, st, m, lad, h, {}, amt)}` : '<div class="note danger">Tidak ada pindar berizin di database yang melayani jumlah dan tenor ini. Coba ubah jumlah atau lama cicilan di langkah 1.</div>'}
   <div class="grid g2" style="margin-top:16px">
    <div class="card flat"><div class="row between"><h3>Tidak memenuhi syarat (${other.length})</h3><button class="btn ghost sm" data-act="toggle" data-k="pilah.showOut">${st.showOut ? 'Tutup' : 'Lihat'}</button></div>
     ${st.showOut ? `<div class="stack small" style="margin-top:10px;gap:6px">${other.map(r => `<div class="row between"><span><b>${esc(r.name)}</b></span><span class="muted">${esc(r.reason)}</span></div>`).join('')}</div>` : `<p class="small muted" style="margin-top:6px">${other.length ? `Termasuk ${other.slice(0, 3).map(r => esc(r.name)).join(', ')}${other.length > 3 ? ', dan lainnya' : ''}: jumlah, tenor, atau jenisnya tidak cocok.` : 'Semua pindar di database melayani rencanamu.'}</p>`}</div>
    <div class="card flat" style="border-color:var(--danger)"><h3 style="color:var(--danger)">Diblokir</h3>
     <div class="stack small" style="margin-top:8px;gap:6px">${blocked.map(r => `<div class="row between"><b>${esc(r.name)}</b><span class="pill z-danger">${esc(r.reason)}</span></div>`).join('')}</div>
     <p class="tiny muted" style="margin-top:8px">Pinjaman tidak berizin tidak pernah ditampilkan sebagai pilihan.</p></div>
   </div>
   <div class="card flat" style="margin-top:16px"><div class="row between"><h3>Kenapa urutannya begini?</h3><button class="btn ghost sm" data-act="toggle" data-k="pilah.why">${st.why ? 'Tutup' : 'Lihat cara mengurutkan'}</button></div>
    ${st.why ? (st.mode !== 'seimbang' || m.allDanger ? `<p class="small" style="margin-top:10px">Mode ini mengurutkan murni menurut ${sortTxt}. Opsi Bahaya tetap ditaruh setelah opsi yang lebih aman, kalau ada.</p>` : `<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Opsi</th>${Object.keys(m.weights).map(k => `<th>${{ cost: 'Biaya', health: 'Cocok dgn batas', rep: 'Reputasi', privacy: 'Privasi', speed: 'Kecepatan' }[k]} (${Math.round(m.weights[k] * 100)}%)</th>`).join('')}<th>Skor</th></tr></thead><tbody>${m.ok.map(r => `<tr><td><b>${esc(r.name)}</b></td>${Object.keys(m.weights).map(k => `<td class="num">${Math.round(r.factors[k] * 100)}</td>`).join('')}<td class="num"><b>${Math.round(r.score * 100)}</b>${r.zone === 'danger' && anySafe ? ' <span class="tiny muted">(ditaruh di bawah)</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
     <ul class="small" style="margin:10px 0 0;padding-left:18px"><li>Seimbang menggabungkan biaya, kecocokan dengan batas amanmu, reputasi, privasi, dan kecepatan.</li><li>Reputasi dari sampel ulasan Google Play (rata-rata bintang dan % ulasan positif). Privasi dari sertifikasi ISO 27001/27701.</li><li>Banyak pindar memakai tarif maksimum yang sama, jadi ulasan dan privasi ikut menentukan.</li><li>Kecepatan cair tidak dipublikasikan, jadi dinilai netral.</li><li>Opsi zona Bahaya selalu di urutan bawah.</li><li>Tidak ada pemberi pinjaman yang membayar untuk urutan ini.</li></ul>`) : ''}
    ${!S.cap.sample ? '' : `<div style="margin-top:10px">${aiBlock('pilah', 'Jelaskan pilihan ini dengan AI', `Data:\n${context()}\nKebutuhan ${rp(st.need)}, tertutup non-utang ${rp(lad.covered)}, dibandingkan pinjaman ${rp(amt)}.\nOpsi (urut): ${m.ok.map(r => `${r.rank}. ${r.name}: total dikembalikan ${rp(r.repay)}, cicilan ${rp(r.inst)} x ${r.months}, porsi cicilan ${pct(r.dsr)}, sisa/bln ${rp(r.left)}, zona ${ZONE[r.zone][0]}`).join('; ')}.\nTugas: jelaskan dengan bahasa sederhana urutan ini dan risiko tiap opsi. Jangan menyebut opsi berstatus Bahaya sebagai cocok.`)}</div>`}
   </div>`;
}
function vPilah() {
  const p = P(), st = S.pilah;
  if (!MODES.some(x => x[0] === st.mode)) st.mode = 'seimbang';
  if (st.step == null || (st.step > 0 && !planReady(st))) st.step = 0;
  const steps = [[0, 'Rencana'], [1, 'Dampaknya'], [2, 'Pinjam lebih sedikit'], [3, 'Bandingkan pinjol']], ok = planReady(st) && !isJudi(st);
  return banner({ tone: 'amber', eyebrow: 'PILAH · SAAT BUTUH DANA', title: 'Pinjam secukupnya, dari yang tepat', sub: 'Mulai dari rencanamu: untuk apa, berapa, dan berapa lama. Lalu lihat dampaknya, cara meminjam lebih sedikit, dan semua pindar berizin.', right: userChip() }) + `
   <div class="row between"><div class="steps" role="group" aria-label="Langkah PILAH">${steps.map(([n, l]) => `<button class="${st.step === n ? 'on' : st.step > n ? 'done' : ''}" data-act="pilah-step" data-v="${n}" ${st.step === n ? 'aria-current="step"' : ''} ${n > 0 && !ok ? 'disabled' : ''}><i aria-hidden="true">${st.step > n ? '✓' : n + 1}</i>${l}${st.step > n ? '<span class="sr"> (selesai)</span>' : ''}</button>`).join('')}</div><a class="small" href="#openspace">Cek legalitas pinjol</a></div>
   ${st.step === 0 ? pilahStep0(p, st) : st.step === 1 ? pilahStep1(p, st) : st.step === 2 ? pilahStep2(p, st) : pilahStep3(p, st)}
   ${st.picked && st.step === 3 ? pickedBanner(p, st) : ''}`;
}
function pickedBanner(p, st) {
  const { m, amt } = pilahCalc(p, st); const r = m.ok.find(x => x.id === st.picked); if (!r) return '';
  return `<div class="card" style="margin-top:16px;border-color:var(--amber-strong)"><div class="row between"><div><div class="lab">Pilihanmu</div><b style="font-size:1.0625rem">${esc(r.name)}</b> ${zpill(r.zone)} <span class="small muted num">· ${rp(r.inst)} × ${r.months} bulan, total dikembalikan ${rp(r.repay)}</span></div>
   <button class="btn amber" data-act="to-pulih">Teruskan ke PULIH</button></div><p class="small muted" style="margin-top:6px">Cicilan ini akan ditambahkan ke jadwal bayar di PULIH dengan jatuh tempo setelah tanggal gajian.</p></div>`;
}
