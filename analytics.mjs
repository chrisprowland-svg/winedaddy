import fs from 'node:fs';
import path from 'node:path';

const googleId = 'G-M281DG8YTP';
const metaId = '1085436810811087';
const checkOnly = process.argv.includes('--check');

const analyticsHead = `<!-- Google tag (gtag.js) --><script async src="https://www.googletagmanager.com/gtag/js?id=${googleId}"></script><script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${googleId}');</script><!-- Meta Pixel Code --><script>!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${metaId}');fbq('track','PageView');</script><!-- End Meta Pixel Code -->`;
const metaNoScript = `<noscript><img height="1" width="1" style="display:none" src="https://www.facebook.com/tr?id=${metaId}&amp;ev=PageView&amp;noscript=1" alt=""></noscript>`;

function htmlFiles(directory = '.') {
  return fs.readdirSync(directory, {withFileTypes: true}).flatMap(entry => {
    if (entry.name === '.git' || entry.name === 'node_modules') return [];
    const target = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(target) : entry.name.endsWith('.html') ? [target] : [];
  });
}

const files = htmlFiles();
const failures = [];
for (const file of files) {
  let html = fs.readFileSync(file, 'utf8');
  const googleCount = (html.match(new RegExp(googleId, 'g')) || []).length;
  const metaInitCount = (html.match(new RegExp(`fbq\\(['\"]init['\"],['\"]${metaId}['\"]\\)`, 'g')) || []).length;
  const metaNoScriptCount = (html.match(new RegExp(`facebook\\.com/tr\\?id=${metaId}`, 'g')) || []).length;

  if (checkOnly) {
    if (googleCount !== 2 || metaInitCount !== 1 || metaNoScriptCount !== 1) {
      failures.push(`${file}: Google=${googleCount}, Meta init=${metaInitCount}, Meta noscript=${metaNoScriptCount}`);
    }
    continue;
  }

  if (googleCount === 0 && metaInitCount === 0) html = html.replace('</head>', `${analyticsHead}</head>`);
  if (metaNoScriptCount === 0) html = html.replace(/<body([^>]*)>/, `<body$1>${metaNoScript}`);
  fs.writeFileSync(file, html);
}

if (failures.length) {
  console.error(`Analytics validation failed:\n${failures.join('\n')}`);
  process.exit(1);
}

console.log(checkOnly ? `Analytics validated on ${files.length} HTML files.` : `Analytics added to ${files.length} HTML files.`);
