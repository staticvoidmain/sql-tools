
-- a little parser torture test
set nocount on

declare @foo int, @bar datetime
set @foo *= -1

-- insert into [SomeTable] (foo, bar)
-- values ( @foo, case when @foo >= -1 then 1 else 0 end )

-- sp_helptext dbo.object_name_here
print 'cast expressions'
select isnull(cast([foo]as int),-1) as bar
from something


print 'exec proc'
exec asdf.do_foo 'bar', 1, @b


-- todo
-- execute ('select * from foo where x = ?', @foo);

-- drop procedure asdf.foo
print 'create table'
create table dbo.whatever (
  [id] int identity(1, 1) not null,
  [name] varchar(256) null,
  [date] datetime null
);

select *
from something s
left join dbo.table_valued_func(@foo) as e
  on s.asdf = zzz.the_func(e)
left join dbo.other
  on dbo.other.foo = @foo
where s.number in (1, 2, 3)
and s.foo not like 'asdf%'


go
-- update ex
-- set ex.foo /= 10 --divequals
-- from [SomeTable] as ex
-- where ex.bar <= @foo and ex.foo is null
