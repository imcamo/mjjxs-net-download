const spider = require('./spider');

(async () => {
  process.on('message', ([workIdx, cpus, chaperListData]) => {
    spider.getChaperData(workIdx, cpus, chaperListData)
  });
})();


