const USBKey = require('../lib/usbkey');
const fs = require('fs');

const usbkey = new USBKey();
// usbkey.connect();

fp = fs.readFileSync('test.svg');
console.log(usbkey.splitFileIntoBlocks(fp).length);

const encrypt_start = new Date().getTime();

datas = usbkey.encryptFile(fp).encryptedBlocks;
console.log(datas.length);

const encrypt_end = new Date().getTime();
console.log('加密时间：' + (encrypt_end - encrypt_start) + 'ms');

const decrypt_start = new Date().getTime();
// 解密，并写入文件
const decrypted = usbkey.decryptFile(datas);
fs.writeFileSync('test-decrypted.svg', decrypted);

const decrypt_end = new Date().getTime();
console.log('解密时间：' + (decrypt_end - decrypt_start) + 'ms');