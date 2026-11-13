/**
 * Module Chẩn đoán & Ghi vết Lỗi thời gian thực (Real-time Diagnostics & Error Tracker)
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 * Mục đích: Tự động ghi lại mọi thao tác, phát hiện và hiển thị chi tiết lỗi khi người dùng sử dụng
 */

const AppDiagnostics = {
  logs: [],
  errors: [],
  maxLogs: 150,

  init() {
    this.setupGlobalErrorCatchers();
    this.createDiagnosticUI();
    this.log('SYSTEM', 'Khởi động hệ thống chẩn đoán và theo dõi thao tác người dùng.');
    
    // Check modules health after DOM fully loads
    window.addEventListener('load', () => {
      this.runHealthCheck();
    });

    // Keyboard shortcut to toggle diagnostics: Ctrl + Shift + D
    window.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'D' || e.key === 'd')) {
        e.preventDefault();
        this.toggleModal();
      }
    });
  },

  setupGlobalErrorCatchers() {
    // 1. Catch uncaught JavaScript runtime errors
    window.addEventListener('error', (event) => {
      const errObj = {
        time: new Date().toLocaleTimeString(),
        type: 'RUNTIME_ERROR',
        message: event.message || 'Lỗi không xác định',
        filename: event.filename || 'unknown',
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error && event.error.stack ? event.error.stack : 'Không có stack trace'
      };
      this.errors.push(errObj);
      this.log('ERROR', `[Lỗi JS] ${errObj.message} (${errObj.filename}:${errObj.lineno})`, errObj);
      this.updateBadge();
    });

    // 2. Catch unhandled Promise rejections (e.g., fetch, PDF load, Audio)
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      const errObj = {
        time: new Date().toLocaleTimeString(),
        type: 'PROMISE_REJECTION',
        message: (reason && reason.message) ? reason.message : String(reason),
        stack: (reason && reason.stack) ? reason.stack : 'N/A'
      };
      this.errors.push(errObj);
      this.log('ERROR', `[Lỗi Promise] ${errObj.message}`, errObj);
      this.updateBadge();
    });

    // 3. Mirror console.error
    const originalConsoleError = console.error;
    console.error = (...args) => {
      this.log('ERROR', args.map(a => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' '));
      originalConsoleError.apply(console, args);
    };
  },

  log(category, message, details = null) {
    const entry = {
      id: Date.now() + Math.random(),
      time: new Date().toLocaleTimeString(),
      category,
      message,
      details
    };
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.pop();
    }
    this.renderLogsToUI();
  },

  logAction(actionName, details = null) {
    this.log('ACTION', `[Thao tác người dùng] ${actionName}`, details);
  },

  runHealthCheck() {
    const checks = [];

    // Check 1: Data source
    const hasData = typeof window.APP_DATA !== 'undefined' && Array.isArray(window.APP_DATA.books);
    checks.push({
      name: 'Dữ liệu Pháp luật số (APP_DATA)',
      status: hasData && window.APP_DATA.books.length > 0,
      details: hasData ? `Đã nạp ${window.APP_DATA.books.length} sách và ${window.APP_DATA.laws.length} điều luật.` : 'Chưa tìm thấy APP_DATA'
    });

    // Check 2: Bookshelf
    const hasBookshelf = typeof window.Bookshelf !== 'undefined';
    const shelfRendered = document.querySelectorAll('.book-3d').length > 0;
    checks.push({
      name: 'Không gian Giá sách 3D (Bookshelf)',
      status: hasBookshelf && shelfRendered,
      details: hasBookshelf ? `Đã dựng kệ sách với ${document.querySelectorAll('.book-3d').length} cuốn sách hiển thị.` : 'Module Bookshelf chưa khởi tạo.'
    });

    // Check 3: Flipbook
    const hasFlipbook = typeof window.Flipbook !== 'undefined';
    checks.push({
      name: 'Trình đọc sách lật 3D (Flipbook)',
      status: hasFlipbook,
      details: hasFlipbook ? 'Sẵn sàng mở sách 3D hai trang và hiệu ứng lật trang.' : 'Module Flipbook chưa khởi tạo.'
    });

    // Check 4: Search Engine
    const hasSearch = typeof window.LawSearch !== 'undefined';
    checks.push({
      name: 'Module Tra cứu Điều luật (Search)',
      status: hasSearch,
      details: hasSearch ? 'Sẵn sàng tìm kiếm theo điều, tội danh, từ khóa.' : 'Module Search chưa khởi tạo.'
    });

    // Check 5: AI Chatbot
    const hasChat = typeof window.AIChatbot !== 'undefined';
    checks.push({
      name: 'Trợ lý AI Hỏi đáp (AIChatbot)',
      status: hasChat && !!window.AIChatbot.proxyUrl,
      details: !hasChat ? 'Module AIChatbot chưa khởi tạo.'
        : (window.AIChatbot.proxyUrl ? `Trợ lý AI kết nối qua proxy: ${window.AIChatbot.proxyUrl}` : 'Chưa khai báo aiProxyUrl trong js/config.js (xem proxy/HUONG-DAN.md).')
    });

    // Check 6: PDF.js Library
    const hasPdfJs = typeof window.pdfjsLib !== 'undefined';
    checks.push({
      name: 'Bộ nạp tệp PDF (PDF.js)',
      status: hasPdfJs,
      details: hasPdfJs ? 'Thư viện PDF.js đã sẵn sàng xử lý tệp PDF.' : 'PDF.js tải qua CDN (nếu mất mạng sẽ dùng trang HTML dựng sẵn).'
    });

    // Check 7: Web Audio API
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    checks.push({
      name: 'Âm thanh lật sách (Web Audio API)',
      status: !!AudioCtx,
      details: AudioCtx ? 'Trình duyệt hỗ trợ phát âm thanh lật sách.' : 'Trình duyệt không hỗ trợ Web Audio.'
    });

    this.renderHealthCheck(checks);
    this.updateBadge(checks);
    this.log('HEALTH', `Kiểm tra hoàn tất: ${checks.filter(c => c.status).length}/${checks.length} thành phần hoạt động tốt.`);
  },

  createDiagnosticUI() {
    // 1. Floating Badge in bottom-left
    const badge = document.createElement('div');
    badge.id = 'diag-badge';
    badge.className = 'fixed bottom-4 right-4 z-30 hidden md:flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/95 hover:bg-slate-800 text-slate-200 border border-slate-700/80 hover:border-amber-400/80 rounded-full text-[11px] font-sans shadow-2xl cursor-pointer transition select-none';
    badge.title = 'Bấm để mở Bảng Chẩn đoán & Ghi vết Lỗi (hoặc nhấn Ctrl + Shift + D)';
    badge.innerHTML = `
      <span id="diag-status-dot" class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
      <span id="diag-badge-text" class="font-semibold">Chẩn đoán: Đang kiểm tra...</span>
      <span class="text-slate-500 text-[10px] hidden sm:inline ml-1">(Ctrl+Shift+D)</span>
    `;
    badge.onclick = () => this.toggleModal();
    document.body.appendChild(badge);

    // 2. Diagnostic Modal
    const modal = document.createElement('div');
    modal.id = 'diag-modal';
    modal.className = 'hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 font-sans';
    modal.innerHTML = `
      <div class="w-full max-w-4xl bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <!-- Header -->
        <div class="px-5 py-3.5 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center">
              <i class="fa-solid fa-stethoscope text-base"></i>
            </div>
            <div>
              <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                BẢNG CHẨN ĐOÁN HỆ THỐNG &amp; GHI VẾT THAO TÁC
                <span class="px-2 py-0.5 bg-blue-600/30 text-blue-300 text-[10px] rounded-full font-normal border border-blue-500/30">CSKT Gia Lai 4.0</span>
              </h3>
              <p class="text-[11px] text-slate-400">Theo dõi trực tiếp trạng thái các module, thao tác mở sách và bắt lỗi chi tiết</p>
            </div>
          </div>
          <button onclick="AppDiagnostics.toggleModal()" class="p-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300">
            <i class="fa-solid fa-xmark text-lg"></i>
          </button>
        </div>

        <!-- Tabs Navigation -->
        <div class="flex items-center gap-2 px-5 pt-3 border-b border-slate-800 bg-slate-950/40 text-xs">
          <button id="tab-btn-health" onclick="AppDiagnostics.switchTab('health')" class="px-3.5 py-2 font-bold border-b-2 border-amber-400 text-amber-300 flex items-center gap-1.5">
            <i class="fa-solid fa-heart-pulse"></i> Kiểm tra thành phần (<span id="diag-count-health">0</span>)
          </button>
          <button id="tab-btn-actions" onclick="AppDiagnostics.switchTab('actions')" class="px-3.5 py-2 font-medium text-slate-400 hover:text-white flex items-center gap-1.5">
            <i class="fa-solid fa-list-check"></i> Nhật ký thao tác (<span id="diag-count-actions">0</span>)
          </button>
          <button id="tab-btn-errors" onclick="AppDiagnostics.switchTab('errors')" class="px-3.5 py-2 font-medium text-slate-400 hover:text-white flex items-center gap-1.5">
            <i class="fa-solid fa-triangle-exclamation"></i> Danh sách lỗi (<span id="diag-count-errors" class="text-emerald-400">0</span>)
          </button>
        </div>

        <!-- Tab 1: Health Check Panel -->
        <div id="tab-panel-health" class="p-5 overflow-y-auto space-y-2.5 flex-1 text-xs">
          <div class="mb-3 flex items-center justify-between">
            <span class="text-slate-400">Kiểm tra kết nối và tính sẵn sàng của các thành phần website:</span>
            <button onclick="AppDiagnostics.runHealthCheck()" class="px-3 py-1 bg-blue-600/40 hover:bg-blue-600/70 text-blue-200 border border-blue-500/40 rounded font-semibold transition flex items-center gap-1">
              <i class="fa-solid fa-arrows-rotate"></i> Kiểm tra lại
            </button>
          </div>
          <div id="diag-health-list" class="space-y-2"></div>
        </div>

        <!-- Tab 2: Action Log Panel -->
        <div id="tab-panel-actions" class="hidden p-5 overflow-y-auto space-y-2 flex-1 text-xs font-mono">
          <div class="mb-2 flex items-center justify-between font-sans">
            <span class="text-slate-400">Ghi lại toàn bộ hành động (click sách, lật trang, tra cứu):</span>
            <button onclick="AppDiagnostics.clearLogs()" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]">
              <i class="fa-solid fa-trash-can mr-1"></i> Xóa nhật ký
            </button>
          </div>
          <div id="diag-actions-list" class="space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-[11px] max-h-[350px] overflow-y-auto"></div>
        </div>

        <!-- Tab 3: Errors Panel -->
        <div id="tab-panel-errors" class="hidden p-5 overflow-y-auto space-y-3 flex-1 text-xs">
          <div id="diag-errors-list"></div>
        </div>

        <!-- Footer Actions Bar -->
        <div class="px-5 py-3 bg-slate-800/80 border-t border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex items-center gap-2">
            <button onclick="AppDiagnostics.testOpenFirstBook()" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition flex items-center gap-1.5 shadow">
              <i class="fa-solid fa-book-open"></i> Thử mở sách đầu tiên (Luật XLVPHC)
            </button>
            <button onclick="AppDiagnostics.testSearchLaw()" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 font-medium rounded-lg transition flex items-center gap-1.5">
              <i class="fa-solid fa-magnifying-glass"></i> Thử tra cứu Điều 18a
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button onclick="AppDiagnostics.copyReport()" class="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition flex items-center gap-1.5 shadow">
              <i class="fa-regular fa-copy"></i> Sao chép nhật ký chẩn đoán
            </button>
            <button onclick="AppDiagnostics.toggleModal()" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-lg">
              Đóng
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  switchTab(tabName) {
    ['health', 'actions', 'errors'].forEach(t => {
      const btn = document.getElementById(`tab-btn-${t}`);
      const panel = document.getElementById(`tab-panel-${t}`);
      if (t === tabName) {
        btn.classList.add('border-b-2', 'border-amber-400', 'text-amber-300', 'font-bold');
        btn.classList.remove('text-slate-400');
        panel.classList.remove('hidden');
      } else {
        btn.classList.remove('border-b-2', 'border-amber-400', 'text-amber-300', 'font-bold');
        btn.classList.add('text-slate-400');
        panel.classList.add('hidden');
      }
    });
  },

  renderHealthCheck(checks) {
    const list = document.getElementById('diag-health-list');
    const countEl = document.getElementById('diag-count-health');
    if (!list) return;

    countEl.textContent = `${checks.filter(c => c.status).length}/${checks.length}`;
    
    let html = '';
    checks.forEach(c => {
      const icon = c.status 
        ? '<i class="fa-solid fa-circle-check text-emerald-400 text-base"></i>' 
        : '<i class="fa-solid fa-circle-xmark text-red-400 text-base"></i>';
      const bg = c.status 
        ? 'bg-emerald-950/20 border-emerald-500/30' 
        : 'bg-red-950/30 border-red-500/40';

      html += `
        <div class="p-3 ${bg} border rounded-xl flex items-start gap-3">
          <div class="mt-0.5">${icon}</div>
          <div class="flex-1">
            <h5 class="font-bold text-white">${c.name}</h5>
            <p class="text-slate-300 text-[11px] mt-0.5">${c.details}</p>
          </div>
          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${c.status ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'}">
            ${c.status ? 'HOẠT ĐỘNG' : 'CHƯA SẴN SÀNG'}
          </span>
        </div>
      `;
    });
    list.innerHTML = html;
  },

  renderLogsToUI() {
    const actionsList = document.getElementById('diag-actions-list');
    const countActions = document.getElementById('diag-count-actions');
    const errorsList = document.getElementById('diag-errors-list');
    const countErrors = document.getElementById('diag-count-errors');

    if (countActions) countActions.textContent = this.logs.length;
    if (countErrors) {
      countErrors.textContent = this.errors.length;
      if (this.errors.length > 0) {
        countErrors.className = 'text-red-400 font-bold';
      } else {
        countErrors.className = 'text-emerald-400';
      }
    }

    if (actionsList) {
      actionsList.innerHTML = this.logs.map(l => {
        let color = 'text-slate-300';
        if (l.category === 'ACTION') color = 'text-amber-300';
        if (l.category === 'ERROR') color = 'text-red-400 font-bold';
        if (l.category === 'HEALTH') color = 'text-emerald-300';
        return `
          <div class="leading-relaxed border-b border-slate-900/60 pb-1">
            <span class="text-slate-500">[${l.time}]</span>
            <span class="text-blue-400 font-semibold">[${l.category}]</span>
            <span class="${color}">${l.message}</span>
          </div>
        `;
      }).join('');
    }

    if (errorsList) {
      if (this.errors.length === 0) {
        errorsList.innerHTML = `
          <div class="py-10 text-center text-slate-400">
            <div class="w-12 h-12 mx-auto mb-2 bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 rounded-full flex items-center justify-center">
              <i class="fa-solid fa-check text-xl"></i>
            </div>
            <p class="font-bold text-white">Tuyệt vời! Không phát hiện lỗi nào.</p>
            <p class="text-slate-400 text-[11px] mt-1">Hệ thống hoạt động trơn tru. Mọi thao tác đều được ghi lại đầy đủ.</p>
          </div>
        `;
      } else {
        errorsList.innerHTML = this.errors.map((e, idx) => `
          <div class="p-3.5 bg-red-950/40 border border-red-500/50 rounded-xl space-y-1">
            <div class="flex items-center justify-between text-red-300 font-bold">
              <span>Lỗi #${idx + 1}: ${e.type}</span>
              <span class="text-slate-400 text-[10px] font-normal">${e.time}</span>
            </div>
            <p class="text-white text-xs font-semibold">${e.message}</p>
            ${e.filename ? `<p class="text-[11px] text-slate-400">Tệp: ${e.filename} (dòng ${e.lineno}, cột ${e.colno})</p>` : ''}
            <pre class="bg-black/60 p-2 rounded text-[10px] text-red-200 overflow-x-auto mt-1">${e.stack}</pre>
          </div>
        `).join('');
      }
    }
  },

  updateBadge(checks = null) {
    const dot = document.getElementById('diag-status-dot');
    const text = document.getElementById('diag-badge-text');
    if (!dot || !text) return;

    if (this.errors.length > 0) {
      dot.className = 'w-2 h-2 rounded-full bg-red-500 animate-ping';
      text.innerHTML = `<span class="text-red-400 font-bold">Lỗi phát sinh (${this.errors.length})</span>`;
    } else {
      dot.className = 'w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
      const shelfCount = document.querySelectorAll('.book-3d').length;
      text.innerHTML = `<span class="text-emerald-300 font-medium">Hệ thống sẵn sàng: ${shelfCount} sách</span>`;
    }
  },

  toggleModal() {
    const modal = document.getElementById('diag-modal');
    if (modal) {
      modal.classList.toggle('hidden');
      if (!modal.classList.contains('hidden')) {
        this.runHealthCheck();
      }
    }
  },

  clearLogs() {
    this.logs = [];
    this.errors = [];
    this.renderLogsToUI();
    this.updateBadge();
    this.log('SYSTEM', 'Đã xóa trắng nhật ký.');
  },

  testOpenFirstBook() {
    this.logAction('Bấm nút thử nghiệm: Mở sách đầu tiên trên kệ (Luật XLVPHC)');
    if (window.APP_DATA && window.APP_DATA.books && window.APP_DATA.books.length > 0) {
      const firstBook = window.APP_DATA.books[0];
      if (window.Flipbook) {
        this.toggleModal(); // Close modal
        window.Flipbook.openBook(firstBook, 0);
        this.log('SUCCESS', `Đã mở sách thành công: "${firstBook.title}" (${firstBook.pagesCount} trang).`);
      } else {
        alert('Lỗi: Module Flipbook chưa sẵn sàng.');
      }
    } else {
      alert('Lỗi: Chưa tìm thấy dữ liệu sách trong APP_DATA.');
    }
  },

  testSearchLaw() {
    this.logAction('Bấm nút thử nghiệm: Tra cứu nhanh từ khóa "điều 18a"');
    this.toggleModal();
    if (window.LawSearch) {
      window.LawSearch.executeSearch('điều 18a');
    }
  },

  copyReport() {
    const report = {
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      screenResolution: `${window.innerWidth}x${window.innerHeight}`,
      booksLoaded: (window.APP_DATA && window.APP_DATA.books) ? window.APP_DATA.books.length : 0,
      lawsLoaded: (window.APP_DATA && window.APP_DATA.laws) ? window.APP_DATA.laws.length : 0,
      booksRenderedOnShelf: document.querySelectorAll('.book-3d').length,
      errorsCount: this.errors.length,
      errors: this.errors,
      recentActions: this.logs.slice(0, 30)
    };

    const textToCopy = "=== BÁO CÁO CHẨN ĐOÁN HỆ THỐNG - CSKT GIA LAI ===\n" + JSON.stringify(report, null, 2);
    navigator.clipboard.writeText(textToCopy).then(() => {
      alert('✅ Đã sao chép toàn bộ báo cáo chẩn đoán vào bộ nhớ tạm (Clipboard)! Bạn có thể dán (Ctrl+V) gửi cho bộ phận kỹ thuật để hỗ trợ.');
    }).catch(err => {
      prompt('Vui lòng sao chép nội dung bên dưới:', textToCopy);
    });
  }
};

// Global attachment
window.AppDiagnostics = AppDiagnostics;

// Auto initialize diagnostics immediately so no error is missed
AppDiagnostics.init();
