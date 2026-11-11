/**
 * Trợ lý AI Hỏi đáp & Tra cứu Pháp luật
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 * Tích hợp Trí tuệ Nhân tạo hỗ trợ cán bộ, chiến sĩ và nhân dân 24/7
 */

const AIChatbot = {
  apiKey: 'AIzaSyDaNVqhGh-HhyWvcqc1QseCavbGoAHqmjA',
  model: 'gemini-2.5-flash',
  fallbackModel: 'gemini-flash-latest',
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

    // Truy hồi căn cứ pháp lý nguyên văn từ thư viện văn bản gốc
    const sources = window.LegalLibrary ? LegalLibrary.retrieve(message, 5) : [];

    try {
      let reply = '';
      let offline = false;
      try {
        reply = await this.callAIEndpoint(message, this.model, sources);
      } catch (err1) {
        console.warn(`Thử model ${this.model} không thành công, chuyển sang ${this.fallbackModel}:`, err1);
        try {
          reply = await this.callAIEndpoint(message, this.fallbackModel, sources);
        } catch (err2) {
          console.warn("Chuyển sang chế độ dữ liệu chuyên gia offline:", err2);
          offline = true;
          reply = await this.getOfflineSmartAnswer(message, sources);
        }
      }

      this.removeTypingIndicator(typingId);
      this.addAiMessage(reply, offline ? [] : sources);
    } catch (err) {
      this.removeTypingIndicator(typingId);
      console.error("Lỗi AI Chatbot:", err);
      this.addAiMessage("Kính chào đồng chí! Hiện tại hệ thống đang kết nối đường truyền nội bộ, đồng chí vui lòng thử lại hoặc bấm vào các câu hỏi gợi ý nhanh bên dưới.");
    } finally {
      this.isGenerating = false;
      this.btnSend.disabled = false;
    }
  },

  buildSourceContext(sources) {
    if (!sources || !sources.length) {
      return `KHÔNG tìm thấy điều luật liên quan trong thư viện văn bản gốc của đơn vị cho câu hỏi này.
Hãy nói rõ điều đó ở đầu câu trả lời ("Thư viện văn bản gốc chưa có điều luật tương ứng"), chỉ đưa ra định hướng chung mang tính tham khảo, KHÔNG được đặt nội dung trong ngoặc kép như trích dẫn nguyên văn, và khuyến nghị đồng chí đối chiếu văn bản gốc.`;
    }
    const MAX = 14000;
    let used = 0;
    const blocks = [];
    sources.forEach((s, i) => {
      let text = s.unit.text;
      if (used + text.length > MAX) text = text.slice(0, Math.max(800, MAX - used)) + ' […]';
      used += text.length;
      blocks.push(`[Nguồn ${i + 1}] ${LegalLibrary.citationLabel(s.unit, s.doc)} (trang ${s.unit.page})\n${text}`);
    });
    return `CÁC CĂN CỨ PHÁP LÝ NGUYÊN VĂN (trích từ file PDF gốc của đơn vị):\n\n${blocks.join('\n\n---\n\n')}`;
  },

  async callAIEndpoint(userPrompt, modelName, sources = []) {
    const systemPrompt = `Bạn là "Trợ lý Pháp luật số" của Đoàn cơ sở Phòng Cảnh sát kinh tế – Công an tỉnh Gia Lai (công trình thanh niên tiên phong thực hiện Nghị quyết số 57-NQ/TW của Bộ Chính trị về đổi mới sáng tạo, phát triển khoa học công nghệ và chuyển đổi số).
Quy tắc trả lời bắt buộc:
1. Luôn giữ phong thái chuẩn mực, trang trọng của người chiến sĩ Công an nhân dân Việt Nam, xưng "tôi" và gọi người dùng là "đồng chí" hoặc "quý công dân".
2. Giải đáp chính xác, khách quan, súc tích và có cấu trúc rõ ràng các vấn đề pháp luật theo hệ thống pháp luật Việt Nam:
   - Luật Xử lý vi phạm hành chính (hợp nhất Công báo mới nhất 2025 theo Luật số 88/2025/QH15, đặc biệt Điều 6 về thời hiệu xử phạt, Điều 18a về xử lý VPHC trên môi trường điện tử).
   - Bộ luật Hình sự về các tội danh trật tự quản lý kinh tế (Điều 188 Buôn lậu, Điều 190 Hàng cấm, Điều 192 Hàng giả, Điều 200 Trốn thuế, Điều 201 Cho vay lãi nặng, Điều 324 Rửa tiền, Điều 222 Đấu thầu...).
   - Nghị quyết số 57-NQ/TW về đột phá khoa học công nghệ và chuyển đổi số.
3. Luôn chỉ rõ căn cứ điều luật cụ thể (Điều, Khoản, Luật/Nghị định).
4. Phân tích trọng tâm câu hỏi của đồng chí, nêu rõ các mốc thời gian, mức phạt, điều kiện áp dụng. Trả lời đầy đủ toàn bộ nội dung, không ngắt quãng giữa chừng.
5. Định dạng câu trả lời rõ ràng bằng Markdown (dùng gạch đầu dòng, in đậm các ý chính).
6. QUY TẮC TRÍCH DẪN TUYỆT ĐỐI: Khi có "CÁC CĂN CỨ PHÁP LÝ NGUYÊN VĂN" đi kèm câu hỏi, chỉ được dùng các nguồn đó làm căn cứ. Mọi trích dẫn phải chép NGUYÊN VĂN từng chữ trong ngoặc kép và ghi rõ [Nguồn n], Điều, Khoản, Điểm. Không tự suy diễn mức phạt, số điều, thời hạn không có trong nguồn. Nếu nguồn không đủ để trả lời, phải nói rõ phần nào chưa có căn cứ trong thư viện.`;

    const contextBlock = this.buildSourceContext(sources);
    const fullPrompt = `${contextBlock}\n\n=====\nCÂU HỎI CỦA ĐỒNG CHÍ: ${userPrompt}`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.apiKey.trim()}`;

    const requestBody = {
      systemInstruction: {
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: fullPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.25,
        maxOutputTokens: 4096,
        thinkingConfig: { thinkingBudget: 0 }
      }
    };

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const msg = errorJson.error ? errorJson.error.message : response.statusText;
      throw new Error(msg);
    }

    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts.length > 0) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Không nhận được nội dung hợp lệ.");
    }
  },

  async getOfflineSmartAnswer(query, sources = []) {
    await new Promise(r => setTimeout(r, 400));

    // Ưu tiên trả lời bằng nguyên văn điều luật trích từ văn bản gốc
    if (sources.length) {
      const parts = sources.slice(0, 3).map((s, i) =>
        `### [Nguồn ${i + 1}] ${LegalLibrary.citationLabel(s.unit, s.doc)}\n*Trang ${s.unit.page} – tệp gốc: ${s.doc.fileName}*\n\n${s.unit.text}`
      );
      return `Kính chào đồng chí! Đường truyền tới máy chủ AI đang gián đoạn, tôi xin cung cấp **nguyên văn các căn cứ pháp lý** liên quan nhất trong thư viện văn bản gốc của đơn vị:\n\n${parts.join('\n\n')}`;
    }

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
      return `Kính chào đồng chí! Tôi là **Trợ lý Pháp luật số** của Đoàn cơ sở Phòng Cảnh sát kinh tế – Công an tỉnh Gia Lai.\n\nĐồng chí có thể tra cứu nhanh các quy định trọng tâm bằng các nút gợi ý câu hỏi bên dưới hoặc tra cứu trực tiếp các Điều luật trong Tủ sách 3D:\n- **Luật Xử lý vi phạm hành chính 2025** (Thời hiệu, nguyên tắc xử phạt, môi trường điện tử)\n- **Bộ luật Hình sự** (Tội buôn lậu Đ188, Trốn thuế Đ200, Cho vay lãi nặng Đ201, Rửa tiền Đ324)\n- **Nghị quyết số 57-NQ/TW** về chuyển đổi số.`;
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

  renderCitations(sources) {
    if (!sources || !sources.length) return '';
    const esc = LegalLibrary.escapeHtml;
    const items = sources.map((s, i) => `
      <details class="citation-item">
        <summary>
          <span class="citation-num">${i + 1}</span>
          <span class="flex-1">${esc(LegalLibrary.citationLabel(s.unit, s.doc))}</span>
        </summary>
        <div class="verbatim-text text-[11px] mt-2">${esc(s.unit.text)}</div>
        <div class="flex flex-wrap gap-1.5 mt-2">
          <button onclick="LawSearch.copyUnit('${s.unit.id}')" class="citation-btn"><i class="fa-regular fa-copy"></i> Sao chép</button>
          <button onclick="AIChatbot.openSource('${s.doc.id}', ${s.unit.page})" class="citation-btn is-primary"><i class="fa-solid fa-book-open"></i> Mở trang ${s.unit.page} bản gốc</button>
        </div>
      </details>`).join('');
    return `
      <div class="citation-box">
        <div class="citation-head"><i class="fa-solid fa-file-shield"></i> Căn cứ pháp lý – trích nguyên văn từ văn bản gốc</div>
        ${items}
      </div>`;
  },

  openSource(docId, page) {
    const book = window.Bookshelf ? Bookshelf.findBook(docId) : null;
    if (!book) return;
    if (window.innerWidth < 640) this.closeChat();
    Flipbook.openBook(book, page - 1);
  },

  addAiMessage(markdownText, sources = []) {
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
        ${this.renderCitations(sources)}
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
