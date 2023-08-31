const cluster = require('cluster');
const cpus = require('os').cpus().length;
const path = require('path');


cluster.setupMaster({
  exec: path.resolve(__dirname, './worker.js'),
  asgs: ['--use', 'http'],
});

for (let i = 0; i < cpus; i++) {
  let worker = cluster.fork();
  worker.send([i, cpus]);
}
