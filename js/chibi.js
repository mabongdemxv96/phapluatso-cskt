/**
 * Linh vật & Chỉ dẫn tương tác
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 */

const ChibiMascot = {
  tips: [
    "Kính chào đồng chí! Đoàn cơ sở Phòng Cảnh sát kinh tế – Công an tỉnh Gia Lai trân trọng giới thiệu Không gian pháp luật số 3D.",
    "Đồng chí hãy bấm vào các cuốn sách trên kệ để trải nghiệm trình đọc lật sách 3D chân thực như sách thật nhé!",
    "Bấm vào mục 'Nghị quyết số 57-NQ/TW' trên thanh điều hướng để mở đọc trực tiếp toàn văn định hướng chuyển đổi số của Đảng!",
    "Cần tìm nhanh khung hình phạt về buôn lậu, trốn thuế, rửa tiền hay vi phạm hành chính? Hãy gõ từ khóa vào thanh Tìm kiếm phía trên!",
    "Trợ lý AI Pháp luật luôn sẵn sàng giải đáp thắc mắc 24/7. Hãy bấm nút 'Trợ lý AI' ở góc dưới bên phải nhé!"
  ],
  currentTipIndex: 0,
  speechTimeout: null,

  init() {
    this.container = document.getElementById('chibi-mascot-widget');
    this.speechBubble = document.getElementById('chibi-speech-bubble');
    this.speechText = document.getElementById('chibi-speech-text');
    this.chibiImg = document.getElementById('chibi-character-img');
    this.btnDismiss = document.getElementById('btn-dismiss-speech');
    
    this.bindEvents();
    
    // Initial welcome speech after 1.2s
    setTimeout(() => {
      this.speak(this.tips[0], 10000);
    }, 1200);

    // Auto rotate tips every 35s
    setInterval(() => {
      if (this.speechBubble && !this.speechBubble.classList.contains('hidden')) {
        this.nextTip();
      }
    }, 35000);
  },

  bindEvents() {
    if (this.chibiImg) {
      this.chibiImg.addEventListener('click', () => {
        this.nextTip();
      });
    }

    if (this.btnDismiss) {
      this.btnDismiss.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hideSpeech();
      });
    }
  },

  speak(text, duration = 8000) {
    if (!this.speechBubble || !this.speechText) return;

    clearTimeout(this.speechTimeout);
    this.speechText.textContent = text;
    this.speechBubble.classList.remove('hidden');

    if (this.chibiImg) {
      this.chibiImg.classList.remove('animate-bounce');
      void this.chibiImg.offsetWidth;
      this.chibiImg.classList.add('animate-bounce');
      setTimeout(() => {
        if (this.chibiImg) this.chibiImg.classList.remove('animate-bounce');
      }, 1000);
    }

    if (duration > 0) {
      this.speechTimeout = setTimeout(() => {
        this.hideSpeech();
      }, duration);
    }
  },

  nextTip() {
    this.currentTipIndex = (this.currentTipIndex + 1) % this.tips.length;
    this.speak(this.tips[this.currentTipIndex], 10000);
  },

  hideSpeech() {
    if (this.speechBubble) {
      this.speechBubble.classList.add('hidden');
    }
  }
};

window.ChibiMascot = ChibiMascot;
