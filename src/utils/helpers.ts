import fs from 'fs'

export const writeFile = (arr: [string], path: string) => {
  let cleanArray = []
  cleanArray = arr.map((e: any) => `"${e}"`)
  try {
    fs.writeFile(path, `export const links = [${[cleanArray]}]\n`, err => {
      if (err) throw err
    })
  } catch (err) {
    console.error(err)
  }
}
