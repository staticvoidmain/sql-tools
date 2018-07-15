select
expr = abs(-1) + ~(2 * 3) / [some].col - 5,
1 + 1 as two
from something.whatever as [some]
where [some].col - 5 != 0
