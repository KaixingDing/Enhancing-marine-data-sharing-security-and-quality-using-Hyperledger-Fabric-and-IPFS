'use strict';

const { Gateway, Wallets } = require('fabric-network');
const stringify = require('json-stringify-deterministic');
const fs = require('fs');
const path = require('path');
const readline = require('readline-sync');
const USBKey = require('./usbkey.js');
const { v4: uuidv4 } = require('uuid');
const { uploadFileBlock } = require('./ipfs.js');
const { Readable } = require('stream');

const timestamp = () => {
    return new Date().getTime().toString();
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

        // 提示用户输入文件路径，并读取文件内容
        var filename = readline.question("请输入要上传的文件路径：");
        var fp = fs.readFileSync(filename);

        var usbkey = new USBKey();
        var encryptedInfo = usbkey.encryptFile(fp);
        var blocks = encryptedInfo.encryptedBlocks;

        var hashs = [];
        var bids = [];
        for (var i = 0; i < blocks.length; i++) {

            // 将blocks[i]存储在tmp文件中
            fs.writeFileSync('tmp', blocks[i]);
            var fp = fs.createReadStream("tmp");

            var hash = await uploadFileBlock(fp);
            hashs.push(hash);
            bids.push(uuidv4());
        }
        // console.log(blocks[0]);
        // console.log(usbkey.decrypt(blocks[0]))

        const id = uuidv4();

        // 提交交易
        console.log('Submitting transaction to upload file...');
        const result = await contract.submitTransaction('UploadPrivate',
            stringify(hashs),
            stringify(bids),
            id);

        if (result == 'true') {
            console.log('文件上传成功！文件的唯一识别码为：' + id);
        }

        // Disconnect from the gateway.
        await gateway.disconnect();

    } catch (error) {
        console.error(`Failed to submit transaction: ${error}`);
        process.exit(1);
    }
}

main();
