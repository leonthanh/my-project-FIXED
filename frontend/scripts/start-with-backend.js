const { spawn } = require('child_process');
const path = require('path');

function spawnCmd(cmd, args, opts) {
  const p = spawn(cmd, args, { stdio: 'inherit', shell: true, ...opts });
  p.on('exit', (code) => {
    if (code !== 0) console.error(`${cmd} exited with ${code}`);
  });
  return p;
}

// Start backend (in dev mode) then frontend
const backendDir = path.join(__dirname, '..', '..', 'backend');
const frontendDir = path.join(__dirname, '..');

console.log('Starting backend...');
const backend = spawnCmd('npm', ['run', 'dev'], { cwd: backendDir });

// Give backend a bit of time before starting frontend (db sync etc)
setTimeout(() => {
  console.log('Starting frontend... (delayed to allow backend to init)');
  const frontend = spawnCmd('npm', ['start'], { cwd: frontendDir });

  const shutdown = () => {
    try { backend.kill(); } catch (e) {}
    try { frontend.kill(); } catch (e) {}
    process.exit();
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}, 3000);