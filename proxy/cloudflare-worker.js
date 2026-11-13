/**
 * Proxy giấu khóa Gemini cho Trợ lý Pháp luật số
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 *
 * Chạy trên Cloudflare Workers (miễn phí). Khóa Gemini lưu trong biến bí mật
 * GEMINI_API_KEY của Worker, không bao giờ xuất hiện trong mã nguồn website.
 *
 * Biến môi trường (Settings → Variables and Secrets):
 *   GEMINI_API_KEY   (Secret, bắt buộc)  Khóa tạo tại https://aistudio.google.com
 *   ALLOWED_ORIGINS  (Text, khuyên dùng) Danh sách địa chỉ website được phép gọi, cách nhau dấu phẩy
 *                    ví dụ: https://mabongdemxv96.github.io,http://localhost:8000
 */

const MODELS = ['gemini-2.5-flash', 'gemini-flash-latest'];
const MAX_MESSAGES = 8;          // tối đa 8 tin nhắn lịch sử
const MAX_CHARS_PER_MESSAGE = 2000;
const MAX_SYSTEM_CHARS = 3000;
const MAX_OUTPUT_TOKENS = 800;

// Giới hạn đơn giản theo IP (trong bộ nhớ của từng máy chủ Cloudflare): 20 câu hỏi / phút
const RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;
const hits = new Map();

function rateLimited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < RATE_WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > RATE_LIMIT;
}

function corsHeaders(origin, env) {
  const allowed = (env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  const ok = allowed.length === 0 || allowed.includes(origin);
  return {
    ok,
    headers: {
      'Access-Control-Allow-Origin': ok ? (origin || '*') : 'null',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    }
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

function clean(text, max) {
  return String(text || '').slice(0, max);
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors.headers });
    if (request.method !== 'POST') return json({ error: 'Chỉ hỗ trợ POST' }, 405, cors.headers);
    if (!cors.ok) return json({ error: 'Website này chưa được phép sử dụng Trợ lý AI' }, 403, cors.headers);
    if (!env.GEMINI_API_KEY) return json({ error: 'Proxy chưa được cấu hình GEMINI_API_KEY' }, 500, cors.headers);

    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    if (rateLimited(ip)) return json({ error: 'Đồng chí gửi câu hỏi quá nhanh, vui lòng chờ 1 phút' }, 429, cors.headers);

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return json({ error: 'Dữ liệu gửi lên không hợp lệ' }, 400, cors.headers);
    }

    // Chỉ chấp nhận hội thoại văn bản, cắt ngắn để chống lạm dụng và tiết kiệm token
    const messages = Array.isArray(body.messages) ? body.messages.slice(-MAX_MESSAGES) : [];
    const contents = messages
      .filter(m => m && (m.role === 'user' || m.role === 'model') && typeof m.text === 'string' && m.text.trim())
      .map(m => ({ role: m.role, parts: [{ text: clean(m.text, MAX_CHARS_PER_MESSAGE) }] }));
    if (!contents.length || contents[contents.length - 1].role !== 'user') {
      return json({ error: 'Thiếu câu hỏi' }, 400, cors.headers);
    }

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };
    if (body.system) payload.systemInstruction = { parts: [{ text: clean(body.system, MAX_SYSTEM_CHARS) }] };

    let lastError = 'Không gọi được Gemini';
    for (const model of MODELS) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          lastError = (data.error && data.error.message) || `Gemini lỗi ${res.status}`;
          continue;
        }
        const parts = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts;
        const text = parts ? parts.map(p => p.text || '').join('') : '';
        if (text) return json({ text, model }, 200, cors.headers);
        lastError = 'Gemini không trả về nội dung';
      } catch (e) {
        lastError = e.message || String(e);
      }
    }
    return json({ error: lastError }, 502, cors.headers);
  }
};
