/* eslint valid-jsdoc: "off" */
const path = require('node:path');
const os = require('node:os');
/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = (appInfo) => {
    /**
     * built-in config
     * @type {Egg.EggAppConfig}
     **/
    const config = (exports = {});

    // use for cookie sign key, should change to your own and keep security
    config.keys = appInfo.name + '_1710236635469_4676';

    // add your middleware config here
    config.middleware = [];

    // add your user config here
    const userConfig = {
        myAppName: 'autoTestServer',
        static: {
            prefix: '/public/',
            dir: path.join(appInfo.baseDir, '.e2e')
        },
        session: {
            renew: true,
            key: 'ATUSS',
            maxAge: 24 * 3600 * 1000, // 1 天
            httpOnly: true,
            encrypt: true
        },
        security: {
            csrf: {
                enable: false
            }
        },
        multipart: {
            fileExtensions: ['.json'],
            fieldNameSize: 100,
            fieldSize: '1gb',
            fields: 10,
            fileSize: '300mb',
            files: 10,
            mode: 'file',
            tmpdir: path.join(os.tmpdir(), 'egg-multipart-tmp', appInfo.name),
            cleanSchedule: {
                cron: '0 30 4 * * *',
                disable: false
            }
        },
        passwordSalt: '3bbfde0d609abf3a4a08ac804b6a6dc5',
        middleware: ['userCheck', 'errorHandler'],
        errorHandler: {
            match: '/api/v1'
        },
        userCheck: {
            match: /^\/api\/v1\/(teams|plans|members|cases|history)\b/
        }
    };

    return {
        ...config,
        ...userConfig
    };
};
