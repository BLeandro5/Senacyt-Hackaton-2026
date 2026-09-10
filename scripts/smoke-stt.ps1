# Synthetic speech generated entirely by an installed Windows voice.
# No microphone capture, no cloud TTS, no permanent audio storage.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Speech
$speechTest = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speechFile = Join-Path ([System.IO.Path]::GetTempPath()) ('inventory-stt-' + [guid]::NewGuid().ToString() + '.wav')
try {
    $spanish = $speechTest.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -like 'es-*' } | Select-Object -First 1
    if (-not $spanish) { throw 'No installed Spanish Windows voice for synthetic speech test. Use a real local WAV instead.' }
    $speechTest.SelectVoice($spanish.VoiceInfo.Name)
    $format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(16000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
    $speechTest.SetOutputToWaveFile($speechFile, $format)
    $speechTest.Speak('Hay dos equipos en el hospital. Un equipo tiene ocho a'+[char]0x00F1+'os.')
    $speechTest.SetOutputToNull()
    $result = Invoke-RestMethod 'http://127.0.0.1:8000/media/transcribe' -Method Post -ContentType 'audio/wav' -Body ([System.IO.File]::ReadAllBytes($speechFile)) -TimeoutSec 120
    $result | ConvertTo-Json -Depth 4
    if (-not $result.local -or $result.audioStored -or $result.text -notmatch 'equipos?' -or $result.text -notmatch 'hospital') { throw 'STT acceptance failed for synthetic Spanish speech.' }
    Write-Output 'Real local STT smoke: PASS. Microphone permission and recording remain manual QA.'
} finally {
    $speechTest.Dispose()
    if (Test-Path -LiteralPath $speechFile) { Remove-Item -LiteralPath $speechFile }
}
