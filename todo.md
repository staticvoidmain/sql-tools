# TO-DOs

## index.ts
- *better* file globbing
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
- (minor) add hex literal support
- 

## scanner.spec.ts
- test for quoted identifiers terminating after unescaped ] or "

## comments

src/ast.ts:10:// todo: maybe also the char position

src/ast.ts:46:// todo: these might not matter... since createNode makes it with the token kind baked in...

src/ast.ts:67:// todo: this is likely going to take some kind of special syntax in the parser

src/ast.ts:167:// todo: ... lots more here

src/ast.ts:181:  // todo...

src/ast.ts:189:// todo: is the declare @x table (<column_def>) a subset of the

src/ast.ts:208:// todo: I forget the syntax here.

src/ast.ts:269:// todo: figure out why value expression sucks

src/ast.ts:280:// todo: table expression with select-top 1 some_col

src/ast.ts:290:// todo: convert to union type?

src/ast.ts:305:// todo: make this a type to account for nulls and defaults and all that

src/ast.ts:354:// TODO: is this everything I want to cover?

src/ast.ts:398:  with?: string[] // todo: specialized type for table hints

src/ast.ts:442:// todo: deallocate, open, close, drop,

src/ast.ts:607:  // todo: optional with (SCHEMABINDING | ENCRYPTION | VIEWMETADATA)

src/ast.ts:608:  // todo: trailing semicolon

src/ast.ts:615:  // todo: with options

src/ast.ts:627:  // todo: does this work?

src/features.ts:29:    // todo: semver?

src/index.ts:132:    features: getFlagsForEdition(edition, '2016'), // hack: fix this later

src/index.ts:168:// todo: start pulling these out into utils

src/index.ts:219:    // todo: match identifiers more thoughtfully

src/index.ts:330:    // todo: message = chalk.color(message) based on severity

src/index.ts:348:    // todo: chalk.red(underline)

src/index.ts:385:    // TODO: technically ANY expr that mutates a column value

src/index.ts:403:      // todo: are case exprs sargable?

src/index.ts:406:      // todo: args could be constant

src/index.ts:418:        // todo: full on SAT solver, let's go crazy and prove some shit

src/index.ts:444:      // todo: reverse this for the crazy UPPER nerds

src/parser.ts:143:      // todo: pretty broken, there are like 100

src/parser.ts:152:// todo: supports partitioning

src/parser.ts:191:// todo: zero unnecessary allocations!

src/parser.ts:197:// todo: zero unnecessary allocations!

src/parser.ts:220:  // todo: capture trivia

src/parser.ts:238:    // todo: for easier debugging only capture the "NEXT" statement

src/parser.ts:278:        // todo: wtf

src/parser.ts:294:        // todo: common table expr stuff

src/parser.ts:299:          // todo: percent?

src/parser.ts:391:      // TODO: cursor stuff

src/parser.ts:400:      // TODO: transaction stuff

src/parser.ts:451:        // HACK, skipping the named parameters,

src/parser.ts:463:    // todo: with recompile

src/parser.ts:471:    // todo: this could capture leading and trailing trivia

src/parser.ts:492:        // todo: other stuff that's legal inside acreate table

src/parser.ts:516:          // todo: ensure that these aren't double specified

src/parser.ts:531:              // todo: seed, increment stuff

src/parser.ts:552:          // todo: not for replication

src/parser.ts:584:      // todo: if it's an @local = expr that should get a different type as well.

src/parser.ts:626:    // todo: lookup and canonicalize type?

src/parser.ts:824:    // todo: exists? some / any here??

src/parser.ts:1006:      // todo: assert kind

src/parser.ts:1007:      // todo: attach these to the subsequent statement

src/parser.ts:1049:        // todo: this should probably also end the identifier

src/parser.ts:1053:        // todo: if there's a dot throw an error

src/parser.ts:1063:    // todo: maybe also intern the identifier for easy lookup?

src/parser.ts:1091:    // // todo: these behave strangely, but they look to me like unary

src/parser.ts:1155:      // todo: this is really only legal in a few places...

src/parser.ts:1398:          // todo: what's the rule here? variable or literals only?

src/parser.ts:1406:    // todo: as SomeUser

src/parser.ts:1407:    // todo: AT linked_server_name

src/parser.ts:1418:      // todo: create REMOTE table as select

src/parser.ts:1420:        // todo: promote to keyword for case invariance

src/parser.ts:1441:            // HACK: for now we'll just throw out

src/parser.ts:1522:        // hack

src/parser.ts:1611:        // todo: flags for "if exists"

src/parser.ts:1621:    // todo: attach common table exprs

src/parser.ts:1641:      // todo: doesn't support multiple ROWS of values...

src/parser.ts:1703:    // todo: full-text index support

src/parser.ts:1708:      // todo: nested parens?

src/parser.ts:1735:    // todo: nested table exprs

src/parser.ts:1755:    // todo: multiple table sources...

src/parser.ts:1761:      // todo: cross join

src/parser.ts:1928:    // todo: error recovery?

src/print_visitor.ts:392:        // todo: recurse, there are other types

src/scanner.ts:4:// todo: namespace for all the common stuff?

src/scanner.ts:421:    // todo: if we hit a newline preceded by a \

src/scanner.ts:435:    // todo: see above.

src/scanner.ts:534:    // todo: scan exponent notation

src/scanner.ts:563:  // todo: do while?

src/scanner.ts:644:        // todo: probably legal whitespace

src/scanner.ts:914:      //   // todo: mysql hex literal X'

src/syntax.ts:240:  // todo: it's a bit of a shitshow after this point
src/syntax.ts:338:  // todo: all kinds of kinds
test/scanner.spec.ts:265:    // todo: this is a stupid edge case

todo.md:25:src/ast.ts:10:// todo: maybe also the char position

todo.md:27:src/ast.ts:46:// todo: these might not matter... since createNode makes it with the token kind baked in...

todo.md:29:src/ast.ts:67:// todo: this is likely going to take some kind of special syntax in the parser

todo.md:31:src/ast.ts:167:// todo: ... lots more here

todo.md:33:src/ast.ts:181:  // todo...

todo.md:35:src/ast.ts:189:// todo: is the declare @x table (<column_def>) a subset of the

todo.md:37:src/ast.ts:208:// todo: I forget the syntax here.

todo.md:39:src/ast.ts:269:// todo: figure out why value expression sucks

todo.md:41:src/ast.ts:280:// todo: table expression with select-top 1 some_col

todo.md:43:src/ast.ts:290:// todo: convert to union type?

todo.md:45:src/ast.ts:305:// todo: make this a type to account for nulls and defaults and all that

todo.md:47:src/ast.ts:354:// TODO: is this everything I want to cover?

todo.md:49:src/ast.ts:398:  with?: string[] // todo: specialized type for table hints

todo.md:51:src/ast.ts:442:// todo: deallocate, open, close, drop,

todo.md:53:src/ast.ts:607:  // todo: optional with (SCHEMABINDING | ENCRYPTION | VIEWMETADATA)

todo.md:55:src/ast.ts:608:  // todo: trailing semicolon

todo.md:57:src/ast.ts:615:  // todo: with options

todo.md:59:src/ast.ts:627:  // todo: does this work?

todo.md:61:src/features.ts:29:    // todo: semver?

todo.md:63:src/index.ts:132:    features: getFlagsForEdition(edition, '2016'), // hack: fix this later

todo.md:65:src/index.ts:168:// todo: start pulling these out into utils

todo.md:67:src/index.ts:219:    // todo: match identifiers more thoughtfully

todo.md:69:src/index.ts:330:    // todo: message = chalk.color(message) based on severity

todo.md:71:src/index.ts:348:    // todo: chalk.red(underline)

todo.md:73:src/index.ts:385:    // TODO: technically ANY expr that mutates a column value

todo.md:75:src/index.ts:403:      // todo: are case exprs sargable?

todo.md:77:src/index.ts:406:      // todo: args could be constant

todo.md:79:src/index.ts:418:        // todo: full on SAT solver, let's go crazy and prove some shit

todo.md:81:src/index.ts:444:      // todo: reverse this for the crazy UPPER nerds

todo.md:83:src/parser.ts:143:      // todo: pretty broken, there are like 100

todo.md:85:src/parser.ts:152:// todo: supports partitioning

todo.md:87:src/parser.ts:191:// todo: zero unnecessary allocations!

todo.md:89:src/parser.ts:197:// todo: zero unnecessary allocations!

todo.md:91:src/parser.ts:220:  // todo: capture trivia

todo.md:93:src/parser.ts:238:    // todo: for easier debugging only capture the "NEXT" statement

todo.md:95:src/parser.ts:278:        // todo: wtf

todo.md:97:src/parser.ts:294:        // todo: common table expr stuff

todo.md:99:src/parser.ts:299:          // todo: percent?

todo.md:101:src/parser.ts:391:      // TODO: cursor stuff

todo.md:103:src/parser.ts:400:      // TODO: transaction stuff

todo.md:105:src/parser.ts:451:        // HACK, skipping the named parameters,

todo.md:107:src/parser.ts:463:    // todo: with recompile

todo.md:109:src/parser.ts:471:    // todo: this could capture leading and trailing trivia

todo.md:111:src/parser.ts:492:        // todo: other stuff that's legal inside acreate table

todo.md:113:src/parser.ts:516:          // todo: ensure that these aren't double specified

todo.md:115:src/parser.ts:531:              // todo: seed, increment stuff

todo.md:117:src/parser.ts:552:          // todo: not for replication

todo.md:119:src/parser.ts:584:      // todo: if it's an @local = expr that should get a different type as well.

todo.md:121:src/parser.ts:626:    // todo: lookup and canonicalize type?

todo.md:123:src/parser.ts:824:    // todo: exists? some / any here??

todo.md:125:src/parser.ts:1006:      // todo: assert kind

todo.md:127:src/parser.ts:1007:      // todo: attach these to the subsequent statement

todo.md:129:src/parser.ts:1049:        // todo: this should probably also end the identifier

todo.md:131:src/parser.ts:1053:        // todo: if there's a dot throw an error

todo.md:133:src/parser.ts:1063:    // todo: maybe also intern the identifier for easy lookup?

todo.md:135:src/parser.ts:1091:    // // todo: these behave strangely, but they look to me like unary

todo.md:137:src/parser.ts:1155:      // todo: this is really only legal in a few places...

todo.md:139:src/parser.ts:1398:          // todo: what's the rule here? variable or literals only?

