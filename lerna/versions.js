const log = require("./log");
const semver = require("semver");
const { updateLockfileVersion } = require("@lerna/version/lib/update-lockfile-version");
const { PackageGraph } = require("@lerna/package-graph");
const { getPackages } = require("./packages");
const { reduceChain } = require("./utils");

/**
 *
 * @param {string} pkgName
 * @param {PackageGraph} graph
 * @param {Map<string, { pkg: import("@lerna/package").Package, isUpdate: boolean }>} packageMap
 */
async function updateVersion(pkgName, graph, packageMap) {
    let releaseType = "";
    let isUpdateMajor = false;
    let isUpdateMinor = false;
    let isUpdatePatch = false;
    let isDependencyPrelease = false;
    let isBasePrelease = false;
    let isUpdatePrerelease = false;
    let isIncreamentPrerelease = false;

    const basePackageInfo = packageMap.get(pkgName);
    const graphNode = graph.get(pkgName);

    if (!basePackageInfo || !graphNode || basePackageInfo.isUpdate) {
        return;
    }
    const basePackage = graphNode.pkg;

    const localDependencies = graphNode.localDependencies;
    const externalDependencies = graphNode.externalDependencies;


    await reduceChain([...localDependencies, ...externalDependencies], async ([dependencyName, resolved]) => {
        const parentPackage = packageMap.get(dependencyName);

        if (resolved.type === "directory" || !parentPackage) {
            return;
        }
        await updateVersion(dependencyName, graph, packageMap);

        const dependencyVersion = resolved.rawSpec.replace(/^[^\d]+/g, "");
        const parentVersion = parentPackage.pkg.version;
        const dependencySemver = semver.parse(dependencyVersion);
        const parentSemver = semver.parse(parentVersion);

        if (dependencyVersion === parentVersion) {
            return;
        }
        isUpdateMajor = isUpdateMajor || dependencySemver.major < parentSemver.major;
        isUpdateMinor = isUpdateMinor || dependencySemver.minor < parentSemver.minor;
        isUpdatePatch = isUpdatePatch || dependencySemver.patch < parentSemver.patch;

        isDependencyPrelease = isDependencyPrelease || dependencySemver.prerelease.length > 0;
        isBasePrelease = isBasePrelease || parentSemver.prerelease.length > 0;
        isUpdatePrerelease = isUpdatePrerelease || isBasePrelease !== isDependencyPrelease;

        if (
            isUpdatePrerelease
            && isBasePrelease
            && (!isUpdateMajor && !isUpdateMajor && !isUpdatePatch)
            && parentSemver.prerelease[1] > dependencySemver.prerelease[1]
        ) {
            isIncreamentPrerelease = true;
        }
        if (dependencyVersion !== parentVersion) {
            basePackage.updateLocalDependency(resolved, parentVersion, "~");
            await basePackage.serialize();
        }
    });
    if (isUpdateMajor) {
        releaseType = "major";
    } else if (isUpdateMinor) {
        releaseType = "minor";
    } else if (isUpdatePatch) {
        releaseType = "patch";
    } else if (isUpdatePrerelease) {
        if (!isBasePrelease) {
            releaseType = "patch";
        } else if (!isDependencyPrelease || isIncreamentPrerelease) {
            releaseType = "prerelease";
        }
    }
    if (isBasePrelease && (isUpdateMajor || isUpdateMajor || isUpdatePatch)) {
        releaseType = `pre${releaseType}`;
    }

    if (!releaseType || basePackage.private) {
        return;
    }
    releaseType = basePackage.get("lernaHelperReleaseType") || releaseType;

    const baseVersion = basePackage.version;
    const nextVersion = semver.inc(baseVersion, releaseType, false, "beta");

    basePackageInfo.isUpdate = true;
    log.notice(`Update ${basePackage.name}'s version from ${baseVersion} to ${nextVersion}`);

    basePackage.set("version", nextVersion);
    await basePackage.serialize();
    await updateLockfileVersion(basePackage);
}

exports.updateVersions = async () => {
    const packages = await getPackages();
    const graph = new PackageGraph(packages);
    const packageMap = new Map(packages.map(pkg => [pkg.name, {
        isUpdate: false,
        pkg,
    }]));

    await reduceChain(packages, async (package) => {
        await updateVersion(package.name, graph, packageMap);
    });
}
