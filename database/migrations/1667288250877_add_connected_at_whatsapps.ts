import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'whatsapps'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dateTime('connected_at').after('session')
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('connected_at')
    })
  }
}
