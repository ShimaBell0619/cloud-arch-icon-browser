param(
  [ValidateSet("copy-range", "vector-range", "inspect-clipboard")]
  [string]$Mode = "copy-range",
  [int]$ClipboardSettleMilliseconds = 500
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$MsoFalse = 0
$MsoTrue = -1
$PpLayoutBlank = 12
$MsoGroup = 6
$MsoPicture = 13
$MsoGraphic = 28

$result = [ordered]@{
  mode = $Mode
  startedAt = (Get-Date).ToString("o")
  windowsVersion = [System.Environment]::OSVersion.VersionString
  powershellVersion = $PSVersionTable.PSVersion.ToString()
  powerpointVersion = $null
  preexistingPowerPointProcesses = @()
  observations = [ordered]@{}
  success = $false
  error = $null
}

$tempDirectory = Join-Path ([System.IO.Path]::GetTempPath()) ("cloud-arch-icon-browser-office-spike-" + [Guid]::NewGuid().ToString("N"))
$ownedApplications = New-Object System.Collections.Generic.List[object]
$ownedPresentations = New-Object System.Collections.Generic.List[object]
$comObjects = New-Object System.Collections.Generic.List[object]

function Track-ComObject {
  param([Parameter(Mandatory)]$Object)
  if ([Runtime.InteropServices.Marshal]::IsComObject($Object)) {
    $null = $comObjects.Add($Object)
  }
  return $Object
}

function Release-ComObject {
  param($Object)
  if ($null -eq $Object) { return }
  if ([Runtime.InteropServices.Marshal]::IsComObject($Object)) {
    try { [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($Object) } catch {}
  }
}

function New-PowerPointApplication {
  param(
    [switch]$Owned,
    [switch]$HideApplication
  )

  try {
    $application = New-Object -ComObject PowerPoint.Application
  }
  catch {
    throw "PowerPoint COM automation is unavailable. Confirm desktop Microsoft PowerPoint is installed and automation is permitted. $($_.Exception.Message)"
  }

  if ($HideApplication) {
    $application.Visible = $MsoFalse
  }

  Track-ComObject $application | Out-Null
  if ($Owned) { $null = $ownedApplications.Add($application) }
  return $application
}

function New-HiddenPresentation {
  param([Parameter(Mandatory)]$Application)

  $presentation = Track-ComObject ($Application.Presentations.Add($MsoFalse))
  $null = $ownedPresentations.Add($presentation)
  return $presentation
}

function Invoke-PasteWithRetry {
  param([Parameter(Mandatory)]$Slide)

  $lastError = $null
  for ($attempt = 1; $attempt -le 8; $attempt++) {
    try {
      return Track-ComObject ($Slide.Shapes.Paste())
    }
    catch {
      $lastError = $_
      Start-Sleep -Milliseconds 250
    }
  }
  throw "PowerPoint could not paste the current clipboard after retries. $($lastError.Exception.Message)"
}

function Get-ShapeSnapshot {
  param([Parameter(Mandatory)]$ShapeRange)

  $items = @()
  for ($index = 1; $index -le $ShapeRange.Count; $index++) {
    $shape = $ShapeRange.Item($index)
    try {
      $items += [pscustomobject]@{
        index = $index
        name = [string]$shape.Name
        type = [int]$shape.Type
        left = [math]::Round([double]$shape.Left, 2)
        top = [math]::Round([double]$shape.Top, 2)
        width = [math]::Round([double]$shape.Width, 2)
        height = [math]::Round([double]$shape.Height, 2)
      }
    }
    finally {
      Release-ComObject $shape
    }
  }
  return $items
}

function Compare-RelativeLayout {
  param(
    [Parameter(Mandatory)]$Source,
    [Parameter(Mandatory)]$Pasted
  )

  if ($Source.Count -ne $Pasted.Count -or $Source.Count -eq 0) { return $false }
  $tolerance = 1.0
  for ($index = 0; $index -lt $Source.Count; $index++) {
    $sourceDx = [double]$Source[$index].left - [double]$Source[0].left
    $sourceDy = [double]$Source[$index].top - [double]$Source[0].top
    $pastedDx = [double]$Pasted[$index].left - [double]$Pasted[0].left
    $pastedDy = [double]$Pasted[$index].top - [double]$Pasted[0].top
    if ([math]::Abs($sourceDx - $pastedDx) -gt $tolerance) { return $false }
    if ([math]::Abs($sourceDy - $pastedDy) -gt $tolerance) { return $false }
  }
  return $true
}

function New-SyntheticPng {
  param(
    [Parameter(Mandatory)][string]$FileName,
    [Parameter(Mandatory)][string]$Label,
    [Parameter(Mandatory)][System.Drawing.Color]$Color
  )

  $path = Join-Path $tempDirectory $FileName
  $bitmap = New-Object System.Drawing.Bitmap 512, 512
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $backgroundBrush = New-Object System.Drawing.SolidBrush $Color
  $circleBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(235, 255, 255, 255))
  $textBrush = New-Object System.Drawing.SolidBrush $Color
  $font = New-Object System.Drawing.Font("Arial", 150, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $rectangle = New-Object System.Drawing.RectangleF 0, 0, 512, 512

  try {
    $graphics.FillRectangle($backgroundBrush, 0, 0, 512, 512)
    $graphics.FillEllipse($circleBrush, 106, 106, 300, 300)
    $format.Alignment = [System.Drawing.StringAlignment]::Center
    $format.LineAlignment = [System.Drawing.StringAlignment]::Center
    $graphics.DrawString($Label, $font, $textBrush, $rectangle, $format)
    $bitmap.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
  }
  finally {
    $format.Dispose()
    $font.Dispose()
    $textBrush.Dispose()
    $circleBrush.Dispose()
    $backgroundBrush.Dispose()
    $graphics.Dispose()
    $bitmap.Dispose()
  }

  return $path
}

function Close-OwnedPresentation {
  param([Parameter(Mandatory)]$Presentation)

  $Presentation.Saved = $MsoTrue
  $Presentation.Close()
  $ownedPresentations.Remove($Presentation) | Out-Null
  Release-ComObject $Presentation
}

function Quit-OwnedApplication {
  param([Parameter(Mandatory)]$Application)

  $Application.Quit()
  $ownedApplications.Remove($Application) | Out-Null
  Release-ComObject $Application
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}

function Invoke-CopyRangeTest {
  Add-Type -AssemblyName System.Drawing

  $pngs = @(
    New-SyntheticPng -FileName "a.png" -Label "A" -Color ([System.Drawing.Color]::FromArgb(18, 103, 214)),
    New-SyntheticPng -FileName "b.png" -Label "B" -Color ([System.Drawing.Color]::FromArgb(124, 58, 237)),
    New-SyntheticPng -FileName "b-duplicate.png" -Label "B" -Color ([System.Drawing.Color]::FromArgb(124, 58, 237)),
    New-SyntheticPng -FileName "c.png" -Label "C" -Color ([System.Drawing.Color]::FromArgb(15, 157, 114))
  )

  $sourceApp = New-PowerPointApplication -Owned -HideApplication
  $result.powerpointVersion = [string]$sourceApp.Version
  $sourcePresentation = New-HiddenPresentation $sourceApp
  $sourceSlide = Track-ComObject ($sourcePresentation.Slides.Add(1, $PpLayoutBlank))

  $positions = @(
    @{ Left = 72; Top = 72 },
    @{ Left = 252; Top = 72 },
    @{ Left = 72; Top = 252 },
    @{ Left = 252; Top = 252 }
  )
  $shapeNames = New-Object System.Collections.Generic.List[object]

  for ($index = 0; $index -lt $pngs.Count; $index++) {
    $position = $positions[$index]
    $shape = $sourceSlide.Shapes.AddPicture(
      $pngs[$index],
      $MsoFalse,
      $MsoTrue,
      [single]$position.Left,
      [single]$position.Top,
      [single]144,
      [single]144
    )
    try {
      $shape.Name = "CAB-SPK-$($index + 1)"
      $null = $shapeNames.Add([string]$shape.Name)
    }
    finally {
      Release-ComObject $shape
    }
  }

  $sourceRange = Track-ComObject ($sourceSlide.Shapes.Range([object[]]$shapeNames.ToArray()))
  $sourceSnapshot = Get-ShapeSnapshot $sourceRange
  $result.observations.sourceShapeCount = [int]$sourceRange.Count
  $result.observations.sourceShapes = $sourceSnapshot
  $result.observations.sourcePresentationWindows = [int]$sourcePresentation.Windows.Count
  $result.observations.applicationVisible = [int]$sourceApp.Visible

  $sourceRange.Copy()
  Start-Sleep -Milliseconds $ClipboardSettleMilliseconds
  Release-ComObject $sourceRange
  Release-ComObject $sourceSlide

  Close-OwnedPresentation $sourcePresentation

  foreach ($png in $pngs) {
    Remove-Item -Path $png -Force
  }
  $result.observations.tempImagesDeletedBeforeValidationPaste = ($pngs | Where-Object { Test-Path $_ }).Count -eq 0

  Quit-OwnedApplication $sourceApp

  $validationApp = New-PowerPointApplication -Owned -HideApplication
  $validationPresentation = New-HiddenPresentation $validationApp
  $validationSlide = Track-ComObject ($validationPresentation.Slides.Add(1, $PpLayoutBlank))
  $pastedRange = Invoke-PasteWithRetry $validationSlide
  $pastedSnapshot = Get-ShapeSnapshot $pastedRange

  $result.observations.pastedShapeCount = [int]$pastedRange.Count
  $result.observations.pastedShapes = $pastedSnapshot
  $result.observations.independentShapes = ([int]$pastedRange.Count -eq 4) -and (($pastedSnapshot | Where-Object { $_.type -eq $MsoGroup }).Count -eq 0)
  $result.observations.relativeLayoutPreserved = Compare-RelativeLayout $sourceSnapshot $pastedSnapshot
  $result.observations.clipboardSurvivedSourceClose = [int]$pastedRange.Count -gt 0
  $result.observations.clipboardSurvivedAutomationQuit = [int]$pastedRange.Count -gt 0
  $result.observations.copyRangeFeasible = $result.observations.independentShapes -and $result.observations.relativeLayoutPreserved
}

function Invoke-VectorRangeTest {
  $svgPath = Join-Path $tempDirectory "vector.svg"
  $svg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" rx="96" fill="#c2410c"/><circle cx="256" cy="256" r="150" fill="white"/><path d="M160 160 L256 352 L352 160 Z" fill="#c2410c"/></svg>'
  [System.IO.File]::WriteAllText($svgPath, $svg, (New-Object System.Text.UTF8Encoding $false))

  $sourceApp = New-PowerPointApplication -Owned -HideApplication
  $result.powerpointVersion = [string]$sourceApp.Version
  $sourcePresentation = New-HiddenPresentation $sourceApp
  $sourceSlide = Track-ComObject ($sourcePresentation.Slides.Add(1, $PpLayoutBlank))
  $shape = $sourceSlide.Shapes.AddPicture(
    $svgPath,
    $MsoFalse,
    $MsoTrue,
    [single]72,
    [single]72,
    [single]288,
    [single]288
  )
  try {
    $result.observations.sourceShapeType = [int]$shape.Type
    $shape.Copy()
  }
  finally {
    Release-ComObject $shape
  }
  Start-Sleep -Milliseconds $ClipboardSettleMilliseconds
  Release-ComObject $sourceSlide

  Close-OwnedPresentation $sourcePresentation
  Remove-Item -Path $svgPath -Force
  $result.observations.tempSvgDeletedBeforeValidationPaste = -not (Test-Path $svgPath)

  Quit-OwnedApplication $sourceApp

  $validationApp = New-PowerPointApplication -Owned -HideApplication
  $validationPresentation = New-HiddenPresentation $validationApp
  $validationSlide = Track-ComObject ($validationPresentation.Slides.Add(1, $PpLayoutBlank))
  $pastedRange = Invoke-PasteWithRetry $validationSlide
  $pastedSnapshot = Get-ShapeSnapshot $pastedRange

  $result.observations.pastedShapeCount = [int]$pastedRange.Count
  $result.observations.pastedShapes = $pastedSnapshot
  $result.observations.pastedShapeType = if ($pastedRange.Count -ge 1) { [int]$pastedSnapshot[0].type } else { $null }
  $result.observations.msoGraphicType = $MsoGraphic
  $result.observations.msoPictureType = $MsoPicture
  $result.observations.vectorGraphicPreserved = $result.observations.pastedShapeType -eq $MsoGraphic
  $result.observations.clipboardSurvivedAutomationQuit = [int]$pastedRange.Count -gt 0
}

function Invoke-ClipboardInspection {
  $existing = $result.preexistingPowerPointProcesses.Count -gt 0
  $app = New-PowerPointApplication -Owned:(-not $existing) -HideApplication:(-not $existing)
  $result.powerpointVersion = [string]$app.Version
  $presentation = New-HiddenPresentation $app
  $slide = Track-ComObject ($presentation.Slides.Add(1, $PpLayoutBlank))
  $pastedRange = Invoke-PasteWithRetry $slide
  $snapshot = Get-ShapeSnapshot $pastedRange

  $result.observations.pastedShapeCount = [int]$pastedRange.Count
  $result.observations.pastedShapes = $snapshot
  $result.observations.independentShapes = ([int]$pastedRange.Count -gt 1) -and (($snapshot | Where-Object { $_.type -eq $MsoGroup }).Count -eq 0)
  $result.observations.containsMsoGraphic = ($snapshot | Where-Object { $_.type -eq $MsoGraphic }).Count -gt 0
  $result.observations.containsMsoPicture = ($snapshot | Where-Object { $_.type -eq $MsoPicture }).Count -gt 0
  $result.observations.msoGraphicType = $MsoGraphic
  $result.observations.msoPictureType = $MsoPicture
  $result.observations.usedPreexistingPowerPointProcess = $existing
}

try {
  $result.preexistingPowerPointProcesses = @(
    Get-Process POWERPNT -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id
  )

  if (($Mode -eq "copy-range" -or $Mode -eq "vector-range") -and $result.preexistingPowerPointProcesses.Count -gt 0) {
    throw "Close all PowerPoint windows before running '$Mode'. The isolated lifecycle test must be able to quit the automation instance safely."
  }

  New-Item -ItemType Directory -Path $tempDirectory -Force | Out-Null

  if ($Mode -eq "copy-range") {
    Invoke-CopyRangeTest
  }
  elseif ($Mode -eq "vector-range") {
    Invoke-VectorRangeTest
  }
  else {
    Invoke-ClipboardInspection
  }

  $result.success = $true
}
catch {
  $result.error = "{0}: {1}" -f $_.Exception.GetType().FullName, $_.Exception.Message
  $result.success = $false
}
finally {
  foreach ($presentation in $ownedPresentations) {
    try {
      $presentation.Saved = $MsoTrue
      $presentation.Close()
    }
    catch {}
  }

  foreach ($application in $ownedApplications) {
    try { $application.Quit() } catch {}
  }

  foreach ($comObject in $comObjects) {
    Release-ComObject $comObject
  }

  try {
    if (Test-Path $tempDirectory) {
      Remove-Item -Path $tempDirectory -Recurse -Force
    }
  }
  catch {
    $result.observations.tempCleanupError = $_.Exception.Message
  }

  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
  $result.finishedAt = (Get-Date).ToString("o")
  $result.tempDirectoryExistsAfterCleanup = Test-Path $tempDirectory

  $json = $result | ConvertTo-Json -Depth 12
  Write-Output $json
}
