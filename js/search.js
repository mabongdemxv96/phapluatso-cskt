/**
 * Module Tra cứu & Tìm kiếm Điều luật Nhanh
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 */

const LawSearch = {
  laws: [],
  currentResults: [],

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

    // Search on Enter or debounce
    let timeout = null;
    this.searchInput.addEventListener('input', (e) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        const query = e.target.value.trim();
        if (query.length >= 2) {
          this.executeSearch(query);
        }
      }, 300);
    });

    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const query = this.searchInput.value.trim();
        if (query.length > 0) {
          this.executeSearch(query);
        }
      }
    });

    // Quick tag search buttons
    document.querySelectorAll('.quick-search-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const term = tag.getAttribute('data-term');
        this.searchInput.value = term;
        this.executeSearch(term);
      });
    });

    // Close modal
    const closeBtn = document.getElementById('btn-close-search-results');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeResults());
    }
  },

  executeSearch(rawQuery) {
    const query = rawQuery.toLowerCase();
    const queryTokens = query.split(/\s+/).filter(Boolean);

    this.currentResults = this.laws.filter(item => {
      const matchInArticle = item.article.toLowerCase().includes(query);
      const matchInTitle = item.title.toLowerCase().includes(query);
      const matchInSummary = item.summary.toLowerCase().includes(query);
      const matchInLaw = item.law.toLowerCase().includes(query);
      const matchInKeywords = item.keywords.some(k => k.toLowerCase().includes(query));

      // Token match
      const tokenMatch = queryTokens.every(t => 
        item.article.toLowerCase().includes(t) ||
        item.title.toLowerCase().includes(t) ||
        item.summary.toLowerCase().includes(t) ||
        item.keywords.some(k => k.toLowerCase().includes(t))
      );

      return matchInArticle || matchInTitle || matchInSummary || matchInLaw || matchInKeywords || tokenMatch;
    });

    this.renderResults(rawQuery);

    if (window.ChibiMascot) {
      if (this.currentResults.length > 0) {
        window.ChibiMascot.speak(`Tìm thấy ${this.currentResults.length} điều luật liên quan đến từ khóa "${rawQuery}". Đồng chí hãy bấm vào để tra cứu chi tiết nhé!`);
      } else {
        window.ChibiMascot.speak(`Chưa tìm thấy điều luật phù hợp với "${rawQuery}". Đồng chí thử tra cứu từ khóa khác như "buôn lậu", "trốn thuế", "rửa tiền" xem sao nhé!`);
      }
    }
  },

  renderResults(query) {
    if (!this.searchResultsContainer) return;

    this.searchResultsContainer.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');

    this.searchQueryDisplay.textContent = `"${query}"`;
    this.resultCount.textContent = `(${this.currentResults.length} kết quả)`;

    if (this.currentResults.length === 0) {
      this.resultsList.innerHTML = `
        <div class="py-12 text-center text-slate-400">
          <div class="w-16 h-16 mx-auto mb-3 bg-slate-800 rounded-full flex items-center justify-center">
            <i class="fa-solid fa-magnifying-glass text-2xl text-slate-500"></i>
          </div>
          <h4 class="text-base font-bold text-slate-200">Không tìm thấy điều luật phù hợp</h4>
          <p class="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Gợi ý: Đồng chí có thể tra cứu nhanh các tội danh kinh tế phổ biến: <strong>Điều 188</strong> (Buôn lậu), <strong>Điều 200</strong> (Trốn thuế), <strong>Điều 201</strong> (Cho vay nặng lãi), <strong>Điều 324</strong> (Rửa tiền)...
          </p>
        </div>
      `;
      return;
    }

    let html = '';
    this.currentResults.forEach(item => {
      html += `
        <div class="p-4 bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-400/50 rounded-xl transition-all shadow-md group">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 bg-blue-600/30 text-blue-300 border border-blue-500/40 text-xs font-bold rounded">
                ${item.law}
              </span>
              <span class="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold rounded">
                ${item.article}
              </span>
            </div>
            <span class="text-[11px] text-slate-400 flex items-center gap-1">
              <i class="fa-solid fa-folder text-amber-400"></i> ${item.category}
            </span>
          </div>

          <h4 class="text-sm sm:text-base font-bold text-amber-300 group-hover:text-amber-200 mb-1.5">
            ${item.article}: ${item.title}
          </h4>

          <p class="text-xs text-slate-300 leading-relaxed mb-3">
            <strong>Nội dung:</strong> ${this.highlightText(item.summary, query)}
          </p>

          <div class="p-2.5 bg-red-950/40 border-l-4 border-red-500 rounded text-xs text-red-200 mb-3">
            <strong>Mức xử lý / Khung hình phạt:</strong> ${item.penalty}
          </div>

          <div class="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60 text-xs">
            <div class="flex gap-1.5 flex-wrap">
              ${item.keywords.map(k => `<span class="text-[10px] bg-slate-700/60 text-slate-300 px-2 py-0.5 rounded">#${k}</span>`).join('')}
            </div>

            <div class="flex items-center gap-2">
              <button onclick="LawSearch.copyLawText('${item.id}')" class="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded font-medium transition flex items-center gap-1">
                <i class="fa-regular fa-copy"></i> Sao chép
              </button>
              <button onclick="LawSearch.openInBook('${item.bookId}', ${item.pageNumber})" class="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded transition flex items-center gap-1 shadow">
                <i class="fa-solid fa-book-open"></i> Mở đọc trong Sách 3D
              </button>
            </div>
          </div>
        </div>
      `;
    });

    this.resultsList.innerHTML = html;
  },

  highlightText(text, query) {
    if (!query) return text;
    const regex = new RegExp(`(${query})`, 'gi');
    return text.replace(regex, `<mark class="bg-amber-400 text-slate-950 px-1 rounded font-bold">$1</mark>`);
  },

  copyLawText(lawId) {
    const item = this.laws.find(l => l.id === lawId);
    if (!item) return;

    const copyString = `[${item.law}] - ${item.article}: ${item.title}\nNội dung: ${item.summary}\nHình phạt: ${item.penalty}\n(Nguồn: Không gian pháp luật số - Đoàn CSKT Công an tỉnh Gia Lai)`;
    navigator.clipboard.writeText(copyString).then(() => {
      if (window.ChibiMascot) {
        window.ChibiMascot.speak(`Đã sao chép nội dung ${item.article} vào bộ nhớ tạm!`);
      } else {
        alert('Đã sao chép điều luật vào bộ nhớ tạm!');
      }
    });
  },

  openInBook(bookId, pageNumber) {
    this.closeResults();
    const book = APP_DATA.books.find(b => b.id === bookId);
    if (book) {
      Flipbook.openBook(book, pageNumber - 1);
    }
  },

  closeResults() {
    if (this.searchResultsContainer) {
      this.searchResultsContainer.classList.add('hidden');
      document.body.classList.remove('overflow-hidden');
    }
  }
};

window.LawSearch = LawSearch;

