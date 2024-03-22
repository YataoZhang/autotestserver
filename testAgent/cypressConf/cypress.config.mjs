import { defineConfig } from 'cypress';

const RUN_TYPE = {
    // RD 本地开发自测
    LOCAL: 1,
    // 流水线CI准入测试
    CI: 2,
    // QA 自动化测试平台
    AUTO_TEST: 3,
    // 上线后置 Checker
    BEHIND_CHECKER: 4,
    // 出海
    OVERSEA: 5,
    // 内网
    INTRANET: 6
};

export default defineConfig({
    e2e: {
        setupNodeEvents(on, config) {
            // implement node event listeners here
            config.env.runType = RUN_TYPE.LOCAL;
        }
    }
});
