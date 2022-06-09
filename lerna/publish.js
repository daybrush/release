const path = require("path");
const log = require("./log");
const exec = require('sync-exec');
const { getPackages } = require("./packages");
const { gitCommit, getTags } = require("./git");

const PUBLISH_RESULT_TYPE = {
    PRIVATE_PACKAGE: "PRIVATE_PACKAGE",
    NO_CHANGED: "NO_CHANGED",
    IGNORE_PACKAGE: "IGNORE_PACKAGE",
    SUCCESS: "SUCCESS",
    ERROR: "ERROR",
};
/**
 *
 * @param {{ ignore: string, tag: string }} param0
 */
exports.publishPackages = async ({ ignore, tag, commit }) => {
    const packages = await getPackages();
    const ignorePackages = ignore.split(",");

    log.notice("Publish packages");

    const tags = getTags();
    const results = packages.map(pkg => {
        const private = pkg.private;
        const customPublichPath = pkg.get("lernaHelperPublishPath");

        if (private && !customPublichPath) {
            return {
                name: pkg.name,
                type: PUBLISH_RESULT_TYPE.PRIVATE_PACKAGE,
            };
        } else if (ignorePackages.indexOf(pkg.name) >= 0) {
            return {
                name: pkg.name,
                type: PUBLISH_RESULT_TYPE.IGNORE_PACKAGE,
            }
        }

        const publishPath = path.resolve(pkg.location, customPublichPath || "");
        const json = require(path.resolve(publishPath, "./package.json"));

        if (tags.indexOf(`${json.name}@${json.version}`) >= 0) {
            // already release
            return {
                name: pkg.name,
                type: PUBLISH_RESULT_TYPE.NO_CHANGED,
            };
        }
        let pkgTag = tag || "latest";
        const publishTag = pkg.get("lernaHelperPublishTag");

        if (!tag && publishTag) {
            pkgTag = publishTag;
        }
        const result = exec(`cd ${publishPath} && npm publish --tag ${pkgTag}`);

        if (!result.stderr) {
            return {
                name: pkg.name,
                type: PUBLISH_RESULT_TYPE.SUCCESS,
                json,
                tag: pkgTag,
            };
        } else {
            console.error(result.stderr);

            return {
                name: pkg.name,
                type: PUBLISH_RESULT_TYPE.ERROR,
                json,
                tag: pkgTag,
            };
        }
    });
    let successCount = 0;
    const errorCount = results.filter(result => {
        const { name, json, tag } = result;

        if (result.type === PUBLISH_RESULT_TYPE.SUCCESS) {
            ++successCount;
            log.notice(`Succeeded publish package: ${json.name}@${json.version} with ${tag} tag`);
        } else if (result.type === PUBLISH_RESULT_TYPE.ERROR) {
            log.error(`Failed to publish package: ${json.name}@${json.version} with ${tag} tag`);
            return true;
        } else if (result.type === PUBLISH_RESULT_TYPE.NO_CHANGED) {
            log.notice(`No changed package: ${name}`);
        }
        return false;
    }).length;

    if (commit) {
        if (!successCount) {
            log.error(`Nothing was published.`);
        } else if (!errorCount) {
            gitCommit(commit);
        } else {
            log.error(`The commit was not added because an error occurred. add it manually.`);
        }
    }
}
