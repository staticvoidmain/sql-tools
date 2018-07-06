declare @foo int = -1000;
set @foo += 1;
/*
  @author: jim bob
  @description: does some stuff
  with foo and bar
*/
update ex
set ex.foo = 10
from [SomeTable] as ex
where ex.bar < @foo
