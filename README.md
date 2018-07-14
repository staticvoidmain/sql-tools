# About

It's a t-sql parser, mostly mssql flavored, but the scanner is fairly agnostic
and I plan to extend it later for other vendors.

I should *admittedly* be using edgejs and the sqldom assembly from microsoft,
but somehow writing my own lexer and parser seemed like more fun.

# Contributing

Pull requests and issues welcome!

I'll be implementing bits of the sql grammar that give the best coverage
for the kinds of scripts I work with on a regular basis. If this library
doesn't cover your code, open an issue or shoot me a pull request.
