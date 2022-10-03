import type { rmSync, readdir } from 'fs'
import type { join, dirname } from 'path'
import type { toDataURL } from 'qrcode'
import type { fileURLToPath } from 'url'
import pino from 'pino'
import type makeWASocket, {
  makeWALegacySocket,
  useMultiFileAuthState,
  useSingleFileLegacyAuthState,
  makeInMemoryStore,
  Browsers,
  DisconnectReason,
  delay,
} from '@adiwajshing/baileys'

export default class Waold {
  public String: __dirname = dirname(fileURLToPath(import.meta.url))

  public async sessionsDir(sessionId: String = '') {
    return join(__dirname, 'sessions', sessionId ? sessionId : '')
  }

  public async createSession(sessionId, isLegacy = false, res = null) {
    const sessionFile = (isLegacy ? 'legacy_' : 'md_') + sessionId + (isLegacy ? '.json' : '')

    const logger = pino({ level: 'warn' })
    const store = makeInMemoryStore({ logger })

    let state
    let saveState

    if (isLegacy) {
      ;({ state, saveState } = useSingleFileLegacyAuthState(sessionsDir(sessionFile)))
    } else {
      ;({ state, saveCreds: saveState } = await useMultiFileAuthState(sessionsDir(sessionFile)))
    }

    console.log(isLegacy)

    let waConfig = {
      auth: state,
      printQRInTerminal: true,
      logger,
      browser: ['WhatsRice Multi Device', 'MacOS', '3.0'],
    }

    const wa = isLegacy ? makeWALegacySocket(waConfig) : makeWASocket.default(waConfig)

    if (!isLegacy) {
      store.readFromFile(sessionsDir(`${sessionId}_store.json`))
      store.bind(wa.ev)
    }

    sessions.set(sessionId, { ...wa, store, isLegacy })

    wa.ev.on('creds.update', saveState)

    wa.ev.on('chats.set', ({ chats }) => {
      if (isLegacy) {
        store.chats.insertIfAbsent(...chats)
      }
    })

    wa.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      const statusCode = lastDisconnect?.error?.output?.statusCode

      if (connection === 'open') {
        retries.delete(sessionId)
      }

      if (connection === 'close') {
        if (statusCode === DisconnectReason.loggedOut || !shouldReconnect(sessionId)) {
          if (res && !res.headersSent) {
            response(res, 500, false, 'Unable to create session.')
          }

          return deleteSession(sessionId, isLegacy)
        }

        setTimeout(
          () => {
            createSession(sessionId, isLegacy, res)
          },
          statusCode === DisconnectReason.restartRequired
            ? 0
            : parseInt(process.env.RECONNECT_INTERVAL ?? 0)
        )
      }

      if (update.qr) {
        if (res && !res.headersSent) {
          try {
            const qr = await toDataURL(update.qr)

            response(res, 200, true, 'QR code received, please scan the QR code.', { qr })

            return
          } catch {
            response(res, 500, false, 'Unable to create QR code.')
          }
        }

        try {
          await wa.logout()
        } catch {
        } finally {
          deleteSession(sessionId, isLegacy)
        }
      }
    })
  }

  public async sendMessage(session: String, receiver, message, delayMs = 1000) {
    try {
      await delay(parseInt(delayMs))
      return session.sendMessage(receiver, message)
    } catch {
      return Promise.reject(null)
    }
  }

  public async formatPhone(phone: String) {
    if (phone.endsWith('@s.whatsapp.net')) {
      return phone
    }
    let formatted = phone.replace(/\D/g, '')
    return (formatted += '@s.whatsapp.net')
  }

  public async formatGroup(group: String) {
    if (group.endsWith('@g.us')) {
      return group
    }
    let formatted = group.replace(/[^\d-]/g, '')
    return (formatted += '@g.us')
  }

  public async init() {
    console.log('awdawdawd')
    // readdir(sessionsDir(), (err, files) => {
    //   if (err) {
    //     throw err
    //   }

    //   for (const file of files) {
    //     if ((!file.startsWith('md_') && !file.startsWith('legacy_')) || file.endsWith('_store')) {
    //       continue
    //     }

    //     const filename = file.replace('.json', '')
    //     const isLegacy = filename.split('_', 1)[0] !== 'md'
    //     const sessionId = filename.substring(isLegacy ? 7 : 3)

    //     createSession(sessionId, isLegacy)
    //   }
    // })
  }
}
