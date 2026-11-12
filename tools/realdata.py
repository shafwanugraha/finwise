"""Convert the team's spreadsheets into src/realdata.js (run with python3 -I)."""
import json, re, sys, math
import pandas as pd
from pathlib import Path
# Raw team spreadsheets live in data/raw/ (not committed: they hold raw Google Play reviews).
ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / 'data' / 'raw'
ND = str(RAW) + '/'  # pinjol.xlsx, reviews.xlsx, sentiment.xlsx
OLD = str(RAW / 'FINAL_wasapada_pinjol_data.xlsx')
def num(v):
    try:
        v = float(v); return None if math.isnan(v) else v
    except Exception: return None
def key(s): return re.sub(r'[^a-z0-9]', '', str(s).lower())
lg = pd.read_excel(ND + 'pinjol.xlsx', sheet_name='pinjol_legal')
rev = pd.read_excel(ND + 'reviews.xlsx', sheet_name=None)
sen = pd.read_excel(ND + 'sentiment.xlsx', sheet_name='sentiment_analysis')
il = pd.read_excel(OLD, sheet_name='pinjol_ilegal')
ASPECTS = [('Harga', r'bunga|biaya|denda|potongan|mahal|murah|admin|imbal'), ('Kecepatan', r'cair|pencairan|cepat|\blama\b|lambat'),
           ('Persetujuan', r'tolak|\bacc\b|limit|pengajuan|lolos|syarat|verifikasi'), ('Penagihan', r'penagih|tagih|\bdc\b|teror|ancam|kasar|collector'),
           ('Privasi', r'data|privasi|kontak|keamanan|\baman\b|spam|telepon|izin akses'), ('Layanan', r'\bcs\b|layanan|error|bug|login|otp|respon|lemot|aplikasi')]
revmap = {key(k): k for k in rev}
senmap = {}
for _, r in sen.iterrows(): senmap.setdefault(key(r.app_name), []).append(r)
PRODUCTIVE = {'amarthafin', 'modalku', 'akseleran', 'alami', 'cicil'}
BOTH = {'danamas', 'maucash'}
out = []
for _, r in lg.iterrows():
    app = str(r.nama_aplikasi); k = key(app)
    d = dict(id=k, name=app, company=r.nama_perusahaan, license=r.nomor_izin_ojk, licenseDate=str(r.tanggal_izin_ojk)[:10], kind=r.jenis_usaha,
             segment=r.target_segment, purpose='both' if k in BOTH else ('produktif' if k in PRODUCTIVE else 'konsumtif'), web=r.website_url, os=r.sistem_operasi,
             dailyMin=num(r.bunga_harian_min_pct), dailyMax=num(r.bunga_harian_max_pct), monthly=num(r.bunga_bulanan_pct), aprMax=num(r.apr_max_pct),
             adminPct=num(r.biaya_admin_pct), lateDaily=num(r.denda_per_hari_pct), min=num(r.pinjaman_min_idr), max=num(r.pinjaman_max_idr),
             tenorMinDays=num(r.tenor_min_days), tenorMaxDays=num(r.tenor_max_days), iso27001=str(r.iso_27001_certified).lower() == 'yes',
             iso27701=str(r.iso_27701_certified).lower() == 'yes', source=r.sumber_data, verified=str(r.last_verified_date)[:10], notes=r.notes if isinstance(r.notes, str) else '')
    d['adminUnit'] = 'month' if re.search(r'admin [\d.,]+%/bulan', d['notes']) else 'once'
    d['rateIsMin'] = bool(d['dailyMax'] is None and d['aprMax'] is None and re.search(r'mulai', d['notes']))
    sk = revmap.get(k)
    if sk:
        df = rev[sk].iloc[:, :9].copy(); df.columns = ['id', 'user', 'rating', 'text', 'date', 'likes', 'reply', 'rdate', 'ver']
        df['r'] = pd.to_numeric(df.rating, errors='coerce'); df = df[df.r.notna()]
        df['t'] = pd.to_datetime(df.date, errors='coerce'); df['likes'] = pd.to_numeric(df.likes, errors='coerce').fillna(0)
        def quotes(sub, n):
            sub = sub[sub.text.astype(str).str.len().between(35, 230)]
            sub = sub[~sub.text.astype(str).str.contains(r'\d{8,}|@|http', regex=True)]
            sub = sub.sort_values(['likes', 't'], ascending=False).head(n)
            return [dict(r=int(x.r), text=re.sub(r'\s+', ' ', str(x.text)).strip(), date=str(x.t)[:10]) for x in sub.itertuples()]
        end = df.t.max(); cur = df[df.t > end - pd.Timedelta(hours=72)]; prev = df[(df.t <= end - pd.Timedelta(hours=72)) & (df.t > end - pd.Timedelta(hours=144))]
        spike = None
        if len(cur) >= 15 and len(prev) >= 15:
            a, b = (cur.r <= 2).mean(), (prev.r <= 2).mean(); spike = dict(cur=round(a, 3), prev=round(b, 3), delta=round((a - b) * 100, 1), ncur=len(cur), nprev=len(prev))
        d['reviews'] = dict(n=len(df), avg=round(df.r.mean(), 2), pos=round((df.r >= 4).mean(), 3), neg=round((df.r <= 2).mean(), 3), replied=round(df.reply.notna().mean(), 3),
                            frm=str(df.t.min())[:10], to=str(end)[:10], dist=[int((df.r == s).sum()) for s in (1, 2, 3, 4, 5)])
        d['spike'] = spike
    cl = senmap.get(k, [])
    d['clusters'] = [dict(type=c.sentiment_type, label=c.cluster_label, n=int(num(c.mention_count) or 0), desc=c.description) for c in cl]
    asp = {}
    for name, rx in ASPECTS:
        pos = sum(c['n'] for c in d['clusters'] if c['type'] == 'praise' and re.search(rx, c['label'].lower()))
        neg = sum(c['n'] for c in d['clusters'] if c['type'] == 'complaint' and re.search(rx, c['label'].lower()))
        if pos + neg >= 3: asp[name] = dict(pos=pos, neg=neg, share=round(pos / (pos + neg), 3))
    d['aspects'] = asp
    out.append(d)
ill = [dict(name=r.nama_aplikasi, short=str(r.nama_aplikasi).split(' - ')[0].replace('Platform Pinjaman Online ', ''), where=str(r.platform_distribusi).replace('third-party APK store', 'toko APK pihak ketiga'), source='Satgas PASTI, daftar pinjol ilegal April 2026', date=str(r.tanggal_dilaporkan)) for r in il.itertuples()]
# AdaKami Android permissions analysed by the team (Wasapada export)
perm = pd.read_csv(RAW / 'output-adakami' / 'permissions.csv')
groups = {}
for r in perm.itertuples():
    if r.group == 'Lainnya': continue
    groups.setdefault(r.group, False); groups[r.group] = groups[r.group] or bool(r.is_high_risk)
for d in out:
    if d['id'] == 'adakami': d['perms'] = dict(total=len(perm), high=int(perm.is_high_risk.sum()), groups=sorted(groups))
js = '/* Real data from the team (RIPLAY pricing 30 Apr 2026, Google Play review samples, sentiment clusters, Satgas PASTI Apr 2026) */\nconst REAL = ' + json.dumps(dict(lenders=out, illegal=ill, total=94), ensure_ascii=False, default=str) + ';\nif (typeof module !== "undefined") module.exports = REAL;\n'
open(ROOT / 'src' / 'realdata.js', 'w').write(js)
print(len(out), 'lenders;', sum(1 for d in out if d.get('reviews')), 'with reviews;', len(js), 'bytes')
for d in out:
    rv = d.get('reviews') or {}
    print(f"{d['name']:13s} rev={rv.get('n','-')} avg={rv.get('avg','-')} clusters={len(d['clusters'])} aspects={list(d['aspects'])} spike={d.get('spike') and d['spike']['delta']}")
