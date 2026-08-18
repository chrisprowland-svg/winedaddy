import fs from 'node:fs';

const from = Number(process.argv[2] || 912);
const to = Number(process.argv[3] || 950);
const base = 'https://winedaddy-os.chrisprowland.workers.dev/jobs';

fs.mkdirSync('.wd7/jobs', {recursive: true});

for (let number = from; number <= to; number += 1) {
  const jobId = `WD-${String(number).padStart(4, '0')}`;
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
  if (!editorial || !/BEGIN READER ARTICLE[\s\S]*END READER ARTICLE/i.test(editorial)) {
    throw new Error(`${jobId}: approved bounded Editorial output missing`);
  }
  const payload = {
    job_id: job.id,
    topic: job.topic,
    editorial_output: editorial,
  };
  fs.writeFileSync(`.wd7/jobs/${jobId}.json`, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Fetched ${jobId}: ${job.topic}`);
}
