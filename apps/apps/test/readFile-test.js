const readline = require('readline-sync');
const fs = require('fs');

var name = readline.question("请输入文件名 ");
var fp = fs.readFileSync(name);

console.log(fp);