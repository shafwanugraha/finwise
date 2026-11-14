/* ================= GAME · "Legal atau Ilegal?" (60 detik) =================
   Names come only from the two official lists: licensed lenders (OJK) and illegal apps (Satgas PASTI).
   An illegal app is shown by the first part of its listed name; the full listed name appears in the answer. */
const QG_SECONDS = 60;
let QG_POOL = null;
function qgPool() {
  if (QG_POOL) return QG_POOL;
  const lic = LIC.map(l => norm(l.name)).filter(n => n.length >= 4), seen = new Set();
  const legal = LIC.map(l => ({ name: l.name, legal: true, why: `Berizin OJK atas nama ${l.company}.` }));
  const illegal = [];
  ILL.forEach(g => {
    const short = g.name.split(/\s+[-–|:]\s*|\s*[-–]\s*(?=pinjam|kredit|dana|uang|duit|cash)|\s*[(:|]/i)[0].trim(), n = norm(short);
    // skip generic words and anything that could be read as a licensed brand
    if (short.length < 3 || short.length > 30 || n.length < 4 || seen.has(n) || /^(pinjaman|pinjol|kredit|dana|uang|cash)(online|tunai|cepat)?$/.test(n) || lic.some(x => n.includes(x) || x.includes(n))) return;
    seen.add(n); illegal.push({ name: short, legal: false, why: `Aplikasi “${g.name}” ada di daftar pinjol ilegal Satgas PASTI (${OJK.illegalPeriod}). Nama mirip bisa dipakai pihak lain; yang dicek adalah aplikasi dan perusahaannya.` });
  });
  return (QG_POOL = { legal, illegal });
}
function qgShuffle(a) { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; }
function qgNew() {
  const P = qgPool(), L = qgShuffle(P.legal), I = qgShuffle(P.illegal), items = [];
  for (let k = 0; k < 40; k++) items.push((Math.random() < 0.5 ? L : I).pop() || L.pop() || I.pop());
  let best = 0; try { best = +localStorage.getItem('finwise:qg-best') || 0; } catch {}
  return { items: items.filter(Boolean), i: 0, right: 0, wrong: [], last: null, end: Date.now() + QG_SECONDS * 1000, done: false, best, warned: false };
}
function qgAnswer(v) {
  const q = S.quick; if (!q || q.done) return;
  const it = q.items[q.i], ok = (v === 'legal') === it.legal;
  if (ok) q.right++; else q.wrong.push(it);
  q.last = { it, ok }; q.i++;
  if (q.i >= q.items.length) qgEnd();
  announce(`${ok ? 'Benar' : 'Salah'}. ${it.name}: ${it.legal ? 'legal' : 'ilegal'}.${q.done ? '' : ` Berikutnya: ${q.items[q.i].name}.`}`);
}
function qgEnd() {
  const q = S.quick; q.done = true; clearInterval(qgTimer);
  if (q.right > q.best) { q.record = true; try { localStorage.setItem('finwise:qg-best', String(q.right)); } catch {} }
}
let qgTimer = null;
function qgTick() {
  const q = S.quick;
  if (!q || q.done || S.route !== 'main') { clearInterval(qgTimer); if (q && !q.done && S.route !== 'main') S.quick = null; return; }
  const left = Math.max(0, q.end - Date.now()), t = document.getElementById('qg-time'), bar = document.getElementById('qg-bar');
  if (t) t.textContent = Math.ceil(left / 1000);
  if (bar) bar.style.width = (left / (QG_SECONDS * 10)).toFixed(1) + '%';
  if (left <= 10000 && !q.warned) { q.warned = true; announce('10 detik lagi'); }
  if (left <= 0) { qgEnd(); render(); announce(`Waktu habis. Skormu ${q.right}.`); document.getElementById('qg-h')?.focus(); }
}
function vQuick() {
  const q = S.quick;
  if (q.done) {
    const n = q.right + q.wrong.length;
    return `<div class="card stack qg" style="max-width:720px"><div class="eyebrow e-pilah" style="font-weight:800;font-size:.8125rem">WAKTU HABIS</div>
     <h1 id="qg-h" tabindex="-1">${q.right} benar dari ${n}</h1>
     <p>${q.record ? (q.best ? `Rekor baru! Sebelumnya ${q.best}.` : 'Ini rekor pertamamu.') : q.best ? `Rekormu ${q.best}.` : ''} ${n ? `Ketepatanmu ${pct(q.right / n, 0)}.` : ''}</p>
     ${q.wrong.length ? `<div><h2 style="font-size:1.05rem">Yang terkecoh</h2><ul class="small qg-wrong">${q.wrong.slice(0, 8).map(it => `<li><b>${esc(it.name)}</b>: ${it.legal ? 'legal' : 'ilegal'}. ${esc(it.why)}</li>`).join('')}</ul></div>` : ''}
     <div class="note small"><b>Nama saja tidak cukup.</b> Banyak pinjol ilegal memakai nama yang mirip pindar berizin. Sebelum memberi data, cocokkan nama aplikasi dan nama perusahaannya (PT) dengan daftar OJK, dan curigai yang cair instan tanpa cek, meminta akses kontak atau galeri, atau hanya ada di toko APK pihak ketiga.</div>
     <div class="row"><button class="btn amber" data-act="qg-start">Main lagi</button><a class="btn ghost" href="#openspace">Cek nama lain di Database Pinjol</a><button class="btn ghost" data-act="qg-quit">Kembali ke menu game</button></div></div>`;
  }
  const it = q.items[q.i], left = Math.max(0, Math.ceil((q.end - Date.now()) / 1000));
  return `<div class="qg card stack" style="max-width:720px">
    <div class="row between"><div><div class="lab">Legal atau ilegal?</div><h1 id="qg-h" tabindex="-1" style="font-size:1.2rem">Tebak secepatnya</h1></div><div class="qg-score"><span class="num">${q.right}</span> benar</div></div>
    <div class="qg-clock"><span role="timer" aria-label="Sisa waktu"><b id="qg-time" class="num">${left}</b> detik</span><div class="bar" aria-hidden="true"><i id="qg-bar" style="width:${(left / QG_SECONDS * 100).toFixed(1)}%"></i></div></div>
    <p class="qg-name" aria-hidden="true">${esc(it.name)}</p>
    <div class="qg-btns"><button class="btn qg-legal" data-act="qg" data-v="legal" aria-label="Legal: ${esc(it.name)} berizin OJK">Legal <span class="tiny">berizin OJK</span></button><button class="btn qg-ilegal" data-act="qg" data-v="ilegal" aria-label="Ilegal: ${esc(it.name)} tidak berizin">Ilegal <span class="tiny">tidak berizin</span></button></div>
    <p class="tiny muted">Tombol panah juga bisa: ← legal, → ilegal.</p>
    ${q.last ? `<p class="small qg-last ${q.last.ok ? 'ok' : 'no'}">${q.last.ok ? 'Benar' : 'Salah'}: <b>${esc(q.last.it.name)}</b> ${q.last.it.legal ? 'legal' : 'ilegal'}. ${esc(q.last.it.why)}</p>` : '<p class="small muted">Nama-nama ini diambil dari daftar resmi OJK dan Satgas PASTI.</p>'}
   </div>`;
}
