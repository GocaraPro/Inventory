"""Download data only; never execute code from the upstream repository."""
import io
import json
import pathlib
import tarfile
import urllib.request

root = pathlib.Path('.cache/tcgdex-source').resolve()
root.mkdir(parents=True, exist_ok=True)
request = urllib.request.Request('https://codeload.github.com/tcgdex/cards-database/tar.gz/refs/heads/master')
with urllib.request.urlopen(request, timeout=120) as response:
    archive = response.read()
count = 0
with tarfile.open(fileobj=io.BytesIO(archive), mode='r:gz') as source:
    for entry in source:
        parts = entry.name.split('/', 1)
        if len(parts) != 2 or not entry.isfile():
            continue
        relative = parts[1]
        if not ((relative.startswith('data/') and relative.endswith('.ts')) or relative == 'LICENSE'):
            continue
        target = (root / relative).resolve()
        if not target.is_relative_to(root):
            raise ValueError('Unexpected archive path')
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.extractfile(entry).read())
        count += 1
with urllib.request.urlopen('https://api.tcgdex.net/v2/en/cards', timeout=60) as response:
    cards = json.load(response)
pathlib.Path('.cache/tcgdex-cards.json').write_text(json.dumps(cards), encoding='utf-8')
print(f'Downloaded {count} source files and {len(cards)} English card references.')
