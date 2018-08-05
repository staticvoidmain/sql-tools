
-- a little parser torture test
set nocount on

declare @foo int, @bar datetime
set @foo *= -1

-- insert into [SomeTable] (foo, bar)
-- values ( @foo, case when @foo >= -1 then 1 else 0 end )

-- sp_helptext dbo.object_name_here
print 'cast expressions'
select isnull(cast([foo]as varchar(10)), ' ') as bar
from something

print 'funky case/cast stuff'

select
  cast(case when someFlag = 1 then 1
            when someFlag = 0 then 0
            else null
          end as smallint) as flag

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


with cte as (select 1)
select *
from something s
left join dbo.table_valued_func(@foo) as e
  on s.asdf = zzz.the_func(e)
left join dbo.other
  on dbo.other.foo = @foo
where s.number in (1, 2, 3)
and s.foo not like 'asdf%'
order by s.foo desc, s.bar asc

go

update ex
set ex.foo /= 10,
    ex.bar = ex.bar - 1
from [SomeTable] as ex
where ex.bar <= @foo and ex.foo is null
