import { Chars } from './chars'
import { SyntaxKind } from './syntax'

// todo: namespace for all the common stuff?
import { ParserOptions } from './ast'

function isLetter(ch: number): boolean {
  return (Chars.A <= ch && ch <= Chars.Z)
    || (Chars.a <= ch && ch <= Chars.z)
}

function isDigit(charCode: number): boolean {
  return Chars.num_0 <= charCode && charCode <= Chars.num_9
}

// stash some additional stuff inside the token
// for later tools
export enum TokenFlags {
  None = 0,
  Keyword = 1,
  UnicodeString = 2,
  MoneyLiteral = 4,
  SharedTempTable = 8
}

export class Token {
  start: number
  end: number
  kind: SyntaxKind
  value?: any
  flags: TokenFlags

  constructor(kind: SyntaxKind, start: number, end: number) {
    this.kind = kind
    this.start = start
    this.end = end
    this.flags = 0
  }
}

export const EmptyToken = new Token(SyntaxKind.EOF, 0, 0)

interface Keyword {
  key: string
  kind: SyntaxKind
}

interface Bucket {
  keywords: Keyword[]
  min: number
  max: number
}

class KeywordLookup {
  private readonly buckets: Array<Bucket>

  private minIdentifier: number
  private maxIdentifier: number

  constructor(items: ReadonlyArray<[string, SyntaxKind]>) {
    this.buckets = []
    this.maxIdentifier = 0
    this.minIdentifier = 0

    for (let index = 0; index < items.length; index++) {
      const [key, kind] = items[index]
      const i = key.charCodeAt(0) - Chars.a
      const bucket = (this.buckets[i] = this.buckets[i] || { keywords: [] })

      bucket.keywords.push({
        key: key,
        kind: kind
      })

      bucket.min = Math.min(bucket.min, key.length) || key.length
      bucket.max = Math.max(bucket.max, key.length)

      // this is probably not all that important
      // since each bucket has a min/max
      this.minIdentifier = Math.min(this.minIdentifier, key.length) || key.length
      this.maxIdentifier = Math.max(this.maxIdentifier, key.length)
    }
  }

  // it's O(n) time in the worst case
  // but the bucketed sizes are really small.
  invariantMatch(keyword: string, key: string) {
    if (keyword.length === key.length) {
      for (let j = 0; j < key.length; j++) {
        const a = keyword.charCodeAt(j)
        const b = key.charCodeAt(j)
        // upper or lower match is fine
        if (a !== b && a !== b + 32) {
          return false
        }
      }

      return true
    }

    return false
  }

  get(key: string): SyntaxKind | undefined {
    if (key.length < this.minIdentifier || key.length > this.maxIdentifier) {
      return undefined
    }

    let ch = key.charCodeAt(0)

    if (isLetter(ch)) {
      if (ch <= Chars.Z) {
        // upper to lower case
        ch += 32
      }

      // normalize
      ch -= Chars.a
      const bucket = this.buckets[ch]

      if (bucket) {
        if (key.length < bucket.min || key.length > bucket.max) {
          return undefined
        }

        const len = bucket.keywords.length
        for (let i = 0; i < len; i++) {
          const el = bucket.keywords[i]

          if (this.invariantMatch(el.key, key)) {
            return el.kind
          }
        }
      }
    }
  }
}

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
  ['go', SyntaxKind.go_keyword], // special: mssql
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
  ['partition', SyntaxKind.partition_keyword],
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
  // missing from the list of online keywords...
  ['throw', SyntaxKind.throw_keyword],
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

export function binarySearch(array: Array<number>, key: number) {
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

  return ~low
}

export class Scanner {
  private readonly text: string
  private readonly lines: number[]
  private readonly options: ParserOptions
  private pos: number

  constructor(text: string, options?: ParserOptions) {
    this.options = options || {}
    this.text = text
    this.pos = 0
    this.lines = []
  }

  private lazyComputeLineNumbers() {
    if (this.lines.length) return

    this.lines.push(0)

    let pos = 0, ch = NaN
    while (ch = this.text.charCodeAt(pos++)) {
      if (ch  === Chars.newline) {
        this.lines.push(pos)
      }
    }
  }

  private getLine(pos: number) {
    this.lazyComputeLineNumbers()
    const line = binarySearch(this.lines, pos)

    if (line >= 0) {
      return line
    }

    return ~line - 1
  }

  private error(msg: string) {
    const err = this.options.error

    if (err) {
      const line = this.getLine(this.pos)

      err({
        file: this.options.path,
        line: line,
        col: this.offsetOf(this.pos, line),
        message: msg
      })
    }
  }

  // advance until we find the first unescaped single quote.
  private scanString(): string {
    const start = ++this.pos
    let ch = this.text.charCodeAt(this.pos)
    // todo: if we hit a newline preceded by a \
    // then set a flag or something and don't include the
    // newline token in the string...
    while (true) {
      if (ch === Chars.singleQuote) {
        if (this.peek() !== Chars.singleQuote) {
          break
        }

        this.pos++
      }

      ch = this.text.charCodeAt(++this.pos)
    }
    // todo: see above.
    return this.text.substring(start, this.pos)
  }

  private scanIdentifier() {
    let ch = this.text.charCodeAt(this.pos)

    // this is kinda wrong... square braces can't escape other square braces
    // "s and [] are balanced and end when the last unescaped closing token are encountered.
    const insideQuoteContext = ch === Chars.doubleQuote
    const insideBraceContext = ch === Chars.openBrace

    // all idents are at least one character long.
    const start = this.pos++

    while (ch = this.text.charCodeAt(this.pos)) {
      if ((ch === Chars.doubleQuote && insideQuoteContext)
        || (ch === Chars.closeBrace && insideBraceContext)) {
        this.pos++
        break
      }

      if (insideQuoteContext || insideBraceContext) {
        // doesn't matter what it is inside actually,
        this.pos++
      }
      else if (isLetter(ch)
        || isDigit(ch)
        || ch === Chars.dollar
        || ch === Chars.underscore
        || ch === Chars.at) { this.pos++ }
      else break
    }

    // back out one character since we overshot by one
    // and the top level scanning switch is going to advance
    // the position by one.
    return this.text.substring(start, this.pos--)
  }

  /**
   * simple identifier with no spacing
   * @@something
   * ##something
   * #Some_Consecutive_Name1
   */
  private scanRegularIdentifier(): string {
    const start = this.pos
    let ch = this.text.charCodeAt(++this.pos)
    while (isLetter(ch)
      || isDigit(ch)
      || ch === Chars.underscore) {
      // we advance until we are no longer a legal identifier
      // and then back off one character.
      ch = this.text.charCodeAt(++this.pos)
    }

    return this.text.substring(start, this.pos--)
  }

  // charCodeAt returns NaN if we go out of bounds.
  private peek(): number {
    return this.text.charCodeAt(this.pos + 1)
  }

  private scanInlineComment() {
    const start = this.pos
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

  private scanNumber(): Number {
    const start = this.pos
    while (isDigit(this.text.charCodeAt(this.pos))) this.pos++
    // todo: scan exponent notation
    if (this.text.charCodeAt(this.pos) === Chars.period) {
      this.pos++

      let flag = false
      while (isDigit(this.text.charCodeAt(this.pos))) {
        flag = true
        this.pos++
      }

      if (!flag) {
        this.error('invalid number specified')
      }
    }

    // another -1
    return parseFloat(this.text.substring(start, this.pos--))
  }

  private isSpace() {
    const ch = this.text.charCodeAt(this.pos)

    return (ch === Chars.tab
      || ch === Chars.space
      || ch === Chars.newline
      || ch === Chars.carriageReturn)
  }


  getSourceLine(line: number) {
    this.lazyComputeLineNumbers()

    const begin = this.lines[line]
    const end = this.lines[line + 1]

    return this.text.substring(begin, end)
  }

  // callable from the parser
  // to get the text just for a single node
  getSourceSubstring(begin: number, end: number) {
    return this.text.substring(begin, end)
  }

  /**
   * Returns the line of the specified token.
   * @param token the token to inspect
   */
  lineOf(start: number) {
    return this.getLine(start)
  }

  offsetOf(start: number, line: number) {
    const lineStart = this.lines[line]

    return (start - lineStart)
  }

  /**
   * advance the token stream by one and return the current token.
   */
  scan(): Token {
    const start = this.pos
    const ch = this.text.charCodeAt(this.pos)
    let flags = 0
    let val = undefined
    let kind = SyntaxKind.EOF

    if (isNaN(ch)) {
      return new Token(kind, start, this.pos)
    }

    switch (ch) {
      //#region simple terminals

      case Chars.period: {
        // todo: does sql allow naked floats .001?
        kind = SyntaxKind.dot_token

        if (this.peek() == Chars.period) {
          this.pos++
          kind = SyntaxKind.dotdot_token
        }
        break
      }

      case Chars.comma: {
        kind = SyntaxKind.comma_token
        break
      }

      case Chars.semi: {
        kind = SyntaxKind.semicolon_token
        break
      }

      case Chars.openParen: {
        kind = SyntaxKind.openParen
        break
      }

      case Chars.closeParen: {
        kind = SyntaxKind.closeParen
        break
      }

      case Chars.equal: {
        kind = SyntaxKind.equal
        break
      }

      //#endregion

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

      case Chars.forwardSlash: {
        kind = SyntaxKind.div_token

        const next = this.peek()

        if (next === Chars.equal) {
          this.pos++
          kind = SyntaxKind.divEqualsAssignment
        } else if (next === Chars.asterisk) {
          kind = SyntaxKind.comment_block
          val = this.scanBlockComment()
        }

        break
      }

      // unary + and - can be
      // tucked next to each other,
      // they just don't bind.
      case Chars.plus: {
        kind = SyntaxKind.plus_token

        if (this.peek() === Chars.equal) {
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
          kind = SyntaxKind.minus_token
        }

        break
      }

      case Chars.tilde: {
        kind = SyntaxKind.bitwise_not_token
        break
      }

      case Chars.asterisk: {
        kind = SyntaxKind.mul_token

        if (this.peek() === Chars.equal) {
          this.pos++
          kind = SyntaxKind.mulEqualsAssignment
        }

        break
      }

      case Chars.forwardSlash: {
        kind = SyntaxKind.div_token

        if (this.peek() === Chars.equal) {
          this.pos++
          kind = SyntaxKind.divEqualsAssignment
        }

        break
      }

      // & or &=
      case Chars.ampersand: {
        kind = SyntaxKind.bitwise_and_token
        if (this.peek() === Chars.equal) {
          this.pos++
          kind = SyntaxKind.bitwiseAndAssignment
        }

        break
      }

      // | or |=
      case Chars.pipe: {
        kind = SyntaxKind.bitwise_or_token

        if (this.peek() === Chars.equal) {
          this.pos++
          kind = SyntaxKind.bitwiseOrAssignment
        }
        break
      }

      // ^ or ^=
      case Chars.caret: {
        kind = SyntaxKind.bitwise_xor_token
        if (this.peek() === Chars.equal) {
          this.pos++
          kind = SyntaxKind.bitwiseXorAssignment
        }

        break
      }

      // < <= <>
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

      // > >=
      case Chars.greaterThan: {
        kind = SyntaxKind.greaterThan

        if (this.peek() === Chars.equal) {
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
          kind = SyntaxKind.notEqual
        } else if (next === Chars.lessThan) {
          kind = SyntaxKind.notLessThan

        } else if (next === Chars.greaterThan) {
          kind = SyntaxKind.notGreaterThan
        }
        else {
          // todo: unexpected token?
          // how should that be handled?
          throw new Error('unexpected token')
        }

        break
      }

      case Chars.percent: {
        kind = SyntaxKind.mod_token

        const next = this.peek()
        if (next === Chars.equal) {
          kind = SyntaxKind.modEqualsAssignment
          this.pos++
        }

        break
      }

      case Chars.dollar: { /* fallthrough */
        this.pos++
        flags |= TokenFlags.MoneyLiteral
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

      case Chars.doubleQuote:
      case Chars.openBrace: {
        val = this.scanIdentifier()
        kind = SyntaxKind.identifier
        break
      }

      case Chars.at: {
        kind = SyntaxKind.identifier
        if (this.peek() === Chars.at) {
          // mssql config functions
          this.pos++
        }

        val = this.scanRegularIdentifier()
        break
      }

      case Chars.hash: {
        kind = SyntaxKind.identifier

        if (this.peek() === Chars.hash) {
          // mssql shared temp table
          flags |= TokenFlags.SharedTempTable
          this.pos++
        }

        val = this.scanRegularIdentifier()
        break
      }

      // case Chars.x:
      // case Chars.X:
      //   // todo: mysql hex literal X'

      case Chars.n:
      case Chars.N: { /* fallthrough */
        if (this.peek() === Chars.singleQuote) {
          this.pos++
          val = this.scanString()
          kind = SyntaxKind.string_literal
          flags |= TokenFlags.UnicodeString

          break
        }
      }

      default: {
        val = this.scanIdentifier()
        kind = SyntaxKind.identifier

        const keyword = keywordMap.get(val)
        if (keyword) {
          kind = keyword
          flags |= TokenFlags.Keyword
        }

        break
      }
    }

    const token = new Token(kind, start, this.pos++)
    token.flags = flags
    token.value = val

    return token
  }
}
