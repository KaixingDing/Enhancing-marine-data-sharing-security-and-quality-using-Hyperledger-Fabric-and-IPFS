'use strict';

const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const { downloadFileBlockStream } = require('./ipfs.js');

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

        let iv = '';
        let password = '';

        var ifEncrypt = readline.question("是否为加密文件？(y/n)");
        if (ifEncrypt == 'y') {
            iv = readline.question('请输入iv：');
            password = readline.question('请输入密码：');
        }

        var downloadPath = readline.question("请输入文件下载路径：").toString();

        // 提交交易
        console.log('Submitting transaction to download file...');
        const result = await contract.submitTransaction('DownloadPublic', id, iv, password);

        if (result) {

            const file = fs.createWriteStream(downloadPath);

            var downloadedBlock = await downloadFileBlockStream(result.toString())

            downloadedBlock.data.pipe(file);

            console.log('文件下载成功！');
        } else {
            console.log('文件下载失败！');
        }

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
