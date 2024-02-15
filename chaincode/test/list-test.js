const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');

x = [
    {
        "id": 1,
        "name": "张三",
    }, 
    {
        "id": 2,
        "name": "李四",
    }
]
b = Buffer.from(JSON.stringify(x));

test = JSON.parse(b.toString());
test.forEach(element => {
    console.log(element);
});