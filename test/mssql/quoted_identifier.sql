use FizBuz
go

select [foo],
       [bar],
       [bazz]
from [Fizz].Buzz
where Buzz."bar" is not null and foo >= 1 or 1 = 1
