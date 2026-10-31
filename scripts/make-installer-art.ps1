Add-Type -AssemblyName System.Drawing
New-Item -ItemType Directory -Force -Path "src-tauri\windows-installer" | Out-Null

$ink   = [System.Drawing.Color]::FromArgb(255, 23, 19, 15)
$apr   = [System.Drawing.Color]::FromArgb(255, 255, 176, 103)
$peach = [System.Drawing.Color]::FromArgb(255, 233, 128, 110)
$cream = [System.Drawing.Color]::FromArgb(255, 246, 240, 230)
$halo  = [System.Drawing.Color]::FromArgb(255, 74, 59, 42)

function New-OrbitMark($g, [double]$cx, [double]$cy, [double]$ringR, [double]$coreR, [double]$planetR, [double]$_stroke) {
    # dashed outer halo
    $dash = [System.Drawing.Pen]::new($halo, [double]($_stroke * 0.33))
    $dash.DashStyle = [System.Drawing.Drawing2D.DashStyle]::Dash
    $hr = $ringR * 1.45
    $g.DrawEllipse($dash, [float]($cx - $hr), [float]($cy - $hr), [float](2 * $hr), [float](2 * $hr))
    # apricot ring, gap where the planet sits (top-right, -45 deg)
    $ring = [System.Drawing.Pen]::new($apr, [float]($_stroke))
    $g.DrawArc($ring, [float]($cx - $ringR), [float]($cy - $ringR), [float](2 * $ringR), [float](2 * $ringR), [float](-22), [float]336)
    # planet on the ring
    $orbit = [System.Drawing.SolidBrush]::new($peach)
    $px = [float]($cx + $ringR * [Math]::Cos([Math]::PI / -4) - $planetR)
    $py = [float]($cy + $ringR * [Math]::Sin([Math]::PI / -4) - $planetR)
    $g.FillEllipse($orbit, $px, $py, [float](2 * $planetR), [float](2 * $planetR))
    # filled core
    $core = [System.Drawing.SolidBrush]::new($apr)
    $g.FillEllipse($core, [float]($cx - $coreR), [float]($cy - $coreR), [float](2 * $coreR), [float](2 * $coreR))
}

function Write-Wordmark($g, [string[]]$lines, [float]$x, [float]$y, [System.Drawing.Font]$font, [System.Drawing.Brush]$brush) {
    $fmt = [System.Drawing.StringFormat]::new()
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    for ($i = 0; $i -lt $lines.Count; $i++) {
        $rect = [System.Drawing.RectangleF]::new($x, ($y + $i * ($font.Height + 2)), 148, [float]($font.Height + 4))
        $g.DrawString($lines[$i], $font, $brush, $rect, $fmt)
    }
}

$bgBrush = [System.Drawing.SolidBrush]::new($ink)

# ---- sidebar 164x314 (24bpp BMP for NSIS MUI2) ----
$s = [System.Drawing.Bitmap]::new(164, 314, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($s)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear($ink)
New-OrbitMark $g 82 118 45 24 12 7.5
$font = [System.Drawing.Font]::new("Georgia", 11, [System.Drawing.FontStyle]::Bold)
$wBrush = [System.Drawing.SolidBrush]::new($cream)
Write-Wordmark $g @("Research", "Agent") 8 258 $font $wBrush
$g.Dispose()
$s.Save("$PWD\src-tauri\windows-installer\sidebar.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
$s.Dispose()

# ---- header 150x57 ----
$h = [System.Drawing.Bitmap]::new(150, 57, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
$g = [System.Drawing.Graphics]::FromImage($h)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear($ink)
New-OrbitMark $g 24 28.5 11.5 6 3 2.6
$hfont = [System.Drawing.Font]::new("Georgia", 9.5, [System.Drawing.FontStyle]::Bold)
Write-Wordmark $g @("Research", "Agent") 44 13 $hfont $wBrush
$g.Dispose()
$h.Save("$PWD\src-tauri\windows-installer\header.bmp", [System.Drawing.Imaging.ImageFormat]::Bmp)
$h.Dispose()

Write-Host "installer art saved"
