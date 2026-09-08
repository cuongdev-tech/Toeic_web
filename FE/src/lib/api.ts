export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api/v1';

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token');

  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const headers = new Headers(options.headers || {});
  // Không ép Content-Type khi gửi FormData để trình duyệt tự gắn multipart boundary
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch {
    // fetch() ném TypeError: Failed to fetch khi không tới được backend
    // (BE chưa chạy, sai VITE_API_BASE_URL, CORS, mất mạng...)
    throw new Error(
      `Không kết nối được tới máy chủ API (${API_BASE_URL}${endpoint}). Hãy chắc chắn backend đang chạy và kiểm tra lại VITE_API_BASE_URL.`,
    );
  }

  if ((response.status === 401 || response.status === 403) && endpoint !== '/auth/login' && endpoint !== '/auth/refresh') {
    const refreshToken = localStorage.getItem('refreshToken');
    if (refreshToken) {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (refreshResponse.ok) {
        const refreshData = await refreshResponse.json();
        const newToken = refreshData.token || refreshData.data?.token;
        if (newToken) {
          localStorage.setItem('token', newToken);
          headers.set('Authorization', `Bearer ${newToken}`);
          response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });
        }
      } else if (refreshResponse.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
      }
    }
  }

  // Đọc dạng text trước để phòng hờ response bị rỗng hoặc trả về HTML lỗi
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch (error) {
    data = { success: false, message: text || 'Lỗi phản hồi từ máy chủ.' };
  }

  if (!response.ok) {
    throw new Error(data.message || 'Có lỗi xảy ra từ máy chủ.');
  }

  return data;
}