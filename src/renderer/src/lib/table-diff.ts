import type { TableDesignerState, TableDesignerColumn, TableDesignerIndex, TableDesignerForeignKey, TableDesignerEnum } from '@shared/types/schema'

export interface TableChange {
  type:
    | 'add-column' | 'drop-column' | 'rename-column'
    | 'alter-column-type' | 'alter-column-nullable' | 'alter-column-default'
    | 'add-pk' | 'drop-pk'
    | 'add-index' | 'drop-index'
    | 'add-fk' | 'drop-fk'
    | 'create-enum' | 'drop-enum' | 'add-enum-value' | 'rename-enum'
  columnName?: string
  oldName?: string
  newName?: string
  newType?: string
  nullable?: boolean
  newDefault?: string
  column?: TableDesignerColumn
  columns?: string[]
  constraintName?: string
  index?: TableDesignerIndex
  indexName?: string
  foreignKey?: TableDesignerForeignKey
  enum?: TableDesignerEnum
  enumName?: string
  enumValue?: string
  afterValue?: string
}

export function diffTableState(original: TableDesignerState, current: TableDesignerState): TableChange[] {
  const changes: TableChange[] = []

  // Build maps by _tempId
  const origColMap = new Map(original.columns.map((c) => [c._tempId, c]))
  const currColMap = new Map(current.columns.map((c) => [c._tempId, c]))

  // Dropped columns
  for (const [id, col] of origColMap) {
    if (!currColMap.has(id)) {
      changes.push({ type: 'drop-column', columnName: col.name })
    }
  }

  // Added / modified columns
  for (const [id, col] of currColMap) {
    const orig = origColMap.get(id)
    if (!orig) {
      changes.push({ type: 'add-column', column: col })
      continue
    }
    if (orig.name !== col.name) {
      changes.push({ type: 'rename-column', oldName: orig.name, newName: col.name, columnName: col.name })
    }
    if (orig.type !== col.type) {
      changes.push({ type: 'alter-column-type', columnName: col.name, newType: col.type })
    }
    if (orig.nullable !== col.nullable) {
      changes.push({ type: 'alter-column-nullable', columnName: col.name, nullable: col.nullable })
    }
    if (orig.defaultValue !== col.defaultValue) {
      changes.push({ type: 'alter-column-default', columnName: col.name, newDefault: col.defaultValue })
    }
  }

  // Primary key changes
  const origPK = original.columns.filter((c) => c.isPrimaryKey).map((c) => c.name).sort()
  const currPK = current.columns.filter((c) => c.isPrimaryKey).map((c) => c.name).sort()
  if (JSON.stringify(origPK) !== JSON.stringify(currPK)) {
    if (origPK.length > 0) {
      const pkName = `${original.tableName}_pkey`
      changes.push({ type: 'drop-pk', constraintName: pkName })
    }
    if (currPK.length > 0) {
      changes.push({ type: 'add-pk', columns: currPK })
    }
  }

  // Index diff
  const origIdxMap = new Map(original.indexes.map((i) => [i._tempId, i]))
  const currIdxMap = new Map(current.indexes.map((i) => [i._tempId, i]))

  for (const [id, idx] of origIdxMap) {
    if (!currIdxMap.has(id)) {
      changes.push({ type: 'drop-index', indexName: idx.name })
    }
  }
  for (const [id, idx] of currIdxMap) {
    const orig = origIdxMap.get(id)
    if (!orig) {
      changes.push({ type: 'add-index', index: idx })
    } else if (JSON.stringify(orig) !== JSON.stringify(idx)) {
      // Changed — drop and recreate
      changes.push({ type: 'drop-index', indexName: orig.name })
      changes.push({ type: 'add-index', index: idx })
    }
  }

  // Foreign key diff
  const origFKMap = new Map(original.foreignKeys.map((f) => [f._tempId, f]))
  const currFKMap = new Map(current.foreignKeys.map((f) => [f._tempId, f]))

  for (const [id, fk] of origFKMap) {
    if (!currFKMap.has(id)) {
      changes.push({ type: 'drop-fk', constraintName: fk.constraintName })
    }
  }
  for (const [id, fk] of currFKMap) {
    const orig = origFKMap.get(id)
    if (!orig) {
      changes.push({ type: 'add-fk', foreignKey: fk })
    } else if (JSON.stringify(orig) !== JSON.stringify(fk)) {
      changes.push({ type: 'drop-fk', constraintName: orig.constraintName })
      changes.push({ type: 'add-fk', foreignKey: fk })
    }
  }

  // Enum diff
  const origEnumMap = new Map((original.enums ?? []).map((e) => [e._tempId, e]))
  const currEnumMap = new Map((current.enums ?? []).map((e) => [e._tempId, e]))

  for (const [id, en] of origEnumMap) {
    if (!currEnumMap.has(id)) {
      changes.push({ type: 'drop-enum', enumName: en.name })
    }
  }
  for (const [id, en] of currEnumMap) {
    const orig = origEnumMap.get(id)
    if (!orig) {
      changes.push({ type: 'create-enum', enum: en })
    } else {
      // Renamed?
      if (orig.name !== en.name) {
        changes.push({ type: 'rename-enum', oldName: orig.name, newName: en.name, enumName: en.name })
      }
      // New values added? (PG only supports ADD VALUE, not remove)
      const origValues = new Set(orig.values)
      for (let i = 0; i < en.values.length; i++) {
        const val = en.values[i]
        if (!origValues.has(val)) {
          changes.push({
            type: 'add-enum-value',
            enumName: en.name,
            enumValue: val,
            afterValue: i > 0 ? en.values[i - 1] : undefined,
          })
        }
      }
    }
  }

  return changes
}
