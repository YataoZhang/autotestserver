/**
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
    const { router, controller } = app;
    router.post('/api/v1/login', controller.login.signin);
    router.post('/api/v1/signup', controller.login.signup);
    router.get('/api/v1/logout', controller.login.logout);

    router.resources('/api/v1/user', controller.user);
    router.resources('/api/v1/teams', controller.teams);

    router.resources('/api/v1/members', controller.members);
    router.resources('/api/v1/plans', controller.plans);

    router.resources('/api/v1/:planId/cases', controller.cases);
    router.resources('/api/v1/:planId/history', controller.history);

    router.post('/api/v1/:planId/invoke', controller.cases.invoke);
};
