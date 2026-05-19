import { expect, test } from '@playwright/test'
import { createServer, type Server, type Socket } from 'node:net'

let smtpServer: Server | undefined

function write(socket: Socket, line: string) {
  socket.write(`${line}\r\n`)
}

test.beforeAll(async () => {
  if (process.env.EMAIL_PROVIDER !== 'smtp' || process.env.SMTP_HOST !== '127.0.0.1') return

  const port = Number(process.env.SMTP_PORT ?? 2525)

  smtpServer = createServer((socket) => {
    let dataMode = false

    write(socket, '220 jakartabc e2e smtp')
    socket.on('data', (chunk) => {
      const lines = chunk.toString().split(/\r?\n/).filter(Boolean)

      for (const line of lines) {
        if (dataMode) {
          if (line === '.') {
            dataMode = false
            write(socket, '250 queued')
          }
          continue
        }

        const command = line.toUpperCase()
        if (command.startsWith('EHLO') || command.startsWith('HELO')) {
          socket.write('250-jakartabc e2e smtp\r\n250-AUTH PLAIN LOGIN\r\n250 OK\r\n')
        } else if (command.startsWith('AUTH')) {
          write(socket, '235 authenticated')
        } else if (command.startsWith('MAIL FROM') || command.startsWith('RCPT TO')) {
          write(socket, '250 OK')
        } else if (command === 'DATA') {
          dataMode = true
          write(socket, '354 end with <CR><LF>.<CR><LF>')
        } else if (command === 'QUIT') {
          write(socket, '221 bye')
          socket.end()
        } else {
          write(socket, '250 OK')
        }
      }
    })
  })

  await new Promise<void>((resolve, reject) => {
    smtpServer?.once('error', reject)
    smtpServer?.listen(port, '127.0.0.1', () => {
      smtpServer?.off('error', reject)
      resolve()
    })
  })
})

test.afterAll(async () => {
  await new Promise<void>((resolve) => smtpServer?.close(() => resolve()) ?? resolve())
})

for (const locale of ['en', 'id'] as const) {
  test(`contact happy path @ ${locale}`, async ({ page }) => {
    await page.goto(locale === 'en' ? '/contact' : '/id/contact')
    await page.locator('input[name="name"]').fill('Sari E2E')
    await page.locator('input[name="email"]').fill(`sari+${Date.now()}@example.test`)
    await page.locator('input[name="company"]').fill('Optional Co')
    await page.locator('textarea[name="message"]').fill('Reasonable length message body for contact e2e test.')
    await page.getByRole('button', { name: /Send|Kirim/i }).click()
    await expect(page.getByText(/within 1 business day|dalam 1 hari kerja/i)).toBeVisible()
  })
}
