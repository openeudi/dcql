# Animo DCQL Interop Vectors

Test vectors derived from Animo's `dcql` reference implementation at the OpenWallet Foundation.

**Source:** https://github.com/openwallet-foundation-labs/dcql
**License:** Apache-2.0

These fixtures re-express Animo's test cases in `@openeudi/dcql`'s `DecodedCredential`
input format. The semantics (query structure, expected match outcome) are unchanged.

## Attribution

Copyright © Animo Solutions and the OpenWallet Foundation contributors.
Licensed under Apache License, Version 2.0.

## Local adjustments

OpenID4VP 1.0 §6.1 makes `meta` REQUIRED, with a non-empty `vct_values` for `dc+sd-jwt`
(B.3.5) and a `doctype_value` for `mso_mdoc` (B.2.3), and `validateQuery` enforces this. Vectors
that omitted `meta` now carry one, and their credentials carry the matching `vct`. The expected
match outcomes are unchanged.
