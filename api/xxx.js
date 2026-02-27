// /api/parser.js

export default async function handler(req, res) {
  try {
    const pageUrl = "https://full24th.com/dooball/?id=YOUR_ID";

    // STEP 1: โหลดหน้าเพื่อดึง nonce
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://full24th.com/"
      }
    });

    const html = await pageRes.text();

    // ดึง nonce
    const nonceMatch = html.match(/"match_nonce":"(.*?)"/);
    if (!nonceMatch) {
      return res.json({ status: false, error: "Nonce not found" });
    }

    const nonce = nonceMatch[1];

    // STEP 2: ยิง AJAX ไป admin-ajax.php
    const ajaxRes = await fetch(
      "https://full24th.com/wp-admin/admin-ajax.php",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0",
          "Referer": pageUrl
        },
        body: new URLSearchParams({
          action: "load_match",   // 🔥 ต้องตรงกับ Network ของคุณ
          match_id: "YOUR_ID",
          nonce: nonce
        })
      }
    );

    const ajaxText = await ajaxRes.text();

    // STEP 3: หา m3u8
    const m3u8Match = ajaxText.match(/https?:\/\/[^"]+\.m3u8[^"]*/);

    if (!m3u8Match) {
      return res.json({ status: false, error: "m3u8 not found", debug: ajaxText });
    }

    const streamUrl = m3u8Match[0];

    return res.json({
      status: true,
      stream: `/api/proxy?url=${encodeURIComponent(streamUrl)}`
    });

  } catch (err) {
    return res.json({ status: false, error: err.message });
  }
}