create view dbo.some_thing
as
select something,
other_thing as other
from dbo.somesource s
where s.id = s.id -- todo: error, comparison to self
