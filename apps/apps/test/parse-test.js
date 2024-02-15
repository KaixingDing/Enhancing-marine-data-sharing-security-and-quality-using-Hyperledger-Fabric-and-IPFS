const stringify = require('json-stringify-deterministic');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const USBKey = require('../usbkey.js');
const { v4: uuidv4 } = require('uuid');

// 提示用户输入文件路径，并读取文件内容
var filename = readline.question("请输入要上传的文件路径：");
var fp = fs.readFileSync(filename);

var usbkey = new USBKey();
var encryptedInfo = usbkey.encryptFile(fp);
var blocks = encryptedInfo.blocks;
var Bs = encryptedInfo.encryptedBlocks;

// 生成等长的uuid序列
var bids = [];
for (var i = 0; i < blocks.length; i++) {
    bids.push(uuidv4());
}

console.log(JSON.parse(Buffer.from(stringify(Bs))));