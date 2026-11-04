const expected=process.env.EXPECTED_SHA;if(!/^[a-f0-9]{40}$/.test(expected||''))throw Error('Revisão esperada ausente');
const origin='https://labmattar.com';
const release=await fetch(origin+'/laboratorio-release.json?revision='+expected,{cache:'no-store'});
if(!release.ok||(await release.json()).sha!==expected)throw Error('O domínio ainda não serve esta revisão');
for(const route of ['/','/capitulo-4/sesc','/capitulo-4/bradesco','/capitulo-4/simposio/','/compor.html','/motion.html']){
 const r=await fetch(origin+route,{redirect:'follow'});if(!r.ok||!r.headers.get('content-type')?.includes('text/html'))throw Error('Página indisponível: '+route+' ('+r.status+')');
 const html=await r.text();if(html.length<1000)throw Error('Página incompleta: '+route);
}
console.log('labmattar.com: revisão confirmada e páginas existentes disponíveis.');
