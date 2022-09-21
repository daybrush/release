const log = require("./log");
const execa = require("execa");
const { Project } = require("@lerna/project");
const { getPackages } = require("./packages");


exports.deploy = async ({
    base: baseName,
    init,
    remote,
    src,
    dest,
    pre,
}) => {
    const project = new Project();
    const packages = await getPackages();
    const basePackage = packages.find(package => package.name === baseName);
    const baseVersion = basePackage?.version ?? "";
    const fileMap = project.config.lernaHelperOptions?.deployFileMap || [];

    fileMap.forEach(file => {
        const basePath = file.basePath;
        const dists = file.dists.map(dist => {
            return `./${dist.replace(/{{version}}/g, baseVersion)}`;
        });
        dists.forEach(dist => {
            execa.sync("rm", ["-rf", dist]);
            execa.sync("mkdir", ["-p", dist]);
            execa.sync("cp", ["-a", `./${basePath}/.`, dist]);
        });
    });
    const flag = init ? "" : "--add";

    if (!pre) {
        try {
            execa.sync("gh-pages", ["-d", src, `--dest=${dest}`, flag, "--remote", remote]);
            log.notice(`Succeeded deploy`);
        } catch (e) {
            log.error(`Failed to deploy`);
            console.log(e);
        }
    }
}
