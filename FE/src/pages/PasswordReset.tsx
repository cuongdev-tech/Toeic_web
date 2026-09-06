import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { fetchApi } from '../lib/api';

export default function PasswordReset() {
  const [params] = useSearchParams();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState(params.get('token') || '');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');

  const request = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetchApi('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
      if (response.resetToken) setToken(response.resetToken);
      setMessage(response.message);
    } catch (error: any) { setMessage(error.message || 'Không thể xử lý yêu cầu.'); }
  };

  const reset = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const response = await fetchApi('/auth/reset-password', { method: 'POST', body: JSON.stringify({ token, newPassword }) });
      setMessage(response.message);
    } catch (error: any) { setMessage(error.message || 'Token không hợp lệ.'); }
  };

  return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-slate-50 p-6"><div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-8 space-y-6"><div><h1 className="text-2xl font-bold text-slate-900">Khôi phục mật khẩu</h1><p className="text-sm text-slate-500 mt-1">Token có hiệu lực trong 30 phút.</p></div><form onSubmit={request} className="space-y-3"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email tài khoản" className="w-full border border-slate-200 rounded-lg px-3 py-2" /><button className="w-full bg-indigo-600 text-white rounded-lg py-2">Gửi yêu cầu</button></form>{token && <form onSubmit={reset} className="border-t border-slate-100 pt-5 space-y-3"><input required value={token} onChange={(event) => setToken(event.target.value)} placeholder="Reset token" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs" /><input required minLength={8} type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="Mật khẩu mới" className="w-full border border-slate-200 rounded-lg px-3 py-2" /><button className="w-full bg-slate-900 text-white rounded-lg py-2">Đặt lại mật khẩu</button></form>}{message && <p className="text-sm text-slate-600">{message}</p>}<Link to="/login" className="block text-center text-sm text-indigo-600">Quay lại đăng nhập</Link></div></div>;
}
