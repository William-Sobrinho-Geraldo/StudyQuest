#!/usr/bin/env node
// Re-semeia as frases motivacionais no Supabase a partir de um CSV.
//
//   node scripts/seedQuotes.js --token <PAT> [--project-ref <ref>]
//
// O token (PAT do Supabase) também pode vir da env SUPABASE_ACCESS_TOKEN,
// e o projeto de SUPABASE_PROJECT_REF (sem eles, o ref é lido de
// supabase/.temp/linked-project.json).
//
// O CSV é lido como buffer e decodificado de forma segura: tenta UTF-8
// estrito (TextDecoder com fatal:true) e, se o arquivo não for UTF-8
// válido (ex.: salvo como ANSI/Windows-1252 no bloco de notas/Excel),
// converte com iconv-lite de win1252 para UTF-8. Assim acentos e "ç"
// chegam sempre íntegros ao banco, independente do encoding do arquivo.
// O parser aceita quebras de linha irregulares (\r\n, \n ou \r isolado)
// e campos entre aspas duplas (inclusive com vírgulas ou aspas escapadas).
import iconv from 'iconv-lite'
import { readFileSync } from 'node:fs'
import { argv } from 'node:process'

const CSV_PATH = new URL('./data/quotes.csv', import.meta.url)
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true })

function parseArg(name) {
  const index = argv.indexOf(name)
  return index >= 0 ? argv[index + 1] : undefined
}

function readCsv(path) {
  const buffer = readFileSync(path)
  try {
    return UTF8_DECODER.decode(buffer).replace(/^\uFEFF/, '')
  } catch {
    console.log('CSV não está em UTF-8 válido; decodificando como Windows-1252 (ANSI).')
    return iconv.decode(buffer, 'win1252').replace(/^\uFEFF/, '')
  }
}

// Parser CSV minimalista: aspas duplas para campos com separador/aspas
// ("" = aspas literal) e qualquer combinação de quebras de linha.
function parseCsv(text) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i += 1
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (ch === '\r') {
      if (text[i + 1] === '\n') {
        i += 1
      }
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += ch
    }
  }

  if (field !== '' || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
    .map((cells) => cells.map((cell) => cell.trim()))
    .filter((cells) => cells.length > 0 && cells.some((cell) => cell !== ''))
}

function escapeSql(value) {
  return value.replace(/'/g, "''")
}

function buildUpsertSql(rows) {
  const values = rows.map(([id, content, author, category]) => {
    if (!id || !content || !author || !category) {
      throw new Error(`Linha inválida no CSV: ${JSON.stringify([id, content, author, category])}`)
    }
    return `('${escapeSql(id)}', '${escapeSql(content)}', '${escapeSql(author)}', '${escapeSql(category)}')`
  })

  return [
    'insert into public.motivational_quotes (id, content, author, category) values',
    values.join(',\n'),
    `on conflict (id) do update set content = excluded.content, author = excluded.author, category = excluded.category;`,
  ].join('\n')
}

async function main() {
  const token = parseArg('--token') ?? process.env.SUPABASE_ACCESS_TOKEN
  const ref = parseArg('--project-ref') ?? process.env.SUPABASE_PROJECT_REF

  if (!token) {
    console.error('Defina o acesso via --token <PAT> ou env SUPABASE_ACCESS_TOKEN.')
    process.exit(1)
  }

  let projectRef = ref
  if (!projectRef) {
    try {
      const linked = JSON.parse(
        readFileSync(new URL('../supabase/.temp/linked-project.json', import.meta.url), 'utf8'),
      )
      projectRef = linked.ref
    } catch {
      console.error('Não achei supabase/.temp/linked-project.json. Use --project-ref <ref>.')
      process.exit(1)
    }
  }

  const csv = readCsv(CSV_PATH)
  const rows = parseCsv(csv)
  const header = rows[0]
  const dataRows = rows.slice(1)

  if (header.join(',') !== 'id,content,author,category') {
    console.error(`Cabeçalho inesperado no CSV: ${header.join(',')}`)
    process.exit(1)
  }

  if (dataRows.length === 0) {
    console.error('CSV sem linhas de dados.')
    process.exit(1)
  }

  const sql = buildUpsertSql(dataRows)

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
      body: JSON.stringify({ query: sql }),
    },
  )

  if (!response.ok) {
    const detail = await response.text()
    console.error(`Falha ao executar o seed (${response.status}): ${detail}`)
    process.exit(1)
  }

  const quoted = dataRows.filter(([, content]) => /[áàâãäéèêëíìîïóòõôöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÕÔÖÚÙÛÜÇ]/.test(content))
  console.log(`Seed OK: ${dataRows.length} frases (${quoted.length} com acentos) no projeto ${projectRef}.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})