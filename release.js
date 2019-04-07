#!/usr/bin/env node
'use strict';

const args = require('args');

args
    .option('remote', 'Remote to release', "origin")
    .option('init', 'Initialize Remote', false)


require("./prerelease");
const shell = require('./utils').shell;


const flags = args.parse(process.argv);


const addFlag = flags.init ? "" : "-add";
shell(`gh-pages -d ./demo --dest=./ ${addFlag} --remote ${flags.remote}`);

