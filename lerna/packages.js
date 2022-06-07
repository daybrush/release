const { Project } = require("@lerna/project");
const { Package } = require("@lerna/package");

let rootPackage;
let packages;

exports.getRootPackage = function getRootPackage() {
    if (!rootPackage) {
        rootPackage = Package.lazy("./");
    }
    return rootPackage;
}

/**
 * @returns {Promise<Package[]>}
 */
exports.getPackages = async () => {
    if (!packages) {
        packages = await new Project().getPackages();
    }
    return packages;
};
