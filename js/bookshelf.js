/**
 * Không gian Giá sách 3D (3D Bookshelf Engine)
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 */

const Bookshelf = {
  books: [],
  currentCategory: 'all',

  init() {
    this.books = [...window.APP_DATA.books];
    this.container = document.getElementById('bookshelf-container');
    this.render();
    this.bindEvents();
  },

  bindEvents() {
    // Category filter buttons
    const filterButtons = document.querySelectorAll('.category-filter-btn');
    filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        filterButtons.forEach(b => {
          b.classList.remove('bg-amber-500', 'text-slate-950', 'shadow-amber-500/30', 'font-bold');
          b.classList.add('bg-slate-800/80', 'text-slate-300');
        });
        btn.classList.remove('bg-slate-800/80', 'text-slate-300');
        btn.classList.add('bg-amber-500', 'text-slate-950', 'shadow-amber-500/30', 'font-bold');

        const cat = btn.getAttribute('data-category');
        this.filterByCategory(cat);
      });
    });
  },

  filterByCategory(catId) {
    this.currentCategory = catId;
    if (window.AppDiagnostics) window.AppDiagnostics.logAction(`Lọc danh mục kệ sách: "${catId}"`);
    this.render();
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

    // Split books into tiers (maximum 4 books per shelf tier for desktop, 2 for mobile)
    const booksPerTier = window.innerWidth < 768 ? 2 : 4;
    const tiers = [];
    for (let i = 0; i < filtered.length; i += booksPerTier) {
      tiers.push(filtered.slice(i, i + booksPerTier));
    }

    let html = '';
    tiers.forEach((tierBooks, index) => {
      html += `
        <div class="shelf-tier pt-8 pb-10 px-4 md:px-12 flex justify-center items-end gap-6 sm:gap-10 md:gap-14 relative">
          <!-- Books on this tier -->
          ${tierBooks.map(book => this.renderBookHtml(book)).join('')}
          
          <!-- Realistic 3D Shelf Plank Bottom -->
          <div class="shelf-surface">
            <!-- Brass Plate Shelf Label -->
            <div class="absolute left-1/2 -bottom-2 -translate-x-1/2 px-4 py-0.5 bg-gradient-to-r from-amber-700 via-amber-400 to-amber-700 rounded text-[10px] font-bold text-slate-950 uppercase tracking-widest shadow border border-amber-300">
              KỆ SÁCH SỐ ${index + 1}
            </div>
          </div>
        </div>
      `;
    });

    this.container.innerHTML = html;

    // Attach click handlers to 3D books
    this.container.querySelectorAll('.book-3d').forEach(el => {
      el.addEventListener('click', () => {
        const bookId = el.getAttribute('data-book-id');
        const targetBook = this.books.find(b => b.id === bookId);
        if (targetBook) {
          if (window.AppDiagnostics) window.AppDiagnostics.logAction(`Người dùng bấm mở sách: "${targetBook.title}"`);
          Flipbook.openBook(targetBook);
        }
      });
    });
  },

  renderBookHtml(book) {
    return `
      <div class="book-3d group" data-book-id="${book.id}" title="${book.title}">
        <!-- Book Cover with 3D Spine and Badge -->
        <div class="book-cover bg-gradient-to-br ${book.spineColor}" style="background-color: ${book.coverColor};">
          <!-- Top Tag & Emblems -->
          <div class="flex items-start justify-between">
            <span class="px-1.5 py-0.5 text-[9px] font-extrabold uppercase bg-amber-400 text-slate-950 rounded shadow-sm">
              ${book.badge || 'Sách số'}
            </span>
            <div class="w-6 h-6 rounded-full bg-white/10 p-1 flex items-center justify-center border border-white/20">
              <img src="assets/images/logo-cand.svg" class="w-4 h-4 object-contain" alt="CAND" />
            </div>
          </div>

          <!-- Title in Center -->
          <div class="my-auto py-2">
            <p class="text-[9px] uppercase tracking-wider text-amber-200/90 font-bold mb-1">
              ${book.categoryLabel}
            </p>
            <h4 class="text-xs sm:text-sm font-black gold-foil leading-snug line-clamp-3">
              ${book.shortTitle}
            </h4>
            <div class="w-8 h-0.5 bg-amber-400 mt-2 rounded"></div>
          </div>

          <!-- Bottom Metadata -->
          <div class="pt-2 border-t border-white/15 flex items-center justify-between text-[10px] text-slate-300">
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-file-pdf text-red-400"></i> ${book.pagesCount} trang
            </span>
            <span class="text-amber-300 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              Đọc 3D <i class="fa-solid fa-arrow-right text-[9px]"></i>
            </span>
          </div>
        </div>

        <!-- 3D Shadow Cast on Shelf -->
        <div class="absolute -bottom-2 left-2 right-2 h-3 bg-black/40 blur-sm rounded-full -z-10 group-hover:scale-90 group-hover:opacity-30 transition-all"></div>
      </div>
    `;
  }
};

window.Bookshelf = Bookshelf;
