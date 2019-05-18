"use strict";
/**
 * Copyright 2019 Google LLC. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const mv = require("mv");
const ncp_1 = require("ncp");
const tmp = require("tmp");
const util_1 = require("util");
const execSync = (cmd, opts) => cp.execSync(cmd, Object.assign({ encoding: 'utf-8' }, opts));
const keep = false;
const mvp = util_1.promisify(mv);
const ncpp = util_1.promisify(ncp_1.ncp);
const stagingDir = tmp.dirSync({ keep, unsafeCleanup: true });
const stagingPath = stagingDir.name;
const pkg = require('../../package.json');
describe('📦 pack and install', () => {
    /**
     * Create a staging directory with temp fixtures used to test on a fresh
     * application.
     */
    it('should be able to use the d.ts', async () => {
        execSync('npm pack --unsafe-perm');
        const tarball = `google-cloud-datastore-${pkg.version}.tgz`;
        await mvp(tarball, `${stagingPath}/datastore.tgz`);
        await ncpp('system-test/fixtures/sample', `${stagingPath}/`);
        execSync('npm install --unsafe-perm', {
            cwd: `${stagingPath}/`,
            stdio: 'inherit',
        });
        execSync('node --throw-deprecation build/src/index.js', {
            cwd: `${stagingPath}/`,
            stdio: 'inherit',
        });
    });
    /**
     * CLEAN UP - remove the staging directory when done.
     */
    after('cleanup staging', () => {
        if (!keep) {
            stagingDir.removeCallback();
        }
    });
});
//# sourceMappingURL=install.js.map