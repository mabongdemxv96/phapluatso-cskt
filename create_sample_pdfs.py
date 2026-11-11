"""
Generate lightweight, standard-compliant PDF files for the Legal 3D Bookshelf.
Pure Python, zero external dependencies.
"""
import os

def create_simple_pdf(filename, title, subtitle, pages_content):
    def escape_text(text):
        return text.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)')

    objects = []
    
    def add_object(content):
        objects.append(content)
        return len(objects)

    # 1. Catalog
    cat_id = add_object("<< /Type /Catalog /Pages 2 0 R >>")
    
    # Reserve page tree id (2)
    tree_id = len(objects) + 1
    objects.append(None) # placeholder for Pages object
    
    # Font Helvetica
    font_id = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    font_reg_id = add_object("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")

    page_refs = []
    page_ids = []

    # Cover Page
    cover_stream = f"""BT
/F1 22 Tf
50 720 Td
({escape_text(title)}) Tj
0 -35 Td
/F2 13 Tf
({escape_text(subtitle)}) Tj
0 -40 Td
/F2 11 Tf
(DOAN CO SO PHONG CANH SAT KINH TE - CONG AN TINH GIA LAI) Tj
0 -25 Td
(TIEN PHONG THUC HIEN NGHI QUYET SO 57-NQ/TW) Tj
0 -60 Td
/F1 12 Tf
(XUAT BAN: TAI LIEU LUU HANH NOI BO & PHO BIEN PHAP LUAT SO) Tj
0 -30 Td
/F2 10 Tf
(Gia Lai - Cong trinh thanh nien chuyen doi so 4.0) Tj
ET"""
    cover_stream_obj = add_object(f"<< /Length {len(cover_stream.encode('latin1'))} >>\nstream\n{cover_stream}\nendstream")
    cover_page = add_object(f"<< /Type /Page /Parent {tree_id} 0 R /Resources << /Font << /F1 {font_id} 0 R /F2 {font_reg_id} 0 R >> >> /MediaBox [0 0 595 842] /Contents {cover_stream_obj} 0 R >>")
    page_refs.append(f"{cover_page} 0 R")

    # Content Pages
    for p_num, lines in enumerate(pages_content, start=1):
        stream_lines = ["BT", "/F1 14 Tf", f"50 770 Td", f"({escape_text(title)} - Trang {p_num}) Tj", "0 -30 Td", "/F2 10 Tf"]
        for line in lines:
            safe_l = escape_text(line)
            stream_lines.append(f"({safe_l}) Tj")
            stream_lines.append("0 -18 Td")
        stream_lines.append("ET")
        stream_str = "\n".join(stream_lines)
        s_obj = add_object(f"<< /Length {len(stream_str.encode('latin1'))} >>\nstream\n{stream_str}\nendstream")
        p_obj = add_object(f"<< /Type /Page /Parent {tree_id} 0 R /Resources << /Font << /F1 {font_id} 0 R /F2 {font_reg_id} 0 R >> >> /MediaBox [0 0 595 842] /Contents {s_obj} 0 R >>")
        page_refs.append(f"{p_obj} 0 R")

    # Fill Pages object (id = 2)
    kids_str = " ".join(page_refs)
    objects[tree_id - 1] = f"<< /Type /Pages /Kids [{kids_str}] /Count {len(page_refs)} >>"

    # Assemble PDF with Xref
    pdf_output = ["%PDF-1.4\n%âãÏÓ\n"]
    offsets = [0]
    curr_offset = len(pdf_output[0].encode('latin1'))

    for i, obj in enumerate(objects, start=1):
        offsets.append(curr_offset)
        obj_str = f"{i} 0 obj\n{obj}\nendobj\n"
        pdf_output.append(obj_str)
        curr_offset += len(obj_str.encode('latin1'))

    xref_offset = curr_offset
    xref_str = f"xref\n0 {len(objects) + 1}\n0000000000 65535 f \n"
    for off in offsets[1:]:
        xref_str += f"{off:010d} 00000 n \n"
    
    trailer_str = f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_offset}\n%%EOF\n"
    
    full_content = "".join(pdf_output) + xref_str + trailer_str
    
    with open(filename, 'wb') as f:
        f.write(full_content.encode('latin1'))
    print(f"Created: {filename} ({len(page_refs)} pages)")

os.makedirs("assets/docs", exist_ok=True)

# Doc 1: Bo luat Hinh su - Cac toi danh kinh te
create_simple_pdf(
    "assets/docs/bo_luat_hinh_su_kinh_te.pdf",
    "BO LUAT HINH SU - TOI PHAM KINH TE",
    "Trang tin phap luat so chuyen de: Cac toi pham ve trat tu quan ly kinh te",
    [
        [
            "CHUONG XVIII: CAC TOI PHAM XAM PHAM TRAT TU QUAN LY KINH TE",
            "--------------------------------------------------------------------------------",
            "Dieu 188. Toi buon lau:",
            "- Nguoi nao buon ban qua bien gioi hoac tu khu phi thue quan vao noi dia",
            "  hoac nguoc lai trai phap luat hang hoa, tien te, kim khi quy, da quy",
            "  co gia tri tu 100.000.000 dong tro len hoac duoi 100 trieu nhung da bi",
            "  xu phat vi pham hanh chinh se bi truy cuu trach nhiem hinh su.",
            "- Khung hinh phat: Phat tien tu 50 trieu den 5 ty dong hoac phat tu tu",
            "  06 thang den 20 nam.",
            "",
            "Dieu 189. Toi van chuyen trai phep hang hoa, tien te qua bien gioi:",
            "- Phat tien den 3 ty dong hoac phat tu den 10 nam tu.",
        ],
        [
            "Dieu 190. Toi san xuat, buon ban hang cam:",
            "- Phat tien tu 100 trieu den 3 ty dong hoac phat tu tu 01 nam den 15 nam.",
            "",
            "Dieu 200. Toi tron thue:",
            "- Hanh vi tron thue voi so tien tu 100.000.000 dong tro len",
            "  hoac duoi 100 trieu nhung da bi xu phat VPHC se bi khoi to.",
            "- Phat tien tu 100 trieu den 4,5 ty dong hoac phat tu tu 03 thang den 07 nam.",
            "",
            "Dieu 201. Toi cho vay lai nang trong giao dich dan su:",
            "- Cho vay voi muc lai suat gap 05 lan tro len muc lai suat cao nhat quy dinh",
            "  trong Bo luat Dan su, thu loi bat chinh tu 30 trieu dong tro len.",
            "- Hinh phat: Phat tien tu 50 trieu den 1 ty dong hoac phat tu den 03 nam.",
        ]
    ]
)

# Doc 2: Cam nang phong chong toi pham kinh te
create_simple_pdf(
    "assets/docs/cam_nang_cskt_gia_lai.pdf",
    "CAM NANG PHAP LUAT PHONG CHONG TOI PHAM KINH TE",
    "Tai lieu tuyen truyen & pho bien phap luat - Cong an tinh Gia Lai",
    [
        [
            "1. NHAN DIEN THU DOAN LUA DAO KINH TE QUA MANG XA HOI:",
            "- Chieu tro keu goi dau tu tai chinh lai suat cao, san Forex bat hop phap.",
            "- Thu doan gia danh co quan thue, co quan Cong an yeu cau chuyen tien.",
            "- Hanh vi lap cong ty 'ma' de mua ban trai phep hoa don GTGT.",
            "",
            "2. KHUYEN CAO NGUOI DAN VA DOANH NGHIEP:",
            "- Luon xac minh tinh phap ly cua cac hop dong kinh te, doi tac dau tu.",
            "- Khong cung cap thong tin tai khoan ngan hang, ma OTP cho nguoi la.",
            "- Bao ngay cho Co quan CSKT Cong an tinh Gia Lai khi phat hien dau hieu vi pham."
        ]
    ]
)

# Doc 3: Nghi quyet 57-NQ/TW
create_simple_pdf(
    "assets/docs/nghi_quyet_57_nq_tw.pdf",
    "NGHI QUYET SO 57-NQ/TW BO CHINH TRI",
    "Ve dot pha phat trien khoa hoc, cong nghe, doi moi sang tao va chuyen doi so",
    [
        [
            "I. TINH THANH VA MUC TIEU TRONG TAM:",
            "- Chu dong nam bat thoi co cua Cach mang cong nghiep lan thu tu.",
            "- Phat trien manh me kinh te so, xa hoi so va chinh quyen so.",
            "- Phat huy vai tro xung kich, tien phong cua luc luong Doan Vien Thanh Nien.",
            "",
            "II. NHIEM VU CUA DOAN THANH NIEN CONG AN NHAN DAN:",
            "- Ung dung manh me cong nghe thong tin, tri tue nhan tao (AI) trong",
            "  cong tac tuyen truyen, pho bien, giao duc phap luat cho nhan dan.",
            "- Xay dung cac khong gian phap luat so, tu sach phap luat dien tu 3D.",
            "- Sang tao, xung kich vi an ninh trat tu va hanh phuc cua nhan dan."
        ]
    ]
)
print("All sample PDF files generated successfully!")
