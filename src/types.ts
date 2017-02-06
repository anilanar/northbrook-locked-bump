export interface Package {
    name: string;
    config: PackageConfig;
    path: string;
}

export interface PackageConfig {
    name: string,
    version: string,
    dependencies?: Dependencies,
    devDependencies?: Dependencies,
    peerDependencies?: Dependencies,
    optionalDependencies?: Dependencies,
}

export type Dependencies = {[key: string]: string};

export type Hashmap = {[key: string]: number};