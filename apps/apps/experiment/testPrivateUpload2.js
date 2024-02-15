'use strict';

const { Gateway, Wallets } = require('fabric-network');
const stringify = require('json-stringify-deterministic');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const USBKey = require('../usbkey.js');
const { v4: uuidv4 } = require('uuid');
const { uploadFileBlock } = require('../ipfs.js');
const { Readable } = require('stream');

const timestamp = () => {
    return new Date().getTime().toString();
}

async function main() {
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
        var usbkeyTimes = [];

        var usbkey = new USBKey();

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
            var thisUSBKeyTimes = [];

            for (let j = 0; j < 1; j++) {

                const start = timestamp();

                var fp = fs.readFileSync(fileName);

                var encryptedInfo = usbkey.encryptFile(fp);
                var blocks = encryptedInfo.encryptedBlocks;

                // 将所有的blocks合并成一个字符串，并用逗号隔开
                var blocksStr = blocks.join(',');

                const usbkeyEnd = timestamp();

                var hashs = [];
                var bids = [];
                // 将blocksStr存储在tmp文件中
                fs.writeFileSync('tmp', blocksStr);
                var fp = fs.createReadStream("tmp");

                var hash = await uploadFileBlock(fp);

                const id = uuidv4();
                fileIDs.push(id);

                // 提交交易
                const result = await contract.submitTransaction('UploadPrivate2', id, hash);
                if (result == 'true') {
                    const end = timestamp();
                    const uploadTime = end - start;
                    const usbkeyTime = usbkeyEnd - start;
                    thisUploadTIimes.push(uploadTime);
                    thisUSBKeyTimes.push(usbkeyTime);
                }
            }

            // 计算平均上传时间
            var sum = 0;
            var usbkeySum = 0;
            for (let k = 0; k < thisUploadTIimes.length; k++) {
                sum += thisUploadTIimes[k];
                usbkeySum += thisUSBKeyTimes[k];
            }
            const averageUploadTime = sum / thisUploadTIimes.length;
            const averageUSBKeyTime = usbkeySum / thisUploadTIimes.length;
            uploadTimes.push(averageUploadTime);
            usbkeyTimes.push(averageUSBKeyTime);
            console.log(`Upload private file ${fileName} success, all of upload time is ${averageUploadTime}ms, usbkey time is ${averageUSBKeyTime}ms`);
        }

        // 将fileIDs和uploadTimes分别保存到当前目录下的privateFileIDs.txt和privateUploadTimes.txt文件中
        fs.writeFileSync('privateFileIDs.txt', fileIDs.toString());
        fs.writeFileSync('privateUploadTimes.txt', uploadTimes.toString());

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
