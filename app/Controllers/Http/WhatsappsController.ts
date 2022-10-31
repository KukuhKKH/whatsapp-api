import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import WhatsappModel from 'App/Models/WhatsappModel'
import WA from 'App/Services/Wa'

export default class WhatsappsController {
  public async send({ request, response }: HttpContextContract) {
    try {
      const { id, receiver, message } = request.requestBody
      const session = await WA.getSession(id)
      const receiverObx = await WA.convertPhone(receiver)
      const formatPhone = await WA.formatPhone(receiverObx)
      const exists = await WA.isExists(session, formatPhone)

      if (!exists) {
        return response.apiError('The receiver number is not exists.', 400)
      }

      await WA.sendMessage(session, formatPhone, message, 0)
        .then(() => {
          return response.apiSuccess({}, 'The message has been successfully sent.')
        })
        // eslint-disable-next-line handle-callback-err
        .catch((err) => response.apiError('Failed to send the message.', 500))
    } catch (error) {
      return response.apiError(error)
    }
  }
}
