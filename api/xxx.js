export default async function handler(req, res) {
  try {
    // ======================
    // STEP 1: ดึงตาราง
    // ======================
    const tableRes = await fetch(
      "https://full24th.com/wp-content/themes/dooball/_ajax_/getRefresh.php?id=all",
      {
        headers: {
          "User-Agent": "Mozilla/5.0",
          "Referer": "https://full24th.com/"
        }
      }
    );

    const tableHtml = await tableRes.text();

    // ======================
    // STEP 2: ดึง match id จาก <tr id="">
    // ======================
    const matchIdMatch = tableHtml.match(
      /<tr class="collapse" id="([a-z0-9]+)"/i
    );

    if (!matchIdMatch) {
      return res.json({
        status: false,
        error: "Match ID not found"
      });
    }

    const matchId = matchIdMatch[1];

    // ======================
    // STEP 3: เข้า match page
    // ======================
    const matchUrl = `https://full24th.com/dooball?id=${matchId}`;

    const matchRes = await fetch(matchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://full24th.com/"
      }
    });

    const matchHtml = await matchRes.text();

    // ======================
    // STEP 4: หา m3u8
    // ======================
    const m3u8Match = matchHtml.match(/https?:\/\/[^"]+\.m3u8[^"]*/);

    if (!m3u8Match) {
      return res.json({
        status: false,
        error: "m3u8 not found",
        matchId
      });
    }

    const streamUrl = m3u8Match[0];

    return res.json({
      status: true,
      matchId,
      stream: `/api/pro?url=${encodeURIComponent(streamUrl)}`
    });

  } catch (err) {
    return res.json({
      status: false,
      error: err.message
    });
  }
}