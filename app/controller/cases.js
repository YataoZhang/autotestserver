const Controller = require('egg').Controller;

const PAGE_SIZE = 10;
class CasesController extends Controller {
    async #getPlanIdAndCurrentUser() {
        const { ctx, app } = this;
        const planId = +ctx.params.planId;
        if (isNaN(planId)) {
            throw new Error('测试计划信息不正确');
        }
        const currentUserId = ctx.session.user.id;
        let { teamId } = ctx.query;
        teamId = +teamId;
        if (isNaN(teamId)) {
            throw new Error('团队信息不正确');
        }

        const hasExists = await app.prisma.plan.findFirst({
            where: {
                id: planId,
                delete: false,
                team: {
                    id: teamId,
                    delete: false,
                    users: {
                        some: {
                            id: currentUserId
                        }
                    }
                }
            }
        });
        if (!hasExists) {
            throw new Error('您不在当前该团队中，无法执行此操作');
        }
        return {
            planId,
            teamId,
            currentUserId
        };
    }

    async index() {
        const { ctx, app } = this;
        let { pageIndex } = ctx.query;
        pageIndex = Number(pageIndex);
        const PU = await this.#getPlanIdAndCurrentUser();

        const commonWhere = {
            delete: false,
            plan: {
                id: PU.planId,
                delete: false,
                team: {
                    id: PU.teamId,
                    delete: false
                }
            }
        };

        const counts = await app.prisma.case.count({
            where: {
                ...commonWhere
            }
        });
        const skip = (pageIndex - 1) * PAGE_SIZE;

        const cases = await app.prisma.case.findMany({
            where: {
                ...commonWhere
            },
            orderBy: {
                id: 'desc'
            },
            select: {
                id: true,
                name: true,
                status: true,
                content: true,
                mrd: true,
                create_at: true,
                modified_at: true,
                user: {
                    select: {
                        username: true,
                        id: true
                    }
                }
            },
            skip,
            take: PAGE_SIZE
        });

        ctx.body = {
            errno: 0,
            data: {
                list: cases,
                pageSize: PAGE_SIZE,
                pageIndex,
                totalCount: counts
            }
        };
    }
    async show() {
        const { ctx, app } = this;
        const PU = await this.#getPlanIdAndCurrentUser();
        const caseId = +ctx.params.id;

        const row = await app.prisma.case.findFirst({
            where: {
                id: caseId,
                plan: {
                    id: PU.planId,
                    delete: false,
                    team: {
                        id: PU.teamId,
                        delete: false
                    }
                },
                delete: false
            },
            select: {
                name: true,
                creator: true,
                status: true,
                planId: true,
                content: true,
                mrd: true,
                create_at: true,
                modified_at: true
            }
        });
        ctx.body = {
            errno: 0,
            data: row || {}
        };
        return;
    }
    async create() {
        const { ctx, app } = this;
        const files = ctx.request.files;
        const now = new Date();

        const PU = await this.#getPlanIdAndCurrentUser();
        const datas = await this.service.files.handle(files);
        const inserts = datas.map((data) => {
            return {
                name: data.filename.replace(/\.[^.]+$/, ''),
                creator: PU.currentUserId,
                planId: PU.planId,
                content: data.content,
                mrd: '',
                create_at: now,
                modified_at: now
            };
        });
        await app.prisma.case.createMany({
            data: inserts
        });
        ctx.body = {
            errno: 0
        };
    }
    async update() {
        const { ctx, app } = this;
        const { name, content } = ctx.request.body;
        const id = Number(ctx.params.id);
        if (isNaN(id)) {
            throw new Error('测试用例id格式不正确');
        }
        let json = null;
        if (content) {
            try {
                json = JSON.parse(content);
            } catch (ex) {
                throw new Error('测试用例内容格式错误，仅支持json格式');
            }
        }
        const data = {
            modified_at: new Date()
        };
        name && (data.name = name);
        json && (data.content = json);
        const PU = await this.#getPlanIdAndCurrentUser();

        await app.prisma.case.update({
            where: {
                id,
                delete: false,
                plan: {
                    id: PU.planId,
                    delete: false,
                    team: {
                        id: PU.teamId,
                        delete: false
                    }
                }
            },
            data
        });

        ctx.body = {
            errno: 0
        };
    }
    // 只有团队拥有者，测试计划拥有者 case创建者才可以删除，其他人都不能删除
    async destroy() {
        const { ctx, app } = this;
        const id = Number(ctx.params.id);
        if (isNaN(id)) {
            throw new Error('测试用例id格式不正确');
        }
        await this.#getPlanIdAndCurrentUser();
        await app.prisma.case.update({
            where: {
                id
            },
            data: {
                delete: true,
                modified_at: new Date()
            }
        });
        ctx.body = {
            errno: 0
        };
    }

    async invoke() {
        const { ctx, app } = this;
        const PU = await this.#getPlanIdAndCurrentUser();
        const { caseIds, info } = ctx.request.body;
        let cases = [];
        if (caseIds) {
            try {
                cases = JSON.parse(caseIds);
            } catch (ex) {
                ctx.logger.warn(ex);
                throw new Error('测试用例列表格式不正确');
            }
            cases = await app.prisma.case.findMany({
                where: {
                    id: {
                        in: cases
                    }
                },
                select: {
                    id: true
                }
            });
        }
        if (!cases.length) {
            cases = await app.prisma.case.findMany({
                where: {
                    delete: false,
                    planId: PU.planId
                },
                select: {
                    id: true
                }
            });
        }
        // TODO 检查caseid是否在plan里
        const history = await app.prisma.history.create({
            data: {
                start_at: new Date(),
                triggerId: PU.currentUserId,
                planId: PU.planId,
                info,
                HistoriesOnCases: {
                    create: cases.map((i) => {
                        return {
                            caseId: i.id
                        };
                    })
                }
            }
        });
        const taskid = await this.service.invoke.start(history.id);
        ctx.body = {
            errno: 0,
            data: { taskid }
        };
    }
}
module.exports = CasesController;
