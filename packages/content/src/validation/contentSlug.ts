export const CONTENT_SLUG_MAX_LENGTH = 128

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f-\u009f]/
const WHITESPACE = /\s/
const UPPERCASE = /[A-Z]/
const LOWERCASE_KEBAB_CASE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export function validateContentSlug(value: unknown): true | string {
  if (typeof value !== 'string' || value.length === 0) {
    return 'Slug cannot be empty.'
  }

  if (value.length > CONTENT_SLUG_MAX_LENGTH) {
    return `Slug must be ${CONTENT_SLUG_MAX_LENGTH} characters or fewer.`
  }

  if (CONTROL_CHARACTER.test(value)) {
    return 'Slug cannot contain control characters.'
  }

  if (WHITESPACE.test(value)) {
    return 'Slug cannot contain whitespace.'
  }

  if (UPPERCASE.test(value)) {
    return 'Slug must use lowercase letters.'
  }

  if (!LOWERCASE_KEBAB_CASE.test(value)) {
    return 'Slug must use lowercase kebab-case with letters, numbers, and single dashes.'
  }

  return true
}
