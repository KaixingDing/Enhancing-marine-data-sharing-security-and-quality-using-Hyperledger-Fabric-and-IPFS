'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const USBKey = require('../usbkey.js');
const crypto = require('crypto');
const { downloadFileBlock } = require('../ipfs.js');

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
        
        const fileSizes = [1024, 2048, 4096, 8192, 16384, 32768, 65536];

        const fileIDs = fs.readFileSync('privateFileIDs.txt', 'utf8').split(',');

        var downloadTimes = [];
        var usbkeyTimes = [];

        var usbkey = new USBKey();

        // 遍历fileIDs数组
        for (let i = 0; i < fileIDs.length; i++) {

            var id = fileIDs[i];

            const start = timestamp();

            var downloadPath = path.join(__dirname, '..', 'file', 'download', `${id}.txt`);
            
            const result = await contract.submitTransaction('DownloadPrivate', id);

            if (result) {
                // console.log('加密文件块下载成功！接下来进行USBKey解密和校验工作...');

                // 解析result
                var datas = JSON.parse(result.toString());

                const usbkeyStart = timestamp();

                var blocks = [];
                // datas的结构是数组，其中每一条的数据为[文件块原本的哈希值, 加密块数据]。
                // 现在要一一解密，并且校验哈希值。
                var i = 0;
                for (i = 0; i < datas.length; i++) {
                    var hash = datas[i];
                    var downloadedBlock = await downloadFileBlock(hash);
                    var decryptedData = usbkey.decrypt(downloadedBlock.data);
                    // console.log(decryptedData);
                    blocks.push(Buffer.from(decryptedData));
                }

                const usbkeyEnd = timestamp();

                // 如果所有的文件块都下载成功，那么就将它们合并成一个文件。
                if (i === datas.length) {
                    var data = Buffer.concat(blocks);
                    fs.writeFileSync(downloadPath, data);
                    
                    const end = timestamp();
                    const downloadTime = end - start;
                    const usbkeyTime = usbkeyEnd - usbkeyStart;
                    downloadTimes.push(downloadTime);
                    usbkeyTimes.push(usbkeyTime);
                }
            } else {
                console.log('文件下载失败！');
            }
        }

        // Disconnect from the gateway.
        await gateway.disconnect();

        // 将downloadTimes和usbkeyDecryptTimes分别保存到当前目录下的privateDownloadTimes.txt和privateUSBKeyDecryptTimes.txt文件中
        fs.writeFileSync('privateDownloadTimes.txt', downloadTimes.toString());
        fs.writeFileSync('privateUSBKeyDecryptTimes.txt', usbkeyTimes.toString());
        

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();