const { v4: uuidv4 } = require('uuid');

var info = {};

// 生成一个随机的UUID
info['uuid'] = uuidv4();
console.log(info);