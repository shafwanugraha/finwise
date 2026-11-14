/* ================= GAME · Ronde Insting & Ronde Final =================
   Six quick cards instead of a multiple-choice quiz: one line each, answered with a tap, a slider or two blocks,
   about 10 seconds per card. The same cards are played before and after "Sebulan Bertahan", so the gain is
   measurable for Gate 1. No answer is revealed during the first round. Correct values come from the engine. */
const KL_MS = 10000;
const KL_DIMAS = () => DATA.personas.dimas;
// score: 1 = right, 0.5 = close, 0 = wrong or out of time
const nearScore = (v, target, ok, half) => { const off = Math.abs(v - target) / Math.max(1, target); return off <= ok ? 1 : off <= half ? 0.5 : 0; };
const KILAT = [
  { id: 'sisa', ui: 'pick', q: () => `Gaji ${rps(FW.income(KL_DIMAS()))}. Keluar ${rps(FW.spendTotal(KL_DIMAS()) + KL_DIMAS().family + FW.instalments(KL_DIMAS()))}. Sisa?`,
    opts: () => [0, FW.surplus(KL_DIMAS()), 4000000].map(v => rps(v)), right: 1, answer: () => `Sisa uang Dimas ${rp(FW.surplus(KL_DIMAS()))} per bulan.` },
  { id: 'batas', ui: 'slider', q: () => 'Geser: cicilan baru maksimal yang masih aman untuk Dimas', min: 0, max: 2000000, step: 25000,
    target: () => FW.headroom(KL_DIMAS()).ceiling, score: v => nearScore(v, FW.headroom(KL_DIMAS()).ceiling, 0.1, 0.3), answer: () => `Batas cicilan amannya ${rp(FW.headroom(KL_DIMAS()).ceiling)} per bulan.` },
  { id: 'tangga', ui: 'blocks', q: () => `Butuh ${rps(KL_DIMAS().need.amount)}. Tutup dulu dari mana?`,
    score: b => b.tab && b.kak ? 1 : b.tab || b.kak ? 0.5 : 0, answer: () => `Tabungan ${rps(KL_DIMAS().emergencyFund)} + bantuan kakak ${rps(KL_DIMAS().need.family)} dulu, jadi pinjamnya ${rps(KL_DIMAS().need.amount - KL_DIMAS().emergencyFund - KL_DIMAS().need.family)}.` },
  { id: 'murah', ui: 'ads', q: () => 'Pinjam Rp7 jt. Mana yang total biayanya paling murah?',
    opts: () => [['Pindar', '0,25%/hari · 6 bln', 0.0025, 'day', 6], ['Pindar', '0,15%/hari · 12 bln', 0.0015, 'day', 12], ['Koperasi', '1%/bulan · 12 bln', 0.01, 'month', 12]],
    right: 2, answer: () => { const o = KILAT[3].opts().map(([, , r, u, m]) => FW.loan({ principal: 7e6, rate: r, unit: u, months: m }).total); return `Koperasi: biaya ${rps(o[2])}, dibanding ${rps(o[0])} dan ${rps(o[1])} di pindar.`; } },
  { id: 'legal', ui: 'pick', q: () => '“Cair Kilat 24 Jam”: cair 5 menit, cukup KTP. Legal?', opts: () => ['Legal', 'Ilegal'], right: 1,
    answer: () => 'Ilegal: tidak ada di daftar OJK. Cair instan tanpa cek adalah tanda bahaya.' },
  { id: 'maks', ui: 'slider', q: () => 'Geser: pinjaman maksimal yang aman untuk Dimas, tenor 12 bulan', min: 0, max: 20000000, step: 250000,
    target: () => FW.maxSafeLoan(KL_DIMAS(), 12), score: v => nearScore(v, FW.maxSafeLoan(KL_DIMAS(), 12), 0.15, 0.35), answer: () => `Sekitar ${rp(FW.maxSafeLoan(KL_DIMAS(), 12))} untuk 12 bulan.` },
];
const klScore = arr => Math.round(arr.reduce((s, x) => s + (+x || 0), 0) / arr.length * 100);
function klStart(t, round) { t.kl = { round, i: 0, start: Date.now(), tmp: {} }; }
function klAnswer(t, raw) {
  const k = t.kl, card = KILAT[k.i]; if (!card) return;
  const sc = raw == null ? 0 : card.ui === 'pick' || card.ui === 'ads' ? (+raw === card.right ? 1 : 0) : card.ui === 'blocks' ? card.score(raw) : card.score(+raw);
  t[k.round][k.i] = sc; k.i++; k.start = Date.now(); k.tmp = {};
}
function klView(t) {
  const k = t.kl, card = KILAT[k.i], n = KILAT.length, timer = t.timerOn !== false;
  if (!card) return '';
  const el = Date.now() - k.start, left = Math.max(0, Math.ceil((KL_MS - el) / 1000));
  let body = '';
  if (card.ui === 'pick') body = `<div class="kl-opts ${card.opts().length === 2 ? 'two' : ''}">${card.opts().map((o, i) => `<button class="kl-bub" data-act="kl-pick" data-v="${i}">${esc(o)}</button>`).join('')}</div>`;
  if (card.ui === 'ads') body = `<div class="kl-ads">${card.opts().map(([who, l], i) => `<button class="kl-ad" data-act="kl-pick" data-v="${i}"><span class="tiny">${who}</span><b>${l}</b></button>`).join('')}</div>`;
  if (card.ui === 'slider') body = `<div class="sb-slide"><output id="kl-val" for="kl-range" class="num">${rp(card.min)}</output><input type="range" id="kl-range" class="range" min="${card.min}" max="${card.max}" step="${card.step}" value="${card.min}" aria-label="${esc(card.q())}" aria-valuetext="${rp(card.min)}"></div>
    <div class="row between tiny muted"><span>${rps(card.min)}</span><span>${rps(card.max)}</span></div><div class="kl-opts"><button class="kl-bub lock" data-act="kl-lock">Kunci</button></div>`;
  if (card.ui === 'blocks') { const d = KL_DIMAS(), b = k.tmp, loan = d.need.amount - (b.tab ? d.emergencyFund : 0) - (b.kak ? d.need.family : 0);
    body = `<div class="blk-row"><button class="blk ${b.tab ? 'on' : ''}" data-act="kl-toggle" data-v="tab" aria-pressed="${!!b.tab}"><b>Tabungan</b><span class="num">${rps(d.emergencyFund)}</span></button><button class="blk ${b.kak ? 'on' : ''}" data-act="kl-toggle" data-v="kak" aria-pressed="${!!b.kak}"><b>Bantuan kakak</b><span class="num">${rps(d.need.family)}</span></button></div>
    <p class="sb-wallet">Pinjam: <b class="num">${rp(loan)}</b></p><div class="kl-opts"><button class="kl-bub lock" data-act="kl-lock">Kunci</button></div>`; }
  return `<div class="kl-card" aria-live="polite">
    <div class="kl-top"><span class="kl-dots" role="img" aria-label="Kartu ${k.i + 1} dari ${n}">${KILAT.map((_, i) => `<i class="${i < k.i ? 'done' : i === k.i ? 'on' : ''}"></i>`).join('')}</span>${timer ? `<span class="tiny muted" role="timer">${left} dtk</span>` : ''}</div>
    ${timer ? `<div class="kl-time" aria-hidden="true"><i style="animation-duration:${KL_MS}ms;animation-delay:-${el}ms"></i></div>` : ''}
    <h2 id="kl-q" tabindex="-1" class="kl-q">${esc(card.q())}</h2>${body}</div>`;
}
// end-of-game recap: each card, its answer, and how the player did before and after
function klRecap(t) {
  const mark = x => x == null ? '–' : x >= 1 ? '✓' : x > 0 ? '½' : '✗';
  return `<div class="kl-recap"><h3>Jawaban kartu kilat</h3><ul>${KILAT.map((c, i) => `<li><span class="kl-mk" aria-label="Ronde Insting ${mark(t.pre[i])}, Ronde Final ${mark(t.post[i])}"><span>${mark(t.pre[i])}</span>→<b>${mark(t.post[i])}</b></span><div><b>${esc(c.q())}</b><div class="small">${esc(c.answer())}</div></div></li>`).join('')}</ul></div>`;
}
// timers: one per kilat card, and one for the red-flag mini-game; re-armed after every render
let klTimer = null, sbFlagTimer = null;
function armGameTimers() {
  clearTimeout(klTimer); clearTimeout(sbFlagTimer);
  const t = S.test; if (!t || S.route !== 'main' || t.timerOn === false) return;
  if ((t.stage === 1 || t.stage === 3) && t.kl && KILAT[t.kl.i]) {
    const left = KL_MS - (Date.now() - t.kl.start);
    klTimer = setTimeout(() => { if (S.test !== t || !t.kl) return; klAnswer(t, null); announce('Waktu habis'); klAfter(t); }, Math.max(0, left));
  }
  if (t.stage === 2 && t.g && !t.g.out && !t.g.done) {
    const ev = sbActive(t.g)[t.g.i];
    if (ev?.ui === 'flags') sbFlagTimer = setTimeout(() => { if (S.test !== t || t.g.out) return; sbPick(t, t.g.flg.taps.join(',')); render(); document.getElementById('sb-out')?.focus({ preventScroll: true }); }, Math.max(0, SB_FLAG_MS - (Date.now() - t.g.flg.start)));
  }
}
// after each kilat answer: next card, or the next stage once the round is complete
function klAfter(t) {
  if (t.kl.i >= KILAT.length) { t.kl = null; if (t.stage === 1) t.stage = 2; else if (t.stage === 3) t.stage = 4; window.scrollTo(0, 0); }
  render();
  (document.getElementById('kl-q') || document.getElementById('sb-h') || document.querySelector('main h2'))?.focus({ preventScroll: true });
}
