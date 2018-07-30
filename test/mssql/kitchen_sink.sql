
-- a little parser torture test
-- set nocount on

-- declare @foo int = -1000;
-- set @foo *= -1;

-- insert into [SomeTable] (foo, bar)
-- values ( @foo, case when @foo >= -1 then 1 else 0 end )

-- sp_helptext dbo.object_name_here
-- exec asdf.do_foo 'bar', 1, @b;

-- execute ('select * from foo where x = ?', @foo);

-- drop procedure asdf.foo

create table dbo.whatever (
  [id] int identity(1, 1) not null,
  [name] varchar(256) null,
  [date] datetime null
);

select *
from something s
left outer join dbo.table_valued_func(@foo) as e
  on s.asdf = zzz.the_func(e)
inner join dbo.other
  on dbo.other.foo = @foo

go
-- update ex
-- set ex.foo /= 10 --divequals
-- from [SomeTable] as ex
-- where ex.bar <= @foo and ex.foo is null
