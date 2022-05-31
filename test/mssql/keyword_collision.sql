select 
left(x, 1) as l,
right(x, 1) as r,
isnull(x, 'null') is_null,
coalesce(x, y, z) as c
from src