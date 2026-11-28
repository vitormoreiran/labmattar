export const models = [
  {
    id:'abertura', group:'Páginas', name:'Página de abertura', format:'horizontal', formatLabel:'Horizontal',
    pages:[{name:'Abertura',title:'Título da apresentação',color:'black',ink:'white',scale:84}],
  },
  {
    id:'leitura', group:'Páginas', name:'Página de leitura', format:'editorial', formatLabel:'Editorial',
    pages:[{name:'Leitura',title:'Título da página',body:'Escreva aqui o texto da página.',color:'neutral',ink:'black'}],
  },
  {
    id:'proposta', group:'Documentos', name:'Proposta', format:'editorial', formatLabel:'Editorial',
    pages:[
      {name:'Capa',title:'Proposta',color:'beige',ink:'black',scale:73},
      {name:'Contexto e escopo',title:'Contexto e escopo',body:'Descreva o projeto, seus objetivos e o que está previsto.'},
      {name:'Entregas e próximos passos',title:'Entregas e\npróximos passos',body:'Liste as entregas, as etapas do trabalho e os próximos passos.'},
    ],
  },
  {
    id:'documento-editorial', group:'Documentos', name:'Documento editorial', format:'editorial', formatLabel:'Editorial',
    pages:[
      {name:'Capa',title:'Documento editorial',color:'black',ink:'white',scale:73},
      {name:'Desenvolvimento',title:'Desenvolvimento',body:'Desenvolva o texto principal do documento.'},
      {name:'Créditos',title:'Créditos',body:'Registre autoria, colaboração e referências.'},
    ],
  },
];

export const findModel = id => models.find(model => model.id === id);
