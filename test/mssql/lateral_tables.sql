select D1.dept_nbr, D1.dept_name, E.sal_avg, E.emp_cnt
 from Departments as D1,
     (select AVG(E.salary), COUNT(*)
        from Personnel as P
       where P.dept_nbr
        = (select D2.dept_nbr
               from Departments as D2
              where D2.dept_nbr = P.workdept)
    ) as E (sal_avg, emp_cnt);
