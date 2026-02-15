/**
 * Parse Docker image reference into components
 * @param {string} imageRef - Image reference (e.g., "nginx:1.20", "ghcr.io/owner/app:v2.0")
 * @returns {Object} Parsed image with registry, name, tag
 */
export function parseImage (imageRef) {
  if (!imageRef || typeof imageRef !== 'string' || imageRef.trim() === '') {
    throw new Error('Invalid image reference: must be a non-empty string')
  }

  let registry = 'docker.io'
  let name = ''
  let tag = 'latest'

  // Check for digest first (@sha256:hash)
  const digestIndex = imageRef.indexOf('@')
  let imageWithoutTag = imageRef

  if (digestIndex > 0) {
    // Digest-based reference
    tag = imageRef.substring(digestIndex + 1) // e.g., "sha256:abc123"
    imageWithoutTag = imageRef.substring(0, digestIndex)
  } else {
    // Regular tag-based reference
    // First, extract the tag if present (rightmost :)
    const tagSeparatorIndex = imageRef.lastIndexOf(':')

    // Check if this : is actually a tag separator (not part of registry:port)
    if (tagSeparatorIndex > 0) {
      const afterColon = imageRef.substring(tagSeparatorIndex + 1)
      // If no / after the colon, it's a tag
      if (!afterColon.includes('/')) {
        tag = afterColon
        imageWithoutTag = imageRef.substring(0, tagSeparatorIndex)
      }
    }
  }

  // Parse registry and name
  const slashIndex = imageWithoutTag.indexOf('/')

  if (slashIndex === -1) {
    // Simple image name like "nginx"
    name = 'library/' + imageWithoutTag
  } else {
    const firstPart = imageWithoutTag.substring(0, slashIndex)
    const remainder = imageWithoutTag.substring(slashIndex + 1)

    // Check if first part is a registry (contains . or :, or remainder has another /)
    if (firstPart.includes('.') || firstPart.includes(':') || remainder.includes('/')) {
      registry = firstPart
      name = remainder
    } else {
      // It's docker.io with a namespace
      name = imageWithoutTag
    }
  }

  return { registry, name, tag }
}
