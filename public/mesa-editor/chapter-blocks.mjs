export const languages = ['pt','en','es'];
export const blockLimit = 12;
export const maximumGap = 192;
export const textByLanguage = () => ({pt:'',en:'',es:''});

export function newBlock(type) {
  return {id:'bloco-'+crypto.randomUUID(),type,space:28,copy:textByLanguage()};
}

export function upgradeChapter(sections) {
  for (const section of sections) {
    if (!section.id.startsWith('trecho-') || Array.isArray(section.blocks)) continue;
    section.spacing = {before:0,after:0};
    section.blocks = [];
    const count = Math.max(...languages.map(code => section[code].body.length));
    for (let index = 0; index < count; index++) {
      const block = newBlock('text');
      for (const code of languages) block.copy[code] = section[code].body[index] ?? '';
      if (Object.values(block.copy).some(value => value.trim())) section.blocks.push(block);
    }
    for (const code of languages) section[code].body = [''];
  }
  return sections;
}
