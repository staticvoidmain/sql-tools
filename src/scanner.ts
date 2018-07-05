import { Chars } from './chars'
import { SyntaxKind } from './syntax'

function isLetter(ch: number): boolean {
  return (Chars.A <= ch && ch <= Chars.Z)
    || (Chars.a <= ch && ch <= Chars.z)
}

function isDigit(charCode: number): boolean {
  return Chars.num_0 <= charCode && charCode <= Chars.num_9
}

/**
 * Basic token state so I don't have to read everything off the parser.
 * though, realistically, that's probably going to happen.
 */
export class Token {
  start: number
  end: number
  kind: SyntaxKind
  value?: any
  flags?: number

  constructor(kind: SyntaxKind, start: number, end: number) {
    this.kind = kind
    this.start = start
    this.end = end
  }
}

export const EmptyToken = new Token(SyntaxKind.EOF, 0, 0)

interface Keyword {
  key: string
  kind: SyntaxKind
}
// lookup case insensitive manner
class KeywordLookup {
  buckets: Array<Keyword[]>
  constructor(items: ReadonlyArray<[string, SyntaxKind]>) {
    this.buckets = []

    for (let index = 0; index < items.length; index++) {
      const el = items[index];
      const [key, kind] = el;
      const ch = key.charCodeAt(0);
      const i = ch - Chars.a;

      if (this.buckets[i] === undefined) {
        this.buckets[i] = []
      }

      this.buckets[i].push({
        key: key,
        kind: kind
      })
    }
  }

  invariantMatch(keyword: string, key: string) {
    if (keyword.length === key.length) {
      for (let j = 0; j < key.length; j++) {
        const a = keyword.charCodeAt(j);
        const b = key.charCodeAt(j);
        if (a === b || a === b - 32) {
          return true
        }
      }
    }

    return false
  }

  get(key: string): SyntaxKind | undefined {
    let ch = key.charCodeAt(0);

    if (isLetter(ch)) {
      if (ch <= Chars.Z) {
        // upper to lower case
        ch += 32;
      }

      // normalize
      ch -= Chars.a;
      const bucket = this.buckets[ch];

      if (bucket) {
        for (let i = 0; i < bucket.length; i++) {
          const el = bucket[i];

          if (this.invariantMatch(el.key, key)) {
            return el.kind
          }
        }
      }
    }
  }
}

// todo: some kind of specialized data structure
// that doesn't care about text casing and doesn't require copies
const keywordMap = new KeywordLookup([
  ['add', SyntaxKind.add_keyword],
  ['all', SyntaxKind.all_keyword],
  ['alter', SyntaxKind.alter_keyword],
  ['and', SyntaxKind.and_keyword],
  ['any', SyntaxKind.any_keyword],
  ['as', SyntaxKind.as_keyword],
  ['asc', SyntaxKind.asc_keyword],
  ['authorization', SyntaxKind.authorization_keyword],
  ['backup', SyntaxKind.backup_keyword],
  ['begin', SyntaxKind.begin_keyword],
  ['between', SyntaxKind.between_keyword],
  ['break', SyntaxKind.break_keyword],
  ['browse', SyntaxKind.browse_keyword],
  ['bulk', SyntaxKind.bulk_keyword],
  ['by', SyntaxKind.by_keyword],
  ['cascade', SyntaxKind.cascade_keyword],
  ['case', SyntaxKind.case_keyword],
  ['check', SyntaxKind.check_keyword],
  ['checkpoint', SyntaxKind.checkpoint_keyword],
  ['close', SyntaxKind.close_keyword],
  ['clustered', SyntaxKind.clustered_keyword],
  ['coalesce', SyntaxKind.coalesce_keyword],
  ['collate', SyntaxKind.collate_keyword],
  ['column', SyntaxKind.column_keyword],
  ['commit', SyntaxKind.commit_keyword],
  ['compute', SyntaxKind.compute_keyword],
  ['constraint', SyntaxKind.constraint_keyword],
  ['contains', SyntaxKind.contains_keyword],
  ['containstable', SyntaxKind.containstable_keyword],
  ['continue', SyntaxKind.continue_keyword],
  ['convert', SyntaxKind.convert_keyword],
  ['create', SyntaxKind.create_keyword],
  ['cross', SyntaxKind.cross_keyword],
  ['current', SyntaxKind.current_keyword],
  ['current_date', SyntaxKind.current_date_keyword],
  ['current_time', SyntaxKind.current_time_keyword],
  ['current_timestamp', SyntaxKind.current_timestamp_keyword],
  ['current_user', SyntaxKind.current_user_keyword],
  ['cursor', SyntaxKind.cursor_keyword],
  ['database', SyntaxKind.database_keyword],
  ['dbcc', SyntaxKind.dbcc_keyword],
  ['deallocate', SyntaxKind.deallocate_keyword],
  ['declare', SyntaxKind.declare_keyword],
  ['default', SyntaxKind.default_keyword],
  ['delete', SyntaxKind.delete_keyword],
  ['deny', SyntaxKind.deny_keyword],
  ['desc', SyntaxKind.desc_keyword],
  ['disk', SyntaxKind.disk_keyword],
  ['distinct', SyntaxKind.distinct_keyword],
  ['distributed', SyntaxKind.distributed_keyword],
  ['double', SyntaxKind.double_keyword],
  ['drop', SyntaxKind.drop_keyword],
  ['dump', SyntaxKind.dump_keyword],
  ['else', SyntaxKind.else_keyword],
  ['end', SyntaxKind.end_keyword],
  ['errlvl', SyntaxKind.errlvl_keyword],
  ['escape', SyntaxKind.escape_keyword],
  ['except', SyntaxKind.except_keyword],
  ['exec', SyntaxKind.exec_keyword],
  ['execute', SyntaxKind.execute_keyword],
  ['exists', SyntaxKind.exists_keyword],
  ['exit', SyntaxKind.exit_keyword],
  ['external', SyntaxKind.external_keyword],
  ['fetch', SyntaxKind.fetch_keyword],
  ['file', SyntaxKind.file_keyword],
  ['fillfactor', SyntaxKind.fillfactor_keyword],
  ['for', SyntaxKind.for_keyword],
  ['foreign', SyntaxKind.foreign_keyword],
  ['freetext', SyntaxKind.freetext_keyword],
  ['freetexttable', SyntaxKind.freetexttable_keyword],
  ['from', SyntaxKind.from_keyword],
  ['full', SyntaxKind.full_keyword],
  ['function', SyntaxKind.function_keyword],
  ['goto', SyntaxKind.goto_keyword],
  ['grant', SyntaxKind.grant_keyword],
  ['group', SyntaxKind.group_keyword],
  ['having', SyntaxKind.having_keyword],
  ['holdlock', SyntaxKind.holdlock_keyword],
  ['identity', SyntaxKind.identity_keyword],
  ['identity_insert', SyntaxKind.identity_insert_keyword],
  ['identitycol', SyntaxKind.identitycol_keyword],
  ['if', SyntaxKind.if_keyword],
  ['in', SyntaxKind.in_keyword],
  ['index', SyntaxKind.index_keyword],
  ['inner', SyntaxKind.inner_keyword],
  ['insert', SyntaxKind.insert_keyword],
  ['intersect', SyntaxKind.intersect_keyword],
  ['into', SyntaxKind.into_keyword],
  ['is', SyntaxKind.is_keyword],
  ['join', SyntaxKind.join_keyword],
  ['key', SyntaxKind.key_keyword],
  ['kill', SyntaxKind.kill_keyword],
  ['left', SyntaxKind.left_keyword],
  ['like', SyntaxKind.like_keyword],
  ['lineno', SyntaxKind.lineno_keyword],
  ['load', SyntaxKind.load_keyword],
  ['merge', SyntaxKind.merge_keyword],
  ['national', SyntaxKind.national_keyword],
  ['nocheck', SyntaxKind.nocheck_keyword],
  ['nonclustered', SyntaxKind.nonclustered_keyword],
  ['not', SyntaxKind.not_keyword],
  ['null', SyntaxKind.null_keyword],
  ['nullif', SyntaxKind.nullif_keyword],
  ['of', SyntaxKind.of_keyword],
  ['off', SyntaxKind.off_keyword],
  ['offsets', SyntaxKind.offsets_keyword],
  ['on', SyntaxKind.on_keyword],
  ['open', SyntaxKind.open_keyword],
  ['opendatasource', SyntaxKind.opendatasource_keyword],
  ['openquery', SyntaxKind.openquery_keyword],
  ['openrowset', SyntaxKind.openrowset_keyword],
  ['openxml', SyntaxKind.openxml_keyword],
  ['option', SyntaxKind.option_keyword],
  ['or', SyntaxKind.or_keyword],
  ['order', SyntaxKind.order_keyword],
  ['outer', SyntaxKind.outer_keyword],
  ['over', SyntaxKind.over_keyword],
  ['percent', SyntaxKind.percent_keyword],
  ['pivot', SyntaxKind.pivot_keyword],
  ['plan', SyntaxKind.plan_keyword],
  ['precision', SyntaxKind.precision_keyword],
  ['primary', SyntaxKind.primary_keyword],
  ['print', SyntaxKind.print_keyword],
  ['proc', SyntaxKind.proc_keyword],
  ['procedure', SyntaxKind.procedure_keyword],
  ['public', SyntaxKind.public_keyword],
  ['raiserror', SyntaxKind.raiserror_keyword],
  ['read', SyntaxKind.read_keyword],
  ['readtext', SyntaxKind.readtext_keyword],
  ['reconfigure', SyntaxKind.reconfigure_keyword],
  ['references', SyntaxKind.references_keyword],
  ['replication', SyntaxKind.replication_keyword],
  ['restore', SyntaxKind.restore_keyword],
  ['restrict', SyntaxKind.restrict_keyword],
  ['return', SyntaxKind.return_keyword],
  ['revert', SyntaxKind.revert_keyword],
  ['revoke', SyntaxKind.revoke_keyword],
  ['right', SyntaxKind.right_keyword],
  ['rollback', SyntaxKind.rollback_keyword],
  ['rowcount', SyntaxKind.rowcount_keyword],
  ['rowguidcol', SyntaxKind.rowguidcol_keyword],
  ['rule', SyntaxKind.rule_keyword],
  ['save', SyntaxKind.save_keyword],
  ['schema', SyntaxKind.schema_keyword],
  ['securityaudit', SyntaxKind.securityaudit_keyword],
  ['select', SyntaxKind.select_keyword],
  ['semantickeyphrasetable', SyntaxKind.semantickeyphrasetable_keyword],
  ['semanticsimilaritydetailstable', SyntaxKind.semanticsimilaritydetailstable_keyword],
  ['semanticsimilaritytable', SyntaxKind.semanticsimilaritytable_keyword],
  ['session_user', SyntaxKind.session_user_keyword],
  ['set', SyntaxKind.set_keyword],
  ['setuser', SyntaxKind.setuser_keyword],
  ['shutdown', SyntaxKind.shutdown_keyword],
  ['some', SyntaxKind.some_keyword],
  ['statistics', SyntaxKind.statistics_keyword],
  ['system_user', SyntaxKind.system_user_keyword],
  ['table', SyntaxKind.table_keyword],
  ['tablesample', SyntaxKind.tablesample_keyword],
  ['textsize', SyntaxKind.textsize_keyword],
  ['then', SyntaxKind.then_keyword],
  ['to', SyntaxKind.to_keyword],
  ['top', SyntaxKind.top_keyword],
  ['tran', SyntaxKind.tran_keyword],
  ['transaction', SyntaxKind.transaction_keyword],
  ['trigger', SyntaxKind.trigger_keyword],
  ['truncate', SyntaxKind.truncate_keyword],
  ['try_convert', SyntaxKind.try_convert_keyword],
  ['tsequal', SyntaxKind.tsequal_keyword],
  ['union', SyntaxKind.union_keyword],
  ['unique', SyntaxKind.unique_keyword],
  ['unpivot', SyntaxKind.unpivot_keyword],
  ['update', SyntaxKind.update_keyword],
  ['updatetext', SyntaxKind.updatetext_keyword],
  ['use', SyntaxKind.use_keyword],
  ['user', SyntaxKind.user_keyword],
  ['values', SyntaxKind.values_keyword],
  ['varying', SyntaxKind.varying_keyword],
  ['view', SyntaxKind.view_keyword],
  ['waitfor', SyntaxKind.waitfor_keyword],
  ['when', SyntaxKind.when_keyword],
  ['where', SyntaxKind.where_keyword],
  ['while', SyntaxKind.while_keyword],
  ['with', SyntaxKind.with_keyword],
  ['within group', SyntaxKind.within_keyword],
  ['writetext', SyntaxKind.writetext_keyword],
])

export interface ScannerOptions {
  /**
   * @NotImplemented
   */
  skipTrivia?: boolean
}

function binarySearch(array: Array<Number>, key: Number) {
  let low = 0
  let high = array.length - 1
  while (low <= high) {
    const mid = low + (high - low / 2)
    const val = array[mid]

    if (val == key) {
      return mid
    }

    if (val < key) {
      low = mid + 1
    } else {
      high = mid - 1
    }
  }

  // do the 2s compliment trick
  return ~low
}

export class Scanner {
  private readonly text: string
  private readonly len: number
  private readonly lines: number[]
  private readonly options: any
  // token start position

  private pos: number

  constructor(text: string, options: ScannerOptions) {
    this.options = options
    this.text = text
    this.pos = 0
    this.len = text.length
    this.lines = []
  }

  // only compute it when we need it.
  lazyComputeLineNumbers() {
    if (!this.lines.length) {
      let pos = 0
      let ch = NaN
      this.lines.push(0)

      while (ch = this.text.charCodeAt(pos++)) {
        if (ch === Chars.newline) {
          this.lines.push(pos)
        }
      }
    }
  }

  // current char position as well?
  getCurrentLine(): number {
    this.lazyComputeLineNumbers()
    const line = binarySearch(this.lines, this.pos)

    if (line >= 0) {
      return line
    }

    return ~line - 1
  }

  // advance until we find the first unescaped single quote.
  // edge case: empty string
  scanString(): string {
    const start = ++this.pos
    let ch = this.text.charCodeAt(this.pos)
    // todo: if we hit a newline preceded by a \
    // then set a flag or something.
    while (true) {
      if (ch === Chars.singleQuote) {
        if (this.peek() !== Chars.singleQuote) {
          break
        }

        this.pos++
      }

      ch = this.text.charCodeAt(++this.pos)
    }
    // todo: above.
    return this.text.substring(start, this.pos)
  }

  scanQuotedIdentifier() {
    const start = this.pos
    let ch = this.text.charCodeAt(this.pos)
    while (this.pos < this.len) {
      const valid = isLetter(ch)
        || isDigit(ch)
        || ch === Chars.underscore
        || ch === Chars.period
        || ch === Chars.doubleQuote

      if (!valid) {
        break
      }

      this.pos++

      ch = this.text.charCodeAt(this.pos)
    }

    return this.text.substring(start, this.pos)
  }

  // todo: a full legal name with quotes and all...
  scanDottedIdentifier() {
    const start = this.pos
    let ch = this.text.charCodeAt(this.pos)
    while (ch) {
      const valid = isLetter(ch)
        || isDigit(ch)
        || ch === Chars.underscore
        || ch === Chars.period

      if (!valid) {
        break
      }

      this.pos++

      ch = this.text.charCodeAt(this.pos)
    }

    return this.text.substring(start, this.pos)
  }

  /**
   * Some_Consecutive_Name1
   */
  scanIdentifier(): string {
    const start = this.pos
    let ch = this.text.charCodeAt(this.pos)
    while (isLetter(ch) || isDigit(ch) || ch === Chars.underscore) {
      this.pos++

      ch = this.text.charCodeAt(this.pos)
    }

    return this.text.substring(start, this.pos)
  }

  private peek(): number {
    // charCodeAt returns NaN if we go out of bounds.
    // so that's nice.
    return this.text.charCodeAt(this.pos + 1)
  }

  private scanInlineComment() {
    const start = this.pos;
    let ch = this.text.charCodeAt(this.pos)

    while (ch) {
      if (ch === Chars.newline) {
        break
      }

      ch = this.text.charCodeAt(++this.pos)
    }

    return this.text.substring(start, this.pos - 1)
  }

  private scanBlockComment() {
    const start = this.pos
    let ch = this.text.charCodeAt(this.pos)

    while (ch) {
      if (ch === Chars.asterisk && this.peek() === Chars.forwardSlash) {
        this.pos++
        break
      }

      ch = this.text.charCodeAt(++this.pos)
    }

    return this.text.substring(start + 2, this.pos - 2)
  }

  scanNumber(): Number {
    const start = this.pos
    while (isDigit(this.text.charCodeAt(this.pos))) this.pos++

    if (this.text.charCodeAt(this.pos) === Chars.period) {
      this.pos++
      while (isDigit(this.text.charCodeAt(this.pos))) this.pos++
    }

    return parseFloat(this.text.substring(start, this.pos))
  }

  isSpace() {
    const ch = this.text.charCodeAt(this.pos)

    return (ch === Chars.tab
      || ch === Chars.space
      || ch === Chars.newline
      || ch === Chars.carriageReturn)
  }

  scan(): Token {
    const start = this.pos
    const ch = this.text.charCodeAt(this.pos)
    // todo: flags?
    let val = undefined
    let kind = SyntaxKind.EOF

    if (isNaN(ch)) {
      return new Token(kind, start, this.pos);
    }

    switch (ch) {

      case Chars.forwardSlash: {
        kind = SyntaxKind.divToken

        const next = this.peek();

        if (next === Chars.equal) {
          this.pos++;
          kind = SyntaxKind.divEqualsAssignment;
        } else if (next === Chars.asterisk) {
          kind = SyntaxKind.comment_block
          val = this.scanBlockComment();
        }

        break
      }

      // consume all whitespace for now
      // but eventually for the linter we need
      // to actually do something with it.
      case Chars.carriageReturn:
      case Chars.newline:
      case Chars.tab:
      case Chars.space: {
        while (this.isSpace()) {
          this.pos++
        }
        // to account for the last
        // pos++ so I don't have to do it later.
        this.pos--
        kind = SyntaxKind.whitespace
        break
      }

      // apparently unary + and - can be
      // tucked next to each other,
      // they just don't bind.
      case Chars.plus: {
        kind = SyntaxKind.plusToken
        const next = this.peek()

        if (next === Chars.equal) {
          this.pos++
          kind = SyntaxKind.plusEqualsAssignment
        }
        break
      }

      case Chars.hyphen: {
        const next = this.peek()

        if (next === Chars.hyphen) {
          this.scanInlineComment()
          kind = SyntaxKind.comment_inline
        } else if (next === Chars.equal) {
          this.pos++
          kind = SyntaxKind.minusEqualsAssignment
        }
        else {
          // regular old minus, let the parser figure out
          // what to do with it.
          // we COULD eagerly go looking for a number or something, but it could be lots of things.
          kind = SyntaxKind.minusToken
        }

        break
      }

      // & or &=
      case Chars.ampersand: {

        if (this.peek() !== Chars.equal) {
          kind = SyntaxKind.bitwiseAnd
        } else {
          this.pos++
          kind = SyntaxKind.bitwiseAndAssignment
        }

        break
      }

      // | or |=
      case Chars.pipe: {

        if (this.peek() !== Chars.equal) {
          kind = SyntaxKind.bitwiseOr
        } else {
          this.pos++
          kind = SyntaxKind.bitwiseOrAssignment
        }
        break
      }

      case Chars.lessThan: {
        kind = SyntaxKind.lessThan

        const next = this.peek()

        if (next === Chars.greaterThan) {
          kind = SyntaxKind.ltGt
          this.pos++
        } else if (next === Chars.equal) {
          kind = SyntaxKind.lessThanEqual
          this.pos++
        }
        break
      }

      case Chars.greaterThan: {
        kind = SyntaxKind.greaterThan;
        const next = this.peek()

        if (next === Chars.equal) {
          kind = SyntaxKind.greaterThanEqual
          this.pos++
        }
        break
      }

      // !=, !<, !>
      case Chars.bang: {
        const next = this.peek()
        this.pos++

        if (next === Chars.equal) {
          kind = SyntaxKind.lessThan
        } else if (next === Chars.lessThan) {
          kind = SyntaxKind.notLessThan

        } else if (next === Chars.greaterThan) {
          kind = SyntaxKind.notGreaterThan
        }
        else {
          // todo: unexpected token
        }

        break
      }

      case Chars.percent: {
        kind = SyntaxKind.modToken

        const next = this.peek()
        if (next === Chars.equal) {
          kind = SyntaxKind.modEqualsAssignment
          this.pos++
        }

        break
      }

      case Chars.num_0:
      case Chars.num_1:
      case Chars.num_2:
      case Chars.num_3:
      case Chars.num_4:
      case Chars.num_5:
      case Chars.num_6:
      case Chars.num_7:
      case Chars.num_8:
      case Chars.num_9:
        val = this.scanNumber()
        kind = SyntaxKind.numeric_literal
        break

      case Chars.singleQuote: {
        val = this.scanString()
        kind = SyntaxKind.string_literal
        break
      }

      case Chars.doubleQuote: {
        val = this.scanQuotedIdentifier()
        kind = SyntaxKind.quoted_identifier
        break
      }

      case Chars.at: {
        if (this.peek() === Chars.at) {
          // parse config function
          // ex: @@servername
          this.pos++
          val = this.scanIdentifier()
          kind = SyntaxKind.server_variable_reference
        }

        val = this.scanIdentifier()
        kind = SyntaxKind.local_variable_reference
        break
      }

      case Chars.hash: {
        kind = SyntaxKind.temp_table

        // && isMssql
        if (this.peek() === Chars.hash) {
          this.pos++
          kind = SyntaxKind.shared_temp_table
        }

        val = this.scanIdentifier()

        break
      }
      // fallthrough?
      // case Chars.x:
      // case Chars.X:
      //   // todo: mysql hex literal X'

      // case Chars.n:
      // case Chars.N: // begin nvarchar literal.

      default: {
        val = this.scanDottedIdentifier()
        const keyword = keywordMap.get(val)

        kind = keyword ? keyword : SyntaxKind.name
        break
      }
    }

    // todo: ignore whitespace here, and just goto?
    const token = new Token(kind, start, this.pos++)
    token.flags = undefined
    token.value = val

    return token
  }
}
