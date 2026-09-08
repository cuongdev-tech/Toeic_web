import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { CheckCircle2, ChevronLeft, ChevronRight, Clock, FileText, ListChecks, Play, Search, AlertCircle, Loader2 } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description?: string | null;
  duration: number;
  questionCount?: number;
  submittedCount?: number;
  bestScore?: number;
  hasInProgress?: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

type AttemptedFilter = 'all' | 'yes' | 'no';
type SortKey = 'newest' | 'title' | 'duration_asc' | 'duration_desc';

const PAGE_SIZE = 12;

export default function Tests() {
  const [tests, setTests] = useState<Test[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Toolbar state (search debounce 300ms để không spam API từng ký tự)
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [attempted, setAttempted] = useState<AttemptedFilter>('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const loadTests = async (isFirst: boolean) => {
      try {
        if (isFirst) setLoading(true);
        else setFetching(true);
        setError('');
        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
          sort,
          attempted,
        });
        if (debouncedSearch) params.set('search', debouncedSearch);
        const res = await fetchApi(`/tests?${params.toString()}`);
        if (cancelled) return;
        if (res.success || res.status === 'success') {
          // Tương thích BE cũ (trả mảng trần) lẫn BE mới (tests + pagination).
          const list = res.data?.tests ?? res.data ?? [];
          setTests(Array.isArray(list) ? list : []);
          if (res.data?.pagination) setPagination(res.data.pagination);
          else setPagination({ page: 1, limit: list.length, total: list.length, totalPages: 1 });
        }
      } catch (err: any) {
        if (cancelled) return;
        if (err.message === 'Unauthorized' || err.message === 'Invalid token') {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setError(err.message || 'Không thể tải danh sách đề thi.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setFetching(false);
        }
      }
    };

    loadTests(page === 1 && tests.length === 0 && loading);
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, attempted, sort, page, navigate]);

  const selectAttempted = (value: AttemptedFilter) => {
    setPage(1);
    setAttempted(value);
  };

  const selectSort = (value: SortKey) => {
    setPage(1);
    setSort(value);
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="relative mb-6 overflow-hidden rounded-card bg-admin-950 px-6 py-8 text-white shadow-xl shadow-primary-200/40 sm:px-10 sm:py-10">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full border-[28px] border-primary-400/20" />
          <div className="relative max-w-2xl">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-warning-300">Luyện tập có chủ đích</p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Thư viện đề thi TOEIC</h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">
            Khám phá các đề thi đa dạng, được biên soạn theo chuẩn cấu trúc mới nhất giúp bạn tự tin đạt điểm cao.
          </p>
          </div>
        </div>

        {/* Toolbar: tìm kiếm + lọc trạng thái + sắp xếp */}
        <div className="card p-4 mb-6 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên hoặc mô tả đề thi..."
              aria-label="Tìm kiếm đề thi"
              className="input pl-10"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Trạng thái
              <select
                value={attempted}
                onChange={(e) => selectAttempted(e.target.value as AttemptedFilter)}
                className="input sm:w-auto"
              >
                <option value="all">Tất cả</option>
                <option value="no">Chưa thi</option>
                <option value="yes">Đã thi</option>
              </select>
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-600">
              Sắp xếp
              <select
                value={sort}
                onChange={(e) => selectSort(e.target.value as SortKey)}
                className="input sm:w-auto"
              >
                <option value="newest">Mới nhất</option>
                <option value="title">Tên A–Z</option>
                <option value="duration_asc">Ngắn nhất</option>
                <option value="duration_desc">Dài nhất</option>
              </select>
            </label>
          </div>
        </div>

        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-600 px-6 py-4 rounded-inner flex items-start gap-3 mb-8 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-base font-medium">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-500">
            <Loader2 className="w-10 h-10 animate-spin text-primary-600 mb-4" />
            <p className="font-medium text-lg">Đang tải danh sách đề thi...</p>
          </div>
        ) : tests.length === 0 && !error ? (
          <div className="card p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Không tìm thấy đề thi</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              {debouncedSearch || attempted !== 'all'
                ? 'Thử từ khóa khác hoặc đổi bộ lọc trạng thái.'
                : 'Hệ thống hiện tại chưa cập nhật đề thi. Vui lòng quay lại sau!'}
            </p>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-500 mb-4" aria-live="polite">
              {fetching ? 'Đang cập nhật...' : `Hiển thị ${tests.length}/${pagination.total} đề thi`}
            </p>
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 ${fetching ? 'opacity-60 pointer-events-none' : ''}`}>
              {tests.map((test) => {
                const done = (test.submittedCount ?? 0) > 0;
                return (
                  <div
                    key={test.id}
                    className="card group flex h-full flex-col p-6 transition-all hover:-translate-y-1 hover:border-primary-200 hover:shadow-card-hover"
                  >
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-4">
                        {test.hasInProgress ? (
                          <span className="badge border border-warning-200 bg-warning-50 text-warning-700">
                            Đang làm dở
                          </span>
                        ) : done ? (
                          <span className="badge border border-success-200 bg-success-50 text-success-700">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã thi {test.submittedCount} lần
                          </span>
                        ) : (
                          <span className="badge border border-warning-200 bg-warning-50 text-warning-700">
                            Mock Test
                          </span>
                        )}
                        <div className="flex items-center text-slate-500 text-sm font-medium whitespace-nowrap">
                          <Clock className="w-4 h-4 mr-1.5" />
                          {test.duration} phút
                        </div>
                      </div>

                      <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-primary-600 transition-colors line-clamp-2">
                        {test.title}
                      </h3>

                      {test.description ? (
                        <p className="text-slate-500 text-sm line-clamp-3 mb-4">
                          {test.description}
                        </p>
                      ) : (
                        <p className="text-slate-500 text-sm mb-4 italic">
                          Đề thi thử TOEIC chuẩn cấu trúc mới. Tổng cộng 200 câu hỏi Nghe và Đọc.
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-2 mb-6 text-xs">
                        {typeof test.questionCount === 'number' && (
                          <span className="badge bg-slate-100 text-slate-600">
                            <ListChecks className="w-3.5 h-3.5" /> {test.questionCount} câu
                          </span>
                        )}
                        {done && (
                          <span className="badge bg-primary-50 text-primary-700">
                            Cao nhất: {test.bestScore}/990
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100 mt-auto">
                      <button
                        onClick={() => navigate(`/tests/${test.id}/room`)}
                        className="btn-primary w-full py-3"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        {test.hasInProgress ? 'Tiếp tục làm bài' : done ? 'Thi lại' : 'Bắt đầu thi'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {pagination.totalPages > 1 && (
              <nav aria-label="Phân trang đề thi" className="mt-8 flex items-center justify-center gap-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || fetching}
                  className="btn-secondary px-3 py-2"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-sm text-slate-600">
                  Trang <strong>{pagination.page}</strong>/{pagination.totalPages} ({pagination.total} đề)
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                  disabled={page >= pagination.totalPages || fetching}
                  className="btn-secondary px-3 py-2"
                  aria-label="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  );
}
