use [Database]
go

select a.b, b.c
from SomeTable as a
join OtherTable b
on a.id !> a.id
where a.something != null
and left(a.name, 1) = 'a'
