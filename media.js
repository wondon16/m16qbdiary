// Background media (moving image) + site audio (smooth jazz)
(() => {
  // ---------- Background Moving Image ----------
  // Place your provided image at: media/moving-bg.jpg (or .png/.webp)
  const IMG_CANDIDATES = ['media/moving-bg.webp','media/moving-bg.jpg','media/moving-bg.png'];
  function pickExistingImage(candidates){ return candidates[0]; }
  function mountBackgroundImage(){
    const imgUrl = pickExistingImage(IMG_CANDIDATES);
    const bg = document.createElement('div');
    bg.id = 'bg-img';
    bg.setAttribute('aria-hidden','true');
    bg.style.backgroundImage = `url('${imgUrl}')`;
    document.body.appendChild(bg);

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
  window.addEventListener('DOMContentLoaded', () => { mountBackgroundImage(); m16Audio.init(); });
})();

