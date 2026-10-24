export function parseCsvPreview(text) {
  const content = text.replace(/^\uFEFF/, '')
  const rows = []
  let row = []
  let value = ''
  let quoted = false
  for (let index = 0; index < content.length; index += 1) {
    const char = content[index]
    if (quoted && char === '"' && content[index + 1] === '"') { value += '"'; index += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { row.push(value); value = '' }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && content[index + 1] === '\n') index += 1
      row.push(value)
      if (row.some((cell) => cell.trim())) rows.push(row)
      row = []; value = ''
    } else value += char
  }
  if (quoted) throw new Error('This CSV contains an unclosed quoted field.')
  row.push(value)
  if (row.some((cell) => cell.trim())) rows.push(row)
  if (rows.length < 2) throw new Error('The CSV needs a header row and at least one data row.')
  const headers = rows[0].map((header) => header.trim())
  if (headers.some((header) => !header)) throw new Error('Every CSV column needs a header.')
  if (new Set(headers).size !== headers.length) throw new Error('CSV column names must be unique.')
  return { headers, rows: rows.slice(1).map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']))) }
}
