const XLSX = require('xlsx')
const { format } = require('date-fns')

function parseRows(jsonData) {
  const monthColumns = [
    'Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'
  ]

  const results = []

  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i]
    let fullName = row['Члены'] || row['Members'] || row['Name'] || row['ФИО'] || row['Имя'] || row['Имена'] || Object.values(row)[0]
    if (typeof fullName === 'object') fullName = String(fullName)
    fullName = (fullName || '').toString().trim()

    let birthDate = null
    let birthDateStr = null
    let foundMonth = null

    for (const monthCol of monthColumns) {
      if (row[monthCol] !== undefined && row[monthCol] !== null && row[monthCol] !== '') {
        birthDateStr = row[monthCol]
        foundMonth = monthColumns.indexOf(monthCol) + 1
        break
      }
    }

    if (!birthDateStr) {
      results.push({i, fullName, error: 'no date'})
      continue
    }

    try {
      if (typeof birthDateStr === 'number') {
        if (foundMonth && Number.isInteger(birthDateStr) && birthDateStr >= 1 && birthDateStr <= 31) {
          const day = birthDateStr
          const month = foundMonth - 1
          const year = 2000
          birthDate = new Date(year, month, day)
        } else {
          const excelEpoch = new Date(1899, 11, 30)
          birthDate = new Date(excelEpoch.getTime() + birthDateStr * 24 * 60 * 60 * 1000)
        }
      } else {
        const dateStr = String(birthDateStr).trim()
        if (/^\d+$/.test(dateStr) && foundMonth) {
          const day = parseInt(dateStr, 10)
          if (day >= 1 && day <= 31) {
            const month = foundMonth - 1
            const year = 2000
            birthDate = new Date(year, month, day)
          }
        }

        if (!birthDate) {
          const ddmmyyyyMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/)
          if (ddmmyyyyMatch) {
            const day = parseInt(ddmmyyyyMatch[1])
            const month = parseInt(ddmmyyyyMatch[2]) - 1
            let year = parseInt(ddmmyyyyMatch[3])
            if (year < 100) year += year > 30 ? 1900 : 2000
            birthDate = new Date(year, month, day)
          }
        }

        if (!birthDate) {
          const ddmmMatch = dateStr.match(/^(\d{1,2})\.(\d{1,2})\.?$/)
          if (ddmmMatch && foundMonth) {
            const day = parseInt(ddmmMatch[1])
            const month = foundMonth - 1
            const year = 2000
            birthDate = new Date(year, month, day)
          }
        }

        if (!birthDate) {
          const ddmmyyyySlash = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
          if (ddmmyyyySlash) {
            const day = parseInt(ddmmyyyySlash[1])
            const month = parseInt(ddmmyyyySlash[2]) - 1
            let year = parseInt(ddmmyyyySlash[3])
            if (year < 100) year += year > 30 ? 1900 : 2000
            birthDate = new Date(year, month, day)
          }
        }

        if (!birthDate) {
          const parsed = new Date(dateStr)
          if (!isNaN(parsed.getTime())) birthDate = parsed
        }
      }
    } catch (err) {
      results.push({i, fullName, error: 'parse error', raw: birthDateStr})
      continue
    }

    if (!birthDate || isNaN(birthDate.getTime())) {
      results.push({i, fullName, error: 'invalid date', raw: birthDateStr})
      continue
    }

    results.push({i, fullName, birth_date: format(birthDate, 'yyyy-MM-dd'), raw: birthDateStr})
  }

  return results
}

function makeWorkbook(rows) {
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(rows)
  XLSX.utils.book_append_sheet(wb, ws, 'Дни Рождения')
  return wb
}

const tests = [
  {name: 'numeric day (number)', rows: [{Члены: 'Ivan Petrov', Январь: 5}]},
  {name: 'numeric day (string)', rows: [{Члены: 'Maria', Январь: '5'}]},
  {name: 'excel serial (number)', rows: [{Члены: 'Sergey', Январь: 44197}]},
  {name: 'dd.MM.yyyy', rows: [{Члены: 'Olga', Январь: '05.01.1990'}]},
  {name: 'dd.MM (no year)', rows: [{Члены: 'Pavel', Январь: '05.01'}]},
  {name: 'dd/MM/yyyy', rows: [{Члены: 'Nina', Январь: '05/01/1990'}]},
  {name: 'native Date string', rows: [{Члены: 'Anton', Январь: '1990-01-05'}]},
]

for (const t of tests) {
  console.log('\n---- Test:', t.name, '----')
  const wb = makeWorkbook(t.rows)
  const firstSheet = wb.Sheets[wb.SheetNames[0]]
  const jsonData = XLSX.utils.sheet_to_json(firstSheet)
  const res = parseRows(jsonData)
  console.log('Input row:', jsonData[0])
  console.log('Parse result:', res[0])
}

console.log('\nAll tests done')
