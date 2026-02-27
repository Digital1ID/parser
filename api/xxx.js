export default async function handler(req, res) {
  try {
    const { id, id_league, ch } = req.query;

    if (!id || !id_league) {
      return res.json({
        status: false,
        error: "Missing id or id_league"
      });
    }

    const pageUrl = `https://full24th.com/dooball/?id=${id}&id_league=${id_league}&ch=${ch || 0}`;

    // =========================
    // STEP 1: โหลดหน้าเพื่อดึง nonce
    // =========================
    const pageRes = await fetch(pageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://full24th.com/"
      }
    });

    const pageHtml = await pageRes.text();

    const nonceMatch = pageHtml.match(/"match_nonce":"(.*?)"/);

    if (!nonceMatch) {
      return res.json({ status: false, error: "Nonce not found" });
    }

    const nonce = nonceMatch[1];

    // =========================
    // STEP 2: เรียก match.php
    // =========================
    const ajaxUrl =
      `https://full24th.com/wp-content/themes/dooball/_ajax_/match.php?_nonce=${nonce}` +
      `&id=${id}&id_league=${id_league}&ch=${ch || 0}`;

    const ajaxRes = await fetch(ajaxUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": pageUrl
      }
    });

    const ajaxHtml = await ajaxRes.text();

    // =========================
    // STEP 3: หา m3u8
    // =========================
    const m3u8Match = ajaxHtml.match(/https?:\/\/[^"]+\.m3u8[^"]*/);

    if (!m3u8Match) {
      return res.json({
        status: false,
        error: "m3u8 not found",
        debug: ajaxHtml.substring(0, 500)
      });
    }

    const streamUrl = m3u8Match[0];

    return res.json({
      status: true,
      stream: `/api/pro?url=${encodeURIComponent(streamUrl)}`
    });

  } catch (err) {
    return res.json({
      status: false,
      error: err.message
    });
  }
}