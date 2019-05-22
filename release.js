#!/usr/bin/env node
'use strict';

const args = require('args');

args
    .option('remote', 'Remote to release', "origin")
    .option('init', 'Initialize Remote', false)


const version = require("./prerelease").version;
const shell = require('./utils').shell;


const flags = args.parse(process.argv);


const addFlag = flags.init ? "" : "--add";
shell(`gh-pages -d ./demo --dest=./ ${addFlag} --remote ${flags.remote}`);


// remove dist
const cwd = process.cwd();
const gitignore = fs.readFileSync(path.resolve(cwd, ".gitignore"), { encoding: "utf8" });
const releaseIgnore = gitignore.replace(/^dist(\/)*$/mg, "");

// has dist
if (gitignore !== releaseIgnore) {
    fs.writeFileSync(path.resolve(cwd, ".gitignore"), releaseIgnore, { encoding: "utf8" });
}

shell(`git add ./`);
shell(`git commit -am "chore: Release ${version}`);
shell(`git tag -d ${version}`);
shell(`git tag ${version}`);
shell(`git push ${flags.remote} ${version}`);
