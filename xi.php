<?php
header('Content-Type: application/json; charset=utf-8');

// รับพารามิเตอร์
$file = isset($_GET['file']) ? $_GET['file'] : null;

if (!$file || !file_exists($file)) {
    echo json_encode(["error" => "ไม่พบไฟล์"]);
    exit;
}

// อ่านไฟล์ M3U8
$text = file_get_contents($file);
$lines = preg_split("/\r\n|\n|\r/", $text);
$entries = [];
$current = null;

function parseAttrs($line) {
    $attrs = [];
    preg_match_all('/(\w[\w-]*)="([^"]*)"/', $line, $matches, PREG_SET_ORDER);
    foreach ($matches as $m) {
        $attrs[$m[1]] = $m[2];
    }
    return $attrs;
}

function flushCurrent(&$entries, &$current) {
    if ($current && !empty($current['name']) && !empty($current['video'])) {
        $entries[] = $current;
    }
    $current = null;
}

foreach ($lines as $line) {
    $line = trim($line);
    if ($line === '') continue;

    if (strpos($line, '#EXTINF') === 0) {
        flushCurrent($entries, $current);
        $current = [
            "player" => "p2p/player",
            "group" => "",
            "name" => "",
            "info" => "พากย์ไทย",
            "poster" => "",
            "video" => "",
            "Referrer" => ""
        ];
        $commaIdx = strpos($line, ",");
        $header = substr($line, 0, $commaIdx);
        $title = substr($line, $commaIdx + 1);
        $attrs = parseAttrs($header);
        $current["group"] = isset($attrs["group-title"]) ? $attrs["group-title"] : "";
        $current["poster"] = isset($attrs["tvg-logo"]) ? $attrs["tvg-logo"] : "";
        $current["name"] = trim($title);
    } elseif (strpos($line, '#EXTVLCOPT:http-referrer=') === 0) {
        if ($current) {
            $current["Referrer"] = str_replace('#EXTVLCOPT:http-referrer=', '', $line);
        }
    } elseif ($line[0] !== '#') {
        if ($current) {
            $current["video"] = $line;
        }
    }
}
flushCurrent($entries, $current);

// ส่งออก JSON เพียว ๆ
echo json_encode($entries, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
