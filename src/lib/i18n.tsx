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