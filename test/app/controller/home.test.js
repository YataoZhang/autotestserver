const { strict: assert } = require('node:assert');
// const path = require('node:path');
// const { statSync } = require('node:fs');
// const { app } = require('egg-mock/bootstrap');
const testAgent = require('../../../testAgent');


describe('test test agent', async () => {
    const record = {
        title: 'Recording 2023/10/16 at 19:04:17',
        steps: [
            {
                type: 'setViewport',
                width: 1920,
                height: 944,
                deviceScaleFactor: 1,
                isMobile: false,
                hasTouch: false,
                isLandscape: false
            },
            {
                type: 'navigate',
                url: 'https://pan.baidu.com/aipan/aitools',
                assertedEvents: [
                    {
                        type: 'navigation',
                        url: 'https://pan.baidu.com/aipan/aitools',
                        title: '百度网盘AI工具箱'
                    }
                ]
            },
            {
                type: 'click',
                target: 'main',
                selectors: [
                    [
                        'div.aiTools-aside > div:nth-of-type(6)'
                    ],
                    [
                        'xpath///*[@id=\'app\']/div[2]/div[1]/div[1]/div[6]'
                    ],
                    [
                        'pierce/div.aiTools-aside > div:nth-of-type(6)'
                    ]
                ],
                offsetY: 18,
                offsetX: 92
            }
        ]
    };

    it('invoke test', async () => {
        // planName, baseDir, taskid, info = {}, records = []
        const result = await testAgent.invoke({
            planName: '新百度网盘首页',
            baseDir: process.cwd(),
            taskid: 'asdjfhqwkej',
            info: {
                host: 'https://pan.baidu.com',
                cookies: 'test=asdfasdfasdf',
                compareHost: 'https://pan.baidu.com',
                enableCompare: true
            },
            records: [record]
        });

        console.log(result);

        assert(true);
    });
});

// describe('test/app/controller/home.test.js', () => {
//     it('should assert', async () => {
//         const pkg = require('../../../package.json');
//         assert(app.config.keys.startsWith(pkg.name));
//     });

//     it('should typings exists', async () => {
//         const typings = path.join(__dirname, '../../../typings');
//         assert(statSync(typings));
//     });

//     it('should GET /', async () => {
//         return app.httpRequest()
//             .get('/')
//             .expect('hi, egg')
//             .expect(200);
//     });
// });

