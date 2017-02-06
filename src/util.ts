import {
    Package,
    PackageConfig,
    Dependencies,
    Hashmap,
} from './types';

import {
    DepGraph,
} from 'northbrook';

import {
    merge,
} from 'lodash';

import * as semver from 'semver';

export function generateVersions(
    version: string,
): Array<string> {
    if (semver.prerelease(version) !== null) {
        return [
            semver.inc(version, 'patch'),
        ];
    }
    return [
        semver.inc(version, 'patch'),
        semver.inc(version, 'minor'),
        semver.inc(version, 'major'),
    ];
}

export function bumpPackages(
    pkgs: Array<Package>,
    hashmap: Hashmap,
    version: string,
): Array<Package> {
    return pkgs.map(pkg => bumpPackage(pkg, hashmap, version));
}

export function createHashmap(
    changedPkgs: Array<Package>,
    depGraph: DepGraph,
): Hashmap {
    return changedPkgs.reduce((hashmap, cPkg) => {
        hashmap[cPkg.name] = 1;
        return depGraph.dependantsOf(cPkg.name).reduce((hashmap, dPkgName) => {
            hashmap[dPkgName] = 1;
            return hashmap;
        }, hashmap);
    }, {} as Hashmap);
}

export function mockHashmap(
    pkgs: Array<Package>,
): Hashmap {
    return pkgs.reduce((hashmap, pkg) => {
        hashmap[pkg.name] = 1;
        return hashmap;
    }, {} as Hashmap);
}

function bumpPackage(
    pkg: Package,
    hashmap: Hashmap,
    version: string,
): Package {
    if (hashmap[pkg.name] !== 1) {
        return pkg;
    }
    const {config} = pkg;
    const newConfig = merge({
        ...config,
        version,
    }, {
        dependencies: bumpDeps(
            config.dependencies, hashmap, version,
        ),
        optionalDependencies: bumpDeps(
            config.optionalDependencies, hashmap, version,
        ),
        devDependssssncies: bumpDeps(
            config.devDependencies, hashmap, version,
        ),
        peerDependencies: bumpDeps(
            config.peerDependencies, hashmap, version,
        ),
    });
    return {
        ...pkg,
        config: newConfig,
    };
}

function bumpDeps(
    deps: Dependencies | undefined,
    hashmap: Hashmap,
    version: string,
): Dependencies | undefined {
    if (deps === undefined) {
        return undefined;
    }

    return Object.keys(deps).reduce((newDeps, dep) => {
        if (hashmap[dep] !== 1) {
            newDeps[dep] = deps[dep];
        } else {
            newDeps[dep] = `^${version}`;
        }
        return newDeps;
    }, {} as Dependencies);
}