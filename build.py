"""Build FinWise into one self-contained page: docs/index.html (served by GitHub Pages).

Usage:  python3 build.py
"""
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
src = ROOT / 'src'

html = (src / 'index.html').read_text()
html = html.replace('/*CSS*/', (src / 'app.css').read_text())
# app modules are concatenated in file-name order inside one closure
app = '/* ===== FinWise app ===== */\n(() => {\n' + ''.join(p.read_text() for p in sorted((src / 'app').glob('*.js'))) + '})();\n'
for k, txt in [('ENGINE', (src / 'engine.js').read_text()), ('DATA', (src / 'data.js').read_text()),
               ('REAL', (src / 'realdata.js').read_text()), ('OJK', (src / 'ojkdata.js').read_text()), ('APP', app)]:
    html = html.replace(f'/*{k}*/', txt.replace('</script>', '<\\/script>'))

out = ROOT / 'docs'
out.mkdir(exist_ok=True)
(out / 'index.html').write_text(html)
(out / '.nojekyll').touch()
print(f'docs/index.html: {len(html):,} karakter')
