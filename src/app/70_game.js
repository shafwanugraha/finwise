/* ================= TEST MODE ================= */
const TSTEPS = ['Siap main', 'Babak 1 · Tebak cepat', 'Babak 2 · Sebulan Bertahan', 'Babak 3 · Tebak lagi', 'Nilai game ini'];
function newTest() {
  const g = sbNew(); sbEnter(g);
  return { id: 't' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), stage: 0, startedAt: Date.now(), consent: false, age: '', status: '', pre: Array(DATA.quiz.length).fill(null), post: Array(DATA.quiz.length).fill(null),
    g, marks: {}, help: 0, chosen: null, ack: false, feedback: { help: '', ease: 0, confidence: 0, comment: '' }, saved: null };
}
// 0–100 whatever the number of questions (older records have 5, newer 6)
const score = arr => Math.round(arr.reduce((s, a, i) => s + (a === DATA.quiz[i].correct ? 1 : 0), 0) / arr.length * 100);
function quizBlock(name, arr) {
  return `<div class="quiz">${DATA.quiz.map((q, i) => `<fieldset class="qq" style="margin:0"><legend class="sr">Pertanyaan ${i + 1}</legend><b>${i + 1}. ${esc(q.q)}</b><div class="opts">${[...q.a, 'Tidak tahu'].map((a, j) => `<label><input type="radio" name="${name}-${i}" value="${j === q.a.length ? -1 : j}" ${arr[i] === (j === q.a.length ? -1 : j) ? 'checked' : ''} data-act-change="quiz" data-set="${name}" data-i="${i}">${esc(a)}</label>`).join('')}</div></fieldset>`).join('')}</div>`;
}
// Gate 1 test, framed as a short game. What is recorded (pre/post quiz, task completion, choice, help) is unchanged.
function gameStars(r) { return (r.completed ? 1 : 0) + (r.safer ? 1 : 0) + (r.postScore - r.preScore >= 30 || r.postScore === 100 ? 1 : 0); }
const BADGES = ['Pemula Penasaran', 'Pemula Cerdas', 'Pejuang Hemat', 'Penjaga Dompet'];
function vUji() {
  const t = S.test;
  if (!t && S.quick) return vQuick();
  if (!t) return `<section class="gamehero"><div><div class="eyebrow" style="color:#FFD58A;font-weight:800;letter-spacing:.06em">GAME LITERASI KEUANGAN · 3 BABAK · ±10 MENIT</div><h1 tabindex="-1">Lolos Jebakan Pinjol: sebulan jadi Dimas</h1>
     <p class="lead">Jalani satu bulan sebagai Dimas, dari gajian ke gajian: flash sale, tagihan, dan kabar ayahnya masuk rumah sakit. Setiap pilihanmu mengubah sisa uang, utang, dan tingkat stresnya.</p>
     <button class="btn amber" data-act="t-start" style="margin-top:12px">Mulai main</button></div>
     <div class="levels">${[['1', 'Tebak cepat', `${DATA.quiz.length} soal tentang situasi Dimas. Tebak saja, boleh pilih “Tidak tahu”.`], ['2', 'Sebulan Bertahan', 'Dari gajian ke gajian. Pilihanmu dihitung mesin FinWise, lalu dibandingkan dengan jalur paling aman.'], ['3', 'Tebak lagi', 'Soal yang sama. Lihat seberapa jauh kamu naik level.'], ['★', 'Skor & lencana', 'Dapatkan sampai 3 bintang dan lencana Penjaga Dompet.']].map(([n, tt, d]) => `<div class="lvl"><span>${n}</span><div><b>${tt}</b><p class="small">${d}</p></div></div>`).join('')}</div></section>
   <div class="qg-promo card"><div><div class="lab">Main cepat · 60 detik</div><h2 style="font-size:1.15rem;margin-top:2px">Legal atau ilegal?</h2><p class="small muted" style="margin-top:4px">Nama aplikasi muncul satu per satu dari daftar OJK dan Satgas PASTI. Tebak sebanyak mungkin sebelum waktu habis.</p></div><button class="btn" data-act="qg-start">Main 60 detik</button></div>
   <div class="card small" style="margin-top:16px"><b>Aman & anonim.</b> Tidak ada nama atau data pribadi yang diminta. Jawabanmu di game 3 babak membantu tim FinWise melihat apakah aplikasinya benar-benar membuat orang lebih paham utang.</div>`;
  const prog = `<div class="gprog" aria-hidden="true">${[1, 2, 3].map(n => `<i class="${t.stage > n ? 'done' : t.stage === n ? 'on' : ''}"></i>`).join('')}</div>`;
  const bar = `<div class="testbar game"><span class="small"><b>Lolos Jebakan Pinjol</b> · ${TSTEPS[Math.min(t.stage, 4)]}</span>${t.stage >= 1 && t.stage <= 3 ? prog : ''}<span class="row">${t.stage === 2 ? `<button class="btn ghost sm" data-act="t-help">Minta petunjuk</button>` : ''}<button class="btn ghost sm" data-act="t-quit">Keluar</button></span></div>`;
  if (t.stage === 0) return bar + `<div class="card stack" style="max-width:640px"><h2>Sebelum mulai</h2>
    <label class="chk"><input type="checkbox" id="t-consent" data-act-change="t-field" data-f="consent" ${t.consent ? 'checked' : ''}><span>Saya setuju jawaban saya (tanpa nama) dipakai tim FinWise untuk menilai aplikasinya.</span></label>
    <div class="grid g2"><label class="f">Usia<select class="in" id="t-age" data-act-change="t-field" data-f="age"><option value="">Pilih</option>${['<18', '18–22', '23–27', '28–35', '>35'].map(a => `<option ${t.age === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label>
     <label class="f">Status<select class="in" id="t-status" data-act-change="t-field" data-f="status"><option value="">Pilih</option>${['Pelajar/mahasiswa', 'Karyawan', 'Wirausaha', 'Lainnya'].map(a => `<option ${t.status === a ? 'selected' : ''}>${a}</option>`).join('')}</select></label></div>
    <div><button class="btn amber" data-act="t-next" ${t.consent ? '' : 'disabled'}>Ayo mulai Babak 1</button></div></div>`;
  if (t.stage === 1) return bar + `<div class="card" style="margin-bottom:14px"><h2>Babak 1 · Tebak cepat</h2><p style="margin-top:6px">${esc(DATA.personas.dimas.story)} Jawab dengan tebakanmu sendiri dulu; pilih “Tidak tahu” kalau benar-benar tidak tahu. Skor dihitung di akhir.</p></div>${quizBlock('pre', t.pre)}<div style="margin-top:16px"><button class="btn amber" data-act="t-next" ${t.pre.every(a => a !== null) ? '' : 'disabled'}>Lanjut ke Babak 2</button>${t.pre.every(a => a !== null) ? '' : `<span class="tiny muted" style="margin-left:8px">${t.pre.filter(a => a !== null).length}/${t.pre.length} dijawab</span>`}</div>`;
  if (t.stage === 2) return bar + `${t.hint ? `<div class="note amber small" style="margin-bottom:12px" role="status">Petunjuk: ${esc(t.hint)}</div>` : ''}` + sbView(t);
  if (t.stage === 3) return bar + `<div class="card" style="margin-bottom:14px"><h2>Babak 3 · Tebak lagi</h2><p class="small muted" style="margin-top:4px">Soal yang sama. Kali ini pakai apa yang kamu lihat di FinWise.</p></div>${quizBlock('post', t.post)}<div style="margin-top:16px"><button class="btn amber" data-act="t-next" ${t.post.every(a => a !== null) ? '' : 'disabled'}>Lihat skorku</button></div>`;
  if (t.stage === 4) { const f = t.feedback; return bar + `<div class="card stack" style="max-width:680px"><h2>Satu langkah lagi: nilai game ini</h2>
    <div><b>Apakah kamu butuh bantuan orang lain untuk menyelesaikan game ini?</b><div class="seg" style="margin-top:8px">${[['tidak', 'Tidak'], ['sedikit', 'Sedikit'], ['ya', 'Ya']].map(([k, l]) => `<button class="${f.help === k ? 'on' : ''}" aria-pressed="${f.help === k}" data-act="t-fb" data-f="help" data-v="${k}">${l}</button>`).join('')}</div></div>
    <div><b>Seberapa mudah dimainkan?</b> <span class="tiny muted">(1 sulit – 5 mudah)</span><div class="seg" style="margin-top:8px">${[1, 2, 3, 4, 5].map(n => `<button class="${f.ease === n ? 'on' : ''}" aria-pressed="${f.ease === n}" aria-label="Mudah ${n} dari 5" data-act="t-fb" data-f="ease" data-v="${n}">${n}</button>`).join('')}</div></div>
    <div><b>Seberapa yakin kamu dengan keputusan untuk Dimas?</b> <span class="tiny muted">(1–5)</span><div class="seg" style="margin-top:8px">${[1, 2, 3, 4, 5].map(n => `<button class="${f.confidence === n ? 'on' : ''}" aria-pressed="${f.confidence === n}" aria-label="Yakin ${n} dari 5" data-act="t-fb" data-f="confidence" data-v="${n}">${n}</button>`).join('')}</div></div>
    <label class="f">Ada yang membingungkan atau perlu diperbaiki? (opsional)<textarea class="in" id="t-comment" rows="3" maxlength="500" data-act-change="t-field" data-f="comment">${esc(f.comment)}</textarea></label>
    <div><button class="btn amber" data-act="t-finish" ${f.help && f.ease && f.confidence ? '' : 'disabled'}>Selesai, tampilkan lencanaku</button></div></div>`; }
  const r = testRecord(t), stars = gameStars(r);
  return `<div class="card stack result-card" style="max-width:720px"><div class="eyebrow e-pilah" style="font-weight:800;font-size:.8125rem">GAME SELESAI</div>
   <div class="stars" role="img" aria-label="${stars} dari 3 bintang">${[1, 2, 3].map(n => `<span class="${n <= stars ? 'on' : ''}">★</span>`).join('')}</div>
   <h2>Lencana: ${BADGES[stars]}</h2>
   <div class="grid g3"><div class="kpi"><div class="k">Skor Babak 1</div><div class="v">${r.preScore}</div></div><div class="kpi"><div class="k">Skor Babak 3</div><div class="v" style="color:var(--safe)">${r.postScore}</div><div class="s">${r.postScore - r.preScore >= 0 ? 'naik ' : 'turun '}${Math.abs(r.postScore - r.preScore)} poin</div></div><div class="kpi"><div class="k">Kondisi Dimas di akhir bulan</div><div class="v">${r.endScore}/100</div><div class="s">${esc(t.chosen?.name || '-')}${t.chosen ? ' · ' + (t.chosen.id === 'cairkilat' ? 'ilegal' : ZONE[t.chosen.zone][0]) : ''}</div></div></div>
   <ul class="small stack" style="list-style:none;padding:0;gap:4px;margin:0">
    <li>${r.completed ? '★' : '☆'} Menyelesaikan sebulan: tangga dana, batas aman, dan memilih pinjaman</li><li>${r.safer ? '★' : '☆'} Memilih pinjaman di zona Aman${r.safer ? '' : ' (koperasi karyawan adalah pilihan teraman untuk Dimas)'}</li><li>${r.postScore - r.preScore >= 30 || r.postScore === 100 ? '★' : '☆'} Skor naik ≥30 poin atau sempurna</li></ul>
   ${t.saved === 'db' ? '<div class="note safe">Hasil tersimpan untuk tim. Terima kasih sudah bermain!</div>' : t.saved === 'saving' ? '<div class="note">Menyimpan…</div>' : '<div class="note safe">Terima kasih sudah bermain! Bagikan FinWise ke teman yang sedang butuh dana supaya mereka cek dulu sebelum pinjam.</div>'}
   <div class="row"><button class="btn amber" data-act="t-start">Main lagi</button><button class="btn ghost" data-act="qg-start">Main cepat: legal atau ilegal?</button><a class="btn ghost" href="#mulai">Sekarang cek keuanganku sendiri</a></div></div>`;
}
function testRecord(t) {
  return { id: t.id, at: new Date(t.startedAt).toISOString(), age: t.age, status: t.status, pre: t.pre, post: t.post, preScore: score(t.pre), postScore: score(t.post),
    chosen: t.chosen?.id || null, chosenZone: t.chosen?.zone || null, safer: t.chosen?.zone === 'safe', ack: !!t.ack, marks: t.marks, helpClicks: t.help,
    completed: !!t.chosen && !!t.marks.headroom && !!t.marks.ladder && !!t.g?.done, endScore: t.g ? FW.health(t.g.p).total : null, endLevel: t.g ? FW.readiness(t.g.p).level : null, endStress: t.g ? t.g.stres : null, helpNeeded: t.feedback.help, ease: t.feedback.ease, confidence: t.feedback.confidence,
    comment: (t.feedback.comment || '').slice(0, 500), durationSec: Math.round(((t.endedAt || Date.now()) - t.startedAt) / 1000), device: innerWidth < 700 ? 'ponsel' : 'laptop' };
}
function encodeRecord(r) { const c = [r.id, r.at, r.age, r.status, r.pre.join(','), r.post.join(','), r.chosen, r.chosenZone, r.ack ? 1 : 0, r.marks.headroom ? 1 : 0, r.marks.ladder ? 1 : 0, r.helpClicks, r.helpNeeded, r.ease, r.confidence, r.durationSec, r.device, r.comment, r.marks.ladderOk ? 1 : 0, r.marks.headroomOk ? 1 : 0, r.endScore, r.endLevel, r.endStress]; return 'FW1.' + btoa(unescape(encodeURIComponent(JSON.stringify(c)))); }
function decodeRecord(code) {
  const c = JSON.parse(decodeURIComponent(escape(atob(code.trim().replace(/^FW1\./, '')))));
  const arr = s => String(s).split(',').map(Number);
  const pre = arr(c[4]), post = arr(c[5]);
  if (pre.length < 5 || pre.length > DATA.quiz.length || post.length !== pre.length) throw new Error('bad');
  return { id: String(c[0]).replace(/[^a-z0-9]/gi, '').slice(0, 40), at: String(c[1]), age: String(c[2]), status: String(c[3]), pre, post, preScore: score(pre), postScore: score(post), chosen: c[6], chosenZone: c[7], safer: c[7] === 'safe', ack: !!c[8], marks: { headroom: !!c[9], ladder: !!c[10], ladderOk: !!c[18], headroomOk: !!c[19] }, endScore: c[20] ?? null, endLevel: c[21] ?? null, endStress: c[22] ?? null, helpClicks: +c[11] || 0, completed: !!c[6] && !!c[9] && !!c[10], helpNeeded: String(c[12]), ease: +c[13], confidence: +c[14], durationSec: +c[15], device: String(c[16]), comment: String(c[17] || '').slice(0, 500), imported: true };
}
async function saveTest(rec) {
  if (!(S.cap.db && S.cap.canWrite && S.cap.team)) return false;
  try { await S.cap.db.collection('tests').doc(rec.id).set(rec); return true; } catch { return false; }
}

/* ================= RESULTS ================= */
function vHasil() {
  if (!S.cap.ready) return '<p class="muted">Memeriksa akses…</p>';
  if (!S.cap.team) return `<div class="card" style="max-width:620px"><h2>Data validasi</h2><p class="muted" style="margin-top:8px">Halaman ini hanya untuk tim FinWise (pemilik atau editor). Jika kamu pemain, kirim kode hasilmu ke fasilitator.</p></div>`;
  const R = S.results, n = R.length;
  const okNoHelp = R.filter(r => r.completed && r.helpNeeded === 'tidak').length, safer = R.filter(r => r.safer).length;
  const imp = n ? FW.sum(R, r => r.postScore - r.preScore) / n : 0, pre = n ? FW.sum(R, r => r.preScore) / n : 0, post = n ? FW.sum(R, r => r.postScore) / n : 0;
  const gates = [['Menyelesaikan alur inti tanpa bantuan', n ? okNoHelp / n : 0, 0.8, v => pct(v, 0)], ['Memilih opsi yang lebih aman (zona Aman)', n ? safer / n : 0, 0.7, v => pct(v, 0)], ['Kenaikan skor pemahaman utang', imp, 30, v => '+' + v.toFixed(1) + ' poin']];
  const csv = ['id,waktu,usia,status,pre,post,naik,pilihan,zona,aman,selesai,bantuan,klik_bingung,mudah,yakin,durasi_detik,perangkat,tangga_tepat,batas_tepat,skor_akhir,level_akhir,stres_akhir,komentar', ...R.map(r => [r.id, r.at, r.age, r.status, r.preScore, r.postScore, r.postScore - r.preScore, r.chosen, r.chosenZone, r.safer ? 1 : 0, r.completed ? 1 : 0, r.helpNeeded, r.helpClicks, r.ease, r.confidence, r.durationSec, r.device, r.marks?.ladderOk ? 1 : 0, r.marks?.headroomOk ? 1 : 0, r.endScore ?? '', r.endLevel ?? '', r.endStress ?? '', JSON.stringify(r.comment || '')].join(','))].join('\n');
  return `<div class="phead"><div><div class="eyebrow e-pilah">DATA VALIDASI · GATE 1</div><h1>${n} permainan tercatat</h1><p>Target Gate 1 dari proposal: ≥80% menyelesaikan alur tanpa bantuan, ≥70% memilih opsi lebih aman, skor pemahaman naik ≥30 poin, nol cacat kalkulasi/privasi kritis.</p></div></div>
   ${S.resultsState === 'loading' ? '<p class="muted">Memuat hasil…</p>' : S.resultsState === 'slow' ? '<div class="note amber">Data belum bisa dijangkau. Coba buka ulang halaman ini nanti.</div>' : S.resultsState === 'error' ? '<div class="note danger">Gagal memuat hasil.</div>' : ''}
   <div class="grid g-side">
    <div class="card"><h3>Status Gate 1</h3>
     ${gates.map(([l, v, tgt, f]) => `<div class="gate"><span>${l}<div class="tiny muted">target ${tgt < 1 ? pct(tgt, 0) : '+' + tgt + ' poin'}</div></span><b class="num">${n ? f(v) : '–'}</b>${n ? (v >= tgt ? '<span class="pill z-safe">Lolos</span>' : '<span class="pill z-danger">Belum</span>') : '<span class="pill z-grey">Belum ada data</span>'}</div>`).join('')}
     <div class="gate"><span>Nol cacat kalkulasi/privasi kritis<div class="tiny muted">dicatat manual oleh fasilitator</div></span><b>–</b><span class="pill z-grey">Cek manual</span></div>
     <div class="grid g3" style="margin-top:12px"><div class="kpi"><div class="k">Rata-rata skor awal</div><div class="v">${pre.toFixed(0)}</div></div><div class="kpi"><div class="k">Rata-rata skor akhir</div><div class="v">${post.toFixed(0)}</div></div><div class="kpi"><div class="k">Butuh klik “bingung”</div><div class="v">${n ? pct(R.filter(r => r.helpClicks > 0).length / n, 0) : '–'}</div></div></div>
    </div>
    <div class="card stack"><h3>Tempel kode hasil dari pemain</h3><textarea class="in" id="imp-code" rows="4" placeholder="FW1.…"></textarea><div class="row"><button class="btn sm" data-act="import-code">Simpan hasil</button><button class="btn ghost sm" data-act="copy" data-src="csv-out">Salin CSV</button></div>${S.importMsg ? `<p class="small">${esc(S.importMsg)}</p>` : ''}<textarea id="csv-out" class="sr" readonly>${esc(csv)}</textarea></div>
   </div>
   <div class="tbl-wrap" style="margin-top:16px"><table><thead><tr><th>Waktu</th><th>Usia</th><th>Status</th><th>Skor</th><th>Pilihan</th><th>Bantuan</th><th>Mudah</th><th>Yakin</th><th>Durasi</th><th>Komentar</th></tr></thead><tbody>
    ${R.map(r => `<tr><td class="small">${esc(new Date(r.at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }))}${r.imported ? ' <span class="tag">kode</span>' : ''}</td><td>${esc(r.age)}</td><td class="small">${esc(r.status)}</td><td class="num">${r.preScore} → <b>${r.postScore}</b></td><td>${esc(DATA.products.find(x => x.id === r.chosen)?.name || '-')} ${r.chosenZone ? zpill(r.chosenZone) : ''}</td><td>${esc(r.helpNeeded)}${r.helpClicks ? ` · ${r.helpClicks} klik` : ''}</td><td class="num">${r.ease}</td><td class="num">${r.confidence}</td><td class="num">${Math.round(r.durationSec / 60)} mnt</td><td class="small">${esc(r.comment)}</td></tr>`).join('') || '<tr><td colspan="10" class="muted">Belum ada permainan tercatat. Jalankan lewat menu Game.</td></tr>'}
   </tbody></table></div>`;
}

