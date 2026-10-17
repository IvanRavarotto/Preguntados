<#
  smoke-demo.ps1 - Verificacion previa a la presentacion.

  Comprueba, en pocos segundos, que el entorno de la demo responde:
  base de datos, API, categorias, entrega de preguntas y el endpoint de
  validacion con IA. No modifica datos.

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts\smoke-demo.ps1
    powershell -ExecutionPolicy Bypass -File scripts\smoke-demo.ps1 -Launch   # levanta Docker y la API si no estan

  Salida: [PASS] / [FAIL] / [WARN] por chequeo, un resumen y exit code 0 si no hay FAIL.
#>
param(
  [string]$BaseUrl = "http://localhost:8000",
  [switch]$Launch
)

$ErrorActionPreference = "Continue"
$script:FailCount = 0
$script:WarnCount = 0
$script:PassCount = 0

function Write-Pass($message) { $script:PassCount++; Write-Host "[PASS] $message" -ForegroundColor Green }
function Write-Fail($message) { $script:FailCount++; Write-Host "[FAIL] $message" -ForegroundColor Red }
function Write-Warn2($message) { $script:WarnCount++; Write-Host "[WARN] $message" -ForegroundColor Yellow }
function Write-Step($message) { Write-Host "`n== $message ==" -ForegroundColor Cyan }

function Test-DockerDaemon {
  docker info *> $null
  return ($LASTEXITCODE -eq 0)
}

function Test-Port8000 {
  $listener = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
  return [bool]$listener
}

function Start-Environment {
  Write-Step "Levantando entorno (-Launch)"
  if (-not (Test-DockerDaemon)) {
    $candidates = @(
      "$env:ProgramFiles\Docker\Docker\Docker Desktop.exe",
      "$env:LocalAppData\Docker\Docker Desktop.exe",
      "$env:LocalAppData\Programs\DockerDesktop\Docker Desktop.exe"
    )
    $exe = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    if (-not $exe) { Write-Fail "No se encontro Docker Desktop. Abrilo manualmente."; return }
    Write-Host "Iniciando Docker Desktop..."
    Start-Process -FilePath $exe | Out-Null
    $deadline = (Get-Date).AddSeconds(120)
    while ((Get-Date) -lt $deadline -and -not (Test-DockerDaemon)) { Start-Sleep -Seconds 5 }
  }
  if (Test-DockerDaemon) { Write-Pass "Docker daemon disponible" } else { Write-Fail "Docker daemon no respondio a tiempo"; return }

  Write-Host "Levantando PostgreSQL (docker compose up -d)..."
  docker compose up -d | Out-Null

  if (-not (Test-Port8000)) {
    Write-Host "Iniciando uvicorn..."
    $repoRoot = Split-Path -Parent $PSScriptRoot
    $logDir = Join-Path $repoRoot ".check-temp"
    if (-not (Test-Path -LiteralPath $logDir)) { New-Item -ItemType Directory -Path $logDir | Out-Null }
    Start-Process -FilePath "poetry" `
      -ArgumentList "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000" `
      -WorkingDirectory $repoRoot -WindowStyle Hidden `
      -RedirectStandardOutput (Join-Path $logDir "uvicorn.out.log") `
      -RedirectStandardError (Join-Path $logDir "uvicorn.err.log") | Out-Null
    $deadline = (Get-Date).AddSeconds(60)
    while ((Get-Date) -lt $deadline -and -not (Test-Port8000)) { Start-Sleep -Seconds 2 }
  }
  if (Test-Port8000) { Write-Pass "Puerto 8000 escuchando" } else { Write-Fail "La API no abrio el puerto 8000" }
}

function Get-Json($url) {
  $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 10
  return $response.Content | ConvertFrom-Json
}

# --- 0. Entorno ---------------------------------------------------------
Write-Step "Entorno"
if ($Launch) { Start-Environment }

if (Test-DockerDaemon) { Write-Pass "Docker daemon disponible" } else { Write-Warn2 "Docker daemon no disponible (la base de datos no respondera)" }
if (Test-Port8000) { Write-Pass "API escuchando en el puerto 8000" } else { Write-Fail "La API no escucha en el puerto 8000. Corre el script con -Launch o levanta uvicorn." }

# --- 1. Pagina del juego ------------------------------------------------
Write-Step "Pagina del juego"
try {
  $root = Invoke-WebRequest -Uri "$BaseUrl/" -UseBasicParsing -TimeoutSec 10
  if ($root.StatusCode -eq 200 -and $root.Content -match "<html") {
    Write-Pass "GET / sirve la pagina del juego"
  } else {
    Write-Fail "GET / respondio $($root.StatusCode) sin una pagina HTML"
  }
} catch {
  Write-Fail "GET / no respondio: $($_.Exception.Message)"
}

# --- 2. Datos de la base ------------------------------------------------
Write-Step "Datos de la base"
try {
  $stats = Get-Json "$BaseUrl/categories/stats"
  if ($stats.total_questions -gt 0) {
    Write-Pass "Categorias cargadas: total=$($stats.total_questions), categorizadas=$($stats.categorized)"
  } else {
    Write-Fail "La base no tiene preguntas. Corre 'poetry run python -m app.load_data'."
  }
  if ($stats.uncategorized -gt 0) {
    Write-Warn2 "$($stats.uncategorized) preguntas sin categorizar (no rompe el juego, pero conviene categorizar)"
  }
} catch {
  Write-Fail "GET /categories/stats no respondio: $($_.Exception.Message)"
}

# --- 3. Una pregunta por categoria -------------------------------------
Write-Step "Entrega de preguntas por categoria"
$categories = @("arte", "ciencia", "deportes", "entretenimiento", "geografia", "historia")
foreach ($name in $categories) {
  try {
    $batch = Get-Json "$BaseUrl/questions/category/$name`?limit=200"
    if ($batch.Count -ge 1) {
      Write-Pass "$name`: $($batch.Count) preguntas disponibles"
    } else {
      Write-Fail "$name`: la API no devolvio preguntas para la ruleta"
    }
  } catch {
    Write-Fail "$name`: la peticion fallo: $($_.Exception.Message)"
  }
}

# --- 4. Validacion con IA ----------------------------------------------
Write-Step "Validacion con IA (formulario 'Agregar una pregunta')"
$sample = '{"category":"ciencia","question":"Cual es el planeta mas grande del sistema solar?","option_a":"Saturno","option_b":"Jupiter","option_c":"Neptuno","option_d":"Marte","correct_answer":"Jupiter"}'
try {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($sample)
  $response = Invoke-WebRequest -Uri "$BaseUrl/questions/validate" -Method POST -Body $bytes -ContentType "application/json; charset=utf-8" -UseBasicParsing -TimeoutSec 120
  $verdict = $response.Content | ConvertFrom-Json
  if ($verdict.plausible -eq $true) {
    Write-Pass "La IA responde y valido la pregunta de prueba"
  } else {
    Write-Warn2 "La IA respondio pero marco la pregunta como implausible (status=$($verdict.status)). Revisar en la demo."
  }
} catch {
  $statusCode = $null
  if ($_.Exception.Response) { $statusCode = [int]$_.Exception.Response.StatusCode }
  if ($statusCode -eq 502 -or $statusCode -eq 503) {
    Write-Warn2 "La IA no esta disponible (HTTP $statusCode). El formulario sigue guardando sin verificar: la demo no se rompe."
  } elseif ($null -eq $statusCode) {
    Write-Warn2 "La IA no respondio a tiempo. El proveedor gratuito demora a veces; el formulario igual guarda sin verificar, la demo no se rompe."
  } else {
    Write-Fail "POST /questions/validate fallo: $($_.Exception.Message)"
  }
}

# --- Resumen ------------------------------------------------------------
Write-Step "Resumen"
Write-Host ("PASS: {0}   WARN: {1}   FAIL: {2}" -f $script:PassCount, $script:WarnCount, $script:FailCount) -ForegroundColor Cyan

Write-Host "`nChecklist rapido para la presentacion:" -ForegroundColor Cyan
Write-Host "  - El juego es de dos personas en el MISMO navegador y dispositivo."
Write-Host "  - Recargar la pagina (F5) borra la partida en curso: hacelo solo entre demos."
Write-Host "  - Sin internet el juego sigue andando; 'Agregar una pregunta' guarda sin verificar con IA."
Write-Host "  - Proba la vista en el tamano de pantalla que vas a usar (notebook / celular)."
Write-Host "  - Deja abierto http://localhost:8000 y no cierres las ventanas de Docker ni de uvicorn."

if ($script:FailCount -gt 0) {
  Write-Host "`nResultado: HAY FALLOS. Resolvelos antes de presentar." -ForegroundColor Red
  exit 1
}
Write-Host "`nResultado: LISTO PARA LA DEMO." -ForegroundColor Green
exit 0
