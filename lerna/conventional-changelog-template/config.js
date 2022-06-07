const fs = require("fs");
const path = require("path");
const getConfig = require("conventional-changelog-conventionalcommits");
const Handlebars = require('handlebars');
const { getRootPackage } = require("../packages");
const { gitChangedPathsSync } = require("../git");

function onlyUnique(value, index, self) {
    return self.indexOf(value) === index;
}

Handlebars.registerHelper("groupByPackages", (context, options) => {
    context.sort((a, b) => {
        return b.packages.length - a.packages.length;
    });
    const titles = context.map(({ packagesTitle }) => packagesTitle).filter(onlyUnique);

    // only other
    const length = titles.length;

    if (length === 0 || (length === 1 && titles[0] === "Other")) {
        return context.map(commit => options.fn(commit)).join("");
    }

    // packages
    return titles.map(title => {
        const commits = context.filter(({ packagesTitle }) => title === packagesTitle);

        return `* ${title}
${commits.map(commit => `    ${options.fn(commit)}`).join("")}`;
    }).join("");
});


async function getCustomConfig(options) {
    const root = getRootPackage();
    const nextOptions = {
        types: [
            {
                "type": "feat",
                "section": ":rocket: New Features",
                "hidden": false,
            },
            {
                "type": "fix",
                "section": ":bug: Bug Fix",
                "hidden": false,
            },
            {
                "type": "docs",
                "section": ":memo: Documentation",
                "hidden": false,
            },
            {
                "type": "style",
                "section": ":sparkles: Styling",
                "hidden": false,
            },
            {
                "type": "refactor",
                "section": ":house: Code Refactoring",
                "hidden": false,
            },
            {
                "type": "chore",
                "section": ":mega: Other",
                "hidden": false
            },
        ],
        ...options,
    };
    const config = await getConfig(nextOptions);
    const releasedPackages = nextOptions.packages;

    const packages = releasedPackages.map(package => {
        return {
            ...package,
            location: path.relative(root.location, package.location),
        };
    });

    const conventionalWriterOpts = config.conventionalChangelog.writerOpts;
    const originalTransfrom = conventionalWriterOpts.transform;

    conventionalWriterOpts.transform = (commit, context) => {
        const originalSubject = commit.subject;
        const nextCommit = originalTransfrom(commit, context);

        if (!nextCommit) {
            return;
        }
        nextCommit.subject = originalSubject;

        const packageNames = gitChangedPathsSync(nextCommit.hash).map(commitPath => {
            const commitedPkg = packages.find(pkg => commitPath.indexOf(pkg.location) === 0);

            if (!commitedPkg) {
                return;
            }
            return commitedPkg.name;
        }).filter(Boolean).filter(onlyUnique);

        nextCommit.packages = packageNames.sort((a, b) => {
            return a < b ? 1 : -1;
        });

        const packagesLength = packages.length;
        const packageNamesLength = packageNames.length;

        if (!packagesLength || !packageNamesLength) {
            nextCommit.packagesTitle = "Other";
        } else if (packagesLength === packageNamesLength) {
            nextCommit.packagesTitle = "All";
        } else {
            nextCommit.packagesTitle = packageNames.map(name => `${"`"}${name}${"`"}`).join(", ");
        }
        return nextCommit;
    };

    conventionalWriterOpts.commitGroupsSort = (a, b) => {
        const sections = nextOptions.types.map(type => type.section);

        const gRankA = sections.indexOf(a.title);
        const gRankB = sections.indexOf(b.title);

        if (gRankA >= gRankB) {
            return 1
        } else {
            return -1;
        }
    };

    conventionalWriterOpts.mainTemplate = fs.readFileSync(require.resolve("./template.hbs"), "utf-8");
    conventionalWriterOpts.headerPartial = conventionalWriterOpts.headerPartial.replace(/###/g, "##");

    if (releasedPackages.length) {
        conventionalWriterOpts.headerPartial += `### :sparkles: Packages
${releasedPackages.map(package => {
            return `* ${"`"}${package.name}${"`"} ${package.version}`;
        }).join("\n")}
`;
    }

    return config;
}

module.exports = options => {
    return getCustomConfig(options);
};
