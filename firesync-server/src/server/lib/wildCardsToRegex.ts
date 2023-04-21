/**
 * Turn a pattern with '*' as wildcards into a proper regex
 * E.g. '*.example.com' -> /^.*\.example\.com$/
 * @param pattern The simple string pattern with * as wild cards
 * @param wildcardMatch What should the wild card match. Expressed as a regex, defaults to '.*' for all characters.
 */
export const wildCardsToRegex = (pattern: string, wildcardMatch = '.*') => {
  return new RegExp(
    `^${pattern.split('*').map(escapeRegex).join(wildcardMatch)}$`
  )
}

/**
 * Convert a doc key pattern into a regex that will match doc keys that fit the pattern
 * The wildcard '*' characters will only match valid doc key characters between / characters
 * E.g. `foo/*` will match 'foo/bar' but not 'foo' or 'foo/bar/baz'
 */
export const docKeyPatternToRegex = (pattern: string) =>
  wildCardsToRegex(pattern, '[a-zA-Z0-9\\-]+')

// https://stackoverflow.com/a/6969486
const escapeRegex = (string: string) =>
  string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
