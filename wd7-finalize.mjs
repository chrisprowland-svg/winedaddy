import fs from 'node:fs';
import path from 'node:path';

const exists = route => route === '/'
  ? fs.existsSync('index.html')
  : /\.[a-z]+$/i.test(route)
    ? fs.existsSync(route.slice(1))
    : fs.existsSync(path.join(route.slice(1), 'index.html'));

for (const file of fs.readdirSync('.wd7/results').filter(name => name.endsWith('.json'))) {
  const result = JSON.parse(fs.readFileSync(path.join('.wd7/results', file), 'utf8'));
  const outputPath = result.output_path || path.join(result.slug, 'index.html');
  if (!fs.existsSync(outputPath)) continue;
  let html = fs.readFileSync(outputPath, 'utf8');
  html = html.replace(/<a href="(\/[^"#?]+)[^"]*">([\s\S]*?)<\/a>/g, (full, route, label) => exists(route) ? full : label);
  fs.writeFileSync(outputPath, html);
}
