#!/usr/bin/env node
const inquirer = require('inquirer');
const exec = require('child_process').exec;
const ora = require('ora');


inquirer.prompt([
  {
    type: 'input',
    name: 'DOWNLOAD_URL',
    message: '请输入 https://mjjxs.net 网址找到的小说主页地址：',
    default: 'https://mjjxs.net/v3_uni_0705?2#/v3/132948419/2079692/',
    validate(value) {
      return /https:\/\/mjjxs\.net\/.*\?\d+#\/.*\/\d+\/\d+\//.test(value)
    }
  },
  {
    type: 'input',
    name: 'COVER_URL',
    message: '请输入小说封面图片地址',
    default: 'https://bookcover.yuewen.com/qdbimg/349573/1019664125/deafult.webp',
  },
  {
    type: 'confirm',
    name: 'ENABLE_PROTY',
    message: '是否开启代理',
    default: false,
  },
  {
    type: 'input',
    name: 'PROXY',
    message: '请输入代理地址',
    default: '127.0.0.1:8080',
    when(answers) {
      return answers.ENABLE_PROTY
    }
  },
  {
    type: 'input',
    name: 'AUTH',
    message: 'KEY:PWD',
    default: 'KEY:PWD',
    when(answers) {
      return answers.ENABLE_PROTY
    }
  }
]).then((data) => {
  process.env.DOWNLOAD_URL = data.DOWNLOAD_URL;
  process.env.COVER_URL = data.COVER_URL;
  process.env.ENABLE_PROTY = data.ENABLE_PROTY ? 1 : 0;

  if (data.ENABLE_PROTY) {
    const [HOST, PORT] = data.PROXY.split(':');
    const [KEY, PWD] = data.AUTH.split(':')
    process.env.PROXY_HOST = HOST;
    process.env.PROXY_PORT = PORT;
    process.env.AUTH_KEY = KEY;
    process.env.AUTH_PWD = PWD;
  }

  const spinner = ora('正在执行下载任务').start();
  exec(`node ./src/index.js`, (error, stdout, stderr) => {
    spinner.succeed();
    if (error) {
      console.error(`执行失败: ${error}`);
      return;
    }
    console.log(`执行结果: ${stdout}`);
  })
});

