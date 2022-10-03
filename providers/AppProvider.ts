import { Response } from '@adonisjs/core/build/standalone'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

export default class AppProvider {
  constructor(protected app: ApplicationContract) {}

  public register() {
    // Register your own bindings
  }

  public async boot() {
    Response.macro('apiSuccess', function (data: any = [], message: String, status: Number = 200) {
      this.status(status).json({
        status: true,
        message: message || 'Success',
        data: data,
      })
    })

    Response.macro('apiError', function (message: String, status: Number = 500) {
      this.status(status).json({
        status: false,
        message: message || 'Error',
      })
    })
  }

  public async ready() {
    await import('../start/whatsapp')
  }

  public async shutdown() {
    // Cleanup, since app is going down
  }
}
