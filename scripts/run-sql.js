#!/usr/bin/env node
const fs = require('fs')
const { Client } = require('pg')

async function run() {
  const [,, databaseUrl, sqlFile] = process.argv
  if (!databaseUrl || !sqlFile) {
    console.error('Usage: node scripts/run-sql.js "postgres://USER:PASS@HOST:PORT/DB" path/to/file.sql')
    process.exit(2)
  }

  if (!fs.existsSync(sqlFile)) {
    console.error('SQL file not found:', sqlFile)
    process.exit(2)
  }

  const sql = fs.readFileSync(sqlFile, 'utf8')
  const client = new Client({ connectionString: databaseUrl })
  try {
    await client.connect()
    console.log('Connected to database')
    await client.query('BEGIN')
    await client.query(sql)
    await client.query('COMMIT')
    console.log('SQL executed and committed')
  } catch (err) {
    console.error('Error executing SQL:', err.message || err)
    try { await client.query('ROLLBACK') } catch (e) {}
    process.exitCode = 1
  } finally {
    await client.end()
  }
}

run()
