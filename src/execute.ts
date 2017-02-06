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

import { spawn } from 'child_process';
import { EOL } from 'os';

import { Stdio } from 'northbrook';

export default function execute(
  cmd: string,
  args: Array<string>,
  io: Stdio,
  cwd: string,
  _spawn = spawn
): Promise<{ stdout: string, stderr: string }> {
  const stdio = [
    io.stdin === process.stdin ? 'inherit' : 'pipe',
    io.stdout === process.stdout ? 'inherit' : 'pipe',
    io.stderr === process.stderr ? 'inherit' : 'pipe',
  ];

  return new Promise((resolve, reject) => {
    const cp = _spawn(cmd, args, { cwd, stdio });

    const successBuffer: string[] = [];
    const errorBuffer: string[] = [];

    if (stdio[0] === 'pipe')
      io.stdin.pipe(cp.stdin);

    if (stdio[1] === 'pipe')
      cp.stdout.on('data', d => {
        successBuffer.push(d.toString());
        io.stdout.write(d);
      });

    if (stdio[2] === 'pipe')
      cp.stderr.on('data', d => {
        errorBuffer.push(d.toString());
        io.stderr.write(d);
      });

    const output = () => ({ stdout: successBuffer.join(''), stderr: errorBuffer.join('') });

    function resolveWithBuffer(exitCode: number) {
      if (typeof exitCode === 'number' && exitCode !== 0)
        reject(output());

      resolve(output());
    };

    const rejectWithBuffer = () => reject(output());

    cp.on('close', writeAndEnd(io.stdout, resolveWithBuffer));
    cp.on('end', writeAndEnd(io.stdout, resolveWithBuffer));
    cp.on('error', writeAndEnd(io.stderr, rejectWithBuffer));
  });
}

function writeAndEnd(writable: NodeJS.WritableStream, end: Function) {
  return function (exitCode: number) {
    writable.write(EOL);
    end(exitCode);
  };
};
