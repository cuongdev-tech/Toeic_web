import React, { useEffect, useState } from 'react';
import { Lock, Unlock, Loader2, Users } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      const response = await fetchApi('/admin/users');
      setUsers(response.data?.users || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const toggleStatus = async (user: any) => {
    try {
      await fetchApi(`/admin/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive: !user.isActive }) });
      setUsers((items) => items.map((item) => item.id === user.id ? { ...item, isActive: !item.isActive } : item));
    } catch (error: any) {
      alert(error.message || 'Không thể cập nhật trạng thái tài khoản.');
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>;

  return <div className="max-w-6xl mx-auto p-6 space-y-6"><div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><Users className="text-indigo-600" /> Quản lý học viên</h1><p className="text-slate-500 mt-1">Theo dõi hoạt động và khóa tài khoản khi cần.</p></div><div className="bg-white border border-slate-200 rounded-2xl overflow-hidden"><div className="divide-y divide-slate-100">{users.map((user) => <div key={user.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"><div><p className="font-semibold text-slate-900">{user.fullName}</p><p className="text-sm text-slate-500">{user.email}</p><p className="text-xs text-slate-400 mt-1">{user._count?.testAttempts || 0} lượt thi</p></div><div className="flex items-center gap-3"><span className={`text-xs px-3 py-1 rounded-full ${user.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{user.isActive ? 'Đang hoạt động' : 'Đã khóa'}</span><button onClick={() => toggleStatus(user)} className="flex items-center gap-2 border border-slate-200 px-3 py-2 rounded-lg text-sm hover:border-indigo-300">{user.isActive ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}{user.isActive ? 'Khóa' : 'Mở khóa'}</button></div></div>)}</div>{users.length === 0 && <p className="p-10 text-center text-slate-500">Chưa có học viên.</p>}</div></div>;
}
