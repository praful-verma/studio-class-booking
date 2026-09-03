export const Pagination = ({ page, pages, total, limit, onPageChange, onLimitChange }) => {
  if (total === 0) return null;

  return (
    <div className="pagination-container">
      <div className="pagination-info">
        Showing page <strong>{page}</strong> of <strong>{pages || 1}</strong> ({total} total results)
      </div>

      <div className="pagination-controls">
        {onLimitChange && (
          <div className="limit-selector">
            <label htmlFor="limit-select">Per page:</label>
            <select
              id="limit-select"
              value={limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        )}

        <button
          className="btn btn-secondary btn-sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>

        <span className="page-number-display">{page}</span>

        <button
          className="btn btn-secondary btn-sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
};
