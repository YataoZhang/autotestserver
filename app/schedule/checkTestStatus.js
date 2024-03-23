const Subscription = require('egg').Subscription;

class checkTestStatus extends Subscription {

    static get schedule() {
        return {
            interval: '30s', // 1 分钟间隔
            type: 'all', // 指定所有的 worker 都需要执行
            immediate: true
        };
    }

    async subscribe() {
        const list = this.app.taskWaitingList;
        if (!list.length) {
            return;
        }

        const deleteList = [];
        const checkings = list.map(async (id) => {
            if (!id) {
                return;
            }
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
                return i && !deleteList.includes(i);
            });
        }
    }
}

module.exports = checkTestStatus;
