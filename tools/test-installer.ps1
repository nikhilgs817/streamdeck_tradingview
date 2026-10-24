#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
. (Join-Path $root 'installer\Install-Plugin.ps1')
$script:Checks = 0
function Check([string]$Name, [bool]$Passed) { if (-not $Passed) { throw ('FAIL ' + $Name) }; $script:Checks++; Write-Host ('PASS ' + $Name) }
function Must-Fail([string]$Name, [scriptblock]$Operation) { $failed = $false; try { & $Operation } catch { $failed = $true }; Check $Name $failed }
# Deployment/rollback uses fake callbacks. A failed fixture must never stop the real app.
function Stop-DeckForInstall([string]$PluginsRoot) { $script:Stops++ }
$script:Stops = 0
$script:Restarts = 0
$restart = { $script:Restarts++ }
$runtime = { param($path) Check 'runtime check receives an installed plugin' (Test-Path -LiteralPath (Join-Path $path 'bin\plugin.js')) }
$tempRoot = Join-Path ([IO.Path]::GetTempPath()) ("Toolkit tests [&] O'Neil-" + [guid]::NewGuid().ToString('N'))
$null = New-Item -ItemType Directory -Path $tempRoot
try {
    $payloadUnpack = Join-Path $tempRoot 'payload'
    Expand-SafeArchive (Join-Path $root ('dist\' + $script:PluginId + '.streamDeckPlugin')) $payloadUnpack ($script:PluginId + '.sdPlugin/')
    $payload = Join-Path $payloadUnpack ($script:PluginId + '.sdPlugin')
    $manifest = Test-PluginPayload $payload
    Check 'real packaged payload has the current identity and version' ($manifest.UUID -eq $script:PluginId -and $manifest.Version -eq $script:ReleaseVersion)
    Check 'bundled app profile matches the installer' ($manifest.Profiles.Count -eq 1 -and $manifest.Profiles[0].Name -eq $script:Installer.Profile)
    $started = [DateTimeOffset]::UtcNow.AddSeconds(-5)
    Check 'startup receipt accepts only the new connected process' (Test-ReadyRecord ([pscustomobject]@{pid=123;readyAt=[DateTimeOffset]::UtcNow.ToString('o')}) 123 $started)
    Check 'stale startup receipt is rejected' (-not (Test-ReadyRecord ([pscustomobject]@{pid=123;readyAt=$started.AddMinutes(-1).ToString('o')}) 123 $started))
    Check 'receipt for another process is rejected' (-not (Test-ReadyRecord ([pscustomobject]@{pid=999;readyAt=[DateTimeOffset]::UtcNow.ToString('o')}) 123 $started))
    Check 'malformed startup receipt is rejected' (-not (Test-ReadyRecord ([pscustomobject]@{pid=123;readyAt='bad'}) 123 $started))
    Must-Fail 'parent traversal cannot leave an installation root' { Assert-ChildPath (Join-Path $tempRoot '..\escape') $tempRoot }
    Must-Fail 'the root itself cannot be recursively removed' { Remove-InstallFolder $tempRoot $tempRoot }
    $metadata = Read-Json (Join-Path $root 'dist\installer-manifest.json')
    Check 'release checksum matches the shipped package' ((Get-InstallFileHash (Join-Path $root ('dist\' + $script:PluginId + '.streamDeckPlugin'))) -eq $metadata.Sha256)
    function Fixture([string]$Name, [switch]$WithDevice, [switch]$OldPlugin) {
        $data = Join-Path $tempRoot $Name
        $profiles = Join-Path $data 'ProfilesV3'
        $null = New-Item -ItemType Directory -Path $profiles -Force
        if ($WithDevice) {
            $folder = Join-Path $profiles 'FIXTURE.sdProfile'
            $null = New-Item -ItemType Directory -Path (Join-Path $folder 'Profiles\PAGE') -Force
            Write-Json (Join-Path $folder 'manifest.json') @{Device=@{Model='20GBL9901';UUID='@(1)[FIXTURE]'};Name='My existing layout';Version='3.0';Pages=@{Current='PAGE';Default='PAGE';Pages=@('PAGE')}}
            Write-Json (Join-Path $folder 'Profiles\PAGE\manifest.json') @{Controllers=@(@{Type='Keypad';Actions=@{'2,1'=@{ActionID='KEEP-ID';UUID='com.dailyops.v2.app';Settings=@{iconTheme='cosmic';credentialPassword='synthetic-ciphertext-fixture';folderPath='C:\Example folder'}}}})}
        }
        if ($OldPlugin) {
            $old = Join-Path $data ('Plugins\' + $script:PluginId + '.sdPlugin')
            $null = New-Item -ItemType Directory -Path (Join-Path $old 'cache') -Force
            Write-Json (Join-Path $old 'manifest.json') @{UUID=$script:PluginId;Version='0.9.0.0'}
            [IO.File]::WriteAllText((Join-Path $old 'old.txt'), 'previous-plugin')
            [IO.File]::WriteAllText((Join-Path $old 'cache\personal-icon.png'), 'cached-icon-fixture')
            [IO.File]::WriteAllText((Join-Path $old 'screens.json'), 'monitor-identity-fixture')
        }
        return $data
    }
    $first = Fixture 'First install' -WithDevice
    $original = Join-Path $first 'ProfilesV3\FIXTURE.sdProfile\Profiles\PAGE\manifest.json'
    $before = Get-InstallFileHash $original
    $created = Install-ToolkitPayload $payload $first (Join-Path $tempRoot 'backups') $tempRoot $restart $runtime
    Check 'first install adds its missing app layout' ($created.AddedProfiles -eq 1)
    Check 'existing keys, positions and settings remain byte-identical' ((Get-InstallFileHash $original) -eq $before)
    $appsHeader = @(Get-ChildItem -LiteralPath (Join-Path $first 'ProfilesV3') -Directory | Where-Object { (Get-Field (Read-Json (Join-Path $_.FullName 'manifest.json')) 'PreconfiguredName') -eq $script:Installer.Profile })[0]
    $customHeader = Read-Json (Join-Path $appsHeader.FullName 'manifest.json');$customHeader.Name = 'My customized collection';Write-Json (Join-Path $appsHeader.FullName 'manifest.json') $customHeader
    $customHash = Get-InstallFileHash (Join-Path $appsHeader.FullName 'manifest.json')
    $again = Install-ToolkitPayload $payload $first (Join-Path $tempRoot 'backups') $tempRoot $restart $runtime
    Check 'repeat install does not duplicate profiles' ($again.AddedProfiles -eq 0 -and @(Get-ChildItem -LiteralPath (Join-Path $first 'ProfilesV3') -Directory).Count -eq 2)
    Check 'renamed existing collection is preserved' ((Get-InstallFileHash (Join-Path $appsHeader.FullName 'manifest.json')) -eq $customHash)
    $secondDevice = Join-Path $first 'ProfilesV3\SECOND.sdProfile';$null=New-Item -ItemType Directory -Path $secondDevice
    Write-Json (Join-Path $secondDevice 'manifest.json') @{Device=@{Model='20GBL9901';UUID='@(1)[SECOND]'};Name='Second deck';Version='3.0';Pages=@{Current='PAGE';Default='PAGE';Pages=@('PAGE')}}
    $second = Install-ToolkitPayload $payload $first (Join-Path $tempRoot 'backups') $tempRoot $restart $runtime
    Check 'another compatible deck receives only its missing profiles' ($second.AddedProfiles -eq 1)
    $pageIds=@();$actionIds=@()
    foreach($folder in Get-ChildItem -LiteralPath (Join-Path $first 'ProfilesV3') -Directory){
        if(-not (Get-Field (Read-Json (Join-Path $folder.FullName 'manifest.json')) 'InstalledByPluginUUID')){continue}
        foreach($page in Get-ChildItem -LiteralPath (Join-Path $folder.FullName 'Profiles') -Directory){
            $pageIds+=$page.Name;$data=Read-Json (Join-Path $page.FullName 'manifest.json')
            foreach($controller in $data.Controllers){if($controller.Actions){foreach($a in $controller.Actions.PSObject.Properties){$actionIds+=$a.Value.ActionID}}}
        }
    }
    Check 'imported page and action identities are unique across devices' (($pageIds | Select-Object -Unique).Count -eq $pageIds.Count -and ($actionIds | Select-Object -Unique).Count -eq $actionIds.Count)
    $updating = Fixture 'Update preserving cache' -WithDevice -OldPlugin
    $updated = Install-ToolkitPayload $payload $updating (Join-Path $tempRoot 'backups') $tempRoot $restart $runtime
    Check 'update saves the old plugin and a profile backup' ((Test-Path -LiteralPath (Join-Path $updated.Backup 'Plugin\old.txt')) -and (Test-Path -LiteralPath (Join-Path $updated.Backup 'ProfilesV3\FIXTURE.sdProfile\manifest.json')))
    Check 'personal icon cache survives update' (([IO.File]::ReadAllText((Join-Path $updating ('Plugins\' + $script:PluginId + '.sdPlugin\cache\personal-icon.png')))) -eq 'cached-icon-fixture')
    Check 'monitor identities survive update' (([IO.File]::ReadAllText((Join-Path $updating ('Plugins\' + $script:PluginId + '.sdPlugin\screens.json')))) -eq 'monitor-identity-fixture')
    $failing = Fixture 'Failed update rollback' -WithDevice -OldPlugin
    $original = Join-Path $failing 'ProfilesV3\FIXTURE.sdProfile\Profiles\PAGE\manifest.json'
    $before = Get-InstallFileHash $original
    Must-Fail 'runtime failure is reported after rollback' { Install-ToolkitPayload $payload $failing (Join-Path $tempRoot 'backups') $tempRoot $restart { throw 'fixture startup failed' } }
    Check 'failed update restores the previous plugin' (Test-Path -LiteralPath (Join-Path $failing ('Plugins\' + $script:PluginId + '.sdPlugin\old.txt')))
    Check 'failed update removes only newly imported profiles' (@(Get-ChildItem -LiteralPath (Join-Path $failing 'ProfilesV3') -Directory).Count -eq 1 -and (Get-InstallFileHash $original) -eq $before)
    $newFailure = Fixture 'Failed first install' -WithDevice
    Must-Fail 'first-install failure rolls back' { Install-ToolkitPayload $payload $newFailure (Join-Path $tempRoot 'backups') $tempRoot $restart { throw 'fixture startup failed' } }
    Check 'failed first install leaves no partial plugin' (-not (Test-Path -LiteralPath (Join-Path $newFailure ('Plugins\' + $script:PluginId + '.sdPlugin'))))
    $noDevice = Fixture 'No compatible device'
    $without = Install-ToolkitPayload $payload $noDevice (Join-Path $tempRoot 'backups') $tempRoot $restart $runtime
    Check 'plugin installs without a connected compatible deck' ($without.AddedProfiles -eq 0)
    $newer = Fixture 'Newer version' -OldPlugin
    Write-Json (Join-Path $newer ('Plugins\' + $script:PluginId + '.sdPlugin\manifest.json')) @{UUID=$script:PluginId;Version='99.0.0.0'}
    Must-Fail 'a newer installed plugin cannot be downgraded' { Install-ToolkitPayload $payload $newer (Join-Path $tempRoot 'backups') $tempRoot $restart $runtime }
    foreach ($badName in @('../outside.txt', 'com.dailyops.v2.sdPlugin/../../outside.txt', '/absolute.txt', 'com.dailyops.v2.sdPlugin/C:bad.txt', 'com.dailyops.v2.sdPlugin/CON.txt', 'com.dailyops.v2.sdPlugin/foo.')) {
        $zip = Join-Path $tempRoot ([guid]::NewGuid().ToString() + '.zip')
        $archive = [IO.Compression.ZipFile]::Open($zip, [IO.Compression.ZipArchiveMode]::Create)
        $entry = $archive.CreateEntry($badName);$writer=[IO.StreamWriter]::new($entry.Open());$writer.Write('fixture');$writer.Dispose();$archive.Dispose()
        Must-Fail ('unsafe archive rejected: ' + $badName) { Expand-SafeArchive $zip (Join-Path $tempRoot ([guid]::NewGuid().ToString())) ($script:PluginId + '.sdPlugin/') }
    }
    Check 'rollback used mocked app controls only' ($script:Stops -eq 2)
    # Dependency behavior is isolated too: the real dependency launcher is never invoked.
    $dependencyData = Fixture 'Dependency missing'
    Check 'missing Toolkit is detected' (-not (Test-ToolkitDependency $dependencyData))
    $bundle = Join-Path $root ('dist\' + $script:Installer.InstallerId + '-Installer')
    Ensure-ToolkitDependency $dependencyData $bundle $tempRoot 'fixture.exe' -ReadOnly
    Check 'CheckOnly never installs the Toolkit dependency' (-not (Test-Path -LiteralPath (Join-Path $dependencyData 'Plugins')))
    $script:DependencyCalls = 0
    $script:DependencyData = $dependencyData
    function Invoke-ToolkitInstaller([string]$Launcher, [string]$Package, [string]$DeckExe) {
        Check 'dependency launcher and payload exist' ((Test-Path -LiteralPath $Launcher) -and (Test-Path -LiteralPath $Package))
        $script:DependencyCalls++
        $directory = Join-Path $script:DependencyData 'Plugins\com.dailyops.v2.sdPlugin'
        $null = New-Item -ItemType Directory -Path $directory -Force
        Write-Json (Join-Path $directory 'manifest.json') @{UUID='com.dailyops.v2';Version=$script:Installer.Toolkit.Version}
    }
    Ensure-ToolkitDependency $dependencyData $bundle $tempRoot 'fixture.exe'
    Check 'missing Toolkit is installed once' ($script:DependencyCalls -eq 1 -and (Test-ToolkitDependency $dependencyData))
    Write-Json (Join-Path $dependencyData 'Plugins\com.dailyops.v2.sdPlugin\manifest.json') @{UUID='com.dailyops.v2';Version='99.0.0.0'}
    Ensure-ToolkitDependency $dependencyData $bundle $tempRoot 'fixture.exe'
    Check 'newer Toolkit dependency is kept' ($script:DependencyCalls -eq 1)
    $tampered = Join-Path $tempRoot 'Tampered dependency'
    $null = New-Item -ItemType Directory -Path (Join-Path $tampered 'dependency') -Force
    [IO.File]::WriteAllText((Join-Path $tampered 'dependency\WindowsDailyToolkit-Installer.zip'), 'invalid-fixture')
    Must-Fail 'tampered Toolkit dependency is rejected' { Ensure-ToolkitDependency (Join-Path $tempRoot 'missing') $tampered $tempRoot 'fixture.exe' -ReadOnly }
    Write-Host ($script:Checks.ToString() + ' installer checks passed; no real app or personal data was modified.')
} finally { Remove-InstallFolder $tempRoot ([IO.Path]::GetTempPath()) }
