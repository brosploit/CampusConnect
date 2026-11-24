#!/bin/sh
set -eu

# Campus Connect Encrypted Backup Restoration & Verification Script
# Validates SHA-256 checksum, decrypts archive, and restores to target database.

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <path_to_encrypted_backup.enc> [target_db_name]" >&2
  exit 1
fi

ENCRYPTED_FILE="$1"
TARGET_DB="${2:-campus_connect_restore_test}"
CHECKSUM_FILE="${ENCRYPTED_FILE}.sha256"
DECRYPTED_FILE="/tmp/campusconnect_restore_$$.sql"

if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo "[ERROR] BACKUP_ENCRYPTION_KEY environment variable is not set." >&2
  exit 1
fi

# 1. Verify SHA-256 Checksum Integrity
if [ -f "${CHECKSUM_FILE}" ]; then
  echo "[$(date)] Verifying SHA-256 checksum integrity..."
  if sha256sum -c "${CHECKSUM_FILE}"; then
    echo "[$(date)] Checksum verified. Backup file integrity confirmed."
  else
    echo "[FATAL] Checksum verification failed! Backup may be corrupted or tampered with." >&2
    exit 1
  fi
else
  echo "[WARN] No checksum file found for ${ENCRYPTED_FILE}; proceeding with caution."
fi

# 2. Decrypt Backup to Temporary Location
echo "[$(date)] Decrypting backup archive..."
openssl enc -d -aes-256-cbc -pbkdf2 -iter 100000 \
  -in "${ENCRYPTED_FILE}" \
  -out "${DECRYPTED_FILE}" \
  -k "${BACKUP_ENCRYPTION_KEY}"

# Ensure cleanup on exit
trap 'rm -f "${DECRYPTED_FILE}"' EXIT

# 3. Restore to Target Database
echo "[$(date)] Restoring backup into target database '${TARGET_DB}'..."
pg_restore -h "${PGHOST:-localhost}" \
           -U "${PGUSER:-postgres}" \
           -d "${TARGET_DB}" \
           --clean \
           --if-exists \
           "${DECRYPTED_FILE}"

echo "[$(date)] Database restoration drill completed successfully into '${TARGET_DB}'."
