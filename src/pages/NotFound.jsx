import React from "react";
import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="container section" style={{ paddingTop: 40 }}>
      <div className="empty">
        <div className="emptyTitle">העמוד לא נמצא</div>
        <div className="muted">בדקו את הכתובת או חזרו לדף הבית.</div>
        <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "center" }}>
          <Link className="btn btnPrimary" to="/">דף הבית</Link>
          <Link className="btn btnGhost" to="/cars">רכבים</Link>
        </div>
      </div>
    </div>
  );
}
