/* ================= PULIH ================= */
// monthly reminder 2 days before each due date, repeating for the remaining months
function gcalLink(l, payday) {
  const now = new Date(), due = Math.min(28, Math.max(1, l.dueDay || 1));
  let d = new Date(now.getFullYear(), now.getMonth(), due); if (d < now) d = new Date(now.getFullYear(), now.getMonth() + 1, due);
  const r = new Date(d); r.setDate(r.getDate() - 2);
  const f = x => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`, nx = new Date(r); nx.setDate(nx.getDate() + 1);
  const text = `Bayar ${l.name} ${rp(l.instalment)}`, details = `Jatuh tempo tanggal ${l.dueDay}. Siapkan ${rp(l.instalment)} di rekening. Dibuat dari FinWise.`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(text)}&dates=${f(r)}/${f(nx)}&details=${encodeURIComponent(details)}&recur=${encodeURIComponent('RRULE:FREQ=MONTHLY;COUNT=' + Math.max(1, l.months || 1))}`;
}
function pulihProfile(base, st) {
  const p = clone(base);
  if (st.restructure) p.loans.forEach(l => { if (l.restructure) { l.instalment = l.restructure.instalment; l.months = l.restructure.months; l.restructured = true; } });
  if (st.split) p.spending.forEach(c => { if (c.cap === 0) c.amount = 0; });
  return p;
}
function letterText(p, l) {
  if (!l) return '';
  const r = l.restructure;
  return `Kepada Yth. Tim Layanan Nasabah\n\nPerihal: Permohonan restrukturisasi pinjaman\n\nSaya, ${displayName(p)}, peminjam pada fasilitas "${l.name}" dengan sisa pokok sekitar ${rp(l.outstanding)} dan cicilan ${rp(l.instalment)} per bulan (jatuh tempo setiap tanggal ${l.dueDay}).\n\n${p.incomes[0]?.range || p.stage === 'wirausaha' ? `Pendapatan usaha saya sedang tidak stabil (omzet bulanan berkisar ${p.incomes[0]?.range?.replace('Omzet ', '') || 'naik-turun'})` : 'Kondisi keuangan saya sedang tertekan'}, sehingga total cicilan saya saat ini mencapai ${pct(FW.headroom(p).dsrNow, 0)} dari pendapatan bersih. Agar tetap dapat membayar tepat waktu, saya mengajukan:\n\n1. Perpanjangan tenor menjadi ${r ? r.months : l.months + 6} bulan,\n2. Penyesuaian cicilan menjadi sekitar ${rp(r ? r.instalment : l.instalment * 0.6)} per bulan,\n3. Tanpa denda selama proses restrukturisasi.\n\nSaya melampirkan ringkasan arus kas 3 bulan terakhir dan rencana pembayaran. Saya berkomitmen membayar tepat waktu dan terbuka untuk berdiskusi.\n\nHormat saya,\n${displayName(p)}`;
}
// short, editable message to the lender for a month the user cannot pay in full (not a formal letter)
function payMsg(p, l) {
  if (!l) return '';
  const sur = FW.surplus(p), r = l.restructure;
  const can = r ? r.instalment : Math.max(50000, Math.floor((sur < 0 ? l.instalment + sur : l.instalment * 0.6) / 10000) * 10000);
  const months = r ? r.months : Math.max(l.months + 1, Math.ceil(l.instalment * l.months / Math.max(can, 1)));
  const who = p.nick ? `saya ${p.nick}` : 'saya [nama kamu]';
  return `Halo, ${who}, peminjam ${l.name} dengan cicilan ${rp(l.instalment)} yang jatuh tempo setiap tanggal ${l.dueDay}.\n\nBulan ini pendapatan saya tidak cukup untuk membayar penuh. Saya tidak ingin menunggak, jadi saya ingin mengajukan keringanan:\n1. cicilan sekitar ${rp(can)} per bulan dengan tenor diperpanjang menjadi ${months} bulan, atau\n2. penundaan pembayaran 1 bulan tanpa denda.\n\nMohon info syarat dan dokumen yang perlu saya kirim. Terima kasih.`;
}
// which bill to protect first when the money is short: collateral, then what goes on SLIK (dearest first), then informal debts
const SLIK_TYPES = ['kpr', 'bank', 'kartu kredit', 'multifinance', 'pindar', 'paylater'];
function protectOrder(loans) {
  const rank = l => l.type === 'kpr' || l.type === 'multifinance' ? 0 : SLIK_TYPES.includes(l.type) ? 1 : 2;
  return [...loans].sort((a, b) => rank(a) - rank(b) || (b.rateMonthly || 0) - (a.rateMonthly || 0)).map(l => ({ l,
    why: rank(l) === 0 ? (l.type === 'kpr' ? 'ada jaminan rumah; tunggakan panjang bisa berujung lelang' : 'kendaraan bisa ditarik kalau menunggak') + ', dan tercatat di SLIK'
      : rank(l) === 1 ? `tercatat di SLIK; telat 1–90 hari sudah masuk Kol 2${l.rateMonthly ? `, biaya ±${nf(l.rateMonthly * 100, 1)}%/bulan${l.rateGuess ? ' (perkiraan)' : ''}` : ''}`
      : 'umumnya tidak tercatat di SLIK; bicarakan jujur dan sepakati tanggal baru' }));
}
// a one-off calendar event to re-check FinWise next month, on the first payday
function recheckLink(payday) {
  const now = new Date(), d = new Date(now.getFullYear(), now.getMonth() + 1, Math.min(28, Math.max(1, payday || 1))), nx = new Date(d); nx.setDate(nx.getDate() + 1);
  const f = x => `${x.getFullYear()}${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent('Cek ulang keuangan di FinWise')}&dates=${f(d)}/${f(nx)}&details=${encodeURIComponent('Perbarui Data saya (pemasukan, pengeluaran, cicilan) dan lihat apakah kesiapan berutangmu naik. ' + location.href.split('#')[0])}`;
}
function vPulih() {
  const base = P(), st = S.pulih, p = pulihProfile(base, st);
  const h = FW.headroom(p), out = FW.sum(p.loans, l => l.outstanding);
  const loansSorted = [...p.loans].sort((a, b) => a.dueDay - b.dueDay);
  const av = FW.route(p.loans, st.extra || 0, 'avalanche'), sn = FW.route(p.loans, st.extra || 0, 'snowball');
  // with known rates the cheaper route wins; without them, the one that clears every debt sooner
  const better = av.interestKnown ? (av.interest <= sn.interest ? 'avalanche' : 'snowball') : (av.months <= sn.months ? 'avalanche' : 'snowball');
  const one = p.loans.length === 1, solo = one ? FW.route(p.loans, st.extra || 0, 'avalanche') : null;
  const T = st.temp, tReady = T.amount > 0 && T.months > 0 && T.rate != null, LT = FW.loan({ principal: T.amount, rate: T.rate, unit: T.unit, months: T.months });
  const baseSur = FW.surplus(base), withNew = baseSur - LT.inst;
  const coverMonths = withNew < 0 ? Math.max(1, Math.floor(T.amount / -withNew)) : null;
  const steps = (() => {
    const s0 = FW.surplus(base); const a = clone(base);
    a.loans.forEach(l => { if (l.restructure) { l.instalment = l.restructure.instalment; } }); const s1 = FW.surplus(a);
    a.spending.forEach(c => { if (c.cap === 0) c.amount = 0; }); const s2 = FW.surplus(a);
    const pay = a.loans.find(l => l.type === 'paylater'); const s3 = pay ? s2 + pay.instalment : null;
    return { s0, s1, s2, s3, inst0: FW.instalments(base), inst1: FW.instalments(a), inst3: pay ? FW.instalments(a) - pay.instalment : null, hasR: base.loans.some(l => l.restructure), hasS: base.spending.some(c => c.cap === 0) };
  })();
  const kol = { lancar: ['Kol 1 · Lancar', 'z-safe'], kosong: ['Belum ada riwayat', 'z-grey'], tidaktahu: ['Belum dicek', 'z-grey'], dpk: ['Kol 2 · Dalam perhatian khusus', 'z-stretch'], macet: ['Kol 5 · Macet', 'z-danger'] }[base.slik] || ['Belum dicek', 'z-grey'];
  const letterLoan = p.loans.find(l => l.id === st.letterLoan) || p.loans[0];
  const firstPay = Math.min(...p.incomes.map(i => i.payday || 1));
  const msgLoan = base.loans.find(l => l.id === st.letterLoan) || base.loans[0];
  if (msgLoan && st.msgFor !== msgLoan.id) { st.msg = null; st.msgFor = msgLoan.id; }
  const msg = st.msg != null ? st.msg : payMsg(base, msgLoan);
  return banner({ tone: 'pulih', eyebrow: 'PULIH · SETELAH BERUTANG', title: 'Bayar tepat waktu, keluar dari utang', sub: 'Semua cicilan di satu tempat, uang yang perlu disisihkan, dan urutan pelunasan yang paling hemat.', right: userChip() })
  + secNav([['p1', 'Ringkasan utang'], ['p2', 'Jadwal bayar'], ['p3', 'Tidak sanggup bayar?'], ['p4', 'Urutan pelunasan'], ['p5', 'Pinjam lagi?'], ['p6', 'Riwayat kredit']]) + `
  <section class="sec">${secHead(1, 'p1', 'Ringkasan utangmu', 'Semua cicilan aktif dalam satu angka.')}
   <div class="panel"><div class="grid g4">
    <div class="kpi"><div class="k">Total sisa pembayaran</div><div class="v">${rp(out)}</div><div class="s">${p.loans.length} pinjaman</div></div>
    <div class="kpi"><div class="k">Cicilan per bulan</div><div class="v">${rp(h.ex)}</div><div class="s">${st.restructure ? 'setelah restrukturisasi' : 'saat ini'}</div></div>
    <div class="kpi"><div class="k">${term('Porsi cicilan')}</div><div class="v" style="color:${h.dsrNow > 0.4 ? 'var(--danger)' : h.dsrNow > 0.3 ? 'var(--stretch)' : 'var(--safe)'}">${pct(h.dsrNow)}</div><div class="s">batas sehat 30%</div></div>
    <div class="kpi"><div class="k">${term('Sisa uang')}</div><div class="v" style="color:${h.sur < 0 ? 'var(--danger)' : 'var(--safe)'}">${rp(h.sur, { plus: true })}</div><div class="s">setelah semua cicilan</div></div>
   </div>
   ${p.loans.length ? `<p class="small" style="margin-top:12px">Mana pinjaman yang bijak dan mana yang sebaiknya dilunasi dulu? Penilaiannya ada di <a href="#cek" data-act="goto-sec-cek" data-id="s3">CEK → Kondisi utang</a>.</p>` : ''}
   </div></section>
  <section class="sec">${secHead(2, 'p2', 'Jadwal bayar & uang yang disisihkan', 'Kapan tiap cicilan jatuh tempo, dan berapa yang harus dikunci saat gajian.')}
     <div class="panel">
      ${monthStrip([...p.incomes.map(i => ({ day: i.payday || 1, label: 'Uang masuk', color: 'var(--safe)' })), ...loansSorted.map(l => ({ day: l.dueDay, label: rps(l.instalment), color: 'var(--amber)' }))])}
      <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Cicilan</th><th>Jatuh tempo</th><th>Bunga/bln</th><th>Sisa</th><th>Jumlah</th></tr></thead><tbody>
       ${loansSorted.map(l => `<tr><td><b>${esc(l.name)}</b>${l.restructured ? ' <span class="pill z-green">Direstrukturisasi</span>' : ''}<div><a class="tiny" href="${gcalLink(l, firstPay)}" target="_blank" rel="noopener noreferrer">+ Pengingat di Google Calendar<span class="sr"> untuk ${esc(l.name)} (tab baru)</span></a></div></td><td>tgl ${l.dueDay}</td><td class="num">${((l.rateMonthly || 0) * 100).toLocaleString('id-ID')}%${l.rateGuess ? '<div class="tiny muted">perkiraan</div>' : ''}</td><td class="num">${rps(l.outstanding)} · ${l.months} bln</td><td class="num"><b>${rp(l.instalment)}</b></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Tidak ada cicilan aktif.</td></tr>'}
      </tbody></table></div>
      ${p.loans.length ? `<div class="note amber" style="margin-top:12px">Saat uang masuk tanggal <b>${firstPay}</b>, langsung kunci <b>${rp(h.ex)}</b> di kantong terpisah untuk ${p.loans.length} cicilan bulan ini. Sisanya, ${rp(h.inc - h.ex)}, baru dipakai untuk kebutuhan.</div>` : ''}
     </div></section>
  <section class="sec">${secHead(3, 'p3', 'Tidak sanggup bayar bulan ini?', 'Jangan menghilang. Langkah ini dilakukan sebelum tanggal jatuh tempo.')}
     <div class="panel">${!base.loans.length ? '<p class="small muted">Kamu tidak punya cicilan aktif. Kalau nanti punya dan sedang sulit membayar, langkahnya ada di sini.</p>' : `
      ${h.sur < 0 ? `<div class="note danger small" style="margin-bottom:12px">Sisa uangmu minus ${rp(-h.sur)} per bulan, jadi bagian ini kemungkinan kamu perlukan.</div>` : ''}
      <ol class="nd-steps">
       <li><b>Hubungi pemberi pinjaman sebelum jatuh tempo.</b> Pakai kanal resmi di aplikasi atau situsnya, bukan nomor dari orang yang menghubungimu. Pemberi pinjaman lebih mudah memberi keringanan sebelum kamu telat.</li>
       <li><b>Minta keringanan (${term('Restrukturisasi', 'restrukturisasi')}).</b> Ubah pesan di bawah sesuai keadaanmu, lalu kirim lewat chat atau email layanan pelanggan.
        ${base.loans.length > 1 ? `<label class="f" style="margin-top:10px;max-width:360px">Untuk pinjaman<select class="in" id="msg-loan" data-k="pulih.letterLoan" data-t="text">${base.loans.map(l => `<option value="${esc(l.id)}" ${l.id === msgLoan.id ? 'selected' : ''}>${esc(l.name)} · ${rps(l.instalment)}/bln</option>`).join('')}</select></label>` : ''}
        <label class="f" style="margin-top:10px">Pesan untuk ${esc(msgLoan.name)}<textarea class="in pay-msg" id="pay-msg" rows="9" data-k="pulih.msg" data-t="text">${esc(msg)}</textarea></label>
        <div class="row" style="margin-top:8px"><button class="btn sm" data-act="copy" data-src="pay-msg">Salin pesan</button>${st.msg != null ? '<button class="btn ghost sm" data-act="pulih-msg-reset">Kembalikan pesan awal</button>' : ''}</div></li>
       ${base.loans.length > 1 ? `<li><b>Kalau uangnya tetap kurang, tentukan yang dibayar dulu.</b> Kebutuhan pokok (makan, tempat tinggal, transportasi kerja) tetap nomor satu. Lalu:
        <ol class="small protect">${protectOrder(base.loans).map(({ l, why }) => `<li><b>${esc(l.name)}</b> ${rps(l.instalment)}: ${esc(why)}</li>`).join('')}</ol>
        <p class="tiny muted">Bayar sebagian hanya setelah disepakati; tanpa kesepakatan, cicilan tetap dihitung telat.</p></li>` : ''}
       <li><b>Kenali hakmu saat ditagih.</b> Menurut POJK 22/2023 Pasal 62, penagihan hanya boleh hari Senin–Sabtu di luar hari libur nasional, pukul 08.00–20.00 waktu setempat. Penagih dilarang mengancam, memakai kekerasan, mempermalukan, atau menghubungi orang selain kamu, termasuk keluarga dan kontak di HP-mu.</li>
       <li><b>Laporkan kalau aturan itu dilanggar.</b> Kontak OJK 157: telepon 157, WhatsApp 081-157-157-157, atau email konsumen@ojk.go.id. Simpan tangkapan layar pesan dan catatan panggilan sebagai bukti.</li>
      </ol>
      <p class="small" style="margin-top:12px"><a href="${recheckLink(firstPay)}" target="_blank" rel="noopener noreferrer">+ Pengingat cek ulang bulan depan di Google Calendar<span class="sr"> (tab baru)</span></a></p>`}
     </div></section>
  <section class="sec">${secHead(4, 'p4', one ? 'Lunasi lebih cepat' : 'Urutan pelunasan', one ? 'Kalau ada uang lebih, berapa bulan lebih cepat utangmu lunas.' : 'Mana yang dilunasi dulu kalau ada uang lebih.')}
     ${!p.loans.length ? '<div class="panel"><p class="small muted">Kamu tidak punya cicilan aktif, jadi tidak ada yang perlu dilunasi. Pertahankan, dan sebelum berutang mulai dari CEK.</p></div>' : `<div class="panel"><div class="row between"><p class="small">Punya uang ekstra untuk melunasi lebih cepat? Isi jumlahnya.</p><label class="f" style="flex-direction:row;align-items:center;gap:8px">Dana ekstra/bln <span style="width:150px">${rpInput('x-extra', st.extra, 'data-k="pulih.extra" data-t="rpn" placeholder="0"')}</span></label></div>
      ${one ? `<div class="grid g2" style="margin-top:12px"><div class="kpi"><div class="k">Lunas dalam</div><div class="v">${solo.months} bulan</div><div class="s">${st.extra > 0 ? `${Math.max(0, p.loans[0].months - solo.months)} bulan lebih cepat dari jadwal (${p.loans[0].months} bulan)` : 'sesuai jadwal; isi dana ekstra untuk mempercepat'}</div></div>
        <div class="kpi"><div class="k">Bunga</div><div class="v">${solo.interestKnown ? rps(solo.interest) : 'sudah di cicilan'}</div><div class="s">${solo.interestKnown ? 'perkiraan sisa bunga' : 'tanya pemberi pinjaman apakah pelunasan lebih cepat mengurangi bunga'}</div></div></div>`
      : `<div class="grid g2" style="margin-top:12px">
       ${[['avalanche', 'Hemat bunga', 'Avalanche', 'Bayar dulu yang bunganya paling tinggi; total bunga paling kecil', av], ['snowball', 'Cepat lega', 'Snowball', 'Bayar dulu yang sisanya paling kecil; cepat terasa ada yang lunas', sn]].map(([k, t, tt, d, r]) => `<div class="opt ${better === k ? 'best' : ''}"><div class="row between"><b>${t} <span class="tiny muted">(${term(tt)})</span></b>${better === k ? `<span class="pill z-safe">${av.interestKnown ? 'Lebih hemat' : 'Lebih cepat'}</span>` : ''}</div><div class="tiny muted">${d}</div>
        <div class="small">Urutan: ${r.order.map(id => esc(p.loans.find(l => l.id === id)?.name || id)).join(' → ')}</div>
        <div class="facts" style="grid-template-columns:1fr 1fr"><div><div class="k">Semua lunas</div><div class="v">${r.months} bulan</div></div><div><div class="k">Perkiraan bunga</div><div class="v">${r.interestKnown ? rps(r.interest) : '—'}</div></div></div></div>`).join('')}
      </div>
      <p class="tiny muted" style="margin-top:8px">Cicilan yang sudah lunas otomatis dialihkan ke utang berikutnya. ${av.interestKnown ? `Selisih bunga kedua cara ${rp(Math.abs(av.interest - sn.interest))}.` : 'Bunga baru dihitung untuk utang yang bunganya kamu isi di Data saya; urutan "hemat bunga" memakai perkiraan bunga per jenis utang.'}</p>`}
     </div>`}</section>
  <section class="sec">${secHead(5, 'p5', 'Ditawari pinjaman untuk menutup cicilan?', 'Cek dulu dampaknya sebelum “gali lubang tutup lubang”.')}
     <div class="panel" style="border-left:5px solid var(--danger)">
      <div class="grid g2" style="margin-top:10px">
       <label class="f">Jumlah pinjaman baru${rpInput('t-amount', T.amount, 'data-k="pulih.temp.amount" data-t="rpn" placeholder="mis. 5.000.000"')}</label>
       <label class="f">Tenor (bulan)<input class="in num" id="t-months" type="number" min="1" max="24" value="${blankNum(T.months)}" placeholder="mis. 3" data-k="pulih.temp.months" data-t="intn"></label>
       <label class="f">Bunga (%)<input class="in num" id="t-rate" inputmode="decimal" value="${T.rate == null ? '' : (T.rate * 100).toLocaleString('id-ID', { maximumFractionDigits: 3 })}" placeholder="mis. 0,3" data-k="pulih.temp.rate" data-t="pctn"></label>
       <label class="f">Satuan<select class="in" id="t-unit" data-k="pulih.temp.unit" data-t="text"><option value="day" ${T.unit === 'day' ? 'selected' : ''}>% per hari</option><option value="month" ${T.unit === 'month' ? 'selected' : ''}>% per bulan (flat)</option></select></label>
      </div>
      ${!tReady ? '<p class="small muted" style="margin-top:12px">Sedang ditawari pinjaman baru untuk menutup cicilan? Isi jumlah, tenor, dan bunganya untuk melihat dampaknya ke sisa uangmu.</p>' : `<div class="grid g2" style="margin-top:12px">
       <div class="kpi"><div class="k">Cicilan baru</div><div class="v">${rp(LT.inst)}</div><div class="s">${(T.rate * 100).toLocaleString('id-ID')}% per ${T.unit === 'day' ? 'hari' : 'bulan'}</div></div>
       <div class="kpi"><div class="k">Biaya pinjaman (bunga + admin)</div><div class="v">${rp(LT.total)}</div></div>
      </div>
      ${withNew < 0 || baseSur < 0 ? `<div class="note danger" style="margin-top:12px">Dengan cicilan baru, sisa uangmu jadi <b>${rp(withNew, { plus: true })}</b> per bulan${coverMonths !== null ? `, sehingga dana ${rps(T.amount)} habis dalam ±${coverMonths} bulan dan kamu kembali tekor lebih dalam` : ''}. <b>Tidak disarankan</b>: ini memperbesar lubang, bukan menutupnya.</div>` : `<div class="note amber" style="margin-top:12px">Dengan cicilan baru, sisa uangmu jadi <b>${rp(withNew, { plus: true })}</b> per bulan. Masih positif, tapi meminjam untuk membayar pinjaman biasanya hanya menunda masalah; cek dulu restrukturisasi dengan pemberi pinjaman lamamu.</div>`}`}
      ${(steps.hasR || steps.hasS) ? `<div class="lab" style="margin-top:14px">Jalan yang lebih sehat</div>
       <div class="stack" style="margin-top:6px;gap:8px">
        ${steps.hasR ? `<label class="chk"><input type="checkbox" data-act-change="pulih-toggle" data-k="restructure" ${st.restructure ? 'checked' : ''}><span><b>Ajukan restrukturisasi</b> pinjaman modal (tenor diperpanjang): cicilan ${rps(steps.inst0)} → ${rps(steps.inst1)} per bulan</span></label>` : ''}
        ${steps.hasS ? `<label class="chk"><input type="checkbox" data-act-change="pulih-toggle" data-k="split" ${st.split ? 'checked' : ''}><span><b>Pisahkan rekening usaha & pribadi</b>, gaji diri sendiri tetap; hentikan tarikan tak tercatat</span></label>` : ''}
       </div>
       <div class="tbl-wrap" style="margin-top:10px"><table><tbody>
        <tr><td>Sekarang</td><td class="num" style="color:var(--danger)"><b>${rp(steps.s0, { plus: true })}</b>/bln</td></tr>
        ${steps.hasR ? `<tr><td>+ restrukturisasi</td><td class="num"><b>${rp(steps.s1, { plus: true })}</b>/bln</td></tr>` : ''}
        ${steps.hasS ? `<tr><td>+ pisah rekening</td><td class="num" style="color:var(--safe)"><b>${rp(steps.s2, { plus: true })}</b>/bln</td></tr>` : ''}
        ${steps.s3 !== null ? `<tr><td>+ paylater lunas (bulan ke-4)</td><td class="num" style="color:var(--safe)"><b>${rp(steps.s3, { plus: true })}</b>/bln · cicilan ${rps(steps.inst3)}</td></tr>` : ''}
       </tbody></table></div>` : ''}
     </div></section>
  <section class="sec">${secHead(6, 'p6', 'Riwayat kreditmu', 'Catatan di SLIK OJK menentukan apakah kamu bisa dapat pinjaman murah nanti.')}
     <div class="panel"><h3>Status ${term('SLIK')} OJK</h3>
      <div class="row" style="margin-top:8px"><span class="pill ${kol[1]}">${kol[0]}</span></div>
      <ul class="small" style="margin:10px 0 0;padding-left:18px"><li>Cek riwayatmu gratis lewat layanan iDebKu OJK.</li><li>Kolektibilitas dihitung dari keterlambatan: 1–90 hari terlambat masuk Kol 2, lebih dari 90 hari mulai dianggap bermasalah.</li><li>Bayar tepat waktu setiap bulan adalah satu-satunya cara memperbaiki catatan; pinjaman berbunga murah seperti KUR umumnya mensyaratkan riwayat lancar.</li></ul>
     </div></section>`;
}

