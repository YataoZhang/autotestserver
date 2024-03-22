const { pbkdf2 } = require('node:crypto');

module.exports.password2key = async function (password, salt) {
    return new Promise((resolve, reject) => {
        pbkdf2(password, salt, 10000, 64, 'sha512', (err, key) => {
            if (err) {
                reject(err);
            } else {
                resolve(key.toString('base64'));
            }
        });
    });
};

module.exports.getCurrentDateTime = () => {
    const now = new Date();
    return now.toLocaleString().replace(/\//g, '-');
};
