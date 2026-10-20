import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { describe, expect, it } from 'vitest';

import { VERSION } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * The exported `VERSION` constant is maintained by hand and went stale once
 * already (it read `0.1.1` while the package was 0.2.0). Nothing else in the
 * suite compares it against the real package version.
 */
describe('VERSION export', () => {
    it('matches the version in package.json', () => {
        const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf-8')) as { version: string };

        expect(VERSION).toBe(pkg.version);
    });
});
