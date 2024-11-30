<?php
session_start();

$secretKey = 'อันนี้ไม่บอกละกัน-_-';

$targetDir = '/home/mon/domains/cdn.mon.in.th/public_html/i/';

$uploadLimit = 5;
$timeFrame = 60;

$allowedMimeTypes = [
    'image/jpeg' => 'jpg',
    'image/png' => 'png',
    'image/gif' => 'gif',
    'image/webp' => 'webp',
    'image/svg+xml' => 'svg'
];

if (!isset($_POST['cf-turnstile-response'])) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Turnstile verification failed.',
        'reload' => true
    ]);
    exit;
}

$turnstileResponse = $_POST['cf-turnstile-response'];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://challenges.cloudflare.com/turnstile/v0/siteverify");
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
    'secret' => $secretKey,
    'response' => $turnstileResponse
]));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$verification = curl_exec($ch);
curl_close($ch);

$verificationData = json_decode($verification);

if (!$verificationData->success) {
    header('Content-Type: application/json');
    echo json_encode([
        'success' => false,
        'message' => 'Turnstile verification failed.',
        'reload' => true
    ]);
    exit;
}

if (!isset($_FILES['image'])) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'No image uploaded.']);
    exit;
}

$image = $_FILES['image'];

$maxFileSize = 10 * 1024 * 1024;
if ($image['size'] > $maxFileSize) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'File size exceeds 10MB.']);
    exit;
}

$finfo = finfo_open(FILEINFO_MIME_TYPE);
$mimeType = finfo_file($finfo, $image['tmp_name']);
finfo_close($finfo);

if (!array_key_exists($mimeType, $allowedMimeTypes)) {
    header('Location: https://links.in.th/spd888');
    exit;
}

$imageSizeData = getimagesize($image['tmp_name']);
if ($imageSizeData === false && $mimeType != 'image/svg+xml') {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Uploaded file is not a valid image.']);
    exit;
}

$userIP = $_SERVER['REMOTE_ADDR'];
$uploadLogFile = $targetDir . 'upload_log.json';

$uploadLogs = [];
if (file_exists($uploadLogFile)) {
    $uploadLogs = json_decode(file_get_contents($uploadLogFile), true);
}

$currentTime = time();
foreach ($uploadLogs as $ip => $timestamps) {
    $uploadLogs[$ip] = array_filter($timestamps, function($timestamp) use ($currentTime, $timeFrame) {
        return ($currentTime - $timestamp) <= $timeFrame;
    });
}

$userUploads = isset($uploadLogs[$userIP]) ? count($uploadLogs[$userIP]) : 0;

if ($userUploads >= $uploadLimit) {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Upload limit exceeded. Please try again later.']);
    exit;
}

$uploadLogs[$userIP][] = $currentTime;

file_put_contents($uploadLogFile, json_encode($uploadLogs));

$imageHash = md5_file($image['tmp_name']);

$hashFile = $targetDir . 'hashes.json';

$hashes = [];
if (file_exists($hashFile)) {
    $hashes = json_decode(file_get_contents($hashFile), true);
}

if (isset($hashes[$imageHash])) {
    header('Content-Type: application/json');
    $fileUrl = 'https://cdn.mon.in.th/i/' . $hashes[$imageHash];
    echo json_encode([
        'success' => true,
        'message' => 'Image already exists.',
        'url' => $fileUrl,
        'thumbnail' => $fileUrl
    ]);
    exit;
}

if (!is_dir($targetDir)) {
    if (!mkdir($targetDir, 0755, true)) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Server error occurred. Please try again later.']);
        exit;
    }
}

$extension = $allowedMimeTypes[$mimeType];

function generateRandomString($length = 2) {
    $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $length > $i; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
}

$maxAttempts = 1000;
$attempts = 0;
do {
    $uniqueName = generateRandomString(2) . '.' . $extension;
    $targetFilePath = $targetDir . $uniqueName;
    $attempts++;
    if ($attempts >= $maxAttempts) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'message' => 'Failed to generate unique file name.']);
        exit;
    }
} while (file_exists($targetFilePath));

if (move_uploaded_file($image['tmp_name'], $targetFilePath)) {
    $hashes[$imageHash] = $uniqueName;
    file_put_contents($hashFile, json_encode($hashes));

    header('Content-Type: application/json');
    $fileUrl = 'https://cdn.mon.in.th/i/' . $uniqueName;

    echo json_encode([
        'success' => true,
        'message' => 'Image uploaded successfully.',
        'url' => $fileUrl,
        'thumbnail' => $fileUrl
    ]);
} else {
    header('Content-Type: application/json');
    echo json_encode(['success' => false, 'message' => 'Failed to move uploaded file.']);
}
?>
