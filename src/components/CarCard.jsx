import React from "react";
import { Link } from "react-router-dom";
import { BadgeCheck, MapPin, Gauge, Calendar } from "lucide-react";
import { formatKm, formatMoneyILS, makeTitle, pickPrimaryImage, statusLabel, statusTone } from "../utils/format";

export default function CarCard({ car }) {
  const img = pickPrimaryImage(car);
  const title = makeTitle(car) || "—";
  const tone = statusTone(car?.status);

  return (
    <Link to={`/cars/${car.id}`} className="carCard">
      <div className="carImageWrap">
        <img
          src={img}
          alt={title}
          className="carImage"
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/placeholder-car.svg";
          }}
        />
        <div className={`statusPill ${tone}`}>{statusLabel(car?.status)}</div>
      </div>

      <div className="carBody">
        <div className="carTitleRow">
          <div className="carTitle">{title}</div>
          <div className="carPrice">{formatMoneyILS(car?.asking_price)}</div>
        </div>

        <div className="carMeta">
          <div className="metaItem"><Calendar size={16} />{car?.year ? String(car.year) : "—"}</div>
          <div className="metaItem"><Gauge size={16} />{formatKm(car?.mileage)}</div>
          <div className="metaItem"><MapPin size={16} />ישראל</div>
        </div>

        <div className="carHint">
          <BadgeCheck size={16} />
          מידע בסיסי + תמונות
        </div>
      </div>
    </Link>
  );
}
