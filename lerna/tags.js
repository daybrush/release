const { getPackages } = require("./packages");
const { gitTags, gitPush } = require("./git");

exports.addTags = async ({ push, remote, branch }) => {
    const packages = await getPackages();

    await gitTags(packages.filter(pkg => !pkg.private).map(pkg => {
        return `${pkg.name}@${pkg.version}`;
    }));
    if (push) {
        await gitPush(remote, branch);
    }
};