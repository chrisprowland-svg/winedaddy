import fs from 'node:fs';

const source = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const specs = {
  ITA: {id:'ITA', bounds:[6,36,19,48]},
  GEO: {id:'GEO', bounds:[39,40,47,44]},
  FRA: {id:'FRA', bounds:[-6,41,10,52]},
  NZL: {id:'NZL', bounds:[165,-48,179,-33]},
  ESP: {id:'ESP', bounds:[-10,35,5,44]},
  PRT: {id:'PRT', bounds:[-10,36,0,43]}
};

const inside = ([lon,lat], [minLon,minLat,maxLon,maxLat]) => lon >= minLon && lon <= maxLon && lat >= minLat && lat <= maxLat;
const ringsOf = geometry => geometry.type === 'Polygon' ? geometry.coordinates : geometry.coordinates.flat();
const output = {};

for (const [key,spec] of Object.entries(specs)) {
  const feature = source.features.find(item => item.properties.ADM0_A3 === spec.id);
  if (!feature) throw new Error(`Missing ${spec.id}`);
  const rings = ringsOf(feature.geometry).filter(ring => ring.some(point => inside(point,spec.bounds)));
  const points = rings.flat().filter(point => inside(point,spec.bounds));
  const minLon=Math.min(...points.map(p=>p[0])), maxLon=Math.max(...points.map(p=>p[0]));
  const minLat=Math.min(...points.map(p=>p[1])), maxLat=Math.max(...points.map(p=>p[1]));
  const width=440,height=320,pad=12;
  const scale=Math.min((width-pad*2)/(maxLon-minLon),(height-pad*2)/(maxLat-minLat));
  const drawnW=(maxLon-minLon)*scale,drawnH=(maxLat-minLat)*scale;
  const ox=(width-drawnW)/2,oy=(height-drawnH)/2;
  const project=([lon,lat]) => [ox+(lon-minLon)*scale,oy+(maxLat-lat)*scale];
  const paths=rings.map(ring => ring.filter(point=>inside(point,spec.bounds)).map((point,index)=>`${index?'L':'M'}${project(point)[0].toFixed(1)} ${project(point)[1].toFixed(1)}`).join(' ')+' Z').filter(path=>path.length>10);
  output[key]={bbox:[minLon,minLat,maxLon,maxLat],paths};
}

// Portugal is more legible in its Iberian context than as an isolated narrow shape.
{
  const bounds=[-10,35,5,44];
  const features={ESP:source.features.find(item=>item.properties.ADM0_A3==='ESP'),PRT:source.features.find(item=>item.properties.ADM0_A3==='PRT')};
  const allRings=Object.fromEntries(Object.entries(features).map(([key,feature])=>[key,ringsOf(feature.geometry).filter(ring=>ring.some(point=>inside(point,bounds)))]));
  const points=Object.values(allRings).flat(2).filter(point=>inside(point,bounds));
  const minLon=Math.min(...points.map(p=>p[0])),maxLon=Math.max(...points.map(p=>p[0])),minLat=Math.min(...points.map(p=>p[1])),maxLat=Math.max(...points.map(p=>p[1]));
  const width=440,height=320,pad=12,scale=Math.min((width-pad*2)/(maxLon-minLon),(height-pad*2)/(maxLat-minLat));
  const ox=(width-(maxLon-minLon)*scale)/2,oy=(height-(maxLat-minLat)*scale)/2;
  const project=([lon,lat])=>[ox+(lon-minLon)*scale,oy+(maxLat-lat)*scale];
  const convert=rings=>rings.map(ring=>ring.filter(point=>inside(point,bounds)).map((point,index)=>`${index?'L':'M'}${project(point)[0].toFixed(1)} ${project(point)[1].toFixed(1)}`).join(' ')+' Z').filter(path=>path.length>10);
  output.IBERIA={bbox:[minLon,minLat,maxLon,maxLat],paths:convert(allRings.ESP),highlightPaths:convert(allRings.PRT)};
}

fs.writeFileSync(new URL('../site/international-map-data.mjs',import.meta.url),`// Generated from Natural Earth 1:50m Admin 0 Countries (public domain).\nexport const internationalMapData = ${JSON.stringify(output,null,2)};\n`);
