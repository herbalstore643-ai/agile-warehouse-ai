import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type Lang = "ar" | "en";

const dict = {
  appName: { ar: "مخازن هيربل سبا", en: "Herbal Spa Warehouses" },
  tagline: {
    ar: "نظام إدارة المخازن الاحترافي",
    en: "Professional Warehouse Management System",
  },
  signIn: { ar: "تسجيل الدخول", en: "Sign in" },
  signUp: { ar: "إنشاء حساب", en: "Create account" },
  signOut: { ar: "تسجيل الخروج", en: "Sign out" },
  email: { ar: "البريد الإلكتروني", en: "Email" },
  password: { ar: "كلمة المرور", en: "Password" },
  fullName: { ar: "الاسم الكامل", en: "Full name" },
  continueGoogle: { ar: "المتابعة بحساب Google", en: "Continue with Google" },
  haveAccount: { ar: "لديك حساب بالفعل؟", en: "Already have an account?" },
  noAccount: { ar: "ليس لديك حساب؟", en: "Don't have an account?" },
  checkEmail: {
    ar: "تم إرسال رسالة تأكيد إلى بريدك الإلكتروني",
    en: "A confirmation email has been sent",
  },
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  warehouses: { ar: "المخازن", en: "Warehouses" },
  products: { ar: "الأصناف", en: "Products" },
  suppliers: { ar: "الموردين", en: "Suppliers" },
  movements: { ar: "حركة المخزون", en: "Stock movements" },
  users: { ar: "المستخدمين والصلاحيات", en: "Users & roles" },
  reports: { ar: "التقارير", en: "Reports" },
  totalStock: { ar: "إجمالي المخزون", en: "Total stock" },
  stockValue: { ar: "قيمة المخزون", en: "Stock value" },
  mainWarehouse: { ar: "المخزن الرئيسي", en: "Main warehouse" },
  branchWarehouses: { ar: "المخازن الفرعية", en: "Branch warehouses" },
  lowStock: { ar: "أصناف منخفضة المخزون", en: "Low stock items" },
  activeProducts: { ar: "الأصناف النشطة", en: "Active products" },
  recentMovements: { ar: "آخر حركات المخزون", en: "Recent stock movements" },
  stockByWarehouse: { ar: "المخزون حسب المخزن", en: "Stock by warehouse" },
  noData: { ar: "لا توجد بيانات بعد", en: "No data yet" },
  add: { ar: "إضافة", en: "Add" },
  edit: { ar: "تعديل", en: "Edit" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  search: { ar: "بحث...", en: "Search..." },
  code: { ar: "الكود", en: "Code" },
  nameAr: { ar: "الاسم بالعربي", en: "Arabic name" },
  nameEn: { ar: "الاسم بالإنجليزي", en: "English name" },
  type: { ar: "النوع", en: "Type" },
  location: { ar: "الموقع", en: "Location" },
  manager: { ar: "المسؤول", en: "Manager" },
  phone: { ar: "الهاتف", en: "Phone" },
  status: { ar: "الحالة", en: "Status" },
  active: { ar: "نشط", en: "Active" },
  inactive: { ar: "متوقف", en: "Inactive" },
  main: { ar: "رئيسي", en: "Main" },
  branch: { ar: "فرعي", en: "Branch" },
  sku: { ar: "كود الصنف", en: "SKU" },
  barcode: { ar: "الباركود", en: "Barcode" },
  category: { ar: "التصنيف", en: "Category" },
  unit: { ar: "الوحدة", en: "Unit" },
  minQty: { ar: "الحد الأدنى", en: "Min qty" },
  maxQty: { ar: "الحد الأقصى", en: "Max qty" },
  purchasePrice: { ar: "سعر الشراء", en: "Purchase price" },
  imageUrl: { ar: "رابط الصورة", en: "Image URL" },
  notes: { ar: "ملاحظات", en: "Notes" },
  balance: { ar: "الرصيد", en: "Balance" },
  newProduct: { ar: "صنف جديد", en: "New product" },
  newWarehouse: { ar: "مخزن جديد", en: "New warehouse" },
  role: { ar: "الصلاحية", en: "Role" },
  saved: { ar: "تم الحفظ بنجاح", en: "Saved successfully" },
  error: { ar: "حدث خطأ", en: "Something went wrong" },
  language: { ar: "English", en: "العربية" },
  comingSoon: {
    ar: "هذه الوحدة قادمة في المرحلة التالية",
    en: "This module ships in the next phase",
  },
  super_admin: { ar: "مدير النظام", en: "Super Admin" },
  warehouse_manager: { ar: "مدير المخازن", en: "Warehouse Manager" },
  main_warehouse: { ar: "المخزن الرئيسي", en: "Main Warehouse" },
  branch_warehouse: { ar: "مخزن فرع", en: "Branch Warehouse" },
  auditor: { ar: "مسؤول الجرد", en: "Inventory Auditor" },
  viewer: { ar: "مشاهدة فقط", en: "Viewer" },
  receipts: { ar: "إذون الاستلام", en: "Purchase receipts" },
  issues: { ar: "إذون الصرف", en: "Issue vouchers" },
  transfers: { ar: "طلبات التحويل", en: "Transfers" },
  counts: { ar: "الجرد", en: "Inventory counts" },
  audit: { ar: "سجل التدقيق", en: "Audit log" },
  notifications: { ar: "الإشعارات", en: "Notifications" },
  newReceipt: { ar: "إذن استلام جديد", en: "New receipt" },
  newIssue: { ar: "إذن صرف جديد", en: "New issue voucher" },
  newTransfer: { ar: "طلب تحويل جديد", en: "New transfer request" },
  newCount: { ar: "أمر جرد جديد", en: "New count" },
  docNo: { ar: "رقم المستند", en: "Doc no" },
  date: { ar: "التاريخ", en: "Date" },
  supplier: { ar: "المورد", en: "Supplier" },
  warehouse: { ar: "المخزن", en: "Warehouse" },
  invoiceNo: { ar: "رقم الفاتورة", en: "Invoice no" },
  items: { ar: "الأصناف", en: "Items" },
  qty: { ar: "الكمية", en: "Qty" },
  price: { ar: "السعر", en: "Price" },
  batchNo: { ar: "رقم التشغيلة", en: "Batch no" },
  expiry: { ar: "تاريخ الصلاحية", en: "Expiry" },
  total: { ar: "الإجمالي", en: "Total" },
  addItem: { ar: "إضافة صنف", en: "Add item" },
  remove: { ar: "حذف", en: "Remove" },
  approve: { ar: "اعتماد", en: "Approve" },
  reject: { ar: "رفض", en: "Reject" },
  ship: { ar: "شحن", en: "Ship" },
  receive: { ar: "استلام", en: "Receive" },
  recipient: { ar: "الجهة المستلمة", en: "Recipient" },
  reason: { ar: "السبب", en: "Reason" },
  rejectionReason: { ar: "سبب الرفض", en: "Rejection reason" },
  driver: { ar: "اسم السائق", en: "Driver name" },
  sender: { ar: "اسم المُرسِل", en: "Sender name" },
  receiver: { ar: "اسم المستلم", en: "Receiver name" },
  branchReview: { ar: "ملاحظات الفرع", en: "Branch review" },
  fromWarehouse: { ar: "من مخزن", en: "From warehouse" },
  toWarehouse: { ar: "إلى مخزن", en: "To warehouse" },
  requestedQty: { ar: "الكمية المطلوبة", en: "Requested" },
  sentQty: { ar: "الكمية المرسلة", en: "Sent" },
  receivedQty: { ar: "الكمية المستلمة", en: "Received" },
  incoming: { ar: "واردة", en: "Incoming" },
  outgoing: { ar: "صادرة", en: "Outgoing" },
  awaitingMe: { ar: "بانتظار موافقتي", en: "Awaiting my action" },
  all: { ar: "الكل", en: "All" },
  scope: { ar: "نطاق الجرد", en: "Scope" },
  full: { ar: "جرد كامل", en: "Full count" },
  byCategory: { ar: "حسب التصنيف", en: "By category" },
  byRack: { ar: "حسب الرف", en: "By rack" },
  rack: { ar: "الرف", en: "Rack" },
  bookQty: { ar: "الرصيد الدفتري", en: "Book qty" },
  actualQty: { ar: "الكمية الفعلية", en: "Actual qty" },
  difference: { ar: "الفرق", en: "Difference" },
  scan: { ar: "مسح باركود", en: "Scan barcode" },
  scanHint: { ar: "امسح أو اكتب الباركود ثم Enter", en: "Scan or type barcode then Enter" },
  notFound: { ar: "غير موجود", en: "Not found" },
  draft: { ar: "مسودة", en: "Draft" },
  pending: { ar: "بانتظار الموافقة", en: "Pending" },
  approved: { ar: "معتمد", en: "Approved" },
  preparing: { ar: "قيد التجهيز", en: "Preparing" },
  shipped: { ar: "تم الشحن", en: "Shipped" },
  received: { ar: "تم الاستلام", en: "Received" },
  completed: { ar: "مكتمل", en: "Completed" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  cancelled: { ar: "ملغي", en: "Cancelled" },
  in_progress: { ar: "جاري", en: "In progress" },
  print: { ar: "طباعة", en: "Print" },
  details: { ar: "التفاصيل", en: "Details" },
  action: { ar: "إجراء", en: "Action" },
  user: { ar: "المستخدم", en: "User" },
  entity: { ar: "المستند", en: "Entity" },
  markAllRead: { ar: "تعليم الكل كمقروء", en: "Mark all read" },
  noNotifications: { ar: "لا توجد إشعارات", en: "No notifications" },
  stockReport: { ar: "أرصدة المخازن", en: "Stock balances" },
  productLedger: { ar: "حركة صنف", en: "Product ledger" },
  slowMoving: { ar: "أصناف راكدة", en: "Slow moving" },
  countVariance: { ar: "فروقات الجرد", en: "Count variance" },
  selectProduct: { ar: "اختر صنفًا", en: "Select product" },
  lastMovement: { ar: "آخر حركة", en: "Last movement" },
  never: { ar: "لا توجد حركة", en: "No movement" },
  newUser: { ar: "مستخدم جديد", en: "New user" },
  resetPassword: { ar: "تغيير كلمة المرور", en: "Change password" },
  passwordDigits: { ar: "كلمة المرور (أرقام فقط ٦-١٢ رقم)", en: "Password (digits only, 6-12)" },
  passwordDigitsError: { ar: "كلمة المرور يجب أن تكون أرقامًا من ٦ إلى ١٢ رقم", en: "Password must be 6-12 digits" },
  passwordUpdated: { ar: "تم تحديث كلمة المرور", en: "Password updated" },
  userCreated: { ar: "تم إنشاء المستخدم", en: "User created" },
  activate: { ar: "تفعيل", en: "Activate" },
  deactivate: { ar: "إيقاف", en: "Deactivate" },
  submitForApproval: { ar: "إرسال للاعتماد", en: "Submit" },
  createDoc: { ar: "إنشاء المستند", en: "Create document" },
  selectWarehouse: { ar: "اختر المخزن", en: "Select warehouse" },
  insufficient: { ar: "الرصيد غير كافٍ", en: "Insufficient balance" },
  confirm: { ar: "تأكيد", en: "Confirm" },
  loadItems: { ar: "تحميل الأصناف", en: "Load items" },
  variance: { ar: "الفروقات", en: "Variance" },
  startCount: { ar: "بدء الجرد", en: "Start count" },
  back: { ar: "رجوع", en: "Back" },
} as const;

export type TKey = keyof typeof dict;

type Ctx = {
  lang: Lang;
  dir: "rtl" | "ltr";
  setLang: (l: Lang) => void;
  toggle: () => void;
  t: (k: TKey) => string;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("ar");

  useEffect(() => {
    const stored = localStorage.getItem("hs_lang") as Lang | null;
    if (stored === "ar" || stored === "en") setLang(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem("hs_lang", lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const value = useMemo<Ctx>(
    () => ({
      lang,
      dir: lang === "ar" ? "rtl" : "ltr",
      setLang,
      toggle: () => setLang((l) => (l === "ar" ? "en" : "ar")),
      t: (k) => dict[k][lang],
    }),
    [lang],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useI18n must be used inside LanguageProvider");
  return ctx;
}