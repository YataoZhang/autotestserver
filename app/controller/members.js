/* eslint-disable indent */
const Controller = require('egg').Controller;

const PAGE_SIZE = 10;
class MembersController extends Controller {
    // 查看所有成员
    async show() {
        const { ctx, app } = this;
        const currenUserId = ctx.session.user.id;
        const teamId = +ctx.params.id;
        let { pageIndex = 1, searchValue = '', onlyMe = 0 } = ctx.query;
        pageIndex = +pageIndex;
        onlyMe = +onlyMe;

        if (onlyMe === 1) {
            const row = await app.prisma.member.findFirst({
                where: {
                    userId: currenUserId,
                    teamId,
                    status: 1,
                    team: {
                        delete: false
                    }
                },
                select: {
                    id: true,
                    nickname: true
                }
            });
            ctx.body = {
                errno: 0,
                data: row
            };
            return;
        }

        const counts = await app.prisma.member.count({
            where: {
                teamId,
                team: {
                    delete: false
                }
            }
        });
        const skip = (pageIndex - 1) * PAGE_SIZE;
        const options = searchValue
            ? {
                  user: {
                      username: {
                          contains: searchValue
                      }
                  }
              }
            : {};

        const members = await app.prisma.member.findMany({
            where: {
                teamId,
                team: {
                    delete: false
                },
                ...options
            },
            select: {
                id: true,
                nickname: true,
                status: true,
                user: {
                    select: {
                        id: true,
                        uid: true,
                        username: true
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
                list: members,
                pageSize: PAGE_SIZE,
                pageIndex,
                totalCount: counts
            }
        };
    }

    async #preCheckAndExisted(uid) {
        const { ctx, app } = this;
        const currenUserId = ctx.session.user.id;
        const teamId = +ctx.params.id;
        const isMyTeam = await app.prisma.member.count({
            where: {
                teamId,
                team: {
                    ownerId: currenUserId,
                    delete: false
                }
            }
        });
        if (!isMyTeam) {
            throw new Error(
                '您不是当前团队的拥有者，或该团队不存在（已被删除？）'
            );
        }
        const existCount = await app.prisma.member.count({
            where: {
                userId: uid,
                teamId,
                team: {
                    delete: false
                }
            }
        });
        return existCount > 0;
    }

    // 添加团队成员
    // 1. 必须是团队拥有者才能添加成员
    // 2. 不能添加已经存在的成员
    // 3. 添加的用户必须存在
    async #add() {
        const { ctx, app } = this;
        try {
            ctx.validate(
                {
                    username: 'string'
                },
                ctx.request.body
            );
        } catch (ex) {
            ex.errno = -1;
            throw ex;
        }

        const { username } = ctx.request.body;
        const user = await ctx.service.login.getUserInfo(username, true);
        const userInMembers = await this.#preCheckAndExisted(user.id);
        if (!userInMembers) {
            throw new Error('当前用户已再当前团队中');
        }

        const teamId = +ctx.params.id;
        await app.prisma.member.create({
            data: {
                userId: user.id,
                teamId,
                nickname: '',
                status: 1
            }
        });
        ctx.body = {
            errno: 0
        };
    }

    async #modified(uid, mid, data) {
        const { ctx, app } = this;
        const teamId = +ctx.params.id;
        const existCount = await app.prisma.member.count({
            where: {
                userId: uid,
                teamId,
                team: {
                    delete: false
                }
            }
        });
        if (existCount > 0) {
            const teamId = +ctx.params.id;
            await app.prisma.member.update({
                where: {
                    id: mid,
                    teamId,
                    team: {
                        delete: false
                    },
                    userId: uid
                },
                data
            });
        }
        ctx.body = {
            errno: 0
        };
    }

    async update() {
        const { ctx } = this;
        const { type } = ctx.query;
        if (type === 'add') {
            return this.#add();
        }
        const currenUserId = ctx.session.user.id;
        const { nickname, memberId } = ctx.request.body;
        const mid = Number(memberId);
        if (!nickname || isNaN(mid)) {
            throw new Error('缺少昵称信息');
        }
        await this.#modified(currenUserId, mid, { nickname });
    }

    // 团队管理员不能删除自己
    async destroy() {
        const { ctx, app } = this;
        const { memberId, userId } = ctx.query;
        const uid = Number(userId);
        const id = Number(memberId);
        if (isNaN(uid) || isNaN(id)) {
            throw new Error('参数不正确');
        }
        const teamId = +ctx.params.id;
        const userInMembers = await this.#preCheckAndExisted(uid);
        if (!userInMembers) {
            throw new Error('该用户不是此团队成员，无法删除');
        }
        console.log(uid, ctx.session.user.id);
        if (uid === ctx.session.user.id) {
            throw new Error('团队管理员无法删除自己');
        }
        await app.prisma.member.update({
            where: {
                id,
                teamId,
                team: {
                    delete: false
                },
                userId: uid
            },
            data: {
                status: 0
            }
        });
        ctx.body = {
            errno: 0
        };
    }
}
module.exports = MembersController;
