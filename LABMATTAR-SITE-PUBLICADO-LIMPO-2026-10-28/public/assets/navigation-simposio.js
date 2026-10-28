import {mountNavigation} from './navigation-shared.js';
let navigation=mountNavigation({currentChapter:4});
document.querySelector('.page-nav')?.addEventListener('click',event=>{
 const link=event.target.closest('a[href^="#"]');
 if(link&&navigation.navigate(decodeURIComponent(link.hash.slice(1))))event.preventDefault();
});
window.addEventListener('pagehide',()=>navigation.destroy());
window.addEventListener('pageshow',event=>{if(event.persisted)navigation=mountNavigation({currentChapter:4})});
