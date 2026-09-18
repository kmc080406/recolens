/* Film information is presentation-only. It never changes recommendation scores.
 * The short Korean profiles below are paraphrased from the cited pages (2026-09-18).
 * Online metadata is best-effort; no API key, user account or ratings are transmitted.
 */
(() => {
  'use strict';
  const profiles = {
    79132: {title:'인셉션',imdb:'tt1375666',summary:'타인의 꿈에 들어가는 코브. 정보를 훔치는 대신, 한 사람의 마음에 새로운 생각을 심는 임무를 맡는다.',cast:['레오나르도 디카프리오','조셉 고든레빗','톰 하디'],people:[{name:'코브',actor:'레오나르도 디카프리오'}],director:'크리스토퍼 놀란',source:'https://en.wikipedia.org/wiki/Inception'},
    109487:{title:'인터스텔라',imdb:'tt0816692',summary:'인류가 살 수 있는 새로운 터전을 찾아, 우주 탐사대가 지구를 떠난다.',cast:['매튜 매커너히','앤 해서웨이','제시카 차스테인'],director:'크리스토퍼 놀란',source:'https://en.wikipedia.org/wiki/Interstellar_(film)'},
    2571:{title:'매트릭스',imdb:'tt0133093',summary:'해커 네오는 자신이 살아온 현실이 기계가 만든 가상 세계라는 사실을 알게 된다.',cast:['키아누 리브스','로런스 피시번','캐리앤 모스'],people:[{name:'네오',actor:'키아누 리브스'},{name:'모피어스',actor:'로런스 피시번'},{name:'트리니티',actor:'캐리앤 모스'}],director:'워쇼스키 감독',source:'https://en.wikipedia.org/wiki/The_Matrix'},
    1682:{title:'트루먼 쇼',imdb:'tt0120382',summary:'평범한 일상을 살던 트루먼. 주변의 작은 이상함을 발견하며 자신이 살아온 세계를 의심하기 시작한다.',cast:['짐 캐리','로라 리니','에드 해리스'],people:[{name:'트루먼',actor:'짐 캐리'},{name:'크리스토프',actor:'에드 해리스'}],director:'피터 위어',source:'https://en.wikipedia.org/wiki/The_Truman_Show'},
    318:{title:'쇼생크 탈출',imdb:'tt0111161',summary:'종신형을 선고받은 앤디는 감옥에서 레드와 우정을 쌓으며 자유에 대한 희망을 이어간다.',cast:['팀 로빈스','모건 프리먼'],people:[{name:'앤디',actor:'팀 로빈스'},{name:'레드',actor:'모건 프리먼'}],director:'프랭크 다라본트',source:'https://en.wikipedia.org/wiki/The_Shawshank_Redemption'},
    134853:{title:'인사이드 아웃',imdb:'tt2096673',summary:'낯선 도시로 이사한 라일리. 머릿속 다섯 감정이 새로운 일상을 함께 헤쳐 나간다.',cast:['에이미 포엘러','필리스 스미스','빌 헤이더'],people:[{name:'기쁨이',actor:'에이미 포엘러'},{name:'슬픔이',actor:'필리스 스미스'},{name:'소심이',actor:'빌 헤이더'}],director:'피트 닥터',source:'https://movies.disney.com/inside-out'},
    152081:{title:'주토피아',imdb:'tt2948356',summary:'토끼 경찰 주디와 여우 닉이 동물 도시에서 벌어지는 의문의 사건을 함께 추적한다.',cast:['지니퍼 굿윈','제이슨 베이트먼','이드리스 엘바'],characters:['주디 홉스','닉 와일드'],source:'https://movies.disney.com/zootopia'},
    115617:{title:'빅 히어로',imdb:'tt2245084',summary:'로봇 천재 히로와 돌봄 로봇 베이맥스. 친구들과 힘을 모아 도시를 위협하는 음모에 맞선다.',cast:['라이언 포터','스콧 애짓','다니엘 헤니'],characters:['히로','베이맥스'],director:'돈 홀 · 크리스 윌리엄스',source:'https://movies.disney.com/big-hero-6'},
    1:{title:'토이 스토리',imdb:'tt0114709',summary:'새 장난감 버즈의 등장으로 자리를 위협받는 우디. 주인과 떨어진 두 장난감은 함께 집으로 돌아가야 한다.',cast:['톰 행크스','팀 앨런'],characters:['우디','버즈 라이트이어'],director:'존 라세터',source:'https://movies.disney.com/toy-story'},
    6377:{title:'니모를 찾아서',imdb:'tt0266543',summary:'사람에게 잡혀간 아들 니모를 찾기 위해 말린과 도리가 드넓은 바다로 모험을 떠난다.',cast:['앨버트 브룩스','엘런 디제너러스','알렉산더 굴드'],people:[{name:'말린',actor:'앨버트 브룩스'},{name:'도리',actor:'엘런 디제너러스'},{name:'니모',actor:'알렉산더 굴드'}],director:'앤드루 스탠턴',source:'https://movies.disney.com/finding-nemo'},
    60069:{title:'월-E',imdb:'tt0910970',summary:'오랫동안 홀로 일하던 로봇 월-E. 탐사 로봇 이브를 만나며 새로운 세상으로 향한다.',cast:['벤 버트','엘리사 나이트'],characters:['월-E','이브'],director:'앤드루 스탠턴',source:'https://movies.disney.com/wall-e'},
    68954:{title:'업',imdb:'tt1049413',summary:'집에 수많은 풍선을 매단 칼은 오랜 꿈을 향해 날아오른다. 뜻밖의 동행 러셀과 함께 모험이 시작된다.',cast:['에드워드 애스너','조던 나가이','밥 피터슨'],characters:['칼 프레드릭슨','러셀','더그'],source:'https://movies.disney.com/up'}
  };
  // These entries supply search aliases and external IDs, not invented cast/plot.
  const aliases = {
    356:['포레스트 검프','tt0109830'],58559:['다크 나이트','tt0468569'],1721:['타이타닉','tt0120338'],480:['쥬라기 공원','tt0107290'],364:['라이온 킹','tt0110357'],4886:['몬스터 주식회사','tt0198781'],8961:['인크레더블','tt0317705'],50872:['라따뚜이','tt0382932'],72998:['아바타','tt0499549'],5618:['센과 치히로의 행방불명','tt0245429'],89745:['어벤져스','tt0848228'],109374:['그랜드 부다페스트 호텔','tt2278388'],134130:['마션','tt3659388'],106696:['겨울왕국','tt2294629'],4896:['해리 포터와 마법사의 돌','tt0241527']
  };
  for (const [id,[title,imdb]] of Object.entries(aliases)) profiles[id]={title,imdb};
  const DATA=window.RECOLENS_DATA, memory=new Map(), requests=new Map(), failed=new Map();
  // Readability aliases only; no guessed identifiers, cast, or plot are added.
  const displayNames = {
    'Megamind':'메가마인드', 'Kung Fu Panda':'쿵푸팬더', 'Thor':'토르',
    'Watchmen':'왓치맨', 'Robots':'로봇', 'Sneakers':'스니커즈',
    'The Dark Knight Rises':'다크 나이트 라이즈', 'Guardians of the Galaxy':'가디언즈 오브 갤럭시',
    'Captain America: The Winter Soldier':'캡틴 아메리카: 윈터 솔져',
    'The Prestige':'프레스티지', 'Fight Club':'파이트 클럽', 'Pulp Fiction':'펄프 픽션',
    'The Silence of the Lambs':'양들의 침묵',
    'Star Wars: Episode IV - A New Hope':'스타워즈: 새로운 희망',
    'Star Wars: Episode V - The Empire Strikes Back':'스타워즈: 제국의 역습',
    'Star Wars: Episode VI - Return of the Jedi':'스타워즈: 제다이의 귀환',
    'The Lord of the Rings: The Fellowship of the Ring':'반지의 제왕: 반지 원정대',
    'The Lord of the Rings: The Two Towers':'반지의 제왕: 두 개의 탑',
    'The Lord of the Rings: The Return of the King':'반지의 제왕: 왕의 귀환',
    'The Godfather':'대부', 'The Godfather: Part II':'대부 2',
    'Iron Man':'아이언맨', 'Doctor Strange':'닥터 스트레인지',
    'Mad Max: Fury Road':'매드 맥스: 분노의 도로', 'La La Land':'라라랜드',
    'Whiplash':'위플래쉬', 'Finding Dory':'도리를 찾아서',
    'Ratatouille':'라따뚜이', 'Toy Story 2':'토이 스토리 2', 'Toy Story 3':'토이 스토리 3',
    'The Avengers':'어벤져스', 'How to Train Your Dragon':'드래곤 길들이기',
    'Shrek':'슈렉', 'Shrek 2':'슈렉 2', 'Despicable Me':'슈퍼배드',
    'Brave':'메리다와 마법의 숲', 'Moana':'모아나', 'Coco':'코코',
    'The Social Network':'소셜 네트워크', 'The Truman Show':'트루먼 쇼',
    'Memento':'메멘토', 'The Sixth Sense':'식스 센스', 'Se7en':'세븐',
    'Gladiator':'글래디에이터', 'The Departed':'디파티드',
    'Dead Poets Society':'죽은 시인의 사회', 'Good Will Hunting':'굿 윌 헌팅',
    'The Pianist':'피아니스트', 'A Beautiful Mind':'뷰티풀 마인드',
    'Back to the Future':'백 투 더 퓨처', 'E.T. the Extra-Terrestrial':'이티',
    'Titanic':'타이타닉', 'Inglourious Basterds':'바스터즈: 거친 녀석들',
    'Slumdog Millionaire':'슬럼독 밀리어네어', 'The Imitation Game':'이미테이션 게임',
    'The Iron Giant':'아이언 자이언트', 'The Lego Movie':'레고 무비',
    'Tangled':'라푼젤', 'Wreck-It Ralph':'주먹왕 랄프',
    'Monsters University':'몬스터 대학교', 'Hugo':'휴고',
    'Big Fish':'빅 피쉬', 'The Terminal':'터미널',
    'Catch Me If You Can':'캐치 미 이프 유 캔', 'Pirates of the Caribbean: The Curse of the Black Pearl':'캐리비안의 해적: 블랙 펄의 저주'
  };
  for (const movie of DATA.movies) if (displayNames[movie.title]) {
    profiles[movie.id] = {...(profiles[movie.id]||{}), title:displayNames[movie.title]};
  }
  const CACHE_KEY='recolens-v5-movie-cache';
  const ONLINE_KEY='recolens-v5-online';
  const TTL=7*86400000, FAILURE_COOLDOWN=60000;
  const controllers=new Set();
  let online=true, epoch=0;
  try { online=localStorage.getItem(ONLINE_KEY)!=='off'; } catch {}
  const safeURL=value=>{try{const u=new URL(String(value));return u.protocol==='https:'?u.href:'';}catch{return '';}};
  const clean=value=>String(value||'').replace(/<[^>]*>/g,'').trim();
  const cleanTitle=value=>clean(value).replace(/\s*\(\d{4}\)\s*$/,'').replace(/^(.*),\s*(The|A|An)$/i,(_,body,article)=>article+' '+body).trim();
  const titleKey=value=>cleanTitle(value).normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/\b(the|a|an)\b/g,'').replace(/[^\p{L}\p{N}]/gu,'');
  const trimList=value=>(Array.isArray(value)?value:[]).filter(v=>typeof v==='string').slice(0,12).map(clean);
  const validId=id=>/^tt\d{7,10}$/.test(id||'');
  const movieIds=new Set(DATA.movies.map(m=>m.id));
  function cleanCache(item){
    return {imdb:item.imdb,poster:safeURL(item.poster),summary:clean(item.summary).slice(0,1800),cast:trimList(item.cast),
      director:clean(item.director).slice(0,200),runtime:clean(item.runtime).slice(0,30),external:true,
      source:'https://v3-cinemeta.strem.io/meta/movie/'+item.imdb+'.json',cachedAt:item.cachedAt};
  }
  try {
    const cache=JSON.parse(localStorage.getItem(CACHE_KEY)||'[]');
    if(Array.isArray(cache))for(const entry of cache.slice(-100)){
      if(!Array.isArray(entry)||entry.length!==2)continue;
      const [id,item]=entry;
      if(movieIds.has(Number(id))&&item&&validId(item.imdb)&&Number.isFinite(item.cachedAt)&&Date.now()-item.cachedAt>=0&&Date.now()-item.cachedAt<TTL)memory.set(Number(id),cleanCache(item));
    }
  }catch{}
  function get(index){
    const movie=DATA.movies[index];if(!movie)return {};
    const dynamic=memory.get(movie.id)||{},local=profiles[movie.id]||{};
    const failedAt=failed.get(index);
    // Optional exact IMDb ID from official links.csv, never guessed from a title.
    const exactId=validId(movie.imdb)?movie.imdb:undefined;
    return {...dynamic,...local,imdb:local.imdb||exactId||dynamic.imdb,poster:safeURL(dynamic.poster),
      external:!!dynamic.external,loadFailed:!!failedAt&&Date.now()-failedAt<FAILURE_COOLDOWN,loading:requests.has(index)};
  }
  function naver(index){const m=DATA.movies[index],p=get(index);return 'https://search.naver.com/search.naver?query='+encodeURIComponent(`영화 ${p.title||cleanTitle(m.title)} ${m.year}`);}
  function poster(index){if(!online)return '';const p=get(index);return p.poster||(p.imdb?`https://images.metahub.space/poster/medium/${p.imdb}/img`:'');}
  let active=0;const queue=[];
  function schedule(task){return new Promise((resolve,reject)=>{queue.push({task,resolve,reject});pump();});}
  function pump(){
    while(online&&active<3&&queue.length){
      const job=queue.shift();active++;
      Promise.resolve().then(job.task).then(job.resolve,job.reject).finally(()=>{active--;pump();});
    }
  }
  async function json(url,token){
    if(!online||token!==epoch)throw new Error('external connection disabled');
    const controller=new AbortController();controllers.add(controller);
    const timer=setTimeout(()=>controller.abort(),3500);
    try{
      const response=await fetch(url,{signal:controller.signal,credentials:'omit',referrerPolicy:'no-referrer',mode:'cors'});
      if(!response.ok)throw new Error('metadata HTTP '+response.status);
      const body=await response.json();
      if(!online||token!==epoch)throw new Error('stale metadata');
      return body;
    }finally{clearTimeout(timer);controllers.delete(controller);}
  }
  function store(index,meta){
    if(!meta||!validId(meta.id)||meta.type&&meta.type!=='movie')return null;
    const item=cleanCache({imdb:meta.id,poster:meta.poster,summary:meta.description,cast:meta.cast,
      director:trimList(meta.director).join(' · '),runtime:meta.runtime,cachedAt:Date.now()});
    memory.set(DATA.movies[index].id,item);failed.delete(index);
    try{localStorage.setItem(CACHE_KEY,JSON.stringify([...memory].slice(-100)));}catch{}
    return get(index);
  }
  function load(index){
    if(!DATA.movies[index]||!online||navigator.onLine===false)return Promise.resolve(get(index));
    const cached=memory.get(DATA.movies[index].id);
    if(cached&&Date.now()-cached.cachedAt<TTL)return Promise.resolve(get(index));
    if(get(index).loadFailed)return Promise.resolve(get(index));
    if(requests.has(index))return requests.get(index);
    const token=epoch;
    const task=schedule(async()=>{
      try{
        if(!online||token!==epoch)return get(index);
        const movie=DATA.movies[index];let id=get(index).imdb;
        if(!id){
          const response=await json('https://v3-cinemeta.strem.io/catalog/movie/top/search='+encodeURIComponent(cleanTitle(movie.title))+'.json',token);
          const matches=(Array.isArray(response.metas)?response.metas:[]).filter(m=>validId(m.id)&&(!m.type||m.type==='movie')&&Number(String(m.releaseInfo||m.year||'').slice(0,4))===movie.year&&titleKey(m.name)===titleKey(movie.title));
          if(matches.length!==1)throw new Error('unconfirmed film identity');
          id=matches[0].id;
        }
        const response=await json('https://v3-cinemeta.strem.io/meta/movie/'+id+'.json',token);
        if(!response.meta||response.meta.id!==id)throw new Error('film ID mismatch');
        const metaYear=Number(String(response.meta.releaseInfo||'').slice(0,4));
        if(metaYear&&metaYear!==movie.year)throw new Error('film year mismatch');
        if(!store(index,response.meta))throw new Error('invalid metadata');
      }catch{
        if(token===epoch&&online)failed.set(index,Date.now());
      }
      return get(index);
    }).finally(()=>{
      if(requests.get(index)===task)requests.delete(index);
      window.dispatchEvent(new CustomEvent('recolens:metadata',{detail:{index}}));
    });
    requests.set(index,task);return task;
  }
  function setOnline(value){
    online=Boolean(value);epoch++;
    try{localStorage.setItem(ONLINE_KEY,online?'on':'off');}catch{}
    for(const controller of controllers)controller.abort();controllers.clear();
    for(const job of queue.splice(0))job.resolve(null);
    requests.clear();
    if(online){failed.clear();pump();}
  }
  function retry(index){failed.delete(index);memory.delete(DATA.movies[index]?.id);return load(index);}
  window.MovieInfo=Object.freeze({get,load,poster,naver,cleanTitle,titleKey,profiles,safeURL,setOnline,retry,isOnline:()=>online});
})();
