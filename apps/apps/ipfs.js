const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
var crypto = require('crypto');
const path = require('path');
const readline = require('readline-sync');
const { v4: uuidv4 } = require('uuid');
const JWT = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJkODc3OGRmOS1iMmVkLTQ4NmYtODFmYy0zNzRmYzAzNDJlMGIiLCJlbWFpbCI6InhtejYxNzc2QG9tZWllLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJwaW5fcG9saWN5Ijp7InJlZ2lvbnMiOlt7ImlkIjoiRlJBMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfSx7ImlkIjoiTllDMSIsImRlc2lyZWRSZXBsaWNhdGlvbkNvdW50IjoxfV0sInZlcnNpb24iOjF9LCJtZmFfZW5hYmxlZCI6ZmFsc2UsInN0YXR1cyI6IkFDVElWRSJ9LCJhdXRoZW50aWNhdGlvblR5cGUiOiJzY29wZWRLZXkiLCJzY29wZWRLZXlLZXkiOiI3YjAxNTFlYzRmNjJhZjQ5ODM5ZCIsInNjb3BlZEtleVNlY3JldCI6Ijc2OTE1NDY4MmM3OThhY2RkZmYwNzZiOGZlMGRlY2ZlMjAzNDcwZWZhZDM2Y2RkZTQ2OWIxNmQxZGRjMzQzNjEiLCJpYXQiOjE2OTkwODcxMTd9.k6NBaHMN7aZ1r0PNZb7FVIbgGaWpFTfv5-tg5cfoopw"

function H(data) {
  const sha256 = crypto.createHash('sha256');
  sha256.update(data);
  return sha256.digest('hex');
}

/**
 * 上传文件块
 * @param {*} fileBlock 文件块
 * @returns 如果上传成功，返回文件块的哈希值，否则返回null
 */
const uploadFileBlock = async (fileBlock) => {

  const formData = new FormData();

  formData.append('file', fileBlock);

  // 生成一个uuid字符串
  const uuid = uuidv4();

  const pinataMetadata = JSON.stringify({
    name: uuid,
  });
  formData.append('pinataMetadata', pinataMetadata);

  const pinataOptions = JSON.stringify({
    cidVersion: 0,
  })
  formData.append('pinataOptions', pinataOptions);

  try {
    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", formData, {
      maxBodyLength: "Infinity",
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formData._boundary}`,
        'Authorization': `Bearer ${JWT}`
      }
    });
    // console.log(res.data);
    // res.data是json格式的数据，其中的IpfsHash字段是文件块的哈希值，返回哈希值
    return res.data.IpfsHash;
  } catch (error) {
    console.log(error);
  }
}

/**
 * 下载文件块
 * @param {String} hash 文件块的哈希值
 * @returns 如果下载成功，返回文件块数据，否则返回null
 */
const downloadFileBlock = async (hash) => {

  var fileBlock = await axios({
    method: 'get',
    url: `https://ipfs.io/ipfs/${hash}`,
    responseType: 'text'
  })

  return fileBlock;
}

const downloadFileBlockStream = async (hash) => {

  var fileBlock = await axios({
    method: 'get',
    url: `https://ipfs.io/ipfs/${hash}`,
    responseType: 'stream'
  })

  return fileBlock;
}

// var filename = readline.question("请输入要上传的文件路径：");
// var fp = fs.createReadStream(filename);

// uploadFileBlock(fp).then((hash) => {
//   console.log(hash);
// });

module.exports = {
  uploadFileBlock,
  downloadFileBlock,
  downloadFileBlockStream
}