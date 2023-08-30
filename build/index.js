const Epub = require('epub-gen');
const path = require('path');
const fs = require('fs');
const finderSort = require('finder-sort');


const chaperDir = path.join(__dirname, './chapter');
const option = {
  title: '',
  auther: '',
  publisher: '',
  cover: '',

  content: finderSort(fs.readdirSync(chaperDir)).map(fileName => {
    return {
      title: fileName,
      data: fs.readFileSync(path.join(chaperDir, fileName)).toString(),
    }
  }),
};


new Epub(option, path.join(__dirname, `./books/${option.title}.epub`));