import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
const result = await build({entryPoints:['src/index.ts'],bundle:true,format:'iife',globalName:'RPS',write:false,target:'es2020',jsxFactory:'React.createElement',jsxFragment:'React.Fragment',legalComments:'inline',minify:false});
// Revenge Classic expects an expression, not a script with top-level declarations.
const code = `(()=>{${result.outputFiles[0].text}\nreturn RPS.default;})()`;
await mkdir('dist',{recursive:true});
await writeFile('dist/index.js',code);
await writeFile('dist/manifest.json',JSON.stringify({name:'Rich Presence Studio',description:'Кастомные карточки и перенос профилей с ПК. Revenge Classic. Без музыки.',authors:[{name:'Eltan'}],main:'index.js',hash:createHash('sha256').update(code).digest('hex'),vendetta:{icon:'ic_activity_status_24px'}},null,2));
console.log('Built Revenge Classic plugin (manifest.json + index.js).');
