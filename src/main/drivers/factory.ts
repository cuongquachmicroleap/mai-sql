import type { ConnectionConfig } from '../../shared/types/connection'
import type { IDataSource } from './interface'
import { PostgreSQLDriver } from './postgresql'

export function createDriver(config: ConnectionConfig): IDataSource {
  switch (config.type) {
    case 'postgresql':
      return new PostgreSQLDriver(config)
    default:
      throw new Error(`Driver for ${config.type} not implemented yet`)
  }
}
