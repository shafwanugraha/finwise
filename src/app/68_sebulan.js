/* ================= GAME · Babak 2 "Sebulan Bertahan" =================
   One month as Dimas, from payday to payday. The game decides which events happen and what each choice
   changes in a copy of his profile; every rupiah figure shown comes from the engine (FW) on that copy. */
const sbDebt = p => FW.sum(p.loans, l => l.outstanding);
const r10k = x => Math.round(x / 10000) * 10000;
const SB_SHOES = 750000, SB_LEAK = 700000, SB_CUT = 0.3;
function sbNew() {
  const p = clone(DATA.personas.dimas);
  return { i: 0, p, saldo: FW.surplus(p), stres: 30, need: null, flags: {}, picks: {}, out: null, done: false,
    start: { utang: sbDebt(p), sur: FW.surplus(p), ceiling: FW.headroom(p).ceiling, ef: p.emergencyFund } };
}
const sbProd = id => DATA.products.find(x => x.id === id);
function sbOffers(g) {
  return ['koperasi', 'tenang', 'cairkilat'].map(id => {
    const pr = sbProd(id);
    if (pr.illegal) return { pr, illegal: true, zone: 'danger' };
    const L = FW.loan({ principal: g.need, rate: pr.rate, unit: pr.unit, months: pr.months, feePct: pr.feePct || 0 });
    return { pr, L, zone: FW.zoneOf(g.p, L.inst).zone };
  });
}
function sbAddLoan(p, o) { p.loans.push({ id: 'g' + p.loans.length, dueDay: 10, rateMonthly: 0, ...o }); }
const sbStress = s => s < 35 ? 'tenang' : s < 65 ? 'waswas' : 'tertekan';
const SB_HINTS = {
  gajian: 'Uang yang pasti keluar (kebutuhan pokok, kiriman keluarga, cicilan) paling aman dipisah di hari gajian, sebelum terpakai.',
  flash: 'Cicilan “0%” tetap cicilan: porsi cicilan naik dan batas cicilan aman untuk kejadian mendadak turun.',
  rs: 'Tangga dana: pakai uang tanpa bunga dulu (dana darurat, bantuan keluarga), baru pinjam sisanya.',
  batas: 'Batas aman FinWise adalah yang lebih kecil dari dua angka: 30% gaji dikurangi cicilan lama, dan 70% sisa uang.',
  pilih: 'Bandingkan total biaya dan cocokkan dengan batas aman. Cair paling cepat bukan berarti paling aman, dan cek dulu izinnya.',
  tagih: 'Kalau uang kurang, hubungi pemberi pinjaman sebelum jatuh tempo. Telat bayar tercatat di SLIK.',
  teror: 'Penagih dilarang menghubungi orang selain peminjam. Simpan bukti dan laporkan.',
  akhir: 'Sisa uang di akhir bulan paling berguna untuk membangun lagi dana darurat.',
};
// events in order; `when` decides whether an event happens, `auto` resolves an event that has no real choice
const SB_EVENTS = [
  { id: 'gajian', day: 25, title: g => `Gajian masuk ${rp(FW.income(g.p))}`,
    text: g => `Bulan ini yang pasti keluar: kebutuhan pokok ${rp(FW.needs(g.p))}, kiriman keluarga ${rp(g.p.family)}, dan cicilan ${rp(FW.instalments(g.p))}. Sisa uang Dimas ${rp(FW.surplus(g.p))}.`,
    choices: () => [['kunci', 'Pisahkan dulu yang pasti keluar', 'Pindah ke rekening terpisah hari ini'], ['santai', 'Biarkan di satu rekening', 'Nanti juga cukup']],
    pick: (g, v) => v === 'kunci'
      ? (g.flags.locked = true, g.stres -= 5, { tone: 'safe', head: 'Uang yang pasti keluar sudah aman.', body: `Yang terlihat di rekening tinggal ${rp(g.saldo)}. Karena terlihat sedikit, belanja kecil ikut tertahan.` })
      : (g.flags.locked = false, { tone: 'amber', head: `${rp(FW.income(g.p))} terlihat di rekening.`, body: 'Terasa banyak. Kita lihat nanti apakah semuanya masih ada saat tagihan datang.' }) },
  { id: 'flash', day: 27, title: () => `Flash sale sepatu ${rps(SB_SHOES)}`,
    text: () => `Teman-teman kantor membeli sepatu lari yang sama. Ada pilihan paylater 3× ${rp(SB_SHOES / 3)}, katanya bunga 0%.`,
    choices: () => [['paylater', 'Ambil paylater 3×', `${rps(SB_SHOES / 3)} per bulan, 3 bulan`], ['tunai', 'Bayar tunai dari sisa uang', `${rps(SB_SHOES)} sekarang`], ['tunda', 'Masukkan wishlist dulu', 'Cek lagi 30 hari lagi']],
    pick: (g, v) => {
      if (v === 'paylater') {
        const c0 = FW.headroom(g.p).ceiling; sbAddLoan(g.p, { name: 'Paylater sepatu', type: 'paylater', instalment: SB_SHOES / 3, outstanding: SB_SHOES, months: 3, dueDay: 5 });
        const h = FW.headroom(g.p); g.flags.shoes = [c0, h.ceiling]; g.stres -= 5;
        return { tone: 'amber', head: 'Sepatu dibawa pulang. Cicilannya ikut.', body: `Cicilan Dimas naik jadi ${rp(h.ex)} per bulan (${pct(h.dsrNow, 0)} dari gaji). Batas cicilan amannya turun dari ${rp(c0)} jadi ${rp(h.ceiling)}. Bunga 0% tetap cicilan.` };
      }
      if (v === 'tunai') { g.saldo -= SB_SHOES; g.stres -= 5; return { tone: 'amber', head: 'Lunas di tempat.', body: `Tidak ada utang baru, tapi sisa uang bulan ini tinggal ${rp(g.saldo)} untuk kejadian mendadak.` }; }
      g.stres += 5; return { tone: 'safe', head: 'Belum beli.', body: `Kalau 30 hari lagi masih ingin dan uangnya ada, beli tanpa cicilan. Sisa uang tetap ${rp(g.saldo)}.` };
    } },
  { id: 'rs', day: 1, title: () => 'Ayah masuk rumah sakit',
    text: g => `Biaya yang harus disiapkan ${rp(g.p.need.amount)} dalam 3 hari. Dimas punya dana darurat ${rp(g.p.emergencyFund)}, dan ${g.p.need.familyFrom} bisa membantu ${rp(g.p.need.family)}. Dari mana dulu?`,
    choices: g => { const n = g.p.need, ef = g.p.emergencyFund; return [['tangga', 'Dana darurat dan bantuan kakak dulu, sisanya pinjam', `Pinjam ${rps(n.amount - ef - n.family)}`], ['darurat', 'Dana darurat saja, sisanya pinjam', `Pinjam ${rps(n.amount - ef)}`], ['pinjam', 'Pinjam semuanya, dana darurat jangan disentuh', `Pinjam ${rps(n.amount)}`]]; },
    pick: (g, v) => {
      const n = g.p.need, ef = g.p.emergencyFund; g.stres += 15; g.flags.ladder = v;
      if (v === 'pinjam') { g.need = n.amount; return { tone: 'danger', head: `Pinjam ${rp(g.need)}.`, body: `Dana darurat memang disiapkan untuk kejadian seperti ini. Tidak memakainya membuat pinjaman ${rp(ef + n.family)} lebih besar dari yang perlu, dan bunganya tetap jalan.` }; }
      g.p.emergencyFund = 0;
      if (v === 'darurat') { g.need = n.amount - ef; return { tone: 'amber', head: `Pinjam ${rp(g.need)}.`, body: `Bantuan ${n.familyFrom} ${rp(n.family)} tanpa bunga tidak dipakai, jadi pinjamannya ${rp(n.family)} lebih besar dari yang perlu.` }; }
      g.need = n.amount - ef - n.family; return { tone: 'safe', head: `Pinjamannya tinggal ${rp(g.need)}.`, body: 'Uang tanpa bunga dipakai dulu. Ini namanya tangga dana: makin kecil pinjamannya, makin kecil cicilan dan bunganya.' };
    } },
  { id: 'batas', day: 1, title: () => 'Berapa cicilan yang masih aman?',
    text: g => `Sebelum memilih pinjaman, cek batasnya dulu. Sisa uang Dimas sekarang ${rp(FW.surplus(g.p))} per bulan. Cicilan baru maksimal berapa supaya tetap aman?`,
    choices: g => { const c = FW.headroom(g.p).ceiling; return [['lo', rp(r10k(c * 0.43)), ''], ['ok', rp(c), ''], ['hi', rp(r10k(c * 2.15)), '']]; },
    pick: (g, v) => {
      const h = FW.headroom(g.p), ok = v === 'ok'; g.flags.headroomOk = ok;
      return { tone: ok ? 'safe' : 'amber', head: ok ? `Tepat: ${rp(h.ceiling)}.` : `Belum tepat. Batas amannya ${rp(h.ceiling)}.`,
        body: `FinWise mengambil yang lebih kecil dari dua angka: 30% gaji dikurangi cicilan lama (${rp(h.lens1)}) dan 70% sisa uang (${rp(h.lens2)}). Dengan tenor 12 bulan, pinjaman maksimal yang aman sekitar ${rp(FW.maxSafeLoan(g.p, 12))}.${g.flags.shoes ? ` Tanpa paylater sepatu, batasnya ${rp(g.start.ceiling)}.` : ''}` };
    } },
  { id: 'pilih', day: 2, title: g => `Pilih pinjaman ${rps(g.need)}`,
    text: () => 'Uangnya harus ada dalam 3 hari. Tiga tawaran masuk. Bandingkan, lalu pilih satu.',
    offers: true,
    pick: (g, v) => {
      const o = sbOffers(g).find(x => x.pr.id === v), others = sbOffers(g).filter(x => x.pr.id !== v && !x.illegal);
      g.chosen = { id: o.pr.id, name: o.pr.name, zone: o.zone };
      if (o.illegal) {
        const got = r10k(g.need * (1 - SB_CUT)), cut = g.need - got;
        g.saldo -= cut; g.flags.illegal = true; g.stres += 25;
        sbAddLoan(g.p, { name: o.pr.name, type: 'pindar', instalment: g.need, outstanding: g.need, months: 1, dueDay: 25 });
        return { tone: 'danger', head: 'Cair 5 menit, tapi tidak utuh.', body: `Yang masuk hanya ${rp(got)}; ${rp(cut)} dipotong sebagai “biaya layanan”, pola yang sering dilaporkan korban pinjol ilegal. Kekurangannya ditutup dari sisa uang. Seluruh ${rp(g.need)} harus kembali dalam 30 hari, dan aplikasinya sudah membaca kontak di HP Dimas.` };
      }
      sbAddLoan(g.p, { name: o.pr.name, type: o.pr.kind === 'koperasi' ? 'koperasi' : 'pindar', instalment: o.L.inst, outstanding: o.L.repay + o.L.fee, months: o.pr.months, rateMonthly: o.pr.unit === 'day' ? o.pr.rate * 30 : o.pr.rate });
      g.stres += { safe: 0, stretch: 10, danger: 20 }[o.zone];
      const cheaper = others.filter(x => x.L.total < o.L.total).sort((a, b) => a.L.total - b.L.total)[0], pricier = others.filter(x => x.L.total > o.L.total)[0];
      return { tone: { safe: 'safe', stretch: 'amber', danger: 'danger' }[o.zone], head: `${o.pr.name}: cicilan ${rp(o.L.inst)} per bulan.`,
        body: `Mulai bulan depan sisa uang Dimas jadi ${rp(FW.surplus(g.p), { plus: true })} per bulan. Total biaya pinjamannya ${rp(o.L.total)}${cheaper ? `, padahal ${cheaper.pr.name} hanya ${rp(cheaper.L.total)}` : pricier ? `; ${pricier.pr.name} akan memakan ${rp(pricier.L.total)}` : ''}.` };
    } },
  { id: 'tagih', day: 5, title: g => `Tagihan paylater jatuh tempo`,
    // what is due on the 5th beyond the planned budget: the new shoes instalment, plus small spending that leaked if nothing was set aside
    pre: g => { const extra = (g.flags.shoes ? SB_SHOES / 3 : 0) + (g.flags.locked ? 0 : SB_LEAK); g.saldo -= extra; return extra; },
    text: g => `Paylater lama ${rp(DATA.personas.dimas.loans.find(l => l.type === 'paylater').instalment)}${g.flags.shoes ? ` dan paylater sepatu ${rp(SB_SHOES / 3)}` : ''} jatuh tempo hari ini.${g.flags.locked ? '' : ` Ternyata ${rp(SB_LEAK)} sudah terpakai untuk jajan dan belanja kecil sejak gajian.`} ${g.saldo < 0 ? ` Uang Dimas kurang ${rp(-g.saldo)}.` : ''}`,
    choices: g => g.saldo >= 0 ? null : [['nego', 'Hubungi pemberi pinjaman sebelum jatuh tempo', 'Minta jadwal baru'], ['telat', 'Telat saja, bayar minggu depan', 'Kena denda'], ['gali', 'Pinjam di aplikasi lain untuk menutup', 'Cair 1 jam']],
    auto: g => ({ tone: 'safe', head: 'Semua tagihan tanggal 5 terbayar tepat waktu.', body: `${g.flags.locked ? 'Uangnya sudah dipisah sejak gajian, jadi tinggal dibayar. ' : ''}Sisa uang bulan ini ${rp(g.saldo)}. Riwayat kredit Dimas tetap lancar.` }),
    pick: (g, v) => {
      if (v === 'nego') { g.stres += 5; g.carry = -g.saldo; g.saldo = 0; return { tone: 'safe', head: 'Pemberi pinjaman setuju menggeser sebagian tagihan.', body: `Tidak semua mau, tapi peluangnya jauh lebih besar sebelum telat. Kekurangan ${rp(g.carry)} dibayar bulan depan dan riwayat kredit tetap lancar. Contoh pesannya ada di PULIH.` }; }
      if (v === 'telat') { g.stres += 15; g.p.slik = 'dpk'; g.p.onTime = false; g.flags.late = true; return { tone: 'danger', head: 'Telat 7 hari.', body: 'Denda keterlambatan bertambah, dan telat 1–90 hari tercatat di SLIK sebagai Kol 2 (dalam perhatian khusus). Catatan ini bisa menutup akses ke pinjaman murah seperti koperasi dan KUR.' }; }
      const pr = sbProd('pantas'), amt = Math.ceil(-g.saldo / 100000) * 100000, L = FW.loan({ principal: amt, rate: pr.rate, unit: pr.unit, months: pr.months });
      sbAddLoan(g.p, { name: pr.name, type: 'pindar', instalment: L.inst, outstanding: L.repay, months: pr.months, rateMonthly: pr.rate * 30 });
      g.saldo += amt; g.stres += 10; g.flags.dig = true;
      return { tone: 'danger', head: 'Lubang ditutup lubang baru.', body: `Pinjaman ${rp(amt)} menambah cicilan ${rp(L.inst)} per bulan selama ${pr.months} bulan, dengan biaya ${rp(L.total)}. Sisa uang Dimas bulan depan jadi ${rp(FW.surplus(g.p), { plus: true })}.` };
    } },
  { id: 'teror', day: 6, when: g => g.flags.illegal, title: () => 'Pesan masuk ke grup kantor',
    text: () => 'Penagih Cair Kilat mengirim pesan ke atasan dan teman-teman Dimas, padahal belum jatuh tempo. Isinya menyebut Dimas penipu.',
    choices: () => [['lapor', 'Simpan bukti dan lapor ke Kontak OJK 157', 'Telepon 157 atau WhatsApp 081-157-157-157'], ['bayar', 'Bayar seadanya supaya berhenti', 'Rp500 rb dari sisa uang'], ['diam', 'Diam saja, semoga berhenti', '']],
    pick: (g, v) => {
      if (v === 'lapor') { g.stres -= 5; return { tone: 'safe', head: 'Laporan masuk.', body: 'Menghubungi orang selain peminjam dan mempermalukannya dilarang (POJK 22/2023 Pasal 62). Bukti tangkapan layar membantu OJK dan Satgas PASTI menindak aplikasinya.' }; }
      if (v === 'bayar') { g.saldo -= 500000; g.stres += 10; return { tone: 'danger', head: 'Penagihan tidak berhenti.', body: 'Pinjol ilegal biasanya meminta lebih, karena tidak ada aturan yang mengikat mereka. Sisa uang Dimas makin tipis.' }; }
      g.stres += 20; return { tone: 'danger', head: 'Pesannya makin banyak.', body: 'Diam membuat penagih merasa aman. Simpan bukti dan laporkan; itu hakmu sebagai konsumen.' };
    } },
  { id: 'akhir', day: 24, title: () => 'Besok gajian lagi',
    text: g => g.saldo > 0 ? `Sisa uang bulan ini ${rp(g.saldo)}. Mau dipakai untuk apa?` : `Bulan ini Dimas tekor ${rp(-g.saldo)}. Apa langkahnya?`,
    choices: g => g.saldo > 0 ? [['darurat', 'Isi lagi dana darurat', `+${rps(g.saldo)}`], ['hadiah', 'Hadiah kecil untuk diri sendiri', 'Sudah sebulan berat']] : [['rencana', 'Susun rencana hemat bulan depan', 'Potong keinginan dulu'], ['pinjam', 'Tutup dengan pinjaman lagi', 'Biar cepat selesai']],
    pick: (g, v) => {
      if (v === 'darurat') { g.p.emergencyFund += g.saldo; g.saldo = 0; g.stres -= 5; const out = FW.spendTotal(g.p) + (g.p.family || 0) + FW.instalments(g.p);
        return { tone: 'safe', head: `Dana darurat jadi ${rp(g.p.emergencyFund)}.`, body: `Itu ${nf(g.p.emergencyFund / out, 1)} bulan pengeluaran. Targetnya 3 bulan: langkah kecil, tapi arahnya benar.` }; }
      if (v === 'hadiah') { g.saldo = 0; g.stres -= 10; return { tone: 'amber', head: 'Dimas lebih lega.', body: 'Tidak salah, asal dari sisa uang dan bukan dari utang. Dana daruratnya masih kosong, jadi kejadian mendadak berikutnya akan dibiayai pinjaman lagi.' }; }
      if (v === 'rencana') { g.stres -= 5; return { tone: 'safe', head: 'Rencana dibuat.', body: 'Persis yang ada di CEK: mulai dari pos keinginan, pisahkan uang yang pasti keluar saat gajian, lalu tanyakan jadwal ulang ke pemberi pinjaman sebelum jatuh tempo.' }; }
      g.stres += 10; g.flags.dig = true; return { tone: 'danger', head: 'Kekurangannya pindah ke bulan depan.', body: 'Pinjaman menutup tekor bulan ini, tapi cicilannya membuat bulan depan tekor lagi. Ini awal gali lubang tutup lubang.' };
    } },
];
const sbActive = g => SB_EVENTS.filter(e => !e.when || e.when(g));
// moves to the next event; events without a real choice resolve on entry
function sbEnter(g) {
  const evs = sbActive(g), ev = evs[g.i];
  if (!ev) { g.done = true; return; }
  if (ev.pre && !g.preDone?.[ev.id]) { g.preDone = { ...g.preDone, [ev.id]: true }; ev.pre(g); }
  if (ev.choices && !ev.choices(g) && ev.auto) { g.picks[ev.id] = 'auto'; g.out = { ...ev.auto(g), d: {} }; }
}
function sbPick(t, v) {
  const g = t.g, ev = sbActive(g)[g.i]; if (!ev || g.out) return;
  const before = { saldo: g.saldo, ef: g.p.emergencyFund, utang: sbDebt(g.p), stres: g.stres };
  const res = ev.pick(g, v); g.picks[ev.id] = v; g.stres = clamp100(g.stres);
  g.out = { ...res, d: { saldo: g.saldo - before.saldo, ef: g.p.emergencyFund - before.ef, utang: sbDebt(g.p) - before.utang, stres: g.stres - before.stres } };
  if (ev.id === 'rs') { t.marks.ladder = true; t.marks.ladderOk = v === 'tangga'; }
  if (ev.id === 'batas') { t.marks.headroom = true; t.marks.headroomOk = v === 'ok'; }
  if (ev.id === 'pilih') t.chosen = g.chosen;
}
const clamp100 = x => Math.max(0, Math.min(100, x));
function sbNext(g) { g.out = null; g.i++; sbEnter(g); }
// the safest path through the same month, played by the same rules, for the comparison at the end
function sbBest() {
  const g = sbNew(), t = { g, marks: {} }; sbEnter(g);
  const plan = { gajian: 'kunci', flash: 'tunda', rs: 'tangga', batas: 'ok', pilih: 'koperasi', akhir: 'darurat' };
  for (let k = 0; k < 12 && !g.done; k++) { const ev = sbActive(g)[g.i]; if (!g.out) sbPick(t, plan[ev.id]); sbNext(g); }
  return g;
}
function sbLessons(g) {
  const L = [], n = g.p.need;
  if (g.flags.shoes) L.push(`Paylater “0%” sepatu menurunkan batas cicilan aman Dimas dari ${rp(g.flags.shoes[0])} jadi ${rp(g.flags.shoes[1])}.`);
  if (g.flags.locked === false) L.push(`Uang yang tidak dipisah saat gajian bocor ${rp(SB_LEAK)} untuk belanja kecil.`);
  if (g.flags.ladder === 'tangga') L.push(`Tangga dana memotong pinjaman dari ${rps(n.amount)} jadi ${rps(g.need)}.`);
  else if (g.flags.ladder) L.push(`Tanpa tangga dana penuh, Dimas meminjam ${rp(g.need - (n.amount - g.start.ef - n.family))} lebih banyak dari yang perlu.`);
  if (g.flags.illegal) L.push('Pinjol ilegal memotong dana di muka dan menagih lewat kontak. Cek nama aplikasinya di Database Pinjol sebelum memberi data apa pun.');
  else if (g.chosen) { const o = sbOffers({ ...g, p: DATA.personas.dimas }); const k = o.find(x => x.pr.id === 'koperasi'), tk = o.find(x => x.pr.id === 'tenang'); if (k && tk) L.push(`Untuk ${rps(g.need)}, koperasi memakan biaya ${rps(k.L.total)}; pindar ${rps(tk.L.total)}.`); }
  if (g.flags.late) L.push('Telat bayar tercatat di SLIK dan bisa menutup akses ke pinjaman murah.');
  if (g.flags.dig) L.push('Meminjam untuk menutup cicilan memperbesar tekor bulan berikutnya.');
  return L.slice(0, 4);
}
function sbMeters(g) {
  const s = g.stres, debt = sbDebt(g.p);
  const m = [['Sisa uang bulan ini', rp(g.saldo, { plus: g.saldo < 0 }), g.saldo < 0 ? 'danger' : g.saldo < 300000 ? 'stretch' : 'safe', Math.max(0, Math.min(100, g.saldo / g.start.sur * 100))],
    ['Dana darurat', rp(g.p.emergencyFund), g.p.emergencyFund > 0 ? 'safe' : 'stretch', Math.min(100, g.p.emergencyFund / g.start.ef * 100)],
    ['Total utang', rp(debt), debt > g.start.utang * 1.4 ? 'danger' : debt > g.start.utang ? 'stretch' : 'safe', Math.min(100, debt / (g.start.utang * 2) * 100)],
    ['Stres', `${s}/100 · ${sbStress(s)}`, s >= 65 ? 'danger' : s >= 35 ? 'stretch' : 'safe', s]];
  return `<div class="sb-meters" role="group" aria-label="Kondisi Dimas">${m.map(([k, v, z, w]) => `<div class="sbm"><div class="k">${k}</div><div class="v num">${v}</div><div class="bar" aria-hidden="true"><i style="width:${w.toFixed(0)}%;background:var(--${z})"></i></div></div>`).join('')}</div>`;
}
const SB_DELTA = { saldo: 'Sisa uang', ef: 'Dana darurat', utang: 'Utang', stres: 'Stres' };
function sbView(t) {
  const g = t.g, evs = sbActive(g);
  const days = `<ol class="sb-days" aria-label="Hari dalam sebulan">${evs.map((e, i) => `<li class="${i < g.i || g.done ? 'done' : i === g.i ? 'on' : ''}" ${i === g.i && !g.done ? 'aria-current="step"' : ''}><span>tgl</span>${e.day}</li>`).join('')}</ol>`;
  if (g.done) return days + sbMeters(g) + sbReport(t);
  const ev = evs[g.i], ch = ev.choices ? ev.choices(g) : null;
  const body = ev.offers && !g.out ? `<div class="grid g3 sb-offers">${sbOffers(g).map(o => `<div class="opt sb-offer"><div class="row between"><b>${esc(o.pr.name)}</b>${o.illegal ? '<span class="pill z-danger">Tidak berizin</span>' : zpill(o.zone)}</div>
      <p class="tiny muted">${o.illegal ? 'Tidak ada di daftar OJK · minta akses kontak dan galeri' : o.pr.kind === 'koperasi' ? 'Koperasi tempat Dimas bekerja' : 'Pindar berizin OJK'} · cair ${o.illegal ? '5 menit' : FW.hoursLabel(o.pr.hours)}</p>
      ${o.illegal ? '<div class="facts f2"><div><div class="k">Bunga</div><div class="v">tidak dijelaskan</div></div><div><div class="k">Syarat</div><div class="v">cukup KTP</div></div></div>' : `<div class="facts f2"><div><div class="k">Cicilan</div><div class="v">${rp(o.L.inst)}/bln</div></div><div><div class="k">Total biaya</div><div class="v">${rp(o.L.total)}</div></div></div><p class="tiny muted">${o.pr.months} bulan · ${o.pr.unit === 'day' ? nf(o.pr.rate * 100, 2) + '%/hari' : nf(o.pr.rate * 100, 1) + '%/bulan'}</p>`}
      <button class="btn sm ${o.illegal ? 'ghost' : ''}" data-act="sb-pick" data-v="${o.pr.id}">Pilih ${esc(o.pr.name)}</button></div>`).join('')}</div>`
    : !g.out && ch ? `<div class="sb-choices">${ch.map(([v, l, sub]) => `<button class="sb-choice" data-act="sb-pick" data-v="${v}"><b>${esc(l)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</button>`).join('')}</div>` : '';
  const d = g.out ? Object.entries(g.out.d).filter(([, x]) => Math.round(x)) : [];
  const out = g.out ? `<div class="sb-out note ${g.out.tone}" aria-live="polite"><h3 id="sb-out" tabindex="-1">${esc(g.out.head)}</h3><p class="small">${esc(g.out.body)}</p>
      ${d.length ? `<ul class="sb-delta">${d.map(([k, x]) => `<li class="${(k === 'saldo' || k === 'ef') === x > 0 ? 'up' : 'down'}">${SB_DELTA[k]} ${k === 'stres' ? (x > 0 ? '+' : '−') + Math.abs(x) : (x > 0 ? '+' : '−') + rps(Math.abs(x))}</li>`).join('')}</ul>` : ''}
      <button class="btn amber" data-act="sb-next">${g.i === evs.length - 1 ? 'Lihat laporan akhir bulan' : 'Lanjut'}</button></div>` : '';
  return days + sbMeters(g) + `<article class="card sb-card"><p class="sb-date">Tanggal ${ev.day}</p><h2 id="sb-h" tabindex="-1">${esc(ev.title(g))}</h2><p style="margin-top:6px">${esc(ev.text(g))}</p>${body}${out}</article>`;
}
function sbReport(t) {
  const g = t.g, p = g.p, H = FW.health(p), R = FW.readiness(p), h = FW.headroom(p), best = sbBest(), BR = FW.readiness(best.p);
  const row = (k, a, b) => `<tr><td>${k}</td><td class="num"><b>${a}</b></td><td class="num">${b}</td></tr>`;
  return `<article class="card sb-card"><p class="sb-date">Laporan akhir bulan</p><h2 id="sb-h" tabindex="-1">Dimas ${g.stres >= 65 ? 'bertahan, tapi tertekan' : FW.surplus(p) < 0 ? 'bertahan, tapi bulan depan tekor' : 'lolos bulan ini'}</h2>
    <p class="small muted" style="margin-top:4px">Angka dihitung mesin FinWise dari keadaan Dimas setelah semua pilihanmu, dibanding jalur paling aman untuk bulan yang sama.</p>
    <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th></th><th>Pilihanmu</th><th>Jalur paling aman</th></tr></thead><tbody>
     ${row('Kondisi keuangan', `${H.total}/100 · ${H.status}`, `${FW.health(best.p).total}/100`)}
     ${row(term('Kesiapan berutang'), READY[R.level].name, READY[BR.level].name)}
     ${row('Sisa uang bulan depan', rp(FW.surplus(p), { plus: true }), rp(FW.surplus(best.p), { plus: true }))}
     ${row(term('Porsi cicilan'), pct(h.dsrNow, 0), pct(FW.headroom(best.p).dsrNow, 0))}
     ${row('Total utang', rp(sbDebt(p)), rp(sbDebt(best.p)))}
     ${row('Stres', `${g.stres}/100`, `${best.stres}/100`)}
    </tbody></table></div>
    <h3 style="margin-top:16px">Yang terjadi bulan ini</h3><ul class="small sb-lessons">${sbLessons(g).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="tiny muted" style="margin-top:8px">Jalur paling aman: pisahkan uang saat gajian, tunda sepatu, pakai tangga dana, pinjam ${rps(best.need)} di koperasi, sisa uang ke dana darurat.</p>
    <div style="margin-top:14px"><button class="btn amber" data-act="t-next">Lanjut ke Babak 3</button></div></article>`;
}
