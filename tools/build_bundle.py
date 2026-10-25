#!/usr/bin/env python3
"""Writes the update the TVs download: the app's files, in loader.js's order, as text in one JSON file.

    python3 tools/build_bundle.py <out.json>

Its version is the build time, as is an installed package's (install-tv stamps app/version.js), so a TV runs
whichever is newer. The GitHub workflow runs this on every push that changes app/ and publishes the result on
GitHub Pages, so pushing is releasing. Python 3 standard library only.
"""
import json
import os
import re
import sys
import time

APP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app')
# Per TV (install-tv writes it) or per build: never in the bundle
LOCAL_ONLY = {'devmode.js', 'version.js'}


def file_order():
    """FILES in app/loader.js."""
    with open(os.path.join(APP, 'loader.js'), encoding='utf-8') as f:
        match = re.search(r'var FILES = \[(.*?)\];', f.read(), re.S)
    return re.findall(r"'([^']+)'", match.group(1))


if __name__ == '__main__':
    out = sys.argv[1]
    order = file_order()
    files = {}
    for name in order:
        if name not in LOCAL_ONLY:
            with open(os.path.join(APP, name), encoding='utf-8') as f:
                files[name] = f.read()
    os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
    with open(out, 'w', encoding='utf-8') as f:
        json.dump({'version': int(time.time()), 'order': order, 'files': files}, f, ensure_ascii=False)
    print('Wrote %s: %d files, %d KB' % (out, len(files), os.path.getsize(out) // 1024))
