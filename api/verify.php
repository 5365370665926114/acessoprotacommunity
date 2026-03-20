<?php
/**
 * Prota Community — Proxy de verificação Cakto
 * Verifica se o cliente tem pedido pago via API Cakto
 *
 * CONFIGURE SUAS CREDENCIAIS ABAIXO:
 */
$CLIENT_ID     = 'sGhdc3NwKKKhH8dzK0uGzrl0yxcr28v8indAfnXL';
$CLIENT_SECRET = 'I0G2lvi8NPqWHd7VMB2AcbXJuca6P4hK8p5PJPYTxiyVgF6tcvWCitIrHKTMemI5aEflv14fLjJMEVfNClntnjIUH8YSXm1pN69ABhrFpaCDdk9LgD7TZqkT4WhaYY2i';
$CAKTO_API     = 'https://api.cakto.com.br';

// Segurança e headers
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
// Restringir CORS ao próprio domínio
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin) {
    $allowed = $_SERVER['HTTP_HOST'] ?? 'localhost';
    if (parse_url($origin, PHP_URL_HOST) === $allowed || strpos($origin, 'localhost') !== false) {
        header('Access-Control-Allow-Origin: ' . $origin);
    }
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

// Rate limiting simples por IP
$ip = $_SERVER['REMOTE_ADDR'];
$rateLimitFile = sys_get_temp_dir() . '/prota_rate_' . md5($ip) . '.json';
$maxAttempts = 10;
$windowSeconds = 300; // 5 minutos

if (file_exists($rateLimitFile)) {
    $rateData = json_decode(file_get_contents($rateLimitFile), true);
    if ($rateData && time() - $rateData['start'] < $windowSeconds) {
        if ($rateData['count'] >= $maxAttempts) {
            http_response_code(429);
            echo json_encode(['success' => false, 'error' => 'Muitas tentativas. Aguarde 5 minutos.']);
            exit;
        }
        $rateData['count']++;
    } else {
        $rateData = ['start' => time(), 'count' => 1];
    }
} else {
    $rateData = ['start' => time(), 'count' => 1];
}
file_put_contents($rateLimitFile, json_encode($rateData));

// Ler dados do body
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$cpf   = preg_replace('/[^0-9]/', '', trim($input['cpf'] ?? ''));

if (!$email || !$cpf) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email e CPF são obrigatórios.']);
    exit;
}

// Validar formato de email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Email inválido.']);
    exit;
}

// Validar CPF (11 dígitos)
if (strlen($cpf) !== 11) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'CPF inválido. Use 11 dígitos.']);
    exit;
}

// Validar CPF com algoritmo
function validarCPF($cpf) {
    if (preg_match('/^(\d)\1{10}$/', $cpf)) return false;
    for ($t = 9; $t < 11; $t++) {
        $d = 0;
        for ($c = 0; $c < $t; $c++) {
            $d += $cpf[$c] * (($t + 1) - $c);
        }
        $d = ((10 * $d) % 11) % 10;
        if ($cpf[$c] != $d) return false;
    }
    return true;
}

if (!validarCPF($cpf)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'CPF inválido.']);
    exit;
}

// ─── Helper: fazer requisição cURL (com SSL fix para XAMPP) ───
function curlRequest($url, $options = []) {
    $ch = curl_init($url);

    // Configurações padrão
    $defaults = [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 20,
        CURLOPT_FOLLOWLOCATION => true,
        // XAMPP geralmente não tem certificados SSL configurados
        // Tenta usar o bundle do sistema, senão desabilita verificação
        CURLOPT_SSL_VERIFYPEER => false,
        CURLOPT_SSL_VERIFYHOST => 0,
    ];

    // Merge defaults com options
    foreach ($defaults as $key => $val) {
        curl_setopt($ch, $key, $val);
    }
    foreach ($options as $key => $val) {
        curl_setopt($ch, $key, $val);
    }

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    return [
        'body' => $response,
        'code' => $httpCode,
        'error' => $curlError
    ];
}

// ─── Obter token OAuth2 ───
function getToken($apiUrl, $clientId, $clientSecret) {
    $result = curlRequest($apiUrl . '/public_api/token/', [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'scope' => 'read orders'
        ]),
        CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    ]);

    if ($result['error']) {
        error_log('[Prota Cakto] Token cURL error: ' . $result['error']);
        return ['token' => null, 'error' => 'cURL: ' . $result['error']];
    }

    if ($result['code'] !== 200) {
        error_log('[Prota Cakto] Token HTTP ' . $result['code'] . ': ' . $result['body']);
        return ['token' => null, 'error' => 'HTTP ' . $result['code'] . ': ' . $result['body']];
    }

    $data = json_decode($result['body'], true);
    return ['token' => $data['access_token'] ?? null, 'error' => null];
}

// Cache do token em arquivo temporário
$tokenCacheFile = sys_get_temp_dir() . '/prota_cakto_token.json';
$token = null;

if (file_exists($tokenCacheFile)) {
    $cached = json_decode(file_get_contents($tokenCacheFile), true);
    if ($cached && time() < ($cached['expires_at'] ?? 0)) {
        $token = $cached['access_token'];
    }
}

if (!$token) {
    $tokenResult = getToken($CAKTO_API, $CLIENT_ID, $CLIENT_SECRET);
    $token = $tokenResult['token'];
    if (!$token) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao conectar com o sistema de pagamento.'
        ]);
        exit;
    }
    // Cache por 9 horas (token dura 10h)
    file_put_contents($tokenCacheFile, json_encode([
        'access_token' => $token,
        'expires_at' => time() + 32400
    ]));
}

// ─── Buscar pedidos do cliente ───
$searchUrl = $CAKTO_API . '/public_api/orders/?status=paid&search=' . urlencode($email) . '&limit=100';

$orderResult = curlRequest($searchUrl, [
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json'
    ],
]);

if ($orderResult['code'] !== 200) {
    // Token pode ter expirado, tentar renovar
    @unlink($tokenCacheFile);
    $tokenResult = getToken($CAKTO_API, $CLIENT_ID, $CLIENT_SECRET);
    $token = $tokenResult['token'];

    if ($token) {
        file_put_contents($tokenCacheFile, json_encode([
            'access_token' => $token,
            'expires_at' => time() + 32400
        ]));

        $orderResult = curlRequest($searchUrl, [
            CURLOPT_HTTPHEADER => [
                'Authorization: Bearer ' . $token,
                'Content-Type: application/json'
            ],
        ]);
    }

    if ($orderResult['code'] !== 200) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Erro ao verificar pagamento. Tente novamente.'
        ]);
        exit;
    }
}

$data = json_decode($orderResult['body'], true);

// Extrair resultados da resposta
$results = [];
if (isset($data['results']) && is_array($data['results'])) {
    $results = $data['results'];
} elseif (isset($data['data']) && is_array($data['data'])) {
    $results = $data['data'];
} elseif (isset($data['items']) && is_array($data['items'])) {
    $results = $data['items'];
} elseif (is_array($data) && isset($data[0])) {
    $results = $data;
}

// Verificar se há pedido pago com o email E CPF do cliente
$found = false;
$customerName = '';

foreach ($results as $order) {
    // Tentar diferentes estruturas de customer
    $customer = $order['customer'] ?? $order['buyer'] ?? $order['client'] ?? [];
    if (!is_array($customer)) $customer = [];

    // Email: tentar múltiplos campos
    $orderEmail = strtolower(trim(
        $customer['email'] ?? $order['email'] ?? $order['buyer_email'] ?? $order['customer_email'] ?? ''
    ));

    // CPF/Document: tentar múltiplos campos
    $rawDoc = $customer['docNumber'] ?? $customer['document'] ?? $customer['doc'] ?? $customer['cpf'] ?? $customer['tax_id']
        ?? $order['docNumber'] ?? $order['document'] ?? $order['doc'] ?? $order['cpf'] ?? $order['buyer_document'] ?? '';
    $orderDoc = preg_replace('/[^0-9]/', '', $rawDoc);

    // Status
    $orderStatus = strtolower($order['status'] ?? '');


    if (
        $orderEmail === strtolower($email) &&
        $orderDoc === $cpf &&
        in_array($orderStatus, ['paid', 'completed', 'approved', 'active', 'delivered'])
    ) {
        $found = true;
        $customerName = $customer['name'] ?? $customer['full_name'] ?? $order['buyer_name'] ?? '';
        break;
    }
}

if ($found) {
    $sessionToken = hash('sha256', $email . $cpf . date('Y-m-d') . 'prota_community_secret_key');
    echo json_encode([
        'success' => true,
        'name' => $customerName,
        'token' => $sessionToken
    ]);
} else {
    http_response_code(403);
    echo json_encode([
        'success' => false,
        'error' => 'Nenhuma compra encontrada com esse email e CPF. Verifique os dados ou entre em contato com o suporte.'
    ]);
}

