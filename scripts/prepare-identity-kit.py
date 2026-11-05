from pathlib import Path
import hashlib,json,zipfile
root=Path(__file__).resolve().parent.parent
manifest=json.loads((root/'content/identity-fonts.json').read_text(encoding='utf-8'))
output=root/'public/identidade-kit';output.mkdir(parents=True,exist_ok=True)
(root/'public/fonts').mkdir(parents=True,exist_ok=True)
entries={}
for item in manifest['fonts']:
 data=(root/item['source']).read_bytes()
 assert hashlib.sha256(data).hexdigest()==item['sha256'], 'Fonte divergente: '+item['file']
 (root/'public/fonts'/item['file']).write_bytes(data)
 entries[item['file']]=data
entries['LEIA-ME.txt']=('LABMATTAR / FONTES VIGENTES\nUnivers LT Std 45 Light: estrutura, leitura e detalhes.\nPerpetua Titling MT Light: intervenções editoriais no título.\nAs variantes Bold e Condensed do acervo histórico não substituem estas fontes.\nOs arquivos deste pacote são idênticos aos usados no manual.\n').encode('utf-8')
with zipfile.ZipFile(output/'fontes-vigentes.zip','w',compression=zipfile.ZIP_DEFLATED) as archive:
 for name,data in entries.items():
  info=zipfile.ZipInfo(name,date_time=(2026,11,5,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED
  archive.writestr(info,data)
(output/'fontes.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print('LABMATTAR: duas fontes vigentes verificadas e pacote preparado.')
