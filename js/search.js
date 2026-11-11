/**
 * Module Tra cứu & Tìm kiếm Điều luật (Thanh tìm kiếm kính lúp)
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 *
 * Nguồn tìm kiếm:
 *  1. Toàn văn từng Điều trích xuất nguyên văn từ PDF gốc (LegalLibrary) – ưu tiên hiển thị.
 *  2. Bảng tóm tắt điều luật nội bộ (APP_DATA.laws).
 */

const LawSearch = {
  laws: [],
  currentResults: [],
  libraryResults: [],

  init() {
    this.laws = APP_DATA.laws || [];
    this.searchInput = document.getElementById('law-search-input');
    this.searchResultsContainer = document.getElementById('search-results-modal');
    this.resultsList = document.getElementById('search-results-list');
    this.resultCount = document.getElementById('search-result-count');
    this.searchQueryDisplay = document.getElementById('search-query-display');
    this.bindEvents();
  },

  bindEvents() {
    if (!this.searchInput) return;

    // Tìm khi gõ (chỉ trên máy tính – trên điện thoại chờ bấm Tra cứu để không bật cửa sổ khi đang gõ)
    let timeout = null;
    this.searchInput.addEventListener('input', (e) => {
      if (window.matchMedia('(max-width: 767px)').matches) return;
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length >= 3) this.executeSearch(query);
      }, 600);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = this.searchInput.value.trim();
        if (query.length > 0) {
          this.searchInput.blur();
          this.executeSearch(query);
        }
      }
    });

    document.querySelectorAll('.quick-search-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const term = tag.getAttribute('data-term');
        this.searchInput.value = term;
        this.executeSearch(term);
      });
    });

    const closeBtn = document.getElementById('btn-close-search-results');
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeResults());
    if (this.searchResultsContainer) {
      this.searchResultsContainer.addEventListener('click', (e) => {
        if (e.target === this.searchResultsContainer) this.closeResults();
      });
    }
  },

  searchCurated(rawQuery) {
    const norm = window.LegalLibrary ? LegalLibrary.norm : (s) => s.toLowerCase();
    const query = norm(rawQuery).trim();
    const tokens = query.split(/\s+/).filter(Boolean);
    const numMatch = query.match(/(?:dieu\s*)?(\d{1,4}[a-z]?)\b/);
    return this.laws.filter(item => {
      const hay = norm([item.article, item.title, item.summary, item.law, item.keywords.join(' ')].join(' '));
      if (numMatch && norm(item.article) === `dieu ${numMatch[1]}`) return true;
      if (hay.includes(query)) return true;
      return tokens.length > 0 && tokens.every(t => hay.includes(t));
    });
  },

  executeSearch(rawQuery) {
    this.libraryResults = window.LegalLibrary ? LegalLibrary.search(rawQuery, { limit: 30 }) : [];
    this.currentResults = this.searchCurated(rawQuery);
    this.renderResults(rawQuery);

    const total = this.libraryResults.length + this.currentResults.length;
    if (window.AppDiagnostics) window.AppDiagnostics.logAction(`Tra cứu "${rawQuery}": ${total} kết quả`);
    if (window.ChibiMascot) {
      if (total > 0) {
        ChibiMascot.speak(`Tìm thấy ${total} kết quả cho "${rawQuery}". Nội dung trích từ văn bản gốc được hiển thị nguyên văn kèm số trang để đối chiếu.`);
      } else {
        ChibiMascot.speak(`Chưa tìm thấy điều luật phù hợp với "${rawQuery}". Đồng chí thử từ khóa khác như "buôn lậu", "trốn thuế", "Điều 6" xem sao nhé!`);
      }
    }
  },

  renderResults(query) {
    if (!this.searchResultsContainer) return;

    this.searchResultsContainer.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    const total = this.libraryResults.length + this.currentResults.length;
    this.searchQueryDisplay.textContent = `"${query}"`;
    this.resultCount.textContent = `(${total} kết quả)`;

    if (total === 0) {
      const loading = window.LegalLibrary && LegalLibrary.loading;
      this.resultsList.innerHTML = `
        <div class="py-12 text-center text-slate-400">
          <div class="w-16 h-16 mx-auto mb-3 bg-slate-800 rounded-full flex items-center justify-center">
            <i class="fa-solid fa-magnifying-glass text-2xl text-slate-500"></i>
          </div>
          <h4 class="text-base font-bold text-slate-200">Không tìm thấy điều luật phù hợp</h4>
          <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            ${loading ? 'Hệ thống đang trích xuất văn bản gốc, đồng chí vui lòng thử lại sau ít giây. ' : ''}
            Gợi ý: tra cứu theo số điều (ví dụ <strong>Điều 6</strong>, <strong>Điều 188</strong>) hoặc tên hành vi (<strong>trốn thuế</strong>, <strong>rửa tiền</strong>…).
          </p>
        </div>
      `;
      return;
    }

    let html = '';

    if (this.libraryResults.length) {
      html += `
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-emerald-400">
          <i class="fa-solid fa-file-shield"></i> Toàn văn trích từ văn bản gốc (${this.libraryResults.length})
        </div>`;
      html += this.libraryResults.map((r, i) => this.renderLibraryResult(r, query, i < 2)).join('');
    }

    if (this.currentResults.length) {
      html += `
        <div class="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-400 ${this.libraryResults.length ? 'pt-3' : ''}">
          <i class="fa-solid fa-list-check"></i> Tóm tắt nghiệp vụ nội bộ (${this.currentResults.length})
        </div>`;
      html += this.currentResults.map(item => this.renderCuratedResult(item, query)).join('');
    }

    this.resultsList.innerHTML = html;
  },

  renderLibraryResult({ unit, doc }, query, open) {
    const esc = LegalLibrary.escapeHtml;
    const heading = unit.kind === 'article'
      ? `${esc(unit.article)}${unit.title ? '. ' + LegalLibrary.highlight(unit.title, query) : ''}`
      : `${esc(unit.article)}: ${LegalLibrary.highlight(unit.title, query)}`;
    return `
      <details class="result-card group" ${open ? 'open' : ''}>
        <summary class="cursor-pointer list-none">
          <div class="flex flex-wrap items-center gap-1.5 mb-1.5">
            <span class="px-2 py-0.5 bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold rounded">
              <i class="fa-solid fa-file-pdf mr-1"></i>Văn bản gốc
            </span>
            <span class="px-2 py-0.5 bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[11px] font-bold rounded line-clamp-1 max-w-full">
              ${esc(doc.title)}
            </span>
            <span class="text-[11px] text-slate-400">Trang ${unit.page}</span>
          </div>
          <h4 class="text-sm sm:text-base font-bold text-amber-300 flex items-start gap-2">
            <i class="fa-solid fa-chevron-right text-[10px] mt-1.5 transition-transform group-open:rotate-90"></i>
            <span>${heading}</span>
          </h4>
          ${unit.chapter ? `<p class="text-[11px] text-slate-400 ml-5 mt-0.5">${esc(unit.chapter)}</p>` : ''}
        </summary>
        <div class="verbatim-text mt-3">${LegalLibrary.highlight(unit.text, query)}</div>
        <div class="flex flex-wrap items-center justify-end gap-2 pt-3 mt-3 border-t border-slate-700/60 text-xs">
          <button onclick="LawSearch.copyUnit('${unit.id}')" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition flex items-center gap-1">
            <i class="fa-regular fa-copy"></i> Sao chép nguyên văn
          </button>
          <button onclick="LegalLibrary.downloadOriginal('${doc.id}')" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition flex items-center gap-1">
            <i class="fa-solid fa-download"></i> Tệp gốc
          </button>
          <button onclick="LawSearch.openInBook('${doc.id}', ${unit.page})" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition flex items-center gap-1 shadow">
            <i class="fa-solid fa-book-open"></i> Mở trang ${unit.page} trong Sách 3D
          </button>
        </div>
      </details>
    `;
  },

  renderCuratedResult(item, query) {
    const hl = (t) => window.LegalLibrary ? LegalLibrary.highlight(t, query) : t;
    return `
      <div class="result-card">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
          <div class="flex items-center gap-2 flex-wrap">
            <span class="px-2 py-0.5 bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold rounded">${item.law}</span>
            <span class="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded">${item.article}</span>
          </div>
          <span class="text-[11px] text-slate-400 flex items-center gap-1">
            <i class="fa-solid fa-folder text-amber-400"></i> ${item.category}
          </span>
        </div>
        <h4 class="text-sm sm:text-base font-bold text-amber-300 mb-1.5">${item.article}: ${item.title}</h4>
        <p class="text-xs text-slate-300 leading-relaxed mb-3"><strong>Tóm tắt:</strong> ${hl(item.summary)}</p>
        <div class="p-2.5 bg-red-950/40 border-l-4 border-red-500 rounded text-xs text-red-200 mb-3">
          <strong>Mức xử lý / Khung hình phạt:</strong> ${item.penalty}
        </div>
        <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60 text-xs">
          <div class="flex gap-1.5 flex-wrap">
            ${item.keywords.slice(0, 5).map(k => `<span class="text-[10px] bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">#${k}</span>`).join('')}
          </div>
          <div class="flex items-center gap-2">
            <button onclick="LawSearch.copyLawText('${item.id}')" class="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition flex items-center gap-1">
              <i class="fa-regular fa-copy"></i> Sao chép
            </button>
            <button onclick="LawSearch.openInBook('${item.bookId}', ${item.pageNumber})" class="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg transition flex items-center gap-1 shadow">
              <i class="fa-solid fa-book-open"></i> Mở trong Sách 3D
            </button>
          </div>
        </div>
      </div>
    `;
  },

  copyToClipboard(text, okMsg) {
    const done = () => window.ChibiMascot ? ChibiMascot.speak(okMsg) : alert(okMsg);
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(done).catch(() => this.fallbackCopy(text, done));
    } else {
      this.fallbackCopy(text, done);
    }
  },

  fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) { /* bỏ qua */ }
    ta.remove();
  },

  copyUnit(unitId) {
    const unit = LegalLibrary.getUnit(unitId);
    if (!unit) return;
    const doc = LegalLibrary.getDoc(unit.docId);
    this.copyToClipboard(LegalLibrary.verbatimText(unit, doc), `Đã sao chép nguyên văn ${unit.article} vào bộ nhớ tạm!`);
  },

  copyLawText(lawId) {
    const item = this.laws.find(l => l.id === lawId);
    if (!item) return;
    const copyString = `[${item.law}] - ${item.article}: ${item.title}\nTóm tắt: ${item.summary}\nHình phạt: ${item.penalty}\n(Nguồn: Không gian pháp luật số - Đoàn CSKT Công an tỉnh Gia Lai)`;
    this.copyToClipboard(copyString, `Đã sao chép nội dung ${item.article} vào bộ nhớ tạm!`);
  },

  openInBook(bookId, pageNumber) {
    this.closeResults();
    const book = window.Bookshelf ? Bookshelf.findBook(bookId) : APP_DATA.books.find(b => b.id === bookId);
    if (book) Flipbook.openBook(book, pageNumber - 1);
  },

  closeResults() {
    if (this.searchResultsContainer) {
      this.searchResultsContainer.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }
};

window.LawSearch = LawSearch;
