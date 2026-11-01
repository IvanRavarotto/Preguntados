<#
  smoke-demo.ps1 - Verificacion previa a la presentacion.

  Comprueba, en pocos segundos, que el entorno de la demo responde:
  base de datos, API, categorias, entrega de preguntas sin la respuesta,
  correccion en el servidor y clasificacion con la red neuronal. No modifica datos.

  Uso:
    powershell -ExecutionPolicy Bypass -File scripts\smoke-demo.ps1
    powershell -ExecutionPolicy Bypass -File scripts\smoke-demo.ps1 -Launch   # levanta Docker y los contenedores si no estan

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

  Write-Host "Levantando base y API (docker compose up -d --build)..."
  $repoRoot = Split-Path -Parent $PSScriptRoot
  docker compose --project-directory $repoRoot up -d --build | Out-Null
  $deadline = (Get-Date).AddSeconds(120)
  while ((Get-Date) -lt $deadline -and -not (Test-Port8000)) { Start-Sleep -Seconds 2 }
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
if (Test-Port8000) { Write-Pass "API escuchando en el puerto 8000" } else { Write-Fail "La API no escucha en el puerto 8000. Corre el script con -Launch o 'docker compose up -d'." }

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
    Write-Fail "La base no tiene preguntas. Corre 'docker compose exec api python -m app.load_dataset'."
  }
} catch {
  Write-Fail "GET /categories/stats no respondio: $($_.Exception.Message)"
}

# --- 3. Una pregunta por categoria -------------------------------------
Write-Step "Entrega de preguntas por categoria"
$categories = @("arte", "ciencia", "deportes", "entretenimiento", "geografia", "historia")
$sampleQuestion = $null
foreach ($name in $categories) {
  try {
    $batch = Get-Json "$BaseUrl/questions/category/$name`?limit=200"
    if ($batch.Count -lt 1) {
      Write-Fail "$name`: la API no devolvio preguntas para la ruleta"
    } elseif ($batch[0].PSObject.Properties.Name -contains "answer") {
      Write-Fail "$name`: el lote incluye la respuesta correcta"
    } else {
      Write-Pass "$name`: $($batch.Count) preguntas disponibles, sin la respuesta"
      if (-not $sampleQuestion) { $sampleQuestion = $batch[0] }
    }
  } catch {
    Write-Fail "$name`: la peticion fallo: $($_.Exception.Message)"
  }
}

function Post-Json($url, $json) {
  $bytes = [System.Text.Encoding]::UTF8.GetBytes($json)
  $response = Invoke-WebRequest -Uri $url -Method POST -Body $bytes -ContentType "application/json; charset=utf-8" -UseBasicParsing -TimeoutSec 10
  return [System.Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray()) | ConvertFrom-Json
}

# --- 4. Correccion en el servidor ---------------------------------------
Write-Step "Correccion en el servidor"
if ($sampleQuestion) {
  try {
    $revealed = Post-Json "$BaseUrl/questions/$($sampleQuestion.id)/reveal" '{}'
    $answerJson = @{ answer = $revealed.correct_answer; reveal = $true } | ConvertTo-Json -Compress
    $verdict = Post-Json "$BaseUrl/questions/$($sampleQuestion.id)/answer" $answerJson
    if ($verdict.correct -eq $true) {
      Write-Pass "POST /questions/{id}/answer corrige en el servidor"
    } else {
      Write-Fail "La API no reconocio la respuesta correcta de la pregunta $($sampleQuestion.id)"
    }
  } catch {
    Write-Fail "La correccion fallo: $($_.Exception.Message)"
  }
} else {
  Write-Fail "No hubo una pregunta para probar la correccion"
}

# --- 5. Clasificacion con la red neuronal -------------------------------
Write-Step "Clasificacion con la red neuronal"
try {
  $classified = Post-Json "$BaseUrl/classify" '{"question":"Que planeta es conocido como el planeta rojo?"}'
  if ($classified.category -eq "ciencia") {
    Write-Pass "POST /classify responde ciencia ($([math]::Round($classified.confidence_score * 100))% de confianza)"
  } else {
    Write-Warn2 "POST /classify respondio $($classified.category) para una pregunta de ciencia"
  }
} catch {
  Write-Fail "POST /classify fallo: $($_.Exception.Message)"
}

# --- Resumen ------------------------------------------------------------
Write-Step "Resumen"
Write-Host ("PASS: {0}   WARN: {1}   FAIL: {2}" -f $script:PassCount, $script:WarnCount, $script:FailCount) -ForegroundColor Cyan

Write-Host "`nChecklist rapido para la presentacion:" -ForegroundColor Cyan
Write-Host "  - El juego es de dos personas en el MISMO navegador y dispositivo."
Write-Host "  - Recargar la pagina (F5) borra la partida en curso: hacelo solo entre demos."
Write-Host "  - Sin internet el juego sigue andando: la red neuronal corre dentro de la API."
Write-Host "  - Proba la vista en el tamano de pantalla que vas a usar (notebook / celular)."
Write-Host "  - Deja abierto http://localhost:8000 y no cierres Docker Desktop."

if ($script:FailCount -gt 0) {
  Write-Host "`nResultado: HAY FALLOS. Resolvelos antes de presentar." -ForegroundColor Red
  exit 1
}
Write-Host "`nResultado: LISTO PARA LA DEMO." -ForegroundColor Green
exit 0
