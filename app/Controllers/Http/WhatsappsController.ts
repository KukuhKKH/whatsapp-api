import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import WhatsappModel from 'App/Models/WhatsappModel'
import WA from 'App/Services/Wa'

export default class WhatsappsController {
  public async send({ request, response }: HttpContextContract) {
    try {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      let { whatsapp_id, phone, message } = request.requestBody
      // eslint-disable-next-line valid-typeof
      if (typeof message !== Object) {
        message = JSON.parse(message)
      }

      const session = await WA.getSession(`${whatsapp_id}`)
      const receiverObx = await WA.convertPhone(phone)
      const formatPhone = await WA.formatPhone(receiverObx)
      const exists = await WA.isExists(session, formatPhone)

      if (!exists) {
        return response.apiError('The receiver number is not exists.', 400)
      }

      await WA.sendMessage(session, formatPhone, message, 500)
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
