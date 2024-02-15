const fs = require('fs');
const path = require('path');

const uploadDir = './file/upload';
// 1KB、2KB、4KB、8KB、16KB、32KB、64KB、128KB、256KB、512KB、1MB、2MB、4MB、8MB
const fileSizes = [1024, 2048, 4096, 8192, 16384, 32768, 65536, 131072, 262144, 524288, 1048576, 2097152, 4194304, 8388608];

// Generate a file with random content and size between minSize and maxSize (in bytes)
function generateFile(fileName, fileSize) {
    const buffer = Buffer.alloc(fileSize);
    fs.writeFileSync(fileName, buffer);
}

// Create the upload directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// 遍历fileSizes数组，生成对应大小的文件
for (let i = 0; i < fileSizes.length; i++) {
    const fileSize = fileSizes[i];
    const fileName = path.join(uploadDir, `${fileSize}.txt`);
    generateFile(fileName, fileSize);
}
