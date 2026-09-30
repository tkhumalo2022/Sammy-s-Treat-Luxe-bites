-- Security hardening: make public Luxe Bites order submissions server-authoritative.
-- The public RPC remains callable with the publishable key, but it no longer trusts
-- browser-supplied prices/totals and applies durable database-side burst protection.

create table if not exists luxe_bites.order_submission_limits (
  bucket_key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bucket_key, window_start),
  constraint order_submission_limits_count_check check (count >= 0)
);

alter table luxe_bites.order_submission_limits enable row level security;
revoke all on table luxe_bites.order_submission_limits from public, anon, authenticated;

create or replace function luxe_bites.consume_order_submission_limit(
  p_key text,
  p_window_seconds integer,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path to 'pg_catalog', 'luxe_bites'
as $function$
declare
  v_now timestamptz := clock_timestamp();
  v_window_start timestamptz;
  v_count integer;
begin
  if p_key is null or length(p_key) = 0 or length(p_key) > 160 then
    raise exception using errcode = '22023', message = 'Invalid rate limit key.';
  end if;
  if p_window_seconds < 1 or p_window_seconds > 86400 or p_limit < 1 or p_limit > 10000 then
    raise exception using errcode = '22023', message = 'Invalid rate limit configuration.';
  end if;

  v_window_start := to_timestamp(
    floor(extract(epoch from v_now) / p_window_seconds) * p_window_seconds
  );

  insert into luxe_bites.order_submission_limits(bucket_key, window_start, count, updated_at)
  values (p_key, v_window_start, 1, v_now)
  on conflict (bucket_key, window_start)
  do update set
    count = luxe_bites.order_submission_limits.count + 1,
    updated_at = excluded.updated_at
  returning count into v_count;

  delete from luxe_bites.order_submission_limits
  where window_start < v_now - interval '2 days';

  return v_count <= p_limit;
end;
$function$;

revoke all on function luxe_bites.consume_order_submission_limit(text, integer, integer)
  from public, anon, authenticated;

create or replace function public.submit_luxe_bites_order(
  p_reference text,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_order_details text,
  p_fulfilment text,
  p_address text,
  p_event_date date,
  p_notes text,
  p_source text,
  p_line_items jsonb,
  p_item_count integer,
  p_subtotal numeric,
  p_delivery_fee numeric,
  p_estimated_total numeric
)
returns jsonb
language plpgsql
security definer
set search_path to 'pg_catalog', 'extensions', 'luxe_bites'
as $function$
declare
  v_id uuid;
  v_reference text := upper(trim(p_reference));
  v_name text := trim(p_customer_name);
  v_phone text := trim(p_phone);
  v_email text := nullif(trim(coalesce(p_email, '')), '');
  v_fulfilment text := lower(trim(p_fulfilment));
  v_address text := nullif(trim(coalesce(p_address, '')), '');
  v_notes text := nullif(trim(coalesce(p_notes, '')), '');
  v_source text := lower(trim(coalesce(p_source, 'website')));
  v_minimum_order integer;
  v_deposit_percentage integer;
  v_catalog_delivery_fee numeric;
  v_item jsonb;
  v_item_name text;
  v_quantity_text text;
  v_quantity integer;
  v_unit_price numeric;
  v_line_total numeric;
  v_item_count integer := 0;
  v_subtotal numeric := 0;
  v_delivery_fee numeric := 0;
  v_estimated_total numeric := 0;
  v_server_line_items jsonb := '[]'::jsonb;
  v_order_details text := '';
  v_phone_key text;
begin
  if v_reference !~ '^LB-[A-F0-9]{10}$' then
    raise exception using errcode = '22023', message = 'Invalid order reference.';
  end if;
  if char_length(v_name) < 2 or char_length(v_name) > 80 then
    raise exception using errcode = '22023', message = 'Invalid customer name.';
  end if;
  if char_length(v_phone) < 7 or char_length(v_phone) > 30 then
    raise exception using errcode = '22023', message = 'Invalid phone number.';
  end if;
  if v_email is not null and char_length(v_email) > 160 then
    raise exception using errcode = '22023', message = 'Invalid email address.';
  end if;
  if v_fulfilment not in ('delivery', 'collection') then
    raise exception using errcode = '22023', message = 'Invalid fulfilment option.';
  end if;
  if v_fulfilment = 'delivery' and (v_address is null or char_length(v_address) < 5) then
    raise exception using errcode = '22023', message = 'Delivery address is required.';
  end if;
  if v_address is not null and char_length(v_address) > 300 then
    raise exception using errcode = '22023', message = 'Invalid address.';
  end if;
  if v_notes is not null and char_length(v_notes) > 600 then
    raise exception using errcode = '22023', message = 'Invalid notes.';
  end if;
  if v_source not in ('website', 'chat', 'whatsapp', 'manual') then
    v_source := 'website';
  end if;
  if jsonb_typeof(p_line_items) <> 'array'
     or jsonb_array_length(p_line_items) < 1
     or jsonb_array_length(p_line_items) > 50 then
    raise exception using errcode = '22023', message = 'Invalid line items.';
  end if;

  select minimum_order, deposit_percentage, delivery_fee
    into v_minimum_order, v_deposit_percentage, v_catalog_delivery_fee
  from luxe_bites.site_settings
  where id = true;

  if v_minimum_order is null then
    raise exception using errcode = 'P0001', message = 'Ordering is temporarily unavailable.';
  end if;

  -- Durable protection also applies to callers that bypass the Next.js route and
  -- invoke the public Supabase RPC directly.
  if not luxe_bites.consume_order_submission_limit('global', 900, 200) then
    raise exception using errcode = 'P0001', message = 'Too many order requests. Try again later.';
  end if;

  v_phone_key := 'phone:' || encode(
    extensions.digest(regexp_replace(v_phone, '[^0-9]', '', 'g'), 'sha256'),
    'hex'
  );
  if not luxe_bites.consume_order_submission_limit(v_phone_key, 900, 5) then
    raise exception using errcode = 'P0001', message = 'Too many order requests. Try again later.';
  end if;

  for v_item in
    select value from jsonb_array_elements(p_line_items)
  loop
    v_item_name := trim(coalesce(v_item->>'name', ''));
    v_quantity_text := trim(coalesce(v_item->>'quantity', ''));

    if char_length(v_item_name) < 1 or char_length(v_item_name) > 120
       or v_quantity_text !~ '^[1-9][0-9]{0,2}$' then
      raise exception using errcode = '22023', message = 'Invalid line item.';
    end if;

    v_quantity := v_quantity_text::integer;

    select price
      into v_unit_price
    from luxe_bites.products
    where name = v_item_name
      and available = true;

    if not found then
      raise exception using errcode = '22023', message = 'An item is no longer available.';
    end if;

    v_line_total := round(v_unit_price * v_quantity, 2);
    v_item_count := v_item_count + v_quantity;
    v_subtotal := v_subtotal + v_line_total;
    v_server_line_items := v_server_line_items || jsonb_build_array(
      jsonb_build_object(
        'name', v_item_name,
        'quantity', v_quantity,
        'unitPrice', v_unit_price,
        'lineTotal', v_line_total
      )
    );

    v_order_details := v_order_details
      || format('%s × %s @ R%s = R%s', v_quantity, v_item_name, v_unit_price, v_line_total)
      || E'\n';
  end loop;

  if v_item_count < v_minimum_order or v_item_count > 9999 then
    raise exception using errcode = '22023', message = 'Invalid item count.';
  end if;

  v_delivery_fee := case
    when v_fulfilment = 'delivery' then greatest(coalesce(v_catalog_delivery_fee, 0), 0)
    else 0
  end;
  v_estimated_total := round(v_subtotal + v_delivery_fee, 2);
  v_order_details := v_order_details
    || format('Dessert subtotal: R%s', v_subtotal) || E'\n'
    || format('Delivery: R%s', v_delivery_fee) || E'\n'
    || format('Estimated total: R%s', v_estimated_total);

  insert into luxe_bites.orders (
    reference, customer_name, phone, email, order_details,
    fulfilment, address, event_date, notes, source,
    line_items, item_count, subtotal, delivery_fee, estimated_total, deposit_due
  ) values (
    v_reference, v_name, v_phone, v_email, v_order_details,
    v_fulfilment, v_address, p_event_date, v_notes, v_source,
    v_server_line_items, v_item_count, v_subtotal, v_delivery_fee, v_estimated_total,
    round(v_estimated_total * coalesce(v_deposit_percentage, 0) / 100.0, 2)
  )
  on conflict (reference) do update
  set updated_at = now()
  returning id into v_id;

  return jsonb_build_object(
    'stored', true,
    'id', v_id,
    'reference', v_reference,
    'itemCount', v_item_count,
    'subtotal', v_subtotal,
    'deliveryFee', v_delivery_fee,
    'estimatedTotal', v_estimated_total
  );
end;
$function$;

revoke all on function public.submit_luxe_bites_order(
  text, text, text, text, text, text, text, date, text, text,
  jsonb, integer, numeric, numeric, numeric
) from public;
grant execute on function public.submit_luxe_bites_order(
  text, text, text, text, text, text, text, date, text, text,
  jsonb, integer, numeric, numeric, numeric
) to anon, authenticated;
