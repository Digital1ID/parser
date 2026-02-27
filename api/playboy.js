export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://adult-tv-channels.com/tv/playboy.php",
      {
        method: "GET",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Referer": "https://adult-tv-channels.com/",
        },
        redirect: "follow",
      }
    );

    const html = await response.text();

    // regex ครอบคลุมกว่า (ทั้ง " และ ')
    const match = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/i);

    if (!match) {
      // debug ชั่วคราว (ดูความยาว HTML)
      return res.status(200).json({
        status: false,
        error: "signedUrl not found",
        length: html.length
      });
    }

    res.setHeader("Access-Control-Allow-Origin", "*");

    return res.status(200).json({
      status: true,
      signedUrl: match[0]
    });

  } catch (err) {
    return res.status(500).json({
      status: false,
      error: err.message
    });
  }
}