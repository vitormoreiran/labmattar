"""Inspect the real PDF: page sizes, text, embedded fonts and vector paths."""
import json
import re
import subprocess
import sys
from pathlib import Path
from pypdf import PdfReader

root = Path(sys.argv[1])
reader = PdfReader(root / 'labmattar-apresentacao.pdf')
assert len(reader.pages) == 4, 'Expected the complete four-page sequence'
sizes = [(1280, 720), (720, 1280), (900, 900), (1000, 707)]
titles = ['PÁGINA UM', 'PÁGINA DOIS', 'PÁGINA TRÊS', 'PÁGINA QUATRO']
report = {'pages': [], 'embeddedFonts': []}
for index, page in enumerate(reader.pages):
    width, height = sizes[index]
    assert abs(float(page.mediabox.width) - width * .75) < .02
    assert abs(float(page.mediabox.height) - height * .75) < .02
    text = re.sub(r'\s+', '', page.extract_text()).upper()
    assert titles[index].replace(' ', '') in text, (index, text)
    fonts = page['/Resources']['/Font']
    for reference in fonts.values():
        font = reference.get_object()
        if '/DescendantFonts' in font:
            font = font['/DescendantFonts'][0].get_object()
        descriptor = font.get('/FontDescriptor')
        assert descriptor, 'Missing official embedded font'
        descriptor = descriptor.get_object()
        assert '/FontFile2' in descriptor or '/FontFile3' in descriptor
        report['embeddedFonts'].append(str(font['/BaseFont']))
    contents = page.get_contents().get_data()
    if index == 2:
        assert re.search(rb'\s[-.0-9 ]+ c\s', contents), 'The official M must remain a vector path'
        assert not page['/Resources'].get('/XObject'), 'Pure vector page must not become a screenshot'
    report['pages'].append({'page': index + 1, 'widthPoints': float(page.mediabox.width),
                            'heightPoints': float(page.mediabox.height), 'selectableText': True})
report['embeddedFonts'] = sorted(set(report['embeddedFonts']))
subprocess.run(['pdftoppm', '-r', '96', '-png', str(root / 'labmattar-apresentacao.pdf'),
                str(root / 'pdf-page')], check=True)
(root / 'pdf-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
