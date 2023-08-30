const { default: axios } = require('axios');
const fs = require('fs');
const path = require('path');

//
// 基础配置区域
//
// 下载URL
const DOWNLOAD_URL = 'https://mjjxs.net/v3_uni_0705?1#/v3/44017580/151/';
// 默认开始章节
const START_CHAPER = 1;
// 休眠设置
const SLEEP_MIN = 100
const SLEEP_MAX = 500;



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
 * @param {string} domain 
 * @param {string} path 
 * @returns {string}
 */
function getJSUrl(domain, path) {
  return 'https://' + domain + path;
}

/**
 * 解析加密字段
 * @param {string} str 
 * @returns {string}
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
const domainList = ['hk.bqg123a.top', 'kt.bqg123a.top', 'la2.bqg123a.top'];
const currDomain = domainList[0];
async function loadBookInfo(bookUrl) {
  const { book_uni_id, book_id } = getBookIdByDownloadUrl(bookUrl);
  const url = getJSUrl(currDomain, '/v3/load_book_info/' + book_uni_id + '/' + book_id + '.js?tmp=4');
  const { data } = await axios.get(url);
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
  const url = getJSUrl(currDomain, '/load_chapter_list/' + url_chapter_list_kv + '.js?t=' + time_chapter_list_kv);
  const { data } = await axios.get(url);
  const res = parserBookChaperListData(data)
  console.log('[获取章节数据]：', res.chapter_list.length, '章');
  return res;
}

/**
 * 下载章节信息
 * @param {object} bookChaperList 章节信息
 * @param {number} startChaper 起始章节数
 */
async function loadBookChaperData(bookChaperList, startChaper = START_CHAPER) {
  const chapter_list = bookChaperList.chapter_list.slice(startChaper - 1);
  if (startChaper >= 0) {
    console.log('[恢复下载]：当前章节', startChaper, '章');
  }
  while (chapter_list.length) {
    const { name, url_kv, len } = chapter_list.shift();
    console.log('[下载章节]：', name);

    const url = getJSUrl(currDomain, '/load_chapter/' + url_kv + '.js?t=' + len);
    const { data } = await axios.get(url);
    const { chapter_kv } = parserBookChaperData(data);

    // 保存章节到本地文件
    saveChaperData(chapter_kv.name, chapter_kv.content);
    console.log('[保存章节]');
    console.log('[剩余章节]：', chapter_list.length, '章');

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


// 入口
loadBookInfo(DOWNLOAD_URL).then(data => loadBookChaperList(data).then((data) => loadBookChaperData(data)))
