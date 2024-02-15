const crypto = require('crypto');

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

// 测试
const password = 'mysecretkey'; // 用于生成密钥的密码
const text = 'hello world'; // 要加密的明文

const encrypted = aes_encrypt(text, password); // 加密
console.log('加密后的数据：', encrypted);

const decrypted = aes_decrypt(encrypted.iv, encrypted.encryptedText, password); // 解密
console.log('解密后的数据：', decrypted);
