$ErrorActionPreference = 'Stop'
$inputPath = 'C:\Users\oluac\Desktop\YELOO+\documentation\livrables_adc\Documentation_fonctionnelle_et_UI_ADC.docx'
$outputPath = 'C:\Users\oluac\Desktop\YELOO+\documentation\livrables_adc\Documentation_fonctionnelle_et_UI_ADC.pdf'
$word = $null
$doc = $null
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0
    $word.AutomationSecurity = 3
    $doc = $word.Documents.Open($inputPath, $false, $true)
    $doc.ExportAsFixedFormat($outputPath, 17, $false, 0, 0, 1, 999, 0, $true, $true, 0, $true, $true, $false)
    Write-Output $outputPath
}
finally {
    if ($null -ne $doc) { $doc.Close() }
    if ($null -ne $word) { $word.Quit() }
    if ($null -ne $doc) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($doc) | Out-Null }
    if ($null -ne $word) { [System.Runtime.InteropServices.Marshal]::ReleaseComObject($word) | Out-Null }
    [GC]::Collect()
    [GC]::WaitForPendingFinalizers()
}
