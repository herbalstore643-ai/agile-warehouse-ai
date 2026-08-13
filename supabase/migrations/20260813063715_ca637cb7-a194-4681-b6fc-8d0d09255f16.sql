
-- ============ ENUMS ============
CREATE TYPE public.app_role AS ENUM ('super_admin','warehouse_manager','main_warehouse','branch_warehouse','auditor','viewer');
CREATE TYPE public.warehouse_type AS ENUM ('main','branch');
CREATE TYPE public.movement_type AS ENUM ('opening','receipt','issue','transfer_out','transfer_in','adjustment');
CREATE TYPE public.doc_status AS ENUM ('draft','pending','approved','preparing','shipped','received','completed','rejected','cancelled');
CREATE TYPE public.count_status AS ENUM ('draft','in_progress','completed','approved');

-- ============ UTIL ============
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- ============ PROFILES / ROLES ============
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role IN ('super_admin','warehouse_manager'));
$$;

CREATE OR REPLACE FUNCTION public.can_write(_user_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND role IN ('super_admin','warehouse_manager','main_warehouse','branch_warehouse'));
$$;

-- ============ WAREHOUSES ============
CREATE TABLE public.warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  type public.warehouse_type NOT NULL DEFAULT 'branch',
  location TEXT,
  manager_name TEXT,
  manager_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouses TO authenticated;
GRANT ALL ON public.warehouses TO service_role;
ALTER TABLE public.warehouses ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, warehouse_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_warehouses TO authenticated;
GRANT ALL ON public.user_warehouses TO service_role;
ALTER TABLE public.user_warehouses ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_access_warehouse(_user_id UUID, _warehouse_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.is_admin(_user_id)
      OR public.has_role(_user_id,'auditor')
      OR EXISTS (SELECT 1 FROM public.user_warehouses uw WHERE uw.user_id = _user_id AND uw.warehouse_id = _warehouse_id);
$$;

CREATE TABLE public.warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  zone TEXT,
  aisle TEXT,
  rack TEXT,
  bin TEXT,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.warehouse_locations TO authenticated;
GRANT ALL ON public.warehouse_locations TO service_role;
ALTER TABLE public.warehouse_locations ENABLE ROW LEVEL SECURITY;

-- ============ CATALOG ============
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  contact_person TEXT,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.suppliers TO authenticated;
GRANT ALL ON public.suppliers TO service_role;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  barcode TEXT UNIQUE,
  name_ar TEXT NOT NULL,
  name_en TEXT,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  image_url TEXT,
  min_qty NUMERIC NOT NULL DEFAULT 0,
  max_qty NUMERIC,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  purchase_price NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.product_barcodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  barcode TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_barcodes TO authenticated;
GRANT ALL ON public.product_barcodes TO service_role;
ALTER TABLE public.product_barcodes ENABLE ROW LEVEL SECURITY;

-- ============ STOCK ============
CREATE TABLE public.stock_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE CASCADE,
  location_id UUID REFERENCES public.warehouse_locations(id) ON DELETE SET NULL,
  opening_qty NUMERIC NOT NULL DEFAULT 0,
  qty NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, warehouse_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stock_balances TO authenticated;
GRANT ALL ON public.stock_balances TO service_role;
ALTER TABLE public.stock_balances ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  type public.movement_type NOT NULL,
  qty NUMERIC NOT NULL,
  qty_before NUMERIC NOT NULL DEFAULT 0,
  qty_after NUMERIC NOT NULL DEFAULT 0,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id UUID,
  counterparty_warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  reason TEXT,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_movements_product ON public.stock_movements(product_id, created_at DESC);
CREATE INDEX idx_movements_warehouse ON public.stock_movements(warehouse_id, created_at DESC);
GRANT SELECT, INSERT ON public.stock_movements TO authenticated;
GRANT ALL ON public.stock_movements TO service_role;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- apply movement to balance
CREATE OR REPLACE FUNCTION public.apply_stock_movement()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE cur NUMERIC;
BEGIN
  INSERT INTO public.stock_balances (product_id, warehouse_id, qty)
  VALUES (NEW.product_id, NEW.warehouse_id, 0)
  ON CONFLICT (product_id, warehouse_id) DO NOTHING;

  SELECT qty INTO cur FROM public.stock_balances
   WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id FOR UPDATE;

  NEW.qty_before := cur;
  NEW.qty_after := cur + NEW.qty;

  UPDATE public.stock_balances SET qty = NEW.qty_after, updated_at = now()
   WHERE product_id = NEW.product_id AND warehouse_id = NEW.warehouse_id;

  IF NEW.created_by IS NULL THEN NEW.created_by := auth.uid(); END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER trg_apply_stock_movement BEFORE INSERT ON public.stock_movements
FOR EACH ROW EXECUTE FUNCTION public.apply_stock_movement();

-- ============ RECEIPTS (وارد) ============
CREATE TABLE public.purchase_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no TEXT NOT NULL UNIQUE,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  invoice_no TEXT,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.doc_status NOT NULL DEFAULT 'draft',
  total_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_receipts TO authenticated;
GRANT ALL ON public.purchase_receipts TO service_role;
ALTER TABLE public.purchase_receipts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.purchase_receipt_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id UUID NOT NULL REFERENCES public.purchase_receipts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  qty NUMERIC NOT NULL,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  batch_no TEXT,
  expiry_date DATE,
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.purchase_receipt_items TO authenticated;
GRANT ALL ON public.purchase_receipt_items TO service_role;
ALTER TABLE public.purchase_receipt_items ENABLE ROW LEVEL SECURITY;

-- ============ ISSUES (صادر) ============
CREATE TABLE public.issue_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no TEXT NOT NULL UNIQUE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  recipient TEXT,
  reason TEXT,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status public.doc_status NOT NULL DEFAULT 'draft',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issue_vouchers TO authenticated;
GRANT ALL ON public.issue_vouchers TO service_role;
ALTER TABLE public.issue_vouchers ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.issue_voucher_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id UUID NOT NULL REFERENCES public.issue_vouchers(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  qty NUMERIC NOT NULL,
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.issue_voucher_items TO authenticated;
GRANT ALL ON public.issue_voucher_items TO service_role;
ALTER TABLE public.issue_voucher_items ENABLE ROW LEVEL SECURITY;

-- ============ TRANSFERS / REQUESTS ============
CREATE TABLE public.transfer_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no TEXT NOT NULL UNIQUE,
  from_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  to_warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  status public.doc_status NOT NULL DEFAULT 'draft',
  request_notes TEXT,
  approval_notes TEXT,
  rejection_reason TEXT,
  driver_name TEXT,
  sender_name TEXT,
  receiver_name TEXT,
  branch_review TEXT,
  doc_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shipped_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfer_requests TO authenticated;
GRANT ALL ON public.transfer_requests TO service_role;
ALTER TABLE public.transfer_requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES public.transfer_requests(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  requested_qty NUMERIC NOT NULL DEFAULT 0,
  sent_qty NUMERIC NOT NULL DEFAULT 0,
  received_qty NUMERIC NOT NULL DEFAULT 0,
  request_notes TEXT,
  send_notes TEXT,
  receive_notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transfer_items TO authenticated;
GRANT ALL ON public.transfer_items TO service_role;
ALTER TABLE public.transfer_items ENABLE ROW LEVEL SECURITY;

-- ============ INVENTORY COUNTS ============
CREATE TABLE public.inventory_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_no TEXT NOT NULL UNIQUE,
  warehouse_id UUID NOT NULL REFERENCES public.warehouses(id) ON DELETE RESTRICT,
  scope TEXT NOT NULL DEFAULT 'full',
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  rack TEXT,
  status public.count_status NOT NULL DEFAULT 'draft',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_counts TO authenticated;
GRANT ALL ON public.inventory_counts TO service_role;
ALTER TABLE public.inventory_counts ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.inventory_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES public.inventory_counts(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  book_qty NUMERIC NOT NULL DEFAULT 0,
  actual_qty NUMERIC,
  notes TEXT
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inventory_count_items TO authenticated;
GRANT ALL ON public.inventory_count_items TO service_role;
ALTER TABLE public.inventory_count_items ENABLE ROW LEVEL SECURITY;

-- ============ NOTIFICATIONS / SETTINGS / AUDIT ============
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity TEXT,
  entity_id UUID,
  warehouse_id UUID REFERENCES public.warehouses(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  qty NUMERIC,
  value_before JSONB,
  value_after JSONB,
  reason TEXT,
  ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============ POLICIES ============
-- profiles
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid() OR public.has_role(auth.uid(),'super_admin')) WITH CHECK (id = auth.uid() OR public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- user_roles
CREATE POLICY "roles readable" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "roles managed by super admin" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- user_warehouses
CREATE POLICY "user warehouses readable" ON public.user_warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "user warehouses managed by super admin" ON public.user_warehouses FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- reference data: read all, write by admins/main warehouse
CREATE POLICY "warehouses readable" ON public.warehouses FOR SELECT TO authenticated USING (true);
CREATE POLICY "warehouses managed" ON public.warehouses FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "locations readable" ON public.warehouse_locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "locations managed" ON public.warehouse_locations FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.can_access_warehouse(auth.uid(), warehouse_id)) WITH CHECK (public.is_admin(auth.uid()) OR public.can_access_warehouse(auth.uid(), warehouse_id));

CREATE POLICY "categories readable" ON public.categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "categories managed" ON public.categories FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'main_warehouse')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'main_warehouse'));

CREATE POLICY "suppliers readable" ON public.suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "suppliers managed" ON public.suppliers FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'main_warehouse')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'main_warehouse'));

CREATE POLICY "products readable" ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY "products managed" ON public.products FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'main_warehouse')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'main_warehouse'));

CREATE POLICY "product barcodes readable" ON public.product_barcodes FOR SELECT TO authenticated USING (true);
CREATE POLICY "product barcodes managed" ON public.product_barcodes FOR ALL TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'main_warehouse')) WITH CHECK (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'main_warehouse'));

-- stock
CREATE POLICY "balances readable by warehouse access" ON public.stock_balances FOR SELECT TO authenticated USING (public.can_access_warehouse(auth.uid(), warehouse_id));
CREATE POLICY "balances managed" ON public.stock_balances FOR ALL TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "movements readable by warehouse access" ON public.stock_movements FOR SELECT TO authenticated USING (public.can_access_warehouse(auth.uid(), warehouse_id));
CREATE POLICY "movements insert" ON public.stock_movements FOR INSERT TO authenticated WITH CHECK (public.can_write(auth.uid()) AND public.can_access_warehouse(auth.uid(), warehouse_id));

-- documents
CREATE POLICY "receipts readable" ON public.purchase_receipts FOR SELECT TO authenticated USING (public.can_access_warehouse(auth.uid(), warehouse_id));
CREATE POLICY "receipts managed" ON public.purchase_receipts FOR ALL TO authenticated USING (public.can_write(auth.uid()) AND public.can_access_warehouse(auth.uid(), warehouse_id)) WITH CHECK (public.can_write(auth.uid()) AND public.can_access_warehouse(auth.uid(), warehouse_id));
CREATE POLICY "receipt items readable" ON public.purchase_receipt_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.purchase_receipts r WHERE r.id = receipt_id AND public.can_access_warehouse(auth.uid(), r.warehouse_id)));
CREATE POLICY "receipt items managed" ON public.purchase_receipt_items FOR ALL TO authenticated USING (public.can_write(auth.uid()) AND EXISTS (SELECT 1 FROM public.purchase_receipts r WHERE r.id = receipt_id AND public.can_access_warehouse(auth.uid(), r.warehouse_id))) WITH CHECK (public.can_write(auth.uid()) AND EXISTS (SELECT 1 FROM public.purchase_receipts r WHERE r.id = receipt_id AND public.can_access_warehouse(auth.uid(), r.warehouse_id)));

CREATE POLICY "issues readable" ON public.issue_vouchers FOR SELECT TO authenticated USING (public.can_access_warehouse(auth.uid(), warehouse_id));
CREATE POLICY "issues managed" ON public.issue_vouchers FOR ALL TO authenticated USING (public.can_write(auth.uid()) AND public.can_access_warehouse(auth.uid(), warehouse_id)) WITH CHECK (public.can_write(auth.uid()) AND public.can_access_warehouse(auth.uid(), warehouse_id));
CREATE POLICY "issue items readable" ON public.issue_voucher_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.issue_vouchers v WHERE v.id = voucher_id AND public.can_access_warehouse(auth.uid(), v.warehouse_id)));
CREATE POLICY "issue items managed" ON public.issue_voucher_items FOR ALL TO authenticated USING (public.can_write(auth.uid()) AND EXISTS (SELECT 1 FROM public.issue_vouchers v WHERE v.id = voucher_id AND public.can_access_warehouse(auth.uid(), v.warehouse_id))) WITH CHECK (public.can_write(auth.uid()) AND EXISTS (SELECT 1 FROM public.issue_vouchers v WHERE v.id = voucher_id AND public.can_access_warehouse(auth.uid(), v.warehouse_id)));

CREATE POLICY "transfers readable" ON public.transfer_requests FOR SELECT TO authenticated USING (public.can_access_warehouse(auth.uid(), from_warehouse_id) OR public.can_access_warehouse(auth.uid(), to_warehouse_id));
CREATE POLICY "transfers managed" ON public.transfer_requests FOR ALL TO authenticated USING (public.can_write(auth.uid()) AND (public.can_access_warehouse(auth.uid(), from_warehouse_id) OR public.can_access_warehouse(auth.uid(), to_warehouse_id))) WITH CHECK (public.can_write(auth.uid()) AND (public.can_access_warehouse(auth.uid(), from_warehouse_id) OR public.can_access_warehouse(auth.uid(), to_warehouse_id)));
CREATE POLICY "transfer items readable" ON public.transfer_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.transfer_requests t WHERE t.id = transfer_id AND (public.can_access_warehouse(auth.uid(), t.from_warehouse_id) OR public.can_access_warehouse(auth.uid(), t.to_warehouse_id))));
CREATE POLICY "transfer items managed" ON public.transfer_items FOR ALL TO authenticated USING (public.can_write(auth.uid()) AND EXISTS (SELECT 1 FROM public.transfer_requests t WHERE t.id = transfer_id AND (public.can_access_warehouse(auth.uid(), t.from_warehouse_id) OR public.can_access_warehouse(auth.uid(), t.to_warehouse_id)))) WITH CHECK (public.can_write(auth.uid()) AND EXISTS (SELECT 1 FROM public.transfer_requests t WHERE t.id = transfer_id AND (public.can_access_warehouse(auth.uid(), t.from_warehouse_id) OR public.can_access_warehouse(auth.uid(), t.to_warehouse_id))));

CREATE POLICY "counts readable" ON public.inventory_counts FOR SELECT TO authenticated USING (public.can_access_warehouse(auth.uid(), warehouse_id));
CREATE POLICY "counts managed" ON public.inventory_counts FOR ALL TO authenticated USING ((public.can_write(auth.uid()) OR public.has_role(auth.uid(),'auditor')) AND public.can_access_warehouse(auth.uid(), warehouse_id)) WITH CHECK ((public.can_write(auth.uid()) OR public.has_role(auth.uid(),'auditor')) AND public.can_access_warehouse(auth.uid(), warehouse_id));
CREATE POLICY "count items readable" ON public.inventory_count_items FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.inventory_counts c WHERE c.id = count_id AND public.can_access_warehouse(auth.uid(), c.warehouse_id)));
CREATE POLICY "count items managed" ON public.inventory_count_items FOR ALL TO authenticated USING ((public.can_write(auth.uid()) OR public.has_role(auth.uid(),'auditor')) AND EXISTS (SELECT 1 FROM public.inventory_counts c WHERE c.id = count_id AND public.can_access_warehouse(auth.uid(), c.warehouse_id))) WITH CHECK ((public.can_write(auth.uid()) OR public.has_role(auth.uid(),'auditor')) AND EXISTS (SELECT 1 FROM public.inventory_counts c WHERE c.id = count_id AND public.can_access_warehouse(auth.uid(), c.warehouse_id)));

-- notifications / settings / audit
CREATE POLICY "own notifications" ON public.notifications FOR ALL TO authenticated USING (user_id = auth.uid() OR public.is_admin(auth.uid())) WITH CHECK (user_id = auth.uid() OR public.is_admin(auth.uid()));
CREATE POLICY "settings readable" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "settings managed" ON public.system_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "audit readable by admins" ON public.audit_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()) OR public.has_role(auth.uid(),'auditor') OR user_id = auth.uid());
CREATE POLICY "audit insert" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- ============ TRIGGERS ============
CREATE TRIGGER t_profiles_upd BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_warehouses_upd BEFORE UPDATE ON public.warehouses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_suppliers_upd BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_products_upd BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_receipts_upd BEFORE UPDATE ON public.purchase_receipts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_issues_upd BEFORE UPDATE ON public.issue_vouchers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_transfers_upd BEFORE UPDATE ON public.transfer_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_counts_upd BEFORE UPDATE ON public.inventory_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_user BOOLEAN;
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email);

  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO first_user;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN first_user THEN 'super_admin'::public.app_role ELSE 'viewer'::public.app_role END);
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============ SEED ============
INSERT INTO public.warehouses (code, name_ar, name_en, type, location)
VALUES ('MAIN','المخزن الرئيسي','Main Warehouse','main','المقر الرئيسي');

INSERT INTO public.warehouses (code, name_ar, name_en, type, location)
SELECT 'BR-' || lpad(g::text,2,'0'), 'فرع ' || g, 'Branch ' || g, 'branch', 'فرع رقم ' || g
FROM generate_series(1,35) g;

INSERT INTO public.categories (name_ar, name_en) VALUES
 ('عناية بالشعر','Hair Care'),
 ('عناية بالبشرة','Skin Care'),
 ('زيوت ومساج','Oils & Massage'),
 ('مستلزمات تشغيلية','Operational Supplies'),
 ('أدوات ومعدات','Tools & Equipment');

INSERT INTO public.system_settings (key, value) VALUES
 ('company', '{"name_ar":"مخازن هيربل سبا","name_en":"Herbal Spa Warehouses","currency":"KWD"}'::jsonb);
