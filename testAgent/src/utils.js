const { join, resolve } = require('node:path');
const fs = require('fs-extra');
const template = require('lodash/template.js');

const modulePool = {};
const cypressConfFile = 'cypress.config.mjs';
const cypressConfDir = 'cypressConf';
const E2E_SPECS_DIR_NAME = '.e2e';

function getDefaultCypressConfgPath() {
    return resolve(__dirname, `../${cypressConfDir}`);
}

module.exports.E2E_SPECS_DIR_NAME = E2E_SPECS_DIR_NAME;
module.exports.getDefaultCypressConfgPath = getDefaultCypressConfgPath;

module.exports.requireEsModule = (moduleName) => {
    if (!modulePool[moduleName]) {
        modulePool[moduleName] = import(moduleName);
    }
    return modulePool[moduleName];
};

module.exports.prepareConfFile = async function (baseDir) {
    const confFile = getDefaultCypressConfgPath();
    const temDir = join(baseDir, E2E_SPECS_DIR_NAME);
    const exists = await fs.exists(join(temDir, confFile));
    if (exists) {
        return;
    }
    await fs.copy(confFile, temDir);
};

module.exports.getDefaultCypressOptions = function (host, project, taskid) {
    const dir = join(E2E_SPECS_DIR_NAME, taskid || '');
    const config = {
        spec: undefined,
        configFile: join(E2E_SPECS_DIR_NAME, cypressConfFile),
        headless: false,
        project,
        quiet: !!taskid,
        exit: true,
        reporter: 'mochawesome',
        reporterOptions: {
            reportDir: `${dir}/reporter`,
            cdn: true,
            reportFilename: '[status]_[datetime]-[name]-report',
            timestamp: 'longDate',
            overwrite: true,
            html: false,
            json: true
        },
        env: {},
        config: {
            downloadsFolder: `${dir}/downloads`,
            fixturesFolder: `${dir}/fixtures`,
            screenshotsFolder: `${dir}/screenshots`,
            videosFolder: `${dir}/videos`,
            supportFile: join(E2E_SPECS_DIR_NAME, 'support/e2e.js'),
            userAgent:
                'Mozilla/5.0 uitestagent/1.0(NoGuide) Cypress/13.2.0 Chrome/114.0.5735.289 Electron/25.8.0 Safari/537.36',
            video: false,
            e2e: {
                // baseUrl: host,
                specPattern: `${dir}/**/*.cy.{js,jsx,ts,tsx}`
            }
        }
    };

    if (host) {
        config.config.e2e.baseUrl = host;
    }

    return config;
};

module.exports.makeResultPage = async function (
    detectionResult,
    title,
    workDir
) {
    const content = await fs.readFile(
        join(__dirname, '../template/coreReporter.html')
    );
    const html = template(content)(detectionResult);
    const htmlPath = `/reporter/coreCase_${title}.html`;
    const fileDist = join(workDir, htmlPath);
    await fs.outputFile(fileDist, html);
    return fileDist;
};
