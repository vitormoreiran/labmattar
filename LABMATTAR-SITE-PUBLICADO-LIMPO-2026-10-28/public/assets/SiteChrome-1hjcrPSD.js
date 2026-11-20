import {i as react,r as jsx} from './framework-CXnKph_e.js';
import {mountNavigation} from './navigation-shared.js';
const React=react(),runtime=jsx();
function SiteChrome(props){
 const controller=React.useRef(null);
 React.useEffect(()=>{controller.current=mountNavigation(props);return()=>{controller.current?.destroy();controller.current=null}},[props.currentChapter]);
 React.useEffect(()=>{controller.current?.update(props)},[props.activeProject,props.presentationLinks]);
 return runtime.jsxs('div',{'data-navigation-host':'shared',children:[runtime.jsx('link',{rel:'stylesheet',href:'/assets/navigation-shared.css'}),runtime.jsx('link',{rel:'stylesheet',href:'/assets/typography-system.css'})]});
}
export {SiteChrome as t};
