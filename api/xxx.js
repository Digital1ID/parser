export default async function handler(req, res) {
  try {
    const { id, id_league, ch } = req.query;

    if (!id || !id_league) {
      return res.json({ status: false, error: "Missing id or id_league" });
    }

    // =========================
    // STEP 1: ดึงหน้าแรกเพื่อเอา nonce
    // =========================
    const homeRes = await fetch("https://full24th.com/", {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept":
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
      }
    });

    const homeHtml = await homeRes.text();

    const nonceMatch = homeHtml.match(/"match_nonce":"(.*?)"/);

    if (!nonceMatch) {
      return res.json({
        status: false,
        error: "Nonce not found in homepage",
        debug: homeHtml.substring(0, 500)
      });
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
        "Referer": "https://full24th.com/"
      }
    });

    const ajaxHtml = await ajaxRes.text();

    const m3u8Match = ajaxHtml.match(/https?:\/\/[^"]+\.m3u8[^"]*/);

    if (!m3u8Match) {
      return res.json({
        status: false,
        error: "m3u8 not found",
        debug: ajaxHtml.substring(0, 500)
      });
    }

    return res.json({
      status: true,
      stream: m3u8Match[0]
    });

  } catch (err) {
    return res.json({ status: false, error: err.message });
  }
}