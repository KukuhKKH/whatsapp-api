import BaseSchema from '@ioc:Adonis/Lucid/Schema'

export default class extends BaseSchema {
  protected tableName = 'outboxes'

  public async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.bigInteger('whatsapp_id')
      table.string('type')
      table.string('phone')
      table.text('message').nullable
      table.text('option').nullable
      table.enum('status', ['0', '1', '2']).defaultTo('0')
      table.text('status_response')
      table.datetime('date')
      table.string('send_at')

      /**
       * Uses timestamptz for PostgreSQL and DATETIME2 for MSSQL
       */
      table.timestamp('created_at', { useTz: true })
      table.timestamp('updated_at', { useTz: true })
    })
  }

  public async down() {
    this.schema.dropTable(this.tableName)
  }
}
