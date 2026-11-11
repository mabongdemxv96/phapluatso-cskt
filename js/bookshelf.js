/**
 * Không gian Giá sách 3D (3D Bookshelf Engine)
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 */

const Bookshelf = {
  books: [],
  currentCategory: 'all',
  lastTierSize: 0,

  init() {
    this.container = document.getElementById('bookshelf-container');
    this.statusEl = document.getElementById('library-status');
    this.refreshBooks();
    this.render();
    this.bindEvents();
    this.bindUpload();

    if (window.LegalLibrary) {
      LegalLibrary.onChange(() => {
        this.refreshBooks();
        this.render();
        this.renderStatus();
      });
    }

    // Vẽ lại kệ khi đổi số sách mỗi tầng (xoay ngang/dọc điện thoại)
    let t = null;
    window.addEventListener('resize', () => {
      clearTimeout(t);
      t = setTimeout(() => {
        if (this.booksPerTier() !== this.lastTierSize) this.render();
      }, 200);
    });
  },

  refreshBooks() {
    const libraryBooks = window.LegalLibrary ? LegalLibrary.docs.map(d => LegalLibrary.toBook(d)) : [];
    this.books = [...libraryBooks, ...window.APP_DATA.books];
  },

  findBook(id) {
    return this.books.find(b => b.id === id) || window.APP_DATA.books.find(b => b.id === id);
  },

  bindEvents() {
    const filterButtons = document.querySelectorAll('.category-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        filterButtons.forEach(b => b.classList.remove('is-active'));
        btn.classList.add('is-active');
        this.filterByCategory(btn.getAttribute('data-category'));
      });
    });
  },

  bindUpload() {
    const input = document.getElementById('library-upload-input');
    const btn = document.getElementById('btn-library-upload');
    const wrapper = document.getElementById('bookshelf-wrapper');
    if (btn && input) {
      btn.addEventListener('click', () => input.click());
      input.addEventListener('change', () => {
        if (input.files.length) this.handleFiles(input.files);
        input.value = '';
      });
    }
    if (wrapper) {
      ['dragenter', 'dragover'].forEach(ev => wrapper.addEventListener(ev, (e) => {
        e.preventDefault();
        wrapper.classList.add('is-dragover');
      }));
      ['dragleave', 'drop'].forEach(ev => wrapper.addEventListener(ev, (e) => {
        e.preventDefault();
        wrapper.classList.remove('is-dragover');
      }));
      wrapper.addEventListener('drop', (e) => {
        if (e.dataTransfer && e.dataTransfer.files.length) this.handleFiles(e.dataTransfer.files);
      });
    }
  },

  async handleFiles(files) {
    if (!window.LegalLibrary) return;
    const pdfs = [...files].filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    if (!pdfs.length) {
      if (window.ChibiMascot) ChibiMascot.speak('Hệ thống chỉ tiếp nhận tệp văn bản định dạng PDF, đồng chí kiểm tra lại giúp nhé!');
      return;
    }
    if (window.ChibiMascot) ChibiMascot.speak(`Đang tiếp nhận ${pdfs.length} văn bản: lưu nguyên trạng tệp gốc, dựng sách 3D và trích xuất từng điều luật…`);
    const added = await LegalLibrary.addUploadedFiles(pdfs);
    if (window.ChibiMascot && added.length) {
      const arts = added.reduce((a, d) => a + d.units.filter(u => u.kind === 'article').length, 0);
      const scanned = added.filter(d => d.status === 'scanned').length;
      ChibiMascot.speak(`Đã nạp ${added.length} văn bản, trích xuất ${arts} điều luật vào Thanh tìm kiếm và Trợ lý AI.` + (scanned ? ` Có ${scanned} tệp là PDF ảnh scan, chưa trích xuất được chữ.` : ''), 12000);
    }
  },

  renderStatus() {
    if (!this.statusEl || !window.LegalLibrary) return;
    const docs = LegalLibrary.docs;
    const arts = LegalLibrary.units.filter(u => u.kind === 'article').length;
    const p = LegalLibrary.progress;
    if (LegalLibrary.loading || docs.some(d => d.status === 'processing')) {
      this.statusEl.innerHTML = `<i class="fa-solid fa-spinner fa-spin text-amber-500"></i><span>Đang trích xuất toàn văn: ${LegalLibrary.escapeHtml(p.current || '…')}</span>`;
    } else if (docs.length) {
      this.statusEl.innerHTML = `<i class="fa-solid fa-circle-check text-emerald-500"></i><span>Đã nạp <strong>${docs.length}</strong> văn bản gốc · <strong>${arts}</strong> điều luật cho Tìm kiếm &amp; Trợ lý AI</span>`;
    } else {
      this.statusEl.innerHTML = `<i class="fa-solid fa-circle-info text-blue-500"></i><span>Chưa có văn bản gốc. Bấm “Tải văn bản PDF” hoặc chép tệp vào thư mục <code>tai-lieu-phap-ly/</code>.</span>`;
    }
  },

  filterByCategory(catId) {
    this.currentCategory = catId;
    if (window.AppDiagnostics) window.AppDiagnostics.logAction(`Lọc danh mục kệ sách: "${catId}"`);
    this.render();
  },

  booksPerTier() {
    const w = window.innerWidth;
    if (w < 768) return 2;
    if (w < 1024) return 3;
    return 4;
  },

  render() {
    if (!this.container) return;

    const filtered = this.currentCategory === 'all'
      ? this.books
      : this.books.filter(b => b.category === this.currentCategory);

    if (filtered.length === 0) {
      this.container.innerHTML = `
        <div class="py-16 text-center text-slate-400">
          <i class="fa-solid fa-book-open text-4xl mb-3 text-slate-500"></i>
          <p>Chưa có tài liệu nào thuộc danh mục này.</p>
        </div>
      `;
      return;
    }

    const perTier = this.booksPerTier();
    this.lastTierSize = perTier;
    const tiers = [];
    for (let i = 0; i < filtered.length; i += perTier) tiers.push(filtered.slice(i, i + perTier));

    this.container.innerHTML = tiers.map((tierBooks, index) => `
      <div class="shelf-tier">
        ${tierBooks.map(book => this.renderBookHtml(book)).join('')}
        <div class="shelf-surface">
          <div class="shelf-plate">KỆ SÁCH SỐ ${index + 1}</div>
        </div>
      </div>
    `).join('');

    this.container.querySelectorAll('.book-3d').forEach(el => {
      el.addEventListener('click', (e) => {
        if (e.target.closest('[data-action]')) return;
        const book = this.findBook(el.getAttribute('data-book-id'));
        if (book) {
          if (window.AppDiagnostics) window.AppDiagnostics.logAction(`Người dùng bấm mở sách: "${book.title}"`);
          Flipbook.openBook(book);
        }
      });
    });

    this.container.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const action = btn.getAttribute('data-action');
        if (action === 'download') LegalLibrary.downloadOriginal(id);
        if (action === 'remove') {
          const doc = LegalLibrary.getDoc(id);
          if (doc && confirm(`Gỡ văn bản "${doc.fileName}" khỏi tủ sách trên trình duyệt này?`)) {
            await LegalLibrary.removeUploaded(id);
          }
        }
      });
    });
  },

  renderBookHtml(book) {
    const esc = window.LegalLibrary ? LegalLibrary.escapeHtml : (s) => s;
    let statusTag = '';
    if (book.fromLibrary) {
      if (book.status === 'processing' || book.status === 'pending') statusTag = `<span class="book-status"><i class="fa-solid fa-spinner fa-spin"></i> Đang trích xuất</span>`;
      else if (book.status === 'scanned') statusTag = `<span class="book-status is-warn"><i class="fa-solid fa-image"></i> PDF ảnh scan</span>`;
      else if (book.status === 'error') statusTag = `<span class="book-status is-warn"><i class="fa-solid fa-triangle-exclamation"></i> Lỗi đọc tệp</span>`;
      else if (book.articleCount) statusTag = `<span class="book-status is-ok"><i class="fa-solid fa-check"></i> ${book.articleCount} điều</span>`;
    }
    const tools = book.fromLibrary ? `
      <div class="book-tools">
        <button data-action="download" data-id="${book.id}" title="Tải về tệp PDF gốc nguyên trạng"><i class="fa-solid fa-download"></i></button>
        ${book.source === 'upload' ? `<button data-action="remove" data-id="${book.id}" title="Gỡ khỏi tủ sách trên trình duyệt này"><i class="fa-solid fa-trash-can"></i></button>` : ''}
      </div>` : '';

    return `
      <div class="book-3d group" data-book-id="${book.id}" title="${esc(book.title)}">
        <div class="book-cover keep-dark bg-gradient-to-br ${book.spineColor}" style="background-color: ${book.coverColor};">
          <div class="flex items-start justify-between gap-1">
            <span class="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-amber-400 text-slate-950 rounded shadow-sm line-clamp-1">
              ${esc(book.badge || 'Sách số')}
            </span>
            ${tools}
          </div>

          <div class="my-auto py-2">
            <p class="text-[9px] uppercase tracking-wider text-amber-200/90 font-bold mb-1 line-clamp-1">
              ${esc(book.categoryLabel)}
            </p>
            <h4 class="text-[11px] sm:text-sm font-black gold-foil leading-snug line-clamp-4">
              ${esc(book.shortTitle)}
            </h4>
            <div class="w-8 h-0.5 bg-amber-400 mt-2 rounded"></div>
            ${statusTag}
          </div>

          <div class="pt-2 border-t border-white/15 flex items-center justify-between text-[10px] text-slate-300">
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-file-pdf text-red-400"></i> ${book.pagesCount} trang
            </span>
            <span class="text-amber-300 font-semibold flex items-center gap-1">
              Đọc 3D <i class="fa-solid fa-arrow-right text-[9px]"></i>
            </span>
          </div>
        </div>
        <div class="book-shadow"></div>
      </div>
    `;
  }
};

window.Bookshelf = Bookshelf;
