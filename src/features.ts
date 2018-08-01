export enum FeatureFlags {
  None,
  CreateTableAsSelect,
  CreateRemoteTableAsSelect,
  DropIfExists,

  // non mssql stuff
  // for maybe later...
  HexLiterals,
  CreateIfNotExist,
}

export type Edition =
  | 'sql-server'
  | 'azure-data-warehouse'
  | 'parallel-data-warehouse'

export function getFlagsForEdition(edition: Edition, version: string) {
  let flags = FeatureFlags.None

  if (edition === 'parallel-data-warehouse') {
    flags |= FeatureFlags.CreateTableAsSelect
    flags |= FeatureFlags.CreateRemoteTableAsSelect
  } else if (edition === 'azure-data-warehouse') {
    flags |= FeatureFlags.CreateTableAsSelect
  } else if (edition === 'sql-server') {
    // todo: semver?
    const num = Number(version)

    if (num >= 2016) {
      flags |= FeatureFlags.DropIfExists
    }
  }

  return flags
}
