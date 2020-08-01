module.exports = class Grid {
  constructor () {
    this.rows = []
    this.widths = []
  }

  measure (row) {
    for (const [index, value] of row.entries()) {
      const width = value ? value.length : 0

      // overwrite column width if this one is bigger
      this.widths[index] = this.widths[index] > width ? this.widths[index] : width
    }
  }

  row (data) {
    this.measure(data)
    this.rows.push(data)
  }

  render () {
    for (const row of this.rows) {
      for (const [index, value] of row.entries()) {
        process.stderr.write((value || '').padEnd(this.widths[index]))
        if (index !== row.length - 1) process.stderr.write('\t')
      }

      process.stderr.write('\n')
    }

    process.stderr.write('\n')
  }
}
