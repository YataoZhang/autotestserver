// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })
import addContext from 'mochawesome/addContext';

Cypress.Commands.add('loginViaUI', (username, pwd) => {
    cy.session([username, pwd], () => {
        cy.visit('/login');
        cy.document().then((doc) => {
            // pan域
            const panLoginBtn = doc.getElementsByClassName(
                'bd-login-button__wrapper'
            );
            // 海外
            // const overseasLoginBtn = doc.getElementsByClassName('login-submit-btn');
            let userClass = '';
            let passwordClass = '';
            let submitClass = '';

            // if (overseasLoginBtn.length) {
            //     userClass = 'input.email-input';
            //     passwordClass = 'input.pwd-input';
            //     submitClass = '.login-submit-btn';
            // } else {
            userClass = 'input.pass-text-input-userName';
            passwordClass = 'input.pass-text-input-password';
            submitClass = 'input.pass-button-submit';
            // }

            // if (panLoginBtn.length) {
            // 点击“去登录”按钮
            cy.get(
                '.bd-login-content__login button.bd-login-button__wrapper'
            ).click();
            // 登录弹窗正常展示
            cy.get('#passport-login-pop-dialog')
                .should('exist')
                .and('be.visible');
            // 切换到账号登录，防止扫码登录和短信登录
            cy.get('#passport-login-pop-dialog span.switch-item')
                .contains('账号登录')
                .click();

            // 输入账号和密码
            cy.get(userClass).type(username);
            cy.get(passwordClass).type(pwd);
            // 已阅读用户协议
            cy.get('input.pass-checkbox-input').eq(1).click();
            // 登录
            cy.get(submitClass).eq(0).click();
            cy.wait(3000);

            const els = doc.getElementsByClassName('bindGuide-jump');
            if (els.length) {
                els[0].click();
            }
            cy.wait(1000);
            cy.url().should('include', '/disk/main');
            // } else {
            //     cy.get(userClass).type(username, { force: true });
            //     cy.get(passwordClass).type(pwd, { force: true });
            //     cy.get(submitClass).eq(0).click({ force: true });
            //     cy.wait(3000);
            // }
        });
    });
});

Cypress.Commands.add('addContext', (context) => {
    cy.on('test:after:run', (attributes) => {
        addContext({ test: attributes }, context);
    });
});
