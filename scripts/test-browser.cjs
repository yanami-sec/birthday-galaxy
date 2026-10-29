const {spawnSync} = require('node:child_process');
const path = require('node:path');
const {server} = require('./test-server.cjs');
(async () => {
  const instance = await server();
  try {
    for (const file of ['birthday-gift-smoke.cjs','heart-cards-smoke.cjs','next-birthday-layered-smoke.cjs','music-smoke.cjs']) {
      const run = spawnSync(process.execPath, [path.join(__dirname, '../tests', file)], {stdio:'inherit',env:{...process.env,BIRTHDAY_BASE_URL:instance.url}});
      if (run.status !== 0) throw new Error(`${file} failed`);
    }
  } finally { instance.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
