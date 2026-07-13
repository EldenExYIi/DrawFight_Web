(() => {
  'use strict';
  const $=s=>document.querySelector(s), canvas=$('#game'), ctx=canvas.getContext('2d');
  const TAU=Math.PI*2, clamp=(v,a,b)=>Math.max(a,Math.min(b,v)), rand=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
  let W=innerWidth,H=innerHeight,dpr=1,game=null,last=0;
  function resize(){dpr=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;canvas.width=W*dpr;canvas.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0)} addEventListener('resize',resize);resize();

  const rarity={
    common:{label:'普通',color:'#cbd5e1',baseWeight:100,boost:30},
    rare:{label:'稀有',color:'#60a5fa',baseWeight:60,boost:22},
    epic:{label:'史诗',color:'#c084fc',baseWeight:35,boost:16},
    legend:{label:'传说',color:'#fbbf24',baseWeight:18,boost:10}
  };
  const attacks=[
    {id:'bolt',name:'追猎飞矢',icon:'➶',r:'common',kind:'projectile',damage:12,count:1,speed:560,size:5,color:'#67e8f9',desc:'向最近敌人发射高速飞矢。'},
    {id:'knife',name:'回旋飞刀',icon:'◆',r:'common',kind:'spread',damage:9,count:2,speed:480,size:5,color:'#e2e8f0',desc:'向最近敌人投出两把带偏角的飞刀。'},
    {id:'fireball',name:'烈焰弹',icon:'🔥',r:'rare',kind:'projectile',damage:24,count:1,speed:360,size:10,color:'#fb923c',splash:58,desc:'命中后爆炸，对小范围造成伤害。'},
    {id:'frost',name:'霜冻碎片',icon:'❄',r:'common',kind:'spread',damage:8,count:3,speed:410,size:6,color:'#7dd3fc',slow:.55,desc:'三枚冰片降低敌人移动速度。'},
    {id:'lightning',name:'连锁闪电',icon:'ϟ',r:'rare',kind:'chain',damage:17,count:4,color:'#fde047',desc:'在最多4名相邻敌人间跳跃。'},
    {id:'nova',name:'斥力新星',icon:'◎',r:'common',kind:'nova',damage:14,radius:130,color:'#a5b4fc',desc:'以自身为中心释放环形冲击。'},
    {id:'orbit',name:'守护星',icon:'✦',r:'rare',kind:'orbit',damage:10,count:2,radius:76,color:'#f0abfc',desc:'召唤短暂环绕自身的星体。'},
    {id:'meteor',name:'陨星术',icon:'☄',r:'epic',kind:'strike',damage:42,count:2,radius:65,color:'#f97316',desc:'在敌群中降下两颗陨星。'},
    {id:'mine',name:'符文地雷',icon:'⌾',r:'common',kind:'mine',damage:30,count:1,radius:70,color:'#34d399',desc:'脚下留下延时爆炸的符文。'},
    {id:'laser',name:'棱镜光束',icon:'━',r:'epic',kind:'beam',damage:30,count:1,color:'#f472b6',desc:'贯穿最近敌人方向的一条直线。'},
    {id:'boomerang',name:'月轮',icon:'☾',r:'rare',kind:'radial',damage:12,count:5,speed:330,size:7,color:'#ddd6fe',desc:'向四周掷出穿透月轮。'},
    {id:'holy',name:'圣光裁决',icon:'✚',r:'rare',kind:'strike',damage:28,count:3,radius:42,color:'#fef08a',desc:'随机裁决三名敌人。'},
    {id:'poison',name:'剧毒孢子',icon:'♣',r:'common',kind:'cloud',damage:4,count:1,radius:90,color:'#84cc16',desc:'制造持续伤害的毒云。'},
    {id:'spear',name:'虚空长枪',icon:'↟',r:'epic',kind:'beam',damage:46,count:1,color:'#8b5cf6',desc:'超长距离贯穿攻击。'},
    {id:'saw',name:'齿轮锯片',icon:'✺',r:'rare',kind:'orbit',damage:15,count:3,radius:108,color:'#94a3b8',desc:'三枚锯片短暂环绕切割敌人。'},
    {id:'blackhole',name:'微型黑洞',icon:'●',r:'legend',kind:'cloud',damage:9,count:1,radius:125,color:'#a78bfa',pull:true,desc:'吸引敌人并持续造成伤害。'},
    {id:'cards',name:'千刃牌阵',icon:'▰',r:'epic',kind:'radial',damage:13,count:10,speed:500,size:5,color:'#fb7185',desc:'向所有方向发射十张利刃卡。'},
    {id:'dragon',name:'龙息',icon:'♨',r:'epic',kind:'cone',damage:8,count:7,speed:300,size:11,color:'#ef4444',desc:'朝敌群喷吐扇形火焰。'},
    {id:'judgement',name:'天罚之钟',icon:'♛',r:'legend',kind:'nova',damage:65,radius:230,color:'#facc15',desc:'巨大的圣光冲击横扫周围。'},
    {id:'echo',name:'抽牌回响',icon:'∞',r:'legend',kind:'echo',damage:0,count:1,color:'#22d3ee',desc:'立刻复制上一次抽到的攻击。'}
  ];
  const passives=[
    {id:'haste',name:'疾速洗牌',icon:'⏱',r:'common',desc:'攻击间隔 -10%',max:6,apply:g=>g.p.interval*=.9},
    {id:'power',name:'锋利牌缘',icon:'⚔',r:'common',desc:'所有伤害 +15%',max:6,apply:g=>g.p.damage*=1.15},
    {id:'vital',name:'猩红筹码',icon:'♥',r:'common',desc:'最大生命 +20，并恢复20',max:5,apply:g=>{g.p.maxHp+=20;g.p.hp=Math.min(g.p.maxHp,g.p.hp+20)}},
    {id:'stride',name:'风行靴',icon:'➟',r:'common',desc:'移动速度 +10%',max:5,apply:g=>g.p.speed*=1.1},
    {id:'magnet',name:'经验磁石',icon:'🧲',r:'common',desc:'拾取范围 +35%',max:5,apply:g=>g.p.magnet*=1.35},
    {id:'armor',name:'铁壁协议',icon:'⬟',r:'rare',desc:'受到的伤害 -10%',max:5,apply:g=>g.p.armor=Math.min(.6,g.p.armor+.1)},
    {id:'multidraw',name:'双重抽取',icon:'Ⅱ',r:'epic',desc:'每轮额外抽取1张攻击',max:3,apply:g=>g.p.draws++},
    {id:'repeat',name:'连抽法则',icon:'↻',r:'rare',desc:'20%概率重复本轮抽到的攻击',max:4,apply:g=>g.p.repeat+=.2},
    {id:'luck',name:'金色票根',icon:'☘',r:'rare',desc:'提高高稀有度选项概率',max:4,apply:g=>g.p.luck++},
    {id:'pierce',name:'穿透墨水',icon:'⇥',r:'rare',desc:'投射物额外穿透1名敌人',max:4,apply:g=>g.p.pierce++},
    {id:'area',name:'扩写符文',icon:'◉',r:'common',desc:'范围与弹体尺寸 +12%',max:6,apply:g=>g.p.area*=1.12},
    {id:'crit',name:'王王牌面',icon:'★',r:'epic',desc:'暴击率 +10%（暴击造成2倍伤害）',max:5,apply:g=>g.p.crit+=.1},
    {id:'heal',name:'生命回收',icon:'✚',r:'rare',desc:'击杀时1.5%概率恢复1生命',max:5,apply:g=>g.p.healChance+=.015},
    {id:'reroll',name:'弃牌重抽',icon:'⟳',r:'epic',desc:'每次升级获得1次免费刷新',max:3,apply:g=>g.p.rerolls++},
    {id:'execute',name:'终局裁定',icon:'☠',r:'legend',desc:'对生命低于15%的非Boss敌人直接斩杀',max:1,apply:g=>g.p.execute=.15}
  ];
  const attackMap=Object.fromEntries(attacks.map(a=>[a.id,a]));

  function newGame(){
    return {running:true,paused:false,choosing:false,ended:false,time:0,duration:1800,timeScale:1,kills:0,bosses:0,bossKills:0,lastAttack:0,lastSpawn:0,screenShake:0,warning:0,
      p:{x:W/2,y:H/2,r:14,hp:100,maxHp:100,speed:235,interval:1.1,damage:1,magnet:130,armor:0,draws:2,repeat:0,luck:0,pierce:0,area:1,crit:.05,healChance:0,rerolls:0,execute:0,inv:0,level:1,xp:0,nextXp:5},
      deck:[{id:'bolt',weight:rarity.common.baseWeight,level:1},{id:'nova',weight:rarity.common.baseWeight,level:1}],passiveLevels:{},enemies:[],shots:[],effects:[],gems:[],particles:[],texts:[],keys:{},lastCard:null,lastHand:[],pendingLevels:0,upgradeOptions:[]};
  }
  function start(){game=newGame();$('#resultModal').classList.add('hidden');last=performance.now();updateHud();requestAnimationFrame(loop)}
  $('#againBtn').onclick=()=>{location.href='../../index.html'};
  addEventListener('keydown',e=>{if(!game)return;const key=e.key.toLowerCase();game.keys[key]=true;if(key==='escape'&&!e.repeat){e.preventDefault();togglePause()}if(game.choosing&&['1','2','3'].includes(e.key))chooseUpgrade(+e.key-1)});
  addEventListener('keyup',e=>{if(game)game.keys[e.key.toLowerCase()]=false});
  function togglePause(){if(!game||game.choosing||game.ended)return;game.paused=!game.paused;if(game.paused)renderPauseSlots();$('#pauseModal').classList.toggle('hidden',!game.paused);$('#pauseBtn').textContent=game.paused?'继续':'暂停'}
  function renderPauseSlots(){const hand=game.lastHand;$('#pauseDrawMeta').textContent=`${game.p.draws} SLOTS`;$('#pauseSlots').innerHTML=Array.from({length:game.p.draws},(_,i)=>{const item=hand[i],a=item?.drawn,rank=a?rarity[a.r]:null;return `<div class="pause-slot" style="--slot-color:${rank?.color||'#334155'}"><div class="slot-number">SLOT ${String(i+1).padStart(2,'0')}</div><div class="slot-icon">${a?.icon||'◇'}</div><b style="color:${rank?.color||'#64748b'}">${a?.name||'等待抽取'}</b></div>`}).join('')}
  $('#pauseBtn').onclick=togglePause;$('#resumeBtn').onclick=togglePause;$('#speedBtn').onclick=()=>{if(!game)return;game.timeScale=game.timeScale===1?3:game.timeScale===3?6:1;$('#speedBtn').textContent='时间 ×'+game.timeScale};

  function enemyAtEdge(type='normal'){
    const side=Math.floor(Math.random()*4),pad=45;let x,y;if(side===0){x=rand(-pad,W+pad);y=-pad}else if(side===1){x=W+pad;y=rand(-pad,H+pad)}else if(side===2){x=rand(-pad,W+pad);y=H+pad}else{x=-pad;y=rand(-pad,H+pad)}
    const minute=game.time/60,boss=type==='boss',elite=type==='elite',threat=Math.floor(minute/5),growth=Math.pow(1.06,minute);
    const baseHp=boss?1150+minute*250:elite?100+minute*28:16+minute*7,hp=baseHp*growth*(1+threat*(boss?.12:.2));
    const speed=(boss?54:elite?70:rand(55,88))+minute*(boss?1:elite?1.5:1.25),damage=(boss?27+minute*1.1:elite?16+minute*.75:9+minute*.48)*(1+threat*.06);
    game.enemies.push({x,y,r:boss?34:elite?22:rand(10,16),hp,maxHp:hp,speed,damage,color:boss?'#e11d48':elite?'#f97316':pick(['#475569','#4c1d95','#14532d','#7f1d1d']),boss,elite,slow:1,hit:0,phase:Math.random()*TAU});
  }
  function spawnBoss(){enemyAtEdge('boss');game.bosses++;for(let i=0;i<4+game.bosses*2;i++)enemyAtEdge(i%5===0?'elite':'normal');game.warning=3;$('#bossWarning').textContent=`⚠ 第 ${game.bosses} 位牌局守门人率领增援降临`;$('#bossWarning').classList.remove('hidden');game.screenShake=12}
  function update(dt){
    const g=game,p=g.p;g.time+=dt;
    if(Math.floor((g.time-dt)/300)<Math.floor(g.time/300)&&g.time<g.duration+.1)spawnBoss();
    if(g.time>=g.duration){end(true);return}
    g.warning-=dt;if(g.warning<=0)$('#bossWarning').classList.add('hidden');
    let dx=(g.keys.d||g.keys.arrowright?1:0)-(g.keys.a||g.keys.arrowleft?1:0),dy=(g.keys.s||g.keys.arrowdown?1:0)-(g.keys.w||g.keys.arrowup?1:0);if(dx||dy){const l=Math.hypot(dx,dy);p.x+=dx/l*p.speed*dt;p.y+=dy/l*p.speed*dt}p.x=clamp(p.x,p.r,W-p.r);p.y=clamp(p.y,p.r,H-p.r);p.inv-=dt;
    const spawnRate=Math.max(.13,.78-g.time/2100);g.lastSpawn+=dt;while(g.lastSpawn>spawnRate){g.lastSpawn-=spawnRate;enemyAtEdge(Math.random()<Math.min(.18,.02+g.time/4200)?'elite':'normal')}
    g.lastAttack+=dt;while(g.lastAttack>=p.interval){g.lastAttack-=p.interval;drawRound()}
    updateEnemies(dt);updateShots(dt);updateEffects(dt);updateGems(dt);updateParticles(dt);g.screenShake=Math.max(0,g.screenShake-dt*18);
  }
  function drawRound(){
    const hand=[],used=new Set();
    for(let i=0;i<game.p.draws;i++){
      let pool=game.deck.filter(d=>!used.has(d.id));
      if(!pool.length){used.clear();pool=game.deck}
      const result=drawCard(pool),repeated=Math.random()<game.p.repeat;
      used.add(result.drawn.id);cast(result.attack);if(repeated)cast(result.attack);
      hand.push({...result,repeated});
    }
    showDrawHand(hand);
  }
  function drawCard(pool){const total=pool.reduce((s,c)=>s+c.weight,0);let n=Math.random()*total,c=pool[0];for(const d of pool){n-=d.weight;if(n<=0){c=d;break}}const drawn=attackMap[c.id];let attack=drawn;if(drawn.kind==='echo'&&game.lastCard&&game.lastCard.kind!=='echo')attack=game.lastCard;else if(drawn.kind!=='echo')game.lastCard=drawn;return {drawn,attack}}
  function showDrawHand(hand){game.lastHand=hand;const el=$('#drawHand');el.innerHTML=hand.map((item,i)=>{const a=item.drawn,rank=rarity[a.r],copy=item.attack!==a?` → ${item.attack.icon}`:'';return `<div class="hand-card${item.repeated?' repeat':''}" style="--card-color:${rank.color};animation-delay:${i*.045}s"><span>${a.icon}${copy}</span><b>${a.name}</b></div>`}).join('')}
  function nearest(x=game.p.x,y=game.p.y){let b=null,bd=Infinity;for(const e of game.enemies){const d=(e.x-x)**2+(e.y-y)**2;if(d<bd){bd=d;b=e}}return b}
  function damageValue(a,scale=1){let d=a.damage*game.p.damage*scale;if(Math.random()<game.p.crit){d*=2;addText(game.p.x,game.p.y-35,'暴击!','#fde047')}return d}
  function projectile(a,angle,x=game.p.x,y=game.p.y,extra={}){game.shots.push({x,y,vx:Math.cos(angle)*(a.speed||420),vy:Math.sin(angle)*(a.speed||420),r:(a.size||5)*game.p.area,damage:damageValue(a),color:a.color,life:3,pierce:game.p.pierce+(a.kind==='radial'?1:0),slow:a.slow||0,splash:a.splash? a.splash*game.p.area:0,...extra})}
  function cast(a){const p=game.p,t=nearest();if(!t&&a.kind!=='mine'&&a.kind!=='nova'&&a.kind!=='orbit')return;const ang=t?Math.atan2(t.y-p.y,t.x-p.x):0, area=p.area;
    if(a.kind==='projectile')for(let i=0;i<a.count;i++)projectile(a,ang+(i-(a.count-1)/2)*.1);
    else if(a.kind==='spread')for(let i=0;i<a.count;i++)projectile(a,ang+(i-(a.count-1)/2)*.18);
    else if(a.kind==='radial')for(let i=0;i<a.count;i++)projectile(a,i/a.count*TAU);
    else if(a.kind==='cone')for(let i=0;i<a.count;i++)projectile(a,ang+rand(-.5,.5),p.x,p.y,{life:1.3});
    else if(a.kind==='nova')effect({kind:'nova',x:p.x,y:p.y,r:0,max:a.radius*area,life:.45,total:.45,damage:damageValue(a),color:a.color,hit:new Set()});
    else if(a.kind==='strike')for(let i=0;i<a.count;i++){const e=pick(game.enemies);if(e)effect({kind:'strike',x:e.x+rand(-20,20),y:e.y+rand(-20,20),r:a.radius*area,life:.55,total:.55,damage:damageValue(a),color:a.color,hit:new Set()})}
    else if(a.kind==='mine')effect({kind:'mine',x:p.x,y:p.y,r:a.radius*area,life:4,total:4,damage:damageValue(a),color:a.color,hit:new Set()});
    else if(a.kind==='cloud'){const e=t||p;effect({kind:'cloud',x:e.x,y:e.y,r:a.radius*area,life:4,total:4,damage:damageValue(a),color:a.color,pull:a.pull,tick:0})}
    else if(a.kind==='orbit')for(let i=0;i<a.count;i++)effect({kind:'orbit',x:p.x,y:p.y,r:12*area,orbit:a.radius*area,angle:i/a.count*TAU,life:4,total:4,damage:damageValue(a),color:a.color,tick:0});
    else if(a.kind==='beam')effect({kind:'beam',x:p.x,y:p.y,angle:ang,width:(a.id==='spear'?18:11)*area,length:a.id==='spear'?W*1.2:Math.max(W,H),life:.28,total:.28,damage:damageValue(a),color:a.color,hit:new Set()});
    else if(a.kind==='chain'){let cur=t,used=new Set();for(let i=0;i<a.count&&cur;i++){used.add(cur);hurt(cur,damageValue(a,Math.pow(.85,i)));const next=game.enemies.filter(e=>!used.has(e)&&Math.hypot(e.x-cur.x,e.y-cur.y)<190*area).sort((x,y)=>Math.hypot(x.x-cur.x,x.y-cur.y)-Math.hypot(y.x-cur.x,y.y-cur.y))[0];effect({kind:'line',x:cur.x,y:cur.y,x2:next?next.x:p.x,y2:next?next.y:p.y,life:.18,total:.18,color:a.color});cur=next}}
  }
  function effect(o){game.effects.push(o)}
  function updateEnemies(dt){const p=game.p;for(let i=game.enemies.length-1;i>=0;i--){const e=game.enemies[i];e.hit-=dt;e.slow+=(1-e.slow)*dt*.45;const a=Math.atan2(p.y-e.y,p.x-e.x);e.x+=Math.cos(a)*e.speed*e.slow*dt;e.y+=Math.sin(a)*e.speed*e.slow*dt;if(Math.hypot(e.x-p.x,e.y-p.y)<e.r+p.r&&p.inv<=0){p.hp-=e.damage*(1-p.armor);p.inv=.65;game.screenShake=8;addText(p.x,p.y-24,`-${Math.ceil(e.damage*(1-p.armor))}`,'#fb7185');if(p.hp<=0){end(false);return}}}}
  function updateShots(dt){for(let i=game.shots.length-1;i>=0;i--){const s=game.shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;let remove=s.life<=0||s.x<-100||s.x>W+100||s.y<-100||s.y>H+100;for(const e of game.enemies){if(e.hp>0&&Math.hypot(s.x-e.x,s.y-e.y)<s.r+e.r){hurt(e,s.damage);if(s.slow)e.slow=Math.min(e.slow,s.slow);if(s.splash){for(const o of game.enemies)if(Math.hypot(o.x-e.x,o.y-e.y)<s.splash)hurt(o,s.damage*.55);burst(e.x,e.y,s.color,12)}s.pierce--;if(s.pierce<0){remove=true;break}}}if(remove)game.shots.splice(i,1)}}
  function updateEffects(dt){const p=game.p;for(let i=game.effects.length-1;i>=0;i--){const f=game.effects[i];f.life-=dt;if(f.kind==='nova'){f.r=f.max*(1-f.life/f.total);for(const e of game.enemies)if(!f.hit.has(e)&&Math.hypot(e.x-f.x,e.y-f.y)<f.r+e.r){f.hit.add(e);hurt(e,f.damage)}}
    else if(f.kind==='strike'&&f.life<f.total*.45){for(const e of game.enemies)if(!f.hit.has(e)&&Math.hypot(e.x-f.x,e.y-f.y)<f.r+e.r){f.hit.add(e);hurt(e,f.damage)}}
    else if(f.kind==='mine'&&f.life<.28){for(const e of game.enemies)if(!f.hit.has(e)&&Math.hypot(e.x-f.x,e.y-f.y)<f.r+e.r){f.hit.add(e);hurt(e,f.damage)}}
    else if(f.kind==='cloud'){f.tick-=dt;if(f.pull)for(const e of game.enemies){const d=Math.hypot(e.x-f.x,e.y-f.y);if(d<f.r*1.8&&d>8){e.x+=(f.x-e.x)/d*45*dt;e.y+=(f.y-e.y)/d*45*dt}}if(f.tick<=0){f.tick=.35;for(const e of game.enemies)if(Math.hypot(e.x-f.x,e.y-f.y)<f.r+e.r)hurt(e,f.damage)}}
    else if(f.kind==='orbit'){f.angle+=dt*3.4;f.x=p.x+Math.cos(f.angle)*f.orbit;f.y=p.y+Math.sin(f.angle)*f.orbit;f.tick-=dt;if(f.tick<=0){f.tick=.18;for(const e of game.enemies)if(Math.hypot(e.x-f.x,e.y-f.y)<f.r+e.r)hurt(e,f.damage)}}
    else if(f.kind==='beam'){for(const e of game.enemies)if(!f.hit.has(e)&&pointLine(e.x,e.y,f.x,f.y,f.x+Math.cos(f.angle)*f.length,f.y+Math.sin(f.angle)*f.length)<e.r+f.width){f.hit.add(e);hurt(e,f.damage)}}
    if(f.life<=0)game.effects.splice(i,1)}}
  function pointLine(px,py,x1,y1,x2,y2){const l2=(x2-x1)**2+(y2-y1)**2,t=clamp(((px-x1)*(x2-x1)+(py-y1)*(y2-y1))/l2,0,1);return Math.hypot(px-(x1+t*(x2-x1)),py-(y1+t*(y2-y1)))}
  function hurt(e,d){if(!e||e.hp<=0)return;if(game.p.execute&&!e.boss&&e.hp/e.maxHp<game.p.execute)d=e.hp+1;e.hp-=d;e.hit=.08;addText(e.x,e.y-e.r,Math.round(d),d>40?'#fde047':'#fff');if(e.hp<=0)kill(e)}
  function kill(e){const i=game.enemies.indexOf(e);if(i<0)return;game.enemies.splice(i,1);game.kills++;if(e.boss){game.bossKills++;game.p.draws++;game.warning=4;$('#bossWarning').textContent=`Boss击败 · 抽取槽 +1 · 每轮 ${game.p.draws} 张`;$('#bossWarning').classList.remove('hidden')}const count=e.boss?18:e.elite?4:1;for(let n=0;n<count;n++)game.gems.push({x:e.x+rand(-10,10),y:e.y+rand(-10,10),r:e.boss?6:4,value:e.boss?3:e.elite?2:1,color:e.boss?'#fbbf24':'#38bdf8'});if(Math.random()<game.p.healChance){game.p.hp=Math.min(game.p.maxHp,game.p.hp+1)}burst(e.x,e.y,e.color,e.boss?35:9)}
  function updateGems(dt){const p=game.p;for(let i=game.gems.length-1;i>=0;i--){const o=game.gems[i],d=Math.hypot(o.x-p.x,o.y-p.y);if(d<p.magnet*2.2){const s=d<p.magnet?650:220;o.x+=(p.x-o.x)/Math.max(d,1)*s*dt;o.y+=(p.y-o.y)/Math.max(d,1)*s*dt}if(d<p.r+8){gainXp(o.value);game.gems.splice(i,1)}}}
  function gainXp(v){const p=game.p;p.xp+=v;while(p.xp>=p.nextXp){p.xp-=p.nextXp;p.level++;p.nextXp=Math.floor(6+p.level*2.7);game.pendingLevels++}if(game.pendingLevels&&!game.choosing)openUpgrade()}
  function weightedRarity(luck){const n=Math.random();return n<.02+luck*.018?'legend':n<.12+luck*.035?'epic':n<.38+luck*.05?'rare':'common'}
  function optionPool(){const target=weightedRarity(game.p.luck),owned=new Map(game.deck.map(d=>[d.id,d]));let pool=[];for(const a of attacks){let score=a.r===target?8:rarityDistance(a.r,target)===1?3:1;pool.push({kind:'attack',data:a,score,owned:owned.get(a.id)})}for(const p of passives){const lv=game.passiveLevels[p.id]||0;if(lv<p.max)pool.push({kind:'passive',data:p,score:p.r===target?8:rarityDistance(p.r,target)===1?3:1,level:lv})}return pool}
  function rarityDistance(a,b){return Math.abs(['common','rare','epic','legend'].indexOf(a)-['common','rare','epic','legend'].indexOf(b))}
  function openUpgrade(){game.choosing=true;game.upgradeOptions=[];let pool=optionPool();for(let n=0;n<3;n++){let sum=pool.reduce((s,o)=>s+o.score,0),r=Math.random()*sum,chosen=pool[0];for(const o of pool){r-=o.score;if(r<=0){chosen=o;break}}game.upgradeOptions.push(chosen);pool=pool.filter(o=>o.data.id!==chosen.data.id)}renderChoices();$('#levelModal').classList.remove('hidden')}
  function renderChoices(){const box=$('#choices'),slot=$('#rerollSlot');box.innerHTML='';slot.innerHTML='';game.upgradeOptions.forEach((o,i)=>{const d=o.data,owned=o.kind==='attack'&&o.owned,rank=rarity[d.r],nextWeight=owned?owned.weight+rank.boost:rank.baseWeight;const b=document.createElement('button');b.className='choice';b.innerHTML=`<div class="bigicon">${d.icon}</div><div class="type rarity-${d.r}">${rank.label} · ${o.kind==='attack'?'攻击卡':'被动技能'}</div><h3>${d.name}</h3><p>${d.desc}</p><div class="effect">${o.kind==='attack'?(owned?`强化：权重 ${owned.weight} → ${nextWeight}`:`加入攻击池 · 初始权重 ${nextWeight}`):`等级 ${o.level+1} / ${d.max}`}　<span style="float:right">[${i+1}]</span></div>`;b.onclick=()=>chooseUpgrade(i);box.appendChild(b)});if(game.p.rerolls>0){const re=document.createElement('button');re.textContent=`⟳ 免费刷新（剩余 ${game.p.rerolls}）`;re.className='primary';re.style.cssText='display:block;margin:18px auto 0';re.onclick=()=>{game.p.rerolls--;openUpgrade()};slot.appendChild(re)}}
  function chooseUpgrade(i){const o=game.upgradeOptions[i];if(!o)return;if(o.kind==='attack'){const own=game.deck.find(d=>d.id===o.data.id),rank=rarity[o.data.r];if(own){own.weight+=rank.boost;own.level++}else game.deck.push({id:o.data.id,weight:rank.baseWeight,level:1})}else{game.passiveLevels[o.data.id]=(game.passiveLevels[o.data.id]||0)+1;o.data.apply(game)}game.pendingLevels--;game.choosing=false;$('#levelModal').classList.add('hidden');if(game.pendingLevels)setTimeout(openUpgrade,120);updateHud()}
  function addText(x,y,text,color){game.texts.push({x,y,text,color,life:.65,total:.65})}function burst(x,y,color,n){for(let i=0;i<n;i++){const a=Math.random()*TAU,s=rand(30,160);game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,r:rand(1,4),color,life:rand(.3,.8),total:.8})}}
  function updateParticles(dt){for(let i=game.particles.length-1;i>=0;i--){const p=game.particles[i];p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.96;p.vy*=.96;p.life-=dt;if(p.life<=0)game.particles.splice(i,1)}for(let i=game.texts.length-1;i>=0;i--){const t=game.texts[i];t.y-=32*dt;t.life-=dt;if(t.life<=0)game.texts.splice(i,1)}}
  function draw(){ctx.save();const sx=game?rand(-game.screenShake,game.screenShake):0,sy=game?rand(-game.screenShake,game.screenShake):0;ctx.translate(sx,sy);ctx.fillStyle='#050914';ctx.fillRect(-20,-20,W+40,H+40);drawGrid();if(!game){ctx.restore();return}for(const g of game.gems)drawGem(g);for(const f of game.effects)drawEffect(f);for(const s of game.shots){ctx.shadowBlur=14;ctx.shadowColor=s.color;ctx.fillStyle=s.color;ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,TAU);ctx.fill();ctx.shadowBlur=0}for(const e of game.enemies)drawEnemy(e);for(const p of game.particles){ctx.globalAlpha=clamp(p.life/p.total,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.r,p.r)}ctx.globalAlpha=1;drawPlayer();for(const t of game.texts){ctx.globalAlpha=t.life/t.total;ctx.fillStyle=t.color;ctx.font='bold 12px system-ui';ctx.textAlign='center';ctx.fillText(t.text,t.x,t.y)}ctx.globalAlpha=1;ctx.restore()}
  function drawGrid(){const s=56,ox=game?(-game.p.x*.06)%s:0,oy=game?(-game.p.y*.06)%s:0;ctx.strokeStyle='#12203a';ctx.lineWidth=1;ctx.beginPath();for(let x=ox;x<W;x+=s){ctx.moveTo(x,0);ctx.lineTo(x,H)}for(let y=oy;y<H;y+=s){ctx.moveTo(0,y);ctx.lineTo(W,y)}ctx.stroke();const grd=ctx.createRadialGradient(W/2,H/2,0,W/2,H/2,Math.max(W,H)*.75);grd.addColorStop(0,'#16284655');grd.addColorStop(1,'#02040dcc');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H)}
  function drawPlayer(){const p=game.p;ctx.save();ctx.translate(p.x,p.y);if(p.inv>0&&Math.floor(p.inv*15)%2)ctx.globalAlpha=.35;ctx.shadowBlur=26;ctx.shadowColor='#22d3ee';ctx.fillStyle='#e0f2fe';ctx.beginPath();ctx.arc(0,0,p.r,0,TAU);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='#0e7490';ctx.beginPath();ctx.arc(0,0,7,0,TAU);ctx.fill();ctx.strokeStyle='#67e8f9';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,p.r+6,-Math.PI/2,-Math.PI/2+TAU*(1-game.lastAttack/p.interval));ctx.stroke();ctx.restore()}
  function drawEnemy(e){ctx.save();ctx.translate(e.x,e.y);ctx.shadowBlur=e.boss?22:0;ctx.shadowColor=e.color;ctx.fillStyle=e.hit>0?'#fff':e.color;ctx.beginPath();const points=e.boss?8:e.elite?6:5;for(let i=0;i<points*2;i++){const a=i/(points*2)*TAU+e.phase,r=i%2?e.r*.75:e.r;ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r)}ctx.closePath();ctx.fill();ctx.shadowBlur=0;if(e.hp<e.maxHp){ctx.fillStyle='#1f2937';ctx.fillRect(-e.r,e.r+7,e.r*2,4);ctx.fillStyle=e.boss?'#fb7185':'#f97316';ctx.fillRect(-e.r,e.r+7,e.r*2*clamp(e.hp/e.maxHp,0,1),4)}ctx.restore()}
  function drawGem(g){ctx.save();ctx.translate(g.x,g.y);ctx.rotate(performance.now()/500);ctx.fillStyle=g.color;ctx.shadowBlur=12;ctx.shadowColor=g.color;ctx.beginPath();ctx.moveTo(0,-g.r);ctx.lineTo(g.r,0);ctx.lineTo(0,g.r);ctx.lineTo(-g.r,0);ctx.closePath();ctx.fill();ctx.restore()}
  function drawEffect(f){ctx.save();ctx.globalAlpha=clamp(f.life/f.total,0,1);ctx.strokeStyle=f.color;ctx.fillStyle=f.color;ctx.shadowBlur=18;ctx.shadowColor=f.color;if(f.kind==='nova'){ctx.lineWidth=7;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.stroke()}else if(f.kind==='strike'){const ready=f.life<f.total*.45;ctx.globalAlpha=ready?.5:.25;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.fill();ctx.globalAlpha=1;ctx.lineWidth=ready?9:2;ctx.beginPath();ctx.moveTo(f.x,f.y-200);ctx.lineTo(f.x,f.y);ctx.stroke()}else if(f.kind==='mine'){ctx.globalAlpha=f.life<.28?.7:.25;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.fill();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(f.x,f.y,12+Math.sin(f.life*8)*5,0,TAU);ctx.stroke()}else if(f.kind==='cloud'){ctx.globalAlpha=.18+Math.sin(f.life*5)*.04;ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.fill();ctx.globalAlpha=.7;ctx.setLineDash([5,8]);ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.stroke()}else if(f.kind==='orbit'){ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,TAU);ctx.fill()}else if(f.kind==='beam'){ctx.globalAlpha=f.life/f.total;ctx.lineWidth=f.width*2;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x+Math.cos(f.angle)*f.length,f.y+Math.sin(f.angle)*f.length);ctx.stroke()}else if(f.kind==='line'){ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(f.x,f.y);ctx.lineTo(f.x2,f.y2);ctx.stroke()}ctx.restore()}
  function updateHud(){if(!game)return;const p=game.p;$('#hpText').textContent=`${Math.ceil(p.hp)} / ${p.maxHp}`;$('#hpFill').style.width=`${clamp(p.hp/p.maxHp*100,0,100)}%`;$('#levelText').textContent=`等级 ${p.level}`;$('#xpText').textContent=`${p.xp} / ${p.nextXp}`;$('#xpFill').style.width=`${p.xp/p.nextXp*100}%`;const remain=Math.max(0,game.duration-game.time),m=Math.floor(remain/60),s=Math.floor(remain%60);$('#clock').textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;const next=Math.min(30,(Math.floor(game.time/300)+1)*5),nr=Math.max(0,next*60-game.time);$('#nextBoss').textContent=next>=30&&game.time>=1500?'最终Boss已在路上':`下一Boss ${String(Math.floor(nr/60)).padStart(2,'0')}:${String(Math.floor(nr%60)).padStart(2,'0')}`;$('#stats').innerHTML=`<div class="stats-row"><span>击败</span><b>${game.kills}</b></div><div class="stats-row"><span>威胁等级</span><b>${1+Math.floor(game.time/300)}</b></div><div class="stats-row"><span>攻击间隔</span><b>${p.interval.toFixed(2)}s</b></div><div class="stats-row"><span>抽取槽位</span><b>${p.draws} 个</b></div>`;const total=game.deck.reduce((a,b)=>a+b.weight,0);$('#deckTotal').textContent=`${game.deck.length}种 · ${total}权重`;$('#deckList').innerHTML=game.deck.slice().sort((a,b)=>b.weight-a.weight).map(d=>{const a=attackMap[d.id],rank=rarity[a.r];return `<div class="deck-card"><div class="deck-icon">${a.icon}</div><div class="deck-name"><b style="color:${rank.color}">${a.name}</b><span>${rank.label} · 权重 ${d.weight}</span></div><div class="deck-prob">${(d.weight/total*100).toFixed(1)}%</div></div>`}).join('')}
  function end(win){if(!game||game.ended)return;game.ended=true;game.running=false;$('#resultModal').classList.remove('hidden');$('#resultEyebrow').textContent=win?'牌局已征服':'牌局结束';$('#resultTitle').textContent=win?'生存成功':'再接再厉';$('#resultStats').innerHTML=`坚持时间 <b>${Math.floor(game.time/60)}分${Math.floor(game.time%60)}秒</b><br>等级 <b>${game.p.level}</b> · 击败 <b>${game.kills}</b> · Boss <b>${game.bossKills}</b><br>最终攻击池：<b>${game.deck.length} 种攻击</b> · 每轮 <b>${game.p.draws} 张</b>`}
  function loop(now){if(!game)return;const raw=Math.min(.04,(now-last)/1000||0);last=now;if(game.running&&!game.paused&&!game.choosing){const scaled=raw*game.timeScale;const steps=Math.ceil(scaled/.025);for(let i=0;i<steps;i++)update(scaled/steps)}draw();updateHud();if(game&&!game.ended)requestAnimationFrame(loop)}
  draw();start();
})();
