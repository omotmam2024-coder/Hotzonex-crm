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

insert into public.ticket_categories (name, business_unit, default_priority) values
  ('No Internet','wifi','urgent'), ('Slow Speed','wifi','high'),
  ('Billing Query','wifi','normal'), ('Voucher Issue','wifi','high'),
  ('Equipment Fault','wifi','high'), ('Relocation','wifi','normal'),
  ('New Request','wifi','normal'), ('Website Support','services','normal'),
  ('Other','wifi','low')
on conflict (name) do nothing;

insert into public.message_templates (name, channel, body) values
  ('Expiry 3 Days','whatsapp','Hello {{customer_name}}, your Hotzonex {{plan}} expires on {{expiry_date}}. Reply here to renew and stay connected. — Hotzonex, Juba'),
  ('Expired Today','whatsapp','Hello {{customer_name}}, your Hotzonex {{plan}} has expired today. Renew now to restore your connection.'),
  ('Payment Receipt','whatsapp','Thank you {{customer_name}}. We have received {{amount_paid}}. Receipt {{payment_number}}. — Hotzonex'),
  ('Invoice Due','whatsapp','Hello {{customer_name}}, invoice {{invoice_number}} of {{amount_due}} is due on {{due_date}}.'),
  ('Ticket Resolved','whatsapp','Hello {{customer_name}}, ticket {{ticket_number}} has been resolved. Please tell us if the problem returns.')
on conflict (name) do nothing;
