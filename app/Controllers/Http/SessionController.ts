import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import WA from 'App/Services/Wa'

export default class SessionController {
  public async find({ response }: HttpContextContract) {
    try {
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
}
