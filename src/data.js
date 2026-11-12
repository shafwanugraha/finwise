/* ===== FinWise prototype data: personas, products, lenders (all lender names are fictitious) ===== */
const DATA = (() => {
  const personas = {
    kirana: {
      id: 'kirana', name: 'Kirana', tag: 'Mahasiswi, 20 th', stage: 'mahasiswa', home: 'cek',
      story: 'Uang sakunya habis sekitar tanggal 19. Ingin laptop Rp6 juta untuk skripsi tanpa minta orang tua, dan tergoda paylater.',
      incomes: [
        { id: 'i1', label: 'Uang saku', amount: 2500000, type: 'tetap', payday: 1 },
        { id: 'i2', label: 'Freelance desain', amount: 800000, type: 'tidak tetap', payday: 12, split: [[12, 0.375], [25, 0.625]] },
      ],
      spending: [
        { id: 's1', name: 'Kos', kind: 'need', amount: 850000, day: 1 },
        { id: 's2', name: 'Makan harian', kind: 'need', amount: 740000 },
        { id: 's3', name: 'Transport', kind: 'need', amount: 82000, day: 1 },
        { id: 's4', name: 'Pulsa & internet', kind: 'need', amount: 100000, day: 1 },
        { id: 's5', name: 'Kebutuhan kuliah', kind: 'need', amount: 150000 },
        { id: 's6', name: 'Nongkrong & belanja', kind: 'want', amount: 1056000, cap: 750000, capWhy: 'Batasi Rp750 rb/bulan (sekarang 32% dari pendapatan)' },
        { id: 's7', name: 'Pesan-antar makanan', kind: 'want', amount: 486000, cap: 400000, capWhy: 'Kurangi 2 pesanan per minggu' },
        { id: 's8', name: 'Langganan digital', kind: 'want', amount: 186000, cap: 78000, capWhy: 'Ada 2 langganan yang tidak dipakai 60 hari terakhir', day: 1 },
      ],
      family: 0, loans: [], emergencyFund: 400000, savingMonthly: 0,
      onTime: true, slik: 'tidaktahu', insurance: true, plan: false, access: {},
      goal: { label: 'Laptop untuk skripsi', amount: 6000000, offer: { rate: 0.03, unit: 'month', months: 12, label: 'Paylater 3%/bulan, 12 bulan' } },
      after: { cuts: true, extraIncome: 550000, extraLabel: 'Tambah 1 proyek desain per bulan', saving1: 150000 },
    },
    dimas: {
      id: 'dimas', name: 'Dimas', tag: 'Karyawan, generasi sandwich, 25 th', stage: 'sandwich', home: 'pilah',
      story: 'Ayahnya dirawat di rumah sakit. Butuh Rp12 juta dalam 3 hari, dana daruratnya hanya Rp3 juta, dan iklan pinjol tercepat terus muncul.',
      incomes: [{ id: 'i1', label: 'Gaji bersih', amount: 8500000, type: 'tetap', payday: 25 }],
      spending: [
        { id: 's1', name: 'Sewa & tagihan rumah', kind: 'need', amount: 1500000, day: 1 },
        { id: 's2', name: 'Makan', kind: 'need', amount: 1200000 },
        { id: 's3', name: 'Transport', kind: 'need', amount: 400000 },
        { id: 's4', name: 'Pulsa, listrik, lain-lain', kind: 'need', amount: 400000 },
      ],
      family: 2500000,
      loans: [
        { id: 'l1', name: 'Cicilan motor', type: 'multifinance', instalment: 900000, outstanding: 12600000, months: 14, dueDay: 10, rateMonthly: 0.016 },
        { id: 'l2', name: 'Paylater e-commerce', type: 'paylater', instalment: 600000, outstanding: 1800000, months: 3, dueDay: 5, rateMonthly: 0.026 },
      ],
      emergencyFund: 3000000, savingMonthly: 0,
      onTime: true, slik: 'lancar', insurance: true, plan: false,
      access: { koperasi: true, bank: true },
      need: { label: 'Biaya rumah sakit ayah', amount: 12000000, hours: 72, family: 2000000, familyFrom: 'kakak perempuan' },
    },
    bima: {
      id: 'bima', name: 'Bima', tag: 'Pemilik 2 kios, 27 th', stage: 'wirausaha', home: 'pulih',
      story: 'Uang usaha dan pribadi tercampur di satu rekening. Dua pinjaman usaha dan satu paylater makan Rp5,6 juta per bulan; ia tekor ±Rp850 rb dan menimbang pinjol ketiga.',
      incomes: [{ id: 'i1', label: 'Laba bersih 2 kios (rata-rata)', amount: 10750000, type: 'tidak tetap', payday: 1, range: 'Omzet Rp28–55 jt/bulan' }],
      spending: [
        { id: 's1', name: 'Kebutuhan rumah tangga', kind: 'need', amount: 4500000 },
        { id: 's2', name: 'Tarikan pribadi dari kas usaha (tak tercatat)', kind: 'want', amount: 1500000, cap: 0, capWhy: 'Pisahkan rekening usaha dan pribadi; gaji diri sendiri tetap' },
      ],
      family: 0,
      loans: [
        { id: 'l1', name: 'Modal usaha (pindar produktif)', type: 'pindar', instalment: 2600000, outstanding: 18200000, months: 7, dueDay: 5, rateMonthly: 0.025, restructure: { instalment: 1350000, months: 15 } },
        { id: 'l2', name: 'Modal usaha (multifinance)', type: 'multifinance', instalment: 2200000, outstanding: 13200000, months: 6, dueDay: 12, rateMonthly: 0.018 },
        { id: 'l3', name: 'Paylater pribadi', type: 'paylater', instalment: 800000, outstanding: 2400000, months: 3, dueDay: 20, rateMonthly: 0.03 },
      ],
      emergencyFund: 0, savingMonthly: 0,
      onTime: false, slik: 'dpk', insurance: true, plan: false, access: { bank: true },
      temptation: { label: 'Pinjol produktif baru untuk menutup cicilan', amount: 20000000, rate: 0.00275, unit: 'day', months: 6 },
    },
  };

  // products used by Smart Loan Match (rates are all within OJK caps: consumer 0.3%/day <=6 mo, 0.2%/day >6 mo; productive 0.275%/day <=Rp50jt)
  const products = [
    { id: 'koperasi', name: 'Koperasi karyawan', kind: 'koperasi', legal: 'Koperasi terdaftar', requires: 'koperasi', requiresWhy: 'Belum tercatat punya akses koperasi', rate: 0.01, unit: 'month', months: 12, feePct: 0, min: 500000, max: 7500000, hours: 48, privacy: 10, note: 'Dipotong dari gaji tiap tanggal gajian' },
    { id: 'bank', name: 'Pinjaman tunai bank digital', kind: 'bank', legal: 'Bank diawasi OJK', requires: 'bank', requiresWhy: 'Belum tercatat punya rekening/akses bank', rate: 0.015, unit: 'month', months: 12, feePct: 0.015, min: 1000000, max: 50000000, hours: 120, privacy: 9, note: 'Persetujuan ±5 hari kerja' },
    { id: 'tenang', name: 'Tenang Kredit', kind: 'pindar', legal: 'Berizin OJK', rate: 0.0015, unit: 'day', months: 12, min: 1000000, max: 15000000, hours: 24, rating: 4.4, positive: 0.71, privacy: 10, purpose: 'konsumtif' },
    { id: 'kilatku', name: 'KilatKu', kind: 'pindar', legal: 'Berizin OJK', rate: 0.0025, unit: 'day', months: 6, min: 500000, max: 10000000, hours: 0.25, rating: 4.0, positive: 0.58, privacy: 8, purpose: 'konsumtif' },
    { id: 'modalpas', name: 'Modal Pas', kind: 'pindar', legal: 'Berizin OJK', rate: 0.001, unit: 'day', months: 6, min: 500000, max: 5000000, hours: 24, rating: 4.6, positive: 0.82, privacy: 10, purpose: 'konsumtif' },
    { id: 'saku', name: 'Saku Sehat Syariah', kind: 'pindar', legal: 'Berizin OJK (syariah)', rate: 0.0012, unit: 'day', months: 6, min: 500000, max: 5000000, hours: 24, rating: 4.5, positive: 0.79, privacy: 10, purpose: 'konsumtif' },
    { id: 'teduh', name: 'Kredit Teduh', kind: 'pindar', legal: 'Berizin OJK', rate: 0.0018, unit: 'day', months: 9, min: 1000000, max: 5000000, hours: 24, rating: 4.3, positive: 0.69, privacy: 10, purpose: 'konsumtif' },
    { id: 'rukun', name: 'Dana Rukun', kind: 'pindar', legal: 'Berizin OJK', rate: 0.002, unit: 'day', months: 12, min: 5000000, max: 50000000, hours: 48, rating: 4.2, positive: 0.64, privacy: 10, purpose: 'produktif' },
    { id: 'pantas', name: 'Pinjam Pantas', kind: 'pindar', legal: 'Berizin OJK', rate: 0.003, unit: 'day', months: 3, min: 300000, max: 4000000, hours: 1, rating: 3.6, positive: 0.41, privacy: 6, purpose: 'konsumtif' },
    { id: 'cairkilat', name: 'Cair Kilat 24 Jam', kind: 'ilegal', illegal: true },
  ];

  const HIGH_RISK = ['Kontak', 'SMS', 'Log panggilan', 'Foto & galeri', 'Penyimpanan'];
  const lenders = [
    { id: 'modalpas', name: 'Modal Pas', since: 2019, type: 'Konsumtif', maxDaily: 0.001, lateDaily: 0.0008, tenor: '1–6 bulan', range: 'Rp500 rb–5 jt', hours: 24, rating: 4.6, positive: 0.82, reviews: 1840, verified: 402,
      aspects: { Harga: .80, Kecepatan: .86, Layanan: .81, Privasi: .92, Penagihan: .78, Persetujuan: .71 }, perms: ['Kamera', 'Mikrofon', 'Lokasi'], iso: [27001, 27701],
      themes: [['Limit awal kecil', 54], ['Verifikasi wajah berulang', 21]], track: [['Mar 2026', 'Tidak ada sanksi tercatat']], quote: 'Pinjam Rp2 jt 3 bulan, total bayar Rp2,18 jt sesuai simulasi.' },
    { id: 'saku', name: 'Saku Sehat Syariah', since: 2020, type: 'Syariah (konsumtif)', maxDaily: 0.0012, lateDaily: 0, tenor: '1–6 bulan', range: 'Rp500 rb–5 jt', hours: 24, rating: 4.5, positive: 0.79, reviews: 960, verified: 188,
      aspects: { Harga: .77, Kecepatan: .83, Layanan: .80, Privasi: .90, Penagihan: .82, Persetujuan: .66 }, perms: ['Kamera', 'Lokasi'], iso: [27001],
      themes: [['Ujrah dijelaskan di awal', 61], ['Persetujuan agak lama', 33]], track: [['Jan 2026', 'Tidak ada sanksi tercatat']], quote: 'Tanpa denda bunga, ada biaya ta’widh yang jelas di akad.' },
    { id: 'tenang', name: 'Tenang Kredit', since: 2020, type: 'Konsumtif', maxDaily: 0.0015, lateDaily: 0.001, tenor: '3–12 bulan', range: 'Rp1–15 jt', hours: 24, rating: 4.4, positive: 0.71, reviews: 2310, verified: 312,
      aspects: { Harga: .58, Kecepatan: .84, Layanan: .72, Privasi: .90, Penagihan: .47, Persetujuan: .66 }, perms: ['Kamera', 'Mikrofon', 'Lokasi'], iso: [27001],
      spike: { aspect: 'Penagihan', delta: 23, theme: 'Telepon penagih di luar jam 08.00–20.00' },
      themes: [['Penagih menelepon di luar jam', 38], ['Denda lebih tinggi dari dugaan', 21], ['Limit turun tanpa info', 14]], track: [['Okt 2026', 'Lonjakan keluhan penagihan (sedang dipantau)']], quote: 'Pinjam Rp3 jt 6 bulan, total bayar Rp3,81 jt, sama dengan yang ditampilkan FinWise.' },
    { id: 'teduh', name: 'Kredit Teduh', since: 2021, type: 'Konsumtif', maxDaily: 0.0018, lateDaily: 0.001, tenor: '3–9 bulan', range: 'Rp1–5 jt', hours: 24, rating: 4.3, positive: 0.69, reviews: 740, verified: 96,
      aspects: { Harga: .63, Kecepatan: .79, Layanan: .70, Privasi: .88, Penagihan: .69, Persetujuan: .62 }, perms: ['Kamera', 'Mikrofon', 'Lokasi'], iso: [],
      themes: [['Biaya admin tidak dirinci', 27]], track: [['Mei 2026', 'Tidak ada sanksi tercatat']], quote: 'Cair sehari, tapi rincian biayanya baru jelas setelah tanda tangan.' },
    { id: 'rukun', name: 'Dana Rukun', since: 2018, type: 'Produktif (UMKM)', maxDaily: 0.002, lateDaily: 0.001, tenor: '6–12 bulan', range: 'Rp5–50 jt', hours: 48, rating: 4.2, positive: 0.64, reviews: 1205, verified: 230,
      aspects: { Harga: .55, Kecepatan: .70, Layanan: .74, Privasi: .87, Penagihan: .66, Persetujuan: .58 }, perms: ['Kamera', 'Lokasi'], iso: [27001],
      themes: [['Bisa restrukturisasi', 44], ['Survei usaha lama', 31]], track: [['Feb 2026', 'Tidak ada sanksi tercatat']], quote: 'Mau diajak restrukturisasi waktu omzet turun, asal ajukan sebelum telat.' },
    { id: 'kilatku', name: 'KilatKu', since: 2021, type: 'Konsumtif', maxDaily: 0.0025, lateDaily: 0.002, tenor: '1–6 bulan', range: 'Rp500 rb–10 jt', hours: 0.25, rating: 4.0, positive: 0.58, reviews: 3880, verified: 405,
      aspects: { Harga: .41, Kecepatan: .94, Layanan: .60, Privasi: .70, Penagihan: .52, Persetujuan: .80 }, perms: ['Kamera', 'Mikrofon', 'Lokasi', 'Kontak'], iso: [],
      themes: [['Cair sangat cepat', 212], ['Total bayar jauh di atas pokok', 96], ['Kontak darurat ditelepon', 41]], flag: 'Teguran', track: [['Agu 2026', 'Teguran iklan menyesatkan (contoh)']], quote: 'Cair 10 menit, tapi cicilannya bikin kaget tiap bulan.' },
    { id: 'pantas', name: 'Pinjam Pantas', since: 2019, type: 'Konsumtif', maxDaily: 0.003, lateDaily: 0.003, tenor: '1–3 bulan', range: 'Rp300 rb–4 jt', hours: 1, rating: 3.6, positive: 0.41, reviews: 5120, verified: 512,
      aspects: { Harga: .30, Kecepatan: .88, Layanan: .44, Privasi: .55, Penagihan: .28, Persetujuan: .74 }, perms: ['Kamera', 'Mikrofon', 'Lokasi', 'Kontak', 'Foto & galeri'], iso: [],
      spike: { aspect: 'Harga', delta: 21, theme: 'Biaya keterlambatan menumpuk cepat' },
      themes: [['Penagihan kasar', 133], ['Denda menumpuk', 118], ['Data kontak dipakai menagih', 64]], flag: 'Ada sanksi', track: [['2025', 'Sanksi administratif OJK (contoh)'], ['Sep 2026', 'Lonjakan keluhan biaya']], quote: 'Telat 5 hari, dendanya sudah hampir sepertiga pinjaman.' },
  ];
  lenders.forEach(l => {
    const extra = l.perms.filter(p => HIGH_RISK.includes(p)).length;
    l.privacy = Math.min(10, Math.max(0, 10 - 2 * extra + (l.iso.includes(27001) ? 0.5 : 0) + (l.iso.includes(27701) ? 0.3 : 0)));
  });

  const illegal = [
    { name: 'Cair Kilat 24 Jam', added: 'Okt 2026', note: 'Diedarkan lewat tautan APK dan pesan WhatsApp' },
    { name: 'Dana Instan Plus', added: 'Okt 2026', note: 'Meminta akses kontak & galeri' },
    { name: 'Pinjaman Ekspres 99', added: 'Sep 2026', note: 'Bunga tidak dicantumkan' },
    { name: 'Uang Kilat Pro', added: 'Sep 2026', note: 'Mengaku terdaftar dengan nomor izin palsu' },
  ];

  // Gate 1 debt-visibility quiz (Persona 2 scenario). Same questions before and after.
  const quiz = [
    { q: 'Gaji bersih Dimas Rp8,5 jt. Ia kirim Rp2,5 jt ke keluarga, kebutuhan pokoknya Rp3,5 jt, dan cicilannya Rp1,5 jt. Berapa sisa uangnya per bulan?',
      a: ['Rp0', 'Rp1 juta', 'Rp2,5 juta', 'Rp4 juta'], correct: 1 },
    { q: 'Berapa cicilan baru per bulan yang masih aman untuk Dimas?', a: ['Rp300 ribu', 'Rp700 ribu', 'Rp1,5 juta', 'Rp2,5 juta'], correct: 1 },
    { q: 'Dimas butuh Rp12 jt. Ia punya tabungan Rp3 jt dan kakaknya bisa bantu Rp2 jt. Berapa yang sebenarnya perlu ia pinjam?', a: ['Rp12 juta', 'Rp9 juta', 'Rp7 juta', 'Rp3 juta'], correct: 2 },
    { q: 'Untuk pinjaman Rp7 jt, mana yang total biayanya paling murah?', a: ['Pindar 0,25%/hari, 6 bulan', 'Pindar 0,15%/hari, 12 bulan', 'Koperasi 1%/bulan, 12 bulan', 'Semuanya kurang lebih sama'], correct: 2 },
    { q: '“Cair Kilat 24 Jam” menjanjikan dana cair 5 menit. Apa status izinnya?', a: ['Berizin OJK', 'Tidak berizin (ilegal)', 'Sedang proses izin', 'Tidak bisa dicek'], correct: 1 },
  ];

  const hints = {
    headroom: 'Angka hijau besar adalah batas cicilan baru yang aman. Batas ini diambil dari yang lebih ketat antara aturan DSR 30% dan 70% sisa uang bulanan.',
    ladder: 'Isi sumber dana selain utang dulu. Sisa yang belum tertutup adalah jumlah yang benar-benar perlu dipinjam.',
    match: 'Kartu paling atas adalah pilihan terbaik untuk prioritas yang kamu pilih. Perhatikan label Aman, Mepet, atau Bahaya dan total biayanya.',
  };

  return { personas, products, lenders, illegal, quiz, hints, HIGH_RISK };
})();
if (typeof module !== 'undefined') module.exports = DATA;
