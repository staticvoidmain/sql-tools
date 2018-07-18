/*
  some big block comment explaining what
  the point of this whole thing is
*/
create procedure dbo.do_stuff (
  @asdf int = 1,
  @foo varchar(256)
) as
begin
  if @asdf <> 2
    select case day(getdate())
      when 1 then 'one'
      when 2 then 'two'
      else 'ERROR'
    end as result
  else
    select 2 as result
end
