import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import WhatsappModel from 'App/Models/WhatsappModel'
import WA from 'App/Services/Wa'

export default class SessionController {
  public async find({ params, response }: HttpContextContract) {
    try {
      const session = await WA.getSession(params.session)
      const userID = session.user.id
      const phone = userID.split(':')[0]
      await WhatsappModel.query().where('name', '=', params.session).update('phone', phone)
      return response.apiSuccess([], 'Session found')
    } catch (error) {
      return response.apiError(error)
    }
  }

  public async add({ request, response }: HttpContextContract) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { phone, isLegacy } = request.requestBody
    const whatsappData = await WhatsappModel.query().where('phone', '=', phone).first()

    if (await WA.isSessionExists(whatsappData.id)) {
      return response.apiError('Session already exists, please use another id.')
    }

    const newSession = await WA.createSession(whatsappData.id, isLegacy, request, response)
    return response.apiSuccess({}, 'Session found')
  }

  public async getQr({ params, response }: HttpContextContract) {
    try {
      const { session } = params
      const whatsapp = await WhatsappModel.query().where('name', '=', session).first()
      if (whatsapp === null) {
        return response.apiError('Session not found.')
      }
      return response.apiSuccess(whatsapp, 'Success Get QR Code Whatsapp')
    } catch (error) {
      return response.apiError(error)
    }
  }

  public async delete({ request, response }: HttpContextContract) {
    try {
      const { phone } = request.requestBody
      const whatsappData = await WhatsappModel.query().where('phone', '=', phone).first()
      if (whatsappData === null) {
        return response.apiError('Session not found.')
      }
      const session = whatsappData.name

      await WhatsappModel.query().where('name', '=', whatsappData.name).delete()
      const sessionClient = await WA.getSession(session)
      WA.deleteSession(session, false, sessionClient)
      return response.apiSuccess({}, 'Success Delete Whatsapp Session')
    } catch (error) {
      return response.apiError(error)
    }
  }
}
