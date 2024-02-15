var crypto = require('crypto');
var fs = require('fs');

class USBKey {


    constructor() {
        this.connect();
    }

    connect() {
        this.keyPair = readKeyPair();
        console.log('USBKey connected');
        console.log('publicKey: \n' + this.keyPair.publicKey);
    }

    /**
     * 加密文件数据
     * @param {*} fp 文件数据
     * @returns 加密后的文件块数据
     */
    encryptFile(fp) {
        const blocks = this.splitFileIntoBlocks(fp);

        // 加密文件块
        const encryptedBlocks = blocks.map(block => this.encrypt(block));
        return {blocks, encryptedBlocks};
    }

    /**
     * 将加密的文件块解密
     * 需要注意的是，文件块的顺序需要和原来一样，否则解密后的文件数据会乱掉
     * @param {*} encryptedBlocks 加密后的文件块数据
     * @returns 解密后的文件数据
     */
    decryptFile(encryptedBlocks) {
        const blocks = encryptedBlocks.map(block => this.decrypt(block));
        return blocks.join('');
    }

    /**
     * 公钥加密数据
     * @param {*} data 数据
     * @returns 加密后的数据
     */
    encrypt(data) {
        const encrypted = crypto.publicEncrypt(this.keyPair.publicKey, Buffer.from(data));
        return encrypted.toString('base64');
    }

    /**
     * 私钥解密数据
     * @param {*} data 加密后的数据
     * @returns 解密后的数据
     */
    decrypt(data) {
        const decrypted = crypto.privateDecrypt(this.keyPair.privateKey, Buffer.from(data, 'base64'));
        return decrypted.toString();
    }

    /**
     * 在使用2048位RSA密钥和OAEP填充时，最大可以加密的数据大小为214字节。
     * 这是由于OAEP填充的最大输入大小为密钥长度减去填充和哈希算法所占用的字节数。
     * 在2048位RSA密钥和SHA-256哈希算法的情况下，填充和哈希算法占用43个字节，因此可以加密的最大数据大小为2048/8 - 43 = 214字节。
     * 这个函数将文件数据切割成不大于214字节的数据块，返回成数组格式
     * @param {*} fp 文件数据
     */
    splitFileIntoBlocks(fp) {
        const blockSize = 214;
        const numBlocks = Math.ceil(fp.length / blockSize);
        const blocks = [];

        for (let i = 0; i < numBlocks; i++) {
            const blockStart = i * blockSize;
            const blockEnd = Math.min(blockStart + blockSize, fp.length);
            const block = fp.slice(blockStart, blockEnd);
            blocks.push(block);
        }

        return blocks;
    }
}

// 读取公私钥对，这里仅供模拟
const readKeyPair = () => {
    const publicKey = fs.readFileSync('usbkey/publicKey.pem');
    const privateKey = fs.readFileSync('usbkey/privateKey.pem');
    return { publicKey, privateKey };
}

// 生成一个RSA的公私钥对，这里仅供模拟
const generateRSAKeyPair = () => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem',
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem',
            format: 'pem',
            padding: crypto.constants.RSA_PKCS1_OAEP_PADDING
        },
    });
    return { publicKey, privateKey };
};

// 将生成的公私钥对分别保存到文件中，自动创建文件，覆盖原有文件
const saveRSAKeyPair = () => {
    const { publicKey, privateKey } = generateRSAKeyPair();
    fs.writeFileSync('usbkey/publicKey.pem', publicKey);
    fs.writeFileSync('usbkey/privateKey.pem', privateKey);
}

// saveRSAKeyPair();

module.exports = USBKey;