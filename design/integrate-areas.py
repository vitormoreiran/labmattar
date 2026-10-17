from pathlib import Path
import re

NAV='''<nav class="lm-site-nav" aria-label="Sistemas da identidade LABMATTAR">
<a href="/manual.html" data-area="simbolos">01 / SÍMBOLOS</a>
<a href="/tipografia.html" data-area="tipografia">02 / TIPOGRAFIA</a>
<a href="/cores.html" data-area="cores">03 / CORES</a>
</nav>'''
STYLE='''<style>
.lm-site-nav{position:sticky;top:0;z-index:100;display:flex;align-items:center;justify-content:flex-end;gap:clamp(16px,3vw,48px);min-height:54px;padding:13px clamp(22px,4vw,62px);background:#f7f6f2;color:#181818;border-bottom:1px solid #c9c8c2;font:300 11px/1.5 UniversMattar,"Univers Mattar","Helvetica Neue",Arial,sans-serif;letter-spacing:.05em}
.lm-site-nav a{color:inherit;text-decoration:none;padding:4px 0;border-bottom:1px solid transparent;white-space:nowrap}
.lm-site-nav a[aria-current=page]{border-color:currentColor}
.lm-site-nav a:hover{text-decoration:underline;text-underline-offset:4px}
.lm-site-nav a:focus-visible{outline:2px solid currentColor;outline-offset:4px}
@media(max-width:600px){.lm-site-nav{justify-content:space-between;gap:10px;padding:10px 16px;font-size:10px}}
</style>'''
areas={"manual.html":"simbolos","tipografia.html":"tipografia","cores.html":"cores"}
for filename,area in areas.items():
 p=Path("public")/filename
 assert p.exists(),filename
 s=p.read_text(encoding="utf-8")
 # Remove the earlier exploratory cross-navigation and its styling.
 s=re.sub(r'<nav class="lm-crossnav"[^>]*>.*?</nav>',"",s,flags=re.S)
 s=re.sub(r'<style>\.lm-crossnav\{.*?</style>',"",s,flags=re.S)
 assert "</head>" in s and "<body>" in s
 s=s.replace("</head>",STYLE+"</head>",1)
 s=s.replace("<body>","<body>"+NAV.replace('data-area="'+area+'"','aria-current="page" data-area="'+area+'"'),1)
 p.write_text(s,encoding="utf-8")
 print(filename, "global navigation OK")
