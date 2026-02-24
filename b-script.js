// ==============================
// GLOBAL
// ==============================
const leagueMap = {};
let autoRefreshInterval = null;
let hlsPlayer = null;


// ==============================
// SAVE / LOAD SELECTED LEAGUE
// ==============================
function saveSelectedLeague(league) {
  localStorage.setItem("selectedLeague", league);
}

function getSavedLeague() {
  return localStorage.getItem("selectedLeague") || "all";
}


// ==============================
// STATUS FILTER
// ==============================
function filterByStatus(statusFilter, matchStatus) {

  if (statusFilter === "all") return true;

  const status = matchStatus.toUpperCase();

  if (statusFilter === "LIVE") {
    return status === "LIVE";
  }

  if (statusFilter === "FT") {
    return status === "FT";
  }

  if (statusFilter === "UPCOMING") {
    return status !== "LIVE" && status !== "FT";
  }

  return true;
}


// ==============================
// FETCH & PARSE MATCHES
// ==============================
async function parseMatches() {
  try {

    const res = await fetch("https://api-soccer.thai-play.com/api/v4/iptv/livescore/now?token=JF6pHMnpVCRUeEsSqAAjTWA4GbGhMrpD");
    const htmlText = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    const containers = doc.querySelectorAll("div.row.gy-3");
    const leagueSelect = document.getElementById("leagueSelect");

    Object.keys(leagueMap).forEach(key => delete leagueMap[key]);

    containers.forEach(container => {

      const statusNode = container.querySelector("div.col-lg-1 div, div.col-lg-1 span");
      const statusText = statusNode ? statusNode.textContent.trim() : "-";

      const homeTeam = container.querySelector("div.text-end p")?.textContent.trim() || "ทีมเหย้า";
      const awayTeam = container.querySelector("div.text-start p")?.textContent.trim() || "ทีมเยือน";

      const leagueNode = container.closest("div.col-lg-12")
        ?.previousElementSibling
        ?.querySelector("strong.text-uppercase");

      const leagueFull = leagueNode
        ? leagueNode.textContent.trim().replace("|", ":")
        : "ไม่ระบุลีก";

      const dateNode = container.closest("div").querySelector("b.fs-4");
      const thaiDate = dateNode
        ? dateNode.textContent.trim()
        : new Date().toLocaleDateString("th-TH");

      const images = container.querySelectorAll("img");
      const homeLogo = images[0]?.src || "";
      const awayLogo = images[1]?.src || "";

      const scoreNode = container.querySelector("div.col-lg-2 p");
      const scoreText = scoreNode ? scoreNode.textContent.trim() : "-";

      const streams = container.querySelectorAll("img.iam-list-tv");
      const seenChannels = new Set();

      streams.forEach(stream => {

        const channel = stream.getAttribute("alt");
        if (seenChannels.has(channel)) return;
        seenChannels.add(channel);

        let url = stream.getAttribute("data-url");
        const logo = stream.getAttribute("src");
        if (!url) return;

        url = url.replace(":443", "").replace("/dooballfree-com/", "/do-ball.com/");

        if (!leagueMap[leagueFull]) {
          leagueMap[leagueFull] = [];

          if (![...leagueSelect.options].some(opt => opt.value === leagueFull)) {
            const opt = document.createElement("option");
            opt.value = leagueFull;
            opt.textContent = leagueFull;
            leagueSelect.appendChild(opt);
          }
        }

        leagueMap[leagueFull].push({
          homeTeam,
          awayTeam,
          homeLogo,
          awayLogo,
          date: thaiDate,
          status: statusText,
          score: scoreText,
          channel,
          logo,
          url
        });

      });

    });

    const savedLeague = getSavedLeague();

    if (savedLeague && leagueMap[savedLeague]) {
      document.getElementById("leagueSelect").value = savedLeague;
      renderFilteredLeague();
    } else {
      document.getElementById("leagueSelect").value = "all";
      renderAllLeagues();
    }

  } catch (err) {

    document.querySelector("#matchesTable tbody").innerHTML =
      `<tr><td colspan="6">ไม่สามารถโหลดข้อมูลการแข่งขัน</td></tr>`;

  }
}


// ==============================
// STATUS FORMAT
// ==============================
function formatStatus(statusText) {

  const raw = statusText ? statusText.trim().toUpperCase() : "";

  if (raw === "FT") return "FT";

  if (/^\d{1,2}[:.]\d{2}$/.test(raw))
    return raw.replace(".", ":");

  if (raw.includes("LIVE")) return "LIVE";

  // ถ้าเป็น "-" หรือว่าง ให้ถือว่า LIVE
  if (raw === "" || raw === "-")
    return "LIVE";

  return raw;
}


// ==============================
// STATUS CLASS
// ==============================
function getStatusClass(status) {

  const s = status.toUpperCase();

  if (s === "LIVE") return "status-live";
  if (s === "FT") return "status-ft";
  if (/^\d{1,2}:\d{2}$/.test(s)) return "status-upcoming";

  return "status-upcoming";
}


// ==============================
// RENDER ALL
// ==============================
function renderAllLeagues() {

  const tbody = document.querySelector("#matchesTable tbody");
  tbody.innerHTML = "";

  Object.keys(leagueMap).forEach(league => {

    const leagueRow = document.createElement("tr");
    leagueRow.classList.add("league-header");
    leagueRow.innerHTML = `<td colspan="6">${league}</td>`;
    tbody.appendChild(leagueRow);

    leagueMap[league].forEach(match => {
      appendMatchRow(tbody, match, league);
    });

  });
}


// ==============================
// RENDER FILTERED
// ==============================
function renderFilteredLeague() {

  const selectedLeague = document.getElementById("leagueSelect").value;
  const tbody = document.querySelector("#matchesTable tbody");

  tbody.innerHTML = "";
  saveSelectedLeague(selectedLeague);

  if (selectedLeague === "all") {
    renderAllLeagues();
    return;
  }

  if (!leagueMap[selectedLeague]) {
    renderAllLeagues();
    return;
  }

  const leagueRow = document.createElement("tr");
  leagueRow.classList.add("league-header");
  leagueRow.innerHTML = `<td colspan="6">${selectedLeague}</td>`;
  tbody.appendChild(leagueRow);

  leagueMap[selectedLeague].forEach(match => {
    appendMatchRow(tbody, match, selectedLeague);
  });
}


// ==============================
// APPEND MATCH ROW
// ==============================
function appendMatchRow(tbody, match, league) {

  const statusFilter = document.getElementById("statusSelect")?.value || "all";
  const displayStatus = formatStatus(match.status);

  if (!filterByStatus(statusFilter, displayStatus)) return;

  const statusClass = getStatusClass(displayStatus);
  const tr = document.createElement("tr");

  tr.innerHTML = `
  
    <td data-label="ทีมเหย้า">
      <img src="${match.homeLogo}" class="logo"> ${match.homeTeam}
    </td>

    <td data-label="สกอร์">
      ${match.score !== "-" ? match.score : "VS"}
    </td>

    <td data-label="ทีมเยือน">
      <img src="${match.awayLogo}" class="logo"> ${match.awayTeam}
    </td>

    <td data-label="วันที่ / เวลา">
      ${match.date}
    </td>

    <td data-label="สถานะ">
      <span class="status ${statusClass}">
        ${displayStatus}
      </span>
    </td>

    <td data-label="ช่อง"
        class="channel-cell"
        style="cursor:pointer"
        onclick="playStream('${match.url}', '${match.homeTeam}', '${match.awayTeam}', '${league}', this.closest('tr'))">

      <img src="${match.logo}" class="logo">
      ${match.channel}

    </td>
  `;

  tbody.appendChild(tr);
}


// ==============================
// PLAY STREAM
// ==============================
function playStream(url, homeTeam, awayTeam, league, rowElement) {

  if (!url) return;

  const playerBox = document.getElementById("playerBox");
  const video = document.getElementById("videoPlayer");

  playerBox.classList.add("active");

  document.querySelector("#playerBox h2").textContent =
    `⚽ ${league} | ${homeTeam} vs ${awayTeam}`;

  if (hlsPlayer) {
    hlsPlayer.destroy();
    hlsPlayer = null;
  }

  if (Hls.isSupported()) {
    hlsPlayer = new Hls();
    hlsPlayer.loadSource(url);
    hlsPlayer.attachMedia(video);
    video.play();
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
    video.play();
  }

  document.querySelectorAll("#matchesTable tbody tr")
    .forEach(tr => tr.classList.remove("active-match"));

  if (rowElement) rowElement.classList.add("active-match");

  playerBox.scrollIntoView({ behavior: "smooth", block: "center" });
}


// ==============================
// SEARCH
// ==============================
function filterTable() {

  const input = document.getElementById("searchInput").value.toLowerCase();
  const rows = document.querySelectorAll("#matchesTable tbody tr");

  rows.forEach(row => {

    if (row.classList.contains("league-header")) {
      row.style.display = "";
      return;
    }

    const text = row.textContent.toLowerCase();
    row.style.display = text.includes(input) ? "" : "none";

  });
}


// ==============================
// AUTO REFRESH
// ==============================
function startAutoRefresh() {

  if (autoRefreshInterval) clearInterval(autoRefreshInterval);

  autoRefreshInterval = setInterval(async () => {
    await parseMatches();
  }, 60000);
}


// ==============================
// INIT
// ==============================
document.addEventListener("DOMContentLoaded", async () => {

  document.getElementById("playerBox").classList.remove("active");

  document.getElementById("leagueSelect")
    .addEventListener("change", renderFilteredLeague);

  document.getElementById("statusSelect")
    .addEventListener("change", () => {

      const selectedLeague = document.getElementById("leagueSelect").value;

      if (selectedLeague === "all") {
        renderAllLeagues();
      } else {
        renderFilteredLeague();
      }

    });

  await parseMatches();
  startAutoRefresh();

});
