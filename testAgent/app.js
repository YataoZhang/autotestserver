// app.js

const LIST = new Map();
const START_LIST = new Map();

module.exports = (app) => {
    app.messenger.on('startTestAgentResult', (content) => {
        const { taskid, status } = content;
        if (status === 'completed' || status === 'failed') {
            LIST.set(taskid, content);
            return;
        }
        if (!START_LIST.has(taskid)) {
            return;
        }
        const st = START_LIST.get(taskid);
        START_LIST.delete(taskid);

        st.resolve({ status });
    });

    app.startTestAgent = (options) => {
        app.messenger.sendToAgent('startTestAgent', options);

        return new Promise((resolve) => {
            START_LIST.set(options.taskid, {
                resolve
            });
        });
    };

    app.messenger.on('checkTestStatusResult', ({ taskid, status }) => {
        const promise = LIST.get(taskid);
        LIST.delete(taskid);

        promise.resolve({ status, data: {} });
    });

    app.checkTestStatus = async (taskid) => {
        if (LIST.has(taskid)) {
            const { status, data } = LIST.get(taskid);
            LIST.delete(taskid);
            return { status, data };
        }

        return new Promise((resolve) => {
            app.messenger.sendToAgent('checkTestStatus', taskid);
            LIST.set(taskid, { resolve });
        });
    };

    app.messenger.on('startTestInspectResult', (content) => {
        const { taskid, status } = content;
        if (status === 'completed' || status === 'failed') {
            LIST.set(taskid, content);
            return;
        }
        if (!START_LIST.has(taskid)) {
            return;
        }
        const st = START_LIST.get(taskid);
        START_LIST.delete(taskid);

        st.resolve({ status });
    });
};
