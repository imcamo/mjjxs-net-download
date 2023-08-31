const { default: axios } = require('axios');
const fs = require('fs');
const path = require('path');

axios.defaults.headers = {
  'Referer': 'https://mjjxs.net/',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
};

//
// 基础配置区域
//
const DOMAIN_LIST = ['hk.bqg123a.top', 'kt.bqg123a.top', 'la2.bqg123a.top'];
// 下载URL
const DOWNLOAD_URL = 'https://mjjxs.net/v3_uni_0705?2#/v3/54466799/2402300/';
// 默认开始章节
// 休眠设置
const SLEEP_MIN = 1000
const SLEEP_MAX = 5000;

// 临时数据缓存
let errorList = [];
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
    console.log(err);
  });
  const res = parserBookInfoData(data);
  console.log('[获取小说信息]：', res.book_name, res.author);
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
  console.log('[获取章节数据]：', chapterList.length, '章');
  return chapterList;
}

/**
 * 下载章节信息
 * @param {object} bookChaperList 章节信息
 */
async function loadBookChaperData(bookChaperList, callback) {
  const chapterList = bookChaperList.slice();

  // 执行回调
  callback && callback()

  while (chapterList.length) {
    const chapterInfo = chapterList.shift();
    console.log('[下载章节]：', chapterInfo.name);
    const url = getJSUrl('/load_chapter/' + chapterInfo.url_kv + '.js?t=' + chapterInfo.len);
    const res = await axios.get(url).catch(() => {
      errorList.push(chapterInfo);
      console.log('[下载章节失败]：', chapterInfo.name);
    });
    const data = res?.data ?? null;
    // 如果没有数据证明一定是接口报错，此时直接跳过
    if (!data) continue;
    const chapterData = parserBookChaperData(data);

    // 保存章节到本地文件
    saveChaperData(chapterData.chapter_kv.name, chapterData.chapter_kv.content);
    console.log('[保存章节]');
    console.log('[剩余章节]：', chapterInfo.name);
    console.log('[剩余章节]：', chapterList.length, '章');

    // 随机休眠
    const sleepTime = genNumRange(SLEEP_MIN, SLEEP_MAX);
    console.log('[休眠]：', sleepTime, '毫秒');
    await sleep(sleepTime);
  }
}

/**
 * 保存章节数据
 * @param {string} name 
 * @param {string} data 
 */
function saveChaperData(name, data) {
  const saveBasePath = path.resolve(__dirname, '../build/chapter');
  const savePath = path.join(saveBasePath, name.replace(/[\\/:*?"<>|]/g, ''));
  fs.writeFileSync(savePath, data, 'utf-8');
}


/**
 * 爬虫入口
 * @param {number} workIdx 创建 worker 的索引
 * @param {number} cpus CPU 核心数
 */
module.exports = async function spider(workIdx, cpus) {
  // 启动的时候休息一下避免进程并发启动报错
  await sleep(genNumRange(4000, 9000));
  console.log(`[进程${workIdx}启动]}`);

  // 书籍基础信息
  const bookData = await loadBookInfo(DOWNLOAD_URL);
  // 所有章节
  const chaperList = await loadBookChaperList(bookData);
  // 根据 CPU 核心数分块
  const chunkSize  = Math.ceil(chaperList.length / cpus);
  // 下载起始章节
  const startChaper = workIdx * chunkSize;
  // 下载结束章节
  const endChaper = workIdx * chunkSize + chunkSize;

  // 章节数据
  const chunkData = chaperList.slice(startChaper, endChaper);
  // 有数据的时候再启动下载，当前算法可能存在分配不到下载任务
  if (chunkData.length) {
    console.log(`[进程${workIdx}启动]：，下载章节${startChaper+1}-${Math.min(endChaper, endChaper)}`);
    await loadBookChaperData(chunkData);
    // 重试下载
    if (errorList.length) {
      console.log('[启动错误章节下载]：', errorList.length, '章');
      await loadBookChaperData(errorList, () => {
        errorList = [];
      });
      process.exit();
    }
  } else {
    console.log(`[进程${workIdx}结束]：无法分配任务`);
    process.exit();
  }
};
