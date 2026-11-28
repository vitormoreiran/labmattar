const prefix = '/mesa-media/';
const safeKey = /^(?:[\w.-]+\/)+[\w.-]+\.(?:jpe?g|png|webp|avif|mp4|webm)$/i;

function validKey(key) {
  return typeof key === 'string' && key.length <= 256 && safeKey.test(key) && !key.includes('..') && !key.split('/').includes('.');
}

export function assetURL(key) {
  if (!validKey(key)) throw Error('Referência inválida no acervo da Mesa.');
  return prefix+key;
}

export function mesaPhotoKey(uri) {
  if (typeof uri !== 'string' || !uri.startsWith(prefix)) return null;
  const key = uri.slice(prefix.length);
  if (!validKey(key) || !/\.(?:jpe?g|png|webp|avif)$/i.test(key)) return null;
  const hash = Array.from(key).reduce((n,char) => (n*33+char.charCodeAt(0))>>>0,5381);
  return 'ext-mesa'+hash.toString(36);
}

export function portfolioAssetKey(project,slide) {
  return slide.asset_key ?? project.folder+'/'+(slide.display_file || slide.file);
}
