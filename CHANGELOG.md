# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed (BREAKING)

All breaking changes are confined to `validateQuery`, which now rejects queries that OpenID4VP 1.0 forbids. `matchQuery` does not validate and gives the same result as before for existing input, and no input type became stricter (`CredentialQuery.meta` stays optional). The `UnmatchedReason` and `DcqlValidationErrorCode` unions gained members, which an exhaustive `switch` will flag.

- `meta` is required on every credential query (§6.1), with a non-empty `meta.vct_values` for `dc+sd-jwt` (B.3.5) and a non-empty `meta.doctype_value` for `mso_mdoc` (B.2.3). Queries without them fail with `missing_field` (or `invalid_type` for an empty value). This is the change most callers will hit.
- Further §6–§7 rules, which reject queries that are malformed per the spec:
  - credential and claim `id`s must match `[A-Za-z0-9_-]+` (new code `invalid_id`); claim ids must be unique within `claims` (`duplicate_id`);
  - `trusted_authorities` must be a non-empty array whose entries have a non-empty string `type` and a non-empty `values` array of strings;
  - `claims` and claim `values` must be non-empty when present;
  - every claim needs an `id` when `claim_sets` is present, `claim_sets` must be a non-empty array, and `claim_sets` without `claims` is rejected (`invalid_claim_set_reference`);
  - numeric path segments must be non-negative integers, and an `mso_mdoc` path must be exactly `[namespace, element]` (`invalid_claim_path`, §7.2.1);
  - an empty `format` is rejected with `unknown_format`, which was previously declared but never emitted.
- Migration: add `meta` to each credential query, e.g. `meta: { vct_values: ['urn:eudi:pid:1'] }` for an SD-JWT VC PID, `meta: { doctype_value: 'eu.europa.ec.eudi.pid.1' }` for an mdoc PID, or `meta: {}` for a format with no required `meta` members. Write mdoc claim paths as `['<namespace>', '<element>']`, and key the mdoc `DecodedCredential.claims` by namespace.

### Added

- `DecodedCredential.vct_aliases`: further SD-JWT VC types of the credential. A credential matches `meta.vct_values` when its `vct` or any alias is listed, so a national PID (`urn:eudi:pid:<cc>:1`) can match a query for `urn:eudi:pid:1`. Callers fill it from the issuer-signed `aka_vcts` claim and/or type inheritance (`extends`) established out of band; the library does not resolve type metadata.
- `DecodedCredential.holder_bound` and the `UnmatchedReason` `'holder_binding_required'`. When a query requires cryptographic holder binding (the default per §6.1) and a credential has `holder_bound: false`, it does not match. When `holder_bound` is omitted, the check is skipped as before; verifiers should set it.
- `DecodedCredential.trusted_authorities` (`{ type, values }[]`, exported type `CredentialTrustedAuthority`): typed trust information, matched per type against the query's `trusted_authorities`. An `aki` value no longer satisfies an `etsi_tl` query when typed data is given.
- `ClaimsQuery.intent_to_retain` (mso_mdoc, B.2.4), validated as a boolean.
- `DcqlValidationErrorCode` `'invalid_id'`.
- `engines.node` `>=22`. Node 20 reached end of life on 2026-04-30; npm warns on older runtimes (it fails only with `engine-strict`).

### Deprecated

- `DecodedCredential.trusted_authority_ids`: untyped ids match query values of every type. Use `trusted_authorities`. It still works, and is ignored when `trusted_authorities` is present.

### Fixed

- The exported `VERSION` read `0.1.1`; it now matches `package.json`, and a test keeps them in sync.
- README: PID examples now use the PID Rulebook identifiers — SD-JWT VC `vct` `urn:eudi:pid:1` with the claim `birthdate`; mdoc doctype `eu.europa.ec.eudi.pid.1` with `['eu.europa.ec.eudi.pid.1', 'birth_date']`. `age_over_18` appears only for the mdoc proof-of-age attestation `eu.europa.ec.av.1`. The eIDAS Pro link points at `https://eidas-pro.com`.
- A non-array `claim_sets` threw a `TypeError` from `validateQuery`; it now throws `DcqlValidationError` (`invalid_type`).

### Changed

- CI runs type check, tests and build on Node 22 and 24 (was Node 20, end of life since 2026-04-30).
- Test fixtures carry `meta`, and the mdoc spec example uses `[namespace, element]` paths.

## [0.2.0] — 2026-04-24

### Changed (BREAKING)

- `matchQuery` now surfaces the specific `UnmatchedReason` (`format_mismatch`, `vct_mismatch`, `doctype_mismatch`, `missing_claims`, `value_mismatch`, `trusted_authority_mismatch`) for every unmatched entry instead of collapsing every failure to `'no_credential_found'`. `'no_credential_found'` is now reserved for the case where the credential list passed to `matchQuery` is empty.
- Migration: callers asserting `reason === 'no_credential_found'` on non-empty credential inputs should assert on the specific reason (see the union above) or on `!match.satisfied`.

## [0.1.1] — 2026-04-19

### Changed

- First release published via npm Trusted Publishing with OIDC provenance.
- No code changes from 0.1.0.

## [0.1.0] — 2026-04-18

### Added

- Initial release.
- `validateQuery(input)` — DCQL query shape validation with structured `DcqlValidationError` (code + JSON-pointer path).
- `matchQuery(query, credentials)` — format-agnostic credential matching including `claim_sets`, `credential_sets`, `trusted_authorities`, and `multiple: true`.
- `buildSubmission(query, result)` — spec-shaped `{ queryId: credentialId | credentialId[] }` map construction.
- Full type exports: `DcqlQuery`, `CredentialQuery`, `ClaimsQuery`, `CredentialSetQuery`, `TrustedAuthoritiesQuery`, `DecodedCredential`, `DcqlMatchResult`, `DcqlSubmission`.
- Error classes: `DcqlValidationError`, `DcqlMatchError`.
- Interop test vectors from OpenID4VP 1.0 spec and the OpenWallet Foundation Animo reference suite.
- Coverage enforcement at ≥95% lines / ≥90% branches.

[0.2.0]: https://github.com/openeudi/dcql/releases/tag/v0.2.0
[0.1.1]: https://github.com/openeudi/dcql/releases/tag/v0.1.1
[0.1.0]: https://github.com/openeudi/dcql/releases/tag/v0.1.0
