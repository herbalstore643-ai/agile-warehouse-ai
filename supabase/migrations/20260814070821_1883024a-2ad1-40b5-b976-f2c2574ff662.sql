-- Document numbering
CREATE TABLE IF NOT EXISTS public.doc_counters (
  prefix text NOT NULL,
  year int NOT NULL,
  seq int NOT NULL DEFAULT 0,
  PRIMARY KEY (prefix, year)
);
GRANT SELECT ON public.doc_counters TO authenticated;
GRANT ALL ON public.doc_counters TO service_role;
ALTER TABLE public.doc_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "counters readable" ON public.doc_counters FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.next_doc_no(_prefix text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE y int := EXTRACT(YEAR FROM now())::int; n int;
BEGIN
  INSERT INTO public.doc_counters(prefix, year, seq) VALUES (_prefix, y, 1)
  ON CONFLICT (prefix, year) DO UPDATE SET seq = public.doc_counters.seq + 1
  RETURNING seq INTO n;
  RETURN _prefix || '-' || y || '-' || lpad(n::text, 4, '0');
END; $$;

CREATE OR REPLACE FUNCTION public.log_audit(_action text, _entity text, _entity_id uuid, _warehouse_id uuid, _reason text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.audit_logs(user_id, action, entity, entity_id, warehouse_id, reason)
  VALUES (auth.uid(), _action, _entity, _entity_id, _warehouse_id, _reason);
$$;

CREATE OR REPLACE FUNCTION public.notify_admins(_title text, _body text, _link text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.notifications(user_id, title, body, link)
  SELECT ur.user_id, _title, _body, _link FROM public.user_roles ur
  WHERE ur.role IN ('super_admin','warehouse_manager','main_warehouse');
$$;

CREATE OR REPLACE FUNCTION public.current_balance(_product uuid, _warehouse uuid)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT qty FROM public.stock_balances WHERE product_id=_product AND warehouse_id=_warehouse), 0);
$$;

-- Approve purchase receipt
CREATE OR REPLACE FUNCTION public.approve_receipt(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.purchase_receipts; it record; total numeric := 0;
BEGIN
  SELECT * INTO r FROM public.purchase_receipts WHERE id = _id FOR UPDATE;
  IF r IS NULL THEN RAISE EXCEPTION 'Receipt not found'; END IF;
  IF r.status = 'approved' THEN RAISE EXCEPTION 'Already approved'; END IF;
  IF NOT (public.is_admin(auth.uid()) OR public.can_access_warehouse(auth.uid(), r.warehouse_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR it IN SELECT * FROM public.purchase_receipt_items WHERE receipt_id = _id LOOP
    INSERT INTO public.stock_movements(product_id, warehouse_id, type, qty, unit_price, reference_type, reference_id, created_by)
    VALUES (it.product_id, r.warehouse_id, 'receipt', it.qty, it.unit_price, 'purchase_receipt', r.id, auth.uid());
    total := total + it.qty * it.unit_price;
  END LOOP;

  UPDATE public.purchase_receipts
     SET status='approved', approved_by=auth.uid(), approved_at=now(), total_amount=total
   WHERE id=_id;

  PERFORM public.log_audit('approve_receipt','purchase_receipt',_id,r.warehouse_id,NULL);
END; $$;

-- Approve issue voucher
CREATE OR REPLACE FUNCTION public.approve_issue(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.issue_vouchers; it record; bal numeric;
BEGIN
  SELECT * INTO v FROM public.issue_vouchers WHERE id = _id FOR UPDATE;
  IF v IS NULL THEN RAISE EXCEPTION 'Voucher not found'; END IF;
  IF v.status = 'approved' THEN RAISE EXCEPTION 'Already approved'; END IF;
  IF NOT (public.is_admin(auth.uid()) OR public.can_access_warehouse(auth.uid(), v.warehouse_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR it IN SELECT * FROM public.issue_voucher_items WHERE voucher_id = _id LOOP
    bal := public.current_balance(it.product_id, v.warehouse_id);
    IF bal < it.qty THEN RAISE EXCEPTION 'Insufficient stock for product %', it.product_id; END IF;
    INSERT INTO public.stock_movements(product_id, warehouse_id, type, qty, reference_type, reference_id, reason, created_by)
    VALUES (it.product_id, v.warehouse_id, 'issue', -it.qty, 'issue_voucher', v.id, v.reason, auth.uid());
  END LOOP;

  UPDATE public.issue_vouchers SET status='approved', approved_by=auth.uid(), approved_at=now() WHERE id=_id;
  PERFORM public.log_audit('approve_issue','issue_voucher',_id,v.warehouse_id,v.reason);
END; $$;

-- Transfer: approve
CREATE OR REPLACE FUNCTION public.approve_transfer(_id uuid, _notes text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tr public.transfer_requests;
BEGIN
  SELECT * INTO tr FROM public.transfer_requests WHERE id=_id FOR UPDATE;
  IF tr IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF tr.status <> 'pending' THEN RAISE EXCEPTION 'Transfer is not pending'; END IF;
  IF NOT (public.is_admin(auth.uid()) OR public.can_access_warehouse(auth.uid(), tr.from_warehouse_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.transfer_requests
     SET status='preparing', approved_by=auth.uid(), approval_notes=_notes WHERE id=_id;
  UPDATE public.transfer_items SET sent_qty = requested_qty WHERE transfer_id=_id AND sent_qty = 0;
  INSERT INTO public.notifications(user_id, title, body, link)
  SELECT uw.user_id, 'تم اعتماد طلب التحويل', tr.doc_no, '/transfers'
    FROM public.user_warehouses uw WHERE uw.warehouse_id = tr.to_warehouse_id;
  PERFORM public.log_audit('approve_transfer','transfer_request',_id,tr.from_warehouse_id,_notes);
END; $$;

-- Transfer: reject
CREATE OR REPLACE FUNCTION public.reject_transfer(_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tr public.transfer_requests;
BEGIN
  SELECT * INTO tr FROM public.transfer_requests WHERE id=_id FOR UPDATE;
  IF tr IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF tr.status IN ('received','completed','rejected') THEN RAISE EXCEPTION 'Cannot reject at this stage'; END IF;
  IF NOT (public.is_admin(auth.uid()) OR public.can_access_warehouse(auth.uid(), tr.from_warehouse_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  UPDATE public.transfer_requests SET status='rejected', rejection_reason=_reason, approved_by=auth.uid() WHERE id=_id;
  INSERT INTO public.notifications(user_id, title, body, link)
  SELECT uw.user_id, 'تم رفض طلب التحويل', COALESCE(_reason, tr.doc_no), '/transfers'
    FROM public.user_warehouses uw WHERE uw.warehouse_id = tr.to_warehouse_id;
  PERFORM public.log_audit('reject_transfer','transfer_request',_id,tr.from_warehouse_id,_reason);
END; $$;

-- Transfer: ship (posts transfer_out)
CREATE OR REPLACE FUNCTION public.ship_transfer(_id uuid, _driver text, _sender text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tr public.transfer_requests; it record; bal numeric;
BEGIN
  SELECT * INTO tr FROM public.transfer_requests WHERE id=_id FOR UPDATE;
  IF tr IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF tr.status <> 'preparing' THEN RAISE EXCEPTION 'Transfer must be approved first'; END IF;
  IF NOT (public.is_admin(auth.uid()) OR public.can_access_warehouse(auth.uid(), tr.from_warehouse_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR it IN SELECT * FROM public.transfer_items WHERE transfer_id=_id LOOP
    IF it.sent_qty > 0 THEN
      bal := public.current_balance(it.product_id, tr.from_warehouse_id);
      IF bal < it.sent_qty THEN RAISE EXCEPTION 'Insufficient stock for product %', it.product_id; END IF;
      INSERT INTO public.stock_movements(product_id, warehouse_id, type, qty, reference_type, reference_id, counterparty_warehouse_id, created_by)
      VALUES (it.product_id, tr.from_warehouse_id, 'transfer_out', -it.sent_qty, 'transfer_request', tr.id, tr.to_warehouse_id, auth.uid());
    END IF;
  END LOOP;

  UPDATE public.transfer_requests
     SET status='shipped', shipped_at=now(), driver_name=_driver, sender_name=_sender WHERE id=_id;
  INSERT INTO public.notifications(user_id, title, body, link)
  SELECT uw.user_id, 'شحنة في الطريق', tr.doc_no, '/transfers'
    FROM public.user_warehouses uw WHERE uw.warehouse_id = tr.to_warehouse_id;
  PERFORM public.log_audit('ship_transfer','transfer_request',_id,tr.from_warehouse_id,NULL);
END; $$;

-- Transfer: receive (posts transfer_in with received_qty)
CREATE OR REPLACE FUNCTION public.receive_transfer(_id uuid, _receiver text, _review text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tr public.transfer_requests; it record;
BEGIN
  SELECT * INTO tr FROM public.transfer_requests WHERE id=_id FOR UPDATE;
  IF tr IS NULL THEN RAISE EXCEPTION 'Transfer not found'; END IF;
  IF tr.status <> 'shipped' THEN RAISE EXCEPTION 'Transfer is not shipped'; END IF;
  IF NOT (public.is_admin(auth.uid()) OR public.can_access_warehouse(auth.uid(), tr.to_warehouse_id)) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  FOR it IN SELECT * FROM public.transfer_items WHERE transfer_id=_id LOOP
    IF it.received_qty > 0 THEN
      INSERT INTO public.stock_movements(product_id, warehouse_id, type, qty, reference_type, reference_id, counterparty_warehouse_id, created_by)
      VALUES (it.product_id, tr.to_warehouse_id, 'transfer_in', it.received_qty, 'transfer_request', tr.id, tr.from_warehouse_id, auth.uid());
    END IF;
    IF it.sent_qty > it.received_qty THEN
      INSERT INTO public.stock_movements(product_id, warehouse_id, type, qty, reference_type, reference_id, reason, created_by)
      VALUES (it.product_id, tr.from_warehouse_id, 'transfer_in', it.sent_qty - it.received_qty, 'transfer_request', tr.id, 'فرق استلام مرتجع للمصدر', auth.uid());
    END IF;
  END LOOP;

  UPDATE public.transfer_requests
     SET status='completed', received_at=now(), receiver_name=_receiver, branch_review=_review WHERE id=_id;
  PERFORM public.notify_admins('تم استلام التحويل', tr.doc_no, '/transfers');
  PERFORM public.log_audit('receive_transfer','transfer_request',_id,tr.to_warehouse_id,_review);
END; $$;

-- Inventory count: approve (adjustments)
CREATE OR REPLACE FUNCTION public.approve_count(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c public.inventory_counts; it record; diff numeric;
BEGIN
  SELECT * INTO c FROM public.inventory_counts WHERE id=_id FOR UPDATE;
  IF c IS NULL THEN RAISE EXCEPTION 'Count not found'; END IF;
  IF c.status = 'approved' THEN RAISE EXCEPTION 'Already approved'; END IF;
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'Not authorized'; END IF;

  FOR it IN SELECT * FROM public.inventory_count_items WHERE count_id=_id AND actual_qty IS NOT NULL LOOP
    diff := it.actual_qty - public.current_balance(it.product_id, c.warehouse_id);
    IF diff <> 0 THEN
      INSERT INTO public.stock_movements(product_id, warehouse_id, type, qty, reference_type, reference_id, reason, created_by)
      VALUES (it.product_id, c.warehouse_id, 'adjustment', diff, 'inventory_count', c.id, 'تسوية جرد', auth.uid());
    END IF;
  END LOOP;

  UPDATE public.inventory_counts
     SET status='approved', approved_by=auth.uid(), approved_at=now(), completed_at=COALESCE(completed_at, now())
   WHERE id=_id;
  PERFORM public.log_audit('approve_count','inventory_count',_id,c.warehouse_id,NULL);
END; $$;