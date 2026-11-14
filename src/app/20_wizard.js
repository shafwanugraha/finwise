/* ================= ONBOARDING: "Data saya" from scratch ================= */
const WSTEPS = ['Tentang kamu', 'Pemasukan', 'Pengeluaran', 'Utang', 'Tabungan & riwayat'];
const LOAN_TYPES = [['paylater', 'Paylater', 0.026], ['kpr', 'KPR / cicilan rumah', 0.008], ['pindar', 'Pindar / pinjol', 0.09], ['kartu kredit', 'Kartu kredit', 0.0175], ['multifinance', 'Kredit motor/HP (multifinance)', 0.016], ['bank', 'Bank / KTA', 0.012], ['koperasi', 'Koperasi', 0.01], ['keluarga', 'Keluarga / teman', 0], ['lainnya', 'Lainnya', 0.02]];
const fid = path => 'sy-' + path.replace(/\./g, '-');
const fErr = path => S.wiz.errors[path] ? `<span class="ferr" id="${fid(path)}-err">${esc(S.wiz.errors[path])}</span>` : '';
const fAttr = path => `id="${fid(path)}" data-sy="${path}"${S.wiz.errors[path] ? ` aria-invalid="true" aria-describedby="${fid(path)}-err"` : ''}`;
function radios(path, opts, legend, val, hint = '') {
  const cur = val === true ? '1' : val === false ? '0' : val == null ? '' : String(val);
  const isBool = opts.every(o => o[0] === '1' || o[0] === '0');
  return `<fieldset class="wq"${S.wiz.errors[path] ? ` aria-describedby="${fid(path)}-err"` : ''}><legend>${legend}</legend>${hint ? `<div class="tiny muted">${hint}</div>` : ''}<div class="choice">${opts.map(([v, l], i) => `<label><input type="radio" name="${fid(path)}" id="${fid(path)}-${i}" value="${v}" data-sy="${path}" data-t="${isBool ? 'bool1' : 'text'}" ${cur === v ? 'checked' : ''}${S.wiz.errors[path] ? ' aria-invalid="true"' : ''}><span>${l}</span></label>`).join('')}</div>${fErr(path)}</fieldset>`;
}
const YN = [['1', 'Ya'], ['0', 'Tidak']];
function wizValidate(step, p) {
  const e = {}, okDay = d => d >= 1 && d <= 31;
  if (step === 0) { if (!p.stage) e.stage = 'Pilih salah satu.'; if (!p.stability) e.stability = 'Pilih salah satu.'; }
  if (step === 1) {
    p.incomes.forEach((r, i) => {
      if (r.amount > 0) { if (!okDay(r.payday)) e[`incomes.${i}.payday`] = 'Isi tanggal 1–31.'; if (!r.type) e[`incomes.${i}.type`] = 'Pilih tetap atau tidak tetap.'; }
      else if (r.label || r.payday || r.type) e[`incomes.${i}.amount`] = 'Isi jumlahnya, atau hapus baris ini.';
    });
    if (!p.incomes.some(r => r.amount > 0) && !e['incomes.0.amount']) e['incomes.0.amount'] = 'Isi minimal satu pemasukan per bulan.';
  }
  if (step === 2) {
    if (!p.spendMode) e.spendMode = 'Pilih cara mengisi pengeluaran.';
    else if (p.spendMode === 'total') { if (!(p.totalSpend > 0)) e.totalSpend = 'Isi perkiraan total pengeluaranmu per bulan.'; }
    else {
      p.items.forEach((c, i) => {
        if (c.amount == null) e[`items.${i}.amount`] = 'Wajib diisi. Tulis 0 jika tidak ada.';
        if (c.day != null && !okDay(c.day)) e[`items.${i}.day`] = 'Tanggal 1–31.';
        if (c.custom && !String(c.name || '').trim()) e[`items.${i}.name`] = 'Beri nama pos ini.';
      });
      if (!Object.keys(e).length && !p.items.some(c => c.amount > 0)) e._step = 'Semua pos bernilai 0. Isi minimal satu pengeluaran.';
    }
    if (p.familyAns == null) e.familyAns = 'Pilih Ya atau Tidak.';
    else if (p.familyAns && !(p.family > 0)) e.family = 'Isi jumlah per bulan.';
  }
  if (step === 3) {
    if (p.hasLoans == null) e.hasLoans = 'Pilih Ya atau Tidak.';
    else if (p.hasLoans) {
      if (!p.loans.length) e._step = 'Tambahkan minimal satu utang, atau pilih Tidak.';
      p.loans.forEach((l, i) => {
        if (!String(l.name || '').trim()) e[`loans.${i}.name`] = 'Isi nama.';
        if (!l.type) e[`loans.${i}.type`] = 'Pilih jenis.';
        if (!(l.instalment > 0)) e[`loans.${i}.instalment`] = 'Isi cicilan per bulan.';
        if (!okDay(l.dueDay)) e[`loans.${i}.dueDay`] = 'Tanggal 1–31.';
        if (!(l.months >= 1)) e[`loans.${i}.months`] = 'Minimal 1.';
      });
    }
  }
  if (step === 4) {
    if (p.emergencyFund == null) e.emergencyFund = 'Isi jumlahnya (tulis 0 jika belum ada).';
    if (p.savingMonthly == null) e.savingMonthly = 'Isi jumlahnya (tulis 0 jika tidak menabung).';
    ['onTimeAns', 'slik', 'pinjolExp', 'insurance', 'plan', 'access.koperasi', 'access.bank'].forEach(k => { if (k.split('.').reduce((o, x) => o?.[x], p) == null) e[k] = 'Pilih salah satu.'; });
  }
  return e;
}
// the engine reads p.spending; it is built from either the itemised list or the single total estimate
function syncSpending(p) {
  if (p.spendMode === 'total') p.spending = [{ id: 'tot', name: 'Total pengeluaran (perkiraan)', kind: 'total', amount: p.totalSpend || 0 }];
  else p.spending = (p.items || []).filter(c => !c.custom || String(c.name || '').trim()).map(c => ({ id: c.id, name: c.name, kind: c.kind, amount: c.amount || 0, day: c.day || null }));
}
function wizFinalize(p) {
  p.name = p.nick || 'Kamu';
  p.incomes = p.incomes.filter(r => r.amount > 0).map((r, i) => ({ ...r, label: r.label.trim() || 'Pemasukan ' + (i + 1) }));
  syncSpending(p);
  p.family = p.familyAns ? p.family : 0;
  p.onTime = p.onTimeAns !== 'tidak';
  if (!p.hasLoans) p.loans = [];
  p.loans.forEach(l => { const g = LOAN_TYPES.find(t => t[0] === l.type); if (l.rateIn == null) { l.rateMonthly = g ? g[2] : 0.02; l.rateGuess = true; } else { l.rateMonthly = l.rateIn; l.rateGuess = false; } l.outstanding = l.instalment * l.months; });
  p.setup = true; p.wstep = 4;
}
function vMulai() {
  const p = S.profiles.saya, w = S.wiz, k = Math.min(w.step, 4), err = w.errors;
  const errCount = Object.keys(err).length;
  const rpField = (path, val, label, ph = '0', extra = '') => `<label class="f">${label}${rpInput(fid(path), val, `data-sy="${path}" data-t="rpn" placeholder="${ph}"${err[path] ? ` aria-invalid="true" aria-describedby="${fid(path)}-err"` : ''} ${extra}`)}${fErr(path)}</label>`;
  const head = `<div class="phead"><div><div class="eyebrow e-cek">DATA SAYA · LANGKAH ${k + 1} DARI ${WSTEPS.length}</div><h1 tabindex="-1">${p.setup ? 'Ubah datamu' : 'Isi datamu, mulai dari nol'}</h1><p>Semua kolom kosong dan tidak ada jawaban yang dipilihkan. Tidak tahu angka pastinya? Pakai perkiraan rata-rata 3 bulan terakhir.</p></div>
    <div class="note small" style="max-width:340px"><b>Privasi:</b> data ini hanya tersimpan di browser ini dan tidak dikirim ke mana pun. ${w.confirmWipe ? `<span class="row" style="margin-top:6px"><button class="btn danger sm" data-act="wiz-wipe" data-v="2">Ya, hapus semua</button><button class="btn ghost sm" data-act="wiz-wipe" data-v="0">Batal</button></span>` : `<button class="linkbtn" data-act="wiz-wipe" data-v="1">Hapus semua data saya</button>`}</div></div>
   <div class="wprog" aria-hidden="true"><i style="width:${((k + (p.setup ? 1 : 0)) / WSTEPS.length * 100).toFixed(0)}%"></i></div>
   <ol class="wsteps" aria-label="Langkah pengisian">${WSTEPS.map((t, i) => `<li class="${i === k ? 'on' : i < k ? 'done' : ''}" ${i === k ? 'aria-current="step"' : ''}>${i < k || p.setup ? `<button class="linkbtn" data-act="wiz-goto" data-v="${i}">${i + 1}. ${t}</button>` : `<span>${i + 1}. ${t}</span>`}</li>`).join('')}</ol>
   ${errCount ? `<div class="note danger" role="alert" id="wiz-errors" tabindex="-1" style="margin-bottom:14px"><b>Ada ${errCount} isian yang perlu dilengkapi.</b> ${err._step ? esc(err._step) : 'Lihat tanda merah di bawah.'}</div>` : ''}`;
  let body = '';
  if (k === 0) body = `<div class="card stack" style="max-width:760px">
    <label class="f">Nama panggilan <span class="tiny muted">(opsional, hanya untuk sapaan)</span><input class="in" ${fAttr('nick')} data-t="text" value="${esc(p.nick)}" placeholder="mis. Rani" autocomplete="nickname" maxlength="30"></label>
    ${radios('stage', STAGES, 'Mana yang paling menggambarkan kamu sekarang?', p.stage)}
    ${radios('stability', STABILITY, 'Seberapa stabil penghasilanmu dari bulan ke bulan?', p.stability, 'Dipakai untuk menentukan target dana daruratmu (3 atau 6 bulan) dan seberapa hati-hati batas cicilanmu.')}
   </div>`;
  if (k === 1) body = `<div class="card stack" style="max-width:900px"><h2 style="font-size:1.2rem">Uang yang masuk setiap bulan</h2><p class="small muted">Gaji, uang saku, hasil usaha, freelance, kiriman keluarga. Untuk pemasukan yang naik-turun, pakai rata-rata.</p>
    ${p.incomes.map((r, i) => `<div class="wrow"><div class="grid g4" style="align-items:start">
      <label class="f">Sumber<input class="in" ${fAttr(`incomes.${i}.label`)} data-t="text" value="${esc(r.label)}" placeholder="mis. Gaji, uang saku"></label>
      ${rpField(`incomes.${i}.amount`, r.amount, 'Jumlah per bulan')}
      <label class="f">Tanggal masuk<input class="in" type="number" min="1" max="31" inputmode="numeric" ${fAttr(`incomes.${i}.payday`)} data-t="intn" value="${blankNum(r.payday)}" placeholder="1–31">${fErr(`incomes.${i}.payday`)}</label>
      ${radios(`incomes.${i}.type`, [['tetap', 'Tetap'], ['tidak tetap', 'Tidak tetap']], 'Jenis', r.type)}
     </div>${p.incomes.length > 1 ? `<button class="btn ghost sm" data-act="wiz-del" data-list="incomes" data-i="${i}">Hapus pemasukan ${i + 1}</button>` : ''}</div>`).join('')}
    <div><button class="btn ghost sm" data-act="wiz-add" data-list="incomes">+ Tambah pemasukan</button></div>
   </div>`;
  if (k === 2) {
    const itemsSum = FW.sum(p.items, c => c.amount);
    body = `<div class="card stack" style="max-width:920px"><h2 style="font-size:1.2rem">Pengeluaran rata-rata per bulan</h2>
    ${radios('spendMode', [['rinci', 'Rinci per pos (disarankan)'], ['total', 'Perkiraan total saja']], 'Mau isi seperti apa?', p.spendMode, 'Rincian per pos membuat FinWise bisa memisahkan kebutuhan pokok dan keinginan, lalu memberi saran hemat per pos. Kamu bisa mulai dari total dan merinci nanti.')}
    ${p.spendMode === 'total' ? `<div class="grid g2">${rpField('totalSpend', p.totalSpend, 'Total pengeluaran per bulan', 'mis. 4.000.000')}<p class="small muted" style="align-self:center">Di luar cicilan utang dan kiriman ke keluarga (keduanya ditanya terpisah).</p></div>
      <div class="note amber small">Dengan total saja, FinWise belum bisa melihat pos mana yang boros. Hasilmu akan memberi saran umum; rinci kapan saja untuk saran per pos.</div>` : ''}
    ${p.spendMode === 'rinci' ? `<div class="row between"><p class="small muted">Semua pos wajib diisi. Tulis <b>0</b> jika tidak ada. Tanggal bayar opsional.</p><button class="btn ghost sm" data-act="import">Isi dari mutasi rekening (CSV)</button></div>
    <div class="tbl-wrap"><table><caption class="sr">Pengeluaran bulanan per pos</caption><thead><tr><th scope="col">Pos</th><th scope="col">Jenis</th><th scope="col">Jumlah per bulan</th><th scope="col">Tgl bayar (opsional)</th><th scope="col"><span class="sr">Aksi</span></th></tr></thead><tbody>
     ${p.items.map((c, i) => `<tr><td>${c.custom ? `<label class="sr" for="${fid(`items.${i}.name`)}">Nama pos</label><input class="in" ${fAttr(`items.${i}.name`)} data-t="text" value="${esc(c.name)}" placeholder="Nama pos">${fErr(`items.${i}.name`)}` : `<b id="${fid(`items.${i}`)}-lbl">${esc(c.name)}</b>`}</td>
      <td>${c.custom ? `<label class="sr" for="${fid(`items.${i}.kind`)}">Jenis</label><select class="in" ${fAttr(`items.${i}.kind`)} data-t="text"><option value="need" ${c.kind === 'need' ? 'selected' : ''}>Pokok</option><option value="want" ${c.kind === 'want' ? 'selected' : ''}>Keinginan</option></select>` : `<span class="pill ${c.kind === 'need' ? 'z-green' : 'z-amber'}">${c.kind === 'need' ? 'Pokok' : 'Keinginan'}</span>`}</td>
      <td style="min-width:160px">${rpInput(fid(`items.${i}.amount`), c.amount, `data-sy="items.${i}.amount" data-t="rpn" placeholder="wajib, 0 jika tidak ada" ${c.custom ? 'aria-label="Jumlah per bulan"' : `aria-labelledby="${fid(`items.${i}`)}-lbl"`}${err[`items.${i}.amount`] ? ` aria-invalid="true" aria-describedby="${fid(`items.${i}.amount`)}-err"` : ''}`)}${fErr(`items.${i}.amount`)}</td>
      <td style="width:110px">${c.fixed || c.custom ? `<input class="in" type="number" min="1" max="31" inputmode="numeric" ${fAttr(`items.${i}.day`)} data-t="intn" value="${blankNum(c.day)}" placeholder="–" aria-label="Tanggal bayar ${esc(c.name)}">${fErr(`items.${i}.day`)}` : ''}</td>
      <td>${c.custom ? `<button class="btn ghost sm" data-act="wiz-del" data-list="items" data-i="${i}" aria-label="Hapus pos ${esc(c.name || 'ini')}">×</button>` : ''}</td></tr>`).join('')}
    </tbody></table></div>
    <div class="row between"><button class="btn ghost sm" data-act="wiz-add" data-list="items">+ Tambah pos lain</button><span class="small">Total <b class="num">${rp(itemsSum)}</b> · pokok ${rps(FW.sum(p.items.filter(c => c.kind === 'need'), c => c.amount))} · keinginan ${rps(FW.sum(p.items.filter(c => c.kind === 'want'), c => c.amount))}</span></div>` : ''}
    <div class="hr"></div>
    ${radios('familyAns', YN, 'Apakah kamu rutin mengirim uang atau membantu keluarga setiap bulan?', p.familyAns)}
    ${p.familyAns ? `<div style="max-width:280px">${rpField('family', p.family, 'Jumlah per bulan')}</div>` : ''}
   </div>`;
  }
  if (k === 3) body = `<div class="card stack" style="max-width:980px">
    ${radios('hasLoans', YN, 'Apakah kamu sedang punya cicilan, paylater, atau utang yang masih berjalan?', p.hasLoans, 'Termasuk pinjaman ke keluarga atau teman yang punya jadwal bayar.')}
    ${p.hasLoans ? `${p.loans.map((l, i) => `<div class="wrow"><div class="grid g3" style="align-items:start">
      <label class="f">Nama<input class="in" ${fAttr(`loans.${i}.name`)} data-t="text" value="${esc(l.name)}" placeholder="mis. Paylater e-commerce">${fErr(`loans.${i}.name`)}</label>
      <label class="f">Jenis<select class="in" ${fAttr(`loans.${i}.type`)} data-t="text">${l.type ? '' : '<option value="" selected>Pilih</option>'}${LOAN_TYPES.map(t => `<option value="${t[0]}" ${l.type === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select>${fErr(`loans.${i}.type`)}</label>
      ${rpField(`loans.${i}.instalment`, l.instalment, 'Cicilan per bulan')}
      <label class="f">Tanggal jatuh tempo<input class="in" type="number" min="1" max="31" inputmode="numeric" ${fAttr(`loans.${i}.dueDay`)} data-t="intn" value="${blankNum(l.dueDay)}" placeholder="1–31">${fErr(`loans.${i}.dueDay`)}</label>
      <label class="f">Sisa berapa bulan<input class="in" type="number" min="1" max="360" inputmode="numeric" ${fAttr(`loans.${i}.months`)} data-t="intn" value="${blankNum(l.months)}" placeholder="mis. 6">${fErr(`loans.${i}.months`)}</label>
      <label class="f">Untuk apa pinjaman ini? <span class="tiny muted">(opsional)</span><select class="in" ${fAttr(`loans.${i}.purpose`)} data-t="text">${l.purpose ? '' : '<option value="" selected>Pilih</option>'}${[...PURPOSES.map(x => [x[0], x[1]]), ['lainnya', 'Lainnya / tidak ingat']].map(t => `<option value="${t[0]}" ${l.purpose === t[0] ? 'selected' : ''}>${t[1]}</option>`).join('')}</select></label>
      <label class="f">Bunga per bulan, % <span class="tiny muted">(opsional)</span><input class="in" inputmode="decimal" ${fAttr(`loans.${i}.rateIn`)} data-t="pctn" value="${l.rateIn == null ? '' : (l.rateIn * 100).toLocaleString('id-ID', { maximumFractionDigits: 3 })}" placeholder="tidak tahu? kosongkan"></label>
     </div><button class="btn ghost sm" data-act="wiz-del" data-list="loans" data-i="${i}">Hapus utang ${i + 1}</button></div>`).join('')}
     <div><button class="btn ghost sm" data-act="wiz-add" data-list="loans">+ Tambah utang</button></div>
     <p class="tiny muted">Bunga yang dikosongkan diisi perkiraan umum per jenis utang, hanya untuk menghitung urutan pelunasan di PULIH.</p>` : ''}
   </div>`;
  if (k === 4) body = `<div class="card stack" style="max-width:840px">
    <div class="grid g2">
     ${rpField('emergencyFund', p.emergencyFund, 'Tabungan / dana darurat yang bisa dipakai sekarang', 'tulis 0 jika belum ada')}
     ${rpField('savingMonthly', p.savingMonthly, 'Menabung rutin per bulan', 'tulis 0 jika tidak')}
    </div>
    ${radios('onTimeAns', [['ya', 'Ya, selalu'], ['tidak', 'Pernah telat'], ['belum', 'Belum punya tagihan']], 'Dalam 3 bulan terakhir, apakah semua tagihan dibayar tepat waktu?', p.onTimeAns)}
    ${radios('pinjolExp', PINJOL_EXP, 'Pernah memakai pinjol atau paylater?', p.pinjolExp)}
    ${radios('slik', [['lancar', 'Lancar'], ['kosong', 'Belum punya riwayat kredit'], ['tidaktahu', 'Belum pernah cek'], ['dpk', 'Pernah telat bayar (Kol 2)'], ['macet', 'Macet']], `Bagaimana status riwayat kreditmu di ${term('SLIK')} OJK?`, p.slik, 'Bisa dicek gratis lewat layanan iDebKu OJK.')}
    ${radios('insurance', YN, 'Punya BPJS Kesehatan atau asuransi kesehatan?', p.insurance)}
    ${radios('plan', YN, 'Punya target atau rencana keuangan yang sedang dijalankan?', p.plan)}
    ${radios('access.koperasi', YN, 'Bisa meminjam dari koperasi (kantor/komunitas)?', p.access.koperasi)}
    ${radios('access.bank', YN, 'Punya rekening dan bisa mengajukan pinjaman ke bank?', p.access.bank)}
   </div>`;
  const nav = `<div class="row" style="margin-top:16px">${k > 0 ? '<button class="btn ghost" data-act="wiz-back">Kembali</button>' : ''}<button class="btn" data-act="wiz-next">${k === 4 ? (p.setup ? 'Simpan & lihat hasil' : 'Selesai, lihat hasilku') : 'Lanjut'}</button>${p.setup && k < 4 ? '<button class="btn ghost" data-act="wiz-save">Simpan & lihat hasil</button>' : ''}<span class="tiny muted">Tersimpan otomatis di browser ini.</span></div>`;
  return head + body + nav;
}
function focusWizTop() { const h = document.querySelector('main h1'); if (h) { h.focus({ preventScroll: true }); } window.scrollTo(0, 0); }
// keep derived fields in sync when an already set-up profile is edited through the wizard
function wizFinalizeLight(p) {
  p.name = p.nick || 'Kamu'; syncSpending(p); p.family = p.familyAns ? (p.family || 0) : 0; if (p.onTimeAns) p.onTime = p.onTimeAns !== 'tidak';
  p.loans.forEach(l => { const g = LOAN_TYPES.find(t => t[0] === l.type); l.rateMonthly = l.rateIn != null ? l.rateIn : (g ? g[2] : 0.02); l.rateGuess = l.rateIn == null; l.outstanding = (l.instalment || 0) * (l.months || 0); });
}
function vNeedSetup() {
  return banner({ tone: 'green', eyebrow: 'MULAI DARI SINI', title: 'Isi datamu dulu', sub: 'Halaman ini menghitung dari angkamu sendiri. Semua kolom mulai kosong dan tidak ada jawaban yang dipilihkan; butuh sekitar 3 menit.', right: '<a class="btn amber big-btn" href="#mulai">Isi data saya</a>' })
   + `<div class="grid g3" style="margin-top:4px">${[['Privat', 'Data hanya tersimpan di browser ini. Bisa dihapus kapan saja.'], ['Mulai kosong', 'Tidak ada angka contoh. Boleh pakai perkiraan rata-rata 3 bulan.'], ['Langsung ada hasil', 'Setelah selesai, kamu dapat kesimpulan, rasio keuangan, dan rencana.']].map(([t, d]) => `<div class="panel"><b>${t}</b><p class="small muted" style="margin-top:4px">${d}</p></div>`).join('')}</div>`;
}

