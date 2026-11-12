"""OJK lists + industry statistics -> src/ojkdata.js (run with python3 -I)."""
import re, json, sys, collections, urllib.parse
import pdfplumber, pandas as pd
from pathlib import Path
# Public OJK files go in data/raw/Data OJK/ (see README).
ROOT = Path(__file__).resolve().parent.parent
D = str(ROOT / 'data' / 'raw' / 'Data OJK') + '/'
clean = lambda c: re.sub(r'\s+', ' ', c or '').strip()
# licensed list (OJK, January 2025)
lic = {}
with pdfplumber.open(D + 'Daftar LPBBTI (Fintech Lending) Januari 2025.pdf') as pdf:
    for pg in pdf.pages:
        for t in pg.extract_tables():
            for r in t:
                r = [clean(c) for c in r]
                if len(r) >= 8 and re.fullmatch(r'\d+', r[0]): lic[int(r[0])] = r
licensed = [dict(no=n, company=r[1], app=r[2], license=r[3], date=r[4], kind=r[5], web=r[6], os=r[7]) for n, r in sorted(lic.items())]
# illegal list (Satgas PASTI, April 2026)
ill, inv, section = [], [], 'pinjol'
with pdfplumber.open(D + 'Daftar Pinjaman Online Ilegal dan Investasi Ilegal April 2026.pdf') as pdf:
    for pg in pdf.pages:
        for t in pg.extract_tables():
            for r in t:
                r = [clean(c) for c in r]
                if not r or not re.fullmatch(r'\d+', r[0]): continue
                if r[0] == '1' and ill and not r[1].startswith('http'): section = 'inv'
                if section == 'inv': inv.append(r[1]); continue
                ill.append((int(r[0]), r[1], r[2]))
def channel(url):
    u = url.lower(); host = urllib.parse.urlparse(url if '://' in url else 'http://' + url).netloc.replace('www.', '')
    for k, v in [('play.google', 'Google Play'), ('apkpure', 'APKPure'), ('aptoide', 'Aptoide'), ('softonic', 'Softonic'), ('instagram', 'Instagram'), ('facebook', 'Facebook'), ('threads', 'Threads'), ('linkedin', 'LinkedIn'), ('tiktok', 'TikTok'), ('t.me', 'Telegram'), ('wa.me', 'WhatsApp'), ('apps.apple', 'App Store'), ('uptodown', 'Uptodown'), ('apkcombo', 'APKCombo')]:
        if k in u: return v, ''
    return 'Situs web', host
groups = collections.OrderedDict()
for no, url, name in ill:
    nm = re.sub(r'^[“"]+|[”"]+$', '', name).strip() or url
    key = re.sub(r'[^a-z0-9]', '', nm.lower())
    ch, host = channel(url)
    g = groups.setdefault(key, dict(name=nm, ch=[], hosts=[], n=0))
    g['n'] += 1
    if ch not in g['ch']: g['ch'].append(ch)
    if host and host not in g['hosts']: g['hosts'].append(host)
illegal = list(groups.values())
# industry statistics (OJK, December 2025)
x = pd.read_excel(D + 'LPBBTI_Clean_December_2025.xlsx', sheet_name=None)
ov = x['overview']; fp = x['financial_performance']; loc = x['outstanding_by_location']; dm = x['borrower_demographics']
last = dm[dm.period == dm.period.max()]
tot = last[(last.loan_quality == 'Total') & (last.gender == 'All') & (last.age_group == 'All')].iloc[0]
age = [dict(g=a, acc=int(r.active_borrower_accounts), out=round(float(r.outstanding_idr_billion), 1)) for a in ['<19', '19-34', '35-54', '>54'] for r in [last[(last.loan_quality == 'Total') & (last.gender == 'All') & (last.age_group == a)].iloc[0]]]
qual = [dict(q=q, acc=int(r.active_borrower_accounts), out=round(float(r.outstanding_idr_billion), 1)) for q in last.loan_quality.unique() if q != 'Total' for r in [last[(last.loan_quality == q) & (last.gender == 'All') & (last.age_group == 'All')].iloc[0]]]
# 19-34 quality split for "anak muda" insight
young = {q: int(last[(last.loan_quality == q) & (last.gender == 'All') & (last.age_group == '19-34')].iloc[0].active_borrower_accounts) for q in last.loan_quality.unique()}
lp = loc[loc.period == loc.period.max()]
prov = lp[~lp.province.isin(['Jawa', 'Luar Jawa'])].sort_values('outstanding_idr_billion', ascending=False)
provs = [dict(p=r.province, acc=int(r.active_borrower_accounts), out=round(float(r.outstanding_idr_billion), 1), twp=round(float(r.twp90), 4)) for r in prov.itertuples()]
trend = [dict(m=str(r.period)[:7], tkb=round(float(r.tkb90), 4), twp=round(float(r.twp90), 4)) for r in fp.itertuples()]
o = ov[ov.company_type == 'Total'].iloc[0]
stats = dict(period='Desember 2025', companies=int(o.num_companies), conv=int(ov[ov.company_type == 'Konvensional'].iloc[0].num_companies), syariah=int(ov[ov.company_type == 'Syariah'].iloc[0].num_companies),
             assets=round(float(o.total_assets_idr_billion), 1), borrowers=int(tot.active_borrower_accounts), outstanding=round(float(tot.outstanding_idr_billion), 1),
             trend=trend, age=age, quality=qual, young=young, provinces=provs)
GENERIC = re.compile(r'^(url facebook|anonymous participant)$', re.I)
for g in illegal: g['generic'] = bool(GENERIC.match(g['name']))
toks = lambda s: [t for t in re.split(r'[^a-z0-9]+', s.lower()) if t]
def clone_of(app, name):
    a = re.sub(r'[^a-z0-9]', '', app.lower()); t = toks(name)
    head = re.sub(r'[^a-z0-9]', '', re.split(r'\s[-–|:/]\s?|[:|/]', name)[0].lower())
    if len(a) < 4: return False
    if head == a: return True
    if len(a) <= 5: return False
    return any(''.join(t[i:j]) == a for i in range(len(t)) for j in range(i + 1, min(len(t), i + 4) + 1))
for l in licensed:
    l['clones'] = [g['name'] for g in illegal if not g['generic'] and clone_of(l['app'], g['name'])]
out = dict(licensed=licensed, licensedPeriod='Januari 2025', illegal=illegal, illegalEntries=len(ill), illegalPeriod='April 2026', investIllegal=len(inv), stats=stats)
js = '/* OJK data (Daftar LPBBTI Jan 2025, Satgas PASTI Apr 2026, Statistik LPBBTI Des 2025) */\nconst OJK = ' + json.dumps(out, ensure_ascii=False) + ';\nif (typeof module !== "undefined") module.exports = OJK;\n'
open(ROOT / 'src' / 'ojkdata.js', 'w').write(js)
print('licensed', len(licensed), 'illegal entries', len(ill), 'unique names', len(illegal), 'invest', len(inv), 'bytes', len(js))
print('nums', [l['no'] for l in licensed][:3], '...', licensed[-1]['no'], 'missing', sorted(set(range(1, 98)) - {l['no'] for l in licensed}))
print(json.dumps({k: v for k, v in stats.items() if k not in ('provinces', 'trend')}, ensure_ascii=False))
print(trend[-3:], provs[:3])
print(collections.Counter(c for g in illegal for c in g['ch']).most_common())
print({l['app']: l['clones'] for l in licensed if l['clones']})
