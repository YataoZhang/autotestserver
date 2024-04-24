// ***********************************************************
// This example support/e2e.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************
import './commands';
import addContext from 'mochawesome/addContext';
const E2E_SPECS_DIR_NAME = '.e2e';

function getTaskId(url) {
    const start = `${E2E_SPECS_DIR_NAME}/`;
    const end = '/specs/';
    const index = url.indexOf(start);
    const endIndex = url.indexOf(end);
    if (index !== -1 && endIndex !== -1) {
        return url.substring(index + start.length, endIndex);
    }
}

Cypress.on('test:after:run', (test, runnable) => {
    if (test.state === 'failed') {
        const suffix =
            runnable?.hookName !== undefined ? ' -- before each hook' : '';
        const screenshotFileName = `${runnable?.parent?.title} -- ${test.title + suffix
            } (failed).png`;
        let url = `/public/${getTaskId(
            test?.invocationDetails?.fileUrl
        )}/screenshots/${Cypress.spec.name}/${encodeURIComponent(
            screenshotFileName.replace(/(:|\/)/g, '')
        )}`;
        addContext({ test }, url);
    }

    if (
        test.invocationDetails?.relativeFile.includes('spec') &&
        test.state === 'passed'
    ) {
        const match = test.body.match(/cy\.screenshot\('([^']*)'/g);
        const matchList = match?.map((val) =>
            val.replace(/cy\.screenshot\('|\'/g, '')
        );
        matchList?.forEach((match) => {
            let url = `/public/${getTaskId(
                test?.invocationDetails?.fileUrl
            )}/screenshots/${Cypress.spec.name}/${encodeURIComponent(
                match
            )}.png`;
            addContext({ test }, url);
        });
    }
});

Cypress.on('uncaught:exception', (err, runnable) => {
    // returning false here prevents Cypress from
    // failing the test
    return false;
});
