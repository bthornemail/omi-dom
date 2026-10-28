// Every shared module's selfTest, each in its own process and awaited, so a
// promise is checked and a module that exits cannot stop the others.
//   node scripts/selftests.cjs      (npm test)
// PASS: selfTest resolved with passed true. A module without selfTest that
// checks itself on load (bqf-verify) passes when it exits 0 after printing
// ALL CHECKS PASSED. A module with neither is reported, not counted as a pass.
// Exits 1 if any module fails, errs or times out.
const { spawnSync } = require('child_process');
const fs = require('fs'), path = require('path');
const dir = path.join(__dirname, '..', 'shared');
const probe = `
const m = require(process.argv[1]);
(async () => {
  if (typeof m.selfTest !== 'function') { console.log('@@RESULT none'); return; }
  const r = await Promise.resolve(m.selfTest());
  console.log('@@RESULT ' + (r && r.passed ? 'PASS' : 'FAIL') + ' ' + (r && r.total !== undefined ? r.total : '?'));
  setTimeout(() => process.exit(0), 50);
})().catch((e) => { console.log('@@RESULT ERR ' + String(e && e.message).slice(0, 60)); process.exit(0); });`;
let pass = 0, bad = 0, none = 0;
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort()) {
  const r = spawnSync(process.execPath, ['-e', probe, path.join(dir, f)], { encoding: 'utf8', timeout: 30000 });
  const out = `${r.stdout || ''}${r.stderr || ''}`;
  const line = out.split('\n').filter((l) => l.startsWith('@@RESULT ')).pop();
  let verdict;
  if (line) verdict = line.slice(9);
  else if (r.status === 0 && /ALL CHECKS PASSED/.test(out)) verdict = 'PASS (checks itself on load)';
  else verdict = r.error ? 'ERR timeout' : `ERR exit ${r.status}`;
  if (verdict.startsWith('PASS')) pass++;
  else if (verdict === 'none') { none++; verdict = 'no selfTest'; }
  else bad++;
  console.log(`${verdict.startsWith('PASS') ? 'PASS' : verdict.startsWith('no') ? '----' : 'FAIL'}  ${f}  ${verdict.replace(/^PASS ?/, '')}`);
}
console.log(`\n${pass} pass, ${bad} fail, ${none} without selfTest`);
process.exit(bad ? 1 : 0);
