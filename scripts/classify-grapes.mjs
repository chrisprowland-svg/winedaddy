import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'content/articles.json'), 'utf8'));
const grapes = manifest.articles.filter(article => article.section === 'grapes');

const classics = [
  'what-is-cabernet-sauvignon', 'what-is-chardonnay', 'what-is-pinot-noir',
  'what-is-riesling', 'what-is-sauvignon-blanc', 'what-is-shiraz'
];

const redProfiles = new Set([
  'agiorgitiko','what-is-aglianico','what-is-alicante-bouschet','barbera','what-is-blaufrankisch',
  'what-is-bonarda','what-is-brachetto','cabernet-franc','carignan','carmenere','what-is-cesanese','cinsault','corvina',
  'what-is-counoise','dolcetto','what-is-duras','durif','what-is-fer-servadou','what-is-frappato',
  'gamay','what-is-grenache','lagrein','what-is-listan-negro','malbec','mataro-mourvedre',
  'what-is-mavrodaphne','what-is-mazuelo','mencia','what-is-merlot','what-is-mondeuse',
  'what-is-monica','montepulciano','what-is-nebbiolo','what-is-negroamaro','what-is-nerello-mascalese',
  'nero-davola','what-is-pais','what-is-pallagrello-nero','petit-verdot','petite-sirah',
  'pinot-meunier','what-is-poulsard','what-is-refosco',
  'what-is-rossese','what-is-ruche','sagrantino','what-is-sangiovese','what-is-saperavi',
  'what-is-schiava','tannat','what-is-tempranillo','what-is-teroldego','what-is-tinta-barroca',
  'what-is-tintilia','touriga-nacional','what-is-trepat','what-is-trousseau','what-is-vinhao',
  'xinomavro','zinfandel-primitivo','zweigelt'
]);

const whiteProfiles = new Set([
  'albarino','aligote','what-is-arinto','arneis','assyrtiko','what-is-baga','what-is-bourboulenc',
  'what-is-carricante','what-is-catarratto','chenin-blanc','what-is-cortese','what-is-encruzado',
  'what-is-falanghina','fiano','furmint','garganega','gewurztraminer','glera','what-is-godello',
  'what-is-greco','what-is-grillo','gruner-veltliner','what-is-hondarrabi-zuri','what-is-inzolia',
  'what-is-jacquere','what-is-kerner','what-is-loureiro','what-is-malvasia','marsanne',
  'melon-de-bourgogne','moscato-muscat','what-is-nosiola','what-is-pecorino-wine-grape',
  'what-is-picolit','picpoul','pinot-blanc','what-is-pinot-gris-pinot-grigio','what-is-prie-blanc','what-is-rabigato',
  'what-is-ribolla-gialla','what-is-roditis','what-is-romorantin','what-is-rotgipfler','roussanne',
  'savagnin','semillon','what-is-susumaniello','what-is-sylvaner','what-is-timorasso','torrontes',
  'trebbiano','what-is-verdejo','verdelho','verdicchio','vermentino','viognier','what-is-xarel-lo',
  'what-is-zibibbo','what-is-zierfandler'
]);

const comparison = grapes.filter(article => article.slug.includes('-vs-')).map(article => article.slug);
comparison.push('chablis-and-chardonnay-what-is-the-relationship');
const australia = grapes.filter(article => article.slug.endsWith('-in-australia')).map(article => article.slug);
const specialist = ['madeira-grape-varieties'];
const used = new Set([...classics, ...comparison, ...australia, ...specialist, ...redProfiles, ...whiteProfiles]);
const missing = grapes.filter(article => !used.has(article.slug));
const duplicates = [...used].filter(slug => [classics, comparison, australia, specialist, [...redProfiles], [...whiteProfiles]].filter(items => items.includes(slug)).length !== 1);
if (missing.length || duplicates.length || used.size !== grapes.length) {
  throw new Error(`Grape taxonomy mismatch. Missing: ${missing.map(article => article.slug).join(', ') || 'none'}. Duplicates: ${duplicates.join(', ') || 'none'}.`);
}

const groups = [
  {id:'classic-grapes',name:'Classic grapes',description:'Begin with six reference varieties that explain many of the styles readers encounter most often.',start:'what-is-pinot-noir',slugs:classics},
  {id:'red-grape-varieties',name:'Red grape varieties',description:'Explore red and dark-skinned varieties, from familiar international grapes to distinctive local specialities.',start:'what-is-grenache',slugs:[...redProfiles]},
  {id:'white-grape-varieties',name:'White grape varieties',description:'Explore white-skinned varieties, including crisp, aromatic, textured and age-worthy grapes.',start:'chenin-blanc',slugs:[...whiteProfiles]},
  {id:'grapes-in-australia',name:'Grapes in Australia',description:'See how Australian regions, climates and winemaking choices shape major and emerging varieties.',start:'shiraz-in-australia',slugs:australia},
  {id:'compare-grapes',name:'Compare grapes and styles',description:'Understand commonly confused varieties, shared names and contrasting styles side by side.',start:'syrah-vs-shiraz',slugs:comparison},
  {id:'specialist-grape-guides',name:'Specialist grape guides',description:'Explore multi-variety traditions and grape selections that belong to a particular wine style.',start:'madeira-grape-varieties',slugs:specialist}
].map(group => ({...group, slugs:[...group.slugs].sort()}));

const aliases = [
  {canonicalSlug:'what-is-shiraz',canonicalName:'Shiraz / Syrah',aliases:['Shiraz','Syrah'],relatedSlugs:['syrah-vs-shiraz']},
  {canonicalSlug:'what-is-pinot-gris-pinot-grigio',canonicalName:'Pinot Gris / Pinot Grigio',aliases:['Pinot Gris','Pinot Grigio'],relatedSlugs:['pinot-gris-vs-pinot-grigio']},
  {canonicalSlug:'mataro-mourvedre',canonicalName:'Mataro / Mourvèdre',aliases:['Mataro','Mourvèdre','Monastrell'],relatedSlugs:[]},
  {canonicalSlug:'zinfandel-primitivo',canonicalName:'Zinfandel / Primitivo',aliases:['Zinfandel','Primitivo'],relatedSlugs:[]},
  {canonicalSlug:'moscato-muscat',canonicalName:'Moscato / Muscat',aliases:['Moscato','Muscat'],relatedSlugs:[]},
  {canonicalSlug:'durif',canonicalName:'Durif / Petite Sirah',aliases:['Durif','Petite Sirah'],relatedSlugs:['petite-sirah']}
];

const facets = {
  pinkSkinned:['gewurztraminer','what-is-pinot-gris-pinot-grigio'],
  aromatic:['albarino','assyrtiko','gewurztraminer','gruner-veltliner','moscato-muscat','what-is-riesling','torrontes','viognier'],
  sparkling:['glera','pinot-meunier','what-is-chardonnay','what-is-pinot-noir','what-is-riesling','what-is-xarel-lo'],
  fortified:['madeira-grape-varieties','moscato-muscat','what-is-mavrodaphne','what-is-tinta-barroca','touriga-nacional'],
  blendingFamilies:[
    {id:'bordeaux',name:'Bordeaux family',slugs:['cabernet-franc','malbec','petit-verdot','what-is-cabernet-sauvignon','what-is-merlot']},
    {id:'rhone',name:'Rhône family',slugs:['cinsault','marsanne','mataro-mourvedre','roussanne','viognier','what-is-bourboulenc','what-is-counoise','what-is-grenache','what-is-shiraz']},
    {id:'champagne',name:'Champagne family',slugs:['pinot-meunier','what-is-chardonnay','what-is-pinot-noir']},
    {id:'port',name:'Port family',slugs:['what-is-tinta-barroca','touriga-nacional']}
  ]
};
for (const [facet, entries] of Object.entries(facets)) {
  const slugs = facet === 'blendingFamilies' ? entries.flatMap(entry => entry.slugs) : entries;
  const unknown = slugs.filter(slug => !used.has(slug));
  if (unknown.length) throw new Error(`Unknown slugs in ${facet}: ${unknown.join(', ')}`);
}
const output = {version:1,evidence:'reviewed_grape_taxonomy_2026_09',groups,aliases,facets};
fs.writeFileSync(path.join(root, 'content/knowledge/grape-navigation.json'), `${JSON.stringify(output, null, 2)}\n`);
console.log(`Classified ${grapes.length} grape guides into ${groups.length} pathways with ${aliases.length} governed alias sets.`);
