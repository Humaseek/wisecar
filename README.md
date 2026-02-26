# Car Showroom Pro — نظام معرض سيارات (Vite + Vercel + Supabase)

واجهة عربية RTL “فاخرة” مع الاهتمام بألوان اللوجو، ونظام صلاحيات حقيقي (UI + RLS) يحقق التالي:

## الأدوار (Roles)

### ✅ Admin
- سيارات: إضافة / تعديل / حذف + رفع صور + إدخال التكاليف الداخلية
- زباين: إضافة / تعديل / حذف
- موردين: إضافة / تعديل / حذف
- مبيعات: يرى كل المبيعات + يقدر يحذف عملية بيع
- يرى **المالية الداخلية** (سعر الشراء/إعلانات/بنزين/مصاريف أخرى)

### ✅ Sales
- سيارات: مشاهدة فقط + **السعر المطلوب فقط**
- زباين: مشاهدة + **إضافة زبون جديد فقط** (B)
- موردين: ممنوع
- مبيعات: يسجل مبيعاته فقط (A)
- ممنوع يشوف **المالية الداخلية** نهائيًا

> (A) تم تطبيقه: موظف المبيعات لا يختار نفسه كـ Salesperson — النظام يسجل البيع تلقائيًا على المستخدم الحالي.

---

## 1) تشغيل قاعدة البيانات (Supabase)

### (1) أنشئ مشروع Supabase
- فعّل Email/Password من: Authentication → Providers

### (2) شغّل ملف الـ SQL
- افتح: **SQL Editor**
- انسخ محتوى الملف:
  - `supabase/setup.sql`
- ثم **Run**

هذا ينشئ الجداول + سياسات RLS + View + RPC + Trigger لتحديث حالة السيارة عند البيع.

### (3) اجعل أول مستخدم Admin
1. افتح المشروع محليًا أو على Vercel وسجّل حساب (Sign up)
2. بعد ما يتسجل، روح على Supabase:
   - Table Editor → `profiles`
   - افتح صف المستخدم
   - غيّر `role` إلى `admin`

> كل المستخدمين الجدد يتم إنشاؤهم تلقائيًا بدور `sales`.

### (4) الصور (Storage)
الملف SQL يحاول إنشاء bucket باسم `car-images` كـ Public ويضيف سياسات:
- قراءة: لكل مستخدم authenticated
- كتابة/حذف: Admin فقط

إذا حبيت تعملها من الواجهة بدل SQL:
- Storage → Create bucket → اسمها `car-images`
- اجعلها Public

---

## 2) إعداد المتغيرات (Env)

### محليًا
أنشئ ملف `.env` في جذر المشروع:

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### على Vercel
Vercel → Project → Settings → Environment Variables
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

ثم Redeploy.

> لا تستخدم Service Role Key على الواجهة.

---

## 3) تشغيل المشروع محليًا

```bash
npm install
npm run dev
```

Build:
```bash
npm run build
```

---

## 4) النشر على Vercel
- Import repo
- Framework: Vite
- Build Command: `npm run build`
- Output Directory: `dist`

تم إضافة `vercel.json` لعمل SPA routing.

---

## أهم الجداول
- `profiles` (صلاحيات المستخدم)
- `cars` (المخزون)
- `car_finance` (تكاليف داخلية — Admin فقط)
- `car_images` (روابط الصور)
- `customers` (زباين — Sales Insert فقط)
- `suppliers` (موردين — Admin فقط)
- `sales` (مبيعات)
- `sales_list_view` (عرض جاهز للداشبورد وصفحة المبيعات)

---

## ملاحظات سريعة
- إذا فتحت الموقع وظهر لك “ConfigMissing”: يعني المتغيرات مش موجودة.
- إذا ظهر “مشكلة في الصلاحيات”: يعني ملف SQL لم يتم تشغيله أو RLS غير جاهز.

