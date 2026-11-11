/**
 * Thư viện Văn bản pháp luật (Legal Library Pipeline)
 * Đoàn cơ sở Phòng Cảnh sát kinh tế - Công an tỉnh Gia Lai
 *
 * Quy chuẩn xử lý mỗi văn bản PDF được đưa lên:
 *   Bước 1. Lưu giữ nguyên trạng 100% tệp gốc
 *           - Tệp đặt trong thư mục `tai-lieu-phap-ly/` của website (dùng chung cho mọi người), hoặc
 *           - Tệp tải lên từ trình duyệt: lưu nguyên khối nhị phân (Blob) trong IndexedDB, không chuyển đổi.
 *   Bước 2. Tạo cuốn sách 3D lật trang đọc trực tiếp từ chính file PDF gốc (PDF.js).
 *   Bước 3. Trích xuất toàn văn từng Điều để nạp vào Thanh tìm kiếm & bộ nhớ Trợ lý AI.
 *           Nội dung trích dẫn luôn là nguyên văn lấy từ lớp chữ của PDF gốc.
 */

const LegalLibrary = (() => {
  const FOLDER = 'tai-lieu-phap-ly/';
  const MANIFEST = FOLDER + 'danh-muc.json';
  const EXTRACTOR_VERSION = 4; // tăng khi đổi thuật toán trích xuất -> tự trích xuất lại
  const DB_NAME = 'phapluatso-cskt';
  const DB_VERSION = 1;

  const state = {
    docs: [],        // { id, title, docNumber, docType, source, url|blob, fileName, size, category, pageTexts, units, status, error }
    units: [],       // điều luật / đoạn văn đã trích xuất (phẳng, dùng cho tìm kiếm & AI)
    listeners: [],
    loading: false,
    progress: { done: 0, total: 0, current: '' }
  };

  /* ---------------------- Tiện ích chuỗi ---------------------- */
  const norm = (s) => (s || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'D')
    .toLowerCase();

  const escapeHtml = (s) => String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  const slug = (s) => norm(s).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);

  const prettifyFileName = (name) => {
    const base = decodeURIComponent(name).replace(/\.pdf$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
    return base.charAt(0).toUpperCase() + base.slice(1);
  };

  /* ---------------------- IndexedDB ---------------------- */
  let dbPromise = null;
  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve) => {
      try {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('files')) db.createObjectStore('files', { keyPath: 'id' });
          if (!db.objectStoreNames.contains('extracts')) db.createObjectStore('extracts', { keyPath: 'key' });
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
    return dbPromise;
  }

  async function dbOp(store, mode, fn) {
    const db = await openDb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(store, mode);
        const req = fn(tx.objectStore(store));
        tx.oncomplete = () => resolve(req ? req.result : null);
        tx.onerror = () => resolve(null);
        tx.onabort = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  const dbGet = (store, key) => dbOp(store, 'readonly', s => s.get(key));
  const dbPut = (store, value) => dbOp(store, 'readwrite', s => s.put(value));
  const dbDelete = (store, key) => dbOp(store, 'readwrite', s => s.delete(key));
  const dbAll = (store) => dbOp(store, 'readonly', s => s.getAll());

  /* ---------------------- Phân loại chuyên đề ---------------------- */
  const CATEGORY_STYLE = {
    'hinh-su':        { label: 'Hình sự & VPHC',      spine: 'from-red-900 via-rose-950 to-slate-950',  cover: '#881337' },
    'doanh-nghiep':   { label: 'Doanh nghiệp & Đầu tư', spine: 'from-blue-900 to-indigo-950',          cover: '#1e3a8a' },
    'thue-tai-chinh': { label: 'Thuế - Đấu thầu',      spine: 'from-amber-800 to-amber-950',             cover: '#78350f' },
    'nghiep-vu':      { label: 'Nghiệp vụ & Nghị quyết', spine: 'from-emerald-800 to-green-950',        cover: '#065f46' }
  };

  function guessCategory(text) {
    const t = norm(text);
    if (/hinh su|xu ly vi pham|vi pham hanh chinh|to tung|toi pham/.test(t)) return 'hinh-su';
    if (/thue|dau thau|ngan hang|tin dung|hoa don|hai quan|ke toan/.test(t)) return 'thue-tai-chinh';
    if (/doanh nghiep|dau tu|thuong mai|canh tranh|so huu tri tue/.test(t)) return 'doanh-nghiep';
    return 'nghiep-vu';
  }

  /* ---------------------- Bước 3: Trích xuất văn bản ---------------------- */
  async function extractPageLines(page) {
    const tc = await page.getTextContent();
    const lines = [];
    let cur = '';
    let lastY = null;
    let lastX = null;
    for (const it of tc.items) {
      if (typeof it.str !== 'string') continue;
      const y = it.transform[5];
      const x = it.transform[4];
      const h = Math.abs(it.height || it.transform[3] || 10);
      if (lastY !== null && Math.abs(y - lastY) > Math.max(2, h * 0.5)) {
        lines.push(cur);
        cur = '';
        lastX = null;
      }
      // Bổ sung khoảng trắng khi hai cụm chữ cách nhau trên cùng dòng mà PDF không chèn dấu cách
      if (cur && lastX !== null && it.str && !/\s$/.test(cur) && !/^\s/.test(it.str) && x - lastX > h * 0.2) {
        cur += ' ';
      }
      cur += it.str;
      lastX = x + (it.width || 0);
      lastY = y;
      if (it.hasEOL) {
        lines.push(cur);
        cur = '';
        lastY = null;
        lastX = null;
      }
    }
    if (cur) lines.push(cur);
    return lines
      .map(l => l.normalize('NFC').replace(/\s+/g, ' ').trim())
      .filter(Boolean);
  }

  // Loại bỏ tiêu đề / chân trang lặp lại và số trang để toàn văn điều luật không bị lẫn
  function stripRunningHeaders(pagesLines) {
    const n = pagesLines.length;
    if (n < 4) return pagesLines.map(lines => lines.filter(l => !/^(trang\s*)?\d{1,4}(\s*\/\s*\d{1,4})?$/i.test(l)));
    const count = new Map();
    pagesLines.forEach(lines => {
      const edge = new Set([...lines.slice(0, 3), ...lines.slice(-3)].map(l => norm(l).replace(/\d+/g, '#')));
      edge.forEach(k => count.set(k, (count.get(k) || 0) + 1));
    });
    const repeated = new Set([...count.entries()].filter(([k, c]) => c >= Math.max(3, n * 0.5) && k.length < 120).map(([k]) => k));
    return pagesLines.map(lines => lines.filter((l, i) => {
      if (/^(trang\s*)?\d{1,4}(\s*\/\s*\d{1,4})?$/i.test(l)) return false;
      const isEdge = i < 3 || i >= lines.length - 3;
      return !(isEdge && repeated.has(norm(l).replace(/\d+/g, '#')));
    }));
  }

  const DOC_TYPE_RE = /^(BỘ LUẬT|LUẬT|NGHỊ ĐỊNH|THÔNG TƯ LIÊN TỊCH|THÔNG TƯ|NGHỊ QUYẾT|QUYẾT ĐỊNH|PHÁP LỆNH|CHỈ THỊ|HIẾN PHÁP|VĂN BẢN HỢP NHẤT|KẾT LUẬN|HƯỚNG DẪN|CÔNG VĂN)\b/;

  function detectMetadata(firstLines) {
    const meta = { docType: '', title: '', docNumber: '' };
    const joined = firstLines.join('\n');
    const numMatch = joined.match(/\b(\d{1,4}\/\d{4}\/[A-ZĐ0-9][A-ZĐ0-9\-]*)\b/) || joined.match(/Số[:\s]+([0-9]{1,4}-[A-ZĐ]{2,}\/[A-ZĐ]+)/);
    if (numMatch) meta.docNumber = numMatch[1];
    for (let i = 0; i < firstLines.length; i++) {
      const line = firstLines[i];
      const m = line.match(DOC_TYPE_RE);
      if (m && line === line.toUpperCase() && line.length < 160) {
        meta.docType = m[1];
        const parts = [line];
        for (let j = i + 1; j < Math.min(i + 4, firstLines.length); j++) {
          const nxt = firstLines[j];
          if (nxt === nxt.toUpperCase() && /[A-ZÀ-Ỹ]/.test(nxt) && nxt.length < 160 && !/^(CĂN CỨ|CHƯƠNG|ĐIỀU)\b/.test(nxt)) parts.push(nxt);
          else break;
        }
        meta.title = parts.join(' ').replace(/\s+/g, ' ').trim();
        break;
      }
    }
    return meta;
  }

  const ARTICLE_RE = /^(Điều|Dieu)\s+(\d{1,4})([a-zđ]?)\s*[\.:]\s*(.*)$/i;
  const CHAPTER_RE = /^(Chương|CHƯƠNG|Phần|PHẦN)\s+([IVXLCDM]+|\d+|thứ\s+\S+)\b(.*)$/;
  const SECTION_RE = /^(Mục|MỤC)\s+(\d+|[IVXLC]+)\b(.*)$/;

  // Ghép các dòng bị ngắt do khổ giấy thành đoạn văn – không thay đổi chữ, chỉ chuẩn hóa xuống dòng
  function linesToParagraphs(lines) {
    const out = [];
    lines.forEach(line => {
      const startsNew = /^(\d{1,3}[\.\)]\s|[a-zđ]\)\s|[\-–•+]\s|Điều\s+\d|Chương\s|Mục\s|[“"]?Điều\s)/i.test(line);
      const prev = out[out.length - 1];
      if (!prev || startsNew || /[\.:;!?”"]$/.test(prev)) out.push(line);
      else out[out.length - 1] = prev + ' ' + line;
    });
    return out.join('\n');
  }

  function buildUnits(doc, pagesLines) {
    const units = [];
    let chapter = '';
    let pendingChapterTitle = false;
    let current = null;
    let lastNum = -1;
    const preamble = { lines: [], page: 1 };

    const flush = () => {
      if (current) {
        current.text = linesToParagraphs(current.lines);
        delete current.lines;
        units.push(current);
        current = null;
      }
    };

    pagesLines.forEach((lines, pIdx) => {
      lines.forEach(line => {
        const chap = line.match(CHAPTER_RE);
        if (chap && line.length < 140) {
          chapter = line;
          pendingChapterTitle = true;
          return;
        }
        if (pendingChapterTitle) {
          pendingChapterTitle = false;
          if (line === line.toUpperCase() && /[A-ZÀ-Ỹ]/.test(line) && !ARTICLE_RE.test(line)) {
            chapter += ' – ' + line;
            return;
          }
        }
        if (SECTION_RE.test(line) && line.length < 140 && line === line.toUpperCase()) return;

        const m = line.match(ARTICLE_RE);
        if (m) {
          const num = parseInt(m[2], 10);
          const key = norm(`${m[2]}${m[3] || ''}`);
          // Cùng một Điều được nhắc lại ở đầu trang sau ("Điều 2 … (tiếp theo)") -> nối tiếp, không tách
          if (current && current.articleKey === key) {
            current.lines.push(line);
            return;
          }
          // Bỏ qua dòng viện dẫn "Điều x." bị ngắt dòng ngẫu nhiên làm số điều giảm bất thường
          if (num >= lastNum || lastNum - num > 50) {
            flush();
            lastNum = num;
            const label = `${m[1]} ${m[2]}${m[3] || ''}`; // giữ nguyên chữ "Điều" như trong văn bản gốc
            current = {
              id: `${doc.id}::${slug(label)}::${units.length}`,
              docId: doc.id,
              kind: 'article',
              article: label,
              articleKey: key,
              title: (m[4] || '').trim(),
              chapter,
              page: pIdx + 1,
              lines: [line]
            };
            return;
          }
        }
        if (current) current.lines.push(line);
        else preamble.lines.push(line);
      });
    });
    flush();

    // Văn bản không chia theo Điều (Nghị quyết, cẩm nang...): trích theo từng trang
    if (units.length === 0) {
      pagesLines.forEach((lines, pIdx) => {
        if (!lines.length) return;
        units.push({
          id: `${doc.id}::trang-${pIdx + 1}`,
          docId: doc.id,
          kind: 'page',
          article: `Trang ${pIdx + 1}`,
          articleKey: '',
          title: lines[0].slice(0, 140),
          chapter: '',
          page: pIdx + 1,
          text: linesToParagraphs(lines)
        });
      });
    } else if (preamble.lines.length) {
      units.unshift({
        id: `${doc.id}::phan-mo-dau`,
        docId: doc.id,
        kind: 'preamble',
        article: 'Phần mở đầu',
        articleKey: '',
        title: 'Căn cứ ban hành',
        chapter: '',
        page: 1,
        text: linesToParagraphs(preamble.lines)
      });
    }
    return units;
  }

  async function extractFromArrayBuffer(doc, buffer) {
    if (!window.pdfjsLib) throw new Error('Thư viện PDF.js chưa sẵn sàng');
    // Sao chép bộ đệm để PDF.js không "chiếm" (detach) dữ liệu gốc
    const pdf = await window.pdfjsLib.getDocument({ data: new Uint8Array(buffer.slice(0)) }).promise;
    const rawPages = [];
    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      rawPages.push(await extractPageLines(page));
      page.cleanup();
      state.progress.current = `${doc.title} – trang ${p}/${pdf.numPages}`;
      notify();
    }
    const pagesLines = stripRunningHeaders(rawPages);
    const pageTexts = rawPages.map(lines => lines.join('\n'));
    const totalChars = pageTexts.reduce((a, t) => a + t.length, 0);
    const meta = detectMetadata(rawPages.slice(0, 2).flat().slice(0, 60));
    const result = {
      numPages: pdf.numPages,
      pageTexts,
      meta,
      scanned: totalChars < 40 * Math.max(1, pdf.numPages) * 0.25,
      units: []
    };
    if (!result.scanned) {
      result.units = buildUnits(doc, pagesLines);
    }
    pdf.destroy();
    return result;
  }

  /* ---------------------- Nạp danh mục văn bản ---------------------- */
  async function loadManifestEntries() {
    const entries = new Map();
    try {
      const res = await fetch(MANIFEST + '?v=' + Date.now(), { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        (data.files || data || []).forEach(f => {
          if (f && f.file && /\.pdf$/i.test(f.file)) entries.set(f.file, f);
        });
      }
    } catch (e) { /* chưa có danh mục */ }

    // Máy chủ cục bộ (python http.server) cho phép liệt kê thư mục -> tự nhận file mới chưa có trong danh mục
    try {
      const res = await fetch(FOLDER, { cache: 'no-store' });
      const type = res.headers.get('content-type') || '';
      if (res.ok && type.includes('text/html')) {
        const html = await res.text();
        const re = /href="([^"?#]+\.pdf)"/gi;
        let m;
        while ((m = re.exec(html))) {
          const file = decodeURIComponent(m[1].split('/').pop());
          if (!entries.has(file)) entries.set(file, { file });
        }
      }
    } catch (e) { /* bỏ qua */ }

    return [...entries.values()];
  }

  function makeDocFromEntry(entry) {
    const fileName = entry.file;
    return {
      id: 'tl-' + slug(fileName.replace(/\.pdf$/i, '')),
      title: entry.title || prettifyFileName(fileName),
      titleFromManifest: !!entry.title,
      shortTitle: entry.shortTitle || '',
      docNumber: entry.number || '',
      docType: '',
      category: entry.category || '',
      year: entry.year || '',
      source: 'folder',
      fileName,
      url: FOLDER + encodeURIComponent(fileName),
      size: entry.size || 0,
      sha: entry.sha || '',
      status: 'pending',
      units: [],
      pageTexts: []
    };
  }

  async function cacheKeyFor(doc) {
    if (doc.source === 'upload') return `v${EXTRACTOR_VERSION}|upload|${doc.id}`;
    let sig = doc.sha || (doc.size ? String(doc.size) : '');
    if (!sig) {
      try {
        const head = await fetch(doc.url, { method: 'HEAD', cache: 'no-store' });
        sig = (head.headers.get('content-length') || '') + '|' + (head.headers.get('last-modified') || head.headers.get('etag') || '');
      } catch (e) { sig = ''; }
    }
    return `v${EXTRACTOR_VERSION}|${doc.url}|${sig}`;
  }

  async function processDoc(doc) {
    doc.status = 'processing';
    notify();
    try {
      const key = await cacheKeyFor(doc);
      let extracted = key ? await dbGet('extracts', key) : null;
      if (!extracted) {
        let buffer;
        if (doc.source === 'upload') buffer = await doc.blob.arrayBuffer();
        else {
          const res = await fetch(doc.url, { cache: 'no-store' });
          if (!res.ok) throw new Error(`Không tải được tệp (${res.status})`);
          buffer = await res.arrayBuffer();
        }
        doc.size = doc.size || buffer.byteLength;
        const result = await extractFromArrayBuffer(doc, buffer);
        extracted = { key, ...result, savedAt: Date.now() };
        await dbPut('extracts', extracted);
      }
      applyExtract(doc, extracted);
      doc.status = extracted.scanned ? 'scanned' : 'ready';
    } catch (err) {
      console.warn('Lỗi xử lý văn bản', doc.fileName, err);
      doc.status = 'error';
      doc.error = err.message || String(err);
    }
    rebuildUnits();
    notify();
  }

  function applyExtract(doc, ex) {
    doc.pagesCount = ex.numPages;
    doc.pageTexts = ex.pageTexts || [];
    doc.units = (ex.units || []).map(u => ({ ...u, docId: doc.id }));
    if (ex.meta) {
      doc.docType = ex.meta.docType || doc.docType;
      if (!doc.docNumber && ex.meta.docNumber) doc.docNumber = ex.meta.docNumber;
      if (!doc.titleFromManifest && ex.meta.title) {
        doc.title = ex.meta.title.charAt(0) + ex.meta.title.slice(1).toLowerCase();
        if (doc.docNumber) doc.title += ` (số ${doc.docNumber})`;
      }
    }
    if (!doc.category) doc.category = guessCategory(doc.title + ' ' + (doc.pageTexts[0] || '').slice(0, 800));
  }

  function rebuildUnits() {
    state.units = state.docs.flatMap(d => d.units || []);
  }

  /* ---------------------- Bước 1: Tải lên (lưu nguyên trạng tệp gốc) ---------------------- */
  async function addUploadedFiles(fileList) {
    const files = [...fileList].filter(f => /\.pdf$/i.test(f.name) || f.type === 'application/pdf');
    const added = [];
    for (const file of files) {
      const id = 'up-' + slug(file.name.replace(/\.pdf$/i, '')) + '-' + file.size;
      if (state.docs.some(d => d.id === id)) continue;
      // Lưu nguyên khối nhị phân của tệp gốc, không nén/không chuyển đổi
      const record = { id, fileName: file.name, type: file.type || 'application/pdf', size: file.size, lastModified: file.lastModified, addedAt: Date.now(), blob: file };
      await dbPut('files', record);
      const doc = makeUploadDoc(record);
      state.docs.push(doc);
      added.push(doc);
    }
    notify();
    for (const doc of added) await processDoc(doc);
    return added;
  }

  function makeUploadDoc(record) {
    return {
      id: record.id,
      title: prettifyFileName(record.fileName),
      shortTitle: '',
      docNumber: '',
      docType: '',
      category: '',
      source: 'upload',
      fileName: record.fileName,
      blob: record.blob,
      size: record.size,
      addedAt: record.addedAt,
      status: 'pending',
      units: [],
      pageTexts: []
    };
  }

  async function removeUploaded(docId) {
    const doc = state.docs.find(d => d.id === docId);
    if (!doc || doc.source !== 'upload') return;
    await dbDelete('files', docId);
    await dbDelete('extracts', `v${EXTRACTOR_VERSION}|upload|${docId}`);
    state.docs = state.docs.filter(d => d.id !== docId);
    rebuildUnits();
    notify();
  }

  function downloadOriginal(docId) {
    const doc = state.docs.find(d => d.id === docId);
    if (!doc) return;
    const a = document.createElement('a');
    if (doc.source === 'upload') {
      a.href = URL.createObjectURL(doc.blob);
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } else {
      a.href = doc.url;
    }
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  /* ---------------------- Khởi động ---------------------- */
  async function init() {
    if (state.loading) return;
    state.loading = true;
    const entries = await loadManifestEntries();
    const uploads = (await dbAll('files')) || [];
    state.docs = [
      ...entries.map(makeDocFromEntry),
      ...uploads.sort((a, b) => a.addedAt - b.addedAt).map(makeUploadDoc)
    ];
    state.progress = { done: 0, total: state.docs.length, current: '' };
    notify();
    for (const doc of state.docs) {
      await processDoc(doc);
      state.progress.done++;
      notify();
    }
    state.progress.current = '';
    state.loading = false;
    notify();
  }

  /* ---------------------- Tìm kiếm & truy hồi căn cứ ---------------------- */
  const STOPWORDS = new Set(['dieu', 'khoan', 'diem', 'luat', 'theo', 'quy', 'dinh', 'cua', 'va', 'la', 'cac', 'nhung', 'co', 'khong', 'the', 'nao', 'gi', 'bi', 'duoc', 'thi', 'khi', 'neu', 'cho', 'voi', 've', 'trong', 'mot', 'nay', 'do', 'de', 'tai', 'hoi', 'xin', 'ban', 'toi', 'minh', 'dong', 'chi', 'oi', 'a', 'ah', 'nhe', 'sao', 'bao', 'nhieu', 'hay', 'phai', 'can', 'muon', 'biet', 'lam', 'gium', 'giup']);
  // "tội" sau khi bỏ dấu thành "toi" – trùng đại từ "tôi"; giữ lại khi đi kèm danh từ tội danh
  const keepToi = (q) => /\btoi\s+(pham|danh|buon|tron|lua|rua|cho|san|lam|nhan|dua|gay|vi|chiem)/.test(q);

  function tokenize(query) {
    const q = norm(query);
    const toks = q.split(/[^a-z0-9]+/).filter(t => t.length >= 2 || /\d/.test(t));
    return toks.filter(t => !STOPWORDS.has(t) || (t === 'toi' && keepToi(q)));
  }

  function parseArticleQuery(query) {
    const q = norm(query).trim();
    const m = q.match(/(?:dieu|d\.)\s*(\d{1,4}[a-z]?)\b/) || q.match(/^(\d{1,4}[a-z]?)$/);
    return m ? m[1] : null;
  }

  function scoreUnit(unit, doc, ctx) {
    let score = 0;
    if (ctx.articleKey && unit.articleKey === ctx.articleKey) score += 120;
    const nTitle = unit._nTitle || (unit._nTitle = norm(unit.article + ' ' + unit.title));
    const nText = unit._nText || (unit._nText = norm(unit.text));
    const nDoc = doc._nTitle || (doc._nTitle = norm(doc.title + ' ' + (doc.docNumber || '')));
    if (ctx.phrase && ctx.phrase.length >= 3) {
      if (nTitle.includes(ctx.phrase)) score += 45;
      else if (nText.includes(ctx.phrase)) score += 25;
    }
    let hit = 0;
    ctx.tokens.forEach(t => {
      let any = false;
      if (nTitle.includes(t)) { score += 8; any = true; }
      if (nText.includes(t)) { score += Math.min(6, 1 + nText.split(t).length - 1); any = true; }
      if (nDoc.includes(t)) { score += 3; any = true; }
      if (any) hit++;
    });
    if (ctx.tokens.length) {
      const coverage = hit / ctx.tokens.length;
      if (!ctx.articleKey && coverage < 0.6) return 0;
      score *= 0.5 + coverage;
    }
    if (unit.kind === 'preamble') score *= 0.6;
    return score;
  }

  function search(query, { limit = 30 } = {}) {
    const articleKey = parseArticleQuery(query);
    const tokens = tokenize(query).filter(t => !(articleKey && t === articleKey));
    const phrase = norm(query).replace(/\s+/g, ' ').trim();
    if (!articleKey && tokens.length === 0) return [];
    const ctx = { articleKey, tokens, phrase };
    const docMap = new Map(state.docs.map(d => [d.id, d]));
    const results = [];
    state.units.forEach(u => {
      const doc = docMap.get(u.docId);
      if (!doc) return;
      const s = scoreUnit(u, doc, ctx);
      if (s > 0) results.push({ unit: u, doc, score: s });
    });
    results.sort((a, b) => b.score - a.score);
    return results.slice(0, limit);
  }

  // Truy hồi căn cứ cho Trợ lý AI
  function retrieve(question, k = 5) {
    const results = search(question, { limit: k * 3 });
    if (!results.length) return [];
    const top = results[0].score;
    return results.filter(r => r.score >= Math.max(8, top * 0.35)).slice(0, k);
  }

  /* ---------------------- Hiển thị ---------------------- */
  function highlight(text, query) {
    let html = escapeHtml(text);
    const terms = [...new Set((query || '').split(/\s+/).filter(t => t.length >= 2))]
      .map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    if (!terms.length) return html;
    try {
      const re = new RegExp(`(${terms.join('|')})`, 'gi');
      html = html.replace(re, '<mark class="bg-amber-300 text-slate-950 px-0.5 rounded">$1</mark>');
    } catch (e) { /* bỏ qua */ }
    return html;
  }

  function citationLabel(unit, doc) {
    const head = unit.kind === 'article' ? `${unit.article}${unit.title ? '. ' + unit.title : ''}` : unit.article;
    return `${head} — ${doc.title}`;
  }

  function verbatimText(unit, doc) {
    return `${citationLabel(unit, doc)}\n(Trang ${unit.page} tệp gốc: ${doc.fileName})\n\n${unit.text}`;
  }

  /* ---------------------- Chuyển thành sách cho kệ 3D ---------------------- */
  function toBook(doc) {
    const cat = CATEGORY_STYLE[doc.category] || CATEGORY_STYLE['nghiep-vu'];
    const short = doc.shortTitle || doc.title.replace(/\s*\(số [^)]*\)\s*$/i, '');
    return {
      id: doc.id,
      title: doc.title,
      shortTitle: short.length > 70 ? short.slice(0, 67) + '…' : short,
      category: doc.category || 'nghiep-vu',
      categoryLabel: doc.docNumber || cat.label,
      badge: doc.source === 'upload' ? 'Tải lên' : (doc.docType || 'Văn bản gốc'),
      spineColor: cat.spine,
      coverColor: cat.cover,
      pagesCount: doc.pagesCount || '…',
      pdfUrl: doc.source === 'folder' ? doc.url : undefined,
      pdfFile: doc.source === 'upload' ? doc.blob : undefined,
      pageTexts: doc.pageTexts,
      fromLibrary: true,
      source: doc.source,
      status: doc.status,
      articleCount: (doc.units || []).filter(u => u.kind === 'article').length,
      description: doc.fileName
    };
  }

  /* ---------------------- Sự kiện ---------------------- */
  function onChange(fn) { state.listeners.push(fn); }
  let notifyQueued = false;
  function notify() {
    if (notifyQueued) return;
    notifyQueued = true;
    requestAnimationFrame(() => {
      notifyQueued = false;
      state.listeners.forEach(fn => { try { fn(state); } catch (e) { console.warn(e); } });
    });
  }

  return {
    init, onChange, search, retrieve, highlight, verbatimText, citationLabel, escapeHtml, norm,
    addUploadedFiles, removeUploaded, downloadOriginal, toBook,
    get docs() { return state.docs; },
    get units() { return state.units; },
    get progress() { return state.progress; },
    get loading() { return state.loading; },
    getDoc: (id) => state.docs.find(d => d.id === id),
    getUnit: (id) => state.units.find(u => u.id === id),
    FOLDER
  };
})();

window.LegalLibrary = LegalLibrary;
