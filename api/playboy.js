export default async function handler(req, res) {
  try {
    const response = await fetch(
      "https://adult-tv-channels.com/tv/playboy.php",
      {
        headers: {
          "User-Agent": "Mozilla/5.0"
        }
      }
    );

    const html = await response.text();
    const match = html.match(/https?:\/\/[^"' ]+\.m3u8[^"' ]*/);

    if (!match) {
      return res.status(404).json({
        status: false,
        error: "signedUrl not found"
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