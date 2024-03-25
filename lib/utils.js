const { pbkdf2 } = require('node:crypto');

/**
 * 加密用户的密码
 * @param {*} password 用户密码原文
 * @param {*} salt 加密所用的盐，为128为随机二进制
 * @return {Promise<string>} 加密后的密码
 */
module.exports.password2key = async function (password, salt) {
    return new Promise((resolve, reject) => {
        // Provides an asynchronous Password-Based Key Derivation Function 2 (PBKDF2)
        // implementation. A selected HMAC digest algorithm specified by digest is
        // applied to derive a key of the requested byte length (keylen) from
        // thepassword, salt and iterations.
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
