// app/service/user.js
const Service = require('egg').Service;
const { uid } = require('uid');
const utils = require('../../lib/utils');

class LoginService extends Service {
    async #checkUserNameExisting(username) {
        const user = await this.app.prisma.user.findUnique({
            where: {
                username
            }
        });
        return user === null;
    }
    async login(username, password) {
        const notExists = await this.#checkUserNameExisting(username);
        if (notExists) {
            throw new Error('当前用户不存在');
        }
        const encodePwd = await utils.password2key(
            password,
            this.app.config.passwordSalt
        );
        let user = null;
        try {
            user = await this.app.prisma.user.findUnique({
                where: {
                    username,
                    password: encodePwd
                }
            });
        } catch (ex) {
            this.ctx.logger.error(ex);
            throw new Error('用户登录失败');
        }
        if (!user) {
            throw new Error('密码错误');
        }
        return {
            id: user.id,
            uid: user.uid,
            username: user.username
        };
    }
    async register(username, password) {
        const notExists = await this.#checkUserNameExisting(username);
        if (!notExists) {
            throw new Error('当前用户已注册');
        }
        const encodePwd = await utils.password2key(
            password,
            this.app.config.passwordSalt
        );
        const userId = uid();
        try {
            await this.app.prisma.user.create({
                data: {
                    uid: userId,
                    username,
                    password: encodePwd,
                    create_at: new Date()
                }
            });
        } catch (ex) {
            this.ctx.logger.error(ex);
            throw new Error('用户注册失败');
        }
    }

    async getUserInfo(data, isByName = false) {
        const where = {};
        if (isByName) {
            where.username = data;
        } else {
            where.id = data;
        }
        let user = null;
        try {
            user = await this.app.prisma.user.findUnique({
                where
            });
        } catch (ex) {
            this.ctx.logger.error(ex);
            throw new Error('用户信息获取失败');
        }
        if (!user) {
            throw new Error('该用户不存在');
        }
        return {
            id: user.id,
            uid: user.uid,
            username: user.username
        };
    }
}

module.exports = LoginService;
