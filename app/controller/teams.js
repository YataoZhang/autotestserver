const Controller = require('egg').Controller;

class TeamsController extends Controller {
    async index() {
        const { ctx, app } = this;
        const currenUserId = this.ctx.session.user.id;

        const teams = await app.prisma.team.findMany({
            where: {
                delete: false,
                users: {
                    some: {
                        user: {
                            id: currenUserId
                        }
                    }
                }
            },
            select: {
                id: true,
                name: true,
                ownerId: true
            },
            orderBy: {
                id: 'asc'
            }
        });
        ctx.body = {
            errno: 0,
            data: teams
        };
    }
    async create() {
        const { ctx, app } = this;
        try {
            ctx.validate({ name: 'string' }, ctx.request.body);
        } catch (ex) {
            ex.errno = -1;
            throw ex;
        }
        const currenUserId = this.ctx.session.user.id;
        const counts = await app.prisma.team.count({
            where: {
                delete: false,
                users: {
                    some: {
                        user: {
                            id: currenUserId
                        }
                    }
                }
            }
        });
        if (counts > 10) {
            throw new Error('每个用户最多创建10个团队');
        }
        const { name } = ctx.request.body;
        const team = await app.prisma.team.create({
            data: {
                name,
                ownerId: currenUserId,
                users: {
                    create: [
                        {
                            nickname: '',
                            status: 1,
                            user: {
                                connect: {
                                    id: currenUserId
                                }
                            }
                        }
                    ]
                }
            }
        });
        ctx.body = {
            errno: 0,
            data: {
                id: team.id,
                name: team.name,
                ownerId: currenUserId
            }
        };
    }
    async update() {
        const { ctx, app } = this;
        const currenUserId = this.ctx.session.user.id;
        const teamId = ctx.params.id;
        const { name, ownerName } = ctx.request.body;
        const data = {};
        if (name) {
            data.name = String(name);
        } else if (ownerName) {
            const user = await ctx.service.login.getUserInfo(ownerName, true);
            data.ownerId = user.id;
        } else {
            const ex = new Error('missing params');
            ex.errno = -1;
            throw ex;
        }

        await app.prisma.team.update({
            where: {
                id: +teamId,
                ownerId: currenUserId
            },
            data
        });
        ctx.body = {
            errno: 0
        };
    }
    async destroy() {
        const { ctx, app } = this;
        const teamId = ctx.params.id;
        const currenUserId = this.ctx.session.user.id;

        await app.prisma.team.update({
            where: {
                id: +teamId,
                ownerId: currenUserId,
                delete: false
            },
            data: {
                delete: true
            }
        });

        ctx.body = {
            errno: 0
        };
    }
}
module.exports = TeamsController;
