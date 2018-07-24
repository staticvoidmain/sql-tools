
-- a little parser torture test
declare @foo int = -1000;
set @foo *= -1;
set nocount on

insert into [SomeTable] (foo, bar)
values ( @foo, case when @foo >= -1 then 1 else 0 end )

drop procedure asdf.foo

create table something.whatever (
  [id] int identity(1, 1),
  [name] varchar(256),
  [date] datetime
);

-- select *
-- from something s
-- left outer join dbo.table_valued_func(@foo) as e
--   on s.asdf = zzz.the_func(e)

-- update ex
-- set ex.foo /= 10 --divequals
-- from [SomeTable] as ex
-- where ex.bar <= @foo and ex.foo is null
