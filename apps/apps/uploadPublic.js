const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const readline = require('readline-sync');
const { v4: uuidv4 } = require('uuid');
const { uploadFileBlock } = require('./ipfs.js');

const H = (data) => {
    const sha256 = crypto.createHash('sha256');
    sha256.update(data);
    return sha256.digest('hex');
}

// AES加密函数
const aes_encrypt = (text, password) => {
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
const aes_decrypt = (iv, encryptedText, password) => {
    const key = crypto.scryptSync(password, 'salt', 32); // 通过密码生成32字节的密钥
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex')); // 创建解密器，传入初始化向量

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8'); // 解密输入的密文
    decrypted += decipher.final('utf8');

    return decrypted; // 返回解密后的明文
}

const timestamp = () => {
    return new Date().getTime().toString();
}

const main = async () => {
    try {
        // load the network configuration
        const ccpPath = path.resolve(__dirname, '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
        let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new file system based wallet for managing identities.
        const walletPath = path.join(process.cwd(), 'wallet');
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(`Wallet path: ${walletPath}`);

        // Check to see if we've already enrolled the user.
        const identity = await wallet.get('appUser');
        if (!identity) {
            console.log('An identity for the user "appUser" does not exist in the wallet');
            console.log('Run the registerUser.js application before retrying');
            return;
        }

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'appUser', discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('mychannel');

        // Get the contract from the network.
        const contract = network.getContract('ipfs-share');

        // 提示用户输入文件路径，并读取文件内容
        var filename = readline.question("请输入要上传的文件路径：");
        var fp = fs.createReadStream(filename);

        let ne = false;
        let password = '';
        var ifEncrypt = readline.question("是否加密上传？(y/n)");
        if (ifEncrypt == 'y') {
            ne = true;
            password = readline.question("请输入加密密码：");
        }

        var info = {};

        var hash = await uploadFileBlock(fp);

        // 生成文件块的唯一识别码
        const id = uuidv4();
        info['If'] = id;

        var Up = null;
        if (ne) {
            // 对文件地址加密
            var encrypted = aes_encrypt(hash, password);
            Up = encrypted.encryptedText;
            info['iv'] = encrypted.iv;
        } else {
            Up = hash;
        }

        console.log(info);

        // 提交交易
        console.log('Submitting transaction to upload file...');
        const result = await contract.submitTransaction('UploadPublic', ne, Up, id);

        if(result.toString() == 'true') {
            console.log('文件上传成功！信息：' + info.toString());
        }

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
