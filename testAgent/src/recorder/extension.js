const { requireEsModule } = require('../utils');
const nodeUrl = require('node:url');

// const DASHBOARD_URL = 'http://dev.autotest.com:8801';

function formatAsJSLiteral(value) {
    return JSON.stringify(value);
}

function filterArrayByString(selectors, value) {
    return selectors.filter((selector) => {
        return value === 'aria/'
            ? !selector[0].includes(value)
            : selector[0].includes(value);
    });
}

function handleSelectors(selectors, flow) {
    // Remove Aria selectors in favor of DOM selectors
    const nonAriaSelectors = filterArrayByString(selectors, 'aria/');
    let preferredSelector;

    // Give preference to user-specified selectors
    if (flow?.selectorAttribute) {
        preferredSelector = filterArrayByString(
            nonAriaSelectors,
            flow.selectorAttribute
        );
    }
    let selector = '';
    if (preferredSelector && preferredSelector[0]) {
        selector = `cy.get(${formatAsJSLiteral(preferredSelector[0][0])})`;
    } else {
        selector = `cy.get(${formatAsJSLiteral(nonAriaSelectors[0][0])})`;
    }
    return selector + '.eq(0)';
}

async function getStringifyExtensionClass(type) {
    const { StepType } = await requireEsModule('@puppeteer/replay');
    const { CypressStringifyExtension } = await requireEsModule('@cypress/chrome-recorder/dist/CypressStringifyExtension.js');
    const compareType = type;

    class StringifyExtension extends CypressStringifyExtension {
        constructor(options) {
            super();
            // this.user = options ? options.user : null;
            this.cookies = options ? options.cookies : '';
            this.host = options ? options.host : '';
        }

        index = 1;

        async beforeAllSteps(out, flow) {
            out.appendLine(`it(${formatAsJSLiteral(`Tests: ${flow.title}`)}, () => {`);
            out.startBlock();
        }

        async afterAllSteps(out) {
            out.endBlock().appendLine('});');
        }

        async stringifyStep(out, step, flow) {
            const group = compareType ? (compareType === 'CONTROL_GROUP' ? 'cg' : 'eg') : '';
            const isAction = step.type !== StepType.Navigate && step.type !== StepType.SetViewport;
            const title = flow.title.replace(/\/|\s|:/g, '-');

            if (isAction) {
                out.appendLine(`cy.screenshot('${group}-${title}-${this.index++}', {capture: "viewport"});`);
            }

            if (step.type === StepType.Navigate) {
                await this.#appendNavigationStep(out, step, flow);
            } else if (step.type === StepType.Click) {
                this.#appendClickStep(out, step, flow);
            } else if (step.type === StepType.Change) {
                this.#appendChangeStep(out, step, flow);
            } else if (step.type === StepType.Hover) {
                this.#appendHoverStep(out, step, flow);
            } else if (step.type === StepType.WaitForExpression) {
                this.#appendWaitForExpressionStep(out, step);
            } else if (step.type === StepType.WaitForElement) {
                this.#appendWaitForElementStep(out, step, flow);
            } else {
                await super.stringifyStep(out, step, flow);
            }

            if (step.type !== StepType.SetViewport) {
                out.appendLine('cy.wait(1000);');
            }

            // 在最后一个步骤之后再次截图
            if (flow.steps[flow.steps.length - 1] === step) {
                out.appendLine(`cy.screenshot('${group}-${title}-${++this.index}', {capture: "viewport"});`);
            }
        }

        #appendFlowLevelFlag(url) {
            const urlInfo = new nodeUrl.URL(url);

            return {
                origin: urlInfo.origin,
                fullURL: nodeUrl.format(urlInfo),
                pathname: urlInfo.pathname,
                pathnameWithQueryAndHash: urlInfo.pathname + urlInfo.search + urlInfo.hash
            };
        }

        async #appendNavigationStep(out, step) {
            const urlData = this.#appendFlowLevelFlag(step.url);
            const cookies = this.cookies || '';
            const url = formatAsJSLiteral((this.host || urlData.origin) + urlData.pathnameWithQueryAndHash);
            out.appendLine(`cy.visit(${url}${cookies.length ? `, {
                headers: {
                    Cookie: ${JSON.stringify(cookies)}
                }
            }` : ''});`);
        }
        async #appendClickStep(out, step, flow) {
            const cySelector = handleSelectors(step.selectors, flow);
            const hasRightClick = step.button && step.button === 'secondary';

            if (cySelector) {
                hasRightClick
                    ? out.appendLine(`${cySelector}.rightclick({force: true});`)
                    : out.appendLine(`${cySelector}.click({force: true});`);
            } else {
                console.log(
                    `Warning: The click on ${step.selectors[0]} was not able to be exported to Cypress. Please adjust your selectors and try again.`
                );
            }

            if (step.assertedEvents) {
                step.assertedEvents.forEach((event) => {
                    if (event.type === 'navigation') {
                        out.appendLine(`cy.location("href").should("eq", "${event.url}");`);
                    }
                });
            }
        }
        async #appendChangeStep(out, step, flow) {
            const cySelector = handleSelectors(step.selectors, flow);

            if (cySelector) {
                out.appendLine(`${cySelector}.type(${formatAsJSLiteral(step.value)}, { force: true });`);
            }
        }
        async #appendHoverStep(out, step, flow) {
            const cySelector = handleSelectors(step.selectors, flow);

            if (cySelector) {
                out.appendLine(`${cySelector}.trigger("mouseover", { force: true });`);
            }
        }
        async #appendWaitForExpressionStep(out, step) {
            out.appendLine(`cy.wait(${step.expression});`);
        }
        async #appendWaitForElementStep(out, step) {
            // const group = this.groupType === GROUP_TYPE.CONTROL_GROUP ? 'cg' : 'eg';
            // const title = flow.title.replace(/\//g, '');
            // const picturePath = `${title}-${this.index}`;
            if (step.attributes?.action) {
                out.appendLine(`cy.${step.attributes?.query}('${step.selectors[0]}').${step.attributes?.action}();`);
            } else {
                // 断言
                out.appendLine(`cy.${step.attributes?.query}('${step.selectors[0]}')${step.attributes?.query === 'contains' ? '.scrollIntoView()' : ''}.${step.attributes?.assertion}('${step.attributes?.chainer}','${step.attributes?.value}');`);
            }
        }

    }

    return StringifyExtension;
}


module.exports = async function cypressStringifyChromeRecording(recording, type, options) {
    const { parse, stringify } = await requireEsModule('@puppeteer/replay');
    const StringifyExtension = await getStringifyExtensionClass(type);

    function parseRecordingContent(recordingContent) {
        let content = null;
        if (typeof recordingContent === 'string') {
            content = JSON.parse(recordingContent);
        } else {
            content = recordingContent;
        }
        return Object.assign({}, parse(content), { id: content.id });
    }

    // If no recordings found, log message and return.
    if (recording.length === 0) {
        console.log(
            'No recordings found. Please create and upload one before trying again.'
        );
        return;
    }

    const parsedRecording = parseRecordingContent(recording);
    const cypressStringified = await stringify(parsedRecording, {
        extension: new StringifyExtension(options)
    });
    return cypressStringified;
};
