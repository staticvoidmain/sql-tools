# TO-DOs

## index.ts
- file globbing
- improved command line arg parsing

## parser.ts
- parse statement blocks
- parse Create/Alter procedure
- parse create/alter view
- parse nested `select` paren exprs with aliases
- parse any / all / exists / some operators

## visitor.ts
- nested indent levels in printNode
- rename 'expr' to 'node' in all case blocks
- printer for (is-null expr) (is-not-null expr)
- printer for (and expr) (or expr) (not expr)
- assignment operators in 'set' statements
  - (plus-equals @x expr)
  - (minus-equals etc...
- ... other syntax node kinds
- convert to class, implement print in terms of visit<T>

## scanner.ts
- (minor) fix quoted identifier issues

## scanner.spec.ts
- test for quoted identifiers terminating after unescaped ] or "
