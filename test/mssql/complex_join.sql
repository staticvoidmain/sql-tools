
select sum(s.num) as [sum]
from dbo.something s
left join dbo.other o
  on left(o.foo, 1) = right(s.foo, 1)