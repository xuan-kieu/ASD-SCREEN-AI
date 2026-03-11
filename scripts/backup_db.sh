#!/bin/bash
# Backup SQL Server database
BACKUP_DIR="/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/ASD_Screening_$DATE.bak"
RETENTION_DAYS=7

mkdir -p $BACKUP_DIR

echo "[$(date)] Bắt đầu backup..."

docker exec asd_sqlserver /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "MatKhau@123456!" -No \
  -Q "BACKUP DATABASE [ASD_Screening] TO DISK = N'/var/opt/mssql/backup/ASD_Screening_${DATE}.bak' WITH NOFORMAT, NOINIT, COMPRESSION, STATS=10"

if [ $? -eq 0 ]; then
    # Copy ra ngoài container
    docker cp asd_sqlserver:/var/opt/mssql/backup/ASD_Screening_${DATE}.bak $BACKUP_FILE
    echo "[$(date)] ✅ Backup thành công: $BACKUP_FILE"
    # Xóa backup cũ hơn 7 ngày
    find $BACKUP_DIR -name "*.bak" -mtime +$RETENTION_DAYS -delete
    echo "[$(date)] 🗑 Đã xóa backup cũ hơn ${RETENTION_DAYS} ngày"
else
    echo "[$(date)] ❌ Backup thất bại!"
    exit 1
fi
