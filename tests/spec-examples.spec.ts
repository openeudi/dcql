import { readdirSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

import { describe, it, expect } from 'vitest';

import { validateQuery, matchQuery, buildSubmission } from '../src/index.js';
import type { DcqlQuery, DecodedCredential, DcqlSubmission } from '../src/types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, 'fixtures', 'spec-examples');

type Fixture = {
    query: unknown;
    credentials: DecodedCredential[];
    expected: { satisfied: boolean; submission?: DcqlSubmission };
};

const fixtures = readdirSync(fixturesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({
        name: f,
        data: JSON.parse(readFileSync(join(fixturesDir, f), 'utf-8')) as Fixture,
    }));

describe('spec-examples — OpenID4VP 1.0 §6', () => {
    for (const { name, data } of fixtures) {
        it(name, () => {
            const q: DcqlQuery = validateQuery(data.query);
            const result = matchQuery(q, data.credentials);
            expect(result.satisfied).toBe(data.expected.satisfied);
            if (data.expected.submission) {
                expect(buildSubmission(q, result)).toEqual(data.expected.submission);
            }
        });
    }
});
