
/* WHAD / Journey-to-Degen — polished site script
 - bg stars, coin particle canvas, chart->crash->rain sequence
 - minimal dependencies, uses CoinGecko for logos + price
*/

const bgCanvas = document.getElementById('bgCanvas');
const coinCanvas = document.getElementById('coinCanvas');
const chartCanvas = document.getElementById('chartCanvas');
const bg = bgCanvas.getContext('2d');
const coinCtx = coinCanvas.getContext('2d');
const chartCtx = chartCanvas.getContext('2d');

const solValue = document.getElementById('solValue');
const dontClick = document.getElementById('dontClick');
const tooLate = document.getElementById('tooLate');
const whad = document.getElementById('whad');

function resize(){ [bgCanvas, coinCanvas, chartCanvas].forEach(c=>{ c.width=window.innerWidth; c.height=window.innerHeight; }); }
window.addEventListener('resize', resize);
resize();

/* Background: subtle moving stars */
let stars = [];
for(let i=0;i<160;i++) stars.push({ x: Math.random()*bgCanvas.width, y: Math.random()*bgCanvas.height, r: Math.random()*1.4, vx: (Math.random()-0.5)*0.1, vy: (Math.random()*0.2)+0.02 });
function drawBG(){
  bg.clearRect(0,0,bgCanvas.width,bgCanvas.height);
  // soft nebula glows
  for(let g=0; g<6; g++){
    const gx = (g%2===0) ? bgCanvas.width*0.2 : bgCanvas.width*0.8;
    const gy = (g%3===0) ? bgCanvas.height*0.15 : bgCanvas.height*0.75;
    const r = 200 + (g*80);
    const grad = bg.createRadialGradient(gx, gy, r*0.02, gx, gy, r);
    grad.addColorStop(0, 'rgba(0,255,210,0.06)');
    grad.addColorStop(0.6, 'rgba(0,30,40,0.02)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    bg.fillStyle = grad;
    bg.beginPath();
    bg.arc(gx, gy, r, 0, Math.PI*2);
    bg.fill();
  }
  // stars
  stars.forEach(s=>{
    s.x += s.vx; s.y += s.vy;
    if(s.x < 0) s.x = bgCanvas.width;
    if(s.x > bgCanvas.width) s.x = 0;
    if(s.y > bgCanvas.height) s.y = 0;
    bg.globalAlpha = 0.9;
    bg.fillStyle = 'rgba(255,255,255,0.8)';
    bg.beginPath();
    bg.arc(s.x, s.y, s.r, 0, Math.PI*2);
    bg.fill();
  });
  bg.globalAlpha = 1;
  requestAnimationFrame(drawBG);
}
drawBG();

/* coin particles and stacking logic (used during rain) */
let logoSources = [];
let coins = [];
let settled = [];
const totalRain = 100;

class Coin {
  constructor(src){
    this.src = src;
    this.img = new Image();
    this.img.crossOrigin = 'anonymous';
    this.img.src = src;
    this.size = 18 + Math.random()*34;
    this.x = Math.random()*(coinCanvas.width*0.9) + coinCanvas.width*0.05;
    this.y = -Math.random()*900 - 20;
    this.vy = Math.random()*0.6 + 0.6;
    this.vx = (Math.random()-0.5)*1.4;
    this.gravity = 0.32 + Math.random()*0.4;
    this.settled = false;
    this.opacity = 1;
  }
  update(){
    if(this.settled) return;
    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    const ground = coinCanvas.height*0.85;
    if(this.y + this.size >= ground){
      this.y = ground - this.size;
      this.vy = 0; this.vx = 0; this.settled = true;
      placeSettled(this);
    }
  }
  draw(){
    if(!this.img.complete) return;
    coinCtx.save();
    coinCtx.beginPath();
    coinCtx.arc(this.x + this.size/2, this.y + this.size/2, this.size/2, 0, Math.PI*2);
    coinCtx.closePath();
    coinCtx.clip();
    coinCtx.globalAlpha = this.opacity;
    coinCtx.drawImage(this.img, this.x, this.y, this.size, this.size);
    coinCtx.restore();
  }
}

def_placeholder = True
def_placeholder2 = True

def place_settled_js():
    pass

function placeSettled(coin){
  let safe=false, attempts=0;
  while(!safe && attempts<200){
    safe=true;
    for(let s of settled){
      const dx = (coin.x + coin.size/2) - (s.x + s.size/2);
      const dy = (coin.y + coin.size/2) - (s.y + s.size/2);
      const dist = Math.hypot(dx,dy);
      const minDist = (coin.size + s.size)/2 * 0.98;
      if(dist < minDist){
        coin.x += (Math.random()>0.5?1:-1)*(minDist - dist + 1);
        safe=false;
      }
    }
    attempts++;
  }
  coin.x = Math.max(4, Math.min(coinCanvas.width - coin.size - 4, coin.x));
  settled.push(coin);
}

function animateCoins(){
  coinCtx.clearRect(0,0,coinCanvas.width, coinCanvas.height);
  for(let c of coins) c.update();
  for(let c of coins) c.draw();
  for(let s of settled) s.draw();
  requestAnimationFrame(animateCoins);
}
requestAnimationFrame(animateCoins);

function rain(count){
  for(let i=0;i<count;i++){
    const src = logoSources.length ? logoSources[Math.floor(Math.random()*logoSources.length)] : null;
    if(!src) continue;
    const c = new Coin(src);
    coins.push(c);
  }
}

let animating=false;
function playBoomSound(){
  try{
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type='sawtooth';
    o.frequency.setValueAtTime(160, audioCtx.currentTime);
    o.frequency.exponentialRampToValueAtTime(24, audioCtx.currentTime + 0.22);
    g.gain.setValueAtTime(0.0001, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.8, audioCtx.currentTime + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 1.0);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + 1.05);
  }catch(e){ console.warn(e); }
}

function screenShake(dur=700){
  const el = document.documentElement;
  const start = Date.now();
  const orig = el.style.transform || '';
  (function step(){
    const t = (Date.now() - start)/dur;
    if(t >= 1){ el.style.transform = orig; return; }
    const dx = (Math.random()-0.5) * 18 * (1-t);
    const dy = (Math.random()-0.5) * 10 * (1-t);
    el.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(step);
  })();
}

async function runSequence(){
  if(animating) return;
  animating=true;
  coins=[]; settled=[]; chartCtx.clearRect(0,0,chartCanvas.width,chartCanvas.height);

  const w = chartCanvas.width, h = chartCanvas.height;
  const startX = w*0.06, endX = w*0.94;
  const baseline = h*0.6;
  const points = []; const steps=200;
  for(let i=0;i<=steps;i++){
    const t=i/steps;
    const x = startX + (endX-startX)*t;
    const rise = Math.pow(t,1.6)*(h*0.18 + Math.sin(t*8)*8);
    const y = baseline - rise;
    points.push({x,y});
  }

  const dur=5000, start=performance.now();
  await new Promise(res=>{
    (function frame(now){
      const p = Math.min(1, (now-start)/dur);
      chartCtx.clearRect(0,0,w,h);
      chartCtx.lineWidth = 6; chartCtx.lineCap='round';
      const grad = chartCtx.createLinearGradient(startX,0,endX,0);
      grad.addColorStop(0,'#ff2e2e'); grad.addColorStop(1,'#00ff9a');
      chartCtx.strokeStyle = grad;
      chartCtx.beginPath();
      const upto = Math.floor(points.length * p);
      if(upto>0){ chartCtx.moveTo(points[0].x, points[0].y); for(let i=1;i<=upto;i++) chartCtx.lineTo(points[i].x, points[i].y); }
      chartCtx.stroke();
      if(p<1) requestAnimationFrame(frame); else res();
    })(performance.now());
  });

  await new Promise(r=>setTimeout(r,180));
  const crashDur=420, crashStart=performance.now();
  await new Promise(res=>{
    (function frame(now){
      const t = Math.min(1,(now-crashStart)/crashDur);
      chartCtx.clearRect(0,0,w,h);
      chartCtx.lineWidth=6; chartCtx.lineCap='round'; chartCtx.strokeStyle='#ff2e2e';
      chartCtx.beginPath();
      for(let i=0;i<points.length;i++){
        const q=i/points.length;
        const drop = (1 - Math.pow(1-t,3)) * (h*0.6 + q*h*0.12);
        const x = points[i].x; const y = points[i].y + drop;
        if(i==0) chartCtx.moveTo(x,y); else chartCtx.lineTo(x,y);
      }
      chartCtx.stroke();
      if(t<1) requestAnimationFrame(frame); else res();
    })(performance.now());
  });

  playBoomSound(); screenShake(700);
  rain(totalRain);
  tooLate.style.opacity='1';
  await new Promise(r=>setTimeout(r,1800));
  tooLate.style.opacity='0';
  await new Promise(r=>{
    const fadeDur=900, st=performance.now();
    (function f(now){
      const t=(now-st)/fadeDur;
      for(let c of coins) c.opacity = Math.max(0, 1 - t);
      for(let s of settled) s.opacity = Math.max(0, 1 - t);
      if(t<1) requestAnimationFrame(f); else r();
    })(performance.now());
  });
  coins=[]; settled=[]; chartCtx.clearRect(0,0,chartCanvas.width,chartCanvas.height);
  animating=false;
}

async function loadLogosAndPrice(){
  try{
    const res = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=decentralized-finance-defi&order=market_cap_desc&per_page=100&page=1&sparkline=false');
    const arr = await res.json();
    logoSources = arr.map(a=>a.image).filter(Boolean);
    if(logoSources.length<100){ const extra=[]; for(let i=0;i<100;i++) extra.push(logoSources[i % logoSources.length]); logoSources = extra; }
  }catch(e){ console.warn('logo fetch failed',e); logoSources = ['https://cryptologos.cc/logos/solana-sol-logo.png?v=025','https://cryptologos.cc/logos/ethereum-eth-logo.png?v=025','https://cryptologos.cc/logos/chainlink-link-logo.png?v=025']; }
  logoSources.forEach(s=>{ const i=new Image(); i.src=s; });
  try{
    const r2 = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
    const d = await r2.json();
    solValue.innerText = d?.solana?.usd ? '$'+Number(d.solana.usd).toLocaleString(undefined,{maximumFractionDigits:2}) : '—';
  }catch(e){ console.warn(e); }
}
loadLogosAndPrice();

dontClick.addEventListener('click', ()=>{ runSequence(); });
