"""Проставляет номер версии к CSS и JS в index.html (?v=...).
Браузер видит новый адрес файла и не берёт старую копию из кеша.
Запускать перед каждой публикацией: python3 tools/stamp_version.py"""
import pathlib, re, time

root = pathlib.Path(__file__).resolve().parent.parent
page = root / 'index.html'
version = time.strftime('%Y%m%d%H%M%S')
html = page.read_text(encoding='utf-8')
html, n = re.subn(r'((?:href|src)="(?:css|js)/[\w.-]+\.(?:css|js))(?:\?v=\w+)?"', rf'\1?v={version}"', html)
page.write_text(html, encoding='utf-8')
print(f'version {version}: {n} files')
