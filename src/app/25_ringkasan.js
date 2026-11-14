/* ================= RINGKASAN: results dashboard right after the form ================= */
// Every sentence here comes from fixed rules over engine numbers, so it always shows; AI only rephrases on top.
function facts(p) {
  const inc = FW.income(p), needs = FW.needs(p), wants = FW.wants(p), fam = p.family || 0, inst = FW.instalments(p), sur = FW.surplus(p), h = FW.headroom(p), hs = FW.health(p);
  const ess = needs + fam, unstable = p.stability === 'tidak' || p.incomes.some(i => i.type !== 'tetap') && p.stability !== 'sangat';
  // emergency fund is measured against everything that leaves each month, instalments included (Greninger, as in Cia's benchmark)
  const out = needs + wants + fam + inst;
  const efTarget = unstable ? 6 : 3, efMonths = out ? (p.emergencyFund || 0) / out : 0;
  return { inc, needs, wants, fam, inst, sur, h, hs, ess, out, unstable, efTarget, efMonths, total: totalMode(p),
    needR: inc ? ess / inc : 0, wantR: inc ? wants / inc : 0, dsr: h.dsrNow, surR: inc ? sur / inc : 0, saveR: inc ? (p.savingMonthly || 0) / inc : 0 };
}
function meters(f) {
  const st = (ok, warn) => ok ? 'safe' : warn ? 'stretch' : 'danger';
  const m = [];
  if (f.total) m.push({ k: 'Total pengeluaran + keluarga', v: f.needR, txt: pct(f.needR, 0), target: 'pokok ≤50%, keinginan ≤30%', s: st(f.needR <= 0.8, f.needR <= 0.9), note: 'rinci untuk memisahkan pokok dan keinginan' });
  else {
    m.push({ k: 'Kebutuhan pokok + keluarga', v: f.needR, txt: pct(f.needR, 0), target: 'pedoman ≤50%', s: st(f.needR <= 0.5, f.needR <= 0.7) });
    m.push({ k: 'Keinginan / gaya hidup', v: f.wantR, txt: pct(f.wantR, 0), target: 'pedoman ≤30%', s: st(f.wantR <= 0.3, f.wantR <= 0.4) });
  }
  m.push({ k: 'Porsi cicilan', v: f.dsr, txt: pct(f.dsr, 0), target: 'aman ≤30%, bahaya >40%', s: st(f.dsr <= 0.3, f.dsr <= 0.4), term: 'DSR' });
  m.push({ k: 'Sisa uang', v: Math.max(0, f.surR), txt: f.sur < 0 ? 'tekor' : pct(f.surR, 0), target: 'pedoman ≥20%', s: st(f.surR >= 0.2, f.surR >= 0.1), invert: true });
  m.push({ k: 'Dana darurat', v: Math.min(1, f.efMonths / f.efTarget), txt: f.efMonths.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' bulan', target: `target ${f.efTarget} bulan${f.unstable ? ' (penghasilan tidak stabil)' : ''}`, s: st(f.efMonths >= f.efTarget, f.efMonths >= 1), invert: true, term: 'Dana darurat' });
  return m;
}
function verdict(p, f) {
  if (f.sur < 0) return { tone: 'danger', head: `Pengeluaranmu lebih besar dari pemasukan: tekor ${rp(-f.sur)} per bulan.`, why: 'Tanpa perubahan, kekurangan ini biasanya ditutup dengan utang baru, dan utang itu menambah cicilan bulan depan.' };
  if (f.dsr > 0.4) return { tone: 'danger', head: `Cicilanmu sudah ${pct(f.dsr, 0)} dari pendapatan, di atas batas bahaya 40%.`, why: 'Satu kejadian mendadak bisa membuatmu telat bayar dan tercatat di SLIK.' };
  if (f.needR > 0.7) return { tone: 'stretch', head: `${pct(f.needR, 0)} pendapatanmu habis untuk ${f.total ? 'pengeluaran rutin' : 'kebutuhan pokok'}${f.fam ? ' dan keluarga' : ''}.`, why: `Sisa ${rp(f.sur)} per bulan membuat ruang menabung dan menghadapi kejadian mendadak sangat sempit.` };
  if (f.efMonths < 1) return { tone: 'stretch', head: 'Arus uangmu masih positif, tapi dana daruratmu belum sampai 1 bulan.', why: 'Satu kejadian mendadak bisa memaksamu berutang. Ini prioritas pertama sebelum mengambil cicilan baru.' };
  if (f.dsr > 0.3 || f.wantR > 0.3 || f.surR < 0.1) return { tone: 'stretch', head: f.dsr > 0.3 ? `Cicilanmu ${pct(f.dsr, 0)} dari pendapatan, sedikit di atas batas aman 30%.` : f.wantR > 0.3 ? `Belanja keinginanmu ${pct(f.wantR, 0)} dari pendapatan, di atas pedoman 30%.` : `Sisa uangmu baru ${pct(f.surR, 0)} dari pendapatan.`, why: 'Masih bisa diperbaiki tanpa berutang. Lihat langkah prioritas di bawah.' };
  return { tone: 'safe', head: `Arus uangmu sehat: sisa ${pct(f.surR, 0)} per bulan dan cicilan ${pct(f.dsr, 0)} dari pendapatan.`, why: f.efMonths >= f.efTarget ? 'Dana daruratmu sudah cukup. Saatnya merencanakan tujuan berikutnya tanpa utang.' : `Tinggal lengkapi dana darurat sampai ${f.efTarget} bulan.` };
}
// ranked next steps, each with a rupiah figure the engine can back up
function priorities(p, f) {
  const out = [], biggest = [...p.spending].filter(c => c.kind === 'need' && c.amount > 0).sort((a, b) => b.amount - a.amount);
  const capped = autoCaps(p), cut = FW.sum(capped.spending.filter(c => c.cap != null && c.amount > c.cap), c => c.amount - c.cap);
  if (f.sur < 0) out.push({ w: 100, tone: 'danger', title: `Tutup kekurangan ${rp(-f.sur)} per bulan`, text: cut > 0 ? `Mulai dari belanja keinginan: membatasinya ke 30% pendapatan menghemat ${rp(cut)}.` : f.total ? 'Rinci pengeluaranmu supaya FinWise bisa menunjukkan pos yang paling mungkin dikurangi.' : `Pos terbesarmu: ${biggest.slice(0, 2).map(c => `${c.name} ${rps(c.amount)}`).join(', ')}.`, href: '#cek', cta: 'Susun rencana di CEK' });
  if (f.dsr > 0.3) out.push({ w: 90, tone: f.dsr > 0.4 ? 'danger' : 'stretch', title: 'Jangan ambil cicilan baru dulu', text: `Cicilanmu ${rp(f.inst)} per bulan; supaya kembali ≤30% perlu turun ${rp(f.inst - 0.3 * f.inc)}. Restrukturisasi atau pelunasan berurutan bisa membantu.`, href: '#pulih', cta: 'Atur utang di PULIH' });
  if (f.total) out.push({ w: 85, tone: 'stretch', title: 'Rinci pengeluaranmu untuk saran yang lebih tajam', text: `Saat ini FinWise hanya tahu totalnya (${rp(f.needs)}). Dengan rincian per pos, kamu dapat: rasio pokok vs keinginan, pos paling boros, dan batas hemat per pos.`, href: '#mulai', cta: 'Rinci sekarang', act: 'wiz-edit', v: 2, mode: 'rinci' });
  if (!f.total && f.wantR > 0.3 && cut > 0) out.push({ w: 70, tone: 'stretch', title: `Batasi keinginan, hemat ${rp(cut)} per bulan`, text: capped.spending.filter(c => c.cap != null && c.amount > c.cap).slice(0, 3).map(c => `${c.name} ${rps(c.amount)} → ${rps(c.cap)}`).join(' · '), href: '#cek', cta: 'Lihat rencana' });
  if (!f.total && f.needR > 0.5 && biggest.length) out.push({ w: 65, tone: 'stretch', title: `Kebutuhan pokok ${pct(f.needR, 0)} dari pendapatan`, text: `Pedomannya ≤50%. Pos terbesar: ${biggest.slice(0, 2).map(c => `${c.name} ${rps(c.amount)} (${pct(c.amount / f.inc, 0)})`).join(', ')}. Hemat 10% di dua pos ini = ${rp(Math.round(FW.sum(biggest.slice(0, 2), c => c.amount) * 0.1 / 1000) * 1000)} per bulan.`, href: '#cek', cta: 'Lihat rencana' });
  const efGap = Math.max(0, f.efTarget * f.out - (p.emergencyFund || 0));
  if (efGap > 0) { const per = Math.max(0, f.sur), mo = per > 0 ? Math.ceil(efGap / per) : null; out.push({ w: f.efMonths < 1 ? 80 : 55, tone: f.efMonths < 1 ? 'stretch' : 'safe', title: `Bangun dana darurat ${rp(f.efTarget * f.out)}`, text: `Target ${f.efTarget} bulan pengeluaran${f.unstable ? ' (6 bulan karena penghasilanmu naik-turun)' : ''}. Kurang ${rp(efGap)}.${mo ? ` Jika sisa ${rp(per)} disisihkan tiap gajian, tercapai dalam ±${mo} bulan.` : ' Tambah sisa uang dulu agar bisa mulai menabung.'}`, href: '#cek', cta: 'Rencanakan di CEK' }); }
  if (f.sur > 0 && f.saveR < 0.1) out.push({ w: 50, tone: 'safe', title: `Sisihkan otomatis ${rp(Math.min(f.sur, Math.round(0.1 * f.inc / 10000) * 10000))} tiap gajian`, text: 'Pindahkan ke rekening terpisah di hari gajian, sebelum uang terpakai. Ini menaikkan dua indikator skor kesehatanmu sekaligus.', href: '#cek', cta: 'Lihat dampaknya' });
  if (p.pinjolExp === 'masalah' || p.slik === 'dpk' || p.slik === 'macet') out.push({ w: 75, tone: 'stretch', title: 'Pulihkan riwayat kreditmu dulu', text: 'Riwayat telat bayar membuat pinjaman murah (bank, KUR) sulit didapat. Bayar tepat waktu 3 bulan berturut-turut dan cek SLIK di iDebKu.', href: '#pulih', cta: 'Lihat PULIH' });
  if (p.slik === 'tidaktahu') out.push({ w: 30, tone: 'safe', title: 'Cek SLIK gratis di iDebKu OJK', text: 'Kamu jadi tahu catatan kreditmu sebelum mengajukan pinjaman apa pun.', href: '#pulih', cta: 'Cara mengecek' });
  if (p.insurance === false) out.push({ w: 40, tone: 'stretch', title: 'Daftar BPJS Kesehatan', text: 'Biaya rumah sakit adalah alasan paling umum orang terpaksa meminjam mendadak.', href: '#cek', cta: 'Lihat skor' });
  if (!out.length) out.push({ w: 10, tone: 'safe', title: 'Pertahankan, lalu rencanakan tujuan berikutnya', text: 'Pakai rencana tujuan tanpa utang di CEK untuk menabung menuju target tertentu.', href: '#cek', cta: 'Buka CEK' });
  return out.sort((a, b) => b.w - a.w);
}
function analysisText(p, f, v, pr) {
  const parts = [];
  parts.push(`Setiap bulan masuk ${rp(f.inc)}. ${f.total ? `Pengeluaran rutinmu sekitar ${rp(f.needs)}` : `Kebutuhan pokok ${rp(f.needs)} dan keinginan ${rp(f.wants)}`}${f.fam ? `, ditambah ${rp(f.fam)} untuk keluarga` : ''}${f.inst ? ` dan cicilan ${rp(f.inst)}` : ''}, sehingga ${f.sur >= 0 ? `tersisa ${rp(f.sur)}` : `kurang ${rp(-f.sur)}`}.`);
  parts.push(v.head + ' ' + v.why);
  const R = FW.readiness(p);
  parts.push(`Kesiapan berutang: ${READY[R.level].name.toLowerCase()}${R.level ? `; pinjaman maksimal yang aman ${rp(R.max[6])} untuk 6 bulan (cicilan ≤ ${rp(f.h.ceiling)} per bulan)` : ''}. Kondisi keuanganmu ${f.hs.total}/100 (${f.hs.status}); kebiasaan yang paling menahan skor: ${f.hs.weakest.label.toLowerCase()}.`);
  parts.push(`Langkah pertama yang paling berdampak: ${pr[0].title.charAt(0).toLowerCase() + pr[0].title.slice(1)}.`);
  return parts;
}
// Household financial ratios (CEK, after Greninger et al. 1996 and the 50/30/20 guideline), each with formula, benchmark and status
const CONSUMER_TYPES = ['paylater', 'pindar', 'kartu kredit', 'lainnya'];
function ratios(p) {
  const f = facts(p), inc = f.inc || 1, out = [];
  const st = (v, ok, warn, higherIsBetter = false) => higherIsBetter ? (v >= ok ? 'safe' : v >= warn ? 'stretch' : 'danger') : (v <= ok ? 'safe' : v <= warn ? 'stretch' : 'danger');
  const house = f.total ? null : FW.sum(p.spending.filter(c => /tempat tinggal|sewa|kos/i.test(c.name)), c => c.amount);
  const consumer = FW.sum(p.loans.filter(l => CONSUMER_TYPES.includes(l.type)), l => l.instalment);
  out.push({ k: 'Kebutuhan pokok + keluarga', t: 'Pokok', f: '(kebutuhan pokok + kirim keluarga) ÷ pendapatan', v: f.needR, show: pct(f.needR, 0), bench: '≤ 50%', s: st(f.needR, 0.5, 0.7), note: f.total ? 'Masih total pengeluaran (belum dirinci), jadi angka ini termasuk keinginan.' : '' });
  if (!f.total) out.push({ k: 'Keinginan / gaya hidup', t: 'Keinginan', f: 'belanja keinginan ÷ pendapatan', v: f.wantR, show: pct(f.wantR, 0), bench: '≤ 30%', s: st(f.wantR, 0.3, 0.4) });
  if (house != null && house > 0) out.push({ k: 'Tempat tinggal', t: 'Rasio tempat tinggal', f: 'sewa/kos + tagihan rumah ÷ pendapatan', v: house / inc, show: pct(house / inc, 0), bench: '≤ 30%', s: st(house / inc, 0.3, 0.4) });
  out.push({ k: 'Tabungan rutin', t: 'Rasio tabungan', f: 'menabung per bulan ÷ pendapatan', v: f.saveR, show: pct(f.saveR, 0), bench: '≥ 10%', s: st(f.saveR, 0.1, 0.05, true) });
  out.push({ k: 'Sisa uang', t: 'Sisa uang', f: 'sisa setelah semua pengeluaran ÷ pendapatan', v: f.surR, show: f.sur < 0 ? 'minus ' + pct(-f.surR, 0) : pct(f.surR, 0), bench: '≥ 20%', s: st(f.surR, 0.2, 0.1, true) });
  out.push({ k: 'Porsi cicilan', t: 'Porsi cicilan', f: 'semua cicilan ÷ pendapatan (istilah resmi: DSR)', v: f.dsr, show: pct(f.dsr, 0), bench: '≤ 30% aman · > 40% bahaya', s: st(f.dsr, 0.3, 0.4) });
  out.push({ k: 'Cicilan konsumtif', t: 'Rasio cicilan konsumtif', f: 'cicilan paylater, pinjol, kartu kredit ÷ pendapatan', v: consumer / inc, show: pct(consumer / inc, 0), bench: '≤ 15%', s: st(consumer / inc, 0.15, 0.2) });
  out.push({ k: 'Dana darurat (likuiditas)', t: 'Rasio likuiditas', f: 'tabungan siap pakai ÷ total pengeluaran sebulan (termasuk cicilan)', v: f.efMonths, show: f.efMonths.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' bulan', bench: `≥ ${f.efTarget} bulan`, s: st(f.efMonths, f.efTarget, 1, true) });
  if (f.fam > 0) out.push({ k: 'Tanggungan keluarga', t: 'Tanggungan keluarga', f: 'kirim keluarga ÷ pendapatan', v: f.fam / inc, show: pct(f.fam / inc, 0), bench: 'tanpa patokan baku', s: f.fam / inc > 0.2 ? 'stretch' : 'safe' });
  const run = FW.runway(p);
  out.push({ k: 'Daya tahan uang', t: 'Daya tahan uang', f: 'kapan saldo habis dalam satu siklus gajian', v: run ? run.day / 30 : 1, show: run ? `habis tgl ${run.date}` : 'cukup sebulan', bench: 'cukup sampai gajian berikutnya', s: run ? 'danger' : 'safe' });
  return out;
}
