const log = require("./log");
const { updateChangelog: updateLernaChangelog } = require("@lerna/conventional-commits");
const { getPackages, getRootPackage } = require("./packages");
const { reduceChain } = require("./utils");


/**
 * @param {import("@lerna/package").Package} pkg
 * @param {string} version
 */
async function updateChangelog(pkg, version = pkg.version) {
    const root = getRootPackage();
    const isRoot = root.location === pkg.location;
    const packages = isRoot ? await getPackages() : [];

    log.notice(`Update changelog for ${isRoot ? "root" : pkg.name}`);

    return updateLernaChangelog(pkg, isRoot ? "root" : "independent", {
        rootPath: root.location,
        tagPrefix: "",
        version,
        changelogPreset: {
            "name": require.resolve("./conventional-changelog-template/config"),
            packages: packages.filter(pkg => !pkg.private),
        },
    });
}

async function updateChangelogByOptions({ base: coreName, type }) {
    const isRoot = !type || type === "root";
    const packages = await getPackages();
    const root = getRootPackage();
    const corePackage = packages.find(package => package.name === coreName);
    const coreVersion = corePackage.version;

    if (type === "all") {
        await updateChangelog(root, coreVersion);
        await reduceChain(packages.filter(pkg => !pkg.private), pkg => {
            return updateChangelog(pkg);
        });
    } else {
        await updateChangelog(isRoot ? root : corePackage, coreVersion);
    }
}

exports.updateChangelog = updateChangelog;
exports.updateChangelogByOptions = updateChangelogByOptions;
