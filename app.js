/* RecoLens 7.0 — taste → blind lists → reveal.
 * DOM-only UI. No analytics, user survey, account, or recommendation API.
 * Film metadata is an independent, optional presentation layer.
 */
(() => {
  'use strict';
  const DATA = window.RECOLENS_DATA;
  const Info = window.MovieInfo;
  const Engine = window.RecoEngine;
  const root = document.getElementById('app');
  if (!DATA || !Info || !Engine) {
    root.innerHTML = '<section class="error-state"><h1>필수 파일을 읽지 못했어요.</h1><p>index.html과 data.js, metadata.js, engine.js가 같은 폴더에 있는지 확인해 주세요.</p><button class="primary" onclick="location.reload()">다시 열기</button></section>';
    return;
  }
  const M = DATA.movies;
  const GENRE = {Action:'액션',Adventure:'모험',Animation:'애니메이션',Children:'가족',Comedy:'코미디',Crime:'범죄',Documentary:'다큐멘터리',Drama:'드라마',Fantasy:'판타지',Horror:'공포',Mystery:'미스터리',Romance:'로맨스','Sci-Fi':'SF',Thriller:'스릴러',War:'전쟁',Western:'서부',Musical:'뮤지컬','Film-Noir':'누아르',IMAX:'IMAX'};
  const METHODS = {
    popularity: {
      name:'인기 중심 추천', short:'인기 중심', tagline:'많은 사람이 평가한 영화부터.',
      description:'내 취향보다, 많은 사람이 평가하고 높은 점수를 준 영화를 먼저 보여줬어요.',
      steps:[['전체 평가 확인','영화별 평가 수와 평균 평점'],['인기 점수 계산','평가 수 70% + 평점 30%'],['상위 6편 선택','이미 고른 5편은 제외']],
      bias:'유명한 영화에 추천이 몰리고, 덜 알려진 작품은 뒤로 밀릴 수 있어요. 이 체험에서 말하는 인기도 편향이에요.',
      formula:'0.7 × 정규화(log(1 + 평가 수)) + 0.3 × 정규화(평균 평점)',
      technical:'데이터 생성 단계에서 계산한 popScore를 내림차순으로 정렬해요. 동점은 평가 수, 영화 인덱스 순으로 결정해요. 현재 선택한 영화는 제외하지만, 개인 취향 자체는 인기 점수에 반영하지 않아요.'
    },
    content: {
      name:'취향을 닮은 추천', short:'취향 유사', tagline:'좋아한 영화와 닮은 영화부터.',
      description:'좋아한 특징은 더하고, 낮게 평가한 특징은 줄여 취향과 가까운 영화를 찾았어요.',
      steps:[['취향 특징 만들기','영화 점수 × 장르·태그·연대'],['닮은 정도 계산','후보 영화와 코사인 유사도'],['상위 6편 선택','관련성이 높은 영화부터']],
      bias:'좋아한 장르가 계속 반복될 수 있어요. 취향에 잘 맞는 추천과 새로운 선택지를 보여주는 추천은 항상 같지 않아요.',
      formula:'0.96 × 정규화(취향 벡터와 영화 벡터의 유사도) + 0.04 × 인기 점수',
      technical:'장르·TF-IDF 태그·개봉 연대의 희소 벡터를 사용해요. 각 영화의 특징에 (점수−3)을 곱해 합친 뒤 길이를 1로 맞춰요. 1~2점은 유사 특징을 줄이고, 4~5점은 높이며, 3점은 방향을 주지 않아요. 각 영화와의 코사인 유사도를 후보 전체에서 0~1로 정규화하고, 인기 점수 4%로 보완해요. 태그가 적은 영화는 표현 정보도 적을 수 있어요.'
    },
    collaborative: {
      name:'함께 좋아한 추천', short:'함께 선호', tagline:'평가 패턴이 연결된 영화부터.',
      description:'다른 이용자들이 고른 영화들과 비슷하게 평가했던 영화를 찾아 보여줬어요.',
      steps:[['영화 간 관계 확인','과거 이용자의 평점 패턴'],['취향과의 연결 합산','고른 5편과의 유사도 증거'],['상위 6편 선택','내용·인기 점수로 일부 보완']],
      bias:'과거 이용자들의 평가 자체가 인기 영화에 집중되어 있다면, 그 편중도 따라갈 수 있어요. 평가가 부족한 영화는 연결을 찾기 어려워요.',
      formula:'0.84 × 정규화(평점 패턴 연결 점수) + 0.12 × 콘텐츠 점수 + 0.04 × 인기 점수',
      technical:'사용자 평균을 뺀 평점 패턴으로 계산한 영화 간 유사도를 사용해요. 공통 평가자가 적으면 n/(n+20)으로 유사도를 줄이고 영화별 상위 64개 이웃을 저장했어요. 각 양의 유사도에 (내 점수−3)을 곱해 합산하고, 모든 입력의 |점수−3| 합으로 나눠요. 낮은 점수와 높은 점수가 서로 반대로 작용해요. 후보마다 다른 분모로 나누지 않아, 모든 입력이 좋아요여도 연결 강도가 보존돼요. 현재 이용자와 비슷한 사람을 직접 검색하는 사용자 기반 방식이 아니라 아이템 기반 협업 필터링이에요.'
    },
    biasAware: {
      name:'다양성도 챙긴 추천', short:'다양성 보완', tagline:'취향은 유지하고, 선택지는 넓게.',
      description:'취향에 맞는 후보 안에서 서로 덜 닮은 영화와 덜 알려진 작품도 고려해 순서를 바꿨어요.',
      steps:[['관련 후보 90편 추리기','콘텐츠·협업 점수를 절반씩'],['중복·인기 편중 고려','다양성·신규성·장르 분포'],['한 편씩 다시 정렬','기존 목록과 비교하며 6편']],
      bias:'편향을 완전히 없애는 알고리즘은 아니에요. 다양성을 고려한 만큼 취향과의 유사성이 낮아질 수 있고, 모든 지표가 반드시 좋아지는 것도 아니에요.',
      formula:'0.67 × 관련성 + 0.33 × (0.5 × 다양성 + 0.3 × 신규성 + 0.2 × 장르 교정도)',
      technical:'관련성은 정규화한 콘텐츠 점수와 협업 점수의 평균이에요. 상위 후보 90편에서, 이미 뽑은 영화와의 최대 코사인 유사도가 낮을수록 다양성을 높게 줘요. 신규성은 1-인기도 백분위, 장르 교정도는 1-Jensen–Shannon 발산으로 계산해요. 이미 뽑은 목록이 달라지면 다음 영화의 점수도 달라져요. MMR 원리를 응용한 자체 재순위화이며 가중치는 검증 실험으로 입증한 최적값이 아니에요.'
    }
  };
  const KEYS = Object.keys(METHODS);
  const REQUIRED = 5;
  const PAGE_SIZE = 6;
  const STORE = 'recolens-v7-session';
  const byId = new Map(M.map((m,i) => [m.id,i]));
  const starterIds = [79132,134853,109487,152081,58559,4896,2571,6377,356,60069,72998,106696,318,1,1721,68954,1682,115617,89745,5618,480,364,4886,8961,50872,134130,109374];
  const starterIndices = starterIds.map(id => byId.get(id)).filter(Number.isInteger);
  const starterSet = new Set(starterIndices);
  const filmOrder = [...starterIndices,...DATA.onboarding.filter(i => !starterSet.has(i)),...DATA.popularOrder];
  const order = [...new Set(filmOrder)].filter(i => M[i]);
  // Keep browsing finite; the separate search still covers every candidate.
  const browseOrder = order.slice(0,48);
  const normalize = text => String(text).normalize('NFKC').toLowerCase().replace(/\s/g,'');
  const title = i => Info.get(i).title || Info.cleanTitle(M[i].title);
  const genreNames = i => M[i].genres.filter(g=>g!=='IMAX').map(g=>GENRE[g]||g);
  const searchKeys = M.map((m,i) => normalize(`${title(i)} ${m.title} ${m.year}`));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const svg = name => {
    const paths = {
      arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>',check:'<path d="m5 12 4 4L19 6"/>',
      search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
      external:'<path d="M14 4h6v6m0-6-10 10"/><path d="M10 4H5a1 1 0 0 0-1 1v14a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5"/>',
      close:'<path d="m6 6 12 12M18 6 6 18"/>',lens:'<circle cx="9" cy="12" r="6.5"/><circle cx="15" cy="12" r="6.5"/>',
      film:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M9 3v18M15 3v18M4 8h5m-5 8h5m6-8h5m-5 8h5"/>',
      heart:'<path d="M20 5c-3-3-6-1-8 1-2-2-5-4-8-1s-1 6 1 8l7 7 7-7c2-2 4-5 1-8Z"/>',
      reset:'<path d="M4 4v6h6M4.5 9a8 8 0 1 1 .4 7"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',spark:'<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5Z"/>'
    };
    return `<svg viewBox="0 0 24 24" aria-hidden="true">${paths[name]||paths.arrow}</svg>`;
  };
  function shuffle(items) {
    const out=[...items];
    for(let i=out.length-1;i>0;i--){
      let random;
      if(window.crypto?.getRandomValues){const v=new Uint32Array(1);crypto.getRandomValues(v);random=v[0]/4294967296;}else random=Math.random();
      const j=Math.floor(random*(i+1));[out[i],out[j]]=[out[j],out[i]];
    }
    return out;
  }
  const state = {
    stage:'home', likes:new Set(), ratings:{}, listRatings:{}, adaptive:null,
    page:0, blind:shuffle(KEYS), active:0, seen:new Set(),
    chosen:null, results:null, busy:false, dialog:null, dialogStack:[],
    search:{q:'',genre:'',page:0}, resume:'pick'
  };
  const validRating = n => Number.isInteger(n) && n >= 1 && n <= 5;
  const movieInput = () => Object.fromEntries([...state.likes].map(i=>[i,state.ratings[i]]));
  const inputSignature = () => [...state.likes].sort((a,b)=>a-b).map(i=>`${M[i].id}:${state.ratings[i]}`).join('|');
  const ratingCount = () => KEYS.filter(k=>validRating(state.listRatings[k])).length;
  let storageAvailable = true;
  try {
    const saved=JSON.parse(localStorage.getItem(STORE)||'null');
    if(saved?.version===7 && Array.isArray(saved.movies)){
      for(const row of saved.movies.slice(0,REQUIRED)){
        const index=byId.get(row?.id);
        if(Number.isInteger(index)&&validRating(row.rating)){state.likes.add(index);state.ratings[index]=row.rating;}
      }
      if(Array.isArray(saved.blind)&&saved.blind.length===4&&new Set(saved.blind).size===4&&saved.blind.every(k=>KEYS.includes(k)))state.blind=saved.blind;
      if(state.likes.size===REQUIRED&&saved.signature===inputSignature()){
        for(const key of KEYS)if(validRating(saved.listRatings?.[key]))state.listRatings[key]=saved.listRatings[key];
        state.active=Number.isInteger(saved.active)&&saved.active>=0&&saved.active<4?saved.active:0;
        state.seen=new Set((Array.isArray(saved.seen)?saved.seen:[]).filter(n=>Number.isInteger(n)&&n>=0&&n<4));
        if(ratingCount()===4&&KEYS.includes(saved.chosen)&&state.listRatings[saved.chosen]===Math.max(...KEYS.map(k=>state.listRatings[k])))state.chosen=saved.chosen;
        state.resume=['pick','compare','result','personal'].includes(saved.resume)?saved.resume:'pick';
      }
      state.page=Number.isInteger(saved.page)?Math.max(0,Math.min(7,saved.page)):0;
    }
    const probe=STORE+'-check';localStorage.setItem(probe,'1');localStorage.removeItem(probe);
  }catch{storageAvailable=false;}
  function save(){
    if(state.stage!=='home')state.resume=state.stage;
    try{
      localStorage.setItem(STORE,JSON.stringify({version:7,
        movies:[...state.likes].map(i=>({id:M[i].id,rating:state.ratings[i]})),
        signature:inputSignature(),listRatings:state.listRatings,blind:state.blind,
        active:state.active,seen:[...state.seen],chosen:state.chosen,page:state.page,resume:state.resume}));
    }catch{storageAvailable=false;}
  }
  function toast(message){const t=document.getElementById('toast');t.textContent=message;t.classList.add('visible');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('visible'),2600);}
  function announce(message){document.getElementById('announcer').textContent=message;}
  const dialog=document.getElementById('dialog');
  const dialogBody=document.getElementById('dialogBody');
  let dialogOrigin=null;
  let dialogOriginAction=null;
  let dialogHistory=false;
  let suppressModalPop=false;
  let observer=null;
  const posterFailed = new Map();
  const requestedMetadata = new Set();
  const mediaTimers = new Map();
  const panelCache = new Map();
  function mediaNote(){
    return `<p class="media-note" hidden><span>일부 포스터를 불러오지 못했어요. 영화 정보는 네이버에서도 볼 수 있어요.</span><button class="text-button" data-action="retry-media">다시 연결</button></p>`;
  }
  function updateMediaNote(){
    const failed=root.querySelector('.poster.unavailable');
    root.querySelectorAll('.media-note').forEach(el=>{el.hidden=!failed;});
  }
  function setPosterState(box,value){
    box.classList.toggle('loaded',value==='ready');
    box.classList.toggle('unavailable',['unavailable','offline'].includes(value));
    box.dataset.mediaState=value;
    const label=box.querySelector('.poster-state');
    if(label)label.textContent=({loading:'포스터 불러오는 중',ready:'',unavailable:'이미지 미연결',offline:'오프라인 카드'})[value];
    updateMediaNote();
  }
  function clearMediaTimer(box){const timer=mediaTimers.get(box);if(timer)clearTimeout(timer);mediaTimers.delete(box);}
  function poster(i,extra=''){
    const name=title(i),original=Info.cleanTitle(M[i].title);
    return `<div class="poster ${extra}" data-poster="${i}" data-tone="${i%6}" data-media-state="loading"><div class="poster-fallback"><span class="poster-meta"><span class="poster-year">${M[i].year||'MOVIE'}</span><svg class="sleeve-mark" viewBox="0 0 40 24" aria-hidden="true"><circle cx="14" cy="12" r="9"/><circle cx="26" cy="12" r="9"/></svg></span><div><span class="fallback-type">TITLE CARD</span><div class="fallback-name">${esc(name)}</div>${name!==original?`<span class="fallback-original">${esc(original)}</span>`:''}<div class="fallback-genre">${esc(genreNames(i).slice(0,2).join(' · '))}</div><div class="poster-state">포스터 연결 중</div></div></div></div>`;
  }
  function hydratePoster(box){
    const i=Number(box.dataset.poster);if(!M[i]||!box.isConnected)return;
    if(!Info.isOnline()||navigator.onLine===false){
      clearMediaTimer(box);const img=box.querySelector('img');if(img){img.onload=null;img.onerror=null;img.removeAttribute('src');img.remove();}
      delete box.dataset.source;setPosterState(box,'offline');return;
    }
    const p=Info.poster(i);
    if(p&&!posterFailed.get(i)?.has(p)){
      if(box.dataset.source===p)return;
      clearMediaTimer(box);box.querySelector('img')?.remove();
      const img=new Image();img.alt=`${title(i)} 포스터`;img.decoding='async';img.referrerPolicy='no-referrer';
      img.width=240;img.height=360;box.dataset.source=p;setPosterState(box,'loading');
      const fail=()=>{
        clearMediaTimer(box);if(box.dataset.source!==p)return;
        if(!posterFailed.has(i))posterFailed.set(i,new Set());posterFailed.get(i).add(p);
        img.onload=null;img.onerror=null;img.removeAttribute('src');img.remove();delete box.dataset.source;
        setPosterState(box,'unavailable');requestMetadata(i);
      };
      img.onload=()=>{clearMediaTimer(box);if(img.naturalWidth&&Info.isOnline()&&box.isConnected)setPosterState(box,'ready');else fail();};
      img.onerror=fail;box.appendChild(img);
      mediaTimers.set(box,setTimeout(fail,6500));img.src=p;
      if(img.complete&&img.naturalWidth){clearMediaTimer(box);setPosterState(box,'ready');}
    }else{
      const failed=Info.get(i).loadFailed||posterFailed.has(i);
      setPosterState(box,failed?'unavailable':'loading');
      if(!failed&&!mediaTimers.has(box))mediaTimers.set(box,setTimeout(()=>{mediaTimers.delete(box);if(box.isConnected&&!box.classList.contains('loaded'))setPosterState(box,'unavailable');},9000));
      if(!Info.get(i).imdb)requestMetadata(i);
    }
  }
  function requestMetadata(i,force=false){
    if((requestedMetadata.has(i)&&!force)||!Info.isOnline()||navigator.onLine===false)return;
    requestedMetadata.add(i);
    const task=force?Info.retry(i):Info.load(i);
    void task.then(()=>{
      document.querySelectorAll(`[data-poster="${i}"]`).forEach(hydratePoster);
      if(state.dialog?.kind==='film'&&state.dialog.index===i)updateFilmDetails(i);
    }).catch(()=>{document.querySelectorAll(`[data-poster="${i}"]`).forEach(box=>setPosterState(box,'unavailable'));});
  }
  function hydrate(scope=root){
    if(!observer&&'IntersectionObserver'in window)observer=new IntersectionObserver(entries=>{
      for(const entry of entries)if(entry.isIntersecting){hydratePoster(entry.target);observer.unobserve(entry.target);}
    },{rootMargin:'120px'});
    for(const box of scope.querySelectorAll('[data-poster]')){
      if(box.classList.contains('loaded'))continue;
      if(observer)observer.observe(box);else hydratePoster(box);
    }
    updateMediaNote();
  }
  function releaseDetachedMedia(){
    for(const [box,timer]of mediaTimers){if(!box.isConnected){clearTimeout(timer);mediaTimers.delete(box);const img=box.querySelector('img');if(img){img.onload=null;img.onerror=null;img.removeAttribute('src');img.remove();}delete box.dataset.source;}}
  }
  function retryMedia(){
    if(navigator.onLine===false){toast('기기가 오프라인이에요. 네트워크 연결 후 다시 눌러주세요.');return;}
    if(!Info.isOnline()){Info.setOnline(true);}
    posterFailed.clear();requestedMetadata.clear();
    const boxes=[...document.querySelectorAll('[data-poster]')].filter(b=>!b.classList.contains('loaded'));
    const ids=new Set(boxes.map(b=>Number(b.dataset.poster)));
    for(const box of boxes){delete box.dataset.source;clearMediaTimer(box);hydratePoster(box);}
    for(const i of ids)requestMetadata(i,true);
    toast('현재 화면의 포스터를 다시 연결하고 있어요.');
  }
  const RATING_WORDS = {1:'많이 아쉬워요',2:'별로예요',3:'보통이에요',4:'좋아요',5:'아주 좋아요'};
  function ratingControl(kind,subject,value){
    const rated=validRating(value),v=rated?value:3,id=kind==='movie'?'movieRange':'listRange';
    return `<div class="rating-control ${rated?'has-rating':''}" data-rating-control="${kind}"><div class="rating-heading"><label for="${id}">${kind==='movie'?'이 영화를 얼마나 좋아하나요?':'이 목록, 얼마나 마음에 드나요?'}</label><output class="rating-output" for="${id}"><b>${rated?v:'—'}</b><span> / 5</span></output></div><input class="rating-range" id="${id}" type="range" min="1" max="5" step="1" value="${v}" data-rating-kind="${kind}" data-subject="${subject}" aria-valuetext="${rated?v+'점, '+RATING_WORDS[v]:'아직 평가하지 않음. 점수를 골라 주세요.'}" style="--fill:${rated?(v-1)*25:0}%"><div class="rating-ticks" aria-label="점수를 눌러 선택할 수도 있어요">${[1,2,3,4,5].map(n=>`<button type="button" data-action="rating-step" data-kind="${kind}" data-value="${n}" aria-label="${n}점 ${RATING_WORDS[n]}">${n}</button>`).join('')}</div><p class="rating-description">${rated?RATING_WORDS[v]:'드래그하거나 숫자를 눌러 평가해 주세요'}</p></div>`;
  }
  function listRatingControl(){const key=state.blind[state.active];return ratingControl('list',key,state.listRatings[key]);}
  function paintRating(input,value){
    const box=input.closest('.rating-control');if(!box||!validRating(value))return;
    input.value=value;input.style.setProperty('--fill',`${(value-1)*25}%`);
    input.setAttribute('aria-valuetext',`${value}점, ${RATING_WORDS[value]}`);
    box.classList.add('has-rating');box.querySelector('.rating-output b').textContent=value;
    box.querySelector('.rating-description').textContent=RATING_WORDS[value];
    if(input.dataset.ratingKind==='movie'){
      if(state.dialog?.kind==='rate')state.dialog.draft=value;
      const b=document.getElementById('saveMovieRating');if(b)b.innerHTML=`${value}점으로 저장 ${svg('check')}`;
    }
  }
  function handleRating(input){
    const value=Number(input.value);if(!validRating(value))return;
    paintRating(input,value);
    if(input.dataset.ratingKind!=='list')return;
    const key=input.dataset.subject;
    if(state.stage!=='compare'||!KEYS.includes(key)||!state.results)return;
    if(state.listRatings[key]===value)return;
    state.listRatings[key]=value;state.adaptive=null;state.chosen=null;save();
    // Never replace the slider during an input event: dragging and focus survive.
    refreshCompareControls();
  }
  function rateFilm(i,replaceIndex=null){
    if(!M[i]||state.busy)return;
    if(state.likes.size>=REQUIRED&&!state.likes.has(i)&&!Number.isInteger(replaceIndex)){replaceSelection(i);return;}
    const value=validRating(state.ratings[i])?state.ratings[i]:3;
    showDialog('rate','영화에 점수 주기',`<div class="rate-film-heading"><div class="rate-film-poster">${poster(i)}</div><div><p class="kicker">${M[i].year}</p><h3>${esc(title(i))}</h3><button class="text-button" data-action="film" data-index="${i}">영화 정보 ${svg('right')}</button></div></div>${ratingControl('movie',i,value)}<button class="primary wide rate-save" data-action="save-rating" id="saveMovieRating">${value}점으로 저장 ${svg('check')}</button><p class="rate-note">저장을 눌러야 영화 점수가 반영돼요.</p>${state.likes.has(i)?`<button class="text-button wide" data-action="clear-rating" data-index="${i}">이 영화 평가 지우기</button>`:''}`,{index:i,draft:value,replaceIndex,push:state.dialog?.kind!=='rate'});
  }
  function syncPickControls(){
    document.querySelectorAll('[data-card]').forEach(card=>{
      const i=Number(card.dataset.card),b=card.querySelector('[data-action="rate-film"]');if(!b)return;
      const rated=state.likes.has(i);card.classList.toggle('selected',rated);
      b.setAttribute('aria-label',`${title(i)}, ${M[i].year}, ${rated?state.ratings[i]+'점 평가 수정':'1~5점으로 평가하기'}`);
      const badge=card.querySelector('.film-rating-badge');if(badge){badge.textContent=rated?state.ratings[i]+'점':'+';badge.classList.toggle('rated',rated);}
    });
    const cp=document.getElementById('countPill');if(cp)cp.innerHTML=countPill();
    const cc=document.getElementById('chosenControl');if(cc){cc.innerHTML=chosenControl();hydrate(cc);}
    const next=document.getElementById('recommendButton');if(next){next.disabled=state.likes.size!==REQUIRED;next.innerHTML='네 가지 추천 보기'+svg('arrow');}
    const sc=document.getElementById('searchSelectionCount');if(sc)sc.textContent=`${state.likes.size} / 5편 평가`;
    const done=document.getElementById('searchDone');if(done)done.textContent=state.likes.size===5?'추천 목록 보러 가기':'평가 화면으로 돌아가기';
  }
  function saveMovieRating(){
    if(state.dialog?.kind!=='rate')return;
    const {index,draft,replaceIndex}=state.dialog;
    if(!validRating(draft)||!M[index])return;
    if(state.likes.size>=REQUIRED&&!state.likes.has(index)&&!state.likes.has(replaceIndex))return;
    const unchanged=state.likes.has(index)&&state.ratings[index]===draft;
    if(!unchanged){
      if(Number.isInteger(replaceIndex)&&replaceIndex!==index){state.likes.delete(replaceIndex);delete state.ratings[replaceIndex];}
      state.likes.add(index);state.ratings[index]=draft;invalidate();save();syncPickControls();
    }
    // Return to the search/selection sheet, rather than accumulating modal history.
    if(state.dialogStack.at(-1)?.kind==='replace')state.dialogStack.pop();
    goDialogBack();syncPickControls();
    announce(`${title(index)} ${draft}점, ${state.likes.size}편 평가 완료`);
  }

  function movieCard(i,mode='pick'){
    const selecting=mode==='pick',rated=state.likes.has(i),name=title(i);
    return `<article class="movie-card ${selecting&&rated?'selected':''}" data-card="${i}"><div class="poster-area"><button class="movie-main" data-action="${selecting?'rate-film':'film'}" data-index="${i}" aria-haspopup="dialog" aria-label="${esc(name)}, ${M[i].year}, ${selecting?(rated?state.ratings[i]+'점 평가 수정':'1~5점으로 평가하기'):'영화 정보 보기'}">${poster(i)}${selecting?`<span class="film-rating-badge ${rated?'rated':''}">${rated?state.ratings[i]+'점':'+'}</span>`:''}</button>${selecting?`<button class="movie-info" data-action="film" data-index="${i}" aria-label="${esc(name)} 줄거리와 출연진 보기">${svg('info')}</button>`:''}<a class="poster-search" href="${esc(Info.naver(i))}" target="_blank" rel="noopener noreferrer" aria-label="${esc(name)} 네이버 검색, 새 창">네이버 ${svg('external')}</a></div><div class="movie-caption"><span class="movie-name" title="${esc(name)}">${esc(name)}</span><span class="movie-year">${M[i].year||''}</span></div></article>`;
  }
  function heroCards(indices,variant=''){
    const showing=indices.filter(Number.isInteger).slice(0,variant?3:5);
    return `<div class="${variant==='result'?'result-art':'hero-art'}" aria-label="${variant?'내가 선택한 목록의 영화':'취향 선택에 사용할 영화'}">${showing.map((i,n)=>`<div class="hero-card ${variant?['left','center','right'][n]:'hero-slot-'+n}">${poster(i)}<div class="hero-caption">${esc(title(i))}</div></div>`).join('')}${variant?`<button class="floating-label" data-action="chosen-list">내가 고른 6편 보기 ${svg('right')}</button>`:''}</div>`;
  }
  function home(){
    const resumeText=['result','personal'].includes(state.resume)&&state.chosen?'내 결과 이어보기':state.resume==='compare'&&state.likes.size===5?'목록 평가 이어하기':'영화 평가 이어하기';
    return `<section class="home fade-in"><div class="hero"><div class="hero-copy"><div class="kicker">점수로 알아보는 추천 알고리즘</div><h1>취향에 점수를.<br><em>추천에 변화를.</em></h1><p>영화 5편과 추천 목록에 점수를 주세요.<br>내 평가가 추천을 바꾸는 과정을 확인해요.</p><button class="primary" data-action="start">${state.likes.size?resumeText:'내 추천 시작하기'}${svg('arrow')}</button><p class="hero-note">로그인 없이 · 점수는 내 기기에만</p>${state.likes.size?'<button class="text-button restart-home" data-action="reset-confirm">새로 시작하기</button>':''}</div>${heroCards([byId.get(60069),byId.get(79132),byId.get(134853),byId.get(109487),byId.get(1)])}</div><div class="home-flow"><div class="flow-step"><span>1</span><b>영화 5편 평가</b></div>${svg('right').replace('<svg','<svg class="flow-arrow"')}<div class="flow-step"><span>2</span><b>추천 목록 평가</b></div>${svg('right').replace('<svg','<svg class="flow-arrow"')}<div class="flow-step"><span>3</span><b>내 점수로 다시 추천</b></div></div></section>`;
  }
  function countPill(){return `<span class="empty-slots" aria-hidden="true">${Array.from({length:5},(_,i)=>`<i class="${i<state.likes.size?'on':''}"></i>`).join('')}</span><span>${state.likes.size} / 5</span>`;}
  function chosenControl(){return `<button class="selected-control" data-action="selected" aria-label="평가한 영화 ${state.likes.size}편 확인 및 수정"><span class="mini-faces" aria-hidden="true">${[...state.likes].slice(-3).map(i=>`<span class="mini-face">${poster(i)}</span>`).join('')}</span><span class="dock-copy">${state.likes.size===5?'5편 평가 완료':`${5-state.likes.size}편 더 평가해 주세요`}<small>영화 점수 확인 · 수정</small></span></button>`;}
  function pick(){
    const pages=Math.ceil(browseOrder.length/PAGE_SIZE);state.page=Math.min(pages-1,Math.max(0,state.page));
    return `<section class="pick-page fade-in"><div class="page-heading"><div><div class="kicker">STEP 01 · 영화 평가</div><h1>알고 있는 영화<br class="mobile-only"> 5편에 점수를 주세요.</h1><p>영화를 누르고 1~5점으로 드래그해 주세요.</p></div><div class="count-pill" id="countPill">${countPill()}</div></div><div class="pick-toolbar"><div class="browse-nav" aria-label="영화 둘러보기"><button data-action="pick-prev" class="browse-arrow" aria-label="이전 영화 6편" ${state.page===0?'disabled':''}>${svg('left')}</button><span class="page-number">${state.page+1} / ${pages}</span><button data-action="pick-next" class="browse-arrow" aria-label="다른 영화 6편" ${state.page>=pages-1?'disabled':''}>${svg('right')}</button></div><button class="search-trigger" data-action="search">${svg('search')}영화 찾기</button></div><div class="movie-grid" id="pickGrid">${browseOrder.slice(state.page*PAGE_SIZE,(state.page+1)*PAGE_SIZE).map(i=>movieCard(i)).join('')}</div><div class="action-dock" id="pickDock"><div id="chosenControl">${chosenControl()}</div><div class="dock-buttons"><button class="primary" data-action="recommend" id="recommendButton" ${state.likes.size!==REQUIRED?'disabled':''}>${state.results&&state.chosen?'결과 다시 보기':'네 가지 추천 보기'}${svg('arrow')}</button></div></div>${mediaNote()}</section>`;
  }
  function tabLabel(n){return String.fromCharCode(65+n);}
  function blindTabs(){
    return `<div class="blind-tabs" style="--active:${state.active}" role="tablist" aria-label="블라인드 추천 목록">${state.blind.map((key,n)=>`<button class="blind-tab" id="blindTab${n}" role="tab" aria-controls="blindPanel" aria-selected="${state.active===n}" tabindex="${state.active===n?0:-1}" data-action="tab" data-tab="${n}"><span>목록 ${tabLabel(n)}</span><span class="tab-marker score-marker">${validRating(state.listRatings[key])?state.listRatings[key]+'점':'—'}</span></button>`).join('')}</div>`;
  }
  function compareDock(){
    const complete=ratingCount()===4,current=validRating(state.listRatings[state.blind[state.active]]);
    return `<div class="dock-copy">${ratingCount()} / 4개 평가<small>평가 중에는 목록이 바뀌지 않아요</small></div><button class="primary" data-action="${complete?'choose-list':'next-list'}" ${!complete&&!current?'disabled':''}>${complete?'내 평가 결과 보기':'다음 목록'}${svg('arrow')}</button>`;
  }
  function compare(){
    return `<section class="compare-page fade-in"><div class="page-heading"><div class="kicker">STEP 02 · 추천 평가</div><h1>이 추천은<br class="mobile-only"> 얼마나 마음에 드나요?</h1><p>목록마다 점수 하나. 마지막 추천에 반영돼요.</p></div><div id="blindTabsWrap">${blindTabs()}</div><div class="blind-label"><h2><span class="number-tag" id="activeLetter">${tabLabel(state.active)}</span>추천 영화 6편</h2><small>영화를 누르면 자세히</small></div><div id="blindPanel" role="tabpanel" aria-labelledby="blindTab${state.active}"></div><div id="listRatingControl">${listRatingControl()}</div><div class="action-dock" id="compareDock">${compareDock()}</div><div class="compare-bottom"><button class="text-button" data-action="edit">${svg('left')}영화 점수 수정</button><span>${state.results.neutralOnly?'영화가 모두 3점 · 취향 방향은 아직 중립이에요':'내 점수는 기기 안에서만 처리해요'}</span></div>${mediaNote()}</section>`;
  }
  function attachPanel(){
    const host=document.getElementById('blindPanel');if(!host)return;
    const key=state.blind[state.active];
    let panel=panelCache.get(key);
    if(!panel){panel=document.createElement('div');panel.className='movie-grid';panel.innerHTML=state.results.lists[key].map(i=>movieCard(i,'view')).join('');panelCache.set(key,panel);}
    host.replaceChildren(panel);host.setAttribute('aria-labelledby','blindTab'+state.active);hydrate(panel);
  }
  function refreshCompareControls(){
    const tabs=document.getElementById('blindTabsWrap');if(!tabs)return;
    tabs.querySelector('.blind-tabs').style.setProperty('--active',state.active);
    for(let n=0;n<4;n++){
      const tab=document.getElementById('blindTab'+n),key=state.blind[n];
      tab.setAttribute('aria-selected',String(n===state.active));tab.tabIndex=n===state.active?0:-1;
      const mark=tab.querySelector('.tab-marker');mark.textContent=validRating(state.listRatings[key])?state.listRatings[key]+'점':'—';
    }
    document.getElementById('activeLetter').textContent=tabLabel(state.active);
    document.getElementById('compareDock').innerHTML=compareDock();
  }
  function facts(key){
    const lists=state.results.lists,list=lists[key];const other=new Set(KEYS.filter(k=>k!==key).flatMap(k=>lists[k]));
    const frequency=new Map();for(const k of KEYS)for(const i of lists[k])frequency.set(i,(frequency.get(i)||0)+1);
    return {head:list.filter(i=>M[i].head).length,unique:list.filter(i=>!other.has(i)).length,all:frequency.size,common:[...frequency.values()].filter(n=>n===4).length,frequency};
  }
  function contrast(key=state.chosen){
    // Fixed comparator, not a cherry-picked maximum: popular vs chosen; content vs popular.
    const reference=key==='popularity'?'content':'popularity';
    const chosen=state.results.lists[key],other=state.results.lists[reference];
    const a=new Set(chosen),b=new Set(other);
    const onlyChosen=chosen.filter(i=>!b.has(i)),onlyOther=other.filter(i=>!a.has(i));
    return {reference,shared:chosen.filter(i=>b.has(i)),onlyChosen,onlyOther,changed:onlyChosen.length};
  }
  function result(){
    const key=state.chosen,method=METHODS[key],f=facts(key),c=contrast(),letter=tabLabel(state.blind.indexOf(key));
    const methodDescription=state.results.neutralOnly&&key!=='popularity'?'영화가 모두 3점이라 취향 방향 없이, 이 방식의 보완 기준으로 만든 추천이에요.':method.description;
    const titleLines={popularity:'인기 중심의<br><em>추천이었어요.</em>',content:'취향을 닮은<br><em>추천이었어요.</em>',collaborative:'함께 좋아한<br><em>추천이었어요.</em>',biasAware:'다양성도 챙긴<br><em>추천이었어요.</em>'};
    const statement=c.changed?`추천 기준만 바꿨는데,<br><strong>${c.changed}편이 달라졌어요.</strong>`:'추천 기준은 달라도,<br><strong>같은 6편이 나왔어요.</strong>';
    return `<section class="result-page fade-in"><div class="result-top"><div class="result-layout"><div><div class="result-kicker"><b>${state.listRatings[key]}점 · 목록 ${letter}</b><span>내가 높게 평가한 추천</span></div><h1 class="result-title">${titleLines[key]}</h1><p class="result-description">${esc(methodDescription)}</p></div>${heroCards(state.results.lists[key].slice(0,3),'result')}</div><section class="insight-card" aria-label="실제 추천 목록의 차이"><div class="insight-figure" aria-hidden="true">${c.changed}<small>/6</small></div><div class="insight-content"><div class="insight-top"><span class="kicker">같은 취향, 다른 선택지</span></div><h2>${statement}</h2><div class="overlap-strip" aria-label="공통 영화 ${c.shared.length}편, 서로 다른 영화 ${c.changed}편">${Array.from({length:6},(_,n)=>`<span class="${n<c.shared.length?'shared':'different'}" aria-hidden="true"></span>`).join('')}</div><p class="insight-caption"><b>${esc(method.short)}</b> ↔ <b>${esc(METHODS[c.reference].short)}</b><span> · 공통 ${c.shared.length}편</span></p><button class="insight-link" data-action="difference">어떤 영화가 달라졌을까요? ${svg('right')}</button></div></section><div class="inline-actions result-actions"><button class="primary" data-action="apply-feedback">내 점수로 다시 추천 ${svg('arrow')}</button><button class="secondary" data-action="explain" data-method="${key}">이 알고리즘 자세히 알아보기 ${svg('right')}</button></div><p class="feedback-promise">네 목록의 점수를 모두 반영해 하나의 추천으로 섞어요.</p><div class="takeaway"><h2>추천은 내 취향과, 정렬 기준이 함께 만든 결과예요.</h2><p>같은 영화 점수로 만든 네 목록에 서로 다른 영화 ${f.all}편이 등장했어요.</p></div><div class="result-bottom"><p class="result-disclaimer">이번 선택에 대한 설명이며, 실제 시청 만족도나 알고리즘의 우열을 검증한 결과는 아니에요.</p><div><button class="text-button" data-action="save-summary">${svg('download')}결과 저장</button><button class="text-button" data-action="edit">${svg('reset')}영화 점수 바꾸기</button></div></div></div></section>`;
  }
  async function applyFeedback(){
    if(state.busy||!state.results||ratingCount()!==4)return;
    state.busy=true;const b=document.querySelector('[data-action="apply-feedback"]');if(b){b.disabled=true;b.textContent='점수 반영 중…';}
    await new Promise(resolve=>setTimeout(resolve,25));
    try{state.adaptive=Engine.adapt(state.results,state.listRatings);state.busy=false;route('personal');}
    catch(error){state.busy=false;if(b){b.disabled=false;b.textContent='다시 시도하기';}toast(error.message||'추천을 다시 만들어 주세요.');}
  }
  function personal(){
    const r=state.adaptive,original=state.results.lists[state.chosen],same=r.list.filter(i=>original.includes(i)).length;
    const allEqual=new Set(KEYS.map(k=>state.listRatings[k])).size===1;
    const max=Math.max(...KEYS.map(k=>state.listRatings[k]));
    const leaders=state.blind.filter(k=>state.listRatings[k]===max).map(k=>tabLabel(state.blind.indexOf(k))).join('·');
    const note=allEqual?'네 목록에 같은 점수를 주어, 같은 비중으로 섞었어요.':`${max}점을 준 목록 ${leaders}의 비중을 높여 섞었어요.`;
    return `<section class="personal-page fade-in"><div class="page-heading"><div class="kicker">STEP 03 · 내 평가 반영 완료</div><h1>내 점수를 반영한,<br>이번 추천.</h1><p>${esc(note)}</p></div><div class="movie-grid personal-grid">${r.list.map(i=>movieCard(i,'view')).join('')}</div><div class="personal-insight"><span class="personal-check">${svg('check')}</span><p>${same===6?'선택한 목록과 같은 6편이에요.':`선택한 목록에서 <b>${6-same}편</b>이 달라졌어요.`}<small>목록 ${tabLabel(state.blind.indexOf(state.chosen))}와 비교 · 순서 변화는 제외</small></p></div><div class="inline-actions personal-actions"><button class="primary" data-action="feedback-explain">점수가 어떻게 반영됐나요? ${svg('right')}</button><button class="secondary" data-action="save-summary">${svg('download')}결과 저장</button></div>${max<=2?'<p class="feedback-promise">모든 목록이 아쉬웠다면 영화 점수를 바꿔서 다시 시도해 보세요.</p>':''}<div class="personal-bottom"><button class="text-button" data-action="baseline">${svg('left')}알고리즘 정체 다시 보기</button><button class="text-button" data-action="revise-lists">목록 점수 바꾸기 ${svg('reset')}</button></div>${mediaNote()}</section>`;
  }
  function feedbackExplain(){
    if(!state.adaptive)return;const r=state.adaptive;
    showDialog('feedback','내 점수가 추천에 반영된 방법',`<div class="explain-steps"><div class="explain-step"><span class="n">01</span><b>영화 점수</b><small>낮은 점수와 높은 점수를 반대로 반영</small></div><div class="explain-step"><span class="n">02</span><b>목록 점수</b><small>높게 평가한 방식의 비중을 높임</small></div><div class="explain-step"><span class="n">03</span><b>추천 합치기</b><small>각 방식의 순위를 합산해 6편 선택</small></div></div><h3 class="weights-title">이번 추천에 사용한 실제 비중</h3><div class="weight-rows">${state.blind.map(k=>`<div class="weight-row"><div><span>목록 ${tabLabel(state.blind.indexOf(k))} · ${METHODS[k].short}</span><b>${state.listRatings[k]}점 → ${(r.weights[k]*100).toFixed(1)}%</b></div><div class="weight-rail"><span style="width:${r.weights[k]*100}%"></span></div></div>`).join('')}</div><p class="source-note">같은 점수는 같은 비중이에요. 한 번의 평가로 한 방식에만 쏠리지 않도록 각 방식에 최소 10%를 남겼어요. 목록 점수를 그 안의 영화 각각의 점수로 간주하지는 않습니다.</p><details class="fold"><summary>실제 계산식 보기</summary><div class="fold-body"><code>영화 선호 가중치 = 영화 점수 − 3</code><code>방식 비중 = 0.10 + 0.60 × exp(0.7 × (목록 점수 − 3)) / 네 방식의 exp 합</code><code>후보 점수 = Σ 방식 비중 / (10 + 해당 방식의 순위)</code>네 방식에서 각각 상위 60편을 가져와 순위 기반으로 합쳐요. 후보에 없는 영화는 그 방식에서 0점으로 처리하며, 이미 평가한 영화는 제외해요. 한 방식 안에서 목록 점수가 동일하게 높아도 모든 영화가 좋아졌다고 학습하지 않아요.</div></details><details class="fold"><summary>어디까지 해석할 수 있나요?</summary><div class="fold-body">점수에 따른 로컬 혼합 규칙이며 전체 영화 모델을 재학습하지 않아요. 단 한 번의 입력으로 취향이나 정확도를 검증한 결과가 아니며, 가중치는 실험으로 최적화한 값이 아닙니다. 모두 낮은 점수와 모두 높은 점수는 상대적 선호가 같아 비중도 같아요. 순위 점수가 바뀌어도 상위 6편은 그대로일 수 있어요. 모든 영화가 3점이면 취향 방향을 추정하지 않고 인기 기반 보완 점수와 다양성을 사용해요.</div></details><button class="secondary wide" data-action="compare-details">기본 알고리즘 자세히 보기 ${svg('right')}</button>`);
  }

  function difference(){
    if(!state.chosen||!state.results)return;
    const c=contrast(),key=state.chosen;
    const row=(i,n)=>`<button class="difference-film" data-action="film" data-index="${i}"><span class="difference-poster">${poster(i)}</span><span>${esc(title(i))}<small>${M[i].year}</small></span></button>`;
    showDialog('difference','추천 기준이 바꾼 영화',`<p class="dialog-lead">영화 5편에 준 점수와 후보 영화는 그대로입니다. 달라진 것은 추천 순서를 정하는 방식이에요.</p><div class="difference-columns"><section><h3>${esc(METHODS[key].short)}에만</h3>${c.onlyChosen.map(row).join('')||'<p class="empty-state">서로 같은 영화예요.</p>'}</section><section><h3>${esc(METHODS[c.reference].short)}에만</h3>${c.onlyOther.map(row).join('')||'<p class="empty-state">서로 같은 영화예요.</p>'}</section></div>${c.shared.length?`<details class="fold"><summary>두 목록에 함께 나온 ${c.shared.length}편</summary><div class="fold-body">${c.shared.map(i=>`<button class="text-button" data-action="film" data-index="${i}">${esc(title(i))}</button>`).join('')}</div></details>`:''}<p class="source-note">항상 인기 중심 목록과 비교합니다. 인기 중심을 고른 경우에는 취향 유사 목록과 비교합니다. 차이를 크게 보이게 하려고 비교 상대를 고르거나 추천 결과를 바꾸지 않습니다. 내 점수로 만든 혼합 추천은 별도 화면에서 확인합니다.</p>`);
  }
  function showProgress(){const stages={home:0,pick:1,compare:2,result:3,personal:3};const n=stages[state.stage];document.getElementById('progress').innerHTML=n?['영화 평가','추천 평가','결과 확인'].map((s,i)=>`<span class="${i+1===n?'current':i+1<n?'done':''}" ${i+1===n?'aria-current="step"':''}><b class="step-number">${i+1<n?'✓':i+1}</b><span class="step-label">${s}</span></span>`).join(''):'';}
  function render(focus=true){
    if(observer)observer.disconnect();
    root.setAttribute('aria-busy','true');
    root.innerHTML=state.stage==='pick'?pick():state.stage==='compare'?compare():state.stage==='result'?result():state.stage==='personal'?personal():home();
    showProgress();if(state.stage==='compare')attachPanel();releaseDetachedMedia();hydrate(root);root.setAttribute('aria-busy','false');
    if(focus){root.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
    document.title=({home:'내가 고른 추천의 정체',pick:'영화 점수 주기',compare:'네 가지 추천 비교',result:'내 평가 결과',personal:'내 점수로 만든 추천'}[state.stage])+' · RecoLens';
  }
  function route(stage,push=true){
    const wasModal=dialog.open&&dialogHistory;
    closeDialog(true);
    if(wasModal)push=false;
    if(['compare','result','personal'].includes(stage)&&!state.results){stage='pick';}
    if(['result','personal'].includes(stage)&&!state.chosen)stage='compare';
    if(stage==='personal'&&!state.adaptive){try{state.adaptive=Engine.adapt(state.results,state.listRatings);}catch{stage='result';}}
    state.stage=stage;document.body.dataset.stage=stage;
    if(stage==='compare')state.seen.add(state.active);
    document.getElementById('toast').classList.remove('visible');
    clearTimeout(toast.timer);
    const hash=stage==='home'?'#start':`#${stage}`;
    if(location.hash!==hash){try{history[push?'pushState':'replaceState']({stage},'',hash);}catch{}}
    render();save();
  }
  function invalidate(){state.results=null;state.adaptive=null;state.listRatings={};state.chosen=null;state.seen.clear();state.active=0;state.resume='pick';panelCache.clear();}
  function toggleLike(i){
    if(!state.likes.has(i)||state.busy)return;
    state.likes.delete(i);delete state.ratings[i];invalidate();save();syncPickControls();
    announce(`${title(i)} 평가를 지웠어요.`);
  }
  async function recommend(){
    if(state.busy||state.likes.size!==REQUIRED)return;
    if(state.results){route(state.chosen?(state.adaptive?'personal':'result'):'compare');return;}
    state.busy=true;const b=document.getElementById('recommendButton');if(b){b.disabled=true;b.innerHTML='추천 만드는 중…';}
    // Yield a frame so the status is painted before synchronous model work.
    await new Promise(r=>setTimeout(r,25));
    try{
      state.results=Engine.compute(movieInput());
      state.blind=shuffle(KEYS);state.active=0;state.seen=new Set([0]);state.chosen=null;state.busy=false;panelCache.clear();route('compare');
    }catch(error){state.busy=false;if(b){b.disabled=false;b.innerHTML='다시 추천 만들기';}toast(error.message||'추천을 만들지 못했어요. 다시 시도해 주세요.');}
  }
  function changeTab(n,focus=false){
    if(!Number.isInteger(n)||n<0||n>3||!state.results)return;
    state.active=n;state.seen.add(n);save();refreshCompareControls();attachPanel();document.getElementById('listRatingControl').innerHTML=listRatingControl();updateMediaNote();
    if(focus)document.getElementById('blindTab'+n)?.focus({preventScroll:true});
    announce(`추천 목록 ${tabLabel(n)}, ${state.seen.size}개 확인`);
  }
  function chooseList(){
    if(ratingCount()!==4||!state.results)return;
    const max=Math.max(...KEYS.map(k=>state.listRatings[k]));
    const tied=state.blind.filter(k=>state.listRatings[k]===max);
    if(tied.length===1){state.chosen=tied[0];save();route('result');return;}
    showDialog('tie','같은 최고 점수예요.',`<p class="dialog-lead">${max}점으로 평가한 목록이 ${tied.length}개예요.<br>먼저 정체를 알아볼 목록을 하나 골라주세요.</p><div class="tie-options">${tied.map(k=>`<button class="secondary" data-action="tie-pick" data-method="${k}">목록 ${tabLabel(state.blind.indexOf(k))}<span>${max}점</span></button>`).join('')}</div><p class="source-note">어느 것을 골라도 최종 추천에는 네 목록의 점수가 모두 반영돼요.</p>`);
  }
  function showDialog(kind,heading,html,options={}){
    if(!dialog.open){dialogOrigin=document.activeElement;dialogOriginAction=dialogOrigin?.dataset?.action||null;state.dialogStack=[];
      try{history.pushState({stage:state.stage,recolensModal:true},'',location.href);dialogHistory=true;}catch{dialogHistory=false;}
    }
    else if(options.push&&state.dialog)state.dialogStack.push({...state.dialog,scroll:dialog.scrollTop});
    state.dialog={kind,...options};
    dialog.dataset.kind=kind;
    document.getElementById('dialogTitle').textContent=heading;
    dialogBody.innerHTML=html;
    document.getElementById('dialogBack').hidden=state.dialogStack.length===0;
    if(!dialog.open)dialog.showModal();dialog.scrollTop=0;
    document.getElementById('dialogClose').focus({preventScroll:true});hydrate(dialogBody);
  }
  function closeDialog(fromHistory=false){
    const wasOpen=dialog.open;if(wasOpen)dialog.close();state.dialog=null;state.dialogStack=[];
    if(wasOpen&&dialogHistory){dialogHistory=false;if(!fromHistory){suppressModalPop=true;history.back();}}
  }
  function goDialogBack(){
    const prev=state.dialogStack.pop();if(!prev){closeDialog();return;}
    const stack=[...state.dialogStack];
    openKind(prev);state.dialogStack=stack;document.getElementById('dialogBack').hidden=stack.length===0;dialog.scrollTop=prev.scroll||0;
  }
  function openKind(item){
    if(item.kind==='rate'){rateFilm(item.index,item.replaceIndex);if(validRating(item.draft)){state.dialog.draft=item.draft;paintRating(document.getElementById('movieRange'),item.draft);}}
    else if(item.kind==='film')film(item.index);
    else if(item.kind==='search')openSearch(true);
    else if(item.kind==='selected')selected();
    else if(item.kind==='explain')explain(item.method);
    else if(item.kind==='chosen-list')chosenList(item.method);
    else if(item.kind==='compare-details')compareDetails();
    else if(item.kind==='difference')difference();
    else if(item.kind==='feedback')feedbackExplain();
    else if(item.kind==='replace')replaceSelection(item.index);
    else about();
  }
  function link(url,label,cls=''){const safe=Info.safeURL(url);if(!safe)return '';return `<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer" class="${cls}">${label}${svg('external')}</a>`;}
  function filmContents(i){
    const p=Info.get(i);const people=Array.isArray(p.people)?p.people:[];const cast=Array.isArray(p.cast)?p.cast:[];
    const names=people.length?people.map(x=>`<span class="cast-chip">${esc(x.name)}<small>${esc(x.actor)}</small></span>`).join(''):cast.slice(0,6).map(x=>`<span class="cast-chip">${esc(x)}</span>`).join('');
    const text=p.summary||(Info.isOnline()&&!p.loadFailed&&navigator.onLine!==false?'확인된 영화 정보를 불러오고 있어요. 바로 아래 네이버 검색으로 줄거리와 출연진을 볼 수도 있어요.':'연결된 영화 소개가 없어요. 네이버에서 포스터·줄거리·출연진을 바로 확인해 보세요.');
    return `<div class="film-detail"><div class="poster-wrap">${poster(i)}</div><div><p class="film-meta">${M[i].year||''}</p><h3>${esc(title(i))}</h3>${title(i)!==Info.cleanTitle(M[i].title)?`<p class="film-original">${esc(Info.cleanTitle(M[i].title))}</p>`:''}<div>${genreNames(i).slice(0,4).map(g=>`<span class="film-tag">${esc(g)}</span>`).join('')}</div>${p.director?`<p class="film-meta" style="margin-top:12px">감독 ${esc(p.director)}</p>`:''}</div></div><p class="film-summary">${esc(text)}</p>${names?`<section class="detail-section"><h3>${people.length?'등장인물 · 배우':'주요 출연진'}${M[i].genres.includes('Animation')?' · 원어 목소리':''}</h3><div class="cast-chips">${names}</div></section>`:''}<div class="links">${link(Info.naver(i),'네이버에서 영화 보기','naver')}${p.imdb?link(`https://www.imdb.com/title/${p.imdb}/`,'IMDb'):''}${p.source?link(p.source,'소개 출처'):''}</div>${state.stage==='pick'?`<button class="secondary wide" style="margin-top:17px" data-action="rate-film" data-index="${i}">${state.likes.has(i)?state.ratings[i]+'점 평가 수정':'이 영화 평가하기'}${svg('right')}</button>`:''}<button class="text-button retry-detail" data-action="retry-film" data-index="${i}">${svg('reset')}포스터·영화 정보 다시 연결</button><p class="source-note">외부 정보는 제공처에 따라 표시되지 않을 수 있어요. 확인하지 못한 등장인물·배역은 만들어 넣지 않습니다. 포스터의 권리는 각 권리자에게 있습니다.</p>`;
  }
  function film(i){if(!M[i])return;showDialog('film','영화 정보',filmContents(i),{index:i,push:true});requestMetadata(i);}
  function updateFilmDetails(i){
    if(state.dialog?.kind!=='film'||state.dialog.index!==i)return;
    const scroll=dialog.scrollTop;const active=document.activeElement;const action=active?.dataset?.action;
    dialogBody.innerHTML=filmContents(i);hydrate(dialogBody);dialog.scrollTop=scroll;
    if(action)dialogBody.querySelector(`[data-action="${action}"]`)?.focus({preventScroll:true});
  }
  function searchMatches(){const q=normalize(state.search.q);return order.filter(i=>(!q||searchKeys[i].includes(q))&&(!state.search.genre||M[i].genres.includes(state.search.genre)));}
  function openSearch(preserve=false){
    if(!preserve)state.search={q:'',genre:'',page:0};
    showDialog('search','알고 있는 영화 찾기',`<label class="search-field">${svg('search')}<input id="searchInput" type="search" placeholder="영화 제목 또는 개봉 연도" aria-label="영화 제목 또는 연도 검색" value="${esc(state.search.q)}" autocomplete="off"></label><div class="search-filters"><select id="searchGenre" aria-label="장르 필터"><option value="">모든 장르</option>${Object.entries(GENRE).filter(([k])=>k!=='IMAX').map(([k,v])=>`<option value="${k}" ${state.search.genre===k?'selected':''}>${v}</option>`).join('')}</select><span id="searchSelectionCount">${state.likes.size} / 5편 평가</span></div><div id="searchResults"></div><div class="search-dock"><button class="primary wide" data-action="search-done" id="searchDone">${state.likes.size===5?'추천 목록 보러 가기':'평가 화면으로 돌아가기'}</button></div>`);
    renderSearch();document.getElementById('searchInput').focus({preventScroll:true});
  }
  function renderSearch(){
    if(state.dialog?.kind!=='search')return;const list=searchMatches();const max=Math.max(0,Math.ceil(list.length/PAGE_SIZE)-1);state.search.page=Math.min(max,Math.max(0,state.search.page));
    const target=document.getElementById('searchResults');
    target.innerHTML=list.length?`<div class="movie-grid search-grid">${list.slice(state.search.page*PAGE_SIZE,(state.search.page+1)*PAGE_SIZE).map(i=>movieCard(i)).join('')}</div><div class="pager"><button data-action="search-prev" aria-label="이전 검색 결과" ${state.search.page===0?'disabled':''}>${svg('left')}</button><span class="page-number">${state.search.page+1} / ${max+1}</span><button data-action="search-next" aria-label="다음 검색 결과" ${state.search.page>=max?'disabled':''}>${svg('right')}</button></div><p class="source-note">${list.length.toLocaleString()}편 · 찾는 영화가 없으면 영어 제목으로도 검색해 보세요.</p>`:'<div class="empty-state">찾는 영화가 없어요.<br>영어 제목이나 개봉 연도로 검색해 보세요.<br><small>2018년 MovieLens 자료에서 선정한 1,800편을 사용해요.</small></div>';
    hydrate(target);
  }
  function rankItem(i,n=0,remove=false){return `<div class="chosen-row"><button class="rank-item" data-action="film" data-index="${i}"><span class="rank-number">${String(n+1).padStart(2,'0')}</span><span class="rank-poster">${poster(i)}</span><span><strong>${esc(title(i))}</strong><small>${M[i].year} · ${esc(genreNames(i).slice(0,2).join(' · '))}</small></span>${svg('right')}</button>${remove?`<button class="remove-button" data-action="remove" data-index="${i}" aria-label="${esc(title(i))} 선택 해제">${svg('close')}</button>`:''}</div>`;}
  function selected(){
    showDialog('selected','평가한 영화',`<p class="dialog-lead">${state.likes.size} / 5편 평가했어요. 영화를 누르면 점수를 바꿀 수 있어요.</p><div class="rank-list">${[...state.likes].map((i,n)=>`<div class="chosen-row"><button class="rank-item" data-action="rate-film" data-index="${i}"><span class="rank-poster">${poster(i)}</span><span><strong>${esc(title(i))}</strong><small>${M[i].year} · 내 평가 ${state.ratings[i]}점</small></span>${svg('right')}</button><button class="remove-button" data-action="remove" data-index="${i}" aria-label="${esc(title(i))} 평가 삭제">${svg('close')}</button></div>`).join('')||'<p class="empty-state">아직 평가한 영화가 없어요.</p>'}</div><button class="secondary wide" style="margin-top:20px" data-action="close">계속 평가하기</button>`);
  }
  function chosenList(method=state.chosen){if(!METHODS[method]||!state.results)return;showDialog('chosen-list',METHODS[method].name,`<p class="dialog-lead">${esc(METHODS[method].tagline)} 영화별 정보는 눌러서 확인하세요.</p><div class="rank-list">${state.results.lists[method].map((i,n)=>rankItem(i,n)).join('')}</div>`,{method,push:true});}
  function explainExample(key){
    const list=state.results.lists[key],i=list[0],movie=M[i];
    if(key==='popularity')return `첫 번째로 추천한 「${title(i)}」은 이 자료에서 ${movie.count}번 평가되었고 평균 평점은 ${movie.avg.toFixed(2)} / 5점이에요. 현재 인기나 국내 흥행 순위가 아니라 MovieLens 자료 안의 수치예요.`;
    if(key==='content'){
      const contributors=[...state.likes].map(j=>({index:j,rating:state.ratings[j],effect:(state.ratings[j]-3)*Engine.similarity(DATA.features[j],DATA.features[i])}));
      const strongest=contributors.sort((a,b)=>Math.abs(b.effect)-Math.abs(a.effect))[0];
      if(state.results.neutralOnly)return '영화가 모두 3점이라 취향 방향을 만들지 않았어요. 이번에는 인기 점수로 보완한 결과입니다.';
      return `첫 추천 「${title(i)}」에 가장 크게 작용한 입력은 「${title(strongest.index)}」의 ${strongest.rating}점이에요. ${strongest.effect<0?'닮은 특징의 점수를 낮추는':'닮은 특징의 점수를 높이는'} 방향으로 반영하며, 나머지 영화 점수도 함께 합산합니다.`;
    }
    if(key==='collaborative'){
      const n=state.results.analysis.cfSupport[i];
      return `첫 추천 「${title(i)}」은 고른 5편 중 ${n}편과 저장된 양의 평점 패턴 연결이 있었어요. 연결 강도에 각 영화의 점수−3을 곱해 합산하고 콘텐츠·인기 점수로 보완했어요. 연결이 없으면 보완 점수만 작용해요.`;
    }
    const f=facts(key);
    return `이번 목록에는 인기작 ${f.head}편과 그 밖의 영화 ${6-f.head}편이 포함됐어요. 이미 추천에 넣은 영화와 비슷한 작품이 반복되지 않는지도 다음 선택 때 고려했어요. 이것은 실제 생성한 목록의 구성이지, 효과를 입증한 실험 결과는 아니에요.`;
  }
  function explain(key=state.chosen){
    if(!state.results||!METHODS[key]||!state.chosen)return;
    const method=METHODS[key];
    showDialog('explain','알고리즘 자세히 알아보기',`<div class="method-tabs" aria-label="설명할 추천 방식">${KEYS.map(k=>`<button data-action="explain-switch" data-method="${k}" class="${k===key?'active':''}" aria-pressed="${k===key}">${METHODS[k].short}</button>`).join('')}</div><div class="kicker">${key===state.chosen?'내가 고른 추천 방식':'다른 추천 방식'}</div><h3 class="explain-title">${esc(method.name)}</h3><p class="dialog-lead">${esc(method.tagline)}</p><div class="explain-steps">${method.steps.map((s,n)=>`<div class="explain-step"><span class="n">0${n+1}</span><b>${esc(s[0])}</b><small>${esc(s[1])}</small></div>`).join('')}</div><div class="explain-example"><h3>내 선택에 적용하면</h3><p>${esc(explainExample(key))}</p></div><section class="bias-note"><b>어떤 편중이 생길 수 있나요?</b><p>${esc(method.bias)}</p></section><details class="fold"><summary>실제 계산식과 구현 방식</summary><div class="fold-body"><code>${esc(method.formula)}</code><p>${esc(method.technical)}</p></div></details><details class="fold"><summary>데이터와 해석의 한계</summary><div class="fold-body">2018년 생성 MovieLens 자료의 1,800편이 후보예요. 네 기본 추천은 같은 5편의 1~5점 평가를 사용하고, 같은 후보 집합에서 6편을 뽑아요. 보지 않은 영화는 싫어한다고 간주하지 않아요. 초기 화면은 알아보기 쉬운 영화를 우선해 편중될 수 있고, 5편의 입력만으로 취향을 충분히 파악할 수는 없어요. 설문·시청 결과 검증을 하지 않아 정확도, 만족도, 사용자의 성향을 진단하지 않아요.</div></details><button class="secondary wide" style="margin-top:18px" data-action="method-list" data-method="${key}">이 방식이 고른 영화 6편 보기${svg('right')}</button><p class="source-note">표시한 설명은 실제 코드의 규칙을 요약한 것입니다. 단순히 ‘좋은 알고리즘 / 나쁜 알고리즘’을 구분하는 체험이 아닙니다.</p>`,{method:key,push:state.dialog?.kind!=='explain'});
  }
  function compareDetails(){
    if(!state.results||!state.chosen)return;
    const f=facts(state.chosen);
    showDialog('compare-details','네 목록의 정체',`<p class="dialog-lead">같은 취향으로도, 무엇을 우선하느냐에 따라 추천은 달라집니다.</p><div class="method-reveal">${state.blind.map((key,n)=>`<button class="reveal-row ${key===state.chosen?'chosen':''}" data-action="explain" data-method="${key}"><span class="reveal-letter">${tabLabel(n)}</span><span><strong>${esc(METHODS[key].name)}${key===state.chosen?' · 내가 고른 목록':''}</strong><small>${esc(METHODS[key].tagline)}</small></span>${svg('right')}</button>`).join('')}</div><div class="notice-box">네 목록의 24칸에는 서로 다른 영화 <b>${f.all}편</b>이 들어 있어요. 같은 영화가 여러 목록에 등장해도 그대로 두었습니다.</div><details class="fold"><summary>실제 수치로 비교하기</summary><div class="fold-body"><div class="table-wrap"><table class="metric-table"><caption class="sr-only">현재 추천 목록별 내부 비교 지표</caption><thead><tr><th scope="col">방식</th><th scope="col">인기작</th><th scope="col">목록 다양성</th></tr></thead><tbody>${state.blind.map(k=>`<tr><th scope="row">${esc(METHODS[k].short)}</th><td>${facts(k).head} / 6편</td><td>${state.results.metrics[k].diversity.toFixed(3)}</td></tr>`).join('')}</tbody></table></div><p>인기작은 데이터의 평가 수 기준 상위 20%입니다. 현재 흥행 순위가 아닙니다. 목록 다양성은 영화 쌍의 1−코사인 유사도 평균(0~1)입니다. 정확도·만족도·개인의 편향 점수가 아닙니다.</p></div></details><div class="links"><button class="secondary" data-action="export">${svg('download')}계산 결과 JSON</button></div>`);
  }

  function about(){
    showDialog('about','이 체험에 대해',`<section class="about-section"><h3>무엇을 하는 웹인가요?</h3><p>영화 5편의 1~5점 평가로 네 추천 목록을 만들어요. 목록에도 점수를 주고, 마지막에 그 점수를 반영해 추천 방식을 섞어 보는 체험입니다. 영화 추천 서비스의 원리와 추천 편중을 직접 살펴보는 것이 목적이에요.</p></section><section class="about-section"><h3>설문이나 성향 검사가 아니에요</h3><p>${storageAvailable?'이 브라우저에서는 자동 저장이 가능해요.':'현재 저장 공간이 차단되어 새로고침하면 선택이 초기화돼요.'} 서버에 응답을 모으지 않아요. 선택은 이 브라우저에서만 처리하며, 저장 공간이 허용되면 이어하기용으로 저장해요. 저장이 차단된 환경에서는 새로고침 시 초기화돼요. 마지막 결과는 이번에 고른 목록의 특징을 설명해요. 성격 진단이나 실제 추천 정확도 평가가 아닙니다.</p></section><section class="about-section"><h3>오래된 데이터라는 한계가 있어요</h3><p>MovieLens ml-latest-small의 2018년 자료에서 선정한 1,800편을 사용해요. 최신 영화가 없을 수 있고, 실제 국내 관객 전체의 취향을 대표하지 않아요. 초기 선택 화면은 알아보기 쉬운 영화를 앞에 두었으므로 균형 잡힌 표본이 아니에요. 네 목록의 추천 후보는 동일해요.</p><div class="links">${link('https://files.grouplens.org/datasets/movielens/ml-latest-small-README.html','데이터 출처')}</div></section><section class="about-section"><h3>포스터와 영화 정보</h3><p>확인된 한국어 제목·소개는 내장하고, 나머지 포스터·출연진은 외부 영화 정보에서 조회해요. 실패하면 제목 카드와 네이버 검색을 제공해요. 네이버 검색 결과를 직접 수집하지 않아요. 이미지 유무는 추천 점수에 영향을 주지 않습니다.</p><div class="links">${link('https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/responses/meta.md','메타데이터 형식')}</div></section><section class="about-section"><h3>외부 연결과 개인정보</h3><p>영화·목록 점수와 추천 계산은 기기 안에서 처리해요. 포스터·영화 정보 요청 시 해당 영화의 ID 또는 제목·연도와 접속 IP 등이 외부 제공처에 전달될 수 있어요. 영화·목록 점수나 추천 결과 자체를 서버에 제출하지 않아요. 외부 연결을 꺼도 추천은 작동해요.</p><button class="secondary" style="margin-top:12px" data-action="toggle-online">${Info.isOnline()?'외부 영화 정보 연결 끄기':'외부 영화 정보 연결 켜기'}</button></section><details class="fold"><summary>참고한 추천 원리</summary><div class="fold-body">인기 점수, 콘텐츠 기반 코사인 유사도, 아이템 기반 협업 필터링, MMR 원리를 응용한 다양성 재순위화를 구현했어요. 세부 식은 결과 화면의 ‘자세히 알아보기’에서 확인할 수 있어요.<div class="links">${link('https://dl.acm.org/doi/10.1145/371920.372071','아이템 기반 협업 필터링')}${link('https://dl.acm.org/doi/10.1145/290941.291025','MMR 재순위화')}</div></div></details><button class="danger" data-action="reset-confirm">${svg('reset')}이 기기에 저장된 선택 지우기</button><p class="source-note">RecoLens 7.0 · made by 김민찬 · MovieLens 자료와 영화 이미지는 각 제공처의 이용 조건이 적용됩니다.</p>`);
  }
  function exportResult(){
    if(!state.results||!state.chosen)return;
    const output={app:'RecoLens',version:'7.0.0',exportedAt:new Date().toISOString(),dataset:DATA.meta,notice:'현재 로컬 체험 기록. 설문·실제 정확도 검증·성향 진단이 아닙니다.',input:{type:'five_explicit_movie_ratings',movies:[...state.likes].map(i=>({id:M[i].id,title:title(i),rating:state.ratings[i]}))},listRatings:{...state.listRatings},personalized:state.adaptive?{weights:state.adaptive.weights,movies:state.adaptive.list.map(i=>({id:M[i].id,title:title(i)})),depth:state.adaptive.depth,offset:state.adaptive.offset}:null,blindOrder:state.blind,selectedAlgorithm:state.chosen,algorithms:Object.fromEntries(KEYS.map(k=>[k,{name:METHODS[k].name,movies:state.results.lists[k].map(i=>({id:M[i].id,title:title(i),year:M[i].year,naver:Info.naver(i)})),metrics:state.results.metrics[k]}]))};
    const blob=new Blob([JSON.stringify(output,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='RecoLens_내_추천_결과.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('이 기기의 현재 결과를 저장했어요.');
  }
  function replaceSelection(index){
    if(!M[index]||state.likes.has(index))return;
    showDialog('replace','어떤 영화 대신 평가할까요?',`<p class="dialog-lead">이미 5편을 평가했어요. ${esc(title(index))} 대신 뺄 영화를 골라주세요.</p><div class="rank-list">${[...state.likes].map(i=>`<button class="rank-item" data-action="replace-like" data-index="${i}" data-new="${index}"><span class="rank-poster">${poster(i)}</span><span><strong>${esc(title(i))}</strong><small>내 평가 ${state.ratings[i]}점</small></span>${svg('reset')}</button>`).join('')}</div>`,{index,push:true});
  }
  function summaryText(){
    const c=contrast(),key=state.chosen,f=facts(key);
    return ['RecoLens · 추천 알고리즘 체험 결과','',
      '영화 평가: '+[...state.likes].map(i=>`${title(i)} ${state.ratings[i]}점`).join(', '),
      '추천 목록 평가: '+state.blind.map((k,n)=>`${tabLabel(n)} ${state.listRatings[k]}점`).join(', '),
      '선택한 목록: '+tabLabel(state.blind.indexOf(key))+' · '+METHODS[key].name,
      METHODS[key].description,'',
      '추천 영화',...state.results.lists[key].map((i,n)=>`${n+1}. ${title(i)} (${M[i].year})`),'',
      `비교: ${METHODS[c.reference].name}와 공통 ${c.shared.length}편, 각 목록에만 ${c.changed}편`,
      `네 목록 전체에서 서로 다른 영화 ${f.all}편`,'',
      '네 기본 방식은 같은 영화 평점과 같은 후보 1,800편에서 각각 6편을 선택했습니다.',
      ...(state.adaptive?['','점수 반영 추천',...state.adaptive.list.map((i,n)=>`${n+1}. ${title(i)} (${M[i].year})`),'반영 비중: '+KEYS.map(k=>`${METHODS[k].short} ${(state.adaptive.weights[k]*100).toFixed(1)}%`).join(', ')]:[]),
      'MovieLens 2018 자료를 사용한 로컬 체험이며 실제 정확도·만족도 검증이나 성격 진단이 아닙니다.',
      '설문 응답 수집 없음 · made by 김민찬'].join('\n');
  }
  function saveSummary(){
    if(!state.chosen||!state.results)return;
    const blob=new Blob(['\uFEFF'+summaryText()],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
    a.href=url;a.download='RecoLens_내_결과_요약.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
  }
  function resetConfirm(){showDialog('reset','처음부터 다시 할까요?',`<p class="dialog-lead">이 버전에서 저장한 영화 선택과 결과를 지워요. 다른 사이트나 이전 버전의 기록은 건드리지 않습니다.</p><div class="inline-actions"><button class="secondary" data-action="close">취소</button><button class="primary" data-action="reset">지우고 처음으로</button></div>`);}
  let searchTimer;
  let composing=false;
  document.addEventListener('compositionstart',event=>{if(event.target.id==='searchInput')composing=true;});
  document.addEventListener('compositionend',event=>{if(event.target.id==='searchInput'){composing=false;state.search.q=event.target.value;state.search.page=0;clearTimeout(searchTimer);renderSearch();}});
  document.addEventListener('click',event=>{
    const b=event.target.closest('button[data-action]');if(!b||b.disabled)return;
    const a=b.dataset.action,i=Number(b.dataset.index);
    if(state.busy&&!['about','close','film'].includes(a))return;
    if(a==='start'){
      if(state.likes.size===5&&['compare','result','personal'].includes(state.resume)&&!state.results){try{state.results=Engine.compute(movieInput());}catch{invalidate();}}
      route(state.likes.size?state.resume:'pick');
    }
    else if(a==='home')route('home');
    else if(a==='toggle-like')rateFilm(i);
    else if(a==='rate-film')rateFilm(i);
    else if(a==='save-rating')saveMovieRating();
    else if(a==='clear-rating'){toggleLike(i);goDialogBack();}
    else if(a==='rating-step'){const input=document.getElementById(b.dataset.kind==='movie'?'movieRange':'listRange');if(input){input.value=b.dataset.value;handleRating(input);}}
    else if(a==='tie-pick'){if(ratingCount()===4&&KEYS.includes(b.dataset.method)&&state.listRatings[b.dataset.method]===Math.max(...KEYS.map(k=>state.listRatings[k]))){state.chosen=b.dataset.method;save();route('result');}}
    else if(a==='apply-feedback')void applyFeedback();
    else if(a==='feedback-explain')feedbackExplain();
    else if(a==='baseline')route('result');
    else if(a==='revise-lists')route('compare');
    else if(a==='recommend')void recommend();
    else if(a==='pick-prev'||a==='pick-next'){state.page+=a==='pick-next'?1:-1;save();render(false);root.querySelector(`[data-action="${a}"]`)?.focus({preventScroll:true});}
    else if(a==='search')openSearch();
    else if(a==='search-done'){closeDialog();if(state.likes.size===5)void recommend();}
    else if(a==='difference')difference();
    else if(a==='retry-media')retryMedia();
    else if(a==='retry-film'){posterFailed.delete(i);requestedMetadata.delete(i);document.querySelectorAll(`[data-poster="${i}"]`).forEach(box=>{delete box.dataset.source;hydratePoster(box);});requestMetadata(i,true);toast('영화 정보를 다시 연결합니다.');}
    else if(a==='save-summary')saveSummary();
    else if(a==='replace-like'){const ni=Number(b.dataset.new);if(state.likes.has(i)&&M[ni]&&!state.likes.has(ni))rateFilm(ni,i);}
    else if(a==='search-prev'||a==='search-next'){state.search.page+=a==='search-next'?1:-1;renderSearch();}
    else if(a==='film')film(i);
    else if(a==='selected')selected();
    else if(a==='remove'){if(state.likes.has(i))toggleLike(i);selected();}
    else if(a==='tab')changeTab(Number(b.dataset.tab),true);
    else if(a==='next-list')changeTab([0,1,2,3].find(n=>!validRating(state.listRatings[state.blind[n]]))??0,true);
    else if(a==='choose-list')chooseList();
    else if(a==='edit')route('pick');
    else if(a==='explain'||a==='explain-switch')explain(b.dataset.method);
    else if(a==='compare-details')compareDetails();
    else if(a==='chosen-list')chosenList();
    else if(a==='method-list')chosenList(b.dataset.method);
    else if(a==='about')about();
    else if(a==='close')closeDialog();
    else if(a==='dialog-back')goDialogBack();
    else if(a==='export')exportResult();
    else if(a==='toggle-online'){
      Info.setOnline(!Info.isOnline());posterFailed.clear();requestedMetadata.clear();
      for(const [box,timer]of mediaTimers){clearTimeout(timer);delete box.dataset.source;}
      document.querySelectorAll('.poster img').forEach(img=>{img.onload=null;img.onerror=null;img.removeAttribute('src');img.remove();});mediaTimers.clear();panelCache.clear();
      render(false);about();
    }
    else if(a==='reset-confirm')resetConfirm();
    else if(a==='reset'){
      state.likes.clear();state.ratings={};invalidate();state.page=0;state.blind=shuffle(KEYS);state.resume='pick';
      try{localStorage.removeItem(STORE);}catch{}
      route('home');toast('영화 선택과 결과를 지웠어요.');
    }
  });
  document.addEventListener('input',event=>{
    if(event.target.matches('.rating-range')){handleRating(event.target);return;}
    if(event.target.id==='searchInput'&&!composing){clearTimeout(searchTimer);state.search.q=event.target.value;state.search.page=0;searchTimer=setTimeout(renderSearch,120);}
  });
  document.addEventListener('change',event=>{if(event.target.matches('.rating-range')){handleRating(event.target);return;}if(event.target.id==='searchGenre'){state.search.genre=event.target.value;state.search.page=0;renderSearch();}});
  // Selecting the existing midpoint/end value must count as an explicit rating.
  document.addEventListener('pointerup',event=>{if(event.target.matches('.rating-range'))handleRating(event.target);});
  document.addEventListener('keyup',event=>{if(event.target.matches('.rating-range')&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'].includes(event.key))handleRating(event.target);});
  document.addEventListener('keydown',event=>{
    if(dialog.open){
      // Search inputs may consume Escape without dismissing a native dialog.
      if(event.key==='Escape'){event.preventDefault();closeDialog();}
      return;
    }
    if(event.target.matches('input,textarea,select'))return;
    if(state.stage==='compare'&&event.target.getAttribute('role')==='tab'){
      let n=state.active;
      if(event.key==='ArrowRight')n=(n+1)%4;
      else if(event.key==='ArrowLeft')n=(n+3)%4;
      else if(event.key==='Home')n=0;
      else if(event.key==='End')n=3;
      else return;
      event.preventDefault();changeTab(n,true);
    }
  });
  dialog.addEventListener('click',event=>{
    if(event.target!==dialog)return;
    const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeDialog();
  });
  dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();});
  dialog.addEventListener('close',()=>{
    if(dialog.open)return;
    state.dialog=null;state.dialogStack=[];
    if(dialogOrigin?.isConnected)dialogOrigin.focus({preventScroll:true});
    else (dialogOriginAction?root.querySelector(`[data-action="${dialogOriginAction}"]`):null)?.focus({preventScroll:true});
  });
  window.addEventListener('online',()=>{if(Info.isOnline()){Info.setOnline(true);posterFailed.clear();requestedMetadata.clear();hydrate(root);if(dialog.open)hydrate(dialogBody);}});
  window.addEventListener('popstate',()=>{
    if(suppressModalPop){suppressModalPop=false;return;}
    if(dialog.open){closeDialog(true);return;}
    const stage=location.hash.slice(1);route(['pick','compare','result','personal'].includes(stage)?stage:'home',false);
  });
  // Versioned state references MovieLens IDs, not fragile array offsets. Persisted
  // results are recomputed from current code so old metrics cannot silently leak in.
  const initial=location.hash.slice(1);
  if(state.likes.size===REQUIRED && ['compare','result','personal'].includes(initial)){
    try{state.results=Engine.compute(movieInput());}catch{invalidate();}
  }
  route(['pick','compare','result','personal'].includes(initial)?initial:'home',false);
  // Upgrade only the app's own service-worker registration. Versioned precaching
  // removes obsolete RecoLens caches without touching other apps under the origin.
  if('serviceWorker'in navigator && /^https?:$/.test(location.protocol)){
    navigator.serviceWorker.register('sw.js',{updateViaCache:'none'}).catch(()=>{});
  }
})();
