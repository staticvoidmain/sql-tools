create procedure dbo.do_stuff (
  @asdf int = 1,
  @foo varchar(256)
) as
begin
  -- do stuff to the thing
  if @asdf <> 2
    select 1 + 1 as result
  else
    select 2 as result
end
