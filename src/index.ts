import 'babel-polyfill';
import {
    EOL
} from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { white, blue } from 'typed-colors';
import { prompt, list } from 'typed-prompts';
import * as semver from 'semver';
import {
    Commit,
    Command,
    alias,
    command,
    description,
    withCallback,
    NorthbrookConfig,
    Stdio,
    DepGraph,
} from 'northbrook';
import {merge} from 'lodash';
import {
    describeTag,
    diffSince,
    getCurrentSHA,
    getLastTaggedCommit,
} from './git';

import {
    Package,
    PackageConfig,
    Dependencies,
} from './types';

import {
    generateVersions,
    createHashmap,
    mockHashmap,
    bumpPackages,
} from './util';

export const plugin = command(
    alias('locked-bump'),
    description('Bump versions of packages that need it, using the same version for all packages'),
);

withCallback(plugin, async ({config, depGraph}, io) => {
    try {
        let commit: string|undefined = undefined;
        let lastTag: string|undefined = undefined;
        try {
            commit = await getLastTaggedCommit();
            lastTag = await describeTag(commit);
        } catch(err) {
            console.log('git could not find a tag.');
        }

        const newVersion = await askVersion(lastTag);
        if (lastTag !== undefined) {
            await processChangedPackages(lastTag, newVersion, config, depGraph, io);
        } else {
            await processAllPackages(newVersion, depGraph);
        }
    } catch(err) {
        console.log(`there was a problem:\n${err}`);
    }
});

async function askVersion(
    lastTag: string|undefined,
): Promise<string> {
    interface Answers {
        version: string;
    }

    // undefined means there was no tag
    // null means there was a tag but could not be parsed
    const parsedTag = lastTag === undefined
        ? undefined
        : semver.clean(lastTag);

    const custom = 'Custom';

    if (parsedTag === null) {
        console.log(`Could not parse last git tag: ${lastTag}`);
    }

    const possibleAnswers = [
        custom,
        ...(parsedTag != null ? generateVersions(parsedTag) : [])
    ];
    const answer = await prompt<Answers>([
        list('version', 'What version should we bump to?', possibleAnswers)
    ]);

    if (answer.version !== custom) {
        return answer.version;
    }

    const customAnswer = await prompt<Answers>([{
        type: 'input',
        name: 'version',
        message: 'Enter custom version (please respect SemVer)',
        validate: (input: string|null) => input !== null,
        filter: (input: string) => semver.clean(input),
    }]);
    return customAnswer.version;
}

/**
 * Algorithm:
 * 1) get dependants of all changed packages, put them into a hash-map,
 *    including changed packages themselved.
 * 2) go through all packages, if it's in the hash-map, assign version 
 * 3) for each package, go through dependencies; if it's in the hash-map assign version
 * 4) return modified pkg
 */
async function processChangedPackages(
    lastTag: string,
    newVersion: string,
    config: NorthbrookConfig,
    depGraph: DepGraph,
    io: Stdio,
): Promise<void> {
    const pkgs = depGraph.packages();

    const changedPkgs = (
        await Promise.all(pkgs.map(async pkg => {
            const changed = await isChanged(pkg, lastTag, config, io);
            if (changed) return pkg;
            return undefined;
        }))
    ).filter(pkg => pkg !== undefined) as Array<Package>;

    const hashmap = createHashmap(changedPkgs, depGraph);
    const bumpedPkgs = bumpPackages(pkgs, hashmap, newVersion);

    await commitToFileSystem(bumpedPkgs);
}

async function processAllPackages(
    newVersion: string,
    depGraph: DepGraph,
): Promise<void> {
    const pkgs = depGraph.packages();
    const hashmap = mockHashmap(pkgs);
    const bumpedPkgs = bumpPackages(pkgs, hashmap, newVersion);

    await commitToFileSystem(bumpedPkgs);
}


async function commitToFileSystem(
    bumpedPkgs: Array<Package>,
): Promise<void> {
    await Promise.all(bumpedPkgs.map(writeToFile));
}

async function writeToFile(
    pkg: Package,
): Promise<void> {
    await new Promise((resolve, reject) => {
        fs.writeFile(
            path.join(pkg.path, 'package.json'),
            JSON.stringify(pkg.config, null, 2),
            (err) => {
                if (err == null) {
                    return resolve();
                }
                return reject();
            },
        );
    });
}

async function isChanged(
    pkg: Package,
    lastTag: string,
    config: NorthbrookConfig,
    io: Stdio,
): Promise<boolean> {
    if (config.circular && config.circular.indexOf(pkg.name) > -1) {
        io.stdout.write(`${EOL}${white('> ')}${blue(pkg.name)}${EOL}skipping due to circular dependencies${EOL}`);
        return false;
    }
    const diff = await diffSince(lastTag, pkg.path);
    return diff !== '';
}