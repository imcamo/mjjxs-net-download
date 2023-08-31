const bunyan = require('bunyan');
const path = require('path');

const log = bunyan.createLogger({
  name: 'mjjxs-net-download',
  streams: [
    {
      level:'error',
      path: path.resolve(__dirname, '../logs/error.log'),
    },
    {
      level:'info',
      path: path.resolve(__dirname, '../logs/info.log'),
    },
  ]
});

module.exports = log;
