
// aiming for just legal sql characters here...
export const enum Chars {
  null = 0,
  tab = 9,
  newline = 10,
  carriageReturn = 13,
  space = 32,
  bang = 33,
  doubleQuote = 34,
  hash = 35,
  dollar = 36,
  percent = 37,
  ampersand = 38,
  singleQuote = 39,
  openParen = 40,
  closeParen = 41,
  asterisk = 42,
  plus = 43,
  comma = 44,
  hyphen = 45,
  period = 46,
  forwardSlash = 47,
  num_0 = 48,
  num_1 = 49,
  num_2 = 50,
  num_3 = 51,
  num_4 = 52,
  num_5 = 53,
  num_6 = 54,
  num_7 = 55,
  num_8 = 56,
  num_9 = 57,
  colon = 58,
  semi = 59,
  lessThan = 60,
  equal = 61,
  greaterThan = 62,
  question = 63,
  at = 64,
  A = 65,
  B = 66,
  C = 67,
  D = 68,
  E = 69,
  F = 70,
  G = 71,
  H = 72,
  I = 73,
  J = 74,
  K = 75,
  L = 76,
  M = 77,
  N = 78,
  O = 79,
  P = 80,
  Q = 81,
  R = 82,
  S = 83,
  T = 84,
  U = 85,
  V = 86,
  W = 87,
  X = 88,
  Y = 89,
  Z = 90,
  openBrace = 91,   // [
  closeBrace = 93,
  caret = 94,
  underscore = 95,
  a = 97,
  b = 98,
  c = 99,
  d = 100,
  e = 101,
  f = 102,
  g = 103,
  h = 104,
  i = 105,
  j = 106,
  k = 107,
  l = 108,
  m = 109,
  n = 110,
  o = 111,
  p = 112,
  q = 113,
  r = 114,
  s = 115,
  t = 116,
  u = 117,
  v = 118,
  w = 119,
  x = 120,
  y = 121,
  z = 122,
  pipe = 124,
  tilde = 126,
  // not sure I care about this too much, but for completeness.
  bom = 0xFEFF // utf8-bom
}

export function isDigit(charCode: number): boolean {
  return Chars.num_0 <= charCode && charCode <= Chars.num_9
}

export function isLetter(ch: number): boolean {
  return (Chars.A <= ch && ch <= Chars.Z)
    || (Chars.a <= ch && ch <= Chars.z)
}

export function isUpper(n: number) {
  return Chars.A <= n && n <= Chars.Z
}

export function isLower(n: number) {
  return Chars.a <= n && n <= Chars.a
}

