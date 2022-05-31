create procedure load_stuff
as

create table dbo.stuff
with (some garbage here) --todo: I forgot what this is supposed to do
as
(
   select * from dbo.Foo
   union all
   select * from dbo.Bar
)
