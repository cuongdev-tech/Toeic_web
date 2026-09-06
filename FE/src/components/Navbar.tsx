import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookOpen, LogOut, User, Settings, LayoutDashboard, BarChart2 } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  
  const getUser = () => {
    try {
      const item = localStorage.getItem('user');
      if (!item || item === 'undefined') return null;
      return JSON.parse(item);
    } catch (error) {
      return null;
    }
  };

  const user = getUser();
  // Kiểm tra quyền Admin (tùy thuộc vào cách bạn lưu role trong DB, ví dụ: 'ADMIN' hoặc trường isAdmin)
  const isAdmin = user?.role === 'ADMIN' || user?.isAdmin === true;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-white/60 bg-white/80 shadow-[0_8px_30px_rgba(25,35,60,0.06)] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-16 items-center justify-between gap-4 py-2">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-950 shadow-lg shadow-indigo-200">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-lg font-bold tracking-tight text-slate-950 sm:text-xl">
                {isAdmin ? 'TOEIC Admin Portal' : 'TOEIC Master'}
              </span>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-4">
            {token && user ? (
              <>
                {isAdmin ? (
                  // MENU DÀNH CHO ADMIN
                  <>
                    <Link to="/dashboard" className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                      <LayoutDashboard className="w-4 h-4" /> Tổng quan hệ thống
                    </Link>
                    <Link to="/admin" className="flex items-center gap-1.5 rounded-xl bg-slate-950 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700">
                      <Settings className="w-4 h-4" /> Quản lý đề thi
                    </Link>
                    <Link to="/admin/users" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                      Học viên
                    </Link>
                    <Link to="/admin/audit-logs" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                      Nhật ký
                    </Link>
                  </>
                ) : (
                  // MENU DÀNH CHO HỌC VIÊN
                  <>
                    <Link to="/student-dashboard" className="hidden items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600 sm:flex">
                      <LayoutDashboard className="w-4 h-4" /> Tổng quan
                    </Link>
                    <Link to="/tests" className="text-sm font-medium text-slate-600 transition-colors hover:text-indigo-600">
                      Đề thi
                    </Link>
                    <Link to="/analytics" className="flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                      <BarChart2 className="w-4 h-4" /> Thống kê cá nhân
                    </Link>
                    <Link to="/transcript" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                      Bảng điểm / Lịch sử
                    </Link>
                    <Link to="/vocab" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                      Từ vựng
                    </Link>
                  </>
                )}

                <div className="h-6 w-px bg-slate-200 mx-2"></div>
                
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    <User className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium text-slate-700">{user.fullName || user.name || 'User'}</div>
                    <div className="text-[10px] text-slate-400 uppercase font-semibold">{isAdmin ? 'Quản trị viên' : 'Học viên'}</div>
                  </div>
                  <Link to="/profile" className="text-xs text-indigo-600 hover:underline">Hồ sơ</Link>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-red-600 transition-colors rounded-md hover:bg-red-50"
                  title="Đăng xuất"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors shadow-sm"
                >
                  Đăng ký
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}