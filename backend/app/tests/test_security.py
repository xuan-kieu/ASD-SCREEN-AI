"""
tests/test_security.py — Test hash_password và verify_password trong security.py
Chạy: cd backend && pytest tests/test_security.py -v
"""
import pytest
from app.utils.security import hash_password, verify_password


def test_hash_khong_phai_plain_text():
    """Hash phải khác với mật khẩu gốc"""
    hashed = hash_password("matkhau123")
    assert hashed != "matkhau123"
    assert isinstance(hashed, str)


def test_hash_la_bcrypt():
    """Kết quả phải là định dạng bcrypt hợp lệ"""
    hashed = hash_password("matkhau123")
    assert hashed.startswith("$2b$")


def test_verify_dung_mat_khau():
    """Mật khẩu đúng phải trả về True"""
    password = "matkhau_chinh_xac"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True


def test_verify_sai_mat_khau():
    """Mật khẩu sai phải trả về False"""
    hashed = hash_password("matkhau123")
    assert verify_password("matkhau_sai", hashed) is False


def test_verify_chuoi_rong():
    """Mật khẩu rỗng không match với hash của mật khẩu khác"""
    hashed = hash_password("matkhau123")
    assert verify_password("", hashed) is False


def test_hash_salt_ngau_nhien():
    """Cùng mật khẩu nhưng hash phải khác nhau mỗi lần (do salt ngẫu nhiên)"""
    h1 = hash_password("abc123")
    h2 = hash_password("abc123")
    assert h1 != h2


def test_hash_gioi_han_72_ky_tu():
    """
    bcrypt chỉ dùng 72 ký tự đầu.
    Hai chuỗi chỉ khác nhau ở ký tự thứ 73 trở đi phải được coi là giống nhau.
    """
    base = "a" * 72
    hashed = hash_password(base + "xxx")
    assert verify_password(base + "yyy", hashed) is True


def test_verify_hash_khong_hop_le():
    """Không được raise exception khi hash không phải định dạng bcrypt"""
    result = verify_password("abc", "khong_phai_bcrypt_hash")
    assert result is False


def test_verify_hash_rong():
    """Không được raise exception khi hash là chuỗi rỗng"""
    result = verify_password("abc", "")
    assert result is False