# mjjxs.net 网站小说下载器
基于 node cluster 多进程小说下载器，支持隧道代理，可无限重试下载，自动打包成`epub`格式

# 依赖安装
```bash
npm i
```
# 开始下载
```bash
node ./src/index.js
```

# 变量配置
- DOWNLOAD_URL 小说下载 URL
- BOOK_COVER 小说封面图片 URL
- ENABLE_PROXY 是否开启代理，默认为 `false`
- PROXY_HOST 代理主机
- PROXY_PORT 代理端口
- PROXY_AUTH 代理认证信息


# 文件目录介绍
- data 书籍下载信息
- logs 运行日志
- output 书籍文件目录
- src 源代码目录
