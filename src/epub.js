const Epub = require('epub-gen');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

/**
 * 书籍打包
 * @param {string} bookPath 数据存储目录
 */
module.exports = function(bookPath) {
    const bookData = JSON.parse(fs.readFileSync(path.join(bookPath, 'book.json')));
    const sortData = JSON.parse(fs.readFileSync(path.join(bookPath, 'sort.json')));
    const outputPath = path.resolve(__dirname, '../output/');
    const savePath = path.join(outputPath, `${bookData.title}.epub`);
    if (!fs.existsSync(outputPath)) fs.mkdirSync(outputPath);

    const option = {
        title: bookData.title,
        auther: bookData.auther,
        publisher: bookData.publisher,
        cover: bookData.cover,
        content: sortData.map(id => {
            const data = JSON.parse(fs.readFileSync(path.join(bookPath, `${id}.json`)));
            return {
                title: data.chaperName,
                data: data.content,
            }
        })
    };
    new Epub(option, savePath).promise.then(() => {
        logger.info('[书籍打包]：', savePath);
    });
}