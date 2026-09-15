insert into public.locations (name, code) values
  ('HQ','HQ'), ('Gorom','GRM'), ('Jebel Iraq','JBI'), ('Sub-Office','SUB')
on conflict (name) do nothing;

insert into public.counters (key, prefix, padding) values
  ('customer','HZX-C-',5), ('deal','HZX-D-',5), ('ticket','HZX-T-',5),
  ('invoice','HZX-INV-',5), ('payment','HZX-PAY-',5), ('voucher_batch','HZX-VB-',4),
  ('subscription','HZX-SUB-',5), ('installation','HZX-JOB-',5),
  ('project','HZX-PRJ-',4), ('contract','HZX-CON-',4),
  ('booking','HZX-BK-',5), ('supplier_order','HZX-SO-',5)
on conflict (key) do nothing;

insert into public.settings (key, value) values
  ('company', '{"name":"Hotzonex","city":"Juba","country":"South Sudan","phone":"+211 900 000 000","email":"info@hotzonex.com"}'::jsonb),
  ('sla', '{"low":{"response_h":24,"resolve_h":120},"normal":{"response_h":8,"resolve_h":48},"high":{"response_h":2,"resolve_h":24},"urgent":{"response_h":1,"resolve_h":8}}'::jsonb),
  ('deal_rot_days', '14'::jsonb),
  ('tax_rate', '0'::jsonb),
  ('venue_capacity', '120'::jsonb),
  ('default_currency', '"SSP"'::jsonb)
on conflict (key) do nothing;

insert into public.fx_rates (effective_date, ssp_per_usd) values
  (current_date, 4500.0000)
on conflict (effective_date) do nothing;
