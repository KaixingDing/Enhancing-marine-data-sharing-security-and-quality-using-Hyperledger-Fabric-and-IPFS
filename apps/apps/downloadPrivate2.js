'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const USBKey = require('./usbkey.js');
const crypto = require('crypto');
const { downloadFileBlock } = require('./ipfs.js');

function H(data) {
    const sha256 = crypto.createHash('sha256');
    sha256.update(data);
    return sha256.digest('hex');
}

async function main() {
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


        var id = readline.question("请输入文件的唯一识别码：");
        var downloadPath = readline.question("请输入文件下载路径：").toString();

        // 提交交易
        console.log('Submitting transaction to download file...');
        const result = await contract.submitTransaction('DownloadPrivate2', id);

        // Disconnect from the gateway.
        await gateway.disconnect();

        if (result) {
            console.log('加密文件块下载成功！接下来进行USBKey解密和校验工作...');
            // 解析result
            var hash = result.toString();
            var usbkey = new USBKey();
            var blocks = [];

            var downloadedBlock = await downloadFileBlock(hash);
            // downloadedBlock.data是拼接起来的字符串，用逗号隔开，需先解析成一个数组
            var encryptedBlocks = downloadedBlock.data.split(',');

            for (let i = 0; i < encryptedBlocks.length; i++) {
                var downloadedBlock = encryptedBlocks[i];
                var decryptedData = usbkey.decrypt(downloadedBlock);
                // console.log(decryptedData);
                blocks.push(Buffer.from(decryptedData));
            }
            var data = Buffer.concat(blocks);
            fs.writeFileSync(downloadPath, data);
            console.log('文件下载成功！');
        } else {
            console.log('文件下载失败！');
        }

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();