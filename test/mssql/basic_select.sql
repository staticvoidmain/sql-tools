use SomeDb
go

-- let's be obnoxious with the whitespace.
select *    from  [SomeSchema.SomeTable] 
  where x =    0 and y = -1
go