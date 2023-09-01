const cluster = require('cluster');
const cpus = require('os').cpus().length;
const path = require('path');
const spider = require('./spider');
const epub = require('./epub');
const logger = require('./logger');

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

  cluster.on('exit', () => {
    // 全部进程关闭后认为下载完成立即打包
    if (!Object.keys(cluster.workers).length) {
      logger.info('[打包书籍]');
      epub(process.env.SAVE_BASE_PATH)
    }
  });
})();
