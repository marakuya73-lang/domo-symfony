import { Controller } from '@hotwired/stimulus';
import StageScrub from '../stage_scrub.js';

/**
 * The journey is one sticky canvas. Scroll scrubs an image sequence.
 * Reduced motion keeps the stills and the text.
 */
export default class extends Controller {
    static targets = ['scene', 'video', 'story', 'reservas', 'book', 'bookButton', 'bookMenu', 'steps'];

    connect() {
        this.onKey = this.onKey.bind(this);
        this.activeBranch = null;
        this.scrolly = document.documentElement.classList.contains('is-scrolly');
        this.finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        this.applyLang(document.documentElement.lang?.startsWith('en') ? 'en' : 'pt', false);
        this.warmed = new Set();
        this.onWarmChoice = (event) => {
            const link = event.target?.closest?.('[data-prefetch]');
            if (!link) return;
            link.dataset.prefetch.split(/\s+/).forEach((url) => this.warm(url));
            if (link.dataset.branch) this.driver?.prime(link.dataset.branch);
        };
        this.element.addEventListener('pointerenter', this.onWarmChoice, true);
        this.element.addEventListener('touchstart', this.onWarmChoice, { capture: true, passive: true });
        if (this.scrolly && this.element.querySelector('[data-stage]')) {
            this.driver = new StageScrub(this.element);
            this.driver.start();
        } else if (this.scrolly) {
            this.prepareVideos();
            this.layout();
            this.onScroll = () => { this.needsPaint = true; };
            this.onResize = () => this.layout();
            window.addEventListener('scroll', this.onScroll, { passive: true });
            window.addEventListener('resize', this.onResize);
            this.tick = this.tick.bind(this);
            this.raf = requestAnimationFrame(this.tick);
        } else {
            this.refreshVisibility();
            this.onHint = () => {
                this.element.querySelectorAll('.scroll-hint').forEach((hint) => {
                    hint.classList.toggle('is-gone', window.scrollY > 8);
                });
            };
            window.addEventListener('scroll', this.onHint, { passive: true });
        }
    }

    disconnect() {
        if (this.onHint) window.removeEventListener('scroll', this.onHint);
        this.driver?.stop();
        if (this.raf) cancelAnimationFrame(this.raf);
        if (this.onScroll) window.removeEventListener('scroll', this.onScroll);
        if (this.onResize) window.removeEventListener('resize', this.onResize);
        this.observer?.disconnect();
        this.reelObservers?.forEach((observer) => observer.disconnect());
    }

    layout() {
        const vh = window.innerHeight || 800;
        // One scene is 0.9 viewport of scroll. Nothing stays pinned past that.
        this.sceneTargets.forEach((scene) => {
            scene.style.height = `${Math.round(vh * 0.9)}px`;
        });
        this.needsPaint = true;
    }

    tick() {
        this.raf = requestAnimationFrame(this.tick);
        this.paintScroll();
    }

    paintScroll() {
        const scenes = this.liveFrames();
        if (!scenes.length) return;
        const vh = window.innerHeight || 800;
        scenes.forEach((scene) => {
            const rect = scene.getBoundingClientRect();
            const raw = Math.min(1, Math.max(0, (vh - rect.top) / vh));
            const onScreen = rect.bottom > vh * 0.08 && rect.top < vh * 0.95;
            const early = scene.dataset.hero === '1' || scene.classList.contains('scene--pause');
            scene.classList.toggle('is-current', onScreen && raw > 0.2);
            scene.classList.toggle('is-readable', onScreen && (early ? raw > 0.12 : raw >= 0.6));
            // A few percent of zoom and drift on every scene, including a still
            // whose video seek has not landed yet.
            const zoom = (1.02 + raw * 0.08).toFixed(3);
            const shift = ((0.5 - raw) * 8).toFixed(2);
            scene.querySelectorAll('.media__full, .media__lqip').forEach((img) => {
                img.style.transform = `translate3d(0, ${shift}%, 0) scale(${zoom})`;
            });
            const video = scene.querySelector('video.scene__video');
            if (!video) return;
            if (!onScreen) {
                scene.classList.remove('is-ready');
                this.unmount(video);
                return;
            }
            this.mount(video);
            this.seekToProgress(video, raw);
            const want = video._want;
            const landed = video.readyState >= 2 && want != null && Number.isFinite(video.currentTime) && Math.abs(video.currentTime - want) < 0.22;
            scene.classList.toggle('is-ready', landed);
            if (raw > 0.35) this.prefetchAhead(scene);
        });
        this.syncPaper();
    }

    liveFrames() {
        const root = this.activeBranch || this.storyTarget;
        return root ? [...root.querySelectorAll('.scene')] : [];
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

    observe() {
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => this.applyVisibility(entry.target, entry.intersectionRatio));
        }, { threshold: [0, 0.25, 0.6, 0.85, 1] });
        this.element.querySelectorAll('.scene, .fork, .hub').forEach((node) => this.observer.observe(node));
    }

    observeReels() {
        this.reelObservers = [];
        this.element.querySelectorAll('[data-reel]').forEach((reel) => {
            const track = reel.querySelector('.reel__track');
            if (!track) return;
            const observer = new IntersectionObserver((entries) => {
                entries.forEach((entry) => {
                    const slide = entry.target;
                    const on = entry.intersectionRatio >= 0.6;
                    if (on) slide.classList.add('is-settled');
                    else if (entry.intersectionRatio < 0.25) slide.classList.remove('is-settled');
                    const video = slide.querySelector('video');
                    if (!video) return;
                    if (!(entry.intersectionRatio >= 0.45 && this.slideIsOnScreen(slide))) this.pause(video);
                    if (on) this.markReelDot(reel, slide);
                });
            }, { root: track, threshold: [0.25, 0.6, 1] });
            track.querySelectorAll('.reel__slide').forEach((slide) => observer.observe(slide));
            this.reelObservers.push(observer);
        });
    }

    applyVisibility(node, ratio) {
        if (this.activeBranch && !this.activeBranch.contains(node)) return;
        if (!this.activeBranch && this.hasStoryTarget && !this.storyTarget.contains(node) && !node.closest('.story')) {
            if (node.closest('.branch')) return;
        }
        if (ratio >= 0.6) node.classList.add('is-settled');
        else if (ratio < 0.25) node.classList.remove('is-settled');
        const video = node.querySelector(':scope > .scene__pin video, :scope > video');
        const pinVideo = node.querySelector('video.scene__video');
        const clip = pinVideo || video;
        if (clip && ratio < 0.45) this.pause(clip);
        if (ratio >= 0.6) {
            this.prefetchAhead(node);
            this.markDots();
        }
        this.syncPaper();
    }

    refreshVisibility() {
        const root = this.activeBranch || this.storyTarget;
        if (!root) return;
        root.querySelectorAll('.scene, .fork, .hub').forEach((node) => {
            const rect = node.getBoundingClientRect();
            const span = Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0);
            const ratio = rect.height ? Math.max(0, span / rect.height) : 0;
            this.applyVisibility(node, ratio);
        });
        this.renderDots();
    }

    prepareVideos() {
        this.element.querySelectorAll('video.scene__video').forEach((video) => {
            video.muted = true;
            video.defaultMuted = true;
            video.playsInline = true;
            video.loop = false;
            if (video._scrubBound) return;
            video._scrubBound = true;
            video.addEventListener('loadedmetadata', () => this.seekToProgress(video, video._progress ?? 0));
            video.addEventListener('loadeddata', () => this.prime(video));
            video.addEventListener('seeked', () => {
                video._seeking = false;
                video.closest('.scene')?.classList.add('is-ready');
                if (video._want != null && Math.abs(video.currentTime - video._want) >= 0.08) this.seek(video, video._want);
            });
            video.addEventListener('error', () => { video._seeking = false; });
        });
    }

    seekToProgress(video, progress) {
        video._progress = progress;
        if (!Number.isFinite(video.duration) || video.duration <= 0) return;
        this.seek(video, 0.04 + progress * Math.max(video.duration - 0.08, 0));
    }

    seek(video, time) {
        if (!video || video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 0) {
            video._want = time;
            return;
        }
        const t = Math.min(Math.max(time, 0), Math.max(video.duration - 0.05, 0));
        video._want = t;
        if (video._seeking) return;
        if (Math.abs(video.currentTime - t) < 0.04) return;
        video._seeking = true;
        video._seekAt = performance.now();
        try {
            video.currentTime = t;
        } catch (e) {
            video._seeking = false;
        }
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
        if (!video) return;
        if (video.dataset.poster && !video.getAttribute('poster')) video.poster = video.dataset.poster;
        const src = video.dataset.src || video.currentSrc;
        if (!src || video._blobUrl || video._loading) return;
        if (video.getAttribute('src') && !video.dataset.src) video.dataset.src = video.getAttribute('src');
        const fetchUrl = video.dataset.src;
        if (!fetchUrl) return;
        video._loading = true;
        video._epoch = (video._epoch || 0) + 1;
        const epoch = video._epoch;
        fetch(fetchUrl)
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

    pause(video) {
        if (!video) return;
        video.pause();
    }

    prefetchAhead(node) {
        let cursor = node;
        for (let step = 0; step < 2; step += 1) {
            cursor = this.nextBeat(cursor);
            if (!cursor) return;
            cursor.querySelectorAll('img.media__full').forEach((img) => this.warm(this.pickUrl(img)));
            if (step === 0) {
                const video = cursor.querySelector('video.scene__video');
                if (video) this.mount(video);
            }
        }
    }

    nextBeat(node) {
        let cursor = node.nextElementSibling;
        while (cursor && !cursor.matches('.scene, .fork, .hub, .reel')) cursor = cursor.nextElementSibling;
        return cursor;
    }

    pickUrl(img) {
        const width = window.innerWidth;
        if (width <= 520) return img.dataset.w480 || img.dataset.w828;
        if (width <= 1100) return img.dataset.w828 || img.dataset.w1280;
        return img.dataset.w1280 || img.dataset.w828;
    }

    warm(url) {
        if (!url || this.warmed.has(url)) return;
        this.warmed.add(url);
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'image';
        link.href = url;
        document.head.appendChild(link);
        const image = new Image();
        image.decoding = 'async';
        image.src = url;
    }

    queueParallax() {
        if (this.parallaxFrame) return;
        this.parallaxFrame = requestAnimationFrame(() => {
            this.parallaxFrame = 0;
            const root = this.activeBranch || this.storyTarget;
            root?.querySelectorAll('.scene').forEach((scene) => {
                const still = scene.querySelector('.media__full.scene__still');
                if (!still) return;
                const shift = (scene.getBoundingClientRect().top / window.innerHeight) * 12;
                still.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0) scale(1.04)`;
            });
        });
    }

    syncPaper() {
        if (this.activeBranch || !this.hasReservasTarget) {
            this.element.classList.remove('is-on-paper');
            return;
        }
        const top = this.reservasTarget.getBoundingClientRect().top;
        this.element.classList.toggle('is-on-paper', top < window.innerHeight * 0.62);
    }

    slideIsOnScreen(slide) {
        const rect = slide.getBoundingClientRect();
        return rect.bottom > 0 && rect.top < window.innerHeight && rect.width > 0;
    }

    renderDots() {
        if (!this.hasStepsTarget) return;
        const root = this.activeBranch;
        this.stepsTarget.replaceChildren();
        if (!root) {
            this.stepsTarget.hidden = true;
            this.dotSteps = [];
            return;
        }
        const steps = [...root.querySelectorAll(':scope > .scene, :scope > .fork, :scope > .hub, :scope > .reel')];
        steps.forEach((step, index) => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'steps__dot';
            button.textContent = String(index + 1);
            const en = this.english();
            button.setAttribute('aria-label', en ? `Step ${index + 1}` : `Passo ${index + 1}`);
            button.addEventListener('click', () => step.scrollIntoView({ block: 'start' }));
            this.stepsTarget.appendChild(button);
        });
        this.dotSteps = steps;
        this.stepsTarget.hidden = steps.length === 0;
        this.markDots();
    }

    markDots() {
        if (!this.dotSteps || !this.hasStepsTarget) return;
        this.dotSteps.forEach((step, index) => {
            this.stepsTarget.children[index]?.classList.toggle('is-on', step.classList.contains('is-settled'));
        });
    }

    markReelDot(reel, slide) {
        const dots = [...reel.querySelectorAll('.reel__dot')];
        const slides = [...reel.querySelectorAll('.reel__slide')];
        const index = slides.indexOf(slide);
        dots.forEach((dot, i) => dot.classList.toggle('is-on', i === index));
    }

    reelDot(event) {
        const id = event.currentTarget.dataset.slide;
        const slide = id ? document.getElementById(id) : null;
        slide?.scrollIntoView({ inline: 'start', block: 'nearest' });
    }

    setLang(event) {
        this.applyLang(event.currentTarget.dataset.lang, true);
        this.renderDots();
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
        requestAnimationFrame(() => target.scrollIntoView({ behavior: 'auto', block: 'start' }));
    }

    scrubTo(event) {
        if (!this.driver) return;
        const stage = event.currentTarget.closest('.stage');
        const fraction = Number(event.currentTarget.dataset.scrub);
        if (!stage || !Number.isFinite(fraction)) return;
        event.preventDefault();
        const top = stage.getBoundingClientRect().top + window.scrollY;
        const max = Math.max(0, stage.offsetHeight - window.innerHeight);
        window.scrollTo(0, top + max * fraction);
    }

    jump(event) {
        const href = event.currentTarget.getAttribute('href');
        if (!href || href.charAt(0) !== '#') return;
        const root = this.activeBranch || this.element;
        const target = root.querySelector(`#${CSS.escape(href.slice(1))}`);
        if (!target) return;
        event.preventDefault();
        target.scrollIntoView({ behavior: 'auto', block: 'start' });
    }

    setBranch(id, options = {}) {
        const restore = options.restore !== false;
        if (this.activeBranch) {
            this.activeBranch.querySelectorAll('video').forEach((video) => this.pause(video));
            this.activeBranch.classList.remove('is-open');
            this.activeBranch = null;
            document.documentElement.classList.remove('is-branch-open');
        }
        if (!id) {
            if (restore && this.savedScroll != null) window.scrollTo(0, this.savedScroll);
            if (this.driver) this.driver.activate();
            else this.layout();
            this.renderDots();
            return;
        }
        const branch = this.element.querySelector(`#branch-${CSS.escape(id)}`);
        if (!branch) return;
        this.savedScroll = window.scrollY;
        this.storyTarget?.querySelectorAll('video').forEach((video) => this.pause(video));
        this.activeBranch = branch;
        document.documentElement.classList.add('is-branch-open');
        branch.classList.add('is-open');
        window.scrollTo(0, 0);
        if (this.driver) this.driver.activate();
        else this.layout();
        branch.querySelectorAll('.scene').forEach((scene) => { scene._shown = null; });
        this.renderDots();
    }
}
