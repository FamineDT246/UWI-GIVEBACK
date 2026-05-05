import { useState } from 'react';

export function usePagination(itemsPerPage = 8) {
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const totalPages = Math.ceil(totalCount / itemsPerPage);
  const from = (currentPage - 1) * itemsPerPage;
  const to = from + itemsPerPage - 1;

  const goToPage = (page) => setCurrentPage(page);
  const nextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage(p => Math.max(p - 1, 1));
  const reset = () => setCurrentPage(1);

  const pageInfo = totalCount === 0 ? 'No results' :
    `Showing ${from + 1}–${Math.min(currentPage * itemsPerPage, totalCount)} of ${totalCount}`;

  return {
    currentPage, totalCount, setTotalCount,
    totalPages, from, to,
    goToPage, nextPage, prevPage, reset,
    pageInfo,
    canGoNext: currentPage < totalPages,
    canGoPrev: currentPage > 1,
  };
}

