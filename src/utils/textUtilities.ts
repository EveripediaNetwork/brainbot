export const shortenAddress = (address: string) => {
  const match = address.match(
    /^(0x[a-zA-Z0-9]{4})[a-zA-Z0-9]+([a-zA-Z0-9]{4})$/,
  )
  if (!match) return address
  return `${match[1]}…${match[2]}`
}

export const convertToCamelCase = (str: string) => {
  return str
    .split(' ')
    .map(w => w[0].toUpperCase() + w.substring(1))
    .join('')
}

export const makeTextFromWords = (words: string[]) => {
  return words.filter(Boolean).join(' ')
}
