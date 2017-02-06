import {
    Hashmap,
    Package,
} from '../types';

import {
    generateVersions,
    createHashmap,
    mockHashmap,
    bumpPackages,
} from '../util';
import {DepGraph} from 'dependency-graph';

describe('generate versions', () => {
    it('should generate versions from unstable', () => {
        const v = generateVersions('0.0.1');
        expect(v).toEqual([
            '0.0.2',
            '0.1.0',
            '1.0.0',
        ]);
    });

    it('should generate versions from stable', () => {
        const v = generateVersions('1.0.0');
        expect(v).toEqual([
            '1.0.1',
            '1.1.0',
            '2.0.0',
        ]);
    });

    it('should generate major version from pre-major version', () => {
        const v = generateVersions('1.0.0-alpha');
        expect(v).toEqual([
            '1.0.0',
        ]);
    });

    it('should generate correct version from pre-patch version', () => {
        const v = generateVersions('1.0.1-alpha');
        expect(v).toEqual([
            '1.0.1',
        ]);
    });

    it('should generate correct version from pre-minor version', () => {
        const v = generateVersions('1.1.0-alpha');
        expect(v).toEqual([
            '1.1.0',
        ]);
    });
});

describe('hashmap', () => {
    const pkgs = [
        { name: 'pkg-1' },
        { name: 'pkg-2' },
        { name: 'pkg-3' },
        { name: 'pkg-4' },
    ] as Array<Package>;

    describe('create hashmap', () => {
        let depGraph;

        beforeEach(() => {
            depGraph = new DepGraph();
            pkgs.forEach(pkg => depGraph.addNode(pkg.name));
            // pkg-1 <- pkg-2 <- pkg-3
            depGraph.addDependency('pkg-2', 'pkg-1');
            depGraph.addDependency('pkg-3', 'pkg-2');
        });

        it('should create correct hashmap when pkg-1 is changed', () => {
            const hashmap = createHashmap([pkgs[0]], depGraph);
            expect(hashmap).toEqual({
                'pkg-1': 1,
                'pkg-2': 1,
                'pkg-3': 1,
            });
        });

        it('should create correct hashmap when pkg-2 is changed', () => {
            const hashmap = createHashmap([pkgs[1]], depGraph);
            expect(hashmap).toEqual({
                'pkg-2': 1,
                'pkg-3': 1,
            });
        });

        it('should create correct hashmap when pkg-3 is changed', () => {
            const hashmap = createHashmap([pkgs[2]], depGraph);
            expect(hashmap).toEqual({
                'pkg-3': 1,
            });
        });

        it('should create correct hashmap when pkg-4 is changed', () => {
            const hashmap = createHashmap([pkgs[3]], depGraph);
            expect(hashmap).toEqual({
                'pkg-4': 1,
            });
        });

        it('should create correct hashmap when nothing is changed', () => {
            const hashmap = createHashmap([], depGraph);
            expect(hashmap).toEqual({});
        });
    });
    describe('mock hashmap', () => {
        it('should mock a hashmap by including all packages', () => {
            const hashmap = mockHashmap(pkgs);
            expect(hashmap).toEqual({
                'pkg-1': 1,
                'pkg-2': 1,
                'pkg-3': 1,
                'pkg-4': 1,
            });
        });

        it('should create an empty hashmap for empty package list', () => {
            const hashmap = mockHashmap([]);
            expect(hashmap).toEqual({});
        });
    });
});

describe('bump packages', () => {
    let pkgs;
    
    beforeEach(() => {
        pkgs = [
            {
                name: 'pkg-1',
                path: 'pkg-1',
                config: {
                    name: 'pkg-1',
                    version: '1.0.0',
                },
            },
            {
                name: 'pkg-2',
                path: 'pkg-2',
                config: {
                    name: 'pkg-2',
                    version: '1.0.0',
                    dependencies: {
                        'pkg-1': '^1.0.0'
                    },
                },
            },
            {
                name: 'pkg-3',
                path: 'pkg-3',
                config: {
                    name: 'pkg-3',
                    version: '1.0.0',
                    devDependencies: {
                        'pkg-2': '^1.0.0'
                    },
                },
            },
            {
                name: 'pkg-4',
                path: 'pkg-4',
                config: {
                    name: 'pkg-4',
                    version: '1.0.0',
                    optionalDependencies: {
                        'pkg-3': '^1.0.0'
                    },
                },
            },
            {
                name: 'pkg-5',
                path: 'pkg-5',
                config: {
                    name: 'pkg-5',
                    version: '1.0.0',
                    peerDependencies: {
                        'pkg-4': '^1.0.0'
                    },
                },
            },
        ];
    });

    function assertSnapshot(newPkgs) {
        expect(JSON.stringify(newPkgs, null, 2)).toMatchSnapshot();
    }

    it('should bump all packages including dependencies', () => {
        const hashmap = pkgs.reduce((hashmap, pkg) => {
            hashmap[pkg.name] = 1;
            return hashmap;
        }, {} as Hashmap);

        const newPkgs = bumpPackages(pkgs, hashmap, '1.0.1');

        assertSnapshot(newPkgs);
    });

    it('should bump all packages, ignoring irrelevant dependencies', () => {
        const hashmap = pkgs.reduce((hashmap, pkg) => {
            hashmap[pkg.name] = 1;
            return hashmap;
        }, {} as Hashmap);

        pkgs[2].config.devDependencies['foo'] = '^1.0.0';

        const newPkgs = bumpPackages(pkgs, hashmap, '1.0.1');

        expect(newPkgs[2].config.devDependencies['foo']).toBe('^1.0.0');
        assertSnapshot(newPkgs);
    });

    it('should bump some packages', () => {
        const hashmap = {
            'pkg-4': 1,
            'pkg-5': 1
        };
        const newPkgs = bumpPackages(pkgs, hashmap, '1.0.1');

        assertSnapshot(newPkgs);
    });

    it('should bump no packages', () => {
        const hashmap = {};
        const newPkgs = bumpPackages(pkgs, hashmap, '1.0.1');

        expect(newPkgs).toEqual(pkgs);
    });
});