# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

[0.1.1]: https://github.com/openeudi/dcql/releases/tag/v0.1.1
[0.1.0]: https://github.com/openeudi/dcql/releases/tag/v0.1.0
