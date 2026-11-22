import { Controller } from '@hotwired/stimulus';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

/**
 * Scroll-scrubs one silent clip per scene. Seeks are coalesced so a fast
 * flick never queues more decoder work than the file can serve (keyframes
 * land about every 0.33s). Reduced motion and data-saver stay on stills.
 */
export default class extends Controller {
    static targets = ['scene', 'video', 'story', 'reservas', 'book', 'bookButton', 'bookMenu'];

    connect() {
        this.onKey = this.onKey.bind(this);
        this.onResize = this.onResize.bind(this);
        this.currentScene = null;
        this.activeBranch = null;
        this.branchTriggers = [];
        this.mainTriggers = [];
        this.scrolly = document.documentElement.classList.contains('is-scrolly');
        this.applyLang(document.documentElement.lang?.startsWith('en') ? 'en' : 'pt', false);

        if (!this.scrolly) {
            this.element.classList.add('is-reduced');
            return;
        }

        try {
            this.bootScroll();
        } catch (error) {
            document.documentElement.classList.remove('is-scrolly');
            this.scrolly = false;
            this.element.classList.add('is-reduced');
            console.error(error);
        }
    }

    disconnect() {
        if (this.raf) cancelAnimationFrame(this.raf);
        if (this.onScrollSync) window.removeEventListener('scroll', this.onScrollSync);
        window.removeEventListener('resize', this.onResize);
        this.killBranchTriggers();
        this.ctx?.revert();
    }

    bootScroll() {
        gsap.registerPlugin(ScrollTrigger);
        ScrollTrigger.config({ ignoreMobileResize: true });
        this.prepareVideos();
        this.layout();
        this.lastW = window.innerWidth;
        this.lastH = window.innerHeight;

        this.onScrollSync = () => this.syncFromScroll();
        const storyScenes = [...this.storyTarget.querySelectorAll('[data-scene]')];
        this.ctx = gsap.context(() => {
            this.mainTriggers = storyScenes.map((scene) => ScrollTrigger.create({
                trigger: scene,
                start: 'top top',
                end: 'bottom bottom',
                onToggle: (self) => {
                    if (self.isActive && !this.activeBranch) this.activate(scene);
                },
                onUpdate: (self) => {
                    scene._targetProgress = self.progress;
                },
            }));
        }, this.element);

        window.addEventListener('scroll', this.onScrollSync, { passive: true });
        window.addEventListener('resize', this.onResize);
        this.syncFromScroll();
        this.tick();
        ScrollTrigger.refresh();
        this.syncFromScroll();
    }

    tick() {
        this.raf = requestAnimationFrame(() => this.tick());
        const scene = this.currentScene;
        if (!scene) return;
        const target = scene._targetProgress ?? 0;
        const shown = scene._shownProgress ?? target;
        const next = shown + (target - shown) * 0.35;
        scene._shownProgress = Math.abs(target - next) < 0.0015 ? target : next;
        this.onProgress(scene, scene._shownProgress);
    }

    syncFromScroll() {
        const root = this.activeBranch || this.storyTarget;
        const y = window.scrollY;
        const blocks = root.querySelectorAll('[data-hub], [data-fork]');
        let onBlock = false;
        blocks.forEach((block) => {
            const top = this.docTop(block);
            if (y >= top - 1 && y < top + block.offsetHeight - 1) onBlock = true;
        });
        this.element.classList.toggle('is-on-hub', onBlock);
        if (this.activeBranch || !this.hasReservasTarget) {
            this.element.classList.remove('is-on-paper');
        } else {
            const top = this.reservasTarget.getBoundingClientRect().top;
            this.element.classList.toggle('is-on-paper', top < window.innerHeight * 0.62);
        }
        if (onBlock) {
            this.sceneTargets.forEach((scene) => scene.classList.remove('is-current'));
            this.currentScene = null;
            return;
        }
        const scenes = this.liveFrames();
        if (!scenes.length) return;
        let scene = scenes[scenes.length - 1];
        for (const candidate of scenes) {
            const top = this.docTop(candidate);
            if (y < top + candidate.offsetHeight) {
                scene = candidate;
                break;
            }
        }
        const top = this.docTop(scene);
        const travel = Math.max(1, scene.offsetHeight - window.innerHeight);
        scene._targetProgress = Math.min(1, Math.max(0, (y - top) / travel));
        if (scene !== this.currentScene) this.activate(scene);
    }

    layout() {
        const vh = window.innerHeight || 800;
        const scale = window.matchMedia('(max-width: 760px)').matches ? 0.84 : 1;
        this.sceneTargets.forEach((scene) => {
            const travel = Number(scene.dataset.travel) || 120;
            scene.style.height = `${Math.round(vh + vh * (travel / 100) * scale)}px`;
        });
    }

    onResize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        if (this.lastW === w && Math.abs((this.lastH || 0) - h) < 90) return;
        this.lastW = w;
        this.lastH = h;
        this.layout();
        ScrollTrigger.refresh();
    }

    activate(scene) {
        if (!scene) return;
        if (this.activeBranch && !this.activeBranch.contains(scene)) return;
        if (!this.activeBranch && this.hasStoryTarget && !this.storyTarget.contains(scene)) return;
        this.currentScene = scene;
        this.sceneTargets.forEach((node) => node.classList.toggle('is-current', node === scene));
        this.warmAround(scene);
    }

    warmAround(scene) {
        const frames = this.liveFrames();
        const index = frames.indexOf(scene);
        this.element.querySelectorAll('video[data-src]').forEach((video) => {
            const owner = video.closest('[data-scene]');
            if (!owner || !frames.includes(owner)) this.unmount(video);
        });
        frames.forEach((node, i) => {
            const video = node.querySelector('video[data-src]');
            if (!video) return;
            if (index >= 0 && Math.abs(i - index) <= 1) this.mount(video);
            else this.unmount(video);
        });
    }

    onProgress(scene, progress) {
        const hero = scene.dataset.hero === '1';
        const brief = scene.dataset.brief === '1';
        const visible = hero || brief ? progress < 0.92 : progress > 0.07 && progress < 0.86;
        if (visible) this.showCopy(scene);
        else this.hideCopy(scene);

        if (scene.dataset.finale === '1') {
            const still = scene.querySelector('.scene__still');
            if (still) gsap.set(still, { scale: 1.08 - progress * 0.06, transformOrigin: 'center center' });
        }

        const frames = this.liveFrames();
        const upcoming = frames[frames.indexOf(scene) + 1]?.querySelector('video[data-src]');
        if (progress > 0.5 && upcoming) this.mount(upcoming);

        const video = scene.querySelector('video[data-src]');
        if (!video || this.skipVideo(video)) return;
        video._progress = progress;
        if (video._seeking && video._seekAt && performance.now() - video._seekAt > 700) {
            video._seeking = false;
        }
        this.seekToProgress(video, progress);
    }

    seekToProgress(video, progress) {
        video._progress = progress;
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        this.seek(video, 0.04 + progress * Math.max(video.duration - 0.08, 0));
    }

    copyBits(scene) {
        return scene.querySelectorAll('[data-copy], .fine');
    }

    showCopy(scene) {
        const bits = this.copyBits(scene);
        if (!bits.length || scene.dataset.shown === '1') return;
        scene.dataset.shown = '1';
        const brief = scene.dataset.brief === '1';
        gsap.fromTo(bits, { autoAlpha: 0, y: brief ? 16 : 26 }, {
            autoAlpha: 1,
            y: 0,
            duration: brief ? 0.35 : 0.7,
            ease: 'power2.out',
            overwrite: 'auto',
        });
    }

    hideCopy(scene) {
        const bits = this.copyBits(scene);
        if (!bits.length || scene.dataset.shown !== '1') return;
        scene.dataset.shown = '0';
        gsap.to(bits, { autoAlpha: 0, y: 16, duration: 0.4, ease: 'power2.in', overwrite: 'auto' });
    }

    prepareVideos() {
        this.element.querySelectorAll('video[data-src]').forEach((video) => {
            video.muted = true;
            video.defaultMuted = true;
            video.playsInline = true;
            video.addEventListener('loadedmetadata', () => {
                this.seekToProgress(video, video._progress ?? 0);
            });
            video.addEventListener('loadeddata', () => this.prime(video));
            video.addEventListener('seeked', () => {
                video._seeking = false;
                video.closest('.scene')?.classList.add('is-ready');
                if (video._want != null && Math.abs(video.currentTime - video._want) >= 0.08) {
                    this.seek(video, video._want);
                }
            });
            video.addEventListener('error', () => {
                video._seeking = false;
            });
        });
    }

    prime(video) {
        if (video._primed) return;
        video._primed = true;
        const settle = () => {
            video.pause();
            if (video._want != null) this.seek(video, video._want);
        };
        const pending = video.play();
        if (pending && typeof pending.then === 'function') pending.then(settle).catch(settle);
        else settle();
    }

    mount(video) {
        if (!video || this.skipVideo(video)) {
            if (video) this.unmount(video);
            return;
        }
        if (video.getAttribute('src') || video._loading) return;
        const src = video.dataset.src;
        if (!src) return;
        // The whole clip is only a few megabytes. A local blob is seekable even
        // when the web server does not answer Range requests, which is what
        // makes scroll-scrubbing actually move the picture.
        video._loading = true;
        video._epoch = (video._epoch || 0) + 1;
        const epoch = video._epoch;
        fetch(src)
            .then((response) => {
                if (!response.ok) throw new Error(`video ${response.status}`);
                return response.blob();
            })
            .then((blob) => {
                if (video._epoch !== epoch) return;
                const url = URL.createObjectURL(blob);
                video._blobUrl = url;
                video._loading = false;
                video.preload = 'auto';
                video.src = url;
                video.load();
            })
            .catch(() => {
                if (video._epoch === epoch) video._loading = false;
            });
    }

    unmount(video) {
        if (!video) return;
        video._epoch = (video._epoch || 0) + 1;
        video._loading = false;
        video.pause();
        if (video._blobUrl) {
            URL.revokeObjectURL(video._blobUrl);
            video._blobUrl = null;
        }
        if (video.getAttribute('src')) {
            video.removeAttribute('src');
            video.load();
        }
        video._seeking = false;
        video._primed = false;
        video.closest('.scene')?.classList.remove('is-ready');
    }

    skipVideo(video) {
        // 10b_end.mp4 already has the Portuguese card burned into the picture.
        // The live card is HTML, in both languages, over the clean aerial still.
        return video.closest('.scene')?.dataset.finale === '1';
    }

    seek(video, time) {
        if (!video || video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 0) {
            video._want = time;
            return;
        }
        const t = Math.min(Math.max(time, 0), Math.max(video.duration - 0.05, 0));
        video._want = t;
        if (video._seeking) return;
        if (Math.abs(video.currentTime - t) < 0.08) return;
        video._seeking = true;
        video._seekAt = performance.now();
        try {
            video.currentTime = t;
        } catch (e) {
            video._seeking = false;
        }
    }

    setLang(event) {
        this.applyLang(event.currentTarget.dataset.lang, true);
        if (this.scrolly && this.currentScene) this.warmAround(this.currentScene);
    }

    applyLang(lang, remember) {
        const en = lang === 'en';
        document.documentElement.lang = en ? 'en' : 'pt-BR';
        if (remember) {
            try { localStorage.setItem('domo-xango-lang', en ? 'en' : 'pt'); } catch (e) {}
        }
        const title = document.querySelector('title');
        if (title?.dataset.pt && title.dataset.en) {
            title.textContent = en ? title.dataset.en : title.dataset.pt;
        }
        const description = document.querySelector('meta[name="description"]');
        if (description?.dataset.pt && description.dataset.en) {
            description.setAttribute('content', en ? description.dataset.en : description.dataset.pt);
        }
        this.element.querySelectorAll('.js-wa').forEach((link) => {
            const next = en ? link.dataset.waEn : link.dataset.waPt;
            if (next) link.href = next;
        });
        this.element.querySelectorAll('[data-alt-pt]').forEach((node) => {
            const value = en ? node.dataset.altEn : node.dataset.altPt;
            if (!value) return;
            if (node.tagName === 'IMG') node.alt = value;
            if (node.hasAttribute('aria-label')) node.setAttribute('aria-label', value);
        });
        this.element.querySelectorAll('.lang [data-lang]').forEach((button) => {
            button.setAttribute('aria-pressed', button.dataset.lang === (en ? 'en' : 'pt') ? 'true' : 'false');
        });
    }

    english() {
        return document.documentElement.lang.startsWith('en');
    }

    toggleBook(event) {
        event.stopPropagation();
        const open = this.bookMenuTarget.hidden;
        this.bookMenuTarget.hidden = !open;
        this.bookButtonTarget.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    closeBook() {
        if (!this.hasBookMenuTarget) return;
        this.bookMenuTarget.hidden = true;
        this.bookButtonTarget?.setAttribute('aria-expanded', 'false');
    }

    closeBookOnAway(event) {
        if (!this.hasBookTarget || this.bookTarget.contains(event.target)) return;
        this.closeBook();
    }

    onKey(event) {
        if (event.key !== 'Escape') return;
        if (this.hasBookMenuTarget && !this.bookMenuTarget.hidden) {
            this.closeBook();
            return;
        }
        if (this.activeBranch) this.setBranch(null);
    }

    openBranch(event) {
        event.preventDefault();
        const id = event.currentTarget?.dataset?.branch;
        if (!id) return;
        this.closeBook();
        this.returnFocus = event.currentTarget;
        this.setBranch(id);
    }

    leaveBranch(event) {
        if (!this.activeBranch) return;
        event.preventDefault();
        const href = event.currentTarget.getAttribute('href');
        this.setBranch(null, { restore: false });
        if (!href || href.charAt(0) !== '#') return;
        const target = document.getElementById(href.slice(1));
        if (!target) return;
        requestAnimationFrame(() => {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
        });
    }

    jump(event) {
        const href = event.currentTarget.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        const root = this.activeBranch || this.element;
        const target = root.querySelector(`#${CSS.escape(href.slice(1))}`);
        if (!target) return;
        event.preventDefault();
        window.scrollTo({ top: this.docTop(target), behavior: this.scrolly ? 'smooth' : 'auto' });
    }

    setBranch(id, options = {}) {
        const restore = options.restore !== false;
        if (this.activeBranch) {
            this.killBranchTriggers();
            this.activeBranch.querySelectorAll('video[data-src]').forEach((video) => this.unmount(video));
            this.activeBranch.classList.remove('is-open');
            this.activeBranch = null;
            document.documentElement.classList.remove('is-branch-open');
        }
        if (!id) {
            this.mainTriggers?.forEach((trigger) => trigger.enable());
            if (this.scrolly) {
                this.layout();
                ScrollTrigger.refresh();
            }
            if (restore && this.savedScroll != null) window.scrollTo(0, this.savedScroll);
            if (this.scrolly) this.syncFromScroll();
            return;
        }
        const branch = this.element.querySelector(`#branch-${CSS.escape(id)}`);
        if (!branch) return;
        this.savedScroll = window.scrollY;
        this.storyTarget?.querySelectorAll('video[data-src]').forEach((video) => this.unmount(video));
        this.sceneTargets.forEach((scene) => scene.classList.remove('is-current'));
        this.currentScene = null;
        this.activeBranch = branch;
        document.documentElement.classList.add('is-branch-open');
        branch.classList.add('is-open');
        this.mainTriggers?.forEach((trigger) => trigger.disable());
        window.scrollTo(0, 0);
        if (!this.scrolly) return;
        this.layout();
        void branch.offsetHeight;
        this.mountBranchTriggers(branch);
        ScrollTrigger.refresh();
        this.syncFromScroll();
    }

    mountBranchTriggers(branch) {
        this.killBranchTriggers();
        this.branchTriggers = [...branch.querySelectorAll('[data-scene]')].map((scene) => ScrollTrigger.create({
            trigger: scene,
            start: 'top top',
            end: 'bottom bottom',
            onToggle: (self) => {
                if (self.isActive && this.activeBranch) this.activate(scene);
            },
            onUpdate: (self) => {
                scene._targetProgress = self.progress;
            },
        }));
    }

    killBranchTriggers() {
        this.branchTriggers?.forEach((trigger) => trigger.kill());
        this.branchTriggers = [];
    }

    liveFrames() {
        const root = this.activeBranch || this.storyTarget;
        return [...root.querySelectorAll('[data-scene]')];
    }

    docTop(node) {
        let y = 0;
        let el = node;
        while (el && el !== document.body && el !== document.documentElement) {
            y += el.offsetTop;
            el = el.offsetParent;
        }
        return y;
    }
}
