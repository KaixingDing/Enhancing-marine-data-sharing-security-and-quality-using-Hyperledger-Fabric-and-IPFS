var crypto = require('crypto');
const fs = require('fs');
const path = require('path');

function H(data) {
    const sha256 = crypto.createHash('sha256');
    sha256.update(data);
    return sha256.digest('hex');
}

/**
 * 上传文件块
 * @param {*} fileBlock 文件块
 * @returns 如果上传成功，返回文件块的哈希值，否则返回null
 */
const uploadFileBlock = async (fileBlock) => {

    // 对输入进行SHA256哈希
    const hash = H(fileBlock);

    // 将文件块数据保存在../ipfs-database/文件夹下,文件名为哈希值
    const filePath = path.join(__dirname, '..', 'ipfs-database', hash);
    fs.writeFileSync(filePath, fileBlock);

    return hash;
}

/**
 * 下载文件块
 * @param {String} hash 文件块的哈希值
 * @returns 如果下载成功，返回文件块数据，否则返回null
 */
const downloadFileBlock = async (hash) => {
    // 从../ipfs-database/文件夹下读取文件块数据
    const filePath = path.join(__dirname, '..', 'ipfs-database', hash);

    // 如果文件不存在，则返回false
    if (!fs.existsSync(filePath)) {
        return false;
    }

    try {
        // 读取文件块数据
        var fileBlock = fs.readFileSync(filePath);
        
        return fileBlock;
    } catch (err) {
        console.log(err);
        return null;
    }
}

module.exports = {
    uploadFileBlock,
    downloadFileBlock
}