<?php
require_once __DIR__ . '/vendor/autoload.php';

// Create output/uploads directories if they don't exist
$outputDir  = __DIR__ . '/output/';
$uploadsDir = __DIR__ . '/uploads/';
foreach ([$outputDir, $uploadsDir] as $dir) {
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $action = $_POST['action'] ?? '';

    if ($action === 'html_to_pdf') {
        handleHtmlToPdf();
    } else {
        die("Invalid action.");
    }
} else {
    header("Location: index.php");
    exit;
}

/**
 * Slugify a string for use in filenames
 */
function slugify($text) {
    // Replace non-letter or digits by -
    $text = preg_replace('~[^\pL\d]+~u', '-', $text);
    // Transliterate
    $text = iconv('utf-8', 'us-ascii//TRANSLIT', $text);
    // Remove unwanted characters
    $text = preg_replace('~[^-\w]+~', '', $text);
    // Trim
    $text = trim($text, '-');
    // Remove duplicate -
    $text = preg_replace('~-+~', '-', $text);
    // Lowercase
    $text = strtolower($text);

    if (empty($text)) {
        return 'converted_document';
    }

    return $text;
}

// ─────────────────────────────────────────────
//  HTML → PDF
// ─────────────────────────────────────────────
function handleHtmlToPdf() {
    $outputDir = __DIR__ . '/output/';
    $outputPdf = $outputDir . 'converted_document_' . time() . '.pdf';

    // Allowed PDF sizes (whitelist to prevent injection)
    $allowedSizes = ['A4', 'A3', 'Letter', 'Legal'];
    $pdfSize = in_array($_POST['pdf_size'] ?? '', $allowedSizes) ? $_POST['pdf_size'] : 'A4';

    $type  = '';
    $input = '';
    $tempHtmlFile = null;

    // 1. URL input
    if (!empty($_POST['html_url']) && filter_var($_POST['html_url'], FILTER_VALIDATE_URL)) {
        $type  = 'url';
        $input = $_POST['html_url'];

    // 2. Direct text input
    } elseif (!empty($_POST['html_text'])) {
        $tempHtmlFile = __DIR__ . '/uploads/temp_' . time() . '.html';
        file_put_contents($tempHtmlFile, $_POST['html_text']);
        $type  = 'html';
        $input = $tempHtmlFile;

    } else {
        die("Please paste HTML code or provide a valid URL.");
    }

    // Call Puppeteer Node script
    $nodeScript = escapeshellarg(__DIR__ . '/pdf_generator.js');
    $escType    = escapeshellarg($type);
    $escInput   = escapeshellarg($input);
    $escOutput  = escapeshellarg($outputPdf);
    $escSize    = escapeshellarg($pdfSize);

    $command = "node $nodeScript $escType $escInput $escOutput $escSize 2>&1";
    $result  = shell_exec($command);

    // Cleanup temp HTML
    if ($tempHtmlFile && file_exists($tempHtmlFile)) {
        unlink($tempHtmlFile);
    }

    if (file_exists($outputPdf)) {
        // Extract title from output
        $title = 'document';
        if (preg_match('/TITLE:(.*)/', $result, $matches)) {
            $title = trim($matches[1]);
        } elseif ($type === 'url') {
            $title = parse_url($input, PHP_URL_HOST) ?: 'url_document';
        }

        $filename = slugify($title) . '_' . time() . '.pdf';

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="' . $filename . '"');
        header('Content-Length: ' . filesize($outputPdf));
        readfile($outputPdf);
        unlink($outputPdf);
        exit;
    } else {
        die("Failed to generate PDF. Details: " . htmlspecialchars($result));
    }
}

