'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const USBKey = require('../usbkey.js');
const crypto = require('crypto');
const { downloadFileBlock } = require('../ipfs.js');

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

        const downloadDir = './file/download';
        const fileIDs = fs.readFileSync('privateFileIDs.txt', 'utf8').split(',');
        var usbkey = new USBKey();

        var downloadTimes = [];
        var usbkeyTimes = [];

        for (let i = 0; i < fileIDs.length; i++) {

            var id = fileIDs[i];
            var downloadPath = path.join(downloadDir, `${id}.txt`);

            var thisdownloadTimes = [];
            var thisusbkeyTimes = [];


            for (let j = 0; j < 10; j++) {

                const start = timestamp();
                const result = await contract.submitTransaction('DownloadPrivate2', id);

                if (result) {

                    // 解析result
                    var hash = result.toString();
                    var blocks = [];
                    var downloadedBlock = await downloadFileBlock(hash);

                    const usbkeyStart = timestamp();

                    // downloadedBlock.data是拼接起来的字符串，用逗号隔开，需先解析成一个数组
                    var encryptedBlocks = downloadedBlock.data.split(',');

                    for (let k = 0; k < encryptedBlocks.length; k++) {
                        var downloadedBlock = encryptedBlocks[k];
                        var decryptedData = usbkey.decrypt(downloadedBlock);
                        // console.log(decryptedData);
                        blocks.push(Buffer.from(decryptedData));
                    }
                    var data = Buffer.concat(blocks);

                    const usbkeyEnd = timestamp();

                    fs.writeFileSync(downloadPath, data);

                    const end = timestamp();

                    const downloadTime = end - start;
                    thisdownloadTimes.push(downloadTime);
                    const usbkeyTime = usbkeyEnd - usbkeyStart;
                    thisusbkeyTimes.push(usbkeyTime);
                    // console.log(`文件${id}.txt下载成功！下载时间：${downloadTime}ms，USBKey解密时间：${usbkeyTime}ms`);
                } else {
                    console.log('文件下载失败！');
                }
            }

            // 计算平均下载时间
            var sum = 0;
            var usbkeySum = 0;

            for (let k = 0; k < thisdownloadTimes.length; k++) {
                sum += thisdownloadTimes[k];
                usbkeySum += thisusbkeyTimes[k];
            }

            var avgDownloadTime = sum / thisdownloadTimes.length;
            var avgUSBKeyTime = usbkeySum / thisusbkeyTimes.length;

            downloadTimes.push(avgDownloadTime);
            usbkeyTimes.push(avgUSBKeyTime);

            console.log(`文件${id}.txt下载成功！平均下载时间：${avgDownloadTime}ms，平均USBKey解密时间：${avgUSBKeyTime}ms`);
        }

        fs.writeFileSync('privateDownloadTimes.txt', downloadTimes.toString());
        fs.writeFileSync('privateUSBKeyTimes.txt', usbkeyTimes.toString());

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
