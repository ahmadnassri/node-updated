import args from './args.js'

// only display colors if the user asks for it
/* istanbul ignore next */
const color = value => args['no-color'] ? '' : value

// color helpers
const cyanVal = color('\u001B[36m')
const grayVal = color('\u001B[1;30m')
const greenVal = color('\u001B[32m')
const magentaVal = color('\u001B[35m')
const redVal = color('\u001B[31m')
const resetVal = color('\u001B[0m')
const lightVal = color('\u001B[1;36m')

// wrapper function
export const cyan = (str) => `${cyanVal}${str}${resetVal}`
export const gray = (str) => `${grayVal}${str}${resetVal}`
export const green = (str) => `${greenVal}${str}${resetVal}`
export const magenta = (str) => `${magentaVal}${str}${resetVal}`
export const red = (str) => `${redVal}${str}${resetVal}`
export const light = (str) => `${lightVal}${str}${resetVal}`
