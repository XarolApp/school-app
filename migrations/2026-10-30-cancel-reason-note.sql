-- Optional free-text "other" reason when a person cancels (max 300 characters).
-- Verify: select count(*) = 1 as ok from information_schema.columns
--   where table_name = 'purchases' and column_name = 'cancel_reason_note';
alter table public.purchases
  add column if not exists cancel_reason_note text check (cancel_reason_note is null or char_length(cancel_reason_note) <= 300);
