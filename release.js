#!/usr/bin/env node
'use strict';

const args = require('args');
const path = require('path');
const fs = require('fs');

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
const isRemoveDist = gitignore !== releaseIgnore;
// has dist
if (isRemoveDist) {
    fs.writeFileSync(path.resolve(cwd, ".gitignore"), releaseIgnore, { encoding: "utf8" });
}

shell(`git add ./`);
shell(`git commit -am "chore: Release ${version}"`);
try {
    shell(`git tag -d ${version}`);
} catch(e) {

}
shell(`git tag ${version}`);
shell(`git push ${flags.remote} ${version}`);

if (isRemoveDist) {
    // restore gitignore
    fs.writeFileSync(path.resolve(cwd, ".gitignore"), gitignore, { encoding: "utf8" });
    shell("git rm -rf dist/");
    shell("git add ./");
    shell(`git commit -am "chore: Release ${version}"`);
}
