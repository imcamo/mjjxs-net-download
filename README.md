# mjjxs.net 网站小说下载器
# 书籍下载方法
配置 `src/index.js` 里面的 `DOWNLOAD_URL`，运行`node ./src/index.js`，如果有下载错误中断修改`START_CHAPER`起始下载章节继续下载，下载好的章节会保存在 /build/chapter/目录

# 书籍打包方法
配置 `/build/index.js ` 里面的变量信息，运行 `node ./build/index.js`，打包好的书籍文件会保存在 `build/books` 目录