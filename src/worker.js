const spider = require('./spider');

process.on('message', ([workIdx, cpus]) => {
  spider(workIdx, cpus)
});

