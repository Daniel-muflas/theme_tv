#!/usr/bin/env python3
"""Draws the app's icons (app/icon.png 80x80, app/largeIcon.png 130x130): four light squares on a dark tile.

    python3 tools/make_icons.py

Python 3 standard library only.
"""
import os
import struct
import zlib

APP = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app')
BACKGROUND = (17, 19, 24)
SQUARE = (238, 240, 244)


def pixels(size):
    """Rows of RGB tuples: a 2x2 block of squares centered on the background."""
    square = size * 0.22
    gap = size * 0.08
    start = (size - 2 * square - gap) / 2
    edges = [(start, start + square), (start + square + gap, start + 2 * square + gap)]

    def inside(v):
        return any(a <= v < b for a, b in edges)

    return [[SQUARE if inside(x + 0.5) and inside(y + 0.5) else BACKGROUND for x in range(size)]
            for y in range(size)]


def png(rows):
    def chunk(kind, data):
        body = kind + data
        return struct.pack('>I', len(data)) + body + struct.pack('>I', zlib.crc32(body) & 0xffffffff)

    height, width = len(rows), len(rows[0])
    raw = b''.join(b'\x00' + bytes(c for pixel in row for c in pixel) for row in rows)
    header = struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)
    return (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', header) + chunk(b'IDAT', zlib.compress(raw, 9))
            + chunk(b'IEND', b''))


if __name__ == '__main__':
    for name, size in (('icon.png', 80), ('largeIcon.png', 130)):
        with open(os.path.join(APP, name), 'wb') as f:
            f.write(png(pixels(size)))
        print('Wrote app/%s (%dx%d)' % (name, size, size))
