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

for (let i = 0; i < 10; i++) {

    randomDelaySync();
    console.log(timestamp());
}