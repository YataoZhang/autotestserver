module.exports = () => {
    return async function errorHandler(ctx, next) {
        if (!ctx.session.user) {
            const err = new Error('用户未登录');
            err.erno = -6;
            throw err;
        }
        await next();
    };
};
