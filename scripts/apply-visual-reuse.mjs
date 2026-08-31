import fs from 'node:fs';
import path from 'node:path';

const root=path.resolve(new URL('..',import.meta.url).pathname);
const registry=await new Promise((resolve,reject)=>{let text='';process.stdin.setEncoding('utf8');process.stdin.on('data',chunk=>text+=chunk);process.stdin.on('end',()=>{try{resolve(JSON.parse(text))}catch(error){reject(error)}});});

const overrides=new Map([
  ['WD-1248','montepulciano-dabruzzo'],
  ['WD-1154','late-harvest-winemaking'],
  ['WD-1177','traditional-method-sparkling-wine-production']
  ,['WD-1296','european-wine-classifications']
]);

const normalise=value=>value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/&/g,'and').replace(/[^a-z0-9]+/g,' ').replace(/\b(?:what is|a beginners guide)\b/g,' ').replace(/\s+/g,' ').trim();
const sourceByTitle=new Map();
const sourceSlugs=new Set(fs.readdirSync(path.join(root,'article-source')).filter(name=>name.endsWith('.md')).map(name=>name.replace(/\.md$/,'')));
for(const file of fs.readdirSync(path.join(root,'article-source')).filter(name=>name.endsWith('.md'))){
  const source=fs.readFileSync(path.join(root,'article-source',file),'utf8');
  const title=source.match(/^#\s+(.+)$/m)?.[1];
  if(title) sourceByTitle.set(normalise(title),file.replace(/\.md$/,''));
}

function resolveSlug(item){
  if(item.slug) return item.slug;
  if(overrides.has(item.job_id)) return overrides.get(item.job_id);
  const direct=item.topic.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[’']/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  if(sourceSlugs.has(direct)) return direct;
  const exact=sourceByTitle.get(normalise(item.topic));
  if(exact) return exact;
  const needle=normalise(item.topic), candidates=[...sourceByTitle].filter(([title])=>title.includes(needle)||needle.includes(title)).sort((a,b)=>a[0].length-b[0].length);
  if(candidates.length) return candidates[0][1];
  throw new Error(`Cannot resolve article for ${item.job_id}: ${item.topic}`);
}

function isValid(item){
  const id=item.visual_id, topic=normalise(item.topic||'');
  if(id==='VIS-001') return !/grenache/.test(topic);
  if(id==='VIS-003') return /cabernet/.test(topic);
  if(id==='VIS-004') return /adelaide hills/.test(topic);
  if(id==='VIS-007') return /tasmania wine region/.test(topic);
  if(id==='VIS-010') return /zinfandel|primitivo/.test(topic);
  if(id==='VIS-013') return /seafood|oyster|rias baixas/.test(topic);
  if(id==='VIS-014') return /how wine is made|whole bunch|destemm|crush|carbonic|semi carbonic|whole berry/.test(topic);
  if(id==='VIS-015') return /hastings river/.test(topic);
  if(id==='VIS-018') return /murray darling/.test(topic);
  if(id==='VIS-019') return /pemberton/.test(topic);
  if(id==='VIS-020') return /peel wine region/.test(topic);
  if(id==='VIS-021') return !/dealcohol|low alcohol|no alcohol/.test(topic);
  return true;
}

const rejected=registry.filter(item=>!isValid(item));
const input=registry.filter(isValid).map(item=>({...item,slug:resolveSlug(item)}));

const headingTerms={
  'VIS-001':['taste','flavour','profile','cabernet'],
  'VIS-002':['sweet','dry','fruit','style'],
  'VIS-003':['vary','different','taste','style'],
  'VIS-005':['site','climate','geograph','region','vineyard'],
  'VIS-006':['label','region','geographic','classification','origin'],
  'VIS-008':['oxid','age','oxygen','maturation','freshness'],
  'VIS-009':['label','classification','name','appellation','protected'],
  'VIS-013':['seafood','food','pair'],
  'VIS-014':['whole-bunch','carbonic','ferment','destem'],
  'VIS-021':['ferment','alcohol','carbon dioxide','production'],
  'VIS-022':['colour','color','skin','rosé'],
  'VIS-023':['aroma','flavour','taste'],
  'VIS-026':['lees','stirring','ageing'],
  'VIS-033':['traditional','sparkling','method'],
  'VIS-035':['solera','ageing','sherry'],
  'VIS-042':['blend','field','ferment']
};

function cleanProductionLanguage(text){
  const paragraphs=text.split(/\n\n+/).map(paragraph=>{
    if(/<!--\s*VISUAL:VIS-\d{3}\s*-->/.test(paragraph)) return paragraph;
    if(!/VIS-\d{3}/.test(paragraph)) return paragraph;
    if(/^\s*(?:>|[-*])?\s*(?:\*{1,2})?(?:visual|registered visual|visual opportunity)/i.test(paragraph)) return '';
    let cleaned=paragraph
      .replace(/\[[^\]\n]*VIS-\d{3}[^\]\n]*\]/gi,'')
      .replace(/(?:^|(?<=[.!?]))\s*[^.!?\n]*VIS-\d{3}[^.!?\n]*(?:[.!?]|$)/gi,' ')
      .replace(/\s{2,}/g,' ')
      .trim();
    return /VIS-\d{3}/.test(cleaned)?'':cleaned;
  }).filter(Boolean);
  return paragraphs.join('\n\n').replace(/\n{3,}/g,'\n\n').trimEnd()+'\n';
}

function insertAfterLead(text,id){
  const marker=`<!-- VISUAL:${id} -->`;
  if(text.includes(marker)) return {text,inserted:false};
  const lines=text.split('\n');
  const terms=headingTerms[id]||[];
  let heading=-1;
  for(let i=0;i<lines.length;i++) if(/^##\s+/.test(lines[i])&&terms.some(term=>lines[i].toLowerCase().includes(term))){heading=i;break;}
  if(heading<0) heading=lines.findIndex(line=>/^##\s+Quick answer/i.test(line));
  if(heading<0) heading=lines.findIndex(line=>/^##\s+/.test(line));
  if(heading<0) throw new Error(`No section heading for ${id}`);
  let start=heading+1;while(start<lines.length&&!lines[start].trim())start++;
  let end=start;while(end<lines.length&&lines[end].trim()&&!/^##\s+/.test(lines[end]))end++;
  lines.splice(end,0,'',marker);
  return {text:lines.join('\n'),inserted:true};
}

const changed=new Set();
for(const item of input){
  const file=path.join(root,'article-source',`${item.slug}.md`);
  if(!fs.existsSync(file)) throw new Error(`Missing article source: ${item.slug}`);
  let text=fs.readFileSync(file,'utf8');
  const result=insertAfterLead(text,item.visual_id);
  text=result.text;
  if(result.inserted){fs.writeFileSync(file,text.endsWith('\n')?text:`${text}\n`);changed.add(item.slug);}
}

let cleaned=0;
for(const file of fs.readdirSync(path.join(root,'article-source')).filter(name=>name.endsWith('.md'))){
  const full=path.join(root,'article-source',file),before=fs.readFileSync(full,'utf8'),after=cleanProductionLanguage(before);
  if(after!==before){fs.writeFileSync(full,after);changed.add(file.replace(/\.md$/,''));cleaned++;}
}

const expected=new Set(input.map(item=>`${item.visual_id}|${item.slug}`)), actual=[];
for(const file of fs.readdirSync(path.join(root,'article-source')).filter(name=>name.endsWith('.md'))){
  const slug=file.replace(/\.md$/,''), source=fs.readFileSync(path.join(root,'article-source',file),'utf8');
  for(const match of source.matchAll(/<!--\s*VISUAL:(VIS-\d{3})\s*-->/g)) actual.push({visual_id:match[1],slug});
}
const extraMarkers=actual.filter(item=>!expected.has(`${item.visual_id}|${item.slug}`));
process.stdout.write(JSON.stringify({registry_rows:registry.length,requested:input.length,rejected:rejected.length,changed_articles:changed.size,cleaned_articles:cleaned,marker_count:actual.length,extra_markers:extraMarkers,rejected_pairs:rejected.map(({visual_id,job_id})=>({visual_id,job_id})),slugs:[...changed].sort()},null,2));
