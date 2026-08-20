import fs from 'node:fs';

const base = 'https://winedaddy-os.chrisprowland.workers.dev/jobs';
const statusUrl = 'https://winedaddy-os.chrisprowland.workers.dev/status';

fs.mkdirSync('.wd7/jobs', {recursive: true});

const requested = process.argv.slice(2);
let jobIds;
if (requested.length) {
  jobIds = requested.flatMap(token => expandToken(token));
} else {
  const response = await fetch(statusUrl, {cache: 'no-store'});
  if (!response.ok) throw new Error(`status runtime returned ${response.status}`);
  const status = await response.json();
  jobIds = status.production_jobs
    .filter(job => job.status === 'awaiting_branch' && job.current_stage === 'branch_preparation')
    .map(job => job.id)
    .sort();
}

for (const jobId of jobIds) {
  const response = await fetch(`${base}/${jobId}`, {cache: 'no-store'});
  if (!response.ok) throw new Error(`${jobId}: runtime returned ${response.status}`);
  const job = await response.json();
  if (job.status !== 'awaiting_branch' || job.current_stage !== 'branch_preparation') {
    throw new Error(`${jobId}: expected awaiting_branch/branch_preparation, got ${job.status}/${job.current_stage}`);
  }
  const workPackage = String(job.work_package || '');
  const editorialAttempts = workPackage
    .split(/## Editorial Department Output\s*/i)
    .slice(1)
    .map(section => section.split(/## Knowledge Department Output/i)[0].trim())
    .filter(section => /EDITORIAL PASS — READY FOR KNOWLEDGE GRAPH HANDOVER/i.test(section));
  const editorial = editorialAttempts.at(-1);
  if (!editorial || !readerArticle(editorial)) {
    throw new Error(`${jobId}: approved bounded Editorial output missing`);
  }
  const payload = {
    job_id: job.id,
    topic: job.topic,
    editorial_output: editorial,
    metadata: {
      title: lastMetadata(workPackage, 'Title'),
      description: lastMetadata(workPackage, 'Description'),
      slug: lastMetadata(workPackage, 'Slug'),
    },
    authority_family: workPackage.match(/"authority_family"\s*:\s*"([^"]+)"/)?.[1] || null,
    canonical_route: workPackage.match(/"canonical_route"\s*:\s*"([^"]+)"/)?.[1] || null,
  };
  fs.writeFileSync(`.wd7/jobs/${jobId}.json`, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Fetched ${jobId}: ${job.topic}`);
}
fs.writeFileSync('.wd7/current-batch.json', `${JSON.stringify({job_ids: jobIds}, null, 2)}\n`);

function readerArticle(output) {
  return output.match(/BEGIN READER ARTICLE\s*([\s\S]*?)(?:\s*END READER ARTICLE|\s*BEGIN INTERNAL EDITORIAL APPENDIX)/i)?.[1]?.trim() || null;
}

function expandToken(token) {
  const range = token.match(/^(?:WD-)?(\d{1,4})-(?:WD-)?(\d{1,4})$/i);
  if (range) {
    const from = Number(range[1]);
    const to = Number(range[2]);
    if (from > to) throw new Error(`invalid range: ${token}`);
    return Array.from({length: to - from + 1}, (_, index) => `WD-${String(from + index).padStart(4, '0')}`);
  }
  if (/^WD-\d{4}$/i.test(token)) return [token.toUpperCase()];
  if (/^\d{1,4}$/.test(token)) return [`WD-${token.padStart(4, '0')}`];
  throw new Error(`invalid job or range: ${token}`);
}

function lastMetadata(output, name) {
  const values = [...output.matchAll(new RegExp(`^- \\*\\*${name}:\\*\\*\\s*(.+)$`, 'gmi'))].map(match => match[1].trim().replace(/^`|`$/g, ''));
  return values.at(-1) || null;
}
