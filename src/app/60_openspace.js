/* ================= OPENSPACE: public explorer (OJK lists + team data) ================= */
const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
const ILL = OJK.illegal.filter(g => !g.generic), ILL_GENERIC = FW.sum(OJK.illegal.filter(g => g.generic), g => g.n);
// one record per licensed company: the OJK list joined with the team's detailed data (20 of them)
const LIC = OJK.licensed.map(o => { const d = RL.find(l => norm(l.license) === norm(o.license)); return { ...o, id: d ? d.id : 'o' + o.no, d, name: d ? d.name : o.app }; });
const CLONED = LIC.filter(l => l.clones.length);
const licById = id => LIC.find(l => l.id === id);
// FinWise safety score: transparent, 0-100, from the data we have (no data = neutral, never a bonus)
function safety(l) {
  const d = l.d, parts = [['Berizin & diawasi OJK', 25, 25]];
  if (!d) return { total: null, parts };
  const ri = rateInfo(d), cost = sampleCost(d);
  parts.push(['Tarif maksimum dipublikasikan', ri && !ri.min ? 10 : 0, 10], ['Biaya admin & denda dirinci', (d.adminPct != null ? 5 : 0) + (d.lateDaily != null ? 5 : 0), 10]);
  parts.push(['Biaya dibanding plafon OJK', cost != null ? Math.round(20 * Math.max(0, 1 - cost / 270000)) : 0, 20]);
  parts.push(['Suara peminjam (rating & keluhan)', d.reviews ? Math.round(d.reviews.avg / 5 * 15 + (1 - d.reviews.neg) * 5) : 10, 20]);
  parts.push(['Sertifikasi keamanan data (ISO)', (d.iso27001 ? 7.5 : 0) + (d.iso27701 ? 7.5 : 0), 15]);
  return { total: Math.round(FW.sum(parts, x => x[1])), parts };
}
const scoreRing = (v, size = 64) => v == null ? '' : `<div class="mring" style="--p:${v};--s:${size}px;--c:${v >= 70 ? 'var(--safe)' : v >= 50 ? 'var(--stretch)' : 'var(--danger)'}" role="img" aria-label="Skor keamanan ${v} dari 100"><span>${v}</span></div>`;
function lookup(q) {
  const k = norm(q); if (!k) return null;
  const hit = (name, minLen = 4) => { const n = norm(name); return n === k || (k.length >= minLen && n.includes(k)) || (n.length >= minLen && k.includes(n)); };
  const exL = LIC.find(l => norm(l.name) === k || norm(l.app) === k || norm(l.license) === k || norm(l.company) === k);
  const exI = ILL.filter(i => norm(i.name.split(/\s[-–|:/]\s?|[:|/]/)[0]) === k || norm(i.name) === k);
  if (exL && exI.length) return { kind: 'clone', lender: exL, ill: exI };
  if (exL) return { kind: 'licensed', lender: exL };
  const lic = LIC.filter(l => hit(l.name) || hit(l.app) || hit(l.company, 6)).slice(0, 8), ill = ILL.filter(i => hit(i.name, 5)).slice(0, 12);
  if (exI.length && !lic.length) return { kind: 'illegal', item: exI[0] };
  if (lic.length + ill.length > 1) return { kind: 'multi', q, lic, ill };
  if (ill.length) return { kind: 'illegal', item: ill[0] };
  if (lic.length) return { kind: 'licensed', lender: lic[0] };
  if (hit('Cair Kilat 24 Jam') || hit('Cair Kilat')) return { kind: 'scenario', q };
  return { kind: 'unknown', q, dym: didYouMean(q) };
}
const waShare = text => `https://wa.me/?text=${encodeURIComponent(text)}`;
const illWarn = i => `PERINGATAN: "${i.name}" TIDAK berizin OJK. Namanya ada di daftar pinjol ilegal Satgas PASTI (${OJK.illegalPeriod}). Jangan install dan jangan beri akses kontak/galeri. Cek pinjol lain: Kontak OJK 157 / WA 081-157-157-157.`;
function lookupResult(R) {
  if (!R) return '';
  const licLine = l => `<b>${esc(l.name)}</b> berizin OJK · ${esc(l.company)}, izin ${esc(l.license)} (${esc(l.date)}).`;
  if (R.kind === 'licensed') return `<div class="note safe" style="margin-top:12px">${licLine(R.lender)} <a href="#pinjol" data-act="lender" data-id="${R.lender.id}">Lihat profil</a>${R.lender.clones.length ? `<div class="small" style="margin-top:6px"><b>Hati-hati:</b> ada aplikasi ilegal yang meniru nama ini (${R.lender.clones.map(esc).join(', ')}). Unduh hanya dari Play Store/App Store resmi dan cocokkan nama perusahaannya.</div>` : ''}</div>`;
  if (R.kind === 'clone') return `<div class="note amber" style="margin-top:12px"><b>Nama ini dipakai dua pihak.</b><div style="margin-top:6px">✅ ${licLine(R.lender)} <a href="#pinjol" data-act="lender" data-id="${R.lender.id}">Lihat profil</a></div><div style="margin-top:4px">⛔ Tiruan ilegal dengan nama sama tercatat di daftar Satgas PASTI, disebar lewat ${esc(R.ill.flatMap(i => i.ch).filter((x, i, a) => a.indexOf(x) === i).join(', '))}.</div><div class="small" style="margin-top:6px">Pastikan kamu mengunduh dari toko aplikasi resmi, nama pengembangnya ${esc(R.lender.company)}, dan tidak ada permintaan akses kontak/galeri.</div></div>`;
  if (R.kind === 'illegal') return `<div class="note danger" style="margin-top:12px"><b>${esc(R.item.name)}: TIDAK berizin OJK.</b> Tercatat di daftar pinjol ilegal Satgas PASTI (${OJK.illegalPeriod})${R.item.ch.length ? `, disebar lewat ${esc(R.item.ch.join(', '))}` : ''}${R.item.hosts.length ? ` (${esc(R.item.hosts.slice(0, 3).join(', '))})` : ''}. Jangan pasang aplikasinya dan jangan beri akses kontak atau galeri.<div class="row" style="margin-top:8px"><a class="btn sm" href="${waShare(illWarn(R.item))}" target="_blank" rel="noopener noreferrer">Bagikan peringatan via WhatsApp<span class="sr"> (tab baru)</span></a><span class="tiny">Laporkan: Kontak OJK 157 / WA 081-157-157-157</span></div></div>`;
  if (R.kind === 'multi') return `<div class="note amber" style="margin-top:12px"><b>Ada ${R.lic.length + R.ill.length} nama yang mirip dengan “${esc(R.q)}”.</b> Pilih yang persis sama dengan aplikasi yang kamu lihat:<ul class="stack" style="margin:8px 0 0;padding:0;list-style:none;gap:6px">${R.lic.map(l => `<li><a href="#pinjol" data-act="lender" data-found="1" data-id="${l.id}">${esc(l.name)}</a> <span class="pill z-safe">Berizin OJK</span> <span class="tiny muted">${esc(l.company)}</span></li>`).join('')}${R.ill.map((i, n) => `<li><button class="linkbtn" data-act="os-illegal" data-v="${n}">${esc(i.name)}</button> <span class="pill z-danger">Tidak berizin</span></li>`).join('')}</ul><p class="tiny" style="margin-top:6px">Aplikasi ilegal sering meniru nama yang legal. Cocokkan juga nama perusahaan dan nomor izinnya.</p></div>`;
  if (R.kind === 'scenario') return `<div class="note amber" style="margin-top:12px"><b>“Cair Kilat 24 Jam” adalah nama fiktif</b> dari game Lolos Jebakan Pinjol, dipakai sebagai contoh pola pinjol ilegal (cair 5 menit, tanpa izin).</div>`;
  return `<div class="note amber" style="margin-top:12px"><b>“${esc(R.q)}” tidak ada di daftar ${LIC.length} pindar berizin (OJK, ${OJK.licensedPeriod})</b> maupun ${ILL.length} nama pinjol ilegal (Satgas PASTI, ${OJK.illegalPeriod}). Daftar ilegal terus bertambah, jadi <b>anggap belum aman</b>: jangan beri data apa pun sebelum memastikan ke Kontak OJK 157 / WhatsApp 081-157-157-157.<div class="tiny" style="margin-top:6px">Catatan: paylater dari bank atau perusahaan pembiayaan (multifinance) punya izin berbeda dan tidak masuk daftar pindar ini.</div>${R.dym?.length ? `<div style="margin-top:8px"><b>Mungkin maksudmu:</b> ${R.dym.map(x => x.t === 'lic' ? `<a href="#pinjol" data-act="lender" data-found="1" data-id="${x.id}">${esc(x.name)}</a> <span class="pill z-safe">Berizin</span>` : `<button class="linkbtn" data-act="os-pick-ill" data-v="${x.n}">${esc(x.name)}</button> <span class="pill z-danger">Ilegal</span>`).join(' · ')}</div>` : ''}</div>`;
}
function osNav() {
  const tabs = [['openspace', 'Beranda'], ['berizin', `Berizin (${LIC.length})`], ['ilegal', `Ilegal (${ILL.length})`], ['keluhan', 'Pemantau keluhan'], ['bandingkan', `Bandingkan${S.os.cmp.length ? ' (' + S.os.cmp.length + ')' : ''}`], ['statistik', 'Statistik industri']];
  return `<nav class="ostabs" aria-label="Database pinjol">${tabs.map(([r, l]) => `<a href="#${r}" class="${S.route === r || (r === 'berizin' && S.route === 'pinjol') ? 'on' : ''}" ${S.route === r ? 'aria-current="page"' : ''}>${l}</a>`).join('')}</nav>`;
}
// typo tolerance: closest names by edit distance ("akadami" -> AdaKami)
function lev(a, b) { if (Math.abs(a.length - b.length) > 3) return 9; let prev = Array.from({ length: b.length + 1 }, (_, j) => j); for (let i = 1; i <= a.length; i++) { const cur = [i]; for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = cur; } return prev[b.length]; }
const illHead = i => norm(i.name.split(/\s[-–|:/]\s?|[:|/]/)[0]);
function didYouMean(q) {
  const k = norm(q); if (k.length < 4) return []; const lim = k.length >= 6 ? 2 : 1;
  return [...LIC.map(l => ({ t: 'lic', id: l.id, name: l.name, sub: l.company, d: Math.min(lev(k, norm(l.name)), lev(k, norm(l.app))) })), ...ILL.map((i, n) => ({ t: 'ill', n, name: i.name, sub: i.ch.slice(0, 2).join(' · '), d: lev(k, illHead(i)) }))]
    .filter(x => x.d <= lim).sort((a, b) => a.d - b.d || (a.t === 'lic' ? -1 : 1)).slice(0, 5);
}
// type-ahead: suggest real names from both lists so users pick one exact entry instead of guessing (and typos stop mattering)
function suggest(q) {
  const k = norm(q); if (k.length < 2) return [];
  const sc = n => !n ? 0 : n === k ? 4 : n.startsWith(k) ? 3 : n.includes(k) ? 1 : 0;
  const lic = LIC.map(l => ({ l, s: Math.max(sc(norm(l.name)), sc(norm(l.app)), sc(norm(l.company)) - 0.5, norm(l.license) === k ? 4 : 0) })).filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || (b.l.d ? 1 : 0) - (a.l.d ? 1 : 0) || a.l.name.localeCompare(b.l.name)).slice(0, 6).map(({ l }) => ({ t: 'lic', id: l.id, name: l.name, sub: l.company }));
  const ill = ILL.map((i, n) => ({ i, n, s: sc(norm(i.name)) })).filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || a.i.name.length - b.i.name.length).slice(0, Math.max(3, 8 - lic.length)).map(({ i, n }) => ({ t: 'ill', n, name: i.name, sub: i.ch.slice(0, 2).join(' · ') }));
  return lic.length + ill.length ? [...lic, ...ill].slice(0, 8) : didYouMean(q).map(x => ({ ...x, fuzzy: true }));
}
const sugItems = (id, list) => list.length ? list.map((s, j) => `<li role="option" id="${id}-o${j}" data-sug="${j}" aria-selected="false"><span class="sg-main"><b>${esc(s.name)}</b><span class="tiny muted">${esc(s.sub || '')}</span></span><span class="pill ${s.t === 'lic' ? 'z-safe' : 'z-danger'}">${s.t === 'lic' ? 'Berizin OJK' : 'Ilegal'}</span></li>`).join('') + (list[0].fuzzy ? '<li class="sg-empty" aria-hidden="true">Tidak ada yang persis sama. Mungkin maksudmu salah satu di atas.</li>' : '')
  : `<li class="sg-empty" aria-disabled="true">Tidak ada nama yang mirip di daftar OJK maupun Satgas PASTI. Tekan Cek untuk melihat artinya.</li>`;
// accessible combobox (ARIA 1.2 pattern): the input owns a listbox; arrows move, Enter picks, Esc closes
function sugField(id, { placeholder, label, minw = 200 }) {
  return `<div class="sugwrap" style="flex:1;min-width:${minw}px"><label class="sr" for="${id}">${label}</label><input class="in" id="${id}" role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list" aria-describedby="${id}-hint" data-sug-input value="${esc(id === 'osq' ? S.os.q : S.os.qc || '')}" placeholder="${esc(placeholder)}" autocomplete="off" spellcheck="false"><ul class="sugg" id="${id}-list" role="listbox" aria-label="Saran nama pinjol" hidden></ul><span class="sr" id="${id}-hint">Ketik minimal 2 huruf, lalu pilih nama dari daftar saran dengan panah atas atau bawah dan Enter.</span></div>`;
}
function searchBox(big) {
  return `<form class="row ${big ? 'bigsearch' : ''}" data-form="oscheck" role="search">${sugField('osq', { label: 'Nama aplikasi, perusahaan, atau nomor izin', placeholder: 'Ketik nama aplikasi, mis. AdaKami' })}<button class="btn">Cek legalitas</button></form>${big ? '<p class="tiny" style="margin-top:6px;opacity:.85">Pilih dari daftar saran yang muncul supaya tidak salah nama.</p>' : ''}<div aria-live="polite">${['licensed', 'clone'].includes(S.os.result?.kind) ? '' : lookupResult(S.os.result)}</div>`;
}
// shown on top of a lender profile when the user arrived from a legality check
function foundNote(l) {
  const clone = l.clones.length;
  return `<div class="note ${clone ? 'amber' : 'safe'} found" style="margin:0 0 14px"><div class="row between" style="gap:12px;align-items:flex-start"><div style="min-width:0;flex:1 1 320px"><b style="font-size:1.05rem">${clone ? '⚠' : '✓'} Hasil cek: ${esc(l.name)} berizin dan diawasi OJK.</b>
    <div class="small" style="margin-top:4px">${esc(l.company)} · izin ${esc(l.license)} (${esc(l.date)}).${clone ? ` <b>Hati-hati:</b> ada aplikasi ilegal yang memakai nama mirip (${l.clones.map(esc).join(', ')}). Pastikan pengembangnya ${esc(l.company)} dan unduh hanya dari toko resmi.` : ' Berizin belum tentu murah: cek biaya dan keluhan di bawah sebelum meminjam.'}</div></div>
    <form class="row" data-form="oscheck" role="search" style="flex:1 1 300px;max-width:440px">${sugField('osq', { label: 'Cek nama pinjol lain', placeholder: 'Cek nama lain', minw: 160 })}<button class="btn sm">Cek</button></form></div></div>`;
}
function vOpenspace() {
  const st = OJK.stats, revApps = RL.filter(l => l.reviews).length;
  return `${osNav()}
   <section class="oshero"><div class="eyebrow e-os">DATABASE PINJOL · TERBUKA UNTUK SEMUA, TANPA LOGIN</div><h1 tabindex="-1">Pinjol ini legal atau tidak?</h1><p class="lead" style="margin:8px 0 16px">Cek sebelum memberi data apa pun. Dicocokkan dengan daftar resmi OJK dan Satgas PASTI.</p>${searchBox(true)}</section>
   <div class="grid g4 stats">
    <a class="stat" href="#berizin"><span class="ic safe" aria-hidden="true">✓</span><span class="k">Pindar berizin</span><b>${LIC.length}</b><span class="s">daftar OJK ${OJK.licensedPeriod} · ${st.companies} per ${st.period}</span></a>
    <a class="stat" href="#ilegal"><span class="ic danger" aria-hidden="true">!</span><span class="k">Pinjol ilegal tercatat</span><b>${OJK.illegalEntries.toLocaleString('id-ID')}</b><span class="s">${ILL.length} nama · Satgas PASTI ${OJK.illegalPeriod}</span></a>
    <a class="stat" href="#statistik"><span class="ic amber" aria-hidden="true">%</span><span class="k">Kredit macet industri (${term('TWP90')})</span><b>${pct(st.trend[st.trend.length - 1].twp, 2)}</b><span class="s">${st.period} · naik dari ${pct(st.trend[0].twp, 2)} setahun lalu</span></a>
    <a class="stat" href="#keluhan"><span class="ic" aria-hidden="true">★</span><span class="k">Ulasan dianalisis</span><b>${REV_TOTAL.toLocaleString('id-ID')}</b><span class="s">${revApps} aplikasi · ${CLUSTER_TOTAL} klaster keluhan & pujian</span></a>
   </div>
   <div class="card" style="margin-top:16px;border-color:var(--danger)"><div class="row between"><h2 style="font-size:1.2rem">Waspada nama tiruan</h2><span class="pill z-danger">${CLONED.length} pindar berizin ditiru</span></div>
    <p class="small" style="margin-top:6px">Nama-nama pindar berizin ini juga muncul di daftar pinjol ilegal, biasanya sebagai aplikasi tiruan di toko APK pihak ketiga. Nama sama belum tentu aman.</p>
    <div class="row" style="margin-top:10px">${CLONED.map(l => `<a class="chip danger" href="#pinjol" data-act="lender" data-id="${l.id}">${esc(l.name)}</a>`).join('')}</div></div>
   <div class="grid g3" style="margin-top:16px">
    ${[['berizin', 'Daftar pindar berizin', `${LIC.length} penyelenggara. ${RL.length} di antaranya lengkap dengan tarif RIPLAY, ulasan, dan skor keamanan.`], ['ilegal', 'Daftar pinjol ilegal', `${ILL.length} nama dari ${OJK.illegalEntries} entri: situs, toko APK, dan akun media sosial.`], ['keluhan', 'Pemantau keluhan', 'Lonjakan ulasan negatif dalam 72 jam terakhir per aplikasi.'], ['bandingkan', 'Bandingkan pinjol', 'Hingga 3 pindar berdampingan: total biaya, cicilan, ulasan, keamanan.'], ['statistik', 'Statistik industri', `Kredit macet per provinsi dan usia, ${st.period}.`], ['kalkulator', 'Kalkulator pinjaman', 'Hitung cicilan dan biaya maksimum sesuai plafon OJK.']].map(([r, t, d]) => `<a class="tile lg" href="#${r}"><b>${t}</b><span>${d}</span></a>`).join('')}
   </div>
   <div class="card flat" style="margin-top:16px"><h3>Dari mana datanya</h3><div class="grid g3" style="margin-top:10px">${[['Daftar LPBBTI berizin', `OJK, ${OJK.licensedPeriod} (${LIC.length} penyelenggara)`], ['Daftar pinjol ilegal', `Satgas PASTI, ${OJK.illegalPeriod} (${OJK.illegalEntries} entri)`], ['Statistik LPBBTI', `OJK, ${st.period}`], ['Tarif & biaya (RIPLAY)', `${RL.length} pindar, diverifikasi ${dateID('2026-04-30')}`], ['Ulasan Google Play', `${REV_TOTAL.toLocaleString('id-ID')} ulasan dari ${revApps} aplikasi (sampai ${dateID(REV_TO)})`], ['Komunitas FinWise', 'ulasan pengguna, dimoderasi']].map(([a, b]) => `<div class="note small"><b>${a}</b><div class="tiny muted">${b}</div></div>`).join('')}</div>
    <p class="tiny muted" style="margin-top:8px">Nama pengulas dan pengembang perorangan tidak ditampilkan. Di versi pilot, data diperbarui otomatis.</p></div>`;
}
function lenderCard(l) {
  const d = l.d, sc = safety(l).total, ri = d && rateInfo(d), cost = d && sampleCost(d), inCmp = S.os.cmp.includes(l.id);
  const comp = d?.clusters.filter(c => c.type === 'complaint').sort((a, b) => b.n - a.n)[0], pr = d?.clusters.filter(c => c.type === 'praise').sort((a, b) => b.n - a.n)[0];
  return `<article class="lcard ${d ? '' : 'thin'}"><div class="row between" style="align-items:flex-start;flex-wrap:nowrap;gap:10px"><div style="min-width:0"><h3><a href="#pinjol" data-act="lender" data-id="${l.id}">${esc(l.name)}</a></h3><div class="tiny muted">${esc(l.company)}</div><div class="row" style="gap:6px;margin-top:6px"><span class="pill z-safe">Berizin</span><span class="tag">${esc(l.kind)}</span>${d ? `<span class="tag">${esc(kindLabel(d))}</span>` : ''}${l.clones.length ? '<span class="pill z-danger">Ada tiruan</span>' : ''}</div></div>${scoreRing(sc, 56)}</div>
   ${d ? `<div class="lfacts"><div><span>Tarif</span><b>${ri ? esc(ri.label) : 'tidak dipublikasikan'}</b></div><div><span>Rp1 jt · 3 bln</span><b>${cost != null ? 'maks ' + rps(cost) : '–'}</b></div><div><span>Rating sampel</span><b>${d.reviews ? '★ ' + nf(d.reviews.avg, 1) : '–'}</b></div></div>
    <div class="row" style="gap:6px">${pr ? `<span class="chip ok">👍 ${esc(pr.label)}</span>` : ''}${comp ? `<span class="chip warn">⚠ ${esc(comp.label)}</span>` : ''}</div>` : `<p class="tiny muted">Izin ${esc(l.license)} · ${esc(l.date)}. Tarif dan ulasan belum dikumpulkan tim.</p>`}
   <div class="row" style="margin-top:auto;gap:8px"><a class="btn sm" href="#pinjol" data-act="lender" data-id="${l.id}">Lihat profil</a>${d ? `<button class="btn ghost sm" data-act="cmp" data-id="${l.id}" aria-pressed="${inCmp}">${inCmp ? '✓ Dibandingkan' : '+ Bandingkan'}</button>` : ''}</div></article>`;
}
function vBerizin() {
  const os = S.os, q = norm(os.listQ);
  let list = LIC.filter(l => (os.only !== 'lengkap' || l.d) && (os.filter === 'semua' || (os.filter === 'syariah' ? l.kind === 'Syariah' : os.filter === 'konsumtif' ? l.d && l.d.purpose !== 'produktif' : os.filter === 'produktif' ? l.d && l.d.purpose !== 'konsumtif' : true)) && (!q || norm(l.name + l.company + l.license).includes(q)));
  const by = { skor: l => -(safety(l).total ?? -1), biaya: l => l.d ? (sampleCost(l.d) ?? 9e9) : 9e9 + 1, rating: l => -(l.d?.reviews?.avg ?? -1), nama: l => 0 };
  list = list.sort((a, b) => by[os.sort](a) - by[os.sort](b) || a.name.localeCompare(b.name));
  return `${osNav()}<div class="phead"><div><h1 tabindex="-1">Pindar berizin OJK</h1><p>${LIC.length} penyelenggara di daftar OJK ${OJK.licensedPeriod}. ${RL.length} di antaranya sudah dilengkapi tim dengan tarif RIPLAY, ulasan, dan skor keamanan FinWise.</p></div></div>
   <div class="card flat filters"><div class="row" style="gap:12px">
    <label class="sr" for="listq">Cari di daftar</label><input class="in" id="listq" value="${esc(os.listQ)}" placeholder="Cari nama atau perusahaan" data-k="os.listQ" data-t="text" style="max-width:280px">
    <div class="seg" role="group" aria-label="Kelengkapan data">${[['lengkap', `Data lengkap (${RL.length})`], ['semua', `Semua (${LIC.length})`]].map(([k, l]) => `<button class="${os.only === k ? 'on' : ''}" aria-pressed="${os.only === k}" data-act="os-set" data-f="only" data-v="${k}">${l}</button>`).join('')}</div>
    <div class="seg" role="group" aria-label="Jenis">${[['semua', 'Semua jenis'], ['konsumtif', 'Konsumtif'], ['produktif', 'Produktif'], ['syariah', 'Syariah']].map(([k, l]) => `<button class="${os.filter === k ? 'on' : ''}" aria-pressed="${os.filter === k}" data-act="os-set" data-f="filter" data-v="${k}">${l}</button>`).join('')}</div>
    <label class="f" style="flex-direction:row;align-items:center;gap:8px">Urutkan<select class="in" id="os-sort" data-k="os.sort" data-t="text" style="width:auto">${[['skor', 'Skor keamanan'], ['biaya', 'Biaya termurah'], ['rating', 'Rating'], ['nama', 'Nama']].map(([k, l]) => `<option value="${k}" ${os.sort === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
   </div></div>
   <p class="small muted" style="margin:12px 0" role="status">${list.length} pindar ditampilkan.${os.filter === 'konsumtif' || os.filter === 'produktif' ? ' Jenis konsumtif/produktif hanya diketahui untuk pindar berdata lengkap.' : ''}</p>
   <div class="lgrid">${list.map(lenderCard).join('') || '<p class="muted">Tidak ada yang cocok dengan pencarianmu.</p>'}</div>
   <p class="tiny muted" style="margin-top:12px">Skor keamanan FinWise (0–100) dihitung dari legalitas, keterbukaan biaya, biaya dibanding plafon OJK, suara peminjam, dan sertifikasi keamanan data. Lihat rinciannya di setiap profil.</p>`;
}
function vPinjol() {
  const l = licById(S.os.lender) || LIC[0], d = l.d, sf = safety(l);
  const reviews = S.reviews.filter(r => r.lender === l.id), f = S.os.rv || {};
  const radio5 = (name, label) => `<fieldset class="qq" style="margin:0"><legend class="small" style="font-weight:700">${label}</legend><div class="seg" style="margin-top:6px">${[1, 2, 3, 4, 5].map(n => `<label class="segr"><input type="radio" name="${name}" value="${n}" data-rv="${name}" ${String(f[name]) === String(n) ? 'checked' : ''}><span>${n}</span></label>`).join('')}</div></fieldset>`;
  const head = `${osNav()}<nav class="crumbs small" aria-label="Lokasi"><a href="#openspace">Database pinjol</a> › <a href="#berizin">Berizin</a> › <span aria-current="page">${esc(l.name)}</span></nav>
   ${S.os.found === l.id ? foundNote(l) : ''}
   <div class="grid g-side" style="align-items:start">
    <div class="card phero"><div class="row" style="gap:14px;align-items:flex-start;flex-wrap:nowrap"><div class="logo-ph" aria-hidden="true">${esc(l.name.slice(0, 2).toUpperCase())}</div><div style="min-width:0"><div class="row" style="gap:8px"><h1 tabindex="-1" style="font-size:clamp(1.6rem,3vw,2.2rem)">${esc(l.name)}</h1><span class="pill z-safe">Berizin OJK</span></div>
      <p class="small" style="margin-top:4px">${esc(l.company)} · izin <b>${esc(l.license)}</b> sejak ${esc(l.date)} · ${esc(l.kind)} · ${esc(l.os)}</p>
      <div class="row" style="gap:8px;margin-top:8px">${d?.reviews ? `<span class="chip">★ ${nf(d.reviews.avg, 1)} · ${d.reviews.n} ulasan sampel</span>` : ''}${d ? `<span class="chip">${esc(kindLabel(d))}</span>` : ''}<a class="small" href="${esc(/^https?:/.test(l.web) ? l.web : 'https://' + l.web)}" target="_blank" rel="noopener noreferrer">situs resmi<span class="sr"> (tab baru)</span></a></div></div></div>
      ${l.clones.length ? `<div class="note danger small" style="margin-top:12px"><b>Hati-hati tiruan:</b> nama ini juga dipakai aplikasi ilegal (${l.clones.map(esc).join(', ')}). Unduh hanya dari toko resmi dan pastikan pengembangnya ${esc(l.company)}.</div>` : ''}
      <div class="row" style="gap:8px;margin-top:14px">${d ? `<button class="btn" data-act="cmp" data-id="${l.id}" aria-pressed="${S.os.cmp.includes(l.id)}">${S.os.cmp.includes(l.id) ? '✓ Masuk perbandingan' : '+ Bandingkan'}</button>${rateInfo(d)?.daily != null ? `<a class="btn ghost" href="#kalkulator" data-act="calc-lender" data-id="${l.id}">Hitung cicilanku</a>` : ''}` : ''}<a class="btn ghost" href="#pilah">Cari pinjaman di PILAH</a></div></div>
    <div class="card scorecard"><div class="lab" style="color:inherit;opacity:.85">Skor keamanan FinWise</div>${sf.total != null ? `<div class="row" style="gap:14px;margin-top:8px">${scoreRing(sf.total, 92)}<p class="small">${sf.total >= 70 ? 'Relatif aman dan terbuka.' : sf.total >= 50 ? 'Cukup, tapi ada catatan.' : 'Banyak catatan: biaya tinggi atau keluhan banyak.'}</p></div>
      <ul class="tiny sparts">${sf.parts.map(([k, v, m]) => `<li><span>${esc(k)}</span><b>${nf(v, 1)}/${m}</b></li>`).join('')}</ul>` : '<p class="small" style="margin-top:8px">Belum bisa dihitung: tarif dan ulasan pindar ini belum dikumpulkan tim. Yang pasti: <b>berizin OJK</b>.</p>'}</div>
   </div>`;
  if (!d) return head;
  const ri = rateInfo(d), cost = sampleCost(d), rv = d.reviews;
  const comp = d.clusters.filter(c => c.type === 'complaint').sort((a, b) => b.n - a.n), praise = d.clusters.filter(c => c.type === 'praise').sort((a, b) => b.n - a.n);
  const aiPrompt = `Data pemberi pinjaman ${l.name} (berizin OJK, ${kindLabel(d)}): tarif ${ri ? ri.label : 'tidak dipublikasikan'}; biaya maksimum pinjam Rp1 jt 3 bulan ${cost != null ? rp(cost) : 'tidak diketahui'}; admin ${d.adminPct != null ? d.adminPct + '%' : 'tidak dirinci'}; ulasan sampel rata-rata ${rv ? nf(rv.avg, 1) : '-'} dari 5, negatif ${rv ? pct(rv.neg, 0) : '-'}; keluhan utama: ${comp.slice(0, 3).map(c => `${c.label} (${c.n})`).join(', ') || '-'}; pujian utama: ${praise.slice(0, 3).map(c => `${c.label} (${c.n})`).join(', ') || '-'}; ISO 27001 ${d.iso27001 ? 'ya' : 'tidak'}; skor keamanan FinWise ${sf.total}/100.\nTugas: nilai pindar ini untuk calon peminjam muda. ${AI3_FORMAT}`;
  const fb = { cocok: [praise[0] ? `Banyak dipuji soal ${praise[0].label.toLowerCase()}.` : 'Berizin dan diawasi OJK.', cost != null && cost < 150000 ? `Biaya maksimumnya relatif rendah: ${rp(cost)} untuk Rp1 jt selama 3 bulan.` : `Plafon ${d.min ? rps(d.min) : '?'}–${d.max ? rps(d.max) : '?'}.`], waspada: [comp[0] ? `Keluhan terbanyak: ${comp[0].label.toLowerCase()} (${comp[0].n} sebutan).` : 'Belum ada data keluhan.', cost != null && cost >= 250000 ? `Tarifnya di batas atas plafon OJK; Rp1 jt selama 3 bulan bisa kena ${rp(cost)}.` : d.adminPct ? `Ada biaya admin hingga ${nf(d.adminPct)}% yang memotong dana cair.` : ''], saran: ['Baca RIPLAY sebelum tanda tangan: cek bunga, admin, dan denda.', 'Pinjam sesuai kebutuhan, bukan sesuai limit yang ditawarkan.', 'Jangan beri akses kontak/galeri; pindar hanya boleh akses kamera, mikrofon, lokasi.'] };
  return head + `
   <div class="grid g-side" style="margin-top:16px;align-items:start">
    <div class="stack">
     <div class="card"><h2 style="font-size:1.2rem">Produk & biaya</h2>
      <div class="grid g3" style="margin-top:12px">
       <div class="kpi"><div class="k">Tarif resmi</div><div class="v" style="font-size:1.15rem">${ri ? esc(ri.label) : 'Tidak dipublikasikan'}</div><div class="s">${d.dailyMin != null && d.dailyMax ? `rentang ${nf(d.dailyMin)}–${nf(d.dailyMax)}%/hari` : d.aprMax ? `maks ${nf(d.aprMax)}%/tahun` : '&nbsp;'}</div></div>
       <div class="kpi"><div class="k">Pinjam Rp1 jt, 3 bulan</div><div class="v" style="font-size:1.15rem">${cost != null ? 'maks ' + rp(cost) : '–'}</div><div class="s">bunga + admin, dalam ${term('Plafon OJK', 'plafon OJK')}</div></div>
       <div class="kpi"><div class="k">Biaya admin</div><div class="v" style="font-size:1.15rem">${d.adminPct != null ? (d.adminUnit === 'month' ? nf(d.adminPct) + '%/bulan' : 'hingga ' + nf(d.adminPct) + '%') : '–'}</div></div>
       <div class="kpi"><div class="k">Denda telat</div><div class="v" style="font-size:1.15rem">${d.lateDaily != null ? nf(d.lateDaily) + '%/hari' : '–'}</div></div>
       <div class="kpi"><div class="k">Plafon</div><div class="v" style="font-size:1.15rem">${d.min || d.max ? `${d.min ? rps(d.min) : '?'}–${d.max ? rps(d.max) : '?'}` : '–'}</div></div>
       <div class="kpi"><div class="k">Tenor</div><div class="v" style="font-size:1.15rem">${d.tenorMinDays || d.tenorMaxDays ? `${d.tenorMinDays ? Math.max(1, Math.round(d.tenorMinDays / 30)) : '?'}–${d.tenorMaxDays ? Math.round(d.tenorMaxDays / 30) : '?'} bln` : '–'}</div></div>
      </div>
      ${d.notes ? `<p class="small" style="margin-top:10px"><b>Catatan:</b> ${esc(d.notes)}</p>` : ''}<p class="tiny muted" style="margin-top:4px">Sumber: ${esc(d.source)} (${term('RIPLAY')}) · diverifikasi ${dateID(d.verified)}</p></div>
     ${rv ? `<div class="card"><div class="row between"><h2 style="font-size:1.2rem">Suara peminjam</h2><span class="tiny muted">${rv.n} ulasan Google Play · ${dateID(rv.frm)}–${dateID(rv.to)}</span></div>
      <div class="row" style="gap:20px;margin-top:12px;align-items:flex-start">
       <div><div class="big" style="font-size:2.4rem">${nf(rv.avg, 1)}</div><div class="tiny muted">dari 5 bintang</div></div>
       <div class="stack" style="flex:1;min-width:200px;gap:4px" role="img" aria-label="Sebaran bintang: ${[5, 4, 3, 2, 1].map(s => s + ' bintang ' + rv.dist[s - 1]).join(', ')}">${[5, 4, 3, 2, 1].map(s => `<div class="row tiny" style="gap:8px;flex-wrap:nowrap"><span style="width:16px">${s}★</span>${starBar(rv.dist[s - 1], Math.max(...rv.dist))}<span class="num" style="width:30px;text-align:right">${rv.dist[s - 1]}</span></div>`).join('')}</div>
       <div class="stack small" style="gap:4px"><span>Positif <b style="color:var(--safe)">${pct(rv.pos, 0)}</b></span><span>Negatif <b style="color:var(--danger)">${pct(rv.neg, 0)}</b></span><span>Dibalas developer <b>${pct(rv.replied, 0)}</b></span></div>
      </div>
      ${Object.keys(d.aspects).length ? `<div class="lab" style="margin-top:14px">Per aspek (porsi pujian dari semua sebutan)</div><div class="stack" style="gap:6px;margin-top:8px">${Object.entries(d.aspects).map(([k, v]) => `<div class="row" style="gap:10px;flex-wrap:nowrap"><span class="small" style="width:96px;flex:none">${k}</span><div class="bar" style="flex:1" aria-hidden="true"><i style="width:${Math.max(2, v.share * 100)}%;background:${v.share >= .65 ? 'var(--safe)' : v.share >= .4 ? 'var(--stretch)' : 'var(--danger)'}"></i></div><span class="tiny num" style="width:120px;flex:none;text-align:right">${v.pos} pujian · ${v.neg} keluhan</span></div>`).join('')}</div>` : ''}
      ${d.spike ? `<p class="small" style="margin-top:12px">Pemantau 72 jam: ulasan negatif ${pct(d.spike.prev, 0)} → ${pct(d.spike.cur, 0)} (${d.spike.delta > 0 ? '+' : ''}${nf(d.spike.delta, 1)} poin). ${d.spike.delta >= 20 ? '<b style="color:var(--stretch)">Lonjakan.</b>' : 'Tidak ada lonjakan.'}</p>` : ''}
     </div>` : ''}
     ${comp.length || praise.length ? `<div class="grid g2">
      <div class="card praise"><h3>Hal yang disukai</h3><div class="stack small" style="gap:8px;margin-top:8px">${praise.slice(0, 4).map(c => `<details><summary class="sumrow"><span>${esc(c.label)}</span><span class="muted num">${c.n}×</span></summary><p class="tiny muted" style="margin:4px 0 0">${esc(c.desc)}</p></details>`).join('') || '<span class="muted">Belum ada data.</span>'}</div></div>
      <div class="card complain"><h3>Keluhan terbanyak</h3><div class="stack small" style="gap:8px;margin-top:8px">${comp.slice(0, 4).map(c => `<details><summary class="sumrow"><span>${esc(c.label)}</span><span class="muted num">${c.n}×</span></summary><p class="tiny muted" style="margin:4px 0 0">${esc(c.desc)}</p></details>`).join('') || '<span class="muted">Belum ada data.</span>'}</div></div>
     </div>` : ''}
     <div class="card">${ai3('os-' + l.id, aiPrompt, fb, { label: 'Analisis pinjol ini dengan AI' })}</div>
    </div>
    <div class="stack">
     <div class="card"><h3>Keamanan data & izin akses</h3>
      <div class="row" style="margin-top:8px">${d.iso27001 ? '<span class="tag">ISO 27001</span>' : ''}${d.iso27701 ? '<span class="tag">ISO 27701</span>' : ''}${!d.iso27001 && !d.iso27701 ? '<span class="small muted">Belum ada sertifikasi ISO keamanan informasi yang tercatat.</span>' : ''}</div>
      ${d.perms ? `<p class="small" style="margin-top:10px">Aplikasi Android-nya mencantumkan <b>${d.perms.total} izin</b>, <b>${d.perms.high}</b> berisiko tinggi:</p><div class="row" style="margin-top:6px">${d.perms.groups.map(g => `<span class="pill ${CAMILAN.includes(g) ? 'z-safe' : 'z-danger'}">${esc(g)}${CAMILAN.includes(g) ? '' : '<span class="sr"> (di luar izin yang dibolehkan OJK)</span>'}</span>`).join('')}</div><p class="tiny muted" style="margin-top:6px">Aturan ${term('CAMILAN')}: hijau dibolehkan, merah di luar itu. Izin tercantum belum tentu aktif dipakai.</p>` : '<p class="small muted" style="margin-top:8px">Izin akses aplikasi untuk platform ini belum dipetakan.</p>'}</div>
     <div class="card"><div class="row between"><h3>Ulasan komunitas FinWise</h3><span class="tiny muted">${reviews.length} ulasan</span></div>
      ${reviews.length ? reviews.map(r => `<div class="note small" style="margin-top:8px"><div class="row between"><b class="num">${r.amount ? rp(r.amount) : ''}${r.months ? ' · ' + r.months + ' bln' : ''}${r.paid ? ' · total bayar ' + rp(r.paid) : ''}</b><span class="tiny muted">Penagihan ${r.collection}/5 · transparansi ${r.fees}/5</span></div>${r.text ? `<div style="margin-top:4px">${esc(r.text)}</div>` : ''}</div>`).join('') : '<p class="small muted" style="margin-top:6px">Belum ada ulasan komunitas untuk platform ini.</p>'}
      <details style="margin-top:12px" ${S.os.reviewPreview || S.os.rvErr ? 'open' : ''}><summary class="btn ghost sm" style="display:inline-flex">Tulis ulasan</summary>
       <form class="stack" style="margin-top:10px" data-form="review" novalidate>
        <div class="grid g2"><label class="f">Pinjam (opsional)${rpInput('rv-amount', f.amount ? digits(f.amount) : null, 'data-rv="amount" placeholder="mis. 2.000.000"')}</label><label class="f">Tenor, bulan (opsional)<input class="in" id="rv-months" type="number" min="1" max="36" value="${esc(f.months || '')}" data-rv="months"></label></div>
        <label class="f">Total dibayar (opsional)${rpInput('rv-paid', f.paid ? digits(f.paid) : null, 'data-rv="paid"')}</label>
        ${radio5('collection', 'Cara penagihan (1 kasar – 5 sopan)')}${radio5('fees', 'Keterbukaan biaya (1 – 5)')}
        <label class="f">Cerita singkat<textarea class="in" id="rv-text" rows="3" maxlength="400" placeholder="Apa yang perlu diketahui peminjam berikutnya?" data-rv="text">${esc(f.text || '')}</textarea></label>
        ${S.os.rvErr ? `<div class="note danger small" role="alert">${esc(S.os.rvErr)}</div>` : ''}
        <div class="row"><button class="btn sm">Kirim ulasan</button><span class="tiny muted">${S.cap.canWrite ? 'Tampil untuk semua pengunjung. Jangan tulis nama atau nomor telepon.' : 'Di tampilan ini ulasan hanya pratinjau; pengiriman aktif di versi pilot.'}</span></div>
        ${S.os.reviewPreview ? `<div class="note amber small" role="status">Pratinjau (belum terkirim): ${esc(S.os.reviewPreview)}</div>` : ''}
       </form></details></div>
    </div>
   </div>`;
}
function vIlegal() {
  const os = S.os, q = norm(os.ilQ), chans = [...new Set(ILL.flatMap(i => i.ch))].sort((a, b) => FW.sum(ILL, i => i.ch.includes(b)) - FW.sum(ILL, i => i.ch.includes(a)));
  const list = ILL.filter(i => (os.ilCh === 'semua' || i.ch.includes(os.ilCh)) && (!q || norm(i.name + i.hosts.join(' ')).includes(q)));
  return `${osNav()}<div class="phead"><div><h1 tabindex="-1">Daftar pinjol ilegal</h1><p>${OJK.illegalEntries.toLocaleString('id-ID')} entri dari Satgas PASTI (${OJK.illegalPeriod}), digabung menjadi ${ILL.length} nama. Satu nama bisa muncul di beberapa situs atau toko aplikasi.</p></div>
    <div class="note danger small" style="max-width:340px">Jangan klik tautan pinjol ilegal. Jika sudah terlanjur: jangan bayar ke rekening pribadi, simpan bukti, laporkan ke Kontak OJK 157.</div></div>
   <div class="card flat filters"><div class="row" style="gap:12px"><label class="sr" for="ilq">Cari nama atau situs</label><input class="in" id="ilq" value="${esc(os.ilQ)}" placeholder="Cari nama atau situs, mis. kredit kilat" data-k="os.ilQ" data-t="text" style="max-width:320px">
    <label class="f" style="flex-direction:row;align-items:center;gap:8px">Disebar lewat<select class="in" id="ilch" data-k="os.ilCh" data-t="text" style="width:auto"><option value="semua">Semua saluran</option>${chans.map(c => `<option value="${esc(c)}" ${os.ilCh === c ? 'selected' : ''}>${esc(c)} (${FW.sum(ILL, i => i.ch.includes(c))})</option>`).join('')}</select></label></div></div>
   <p class="small muted" style="margin:12px 0" role="status">${list.length} nama ditemukan.</p>
   <ul class="illist">${list.slice(0, os.ilN).map(i => `<li><div style="min-width:0"><b>${esc(i.name)}</b><div class="tiny muted">${esc(i.ch.join(' · '))}${i.hosts.length ? ' · ' + esc(i.hosts.slice(0, 2).join(', ')) : ''}${i.n > 1 ? ` · ${i.n} entri` : ''}</div></div><a class="btn ghost sm" href="${waShare(illWarn(i))}" target="_blank" rel="noopener noreferrer" aria-label="Bagikan peringatan tentang ${esc(i.name)} via WhatsApp (tab baru)">Bagikan</a></li>`).join('')}</ul>
   ${list.length > os.ilN ? `<div style="margin-top:12px"><button class="btn ghost" data-act="il-more">Tampilkan 60 lagi</button></div>` : ''}
   <p class="tiny muted" style="margin-top:12px">Tidak ditampilkan: ${ILL_GENERIC} entri tanpa nama aplikasi (halaman Facebook dan peserta anonim), nama pengembang perorangan, serta tautan langsung ke aplikasi ilegal. Daftar resmi juga memuat ${OJK.investIllegal} entitas investasi ilegal.</p>`;
}
function vKeluhan() {
  const rows = RL.filter(l => l.reviews).map(l => ({ l, sp: l.spike })).sort((a, b) => (b.sp ? b.sp.delta : -999) - (a.sp ? a.sp.delta : -999));
  const sev = d => d >= 20 ? ['Tinggi', 'z-danger'] : d >= 10 ? ['Sedang', 'z-stretch'] : d > 0 ? ['Rendah', 'z-amber'] : ['Turun', 'z-safe'];
  const alerts = rows.filter(r => r.sp && r.sp.delta >= 20);
  return `${osNav()}<div class="phead"><div><h1 tabindex="-1">Pemantau keluhan</h1><p>Porsi ulasan bintang 1–2 dalam 72 jam terakhir dibanding 72 jam sebelumnya, per aplikasi. Alarm menyala jika naik ≥20 poin.</p></div>
    <span class="pill ${alerts.length ? 'z-danger' : 'z-safe'}" style="font-size:.875rem;padding:6px 12px">${alerts.length ? alerts.length + ' lonjakan aktif' : 'Tidak ada lonjakan aktif'}</span></div>
   <ul class="alerts">${rows.map(({ l, sp }) => { const s = sp ? sev(sp.delta) : null, lic = LIC.find(x => x.d === l); return `<li><div style="min-width:0"><b>${esc(l.name)}</b><div class="tiny muted">${l.reviews.n} ulasan · data sampai ${dateID(l.reviews.to)}</div></div>
     ${sp ? `<div class="num small"><span class="muted">negatif</span> ${pct(sp.prev, 0)} → <b>${pct(sp.cur, 0)}</b></div><div class="num" style="font-weight:800;color:${sp.delta > 0 ? 'var(--stretch)' : 'var(--safe)'}">${sp.delta > 0 ? '+' : ''}${nf(sp.delta, 1)} poin</div><span class="pill ${s[1]}">${s[0]}</span>` : '<div class="small muted" style="grid-column:span 3">Ulasan 72 jam terakhir belum cukup (min. 15)</div>'}
     <a class="btn ghost sm" href="#pinjol" data-act="lender" data-id="${lic ? lic.id : l.id}">Detail</a></li>`; }).join('')}</ul>
   <p class="tiny muted" style="margin-top:12px">Data ulasan adalah sampel terbaru per aplikasi sampai ${dateID(REV_TO)}. Di versi pilot, pemantau berjalan otomatis setiap 72 jam dan mengirim peringatan.</p>`;
}
function vBandingkan() {
  const os = S.os, ids = os.cmp.filter(id => licById(id)?.d).slice(0, 3), amt = os.cmpAmount || 0, mo = os.cmpMonths || 0;
  const pickable = LIC.filter(l => l.d && !ids.includes(l.id));
  const rows = ids.map(id => { const l = licById(id), d = l.d, ri = rateInfo(d), purpose = d.purpose === 'produktif' ? 'produktif' : 'konsumtif', cap = FW.ojkCap(purpose, mo, amt);
    const ok = ri && ri.daily != null && amt > 0 && mo > 0, L = ok ? FW.loan({ principal: amt, rate: ri.daily, unit: 'day', months: mo, feePct: adminFee(d, mo), maxTotal: amt * Math.min(cap * mo * 30, purpose === 'konsumtif' ? 1 : Infinity) }) : null;
    const fits = (!d.min || amt >= d.min) && (!d.max || amt <= d.max) && (!d.tenorMinDays || mo * 30 + 5 >= d.tenorMinDays) && (!d.tenorMaxDays || mo * 30 - 5 <= d.tenorMaxDays);
    return { l, d, ri, L, fits, sc: safety(l).total, comp: d.clusters.filter(c => c.type === 'complaint').sort((a, b) => b.n - a.n)[0] }; });
  const best = (f, dir = 1) => { const v = rows.filter(r => f(r) != null); if (v.length < 2) return null; return v.sort((a, b) => dir * (f(a) - f(b)))[0].l.id; };
  const bCost = best(r => r.L?.total), bScore = best(r => r.sc, -1), bRate = best(r => r.d.reviews?.avg, -1);
  const line = (k, f, bestId) => `<tr><th scope="row">${k}</th>${rows.map(r => `<td class="${bestId === r.l.id ? 'best' : ''}">${f(r)}${bestId === r.l.id ? ' <span class="pill z-safe">terbaik</span>' : ''}</td>`).join('')}</tr>`;
  const prompt = `Perbandingan pindar untuk pinjaman ${rp(amt)} selama ${mo} bulan:\n${rows.map(r => `${r.l.name}: total biaya maks ${r.L ? rp(r.L.total) : 'tidak diketahui'}, cicilan ${r.L ? rp(r.L.inst) : '-'}, bunga efektif ${r.L ? pct(r.L.ear, 0) : '-'}/thn, rating ${r.d.reviews ? nf(r.d.reviews.avg, 1) : '-'}, negatif ${r.d.reviews ? pct(r.d.reviews.neg, 0) : '-'}, keluhan utama ${r.comp?.label || '-'}, skor keamanan ${r.sc}, ${r.fits ? 'jumlah & tenor masuk syarat' : 'jumlah/tenor di luar syarat'}`).join('\n')}\nTugas: bandingkan dan sebut mana yang paling layak untuk peminjam muda dan kenapa. ${AI3_FORMAT}`;
  const cheapest = rows.find(r => r.l.id === bCost);
  const fb = { cocok: [cheapest ? `${cheapest.l.name} paling murah: total biaya maks ${rp(cheapest.L.total)}.` : 'Pilih minimal 2 pindar dengan tarif yang dipublikasikan.', bScore ? `Skor keamanan tertinggi: ${licById(bScore).name}.` : ''], waspada: rows.map(r => r.comp ? `${r.l.name}: ${r.comp.label.toLowerCase()} (${r.comp.n}×).` : '').filter(Boolean).slice(0, 3), saran: ['Pilih yang total biayanya paling kecil DAN cicilannya masuk batas amanmu.', 'Cek batas amanmu dulu di PILAH atau kalkulator.'] };
  return `${osNav()}<div class="phead"><div><h1 tabindex="-1">Bandingkan pinjol</h1><p>Pilih sampai 3 pindar berdata lengkap. Biaya dihitung dengan tarif maksimum RIPLAY dan dibatasi plafon OJK.</p></div></div>
   <div class="card flat filters"><div class="row" style="gap:12px;align-items:end">
    <label class="f">Jumlah pinjaman${rpInput('cmp-amt', os.cmpAmount, 'data-k="os.cmpAmount" data-t="rpn"')}</label>
    <label class="f">Tenor (bulan)<input class="in num" id="cmp-mo" type="number" min="1" max="24" value="${blankNum(os.cmpMonths)}" data-k="os.cmpMonths" data-t="intn" style="width:110px"></label>
    ${ids.length < 3 ? `<label class="f">Tambah pindar<select class="in" id="cmp-add" data-act-change="cmp-add" style="width:auto"><option value="">Pilih…</option>${pickable.map(l => `<option value="${l.id}">${esc(l.name)}</option>`).join('')}</select></label>` : ''}
   </div></div>
   ${rows.length ? `<div class="tbl-wrap" style="margin-top:16px"><table class="cmp"><caption class="sr">Perbandingan ${rows.length} pindar</caption><thead><tr><th scope="col"><span class="sr">Ukuran</span></th>${rows.map(r => `<th scope="col"><div class="row between" style="flex-wrap:nowrap"><a href="#pinjol" data-act="lender" data-id="${r.l.id}">${esc(r.l.name)}</a><button class="btn ghost sm" data-act="cmp" data-id="${r.l.id}" aria-label="Hapus ${esc(r.l.name)} dari perbandingan">×</button></div></th>`).join('')}</tr></thead><tbody>
     ${line('Total biaya maks', r => r.L ? `<b>${rp(r.L.total)}</b>` : '<span class="muted">tidak diketahui</span>', bCost)}
     ${line('Cicilan per bulan', r => r.L ? rp(r.L.inst) : '–')}
     ${line('Bunga efektif/tahun', r => r.L ? pct(r.L.ear, 0) : '–')}
     ${line('Tarif resmi', r => r.ri ? esc(r.ri.label) : '–')}
     ${line('Admin', r => r.d.adminPct != null ? nf(r.d.adminPct) + '%' : '–')}
     ${line('Jumlah & tenor', r => r.fits ? '<span class="pill z-safe">Masuk syarat</span>' : '<span class="pill z-danger">Di luar syarat</span>')}
     ${line('Rating sampel', r => r.d.reviews ? '★ ' + nf(r.d.reviews.avg, 1) + ` <span class="tiny muted">(${pct(r.d.reviews.neg, 0)} negatif)</span>` : '–', bRate)}
     ${line('Keluhan utama', r => r.comp ? esc(r.comp.label) : '–')}
     ${line('Skor keamanan', r => `<b>${r.sc}</b>/100`, bScore)}
    </tbody></table></div>
    ${rows.length >= 2 ? `<div class="card" style="margin-top:16px">${ai3('cmp-' + ids.join('-') + '-' + amt + '-' + mo, prompt, fb, { label: 'Bandingkan dengan AI' })}</div>` : '<p class="small muted" style="margin-top:12px">Tambahkan minimal satu pindar lagi untuk analisis perbandingan.</p>'}`
    : `<div class="card" style="margin-top:16px"><p>Belum ada pindar yang dipilih. Tambahkan dari menu di atas, atau tekan “+ Bandingkan” di <a href="#berizin">daftar berizin</a>.</p></div>`}`;
}
function lineChart(series, { h = 180, fmt = v => pct(v, 1), label }) {
  const W = 600, pad = 34, xs = series.map((_, i) => pad + i * (W - pad * 2) / Math.max(1, series.length - 1));
  const vals = series.map(s => s.v), max = Math.max(...vals) * 1.15, min = 0, y = v => h - 24 - (v - min) / (max - min) * (h - 44);
  const path = series.map((s, i) => `${i ? 'L' : 'M'}${xs[i].toFixed(1)},${y(s.v).toFixed(1)}`).join(' ');
  return `<svg viewBox="0 0 ${W} ${h}" width="100%" role="img" aria-label="${esc(label)}">${[0.5, 1].map(f => `<line x1="${pad}" x2="${W - pad}" y1="${y(max / 1.15 * f)}" y2="${y(max / 1.15 * f)}" stroke="var(--line)" stroke-dasharray="3 4"/><text x="${pad - 4}" y="${y(max / 1.15 * f) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${fmt(max / 1.15 * f)}</text>`).join('')}
   <path d="${path}" fill="none" stroke="var(--danger)" stroke-width="2.5"/>${series.map((s, i) => `<circle cx="${xs[i]}" cy="${y(s.v)}" r="3.5" fill="var(--danger)"/>${i % 2 === 0 || i === series.length - 1 ? `<text x="${xs[i]}" y="${h - 6}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(s.l)}</text>` : ''}`).join('')}
   <text x="${xs[xs.length - 1]}" y="${y(vals[vals.length - 1]) - 9}" text-anchor="end" font-size="12" font-weight="800" fill="var(--danger)">${fmt(vals[vals.length - 1])}</text></svg>`;
}
function vStatistik() {
  const st = OJK.stats, last = st.trend[st.trend.length - 1], tot = FW.sum(st.age, a => a.acc), y = st.young;
  const youngBad = (y['Kurang Lancar'] + y['Tidak Lancar'] + y['Macet']) / y.Total, youngWatch = y['Dalam Perhatian Khusus'] / y.Total;
  const mon = m => { const [yy, mm] = m.split('-'); return ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'][+mm - 1] + ' ' + yy.slice(2); };
  const provs = [...st.provinces].sort((a, b) => b.out - a.out).slice(0, 10), maxOut = provs[0].out;
  return `${osNav()}<div class="phead"><div><h1 tabindex="-1">Statistik industri pindar</h1><p>Statistik LPBBTI resmi OJK, ${st.period}. Gambaran besar: siapa yang meminjam, seberapa besar, dan seberapa banyak yang macet.</p></div></div>
   <div class="grid g4 stats">
    <div class="stat"><span class="k">Penyelenggara</span><b>${st.companies}</b><span class="s">${st.conv} konvensional · ${st.syariah} syariah</span></div>
    <div class="stat"><span class="k">Rekening peminjam aktif</span><b>${(st.borrowers / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt</b><span class="s">${pct(st.age[1].acc / tot, 0)} berusia 19–34 tahun</span></div>
    <div class="stat"><span class="k">Utang beredar</span><b>Rp${(st.outstanding / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} T</b><span class="s">outstanding pinjaman</span></div>
    <div class="stat"><span class="k">Kredit macet (${term('TWP90')})</span><b style="color:var(--danger)">${pct(last.twp, 2)}</b><span class="s">${term('TKB90')} ${pct(last.tkb, 2)}</span></div>
   </div>
   <div class="grid g2" style="margin-top:16px">
    <div class="card"><h2 style="font-size:1.15rem">Kredit macet naik dalam setahun</h2><p class="small muted" style="margin:4px 0 8px">TWP90 bulanan, ${mon(st.trend[0].m)}–${mon(last.m)}.</p>${lineChart(st.trend.map(t => ({ l: mon(t.m), v: t.twp })), { label: `TWP90 naik dari ${pct(st.trend[0].twp, 2)} ke ${pct(last.twp, 2)}`, fmt: v => pct(v, 1) })}</div>
    <div class="card"><h2 style="font-size:1.15rem">Anak muda (19–34) adalah peminjam terbesar</h2>
     <div class="stack" style="gap:8px;margin-top:10px">${st.age.map(a => `<div><div class="row between small"><span>${esc(a.g)} tahun</span><span class="num"><b>${(a.acc / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt</b> rekening (${pct(a.acc / tot, 0)})</span></div><div class="bar" style="height:10px;margin-top:4px" aria-hidden="true"><i style="width:${(a.acc / tot * 100).toFixed(1)}%;background:var(--green)"></i></div></div>`).join('')}</div>
     <div class="note amber small" style="margin-top:12px">Dari ${(y.Total / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt rekening peminjam usia 19–34: <b>${pct(youngWatch, 1)}</b> telat 1–90 hari (dalam perhatian khusus) dan <b>${pct(youngBad, 1)}</b> sudah kurang lancar sampai macet.</div></div>
   </div>
   <div class="card" style="margin-top:16px"><h2 style="font-size:1.15rem">10 provinsi dengan utang pindar terbesar</h2>
    <div class="tbl-wrap" style="margin-top:10px"><table><caption class="sr">Utang beredar dan TWP90 per provinsi</caption><thead><tr><th scope="col">Provinsi</th><th scope="col">Rekening aktif</th><th scope="col">Utang beredar</th><th scope="col">Kredit macet (TWP90)</th></tr></thead><tbody>
     ${provs.map(p => `<tr><td><b>${esc(p.p)}</b><div class="bar" style="margin-top:4px;max-width:180px" aria-hidden="true"><i style="width:${(p.out / maxOut * 100).toFixed(0)}%;background:var(--green)"></i></div></td><td class="num">${(p.acc / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 })} jt</td><td class="num">Rp${(p.out / 1000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} T</td><td class="num"><b style="color:${p.twp >= 0.05 ? 'var(--danger)' : p.twp >= 0.03 ? 'var(--stretch)' : 'inherit'}">${pct(p.twp, 2)}</b></td></tr>`).join('')}
    </tbody></table></div><p class="tiny muted" style="margin-top:8px">Sumber: Statistik LPBBTI OJK, ${st.period}.</p></div>`;
}
const starBar = (n, max) => `<div class="bar" style="flex:1" aria-hidden="true"><i style="width:${max ? (n / max * 100).toFixed(1) : 0}%;background:var(--amber-strong)"></i></div>`;
