const Service = require('egg').Service;
const { uid } = require('uid');

const TASK_RUNNER_SYMBOL = Symbol('TestAgentService#taskRunner');

class InvokeService extends Service {
    async [TASK_RUNNER_SYMBOL](paylod) {
        const taskid = uid();
        const conf = {
            taskid,
            ...paylod
        };

        // planName, baseDir, taskid, info = {}, records = []
        const { status } = await this.app.startTestAgent(conf);
        if (status !== 'start') {
            throw new Error(
                '[ERR_AGENT_START_FAILED] Cannot start test agent.'
            );
        }
        return taskid;
    }
    async checkStatus(historyId, taskid) {
        // {
        //     summary: [ { spec: '新百度网盘首页.spec.cy.js', stats: [Object], tests: [Array] } ],
        //     report: {
        //       html: 'asdjfhqwkej/reporter/pass_March_22_2024-新百度网盘首页-report.html',
        //       json: 'asdjfhqwkej/reporter/pass_March_22_2024-新百度网盘首页-report.json'
        //     },
        //     detections: { total: 0, success: 0, failure: 0, page: '' }
        //  }
        // detections: {
        //     total: 2,
        //     success: 2,
        //     failure: 0,
        //     page: 'asdjfhqwkej/reporter/coreCase_新百度网盘首页.html'
        //  }
        const { status, data = null } = await this.app.checkTestStatus(taskid);

        if (status === 'completed' || status === 'failed') {
            const isEmitError = status === 'failed' && data.errmsg;
            const options = {
                where: {
                    id: +historyId,
                    taskid,
                    status: 1
                },
                data: {
                    result: data,
                    end_at: new Date(),
                    status: status === 'completed' ? 2 : 3,
                    reporter_link: isEmitError ? '' : ('/public/' + data.report.html),
                    detail_link: isEmitError ? '' : ('/public/' + data.report.json),
                    compare_link: isEmitError ? '' : (data.detections.page
                        ? ('/public/' + data.detections.page)
                        : '')
                }
            };
            await this.app.prisma.history.update(options).catch((ex) => {
                this.ctx.logger.error(`history update failed, options is ${JSON.stringify(options)}} and error is ${ex.message}`);
            });
            return true;
        }
        if (status === 'not_exists') {
            return true;
        }
        return false;
    }
    async start(historyId) {
        const data = await this.app.prisma.history.findFirst({
            where: {
                id: +historyId,
                // 0 未开始测试 1 测试中 2 测试成功 3 测试失败
                status: 0,
                HistoriesOnCases: {
                    some: {
                        case: {
                            delete: false
                        }
                    }
                }
            },
            select: {
                info: true,
                plan: {
                    select: {
                        name: true
                    }
                },
                HistoriesOnCases: {
                    select: {
                        case: {
                            select: {
                                content: true
                            }
                        }
                    }
                }
            }
        });
        if (!data) {
            throw new Error('cannot create or found this execute history of id:' + historyId);
        }

        const planName = data.plan.name;
        const records = data.HistoriesOnCases.map((i) => {
            return JSON.stringify(i.case.content);
        });

        const taskid = await this[TASK_RUNNER_SYMBOL]({
            planName,
            baseDir: this.app.baseDir,
            records,
            info: data.info || {}
        });

        await this.app.prisma.history.update({
            where: {
                id: +historyId
            },
            data: {
                status: 1,
                taskid
            }
        });

        this.app.taskWaitingList.push(`${historyId}:${taskid}`);
        return taskid;
    }

}
module.exports = InvokeService;
