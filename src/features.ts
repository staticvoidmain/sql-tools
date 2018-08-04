export enum FeatureFlags {
  None = 0,
  CreateTableAsSelect       = 1 << 0,
  CreateRemoteTableAsSelect = 1 << 1,
  DropIfExists              = 1 << 2,
  SharedTemporaryTables     = 1 << 3,
  // non mssql stuff
  // for maybe later...
  HexLiterals               = 1 << 4,
  CreateIfNotExist          = 1 << 5,
}

export type Edition =
  | 'sql-server'
  | 'azure-data-warehouse'
  | 'parallel-data-warehouse'

export function getFlagsForEdition(edition: string, version: string) {
  let flags = FeatureFlags.None

  if (edition === 'parallel-data-warehouse') {
    flags |= FeatureFlags.CreateTableAsSelect
    flags |= FeatureFlags.CreateRemoteTableAsSelect
  } else if (edition === 'azure-data-warehouse') {
    flags |= FeatureFlags.CreateTableAsSelect
  } else if (edition === 'sql-server') {
    // does pdw support it? probably not right?
    flags |= FeatureFlags.SharedTemporaryTables
    // todo: semver?
    const num = Number(version)

    if (num >= 2016) {
      flags |= FeatureFlags.DropIfExists
    }
  }

  return flags
}
