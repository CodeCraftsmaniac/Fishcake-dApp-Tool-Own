/**
 * Pagination helper for API responses.
 */

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export function parsePagination(params: PaginationParams): { page: number; limit: number; offset: number } {
  const page = Math.max(1, Math.floor(params.page ?? 1));
  const limit = Math.max(1, Math.min(100, Math.floor(params.limit ?? 20)));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

export function paginate<T>(items: T[], total: number, page: number, limit: number): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit);
  return {
    data: items,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  };
}
