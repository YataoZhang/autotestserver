const Controller = require('egg').Controller;

// 定义创建接口的请求参数规则
const userRule = {
    username: 'string',
    password: 'string'
};

class LoginController extends Controller {
    async signin() {
        const { ctx } = this;
        if (ctx.session.user) {
            ctx.body = { errno: 0 };
            return;
        }
        try {
            ctx.validate(userRule, ctx.request.body);
        } catch (ex) {
            ex.errno = -1;
            throw ex;
        }
        const { username, password } = ctx.request.body;
        const user = await ctx.service.login.login(username, password);
        ctx.session.user = user;
        ctx.body = {
            errno: 0
        };
    }
    async signup() {
        const { ctx } = this;
        try {
            ctx.validate(userRule, ctx.request.body);
        } catch (ex) {
            ex.errno = -1;
            throw ex;
        }
        const { username, password } = ctx.request.body;
        await ctx.service.login.register(username, password);
        ctx.body = { errno: 0 };
    }
    async logout() {
        const { ctx } = this;
        if (ctx.session.user) {
            ctx.session.user = null;
        }
        ctx.body = { errno: 0 };
    }
}
module.exports = LoginController;
