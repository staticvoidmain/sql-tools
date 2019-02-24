create function fancy_func(x int, y int)
returns integer
immutable
as $func_body$

$func_body$ language 'plpgsql';
