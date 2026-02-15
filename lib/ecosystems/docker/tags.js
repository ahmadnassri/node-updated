import semver from 'semver'

/**
 * Parse Docker tag into version and variant components
 * @param {string} tag - Docker tag (e.g., '18-alpine', 'v7.3.0', 'latest')
 * @returns {{version: string, variant: string}|null} Parsed components or null if not semver
 */
export function parseTag (tag) {
  // Skip non-semver tags
  if (['latest', 'stable', 'lts', 'main', 'master'].includes(tag.toLowerCase())) {
    return null
  }

  // Remove v prefix if present
  let cleaned = tag.startsWith('v') ? tag.slice(1) : tag

  // Try to extract version and variant
  // Variants are anything after the first hyphen that comes after the version
  const match = cleaned.match(/^(\d+(?:\.\d+)?(?:\.\d+)?)(.*)$/)

  if (!match) {
    return null
  }

  const version = match[1]
  const variant = match[2] // Everything after version (including leading hyphen)

  // Validate version is semver-compatible
  if (!semver.valid(semver.coerce(version))) {
    return null
  }

  return { version, variant }
}

/**
 * Compare two version strings using semver
 * @param {string} v1 - First version
 * @param {string} v2 - Second version
 * @returns {number} -1 if v1 < v2, 0 if equal, 1 if v1 > v2
 */
export function compareImageVersions (v1, v2) {
  const coerced1 = semver.coerce(v1)
  const coerced2 = semver.coerce(v2)

  if (!coerced1 || !coerced2) {
    return 0
  }

  return semver.compare(coerced1, coerced2)
}

/**
 * Find the latest tag that matches the variant of the current tag
 * @param {string} currentTag - Current tag (e.g., '18-alpine')
 * @param {Array<string>} availableTags - All available tags
 * @param {string} target - Target update level: 'latest', 'minor', 'patch'
 * @returns {string|null} Latest matching tag or null if current is latest
 */
export function findLatestTag (currentTag, availableTags, target = 'latest') {
  const current = parseTag(currentTag)
  if (!current) {
    return null
  }

  // Filter tags that match the variant
  const matchingTags = availableTags
    .map(tag => ({ tag, parsed: parseTag(tag) }))
    .filter(({ parsed }) => parsed && parsed.variant === current.variant)

  if (matchingTags.length === 0) {
    return null
  }

  // Apply version range constraints based on target
  const currentVersion = semver.coerce(current.version)
  let candidates = matchingTags

  if (target === 'minor') {
    // Only consider same major version
    candidates = matchingTags.filter(({ parsed }) => {
      const v = semver.coerce(parsed.version)
      return v && semver.major(v) === semver.major(currentVersion)
    })
  } else if (target === 'patch') {
    // Only consider same major.minor version
    candidates = matchingTags.filter(({ parsed }) => {
      const v = semver.coerce(parsed.version)
      return v &&
        semver.major(v) === semver.major(currentVersion) &&
        semver.minor(v) === semver.minor(currentVersion)
    })
  }

  if (candidates.length === 0) {
    return null
  }

  // Sort by version (newest first)
  candidates.sort((a, b) => compareImageVersions(b.parsed.version, a.parsed.version))

  // Check if there's a newer version than current
  const latest = candidates[0]
  if (compareImageVersions(latest.parsed.version, current.version) > 0) {
    return latest.tag
  }

  return null
}
