const color = value => process.args.color ? value : ''

exports.cyan = color('\u001B[36m')
exports.green = color('\u001B[32m')
exports.magenta = color('\u001B[35m')
exports.red = color('\u001B[31m')
exports.reset = color('\u001B[39m')
