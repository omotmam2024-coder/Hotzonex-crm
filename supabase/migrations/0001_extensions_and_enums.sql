create extension if not exists pgcrypto;

-- pg_trgm lives in its own schema, not public, per Supabase's database linter.
create schema if not exists extensions;
create extension if not exists pg_trgm schema extensions;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'business_unit') then
    create type business_unit as enum ('wifi','services','refreshment');
  end if;
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type user_role as enum ('owner','admin','manager','agent','technician','viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'customer_type') then
    create type customer_type as enum ('individual','business','ngo','government','reseller');
  end if;
  if not exists (select 1 from pg_type where typname = 'customer_status') then
    create type customer_status as enum ('lead','prospect','active','dormant','churned','blacklisted');
  end if;
  if not exists (select 1 from pg_type where typname = 'currency_code') then
    create type currency_code as enum ('SSP','USD');
  end if;
  if not exists (select 1 from pg_type where typname = 'activity_type') then
    create type activity_type as enum ('call','whatsapp','sms','email','visit','meeting','note','system');
  end if;
  if not exists (select 1 from pg_type where typname = 'activity_direction') then
    create type activity_direction as enum ('inbound','outbound','internal');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('open','in_progress','done','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'priority_level') then
    create type priority_level as enum ('low','normal','high','urgent');
  end if;
  if not exists (select 1 from pg_type where typname = 'deal_status') then
    create type deal_status as enum ('open','won','lost');
  end if;
  if not exists (select 1 from pg_type where typname = 'voucher_status') then
    create type voucher_status as enum ('available','allocated','sold','used','expired','void');
  end if;
  if not exists (select 1 from pg_type where typname = 'subscription_status') then
    create type subscription_status as enum ('pending','active','expiring_soon','expired','suspended','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'installation_status') then
    create type installation_status as enum ('scheduled','en_route','in_progress','completed','failed','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type ticket_status as enum ('new','open','pending_customer','escalated','resolved','closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'ticket_channel') then
    create type ticket_channel as enum ('walk_in','call','whatsapp','sms','field','email');
  end if;
  if not exists (select 1 from pg_type where typname = 'invoice_status') then
    create type invoice_status as enum ('draft','sent','partial','paid','overdue','void');
  end if;
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type payment_method as enum ('cash','mobile_money','bank_transfer','agent_code','credit','other');
  end if;
  if not exists (select 1 from pg_type where typname = 'project_status') then
    create type project_status as enum ('discovery','in_progress','review','delivered','closed','on_hold');
  end if;
  if not exists (select 1 from pg_type where typname = 'milestone_status') then
    create type milestone_status as enum ('pending','in_progress','completed','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum ('enquiry','tentative','confirmed','completed','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'supplier_order_status') then
    create type supplier_order_status as enum ('ordered','received','partial','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'campaign_status') then
    create type campaign_status as enum ('draft','scheduled','running','completed','cancelled');
  end if;
  if not exists (select 1 from pg_type where typname = 'message_channel') then
    create type message_channel as enum ('whatsapp','sms','email');
  end if;
  if not exists (select 1 from pg_type where typname = 'message_status') then
    create type message_status as enum ('queued','sent','failed','delivered','read');
  end if;
end $$;
