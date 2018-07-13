// const enums compile away, whereas
// these standard enums allow for the name
// of the enum value to be accessed at runtime
export enum SyntaxKind {
  EOF,
  // tokens
  whitespace,
  newline,
  openParen,
  closeParen,
  openBracket,
  closeBracket,

  // operators
  equal,                // =
  ltGt,                 // <>
  notEqual,             // !=
  lessThan,             // <
  greaterThan,          // >
  notLessThan,          // !<
  notGreaterThan,       // !>
  lessThanEqual,        // <=
  greaterThanEqual,     // >=
  dot_token,             // .
  comma_token,           // ,
  semicolon_token,       // ;
  minus_token,           // -
  plus_token,            // +
  mod_token,             // %
  mul_token,             // *
  div_token,             // /
  bitwise_and_token,     // &
  bitwise_or_token,      // |
  bitwise_xor_token,     // ^
  bitwise_not_token,     // ~
  plusEqualsAssignment,  // +=
  minusEqualsAssignment, // -=
  divEqualsAssignment,   //  /=
  mulEqualsAssignment,   //  *=
  modEqualsAssignment,   // %=
  bitwiseAndAssignment,  // &=
  bitwiseOrAssignment,   // |=
  bitwiseXorAssignment,  // ^=

  // <keywords>
  add_keyword,
  all_keyword,
  alter_keyword,
  and_keyword,
  any_keyword,
  as_keyword,
  asc_keyword,
  authorization_keyword,
  backup_keyword,
  begin_keyword,
  between_keyword,
  break_keyword,
  browse_keyword,
  bulk_keyword,
  by_keyword,
  cascade_keyword,
  case_keyword,
  check_keyword,
  checkpoint_keyword,
  close_keyword,
  clustered_keyword,
  coalesce_keyword,
  collate_keyword,
  column_keyword,
  commit_keyword,
  compute_keyword,
  constraint_keyword,
  contains_keyword,
  containstable_keyword,
  continue_keyword,
  convert_keyword,
  create_keyword,
  cross_keyword,
  current_keyword,
  current_date_keyword,
  current_time_keyword,
  current_timestamp_keyword,
  current_user_keyword,
  cursor_keyword,
  database_keyword,
  dbcc_keyword,
  deallocate_keyword,
  declare_keyword,
  default_keyword,
  delete_keyword,
  deny_keyword,
  desc_keyword,
  disk_keyword,
  distinct_keyword,
  distributed_keyword,
  double_keyword,
  drop_keyword,
  dump_keyword,
  else_keyword,
  end_keyword,
  errlvl_keyword,
  escape_keyword,
  except_keyword,
  exec_keyword,
  execute_keyword,
  exists_keyword,
  exit_keyword,
  external_keyword,
  fetch_keyword,
  file_keyword,
  fillfactor_keyword,
  for_keyword,
  foreign_keyword,
  freetext_keyword,
  freetexttable_keyword,
  from_keyword,
  full_keyword,
  function_keyword,
  go_keyword,
  goto_keyword,
  grant_keyword,
  group_keyword,
  having_keyword,
  holdlock_keyword,
  identity_keyword,
  identity_insert_keyword,
  identitycol_keyword,
  if_keyword,
  in_keyword,
  index_keyword,
  inner_keyword,
  insert_keyword,
  intersect_keyword,
  into_keyword,
  is_keyword,
  join_keyword,
  key_keyword,
  kill_keyword,
  left_keyword,
  like_keyword,
  lineno_keyword,
  load_keyword,
  merge_keyword,
  national_keyword,
  nocheck_keyword,
  nonclustered_keyword,
  not_keyword,
  null_keyword,
  nullif_keyword,
  of_keyword,
  off_keyword,
  offsets_keyword,
  on_keyword,
  open_keyword,
  opendatasource_keyword,
  openquery_keyword,
  openrowset_keyword,
  openxml_keyword,
  option_keyword,
  or_keyword,
  order_keyword,
  outer_keyword,
  over_keyword,
  percent_keyword,
  pivot_keyword,
  plan_keyword,
  precision_keyword,
  primary_keyword,
  print_keyword,
  proc_keyword,
  procedure_keyword,
  public_keyword,
  raiserror_keyword,
  read_keyword,
  readtext_keyword,
  reconfigure_keyword,
  references_keyword,
  replication_keyword,
  restore_keyword,
  restrict_keyword,
  return_keyword,
  revert_keyword,
  revoke_keyword,
  right_keyword,
  rollback_keyword,
  rowcount_keyword,
  rowguidcol_keyword,
  rule_keyword,
  save_keyword,
  schema_keyword,
  securityaudit_keyword,
  select_keyword,
  semantickeyphrasetable_keyword,
  semanticsimilaritydetailstable_keyword,
  semanticsimilaritytable_keyword,
  session_user_keyword,
  set_keyword,
  setuser_keyword,
  shutdown_keyword,
  some_keyword,
  statistics_keyword,
  system_user_keyword,
  table_keyword,
  tablesample_keyword,
  textsize_keyword,
  then_keyword,
  to_keyword,
  top_keyword,
  tran_keyword,
  transaction_keyword,
  trigger_keyword,
  truncate_keyword,
  try_convert_keyword,
  tsequal_keyword,
  union_keyword,
  unique_keyword,
  unpivot_keyword,
  update_keyword,
  updatetext_keyword,
  use_keyword,
  user_keyword,
  values_keyword,
  varying_keyword,
  view_keyword,
  waitfor_keyword,
  when_keyword,
  where_keyword,
  while_keyword,
  with_keyword,
  within_keyword,
  writetext_keyword,
  // </end keywords>

  label,
  identifier,
  comment_block,
  comment_inline,
  data_type,
  // expressions
  literal_expr,
  binary_expr,
  and_expr,
  or_expr,
  paren_expr,
  case_expr,
  when_expr,
  then_expr,
  unary_minus_expr,
  unary_plus_expr,
  bitwise_not_expr,
  identifier_expr,
  function_call_expr,
  column_expr,
  statement_block,
  scalar_variable_decl,
  table_variable_decl,
  if_statement,
  while_statement,
  waitfor_statement,
  execute_statement,
  print_statement,
  throw_statement,
  use_database_statement,
  go_statement,
  goto_statement,
  declare_statement,
  set_statement,
  select_statement,
  into_clause,
  from_clause,
  where_clause,
  group_by_clause,
  order_by_clause,
  having_clause,
  begin_transaction_statement,
  commit_transaction_statement,
  rollback_transaction_statement,
  numeric_literal,
  string_literal,
  table_alias,
  column_alias,
  computed_column_definition,
  // todo: all kinds of kinds
}
