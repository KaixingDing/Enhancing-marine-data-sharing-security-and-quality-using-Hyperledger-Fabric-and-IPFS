const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const readline = require('readline-sync');
const { v4: uuidv4 } = require('uuid');
const { uploadFileBlock } = require('../ipfs.js');

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
        const ccpPath = path.resolve(__dirname, '..', '..', '..', 'test-network', 'organizations', 'peerOrganizations', 'org1.example.com', 'connection-org1.json');
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

        const uploadDir = './file/upload';
        // 1KB、2KB、4KB、8KB、16KB、32KB、64KB、128KB、256KB、512KB、1MB、2MB、4MB、8MB
        const fileSizes = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608];

        var fileIDs = [];
        var uploadTimes = [];

        // // 热启动
        // for (let i = 0; i < 50; i++) {
        //     const filename = path.join(uploadDir, `1024.txt`);
        //     var fp = fs.createReadStream(filename);
        //     var Up = await uploadFileBlock(fp);
        // }


        // 遍历fileSizes数组
        for (let i = 0; i < fileSizes.length; i++) {

            const fileSize = fileSizes[i];
            const fileName = path.join(uploadDir, `${fileSize}.txt`);

            var thisUploadTIimes = [];

            for (let j = 0; j < 1; j++) {

                const start = timestamp();

                var fp = fs.createReadStream(fileName);
                let ne = false;

                var Up = await uploadFileBlock(fp);

                // 生成文件块的唯一识别码
                const id = uuidv4();
                fileIDs.push(id);

                const result = await contract.submitTransaction('UploadPublic', ne, Up, id);

                if (result.toString() == 'true') {
                    const end = timestamp();
                    const uploadTime = end - start;
                    thisUploadTIimes.push(uploadTime);
                }
            }

            // 计算平均上传时间
            var sum = 0;
            for (let k = 0; k < thisUploadTIimes.length; k++) {
                sum += thisUploadTIimes[k];
            }
            const averageUploadTime = sum / thisUploadTIimes.length;
            uploadTimes.push(averageUploadTime);
            console.log(`Upload public file ${fileName} success, upload time is ${averageUploadTime}ms`);
        }

        // 将fileIDs和uploadTimes分别保存到当前目录下的publicFileIDs.txt和publicUploadTimes.txt文件中
        fs.writeFileSync('publicFileIDs.txt', fileIDs.toString());
        fs.writeFileSync('publicUploadTimes.txt', uploadTimes.toString());

        // // 读取publicFileIDs.txt和publicUploadTimes.txt文件中的内容
        // const publicFileIDs = fs.readFileSync('publicFileIDs.txt', 'utf8');
        // const publicUploadTimes = fs.readFileSync('publicUploadTimes.txt', 'utf8');
        // // 将publicFileIDs和publicUploadTimes转换为数组
        // const publicFileIDsArray = publicFileIDs.split(',');
        // const publicUploadTimesArray = publicUploadTimes.split(',');


        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
