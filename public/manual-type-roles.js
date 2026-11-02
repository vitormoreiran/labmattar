/* Every visible text node in the five LABMATTAR manual areas is mapped
 * to one of three roles. This includes interactive editor labels and samples. */
(()=>{
 'use strict';
 const ROLE='data-lm-text-role';
 const SKIP='script,style,template,noscript,svg,math';
 const DETAIL='nav,header,footer,button,input,textarea,select,option,label,legend,summary,dt,small,time,code,kbd,output,[role="button"],[role="tab"],[role="option"],.eyebrow,.detail,.caption,.micro,.meta,.notice,.status,.warning,.mini,.state-heading,.state-endpoints,.seq-caption,.state-timeline,.lm-case-trace,.lm-case-kicker,.lm-case-footer,.lm-case-contrast-facts,.lm-case-number,.lm-lab-kicker,.lm-lab-bottom,.lm-lab-preview-head,.lm-lab-preview-foot,.lm-inspector-head,.lm-ctrl-meta,.lm-ctrl-name,.lm-ctrl-range-limits,.lm-case-facts b,.rule strong,.rule dt,.lm-case-aside .eyebrow,.demo-toolbar,.lm-site-nav,.lm-rules-index b,.lm-composition-vocabulary b';
 const TITLE='h1,h2,.type-title,.title,.big,.transform-rule,.artboard .headline,.lm-lab-title,.lm-case-reading h3,.lm-case-contrast h3,.lm-case-validation h3,.lm-lab-heading h2,.lm-motion-stage .type-title';
 const BODY='h3,h4,h5,h6,p,li,dd,blockquote,.copy,.body-sample,.explain,.state-help,.lm-lab-body,.lm-lab-lead,.lm-lab-legend,.notes p,.rule span,.lm-case-intro p,.lm-case-aside p,.lm-case-facts p,.lm-case-validation p,.lm-case-validation ul,.lm-case-reading p,.lm-case-contrast p,.lm-rules-index p,.lm-composition-vocabulary p';
 function roleFor(el){
  if(el.closest(DETAIL))return 'detail';
  if(el.closest(TITLE))return 'title';
  if(el.closest(BODY))return 'body';
  const t=(el.textContent||'').trim();
  return t.length>55?'body':'detail';
 }
 function annotate(el){
  if(!(el instanceof Element)||el.closest(SKIP))return;
  const role=roleFor(el);
  if(el.getAttribute(ROLE)!==role)el.setAttribute(ROLE,role);
 }
 function scan(node){
  if(node.nodeType===Node.TEXT_NODE){
   if(node.nodeValue&&node.nodeValue.trim())annotate(node.parentElement);
   return;
  }
  if(node.nodeType!==Node.ELEMENT_NODE)return;
  if(node.matches(SKIP))return;
  const titleContainers='h1,h2,h3,h4,h5,h6,.type-title,.title,.big,.lm-lab-title,.artboard .headline,.transform-rule,.lm-case-reading h3,.lm-case-contrast h3,.lm-case-validation h3';
  if(node.matches(titleContainers))annotate(node);
  node.querySelectorAll(titleContainers).forEach(annotate);
  const walker=document.createTreeWalker(node,NodeFilter.SHOW_TEXT);
  let text;
  while((text=walker.nextNode())){
   if(text.nodeValue&&text.nodeValue.trim())annotate(text.parentElement);
  }
 }
 function init(){
  scan(document.body);
  document.body.dataset.lmTypographyReady='true';
  const observer=new MutationObserver(mutations=>{
   for(const m of mutations){
    if(m.type==='characterData')scan(m.target);
    else if(m.type==='childList')for(const n of m.addedNodes)scan(n);
    else if(m.type==='attributes'&&m.target instanceof Element&&m.attributeName!=='data-lm-text-role')scan(m.target);
   }
  });
  observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','hidden','style','aria-hidden']});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
})();
