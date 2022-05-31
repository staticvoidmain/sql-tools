with cte as (
  select 1 from abc.SRC_TABLE
)
select sum(s.num) as [sum]
from something s
left join dbo.other
  on left(dbo.other.foo, 1) = right(@foo, 1)

left join dbo.table_valued_func(@foo) as e
  on s.asdf = zzz.the_func(e)

where s.number in (1, 2, 3)
and s.foo not like '%asdf%'
group by s.foo
having count(*) = 1
order by s.foo desc, s.bar asc