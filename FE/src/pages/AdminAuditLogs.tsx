import React, { useEffect, useState } from 'react';
import { ClipboardList, Loader2 } from 'lucide-react';
import { fetchApi } from '../lib/api';

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApi('/admin/audit-logs')
      .then((response) => setLogs(response.data?.logs || []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-primary-600" /></div>;

  return <div className="page page-xl space-y-6"><div><h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2"><ClipboardList className="text-primary-600" /> Nhật ký Admin</h1><p className="text-slate-500 mt-1">Theo dõi các thao tác bảo mật trên hệ thống.</p></div><div className="bg-surface border border-slate-200 rounded-card shadow-card overflow-hidden"><div className="divide-y divide-slate-100">{logs.map((log) => <div key={log.id} className="p-5 grid grid-cols-1 md:grid-cols-[180px_1fr_220px] gap-3 items-center"><div className="text-sm font-semibold text-slate-800">{log.action}</div><div><p className="text-sm text-slate-700">{log.entity}{log.entityId ? ` #${log.entityId}` : ''}</p><p className="text-xs text-slate-400 mt-1">{log.actor?.fullName || log.actor?.email || 'Admin'}</p></div><time className="text-xs text-slate-500 md:text-right">{new Date(log.createdAt).toLocaleString('vi-VN')}</time></div>)}{logs.length === 0 && <p className="p-10 text-center text-slate-500">Chưa có thao tác nào được ghi nhận.</p>}</div></div></div>;
}
