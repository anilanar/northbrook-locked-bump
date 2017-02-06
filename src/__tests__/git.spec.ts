import { Stdio } from 'northbrook';
import { stdio } from 'stdio-mock';
import { mockSpawn, MockChildProcess } from 'spawn-mock';
import { spawn } from 'child_process';

import * as git from '../git';

const cwd = __dirname;

async function assert(
  fn: (cwd: string, io: Stdio, _spawn: typeof spawn) => void,
  expectedArgs: Array<string>,
  mockOutput: string,
  expectedResult: any,
): Promise<void> {
    const io = stdio();

    const spawn = mockSpawn(function (cp: MockChildProcess) {
      expect(cp.args).toEqual(expectedArgs);
      cp.stdout.write(mockOutput);
        setTimeout(() => cp.end());
    });

    const received = await fn(cwd, io, spawn);
    expect(received).toBe(expectedResult);
}

describe('git', () => {
    it('should get current SHA', async () => {
      await assert(
        git.getCurrentSHA,
        ['rev-parse', 'HEAD'],
        'commit-hash\r\r',
        'commit-hash',
      );
    });

    it('should get diff since', async () => {
      await assert(
        (cwd, io, _spawn) => git.diffSince('commit-hash', 'foo/bar', cwd, io, _spawn),
        ['diff', '--name-only', 'commit-hash', '--', 'foo/bar'],
        'foo/bar diff\r\r',
        'foo/bar diff', 
      );
    });

    it('should get last tagged commit', async () => {
      await assert(
        git.getLastTaggedCommit,
        ['rev-list', '--tags', '--max-count=1'],
        'commit-hash\r\r',
        'commit-hash',
      );
    });

    it('should describe tag', async () => {
      await assert(
        (cwd, io, _spawn) => git.describeTag('commit-hash', cwd, io, _spawn),
        ['describe', '--tags', 'commit-hash'],
        'v1.0.0\r\r',
        'v1.0.0', 
      );
    });

    it('should tell if has tags', async () => {
      await assert(
        git.hasTags,
        ['tag'],
        'v1.0.1\rv1.0.0\r\r',
        true,
      );
    });

    it('should tell if does not have tags', async () => {
      await assert(
        git.hasTags,
        ['tag'],
        '\r\r',
        false,
      );
    });
});