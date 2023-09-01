
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');
const { HttpsProxyAgent } = require("https-proxy-agent");

//
// 基础配置区域
//

// 小说下载 URL
const DOWNLOAD_URL = process.env.DOWNLOAD_URL;
// 书籍封面 URL
const BOOK_COVER = process.env.COVER_URL;
// 休眠设置
const SLEEP_MIN = 100
const SLEEP_MAX = 200;

// 代理配置区域（隧道代理）
// 是否开启
const ENABLE_PROXY = process.env.ENABLE_PROTY === 'true';
// 代理主机名
const PROXY_HOST = process.env.PROXY_HOST;
// 代理端口
const PROXY_PORT = process.env.PROXY_PORT;
// 隧道认证 TOKEN
const PROXY_AUTH = { KEY: process.env.AUTH_KEY, PWD: process.env.AUTH_PWD };

if (ENABLE_PROXY) {
  axios.default.httpAgent = new HttpsProxyAgent(`http://${PROXY_AUTH.KEY}:${PROXY_AUTH.PWD}@${PROXY_HOST}:${PROXY_PORT}`);
  axios.default.httpsAgent = new HttpsProxyAgent(`http://${PROXY_AUTH.KEY}:${PROXY_AUTH.PWD}@${PROXY_HOST}:${PROXY_PORT}`);
}


const DOMAIN_LIST = ['hk.bqg123a.top', 'kt.bqg123a.top', 'la2.bqg123a.top'];

// 临时数据缓存
let errorList = new Set();
let currDomain = DOMAIN_LIST[0];


//
// 核心代码区域
//


/**
 * 休眠函数
 * @param {number} time  休眠时间
 * @returns 
 */
function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), time);
  });
}

/**
 * 生成范围内的数字 
 * @param {number} min 
 * @param {number} max 
 * @returns {string}
 */
function genNumRange(min, max) {
  return Math.round(Math.random() * (max - min)) + min;
}

/**
 * 获取 JS 下载地址
 * @param {string} path 
 * @returns {string}
 */
function getJSUrl(path) {
  return 'https://' + currDomain + path;
}

/**
 * 解析加密字段
 * @param {string} str 
 * @returns {object}
 */
function decodeJsdataVar(str) {
  return JSON.parse(global.decodeURIComponent(Buffer.from(str, 'base64')));
}

/**
 * 解析小说信息
 * @param {string} codeStr 
 * @returns {object}
 */
function parserBookInfoData(codeStr) {
  const window = global;
  eval(codeStr)
  return decodeJsdataVar(window.book_info_str)
}

/**
 * 解析章节列表数据
 * @param {string} codeStr 
 * @returns {object}
 */
function parserBookChaperListData(codeStr) {
  eval(codeStr);
  return decodeJsdataVar(chapter_list_data_str);
}

// 解析章节数据
function parserBookChaperData(codeStr) {
  eval(codeStr);
  return decodeJsdataVar(chapter_data_str);
}

// 根据下载地址获取书本id和章节id
function getBookIdByDownloadUrl(url) {
  const res = url.match(/\/v3\/([0-9]+)\/([0-9]+)\//);
  const book_uni_id = res[1];
  const book_id = res[2];

  return {
    book_uni_id,
    book_id,
  }
}

/**
 * 加载书籍信息
 * @param {object} bookInfo 书记信息
 * @returns {object}
 */
async function loadBookInfo(bookUrl) {
  const { book_uni_id, book_id } = getBookIdByDownloadUrl(bookUrl);

  const url = getJSUrl('/v3/load_book_info/' + book_uni_id + '/' + book_id + '.js?tmp=4');
  const { data } = await axios.get(url).catch((err) => {
    logger.error(err);
  });

  const res = parserBookInfoData(data);
  logger.info('[获取小说信息]：', res.book_name, res.author);

  return res;
}

/**
 * 加载章节列表信息
 * @param {object} bookInfo 书籍信息
 * @returns {object}
 */
async function loadBookChaperList(bookInfo) {
  const { url_chapter_list_kv, time_chapter_list_kv } = bookInfo;
  const url = getJSUrl('/load_chapter_list/' + url_chapter_list_kv + '.js?t=' + time_chapter_list_kv);
  const { data } = await axios.get(url);
  const chapterList = parserBookChaperListData(data).chapter_list;
  logger.info('[获取章节]：', chapterList.length, '章');
  return chapterList;
}

/**
 * 下载章节信息
 * @param {object} bookChaperList 章节信息
 */
async function loadBookChaperData(bookChaperList) {
  const chapterList = bookChaperList.slice();

  while (chapterList.length) {
    const chapterInfo = chapterList.shift();
    logger.info('[下载章节]：', chapterInfo.name);

    const url = getJSUrl('/load_chapter/' + chapterInfo.url_kv + '.js?t=' + chapterInfo.len);
    const res = await axios.get(url).catch(() => {
      errorList.add(chapterInfo);
      logger.error('[下载失败]：', chapterInfo.name);
    });
    const data = res?.data ?? null;
    // 如果没有数据证明一定是接口报错，此时直接跳过
    if (!data) continue;

    // 删除下载成功的
    if (errorList.has(chapterInfo)) {
      errorList.delete(chapterInfo);
      logger.debug('[重试下载]', chapterInfo.name);
    }
    const chapterData = parserBookChaperData(data);

    // 保存章节到本地文件
    createChaperFile(chapterInfo.url_kv, chapterData.chapter_kv.name, chapterData.chapter_kv.content)
    logger.info('[保存章节]', chapterInfo.name);
    logger.info('[剩余章节]：', chapterList.length, '章');

    // 随机休眠
    const sleepTime = genNumRange(SLEEP_MIN, SLEEP_MAX);
    logger.info('[下载休眠]：', sleepTime, '毫秒');
    await sleep(sleepTime);
  }
}


/**
 * 保存书籍信息
 * @param {object} bookData 书籍信息
 */
function createBookFile(bookData) {
  const savePath = path.join(__dirname, `../data/${bookData.book_name}`);
  if (!fs.existsSync(path)) {
    fs.mkdirSync(savePath, { recursive: true });
  }
  fs.writeFileSync(path.join(savePath, 'book.json'), JSON.stringify({
    title: bookData.book_name,
    author: bookData.author,
    cover: BOOK_COVER,
    publisher: 'mjjxs-net-download'
  }));
  setSaveBasePath(savePath);
}

/**
 * 设置保存文件基础路径
 * @param {string} path 
 */
function setSaveBasePath(path) {
  process.env.SAVE_BASE_PATH = path;
}

/**
 * 获取保存文件基础路径
 * @returns {string}
 */
function getSaveBasePath() {
  return process.env.SAVE_BASE_PATH;
}

/**
 * 创建书籍排序文件
 * @param {array} bookIds 书籍ID数组
 */
function createBookSortFile(bookIds) {
  const savePath = path.join(getSaveBasePath(), 'sort.json');
  fs.writeFileSync(savePath, JSON.stringify(bookIds), 'utf-8');
}

/**
 * 保存章节数据
 * @param {string} id 章节ID 
 * @param {string} chaperName 章节名称
 * @param {string} content 章节内容
 */
function createChaperFile(id, chaperName, content) {
  const savePath = path.join(getSaveBasePath(), `${id}.json`);
  const dirPath = path.dirname(savePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  fs.writeFileSync(savePath, JSON.stringify({
    chaperName,
    content,
  }), 'utf-8');
}


/**
 * 程序入口
 */
module.exports = {
  /**
   * 获取书籍信息
   * @desc 获取书籍信息，创建书籍储存目录
   * @returns {object} 书籍信息
   */
  getBookData() {
    return loadBookInfo(DOWNLOAD_URL).then(data => {
      createBookFile(data);
      return data;
    });
  },

  /**
   * 获取书籍章节列表信息
   * @desc 获取书籍章节信息，
   * @param {object} bookData 书籍信息
   * @returns {array} 书籍章节信息
   */
  async getChaperListData(bookData) {
    return loadBookChaperList(bookData).then((data) => {
      createBookSortFile(data.map(item => item.url_kv))
      return data;
    });
  },

  /**
   * 获取章节信息
   * @desc 获取章节信息，根据 CPU 核心数进行多进程下载
   * @param {number} workIdx worker index 索引
   * @param {number} cpus cpu 核心数
   * @param {array} chaperListData 章节列表
   */
  async getChaperData(workIdx, cpus, chaperListData) {
    logger.info(`[进程${workIdx}启动]}`);
    // 根据 CPU 核心数分块
    const chunkSize = Math.ceil(chaperListData.length / cpus);
    // 下载起始章节
    const startChaper = workIdx * chunkSize;
    // 下载结束章节
    const endChaper = workIdx * chunkSize + chunkSize;

    // 章节数据
    const chunkData = chaperListData.slice(startChaper, endChaper);
    // 有数据的时候再启动下载，当前算法可能存在分配不到下载任务
    if (chunkData.length) {
      logger.info(`[进程启动${workIdx}]：，下载章节${startChaper + 1}-${Math.min(endChaper, endChaper)}`);
      await loadBookChaperData(chunkData);
      // 重试下载
      while (errorList.size) {
        logger.info('[错误章节重试]：', errorList.size, '章');
        await loadBookChaperData([...errorList]);
      }

      logger.info(`[进程完成${workIdx}]`);
    } else {
      logger.info(`[进程结束${workIdx}]：无法分配任务`);
    }

    process.exit(0);
  }
}
