/* ================= CEK ================= */
// The FinWise plan is a list of concrete actions. Only actions the user keeps switched on change the "after" numbers,
// and every change is listed, so the score never jumps on assumptions alone.
function planActions(base) {
  const acts = [], saya = isSaya(base), f = facts(base), r1k = x => Math.round(x / 1000) * 1000;
  const capRows = base.spending.filter(c => c.kind === 'want' && c.cap != null && c.amount > c.cap);
  if (capRows.length) acts.push({ id: 'caps', title: 'Batasi belanja keinginan', desc: saya ? 'Total keinginan dibatasi 30% pendapatan (pedoman 50/30/20).' : 'Batas per pos sesuai kebiasaan belanjanya.', rows: capRows.map(c => ({ name: c.name, from: c.amount, to: c.cap })), apply: p => p.spending.forEach(c => { if (c.cap != null && c.amount > c.cap) c.amount = c.cap; }) });
  if (saya && !totalMode(base) && f.needR > 0.5) {
    const top = base.spending.filter(c => c.kind === 'need' && c.amount > 0).sort((x, y) => y.amount - x.amount).slice(0, 2);
    const rows = top.map(c => ({ name: c.name, from: c.amount, to: r1k(c.amount * 0.9) }));
    if (rows.length) acts.push({ id: 'needs', title: 'Hemat 10% di 2 pos pokok terbesar', desc: 'Contoh: paket internet/kos yang lebih murah, masak sendiri, transportasi umum. Kebutuhan pokokmu masih di atas pedoman 50%.', rows, apply: p => rows.forEach(r => { const c = p.spending.find(x => x.name === r.name); if (c) c.amount = r.to; }) });
  }
  if (totalMode(base)) acts.push({ id: 'detail', todo: true, title: 'Rinci pengeluaranmu', desc: 'Dengan total saja, FinWise tidak tahu pos mana yang bisa dihemat. Rinci per pos untuk mendapat batas hemat per pos.', href: '#mulai', act: 'wiz-edit', v: 2, mode: 'rinci', cta: 'Rinci sekarang' });
  if (base.after?.extraIncome) acts.push({ id: 'income', title: base.after.extraLabel, desc: 'Mulai bulan ke-4, setelah 3 bulan menabung dari penghematan.', rows: [{ name: 'Pemasukan tambahan', from: 0, to: base.after.extraIncome }], apply: p => p.incomes.push({ id: 'ix', label: 'Proyek tambahan (target)', amount: base.after.extraIncome, type: 'tidak tetap', payday: 20 }) });
  else if (saya) acts.push({ id: 'income', input: true, title: 'Tambah pemasukan (opsional)', desc: 'Isi target tambahan per bulan, misalnya kerja sampingan. Kosongkan jika belum ada.', rows: S.cek.extraIn > 0 ? [{ name: 'Pemasukan tambahan', from: 0, to: S.cek.extraIn }] : [], apply: S.cek.extraIn > 0 ? p => p.incomes.push({ id: 'ix', label: 'Pemasukan tambahan (target)', amount: S.cek.extraIn, type: 'tidak tetap', payday: 20 }) : null });
  acts.push({ id: 'save', title: 'Sisihkan otomatis setiap gajian', desc: 'Sisa uang setelah langkah di atas dipindah ke rekening terpisah di hari gajian, sebelum terpakai.', apply: p => { p.savingMonthly = Math.max(p.savingMonthly || 0, Math.max(0, FW.surplus(p))); } });
  acts.push({ id: 'plan', title: 'Jalankan sebagai rencana bulanan', desc: 'Rencana tertulis dengan target bulanan, ditinjau setiap gajian.', apply: p => { p.plan = true; } });
  if (base.slik === 'tidaktahu') acts.push(saya ? { id: 'slik', todo: true, title: 'Cek SLIK gratis di iDebKu OJK', desc: 'Skor baru berubah setelah kamu tahu hasilnya. Perbarui jawabanmu di data setelah mengecek.', href: '#mulai', act: 'wiz-edit', v: 4, cta: 'Perbarui data' } : { id: 'slik', title: 'Cek SLIK gratis di iDebKu OJK', desc: 'Di contoh ini hasilnya: belum punya riwayat kredit.', apply: p => { p.slik = 'kosong'; } });
  if (base.insurance === false) acts.push({ id: 'bpjs', todo: true, title: 'Daftar BPJS Kesehatan', desc: 'Biaya berobat adalah alasan paling umum orang meminjam mendadak.' });
  if (f.dsr > 0.3) acts.push({ id: 'debt', todo: true, title: 'Rapikan cicilan di PULIH', desc: `Rasio cicilanmu ${pct(f.dsr, 0)}, di atas batas aman 30%.`, href: '#pulih', cta: 'Buka PULIH' });
  return acts;
}
function applyPlan(base, acts = planActions(base)) {
  const p = clone(base);
  acts.filter(a => a.apply && !S.cek.off?.[a.id]).forEach(a => a.apply(p));
  return p;
}
function planCard(base, acts, after) {
  const hb = FW.health(base), ha = FW.health(after);
  const deltas = ha.ind.map((x, i) => ({ label: x.label, d: x.points - hb.ind[i].points })).filter(x => Math.abs(x.d) > 0.01);
  const fmtPts = d => (d > 0 ? '+' : '') + d.toLocaleString('id-ID', { maximumFractionDigits: 2 });
  return `<div class="card plan" id="plan"><p class="tiny muted">Centang atau matikan langkahnya; angka di kanan langsung dihitung ulang.</p>
   <div class="grid g-side" style="margin-top:12px">
    <ul class="acts">${acts.map(a => `<li class="${a.todo ? 'todo' : ''}">
      ${a.todo ? '<span class="dot" aria-hidden="true">○</span>' : `<input type="checkbox" id="pa-${a.id}" data-act-change="plan-toggle" data-id="${a.id}" ${S.cek.off?.[a.id] ? '' : 'checked'}>`}
      <div style="min-width:0"><label ${a.todo ? '' : `for="pa-${a.id}"`}><b>${esc(a.title)}</b>${a.todo ? ' <span class="tag">tugas</span>' : ''}</label><div class="tiny muted">${esc(a.desc)}</div>
       ${a.input ? `<div style="max-width:220px;margin-top:6px">${rpInput('pa-extra', S.cek.extraIn, 'data-k="cek.extraIn" data-t="rpn" placeholder="mis. 500.000" aria-label="Target pemasukan tambahan per bulan"')}</div>` : ''}
       ${a.rows?.length ? `<div class="tiny" style="margin-top:4px">${a.rows.map(r => `${esc(r.name)}: ${r.from ? `<s>${rps(r.from)}</s> → ` : '+'}<b>${rps(r.to)}</b>`).join(' · ')}</div>` : ''}
       ${a.href ? `<a class="tiny" href="${a.href}" ${a.act ? `data-act="${a.act}" data-v="${a.v}" ${a.mode ? `data-mode="${a.mode}"` : ''}` : ''}>${esc(a.cta || 'Buka')} →</a>` : ''}</div></li>`).join('')}</ul>
    <div class="impact"><div class="lab">Dampaknya</div>
     <div class="stack small" style="gap:6px;margin-top:8px">
      <div class="row between"><span>Sisa uang per bulan</span><span class="num">${rp(FW.surplus(base), { plus: true })} → <b>${rp(FW.surplus(after), { plus: true })}</b></span></div>
      <div class="row between"><span>Kesiapan berutang</span><span>${READY[FW.readiness(base).level].short} → <b>${READY[FW.readiness(after).level].short}</b></span></div>
      <div class="row between"><span>Pinjaman maksimal aman (6 bln)</span><span class="num">${rp(FW.maxSafeLoan(base, 6))} → <b>${rp(FW.maxSafeLoan(after, 6))}</b></span></div>
      <div class="row between"><span>Disisihkan per bulan</span><span class="num">${rp(base.savingMonthly || 0)} → <b>${rp(after.savingMonthly || 0)}</b></span></div>
      <div class="row between"><span>Kondisi keuangan</span><span class="num">${hb.total} → <b>${ha.total}</b> (${ha.status})</span></div>
     </div>
     ${deltas.length ? `<div class="lab" style="margin-top:12px">Kenapa skornya berubah</div><ul class="tiny" style="margin:6px 0 0;padding-left:16px">${deltas.map(d => `<li><b>${fmtPts(d.d)}</b> ${esc(d.label)}</li>`).join('')}</ul>` : '<p class="tiny muted" style="margin-top:10px">Belum ada langkah aktif yang mengubah skor.</p>'}
     ${isSaya(base) && facts(after).needR > 0.5 ? `<div class="note amber tiny" style="margin-top:10px">Kebutuhan pokok masih ${pct(facts(after).needR, 0)} dari pendapatan. Skor kondisi keuangan tidak mengukur ini, jadi tetap perhatikan meski skornya naik.</div>` : ''}
    </div>
   </div></div>`;
}
function vCek() {
  const p = P(), base = autoCaps(p), st = S.cek;
  const acts = planActions(base), planned = applyPlan(base, acts);
  const f = facts(p), v = verdict(p, f), pr = priorities(p, f), rs = ratios(p), hs = f.hs, run = FW.runway(p), sp5 = FW.split(p);
  const cuts = acts.filter(a => a.id === 'caps' || a.id === 'needs').flatMap(a => a.rows.map(r => ({ cat: r.name, from: r.from, to: r.to, save: r.from - r.to }))), cutSum = FW.sum(cuts, c => c.save);
  const off = st.offer, offReady = off.amount > 0 && off.months > 0 && off.rate != null, L = FW.loan({ principal: off.amount, rate: off.rate, unit: off.unit, months: off.months });
  const zO = FW.zoneOf(p, L.inst);
  const after = { sur: FW.surplus(planned) }, saveM = Math.max(0, after.sur);
  const goalReady = st.goal.amount > 0, suggestGoal = Math.round(f.efTarget * f.ess / 100000) * 100000;
  const gp = FW.goalPlan(st.goal.amount || 0, [{ monthly: Math.max(saveM, 1) }]);
  const maxBar = Math.max(f.inc, f.needs + f.wants + f.fam + f.inst);
  const rows = [...p.spending.map(c => ({ name: c.name, kind: c.kind, amount: c.amount })), ...(f.fam ? [{ name: 'Kirim ke keluarga', kind: 'need', amount: f.fam }] : []), ...p.loans.map(l => ({ name: l.name, kind: 'debt', amount: l.instalment }))].filter(r => r.amount > 0);
  const kindPill = k => k === 'need' ? '<span class="pill z-green">Pokok</span>' : k === 'want' ? '<span class="pill z-amber">Keinginan</span>' : k === 'total' ? '<span class="pill z-grey">Belum dirinci</span>' : '<span class="pill z-grey">Cicilan</span>';
  const pillars = ['Spend', 'Save', 'Borrow', 'Plan'], pname = { Spend: 'Belanja', Save: 'Menabung', Borrow: 'Berutang', Plan: 'Rencana' };
  const ringC = hs.status === 'Sehat' ? 'var(--safe)' : hs.status === 'Bertahan' ? 'var(--stretch)' : 'var(--danger)';
  const R = FW.readiness(p), RD = READY[R.level];
  const prompt = `Data:\n${context()}\nRingkasan mesin FinWise: ${v.head} ${v.why}\nRasio: ${rs.map(r => `${r.k} ${r.show} (patokan ${r.bench})`).join('; ')}.\nPrioritas dari mesin: ${pr.slice(0, 3).map((x, i) => `${i + 1}. ${x.title}: ${x.text}`).join(' ')}\nTugas: tulis analisis singkat untuk pengguna ini dalam 3 paragraf pendek: (1) gambaran kondisinya dengan bahasa sehari-hari, (2) risiko terbesar yang perlu diwaspadai, (3) satu langkah pertama yang konkret minggu ini. Pakai hanya angka di atas.`;
  aiAuto('ringkasan', prompt);
  const ai = S.ai.ringkasan, txt = analysisText(p, f, v, pr);
  const prLink = x => x.act ? `<a class="btn sm" href="${x.href}" data-act="${x.act}" data-v="${x.v}" data-mode="${x.mode || ''}">${esc(x.cta)}</a>` : x.href === '#cek' ? `<button class="linkbtn small" data-act="goto-sec" data-id="s4">${esc(x.cta)} ↓</button>` : `<a class="small" href="${x.href}">${esc(x.cta)} →</a>`;
  return banner({ tone: 'green', eyebrow: 'CEK · KESEHATAN KEUANGAN', title: 'Kondisi keuanganmu', sub: 'Dihitung dari isianmu. Mulai dari kesiapan berutang, lalu rasio, arus uang, dan rencana.', right: userChip() })
  + secNav([['s1', 'Kesimpulan'], ['s2', 'Rasio & skor'], ['s3', 'Arus uang'], ['s4', 'Rencana'], ['s5', 'Sebelum beli']])
  + `<section class="sec">${secHead(1, 's1', 'Kesimpulan', 'Gambaran singkat kondisimu bulan ini.')}
    <div class="ready-card lv-${RD.tone}">
     <div class="rc-main">
      <div class="lab">${term('Kesiapan berutang')}</div>
      <h3 class="rc-level">${RD.name}</h3>
      <ul class="rc-why">${R.reasons.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <p class="rc-next">${esc(readyNext(R))}</p>
      <div class="row" style="margin-top:12px">${R.level === 0 ? '<button class="btn" data-act="goto-sec" data-id="s4">Lihat rencana tanpa utang</button><a class="btn ghost" href="#pulih">Atur cicilan di PULIH</a>' : '<a class="btn" href="#pilah">Cari pinjaman di PILAH</a><button class="btn ghost" data-act="goto-sec" data-id="s4">Lihat rencana</button>'}</div>
     </div>
     <div class="rc-max">
      <div class="lab">${term('Pinjaman maksimal yang aman')}</div>
      ${R.level === 0 ? `<p class="rc-zero">Rp0</p><p class="small">Belum ada ruang untuk utang baru. Angka ini naik begitu sisa uangmu positif dan cicilan lama turun.</p>`
        : `<dl class="rc-amts">${[3, 6, 12].map(m => `<div><dt>${m} bulan</dt><dd class="num">${rp(R.max[m])}</dd></div>`).join('')}</dl>
      <p class="tiny muted" style="margin-top:8px">Cicilan maksimal ${rp(f.h.ceiling)} per bulan, dihitung dengan bunga legal termurah ±1,5% per bulan.</p>`}
     </div>
    </div>
    <div class="hero-sum ${hs.deficit ? 'danger' : v.tone}" style="margin-top:14px">
     <div class="ring sm" style="--p:${hs.total};--c:${ringC}" role="img" aria-label="Kondisi keuangan ${hs.total} dari 100, ${hs.status}"><div><div><b>${hs.total}</b><div class="tiny muted">${hs.status}</div></div></div></div>
     <div class="hs-text"><div class="lab">${term('Kondisi keuangan')} · ${hs.status}</div><h3>${esc(v.head)}</h3><p class="small">${esc(v.why)}</p></div>
     <dl class="hs-nums"><div><dt>Masuk</dt><dd>${rp(f.inc)}</dd></div><div><dt>Keluar</dt><dd>${rp(f.needs + f.wants + f.fam)}</dd></div><div><dt>Cicilan</dt><dd>${rp(f.inst)}</dd></div><div><dt>${term('Sisa uang')}</dt><dd style="color:${f.sur < 0 ? 'var(--danger)' : 'var(--safe)'}">${rp(f.sur, { plus: true })}</dd></div></dl>
    </div>
    <div class="grid g2" style="margin-top:14px">
     <div class="panel"><h3>Yang perlu kamu lakukan dulu</h3><ol class="prio">${pr.slice(0, 3).map((x, i) => `<li class="${x.tone}"><span class="n">${i + 1}</span><div><b>${esc(x.title)}</b><p class="small" style="margin:3px 0 6px">${esc(x.text)}</p>${prLink(x)}</div></li>`).join('')}</ol></div>
     <div class="panel aicard"><div class="row between"><span class="ai-badge">${ai?.text && !ai.loading ? 'Analisis AI' : 'Analisis FinWise'}</span>${ai?.loading ? '<span class="tiny" role="status">AI sedang menulis…</span>' : ''}</div>
      ${ai?.text ? `<div class="ai-text" id="ai-ringkasan" aria-live="polite">${esc(ai.text)}</div>` : `<div class="stack small" style="gap:8px;margin-top:8px">${txt.map(t => `<p>${esc(t)}</p>`).join('')}</div>`}
      ${ai?.error ? `<p class="tiny" style="margin-top:6px">${esc(ai.error)} <button class="linkbtn" data-act="ai" data-key="ringkasan" data-prompt="${esc(prompt)}">Coba lagi</button></p>` : ''}
      <div class="row" style="margin-top:10px"><button class="btn sm amber" data-act="drawer" data-v="chat">✦ Tanya lebih lanjut</button><button class="btn sm ghost light no-print" data-act="print">Simpan PDF</button></div>
      <p class="tiny" style="margin-top:8px;opacity:.75">${S.cap.sample ? 'AI hanya menjelaskan; semua angka dari mesin hitung FinWise.' : 'Disusun dari aturan FinWise.'}</p></div>
    </div>
    ${f.total ? `<div class="note amber" style="margin-top:14px"><b>Mau insight yang lebih dalam?</b> Kamu baru mengisi total pengeluaran. <a href="#mulai" data-act="wiz-edit" data-v="2" data-mode="rinci">Rinci per pos (±2 menit)</a> supaya FinWise bisa menunjukkan pos paling boros dan batas hemat per pos.</div>` : ''}
   </section>
   <section class="sec">${secHead(2, 's2', 'Analisis kesehatan finansial', 'Rasio keuangan rumah tangga dibanding patokan umum, dan rincian skor kesehatanmu.')}
    <div class="grid g-side" style="align-items:start">
     <div class="panel"><h3>Rasio keuanganmu</h3>
      <ul class="ratios">${rs.map(r => `<li><div class="r-top"><span class="r-name">${term(r.t, r.k)}</span><b class="num" style="color:var(--${r.s})">${esc(r.show)}</b></div>
        <div class="bar" aria-hidden="true"><i style="width:${Math.min(100, Math.max(3, (r.t === 'Rasio likuiditas' ? r.v / Math.max(1, f.efTarget) : r.t === 'Daya tahan uang' ? r.v : Math.abs(r.v)) * 100)).toFixed(0)}%;background:var(--${r.s})"></i></div>
        <div class="r-meta tiny"><span>${esc(r.f)}</span><span>patokan <b>${esc(r.bench)}</b> ${{ safe: '<span class="pill z-safe">Baik</span>', stretch: '<span class="pill z-stretch">Perlu perhatian</span>', danger: '<span class="pill z-danger">Bermasalah</span>' }[r.s]}</span></div>${r.note ? `<div class="tiny muted">${esc(r.note)}</div>` : ''}</li>`).join('')}</ul>
      <p class="tiny muted" style="margin-top:8px">Patokan dari pedoman 50/30/20 dan rasio keuangan rumah tangga (Greninger dkk., 1996). Tekan “?” untuk penjelasan singkat.</p></div>
     <div class="panel"><h3>Rincian ${term('Kondisi keuangan', 'kondisi keuangan')}</h3>
      <p class="small muted" style="margin-top:4px">8 kebiasaan × 12,5 poin. Paling menahan skormu: <b style="color:var(--ink)">${esc(hs.weakest.label)}</b>.</p>
      <div class="stack" style="margin-top:12px;gap:10px">${pillars.map(pl => `<div><div class="lab">${pname[pl]}</div>${hs.ind.filter(i => i.pillar === pl).map(i => `<div class="row between tiny" style="margin-top:4px;flex-wrap:nowrap"><span>${esc(i.label)}</span><b class="num">${i.points.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}/12,5</b></div><div class="bar" aria-hidden="true"><i style="width:${Math.max(2, i.score * 100)}%;background:${i.score >= 1 ? 'var(--safe)' : i.score > 0 ? 'var(--stretch)' : 'var(--danger)'}"></i></div>`).join('')}</div>`).join('')}</div></div>
    </div>
   </section>
   <section class="sec">${secHead(3, 's3', 'Ke mana uangmu pergi', 'Pemasukan, pengeluaran, dan kapan uangmu menipis dalam sebulan.')}
    <div class="grid g-side" style="align-items:start">
     <div class="panel"><div class="row between"><h3>Pengeluaran per bulan</h3><button class="btn ghost sm" data-act="import">Impor mutasi (CSV)</button></div>
      <div class="stack" style="margin-top:12px;gap:9px">${rows.map(r => `<div><div class="row between small"><span>${esc(r.name)} ${kindPill(r.kind)}</span><b class="num">${rp(r.amount)}</b></div><div class="bar" style="margin-top:4px" aria-hidden="true"><i style="width:${(r.amount / maxBar * 100).toFixed(1)}%;background:${r.kind === 'need' ? 'var(--green)' : r.kind === 'want' ? 'var(--amber-strong)' : 'var(--muted)'}"></i></div></div>`).join('') || '<p class="small muted">Belum ada pengeluaran.</p>'}</div>
      <div class="hr" style="margin:14px 0"></div>
      <div class="lab" style="margin-bottom:6px">Dibanding pedoman ${term('50/30/20')}</div>
      <div class="zbar" style="height:16px" aria-hidden="true"><i style="width:${Math.min(100, sp5.need * 100)}%;background:var(--green)"></i><i style="width:${Math.min(100, sp5.want * 100)}%;background:var(--amber-strong)"></i><i style="width:${Math.min(100, sp5.debt * 100)}%;background:var(--muted)"></i><i style="width:${Math.min(100, sp5.save * 100)}%;background:var(--safe)"></i></div>
      <div class="row small" style="margin-top:6px;gap:14px"><span><b>${pct(sp5.need, 0)}</b> ${f.total ? 'pengeluaran (belum dirinci)' : 'pokok (≤50%)'}</span>${f.total ? '' : `<span><b>${pct(sp5.want, 0)}</b> keinginan (≤30%)</span>`}${sp5.debt ? `<span><b>${pct(sp5.debt, 0)}</b> cicilan</span>` : ''}<span><b>${pct(sp5.save, 0)}</b> sisa (≥20%)</span></div></div>
     <div class="stack">
      <div class="panel"><div class="row between"><h3>Pemasukan</h3><b class="num">${rp(f.inc)}</b></div>
       <div class="stack" style="margin-top:10px;gap:8px">${p.incomes.map(i => `<div class="row between small"><div><b>${esc(i.label)}</b> <span class="pill ${i.type === 'tetap' ? 'z-green' : 'z-amber'}">${i.type === 'tetap' ? 'Tetap' : 'Tidak tetap'}</span><div class="tiny muted">Masuk tanggal ${i.payday || 1}</div></div><b class="num">${rp(i.amount)}</b></div>`).join('')}</div></div>
      <div class="panel"><h3>${term('Daya tahan uang')}</h3><p class="small muted" style="margin-top:4px">${run ? `Dengan pola sekarang, uangmu habis sekitar <b style="color:var(--danger)">tanggal ${run.date}</b>, sebelum uang masuk berikutnya.` : 'Uangmu cukup sampai uang masuk berikutnya.'}</p>
       ${monthStrip([...p.incomes.map(i => ({ day: i.payday || 1, label: 'Masuk', color: 'var(--safe)' })), ...p.loans.map(l => ({ day: l.dueDay, label: 'Cicilan', color: 'var(--amber)' })), ...(run ? [{ day: run.date, label: 'Habis', color: 'var(--danger)' }] : [])])}</div>
     </div>
    </div>
   </section>
   <section class="sec">${secHead(4, 's4', 'Rencana FinWise', 'Langkah konkret bulan ini. Matikan yang tidak cocok; dampaknya langsung dihitung ulang.')}
    ${planCard(base, acts, planned)}
    ${cuts.length ? `<div class="panel" style="margin-top:14px"><h3>Saran hemat per pos</h3><div class="stack small" style="margin-top:8px;gap:6px">${cuts.map(c => `<div class="row between"><span>${esc(c.cat)}</span><span class="num">${rps(c.from)} → <b>${rps(c.to)}</b> <span class="tiny muted">(hemat ${rps(c.save)})</span></span></div>`).join('')}</div><p class="small" style="margin-top:8px">Total hemat <b>${rp(cutSum)} per bulan</b>.</p></div>` : ''}
   </section>
   <section class="sec">${secHead(5, 's5', 'Sebelum beli atau pinjam', 'Cek apakah penawaran paylater/cicilan muat, atau rencanakan tujuan tanpa utang.')}
    <div class="grid g2" style="align-items:start">
     <div class="panel"><h3>Cek penawaran cicilan</h3>
      <div class="grid g2" style="margin-top:10px">
       <label class="f">Harga / pokok${rpInput('o-amount', off.amount, 'data-k="cek.offer.amount" data-t="rpn" placeholder="mis. 3.000.000"')}</label>
       <label class="f">${term('Tenor')} (bulan)<input class="in num" id="o-months" type="number" min="1" max="36" value="${blankNum(off.months)}" placeholder="mis. 6" data-k="cek.offer.months" data-t="intn"></label>
       <label class="f">Bunga (%)<input class="in num" id="o-rate" inputmode="decimal" value="${off.rate == null ? '' : (off.rate * 100).toLocaleString('id-ID', { maximumFractionDigits: 3 })}" placeholder="mis. 3" data-k="cek.offer.rate" data-t="pctn"></label>
       <label class="f">Satuan<select class="in" id="o-unit" data-k="cek.offer.unit" data-t="text"><option value="month" ${off.unit === 'month' ? 'selected' : ''}>% per bulan</option><option value="day" ${off.unit === 'day' ? 'selected' : ''}>% per hari</option></select></label>
      </div>
      ${offReady ? `<dl class="kv" style="margin-top:12px"><div><dt>Cicilan per bulan</dt><dd>${rp(L.inst)}</dd></div><div><dt>Total dibayar</dt><dd>${rp(L.repay + L.fee)}</dd></div><div><dt>${term('Bunga efektif', 'Bunga sebenarnya per tahun')}</dt><dd>${pct(L.ear, 0)}</dd></div><div><dt>Sisa uangmu setelahnya</dt><dd style="color:${zO.left < 0 ? 'var(--danger)' : 'var(--safe)'}">${rp(zO.left, { plus: true })} ${zpill(zO.zone)}</dd></div></dl>
       ${zO.zone === 'danger' ? `<div class="note danger small" style="margin-top:10px">Penawaran ini membuat arus kasmu minus atau porsi cicilanmu di atas 40%. Untuk kebutuhan mendesak, coba <a href="#pilah" data-act="to-pilah" data-amount="${off.amount}">tangga dana di PILAH</a>.</div>` : zO.zone === 'stretch' ? '<div class="note amber small" style="margin-top:10px">Masih bisa dibayar, tapi mepet. Pertimbangkan menabung dulu.</div>' : '<div class="note safe small" style="margin-top:10px">Masih dalam batas aman.</div>'}` : '<p class="small muted" style="margin-top:10px">Isi harga, tenor, dan bunga untuk melihat cicilan dan bunga sebenarnya. Mau versi lengkap dengan slider? <a href="#kalkulator">Buka kalkulator</a>.</p>'}</div>
     <div class="panel"><h3>Tujuan tanpa utang</h3>
      <div class="grid g2" style="margin-top:10px"><label class="f">Tujuan<input class="in" id="g-label" value="${esc(st.goal.label)}" placeholder="mis. Laptop, dana darurat" data-k="cek.goal.label" data-t="text"></label><label class="f">Target${rpInput('g-amount', st.goal.amount, 'data-k="cek.goal.amount" data-t="rpn" placeholder="mis. 6.000.000"')}</label></div>
      ${!goalReady ? `<p class="small" style="margin-top:10px">Belum punya tujuan? Saran: <b>${term('Dana darurat', 'dana darurat')} ${f.efTarget} bulan = ${rp(suggestGoal)}</b>. <button class="btn ghost sm" data-act="goal-suggest" data-v="${suggestGoal}" ${suggestGoal > 0 ? '' : 'disabled'}>Pakai saran ini</button></p>`
       : `<dl class="kv" style="margin-top:12px"><div><dt>Ditabung per bulan (setelah rencana)</dt><dd>${rp(saveM)}</dd></div><div><dt>Target tercapai</dt><dd>${saveM > 0 ? 'bulan ke-' + gp.months + (gp.months >= 120 ? '+' : '') : 'tambah sisa uang dulu'}</dd></div></dl>`}</div>
    </div>
   </section>
   <div class="nextbar"><span>Langkah berikutnya</span><a class="btn" href="#pilah">Butuh dana? Ke PILAH</a>${p.loans.length ? '<a class="btn ghost" href="#pulih">Atur cicilan di PULIH</a>' : ''}<a class="btn ghost" href="#openspace">Cek legalitas pinjol</a></div>`;
}
