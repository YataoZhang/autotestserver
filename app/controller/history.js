const Controller = require('egg').Controller;

const PAGE_SIZE = 10;

const SELECTOR = {
    id: true,
    start_at: true,
    end_at: true,
    status: true,
    reporter_link: true,
    detail_link: true,
    compare_link: true,
    user: {
        select: {
            username: true,
            id: true
        }
    }
};
class HistoryController extends Controller {
    async index() {
        const { ctx, app } = this;
        const planId = +ctx.params.planId;
        const currentUserId = ctx.session.user.id;
        let { pageIndex = 1, teamId } = ctx.query;
        pageIndex = Number(pageIndex);
        if (isNaN(pageIndex)) {
            pageIndex = 1;
        }
        if (!teamId) {
            throw new Error('缺少团队ID');
        }
        const where = {
            plan: {
                id: planId,
                delete: false,
                team: {
                    id: +teamId,
                    delete: false,
                    users: {
                        some: {
                            id: currentUserId
                        }
                    }
                }
            }
        };
        const counts = await app.prisma.history.count({
            where
        });
        let list = [];
        if (counts > 0) {
            const skip = (pageIndex - 1) * PAGE_SIZE;
            list = await app.prisma.history.findMany({
                where: {
                    plan: {
                        id: planId,
                        delete: false,
                        team: {
                            id: +teamId,
                            delete: false,
                            users: {
                                some: {
                                    id: currentUserId
                                }
                            }
                        }
                    }
                },
                select: SELECTOR,
                orderBy: {
                    id: 'desc'
                },
                skip,
                take: PAGE_SIZE
            });
        }

        ctx.body = {
            errno: 0,
            data: {
                list,
                pageSize: PAGE_SIZE,
                pageIndex,
                totalCount: counts
            }
        };
    }
    async show() {
        const { ctx, app } = this;
        const planId = +ctx.params.planId;
        const id = +ctx.params.id;
        const currentUserId = ctx.session.user.id;
        const { teamId } = ctx.query;
        if (!teamId) {
            throw new Error('缺少团队ID');
        }
        const row = await app.prisma.history.findFirst({
            where: {
                id,
                plan: {
                    id: planId,
                    delete: false,
                    team: {
                        id: +teamId,
                        delete: false,
                        users: {
                            some: {
                                id: currentUserId
                            }
                        }
                    }
                }
            },
            select: SELECTOR
        });

        ctx.body = {
            errno: 0,
            data: row
        };
    }
}
module.exports = HistoryController;
