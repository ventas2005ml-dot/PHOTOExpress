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

# --- Función auxiliar para peticiones WebDAV ---
function Invoke-WebDav {
    param(
        [string]$Uri,
        [string]$Method,
        [string]$FilePath = $null
    )
    $req = [System.Net.WebRequest]::Create($Uri)
    $req.Method = $Method
    $req.Headers.Add("Authorization", "Basic $Auth")
    $req.Timeout = 60000

    if ($FilePath) {
        $bytes = [System.IO.File]::ReadAllBytes($FilePath)
        $req.ContentLength = $bytes.Length
        $stream = $req.GetRequestStream()
        $stream.Write($bytes, 0, $bytes.Length)
        $stream.Close()
    } else {
        $req.ContentLength = 0
    }

    try {
        $resp = $req.GetResponse()
        $code = [int]$resp.StatusCode
        $resp.Close()
        return $code
    } catch [System.Net.WebException] {
        if ($_.Exception.Response) {
            return [int]$_.Exception.Response.StatusCode
        }
        throw
    }
}

# --- Crear carpeta backups en Nextcloud si no existe ---
$Auth = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("$($NextcloudUser):$($NextcloudPass)"))
$FolderUrl = "$NextcloudUrl/remote.php/dav/files/$NextcloudUser/$NextcloudFolder"

$folderStatus = Invoke-WebDav -Uri $FolderUrl -Method "MKCOL"
if ($folderStatus -eq 201) {
    Write-Host "Carpeta '$NextcloudFolder' creada en el NAS."
} elseif ($folderStatus -eq 405) {
    Write-Host "La carpeta '$NextcloudFolder' ya existe en el NAS."
} else {
    Write-Host "ADVERTENCIA: respuesta inesperada al crear carpeta (codigo $folderStatus)"
}

# --- Subir el backup al NAS ---
$NombreArchivo = Split-Path $ArchivoBackup -Leaf
$UrlDestino = "$NextcloudUrl/remote.php/dav/files/$NextcloudUser/$NextcloudFolder/$NombreArchivo"

Write-Host "Subiendo backup al NAS..."
try {
    $uploadStatus = Invoke-WebDav -Uri $UrlDestino -Method "PUT" -FilePath $ArchivoBackup
    if ($uploadStatus -eq 201 -or $uploadStatus -eq 204) {
        Write-Host "Backup subido al NAS correctamente."
    } else {
        Write-Host "ADVERTENCIA: respuesta inesperada al subir backup (codigo $uploadStatus)"
    }
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
