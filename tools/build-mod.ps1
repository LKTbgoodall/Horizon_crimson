<#
.SYNOPSIS
  Packages Crimson Eclipse as one .hmod (code and content), installs it in a Horizon instance and builds the game.

.DESCRIPTION
  1. Packs build/crimson_eclipse.hmod, the one file of the mod: its native code
     (horizon-native.json and mixins/crimson_eclipse/: the manifest and the [api] crate, whose
     src/ is the pure core crates/crimson-core/src next to the hand-written glue
     mod/crimson_eclipse/api/src, with a lib.rs written here) and its content
     (horizon-mod.toml, assets/ and data/ from mod/content), as Horizon's
     "one .hmod for content and code" format describes.
  2. Unless -NoInstall: installs it. Launchers before the fix of horizon-rust/horizon#15933
     build native code only from horizon-native-mods/<id>.hnmod and drop a combined file's
     content, so the code half goes there and the content half to horizon-mods/<id>.hmod,
     both cut from the same file; the mod is turned on.
     With -Combined, the one .hmod goes to horizon-native-mods/<id>.hmod instead (and the
     two halves are taken out): what the registry installs.
  3. Unless -NoBuild: runs horizon-launcher native-build on the instance (all its native mods).

  Step 3 passes --trust-native-code: only the player runs this script, never an agent.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1
  powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -NoBuild
  powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -Uninstall
  powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -Combined
  powershell -ExecutionPolicy Bypass -File tools\build-mod.ps1 -Instance crimson_eclipse-dev -Update
#>
param(
    [string]$Instance = "cagebound-dev",
    [switch]$NoInstall,
    [switch]$NoBuild,
    [switch]$Uninstall,
    [switch]$Combined,
    # Moves the instance to the newest installed Horizon (the pin, 9f42064) before building.
    [switch]$Update
)
$ErrorActionPreference = "Stop"

$ModId = "crimson_eclipse"
$Root = Split-Path -Parent $PSScriptRoot
$Bundle = Join-Path $Root "mod\$ModId"
$Core = Join-Path $Root "crates\crimson-core\src"
$Handwritten = @("client.rs", "glue.rs", "server.rs")
$Content = Join-Path $Root "mod\content"
# The version is the bundle manifest's, so the two never disagree.
$Version = (Select-String -Path (Join-Path $Bundle "horizon-mixin.toml") -Pattern '^version = "([^"]+)"' | Select-Object -First 1).Matches[0].Groups[1].Value
$Out = Join-Path $Root "build"
$Hmod = Join-Path $Out "$ModId.hmod"
$Parts = Join-Path $Out "install"
$NativePart = Join-Path $Parts "$ModId.hnmod"
$ContentPart = Join-Path $Parts "$ModId.hmod"
$InstanceDir = Join-Path $env:APPDATA "horizon\instances\$Instance"
$NativeMods = Join-Path $InstanceDir "horizon-native-mods"
$ContentMods = Join-Path $InstanceDir "horizon-mods"
$ModsList = Join-Path $InstanceDir "horizon-mods.txt"
$Launcher = Join-Path $env:LOCALAPPDATA "Programs\Horizon Launcher\horizon-launcher.exe"

# The commits the mod is built against (mod/compatibility.json).
$Compat = Get-Content (Join-Path $Root "mod\compatibility.json") -Raw | ConvertFrom-Json
$HorizonRev = $Compat.horizon_revision
$MixinsRev = $Compat.horizon_mixins_revision
$Hooks = [int]$Compat.hooks

$Utf8 = New-Object System.Text.UTF8Encoding($false)
# Every entry gets this date, so the same sources make the same file on any PC.
$Stamp = [DateTimeOffset]::new(2026, 1, 1, 0, 0, 0, [TimeSpan]::Zero)

function Set-ModLine([bool]$On) {
    $lines = @()
    if (Test-Path $ModsList) {
        $lines = @(Get-Content $ModsList | Where-Object { $_ -notmatch "^mod\.${ModId}:" })
    }
    if ($On) { $lines += "mod.${ModId}:true" }
    [IO.File]::WriteAllText($ModsList, (($lines -join "`n") + "`n"), $Utf8)
}

if ($Uninstall) {
    Remove-Item (Join-Path $NativeMods "$ModId.hnmod") -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $ContentMods "$ModId.hmod") -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $NativeMods "$ModId.hmod") -ErrorAction SilentlyContinue
    Set-ModLine $false
    Write-Host "Crimson Eclipse removed from $Instance. Run native-build again to rebuild the game without it."
    exit 0
}

# 1. What goes in: (entry name, source file or $null with text), the native half and the content half.
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$manifest = [ordered]@{
    game = "26.3"; hooks = $Hooks; horizon = $HorizonRev; id = $ModId; mixins = $MixinsRev; schema = 1; version = $Version
} | ConvertTo-Json -Compress

$nativeEntries = New-Object System.Collections.ArrayList
[void]$nativeEntries.Add(@("horizon-native.json", $null, $manifest))
[void]$nativeEntries.Add(@("mixins/$ModId/horizon-mixin.toml", (Join-Path $Bundle "horizon-mixin.toml"), $null))
[void]$nativeEntries.Add(@("mixins/$ModId/api/Cargo.toml", (Join-Path $Bundle "api\Cargo.toml"), $null))
# api/src: the core's modules, the glue, and a lib.rs (the core's lib.rs plus the glue modules).
$apiSrc = New-Object System.Collections.ArrayList
Get-ChildItem $Core -Filter *.rs | Where-Object { $_.Name -ne "lib.rs" } | ForEach-Object {
    if ($_.Name -in $Handwritten) { throw "crimson-core must not have $($_.Name)" }
    [void]$apiSrc.Add(@($_.Name, $_.FullName, $null))
}
foreach ($name in $Handwritten) { [void]$apiSrc.Add(@($name, (Join-Path $Bundle "api\src\$name"), $null)) }
$coreLib = [IO.File]::ReadAllText((Join-Path $Core "lib.rs")).Replace("`r`n", "`n")
$lib = "// Written by tools/build-mod.ps1 from crates/crimson-core/src/lib.rs: do not edit.`n" + $coreLib +
    "`n" + (($Handwritten | ForEach-Object { "mod " + $_.Replace(".rs", "") + ";`n" }) -join "") + "`npub use glue::hooks;`n"
[void]$apiSrc.Add(@("lib.rs", $null, $lib))
foreach ($e in ($apiSrc | Sort-Object { $_[0] })) {
    [void]$nativeEntries.Add(@("mixins/$ModId/api/src/$($e[0])", $e[1], $e[2]))
}

$contentManifest = Join-Path $Content "horizon-mod.toml"
$contentVersion = (Select-String -Path $contentManifest -Pattern '^version = "([^"]+)"' | Select-Object -First 1).Matches[0].Groups[1].Value
if ($contentVersion -ne $Version) { throw "mod/content/horizon-mod.toml says $contentVersion, the bundle $Version" }
$contentEntries = New-Object System.Collections.ArrayList
[void]$contentEntries.Add(@("horizon-mod.toml", $contentManifest, $null))
foreach ($top in "assets", "data") {
    $dir = Join-Path $Content $top
    if (Test-Path $dir) {
        Get-ChildItem $dir -Recurse -File | Sort-Object FullName | ForEach-Object {
            $rel = $_.FullName.Substring($Content.Length + 1).Replace('\', '/')
            [void]$contentEntries.Add(@($rel, $_.FullName, $null))
        }
    }
}

# A zip with / separators (Compress-Archive on PowerShell 5.1 writes \), files only.
function New-Zip([string]$Path, $Entries) {
    Remove-Item $Path -ErrorAction SilentlyContinue
    $zip = [IO.Compression.ZipFile]::Open($Path, "Create")
    try {
        foreach ($e in $Entries) {
            $entry = $zip.CreateEntry($e[0])
            $entry.LastWriteTime = $Stamp
            $stream = $entry.Open()
            try {
                if ($null -ne $e[1]) {
                    $bytes = [IO.File]::ReadAllBytes($e[1])
                } else {
                    $bytes = $Utf8.GetBytes($e[2])
                }
                $stream.Write($bytes, 0, $bytes.Length)
            } finally {
                $stream.Dispose()
            }
        }
    } finally {
        $zip.Dispose()
    }
}

New-Item -ItemType Directory -Force $Out, $Parts | Out-Null
New-Zip $Hmod (@($contentEntries) + @($nativeEntries))
New-Zip $NativePart $nativeEntries
New-Zip $ContentPart $contentEntries
Write-Host "The mod: $Hmod (version $Version, $($nativeEntries.Count + $contentEntries.Count) files)"
if ($NoInstall) { exit 0 }

# 2. Install it in the instance: the code where the launcher builds it, the content where the game reads it.
if (-not (Test-Path $InstanceDir)) { throw "Instance not found: $InstanceDir" }
New-Item -ItemType Directory -Force $NativeMods | Out-Null
if ($Combined) {
    # The one file, as the registry would install it; no halves beside it.
    Remove-Item (Join-Path $NativeMods "$ModId.hnmod"), (Join-Path $ContentMods "$ModId.hmod") -ErrorAction SilentlyContinue
    Copy-Item $Hmod (Join-Path $NativeMods "$ModId.hmod") -Force
} else {
    Remove-Item (Join-Path $NativeMods "$ModId.hmod") -ErrorAction SilentlyContinue
    Copy-Item $NativePart (Join-Path $NativeMods "$ModId.hnmod") -Force
    New-Item -ItemType Directory -Force $ContentMods | Out-Null
    Copy-Item $ContentPart (Join-Path $ContentMods "$ModId.hmod") -Force
}
Set-ModLine $true
Write-Host "Installed in $Instance$(if ($Combined) { ' (one combined .hmod)' })."
if ($NoBuild) { exit 0 }

# 3. Build the game with every native mod turned on in the instance.
if (-not (Test-Path $Launcher)) { throw "horizon-launcher.exe not found: $Launcher" }
# The launcher is a windowed app: `&` does not wait for it and gives no exit code.
$launchArgs = @("native-build", "--instance", $Instance, "--trust-native-code")
if ($Update) { $launchArgs += "--update" }
$p = Start-Process -FilePath $Launcher -ArgumentList $launchArgs -NoNewWindow -Wait -PassThru
if ($p.ExitCode -ne 0) { throw "native-build failed (code $($p.ExitCode)). Log: $env:APPDATA\horizon-launcher\native\build.log" }
Write-Host "Ready: start Horizon from the launcher."
