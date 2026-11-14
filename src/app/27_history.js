/* ================= monthly re-check and moving "Data saya" between devices =================
   A small snapshot is kept in this browser each time the data is saved, so CEK can say what changed since
   the last check. Export writes the data to a JSON file; import reads it back after checking its shape. */
const HIST_MAX = 24;
const dayKey = d => new Date(d).toISOString().slice(0, 10);
function snapshot(p) {
  const R = FW.readiness(p), H = FW.health(p);
  return { at: new Date().toISOString(), level: R.level, score: H.total, sur: Math.round(FW.surplus(p)), dsr: +FW.headroom(p).dsrNow.toFixed(4), max6: R.max[6], ef: p.emergencyFund || 0 };
}
function histGet() { const h = store.get('history'); return Array.isArray(h) ? h.filter(x => x && typeof x.at === 'string') : []; }
function recordCheck(p) {
  try {
    const h = histGet(), s = snapshot(p), today = dayKey(s.at);
    const keep = h.filter(x => dayKey(x.at) !== today); keep.push(s);
    store.set('history', keep.slice(-HIST_MAX));
  } catch {}
}
// the latest snapshot from an earlier day: today's own save is not a "previous check"
function prevCheck() { const today = dayKey(Date.now()); return histGet().filter(x => dayKey(x.at) < today).pop() || null; }
const daysSince = iso => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 864e5) : null;
function recheckCard(p) {
  const prev = prevCheck(), now = snapshot(p), age = daysSince(p.updatedAt);
  const d = (a, b, f) => b === a ? 'tetap' : `${f(a)} → <b>${f(b)}</b>`;
  const lines = prev ? [
    `Kesiapan berutang: ${prev.level === now.level ? `tetap <b>${READY[now.level].name}</b>` : `${READY[prev.level].name} → <b>${READY[now.level].name}</b>`}`,
    `Kondisi keuangan: ${d(prev.score, now.score, x => x + '/100')}`,
    `Sisa uang per bulan: ${d(prev.sur, now.sur, x => rp(x, { plus: true }))}`,
    `Pinjaman maksimal yang aman (6 bln): ${d(prev.max6, now.max6, rp)}`,
  ] : [];
  return `<div class="recheck">
    <div><h3>${prev ? `Dibanding cek ${dateID(dayKey(prev.at))}` : 'Cek ulang tiap bulan'}</h3>
     ${prev ? `<ul class="small">${lines.map(x => `<li>${x}</li>`).join('')}</ul>` : '<p class="small muted">Perbarui datamu setelah gajian bulan depan. FinWise akan menunjukkan apa yang berubah: kesiapan, kondisi, sisa uang, dan pinjaman maksimal yang aman.</p>'}
     ${age != null && age > 30 ? `<p class="small" style="margin-top:6px"><b>Datamu terakhir diperbarui ${age} hari lalu.</b> Angka di halaman ini memakai data itu.</p>` : ''}</div>
    <div class="recheck-acts"><a class="btn sm" href="#mulai" data-act="wiz-edit">Perbarui data</a><a class="btn sm ghost" href="${recheckLink((p.incomes[0] || {}).payday)}" target="_blank" rel="noopener noreferrer">Pengingat bulan depan<span class="sr"> di Google Calendar (tab baru)</span></a><button class="btn sm ghost" data-act="export-data">Unduh data (.json)</button></div>
   </div>`;
}
function exportData() {
  const p = S.profiles.saya, body = { app: 'FinWise', kind: 'data-saya', v: 1, exportedAt: new Date().toISOString(), profile: p, history: histGet() };
  const url = URL.createObjectURL(new Blob([JSON.stringify(body, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = `finwise-data-saya-${dayKey(Date.now())}.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('File data tersimpan di folder unduhan');
}
// only plain data of a bounded size survives: no functions, no prototype keys, short strings, short lists
function plainData(x, depth = 0) {
  if (x === null || typeof x === 'boolean') return x;
  if (typeof x === 'number') return Number.isFinite(x) ? x : null;
  if (typeof x === 'string') return x.slice(0, 200);
  if (depth > 5) return null;
  if (Array.isArray(x)) return x.slice(0, 40).map(v => plainData(v, depth + 1));
  if (typeof x === 'object') { const o = {}; Object.keys(x).slice(0, 80).forEach(k => { if (!['__proto__', 'constructor', 'prototype'].includes(k)) o[k] = plainData(x[k], depth + 1); }); return o; }
  return null;
}
function importProfile(text) {
  const raw = JSON.parse(text), src = raw && raw.app === 'FinWise' ? raw.profile : raw;
  const p = plainData(src);
  if (!p || p.id !== 'saya' || !Array.isArray(p.incomes) || !Array.isArray(p.items) || !Array.isArray(p.loans)) throw new Error('shape');
  p.incomes.forEach(r => { r.label = typeof r.label === 'string' ? r.label : ''; });
  p.items.forEach(c => { c.name = typeof c.name === 'string' ? c.name : 'Pos'; });
  p.loans.forEach(l => { l.name = typeof l.name === 'string' ? l.name : 'Pinjaman'; });
  const m = migrateSaya({ ...blankSaya(), ...p, v: 3 });
  wizFinalize(m);
  FW.readiness(m); // throws if the numbers cannot be computed
  if (!(FW.income(m) > 0)) throw new Error('income');
  const hist = raw && Array.isArray(raw.history) ? plainData(raw.history).filter(x => x && typeof x.at === 'string' && Number.isFinite(x.level)) : [];
  return { m, hist };
}
