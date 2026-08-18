import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const source = fs.readFileSync(new URL('../src/index.ts', import.meta.url), 'utf8');
test('QA Worker restricts target hosts and path count', () => { assert.match(source, /winedaddy\\\.pages\\\.dev/); assert.match(source, /Math\.min\(Number\(env\.MAX_PATHS \|\| 40\), 40\)/); });
test('QA Worker accepts directory and legacy HTML article routes', () => { assert.match(source, /a-z0-9-\]\+\\\.html/); });
test('QA Worker checks indexing boundaries', () => { assert.match(source, /preview noindex header missing/); assert.match(source, /production noindex header present/); });
