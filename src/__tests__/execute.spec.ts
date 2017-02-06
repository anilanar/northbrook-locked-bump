/**
 The MIT License (MIT)

 Copyright (c) 2016 Tylor Steinberger

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated documentation files (the "Software"), to
 deal in the Software without restriction, including without limitation the
 rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 sell copies of the Software, and to permit persons to whom the Software is
 furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included in
 all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 IN THE SOFTWARE.
**/

import * as assert from 'assert';
import { stdio } from 'stdio-mock';
import { mockSpawn, MockChildProcess } from 'spawn-mock';

import execute from '../execute';

const command = 'git';
const args = ['commit', '--dry-run'];
const cwd = __dirname;

describe('execute', () => {
  describe('given a command with arguments, stio, a directory and spawn', () => {
    it('executes a command with given arguments', () => {
      const io = stdio();

      const spawn = mockSpawn(function (cp: MockChildProcess) {
        assert.strictEqual(cp.cmd, command);
        assert.deepEqual(cp.args, args);
        cp.end();
      });

      return execute(command, args, io, __dirname, spawn);
    });

    it('writes data to stdout', (done) => {
      const io = stdio();

      const spawn = mockSpawn(function (cp: MockChildProcess) {
        cp.stdout.write('hello');
      });

      io.stdout.on('data', (data: string) => {
        if (data.trim()) {
          assert.strictEqual(data.toString(), 'hello');
          done();
        }
      });

      execute(command, args, io, cwd, spawn);
    });

    it('writes data to stder', (done) => {
      const io = stdio();

      const spawn = mockSpawn(function (cp: MockChildProcess) {
        cp.stderr.write('hello');
      });

      io.stderr.on('data', (data: string) => {
        if (data.trim()) {
          assert.strictEqual(data.toString(), 'hello');
          done();
        }
      });

      execute(command, args, io, cwd, spawn);
    });

    it('returns a promise with message array from stdout if passes', () => {
      const io = stdio();

      const spawn = mockSpawn(function (cp: MockChildProcess) {
        cp.stdout.write('Hello');
        cp.stdout.write('World');
        setTimeout(() => cp.end());
      });

      return execute(command, args, io, cwd, spawn).then(({stdout}) => {
        assert.strictEqual(stdout, 'HelloWorld');
      });
    });

    it('rejects a promise if child process exits with non-zero code', (done) => {
      const io = stdio();

      const spawn = mockSpawn(function (cp: MockChildProcess) {
        cp.emit('close', 1);
      });

      execute(command, args, io, cwd, spawn)
        .then(() => {
          done(new Error('Should not resolve promise'));
        })
        .catch(() => {
          done();
        });
    });
  });
});