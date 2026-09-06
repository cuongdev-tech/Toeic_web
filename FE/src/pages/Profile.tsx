import React, { useEffect, useState } from 'react';
import { Lock, Loader2, User } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/auth/profile').then((response) => setProfile(response.data.user)).finally(() => setLoading(false));
  }, []);

  const submitPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetchApi('/auth/password', { method: 'PATCH', body: JSON.stringify({ currentPassword, newPassword }) });
      setMessage(response.message || 'Đổi mật khẩu thành công.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error: any) {
      setMessage(error.message || 'Không thể đổi mật khẩu.');
    }
  };

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-indigo-600" /></div>;

  return <div className="max-w-2xl mx-auto p-6 space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Hồ sơ tài khoản</h1><p className="text-slate-500 mt-1">Quản lý thông tin và bảo mật tài khoản.</p></div>
    <section className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"><div className="flex items-center gap-3"><User className="text-indigo-600" /><h2 className="font-bold">Thông tin cá nhân</h2></div><div><p className="text-xs text-slate-500">Họ tên</p><p className="font-medium">{profile?.fullName}</p></div><div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{profile?.email}</p></div><div><p className="text-xs text-slate-500">Vai trò</p><p className="font-medium">{profile?.role}</p></div></section>
    <form onSubmit={submitPassword} className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4"><div className="flex items-center gap-3"><Lock className="text-indigo-600" /><h2 className="font-bold">Đổi mật khẩu</h2></div><input type="password" required minLength={8} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Mật khẩu hiện tại" className="w-full border border-slate-200 rounded-lg px-3 py-2" /><input type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mật khẩu mới, ít nhất 8 ký tự" className="w-full border border-slate-200 rounded-lg px-3 py-2" /><button className="bg-indigo-600 text-white px-4 py-2 rounded-lg">Cập nhật mật khẩu</button>{message && <p className="text-sm text-slate-600">{message}</p>}</form>
  </div>;
}
