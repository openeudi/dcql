import { DcqlValidationError } from '../errors.js';

/** OpenID4VP 1.0 §6.1 / §6.3: "a non-empty string consisting of alphanumeric, underscore (_), or hyphen (-) characters". */
const ID_PATTERN = /^[A-Za-z0-9_-]+$/;

export function assertValidId(id: string, label: string, path: string): void {
    if (!ID_PATTERN.test(id)) {
        throw new DcqlValidationError(
            `${label} must be a non-empty string of alphanumeric, underscore or hyphen characters`,
            'invalid_id',
            path
        );
    }
}
