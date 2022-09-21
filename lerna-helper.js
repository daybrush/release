#!/usr/bin/env node
'use strict';

const { program } = require("commander");
const { updateChangelogByOptions } = require("./lerna/changelog");
const { deploy } = require("./lerna/deploy");
const { publishPackages } = require("./lerna/publish");
const { releaseRoot, releasePackage } = require("./lerna/release");
const { addTags } = require("./lerna/tags");
const { updateVersions } = require("./lerna/versions");


program
    .command("deploy")
    .description(`Deploy the files to gh-pages.
For the list of files to be deployed to gh-pages, use the lernaHelperDeployFileMap property of lerna.json.`)
    .addHelpText("after", `
lerna.json:
{
    "lernaHelperOptions": {
        deployFileMap: [
            {
                "basePath": "packages/core/dist",
                "dists": [
                    "demo/release/{{version}}/dist",
                    "demo/release/latest/dist"
                ]
            },
            {
                "basePath": "doc",
                "dists": [
                    "demo/release/{{version}}/doc",
                    "demo/release/latest/doc"
                ]
            }
        ]
    }
}
Example call:
    $ lerna-helper deploy
    $ lerna-helper deploy --remote upstream
    $ lerna-helper deploy --init --remote upstream
    $ lerna-helper deploy --init --remote upstream --base core-package
    `)
    .option("--base <string>", "The name of the base package from which to get version information", "")
    .option("--init", "Whether to initialize all files in the gh-pages branch", false)
    .option("--pre", "Whether to build only without deploying", false)
    .option("--remote <string>", "The remote name that manages the repository", "origin")
    .option("--src <string>", "Folder path to deploy to gh-pages", "./demo")
    .option("--dest <string>", "Destination folder path deployed to gh-pages", "./")
    .action(options => {
        deploy(options);
    });

program
    .command("release")
    .description(`Creating changelogs, committing releases, adding tags, and creating github release notes are executed.
You can use the beforeReleaseScripts property to call commands before the release is executed.
`)
    .addHelpText("after", `
lerna.json:
{
    "lernaHelperOptions": {
        "beforeReleaseScripts": [
            "npm run packages:build",
            "npm run demo:build",
            "npm run deploy"
        ]
    }
}
Example call:
    $ lerna-helper release --base core-package
    $ lerna-helper release --base core-package --no-scripts
    $ lerna-helper release --type independent --base react-package
    $ lerna-helper release --type independent --base react-package
`)
    .option("--type <string>", "release type (root, independent)", "root")
    .option("--base <string>", "The name of the base package from which to get version information", "")
    .option("--no-scripts", "Whether to run scripts of beforeReleaseScripts that are executed before root release", true)
    .option("--remote <string>", "The remote name that manages the repository", "origin")
    .option("--branch <string>", "Branch name to push commit and tag", "master")
    .action(options => {
        if (options.type === "independent") {
            releasePackage(options);
        } else {
            releaseRoot(options);
        }
    });

program
    .command("version")
    .description(`Updates the versions of packages that have version-changed local package as a dependency.
Using lernaHelperReleaseType in package.json will force the version incremented by the release type. The type follows the semver's ReleaseType.`)
    .addHelpText("after", `
package.json:
{
    "version: "1.0.0-beta.0",
    "lernaHelperReleaseType": "prerelease"
}
Example call:
    $ lerna-helper version
`)
    .action(() => {
        updateVersions();
    });

program
    .command("publish")
    .description(`Publish lerna's packages to npm except private.
If you use lernaHelerPublishTag in package.json, you can force publish with tag.`)
    .addHelpText("after", `
package.json
{
    "version: "1.0.0-beta.0",
    "lernaHelperPublishTag": "beta"
}
Example call:
    $ lerna-helper publish --ignore react-package
    $ lerna-helper publish --tag beta
`)
    .option("--commit <string>", "A commit message is added when the packages are published.", "")
    .option("--ignore <string>", "Packages not to publish", "")
    .option("--tag <string>", "Registers the published package with the given tag", "")
    .action(options => {
        publishPackages(options);
    });

program
    .command("changelog")
    .description(`Creates a changelog from the tagged version to the version in package.json.`)
    .addHelpText("after", `
Example call:
    $ lerna-helper changelog --type root --base core-package
    $ lerna-helper changelog --type independent --base react-package
`)
    .option("--type <string>", "changelog's type (root, independent, all)", "root")
    .option("--base <string>", "The name of the base package from which to get version information", "")
    .action(options => {
        updateChangelogByOptions(options);
    });


program
    .command("tags")
    .description(`Add tags to the current version of all packages except private.`)
    .option("--push", "Whether to push to git with tags")
    .option("--remote <string>", "The remote name that manages the repository", "origin")
    .option("--branch <string>", "Branch name to push commit and tag", "master")
    .addHelpText("after", `
Example call:
$ lerna-helper tags
$ lerna-helper tags --push
`)
    .action(options => {
        addTags(options);
    });

program.parse();
