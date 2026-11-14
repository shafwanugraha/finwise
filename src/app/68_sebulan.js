/* ================= GAME · Babak 2 "Sebulan Bertahan" =================
   One month as Dimas, payday to payday, told as phone notifications. Each event is a short line and a few big
   buttons or a small mini-game (envelopes, fund blocks, a slider, red flags in an ad). The longer explanation sits
   behind "Kenapa?". Every rupiah figure comes from the engine (FW) on a copy of his profile. */
const sbDebt = p => FW.sum(p.loans, l => l.outstanding);
const r10k = x => Math.round(x / 10000) * 10000;
const SB_SHOES = 750000, SB_LEAK = 700000, SB_CUT = 0.3, SB_FLAG_MS = 12000;
function sbNew() {
  const p = clone(DATA.personas.dimas);
  return { i: 0, p, saldo: FW.surplus(p), stres: 30, need: null, flags: {}, picks: {}, out: null, done: false, env: {}, blk: {}, flg: {},
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
const clamp100 = x => Math.max(0, Math.min(100, x));
// the ad in the red-flag mini-game: three warning signs and two ordinary lines (the brand is fictional)
const SB_AD = [['Cair 5 menit, tanpa cek apa pun', true], ['Bisa dicicil 3–12 bulan', false], ['Izinkan akses kontak & galeri', true], ['Ada nomor layanan pelanggan', false], ['Tanpa nama PT dan nomor izin OJK', true]];
const SB_HINTS = {
  gajian: 'Uang yang pasti keluar paling aman dipisah di hari gajian, sebelum terpakai.',
  flash: 'Cicilan “0%” tetap cicilan: batas cicilan amanmu ikut turun.',
  rs: 'Pakai uang tanpa bunga dulu (tabungan, bantuan keluarga), baru pinjam sisanya.',
  batas: 'Ambil yang lebih kecil: 30% gaji dikurangi cicilan lama, atau 70% sisa uang.',
  iklan: 'Cair instan tanpa cek, minta akses kontak, dan tanpa nama perusahaan adalah tanda pinjol ilegal.',
  pilih: 'Bandingkan total biaya dan cek izinnya. Cair paling cepat bukan berarti paling aman.',
  tagih: 'Kalau uang kurang, hubungi pemberi pinjaman sebelum jatuh tempo.',
  teror: 'Penagih dilarang menghubungi orang selain peminjam. Simpan bukti dan laporkan.',
  akhir: 'Sisa uang di akhir bulan paling berguna untuk membangun lagi dana darurat.',
};
const APPS = { bank: ['Bank', 'green'], toko: ['Toko', 'amber'], kakak: ['Kakak', 'pulih'], dimas: ['Catatan', 'deep'], iklan: ['Iklan', 'danger'], pinjam: ['Pinjaman', 'deep'], paylater: ['Paylater', 'amber'], grup: ['Grup kantor', 'danger'], kalender: ['Kalender', 'green'] };
// events in order; `when` decides whether an event happens, `auto` resolves an event that has no real choice
const SB_EVENTS = [
  { id: 'gajian', day: 25, app: 'bank', ui: 'envelopes',
    notif: g => `Gaji masuk ${rp(FW.income(g.p))}`, ask: () => 'Bagi dulu ke amplop sebelum terpakai.',
    pick: (g, v) => v === 'kunci'
      ? (g.flags.locked = true, g.stres -= 5, { tone: 'safe', head: 'Uang yang pasti keluar sudah aman.', body: `Yang tersisa untuk dipakai bebas: ${rp(g.saldo)}. Karena terlihat sedikit, belanja kecil ikut tertahan.` })
      : (g.flags.locked = false, { tone: 'amber', head: 'Semua uang dibiarkan di satu rekening.', body: `${rp(FW.income(g.p))} terlihat banyak. Kita lihat nanti apakah semuanya masih ada saat tagihan datang.` }) },
  { id: 'flash', day: 27, app: 'toko',
    notif: () => `Flash sale! Sepatu ${rps(SB_SHOES)}, cicil 3× 0%`,
    choices: () => [['paylater', 'Cicil 3×'], ['tunai', 'Bayar tunai'], ['tunda', 'Simpan di wishlist']],
    pick: (g, v) => {
      if (v === 'paylater') {
        const c0 = FW.headroom(g.p).ceiling; sbAddLoan(g.p, { name: 'Paylater sepatu', type: 'paylater', instalment: SB_SHOES / 3, outstanding: SB_SHOES, months: 3, dueDay: 5 });
        const h = FW.headroom(g.p); g.flags.shoes = [c0, h.ceiling]; g.stres -= 5;
        return { tone: 'amber', head: `Batas cicilan amanmu turun ke ${rps(h.ceiling)}.`, body: `Cicilan Dimas naik jadi ${rp(h.ex)} per bulan (${pct(h.dsrNow, 0)} dari gaji). Batas cicilan amannya turun dari ${rp(c0)} jadi ${rp(h.ceiling)}. Bunga 0% tetap cicilan.` };
      }
      if (v === 'tunai') { g.saldo -= SB_SHOES; g.stres -= 5; return { tone: 'amber', head: `Lunas. Sisa uang tinggal ${rps(g.saldo)}.`, body: 'Tidak ada utang baru, tapi bantalan untuk kejadian mendadak bulan ini menipis.' }; }
      g.stres += 5; return { tone: 'safe', head: 'Belum beli. Sisa uang utuh.', body: 'Kalau 30 hari lagi masih ingin dan uangnya ada, beli tanpa cicilan.' };
    } },
  { id: 'rs', day: 1, app: 'kakak', ui: 'blocks',
    notif: g => `Ayah masuk RS. Butuh ${rps(g.p.need.amount)} dalam 3 hari.`, ask: () => 'Tutup dulu dari mana? Sisanya dipinjam.',
    pick: (g, v) => {
      const n = g.p.need, ef = g.p.emergencyFund; g.stres += 15; g.flags.ladder = v;
      const useEf = v === 'tangga' || v === 'darurat', useFam = v === 'tangga' || v === 'kakak';
      g.need = n.amount - (useEf ? ef : 0) - (useFam ? n.family : 0); if (useEf) g.p.emergencyFund = 0;
      const extra = g.need - (n.amount - ef - n.family);
      return { tone: extra ? (v === 'pinjam' ? 'danger' : 'amber') : 'safe', head: `Yang dipinjam: ${rp(g.need)}.`,
        body: extra ? `Uang tanpa bunga yang tidak dipakai membuat pinjamannya ${rp(extra)} lebih besar dari yang perlu, dan bunganya tetap jalan.` : 'Tangga dana: uang tanpa bunga dipakai dulu. Makin kecil pinjamannya, makin kecil cicilan dan bunganya.' };
    } },
  { id: 'batas', day: 1, app: 'dimas', ui: 'slider',
    notif: g => `Sisa uangku ${rps(FW.surplus(g.p))}/bulan. Cicilan baru maksimal berapa?`, ask: () => 'Geser ke cicilan yang menurutmu masih aman, lalu kunci.',
    pick: (g, v) => {
      const h = FW.headroom(g.p), val = +v || 0, off = Math.abs(val - h.ceiling) / Math.max(1, h.ceiling), ok = off <= 0.1; g.flags.headroomOk = ok;
      return { tone: ok ? 'safe' : off <= 0.3 ? 'amber' : 'danger', head: ok ? `Tepat. Batas amannya ${rp(h.ceiling)}.` : `Batas amannya ${rp(h.ceiling)}, kamu pilih ${rp(val)}.`,
        body: `FinWise mengambil yang lebih kecil dari dua angka: 30% gaji dikurangi cicilan lama (${rp(h.lens1)}) dan 70% sisa uang (${rp(h.lens2)}). Dengan tenor 12 bulan, pinjaman maksimal yang aman sekitar ${rp(FW.maxSafeLoan(g.p, 12))}.${g.flags.shoes ? ` Tanpa paylater sepatu, batasnya ${rp(g.start.ceiling)}.` : ''}` };
    } },
  { id: 'iklan', day: 2, app: 'iklan', ui: 'flags',
    notif: () => 'Cair Kilat 24 Jam: dana cair 5 menit!', ask: () => 'Ketuk semua tanda bahaya di iklan ini, lalu selesai.',
    pick: (g, v) => {
      const taps = String(v || '').split(',').filter(Boolean).map(Number), hit = taps.filter(i => SB_AD[i]?.[1]).length, wrong = taps.filter(i => SB_AD[i] && !SB_AD[i][1]).length, all = SB_AD.filter(x => x[1]).length;
      g.flags.redFlags = hit; if (hit === all && !wrong) g.stres -= 5;
      return { tone: hit === all && !wrong ? 'safe' : hit ? 'amber' : 'danger', head: `${hit} dari ${all} tanda bahaya ketemu${wrong ? `, ${wrong} salah ketuk` : ''}.`,
        body: `Tanda bahayanya: ${SB_AD.filter(x => x[1]).map(x => x[0].toLowerCase()).join('; ')}. Pindar berizin wajib mencantumkan nama perusahaan dan izin OJK, dan hanya boleh mengakses kamera, mikrofon, dan lokasi.` };
    } },
  { id: 'pilih', day: 2, app: 'pinjam', ui: 'offers',
    notif: g => `3 tawaran untuk ${rps(g.need)}. Pilih satu.`,
    pick: (g, v) => {
      const o = sbOffers(g).find(x => x.pr.id === v), others = sbOffers(g).filter(x => x.pr.id !== v && !x.illegal);
      g.chosen = { id: o.pr.id, name: o.pr.name, zone: o.zone };
      if (o.illegal) {
        const got = r10k(g.need * (1 - SB_CUT)), cut = g.need - got;
        g.saldo -= cut; g.flags.illegal = true; g.stres += 25;
        sbAddLoan(g.p, { name: o.pr.name, type: 'pindar', instalment: g.need, outstanding: g.need, months: 1, dueDay: 25 });
        return { tone: 'danger', head: `Cair 5 menit, tapi cuma ${rps(got)}.`, body: `${rp(cut)} dipotong sebagai “biaya layanan”, pola yang sering dilaporkan korban pinjol ilegal. Kekurangannya ditutup dari sisa uang. Seluruh ${rp(g.need)} harus kembali dalam 30 hari, dan aplikasinya sudah membaca kontak di HP Dimas.` };
      }
      sbAddLoan(g.p, { name: o.pr.name, type: o.pr.kind === 'koperasi' ? 'koperasi' : 'pindar', instalment: o.L.inst, outstanding: o.L.repay + o.L.fee, months: o.pr.months, rateMonthly: o.pr.unit === 'day' ? o.pr.rate * 30 : o.pr.rate });
      g.stres += { safe: 0, stretch: 10, danger: 20 }[o.zone];
      const cheaper = others.filter(x => x.L.total < o.L.total).sort((a, b) => a.L.total - b.L.total)[0], pricier = others.filter(x => x.L.total > o.L.total)[0];
      return { tone: { safe: 'safe', stretch: 'amber', danger: 'danger' }[o.zone], head: `Cicilan ${rps(o.L.inst)}/bulan, sisa uang jadi ${rps(FW.surplus(g.p))}.`,
        body: `Mulai bulan depan sisa uang Dimas jadi ${rp(FW.surplus(g.p), { plus: true })} per bulan. Total biaya ${o.pr.name}: ${rp(o.L.total)}${cheaper ? `, padahal ${cheaper.pr.name} hanya ${rp(cheaper.L.total)}` : pricier ? `; ${pricier.pr.name} akan memakan ${rp(pricier.L.total)}` : ''}.` };
    } },
  { id: 'tagih', day: 5, app: 'paylater',
    // what is due on the 5th beyond the planned budget: the shoes instalment, plus small spending that leaked if nothing was set aside
    pre: g => { g.saldo -= (g.flags.shoes ? SB_SHOES / 3 : 0) + (g.flags.locked ? 0 : SB_LEAK); },
    notif: g => `Tagihan ${rps(DATA.personas.dimas.loans.find(l => l.type === 'paylater').instalment + (g.flags.shoes ? SB_SHOES / 3 : 0))} jatuh tempo hari ini`,
    ask: g => g.saldo < 0 ? `${g.flags.locked ? '' : `Ternyata ${rps(SB_LEAK)} habis untuk jajan sejak gajian. `}Uangmu kurang ${rps(-g.saldo)}.` : '',
    choices: g => g.saldo >= 0 ? null : [['nego', 'Telepon pemberi pinjaman'], ['telat', 'Telat saja'], ['gali', 'Pinjam di aplikasi lain']],
    auto: g => ({ tone: 'safe', head: 'Terbayar tepat waktu.', body: `${g.flags.locked ? 'Uangnya sudah dipisah sejak gajian, jadi tinggal dibayar. ' : ''}Sisa uang bulan ini ${rp(g.saldo)}. Riwayat kredit Dimas tetap lancar.` }),
    pick: (g, v) => {
      if (v === 'nego') { g.stres += 5; g.carry = -g.saldo; g.saldo = 0; return { tone: 'safe', head: 'Tagihan digeser, riwayat tetap lancar.', body: `Tidak semua pemberi pinjaman mau, tapi peluangnya jauh lebih besar sebelum telat. Kekurangan ${rp(g.carry)} dibayar bulan depan. Contoh pesannya ada di PULIH.` }; }
      if (v === 'telat') { g.stres += 15; g.p.slik = 'dpk'; g.p.onTime = false; g.flags.late = true; return { tone: 'danger', head: 'Telat 7 hari, kena denda dan tercatat.', body: 'Telat 1–90 hari tercatat di SLIK sebagai Kol 2 (dalam perhatian khusus). Catatan ini bisa menutup akses ke pinjaman murah seperti koperasi dan KUR.' }; }
      const pr = sbProd('pantas'), amt = Math.ceil(-g.saldo / 100000) * 100000, L = FW.loan({ principal: amt, rate: pr.rate, unit: pr.unit, months: pr.months });
      sbAddLoan(g.p, { name: pr.name, type: 'pindar', instalment: L.inst, outstanding: L.repay, months: pr.months, rateMonthly: pr.rate * 30 });
      g.saldo += amt; g.stres += 10; g.flags.dig = true;
      return { tone: 'danger', head: `Lubang ditutup lubang baru: +${rps(L.inst)}/bulan.`, body: `Pinjaman ${rp(amt)} menambah cicilan ${rp(L.inst)} per bulan selama ${pr.months} bulan, dengan biaya ${rp(L.total)}. Sisa uang Dimas bulan depan jadi ${rp(FW.surplus(g.p), { plus: true })}.` };
    } },
  { id: 'teror', day: 6, when: g => g.flags.illegal, app: 'grup',
    notif: () => '“Dimas penipu, bayar utangnya!”',
    ask: () => 'Penagih Cair Kilat menyebar pesan ke grup kantor.',
    choices: () => [['lapor', 'Simpan bukti, lapor OJK 157'], ['bayar', 'Bayar seadanya'], ['diam', 'Diam saja']],
    pick: (g, v) => {
      if (v === 'lapor') { g.stres -= 5; return { tone: 'safe', head: 'Laporan masuk ke OJK 157.', body: 'Menghubungi orang selain peminjam dan mempermalukannya dilarang (POJK 22/2023 Pasal 62). Bukti tangkapan layar membantu OJK dan Satgas PASTI menindak aplikasinya.' }; }
      if (v === 'bayar') { g.saldo -= 500000; g.stres += 10; return { tone: 'danger', head: 'Penagihan tidak berhenti.', body: 'Pinjol ilegal biasanya meminta lebih, karena tidak ada aturan yang mengikat mereka.' }; }
      g.stres += 20; return { tone: 'danger', head: 'Pesannya makin banyak.', body: 'Diam membuat penagih merasa aman. Simpan bukti dan laporkan; itu hakmu sebagai konsumen.' };
    } },
  { id: 'akhir', day: 24, app: 'kalender',
    notif: g => g.saldo > 0 ? `Besok gajian. Sisa uang ${rps(g.saldo)}.` : `Besok gajian. Bulan ini tekor ${rps(-g.saldo)}.`,
    choices: g => g.saldo > 0 ? [['darurat', 'Isi dana darurat'], ['hadiah', 'Hadiah untuk diri sendiri']] : [['rencana', 'Susun rencana hemat'], ['pinjam', 'Tutup dengan pinjaman']],
    pick: (g, v) => {
      if (v === 'darurat') { g.p.emergencyFund += g.saldo; g.saldo = 0; g.stres -= 5; const out = FW.spendTotal(g.p) + (g.p.family || 0) + FW.instalments(g.p);
        return { tone: 'safe', head: `Dana darurat jadi ${rps(g.p.emergencyFund)}.`, body: `Itu ${nf(g.p.emergencyFund / out, 1)} bulan pengeluaran. Targetnya 3 bulan: langkah kecil, tapi arahnya benar.` }; }
      if (v === 'hadiah') { g.saldo = 0; g.stres -= 10; return { tone: 'amber', head: 'Dimas lebih lega.', body: 'Tidak salah, asal dari sisa uang dan bukan dari utang. Dana daruratnya masih kosong, jadi kejadian mendadak berikutnya akan dibiayai pinjaman lagi.' }; }
      if (v === 'rencana') { g.stres -= 5; return { tone: 'safe', head: 'Rencana dibuat.', body: 'Mulai dari pos keinginan, pisahkan uang yang pasti keluar saat gajian, lalu tanyakan jadwal ulang ke pemberi pinjaman sebelum jatuh tempo.' }; }
      g.stres += 10; g.flags.dig = true; return { tone: 'danger', head: 'Tekornya pindah ke bulan depan.', body: 'Pinjaman menutup tekor bulan ini, tapi cicilannya membuat bulan depan tekor lagi. Ini awal gali lubang tutup lubang.' };
    } },
];
const sbActive = g => SB_EVENTS.filter(e => !e.when || e.when(g));
// moves to the next event; events without a real choice resolve on entry
function sbEnter(g) {
  const evs = sbActive(g), ev = evs[g.i];
  if (!ev) { g.done = true; return; }
  if (ev.pre && !g.preDone?.[ev.id]) { g.preDone = { ...g.preDone, [ev.id]: true }; ev.pre(g); }
  if (ev.choices && !ev.choices(g) && ev.auto) { g.picks[ev.id] = 'auto'; g.out = { ...ev.auto(g), d: {} }; }
  if (ev.ui === 'flags') g.flg = { taps: [], start: Date.now() };
}
function sbPick(t, v) {
  const g = t.g, ev = sbActive(g)[g.i]; if (!ev || g.out) return;
  const before = { saldo: g.saldo, ef: g.p.emergencyFund, utang: sbDebt(g.p), stres: g.stres };
  const res = ev.pick(g, v); g.picks[ev.id] = v; g.stres = clamp100(g.stres);
  g.out = { ...res, d: { saldo: g.saldo - before.saldo, ef: g.p.emergencyFund - before.ef, utang: sbDebt(g.p) - before.utang, stres: g.stres - before.stres } };
  if (ev.id === 'rs') { t.marks.ladder = true; t.marks.ladderOk = v === 'tangga'; }
  if (ev.id === 'batas') { t.marks.headroom = true; t.marks.headroomOk = !!g.flags.headroomOk; }
  if (ev.id === 'pilih') t.chosen = g.chosen;
}
function sbNext(g) { g.out = null; g.i++; sbEnter(g); }
// mini-game input → the value its pick() expects
const sbBlocksValue = b => b.tab && b.kak ? 'tangga' : b.tab ? 'darurat' : b.kak ? 'kakak' : 'pinjam';
// the safest path through the same month, played by the same rules, for the comparison at the end
function sbBest() {
  const g = sbNew(), t = { g, marks: {} }; sbEnter(g);
  const plan = { gajian: 'kunci', flash: 'tunda', rs: 'tangga', batas: () => String(FW.headroom(g.p).ceiling), iklan: SB_AD.map((x, i) => x[1] ? i : null).filter(x => x != null).join(','), pilih: 'koperasi', akhir: 'darurat' };
  for (let k = 0; k < 14 && !g.done; k++) { const ev = sbActive(g)[g.i]; if (!g.out) { const v = plan[ev.id]; sbPick(t, typeof v === 'function' ? v() : v); } sbNext(g); }
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
// Dimas' face follows his stress
function dimasFace(s) {
  const mood = s < 35 ? 'happy' : s < 65 ? 'meh' : 'sad';
  const mouth = { happy: 'M17 29q7 6 14 0', meh: 'M17 30.5h14', sad: 'M17 33q7-6 14 0' }[mood];
  return `<svg viewBox="0 0 48 48" class="face" role="img" aria-label="Dimas ${sbStress(s)}"><circle cx="24" cy="25" r="19" fill="#F2C9A0" stroke="#13231B" stroke-width="2"/><path d="M6.5 21C7 11 14 5.5 24 5.5S41 11 41.5 21c-4-5-10-7.5-17.5-7.5S10.5 16 6.5 21z" fill="#13231B"/><circle cx="17.5" cy="24" r="2.2" fill="#13231B"/><circle cx="30.5" cy="24" r="2.2" fill="#13231B"/><path d="${mouth}" fill="none" stroke="#13231B" stroke-width="2.4" stroke-linecap="round"/>${mood === 'sad' ? '<path d="M39 13q3.5 5.5 0 8q-3.5-2.5 0-8z" fill="#2B7FA3"/>' : ''}</svg>`;
}
function sbHud(g) {
  const debt = sbDebt(g.p), s = g.stres;
  const m = [['Sisa uang bulan ini', rp(g.saldo, { plus: g.saldo < 0 }), g.saldo < 0 ? 'danger' : g.saldo < 300000 ? 'stretch' : 'safe', Math.max(0, Math.min(100, g.saldo / g.start.sur * 100))],
    ['Dana darurat', rp(g.p.emergencyFund), g.p.emergencyFund > 0 ? 'safe' : 'stretch', Math.min(100, g.p.emergencyFund / g.start.ef * 100)],
    ['Total utang', rp(debt), debt > g.start.utang * 1.4 ? 'danger' : debt > g.start.utang ? 'stretch' : 'safe', Math.min(100, debt / (g.start.utang * 2) * 100)],
    ['Stres', `${s}/100 · ${sbStress(s)}`, s >= 65 ? 'danger' : s >= 35 ? 'stretch' : 'safe', s]];
  return `<div class="sb-hud" role="group" aria-label="Kondisi Dimas"><div class="sb-who">${dimasFace(s)}<b>Dimas</b><span class="tiny muted">25 th, karyawan</span></div>
    ${m.map(([k, v, z, w]) => `<div class="sbm"><div class="k">${k}</div><div class="v num">${v}</div><div class="bar" aria-hidden="true"><i style="width:${w.toFixed(0)}%;background:var(--${z})"></i></div></div>`).join('')}</div>`;
}
const SB_DELTA = { saldo: 'Sisa uang', ef: 'Dana darurat', utang: 'Utang', stres: 'Stres' };
// the interactive part of an event: buttons, or one of the mini-games
function sbBody(g, ev) {
  if (ev.ui === 'envelopes') {
    const h = FW.headroom(g.p), envs = [['pokok', 'Kebutuhan pokok', FW.needs(g.p)], ['keluarga', 'Kirim keluarga', g.p.family], ['cicilan', 'Cicilan', h.ex]];
    const left = FW.income(g.p) - FW.sum(envs.filter(e => g.env[e[0]]), e => e[2]), all = envs.every(e => g.env[e[0]]);
    return `<div class="env-row">${envs.map(([k, l, a]) => `<button class="env ${g.env[k] ? 'on' : ''}" data-act="sb-env" data-v="${k}" aria-pressed="${!!g.env[k]}"><span class="env-flap" aria-hidden="true"></span><b>${l}</b><span class="num">${rps(a)}</span></button>`).join('')}</div>
      <p class="sb-wallet">Di rekening: <b class="num">${rp(left)}</b></p>
      <div class="sb-choices two"><button class="sb-choice" data-act="sb-pick" data-v="kunci" ${all ? '' : 'disabled'}><b>Selesai membagi</b></button><button class="sb-choice ghost" data-act="sb-pick" data-v="santai"><b>Biarkan di satu rekening</b></button></div>`;
  }
  if (ev.ui === 'blocks') {
    const n = g.p.need, used = (g.blk.tab ? g.p.emergencyFund : 0) + (g.blk.kak ? n.family : 0), loan = n.amount - used;
    return `<div class="blk-bar" aria-hidden="true">${g.blk.tab ? `<i class="b-tab" style="width:${(g.p.emergencyFund / n.amount * 100).toFixed(1)}%">Tabungan</i>` : ''}${g.blk.kak ? `<i class="b-kak" style="width:${(n.family / n.amount * 100).toFixed(1)}%">Kakak</i>` : ''}<i class="b-loan" style="width:${(loan / n.amount * 100).toFixed(1)}%">Pinjam</i></div>
      <div class="blk-row"><button class="blk ${g.blk.tab ? 'on' : ''}" data-act="sb-block" data-v="tab" aria-pressed="${!!g.blk.tab}"><b>Tabungan</b><span class="num">${rps(g.p.emergencyFund)}</span></button><button class="blk ${g.blk.kak ? 'on' : ''}" data-act="sb-block" data-v="kak" aria-pressed="${!!g.blk.kak}"><b>Bantuan kakak</b><span class="num">${rps(n.family)}</span></button></div>
      <p class="sb-wallet">Yang dipinjam: <b class="num">${rp(loan)}</b></p>
      <div class="sb-choices"><button class="sb-choice" data-act="sb-pick" data-v="${sbBlocksValue(g.blk)}"><b>Kunci: pinjam ${rps(loan)}</b></button></div>`;
  }
  if (ev.ui === 'slider') return `<div class="sb-slide"><output id="sb-val" for="sb-range" class="num">Rp0</output><input type="range" id="sb-range" class="range" min="0" max="2000000" step="25000" value="0" aria-label="Cicilan baru per bulan" aria-valuetext="Rp0"></div>
      <div class="row between tiny muted"><span>Rp0</span><span>Rp2 jt</span></div>
      <div class="sb-choices"><button class="sb-choice" data-act="sb-lock-slider"><b>Kunci jawaban</b></button></div>`;
  if (ev.ui === 'flags') {
    const left = Math.max(0, Math.ceil((SB_FLAG_MS - (Date.now() - (g.flg.start || Date.now()))) / 1000));
    return `<div class="ad-card"><div class="ad-brand">Cair Kilat 24 Jam <span class="tiny">· iklan</span></div><div class="ad-lines">${SB_AD.map(([l], i) => `<button class="ad-line ${g.flg.taps.includes(i) ? 'on' : ''}" data-act="sb-flag" data-v="${i}" aria-pressed="${g.flg.taps.includes(i)}">${esc(l)}</button>`).join('')}</div></div>
      ${S.test?.timerOn !== false ? `<div class="kl-time" aria-hidden="true"><i style="animation-duration:${SB_FLAG_MS}ms;animation-delay:-${Date.now() - g.flg.start}ms"></i></div><p class="tiny muted"><span role="timer">${left} detik</span></p>` : ''}
      <div class="sb-choices"><button class="sb-choice" data-act="sb-flags-done"><b>Selesai</b></button></div>`;
  }
  if (ev.ui === 'offers') return `<div class="grid g3 sb-offers">${sbOffers(g).map(o => `<div class="opt sb-offer"><div class="row between"><b>${esc(o.pr.name)}</b>${o.illegal ? '<span class="pill z-danger">Tidak berizin</span>' : zpill(o.zone)}</div>
      <p class="tiny muted">${o.illegal ? 'Tidak ada di daftar OJK' : o.pr.kind === 'koperasi' ? 'Koperasi kantor Dimas' : 'Pindar berizin OJK'} · cair ${o.illegal ? '5 menit' : FW.hoursLabel(o.pr.hours)}</p>
      ${o.illegal ? '<div class="facts f2"><div><div class="k">Bunga</div><div class="v">tidak jelas</div></div><div><div class="k">Syarat</div><div class="v">akses kontak</div></div></div>' : `<div class="facts f2"><div><div class="k">Cicilan</div><div class="v">${rps(o.L.inst)}/bln</div></div><div><div class="k">Total biaya</div><div class="v">${rps(o.L.total)}</div></div></div>`}
      <button class="btn sm ${o.illegal ? 'ghost' : ''}" data-act="sb-pick" data-v="${o.pr.id}">Pilih</button></div>`).join('')}</div>`;
  const ch = ev.choices ? ev.choices(g) : null;
  return ch ? `<div class="sb-choices ${ch.length === 2 ? 'two' : ''}">${ch.map(([v, l]) => `<button class="sb-choice" data-act="sb-pick" data-v="${v}"><b>${esc(l)}</b></button>`).join('')}</div>` : '';
}
function sbView(t) {
  const g = t.g, evs = sbActive(g);
  const days = `<ol class="sb-days" aria-label="Hari dalam sebulan">${evs.map((e, i) => `<li class="${i < g.i || g.done ? 'done' : i === g.i ? 'on' : ''}" ${i === g.i && !g.done ? 'aria-current="step"' : ''}><span>tgl</span>${e.day}</li>`).join('')}</ol>`;
  if (g.done) return days + sbHud(g) + sbReport(t);
  const ev = evs[g.i], app = APPS[ev.app], ask = ev.ask ? ev.ask(g) : '', fresh = g.shown !== g.i; g.shown = g.i;
  const d = g.out ? Object.entries(g.out.d).filter(([, x]) => Math.round(x)) : [];
  const out = g.out ? `<div class="sb-out ${g.out.tone}" aria-live="polite"><p id="sb-out" tabindex="-1" class="sb-head">${esc(g.out.head)}</p>
      ${d.length ? `<ul class="sb-delta">${d.map(([k, x]) => `<li class="${(k === 'saldo' || k === 'ef') === x > 0 ? 'up' : 'down'}">${SB_DELTA[k]} ${k === 'stres' ? (x > 0 ? '+' : '−') + Math.abs(x) : (x > 0 ? '+' : '−') + rps(Math.abs(x))}</li>`).join('')}</ul>` : ''}
      <details class="why"><summary>Kenapa?</summary><p class="small">${esc(g.out.body)}</p></details>
      <button class="btn amber" data-act="sb-next">${g.i === evs.length - 1 ? 'Lihat laporan akhir bulan' : 'Lanjut'}</button></div>` : '';
  return days + `<div class="sb-stage">${sbHud(g)}<div class="sb-phone"><div class="notif${fresh ? ' nf-in' : ''}"><span class="nf-app nf-${app[1]}" aria-hidden="true">${app[0][0]}</span><div><div class="nf-meta">${app[0]} · tgl ${ev.day}</div><h2 id="sb-h" tabindex="-1" class="nf-text">${esc(ev.notif(g))}</h2></div></div>
    ${ask && !g.out ? `<p class="sb-ask">${esc(ask)}</p>` : ''}${g.out ? out : sbBody(g, ev)}</div></div>`;
}
function sbReport(t) {
  const g = t.g, p = g.p, H = FW.health(p), R = FW.readiness(p), h = FW.headroom(p), best = sbBest(), BR = FW.readiness(best.p);
  const row = (k, a, b) => `<tr><td>${k}</td><td class="num"><b>${a}</b></td><td class="num">${b}</td></tr>`;
  return `<article class="card sb-card"><p class="sb-date">Laporan akhir bulan</p><h2 id="sb-h" tabindex="-1">Dimas ${g.stres >= 65 ? 'bertahan, tapi tertekan' : FW.surplus(p) < 0 ? 'bertahan, tapi bulan depan tekor' : 'lolos bulan ini'}</h2>
    <div class="tbl-wrap" style="margin-top:12px"><table><thead><tr><th></th><th>Pilihanmu</th><th>Jalur paling aman</th></tr></thead><tbody>
     ${row('Kondisi keuangan', `${H.total}/100 · ${H.status}`, `${FW.health(best.p).total}/100`)}
     ${row(term('Kesiapan berutang'), READY[R.level].name, READY[BR.level].name)}
     ${row('Sisa uang bulan depan', rp(FW.surplus(p), { plus: true }), rp(FW.surplus(best.p), { plus: true }))}
     ${row(term('Porsi cicilan'), pct(h.dsrNow, 0), pct(FW.headroom(best.p).dsrNow, 0))}
     ${row('Total utang', rp(sbDebt(p)), rp(sbDebt(best.p)))}
     ${row('Stres', `${g.stres}/100`, `${best.stres}/100`)}
    </tbody></table></div>
    <h3 style="margin-top:16px">Yang terjadi bulan ini</h3><ul class="small sb-lessons">${sbLessons(g).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="tiny muted" style="margin-top:8px">Angka dihitung mesin FinWise. Jalur paling aman: bagi gaji ke amplop, tunda sepatu, pakai tabungan dan bantuan kakak, pinjam ${rps(best.need)} di koperasi, sisa uang ke dana darurat.</p>
    <div style="margin-top:14px"><button class="btn amber" data-act="t-next">Lanjut ke Ronde Final</button></div></article>`;
}
