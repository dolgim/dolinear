const IDENTIFIER_REGEX = /^[A-Z]{2,5}$/

export function validateIdentifier(identifier: string): boolean {
  return IDENTIFIER_REGEX.test(identifier)
}
