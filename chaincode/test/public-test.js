const { uploadFileBlock, downloadFileBlock } = require('../lib/ipfs');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

// AES加密函数
function aes_encrypt(text, password) {
    const iv = crypto.randomBytes(16); // 生成一个随机的16字节的初始化向量
    const key = crypto.scryptSync(password, 'salt', 32); // 通过密码生成32字节的密钥

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv); // 创建加密器
    let encrypted = cipher.update(text, 'utf8', 'hex'); // 加密输入的明文
    encrypted += cipher.final('hex');

    return {
        iv: iv.toString('hex'), // 返回加密时使用的初始化向量，转换为16进制字符串
        encryptedText: encrypted // 返回加密后的密文，转换为16进制字符串
    };
}

// AES解密函数
function aes_decrypt(iv, encryptedText, password) {
    const key = crypto.scryptSync(password, 'salt', 32); // 通过密码生成32字节的密钥
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex')); // 创建解密器，传入初始化向量

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8'); // 解密输入的密文
    decrypted += decipher.final('utf8');

    return decrypted; // 返回解密后的明文
}

function timestamp() {
    return new Date().getTime().toString();
}

// 提示用户输入文件路径，并读取文件内容
var filename = readline.question("请输入要上传的文件路径：");
var fp = fs.readFileSync(filename);


uploadFileBlock(fp).then((hash) => {

    let ne = false;
    let password = '';
    var ifEncrypt = readline.question("是否加密上传？(y/n)");
    if (ifEncrypt == 'y') {
        ne = true;
        password = readline.question("请输入加密密码：");
    }

    // 提交交易
    console.log('Submitting transaction to upload file...');

    var iv = '';

    var Up = null;
    if (ne) {
        // 对文件地址加密
        encrypted = aes_encrypt(hash, password);
        Up = encrypted.encryptedText;
        iv = encrypted.iv;
        console.log('iv: ' + iv);
    } else {
        Up = hash;
    }
    // 生成文件块的唯一识别码
    let id = uuidv4();
    // 生成一个时间戳
    ts = timestamp();

    const asset = {
        ID: id,
        class: 'public',
        ne: ne,
        timestamp: ts,
        Up: Up,
    };
    console.log(asset);

    id = readline.question("请输入文件的唯一识别码：");

    password = '';

    var ifEncrypt = readline.question("是否为加密文件？(y/n)");
    if (ifEncrypt == 'y') {
        iv = readline.question('请输入iv：');
        password = readline.question('请输入密码：');
    }

    var downloadPath = readline.question("请输入文件下载路径：");

    // 提交交易
    console.log('Submitting transaction to download file...');
    if (asset.class != 'public') {
        throw new Error(`The asset ${id} is not public`);
    }
    let Kp = null;
    if (asset.ne) {
        // 对文件地址解密
        Kp = aes_decrypt(iv, asset.Up, password);
    } else {
        Kp = asset.Up;
    }
    downloadFileBlock(Kp, downloadPath).then((success) => {
        if (success) {
            console.log('文件下载成功');
        } else {
            console.log('文件下载失败');
        }
    });
});