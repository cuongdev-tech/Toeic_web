import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Unlock, Loader2, Users, ChevronRight } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadUsers = async () => {
    try {
      const response = await fetchApi('/admin/users');
      setUsers(response.data?.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleStatus = async (event: React.MouseEvent, user: any) => {
    event.stopPropagation();
    try {
      await fetchApi(`/admin/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !user.isActive }) });
      setUsers((items) => items.map((item) => item.id === user.id ? { ...item, isActive: !item.isActive } : item));
    } catch (error: any) {
      alert(error.message || 'Không thể cập nhật trạng thái tài khoản.');
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-primary-600" /></div>;

  return <div className="page page-xl space-y-6"><div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Users className="text-primary-600" /> Quản lý học viên</h1><p className="text-slate-500 mt-1">Bấm vào học viên để xem quá trình học, khóa tài khoản khi cần.</p></div><div className="bg-surface border border-slate-200 rounded-card shadow-card overflow-hidden"><div className="divide-y divide-slate-100">{users.map((user) => <div key={user.id} onClick={() => navigate(`/admin/users/${user.id}`)} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50 transition-colors"><div className="flex items-center gap-3 min-w-0"><div className="min-w-0"><p className="font-semibold text-slate-900">{user.fullName}</p><p className="text-sm text-slate-500">{user.email}</p><p className="text-xs text-slate-400 mt-1">{user._count?.testAttempts || 0} lượt thi{typeof user.targetScore === 'number' ? ` • Mục tiêu ${user.targetScore}` : ''}</p></div><ChevronRight className="w-4 h-4 text-slate-300 shrink-0" /></div><div className="flex items-center gap-3"><span className={`badge ${user.isActive ? 'bg-success-50 text-success-700' : 'bg-danger-50 text-danger-700'}`}>{user.isActive ? 'Đang hoạt động' : 'Đã khóa'}</span><button onClick={(e) => toggleStatus(e, user)} className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-input text-sm hover:border-primary-300 bg-white">{user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}{user.isActive ? 'Khóa' : 'Mở khóa'}</button></div></div>)}</div>{users.length === 0 && <p className="p-10 text-center text-slate-500">Chưa có học viên.</p>}</div></div>;
}
