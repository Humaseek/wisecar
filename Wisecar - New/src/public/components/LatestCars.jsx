import React from "react";
import { Link } from "react-router-dom";

function formatPriceAed(value) {
  try {
    return new Intl.NumberFormat("en-US").format(value);
  } catch {
    return String(value);
  }
}

export default function LatestCars({ cars }) {
  return (
    <section className="public-section">
      <div className="public-latest__header">
        <div className="public-latest__title">Latest Cars</div>
        <Link className="public-latest__viewall" to="#" onClick={(e) => e.preventDefault()}>
          View All
        </Link>
        <div className="public-latest__subtitle">Most Recently Posted</div>
      </div>

      <div className="public-cars-grid">
        {cars.map((car) => (
          <Link key={car.id} to={`/cars/${car.id}`} className="public-car-card">
            <div
              className="public-car-card__img"
              style={{ backgroundImage: `url(${car.images?.[0]})` }}
              role="img"
              aria-label={`${car.make} ${car.model}`}
            />
            <div className="public-car-card__body">
              <div className="public-car-card__title">
                {car.year} {car.titleAr}
              </div>
              <div className="public-car-card__sub">
                {car.km ? (
                  <>
                    <span className="public-car-card__km">{formatPriceAed(car.km)} km</span>
                    <span className="public-dot">•</span>
                  </>
                ) : null}
                <span className="public-car-card__model">
                  {car.make} {car.model}
                </span>
              </div>
              <div className="public-car-card__price">
                {formatPriceAed(car.priceAed)} <span className="public-car-card__aed">د.إ</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
