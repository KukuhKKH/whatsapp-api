import type { HttpContextContract } from '@ioc:Adonis/Core/HttpContext'
import WA from 'App/Services/Wa'

export default class SessionMiddleware {
  public async handle(ctx: HttpContextContract, next: () => Promise<void>) {
    const sessionID = ctx.params.session
    const isExists = await WA.isSessionExists(sessionID)
    if (!isExists) {
      return ctx.response.apiError('session not found')
    }
    await next()
  }
}
