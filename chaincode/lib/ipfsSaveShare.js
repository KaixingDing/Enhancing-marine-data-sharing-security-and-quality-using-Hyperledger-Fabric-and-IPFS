'use strict';

const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const { uploadFileBlock, downloadFileBlock } = require('./ipfs.js');
const USBKey = require('./usbkey.js');
const { info } = require('console');

function H(data) {
    const sha256 = crypto.createHash('sha256');
    sha256.update(data);
    return sha256.digest('hex');
}

class IpfsSaveShare extends Contract {

    // 初始化合约
    async InitLedger(ctx) {
        const assets = [];

        for (const asset of assets) {
            asset.docType = 'asset';
            // example of how to write to world state deterministically
            // use convetion of alphabetic order
            // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
            // when retrieving data, in any lang, the order of data will be the same and consequently also the corresonding hash
            await ctx.stub.putState(asset.ID, Buffer.from(stringify(sortKeysRecursive(asset))));
        }
    }

    /**
     * 公开共享型文件上传
     * @param {*} ctx 上下文对象
     * @param {*} fp 文件数据
     * @param {Boolean} ne 是否对文件地址加密
     * @returns 信息
     */
    async UploadPublic(ctx, ne, Up, id) {

        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            return true;
        }

        const asset = {
            ID: id,
            class: 'public',
            ne: ne,
            Up: Up,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return true;
    }

    /**
     * 公开共享型文件下载
     * @param {*} ctx 上下文对象
     * @param {*} id 文件块的唯一识别码
     * @param {String} iv AES加密的初始化向量（16字节），如果不加密则为任意值
     * @param {String} password 加密密码，如果不加密则为任意值
     * @returns 文件块数据
     */
    async DownloadPublic(ctx, id, iv, password) {

        const asset = await this.ReadAsset(ctx, id);
        if (asset.class != 'public') {
            throw new Error(`The asset ${id} is not public`);
        }
        let Kp = null;
        if (asset.ne == 'true') {
            // 对文件地址解密
            Kp = aes_decrypt(iv, asset.Up, password);
        } else {
            Kp = asset.Up;
        }
        return Kp;
    }

    /**
     * 机密保密型文件上传
     * @param {*} ctx 上下文对象
     * @param {*} fp 文件数据
     */
    async UploadPrivate(ctx, hashs, bids, id) {

        // 将blocks、Bs、bids从字符串状态恢复过来
        hashs = JSON.parse(hashs.toString());
        bids = JSON.parse(bids.toString());

        // 上传文件块，按顺序上传，计算相应的时间戳
        let private_info = [];
        let public_info = [];
        for (var i = 0; i < hashs.length; i++) {

            // 上传文件块
            const hash = hashs[i];
            // 文件块的唯一标识符
            const bid = bids[i];

            private_info.push({
                BID: bid
            });

            public_info.push({
                ID: bid,
                hash: hash,
                class: 'private'
            });
        }

        // 更新世界状态
        for (var i = 0; i < public_info.length; i++) {
            await ctx.stub.putState(public_info[i].ID, Buffer.from(stringify(sortKeysRecursive(public_info[i]))));
        }

        
        // 更新私有集合
        ctx.stub.putPrivateData('collectionPrivate', id, Buffer.from(stringify(sortKeysRecursive(private_info))));

        return true;
    }

    /**
     * 机密保密型文件下载
     * @param {*} ctx 上下文对象
     * @param {*} id 文件块的唯一识别码
     * @returns 文件块数据
     */
    async DownloadPrivate(ctx, id) {
        var ret = [];
        // 根据id查询私有集合
        const private_data = await ctx.stub.getPrivateData('collectionPrivate', id);
        if (!private_data || private_data.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        const private_info = JSON.parse(private_data.toString());
        for (var i = 0; i < private_info.length; i++) {
            var bid = private_info[i].BID;
            // 根据bid查询世界状态
            const asset = await this.ReadAsset(ctx, bid);
            if (asset.class != 'private') {
                throw new Error(`The asset ${bid} is not private`);
            }
            // 返回文件哈希
            ret.push(asset.hash);
        }
        return ret;
    }

    async UploadPrivate2(ctx, id, hash) {

        const exists = await this.AssetExists(ctx, id);
        if (exists) {
            return true;
        }

        const asset = {
            ID: id,
            class: 'private',
            hash: hash,
        };
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(id, Buffer.from(stringify(sortKeysRecursive(asset))));
        return true;
    }

    async DownloadPrivate2(ctx, id) {

        const asset = await this.ReadAsset(ctx, id);
        if (asset.class != 'private') {
            throw new Error(`The asset ${id} is not private`);
        }
        return asset.hash;
    }

    // AssetExists returns true when asset with given ID exists in world state.
    async AssetExists(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        return assetJSON && assetJSON.length > 0;
    }

    // ReadAsset returns the asset stored in the world state with given id.
    // 这里我实现的和官方示例代码有一丝不同，我返回了json格式的数据
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id); // get the asset from chaincode state
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return JSON.parse(assetJSON.toString());
    }
}

// AES加密函数
function aes_encrypt(text, password) {
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
function aes_decrypt(iv, encryptedText, password) {
    const key = crypto.scryptSync(password, 'salt', 32); // 通过密码生成32字节的密钥
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, Buffer.from(iv, 'hex')); // 创建解密器，传入初始化向量

    let decrypted = decipher.update(encryptedText, 'hex', 'utf8'); // 解密输入的密文
    decrypted += decipher.final('utf8');

    return decrypted; // 返回解密后的明文
}

function timestamp() {
    return new Date().getTime().toString();
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function randomDelaySync() {
    const delay = Math.floor(Math.random() * 11) + 10; // 随机生成10-20之间的整数
    const startTime = new Date().getTime(); // 获取当前时间
    while (new Date().getTime() - startTime < delay) { } // 等待指定的时间
}

/**
 * 展示信息
 * @param {JSON} info 
 */
function showInfo(info) {
    console.log(info);
}

module.exports = IpfsSaveShare;