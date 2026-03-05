import React from "react";

export default function Pagination({ page, pageSize, total, onPage }) {
  const pages = Math.max(1, Math.ceil((total || 0) / (pageSize || 1)));
  if (pages <= 1) return null;

  const clamp = (n) => Math.max(1, Math.min(pages, n));

  const visible = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(pages, page + 2);
  for (let i = start; i <= end; i++) visible.push(i);

  return (
    <div className="pager">
      <button className="btn btnGhost" onClick={() => onPage(clamp(page - 1))} disabled={page <= 1}>
        הקודם
      </button>

      <div className="pagerNums">
        {start > 1 && (
          <>
            <button className="pagerNum" onClick={() => onPage(1)}>1</button>
            {start > 2 ? <span className="pagerDots">…</span> : null}
          </>
        )}

        {visible.map((n) => (
          <button
            key={n}
            className={n === page ? "pagerNum active" : "pagerNum"}
            onClick={() => onPage(n)}
          >
            {n}
          </button>
        ))}

        {end < pages && (
          <>
            {end < pages - 1 ? <span className="pagerDots">…</span> : null}
            <button className="pagerNum" onClick={() => onPage(pages)}>
              {pages}
            </button>
          </>
        )}
      </div>

      <button className="btn btnGhost" onClick={() => onPage(clamp(page + 1))} disabled={page >= pages}>
        הבא
      </button>
    </div>
  );
}
