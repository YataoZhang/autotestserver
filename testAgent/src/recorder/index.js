const fs = require('fs-extra');
const cypressStringifyChromeRecording = require('./extension');

async function stringifiedContent(recordingContent, type, options) {
    let content = '';
    if (typeof recordingContent !== 'string') {
        content = JSON.stringify(recordingContent);
    } else {
        content = recordingContent;
    }
    const stringifiedContent = await cypressStringifyChromeRecording(content, type, options);

    return stringifiedContent;
}

/**
 * 将录制json转换为spec文件
 * @param {string} scope 测试计划名称
 * @param {string} records 录制json string
 * @param {Object} param2 配置参数
 * @param {string} param2.filePath spec文件写入路径
 * @param {string} param2.type 是否为比较组
 * @param {Object} param2.info 额外信息
 * @param {Object} param2.info.user 用户信息
 * @param {string} param2.info.cookies cookie信息
 * @param {string} param2.info.host 域名
 * @param {string} param2.info.compareHost 域名
 * @return {Promise<undefined>}
 */
module.exports = async function convertRecordJsonToFile(
    scope,
    records,
    { filePath, type = '', info: { user, cookies, host, compareHost } }
) {
    let specsbody = '';
    await records.reduce((l, recordingContent) => {
        return l.then(async () => {
            const content = await stringifiedContent(recordingContent, type, {
                user,
                cookies,
                host: type === 'EXPERIMENTAL_GROUP' ? compareHost : host
            });
            specsbody += '\n' + content;
        });
    }, Promise.resolve());

    const loginFragement = user ? `cy.loginViaUI("${user.username}", "${user.password}");` : '';
    const beforeLogin = `beforeEach(() => {
        // login handler fragement
       ${loginFragement}
    });`;
    const specsContent = `
describe("${scope}", () => {
    ${user ? beforeLogin : ''}
    ${specsbody}
});
`;

    return fs.outputFile(filePath, specsContent);
};
