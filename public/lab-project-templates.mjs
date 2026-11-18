import {createPage,createSection,sectionState,sequenceDocument} from './lab-sequence.mjs';

const noSignature={
  preset:'none',scale:100,
  slots:Object.fromEntries(['tl','tr','bl','br'].map(corner=>[corner,{kind:'none',text:'',symbol:'M.svg'}]))
};

export function createTemplateProject(id,{state,photoCatalog},uid,socialFormat='quadrado'){
  const base={
    ...state,format:'horizontal',margin:7,guides:'nenhuma',textWidth:65,
    titleScale:85,type:'univers',textPositionY:50,
    background:'color',color:'white',inkColor:'auto',autoInkVersion:2,
    photo:Object.keys(photoCatalog)[0],photoEffect:'auto',photoContrast:20,
    photoBlur:50,photoGlass:50,focusX:50,focusY:50,
    mContent:'off',mPresentation:'elemento',mScale:60,mPositionY:50,
    mExpandedPositionY:50,mCaption:'',marker:'none',markerFocus:'blur',symbol:'none',
    title:'',titleFonts:[],body:'',bodyMode:'visivel',kicker:'',footerLeft:'',footerRight:''
  };
  const signature=id==='formal'?{
    ...noSignature,preset:'custom',
    slots:{...noSignature.slots,bl:{kind:'text',text:'LABMATTAR',symbol:'M.svg'}}
  }:noSignature;
  base.signature=signature;
  const pages=[],sections=[];
  function addPage(name,overrides={},section=null){
    const settings={...base,...overrides};
    const page=createPage({id:uid('page'),name,state:section?sectionState(settings,section):settings,photoCatalog});
    if(section)page.sectionId=section.id;
    pages.push(page);
  }
  function addSection(name,settings={}){
    const section=createSection(uid('section'),name,{...base,...settings},photoCatalog);
    sections.push(section);
    return section;
  }

  let name;
  switch(id){
    case 'essential':
      name='Apresentação essencial';
      addPage('Abertura',{inkColor:'red',titleScale:100,bodyMode:'oculto'});
      addPage('Conteúdo',{titleScale:70});
      break;
    case 'editorial': {
      name='Apresentação editorial';
      const intro=addSection('Abertura',{color:'black'});
      addPage('Capa',{type:'alternada',titleScale:100,bodyMode:'oculto'},intro);
      addPage('Introdução',{type:'alternada',titleScale:75},intro);
      const area=addSection('Área de conteúdo');
      addPage('Texto',{type:'alternada',titleScale:75},area);
      addPage('Galeria',{bodyMode:'oculto'},area);
      break;
    }
    case 'formal':
      name='Documento formal';
      addPage('Documento',{format:'a4',margin:10,textWidth:100,titleScale:70,textPositionY:0});
      break;
    case 'social':
      if(!['quadrado','vertical'].includes(socialFormat))throw Error('Escolha um formato para a peça.');
      name=socialFormat==='vertical'?'Story':'Post';
      addPage(name,{format:socialFormat,color:'black',margin:10,textWidth:90,titleScale:80,bodyMode:'oculto'});
      break;
    case 'blank':
      name='Novo projeto';
      addPage('Página 1',{bodyMode:'oculto'});
      break;
    default:
      throw Error('Modelo de projeto não reconhecido.');
  }
  return sequenceDocument(name,pages,sections.length?sections:null,signature);
}
