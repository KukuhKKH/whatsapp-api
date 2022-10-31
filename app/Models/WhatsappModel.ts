import { DateTime } from 'luxon'
import { BaseModel, column } from '@ioc:Adonis/Lucid/Orm'

export default class WhatsappModel extends BaseModel {
  public static get table() {
    return 'whatsapp'
  }

  @column({ isPrimary: true })
  public id: number

  @column()
  public phone: string

  @column()
  public name: string

  @column()
  public qrcode: string

  @column()
  public session: boolean

  @column.dateTime({ autoCreate: true })
  public createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  public updatedAt: DateTime
}
