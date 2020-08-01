module.exports = function (pkg, types = [], ignore = []) {
  // dependencies collection
  const dependencies = []

  // gather all dependencies
  for (const type of types) {
    if (!pkg[type]) continue

    // loop & gather
    for (const [name, version] of Object.entries(pkg[type])) {
      if (!ignore.includes(name)) dependencies.push({ type, name, version })
    }
  }

  return dependencies
}
