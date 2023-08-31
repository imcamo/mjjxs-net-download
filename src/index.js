const cluster = require('cluster');
const cpus = require('os').cpus().length;
const path = require('path');
const spider = require('./spider');

(async () => {
  // master 进程先获取章节信息
  const bookData = await spider.getBookData();
  const chaperListData = await spider.getChaperListData(bookData);

  cluster.setupMaster({
    exec: path.resolve(__dirname, './worker.js'),
    asgs: ['--use', 'http'],
  });
  
  for (let i = 0; i < cpus; i++) {
    let worker = cluster.fork();
    // worker 进程并发下载
    worker.send([i, cpus, chaperListData]);
  }
})();
