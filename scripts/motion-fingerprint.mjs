import {createHash} from 'node:crypto';
import {sanitizeProject} from '../tools/matriz-vetorial/src/timeline.mjs';
export function fingerprint(project){
  return createHash('sha256').update(JSON.stringify(sanitizeProject(project),(key,value)=>key==='id'?undefined:value)).digest('hex');
}
