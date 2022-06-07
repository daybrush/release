const log = require("./log");
const execa = require("execa");
const { parseGitRepo, createGitHubClient} = require("@lerna/github-client");

const gitCommit = (commit, msg) => {
    log.notice(`Add commit for ${msg}`);

    return execa("git", ["commit", "-am", commit]);
};

exports.gitCommit = gitCommit;
exports.gitReleaseCommit = tag => {
    return gitCommit(`chore: Release ${tag}`, `${tag} Release`);
};
exports.gitAdd = () => {
    return execa("git", ["add", "./"]);
};
exports.getTags = () => {
    return execa.sync("git", ["tag"]).stdout.split("\n");
};
exports.gitTags = tags => {
    return Promise.all(tags.map(tag => {
        log.notice(`Add tag ${tag}`);

        return execa("git", ["tag", tag, "-m", tag, "--force"]);
    }));
};

exports.gitPush = (remote = "origin", branch = "master") => {
    log.notice(`Push commits and tags`);
    return execa("git", ["push", "--follow-tags", "--no-verify", "--atomic", remote, branch]);
}

exports.gitChangedPathsSync = sha => {
    const result = execa.sync("git", ["show", "-m", "--name-only", "--pretty=format:", "--first-parent", sha]);

    return result.stdout.split("\n");
}

exports.gitRelease = async (newEntry, { remote, tag, title }) => {
    log.notice(`Release to github with changelog (remote: ${remote}, tag: ${tag}, title: ${title})`);
    const client = createGitHubClient();
    const repo = parseGitRepo(remote, {});

    await client.repos.createRelease({
        owner: repo.owner,
        repo: repo.name,
        tag_name: tag,
        name: title,
        body: newEntry,
        draft: false,
        prerelease: false,
    });
}
