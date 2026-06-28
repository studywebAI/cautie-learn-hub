-- Remove weekend support from personal tasks
-- Move any existing Saturday/Sunday tasks to the following Monday

-- Create a function to get next Monday for a given date
create or replace function get_next_weekday(input_date date, target_day integer)
returns date as $$
declare
  current_day integer;
  days_to_add integer;
begin
  current_day := extract(dow from input_date)::integer;
  -- Convert PostgreSQL dow (0=Sunday, 1=Monday, ..., 6=Saturday) to ISO (1=Monday, ..., 7=Sunday)
  -- For Saturday (6), add 2 days to get to Monday
  -- For Sunday (0), add 1 day to get to Monday
  if current_day = 6 then
    days_to_add := 2;
  elsif current_day = 0 then
    days_to_add := 1;
  else
    days_to_add := 0;
  end if;

  return input_date + make_interval(days => days_to_add);
end;
$$ language plpgsql;

-- Update any personal_tasks on weekends to Monday
update public.personal_tasks
set
  "date" = get_next_weekday("date"::date, 1)::text,
  due_date = get_next_weekday(due_date::date, 1)::text
where
  (
    extract(dow from "date"::date)::integer in (0, 6)  -- Saturday or Sunday
    or extract(dow from due_date::date)::integer in (0, 6)
  );

-- Add a constraint to prevent weekend dates in future inserts/updates
-- (This is enforced at the application level, not in the database)

-- Drop the helper function as it's no longer needed
drop function if exists get_next_weekday(date, integer);
