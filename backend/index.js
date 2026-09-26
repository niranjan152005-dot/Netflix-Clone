const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()
const port = Number(process.env.PORT) || 5000
const demoEmail = (process.env.DEMO_EMAIL || 'demo@netflix.com').trim().toLowerCase()
const demoPassword = process.env.DEMO_PASSWORD || 'Netflix123'

app.use(cors())
app.use(express.json())

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' })
})

app.post('/api/login', (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email.trim().toLowerCase() : ''
  const password = typeof request.body?.password === 'string' ? request.body.password : ''

  if (!email || !password) {
    return response.status(400).json({ message: 'Email and password are required.' })
  }

  if (email !== demoEmail || password !== demoPassword) {
    return response.status(401).json({ message: 'Incorrect email or password.' })
  }

  return response.json({
    message: 'Signed in successfully.',
    user: { email },
  })
})

app.listen(port, () => {
  console.log(`Login API listening on http://localhost:${port}`)
})