const fs = require('fs-extra');
const http = require('http');
const { readFile } = require('node:fs/promises');

const KIRIN_NAME = 'zhangyatao';
const KIRIN_TOKEN = '8a86666f378d4aa4af6e3fbfb5a76d9c';

async function imageToBase64(picPath) {
    if (!picPath) {
        return '';
    }
    const isExists = await fs.exists(picPath);
    if (!isExists) {
        return '';
    }
    const contents = await readFile(picPath, { encoding: 'base64' });
    return contents;
}

async function getResultFromKirin(param) {
    if (!param.image1 || !param.image2) {
        throw new Error(
            '[ERR_MISSING_IMAGE_BASE64] missing images base64 data.'
        );
    }
    const data = JSON.stringify({
        parameter: JSON.stringify(param),
        name: KIRIN_NAME,
        token: KIRIN_TOKEN
    });
    const options = {
        hostname: 'kirin.baidu-int.com',
        port: 80,
        path: '/api/tool/210833',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };
    const p = new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            res.setEncoding('utf8');
            const chunks = [];
            res.on('data', (chunk) => {
                chunks.push(chunk);
            });
            res.on('end', () => {
                let json = {};
                try {
                    json = JSON.parse(chunks.join(''));
                    resolve(json);
                } catch (ex) {
                    reject(ex);
                }
            });
        });
        req.on('error', (e) => {
            reject(e);
        });
        req.write(data);
        req.end();
    });
    const response = await p;
    if (!response.result) {
        throw new Error(`[ERR_NO_RESULT] ${response.message}`);
    }
    return JSON.parse(response.result.response) || { data: 0 };
}

async function detectionImages(img1Path, img2Path) {
    const [img1, img2] = await Promise.all([
        imageToBase64(img1Path),
        imageToBase64(img2Path)
    ]);
    if (!img1 || !img2) {
        return {
            img1,
            img2,
            rate: 0
        };
    }
    const param = {
        app_name: 'image_similarity_phash',
        image_type: 'base64',
        image1: img1,
        image2: img2
    };

    const checkResult = await getResultFromKirin(param);
    return {
        img1,
        img2,
        rate: checkResult.data
    };
}

module.exports = async function detect(imgs) {
    if (!imgs.length) {
        throw new Error(
            '[ERR_NO_IMAGES_FOUNED_FOR_DETECT] cannot found any images for detect.'
        );
    }

    const imgBatchs = {};
    imgs.forEach((img) => {
        const [, type, key] = img.match(/\/(eg|cg)-(.+)\.png$/) || [];
        if (!imgBatchs[key]) {
            imgBatchs[key] = {
                action: key
            };
        }
        imgBatchs[key][type] = img;
    });

    const list = [];
    await Object.values(imgBatchs).reduce((l, r) => {
        return l.then(async () => {
            const data = await detectionImages(r.eg, r.cg);
            list.push({
                ...data,
                action: r.action
            });
        });
    }, Promise.resolve());

    return {
        time: new Date().toLocaleString(),
        list
    };
};
