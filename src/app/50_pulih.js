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
  return banner({ tone: 'pulih', eyebrow: 'PULIH · SETELAH BERUTANG', title: 'Bayar tepat waktu, keluar dari utang', sub: 'Semua cicilan di satu tempat, uang yang perlu disisihkan, dan urutan pelunasan yang paling hemat.', right: userChip() })
  + secNav([['p1', 'Ringkasan utang'], ['p2', 'Jadwal bayar'], ['p3', 'Urutan pelunasan'], ['p4', 'Pinjam lagi?'], ['p5', 'Riwayat kredit']]) + `
  <section class="sec">${secHead(1, 'p1', 'Ringkasan utangmu', 'Semua cicilan aktif dalam satu angka.')}
   <div class="panel"><div class="grid g4">
    <div class="kpi"><div class="k">Total sisa pembayaran</div><div class="v">${rp(out)}</div><div class="s">${p.loans.length} pinjaman</div></div>
    <div class="kpi"><div class="k">Cicilan per bulan</div><div class="v">${rp(h.ex)}</div><div class="s">${st.restructure ? 'setelah restrukturisasi' : 'saat ini'}</div></div>
    <div class="kpi"><div class="k">${term('Porsi cicilan')}</div><div class="v" style="color:${h.dsrNow > 0.4 ? 'var(--danger)' : h.dsrNow > 0.3 ? 'var(--stretch)' : 'var(--safe)'}">${pct(h.dsrNow)}</div><div class="s">batas sehat 30%</div></div>
    <div class="kpi"><div class="k">${term('Sisa uang')}</div><div class="v" style="color:${h.sur < 0 ? 'var(--danger)' : 'var(--safe)'}">${rp(h.sur, { plus: true })}</div><div class="s">setelah semua cicilan</div></div>
   </div>
   ${p.loans.length ? `<div class="loan-ana"><h3>Analisis pinjaman</h3><p class="tiny muted">Dinilai dari tujuan pinjaman, bunganya, dan porsinya dari pendapatanmu.</p><ul>${p.loans.map(l => { const v = loanVerdict(p, l); return `<li><div class="row between" style="flex-wrap:nowrap;align-items:flex-start"><div><b>${esc(l.name)}</b><div class="tiny muted">${esc(LOAN_TYPES.find(t => t[0] === l.type)?.[1] || l.type)} · untuk ${esc(l.purpose && l.purpose !== 'lainnya' ? purposeName(l.purpose).toLowerCase() : 'belum diisi')} · ${rp(l.instalment)}/bulan</div></div><span class="pill z-${v.tone}">${v.label}</span></div><ul class="small">${v.why.map(x => `<li>${esc(x)}</li>`).join('')}</ul><p class="small"><b>${esc(v.act)}</b>${v.v === 'unk' ? ' <a href="#mulai" data-act="wiz-edit" data-v="3">Isi tujuan</a>' : ''}</p></li>`; }).join('')}</ul></div>` : ''}
   </div></section>
  <section class="sec">${secHead(2, 'p2', 'Jadwal bayar & uang yang disisihkan', 'Kapan tiap cicilan jatuh tempo, dan berapa yang harus dikunci saat gajian.')}
     <div class="panel">
      ${monthStrip([...p.incomes.map(i => ({ day: i.payday || 1, label: 'Uang masuk', color: 'var(--safe)' })), ...loansSorted.map(l => ({ day: l.dueDay, label: rps(l.instalment), color: 'var(--amber)' }))])}
      <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th>Cicilan</th><th>Jatuh tempo</th><th>Bunga/bln</th><th>Sisa</th><th>Jumlah</th></tr></thead><tbody>
       ${loansSorted.map(l => `<tr><td><b>${esc(l.name)}</b>${l.restructured ? ' <span class="pill z-green">Direstrukturisasi</span>' : ''}<div><a class="tiny" href="${gcalLink(l, firstPay)}" target="_blank" rel="noopener noreferrer">+ Pengingat di Google Calendar<span class="sr"> untuk ${esc(l.name)} (tab baru)</span></a></div></td><td>tgl ${l.dueDay}</td><td class="num">${((l.rateMonthly || 0) * 100).toLocaleString('id-ID')}%${l.rateGuess ? '<div class="tiny muted">perkiraan</div>' : ''}</td><td class="num">${rps(l.outstanding)} · ${l.months} bln</td><td class="num"><b>${rp(l.instalment)}</b></td></tr>`).join('') || '<tr><td colspan="5" class="muted">Tidak ada cicilan aktif.</td></tr>'}
      </tbody></table></div>
      ${p.loans.length ? `<div class="note amber" style="margin-top:12px">Saat uang masuk tanggal <b>${firstPay}</b>, langsung kunci <b>${rp(h.ex)}</b> di kantong terpisah untuk ${p.loans.length} cicilan bulan ini. Sisanya, ${rp(h.inc - h.ex)}, baru dipakai untuk kebutuhan.</div>` : ''}
     </div></section>
  <section class="sec">${secHead(3, 'p3', one ? 'Lunasi lebih cepat' : 'Urutan pelunasan', one ? 'Kalau ada uang lebih, berapa bulan lebih cepat utangmu lunas.' : 'Mana yang dilunasi dulu kalau ada uang lebih.')}
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
  <section class="sec">${secHead(4, 'p4', 'Ditawari pinjaman untuk menutup cicilan?', 'Cek dulu dampaknya sebelum “gali lubang tutup lubang”.')}
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
  <section class="sec">${secHead(5, 'p5', 'Riwayat kreditmu', 'Catatan di SLIK OJK menentukan apakah kamu bisa dapat pinjaman murah nanti.')}
     <div class="panel"><h3>Status ${term('SLIK')} OJK</h3>
      <div class="row" style="margin-top:8px"><span class="pill ${kol[1]}">${kol[0]}</span></div>
      <ul class="small" style="margin:10px 0 0;padding-left:18px"><li>Cek riwayatmu gratis lewat layanan iDebKu OJK.</li><li>Kolektibilitas dihitung dari keterlambatan: 1–90 hari terlambat masuk Kol 2, lebih dari 90 hari mulai dianggap bermasalah.</li><li>Bayar tepat waktu setiap bulan adalah satu-satunya cara memperbaiki catatan; pinjaman berbunga murah seperti KUR umumnya mensyaratkan riwayat lancar.</li></ul>
     </div></section>`;
}

