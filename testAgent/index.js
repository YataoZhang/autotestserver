const cypress = require('cypress');
const path = require('path');
const marge = require('mochawesome-report-generator');
const { merge } = require('mochawesome-merge');
const fg = require('fast-glob');

const convertRecordJsonToFile = require('./src/recorder');
const utils = require('./src/utils');
const detect = require('./src/detect');

const similarityRate = 0.9;
/**
 * 运行所有待办事项测试用例
 * @param {string} host 测试域名
 * @param {string} baseDir 项目基础目录
 * @param {string} taskid 任务id
 */
async function goAndRun(host, baseDir, taskid) {
    const dir = path.join(baseDir, utils.E2E_SPECS_DIR_NAME);
    const specFile = path.join(dir, taskid || '', '**/*.spec.cy.js');
    const options = utils.getDefaultCypressOptions(host, baseDir, taskid);

    const runsResults = await cypress.run({
        ...options,
        spec: specFile
    });

    // {
    //     status: 'failed',
    //     failures: 1,
    //     message: 'Could not find Cypress test run results'
    //   }
    if (runsResults.status === 'failed') {
        throw new Error(runsResults.message);
    }
    const [html] = await merge({
        files: [path.join(dir, taskid || '', 'reporter/*-report.json')]
    }).then((report) =>
        marge.create(report, {
            ...options.reporterOptions
        })
    );

    const reporterHtml = path.relative(dir, html);

    const summaryP = runsResults.runs.map(async (run) => {
        const failScreenshots = {};
        if (run.screenshots.length) {
            run.screenshots.forEach((screenshot) => {
                const u = path.relative(dir, screenshot.path);
                const titleTrain = path
                    .basename(u)
                    .replace(/\s\(failed\)\.[^\.]+$/, '');
                failScreenshots[titleTrain] = u;
            });
        }
        const fss = Object.keys(failScreenshots);
        run.tests.forEach((test) => {
            if (test.state !== 'failed') {
                return;
            }
            const key = test.title.join(' -- ').replace(/(Tests):/, '$1');
            test.screenshot = fss
                .filter((item) => item.indexOf(key) === 0)
                .map((n) => {
                    return failScreenshots[n];
                });
        });

        return {
            spec: run.spec.name,
            stats: run.stats,
            tests: run.tests
        };
    });

    const summary = await Promise.all(summaryP);

    return {
        summary,
        report: {
            html: reporterHtml,
            json: reporterHtml.replace(/\.html$/, '.json')
        }
    };
}

/**
 * 执行业务核心case检查
 * @param {Object} options 参数
 */
module.exports.invoke = async function (options) {
    // {"host":"Http://asdf.com","cookies":"dsfsdfds","compareHost":"Http://asdf.com","enableCompare":true}
    const { planName, baseDir, taskid, info = {}, records = [] } = options;

    if (!records.length) {
        throw new Error('[ERR_NO_CORE_STEPS] not core spec steps found.');
    }

    const workDir = path.join(utils.E2E_SPECS_DIR_NAME, taskid || '');

    await utils.prepareConfFile(baseDir);

    async function makeSpecsFiles(planName, records) {
        const specName = planName.replace(/(\s|\/)/g, '_');

        if (info.enableCompare) {
            // 对照组 外网环境
            const cgFile = path.join(workDir, `specs/${specName}-CG.spec.cy.js`);
            const egFile = path.join(workDir, `specs/${specName}-EG.spec.cy.js`);

            const ps = [
                convertRecordJsonToFile(planName, records, {
                    filePath: cgFile,
                    type: 'CONTROL_GROUP',
                    info
                })
            ];
            ps.push(
                convertRecordJsonToFile(planName, records, {
                    filePath: egFile,
                    type: 'EXPERIMENTAL_GROUP',
                    info
                })
            );
            return Promise.all(ps);
        }

        const specFile = path.join(workDir, `specs/${specName}.spec.cy.js`);
        return convertRecordJsonToFile(planName, records, {
            filePath: specFile,
            info
        });
    }

    await makeSpecsFiles(planName, records);

    const start = Date.now();
    // 执行e2e测试
    const testResult = await goAndRun(info.host, baseDir, taskid);

    // 获取对照组和实验组的图片
    const screenshots = path.join(workDir, 'screenshots');
    const gourpImgs = await fg(path.join(screenshots, '**/(cg|eg)-*.png'));

    const detections = {
        total: 0,
        success: 0,
        failure: 0,
        page: ''
    };
    if (gourpImgs.length) {
        // 对比图片
        const detectionsInfo = await detect(gourpImgs);

        // TODO 根据图片对比的结果，生成html内容，并返回html文件的路径

        const successCounts = detectionsInfo.list.filter((item) => {
            return item.rate > similarityRate;
        }).length;

        detections.total = detectionsInfo.list.length;
        detections.success = successCounts;
        detections.failure = detections.total - detections.success;

        if (detectionsInfo.list.length) {
            const detectionPage = await utils.makeResultPage(
                {
                    title: planName,
                    time: detectionsInfo.time,
                    duration: Math.floor((Date.now() - start) / 1000),
                    group: {
                        list: detectionsInfo.list,
                        successes: successCounts,
                        failures: detectionsInfo.list.length - successCounts
                    },
                    threshold: similarityRate
                },
                planName.replace(/(\s|\/)/g, '_'),
                workDir
            );
            detections.page = path.relative(
                path.join(baseDir, utils.E2E_SPECS_DIR_NAME),
                detectionPage
            );
        }
    }

    return {
        ...testResult,
        detections
    };
};
