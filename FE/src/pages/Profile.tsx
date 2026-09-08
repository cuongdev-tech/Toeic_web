import React, { useEffect, useState } from 'react';
import { Lock, Loader2, User, Target, Save } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function Profile() {
  const [profile, setProfile] = useState<any>(null);
  const [fullName, setFullName] = useState('');
  const [targetScore, setTargetScore] = useState('700');
  const [profileMessage, setProfileMessage] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/auth/profile')
      .then((response) => {
        const user = response.data.user;
        setProfile(user);
        setFullName(user.fullName || '');
        setTargetScore(String(user.targetScore || 700));
      })
      .finally(() => setLoading(false));
  }, []);

  const submitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingProfile(true);
    setProfileMessage('');
    try {
      const target = Math.min(990, Math.max(10, Number(targetScore) || 700));
      const response = await fetchApi('/auth/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: fullName.trim(), targetScore: target }),
      });
      const user = response.data.user;
      setProfile(user);
      setFullName(user.fullName || '');
      setTargetScore(String(user.targetScore || 700));
      localStorage.setItem('toeicTargetScore', String(user.targetScore || 700));
      setProfileMessage(response.message || 'Cập nhật hồ sơ thành công.');
    } catch (error: any) {
      setProfileMessage(error.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setSavingProfile(false);
    }
  };

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

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-primary-600" /></div>;

  return <div className="page max-w-2xl space-y-6">
    <div><h1 className="text-2xl font-bold text-slate-900">Hồ sơ tài khoản</h1><p className="text-slate-500 mt-1">Quản lý thông tin, mục tiêu và bảo mật tài khoản.</p></div>
    <section className="card space-y-4"><div className="flex items-center gap-3"><User className="text-primary-600" /><h2 className="font-bold">Thông tin cá nhân</h2></div><div><p className="text-xs text-slate-500">Họ tên</p><p className="font-medium">{profile?.fullName}</p></div><div><p className="text-xs text-slate-500">Email</p><p className="font-medium">{profile?.email}</p></div><div><p className="text-xs text-slate-500">Vai trò</p><p className="font-medium">{profile?.role}</p></div></section>
    <form onSubmit={submitProfile} className="card space-y-4">
      <div className="flex items-center gap-3"><Target className="text-primary-600" /><h2 className="font-bold">Hồ sơ & mục tiêu TOEIC</h2></div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="profile-fullname">Họ tên hiển thị</label>
        <input id="profile-fullname" value={fullName} onChange={(event) => setFullName(event.target.value)} minLength={2} required className="input" />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="profile-target">Mục tiêu điểm (10–990)</label>
        <input id="profile-target" type="number" min={10} max={990} step={5} value={targetScore} onChange={(event) => setTargetScore(event.target.value)} required className="input" />
        <p className="text-xs text-slate-500 mt-1">Đồng bộ đa thiết bị — Dashboard và Analytics cùng dùng mục tiêu này.</p>
      </div>
      <button disabled={savingProfile} className="btn-primary">{savingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Lưu thay đổi</button>
      {profileMessage && <p className="text-sm text-slate-600">{profileMessage}</p>}
    </form>
    <form onSubmit={submitPassword} className="card space-y-4"><div className="flex items-center gap-3"><Lock className="text-primary-600" /><h2 className="font-bold">Đổi mật khẩu</h2></div><input type="password" required minLength={8} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder="Mật khẩu hiện tại" className="input" /><input type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mật khẩu mới, ít nhất 8 ký tự" className="input" /><button className="btn-primary">Cập nhật mật khẩu</button>{message && <p className="text-sm text-slate-600">{message}</p>}</form>
  </div>;
}
