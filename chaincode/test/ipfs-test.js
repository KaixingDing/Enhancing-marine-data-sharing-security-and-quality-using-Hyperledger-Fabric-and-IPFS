var { uploadFileBlock, downloadFileBlock } = require('../lib/ipfs');
const fs = require('fs');

const fp = fs.readFileSync('test.svg');
const hash = uploadFileBlock(fp).then((hash) => {
    console.log(hash);

    const sucess = downloadFileBlock(hash, 'test111.svg');
    console.log(sucess);
});
