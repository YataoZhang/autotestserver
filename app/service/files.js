const Service = require('egg').Service;

class FileHandleService extends Service {
    async handle(files) {
        const datas = [];

        files.forEach((item) => {
            const { filepath, filename } = item;
            const data = { filename };
            try {
                const content = require(filepath);
                data.content = content;
            } catch (ex) {
                this.ctx.logger.warn(
                    `[WRONG FORMART] filename:${filename} filepath${filepath}`
                );
                return;
            }
            datas.push(data);
        });
        return datas;
    }
}

module.exports = FileHandleService;
