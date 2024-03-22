const client = require('@prisma/client');
const path = require('node:path');
const fs = require('fs-extra');
const testAgent = require('./testAgent/app');

class AppBootHook {
    constructor(app) {
        this.app = app;
        this.app.taskWaitingList = [];
        this.taskIdsPath = path.join(this.app.baseDir, '.taskid');
    }
    async willReady() {
        this.app.prisma = new client.PrismaClient({ log: ['query'] });
        this.app.prisma.$on('query', (e) => {
            console.log('Params: ' + e.params);
            console.log('Duration: ' + e.duration + 'ms');
        });
        this.app.on('error', (err, ctx) => {
            ctx.logger.error(err);
        });
        testAgent(this.app);

        const taskids = fs.readFileSync(this.taskIdsPath, { encoding: 'utf-8' });
        this.app.taskWaitingList = taskids.split(',');
    }

    // 应用关闭前执行一些操作。
    async beforeClose() {
        await fs.outputFile(this.taskIdsPath, this.app.taskWaitingList.join(','));
    }
}

module.exports = AppBootHook;
