import {Stdio} from 'northbrook';
import {spawn} from 'child_process';
import {normalize} from 'path';
import { stdio } from 'stdio-mock';
import execute from './execute';

const defaultStdio: Stdio = stdio();

const cmd = 'git';

export function getCurrentSHA(
    cwd: string = process.cwd(),
    io: Stdio = defaultStdio,
    _spawn = spawn,
): Promise<string> {
    const args = ['rev-parse', 'HEAD'];
    return execute(cmd, args, io, cwd, _spawn).then(({stdout}) => stdout.trim());
}

export function diffSince(
    since: string,
    path: string,
    cwd: string = process.cwd(),
    io: Stdio = defaultStdio,
    _spawn = spawn,
): Promise<string> {
    const args = ['diff', '--name-only', since, '--', normalize(path)];
    return execute(cmd, args, io, cwd, _spawn).then(({stdout}) => stdout.trim());
}

export function getLastTaggedCommit(
    cwd: string = process.cwd(),
    io: Stdio = defaultStdio,
    _spawn = spawn,
): Promise<string> {
    const args = ['rev-list', '--tags', '--max-count=1'];
    return execute(cmd, args, io, cwd, _spawn).then(({stdout}) => stdout.trim());
}

export function describeTag(
    commit: string,
    cwd: string = process.cwd(),
    io: Stdio = defaultStdio,
    _spawn = spawn,
): Promise<string> {
    const args = ['describe', '--tags', commit];
    return execute(cmd, args, io, cwd, _spawn).then(({stdout}) => stdout.trim());
}

export function hasTags(
    cwd: string = process.cwd(),
    io: Stdio = defaultStdio,
    _spawn = spawn,
): Promise<boolean> {
    const args = ['tag'];
    return execute(cmd, args, io, cwd, _spawn).then(({stdout}) => Boolean(stdout.trim()));
}
