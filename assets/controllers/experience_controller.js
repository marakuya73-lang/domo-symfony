import { Controller } from '@hotwired/stimulus';

/**
 * One gesture, one beat. Sections snap. Copy fades in once a beat has
 * settled and stays until that beat leaves. Videos play only while visible.
 */
export default class extends Controller {
    static targets = ['scene', 'video', 'story', 'reservas', 'book', 'bookButton', 'bookMenu', 'steps', 'lightbox', 'lightboxImage', 'lightboxVideo'];

    connect() {
        this.onKey = this.onKey.bind(this);
        this.activeBranch = null;
        this.scrolly = document.documentElement.classList.contains('is-scrolly');
        this.finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
        this.applyLang(document.documentElement.lang?.startsWith('en') ? 'en' : 'pt', false);
        this.observe();
        this.observeReels();
        if (this.scrolly && this.finePointer) {
            window.addEventListener('scroll', () => this.queueParallax(), { passive: true });
        }
        this.refreshVisibility();
    }

    disconnect() {
        this.observer?.disconnect();
        this.reelObservers?.forEach((observer) => observer.disconnect());
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
                    if (entry.intersectionRatio >= 0.45 && this.slideIsOnScreen(slide)) this.play(video);
                    else this.pause(video);
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
        if (clip && ratio >= 0.45) this.play(clip);
        else if (clip) this.pause(clip);
        if (ratio >= 0.6) {
            this.prefetchAfter(node);
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

    play(video) {
        if (!this.scrolly || !video) return;
        this.ensureSrc(video);
        const pending = video.play();
        if (pending && typeof pending.catch === 'function') {
            pending.then(() => video.closest('.scene, .reel__slide')?.classList.add('is-ready')).catch(() => {});
        }
    }

    pause(video) {
        if (!video) return;
        video.pause();
    }

    ensureSrc(video) {
        if (!video || video.getAttribute('src') || video._loading) return;
        const src = video.dataset.src;
        if (!src) return;
        video._loading = true;
        video.preload = 'auto';
        video.src = src;
        video.load();
    }

    prefetchAfter(node) {
        const next = node.nextElementSibling;
        if (!next) return;
        const video = next.querySelector('video[data-src]');
        if (video) this.ensureSrc(video);
        next.querySelectorAll('img[loading="lazy"]').forEach((img) => {
            img.loading = 'eager';
        });
    }

    queueParallax() {
        if (this.parallaxFrame) return;
        this.parallaxFrame = requestAnimationFrame(() => {
            this.parallaxFrame = 0;
            const root = this.activeBranch || this.storyTarget;
            root?.querySelectorAll('.scene').forEach((scene) => {
                const still = scene.querySelector('.scene__still');
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

    expand(event) {
        const scene = event.currentTarget.closest('.scene');
        if (!scene || !this.hasLightboxTarget) return;
        const video = scene.querySelector('video');
        const image = scene.querySelector('.scene__still');
        this.lightboxTarget.hidden = false;
        if (video && (video.currentSrc || video.dataset.src)) {
            this.ensureSrc(video);
            this.lightboxVideoTarget.hidden = false;
            this.lightboxImageTarget.hidden = true;
            this.lightboxVideoTarget.src = video.currentSrc || video.dataset.src;
            this.lightboxVideoTarget.play().catch(() => {});
        } else if (image) {
            this.lightboxImageTarget.hidden = false;
            this.lightboxVideoTarget.hidden = true;
            this.lightboxImageTarget.src = image.currentSrc || image.src;
            this.lightboxImageTarget.alt = image.alt;
        }
    }

    closeExpand() {
        if (!this.hasLightboxTarget) return;
        this.lightboxTarget.hidden = true;
        if (this.hasLightboxVideoTarget) {
            this.lightboxVideoTarget.pause();
            this.lightboxVideoTarget.removeAttribute('src');
        }
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
        if (this.hasLightboxTarget && !this.lightboxTarget.hidden) {
            this.closeExpand();
            return;
        }
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
            this.renderDots();
            this.refreshVisibility();
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
        this.renderDots();
        this.refreshVisibility();
    }
}
