<?php
$host = "localhost";
$dbname = "อันนี้ไม่บอกละกัน-_-";
$username = "อันนี้ไม่บอกละกัน-_-";
$password = "อันนี้ไม่บอกละกัน-_-";

// เชื่อมฐานข้อมูล
try {
    $conn = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    echo "Connection failed: " . $e->getMessage();
    exit();
}


$secret_key = "อันนี้ไม่บอกละกัน-_-";


if (isset($_POST['cf-turnstile-response'])) {
    $turnstile_response = $_POST['cf-turnstile-response'];


    $data = [
        'secret' => $secret_key,
        'response' => $turnstile_response,
        'remoteip' => $_SERVER['REMOTE_ADDR'] 
    ];

    $options = [
        'http' => [
            'header' => "Content-Type: application/x-www-form-urlencoded\r\n",
            'method' => 'POST',
            'content' => http_build_query($data),
        ]
    ];

    $context = stream_context_create($options);
    $verify = file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $context);
    $captcha_success = json_decode($verify);

    error_log("Verification result: " . json_encode($captcha_success));

    if (!$captcha_success->success) {
        echo "Error: Security verification failed!";
        exit();
    }
} else {
    echo "Error: No security check provided!";
    exit();
}

// สุ่มลิงก์
function generateRandomString($length = 2) {
    return substr(str_shuffle("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"), 0, $length);
}

if (isset($_POST['original_url'])) {
    $original_url = $_POST['original_url'];

    // ตรวจสอบ URL 
    if (filter_var($original_url, FILTER_VALIDATE_URL)) {
        // สร้างลิงก์
        do {
            $short_code = generateRandomString();
            $stmt = $conn->prepare("SELECT * FROM urls WHERE short_code = ?");
            $stmt->execute([$short_code]);
        } while ($stmt->rowCount() > 0);
        $stmt = $conn->prepare("INSERT INTO urls (original_url, short_code) VALUES (?, ?)");
        $stmt->execute([$original_url, $short_code]);

        // ลิงก์
        echo "https://monkub.xyz/$short_code";
    } else {
        echo "Error: Invalid URL format.";
    }
} else {
    echo "Error: No URL provided.";
}
