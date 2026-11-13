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
  if (window.updateScrollTint) window.updateScrollTint();
}

// Hiệu ứng đổi màu nền nhẹ theo vị trí cuộn trang
// Mỗi mốc gồm [màu nền, màu quầng sáng]; màu chuyển dần giữa các mốc theo vị trí cuộn
const SCROLL_PALETTE = {
  dark: [
    ['#0f172a', '#1e40af'],   // xanh đêm      + quầng xanh dương
    ['#0b2a5e', '#f59e0b'],   // xanh CAND     + quầng vàng
    ['#053f4d', '#10b981'],   // xanh ngọc     + quầng ngọc lục bảo
    ['#2b1757', '#d946ef'],   // tím than      + quầng hồng tím
    ['#4a1420', '#fbbf24']    // đỏ mận        + quầng vàng kim
  ],
  light: [
    ['#eef2f8', '#93c5fd'],   // xám xanh      + quầng xanh dương
    ['#dbeafe', '#fcd34d'],   // xanh trời     + quầng vàng
    ['#fde7c2', '#fb923c'],   // vàng kem      + quầng cam
    ['#d3f4e3', '#34d399'],   // xanh bạc hà   + quầng ngọc
    ['#efe1ff', '#c084fc']    // tím oải hương + quầng tím
  ]
};
function initScrollTint() {
  const toRgb = (h) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const pal = {
    dark: SCROLL_PALETTE.dark.map(([bg, glow]) => [toRgb(bg), toRgb(glow)]),
    light: SCROLL_PALETTE.light.map(([bg, glow]) => [toRgb(bg), toRgb(glow)])
  };
  const root = document.documentElement;
  let queued = false;
  const mix = (a, b, t) => a.map((v, k) => Math.round(v + (b[k] - v) * t));
  // Làm mượt chuyển tiếp giữa các mốc màu
  const ease = (t) => t * t * (3 - 2 * t);

  const update = () => {
    queued = false;
    const max = root.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
    const isLight = document.body.classList.contains('light-mode');
    const stops = isLight ? pal.light : pal.dark;
    const seg = p * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(seg));
    const t = ease(seg - i);
    const bg = mix(stops[i][0], stops[i + 1][0], t);
    const glow = mix(stops[i][1], stops[i + 1][1], t);
    root.style.setProperty('--scroll-bg', `rgb(${bg.join(',')})`);
    root.style.setProperty('--scroll-glow', `rgba(${glow.join(',')},${isLight ? 0.45 : 0.32})`);
    // Quầng sáng trôi ngang nhẹ theo vị trí cuộn
    root.style.setProperty('--scroll-glow-x', `${Math.round(20 + p * 60)}%`);
  };

  window.addEventListener('scroll', () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  window.addEventListener('resize', update);
  window.updateScrollTint = update;
  update();
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
  initScrollTint();

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
