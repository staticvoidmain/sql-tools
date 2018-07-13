declare @foo int = -1000;
set @foo += 1;
set nocount on
/*
  @author: jim bob
  @description: does some stuff
  with foo and bar
*/
update ex
set ex.foo /= 10 --divequals
from [SomeTable] as ex
where ex.bar <= @foo and ex.foo is null
