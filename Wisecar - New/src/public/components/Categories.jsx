import React from "react";

const categories = [
  {
    key: "economy",
    title: "Economy",
    subtitle: "Affordable economy cars",
    image: "https://images.unsplash.com/photo-1511910849309-0dffb878b0b2?auto=format&fit=crop&w=1200&q=60",
  },
  {
    key: "family",
    title: "Family",
    subtitle: "affordable family cars",
    image: "https://images.unsplash.com/photo-1502877338535-766e1452684a?auto=format&fit=crop&w=1200&q=60",
  },
  {
    key: "electric",
    title: "Electric",
    subtitle: "affordable electric cars",
    image: "https://images.unsplash.com/photo-1619767886558-efdc259cde1a?auto=format&fit=crop&w=1200&q=60",
  },
  {
    key: "luxury",
    title: "Luxury",
    subtitle: "luxury cars",
    image: "https://images.unsplash.com/photo-1523987355523-c7b5b0dd90a7?auto=format&fit=crop&w=1200&q=60",
  },
  {
    key: "sport",
    title: "Sport",
    subtitle: "affordable sport cars",
    image: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=60",
  },
  {
    key: "supercars",
    title: "Supercars",
    subtitle: "high-end sport cars",
    image: "https://images.unsplash.com/photo-1525609004556-c46c7d6cf023?auto=format&fit=crop&w=1200&q=60",
  },
  {
    key: "adventure",
    title: "Adventure",
    subtitle: "affordable adventure cars",
    image: "https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=60",
  },
  {
    key: "utility",
    title: "Utility",
    subtitle: "affordable utility cars",
    image: "https://images.unsplash.com/photo-1619642008248-0d5b37e04e11?auto=format&fit=crop&w=1200&q=60",
  },
];

export default function Categories() {
  return (
    <section className="public-section">
      <div className="public-section__title-row">
        <h2 className="public-section__title">CATEGORIES</h2>
      </div>

      <div className="public-categories">
        {categories.map((c) => (
          <div key={c.key} className="public-category">
            <div
              className="public-category__image"
              style={{ backgroundImage: `url(${c.image})` }}
              role="img"
              aria-label={c.title}
            />
            <div className="public-category__meta">
              <div className="public-category__title">{c.title}</div>
              <div className="public-category__subtitle">{c.subtitle}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
