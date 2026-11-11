export const previewURL='https://mattar-portfolio-previa.vitormoreiran.workers.dev/capitulo-2';
export function makePreview(state){
 const media=(p,f)=>f.startsWith('youtube/')?'https://i.ytimg.com/vi/'+f.slice(8)+'/hqdefault.jpg':'/media/'+[p.folder,...f.split('/')].map(encodeURIComponent).join('/');
 const slug=t=>t.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
 const active=state.projects.filter(p=>p.active!==false),names=[...new Set(active.map(p=>p.category))];
 const projects={},previewProjects=[],previewCategories=[],groups=[];let start=0;
 for(const name of names){const ps=active.filter(p=>p.category===name),id=slug(name);groups.push({id,title:name,projects:ps.map(p=>[p.id,p.title])});previewCategories.push({id,name,description:'',cover:ps[0].cover?media(ps[0],ps[0].cover):'',start,end:start+ps.length});start+=ps.length;
 for(const p of ps){const gallery=p.slides.filter(s=>s.included&&!s.missing&&!s.sync_error).map(s=>({url:media(p,s.display_file||s.file),type:s.type,caption:s.caption_official||'',alt:s.alt||p.title}));const sequence=p.cover_mode==='sequence'?p.slides.filter(s=>s.type==='image'&&(p.cover_sequence||[]).includes(s.file)).map(s=>media(p,s.display_file||s.file)):[];const cover=sequence[0]||(p.cover?media(p,p.cover):(gallery[0]?.url||''));projects[p.id]={title:p.title,year:p.year,summary:p.summary,body:p.body,cover,gallery,coverSequence:sequence,coverInterval:p.cover_interval||5};previewProjects.push({slug:p.id,title:p.title,year:p.year,description:p.summary,cover,coverSequence:sequence,coverInterval:p.cover_interval||5,images:gallery.map(x=>x.url)});}}
 return {revision:state.revision,content:{projects,previewProjects,previewCategories},groups};
}
