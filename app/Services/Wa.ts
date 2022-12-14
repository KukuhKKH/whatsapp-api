import makeWASocket, {
  makeWALegacySocket,
  useMultiFileAuthState,
  useSingleFileLegacyAuthState,
  makeInMemoryStore,
  Browsers,
  DisconnectReason,
  delay,
} from '@adiwajshing/baileys'
import pino from 'pino'
import { toDataURL } from 'qrcode'
import { rmSync, readdir } from 'fs'
import { dirname, basename, join } from 'path'
import { fileURLToPath } from 'url'
import moment from 'moment'
import WhatsappModel from 'App/Models/WhatsappModel'

class Wa {
  public sessions = new Map()
  public retries = new Map()

  public sessionsDir(sessionId = '') {
    let dir = __filename.replace(basename(__filename), '')
    return join(dir, 'Sessions', sessionId ? sessionId : '')
  }

  public async createSession(sessionId = '', isLegacy = false, request = false, response = false) {
    // await WhatsappModel.updateOrCreate({ id: sessionId }, { id: sessionId })
    const sessionFile = (isLegacy ? 'legacy_' : 'md_') + sessionId + (isLegacy ? '.json' : '')

    const logger = pino({ level: 'warn' })
    const store = makeInMemoryStore({ logger })

    let state
    let saveState
    if (isLegacy) {
      ;({ state, saveState } = useSingleFileLegacyAuthState(this.sessionsDir(sessionFile)))
    } else {
      ;({ state, saveCreds: saveState } = await useMultiFileAuthState(
        this.sessionsDir(sessionFile)
      ))
    }

    const waConfig = {
      auth: state,
      printQRInTerminal: true,
      logger,
      browser: ['Whatsapps Multi Device', 'MacOS', '3.0'],
    }

    const wa = isLegacy ? makeWALegacySocket(waConfig) : makeWASocket(waConfig)
    if (!isLegacy) {
      store.readFromFile(this.sessionsDir() + `${sessionId}_store.json`)
      store.bind(wa.ev)
    }
    this.sessions.set(sessionId, { ...wa, store, isLegacy })

    wa.ev.on('creds.update', async (updateData) => {
      if (updateData.me) {
        let myNumber = updateData.me.id.split(':')
        let myName = updateData.me.name !== '' ? updateData.me.name : sessionId
        await WhatsappModel.query().where('id', '=', sessionId).update({
          phone: myNumber[0],
          name: myName,
        })
      }
      saveState()
    })

    wa.ev.on('chats.set', ({ chats }) => {
      if (isLegacy) {
        store.chats.insertIfAbsent(...chats)
      }
    })

    await wa.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update
      const statusCode = lastDisconnect?.error?.output?.statusCode

      if (connection === 'open') {
        let date = moment().format('YYYY-MM-DD H:mm:s')
        await WhatsappModel.query().where('id', '=', sessionId).update({
          session: true,
          qrcode: null,
          connected_at: date,
        })
        this.retries.delete(sessionId)
      }

      if (connection === 'close') {
        if (statusCode === DisconnectReason.loggedOut || !this.shouldReconnect(sessionId)) {
          // await WhatsappModel.query().where('name', '=', sessionId).delete()
          this.deleteSession(sessionId, isLegacy)

          if (response) {
            return response.apiError('Unable to create session.')
          }
        }

        setTimeout(
          () => {
            this.createSession(sessionId, isLegacy, request, response)
          },
          statusCode === DisconnectReason.restartRequired ? 0 : 2000
        )
      }

      if (update.qr) {
        try {
          const qr = await toDataURL(update.qr)

          await WhatsappModel.query().where('id', '=', sessionId).update('qrcode', qr)

          return response.apiSuccess(
            {
              qr,
            },
            'QR code received, please scan the QR code.'
          )
        } catch {
          if (response) {
            return response.apiError('Unable to create QR code.')
          }
        }

        try {
          await wa.logout()
        } catch {
        } finally {
          this.deleteSession(sessionId, isLegacy)
        }
      }
    })
    return this.sessions.get(sessionId) ?? null
  }

  public async shouldReconnect(sessionId) {
    let maxRetries = 10
    let attempts = this.retries.get(sessionId) ?? 0

    maxRetries = maxRetries < 1 ? 1 : maxRetries

    if (attempts < maxRetries) {
      ++attempts
      console.log('Reconnecting...', { attempts, sessionId })
      this.retries.set(sessionId, attempts)
      return true
    }

    return false
  }

  public async getSession(sessionId) {
    return this.sessions.get(sessionId) ?? null
  }

  public async deleteSession(sessionId, isLegacy = false, sessionClient = '') {
    const sessionFile = (isLegacy ? 'legacy_' : 'md_') + sessionId + (isLegacy ? '.json' : '')
    const storeFile = `${sessionId}_store.json`
    const rmOptions = { force: true, recursive: true }
    // sessionClient.ws.close()

    rmSync(this.sessionsDir(sessionFile), rmOptions)
    rmSync(this.sessionsDir(storeFile), rmOptions)

    this.sessions.delete(sessionId)
    this.retries.delete(sessionId)
  }

  public async isExists(session, jid, isGroup = false) {
    try {
      let result
      if (isGroup) {
        result = await session.groupMetadata(jid)
        return Boolean(result.id)
      }

      if (session.isLegacy) {
        result = await session.onWhatsApp(jid)
      } else {
        ;[result] = await session.onWhatsApp(jid)
      }
      return result.exists
    } catch {
      return false
    }
  }

  public async sendMessage(session: String, receiver: String, message, delayMs = 1000) {
    try {
      await delay(parseInt(delayMs))
      return session.sendMessage(receiver, message)
    } catch {
      return Promise.reject(null)
    }
  }

  public async convertPhone(phone: String) {
    phone = phone.replace(' ', '')
    phone = phone.replace('(', '')
    phone = phone.replace(')', '')
    phone = phone.replace('.', '')
    phone = phone.replace('+', '')
    phone = phone.trim()

    if (!phone.match('/[^+0-9]/')) {
      if (phone.substring(0, 2) === '62') {
        phone = phone.trim()
      } else if (phone.substring(0, 1) === '0') {
        phone = '62' + phone.substring(1)
      }
    }

    return phone.trim()
  }

  public async formatPhone(phone: String) {
    if (phone.endsWith('@s.whatsapp.net')) {
      return phone
    }
    let formatted = phone.replace(/\D/g, '')
    return (formatted += '@s.whatsapp.net')
  }

  public async formatGroup(group) {
    if (group.endsWith('@g.us')) {
      return group
    }
    let formatted = group.replace(/[^\d-]/g, '')
    return (formatted += '@g.us')
  }

  public async isSessionExists(sessionId) {
    return await this.sessions.has(sessionId)
  }

  public async cleanup() {
    this.sessions.forEach((session, sessionId) => {
      if (!session.isLegacy) {
        session.store.writeToFile(this.sessionsDir() + `${sessionId}_store.json`)
      }
    })
  }

  public async init() {
    // await readdir(this.sessionsDir(), async (err, files) => {
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

    //     await WhatsappModel.updateOrCreate({ id: sessionId }, { id: sessionId })

    //     this.createSession(sessionId, isLegacy)
    //   }
    // })
    const whatsapps = await WhatsappModel.all()
    whatsapps.forEach((element) => {
      this.createSession(`${element.id}`, false)
    })
  }
}

export default new Wa()
