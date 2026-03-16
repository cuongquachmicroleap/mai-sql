import type { TableDesignerState } from '@shared/types/schema'
import { diffTableState } from './table-diff'

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

function quoteEnumValue(val: string): string {
  return `'${val.replace(/'/g, "''")}'`
}

export function generateCreateTableSQL(state: TableDesignerState): string {
  if (!state.tableName.trim()) return '-- Enter a table name to generate SQL'
  if (state.columns.length === 0) return '-- Add at least one column to generate SQL'

  const lines: string[] = []
  // Use schema-qualified names only when schema is meaningful (not 'default')
  const useSchema = state.schema && state.schema !== 'default'

  // Enum types — PostgreSQL only, must be created before the table
  for (const en of state.enums) {
    if (!en.name.trim() || en.values.length === 0) continue
    const vals = en.values.map(quoteEnumValue).join(', ')
    const typePrefix = useSchema ? `${quoteIdent(state.schema)}.` : ''
    lines.push(`CREATE TYPE ${typePrefix}${quoteIdent(en.name)} AS ENUM (${vals});`)
    lines.push('')
  }

  const fullName = useSchema
    ? `${quoteIdent(state.schema)}.${quoteIdent(state.tableName)}`
    : quoteIdent(state.tableName)
  lines.push(`CREATE TABLE ${fullName} (`)

  const colDefs: string[] = []
  const pkCols = state.columns.filter((c) => c.isPrimaryKey).map((c) => quoteIdent(c.name))

  for (const col of state.columns) {
    if (!col.name.trim() || !col.type.trim()) continue
    let def = `  ${quoteIdent(col.name)} ${col.type}`
    if (!col.nullable) def += ' NOT NULL'
    if (col.defaultValue.trim()) def += ` DEFAULT ${col.defaultValue}`
    colDefs.push(def)
  }

  if (pkCols.length > 0) {
    colDefs.push(`  PRIMARY KEY (${pkCols.join(', ')})`)
  }

  // Foreign keys
  for (const fk of state.foreignKeys) {
    if (!fk.columns.length || !fk.targetTable.trim()) continue
    const srcCols = fk.columns.map(quoteIdent).join(', ')
    const tgtCols = fk.targetColumns.map(quoteIdent).join(', ')
    let constraint = `  CONSTRAINT ${quoteIdent(fk.constraintName)} FOREIGN KEY (${srcCols}) REFERENCES ${quoteIdent(fk.targetTable)} (${tgtCols})`
    if (fk.onDelete && fk.onDelete !== 'NO ACTION') constraint += ` ON DELETE ${fk.onDelete}`
    if (fk.onUpdate && fk.onUpdate !== 'NO ACTION') constraint += ` ON UPDATE ${fk.onUpdate}`
    colDefs.push(constraint)
  }

  lines.push(colDefs.join(',\n'))
  lines.push(');')

  // Indexes (outside CREATE TABLE)
  for (const idx of state.indexes) {
    if (!idx.name.trim() || idx.columns.length === 0) continue
    const unique = idx.isUnique ? 'UNIQUE ' : ''
    const idxCols = idx.columns.map(quoteIdent).join(', ')
    lines.push('')
    lines.push(`CREATE ${unique}INDEX ${quoteIdent(idx.name)} ON ${fullName} (${idxCols});`)
  }

  // Column comments
  for (const col of state.columns) {
    if (col.comment.trim()) {
      lines.push('')
      lines.push(`COMMENT ON COLUMN ${fullName}.${quoteIdent(col.name)} IS '${col.comment.replace(/'/g, "''")}';`)
    }
  }

  return lines.join('\n')
}

export function generateAlterTableSQL(original: TableDesignerState, current: TableDesignerState): string {
  const changes = diffTableState(original, current)
  if (changes.length === 0) return '-- No changes detected'

  const useSchema = current.schema && current.schema !== 'default'
  const fullName = useSchema
    ? `${quoteIdent(current.schema)}.${quoteIdent(current.tableName)}`
    : quoteIdent(current.tableName)
  const schemaPrefix = useSchema ? quoteIdent(current.schema) : ''
  const statements: string[] = ['BEGIN;', '']

  // Rename table
  if (original.tableName !== current.tableName) {
    const origFullName = useSchema
      ? `${quoteIdent(original.schema)}.${quoteIdent(original.tableName)}`
      : quoteIdent(original.tableName)
    statements.push(`ALTER TABLE ${origFullName} RENAME TO ${quoteIdent(current.tableName)};`)
    statements.push('')
  }

  for (const change of changes) {
    // Enum changes
    if (change.type === 'create-enum') {
      const en = change.enum!
      const vals = en.values.map(quoteEnumValue).join(', ')
      const prefix = schemaPrefix ? `${schemaPrefix}.` : ''
      statements.push(`CREATE TYPE ${prefix}${quoteIdent(en.name)} AS ENUM (${vals});`)
      continue
    }
    if (change.type === 'drop-enum') {
      const prefix = schemaPrefix ? `${schemaPrefix}.` : ''
      statements.push(`DROP TYPE ${prefix}${quoteIdent(change.enumName!)};`)
      continue
    }
    if (change.type === 'add-enum-value') {
      const prefix = schemaPrefix ? `${schemaPrefix}.` : ''
      const after = change.afterValue
        ? ` AFTER ${quoteEnumValue(change.afterValue)}`
        : ''
      statements.push(`ALTER TYPE ${prefix}${quoteIdent(change.enumName!)} ADD VALUE ${quoteEnumValue(change.enumValue!)}${after};`)
      continue
    }
    if (change.type === 'rename-enum') {
      const prefix = schemaPrefix ? `${schemaPrefix}.` : ''
      statements.push(`ALTER TYPE ${prefix}${quoteIdent(change.oldName!)} RENAME TO ${quoteIdent(change.newName!)};`)
      continue
    }
    switch (change.type) {
      case 'add-column': {
        const col = change.column!
        let def = `ALTER TABLE ${fullName} ADD COLUMN ${quoteIdent(col.name)} ${col.type}`
        if (!col.nullable) def += ' NOT NULL'
        if (col.defaultValue.trim()) def += ` DEFAULT ${col.defaultValue}`
        statements.push(def + ';')
        break
      }
      case 'drop-column':
        statements.push(`ALTER TABLE ${fullName} DROP COLUMN ${quoteIdent(change.columnName!)};`)
        break
      case 'rename-column':
        statements.push(`ALTER TABLE ${fullName} RENAME COLUMN ${quoteIdent(change.oldName!)} TO ${quoteIdent(change.newName!)};`)
        break
      case 'alter-column-type':
        statements.push(`ALTER TABLE ${fullName} ALTER COLUMN ${quoteIdent(change.columnName!)} TYPE ${change.newType!};`)
        break
      case 'alter-column-nullable':
        statements.push(`ALTER TABLE ${fullName} ALTER COLUMN ${quoteIdent(change.columnName!)} ${change.nullable ? 'DROP NOT NULL' : 'SET NOT NULL'};`)
        break
      case 'alter-column-default':
        if (change.newDefault!.trim()) {
          statements.push(`ALTER TABLE ${fullName} ALTER COLUMN ${quoteIdent(change.columnName!)} SET DEFAULT ${change.newDefault};`)
        } else {
          statements.push(`ALTER TABLE ${fullName} ALTER COLUMN ${quoteIdent(change.columnName!)} DROP DEFAULT;`)
        }
        break
      case 'add-pk': {
        const pkCols = change.columns!.map(quoteIdent).join(', ')
        statements.push(`ALTER TABLE ${fullName} ADD PRIMARY KEY (${pkCols});`)
        break
      }
      case 'drop-pk':
        statements.push(`ALTER TABLE ${fullName} DROP CONSTRAINT ${quoteIdent(change.constraintName!)};`)
        break
      case 'add-index': {
        const idx = change.index!
        const unique = idx.isUnique ? 'UNIQUE ' : ''
        const idxCols = idx.columns.map(quoteIdent).join(', ')
        statements.push(`CREATE ${unique}INDEX ${quoteIdent(idx.name)} ON ${fullName} (${idxCols});`)
        break
      }
      case 'drop-index':
        statements.push(`DROP INDEX ${quoteIdent(change.indexName!)};`)
        break
      case 'add-fk': {
        const fk = change.foreignKey!
        const srcCols = fk.columns.map(quoteIdent).join(', ')
        const tgtCols = fk.targetColumns.map(quoteIdent).join(', ')
        let stmt = `ALTER TABLE ${fullName} ADD CONSTRAINT ${quoteIdent(fk.constraintName)} FOREIGN KEY (${srcCols}) REFERENCES ${quoteIdent(fk.targetTable)} (${tgtCols})`
        if (fk.onDelete && fk.onDelete !== 'NO ACTION') stmt += ` ON DELETE ${fk.onDelete}`
        if (fk.onUpdate && fk.onUpdate !== 'NO ACTION') stmt += ` ON UPDATE ${fk.onUpdate}`
        statements.push(stmt + ';')
        break
      }
      case 'drop-fk':
        statements.push(`ALTER TABLE ${fullName} DROP CONSTRAINT ${quoteIdent(change.constraintName!)};`)
        break
    }
  }

  statements.push('')
  statements.push('COMMIT;')
  return statements.join('\n')
}
