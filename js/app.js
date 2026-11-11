/**
 * Ứng dụng chính (Main Application Controller)
 * Không gian Pháp luật số & Trợ lý AI
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 */

// Theme Management (Chế độ Sáng - Tối)
window.initTheme = function() {
  const savedTheme = localStorage.getItem('cskt_theme') || 'dark';
  const themeBtn = document.getElementById('btn-toggle-theme');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon text-amber-500';
    if (themeText) themeText.textContent = 'Giao diện tối';
  } else {
    document.body.classList.remove('light-mode');
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun text-amber-400';
    if (themeText) themeText.textContent = 'Giao diện sáng';
  }

  if (themeBtn) {
    themeBtn.onclick = () => window.toggleTheme();
  }
};

window.toggleTheme = function() {
  const isLight = document.body.classList.toggle('light-mode');
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');

  if (isLight) {
    localStorage.setItem('cskt_theme', 'light');
    if (themeIcon) themeIcon.className = 'fa-solid fa-moon text-amber-500';
    if (themeText) themeText.textContent = 'Giao diện tối';
    if (window.AppDiagnostics) window.AppDiagnostics.logAction('Chuyển sang Chế độ Sáng');
  } else {
    localStorage.setItem('cskt_theme', 'dark');
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun text-amber-400';
    if (themeText) themeText.textContent = 'Giao diện sáng';
    if (window.AppDiagnostics) window.AppDiagnostics.logAction('Chuyển sang Chế độ Tối');
  }
};

// Mở trực tiếp Nghị quyết 57-NQ/TW trong sách 3D
window.openNghiQuyet57 = function() {
  if (window.AppDiagnostics) {
    window.AppDiagnostics.logAction('Người dùng bấm xem toàn văn Nghị quyết số 57-NQ/TW');
  }
  if (window.APP_DATA && window.APP_DATA.books && window.Flipbook) {
    const book = window.APP_DATA.books.find(b => b.id === 'nghi-quyet-57');
    if (book) {
      window.Flipbook.openBook(book, 0);
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  console.log("Khởi động Không gian Pháp luật số - Đoàn CSKT Công an tỉnh Gia Lai...");

  // Initialize PDF.js worker if available
  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  // Initialize Theme
  window.initTheme();

  // Initialize Modules
  if (window.Flipbook) Flipbook.init();
  if (window.Bookshelf) Bookshelf.init();
  if (window.LawSearch) LawSearch.init();
  if (window.AIChatbot) AIChatbot.init();
  if (window.ChibiMascot) ChibiMascot.init();

  // Mobile Navigation Menu Toggle
  const mobileMenuBtn = document.getElementById('btn-mobile-menu');
  const mobileMenu = document.getElementById('mobile-menu');
  if (mobileMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileMenu.classList.toggle('hidden');
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
      });
    });
  }

  // Global Keyboard Shortcuts (Esc closes modals, Arrow keys flip pages, Ctrl+F searches book)
  document.addEventListener('keydown', (e) => {
    // Esc key
    if (e.key === 'Escape') {
      const flipModal = document.getElementById('flipbook-modal');
      const searchModal = document.getElementById('search-results-modal');

      if (flipModal && !flipModal.classList.contains('hidden')) {
        Flipbook.close();
      } else if (searchModal && !searchModal.classList.contains('hidden')) {
        LawSearch.closeResults();
      }
    }

    // Arrow keys when flipbook is open
    const flipModal = document.getElementById('flipbook-modal');
    if (flipModal && !flipModal.classList.contains('hidden')) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        Flipbook.nextPage();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        Flipbook.prevPage();
      }

      // Ctrl + F inside flipbook focuses search
      if (e.ctrlKey && (e.key === 'f' || e.key === 'F')) {
        const searchInput = document.getElementById('flipbook-search-input');
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    }
  });

  // Smooth scroll for internal links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId.length > 1) {
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  });

  console.log("Hệ thống đã sẵn sàng phục vụ!");
});
