// Mockup ‹ 1 / 3 › pager. Hidden when there is only a single page.
export default function Pager({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (next: number) => void;
}) {
  if (pages <= 1) return null;
  return (
    <div className="mono flex items-center justify-center gap-4 pt-1 text-xs text-[var(--ink2)]">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 0}
        aria-label="Previous page"
        className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--line)] bg-white text-sm disabled:opacity-30"
      >
        ‹
      </button>
      <span>
        {page + 1} / {pages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages - 1}
        aria-label="Next page"
        className="flex h-8 w-8 items-center justify-center rounded-[10px] border border-[var(--line)] bg-white text-sm disabled:opacity-30"
      >
        ›
      </button>
    </div>
  );
}
