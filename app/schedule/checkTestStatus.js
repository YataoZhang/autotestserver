const Subscription = require('egg').Subscription;

class checkTestStatus extends Subscription {

    static get schedule() {
        return {
            type: 'worker',
            cron: '30 0 * * * *',
            // interval: '1h',
            immediate: true
        };
    }

    async subscribe() {
        const list = this.app.taskWaitingList;
        if (!list.length) {
            return;
        }

        const deleteList = [];
        const checkings = list.map((id) => {
            const [historyId, taskId] = id.split(':');
            return this.ctx.service.invoke.checkStatus(historyId, taskId).then((canDelete) => {
                if (canDelete) {
                    deleteList.push(id);
                }
            });
        });

        await Promise.all(checkings);
        if (list.length && deleteList.length) {
            this.app.taskWaitingList = list.filter((i) => {
                return !deleteList.includes(i);
            });
        }
    }
}

module.exports = checkTestStatus;
