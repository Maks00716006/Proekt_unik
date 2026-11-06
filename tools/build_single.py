"""Собирает весь сайт в один файл dist/sosedi.html (CSS, JS и картинки внутри).
Запуск: python3 tools/build_single.py"""
import base64, re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
def data_uri(path):
    p = root / path
    mime = {'.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png'}[p.suffix]
    return f'data:{mime};base64,' + base64.b64encode(p.read_bytes()).decode()
html = (root / 'index.html').read_text(encoding='utf-8')
def css(m):
    text = (root / m.group(1).split('?')[0]).read_text(encoding='utf-8')
    text = re.sub(r"url\('\.\./(assets/[^']+)'\)", lambda u: f"url('{data_uri(u.group(1))}')", text)
    return f'<style>\n{text}\n</style>'
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', css, html)
html = re.sub(r'<script src="([^"]+)"></script>',
              lambda m: '<script>\n' + (root / m.group(1).split('?')[0]).read_text(encoding='utf-8') + '\n</script>', html)
html = re.sub(r'(src|href)="(assets/[^"]+)"', lambda m: f'{m.group(1)}="{data_uri(m.group(2))}"', html)
out = root / 'dist' / 'sosedi.html'
out.parent.mkdir(exist_ok=True)
out.write_text(html, encoding='utf-8')
print(out, round(out.stat().st_size / 1024), 'KB')
