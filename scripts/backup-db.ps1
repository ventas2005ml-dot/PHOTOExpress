# Backup automático de PostgreSQL para PHOTOExpress
# Genera un dump de la base, lo guarda localmente y lo sube al NAS (Nextcloud)

$ErrorActionPreference = "Stop"

# --- Configuración ---
$PgDumpPath = "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe"
$DbHost = "127.0.0.1"
$DbPort = "5432"
$DbUser = "postgres"
$DbName = "photoexpress"

$BackupDir = "$env:USERPROFILE\PHOTOExpress\backups"
$MaxBackupsLocales = 10

$NextcloudUrl = "http://192.168.1.3:8090"
$NextcloudUser = "Photoexpress"
$NextcloudPass = "w2Gp2-gmFTN-cGyGp-HYXZE-BEj2i"
$NextcloudFolder = "backups"

# --- Preparar carpeta local ---
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}

# --- Generar nombre de archivo con fecha ---
$Fecha = Get-Date -Format "yyyy-MM-dd_HH-mm"
$ArchivoBackup = "$BackupDir\photoexpress_$Fecha.sql"

Write-Host "Generando backup: $ArchivoBackup"

# --- Ejecutar pg_dump ---
& $PgDumpPath -h $DbHost -p $DbPort -U $DbUser -d $DbName -F p -f $ArchivoBackup

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: pg_dump falló con código $LASTEXITCODE"
    exit 1
}

Write-Host "Backup local creado correctamente."

# --- Crear carpeta backups en Nextcloud si no existe ---
$Auth = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$($NextcloudUser):$($NextcloudPass)"))
$Headers = @{ Authorization = "Basic $Auth" }

$FolderUrl = "$NextcloudUrl/remote.php/dav/files/$NextcloudUser/$NextcloudFolder"
try {
    Invoke-WebRequest -Uri $FolderUrl -Method "MKCOL" -Headers $Headers -ErrorAction Stop | Out-Null
    Write-Host "Carpeta '$NextcloudFolder' creada en el NAS."
} catch {
    $StatusCode = $_.Exception.Response.StatusCode.value__
    if ($StatusCode -eq 405) {
        Write-Host "La carpeta '$NextcloudFolder' ya existe en el NAS."
    } else {
        Write-Host "ADVERTENCIA al crear carpeta: $_"
    }
}

# --- Subir el backup al NAS ---
$NombreArchivo = Split-Path $ArchivoBackup -Leaf
$UrlDestino = "$NextcloudUrl/remote.php/dav/files/$NextcloudUser/$NextcloudFolder/$NombreArchivo"

Write-Host "Subiendo backup al NAS..."
try {
    Invoke-WebRequest -Uri $UrlDestino -Method "PUT" -Headers $Headers -InFile $ArchivoBackup -ContentType "application/sql"
    Write-Host "Backup subido al NAS correctamente."
} catch {
    Write-Host "ADVERTENCIA: No se pudo subir el backup al NAS. $_"
}

# --- Limpiar backups locales viejos (dejar solo los últimos N) ---
$Backups = Get-ChildItem -Path $BackupDir -Filter "photoexpress_*.sql" | Sort-Object LastWriteTime -Descending
if ($Backups.Count -gt $MaxBackupsLocales) {
    $Backups | Select-Object -Skip $MaxBackupsLocales | ForEach-Object {
        Write-Host "Eliminando backup local viejo: $($_.Name)"
        Remove-Item $_.FullName -Force
    }
}

Write-Host "Proceso de backup finalizado."
