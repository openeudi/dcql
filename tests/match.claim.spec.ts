import { describe, it, expect } from 'vitest';

import { resolveClaimPath, matchClaimValue } from '../src/match/claim.js';

describe('resolveClaimPath', () => {
    it('resolves a single-key path', () => {
        const r = resolveClaimPath({ family_name: 'Doe' }, ['family_name']);
        expect(r).toEqual({ found: true, values: ['Doe'] });
    });

    it('resolves a nested-object path', () => {
        const r = resolveClaimPath({ address: { city: 'Berlin' } }, ['address', 'city']);
        expect(r).toEqual({ found: true, values: ['Berlin'] });
    });

    it('resolves an array-index path', () => {
        const r = resolveClaimPath({ nationalities: ['DE', 'FR'] }, ['nationalities', 0]);
        expect(r).toEqual({ found: true, values: ['DE'] });
    });

    it('resolves a wildcard path returning multiple values', () => {
        const r = resolveClaimPath({ addresses: [{ city: 'Berlin' }, { city: 'Paris' }] }, ['addresses', null, 'city']);
        expect(r).toEqual({ found: true, values: ['Berlin', 'Paris'] });
    });

    it('returns not-found when key is missing', () => {
        const r = resolveClaimPath({ family_name: 'Doe' }, ['given_name']);
        expect(r).toEqual({ found: false, values: [] });
    });

    it('returns not-found when intermediate key is missing', () => {
        const r = resolveClaimPath({ a: {} }, ['a', 'b', 'c']);
        expect(r.found).toBe(false);
    });

    it('returns not-found when array index is out of bounds', () => {
        const r = resolveClaimPath({ items: ['x'] }, ['items', 5]);
        expect(r.found).toBe(false);
    });

    it('returns not-found when wildcard target has no items', () => {
        const r = resolveClaimPath({ addresses: [] }, ['addresses', null, 'city']);
        expect(r.found).toBe(false);
    });

    it('ignores wildcard when node is not an array', () => {
        const r = resolveClaimPath({ data: 'string' }, ['data', null]);
        expect(r.found).toBe(false);
    });

    it('ignores string segment when node is not object', () => {
        const r = resolveClaimPath({ data: ['arr'] }, ['data', 0, 'missing_key']);
        expect(r.found).toBe(false);
    });

    it('ignores numeric segment when node is not array', () => {
        const r = resolveClaimPath({ data: { key: 'value' } }, ['data', 0]);
        expect(r.found).toBe(false);
    });
});

describe('matchClaimValue', () => {
    it('passes presence check when values undefined and path resolves', () => {
        expect(matchClaimValue({ family_name: 'Doe' }, { path: ['family_name'] })).toEqual({
            matched: true,
            extractedValue: 'Doe',
        });
    });

    it('passes when resolved value is in allowed values list', () => {
        expect(matchClaimValue({ nationality: 'DE' }, { path: ['nationality'], values: ['DE', 'FR'] })).toEqual({
            matched: true,
            extractedValue: 'DE',
        });
    });

    it('fails when resolved value not in allowed list', () => {
        expect(matchClaimValue({ nationality: 'US' }, { path: ['nationality'], values: ['DE', 'FR'] })).toEqual({
            matched: false,
            reason: 'value_mismatch',
        });
    });

    it('fails with missing_claims when path does not resolve', () => {
        expect(matchClaimValue({}, { path: ['family_name'] })).toEqual({
            matched: false,
            reason: 'missing_claims',
        });
    });

    it('deep-equals number and boolean values strictly', () => {
        expect(matchClaimValue({ age: 18 }, { path: ['age'], values: ['18'] })).toEqual({
            matched: false,
            reason: 'value_mismatch',
        });
        expect(matchClaimValue({ age: 18 }, { path: ['age'], values: [18] })).toEqual({
            matched: true,
            extractedValue: 18,
        });
        expect(matchClaimValue({ over18: true }, { path: ['over18'], values: [true] })).toEqual({
            matched: true,
            extractedValue: true,
        });
    });

    it('passes if any wildcard-resolved value matches allowed list', () => {
        expect(
            matchClaimValue({ nationalities: ['US', 'DE'] }, { path: ['nationalities', null], values: ['DE'] })
        ).toEqual({ matched: true, extractedValue: 'DE' });
    });
});
