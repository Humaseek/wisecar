import React from "react";

export default function SiteFooter() {
  return (
    <footer className="siteFooter">
      <div className="container footerGrid">
        <div className="footerBrand">
          <img className="footerLogo" src="/brand-logo.png" alt="Wisecar" />
          <div>
            <div className="footerTitle">Wisecar</div>
            <div className="footerText">לוח רכבים מודרני, מהיר ונוח.</div>
          </div>
        </div>

        <div>
          <div className="footerTitle">קישורים</div>
          <a className="footerLink" href="/cars">רכבים</a>
          <a className="footerLink" href="#latest">רכבים אחרונים</a>
        </div>

        <div>
          <div className="footerTitle">תמיכה</div>
          <div className="footerText">לשאלות / עזרה, פנו אלינו.</div>
          <div className="footerText">אימייל: info@wisecar.co.il</div>
        </div>
      </div>

      <div className="footerBottom">
        <div className="container footerBottomInner">
          <div className="footerText">© {new Date().getFullYear()} Wisecar</div>
          <div className="footerText">נבנה בצבעי המותג שלך</div>
        </div>
      </div>
    </footer>
  );
}
