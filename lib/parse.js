module.exports = function (pkg, { types, scopes, ignore }) {
  // dependencies collection
  const dependencies = []

  // gather all dependencies
  for (const type of types) {
    if (!pkg[type]) continue

    // loop & gather
    for (const [name, version] of Object.entries(pkg[type])) {
      // skip unless within defined scopes
      if (scopes.some(scope => !name.startsWith(`@${scope}/`))) continue

      // skip if in ignore list
      if (ignore.includes(name)) continue

      dependencies.push({ type, name, version })
    }
  }

  return dependencies
}
