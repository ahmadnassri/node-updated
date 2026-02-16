export default class Grid {
  constructor (title = null) {
    this.rows = []
    this.widths = []
    this.title = title
  }

  measure (row) {
    for (const [index, value] of row.entries()) {
      // Strip ANSI codes for accurate width measurement
      const width = value ? this.stripAnsi(value).length : 0

      // overwrite column width if this one is bigger
      this.widths[index] = this.widths[index] > width ? this.widths[index] : width
    }
  }

  stripAnsi (str) {
    // Remove ANSI escape codes for accurate length measurement
    return str.replace(/\u001b\[\d+m/g, '')
  }

  row (data) {
    this.measure(data)
    this.rows.push(data)
  }

  render () {
    if (this.rows.length === 0) return

    // Box drawing characters
    const chars = {
      topLeft: '┌',
      topRight: '┐',
      bottomLeft: '└',
      bottomRight: '┘',
      horizontal: '─',
      vertical: '│',
      leftT: '├',
      rightT: '┤',
      cross: '┼'
    }

    // Calculate total width for borders
    const totalWidth = this.widths.reduce((sum, w) => sum + w, 0) + (this.widths.length - 1) * 3 + 2

    // Top border with optional title
    if (this.title) {
      const titleText = ` ${this.title} `
      const titleLength = this.stripAnsi(titleText).length
      const leftPadding = Math.max(1, Math.floor((totalWidth - titleLength - 2) / 2))
      const rightPadding = Math.max(1, totalWidth - leftPadding - titleLength - 2)

      process.stderr.write(
        chars.topLeft +
        chars.horizontal.repeat(leftPadding) +
        titleText +
        chars.horizontal.repeat(rightPadding) +
        chars.topRight + '\n'
      )
    } else {
      process.stderr.write(chars.topLeft + chars.horizontal.repeat(totalWidth - 2) + chars.topRight + '\n')
    }

    // Render rows
    for (const [rowIndex, row] of this.rows.entries()) {
      process.stderr.write(chars.vertical + ' ')

      for (const [colIndex, value] of row.entries()) {
        const strippedValue = this.stripAnsi(value || '')
        const padding = this.widths[colIndex] - strippedValue.length

        // Write value with proper padding accounting for ANSI codes
        process.stderr.write(value || '')
        process.stderr.write(' '.repeat(padding))

        if (colIndex !== row.length - 1) {
          process.stderr.write(' │ ')
        }
      }

      process.stderr.write(' ' + chars.vertical + '\n')

      // Add separator after each row except the last
      if (rowIndex < this.rows.length - 1) {
        process.stderr.write(chars.leftT)
        for (const [colIndex, width] of this.widths.entries()) {
          process.stderr.write(chars.horizontal.repeat(width + 2))
          if (colIndex < this.widths.length - 1) {
            process.stderr.write(chars.cross)
          }
        }
        process.stderr.write(chars.rightT + '\n')
      }
    }

    // Bottom border
    process.stderr.write(chars.bottomLeft + chars.horizontal.repeat(totalWidth - 2) + chars.bottomRight + '\n\n')
  }
}
