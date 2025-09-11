// Background media (video highlights) + site audio (smooth jazz)
(() => {
  // ---------- Background Video ----------
  const CLIPS = ['highlight1','highlight2']; // base names in /media

  function mountBackgroundVideo(){
    const v = document.createElement('video');
    v.id = 'bg-video'; v.autoplay = true; v.loop = true; v.muted = true; v.playsInline = true; v.setAttribute('aria-hidden','true');
    const pick = CLIPS[Math.floor(Math.random()*CLIPS.length)];
    ;['mp4','webm'].forEach(ext => { const s=document.createElement('source'); s.src=`media/${pick}.${ext}`; s.type=`video/${ext}`; v.appendChild(s); });
    v.addEventListener('error', () => {/* ignore per-source errors */});
    v.addEventListener('loadeddata', ()=> { v.classList.add('ready'); });
    document.body.appendChild(v);

    // Dim overlay for readability
    const dim = document.createElement('div'); dim.className='bg-dim'; dim.setAttribute('aria-hidden','true'); document.body.appendChild(dim);
  }

  // ---------- Background Audio (Smooth Jazz) ----------
  const m16Audio = {
    audio: null,
    toggleBtn: null,
    stateKey: 'm16_audio_on',
    wantedOn: false,
    init(){
      const a = document.createElement('audio');
      a.id='bg-audio'; a.src='media/smooth-jazz.mp3'; a.loop=true; a.preload='auto'; a.style.display='none';
      document.body.appendChild(a); this.audio = a;

      const btn = document.createElement('button');
      btn.id='soundToggle'; btn.className='sound-toggle'; btn.type='button'; btn.title='Music on/off'; btn.setAttribute('aria-pressed','false');
      btn.textContent='♪';
      btn.addEventListener('click', ()=> this.toggle());
      document.body.appendChild(btn); this.toggleBtn = btn;

      this.wantedOn = (localStorage.getItem(this.stateKey) === '1');
      if (this.wantedOn) this.tryPlay();

      // Attempt to start after first user interaction each visit
      const kickoff = () => { if (this.wantedOn) this.tryPlay(); window.removeEventListener('pointerdown', kickoff); };
      window.addEventListener('pointerdown', kickoff, { once:true });
      this.updateUI();
    },
    async tryPlay(){ try{ await this.audio.play(); }catch(e){ /* blocked until user gesture */ } },
    toggle(){
      if (!this.audio.paused){ this.audio.pause(); this.wantedOn=false; }
      else { this.wantedOn=true; this.tryPlay(); }
      localStorage.setItem(this.stateKey, this.wantedOn ? '1' : '0');
      this.updateUI();
    },
    updateUI(){ this.toggleBtn.setAttribute('aria-pressed', this.wantedOn ? 'true' : 'false'); this.toggleBtn.classList.toggle('on', this.wantedOn); },
    kickstartFromUserGesture(){ this.wantedOn = true; localStorage.setItem(this.stateKey,'1'); this.tryPlay(); this.updateUI(); }
  };

  window.m16Audio = m16Audio;

  // Mount on load
  window.addEventListener('DOMContentLoaded', () => { mountBackgroundVideo(); m16Audio.init(); });
})();
