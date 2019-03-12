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
  DoubleColonCast           = 1 << 6
}

export enum Edition {
  default = 'ms:sql-server',
  azure = 'ms:azure-data-warehouse',
  pdw = 'ms:parallel-data-warehouse',
  postgres = 'postgres',
  sqlite = ''
}

export function getSupportedEditions(): string[] {
  const list = []
  const e = <any>Edition
  for (const key of Object.keys(e)) {
    list.push(e[key])
  }

  return list
}

export function getFlagsForEdition(edition: string, version: string) {
  let flags = FeatureFlags.None

  if (edition === 'ms:parallel-data-warehouse') {
    flags |= FeatureFlags.CreateTableAsSelect
    flags |= FeatureFlags.CreateRemoteTableAsSelect
  } else if (edition === 'ms:azure-data-warehouse') {
    flags |= FeatureFlags.CreateTableAsSelect
  } else if (edition === 'ms:sql-server') {
    flags |= FeatureFlags.SharedTemporaryTables
    const num = Number(version)

    if (num >= 2016) {
      flags |= FeatureFlags.DropIfExists
    }
  } else if (edition === 'postgres') {
    // totally unsupported right now
    flags |= FeatureFlags.DropIfExists
    flags |= FeatureFlags.CreateIfNotExist
    flags |= FeatureFlags.DoubleColonCast
  }

  return flags
}
