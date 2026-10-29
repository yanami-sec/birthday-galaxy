// Run a dedicated server process so synchronous test children do not block HTTP.
const {spawn} = require('node:child_process');
const path = require('node:path');
exports.server = () => new Promise((resolve, reject) => {
  const port = process.env.BIRTHDAY_TEST_PORT || '8767';
  const child = spawn(process.execPath, [path.join(__dirname, 'serve.cjs'), '--port', port], {windowsHide:true,stdio:['ignore','pipe','pipe']});
  const timeout = setTimeout(() => { child.kill(); reject(new Error('Test server startup timed out')); },10000);
  child.once('error', error => { clearTimeout(timeout); reject(error); });
  child.once('exit', code => { clearTimeout(timeout); reject(new Error(`Test server exited: ${code}`)); });
  child.stdout.once('data', () => { clearTimeout(timeout); resolve({url:`http://127.0.0.1:${port}/`,close:() => child.kill()}); });
});
