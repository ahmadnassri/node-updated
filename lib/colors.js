const args = require('./args')

// only display colors if the user asks for it
/* istanbul ignore next */
const color = value => args['no-color'] ? '' : value

// color helpers
const cyan = color('\u001B[36m')
const gray = color('\u001B[1;30m')
const green = color('\u001B[32m')
const magenta = color('\u001B[35m')
const red = color('\u001B[31m')
const reset = color('\u001B[0m')
const light = color('\u001B[1;36m')

// wrapper function
exports.cyan = str => `${cyan}${str}${reset}`
exports.gray = str => `${gray}${str}${reset}`
exports.green = str => `${green}${str}${reset}`
exports.magenta = str => `${magenta}${str}${reset}`
exports.red = str => `${red}${str}${reset}`
exports.light = str => `${light}${str}${reset}`
