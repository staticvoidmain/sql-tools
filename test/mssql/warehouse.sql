create procedure load_stuff
as

create table dbo.stuff
with (some garbage here)
as
(
   select * from dbo.Foo
   union all
   select * from dbo.Bar
)
