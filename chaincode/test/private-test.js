const { uploadFileBlock, downloadFileBlock } = require('../lib/ipfs');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const USBKey = require('../lib/usbkey');
const { success } = require('fabric-shim');

function H(data) {
    const sha256 = crypto.createHash('sha256');
    sha256.update(data);
    return sha256.digest('hex');
}

function timestamp() {
    return new Date().getTime().toString();
}

// 提示用户输入文件路径，并读取文件内容
var filename = readline.question("请输入要上传的文件路径：");
var fp = fs.readFileSync(filename);

// 提交交易
console.log('Submitting transaction to upload file...');

async function private(fp) {
    var usbkey = new USBKey();
    var encryptedInfo = usbkey.encryptFile(fp);
    var blocks = encryptedInfo.blocks;
    var Bs = encryptedInfo.encryptedBlocks;

    // 上传文件块，按顺序上传，计算相应的时间戳
    let private_info = [];
    let public_info = [];
    for (var i = 0; i < Bs.length; i++) {

        // 上传文件块
        const hash = await uploadFileBlock(Bs[i]);
        // 生成文件块的唯一标识符
        const bid = uuidv4();

        // 时间戳
        const ts = timestamp();
        private_info.push({
            BID: bid,
            timestamp: ts,
        });

        public_info.push({
            ID: bid,
            hash: hash,
            class: 'private',
            hashedBlock: H(blocks[i]),
        });
    }

    // 随机打乱public_info数组
    public_info.sort(function () {
        return 0.5 - Math.random();
    });

    let id = uuidv4();

    console.log('上传成功，文件的唯一识别码为：' + id);

    id = readline.question("请输入文件的唯一识别码：");
    var downloadPath = readline.question("请输入文件下载路径：");

    // 提交交易
    console.log('Submitting transaction to download file...');

    var blocks = [];

    for (var i = 0; i < private_info.length; i++) {
        var bid = private_info[i].BID;
        // 根据bid找到public_info中对应的文件块
        const asset = public_info.find(asset => asset.ID === bid);
        if (asset.class != 'private') {
            throw new Error(`The asset ${bid} is not private`);
        }
        // 根据哈希值下载文件块
        if (!(await downloadFileBlock(asset.hash, asset.hash))) {
            throw new Error(`The asset ${bid} download failed`);
        }
        // 文件块名即哈希值，读取文件块。现在文件块已经在本地了。
        const downloadedBlock = fs.readFileSync(asset.hash).toString();
        // 解密文件块
        const decryptedBlock = usbkey.decrypt(downloadedBlock);
        // 比对哈希值
        if (H(decryptedBlock) != asset.hashedBlock) {
            throw new Error(`The asset ${bid} hash does not match`);
        }
        blocks.push(decryptedBlock);
        // 清理下载的临时文件块
        fs.unlinkSync(asset.hash);
    }
    // 将文件块拼接成文件，保存到本地
    fs.writeFileSync(downloadPath, blocks.join(''));
    return true;
}

private(fp).then((success) => {
    console.log('文件下载成功');
});