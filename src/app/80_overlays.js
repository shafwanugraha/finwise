/* ================= overlays ================= */
function profileEditor() {
  const p = P();
  const incRow = (i, k) => `<div class="grid g4" style="align-items:end"><label class="f">Sumber<input class="in" value="${esc(i.label)}" data-pf="incomes.${k}.label" data-t="text"></label><label class="f">Jumlah${rpInput('pf-i' + k, i.amount, `data-pf="incomes.${k}.amount" data-t="rp"`)}</label><label class="f">Tgl masuk<input class="in" type="number" min="1" max="30" value="${i.payday || 1}" data-pf="incomes.${k}.payday" data-t="int"></label><div class="row"><select class="in" aria-label="Jenis pemasukan" data-pf="incomes.${k}.type" data-t="text"><option value="tetap" ${i.type === 'tetap' ? 'selected' : ''}>Tetap</option><option value="tidak tetap" ${i.type !== 'tetap' ? 'selected' : ''}>Tidak tetap</option></select><button class="btn ghost sm" data-act="pf-del" data-list="incomes" data-i="${k}" aria-label="Hapus pemasukan ${esc(i.label)}">×</button></div></div>`;
  const spRow = (c, k) => `<div class="grid g4" style="align-items:end"><label class="f">Pos<input class="in" value="${esc(c.name)}" data-pf="spending.${k}.name" data-t="text"></label><label class="f">Jumlah/bln${rpInput('pf-s' + k, c.amount, `data-pf="spending.${k}.amount" data-t="rp"`)}</label><label class="f">Jenis<select class="in" data-pf="spending.${k}.kind" data-t="text"><option value="need" ${c.kind === 'need' ? 'selected' : ''}>Pokok</option><option value="want" ${c.kind === 'want' ? 'selected' : ''}>Keinginan</option></select></label><div><button class="btn ghost sm" data-act="pf-del" data-list="spending" data-i="${k}" aria-label="Hapus pengeluaran ${esc(c.name)}">×</button></div></div>`;
  return `<div class="overlay" data-act="close-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="Ubah data" data-stop>
   <div class="row between"><h2>Ubah data ${esc(p.name)}</h2><button class="btn ghost sm" data-act="close">Tutup</button></div>
   <p class="small muted" style="margin:6px 0 14px">${p.id === 'saya' ? 'Data ini hanya tersimpan di browser ini.' : 'Mengubah contoh tidak mempengaruhi orang lain. Pilih “Data saya” untuk memakai angkamu sendiri.'}</p>
   <div class="stack">
    <h3>Pemasukan</h3>${p.incomes.map(incRow).join('')}<div><button class="btn ghost sm" data-act="pf-add" data-list="incomes">+ Pemasukan</button></div>
    <h3 style="margin-top:8px">Pengeluaran bulanan</h3>${p.spending.map(spRow).join('')}<div><button class="btn ghost sm" data-act="pf-add" data-list="spending">+ Pengeluaran</button></div>
    <div class="grid g2" style="margin-top:8px"><label class="f">Kirim ke keluarga/bln${rpInput('pf-fam', p.family || 0, 'data-pf="family" data-t="rp"')}</label><label class="f">Dana darurat sekarang${rpInput('pf-ef', p.emergencyFund || 0, 'data-pf="emergencyFund" data-t="rp"')}</label><label class="f">Menabung rutin/bln${rpInput('pf-sv', p.savingMonthly || 0, 'data-pf="savingMonthly" data-t="rp"')}</label>
     <label class="f">Status SLIK<select class="in" data-pf="slik" data-t="text">${[['lancar', 'Lancar'], ['kosong', 'Belum ada riwayat'], ['tidaktahu', 'Belum dicek'], ['dpk', 'Pernah telat (Kol 2)'], ['macet', 'Macet']].map(([v, l]) => `<option value="${v}" ${p.slik === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
    <label class="chk"><input type="checkbox" data-pf="onTime" data-t="bool" ${p.onTime ? 'checked' : ''}><span>Semua tagihan dibayar tepat waktu 3 bulan terakhir</span></label>
    <label class="chk"><input type="checkbox" data-pf="insurance" data-t="bool" ${p.insurance ? 'checked' : ''}><span>Punya BPJS Kesehatan/asuransi</span></label>
    <label class="chk"><input type="checkbox" data-pf="plan" data-t="bool" ${p.plan ? 'checked' : ''}><span>Punya target/rencana keuangan aktif</span></label>
    <label class="chk"><input type="checkbox" data-pf="access.koperasi" data-t="bool" ${p.access?.koperasi ? 'checked' : ''}><span>Bisa meminjam dari koperasi karyawan</span></label>
    <label class="chk"><input type="checkbox" data-pf="access.bank" data-t="bool" ${p.access?.bank ? 'checked' : ''}><span>Punya rekening dan akses pinjaman bank</span></label>
    <div class="row" style="margin-top:8px"><button class="btn" data-act="close">Selesai</button>${p.id !== 'saya' ? '<button class="btn ghost" data-act="pf-reset">Kembalikan contoh</button>' : ''}</div>
   </div></div></div>`;
}
const CATS = [
  ['Tempat tinggal & tagihan', 'need', /kos|sewa|kontrak|listrik|pln|pdam|token|ipl/i], ['Makan & kebutuhan harian', 'need', /indomaret|alfamart|alfa|pasar|warteg|warung|beras|super|hypermart|makan/i],
  ['Transport', 'need', /krl|mrt|transjakarta|commuter|bensin|pertamina|shell|parkir|tol|kai/i], ['Pulsa & internet', 'need', /pulsa|telkomsel|indosat|xl|indihome|biznet|internet|kuota/i],
  ['Pendidikan & kesehatan', 'need', /ukt|kuliah|buku|apotek|klinik|obat|bpjs|kampus/i], ['Pesan-antar & nongkrong', 'want', /gofood|grabfood|shopeefood|kopi|cafe|coffee|starbucks|janji jiwa|resto|mcd|kfc/i],
  ['Ojek & taksi online', 'want', /gojek|grab|maxim|gocar|goride/i], ['Belanja online', 'want', /shopee|tokopedia|lazada|tiktok shop|blibli|zalora/i],
  ['Langganan & hiburan', 'want', /netflix|spotify|youtube|disney|vidio|steam|game|cgv|xxi|bioskop|icloud|google one/i], ['Cicilan & paylater', 'debt', /paylater|kredivo|akulaku|cicilan|angsuran|adira|fif|pinjam|kartu kredit/i],
];
const SAMPLE_CSV = `tanggal;keterangan;jumlah\n01/10;Uang saku dari ortu;2500000\n01/10;Bayar kos Oktober;-850000\n01/10;Spotify;-55000\n01/10;Netflix;-54000\n02/10;Indomaret;-85000\n03/10;GoFood;-62000\n04/10;Kopi Kenangan;-38000\n05/10;Shopee belanja;-215000\n06/10;Grab;-27000\n07/10;Pulsa Telkomsel;-100000\n08/10;Warteg;-30000\n09/10;Steam game;-54000\n10/10;Top up GoPay;-200000\n12/10;Transfer freelance desain;300000\n14/10;Janji Jiwa;-33000\n15/10;Tokopedia;-180000`;
function parseStatement(txt) {
  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const out = { income: 0, internal: 0, cats: {}, n: 0 };
  lines.forEach(l => {
    const parts = l.split(/[;,\t]/); const amtStr = [...parts].reverse().find(x => /-?\d[\d.]*\d|^-?\d+$/.test(x.replace(/\s/g, '')));
    if (!amtStr) return; let amt = Number(amtStr.replace(/[^\d-]/g, '')); if (!amt) return;
    if (/\bDB\b|debit/i.test(l) && amt > 0) amt = -amt;
    const desc = parts.filter(x => x !== amtStr).join(' ');
    if (/top ?up|isi saldo|pindah dana|ke rekening sendiri/i.test(desc)) { out.internal += Math.abs(amt); return; }
    if (amt > 0) { out.income += amt; return; }
    const c = CATS.find(c => c[2].test(desc)) || ['Lainnya', 'want'];
    out.cats[c[0]] = out.cats[c[0]] || { name: c[0], kind: c[1], amount: 0 }; out.cats[c[0]].amount += -amt; out.n++;
  });
  return out;
}
function importSheet() {
  const res = S.importRes;
  return `<div class="overlay" data-act="close-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="Impor mutasi" data-stop>
   <div class="row between"><h2>Impor mutasi rekening/e-wallet</h2><button class="btn ghost sm" data-act="close">Tutup</button></div>
   <p class="small muted" style="margin:6px 0 12px">Tempel teks mutasi (CSV: tanggal; keterangan; jumlah) atau pilih file .csv. Transaksi dikategorikan otomatis; top-up dan transfer antar rekening sendiri tidak dihitung sebagai pengeluaran. Diproses di perangkatmu, tidak dikirim ke mana pun.</p>
   <textarea class="in" id="imp-text" rows="8" placeholder="tanggal;keterangan;jumlah">${esc(S.importText || '')}</textarea>
   <div class="row" style="margin-top:8px"><label class="btn ghost sm" for="imp-file">Pilih file CSV</label><input type="file" id="imp-file" accept=".csv,.txt,text/csv,text/plain" class="sr" data-act-change="imp-file"><button class="btn ghost sm" data-act="imp-sample">Pakai contoh mutasi</button><button class="btn sm" data-act="imp-run">Kategorikan</button></div>
   ${res ? `<div class="card flat" style="margin-top:14px"><div class="row between"><b>${res.n} transaksi pengeluaran</b><span class="small muted">pemasukan ${rp(res.income)} · transfer internal ${rp(res.internal)} diabaikan</span></div>
    <div class="stack small" style="margin-top:8px;gap:6px">${Object.values(res.cats).sort((a, b) => b.amount - a.amount).map(c => `<div class="row between"><span>${esc(c.name)} <span class="pill ${c.kind === 'need' ? 'z-green' : c.kind === 'want' ? 'z-amber' : 'z-grey'}">${c.kind === 'need' ? 'Pokok' : c.kind === 'want' ? 'Keinginan' : 'Cicilan'}</span></span><b class="num">${rp(c.amount)}</b></div>`).join('')}</div>
    ${res.cats['Cicilan & paylater'] ? '<p class="tiny muted" style="margin-top:8px">Cicilan terdeteksi: tambahkan rinciannya di Daftar utang (PILAH) agar batas aman akurat.</p>' : ''}
    <div class="row" style="margin-top:10px"><button class="btn" data-act="imp-apply">Pakai sebagai profil pengeluaran “Data saya”</button></div></div>` : ''}
  </div></div>`;
}
function pickSheet() {
  const o = S.overlay, ctxTest = o.test, st = ctxTest ? S.test.st : S.pilah, p = ctxTest ? S.test.p : P();
  const { m } = pilahCalc(p, st); const r = m.ok.find(x => x.id === o.id); if (!r) return '';
  return `<div class="overlay" data-act="close-bg" style="align-items:center;justify-content:center;padding:16px"><div class="sheet center" role="dialog" aria-modal="true" aria-label="Konfirmasi pilihan" data-stop style="max-width:480px">
   <h2>${esc(r.name)}</h2><div style="margin-top:6px">${zpill(r.zone)}</div>
   <div class="stack small" style="margin-top:12px;gap:6px"><div class="row between"><span>Cicilan</span><b class="num">${rp(r.inst)} × ${r.months} bulan</b></div><div class="row between"><span>Total dikembalikan</span><b class="num">${rp(r.repay)}</b></div><div class="row between"><span>Biaya pinjaman (bunga + admin)</span><b class="num">${rp(r.total)}</b></div><div class="row between"><span>Porsi cicilan setelahnya</span><b class="num">${pct(r.dsr)}</b></div><div class="row between"><span>Sisa uang per bulan</span><b class="num" style="color:${r.left < 0 ? 'var(--danger)' : 'inherit'}">${rp(r.left, { plus: true })}</b></div></div>
   ${r.zone === 'danger' ? `<div class="note danger" style="margin-top:12px">Pilihan ini membuat ${r.left < 0 ? 'uangmu minus setiap bulan' : 'rasio cicilanmu di atas 40%'}. Risiko telat bayar dan berutang lagi tinggi.</div><label class="chk" style="margin-top:10px"><input type="checkbox" id="ack" data-act-change="ack" ${o.ack ? 'checked' : ''}><span>Saya paham risikonya dan tetap ingin memilih ini</span></label>` : ''}
   <div class="row" style="margin-top:14px"><button class="btn ${r.zone === 'danger' ? 'danger' : ''}" data-act="pick-confirm" ${r.zone === 'danger' && !o.ack ? 'disabled' : ''}>Konfirmasi pilihan</button><button class="btn ghost" data-act="close">Batal</button></div>
  </div></div>`;
}
function chatSheet() {
  return `<div class="overlay" data-act="close-bg"><div class="sheet" role="dialog" aria-modal="true" aria-label="Tanya FinWise" data-stop style="display:flex;flex-direction:column">
   <div class="row between"><h2>Tanya FinWise</h2><button class="btn ghost sm" data-act="close">Tutup</button></div>
   <p class="tiny muted" style="margin:6px 0 12px">Menjawab memakai data profil ${esc(P().name)} yang tampil di layar. AI tidak menghitung angka baru dan bukan nasihat keuangan profesional.</p>
   <div class="chat" id="chat-log" style="flex:1">${S.chat.length ? S.chat.map((m, i) => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}" ${i === S.chat.length - 1 && m.role === 'assistant' ? 'id="chat-last"' : ''}>${esc(m.content)}</div>`).join('') : `<div class="msg ai">Halo! Tanya apa saja soal kondisi keuangan ${esc(P().name)}, misalnya “Apakah aman pinjam Rp5 juta?” atau “Apa itu DSR?”.</div>`}</div>
   <div class="row" style="margin:10px 0">${['Apakah aman pinjam lagi?', 'Apa itu DSR?', 'Mana yang harus dilunasi dulu?'].map(q => `<button class="btn ghost sm" data-act="chat-q" data-q="${esc(q)}">${esc(q)}</button>`).join('')}</div>
   <form class="row" data-form="chat"><label class="sr" for="chat-in">Pesan</label><input class="in" id="chat-in" placeholder="Tulis pertanyaan…" style="flex:1" autocomplete="off"><button class="btn" ${S.chatBusy ? 'disabled' : ''}>Kirim</button></form>
  </div></div>`;
}

// side panel: AI chat + plain-language glossary. Non-modal, so the page stays readable next to it.
const QUICK = ['Apakah aman kalau aku pinjam lagi?', 'Berapa batas cicilan amanku?', 'Apa langkah pertama yang paling penting?', 'Utang mana yang dilunasi dulu?'];
function ruleAnswer(q) {
  const p = P(); if (needsSetup()) return 'Isi datamu dulu di menu "Isi data saya", lalu aku bisa menjawab dengan angkamu sendiri.';
  const f = facts(p), h = f.h;
  if (/aman.*pinjam|pinjam lagi/i.test(q)) { const R = FW.readiness(p); return `Kesiapan berutangmu: ${READY[R.level].name}. ${R.reasons[0]} ${readyNext(R)}`; }
  if (/batas/i.test(q)) { const R = FW.readiness(p); return h.ceiling > 0 ? `Batas cicilan amanmu ${rp(h.ceiling)} per bulan, jadi pinjaman maksimal yang aman sekitar ${rp(R.max[6])} untuk 6 bulan. Batas ini angka yang lebih kecil antara 30% pendapatan dikurangi cicilan lama (${rp(h.lens1)}) dan 70% sisa uangmu setelah tabungan rutin (${rp(h.lens2)}).` : 'Saat ini belum ada ruang untuk cicilan baru: sisa uangmu setelah cicilan lama dan tabungan rutin sudah habis. Fokus dulu ke rencana di CEK.'; }
  if (/langkah|pertama/i.test(q)) { const pr = priorities(p, f)[0]; return `${pr.title}. ${pr.text}`; }
  if (/lunas/i.test(q)) { if (!p.loans.length) return 'Kamu tidak punya cicilan aktif. Pertahankan!'; const top = [...p.loans].sort((a, b) => (b.rateMonthly || 0) - (a.rateMonthly || 0))[0]; return `Dahulukan yang bunganya paling tinggi: ${top.name} (${((top.rateMonthly || 0) * 100).toLocaleString('id-ID')}% per bulan). Bayar minimum di utang lain, lalu sisa uang ekstra masuk ke ${top.name}. Detailnya di PULIH.`; }
  return '';
}
function drawerPanel() {
  const d = S.drawer, tab = d.tab || 'chat', q = norm(d.q || ''), sel = d.term;
  const entries = Object.entries(TERMS).filter(([k, v]) => !q || norm(k + v).includes(q)).sort((a, b) => (b[0] === sel) - (a[0] === sel) || a[0].localeCompare(b[0]));
  const chatBody = S.cap.sample ? `<div class="chat" id="chat-log">${S.chat.length ? S.chat.map((m, i) => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}" ${i === S.chat.length - 1 && m.role === 'assistant' ? 'id="chat-last"' : ''}>${esc(m.content)}</div>`).join('') : `<div class="msg ai">Halo! Aku membaca angka di FinWise${needsSetup() ? '' : ` milik ${esc(displayName(P()))}`}. Tanya apa saja, misalnya istilah yang membingungkan atau apakah sebuah pinjaman aman.</div>`}</div>`
    : `<div class="chat" id="chat-log">${S.chat.length ? S.chat.map(m => `<div class="msg ${m.role === 'user' ? 'me' : 'ai'}">${esc(m.content)}</div>`).join('') : '<div class="msg ai">Pilih pertanyaan cepat di bawah; jawabannya dihitung dari angkamu. Chat bebas dengan AI segera hadir; untuk sekarang, pilih pertanyaan cepat atau buka Kamus istilah.</div>'}</div>`;
  return `<aside class="drawer" aria-label="Bantuan FinWise">
   <div class="row between"><b>✦ Bantuan FinWise</b><button class="btn ghost sm" data-act="drawer-close" aria-label="Tutup panel bantuan">Tutup</button></div>
   <div class="seg" role="tablist" aria-label="Jenis bantuan" style="margin-top:10px"><button role="tab" aria-selected="${tab === 'chat'}" class="${tab === 'chat' ? 'on' : ''}" data-act="drawer" data-v="chat" data-keep="1">${S.cap.sample ? 'Tanya AI' : 'Tanya cepat'}</button><button role="tab" aria-selected="${tab === 'kamus'}" class="${tab === 'kamus' ? 'on' : ''}" data-act="drawer" data-v="kamus" data-keep="1">Kamus istilah</button></div>
   ${tab === 'chat' ? `<div class="dbody">${chatBody}</div>
    <div class="row" style="gap:6px;margin:8px 0">${QUICK.map(x => `<button class="chip" data-act="chat-q" data-q="${esc(x)}">${esc(x)}</button>`).join('')}</div>
    ${S.cap.sample ? `<form class="row" data-form="chat" style="flex-wrap:nowrap"><label class="sr" for="chat-in">Pesan</label><input class="in" id="chat-in" placeholder="Tulis pertanyaan…" autocomplete="off"><button class="btn" ${S.chatBusy ? 'disabled' : ''}>Kirim</button></form><p class="tiny muted" style="margin-top:6px">AI memakai angka di FinWise dan tidak menghitung angka baru. Bukan nasihat keuangan profesional.</p>` : ''}`
   : `<div class="dbody"><label class="sr" for="kamus-q">Cari istilah</label><input class="in" id="kamus-q" placeholder="Cari istilah, mis. DSR" value="${esc(d.q || '')}" data-live="kamus" autocomplete="off">
     <dl class="gloss">${entries.map(([k, v]) => `<div class="${k === sel ? 'on' : ''}"><dt>${esc(k)}</dt><dd>${esc(v)}</dd>${S.cap.sample ? `<button class="linkbtn tiny" data-act="ask-term" data-v="${esc(k)}">Tanya AI: apa artinya untuk kondisiku?</button>` : ''}</div>`).join('') || '<p class="small muted">Istilah tidak ditemukan. Coba tanya AI.</p>'}</dl></div>`}
  </aside>`;
}
