/* ================= HOME =================
   Three main functions: the personal loan assessment (a route of three steps), the pinjol database,
   and the loan calculator. The 3-day challenge sits underneath as an extra. */
// hero: illustration from the team (img/hero.webp, background removed, "Cair" typo fixed)
const HERO_IMG = `<img class="hero-img" src="img/hero.webp" width="1120" height="844" alt="" decoding="async" fetchpriority="high">`;
// one small scene per step, drawn to sit inside the round station on the route
const STAGE_ART = {
  cek: `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <ellipse cx="100" cy="176" rx="64" ry="8" fill="#13231B" opacity=".08"/>
    <rect x="56" y="38" width="76" height="130" rx="13" fill="#fff" stroke="#13231B" stroke-width="3"/>
    <rect x="82" y="46" width="24" height="4" rx="2" fill="#D9E3DD"/>
    <path d="M68 74h12l6-13 9 26 6-13h17" fill="none" stroke="#1E6B4E" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="70" y="122" width="13" height="30" rx="3" fill="#9CCBB4"/><rect x="88" y="108" width="13" height="44" rx="3" fill="#2E8B6A"/><rect x="106" y="96" width="13" height="56" rx="3" fill="#1E6B4E"/>
    <g fill="#E09A2D" stroke="#94590A" stroke-width="2"><ellipse cx="44" cy="166" rx="17" ry="6"/><path d="M27 166v-8M61 166v-8"/><ellipse cx="44" cy="158" rx="17" ry="6"/></g>
    <circle cx="132" cy="118" r="28" fill="#fff" fill-opacity=".45" stroke="#13231B" stroke-width="6"/>
    <path d="M152 138l18 18" stroke="#13231B" stroke-width="11" stroke-linecap="round"/>
    <path d="M118 108q8-8 18-4" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round"/>
  </svg>`,
  pilah: `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <path d="M100 200V126C100 112 88 96 60 74M100 126c0-14 12-30 40-52" fill="none" stroke="#fff" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M100 200V126C100 112 88 96 60 74M100 126c0-14 12-30 40-52" fill="none" stroke="#E09A2D" stroke-width="3" stroke-dasharray="6 7" stroke-linecap="round"/>
    <path d="M52 84V52" stroke="#13231B" stroke-width="4" stroke-linecap="round"/><path d="M148 84V52" stroke="#13231B" stroke-width="4" stroke-linecap="round"/>
    <rect x="28" y="34" width="50" height="26" rx="7" fill="#1E6B4E"/><path d="m43 47 6 6 12-12" fill="none" stroke="#fff" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <rect x="122" y="34" width="50" height="26" rx="7" fill="#B8302A"/><path d="m141 41 12 12m0-12-12 12" stroke="#fff" stroke-width="3.5" stroke-linecap="round"/>
    <path d="M100 14v26M86 22h28" stroke="#94590A" stroke-width="3" stroke-linecap="round"/>
    <path d="M86 22l-6 12h12zM114 22l-6 12h12z" fill="#E09A2D" stroke="#94590A" stroke-width="2" stroke-linejoin="round"/>
    <rect x="92" y="150" width="17" height="30" rx="7" fill="#4A5B66"/>
    <path d="M86 156c0-16 6-24 14-24s14 8 14 24z" fill="#2B7FA3"/>
    <circle cx="100" cy="122" r="11" fill="#B9774A"/><path d="M89 120c0-9 5-13 11-13s11 4 11 13c-4-4-18-4-22 0z" fill="#13231B"/>
  </svg>`,
  pulih: `<svg viewBox="0 0 200 200" aria-hidden="true" focusable="false">
    <ellipse cx="92" cy="172" rx="56" ry="8" fill="#13231B" opacity=".08"/>
    <rect x="30" y="46" width="46" height="46" rx="7" fill="#fff" stroke="#13231B" stroke-width="2.5"/>
    <path d="M30 60h46" stroke="#13231B" stroke-width="2.5"/><path d="M32 49h42v9H32z" fill="#2B7FA3"/>
    <path d="m37 70 3 3 5-6M53 70l3 3 5-6M37 82l3 3 5-6" fill="none" stroke="#1E6B4E" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="58" cy="82" r="2.4" fill="#D9E3DD"/>
    <g fill="#E09A2D" stroke="#94590A" stroke-width="2">
      <ellipse cx="92" cy="164" rx="34" ry="10"/><path d="M58 164v-12M126 164v-12"/><ellipse cx="92" cy="152" rx="34" ry="10"/><path d="M58 152v-12M126 152v-12"/><ellipse cx="92" cy="140" rx="34" ry="10"/>
    </g>
    <path d="M92 136V96" stroke="#1E6B4E" stroke-width="5" stroke-linecap="round"/>
    <path d="M92 108c0-20 13-31 33-31 0 20-13 31-33 31z" fill="#2E8B6A"/>
    <path d="M92 118c0-16-11-25-27-25 0 16 11 25 27 25z" fill="#1E6B4E"/>
    <path d="M132 76h34l-4 30h-26z" fill="#2B7FA3"/><path d="M166 82q14 4 4 20" fill="none" stroke="#2B7FA3" stroke-width="5" stroke-linecap="round"/>
    <path d="M134 84 112 70" stroke="#2B7FA3" stroke-width="6" stroke-linecap="round"/><circle cx="110" cy="69" r="4" fill="#1F5F7A"/>
    <path d="M106 80q-3 6 0 8q3-2 0-8zM100 92q-3 6 0 8q3-2 0-8z" fill="#7CC3DD"/>
  </svg>`,
};
function stepStatus(st) {
  if (needsSetup()) return '';
  const p = P(), h = FW.headroom(p);
  const R = FW.readiness(p);
  const txt = st.r === 'cek' ? (H => `Kondisi keuangan ${H.total}/100 · ${H.status}`)(FW.health(p))
    : st.r === 'pilah' ? (R.level ? `Pinjaman maksimal aman ${rps(R.max[6])} (6 bulan)` : 'Belum ada ruang untuk pinjaman baru')
    : p.loans.length ? `${p.loans.length} utang aktif, cicilan ${rps(h.ex)}/bulan` : 'Belum ada utang aktif';
  return `<p class="stop-you">${ico('check')}<span>${txt}</span></p>`;
}
// what the visitor came for decides where the first click goes; the three assessment steps need "Data saya" first
const INTENTS = [
  ['sehat', 'cek', 'Tahu kondisi keuanganku', 'CEK: kesiapan berutang dan rencana hemat'],
  ['dana', 'pilah', 'Butuh dana sekarang', 'PILAH: berapa yang aman dan dari mana'],
  ['utang', 'pulih', 'Utangku mulai berat', 'PULIH: jadwal bayar dan jalan keluarnya'],
  ['hitung', 'calc', 'Menghitung sebuah penawaran', 'Kalkulator: cicilan dan total yang dikembalikan'],
  ['legal', 'db', 'Mengecek pinjol legal atau tidak', 'Database: daftar OJK dan Satgas PASTI'],
];
const intentHref = (k, ready) => ({ sehat: ready ? '#cek' : '#mulai', dana: ready ? '#pilah' : '#mulai', utang: ready ? '#pulih' : '#mulai', hitung: '#kalkulator', legal: '#openspace' })[k];
function vHome() {
  const ready = !needsSetup();
  const ex = FW.loan({ principal: 5e6, rate: 0.003, unit: 'day', months: 6 });
  return `<section class="home-hero">
    <div class="hh-text">
      <h1 tabindex="-1">Cek dulu sebelum pinjam.</h1>
      <p class="lead">FinWise membaca angkamu sendiri: berapa yang aman dicicil, dari mana dana termurah, dan bagaimana keluar dari utang. Bukan dari iklan pinjol.</p>
      <div class="intent" role="group" aria-labelledby="int-h"><h2 id="int-h" class="intent-q">Apa yang kamu butuhkan sekarang?</h2>
        <ul class="intent-opts">${INTENTS.map(([k, ic, t, d], i) => `<li><a class="int${i < 3 ? ' int-a' : ''}" href="${intentHref(k, ready)}" data-act="intent" data-v="${k}"><span class="int-ico">${ico(ic)}</span><span class="int-t"><b>${t}</b><small>${d}</small></span></a></li>`).join('')}</ul>
        ${ready ? '' : '<p class="tiny muted">Tiga pilihan pertama menghitung dari angkamu, jadi isi data dulu (±3 menit, tersimpan di browser ini saja).</p>'}</div>
      <p class="hh-note">${ico('db')}<span>Gratis, tanpa login. Datamu hanya tersimpan di browser ini, dan nama pinjol dicocokkan dengan daftar resmi OJK dan Satgas PASTI.</span></p>
    </div>
    ${HERO_IMG}
  </section>

  <section class="journey" aria-labelledby="j-h">
    <div class="j-head"><h2 id="j-h">${ico('route', 'h-ico')}Asesmen pinjaman pribadi</h2>
      <p>Tiga langkah untuk tiga keadaan. Mulai dari yang paling sesuai dengan kondisimu sekarang; datamu cukup diisi sekali untuk ketiganya.</p></div>
    <ol class="route">
      ${STEPS.map((st, i) => `<li class="stop st-${st.r}">
        <div class="stop-mark"><span class="stop-ring">${STAGE_ART[st.r]}</span><span class="stop-n" aria-hidden="true">${i + 1}</span></div>
        <div class="stop-body">
          <p class="stop-when">Langkah ${i + 1}: ${st.when.toLowerCase()}</p>
          <h3><span class="stop-name">${st.name}</span><span class="stop-q">${st.q}</span></h3>
          <ul class="stop-gets">${st.gets.map(g => `<li>${g}</li>`).join('')}</ul>
          ${stepStatus(st)}
          <a class="btn stop-btn" href="${st.r === 'cek' && !ready ? '#mulai' : '#' + st.r}">${st.r === 'cek' ? (ready ? 'Buka CEK' : 'Mulai dari CEK') : 'Buka ' + st.name}</a>
        </div></li>`).join('')}
    </ol>
  </section>

  <section class="tools" aria-label="Alat cek cepat">
    <div class="tool tool-db">
      <div class="tool-head"><span class="tool-ico">${ico('db')}</span><div><h2>Database pinjol</h2><p>Sebelum memberi data apa pun, cocokkan nama aplikasinya dengan daftar resmi OJK dan Satgas PASTI.</p></div></div>
      <form class="row" data-form="quickcheck" role="search">${sugField('qc', { label: 'Nama aplikasi pinjol', placeholder: 'Ketik nama aplikasi, mis. AdaKami', minw: 180 })}<button class="btn">Cek legalitas</button></form>
      <dl class="db-stats">
        <div><dt>pindar berizin OJK</dt><dd class="num">${OJK.licensed.length}</dd></div>
        <div><dt>nama pinjol ilegal</dt><dd class="num" style="color:var(--danger)">${ILL.length}</dd></div>
        <div><dt>nama berizin yang ditiru aplikasi ilegal</dt><dd class="num" style="color:var(--stretch)">${CLONED.length}</dd></div>
      </dl>
      <div class="cloned"><p>Nama berizin yang sering ditiru aplikasi ilegal. Pastikan nama perusahaannya cocok sebelum mengunduh:</p>
        <div class="chips">${CLONED.slice(0, 6).map(l => `<a class="chip" href="#pinjol" data-act="lender" data-id="${l.id}">${esc(l.name)}</a>`).join('')}</div></div>
      <a class="tool-more" href="#openspace">Buka database lengkap: profil, ulasan, dan statistik industri</a>
    </div>
    <div class="tool tool-calc">
      <div class="tool-head"><span class="tool-ico">${ico('calc')}</span><div><h2>Kalkulator pinjaman</h2><p>Iklan menyebut bunga per hari. Kalkulator menghitung uang yang benar-benar kamu kembalikan.</p></div></div>
      <div class="receipt" role="group" aria-label="Contoh hitungan pinjaman">
        <p class="rc-title">Contoh: pinjam Rp5 juta selama 6 bulan</p>
        <div class="rc-row"><span>Bunga di iklan</span><b>0,3% per hari</b></div>
        <div class="rc-row"><span>Cicilan</span><b class="num">${rp(ex.inst)} × 6</b></div>
        <div class="rc-row rc-total"><span>Total yang dikembalikan</span><b class="num">${rp(5e6 + ex.total)}</b></div>
        <div class="rc-row"><span>${term('Bunga efektif', 'Bunga sebenarnya')}</span><b class="num">±${pct(ex.ear, 0)} per tahun</b></div>
      </div>
      <a class="btn" href="#kalkulator">Hitung pinjamanmu</a>
    </div>
  </section>

  <a class="challenge" href="#main">
    <span class="ch-ico">${ico('game')}</span>
    <span class="ch-text"><small>Game literasi keuangan · ±5 menit, atau main cepat 60 detik</small><b>Lolos Jebakan Pinjol</b><span>Kartu kilat, lalu sebulan jadi Dimas lewat notifikasi HP: bagi gaji ke amplop, tolak flash sale, temukan tanda bahaya di iklan pinjol.</span></span>
    <span class="btn amber">Main sekarang</span>
  </a>`;
}
