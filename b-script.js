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

  if (statusFilter === "LIVE") return status === "LIVE";
  if (statusFilter === "FT") return status === "FT";
  if (statusFilter === "UPCOMING")
    return status !== "LIVE" && status !== "FT";

  return true;
}

// ==============================
// FETCH & PARSE MATCHES (FINAL)
// ==============================

async function parseMatches() {

  try {

    const res = await fetch(
      "https://api-soccer.thai-play.com/api/v4/iptv/livescore/now?token=JF6pHMnpVCRUeEsSqAAjTWA4GbGhMrpD"
    );

    const htmlText = await res.text();

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");

    const leagueSelect =
      document.getElementById("leagueSelect");

    Object.keys(leagueMap)
      .forEach(k => delete leagueMap[k]);


    // =========================
    // GET ALL ROWS
    // =========================

    const allRows =
      doc.querySelectorAll("div.row");


    let currentDate =
      new Date().toLocaleDateString("th-TH");


    // =========================
    // LOOP ROWS
    // =========================

    allRows.forEach(row => {

      // =====================
      // DATE BLOCK
      // =====================

      const dateNode =
        row.querySelector("b.fs-4");

      if (dateNode) {

        currentDate =
          dateNode.textContent.trim();

        return;

      }


      // =====================
      // MATCH CONTAINER
      // =====================

      if (!row.classList.contains("gy-3"))
        return;


      const blocks = row.children;

      let i = 0;

      while (i < blocks.length) {

        const statusBlock  = blocks[i];
        const infoBlock    = blocks[i+1];
        const channelBlock = blocks[i+2];

        if (!statusBlock ||
            !infoBlock ||
            !channelBlock)
          break;


        // =====================
        // STATUS
        // =====================

        let statusText =
          statusBlock.textContent.trim();

        if (!statusText)
          statusText = "-";


        // =====================
        // TEAMS
        // =====================

        const homeTeam =
          infoBlock
            .querySelector(".text-end p")
            ?.textContent.trim()
          || "ทีมเหย้า";


        const awayTeam =
          infoBlock
            .querySelector(".text-start p")
            ?.textContent.trim()
          || "ทีมเยือน";


        // =====================
        // LOGOS
        // =====================

        const logos =
          infoBlock.querySelectorAll("img");

        const homeLogo =
          logos[0]?.src || "";

        const awayLogo =
          logos[1]?.src || "";


        // =====================
        // SCORE
        // =====================

        const scoreText =
          infoBlock
            .querySelector(".col-lg-2 p")
            ?.textContent.trim()
          || "-";


        // =====================
        // LEAGUE
        // =====================

        const leagueNode =
          row.closest(".col-lg-12")
            ?.previousElementSibling
            ?.querySelector(
              "strong.text-uppercase"
            );


        const leagueFull =
          leagueNode
            ? leagueNode
                .textContent
                .trim()
                .replace("|", ":")
            : "ไม่ระบุลีก";


        // =====================
        // CREATE LEAGUE
        // =====================

        if (!leagueMap[leagueFull]) {

          leagueMap[leagueFull] = [];

          if (![...leagueSelect.options]
              .some(o => o.value === leagueFull)) {

            const opt =
              document.createElement("option");

            opt.value = leagueFull;
            opt.textContent = leagueFull;

            leagueSelect.appendChild(opt);

          }

        }


        // =====================
        // MATCH KEY
        // =====================

        const matchKey =
          homeTeam + "_" +
          awayTeam + "_" +
          currentDate;


        let match =
          leagueMap[leagueFull]
            .find(m => m.matchKey === matchKey);


        if (!match) {

          match = {

            matchKey,

            homeTeam,
            awayTeam,

            homeLogo,
            awayLogo,

            date: currentDate,

            status: statusText,

            score: scoreText,

            channels: []

          };

          leagueMap[leagueFull]
            .push(match);

        }


        // =====================
        // CHANNELS
        // =====================

        const streams =
          channelBlock
            .querySelectorAll(
              "img.iam-list-tv"
            );


        streams.forEach(stream => {

          let url =
            stream.getAttribute(
              "data-url"
            );

          if (!url) return;

          url = url
            .replace(":443","")
            .replace(
              "/dooballfree-com/",
              "/do-ball.com/"
            );


          match.channels.push({

            channel:
              stream.getAttribute("alt"),

            logo:
              stream.getAttribute("src"),

            url

          });

        });


        // =====================
        // NEXT MATCH
        // =====================

        i += 3;

      }

    });


    // =========================
    // RENDER
    // =========================

    const savedLeague =
      getSavedLeague();

    if (savedLeague &&
        leagueMap[savedLeague]) {

      leagueSelect.value =
        savedLeague;

      renderFilteredLeague();

    }
    else {

      leagueSelect.value = "all";

      renderAllLeagues();

    }

  }
  catch(err){

    document
      .querySelector(
        "#matchesTable tbody"
      )
      .innerHTML =
        `<tr>
           <td colspan="6">
             โหลดข้อมูลไม่สำเร็จ
           </td>
         </tr>`;

  }

}

// ==============================
// STATUS FORMAT
// ==============================

function formatStatus(statusText) {

  if (!statusText)
    return "-";

  const raw =
    statusText.trim().toUpperCase();

  if (raw === "FT")
    return "FT";

  if (raw === "-")
    return "LIVE";

  if (/^\d{1,2}:\d{2}$/.test(raw))
    return raw;

  return raw;
}

// ==============================
// STATUS CLASS
// ==============================

function getStatusClass(status) {

  if (status === "LIVE")
    return "status-live";

  if (status === "FT")
    return "status-ft";

  if (/^\d{1,2}:\d{2}$/.test(status))
    return "status-upcoming";

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
  const displayStatus = formatStatus(match.status, match.date);

  if (!filterByStatus(statusFilter, displayStatus)) return;

  const statusClass = getStatusClass(displayStatus);

  // ========================
  // แถวแมตช์
  // ========================
  const matchTr = document.createElement("tr");
  matchTr.classList.add("match-row");

  matchTr.innerHTML = `
    <td>
      <img src="${match.homeLogo}" class="team-logo">
      ${match.homeTeam}
    </td>

    <td>
      ${match.score !== "-" ? match.score : "VS"}
    </td>

    <td>
      <img src="${match.awayLogo}" class="team-logo">
      ${match.awayTeam}
    </td>

    <td>${match.date}</td>

    <td>
      <span class="status ${statusClass}">
        ${displayStatus}
      </span>
    </td>

    <td>
      <button class="toggle-channel-btn">
        ช่อง (${match.channels.length})
      </button>
    </td>
  `;

  // ========================
  // แถวช่อง (ใหม่)
  // ========================
  const channelTr = document.createElement("tr");
  channelTr.classList.add("channel-row");
  channelTr.style.display = "none";

  channelTr.innerHTML = `
    <td colspan="6">
      <div class="channel-big-wrapper">
        ${match.channels.map(ch => `
          <div class="channel-big-item"
            onclick="playStream('${ch.url}','${match.homeTeam}','${match.awayTeam}','${league}',this.closest('tr').previousElementSibling)">
            <img src="${ch.logo}" class="channel-big-logo">
          </div>
        `).join("")}
      </div>
    </td>
  `;

  // ปุ่ม toggle
  matchTr.querySelector(".toggle-channel-btn")
    .addEventListener("click", () => {
      channelTr.style.display =
        channelTr.style.display === "none" ? "table-row" : "none";
    });

  tbody.appendChild(matchTr);
  tbody.appendChild(channelTr);
}

// ==============================
// TOGGLE CHANNEL ROW
// ==============================

function toggleChannelRow(btn) {
  const wrapper = btn.nextElementSibling;
  wrapper.classList.toggle("show");
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
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = url;
  }

  video.play();

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

      if (selectedLeague === "all") renderAllLeagues();
      else renderFilteredLeague();

    });

  await parseMatches();
  startAutoRefresh();

});
