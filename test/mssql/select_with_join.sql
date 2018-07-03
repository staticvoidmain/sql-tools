use Database
go

select a.b, b.c
from SomeTable as a
join OtherTable b
on b.id = a.id