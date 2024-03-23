// agent.js
// const uitestagent = require('@baidu/uitestagent');
const CUP_COUNT = require('os').cpus().length;
const testAgent = require('./testAgent');
const RUNNING_POOL = new Map();
const PENDING_QUEUE = new Map();

module.exports = (agent) => {
    function runNext() {
        if (!PENDING_QUEUE.size) {
            return;
        }
        const iterator = PENDING_QUEUE.keys();
        const taskid = iterator.next().value;
        const options = PENDING_QUEUE.get(taskid);

        PENDING_QUEUE.delete(taskid);
        testGoGoGo(options);
    }

    function testGoGoGo(options) {
        agent.logger.info('testGOGO:' + JSON.stringify(options));
        const promise = testAgent
            .invoke({
                ...options,
                baseDir: agent.baseDir
            })
            .then((data) => {
                agent.messenger.sendToApp('startTestAgentResult', {
                    taskid: options.taskid,
                    status: 'completed',
                    data
                });
            })
            .catch((ex) => {
                agent.messenger.sendToApp('startTestAgentResult', {
                    taskid: options.taskid,
                    status: 'failed',
                    data: {
                        errmsg: ex.toString()
                    }
                });
            })
            .finally(() => {
                RUNNING_POOL.delete(options.taskid);
                runNext();
            });

        RUNNING_POOL.set(options.taskid, promise);
    }

    agent.messenger.on('startTestAgent', (options) => {
        const taskid = options.taskid;
        if (RUNNING_POOL.has(taskid)) {
            agent.messenger.sendToApp('startTestAgentResult', {
                taskid,
                status: 'running'
            });
            return;
        }

        if (PENDING_QUEUE.has(taskid) || RUNNING_POOL.size > CUP_COUNT) {
            PENDING_QUEUE.set(taskid, { ...options });
            agent.messenger.sendToApp('startTestAgentResult', {
                taskid,
                status: 'pending'
            });
            return;
        }
        agent.messenger.sendToApp('startTestAgentResult', {
            taskid,
            status: 'start'
        });
        testGoGoGo(options);
    });

    agent.messenger.on('checkTestStatus', (taskid) => {
        if (RUNNING_POOL.has(taskid)) {
            agent.messenger.sendToApp('checkTestStatusResult', {
                taskid,
                status: 'running'
            });
            return;
        }
        if (PENDING_QUEUE.has(taskid)) {
            agent.messenger.sendToApp('checkTestStatusResult', {
                taskid,
                status: 'pending'
            });
            return;
        }
        agent.messenger.sendToApp('checkTestStatusResult', {
            taskid,
            status: 'not_exists'
        });
    });
};
