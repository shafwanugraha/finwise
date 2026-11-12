/* ================= PILAH ================= */
function pilahCalc(p, st) {
  const h = FW.headroom(p);
  const lad = FW.ladder(st.need || 0, [{ key: 'savings', amount: Math.min(st.useSavings || 0, p.emergencyFund || 0) }, { key: 'family', amount: st.family || 0 }]);
  const products = isSaya(p) ? realProducts(st, lad.gap) : DATA.products;
  const m = FW.match(p, { amount: lad.gap, deadlineHours: st.hours || 0, purpose: st.purpose || 'konsumtif', mode: st.mode, products });
  return { h, lad, m };
}
const pilahReady = (p, st) => st.need > 0 && st.hours > 0 && !!st.purpose && (!isSaya(p) || st.months > 0);
function pilahStep1(p, st, ctx) {
  const h = FW.headroom(p), paydays = p.incomes.map(i => i.payday || 1);
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
    <div class="small muted">${term('DSR', 'Porsi gaji untuk cicilan (DSR)')} sekarang ${pct(h.dsrNow)} · sisa uang ${rp(h.sur)}/bulan</div>
    <div style="margin:16px 0 4px">${zoneBar(h)}</div>
    <div class="stack" style="margin-top:14px;gap:10px">
     <div class="note ${h.binding === 'dsr' ? 'amber' : ''}"><b>Hitungan 1 · cicilan maks 30% pendapatan</b><div class="num small">30% × ${rp(h.inc)} − cicilan ${rp(h.ex)} = <b>${rp(h.lens1)}</b></div></div>
     <div class="note ${h.binding === 'cash' ? 'amber' : ''}"><b>Hitungan 2 · 70% sisa uangmu</b><div class="num small">70% × sisa ${rp(h.sur)} = <b>${rp(h.lens2)}</b> (30% disisakan sebagai penyangga)</div></div>
     <p class="small">Yang dipakai: hitungan yang hasilnya lebih kecil, yaitu <b>${h.binding === 'dsr' ? 'hitungan 1' : 'hitungan 2'}</b>. Di atas ${rps(h.stretchMax)} cicilanmu masuk ${term('Zona', 'zona Bahaya')}.</p>
     ${h.ceiling <= 0 ? '<div class="note danger">Saat ini belum ada ruang untuk cicilan baru. Coba atur ulang pengeluaran di CEK atau rapikan utang di PULIH dulu.</div>' : ''}
    </div>
    <div style="margin-top:14px">${ctx.test ? `<button class="btn" data-act="t-step" data-v="2" data-mark="headroom">Saya sudah paham batas amanku, lanjut</button>` : `<button class="btn" data-act="pilah-step" data-v="2">Lanjut: tangga dana</button>`}</div>
   </div>
  </div>`;
}
function pilahStep2(p, st, ctx) {
  const { lad, h } = pilahCalc(p, st);
  const pre = ctx.test ? 't.' : 'pilah.';
  const kop = DATA.products.find(x => x.id === 'koperasi'), bank = DATA.products.find(x => x.id === 'bank');
  const deadlineLabel = { 24: '1 hari', 72: '3 hari', 168: '1 minggu', 720: '1 bulan' };
  return `<div class="grid g-side">
   <div class="card">
    <h3>${term('Tangga dana')}: tutup yang bisa, sebelum berutang</h3>
    ${!ctx.test && isSaya(p) ? `<label class="f" style="margin-top:12px">Untuk apa dananya?<input class="in" id="n-label" value="${esc(st.needLabel)}" placeholder="mis. Biaya rumah sakit, modal usaha" data-k="${pre}needLabel" data-t="text"></label>` : ''}
    <div class="grid ${!ctx.test && isSaya(p) ? 'g4' : 'g3'}" style="margin-top:12px">
     <label class="f">Kebutuhan${rpInput('n-amount', st.need, `data-k="${pre}need" data-t="rpn" placeholder="mis. 5.000.000" ${ctx.test ? 'disabled' : ''}`)}</label>
     <label class="f">Tenggat<select class="in" id="n-hours" data-k="${pre}hours" data-t="intn" ${ctx.test ? 'disabled' : ''}>${st.hours ? '' : '<option value="" selected>Pilih</option>'}${Object.entries(deadlineLabel).map(([v, l]) => `<option value="${v}" ${+v === st.hours ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
     <label class="f">Jenis<select class="in" id="n-purpose" data-k="${pre}purpose" data-t="text" ${ctx.test ? 'disabled' : ''}>${st.purpose ? '' : '<option value="" selected>Pilih</option>'}<option value="konsumtif" ${st.purpose === 'konsumtif' ? 'selected' : ''}>Pribadi (konsumtif)</option><option value="produktif" ${st.purpose === 'produktif' ? 'selected' : ''}>Usaha (produktif)</option></select></label>
     ${!ctx.test && isSaya(p) ? `<label class="f">Tenor yang kamu mau<select class="in" id="n-months" data-k="${pre}months" data-t="intn">${st.months ? '' : '<option value="" selected>Pilih</option>'}${[3, 6, 9, 12, 18, 24].map(m => `<option value="${m}" ${m === st.months ? 'selected' : ''}>${m} bulan</option>`).join('')}</select></label>` : ''}
    </div>
    <div style="margin-top:8px">
     <div class="rung ${lad.steps[0].use > 0 ? 'used' : 'cur'}"><span class="n">1</span><div><b>Dana darurat sendiri</b><div class="tiny muted">Saldo ${rp(p.emergencyFund || 0)} · tanpa biaya</div></div><div class="rin">${rpInput('r-sav', st.useSavings, `data-k="${pre}useSavings" data-t="rpn" placeholder="0" aria-label="Dana darurat yang dipakai"`)}</div></div>
     <div class="rung ${lad.steps[1].use > 0 ? 'used' : 'cur'}"><span class="n">2</span><div><b>Bantuan / patungan keluarga</b><div class="tiny muted">${p.need?.familyFrom ? 'Mis. ' + esc(p.need.familyFrom) + ' · ' : ''}tanpa bunga, sepakati waktu kembali</div></div><div class="rin">${rpInput('r-fam', st.family, `data-k="${pre}family" data-t="rpn" placeholder="0" aria-label="Bantuan keluarga"`)}</div></div>
     <div class="rung ${p.access?.koperasi ? '' : 'dim'}"><span class="n">3</span><div><b>Koperasi karyawan</b><div class="tiny muted">${p.access?.koperasi ? `Bisa sampai ${rps(kop.max)}, 1% per bulan, cair ±2 hari` : 'Tidak tersedia untukmu'}</div></div><span class="pill ${p.access?.koperasi ? 'z-green' : 'z-grey'}">${p.access?.koperasi ? 'Tersedia' : 'Tidak ada'}</span></div>
     <div class="rung ${p.access?.bank && st.hours >= bank.hours ? '' : 'dim'}"><span class="n">4</span><div><b>Bank atau KUR</b><div class="tiny muted">Umumnya lebih murah dari pinjol, persetujuan ±5 hari kerja</div></div><span class="pill ${!p.access?.bank ? 'z-grey' : !st.hours ? 'z-grey' : st.hours >= bank.hours ? 'z-green' : 'z-grey'}">${!p.access?.bank ? 'Tidak ada' : !st.hours ? 'Pilih tenggat' : st.hours >= bank.hours ? 'Masuk tenggat' : 'Terlalu lama'}</span></div>
     <div class="rung"><span class="n">5</span><div><b>Pindar berizin OJK</b><div class="tiny muted">${isSaya(p) ? `${RL.length} pindar nyata di database FinWise · biaya maks 0,1–0,3% per hari` : 'Biaya 0,1–0,3% per hari'} · pilihan terakhir</div></div><span class="pill z-amber">Terakhir</span></div>
    </div>
   </div>
   <div class="card" aria-live="polite">
    ${!(st.need > 0) ? `<div class="lab">Kebutuhan dana</div><p class="muted" style="margin-top:8px">Isi jumlah kebutuhan, tenggat, dan jenis pinjaman di kiri. FinWise lalu menghitung berapa yang benar-benar perlu dipinjam.</p>` : `
    <div class="lab">${esc(st.needLabel || 'Kebutuhan dana')}</div>
    ${lad.covered > 0 ? `<div class="num" style="margin-top:6px;color:var(--muted);font-weight:700"><s style="text-decoration-color:var(--danger);text-decoration-thickness:2px">${rp(st.need)}</s></div>` : ''}<div class="big" style="margin:2px 0 6px;font-size:clamp(1.875rem,3.6vw,2.625rem)">${rp(lad.gap)}</div>
    <div class="small muted">${lad.gap > 0 ? 'yang benar-benar perlu dipinjam' : 'tertutup tanpa utang baru'}</div>
    <div class="prog" style="margin:14px 0 6px"><i style="width:${(lad.covered / Math.max(1, st.need) * 100).toFixed(1)}%"></i></div>
    <div class="row between small"><span style="color:var(--safe)" class="num">Tertutup ${rp(lad.covered)}</span><span style="color:var(--amber)" class="num">Sisa ${rp(lad.gap)}</span></div>
    ${lad.gap === 0 ? '<div class="note safe" style="margin-top:14px">Kamu tidak perlu pinjaman baru. Catat kesepakatan dengan keluarga dan susun ulang tabungan darurat di CEK.</div>' : `<div class="note" style="margin-top:14px">Batas cicilan amanmu ${rp(h.ceiling)}/bulan. Berikutnya FinWise membandingkan pinjaman legal untuk ${rp(lad.gap)}.</div>`}
    `}
    <div style="margin-top:14px">${ctx.test ? `<button class="btn" data-act="t-step" data-v="3" data-mark="ladder" ${lad.covered === 0 ? 'disabled' : ''}>Lanjut: bandingkan opsi</button>${lad.covered === 0 ? '<p class="tiny muted" style="margin-top:6px">Isi dulu sumber dana tanpa utang (langkah 1 dan 2).</p>' : ''}` : `<button class="btn" data-act="pilah-step" data-v="3" ${lad.gap === 0 || !pilahReady(p, st) ? 'disabled' : ''}>Lanjut: bandingkan opsi</button>${!pilahReady(p, st) ? `<p class="tiny muted" style="margin-top:6px">Lengkapi dulu: ${[!(st.need > 0) && 'jumlah kebutuhan', !st.hours && 'tenggat', !st.purpose && 'jenis', isSaya(p) && !st.months && 'tenor'].filter(Boolean).join(', ')}.</p>` : ''}`}</div>
   </div>
  </div>`;
}
// "why is #1 on top" in plain words, with the gap to #2 and #3; AI rewrites it when available
function whyFirst(p, st, m, lad, h, ctx) {
  const [a, b, c] = m.ok; if (!a) return '';
  const rl = a.real ? RL.find(l => l.id === a.real) : null;
  const topComplaint = rl?.clusters.filter(x => x.type === 'complaint').sort((x, y) => y.n - x.n)[0];
  const fb = {
    cocok: [`Total biaya ${a.real ? 'maksimum ' : ''}${rp(a.total)} untuk ${rp(lad.gap)} selama ${a.months} bulan${b ? `, ${a.total <= b.total ? rp(b.total - a.total) + ' lebih murah' : rp(a.total - b.total) + ' lebih mahal'} dari ${b.name}` : ''}.`, a.zone === 'safe' ? `Cicilan ${rp(a.inst)} masih di bawah batas amanmu ${rp(h.ceiling)}.` : `Cicilan ${rp(a.inst)} ${a.zone === 'stretch' ? 'sedikit di atas' : 'jauh di atas'} batas amanmu ${rp(h.ceiling)}.`, a.rating ? `Rating sampel ulasan ${nf(a.rating, 1)} dengan ${pct(a.positive || 0, 0)} ulasan positif.` : a.generic ? 'Lembaga resmi (koperasi/bank) dengan biaya umumnya lebih rendah dari pindar.' : ''],
    waspada: [`Bunga efektifnya ±${pct(a.ear, 0)} per tahun, jauh di atas angka bulanan yang diiklankan.`, topComplaint ? `Keluhan terbanyak di ${a.name}: ${topComplaint.label.toLowerCase()} (${topComplaint.n} sebutan).` : a.generic ? 'Persetujuan bisa lebih lama dan butuh dokumen; ajukan lebih awal.' : '', a.zone !== 'safe' ? 'Pinjaman ini membuat arus kasmu tertekan; kurangi jumlah atau perpanjang tenor.' : 'Telat bayar dikenai denda harian dan tercatat di SLIK.'],
    saran: [`Ajukan tepat ${rp(lad.gap)}, bukan lebih, dengan tenor ${a.months} bulan.`, `Pasang jatuh tempo di tanggal ${Math.min(...p.incomes.map(i => i.payday || 1))}, tepat setelah uang masuk, lalu kunci cicilannya di rekening terpisah.`, 'Unduh aplikasinya hanya dari Play Store/App Store resmi; cocokkan nama perusahaan di Openspace.'],
  };
  const prompt = `Data:\n${context()}\nKebutuhan ${rp(st.need)}, ditutup tanpa utang ${rp(lad.covered)}, perlu pinjam ${rp(lad.gap)}. Batas cicilan aman ${rp(h.ceiling)}/bulan.\nTiga opsi teratas (mode ${st.mode}): ${m.ok.slice(0, 3).map(r => `${r.rank}. ${r.name}: total biaya ${rp(r.total)}, cicilan ${rp(r.inst)} x ${r.months}, bunga efektif ${pct(r.ear, 0)}/thn, zona ${ZONE[r.zone][0]}${r.rating ? `, rating ulasan ${nf(r.rating, 1)}` : ''}${r.real ? `, keluhan utama: ${(RL.find(l => l.id === r.real)?.clusters.filter(x => x.type === 'complaint').sort((x, y) => y.n - x.n)[0]?.label) || '-'}` : ''}`).join('; ')}.\nTugas: analisis opsi nomor 1 untuk pengguna ini. ${AI3_FORMAT}`;
  return `<div class="card why1" style="margin-top:16px"><div class="row between" style="align-items:flex-start"><div><div class="eyebrow e-pilah" style="font-weight:800;font-size:.8125rem;letter-spacing:.04em">KENAPA #1</div><h3 style="margin-top:4px">${esc(a.name)} paling cocok untuk prioritas “${MODES.find(x => x[0] === st.mode)[1]}”</h3></div>
    <div class="row">${[b, c].filter(Boolean).map((r, i) => `<span class="chip">vs #${i + 2} ${esc(r.name)}: ${r.total >= a.total ? 'hemat ' + rps(r.total - a.total) : 'lebih mahal ' + rps(a.total - r.total)}</span>`).join('')}</div></div>
    <div style="margin-top:12px">${ai3(ctx.test ? 'none' : 'pilah3', prompt, { cocok: fb.cocok.filter(Boolean), waspada: fb.waspada.filter(Boolean), saran: fb.saran }, { auto: !ctx.test, noAI: !!ctx.test })}</div></div>`;
}
const MODES = [['seimbang', 'Seimbang'], ['termurah', 'Termurah'], ['tersehat', 'Paling sehat'], ['tercepat', 'Tercepat'], ['reputasi', 'Reputasi terbaik']];
function pilahStep3(p, st, ctx) {
  const { lad, m, h } = pilahCalc(p, st);
  const pre = ctx.test ? 't' : 'pilah';
  const other = m.rows.filter(r => r.status === 'filtered' || r.status === 'na'), blocked = m.rows.filter(r => r.status === 'blocked');
  const card = r => {
    const best = r.rank === 1 && r.zone !== 'danger';
    const sav = m.fastest && best && m.fastest.id !== r.id ? m.fastest.total - r.total : 0;
    return `<div class="opt ${best ? 'best' : ''} ${st.picked === r.id ? 'picked' : ''}">
     <div class="row between" style="align-items:flex-start;flex-wrap:nowrap"><div class="row" style="gap:10px;align-items:flex-start;flex-wrap:nowrap;min-width:0"><span class="rank">${r.rank}</span><div><b style="font-size:1rem">${esc(r.name)}</b>${r.real ? ' <span class="tag">data nyata</span>' : r.generic && isSaya(p) ? ' <span class="tag">perkiraan umum</span>' : ''}<div class="tiny muted">${esc(r.legal)} · ${r.rateLabel ? esc(r.rateLabel) + ' (RIPLAY)' : (r.rate * 100).toLocaleString('id-ID') + '% per ' + (r.unit === 'day' ? 'hari' : 'bulan')}${!r.real && r.feePct ? ' + biaya ' + (r.feePct * 100).toLocaleString('id-ID') + '%' : ''} · cair ${r.hours == null ? 'tidak dipublikasikan' : '±' + FW.hoursLabel(r.hours)}${r.note ? ' · ' + esc(r.note) : ''}</div></div></div>${zpill(r.zone)}</div>
     <div class="facts"><div><div class="k">${r.real ? 'Total biaya maks' : 'Total biaya'}</div><div class="v">${rp(r.total)}</div></div><div><div class="k">Cicilan</div><div class="v">${rp(r.inst)} <span class="tiny muted">×${r.months}</span></div></div><div><div class="k">Porsi cicilan</div><div class="v">${pct(r.dsr)}</div></div><div><div class="k">Sisa per bulan</div><div class="v" style="color:${r.left < 0 ? 'var(--danger)' : 'inherit'}">${rp(r.left, { plus: true })}</div></div></div>
     ${sav > 0 ? `<div class="note safe small"><b>${rp(sav)} lebih hemat</b> daripada opsi tercepat (${esc(m.fastest.name)}).</div>` : ''}
     ${r.zone === 'danger' ? `<div class="note danger small">Diletakkan paling bawah: cicilan ini membuat ${r.left < 0 ? `uangmu minus ${rp(-r.left)} per bulan` : `DSR-mu ${pct(r.dsr)}`}.</div>` : r.zone === 'stretch' ? `<div class="note amber small">Melebihi batas amanmu ${rp(h.ceiling)}; sisa uang tinggal ${rp(r.left)}.</div>` : ''}
     <div class="row between"><span class="tiny muted">Bunga sebenarnya ±${pct(r.ear, 0)}/tahun${r.real ? ` · <a href="#openspace" data-act="lender" data-id="${r.real}">profil & ulasan</a>` : ''}</span><button class="btn sm ${r.zone === 'danger' ? 'ghost' : ''}" data-act="${ctx.test ? 't-pick' : 'pick'}" data-id="${r.id}" aria-pressed="${st.picked === r.id}" aria-label="Pilih ${esc(r.name)}">${st.picked === r.id ? 'Dipilih' : 'Pilih opsi ini'}</button></div>
    </div>`;
  };
  const realNote = isSaya(p) && !ctx.test ? `<div class="note small" style="margin-bottom:12px"><b>Data nyata:</b> ${RL.length} pindar berizin dari database FinWise, dihitung dengan <b>tarif maksimum</b> di dokumen RIPLAY (per ${dateID('2026-04-30')}) dan dibatasi plafon biaya OJK untuk tenor ${st.months} bulan. Biaya sebenarnya bisa lebih rendah tergantung penilaian kreditmu. Kecepatan cair pindar tidak dipublikasikan, jadi tenggat hanya menyaring koperasi dan bank.</div>` : !ctx.test ? '<p class="tiny muted" style="margin-bottom:10px">Contoh ini memakai pemberi pinjaman fiktif. Pilih “Data saya” untuk membandingkan pindar nyata.</p>' : '';
  return `${realNote}<div class="row between" style="margin-bottom:12px"><div><h3>Pinjaman legal untuk ${rp(lad.gap)}</h3><p class="small muted">Batas amanmu ${rp(h.ceiling)}/bulan · tenggat ${FW.hoursLabel(st.hours)}. Urutan tidak bisa dibeli pemberi pinjaman.</p></div>
    <div><div class="lab" style="margin-bottom:4px">Urutkan menurut yang paling penting bagimu</div><div class="seg" role="group" aria-label="Prioritas urutan">${MODES.map(([k, l]) => `<button class="${st.mode === k ? 'on' : ''}" aria-pressed="${st.mode === k}" data-act="mode" data-scope="${pre}" data-v="${k}">${l}</button>`).join('')}</div></div></div>
   ${m.ok.length ? `<div class="grid g3 top3">${m.ok.slice(0, 3).map(card).join('')}</div>
    ${m.ok.length > 3 ? `<div style="margin-top:10px"><button class="btn ghost sm" data-act="toggle" data-k="${pre}.showAll" aria-expanded="${!!st.showAll}">${st.showAll ? 'Sembunyikan opsi lainnya' : `Lihat ${m.ok.length - 3} opsi lainnya`}</button></div>${st.showAll ? `<div class="grid g3" style="margin-top:12px">${m.ok.slice(3).map(card).join('')}</div>` : ''}` : ''}
    ${whyFirst(p, st, m, lad, h, ctx)}` : '<div class="note danger">Tidak ada pinjaman legal yang memenuhi jumlah, jenis, dan tenggatmu. Coba ubah tenggat atau jumlah di tangga dana.</div>'}
   <div class="grid g2" style="margin-top:16px">
    <div class="card flat"><div class="row between"><h3>Tidak memenuhi syarat (${other.length})</h3><button class="btn ghost sm" data-act="toggle" data-k="${pre}.showOut">${st.showOut ? 'Tutup' : 'Lihat'}</button></div>
     ${st.showOut ? `<div class="stack small" style="margin-top:10px;gap:6px">${other.map(r => `<div class="row between"><span><b>${esc(r.name)}</b></span><span class="muted">${esc(r.reason)}</span></div>`).join('')}</div>` : `<p class="small muted" style="margin-top:6px">Termasuk ${other.slice(0, 3).map(r => esc(r.name)).join(', ')}${other.length > 3 ? ', dan lainnya' : ''}.</p>`}</div>
    <div class="card flat" style="border-color:var(--danger)"><h3 style="color:var(--danger)">Diblokir</h3>
     <div class="stack small" style="margin-top:8px;gap:6px">${blocked.map(r => `<div class="row between"><b>${esc(r.name)}</b><span class="pill z-danger">${esc(r.reason)}</span></div>`).join('')}</div>
     <p class="tiny muted" style="margin-top:8px">Pinjaman tidak berizin tidak pernah ditampilkan sebagai pilihan.</p></div>
   </div>
   <div class="card flat" style="margin-top:16px"><div class="row between"><h3>Kenapa urutannya begini?</h3><button class="btn ghost sm" data-act="toggle" data-k="${pre}.why">${st.why ? 'Tutup' : 'Lihat bobot'}</button></div>
    ${st.why ? `<div class="tbl-wrap" style="margin-top:10px"><table><thead><tr><th>Opsi</th>${Object.keys(m.weights).map(k => `<th>${{ cost: 'Biaya', health: 'Cocok dgn batas', rep: 'Reputasi', privacy: 'Privasi', speed: 'Kecepatan' }[k]} (${Math.round(m.weights[k] * 100)}%)</th>`).join('')}<th>Skor</th></tr></thead><tbody>${m.ok.map(r => `<tr><td><b>${esc(r.name)}</b></td>${Object.keys(m.weights).map(k => `<td class="num">${Math.round(r.factors[k] * 100)}</td>`).join('')}<td class="num"><b>${Math.round(r.score * 100)}</b>${r.zone === 'danger' ? ' <span class="tiny muted">(ditaruh terakhir)</span>' : ''}</td></tr>`).join('')}</tbody></table></div>
     <ul class="small" style="margin:10px 0 0;padding-left:18px"><li>Faktor yang kamu pilih mendapat bobot 50%; sisanya mengikuti proporsi mode Seimbang.</li><li>Opsi zona Bahaya selalu di urutan terakhir dan perlu konfirmasi.</li><li>Koperasi dan bank belum punya data ulasan publik, jadi reputasinya dinilai netral (70).</li>${isSaya(p) && !ctx.test ? `<li>Reputasi pindar dari sampel ulasan Google Play (rata-rata bintang dan % ulasan positif). Privasi dari sertifikasi ISO 27001/27701; izin aplikasi baru dipetakan untuk 1 platform, jadi tidak dipakai untuk mengurutkan.</li><li>Kecepatan cair tidak dipublikasikan, jadi dinilai netral (50).</li>` : ''}<li>Tidak ada pemberi pinjaman yang membayar untuk urutan ini.</li></ul>` : ''}
    ${ctx.test ? '' : `<div style="margin-top:10px">${aiBlock('pilah', 'Jelaskan pilihan ini dengan AI', `Data:\n${context()}\nKebutuhan ${rp(st.need)}, tertutup non-utang ${rp(lad.covered)}, perlu pinjam ${rp(lad.gap)}.\nOpsi (urut): ${m.ok.map(r => `${r.rank}. ${r.name}: total biaya ${rp(r.total)}, cicilan ${rp(r.inst)} x ${r.months}, DSR ${pct(r.dsr)}, sisa/bln ${rp(r.left)}, zona ${ZONE[r.zone][0]}`).join('; ')}.\nTugas: jelaskan dengan bahasa sederhana kenapa opsi nomor 1 paling cocok dan apa risiko opsi lainnya.`)}</div>`}
   </div>`;
}
function vPilah() {
  const p = P(), st = S.pilah;
  const steps = [[1, 'Utang & batas aman'], [2, 'Tangga dana'], [3, 'Pilih pinjaman']];
  return banner({ tone: 'amber', eyebrow: 'PILAH · SAAT BUTUH DANA', title: 'Pinjam secukupnya, dari yang tepat', sub: 'Tiga langkah: lihat batas cicilan amanmu, tutup kebutuhan tanpa utang dulu, baru bandingkan pinjaman legal berdasarkan total biaya.', right: userChip() }) + `
   <div class="row between"><div class="steps" role="group" aria-label="Langkah PILAH">${steps.map(([n, l]) => `<button class="${st.step === n ? 'on' : st.step > n ? 'done' : ''}" data-act="pilah-step" data-v="${n}" ${st.step === n ? 'aria-current="step"' : ''}><i aria-hidden="true">${st.step > n ? '✓' : n}</i>${l}${st.step > n ? '<span class="sr"> (selesai)</span>' : ''}</button>`).join('')}</div><a class="small" href="#openspace">Cek legalitas pinjol</a></div>
   ${st.step === 3 && !pilahReady(p, st) ? '<div class="note amber" role="status" style="margin-bottom:12px">Lengkapi dulu kebutuhan dana di langkah 2 sebelum membandingkan pinjaman.</div>' + pilahStep2(p, st, {}) : st.step === 1 ? pilahStep1(p, st, {}) : st.step === 2 ? pilahStep2(p, st, {}) : pilahStep3(p, st, {})}
   ${st.picked ? pickedBanner(p, st) : ''}`;
}
function pickedBanner(p, st) {
  const { m } = pilahCalc(p, st); const r = m.ok.find(x => x.id === st.picked); if (!r) return '';
  return `<div class="card" style="margin-top:16px;border-color:var(--amber-strong)"><div class="row between"><div><div class="lab">Pilihanmu</div><b style="font-size:1.0625rem">${esc(r.name)}</b> ${zpill(r.zone)} <span class="small muted num">· ${rp(r.inst)} × ${r.months} bulan, total biaya ${rp(r.total)}</span></div>
   <button class="btn amber" data-act="to-pulih">Teruskan ke PULIH</button></div><p class="small muted" style="margin-top:6px">Cicilan ini akan ditambahkan ke jadwal bayar di PULIH dengan jatuh tempo setelah tanggal gajian.</p></div>`;
}

