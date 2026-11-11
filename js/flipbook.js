/**
 * Trình đọc sách 3D lật trang (3D Flipbook Reader)
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 * Tích hợp công cụ tìm kiếm nội dung trực tiếp trong sách
 */

const Flipbook = {
  currentBook: null,
  currentPageIndex: 0, // Left page index (0, 2, 4...)
  totalPages: 0,
  pagesData: [],
  isPdf: false,
  pdfDoc: null,
  zoomLevel: 1,
  audioCtx: null,

  init() {
    this.modal = document.getElementById('flipbook-modal');
    this.bookContainer = document.getElementById('flipbook-pages-container');
    this.leftPageEl = document.getElementById('flipbook-page-left');
    this.rightPageEl = document.getElementById('flipbook-page-right');
    this.pageIndicator = document.getElementById('flipbook-page-indicator');
    this.pageSlider = document.getElementById('flipbook-slider');
    this.bookTitleEl = document.getElementById('flipbook-book-title');

    // Setup Audio Context for realistic page flip sound
    this.initAudio();
    this.initSearch();
    this.initResponsive();
  },

  // Điện thoại: hiển thị 1 trang/lần, vuốt ngang để lật trang
  initResponsive() {
    this.mq = window.matchMedia('(max-width: 767px)');
    this.singlePage = this.mq.matches;
    const onChange = () => {
      const was = this.singlePage;
      this.singlePage = this.mq.matches;
      if (was !== this.singlePage && this.isOpen()) {
        if (!this.singlePage && this.currentPageIndex % 2 !== 0) this.currentPageIndex -= 1;
        this.renderCurrentSpread(true);
      }
    };
    if (this.mq.addEventListener) this.mq.addEventListener('change', onChange);
    else this.mq.addListener(onChange);

    const stage = document.getElementById('flipbook-modal-content');
    if (stage) {
      let sx = 0, sy = 0, t0 = 0;
      stage.addEventListener('touchstart', (e) => {
        if (e.touches.length !== 1) return;
        sx = e.touches[0].clientX; sy = e.touches[0].clientY; t0 = Date.now();
      }, { passive: true });
      stage.addEventListener('touchend', (e) => {
        if (!sx || this.zoomLevel > 1) { sx = 0; return; }
        const dx = e.changedTouches[0].clientX - sx;
        const dy = e.changedTouches[0].clientY - sy;
        sx = 0;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - t0 < 800) {
          if (dx < 0) this.nextPage(); else this.prevPage();
        }
      }, { passive: true });
    }
  },

  isOpen() {
    return this.modal && !this.modal.classList.contains('hidden');
  },

  step() {
    return this.singlePage ? 1 : 2;
  },

  initAudio() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch (e) {
      console.warn("Web Audio API not supported", e);
    }
  },

  initSearch() {
    this.searchInput = document.getElementById('flipbook-search-input');
    this.searchResultsPanel = document.getElementById('flipbook-search-results');
    this.btnSearch = document.getElementById('btn-flipbook-search');

    if (this.btnSearch && this.searchInput) {
      this.btnSearch.addEventListener('click', () => {
        this.performSearch(this.searchInput.value);
      });
      this.searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.performSearch(this.searchInput.value);
        }
      });
    }
  },

  performSearch(rawQuery) {
    const query = (rawQuery || '').trim().toLowerCase();
    if (!query) {
      if (this.searchResultsPanel) this.searchResultsPanel.classList.add('hidden');
      return;
    }

    if (window.AppDiagnostics) {
      window.AppDiagnostics.logAction(`Tìm kiếm trong sách "${this.currentBook ? this.currentBook.shortTitle : ''}": "${query}"`);
    }

    const matches = [];
    const norm = window.LegalLibrary ? LegalLibrary.norm : (s) => (s || '').toLowerCase();
    if (this.currentBook && this.currentBook.pageTexts && this.currentBook.pageTexts.length) {
      // Sách tạo từ PDF gốc: tìm trong toàn văn đã trích xuất của từng trang
      const nq = norm(query);
      this.currentBook.pageTexts.forEach((text, idx) => {
        const flat = text.replace(/\s+/g, ' ');
        const pos = norm(flat).indexOf(nq);
        if (pos >= 0) {
          matches.push({
            pageIndex: idx,
            pageNum: idx + 1,
            title: `Trang ${idx + 1}`,
            snippet: flat.substring(Math.max(0, pos - 30), Math.min(flat.length, pos + nq.length + 60)).trim()
          });
        }
      });
    } else if (this.currentBook && this.currentBook.pages) {
      this.currentBook.pages.forEach((p, idx) => {
        const textContent = p.html ? p.html.replace(/<[^>]*>/g, ' ') : '';
        if (textContent.toLowerCase().includes(query) || (p.title && p.title.toLowerCase().includes(query))) {
          const lower = textContent.toLowerCase();
          const pos = lower.indexOf(query);
          const snippetStart = Math.max(0, pos - 30);
          const snippetEnd = Math.min(textContent.length, pos + query.length + 50);
          const snippet = textContent.substring(snippetStart, snippetEnd).trim();
          matches.push({
            pageIndex: idx,
            pageNum: idx + 1,
            title: p.title || `Trang ${idx + 1}`,
            snippet: snippet
          });
        }
      });
    }

    this.renderSearchResults(query, matches);
  },

  renderSearchResults(query, matches) {
    if (!this.searchResultsPanel) return;

    this.searchResultsPanel.classList.remove('hidden');

    if (matches.length === 0) {
      this.searchResultsPanel.innerHTML = `
        <div class="p-3 text-xs text-slate-300 flex items-center justify-between">
          <span>Không tìm thấy từ khóa <strong>"${query}"</strong> trong sách này.</span>
          <button onclick="document.getElementById('flipbook-search-results').classList.add('hidden')" class="text-slate-400 hover:text-white ml-2">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      `;
      return;
    }

    let html = `
      <div class="p-2.5 bg-slate-800 border-b border-slate-700 flex items-center justify-between text-xs text-amber-300 font-bold">
        <span><i class="fa-solid fa-magnifying-glass mr-1"></i> Tìm thấy ${matches.length} kết quả:</span>
        <button onclick="document.getElementById('flipbook-search-results').classList.add('hidden')" class="text-slate-400 hover:text-white">
          <i class="fa-solid fa-xmark"></i>
        </button>
      </div>
      <div class="max-h-52 overflow-y-auto divide-y divide-slate-800 text-xs">
    `;

    const esc = window.LegalLibrary ? LegalLibrary.escapeHtml : (s) => s;
    matches.forEach(m => {
      m.snippet = esc(m.snippet);
      html += `
        <div onclick="Flipbook.goToPage(${m.pageIndex}); document.getElementById('flipbook-search-results').classList.add('hidden');" class="p-2.5 hover:bg-slate-800/90 cursor-pointer transition text-left">
          <div class="flex items-center justify-between text-amber-400 font-semibold text-[11px] mb-0.5">
            <span>Trang ${m.pageNum}</span>
            <span class="text-[10px] text-slate-400">Xem trang này →</span>
          </div>
          <p class="text-slate-300 text-[11px] line-clamp-2">...${m.snippet}...</p>
        </div>
      `;
    });

    html += `</div>`;
    this.searchResultsPanel.innerHTML = html;

    // Jump to the first match immediately
    if (matches.length > 0) {
      this.goToPage(matches[0].pageIndex);
    }
  },

  playFlipSound() {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const filter = this.audioCtx.createBiquadFilter();

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(800, now);
      filter.frequency.exponentialRampToValueAtTime(250, now + 0.18);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.22);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.23);
    } catch (e) {
      // Audio fallback silent
    }
  },

  async openBook(book, startPage = 0) {
    this.currentBook = book;
    this.zoomLevel = 1;
    this.updateZoom();
    this.bookTitleEl.textContent = book.title;
    
    // Clear old search
    if (this.searchInput) this.searchInput.value = '';
    if (this.searchResultsPanel) this.searchResultsPanel.classList.add('hidden');

    if (window.AppDiagnostics) {
      window.AppDiagnostics.logAction(`Flipbook mở sách "${book.shortTitle || book.title}" (tổng ${book.pagesCount || (book.pages ? book.pages.length : 1)} trang)`);
    }

    document.getElementById('flipbook-modal').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    // Chibi voice notification
    if (window.ChibiMascot) {
      window.ChibiMascot.speak(`Đang mở cuốn sách "${book.shortTitle}". Đồng chí có thể dùng chuột hoặc phím mũi tên để lật trang nhé!`);
    }

    if (this.pdfDoc) {
      try { this.pdfDoc.destroy(); } catch (e) { /* bỏ qua */ }
      this.pdfDoc = null;
    }

    if (book.pdfFile) {
      await this.loadFromPdfFile(book.pdfFile, startPage);
    } else if (book.pages && book.pages.length > 0) {
      this.isPdf = false;
      this.pagesData = book.pages;
      this.totalPages = book.pages.length;
      this.currentPageIndex = this.alignIndex(Math.min(startPage, this.totalPages - 1));
      this.renderCurrentSpread();
    } else if (book.pdfUrl) {
      await this.loadFromPdfUrl(book.pdfUrl, startPage);
    }
  },

  async loadFromPdfFile(file, startPage = 0) {
    try {
      this.leftPageEl.innerHTML = `<div class="flex items-center justify-center h-full text-blue-900 font-semibold"><i class="fa-solid fa-spinner fa-spin text-2xl mr-3"></i> Đang tải dữ liệu PDF...</div>`;
      this.rightPageEl.innerHTML = '';
      
      const arrayBuffer = await file.arrayBuffer();
      if (window.pdfjsLib) {
        const loadingTask = window.pdfjsLib.getDocument({ data: arrayBuffer });
        this.pdfDoc = await loadingTask.promise;
        this.totalPages = this.pdfDoc.numPages;
        this.isPdf = true;
        this.currentPageIndex = this.alignIndex(Math.min(startPage, this.totalPages - 1));
        await this.renderCurrentSpread();
      } else {
        throw new Error("Thư viện PDF.js chưa sẵn sàng");
      }
    } catch (err) {
      console.warn("Lỗi đọc PDF, dùng fallback giao diện:", err);
      this.renderFallbackPages(startPage);
    }
  },

  async loadFromPdfUrl(url, startPage = 0) {
    try {
      if (window.pdfjsLib) {
        const loadingTask = window.pdfjsLib.getDocument(url);
        this.pdfDoc = await loadingTask.promise;
        this.totalPages = this.pdfDoc.numPages;
        this.isPdf = true;
        this.currentPageIndex = this.alignIndex(Math.min(startPage, this.totalPages - 1));
        await this.renderCurrentSpread();
      } else {
        this.renderFallbackPages(startPage);
      }
    } catch (e) {
      console.warn("PDF URL load failed, using structured pages:", e);
      this.renderFallbackPages(startPage);
    }
  },

  renderFallbackPages(startPage = 0) {
    this.isPdf = false;
    this.pagesData = this.currentBook.pages || [
      { title: "Trang 1", html: `<div class="p-8 text-center"><h3 class="text-xl font-bold">${this.currentBook.title}</h3><p class="mt-4">${this.currentBook.description}</p></div>` }
    ];
    this.totalPages = this.pagesData.length;
    this.currentPageIndex = this.alignIndex(startPage);
    this.renderCurrentSpread();
  },

  alignIndex(idx) {
    let i = Math.max(0, parseInt(idx, 10) || 0);
    if (!this.singlePage && i % 2 !== 0) i -= 1;
    return i;
  },

  async renderPageInto(pageIdx, el, emptyLabel) {
    if (pageIdx < this.totalPages) {
      if (this.isPdf && this.pdfDoc) {
        await this.renderPdfPage(pageIdx + 1, el);
      } else if (this.pagesData[pageIdx]) {
        el.innerHTML = this.pagesData[pageIdx].html;
      }
    } else {
      el.innerHTML = `<div class="h-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs italic">${emptyLabel}</div>`;
    }
  },

  async renderCurrentSpread(silent = false) {
    if (!silent) this.playFlipSound();
    const token = (this.renderToken = (this.renderToken || 0) + 1);

    if (this.bookContainer) this.bookContainer.classList.toggle('is-single', this.singlePage);

    const leftIdx = this.currentPageIndex;
    await this.renderPageInto(leftIdx, this.leftPageEl, 'Trang trống');
    if (token !== this.renderToken) return;

    if (!this.singlePage) {
      await this.renderPageInto(leftIdx + 1, this.rightPageEl, 'Hết sách');
      if (token !== this.renderToken) return;
    } else {
      this.rightPageEl.innerHTML = '';
    }

    if (this.singlePage) {
      this.pageIndicator.textContent = `Trang ${leftIdx + 1} / ${this.totalPages}`;
    } else {
      const displayPage = Math.min(leftIdx + 2, this.totalPages);
      this.pageIndicator.textContent = displayPage > leftIdx + 1
        ? `Trang ${leftIdx + 1} - ${displayPage} / ${this.totalPages}`
        : `Trang ${leftIdx + 1} / ${this.totalPages}`;
    }

    if (this.pageSlider) {
      this.pageSlider.max = Math.max(1, this.totalPages - 1);
      this.pageSlider.value = this.currentPageIndex;
    }

    this.triggerFlipEffect();
  },

  async renderPdfPage(pageNumber, containerEl) {
    try {
      const page = await this.pdfDoc.getPage(pageNumber);
      const base = page.getViewport({ scale: 1 });
      // Độ nét theo kích thước khung và mật độ điểm ảnh của màn hình (điện thoại Retina)
      const boxW = Math.max(containerEl.clientWidth, 280);
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      const scale = Math.max(1, (boxW * dpr * Math.max(1, this.zoomLevel)) / base.width);
      const viewport = page.getViewport({ scale });

      const canvas = document.createElement('canvas');
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      canvas.className = "pdf-page-canvas";
      await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      containerEl.innerHTML = '';
      containerEl.appendChild(canvas);
    } catch (e) {
      containerEl.innerHTML = `<div class="p-6 text-red-600 text-sm">Lỗi tải trang ${pageNumber}</div>`;
    }
  },

  triggerFlipEffect() {
    this.rightPageEl.classList.remove('page-turn-animation');
    void this.rightPageEl.offsetWidth; // Trigger reflow
    this.rightPageEl.classList.add('page-turn-animation');
  },

  nextPage() {
    const s = this.step();
    if (this.currentPageIndex + s < this.totalPages) {
      this.currentPageIndex += s;
      this.renderCurrentSpread();
    }
  },

  prevPage() {
    if (this.currentPageIndex > 0) {
      this.currentPageIndex = Math.max(0, this.currentPageIndex - this.step());
      this.renderCurrentSpread();
    }
  },

  goToPage(pageIndex) {
    let target = parseInt(pageIndex, 10);
    if (isNaN(target)) target = 0;
    target = Math.min(target, this.totalPages - 1);
    this.currentPageIndex = this.alignIndex(target);
    this.renderCurrentSpread();
  },

  zoomIn() {
    if (this.zoomLevel < 1.4) {
      this.zoomLevel += 0.15;
      this.updateZoom();
    }
  },

  zoomOut() {
    if (this.zoomLevel > 0.75) {
      this.zoomLevel -= 0.15;
      this.updateZoom();
    }
  },

  resetZoom() {
    this.zoomLevel = 1;
    this.updateZoom();
  },

  updateZoom() {
    const wrap = document.getElementById('flipbook-zoom-wrapper');
    if (wrap) {
      wrap.style.transform = `scale(${this.zoomLevel})`;
    }
  },

  toggleFullscreen() {
    const modalContent = document.getElementById('flipbook-modal-content');
    if (!document.fullscreenElement) {
      modalContent.requestFullscreen().catch(err => console.log(err));
    } else {
      document.exitFullscreen().catch(err => console.log(err));
    }
  },

  close() {
    document.getElementById('flipbook-modal').classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err));
    }
  }
};

window.Flipbook = Flipbook;

// Global helper for internal links in book pages
window.jumpToFlipPage = function(page) {
  Flipbook.goToPage(page - 1);
};
