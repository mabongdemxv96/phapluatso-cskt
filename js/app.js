/**
 * Ứng dụng chính (Main Application Controller)
 * Không gian Pháp luật số & Trợ lý AI
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 */

// Theme Management (Chế độ Sáng - Tối)
// Chưa chọn giao diện -> theo cài đặt sáng/tối của thiết bị
function readSavedTheme() {
  try {
    const saved = localStorage.getItem('cskt_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch (e) { /* trình duyệt chặn bộ nhớ */ }
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

function applyTheme(isLight) {
  document.body.classList.toggle('light-mode', isLight);
  document.documentElement.classList.toggle('light-pending', isLight);
  const themeIcon = document.getElementById('theme-icon');
  const themeText = document.getElementById('theme-text');
  const meta = document.getElementById('meta-theme-color');
  if (themeIcon) themeIcon.className = isLight ? 'fa-solid fa-moon text-blue-700' : 'fa-solid fa-sun text-amber-400';
  if (themeText) themeText.textContent = isLight ? 'Giao diện tối' : 'Giao diện sáng';
  if (meta) meta.setAttribute('content', isLight ? '#ffffff' : '#0b2545');
}

window.initTheme = function() {
  applyTheme(readSavedTheme() === 'light');
  const themeBtn = document.getElementById('btn-toggle-theme');
  if (themeBtn) themeBtn.onclick = () => window.toggleTheme();
};

window.toggleTheme = function() {
  const isLight = !document.body.classList.contains('light-mode');
  applyTheme(isLight);
  try { localStorage.setItem('cskt_theme', isLight ? 'light' : 'dark'); } catch (e) { /* bỏ qua */ }
  if (window.AppDiagnostics) window.AppDiagnostics.logAction(isLight ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối');
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

  // Nạp thư viện văn bản gốc: dựng sách 3D + trích xuất toàn văn từng điều
  if (window.LegalLibrary) {
    if (window.Bookshelf) Bookshelf.renderStatus();
    LegalLibrary.init();
  }

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

      const chat = document.getElementById('ai-chat-widget');
      if (flipModal && !flipModal.classList.contains('hidden')) {
        Flipbook.close();
      } else if (searchModal && !searchModal.classList.contains('hidden')) {
        LawSearch.closeResults();
      } else if (chat && !chat.classList.contains('hidden')) {
        AIChatbot.closeChat();
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
