<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');
$origins = ['https://gagarin.all-indi.ru', 'https://oprimeroman-art.github.io'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
function respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}
if ($origin !== '' && !in_array($origin, $origins, true)) respond(403, ['ok'=>false]);
if ($origin !== '') {
    header('Access-Control-Allow-Origin: '.$origin);
    header('Vary: Origin');
}
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(204);
    exit;
}
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Allow: POST, OPTIONS');
    respond(405, ['ok'=>false, 'error'=>'method']);
}
if (stripos($_SERVER['CONTENT_TYPE'] ?? '', 'application/json') !== 0) respond(415, ['ok'=>false]);
$raw = file_get_contents('php://input', false, null, 0, 20001);
if ($raw === false || strlen($raw) > 20000) respond(413, ['ok'=>false]);
$data = json_decode($raw, true);
if (!is_array($data) || ($data['consent'] ?? null) !== true) respond(422, ['ok'=>false, 'error'=>'consent']);
if (!empty($data['website'])) respond(422, ['ok'=>false]);
$fields = [];
foreach (['type'=>200, 'description'=>4000, 'result'=>1000, 'contact'=>200] as $key=>$limit) {
    if (!is_string($data[$key] ?? null)) respond(422, ['ok'=>false, 'error'=>'fields']);
    $value = str_replace(["\r\n", "\r"], "\n", trim($data[$key]));
    if (preg_match('//u', $value) !== 1 || mb_strlen($value, 'UTF-8') > $limit || strpos($value, "\0") !== false) respond(422, ['ok'=>false, 'error'=>'fields']);
    $fields[$key] = $value;
}
if ($fields['description'] === '' || $fields['contact'] === '' || preg_match('/[\r\n]/', $fields['contact'])) respond(422, ['ok'=>false, 'error'=>'fields']);

// Keep spam counters outside the document root; never save submitted text there.
$key = hash('sha256', __DIR__.'|'.($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
$file = @fopen(sys_get_temp_dir().'/bygagarin-brief-'.$key, 'c+');
if (!$file || !flock($file, LOCK_EX)) respond(503, ['ok'=>false, 'error'=>'unavailable']);
@chmod(sys_get_temp_dir().'/bygagarin-brief-'.$key, 0600);
$now = time();
$times = json_decode(stream_get_contents($file), true);
$times = is_array($times) ? array_values(array_filter($times, static fn($t)=>is_int($t) && $t > $now-3600)) : [];
if (count($times) >= 5 || ($times && max($times) > $now-15)) {
    fclose($file);
    header('Retry-After: 60');
    respond(429, ['ok'=>false, 'error'=>'rate_limit']);
}
$id = bin2hex(random_bytes(6));
$subject = '=?UTF-8?B?'.base64_encode('Заявка с byGagarin / '.$id).'?=';
$body = "ЗАЯВКА С САЙТА BYGAGARIN\n\nНаправление: ".$fields['type']."\n\nЧто происходит:\n".$fields['description']."\n\nКакой результат нужен:\n".$fields['result']."\n\nКонтакт для ответа: ".$fields['contact']."\n\nСогласие: отмечено перед отправкой.\nДата (UTC): ".gmdate('c')."\nНомер: ".$id."\nЯзык: ".(($data['lang'] ?? '') === 'en' ? 'en' : 'ru');
$headers = ['From'=>'byGagarin <website@gagarin.all-indi.ru>', 'MIME-Version'=>'1.0', 'Content-Type'=>'text/plain; charset=UTF-8', 'Content-Transfer-Encoding'=>'base64'];
if (filter_var($fields['contact'], FILTER_VALIDATE_EMAIL)) $headers['Reply-To'] = $fields['contact'];
$sent = function_exists('mail') && @mail('gagarinfoto64@yandex.ru', $subject, chunk_split(base64_encode($body)), $headers, '-fwebsite@gagarin.all-indi.ru');
if (!$sent) {
    fclose($file);
    error_log('byGagarin brief transport failed: '.$id);
    respond(503, ['ok'=>false, 'error'=>'mail']);
}
$times[] = $now;
rewind($file);
ftruncate($file, 0);
fwrite($file, json_encode($times));
fclose($file);
respond(200, ['ok'=>true, 'id'=>$id]);
