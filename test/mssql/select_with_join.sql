use [Database]
go
-- this is just riddled with style violations
-- for testing purposes
SELECT
  foo = a.b,
  bar = b.c
from SomeTable AS a
join OtherTable b
  on a.id !> a.id
left join Another as blah
  on blah.foo = a.bar
where a.sumething_iz_wong != null
  and left(a.name, 1) = 'a'
  and b.name like '_ob'
