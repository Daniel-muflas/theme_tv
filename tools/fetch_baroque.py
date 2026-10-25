#!/usr/bin/env python3
"""Writes app/baroque.js: the 100 best-known Baroque paintings, for the art wallpaper.

    python3 tools/fetch_baroque.py

"Best known" is the number of Wikipedias with an article on the painting (Wikidata sitelinks). A painting
counts as Baroque when it, or its painter, belongs to a Baroque movement and it was made from 1590 to 1760.
Every image is on Wikimedia Commons, where these works are public domain; the TV loads them from there.
Python 3 standard library only.
"""
import json
import os
import re
import urllib.parse
import urllib.request

OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'app', 'baroque.js')
COUNT = 100

# Baroque, Baroque painting, Spanish Baroque painting, Dutch Golden Age painting, Caravaggisti,
# Utrecht Caravaggism, Flemish Baroque painting
MOVEMENTS = 'wd:Q37853 wd:Q808561 wd:Q6076358 wd:Q2352880 wd:Q62506 wd:Q1628039 wd:Q1994273'

# Corrections to Wikidata, by item: wrong or vandalized titles, a wrong year or painter (for works with
# several painters, the master), and entries that are no Baroque masterpiece
FIXES = {
    'Q512755': {'title': {'es': 'El retorno del hijo pródigo', 'en': 'The Return of the Prodigal Son'}},
    'Q597114': {'title': {'es': 'La muerte de la Virgen', 'en': 'Death of the Virgin'}},
    'Q746716': {'title': {'es': 'Narciso', 'en': 'Narcissus'}},
    'Q614047': {'title': {'es': 'Muchacha con sombrero rojo', 'en': 'Girl with a Red Hat'}},
    'Q2667782': {'title': {'es': 'El descendimiento de la cruz', 'en': 'The Descent from the Cross'}},
    'Q2715177': {'title': {'es': 'San Jerónimo', 'en': 'Saint Jerome'}},
    'Q1240092': {'year': 1650},
    'Q644936': {'artist': 'Peter Paul Rubens'},
    'Q782639': {'artist': 'Johannes Vermeer'},
    'Q472799': {'skip': True},
}

# The inner query finds and ranks the paintings without labels (labels for every candidate time it out);
# it starts from the movements' painters, a small set, rather than from every painting.
QUERY = """
SELECT ?item ?titleEs ?titleEn ?creatorLabel ?image ?links ?made WHERE {
  {
    SELECT ?item ?creator (SAMPLE(?img) AS ?image) (MAX(?sitelinks) AS ?links) (MIN(?year) AS ?made) WHERE {
      VALUES ?movement { %s }
      { ?creator wdt:P135 ?movement. ?item wdt:P170 ?creator. }
      UNION
      { ?item wdt:P135 ?movement; wdt:P170 ?creator. }
      ?item wdt:P31 wd:Q3305213; wdt:P18 ?img; wikibase:sitelinks ?sitelinks; wdt:P571 ?inception.
      BIND(YEAR(?inception) AS ?year)
      FILTER(?year >= 1590 && ?year <= 1760)
    }
    GROUP BY ?item ?creator
    ORDER BY DESC(?links)
    LIMIT 400
  }
  OPTIONAL { ?item rdfs:label ?titleEs. FILTER(LANG(?titleEs) = "es") }
  OPTIONAL { ?item rdfs:label ?titleEn. FILTER(LANG(?titleEn) = "en") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,es". ?creator rdfs:label ?creatorLabel. }
}
ORDER BY DESC(?links)
""" % MOVEMENTS


def fetch():
    url = 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': QUERY})
    request = urllib.request.Request(url, headers={
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'theme_tv/1.0 (personal TV home screen)'})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)['results']['bindings']


def plain(title):
    """The title without Wikipedia's disambiguation: "Susana y los viejos (Gentileschi, Pommersfelden)"."""
    return re.sub(r'\s*\([^)]*\)$', '', title)


def paintings(rows):
    """The first COUNT paintings, once each (one entry per item, title and painter, and image), corrected."""
    seen = set()
    out = []
    for row in rows:
        item = row['item']['value'].rsplit('/', 1)[-1]
        title_en = row.get('titleEn', {}).get('value')
        if not title_en or item in seen:
            continue
        title_es = row.get('titleEs', {}).get('value') or title_en
        work = {'title': {'es': plain(title_es), 'en': plain(title_en)},
                'artist': row['creatorLabel']['value'], 'year': int(row['made']['value']),
                'file': urllib.parse.unquote(row['image']['value'].rsplit('/', 1)[-1])}
        work.update(FIXES.get(item, {}))
        seen.add(item)
        same = (work['title']['en'].lower(), work['artist'].lower())
        if work.pop('skip', False) or same in seen or work['file'] in seen:
            continue
        seen.update([same, work['file']])
        out.append(work)
        if len(out) == COUNT:
            break
    return out


if __name__ == '__main__':
    works = paintings(fetch())
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// The art wallpaper\'s paintings, written by tools/fetch_baroque.py (Wikidata, Wikimedia Commons).\n')
        f.write('window.BAROQUE = ' + json.dumps(works, ensure_ascii=False, indent=1) + ';\n')
    print('Wrote app/baroque.js: %d paintings' % len(works))
