import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('content/articles.json', 'utf8'));
const articles = manifest.articles.filter(article => article.section === 'fundamentals');

const definitions = [
  {id:'food-pairing', name:'Wine and food', description:'Learn the principles of pairing, then find practical matches for ingredients, dishes and cuisines.', start:'how-wine-pairing-works', pattern:/food-pairing|^wine-and-|^wine-with-|^umami-and-wine$/},
  {id:'storage-and-cellaring', name:'Storage and cellaring', description:'Keep bottles sound, understand ageing and know when a wine is ready to drink.', start:'how-to-cellar-wine', pattern:/stor|cellar|ageworthy|improve-with-age|ready-to-drink|opened-|last-after-opening|vibration|pack-wine|transport-wine|keep-sparkling|when-to-drink/},
  {id:'serving-wine', name:'Serving wine', description:'Chill, open, aerate, decant, pour and choose glassware with confidence.', start:'wine-serving-temperature-explained', pattern:/chill|breathe|aerat|decanter|decant-wine|pour|wine-glass|corkscrew|open-sparkling|remove-a-broken-cork|remove-wine-sediment|serve-|serving-temperature/},
  {id:'faults-and-wine-care', name:'Faults and wine care', description:'Recognise common wine faults, damage and harmless bottle deposits—and know what to do next.', start:'what-is-cork-taint', pattern:/crystals|go-off|still-drinkable|heat-damage|light-damage|lightstrike|corked|cork-taint|brettanomyces|oxidation|reduction|mouse-taint|volatile-acidity|refermentation|sediment|frozen/},
  {id:'tasting-and-describing', name:'Tasting and describing', description:'Build a useful tasting method and understand aroma, flavour, texture, structure and balance.', start:'how-to-taste-wine', pattern:/tast|aroma|flavour|mouthfeel|texture|astringency|tannins|acidity|balance|complexity|concentration|freshness|fruitiness|minerality|ripeness|wine-body|wine-finish|wine-structure|wine-elegance|wine-power|typicity|closed-wine|flabby-wine|hot-wine|jammy-wine|wine-legs|describing-wine|vocabulary|develop-your-palate|wine-preferences|sweetness-in-wine|remember-wines/},
  {id:'choosing-and-buying', name:'Choosing and buying', description:'Choose bottles for real situations, assess value and navigate shops, lists, scores and marketing.', start:'how-to-choose-an-everyday-red-wine', pattern:/^how-to-choose|^how-to-buy|mixed-wine-case|spend-on-wine|compare-wine-value|wine-prices|expensive-wine|restaurant-wine-markups|order-wine|marketing|release-wine|private-label|subscriptions|scores|reviews|medals|awards|send-wine-back|start-a-wine-collection|track-wine|organise-a-wine-cellar/},
  {id:'labels-and-classifications', name:'Labels and classifications', description:'Decode origin, vintage, classifications and the terms producers place on bottles.', start:'how-to-read-a-wine-label', pattern:/label|classification|appellation|reserve|estate-grown|single-vineyard|single-varietal|vintage|old-world|protected-wine|field-blends|table-wine-meaning|cuvee-meaning|everyday-wine-meaning|fine-wine-meaning|cleanskin|canned-wine|cask-wine|screw-cap-vs-cork|aoc-and-aop|doc-and-docg|do-and-doca|pradikat-system/},
  {id:'wine-styles', name:'Wine styles', description:'Understand major red, white, rosé, sparkling, sweet and fortified styles and how they differ.', start:'red-wine-styles', pattern:/champagne|sparkling|prosecco|cava|cremant|corpinnat|pet-nat|port|sherry|madeira|fortified|icewine|dessert-wine|sweet-wine|late-harvest|botrytised|aromatic-white|crisp-dry|dry-rose|dry-wine|off-dry|full-bodied|medium-bodied|light-bodied|low-alcohol|no-alcohol|orange-wine|skin-contact|red-wine-styles|white-wine-styles|what-is-rose|sparkling-rose|douro-table-wine|moscato-dasti|tokaji-aszu|amontillado|fino-vs-manzanilla/},
  {id:'wine-culture-and-occasions', name:'Wine culture and occasions', description:'Handle restaurants, cellar doors, events, pronunciation and wine for social occasions without the theatre.', start:'wine-etiquette-at-restaurants', pattern:/cellar-door|competition|designated-driver|corkage|etiquette|festival|party|wedding|picnic|brunch|christmas|hot-weather|winter-meals|dinner-party|mixed-crowd|gift|restaurant|region-weekend|pronounce|sommelier|viticulturist|winemaker|judging|tasting-flight|host-a-blind|plan-a-wine-tasting/},
  {id:'wine-basics', name:'Wine basics', description:'Start with what wine is, how it differs and the core ideas behind style, quality and production.', start:'what-is-wine', pattern:/.*/}
];

const forced = new Map([
  ['cellar-door-etiquette-in-australia','wine-culture-and-occasions'],
  ['how-to-taste-wine-at-a-cellar-door','wine-culture-and-occasions'],
  ['reserve-wine-meaning','labels-and-classifications'],
  ['what-reserve-means-on-a-wine-label','labels-and-classifications'],
  ['how-wine-pairing-works','food-pairing'],
  ['wine-fridge-vs-ordinary-fridge','storage-and-cellaring'],
  ['how-long-wine-lasts-after-opening','storage-and-cellaring'],
  ['what-is-lightstrike-in-wine','faults-and-wine-care']
]);

const groups = definitions.map(({pattern, ...definition}) => ({...definition, slugs:[]}));
const byId = new Map(groups.map(group => [group.id, group]));
for (const article of articles) {
  const groupId = forced.get(article.slug) || definitions.find(definition => definition.pattern.test(article.slug)).id;
  byId.get(groupId).slugs.push(article.slug);
}
for (const group of groups) group.slugs.sort((left, right) => left.localeCompare(right, 'en-AU'));
const displayOrder = ['wine-basics','tasting-and-describing','choosing-and-buying','wine-styles','food-pairing','serving-wine','storage-and-cellaring','labels-and-classifications','faults-and-wine-care','wine-culture-and-occasions'];
groups.sort((left, right) => displayOrder.indexOf(left.id) - displayOrder.indexOf(right.id));
fs.writeFileSync('content/knowledge/fundamentals-navigation.json', `${JSON.stringify({version:1,evidence:'reviewed_fundamentals_taxonomy_2026_09',groups}, null, 2)}\n`);
console.log(groups.map(group => `${group.name}: ${group.slugs.length}`).join('\n'));
