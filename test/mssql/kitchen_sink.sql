declare @foo int = -1000;
set @foo *= -1;
set nocount on

insert into [SomeTable] (foo, bar)
values ( @foo, case when @foo >= -1 then 1 else 0 end )

-- update ex
-- set ex.foo /= 10 --divequals
-- from [SomeTable] as ex
-- where ex.bar <= @foo and ex.foo is null
