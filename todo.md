# TO-DOs

## index.ts
- file globbing
- improved command line arg parsing
- move linter over to DBM proper
- add chalk color formatting
- 

## parser.ts
- parse nested `select` paren exprs with aliases
- parse any / all / exists / some operators


## visitor.ts

## scanner.ts
- (minor) fix quoted identifier issues

## scanner.spec.ts
- test for quoted identifiers terminating after unescaped ] or "
src/ast.ts:10:// todo: maybe also the char position

src/ast.ts:45:// todo: these might not matter... since createNode makes it with the token kind baked in...

src/ast.ts:66:// todo: this is likely going to take some kind of special syntax in the parser

src/ast.ts:73:// TODO: TernaryOperator expr between expr_a and expr_b

src/ast.ts:126:// todo: ... lots more here

src/ast.ts:140:  // todo...

src/ast.ts:149:// todo: is the declare @x table (<column_def>) a subset of the

src/ast.ts:168:// todo: I forget the syntax here.

src/ast.ts:229:// todo: figure out why value expression sucks

src/ast.ts:240:// todo: table expression with select-top 1 some_col

src/ast.ts:250:// todo: convert to union type?

src/ast.ts:260:// todo: make this a type to account for nulls and defaults and all that

src/ast.ts:299:// TODO: is this everything I want to cover?

src/ast.ts:334:  with?: string[] // todo: specialized type for table hints

src/ast.ts:378:// todo: deallocate, open, close, drop,

src/ast.ts:531:  // todo: optional with (SCHEMABINDING | ENCRYPTION | VIEWMETADATA)

src/ast.ts:532:  // todo: trailing semicolon

src/ast.ts:544:  // todo: does this work?

src/features.ts:27:    // todo: semver?

src/index.ts:129:  // todo: other encodings...

src/index.ts:160:// todo: visit select, if there are joins or multiple sources

src/index.ts:163:// todo: visit select, warn if same column selected multiple times

src/index.ts:167:// todo: start pulling these out into utils

src/index.ts:218:    // todo: match identifiers more thoughtfully

src/index.ts:329:    // todo: message = chalk.color(message) based on severity

src/index.ts:347:    // todo: chalk.red(underline)

src/index.ts:353:    // TODO: technically ANY expr that mutates a column value

src/index.ts:371:      // todo: are case exprs sargable?

src/index.ts:374:      // todo: args could be constant

src/index.ts:395:        // todo: is like just wrong....?

src/index.ts:413:      // todo: reverse this for the crazy UPPER nerds

src/parser.ts:92:  // todo: starts with @ or [@ or "@

src/parser.ts:93:  // todo: maybe a flag in the scanner...

src/parser.ts:119:      // todo: pretty broken, there are like 100

src/parser.ts:136:  // todo: error recovery, right now any error kills the parser.

src/parser.ts:139:  // todo: capture trivia

src/parser.ts:269:      // TODO: cursor stuff

src/parser.ts:278:      // TODO: transaction stuff

src/parser.ts:327:        // todo: @param = <expr>

src/parser.ts:332:    // todo: with recompile

src/parser.ts:340:    // todo: this could capture leading and trailing trivia

src/parser.ts:361:        // todo: other stuff that's legal inside acreate table

src/parser.ts:385:          // todo: ensure that these aren't double specified

src/parser.ts:400:              // todo: seed, increment stuff

src/parser.ts:421:          // todo: not for replication

src/parser.ts:452:      // todo: if it's an @local = expr that should get a different type as well.

src/parser.ts:494:    // todo: lookup and canonicalize type?

src/parser.ts:686:    // todo: more any,all,some,in...

src/parser.ts:809:        // todo: this should probably also end the identifier

src/parser.ts:813:        // todo: if there's a dot throw an error

src/parser.ts:823:    // todo: maybe also intern the identifier for easy lookup?

src/parser.ts:867:      // todo: 'in' context? would allow for multiple comma-separated

src/parser.ts:879:      // todo: this is really only legal in a few places...

src/parser.ts:940:        // todo: should this move next?

src/parser.ts:1094:        // todo: what's the rule here? variable or literals only?

src/parser.ts:1112:    // todo: flag check

src/parser.ts:1113:    // todo: create REMOTE table as select

src/parser.ts:1122:        // TODO:

src/parser.ts:1251:    // todo: "if exists"

src/parser.ts:1324:    // todo: full-text index support????

src/parser.ts:1346:    // todo: multiple table sources...

src/parser.ts:1354:      // todo: cross join

src/parser.ts:1355:      // todo: full join

src/parser.ts:1458:    // todo: error recovery?

src/print_visitor.ts:323:        // todo: recurse, there are other types

src/scanner.ts:4:// todo: namespace for all the common stuff?

src/scanner.ts:408:    // todo: if we hit a newline preceded by a \

src/scanner.ts:422:    // todo: see above.

src/scanner.ts:438:      // todo: stupid double quote escape stuff...

src/scanner.ts:528:    // todo: scan exponent notation

src/scanner.ts:604:        // todo: does sql allow naked floats .001?

src/scanner.ts:806:          // todo: unexpected token?

src/scanner.ts:884:      //   // todo: mysql hex literal X'

src/syntax.ts:237:  // todo: it's a bit of a shitshow after this point
src/syntax.ts:316:  // todo: all kinds of kinds
