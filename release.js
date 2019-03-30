#!/usr/bin/env node
'use strict';

const args = require('args');

args
    .option('remote', 'Remote to release', "origin")


require("./prerelease");
const shell = require('./utils').shell;


const flags = args.parse(process.argv);


shell(`gh-pages -d ./demo --dest=./ --add --remote ${flags.remote}`);

