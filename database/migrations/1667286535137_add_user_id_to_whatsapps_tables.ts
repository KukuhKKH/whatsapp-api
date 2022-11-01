import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'whatsapps'

  public async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.bigInteger('user_id').after('id')
    })
  }

  public async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('user_id')
    })
  }
}
