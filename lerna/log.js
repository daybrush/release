const log = require("npmlog");

/**
 * @param {string} text
 */
exports.notice = text => {
    log.notice("lerna-helper", text);
}

/**
 * @param {string} text
 */
 exports.error = text => {
    log.error("lerna-helper", text);
}
