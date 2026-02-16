// --- Utilities ---
async function checkSubtitleExists(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

function extractAudioTracks(m3uText) {
  const tracks = [];
  const regex = /#EXT-X-MEDIA:TYPE=AUDIO.*?LANGUAGE="(.*?)".*?NAME="(.*?)".*?URI="(.*?)"/g;
  let match;
  while ((match = regex.exec(m3uText)) !== null) {
    tracks.push({ lang: match[1], name: match[2], uri: match[3] });
  }
  return tracks;
}

// --- Movie Parser ---
async function fetchMovieById(movieId) {
  const query = `
    query getMovie($id: Int!) {
      movie(id: $id) {
        id titleTh titleEn
        video { transcodeUuid cdnHostname subtitleMetadata }
      }
    }
  `;
  const response = await fetch("https://api.doo-nang.com/graphql", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id: movieId } })
  });
  const result = await response.json();
  const movie = result?.data?.movie;
  if (!movie) return null;

  const transcodeUuid = movie.video?.transcodeUuid;
  const cdnHostname = movie.video?.cdnHostname;
  let videoUrl = "", subtitle = [], audioTracks = [];

  if (transcodeUuid && cdnHostname) {
    const base = `https://${cdnHostname}/${transcodeUuid}`;
    videoUrl = `https://api.doo-nang.com/video/${transcodeUuid}/playlist.m3u8`;

    if (movie.video?.subtitleMetadata) {
      for (const [lang, subs] of Object.entries(movie.video.subtitleMetadata)) {
        for (const sub of subs) {
          let src;
          if (sub.codec === "VTT") src = `${base}/${sub.pathName}.vtt`;
          else if (sub.codec === "BDN") src = `${base}/${sub.pathName}/index.xml`;
          if (await checkSubtitleExists(src)) subtitle.push({ lang, codec: sub.codec, src });
        }
      }
    }
    try {
      const res = await fetch(videoUrl);
      if (res.ok) audioTracks = extractAudioTracks(await res.text());
    } catch {}
  }

  return { id: movie.id, title: movie.titleTh || movie.titleEn, video: videoUrl, subtitle, audioTracks };
}

// --- Series Parser ---
async function fetchSeriesById(showId) {
  const query = `
    query getShow($id: Int!) {
      show(id: $id) {
        id titleTh titleEn
        episodes {
          seasonNo episodeNo titleTh titleEn
          video { transcodeUuid cdnHostname subtitleMetadata }
        }
      }
    }
  `;
  const response = await fetch("https://api.doo-nang.com/graphql", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables: { id: showId } })
  });
  const result = await response.json();
  return result?.data?.show || null;
}

async function processEpisode(ep) {
  const transcodeUuid = ep.video?.transcodeUuid;
  const cdnHostname = ep.video?.cdnHostname;
  let videoUrl = "", subtitle = [], audioTracks = [];

  if (transcodeUuid && cdnHostname) {
    const base = `https://${cdnHostname}/${transcodeUuid}`;
    videoUrl = `https://api.doo-nang.com/video/${transcodeUuid}/playlist.m3u8`;

    if (ep.video?.subtitleMetadata) {
      for (const [lang, subs] of Object.entries(ep.video.subtitleMetadata)) {
        for (const sub of subs) {
          let src;
          if (sub.codec === "VTT") src = `${base}/${sub.pathName}.vtt`;
          else if (sub.codec === "BDN") src = `${base}/${sub.pathName}/index.xml`;
          if (await checkSubtitleExists(src)) subtitle.push({ lang, codec: sub.codec, src });
        }
      }
    }
    try {
      const res = await fetch(videoUrl);
      if (res.ok) audioTracks = extractAudioTracks(await res.text());
    } catch {}
  }

  return { season: ep.seasonNo, episode: ep.episodeNo, title: ep.titleTh || ep.titleEn || `EP${ep.episodeNo}`, video: videoUrl, subtitle, audioTracks };
}

// --- Subtitle Rendering ---
function renderSubtitleMenu(subtitles) {
  const video = document.getElementById("video");
  const subtitleSelector = document.getElementById("subtitleSelector");
  subtitleSelector.innerHTML = '<option value="none">No Subtitles</option>';

  subtitles.forEach(sub => {
    const opt = document.createElement("option");
    opt.value = sub.lang;
    opt.text = sub.lang.toUpperCase() + " (" + sub.codec + ")";
    subtitleSelector.appendChild(opt);

    if (sub.codec === "VTT") {
      const track = document.createElement("track");
      track.kind = "subtitles";
      track.label = sub.lang.toUpperCase();
      track.srclang = sub.lang;
      track.src = sub.src;
      video.appendChild(track);
    }
    if (sub.codec === "BDN") {
      loadBDNAsVTT(sub.src.replace("/index.xml",""), sub.lang);
    }
  });

  subtitleSelector.onchange = () => {
    const selected = subtitleSelector.value;
    Array.from(video.textTracks).forEach(track => track.mode = "disabled");
    if(selected === "none") return;
    const vttTrack = Array.from(video.textTracks).find(t => t.srclang === selected);
    if(vttTrack) vttTrack.mode = "showing";
  };
}

// --- Player Init ---
function initPlayer(videoURL) {
  const video = document.getElementById("video");
  const audioSelector = document.getElementById("audioSelector");
  const qualitySelector = document.getElementById("qualitySelector");

  if(Hls.isSupported()){
    const hls = new Hls();
    hls.attachMedia(video);
    hls.loadSource(videoURL);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      audioSelector.innerHTML = '';
      hls.audioTracks.forEach((track,i)=>{
        const opt=document.createElement("option");
        opt.value=i; opt.text=`${track.name||'Track'} (${track.lang||'und'})`;
        audioSelector.appendChild(opt);
      });
      audioSelector.onchange=()=>{ hls.audioTrack=parseInt(audioSelector.value); };

      qualitySelector.innerHTML='<option value="-1">Auto</option>';
      hls.levels.forEach((level,i)=>{
        const label=level.height?`${level.height}p`:`${Math.round(level.bitrate/1000)}kbps`;
        const opt=document.createElement("option");
        opt.value=i; opt.text=label;
        qualitySelector.appendChild(opt);
      });
      qualitySelector.onchange=()=>{ hls.currentLevel=parseInt(qualitySelector.value); };
    });
  } else if(video.canPlayType("application/vnd.apple.mpegurl")){
    video.src=videoURL;
  }
}

// --- Init Page ---
window.onload = async () => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const ids = params.get("ids");

  if(type==="movie" && ids){
    const movie = await fetchMovieById(parseInt(ids,10));
    if(movie){
      initPlayer(movie.video);
      renderSubtitleMenu(movie.subtitle);
      document.getElementById("videoTitle").innerText = movie.title;
    } else {
      document.getElementById("videoTitle").innerText = "ไม่พบข้อมูลหนัง";
    }
  } else if(type==="series" && ids){
    const show = await fetchSeriesById(parseInt(ids,10));
    if(show){
      document.title = `${show.titleTh} (${show.titleEn})`;
      const seasonSelect=document.getElementById("seasonSelect");
      const episodeSelect=document.getElementById("episodeSelect");
      const selectorBar=document.getElementById("selectorBar");
      selectorBar.style.display="flex";

      const seasonMap={};
      show.episodes.forEach(ep=>{
        if(!seasonMap[ep.seasonNo]) seasonMap[ep.seasonNo]=[];
        seasonMap[ep.seasonNo].push(ep);
      });

      Object.keys(seasonMap).forEach(seasonNo=>{
        const opt=document.createElement("option");
        opt.value=seasonNo; opt.text=`Season ${seasonNo}`;
        seasonSelect.appendChild(opt);
      });

      async function loadEpisodes(seasonNo){
        episodeSelect.innerHTML="";
        seasonMap[seasonNo].forEach(ep=>{
          const opt=document.createElement("option");
          opt.value=ep.episodeNo;
          opt.text=`Episode ${ep.episodeNo} - ${ep.titleTh||ep.titleEn}`;
          episodeSelect.appendChild(opt);
        });

        // โหลดตอนแรกของ season ที่เลือก
        const firstEp = seasonMap[seasonNo][0];
        const epData = await processEpisode(firstEp);
        initPlayer(epData.video);
        renderSubtitleMenu(epData.subtitle);
        document.getElementById("videoTitle").innerText = epData.title;
      }

      // เมื่อเปลี่ยน season
      seasonSelect.addEventListener("change", ()=>loadEpisodes(seasonSelect.value));

      // เมื่อเปลี่ยน episode
      episodeSelect.addEventListener("change", async ()=>{
        const seasonNo = seasonSelect.value;
        const episodeNo = episodeSelect.value;
        const ep = seasonMap[seasonNo].find(e => String(e.episodeNo) === episodeNo);
        if(ep){
          const epData = await processEpisode(ep);
          initPlayer(epData.video);
          renderSubtitleMenu(epData.subtitle);
          document.getElementById("videoTitle").innerText = epData.title;
        }
      });

      // โหลด season แรกโดยอัตโนมัติ
      const firstSeason = Object.keys(seasonMap)[0];
      seasonSelect.value = firstSeason;
      await loadEpisodes(firstSeason);

    } else {
      document.getElementById("videoTitle").innerText = "ไม่พบข้อมูลซีรีส์";
    }
  }
};
