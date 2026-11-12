/* ================= HOME ================= */
function vHome() {
  const ready = S.profiles.saya.setup;
  return `<section class="hero">
    <div>
      <div class="badge-ojk">✓ Data resmi OJK & Satgas PASTI</div>
      <h1>Cek dulu <em>sebelum</em> pinjam.</h1>
      <p class="lead">FinWise membaca angkamu sendiri: berapa yang aman dicicil, dari mana dana termurah, dan bagaimana keluar dari utang. Bukan dari iklan pinjol.</p>
      <div class="row">${ready ? '<a class="btn big-btn" href="#cek">Lihat kondisi keuanganku</a>' : '<a class="btn big-btn" href="#mulai">Mulai cek keuanganku (±3 menit)</a>'}<a class="btn ghost big-btn" href="#openspace">Cek legalitas pinjol</a></div>
      <p class="small muted" style="margin-top:10px">Gratis. Data hanya tersimpan di browsermu.</p>
    </div>
    <div class="howcard" aria-label="Cara kerja FinWise">
      <div class="lab">Cara kerja FinWise</div>
      ${[['1', 'Isi datamu', 'Pemasukan, pengeluaran, dan cicilan. Semua mulai kosong.'], ['2', 'Lihat kondisimu', 'Skor kesehatan, rasio keuangan, dan batas cicilan yang aman.'], ['3', 'Putuskan dengan tenang', 'Tangga dana, pinjaman legal termurah, dan rencana pelunasan.']].map(([n, t, d]) => `<div class="how"><span>${n}</span><div><b>${t}</b><p class="small muted">${d}</p></div></div>`).join('')}
    </div>
  </section>
  <h2 style="margin:8px 0 14px">Tiga tahap, satu tujuan: tidak terjebak utang</h2>
  <div class="grid g3">
    ${[['cek', 'e-cek', 'CEK', 'Sebelum berutang', 'Seberapa sehat keuanganku?', 'Ringkasan kondisi, rasio keuangan, skor kesehatan, dan rencana hemat yang bisa langsung dijalankan.'],
       ['pilah', 'e-pilah', 'PILAH', 'Saat butuh dana', 'Berapa yang aman, dan dari mana?', 'Batas cicilan aman, tangga dana tanpa utang, lalu 3 pinjaman legal yang paling cocok.'],
       ['pulih', 'e-pulih', 'PULIH', 'Setelah berutang', 'Bagaimana cara keluar dari utang?', 'Jadwal bayar, pengingat, urutan pelunasan paling hemat, dan cek “pinjam untuk bayar pinjaman”.']]
      .map(([r, e, t, w, q, d]) => `<a class="card stage-card" href="#${r}"><span class="tagline ${e}">${t} · ${w}</span><span class="q">${q}</span><span class="muted small">${d}</span><span class="small go">Buka ${t} →</span></a>`).join('')}
  </div>
  <div class="grid g3" style="margin-top:16px">
    <div class="card"><div class="eyebrow e-os" style="font-weight:800;font-size:.8125rem;letter-spacing:.04em">CEK PINJOL · TANPA LOGIN</div><h3 style="margin:6px 0 10px">Pinjol ini legal atau tidak?</h3>
      <form class="row" data-form="quickcheck" role="search">${sugField('qc', { label: 'Nama aplikasi pinjol', placeholder: 'mis. AdaKami atau Dana Siap', minw: 160 })}<button class="btn">Cek</button></form>
      <p class="tiny muted" style="margin-top:8px">${OJK.licensed.length} pindar berizin OJK dan ${OJK.illegalEntries.toLocaleString('id-ID')} entri pinjol ilegal Satgas PASTI.</p></div>
    <a class="card stage-card" href="#kalkulator"><span class="tagline e-pilah">KALKULATOR</span><span class="q">Berapa cicilan & bunga sebenarnya?</span><span class="muted small">Geser jumlah dan tenor, langsung lihat status Aman, Mepet, atau Bahaya.</span><span class="small go">Buka kalkulator →</span></a>
    <a class="card stage-card gamecard" href="#main"><span class="tagline" style="color:#FFD58A">TANTANGAN 3 HARI · ±10 MENIT</span><span class="q" style="color:#fff">Bisa lolos dari jebakan pinjol?</span><span class="small" style="color:#D6EADF">Bantu Dimas mendapat Rp12 juta dalam 3 hari tanpa terjebak. Kumpulkan 3 bintang.</span><span class="small go" style="color:#FFD58A">Mulai tantangan →</span></a>
  </div>`;
}
