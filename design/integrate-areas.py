from pathlib import Path
p=Path("public/manual.html")
s=p.read_text(encoding="utf-8")
nav='<nav class="lm-crossnav" aria-label="Áreas da identidade"><a href="/manual.html" aria-current="page">01 / Símbolos</a><a href="/tipografia.html">02 / Tipografia</a><a href="/cores.html">03 / Cores</a></nav>'
style='<style>.lm-crossnav{display:flex;justify-content:flex-end;gap:clamp(14px,3vw,40px);padding:14px clamp(22px,4vw,62px);background:#f7f6f2;border-bottom:1px solid #c9c8c2;font:300 11px/1.4 Arial,sans-serif;letter-spacing:.04em}.lm-crossnav a{color:#181818;text-decoration:none}.lm-crossnav a[aria-current=page]{text-decoration:underline;text-underline-offset:5px}.lm-crossnav a:hover{text-decoration:underline}@media(max-width:620px){.lm-crossnav{justify-content:space-between;gap:8px;font-size:10px}}</style>'
assert '<body>' in s and '</head>' in s and '<header class="top">' in s
s=s.replace('</head>',style+'</head>',1)
pos=s.find('</header>')
assert pos!=-1
s=s[:pos+len('</header>')]+nav+s[pos+len('</header>'):]
p.write_text(s,encoding="utf-8")
for filename in ("tipografia.html","cores.html"):
 assert Path("public",filename).exists()
print("All three areas linked.")
