import React from "react";
import { ShieldAlert } from "lucide-react";

export default function NotAllowed() {
  return (
    <div className="container">
      <div className="card" style={{ maxWidth: 760 }}>
        <div className="row" style={{ gap: 10 }}>
          <ShieldAlert size={22} />
          <div className="h1">حسابك غير مفعّل</div>
        </div>

        <div className="muted" style={{ marginTop: 10, lineHeight: 1.9 }}>
          لم يتم العثور على دور (Role) لهذا المستخدم داخل جدول <span className="ltrIso">profiles</span>.
          <br />
          اطلب من الأدمن تعيين دورك إلى <span className="ltrIso">sales</span> أو <span className="ltrIso">admin</span>.
        </div>

        <hr className="sep" />

        <div className="subtleBox" style={{ direction: "ltr" }}>
          <div className="ltrIso">update public.profiles set role = 'sales' where id = '&lt;user_uuid&gt;';</div>
        </div>
      </div>
    </div>
  );
}
