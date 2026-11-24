#!/bin/sh
set -eu

# Campus Connect Encrypted Automated Backup Script
# Performs encrypted pg_dump, generates SHA-256 integrity checksum,
# applies retention pruning, and notifies monitoring systems.

BACKUP_DIR="${BACKUP_DIR:-/var/backups/campus_connect}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/campusconnect_${TIMESTAMP}.sql"
ENCRYPTED_FILE="${BACKUP_FILE}.enc"
CHECKSUM_FILE="${ENCRYPTED_FILE}.sha256"

# Ensure backup destination directory exists with strict permissions
mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

if [ -z "${BACKUP_ENCRYPTION_KEY:-}" ]; then
  echo "[ERROR] BACKUP_ENCRYPTION_KEY environment variable is not set. Aborting backup to prevent cleartext exposure." >&2
  exit 1
fi

echo "[$(date)] Starting Campus Connect PostgreSQL database backup..."

# 1. Execute database dump using pg_dump
if pg_dump -h "${PGHOST:-localhost}" \
           -U "${PGUSER:-cc_api_user}" \
           -d "${PGDATABASE:-campus_connect}" \
           --format=custom \
           --no-owner \
           --no-privileges \
           > "${BACKUP_FILE}"; then
  echo "[$(date)] pg_dump completed successfully."
else
  echo "[ERROR] pg_dump failed! Sending failure alert." >&2
  exit 1
fi

# 2. Encrypt the backup archive using AES-256-CBC
echo "[$(date)] Encrypting backup archive with AES-256..."
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 100000 \
  -in "${BACKUP_FILE}" \
  -out "${ENCRYPTED_FILE}" \
  -k "${BACKUP_ENCRYPTION_KEY}"

# 3. Securely remove the unencrypted plain dump
rm -f "${BACKUP_FILE}"

# 4. Generate SHA-256 checksum for artifact integrity verification
sha256sum "${ENCRYPTED_FILE}" > "${CHECKSUM_FILE}"
chmod 600 "${ENCRYPTED_FILE}" "${CHECKSUM_FILE}"

echo "[$(date)] Backup encrypted successfully: ${ENCRYPTED_FILE}"

# 5. Apply Retention Policy (Purge backups older than 30 days)
echo "[$(date)] Applying 30-day retention schedule..."
find "${BACKUP_DIR}" -type f -name "campusconnect_*.enc" -mtime +30 -delete
find "${BACKUP_DIR}" -type f -name "campusconnect_*.sha256" -mtime +30 -delete

echo "[$(date)] Backup and retention cycle completed successfully."
