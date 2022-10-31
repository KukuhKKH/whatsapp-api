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
    const { id, isLegacy } = request.requestBody

    if (await WA.isSessionExists(id)) {
      return response.apiError('Session already exists, please use another id.')
    }

    const newSession = await WA.createSession(id, false, request, response)
    return response.apiSuccess({ data: newSession }, 'Session found')
  }

  public async getQr({ params, response }: HttpContextContract) {
    try {
      const { session } = params
      const whatsapp = await WhatsappModel.query().where('name', '=', params)
      return response.apiSuccess(whatsapp.qrcode, 'Success Get QR Code Whatsapp')
    } catch (error) {
      return response.apiError(error)
    }
  }
}
