const Controller = require('egg').Controller;

class UserController extends Controller {
    // 获取哦当前登录人员的用户信息
    async index() {
        const { ctx } = this;
        if (!ctx.session.user) {
            const ex = new Error('用户未登录');
            ex.errno = -6;
            throw ex;
        }
        ctx.body = {
            errno: 0,
            data: {
                id: ctx.session.user.id,
                uid: ctx.session.user.uid,
                username: ctx.session.user.username,
                isLogin: true
            }
        };
    }
    async show() {
        const { ctx } = this;
        const byName = ctx.query.type === 'username';
        const data = ctx.params.id;
        const user = await this.service.login.getUserInfo(data, byName);
        let isLogin = false;
        if (ctx.session.user && user.uid === ctx.session.user.uid) {
            isLogin = true;
        }
        ctx.body = {
            errno: 0,
            data: {
                uid: user.uid,
                username: user.username,
                isLogin
            }
        };
    }
}
module.exports = UserController;
