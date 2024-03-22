/* eslint-disable indent */
const Controller = require('egg').Controller;

const PAGE_SIZE = 10;

class PlansController extends Controller {
    async #getTeamIdAndCurrentUser() {
        const { ctx } = this;
        const teamId = +ctx.params.id;
        if (isNaN(teamId)) {
            throw new Error('团队信息不正确');
        }
        return {
            teamId,
            currentUserId: ctx.session.user.id
        };
    }
    async show() {
        const { ctx, app } = this;
        let { pageIndex, searchValue, planId } = ctx.query;
        pageIndex = Number(pageIndex);
        planId = Number(planId);
        const TU = await this.#getTeamIdAndCurrentUser();

        const commonWhere = {
            teamId: TU.teamId,
            team: {
                delete: false
            },
            delete: false
        };

        if (planId) {
            const row = await app.prisma.plan.findFirst({
                where: {
                    id: planId,
                    ...commonWhere
                }
            });
            ctx.body = {
                errno: 0,
                data: row || {}
            };
            return;
        }

        const counts = await app.prisma.plan.count({
            where: {
                ...commonWhere
            }
        });
        const skip = (pageIndex - 1) * PAGE_SIZE;

        const plans = await app.prisma.plan.findMany({
            where: {
                ...commonWhere,
                ...(searchValue
                    ? {
                          name: {
                              contains: searchValue
                          }
                      }
                    : {})
            },
            select: {
                id: true,
                name: true,
                type: true,
                status: true,
                create_at: true,
                modified_at: true,
                user: {
                    select: {
                        username: true,
                        id: true
                    }
                },
                _count: {
                    select: {
                        Case: true
                    }
                }
            },
            orderBy: {
                id: 'desc'
            },
            skip,
            take: PAGE_SIZE
        });

        ctx.body = {
            errno: 0,
            data: {
                list: plans,
                pageSize: PAGE_SIZE,
                pageIndex,
                totalCount: counts
            }
        };
    }
    async update() {
        const { ctx, app } = this;
        const TU = await this.#getTeamIdAndCurrentUser();
        const { type } = ctx.query;
        if (type === 'add') {
            ctx.validate(
                {
                    planName: {
                        type: 'string',
                        max: 30
                    }
                },
                ctx.request.body
            );
            const { planName } = ctx.request.body;
            await app.prisma.plan.create({
                data: {
                    name: planName,
                    creator: TU.currentUserId,
                    teamId: TU.teamId,
                    create_at: new Date(),
                    modified_at: new Date()
                }
            });
            ctx.body = {
                errno: 0
            };
            return;
        }

        ctx.validate(
            {
                planName: {
                    type: 'string',
                    max: 30
                },
                planId: 'number'
            },
            ctx.request.body
        );

        const { planName, planId } = ctx.request.body;
        const pid = Number(planId);
        if (isNaN(pid)) {
            throw new Error('测试计划Id信息错误');
        }
        await app.prisma.plan.update({
            where: {
                id: pid,
                teamId: TU.teamId,
                team: {
                    delete: false
                },
                creator: TU.currentUserId,
                delete: false
            },
            data: {
                name: planName,
                modified_at: new Date()
            }
        });
        ctx.body = {
            errno: 0
        };
    }
    async destroy() {
        const { ctx, app } = this;
        const TU = await this.#getTeamIdAndCurrentUser();
        const { planId } = ctx.query;
        const pid = Number(planId);
        if (isNaN(pid)) {
            throw new Error('测试计划Id信息错误');
        }
        await app.prisma.plan.update({
            where: {
                id: pid,
                teamId: TU.teamId,
                team: {
                    delete: false
                },
                creator: TU.currentUserId,
                delete: false
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
}
module.exports = PlansController;
