'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const { downloadFileBlockStream } = require('../ipfs.js');

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
        const fileIDs = fs.readFileSync('publicFileIDs.txt', 'utf8').split(',');

        var downloadTimes = [];

        for (let i = 0; i < fileIDs.length; i++) {

            var id = fileIDs[i];
            var downloadPath = path.join(downloadDir, `${id}.txt`);

            var thisdownloadTimes = [];

            for (let j = 0; j < 10; j++) {
                const start = timestamp();

                const result = await contract.submitTransaction('DownloadPublic', id, '', '');

                if (result) {

                    const file = fs.createWriteStream(downloadPath);

                    var downloadedBlock = await downloadFileBlockStream(result.toString())

                    downloadedBlock.data.pipe(file);

                    const end = timestamp();

                    const downloadTime = end - start;
                    thisdownloadTimes.push(downloadTime);
                    // console.log(`文件${id}.txt下载成功！下载时间：${downloadTime}ms`);
                } else {
                    console.log('文件下载失败！');
                }
            }
            // 计算平均下载时间
            var sum = 0;
            for (let k = 0; k < thisdownloadTimes.length; k++) {
                sum += thisdownloadTimes[k];
            }

            var average = sum / thisdownloadTimes.length;

            downloadTimes.push(average);
            console.log(`文件${id}.txt下载成功！平均下载时间：${average}ms`);
        }

        // 保存下载时间
        fs.writeFileSync('publicDownloadTimes.txt', downloadTimes.toString());

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
