#!/usr/bin/env bash
set -euo pipefail

FTP_SERVER="ftp.star-siec.edu.vn"
REMOTE_DIR="/ix.star-siec.edu.vn/backend/uploads"
LOCAL_DIR="backend/uploads"

if [[ ! -d "$LOCAL_DIR" ]]; then
  echo "Local uploads folder not found: $LOCAL_DIR" >&2
  exit 1
fi

if [[ -z "${FTP_USERNAME:-}" || -z "${FTP_PASSWORD:-}" ]]; then
  echo "Please set FTP_USERNAME and FTP_PASSWORD in your shell." >&2
  exit 1
fi

if ! command -v lftp >/dev/null 2>&1; then
  echo "lftp is required. Install it (e.g., 'choco install lftp' or 'apt-get install lftp')." >&2
  exit 1
fi

lftp -u "$FTP_USERNAME","$FTP_PASSWORD" "$FTP_SERVER" <<EOF
set ssl:verify-certificate no
set net:max-retries 2
set net:timeout 20
mirror -R --only-newer --verbose "$LOCAL_DIR" "$REMOTE_DIR"
bye
EOF

echo "Sync complete: $LOCAL_DIR -> $FTP_SERVER:$REMOTE_DIR"