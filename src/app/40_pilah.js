/* ================= PILAH ================= */
// what the money is for decides whether borrowing is acceptable at all (with the readiness level)
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
function pilahGate(p, st) {
  const R = FW.readiness(p), cat = st.cat, urgent = !!st.urg && st.urg !== 'tunda', essential = ESSENTIAL.includes(cat);
  if (!isSaya(p) || !cat) return { mode: 'normal', R };
  if (cat === 'judi') return { mode: 'nodebt', why: 'judi', R };
  if (cat === 'utang') return { mode: R.level === 0 ? 'nodebt' : 'debt', why: 'utang', R };
  if (R.level === 0) return essential && urgent ? { mode: 'emergency', R } : { mode: 'nodebt', why: essential ? 'tunda' : 'gaya', R };
  if (R.level === 1) return cat === 'gaya' ? { mode: 'nodebt', why: 'gaya', R } : { mode: 'capped', R };
  return { mode: 'normal', R };
}
function pilahCalc(p, st) {
  const h = FW.headroom(p);
  const lad = FW.ladder(st.need || 0, [{ key: 'savings', amount: Math.min(st.useSavings || 0, p.emergencyFund || 0) }, { key: 'family', amount: st.family || 0 },
    { key: 'reduce', amount: st.reduce || 0 }, { key: 'relief', amount: st.relief || 0 }, { key: 'fund', amount: st.fund || 0 }, { key: 'cash', amount: st.cash || 0 }]);
  // the loan is capped at the largest safe amount (automatically when the gate says so; the user can lift it)
  let cap = st.cap;
  if (cap == null && isSaya(p) && ['capped', 'debt'].includes(pilahGate(p, st).mode)) cap = safeCapFor(p, st) || 0;
  const amt = cap > 0 ? Math.min(lad.gap, cap) : lad.gap;
  const products = isSaya(p) ? realProducts(st, amt) : DATA.products;
  const m = FW.match(p, { amount: amt, deadlineHours: st.hours || 0, purpose: st.purpose || 'konsumtif', mode: st.mode, products });
  return { h, lad, m, amt };
}
const pilahReady = (p, st) => st.need > 0 && st.hours > 0 && !!st.purpose && (!isSaya(p) || (st.months > 0 && !!st.cat));
function readyStrip(p) {
  const R = FW.readiness(p), RD = READY[R.level];
  return `<div class="ready-strip lv-${RD.tone}"><div><div class="lab">${term('Kesiapan berutang')}</div><b class="rs-level">${RD.name}</b><p class="small">${esc(R.reasons[0])} ${esc(readyNext(R))}</p></div>
   ${R.level ? `<div class="rs-max"><div class="lab">${term('Pinjaman maksimal yang aman')}</div><b class="num">${rp(R.max[6])}</b><span class="tiny muted">untuk 6 bulan · 12 bulan: ${rps(R.max[12])}</span></div>` : ''}</div>`;
}
function pilahStep0(p, st) {
  const guess = !st.cat ? classifyPurpose(st.needLabel) : null;
  return `<div class="grid g-side">
   <div class="card">
    <h3>Untuk apa dananya?</h3>
    <p class="small muted" style="margin-top:4px">Boleh tidaknya meminjam tergantung untuk apa. Biaya berobat tidak sama dengan HP baru.</p>
    <label class="f" style="margin-top:12px">Ceritakan singkat <span class="tiny muted">(opsional)</span><input class="in" id="n-label" value="${esc(st.needLabel)}" placeholder="mis. biaya rumah sakit ibu, modal jualan" data-k="pilah.needLabel" data-t="text"></label>
    ${guess ? `<p class="small" style="margin-top:8px" role="status">Dari ceritamu, sepertinya untuk <b>${esc(purposeName(guess))}</b>. ${guess === 'judi' ? '' : `<button class="linkbtn" data-act="pilah-cat" data-v="${guess}">Pakai ini</button>`}</p>` : ''}
    ${st.cat === 'judi' || guess === 'judi' ? '<div class="note danger small" style="margin-top:8px">FinWise tidak membandingkan pinjaman untuk judi online. Utang untuk judi hampir selalu bertambah, bukan tertutup. Kalau terasa sulit berhenti, ceritakan ke orang terdekat atau tenaga profesional.</div>' : ''}
    <div class="purp" role="radiogroup" aria-label="Kategori tujuan" style="margin-top:12px">${PURPOSES.map(([k, l, d]) => `<button role="radio" aria-checked="${st.cat === k}" class="${st.cat === k ? 'on' : ''}" data-act="pilah-cat" data-v="${k}"><b>${l}</b><span class="tiny muted">${d}</span></button>`).join('')}</div>
    <h3 style="margin-top:18px">Seberapa mendesak?</h3>
    <div class="seg" role="radiogroup" aria-label="Urgensi" style="margin-top:8px">${URGENCY.map(([k, l]) => `<button role="radio" aria-checked="${st.urg === k}" class="${st.urg === k ? 'on' : ''}" data-act="pilah-urg" data-v="${k}">${l}</button>`).join('')}</div>
    <div style="margin-top:16px"><button class="btn" data-act="pilah-step" data-v="1" ${st.cat && st.urg ? '' : 'disabled'}>Lanjut: cek batas aman</button>${st.cat && st.urg ? '' : '<p class="tiny muted" style="margin-top:6px">Pilih tujuan dan seberapa mendesak.</p>'}</div>
   </div>
   <div class="card flat"><div class="lab">Kenapa ditanya?</div><ul class="small" style="margin:8px 0 0;padding-left:18px;display:flex;flex-direction:column;gap:6px">
    <li>Kalau kesiapan berutangmu <b>Belum bisa berutang</b>, FinWise hanya menampilkan pinjaman untuk keperluan mendesak seperti kesehatan, pendidikan, atau kebutuhan pokok.</li>
    <li>Untuk barang atau gaya hidup, menabung dulu hampir selalu lebih murah daripada bunga.</li>
    <li>Meminjam untuk membayar utang lain biasanya menunda masalah; PULIH punya langkah yang lebih aman.</li></ul></div>
  </div>`;
}
function pilahStep1(p, st, ctx) {
  const h = FW.headroom(p), paydays = p.incomes.map(i => i.payday || 1), R = FW.readiness(p);
  return `<div class="grid g-side">
   <div class="stack">
    <div class="card"><div class="row between"><h3>Daftar utang aktif</h3><span class="lab num">${rp(h.ex)}/bulan</span></div>
     <div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Utang</th><th>Cicilan</th><th>Jatuh tempo</th><th>Sisa</th>${ctx.test ? '' : '<th></th>'}</tr></thead><tbody>
      ${p.loans.map(l => `<tr><td><b>${esc(l.name)}</b><div class="tiny muted">${esc(l.type)}</div></td><td class="num">${rp(l.instalment)}</td><td>tgl ${l.dueDay}</td><td class="num">${l.months} bln</td>${ctx.test ? '' : `<td><button class="btn ghost sm" data-act="loan-del" data-id="${l.id}" aria-label="Hapus ${esc(l.name)}">Hapus</button></td>`}</tr>`).join('') || `<tr><td colspan="5" class="muted">Belum ada utang aktif.</td></tr>`}
     </tbody></table></div>
     ${ctx.test ? '' : `<form class="grid g4" style="margin-top:12px;align-items:end" data-form="addloan">
      <label class="f">Nama<input class="in" id="nl-name" placeholder="mis. Paylater" required></label>
      <label class="f">Cicilan/bln${rpInput('nl-inst', null, 'placeholder="mis. 500.000"')}</label>
      <label class="f">Tgl jatuh tempo<input class="in" id="nl-due" type="number" min="1" max="31" placeholder="1–31"></label>
      <label class="f">Sisa (bulan)<input class="in" id="nl-months" type="number" min="1" max="120" placeholder="mis. 6"></label>
      <button class="btn ghost sm" style="grid-column:1/-1;justify-self:start">Tambah utang</button></form>`}
    </div>
    <div class="card"><h3>Peta jatuh tempo</h3>
     ${monthStrip([...p.incomes.map(i => ({ day: i.payday || 1, label: 'Gajian', color: 'var(--safe)' })), ...p.loans.map(l => ({ day: l.dueDay, label: l.name.split(' ')[0], color: 'var(--amber)' }))])}
     <p class="small muted" style="margin-top:8px">Jatuh tempo pinjaman baru sebaiknya tanggal <b style="color:var(--ink)">${Math.min(...paydays)}</b>, tepat setelah uang masuk. Pengingat dan jadwal bayar dikelola di PULIH.</p>
    </div>
   </div>
   <div class="card" ${ctx.test ? 'id="t-headroom"' : ''}>
    <div class="lab">${term('Batas cicilan aman', 'Batas cicilan baru yang aman')}</div>
    <div class="big" style="color:${h.ceiling > 0 ? 'var(--safe)' : 'var(--danger)'};margin:6px 0 2px">${rp(h.ceiling)}<span class="small muted" style="font-size:1rem"> /bulan</span></div>
    ${h.ceiling > 0 ? `<div class="small" style="margin-bottom:6px">Setara pinjaman maksimal <b>${rp(FW.maxSafeLoan(p, 6))}</b> untuk 6 bulan.</div>` : ''}
    <div class="small muted">${term('Porsi cicilan')} sekarang ${pct(h.dsrNow)} · ${term('Sisa uang', 'sisa uang')} ${rp(h.sur, { plus: true })}/bulan</div>
    <div style="margin:16px 0 4px">${zoneBar(h)}</div>
    <div class="stack" style="margin-top:14px;gap:10px">
     <div class="note ${h.binding === 'dsr' ? 'amber' : ''}"><b>Hitungan 1 · cicilan maks 30% pendapatan</b><div class="num small">30% × ${rp(h.inc)} − cicilan ${rp(h.ex)} = <b>${rp(h.lens1)}</b></div></div>
     <div class="note ${h.binding === 'cash' ? 'amber' : ''}"><b>Hitungan 2 · 70% sisa uangmu setelah tabungan rutin</b><div class="num small">${h.sur <= 0 ? `Sisa uangmu ${rp(h.sur, { plus: true })}, jadi <b>tidak ada ruang</b> dari hitungan ini.` : `70% × (sisa ${rp(h.sur)}${h.save ? ` − tabungan rutin ${rp(h.save)}` : ''}) = <b>${rp(Math.max(0, h.lens2))}</b> (30% disisakan sebagai penyangga)`}</div></div>
     <p class="small">Yang dipakai: hitungan yang hasilnya lebih kecil, yaitu <b>${h.binding === 'dsr' ? 'hitungan 1' : 'hitungan 2'}</b>. Di atas ${rps(h.stretchMax)} cicilanmu masuk ${term('Zona', 'zona Bahaya')}.</p>
     ${h.ceiling <= 0 ? '<div class="note danger">Saat ini belum ada ruang untuk cicilan baru. Coba atur ulang pengeluaran di CEK atau rapikan utang di PULIH dulu.</div>' : ''}
    </div>
    <div class="row" style="margin-top:14px">${ctx.test ? `<button class="btn" data-act="t-step" data-v="2" data-mark="headroom">Saya sudah paham batas amanku, lanjut</button>`
      : R.level === 0 ? `<a class="btn" href="#cek" data-act="goto-plan">Lihat rencana tanpa utang</a><button class="btn ghost" data-act="pilah-step" data-v="2">Saya tetap butuh dana darurat</button>` : `<button class="btn" data-act="pilah-step" data-v="2">Lanjut: tangga dana</button>`}</div>
   </div>
  </div>`;
}
const RUNG_TIPS = {
  reduce: { kesehatan: 'mis. pakai kelas rawat BPJS, tunda tindakan yang tidak mendesak', pendidikan: 'mis. bayar sebagian dulu, tunda kursus tambahan', pokok: 'mis. kurangi belanja, pindah ke tempat lebih murah', usaha: 'mis. mulai dari stok lebih kecil', gaya: 'mis. pilih yang lebih murah atau bekas', utang: 'mis. hentikan belanja paylater baru' },
  relief: { kesehatan: 'minta cicilan biaya ke rumah sakit, cek tanggungan BPJS', pendidikan: 'minta cicilan atau penundaan UKT ke kampus', pokok: 'minta tempo ke pemilik kos atau penagih tagihan', utang: 'minta restrukturisasi ke pemberi pinjaman lama (lihat PULIH)' },
};
function extraRungs(st) {
  const r = (k, n, title, tip, aria) => `<div class="rung ${st[k] > 0 ? 'used' : 'cur'}"><span class="n">${n}</span><div><b>${title}</b><div class="tiny muted">${tip}</div></div><div class="rin">${rpInput('r-' + k, st[k], `data-k="pilah.${k}" data-t="rpn" placeholder="0" aria-label="${aria}"`)}</div></div>`;
  return r('reduce', 3, 'Kurangi atau tunda sebagian kebutuhan', RUNG_TIPS.reduce[st.cat] || 'bagian mana yang bisa dikurangi atau ditunda', 'Jumlah yang dikurangi atau ditunda')
    + r('relief', 4, 'Minta keringanan ke pihak yang menagih', RUNG_TIPS.relief[st.cat] || 'minta cicilan atau tempo bayar', 'Jumlah yang bisa dicicil atau ditunda pembayarannya')
    + r('fund', 5, 'Dana bantuan', 'beasiswa atau dana darurat kampus, bantuan kantor, BPJS, zakat atau donasi', 'Dana bantuan')
    + r('cash', 6, 'Tambah uang cepat', 'jual barang yang tidak terpakai, kerja tambahan atau freelance', 'Uang tambahan');
}
function gateNote(p, st, lad) {
  if (!isSaya(p) || !st.cat || lad.gap === 0) return '';
  const g = pilahGate(p, st), cap = safeCapFor(p, st);
  const msg = {
    nodebt: g.why === 'judi' ? 'FinWise tidak membandingkan pinjaman untuk judi online.' : g.why === 'utang' ? 'Dengan kondisimu sekarang, meminjam untuk membayar utang lain akan memperbesar lubang. Langkah berikutnya: rencana tanpa utang dan cara minta keringanan di PULIH.' : g.why === 'gaya' ? `Kesiapan berutangmu "${READY[g.R.level].name}", jadi pinjaman untuk ${purposeName(st.cat).toLowerCase()} tidak disarankan. Langkah berikutnya: rencana tanpa utang.` : `Kesiapan berutangmu "${READY[g.R.level].name}" dan kebutuhan ini masih bisa ditunda. Langkah berikutnya: rencana tanpa utang.`,
    emergency: `Mode darurat: kesiapan berutangmu "${READY[g.R.level].name}", tapi kebutuhan ${purposeName(st.cat).toLowerCase()} ini mendesak. FinWise akan menunjukkan pilihan yang paling sedikit merugikan, setelah kamu mengonfirmasi risikonya.`,
    capped: cap > 0 && cap < lad.gap ? `Kesiapan berutangmu "${READY[g.R.level].name}", jadi pinjaman dibatasi ke jumlah aman <b>${rp(cap)}</b>. Sisanya, ${rp(lad.gap - cap)}, dari tangga dana atau ditunda.` : '',
    debt: `Meminjam untuk membayar utang lain biasanya hanya menunda masalah. Coba dulu minta keringanan di PULIH; kalau tetap perlu, pinjaman dibatasi ke jumlah aman${cap > 0 ? ` ${rp(cap)}` : ''}.`,
  }[g.mode];
  return msg ? `<div class="note ${g.mode === 'capped' ? 'amber' : g.mode === 'normal' ? '' : 'danger'} small" style="margin-bottom:12px">${msg}</div>` : '';
}
function pilahStep2(p, st, ctx) {
  const { lad, h } = pilahCalc(p, st);
  const pre = ctx.test ? 't.' : 'pilah.';
  const kop = DATA.products.find(x => x.id === 'koperasi'), bank = DATA.products.find(x => x.id === 'bank');
  const deadlineLabel = { 24: '1 hari', 72: '3 hari', 168: '1 minggu', 720: '1 bulan' };
  return `<div class="grid g-side">
   <div class="card">
    <h3>${term('Tangga dana')}: tutup yang bisa, sebelum berutang</h3>
    <div class="grid g3" style="margin-top:12px">
     <label class="f">Kebutuhan${rpInput('n-amount', st.need, `data-k="${pre}need" data-t="rpn" placeholder="mis. 5.000.000" ${ctx.test ? 'disabled' : ''}`)}</label>
     <label class="f">Tenggat<select class="in" id="n-hours" data-k="${pre}hours" data-t="intn" ${ctx.test ? 'disabled' : ''}>${st.hours ? '' : '<option value="" selected>Pilih</option>'}${Object.entries(deadlineLabel).map(([v, l]) => `<option value="${v}" ${+v === st.hours ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
     ${ctx.test || !isSaya(p) ? `<label class="f">Jenis<select class="in" id="n-purpose" data-k="${pre}purpose" data-t="text" ${ctx.test ? 'disabled' : ''}>${st.purpose ? '' : '<option value="" selected>Pilih</option>'}<option value="konsumtif" ${st.purpose === 'konsumtif' ? 'selected' : ''}>Pribadi (konsumtif)</option><option value="produktif" ${st.purpose === 'produktif' ? 'selected' : ''}>Usaha (produktif)</option></select></label>` : ''}
     ${!ctx.test && isSaya(p) ? `<label class="f">Tenor yang kamu mau<select class="in" id="n-months" data-k="${pre}months" data-t="intn">${st.months ? '' : '<option value="" selected>Pilih</option>'}${[3, 6, 9, 12, 18, 24].map(m => `<option value="${m}" ${m === st.months ? 'selected' : ''}>${m} bulan</option>`).join('')}</select></label>` : ''}
    </div>
    <div style="margin-top:8px">
     <div class="rung ${lad.steps[0].use > 0 ? 'used' : 'cur'}"><span class="n">1</span><div><b>Dana darurat sendiri</b><div class="tiny muted">Saldo ${rp(p.emergencyFund || 0)} · tanpa biaya</div></div><div class="rin">${rpInput('r-sav', st.useSavings, `data-k="${pre}useSavings" data-t="rpn" placeholder="0" aria-label="Dana darurat yang dipakai"`)}</div></div>
     <div class="rung ${lad.steps[1].use > 0 ? 'used' : 'cur'}"><span class="n">2</span><div><b>Bantuan / patungan keluarga</b><div class="tiny muted">${p.need?.familyFrom ? 'Mis. ' + esc(p.need.familyFrom) + ' · ' : ''}tanpa bunga, sepakati waktu kembali</div></div><div class="rin">${rpInput('r-fam', st.family, `data-k="${pre}family" data-t="rpn" placeholder="0" aria-label="Bantuan keluarga"`)}</div></div>
     ${ctx.test || !isSaya(p) ? '' : extraRungs(st)}
     <div class="rung ${p.access?.koperasi ? '' : 'dim'}"><span class="n">${ctx.test || !isSaya(p) ? 3 : 7}</span><div><b>Koperasi karyawan</b><div class="tiny muted">${p.access?.koperasi ? `Bisa sampai ${rps(kop.max)}, 1% per bulan, cair ±2 hari` : 'Tidak tersedia untukmu'}</div></div><span class="pill ${p.access?.koperasi ? 'z-green' : 'z-grey'}">${p.access?.koperasi ? 'Tersedia' : 'Tidak ada'}</span></div>
     <div class="rung ${p.access?.bank && st.hours >= bank.hours ? '' : 'dim'}"><span class="n">${ctx.test || !isSaya(p) ? 4 : 8}</span><div><b>Bank atau KUR</b><div class="tiny muted">Umumnya lebih murah dari pinjol, persetujuan ±5 hari kerja</div></div><span class="pill ${!p.access?.bank ? 'z-grey' : !st.hours ? 'z-grey' : st.hours >= bank.hours ? 'z-green' : 'z-grey'}">${!p.access?.bank ? 'Tidak ada' : !st.hours ? 'Pilih tenggat' : st.hours >= bank.hours ? 'Masuk tenggat' : 'Terlalu lama'}</span></div>
     <div class="rung"><span class="n">${ctx.test || !isSaya(p) ? 5 : 9}</span><div><b>Pindar berizin OJK</b><div class="tiny muted">${isSaya(p) ? `${RL.length} pindar nyata di database FinWise · biaya maks 0,1–0,3% per hari` : 'Biaya 0,1–0,3% per hari'} · pilihan terakhir</div></div><span class="pill z-amber">Terakhir</span></div>
    </div>
   </div>
   <div class="card" aria-live="polite">
    ${!(st.need > 0) ? `<div class="lab">Kebutuhan dana</div><p class="muted" style="margin-top:8px">Isi jumlah kebutuhan, tenggat, dan jenis pinjaman di kiri. FinWise lalu menghitung berapa yang benar-benar perlu dipinjam.</p>` : `
    <div class="lab">${esc(st.needLabel || 'Kebutuhan dana')}</div>
    ${lad.covered > 0 ? `<div class="num" style="margin-top:6px;color:var(--muted);font-weight:700"><s style="text-decoration-color:var(--danger);text-decoration-thickness:2px">${rp(st.need)}</s></div>` : ''}<div class="big" style="margin:2px 0 6px;font-size:clamp(1.875rem,3.6vw,2.625rem)">${rp(lad.gap)}</div>
    <div class="small muted">${lad.gap > 0 ? 'yang benar-benar perlu dipinjam' : 'tertutup tanpa utang baru'}</div>
    <div class="prog" style="margin:14px 0 6px"><i style="width:${(lad.covered / Math.max(1, st.need) * 100).toFixed(1)}%"></i></div>
    <div class="row between small"><span style="color:var(--safe)" class="num">Tertutup ${rp(lad.covered)}</span><span style="color:var(--amber)" class="num">Sisa ${rp(lad.gap)}</span></div>
    ${lad.gap === 0 ? '<div class="note safe" style="margin-top:14px">Kamu tidak perlu pinjaman baru. Catat kesepakatan dengan keluarga dan susun ulang tabungan darurat di CEK.</div>' : (() => { const mo = st.months || 6, mx = FW.maxSafeLoan(p, mo); return mx >= lad.gap ? `<div class="note safe" style="margin-top:14px">${rp(lad.gap)} masih di bawah pinjaman maksimal yang aman untuk ${mo} bulan (${rp(mx)}). Berikutnya FinWise membandingkan pinjaman legal.</div>` : `<div class="note ${mx > 0 ? 'amber' : 'danger'}" style="margin-top:14px">${mx > 0 ? `Pinjaman maksimal yang aman untuk ${mo} bulan hanya <b>${rp(mx)}</b>. Sisanya, ${rp(lad.gap - mx)}, sebaiknya dari tangga dana, ditunda, atau dinegosiasikan dulu.` : 'Saat ini belum ada ruang untuk cicilan baru. Kalau tetap harus meminjam, FinWise akan menunjukkan pilihan yang paling sedikit merugikan.'}</div>`; })()}
    `}
    <div style="margin-top:14px">${ctx.test ? `<button class="btn" data-act="t-step" data-v="3" data-mark="ladder" ${lad.covered === 0 ? 'disabled' : ''}>Lanjut: bandingkan opsi</button>${lad.covered === 0 ? '<p class="tiny muted" style="margin-top:6px">Isi dulu sumber dana tanpa utang (langkah 1 dan 2).</p>' : ''}` : `${gateNote(p, st, lad)}<button class="btn" data-act="pilah-step" data-v="3" ${lad.gap === 0 || !pilahReady(p, st) ? 'disabled' : ''}>${{ nodebt: 'Lihat rencana tanpa utang', emergency: 'Lanjut: pilihan darurat' }[pilahGate(p, st).mode] || 'Lanjut: bandingkan opsi'}</button>${!pilahReady(p, st) ? `<p class="tiny muted" style="margin-top:6px">Lengkapi dulu: ${[!(st.need > 0) && 'jumlah kebutuhan', !st.hours && 'tenggat', !st.purpose && 'jenis', isSaya(p) && !st.months && 'tenor'].filter(Boolean).join(', ')}.</p>` : ''}`}</div>
   </div>
  </div>`;
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
      a.rating ? `Rating sampel ulasan ${nf(a.rating, 1)} dengan ${pct(a.positive || 0, 0)} ulasan positif.` : a.generic ? 'Lembaga resmi (koperasi/bank) dengan biaya umumnya lebih rendah dari pindar.' : ''],
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
// the largest loan that some available legal lender would price inside the safe instalment (instalment is linear in principal)
function safeCapFor(p, st) {
  const h = FW.headroom(p); if (h.ceiling <= 0) return 0;
  const mo = st.months || 6, purpose = st.purpose || 'konsumtif'; let best = 0;
  const prods = isSaya(p) ? realProducts(st, FW.maxSafeLoan(p, mo)) : DATA.products;
  for (const pr of prods) {
    if (pr.illegal || pr.unavailable || (pr.requires && !p.access?.[pr.requires]) || (pr.purpose && pr.purpose !== purpose)) continue;
    const t = FW.loan({ principal: 1e6, rate: pr.rate, unit: pr.unit, months: pr.months, feePct: pr.feePct || 0, maxTotal: pr.maxTotalPct != null ? 1e6 * pr.maxTotalPct : undefined });
    const k = t.inst / 1e6; if (!k) continue;
    const P = Math.min(Math.floor((h.ceiling - 1) / k / 10000) * 10000, pr.max || Infinity);
    if (P >= (pr.min || 0) && P > best) best = P;
  }
  return best;
}
const MODES = [['seimbang', 'Seimbang'], ['termurah', 'Termurah'], ['ringan', 'Cicilan teringan'], ['reputasi', 'Reputasi terbaik']];
const SORT_TXT = { seimbang: 'gabungan biaya, kecocokan dengan batas amanmu, reputasi, dan keamanan data', termurah: 'total biaya (bunga + admin), dari yang paling murah', ringan: 'cicilan per bulan, dari yang paling ringan', reputasi: 'rating ulasan peminjam, dari yang tertinggi' };
function pilahNoDebt(p, st) {
  const { lad } = pilahCalc(p, st), g = pilahGate(p, st), f = facts(p);
  const plan = applyPlan(autoCaps(p), planActions(autoCaps(p))), surAfter = Math.max(0, FW.surplus(plan)), per = Math.max(f.sur, surAfter);
  const mo = per > 0 ? Math.ceil(lad.gap / per) : null;
  return `<div class="card nodebt"><div class="eyebrow e-cek" style="font-weight:800;font-size:.8125rem">RENCANA TANPA UTANG</div>
    <h3 style="margin-top:4px">${esc(st.needLabel || purposeName(st.cat))}: ${rp(lad.gap)} yang belum tertutup</h3>
    <ol class="nd-steps">
     <li><b>Tutup dari tangga dana dulu.</b> Kurangi atau tunda sebagian, minta keringanan ke pihak yang menagih, cari dana bantuan, atau tambah uang cepat. <button class="linkbtn" data-act="pilah-step" data-v="2">Isi tangga dana</button></li>
     <li><b>${mo ? `Tunda dan menabung: dengan menyisihkan ${rp(per)} per bulan, ${rp(lad.gap)} terkumpul dalam ±${mo} bulan` : 'Naikkan dulu sisa uangmu'}</b>${mo ? `${per > f.sur ? ' (setelah rencana hemat di CEK)' : ''}, tanpa bunga sama sekali.` : '. Saat ini belum ada sisa untuk ditabung; mulai dari rencana di CEK.'} <a class="small" href="#cek" data-act="goto-plan">Buka rencana di CEK</a></li>
     ${g.why === 'utang' ? '<li><b>Minta keringanan ke pemberi pinjaman lama.</b> Hubungi sebelum jatuh tempo dan minta restrukturisasi. <a class="small" href="#pulih">Langkahnya di PULIH</a></li>' : ''}
     ${g.R.level <= 1 ? `<li><b>Naikkan kesiapan berutangmu.</b> ${esc(g.R.reasons[0])} <a class="small" href="#cek">Lihat jalan naik level</a></li>` : ''}
    </ol>
    ${ESSENTIAL.includes(st.cat) && st.urg === 'tunda' ? '<p class="small muted" style="margin-top:10px">Ternyata harus dibayar segera? <button class="linkbtn" data-act="pilah-step" data-v="0">Ubah urgensinya</button> dan FinWise akan menunjukkan pilihan darurat.</p>' : ''}
    <p class="small muted" style="margin-top:6px">Mau tetap melihat angkanya? <a href="#kalkulator">Hitung di Kalkulator</a>.</p></div>`;
}
function pilahStep3(p, st, ctx) {
  const gate = ctx.test ? { mode: 'normal' } : pilahGate(p, st);
  if (gate.mode === 'nodebt') return pilahNoDebt(p, st);
  if (gate.mode === 'emergency' && !st.ack) { const { amt, m } = pilahCalc(p, st), w = m.ok[0];
    return `<div class="card ack" style="border-color:var(--danger)"><div class="eyebrow" style="color:var(--danger);font-weight:800;font-size:.8125rem">MODE DARURAT</div><h3 style="margin-top:4px">Sebelum melihat pilihan pinjaman</h3>
     <p class="small" style="margin-top:6px">Kesiapan berutangmu <b>${READY[gate.R.level].name}</b>. ${esc(gate.R.reasons[0])} ${w ? `Pinjaman ${rp(amt)} akan membuat sisa uangmu sekitar <b>${rp(w.left, { plus: true })}</b> per bulan.` : ''}</p>
     <label class="row" style="gap:10px;margin-top:12px;align-items:flex-start"><input type="checkbox" data-act-change="pilah-ackbox" ${st.ackBox ? 'checked' : ''} style="margin-top:4px"><span class="small">Saya sudah mencoba tangga dana, kebutuhan ini tidak bisa ditunda, dan saya paham pinjaman ini membuat keuanganku lebih berat setiap bulan sampai lunas.</span></label>
     <div class="row" style="margin-top:12px"><button class="btn" data-act="pilah-ack" ${st.ackBox ? '' : 'disabled'}>Tampilkan pilihan yang paling sedikit merugikan</button><button class="btn ghost" data-act="pilah-step" data-v="2">Kembali ke tangga dana</button></div></div>`; }
  const { lad, m, h, amt } = pilahCalc(p, st);
  const pre = ctx.test ? 't' : 'pilah';
  const other = m.rows.filter(r => r.status === 'filtered' || r.status === 'na'), blocked = m.rows.filter(r => r.status === 'blocked');
  const anySafe = m.ok.some(x => x.zone !== 'danger'), mo = st.months || m.ok[0]?.months || 6, mx = FW.maxSafeLoan(p, mo), cap = ctx.test ? 0 : safeCapFor(p, st);
  const card = r => {
    const best = r.rank === 1 && r.zone !== 'danger';
    const perMonth = amt ? r.total / amt / Math.max(1, r.months) : 0;
    const why = r.zone === 'danger' ? (r.left < 0 ? `sisa uangmu jadi minus ${rp(-r.left)} per bulan` : `porsi cicilanmu jadi ${pct(r.dsr, 0)}, di atas batas bahaya 40%`) : r.zone === 'stretch' ? `cicilannya melebihi batas amanmu ${rp(h.ceiling)}` : '';
    return `<div class="opt ${best ? 'best' : ''} ${st.picked === r.id ? 'picked' : ''}">
     <div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div class="row" style="gap:10px;align-items:flex-start;flex-wrap:nowrap;min-width:0"><span class="rank">${r.rank}</span><div><b style="font-size:1rem">${esc(r.name)}</b>${r.real ? ' <span class="tag">data nyata</span>' : r.generic && isSaya(p) ? ' <span class="tag">perkiraan umum</span>' : ''}</div></div>${zpill(r.zone)}</div>
     <div class="op-part"><div class="op-h">Tentang pemberi pinjaman</div><p class="tiny muted">${esc(r.legal)} · biaya ±${nf(perMonth * 100, 1)}% per bulan${r.real ? ' (tarif maks RIPLAY)' : ''} · cair ${r.hours == null ? 'tidak dipublikasikan' : '±' + FW.hoursLabel(r.hours)}${r.rating ? ` · ★ ${nf(r.rating, 1)}` : ''}${r.note ? ' · ' + esc(r.note) : ''}</p></div>
     <div class="op-part"><div class="op-h">Pinjaman ini</div><div class="facts f2"><div>${lab('Cicilan', 'per bulan')}<div class="v">${rp(r.inst)} <span class="tiny muted">×${r.months}</span></div></div><div>${lab('Total dikembalikan', `biaya ${rps(r.total)}${r.fee > 0 ? `, termasuk admin ${rps(r.fee)}` : ''}`, 'Total dikembalikan')}<div class="v">${rp(r.repay)}</div></div></div></div>
     <div class="op-part"><div class="op-h">Dampaknya ke keuanganmu</div><div class="facts f2"><div>${lab('Porsi cicilan', 'semua cicilan ÷ gajimu', 'Porsi cicilan')}<div class="v">${pct(h.dsrNow, 0)} → ${pct(r.dsr, 0)}</div></div><div>${lab('Sisa uang', 'per bulan setelah semua', 'Sisa uang')}<div class="v" style="color:${r.left < 0 ? 'var(--danger)' : 'inherit'}">${rps(h.sur)} → ${rp(r.left, { plus: true })}</div></div></div></div>
     ${why ? `<div class="note ${r.zone === 'danger' ? 'danger' : 'amber'} small">${r.zone === 'danger' ? (anySafe ? 'Ditaruh di bawah karena ' : 'Bahaya karena ') : 'Mepet karena '}${why}.</div>` : ''}
     <div class="row between"><span class="tiny muted">${term('Bunga efektif', 'Bunga sebenarnya')} ±${pct(r.ear, 0)}/tahun${r.real ? ` · <a href="#openspace" data-act="lender" data-id="${r.real}">profil & ulasan</a>` : ''}</span><button class="btn sm ${r.zone === 'danger' ? 'ghost' : ''}" data-act="${ctx.test ? 't-pick' : 'pick'}" data-id="${r.id}" aria-pressed="${st.picked === r.id}" aria-label="Pilih ${esc(r.name)}">${st.picked === r.id ? 'Dipilih' : 'Pilih opsi ini'}</button></div>
    </div>`;
  };
  const realNote = isSaya(p) && !ctx.test ? `<div class="note small" style="margin-bottom:12px"><b>Data nyata:</b> ${RL.length} pindar berizin dari database FinWise, dihitung dengan <b>tarif maksimum</b> di dokumen RIPLAY (per ${dateID('2026-04-30')}) dan dibatasi plafon biaya OJK untuk tenor ${st.months} bulan. Biaya sebenarnya bisa lebih rendah tergantung penilaian kreditmu. Kecepatan cair pindar tidak dipublikasikan, jadi tenggat hanya menyaring koperasi dan bank.</div>` : '';
  const capNote = !ctx.test && amt < lad.gap ? `<div class="note safe" style="margin-bottom:12px">Kamu memakai jumlah aman: <b>${rp(amt)}</b> dari pinjaman, sisanya <b>${rp(lad.gap - amt)}</b> dari tangga dana, keringanan, atau ditunda. <button class="linkbtn" data-act="pilah-cap" data-v="0">Kembalikan ke ${rp(lad.gap)}</button></div>` : '';
  const dangerNote = m.allDanger ? `<div class="note danger" role="status" style="margin-bottom:12px"><b>Tidak ada pinjaman yang aman untuk ${rp(amt)}.</b> ${mx <= 0 ? 'Saat ini belum ada ruang untuk cicilan baru.' : cap > 0 && cap < amt ? `Jumlah yang masih aman dari pemberi pinjaman legal yang tersedia: <b>${rp(cap)}</b> untuk ${mo} bulan.` : cap <= 0 ? `Jumlah yang aman untukmu (±${rps(mx)}) lebih kecil dari pinjaman minimal pemberi pinjaman legal, jadi lebih baik ditutup dari tangga dana, keringanan, atau ditunda.` : ''} Di bawah ini pilihan yang paling sedikit merugikan, diurutkan dari minus per bulan yang paling kecil.
    ${ctx.test ? '' : `<div class="row" style="margin-top:8px">${cap > 0 && cap < amt ? `<button class="btn sm" data-act="pilah-cap" data-v="${cap}">Pakai jumlah aman (${rps(cap)})</button>` : ''}<button class="btn sm ghost" data-act="pilah-step" data-v="2">Kembali ke tangga dana</button><a class="btn sm ghost" href="#cek">Rencana tanpa utang</a></div>`}</div>` : '';
  const sortTxt = m.allDanger && st.mode === 'seimbang' ? 'minus per bulan yang paling kecil (pilihan paling sedikit merugikan)' : SORT_TXT[st.mode];
  return `${realNote}${capNote}${dangerNote}<div class="row between" style="margin-bottom:12px"><div><h3>Pinjaman legal untuk ${rp(amt)}</h3><p class="small muted">Batas cicilan amanmu ${rp(h.ceiling)}/bulan · tenggat ${FW.hoursLabel(st.hours)}. Diurutkan menurut ${sortTxt}. Urutan tidak bisa dibeli pemberi pinjaman.</p></div>
    <div><div class="lab" style="margin-bottom:4px">Urutkan menurut yang paling penting bagimu</div><div class="seg" role="group" aria-label="Prioritas urutan">${MODES.map(([k, l]) => `<button class="${st.mode === k ? 'on' : ''}" aria-pressed="${st.mode === k}" data-act="mode" data-scope="${pre}" data-v="${k}">${l}</button>`).join('')}</div></div></div>
   ${m.ok.length ? `<div class="grid g3 top3">${m.ok.slice(0, 3).map(card).join('')}</div>
    ${m.ok.length > 3 ? `<div style="margin-top:10px"><button class="btn ghost sm" data-act="toggle" data-k="${pre}.showAll" aria-expanded="${!!st.showAll}">${st.showAll ? 'Sembunyikan opsi lainnya' : `Lihat ${m.ok.length - 3} opsi lainnya`}</button></div>${st.showAll ? `<div class="grid g3" style="margin-top:12px">${m.ok.slice(3).map(card).join('')}</div>` : ''}` : ''}
    ${whyFirst(p, st, m, lad, h, ctx, amt)}` : '<div class="note danger">Tidak ada pinjaman legal yang memenuhi jumlah, jenis, dan tenggatmu. Coba ubah tenggat atau jumlah di tangga dana.</div>'}
   <div class="grid g2" style="margin-top:16px">
    <div class="card flat"><div class="row between"><h3>Tidak memenuhi syarat (${other.length})</h3><button class="btn ghost sm" data-act="toggle" data-k="${pre}.showOut">${st.showOut ? 'Tutup' : 'Lihat'}</button></div>
     ${st.showOut ? `<div class="stack small" style="margin-top:10px;gap:6px">${other.map(r => `<div class="row between"><span><b>${esc(r.name)}</b></span><span class="muted">${esc(r.reason)}</span></div>`).join('')}</div>` : `<p class="small muted" style="margin-top:6px">Termasuk ${other.slice(0, 3).map(r => esc(r.name)).join(', ')}${other.length > 3 ? ', dan lainnya' : ''}.</p>`}</div>
    <div class="card flat" style="border-color:var(--danger)"><h3 style="color:var(--danger)">Diblokir</h3>
     <div class="stack small" style="margin-top:8px;gap:6px">${blocked.map(r => `<div class="row between"><b>${esc(r.name)}</b><span class="pill z-danger">${esc(r.reason)}</span></div>`).join('')}</div>
     <p class="tiny muted" style="margin-top:8px">Pinjaman tidak berizin tidak pernah ditampilkan sebagai pilihan.</p></div>
   </div>
   <div class="card flat" style="margin-top:16px"><div class="row between"><h3>Kenapa urutannya begini?</h3><button class="btn ghost sm" data-act="toggle" data-k="${pre}.why">${st.why ? 'Tutup' : 'Lihat cara mengurutkan'}</button></div>
    ${st.why ? (st.mode !== 'seimbang' || m.allDanger ? `<p class="small" style="margin-top:10px">Mode ini mengurutkan murni menurut ${sortTxt}. Opsi Bahaya tetap ditaruh setelah opsi yang lebih aman, kalau ada.</p>` : `<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Opsi</th>${Object.keys(m.weights).map(k => `<th>${{ cost: 'Biaya', health: 'Cocok dgn batas', rep: 'Reputasi', privacy: 'Privasi', speed: 'Kecepatan' }[k]} (${Math.round(m.weights[k] * 100)}%)</th>`).join('')}<th>Skor</th></tr></thead><tbody>${m.ok.map(r => `<tr><td><b>${esc(r.name)}</b></td>${Object.keys(m.weights).map(k => `<td class="num">${Math.round(r.factors[k] * 100)}</td>`).join('')}<td class="num"><b>${Math.round(r.score * 100)}</b>${r.zone === 'danger' && anySafe ? ' <span class="tiny muted">(ditaruh di bawah)</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
     <ul class="small" style="margin:10px 0 0;padding-left:18px"><li>Seimbang menggabungkan biaya, kecocokan dengan batas amanmu, reputasi, privasi, dan kecepatan.</li><li>Opsi zona Bahaya selalu di urutan bawah dan perlu konfirmasi.</li><li>Koperasi dan bank belum punya data ulasan publik, jadi reputasinya dinilai netral (70).</li>${isSaya(p) && !ctx.test ? `<li>Reputasi pindar dari sampel ulasan Google Play (rata-rata bintang dan % ulasan positif). Privasi dari sertifikasi ISO 27001/27701.</li><li>Kecepatan cair tidak dipublikasikan, jadi dinilai netral (50).</li>` : ''}<li>Tidak ada pemberi pinjaman yang membayar untuk urutan ini.</li></ul>`) : ''}
    ${ctx.test || !S.cap.sample ? '' : `<div style="margin-top:10px">${aiBlock('pilah', 'Jelaskan pilihan ini dengan AI', `Data:\n${context()}\nKebutuhan ${rp(st.need)}, tertutup non-utang ${rp(lad.covered)}, dibandingkan pinjaman ${rp(amt)}.\nOpsi (urut): ${m.ok.map(r => `${r.rank}. ${r.name}: total dikembalikan ${rp(r.repay)}, cicilan ${rp(r.inst)} x ${r.months}, porsi cicilan ${pct(r.dsr)}, sisa/bln ${rp(r.left)}, zona ${ZONE[r.zone][0]}`).join('; ')}.\nTugas: jelaskan dengan bahasa sederhana urutan ini dan risiko tiap opsi. Jangan menyebut opsi berstatus Bahaya sebagai cocok.`)}</div>`}
   </div>`;
}
function vPilah() {
  const p = P(), st = S.pilah;
  if (!MODES.some(x => x[0] === st.mode)) st.mode = 'seimbang';
  const steps = [[0, 'Untuk apa'], [1, 'Batas aman'], [2, 'Tangga dana'], [3, 'Pilih pinjaman']];
  if (st.step == null) st.step = 0;
  return banner({ tone: 'amber', eyebrow: 'PILAH · SAAT BUTUH DANA', title: 'Pinjam secukupnya, dari yang tepat', sub: 'Empat langkah: untuk apa dananya, batas cicilan amanmu, tutup kebutuhan tanpa utang dulu, baru bandingkan pinjaman legal berdasarkan total biaya.', right: userChip() }) + `
   <div class="row between"><div class="steps" role="group" aria-label="Langkah PILAH">${steps.map(([n, l]) => `<button class="${st.step === n ? 'on' : st.step > n ? 'done' : ''}" data-act="pilah-step" data-v="${n}" ${st.step === n ? 'aria-current="step"' : ''}><i aria-hidden="true">${st.step > n ? '✓' : n + 1}</i>${l}${st.step > n ? '<span class="sr"> (selesai)</span>' : ''}</button>`).join('')}</div><a class="small" href="#openspace">Cek legalitas pinjol</a></div>
   ${readyStrip(p)}
   ${st.step === 0 ? pilahStep0(p, st) : st.step === 3 && !pilahReady(p, st) ? '<div class="note amber" role="status" style="margin-bottom:12px">Lengkapi dulu tujuan dan kebutuhan dana sebelum membandingkan pinjaman.</div>' + pilahStep2(p, st, {}) : st.step === 1 ? pilahStep1(p, st, {}) : st.step === 2 ? pilahStep2(p, st, {}) : pilahStep3(p, st, {})}
   ${st.picked ? pickedBanner(p, st) : ''}`;
}
function pickedBanner(p, st) {
  const { m, amt } = pilahCalc(p, st); const r = m.ok.find(x => x.id === st.picked); if (!r) return '';
  return `<div class="card" style="margin-top:16px;border-color:var(--amber-strong)"><div class="row between"><div><div class="lab">Pilihanmu</div><b style="font-size:1.0625rem">${esc(r.name)}</b> ${zpill(r.zone)} <span class="small muted num">· ${rp(r.inst)} × ${r.months} bulan, total dikembalikan ${rp(r.repay)}</span></div>
   <button class="btn amber" data-act="to-pulih">Teruskan ke PULIH</button></div><p class="small muted" style="margin-top:6px">Cicilan ini akan ditambahkan ke jadwal bayar di PULIH dengan jatuh tempo setelah tanggal gajian.</p></div>`;
}
