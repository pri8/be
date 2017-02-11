{
  const input = document.getElementById('location')

  input.addEventListener('keyup', function (e) {
    if (e.keyCode !== 13) return
    if (!loading) handleInput()
    // handleLoadingButton()
  })
}

{
  const input = document.getElementById('button')

  input.addEventListener('click', function (e) {
    if (!loading) {
      handleInput()
    } else {
      shouldStop = true
      handleLoadingButton(true)
    }
  })
}

{
  document.getElementById('copy').addEventListener('click', function (e) {
    const range = document.createRange()
    const result = document.getElementById('result')
    range.selectNode(result)
    window.getSelection().addRange(range)
    document.execCommand('copy')
    setTimeout(function () {
      window.getSelection().removeAllRanges()
    }, 300)
    // window.getSelection().empty()
    // setTimeout(function () {
    //   result.selectionStart = 0
    //   result.selectionEnd = 1
    // }, 3000)
  })
}

let startTime = 0
let loading = 0
let itemCount = 0
let shouldStop = false
function get(locationToSearch, other = '', headers) {
  if (shouldStop) return
  if (!startTime) startTime = Date.now()
  ++loading
  handleLoadingButton()
  handleTrip()
  const s = Date.now()
  fetch(locationToSearch + other, { headers })
    .then(res => {
      if (!res.ok) return res.text().then(r => { throw new Error(r) })
      --loading
      handleLoadingButton()
      return res.json()
    })
    .then(json => {
      handleResult(json, s)
      if (json.pagination.continuation) {
        const continuation = '&continuation=' + json.pagination.continuation
        get(locationToSearch, continuation, headers)
      }
    })
    .catch(handleError)
}

function handleInput() {
  const url = document.getElementById('url').value
  const token = document.getElementById('token').value
  const location = document.getElementById('location').value
  if (!url || !token || !location) return
  if (!/^https:\/\/www\..+api.*\.com\//.test(url)) return
  setTimeout(() => {
    localStorage.setItem('location', location) 
    localStorage.setItem('url', url) 
    localStorage.setItem('token', token)
  })
  shouldStop = false
  get(url.replace(/\/$/, '') + '/events/search/?expand=organizer,venue&location.address=' + location, '', { Authorization: 'Bearer ' + token })
}

function handleResult({ pagination, events }, time) {
  handlePagination(pagination, time)
  if (events && events.length) {
    events.forEach(handleEvent)
    updateItemCount(events.length)

  }
}

function handlePagination(pagination, time) {
  // { object_count, page_number, page_size, page_count, continuation }
  pagination.time = Date.now() - time
  document.getElementById('pagination').textContent = JSON.stringify(pagination)
  console.log(pagination)
}


function handleEvent({ id, name, venue, organizer, description, start }) {
  const { city = '', region = '', country = ''} = (venue && venue.address) || { address: { } }
  const result = [
    id,
    name.text || '',
    city || '',
    region || '',
    country || '',
    organizer.name || '',
    organizer.website || '',
    organizer.url || '',
    organizer.facebook ? 'facebook.com/' + organizer.facebook : '',
    organizer.twitter ? ('twitter.com/' + (organizer.twitter || '').replace('@', '')) : '',
    extractEmail(description.text || ''),
    formateDate(start.local) || '' 
  ]
  insertCellsToTable(result)
}

const handleTrip = (function () {
  let trip = 0
  return function() {
    document.getElementById('trip').lastChild.textContent = ++trip
    const time = (Date.now() - startTime) / 1000
    const min = time / 60
    const sec = ~~((min - ~~min) * 60)
    document.getElementById('time').lastChild.textContent = ~~min + ':' + sec
  }
})()

function updateItemCount(length) {
  itemCount += length
  document.getElementById('itemCount').lastChild.textContent = itemCount
}

function handleError(error) {
  --loading
  handleLoadingButton()
  document.getElementById('errorMessage').textContent = error.message
  console.error(error)
}


function formateDate(date) {
  const d = new Date(date)
  let dd = d.getDate()
  let mm = d.getMonth() + 1
  const yyyy = d.getFullYear()
  if(dd < 10) { dd = '0' + dd } 
  if(mm < 10) { mm = '0' + mm } 
  return dd +'/' + mm + '/' + yyyy
}

function extractEmail(string) {
  const emails = string.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi)
  if (!emails) return ''
  const set = new Set(emails.map(email => email.replace(/\.*$/g,'').toLowerCase()))
  return Array.from(set).join(', ')
}

function handleLoadingButton(forceStop) {
  const { classList } = document.getElementById('button')
  if (forceStop) {
    classList.remove('stop')
    classList.add('go')
    return
  }
  if (loading) {
    classList.remove('go')
    classList.add('stop')
  } else {
    classList.remove('stop')
    classList.add('go')    
  }
}

setTimeout(function () {
  document.getElementById('url').value = localStorage.getItem('url')
  document.getElementById('token').value = localStorage.getItem('token')
  document.getElementById('location').value = localStorage.getItem('location')

  const columns = [
    'id',
    'Event name',
    'City',
    'State',
    'Country',
    'Organizer',
    'Domain',
    'EB',
    'FB',
    'Twitter',
    'Email',
    'Event date',
  ]
  insertCellsToTable(columns, true)
  // insertCellsToTable(columns)
  // document.body.append(columns.join('\t'))
})

function insertCellsToTable(cells, isHeader = false) {
  const r = document.createElement('tr')
  cells.forEach(cell => {
    const t = document.createElement(isHeader ? 'th' : 'td')
    t.textContent = cell
    r.appendChild(t)
  })
  document.getElementById('result').appendChild(r)
}