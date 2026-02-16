// --- GraphQL Fetch ---
async function fetchMovieById(movieId) {
  const query = `
    query getMovie($id: Int!) {
      movie(id: $id) {
        id titleTh titleEn
        video { transcodeUuid cdnHostname subtitleMetadata }
      }
    }
  `;
  const res = await fetch("https://api.doo-nang.com/graphql", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ query, variables:{ id: movieId } })
  });
  const result = await res.json();
  const movie = result?.data?.movie;
  if(!movie) return null;

  return {
    id: movie.id,
    title: movie.titleTh || movie.titleEn,
    video: `https://api.doo-nang.com/video/${movie.video.transcodeUuid}/playlist.m3u8`,
    cdnHostname: movie.video.cdnHostname,
    subtitleMetadata: movie.video.subtitleMetadata
  };
}

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
  const res = await fetch("https://api.doo-nang.com/graphql", {
    method:"POST", headers:{ "Content-Type":"application/json" },
    body: JSON.stringify({ query, variables:{ id: showId } })
  });
  const result = await res.json();
  return result?.data?.show || null;
}

async function processEpisode(ep) {
  const transcodeUuid = ep.video?.transcodeUuid;
  const cdnHostname = ep.video?.cdnHostname;
  return {
    season: ep.seasonNo,
    episode: ep.episodeNo,
    title: ep.titleTh || ep.titleEn || `EP${ep.episodeNo}`,
    video: `https://api.doo-nang.com/video/${transcodeUuid}/playlist.m3u8`,
    cdnHostname,
    subtitleMetadata: ep.video?.subtitleMetadata
  };
}

// --- Subtitle Rendering ---
function renderSubtitleMenu(metadata, transcodeUuid, cdn) {
  const video = document.getElementById("video");
  const subtitleSelector = document.getElementById("subtitleSelector");
  subtitleSelector.innerHTML = '<option value="none">No Subtitles</option>';

  if(!metadata) return;

  for (const lang in metadata) {
    metadata[lang].forEach(entry => {
      if (!entry.error) {
        const opt = document.createElement("option");
        opt.value = lang;
        opt.text = lang.toUpperCase();
        subtitleSelector.appendChild(opt);

        let srcUrl;
        if(entry.pathName.startsWith("http")){
          // API ส่งมาเป็น URL เต็ม
          srcUrl = entry.pathName;
        } else {
          // ใช้ uuid + pathName เสมอ
          if(entry.codec === "VTT"){
            srcUrl = `https://${cdn}/${transcodeUuid}/${entry.pathName}.vtt`;
          } else if(entry.codec === "BDN"){
            srcUrl = `https://${cdn}/${transcodeUuid}/${entry.pathName}/index.xml`;
          }
        }

        if(entry.codec === "VTT"){
          const track = document.createElement("track");
          track.kind = "subtitles";
          track.label = lang.toUpperCase();
          track.srclang = lang;
          track.src = srcUrl;
          video.appendChild(track);
        }

        if(entry.codec === "BDN"){
          loadBDNAsVTT(srcUrl.replace("/index.xml",""), transcodeUuid, cdn);
        }
      }
    });
  }

  subtitleSelector.onchange = () => {
    const selected = subtitleSelector.value;
    Array.from(video.textTracks).forEach(track => track.mode = "disabled");
    if(selected === "none") return;
    const vttTrack = Array.from(video.textTracks).find(t => t.srclang === selected);
    if(vttTrack) vttTrack.mode = "showing";
  };
}

// --- Player Init ---
function initPlayer(videoURL, videoId, cdn) {
  const video = document.getElementById("video");
  const audioSelector = document.getElementById("audioSelector");
  const qualitySelector = document.getElementById("qualitySelector");

  if(Hls.isSupported()){
    const hls = new Hls();
    hls.attachMedia(video);
    hls.loadSource(videoURL);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      // Audio
      audioSelector.innerHTML = '';
      hls.audioTracks.forEach((track,i)=>{
        const opt=document.createElement("option");
        opt.value=i; opt.text=`${track.name||'Track'} (${track.lang||'und'})`;
        audioSelector.appendChild(opt);
      });
      audioSelector.onchange=()=>{ hls.audioTrack=parseInt(audioSelector.value); };

      // Quality
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

// --- Controls ---
document.getElementById("playPause").onclick=()=>{ const v=document.getElementById("video"); if(v.paused) v.play(); else v.pause(); };
document.getElementById("stop").onclick=()=>{ const v=document.getElementById("video"); v.pause(); v.currentTime=0; };
document.getElementById("mute").onclick=()=>{ const v=document.getElementById("video"); v.muted=!v.muted; };
document.getElementById("fullscreen").onclick=()=>{ const v=document.getElementById("video"); if(v.requestFullscreen) v.requestFullscreen(); };

// --- Init Page ---
window.onload = async () => {
  const params = new URLSearchParams(window.location.search);
  const type = params.get("type");
  const ids = params.get("ids");

  if(type==="movie" && ids){
    const movie = await fetchMovieById(parseInt(ids,10));
    if(movie){
      initPlayer(movie.video, movie.id, movie.cdnHostname);
      renderSubtitleMenu(movie.subtitleMetadata, movie.id, movie.cdnHostname);
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
        const firstEp = seasonMap[seasonNo][0];
        const epData = await processEpisode(firstEp);
        initPlayer(epData.video, epData.episode, epData.cdnHostname);
        renderSubtitleMenu(epData.subtitleMetadata, epData.episode, epData.cdnHostname);
        document.getElementById("videoTitle").innerText = epData.title;
      }

      seasonSelect.addEventListener("change", ()=>loadEpisodes(seasonSelect.value));
      episodeSelect.addEventListener("change", async ()=>{
        const seasonNo = seasonSelect.value;
        const episodeNo = episodeSelect.value;
        const ep = seasonMap[seasonNo].find(e => String(e.episodeNo) === episodeNo);
        if(ep){
          const epData = await processEpisode(ep);
          initPlayer(epData.video, epData.episode, epData.cdnHostname);
          renderSubtitleMenu(epData.subtitleMetadata, epData.episode, epData.cdnHostname);
          document.getElementById("videoTitle").innerText = epData.title;
        }
      });

      const firstSeason = Object.keys(seasonMap)[0];
      seasonSelect.value = firstSeason;
      await loadEpisodes(firstSeason);
    } else {
      document.getElementById("videoTitle").innerText = "ไม่พบข้อมูลซีรีส์";
    }
  }
};
