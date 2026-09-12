<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MagicConverter | HTML ⮂ PDF</title>
    <meta name="description" content="Seamlessly convert HTML files, URLs, or text to PDF, and PDF documents back to HTML with MagicConverter.">
    <!-- Bootstrap CSS -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
    <!-- FontAwesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <!-- Custom CSS -->
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <!-- Background animations -->
    <div class="bg-blobs">
        <div class="blob blob-1"></div>
        <div class="blob blob-2"></div>
    </div>

    <!-- Loader -->
    <div class="loader-overlay" id="loader">
        <div class="spinner"></div>
        <h4 class="fw-bold text-primary">Converting your file...</h4>
        <p class="text-muted">Please wait a moment</p>
    </div>

    <div class="container py-5">
        <header class="app-header">
            <h1 class="app-title"><i class="fas fa-magic me-2"></i>MagicConverter</h1>
            <p class="text-muted fs-5">Seamlessly transform files between HTML and PDF</p>
        </header>

        <div class="row justify-content-center">
            <div class="col-lg-8">
                
                <!-- Nav Tabs -->
                <div class="text-center">
                    <ul class="nav nav-tabs custom-nav-tabs" id="converterTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="html-to-pdf-tab" data-bs-toggle="tab" data-bs-target="#html-to-pdf" type="button" role="tab"><i class="fab fa-html5 me-2"></i>HTML to PDF</button>
                        </li>
                    </ul>
                </div>

                <!-- Tab Content -->
                <div class="tab-content" id="converterTabsContent">
                    
                    <!-- HTML to PDF Tab -->
                    <div class="tab-pane fade show active" id="html-to-pdf" role="tabpanel">
                        <div class="glass-card">
                            <h3 class="fw-bold mb-4">Convert HTML to PDF</h3>
                            
                            <form action="https://url-to-pdf.prabikdhungana13.workers.dev/" method="POST" enctype="multipart/form-data" id="html-to-pdf-form">
                                <input type="hidden" name="action" value="html_to_pdf">
                                
                                <!-- Input Method Tabs -->
                                <ul class="nav nav-pills mb-3" id="htmlInputTabs" role="tablist">
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link active" id="html-url-tab" data-bs-toggle="pill" data-bs-target="#html-url-input" type="button" role="tab">URL</button>
                                    </li>
                                    <li class="nav-item" role="presentation">
                                        <button class="nav-link" id="html-text-tab" data-bs-toggle="pill" data-bs-target="#html-text-input" type="button" role="tab">Direct Input</button>
                                    </li>
                                </ul>

                                <div class="tab-content mb-4" id="htmlInputTabsContent">
                                    <!-- URL Input -->
                                    <div class="tab-pane fade show active" id="html-url-input" role="tabpanel">
                                        <div class="input-group input-group-lg mt-3">
                                            <span class="input-group-text bg-light"><i class="fas fa-link"></i></span>
                                            <input type="url" name="html_url" class="form-control" placeholder="https://example.com">
                                        </div>
                                        <small class="text-muted mt-2 d-block">Enter a complete URL starting with http:// or https://<br>For a localhost project, run it in a browser and paste that URL here.</small>
                                    </div>
                                    <!-- Direct Input -->
                                    <div class="tab-pane fade" id="html-text-input" role="tabpanel">
                                        <textarea name="html_text" class="form-control custom-textarea" placeholder="Paste your HTML code here..."></textarea>
                                    </div>
                                </div>

                                <!-- PDF Size Selector -->
                                <div class="mb-4">
                                    <label class="form-label fw-semibold mb-2"><i class="fas fa-file-alt me-2 text-primary"></i>PDF Page Size</label>
                                    <div class="pdf-size-selector">
                                        <label class="size-option">
                                            <input type="radio" name="pdf_size" value="A4" checked>
                                            <span class="size-card">
                                                <i class="fas fa-file me-1"></i>A4
                                                <small>210 × 297 mm</small>
                                            </span>
                                        </label>
                                        <label class="size-option">
                                            <input type="radio" name="pdf_size" value="A3">
                                            <span class="size-card">
                                                <i class="fas fa-file me-1"></i>A3
                                                <small>297 × 420 mm</small>
                                            </span>
                                        </label>
                                        <label class="size-option">
                                            <input type="radio" name="pdf_size" value="Letter">
                                            <span class="size-card">
                                                <i class="fas fa-file me-1"></i>Letter
                                                <small>8.5 × 11 in</small>
                                            </span>
                                        </label>
                                        <label class="size-option">
                                            <input type="radio" name="pdf_size" value="Legal">
                                            <span class="size-card">
                                                <i class="fas fa-file me-1"></i>Legal
                                                <small>8.5 × 14 in</small>
                                            </span>
                                        </label>
                                    </div>
                                </div>

                                <div class="text-end">
                                    <button type="submit" class="btn btn-custom px-5">
                                        Convert to PDF <i class="fas fa-arrow-right ms-2"></i>
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>


                </div>
            </div>
        </div>
    </div>

    <!-- Bootstrap JS -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/js/bootstrap.bundle.min.js"></script>
    <script src="assets/js/main.js"></script>
</body>
</html>
