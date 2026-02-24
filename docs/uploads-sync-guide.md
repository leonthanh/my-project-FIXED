# Huong Dan Dong Bo Uploads (cPanel)

Tai lieu nay huong dan cach dong bo thu muc `backend/uploads` len production sau khi uploads da duoc gitignore.

## Khi nao can dung
- Ban tao hoac sua de IELTS/Cambridge o local va upload hinh/anh thanh.
- Ban export/import database len production.
- Hinh anh hoac am thanh khong hien tren production do thieu file.

## Dong bo nhanh (khuyen nghi)
Chay cac lenh sau tai terminal, o thu muc root cua repo:

```bash
export FTP_USERNAME="your_ftp_user"
export FTP_PASSWORD="your_ftp_pass"
bash scripts/sync-uploads.sh
```

No lam gi:
- Upload file moi hoac cap nhat tu `backend/uploads` len:
  `/ix.star-siec.edu.vn/backend/uploads`
- Khong xoa file tren server.

## Dong bo khong can lftp (Windows + PowerShell)
Can cai WinSCP (ban cai tu https://winscp.net). Sau do chay:

```powershell
$env:FTP_USERNAME="your_ftp_user"
$env:FTP_PASSWORD="your_ftp_pass"
powershell -ExecutionPolicy Bypass -File scripts/sync-uploads.ps1
```

No lam gi:
- Upload file moi hoac cap nhat tu `backend/uploads` len:
  `/ix.star-siec.edu.vn/backend/uploads`
- Khong xoa file tren server.

## Yeu cau
- Git Bash hoac WSL tren Windows.
- Da cai `lftp` (neu dung script `.sh`).
- WinSCP (neu dung script `.ps1`).

### Cai lftp
- Windows (Git Bash):
  - Cach A: Cai bang Chocolatey: `choco install lftp`
  - Cach B: Dung WSL va cai: `sudo apt-get install lftp`
- Linux: `sudo apt-get install lftp`
- macOS (Homebrew): `brew install lftp`

## Upload zip thu cong (phuong an khac)
Neu ban khong muon dung script:
1) Zip thu muc `backend/uploads` o may local.
2) Upload file zip len cPanel File Manager:
   `ix.star-siec.edu.vn/backend/`
3) Extract de file nam dung tai:
   `ix.star-siec.edu.vn/backend/uploads/`

## Kiem tra
Mo mot trong cac URL sau tren trinh duyet:
- `https://ix.star-siec.edu.vn/uploads/images/<filename>`
- `https://ix.star-siec.edu.vn/uploads/audio/<filename>`
- `https://ix.star-siec.edu.vn/uploads/cambridge/<filename>`

Neu file hien thi, dong bo thanh cong.

## Ghi chu
- Import database khong bao gom file. Uploads phai copy rieng.
- Workflow deploy khong con ship `backend/uploads`.
