#!/usr/bin/env node
'use strict';

const pkg = require(process.cwd() + '/package.json');
const shell = require('./utils').shell;
const args = require('args');

args
    .option('dirs', 'Directories to copy', 'dist')


const flags = args.parse(process.argv);
const version = pkg.version;

shell(`mkdir -p ./demo/release`);
shell(`rm -rf ./demo/release/${version}`);
shell(`rm -rf ./demo/release/latest`);
shell(`mkdir -p ./demo/release/${version}`);
shell(`mkdir -p ./demo/release/latest`);

(flags.dirs || "").split(",").forEach(dir => {
    if (!dir) {
        return;
    }
    shell(`cp -a ./${dir}/. ./demo/release/${version}/${dir}`);
    shell(`cp -a ./${dir}/. ./demo/release/latest/${dir}`);
});


exports.version = version;
