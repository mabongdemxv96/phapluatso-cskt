/**
 * Trợ lý AI Hỏi đáp & Tra cứu Pháp luật
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 * Tích hợp Trí tuệ Nhân tạo hỗ trợ cán bộ, chiến sĩ và nhân dân 24/7
 */

const AIChatbot = {
  // Khóa Gemini KHÔNG nằm trong mã nguồn website: mọi câu hỏi đi qua proxy (xem thư mục proxy/).
  // Địa chỉ proxy khai báo trong js/config.js
  proxyUrl: (window.CSKT_CONFIG && window.CSKT_CONFIG.aiProxyUrl) || '',
  chatHistory: [],
  isGenerating: false,

  init() {
    this.chatWidget = document.getElementById('ai-chat-widget');
    this.chatBody = document.getElementById('ai-chat-messages');
    this.chatInput = document.getElementById('ai-chat-input');
    this.btnSend = document.getElementById('btn-send-chat');
    this.btnToggleChat = document.getElementById('btn-toggle-ai-chat');
    this.btnCloseChat = document.getElementById('btn-close-ai-chat');

    this.bindEvents();
    this.renderQuickPrompts();
  },

  bindEvents() {
    // Toggle Chat Window
    if (this.btnToggleChat) {
      this.btnToggleChat.addEventListener('click', () => this.toggleChat());
    }
    if (this.btnCloseChat) {
      this.btnCloseChat.addEventListener('click', () => this.closeChat());
    }

    // Send Message
    if (this.btnSend && this.chatInput) {
      this.btnSend.addEventListener('click', () => this.handleSendMessage());
      this.chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this.handleSendMessage();
        }
      });
    }
  },

  toggleChat() {
    if (!this.chatWidget) return;
    if (this.chatWidget.classList.contains('hidden')) {
      this.chatWidget.classList.remove('hidden');
      if (window.innerWidth >= 640) this.chatInput.focus();
      if (window.ChibiMascot) {
        window.ChibiMascot.speak("Chào đồng chí! Tôi là Trợ lý Pháp luật số của Đoàn cơ sở Phòng CSKT Công an tỉnh Gia Lai. Đồng chí cần giải đáp quy định gì ạ?");
      }
      if (window.AppDiagnostics) {
        window.AppDiagnostics.logAction('Mở khung chat Trợ lý AI Hỏi đáp');
      }
    } else {
      this.closeChat();
    }
  },

  closeChat() {
    if (this.chatWidget) {
      this.chatWidget.classList.add('hidden');
    }
  },

  renderQuickPrompts() {
    const container = document.getElementById('ai-quick-prompts');
    if (!container || !window.APP_DATA || !window.APP_DATA.quickPrompts) return;

    let html = '';
    window.APP_DATA.quickPrompts.forEach(item => {
      html += `
        <button onclick="AIChatbot.askQuestion('${item.prompt.replace(/'/g, "\\'")}')" class="px-2.5 py-1.5 bg-slate-800/90 hover:bg-blue-900/60 text-slate-300 hover:text-amber-300 text-[11px] rounded-lg border border-slate-700/80 hover:border-amber-400/40 text-left transition whitespace-nowrap shadow-sm">
          💡 ${item.title}
        </button>
      `;
    });
    container.innerHTML = html;
  },

  askQuestion(text) {
    if (this.chatWidget && this.chatWidget.classList.contains('hidden')) {
      this.toggleChat();
    }
    this.chatInput.value = text;
    this.handleSendMessage();
  },

  async handleSendMessage() {
    if (this.isGenerating) return;
    const message = this.chatInput.value.trim();
    if (!message) return;

    this.chatInput.value = '';
    this.addUserMessage(message);
    this.isGenerating = true;
    this.btnSend.disabled = true;

    if (window.AppDiagnostics) {
      window.AppDiagnostics.logAction(`Người dùng gửi câu hỏi AI: "${message}"`);
    }

    // Show AI typing indicator
    const typingId = this.addTypingIndicator();

    try {
      let reply = '';
      let online = true;
      try {
        reply = await this.callAIEndpoint(message);
      } catch (err) {
        console.warn("Không gọi được Trợ lý AI, chuyển sang trả lời offline:", err);
        online = false;
        reply = await this.getOfflineSmartAnswer(message);
      }

      // Ghi nhớ hội thoại ngắn để câu hỏi tiếp theo hiểu đúng ngữ cảnh
      if (online) this.rememberTurn(message, reply);

      this.removeTypingIndicator(typingId);
      this.addAiMessage(reply);
    } catch (err) {
      this.removeTypingIndicator(typingId);
      console.error("Lỗi AI Chatbot:", err);
      this.addAiMessage("Kính chào đồng chí! Hiện tại hệ thống đang kết nối đường truyền nội bộ, đồng chí vui lòng thử lại hoặc bấm vào các câu hỏi gợi ý nhanh bên dưới.");
    } finally {
      this.isGenerating = false;
      this.btnSend.disabled = false;
    }
  },

  // Lưu tối đa 3 lượt hỏi đáp gần nhất (cắt ngắn) để tiết kiệm token
  MAX_TURNS: 3,
  rememberTurn(question, answer) {
    const clip = (s, n) => (s.length > n ? s.slice(0, n) + '…' : s);
    this.chatHistory.push(
      { role: 'user', text: clip(question, 600) },
      { role: 'model', text: clip(answer, 900) }
    );
    const max = this.MAX_TURNS * 2;
    if (this.chatHistory.length > max) this.chatHistory = this.chatHistory.slice(-max);
  },

  SYSTEM_PROMPT: `Bạn là "Trợ lý Pháp luật số" của Đoàn cơ sở Phòng Cảnh sát kinh tế – Công an tỉnh Gia Lai, hỗ trợ cán bộ, chiến sĩ và người dân tra cứu pháp luật Việt Nam.
Cách trả lời:
- Xưng "tôi", gọi người hỏi là "đồng chí"; giọng chuẩn mực, thân thiện.
- Ngắn gọn, đúng trọng tâm: tối đa khoảng 120 từ, ưu tiên 2–5 gạch đầu dòng. Không chào hỏi dài, không nhắc lại câu hỏi, không lan man.
- Nêu căn cứ ngắn (Điều/Khoản, tên luật, nghị định) khi có; mức phạt, thời hạn ghi bằng số cụ thể.
- Chỉ trả lời chi tiết hơn khi người hỏi yêu cầu.
- Nếu không chắc chắn hoặc quy định có thể đã thay đổi, nói rõ và khuyên đối chiếu văn bản hiện hành.
- Câu hỏi ngoài lĩnh vực pháp luật: trả lời rất ngắn rồi gợi ý quay lại chủ đề pháp luật.
- Dùng Markdown đơn giản (gạch đầu dòng, **in đậm** ý chính).`,

  async callAIEndpoint(userPrompt) {
    if (!this.proxyUrl) throw new Error('Chưa cấu hình aiProxyUrl trong js/config.js');

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(this.proxyUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          system: this.SYSTEM_PROMPT,
          messages: [...this.chatHistory, { role: 'user', text: userPrompt }]
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.text) throw new Error(data.error || `Proxy lỗi ${response.status}`);
      return data.text;
    } finally {
      clearTimeout(timer);
    }
  },

  async getOfflineSmartAnswer(query) {
    await new Promise(r => setTimeout(r, 400));
    const q = query.toLowerCase();

    if (q.includes("thời hiệu") || (q.includes("xử phạt") && q.includes("hành chính")) || q.includes("điều 6")) {
      return window.APP_DATA.offlineAiAnswers["thoi-hieu-vphc"];
    } else if (q.includes("môi trường điện tử") || q.includes("điều 18a") || q.includes("phạt nguội") || q.includes("biên bản điện tử")) {
      return window.APP_DATA.offlineAiAnswers["moi-truong-dien-tu"];
    } else if (q.includes("tổ chức") && (q.includes("cá nhân") || q.includes("mức phạt") || q.includes("gấp 2") || q.includes("gấp đôi"))) {
      return window.APP_DATA.offlineAiAnswers["muc-phat-to-chuc"];
    } else if (q.includes("trốn thuế") || q.includes("200")) {
      return window.APP_DATA.offlineAiAnswers["tron-thue"];
    } else if (q.includes("cho vay") || q.includes("nặng lãi") || q.includes("lãi nặng") || q.includes("tín dụng đen") || q.includes("201")) {
      return window.APP_DATA.offlineAiAnswers["vay-nang-lai"];
    } else if (q.includes("rửa tiền") || q.includes("324")) {
      return window.APP_DATA.offlineAiAnswers["rua-tien"];
    } else if (q.includes("nghị quyết 57") || q.includes("57-nq/tw") || q.includes("nq 57")) {
      return window.APP_DATA.offlineAiAnswers["nghi-quyet-57"];
    } else {
      return `Xin lỗi đồng chí, **kết nối AI đang tạm gián đoạn** nên tôi chưa trả lời được câu hỏi này. Đồng chí vui lòng thử lại sau ít phút, hoặc dùng **Thanh tìm kiếm** để tra cứu điều luật.`;
    }
  },

  addUserMessage(text) {
    const msgEl = document.createElement('div');
    msgEl.className = 'flex justify-end mb-3';
    msgEl.innerHTML = `
      <div class="keep-dark max-w-[85%] bg-blue-700 text-white px-3.5 py-2.5 rounded-2xl rounded-tr-none text-xs leading-relaxed shadow chat-bubble-tail-right">
        ${this.escapeHtml(text)}
      </div>
    `;
    this.chatBody.appendChild(msgEl);
    this.scrollToBottom();
  },

  addAiMessage(markdownText) {
    const msgEl = document.createElement('div');
    msgEl.className = 'flex items-start gap-2.5 mb-4';
    msgEl.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-slate-800 p-0.5 flex-shrink-0 border-2 border-amber-400/80 shadow overflow-hidden flex items-center justify-center">
        <img src="assets/images/logo-cskt.png" class="w-full h-full object-contain" alt="CSKT Logo" />
      </div>
      <div class="max-w-[88%] bg-slate-800/95 text-slate-100 border border-slate-700/80 px-3.5 py-3 rounded-2xl rounded-tl-none text-xs leading-relaxed shadow chat-bubble-tail-left">
        <div class="text-[10px] font-bold text-amber-300 uppercase tracking-wider mb-1 flex items-center justify-between">
          <span>Đoàn cơ sở Phòng CSKT Công an tỉnh Gia Lai</span>
          <span class="text-slate-400 font-normal">Vừa xong</span>
        </div>
        <div class="prose prose-invert prose-xs text-slate-200">
          ${this.formatMarkdown(markdownText)}
        </div>
      </div>
    `;
    this.chatBody.appendChild(msgEl);
    this.scrollToBottom();
  },

  addTypingIndicator() {
    const id = `typing-${Date.now()}`;
    const el = document.createElement('div');
    el.id = id;
    el.className = 'flex items-start gap-2.5 mb-3';
    el.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-slate-800 p-0.5 flex-shrink-0 border-2 border-amber-400/80 shadow overflow-hidden flex items-center justify-center">
        <img src="assets/images/logo-cskt.png" class="w-full h-full object-contain" alt="CSKT Logo" />
      </div>
      <div class="bg-slate-800 px-4 py-2.5 rounded-2xl rounded-tl-none text-xs text-slate-300 flex items-center gap-1.5 shadow">
        <span>Đang phân tích điều luật và quy định</span>
        <span class="inline-flex gap-1 ml-1">
          <span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce"></span>
          <span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.2s]"></span>
          <span class="w-1.5 h-1.5 bg-amber-400 rounded-full animate-bounce [animation-delay:0.4s]"></span>
        </span>
      </div>
    `;
    this.chatBody.appendChild(el);
    this.scrollToBottom();
    return id;
  },

  removeTypingIndicator(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
  },

  scrollToBottom() {
    if (this.chatBody) {
      this.chatBody.scrollTop = this.chatBody.scrollHeight;
    }
  },

  escapeHtml(str) {
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag)
    );
  },

  formatMarkdown(text) {
    if (!text) return '';
    let out = this.escapeHtml(text).replace(/&#39;/g, "'").replace(/&quot;/g, '"');

    // Code blocks ``` ... ```
    out = out.replace(/```(?:[a-z]*\n)?([\s\S]*?)```/g, '<pre class="bg-slate-900/90 p-2.5 rounded text-[11px] font-mono text-amber-200 overflow-x-auto my-2 border border-slate-700"><code>$1</code></pre>');
    // Inline code `...`
    out = out.replace(/`([^`]+)`/g, '<code class="bg-slate-900 px-1 py-0.5 rounded text-amber-300 font-mono text-[11px]">$1</code>');

    // Headings
    out = out.replace(/^### (.*$)/gim, '<h4 class="text-amber-300 font-bold text-xs mt-3 mb-1 flex items-center gap-1.5"><i class="fa-solid fa-angle-right text-amber-400 text-[10px]"></i> $1</h4>');
    out = out.replace(/^## (.*$)/gim, '<h3 class="text-amber-300 font-bold text-sm mt-3 mb-1.5 pb-1 border-b border-slate-700/60">$1</h3>');
    out = out.replace(/^# (.*$)/gim, '<h2 class="text-amber-300 font-bold text-base mt-3.5 mb-2 pb-1 border-b border-amber-400/40">$1</h2>');

    // Bold text (**text**)
    out = out.replace(/\*\*(.*?)\*\*/g, '<strong class="text-amber-300 font-semibold">$1</strong>');

    // Bullet list items (* or -) - must run before single italic *
    out = out.replace(/^\s*[\*\-]\s+(.*)$/gim, '<li class="ml-4 list-disc text-slate-200 mb-1 leading-relaxed">$1</li>');

    // Numbered list items (1. 2.)
    out = out.replace(/^\s*(\d+)\.\s+(.*)$/gim, '<li class="ml-4 list-decimal text-slate-200 mb-1 leading-relaxed"><span class="text-amber-200 font-medium">$2</span></li>');

    // Italic (*text*)
    out = out.replace(/\*(.*?)\*/g, '<em class="text-slate-300">$1</em>');

    // Paragraphs and line breaks
    out = out.replace(/\n\n+/g, '<div class="h-2.5"></div>');
    out = out.replace(/\n/g, '<br/>');

    return out;
  }
};

window.AIChatbot = AIChatbot;
