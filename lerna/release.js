const dateFormat = require("dateformat");
const log = require("./log");
const { Project } = require("@lerna/project");
const { Package } = require("@lerna/package");
const { exec } = require("@lerna/child-process");
const { updateChangelog } = require("./changelog");
const { getPackages, getRootPackage } = require("./packages");
const { gitTags, gitPush, gitReleaseCommit, gitRelease, gitAdd } = require("./git");
const { updateVersions } = require("./versions");
const { reduceChain } = require("./utils");


function beforeRelease() {
    const project = new Project();
    const scripts = project.config?.lernaHelperOptions?.beforeReleaseScripts || [];

    return reduceChain(scripts, script => {
        log.notice(`Exec script ${"`"}${script}${"`"}`);

        const strings = script.split(" ");
        return exec(strings[0], strings.slice(1));
    });
}

exports.releaseRoot = async ({
    base: coreName,
    remote,
    branch,
    scripts,
}) => {
    const packages = await getPackages();
    const root = getRootPackage();
    const corePackage = packages.find(package => package.name === coreName);
    const coreVersion = corePackage.version;

    if (scripts) {
        await beforeRelease();
    }


    const publicPackages = packages.filter(pkg => !pkg.private);

    // update all package changelogs
    await Promise.all(publicPackages.map(pkg => updateChangelog(pkg)));

    // update root changelog
    const { newEntry } = await updateChangelog(root, coreVersion);

    // git add & commit
    await gitAdd();
    await gitReleaseCommit(coreVersion);

    // git root tag and package tags
    await gitTags([
        coreVersion,
        ...publicPackages.map(package => `${package.name}@${package.version}`),
    ]);

    // git push
    await gitPush(remote, branch);

    // release to github
    await gitRelease(newEntry, {
        remote,
        tag: corePackage.version,
        title: `${corePackage.version} Release (${dateFormat(new Date(), 'yyyy-mm-dd', false)})`,
    });
}

exports.releasePackage = async ({
    base: pkgName,
    remote,
    branch,
}) => {
    const packages = await getPackages();
    const pkgInfo = packages.find(pkg => pkg.name === pkgName);
    const pkg = Package.lazy(pkgInfo.location);

    // update versions
    await updateVersions();

    // update change log for certain package
    const { newEntry } = await updateChangelog(pkg);

    const packageTagVersion = `${package.name}@${package.version}`;

    // git commit
    await gitAdd();
    await gitReleaseCommit(packageTagVersion);

    // git package tag
    await gitTags([packageTagVersion]);

    // git push
    await gitPush(remote, branch);

    // // git release package
    // await gitRelease(newEntry, {
    //     remote,
    //     tag: packageTagVersion,
    //     title: `${corePackage.version} Release (${dateFormat(new Date(), 'yyyy-mm-dd', false)})`,
    // });
}
