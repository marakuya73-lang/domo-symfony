/**
 * Stone House style scrub: one sticky canvas, frames advanced by scroll.
 * About one extracted frame per 10px, blended with the next so a smaller
 * scroll still changes the picture. A tight lerp keeps the motion smooth
 * without a stretch where the image sits still.
 */
export default class StageScrub {
    constructor(root) {
        this.root = root;
        this.desktop = window.innerWidth >= 900;
        this.cache = new Map();
        this.cacheLimit = 20;
        this.drawn = 0;
        this.stage = null;
        this.state = null;
        this.needsBoot = true;
        this.onScroll = () => { this.dirty = true; };
        this.onResize = () => this.resize();
        this.tick = this.tick.bind(this);
    }

    start() {
        this.stage = this.visible();
        if (!this.stage) return;
        this.state = this.bind(this.stage);
        this.layout();
        this.raf = requestAnimationFrame(this.tick);
        window.addEventListener('scroll', this.onScroll, { passive: true });
        window.addEventListener('resize', this.onResize);
        this.pendingRelease = this.hold();
        const boot = this.boot(this.stage);
        const giveUp = new Promise((resolve) => { this.bootTimer = setTimeout(resolve, 20000); });
        Promise.race([boot, giveUp]).finally(() => {
            clearTimeout(this.bootTimer);
            this.pendingRelease?.();
            this.pendingRelease = null;
            this.needsBoot = false;
        });
        this.watchChoices();
    }

    watchChoices() {
        const hub = this.root.querySelector('#hub-break');
        if (!hub) return;
        this.choiceObserver = new IntersectionObserver((entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            ['estadia', 'retiro', 'jornada'].forEach((id) => this.prime(id));
            this.choiceObserver.disconnect();
        }, { rootMargin: '320px' });
        this.choiceObserver.observe(hub);
    }

    hold() {
        this.holds = (this.holds || 0) + 1;
        document.documentElement.classList.add('is-booting');
        let done = false;
        return () => {
            if (done) return;
            done = true;
            this.holds -= 1;
            if (this.holds <= 0) document.documentElement.classList.remove('is-booting');
        };
    }

    stop() {
        this.pendingRelease?.();
        this.pendingRelease = null;
        this.choiceObserver?.disconnect();
        if (this.raf) cancelAnimationFrame(this.raf);
        window.removeEventListener('scroll', this.onScroll);
        window.removeEventListener('resize', this.onResize);
        document.documentElement.classList.remove('is-booting');
    }

    activate() {
        const next = this.visible();
        if (!next) return;
        if (this.stage && this.stage !== next) this.releaseStage(this.stage);
        this.stage = next;
        this.state = this.bind(next);
        this.layout();
        this.drawn = this.target();
        if (!next.classList.contains('is-live')) {
            if (next.dataset.stream === '1') {
                this.boot(next);
            } else {
                const release = this.hold();
                this.boot(next).finally(release);
            }
        }
        this.dirty = true;
    }

    prime(branchId) {
        const stage = this.root.querySelector(`#branch-${CSS.escape(branchId)} [data-stage]`);
        if (!stage) return;
        const state = this.bind(stage);
        this.preparePoster(stage);
        const first = state.clips[0];
        this.warmClip(first, first.preview || 24);
    }

    bind(stage) {
        if (stage._scrub) return stage._scrub;
        const data = JSON.parse(stage.dataset.sequence);
        const clips = data.clips;
        const starts = [];
        let cursor = 0;
        clips.forEach((clip) => {
            starts.push(cursor);
            cursor += clip.frames - (clip.overlap || 0);
        });
        stage._scrub = { clips, starts, total: cursor, px: data.px || 10 };
        stage.style.height = `${Math.round((cursor - 1) * (data.px || 10) + (window.innerHeight || 800))}px`;
        return stage._scrub;
    }

    layout() {
        const vh = window.innerHeight || 800;
        this.root.querySelectorAll('[data-stage]').forEach((stage) => {
            const state = this.bind(stage);
            stage.style.height = `${Math.round((state.total - 1) * state.px + vh)}px`;
        });
        this.resizeCanvas();
    }

    resize() {
        const desktop = window.innerWidth >= 900;
        if (desktop !== this.desktop) {
            this.desktop = desktop;
            this.root.querySelectorAll('[data-stage]').forEach((stage) => this.releaseStage(stage));
            if (this.stage) this.boot(this.stage);
        }
        this.layout();
        this.dirty = true;
    }

    visible() {
        return [...this.root.querySelectorAll('[data-stage]')].find((stage) => stage.getClientRects().length > 0) || null;
    }

    target() {
        if (!this.stage || !this.state) return 0;
        const rect = this.stage.getBoundingClientRect();
        const scrollable = this.stage.offsetHeight - (window.innerHeight || 800);
        const progress = scrollable <= 0 ? 0 : Math.min(1, Math.max(0, -rect.top / scrollable));
        return progress * (this.state.total - 1);
    }

    tick() {
        this.raf = requestAnimationFrame(this.tick);
        if (!this.stage || !this.state) return;
        const target = this.target();
        const delta = target - this.drawn;
        if (Math.abs(delta) < 0.0008) this.drawn = target;
        else this.drawn += delta * 0.45;
        this.warm(this.drawn);
        this.paint();
        this.placeCues(target);
        this.prefetch(target);
        this.stage.dataset.frame = this.drawn.toFixed(3);
    }

    boot(stage) {
        const state = this.bind(stage);
        const first = state.clips[0];
        if (stage.dataset.stream === '1') {
            const poster = this.preparePoster(stage);
            const ready = poster ? this.whenImage(poster) : Promise.resolve();
            return ready.then(() => {
                this.paintStage(stage);
                stage.classList.add('is-live');
                return this.warmClip(first, first.preview || 24);
            }).then(() => this.ensure(first)).catch(() => {
                stage.classList.add('is-live');
            });
        }
        return this.ensure(first).then(() => {
            if (first.kind === 'frames') {
                const img = this.frameImage(first, 0);
                if (img && typeof img.decode === 'function') return img.decode().catch(() => {});
            }
        }).then(() => {
            stage.classList.add('is-live');
            this.dirty = true;
        }).catch(() => {
            stage.classList.add('is-live');
        });
    }

    prefetch(frame) {
        if (!this.state) return;
        const index = this.clipIndex(frame);
        const clips = this.state.clips;
        this.ensure(clips[index]);
        if (clips[index + 1]) this.ensure(clips[index + 1]);
        clips.forEach((clip, i) => {
            if (i < index - 1) this.releaseClip(this.stage, clip);
        });
    }

    clipIndex(frame) {
        const { starts, clips } = this.state;
        let index = 0;
        for (let i = 0; i < starts.length; i += 1) {
            if (starts[i] <= frame) index = i;
        }
        return Math.min(index, clips.length - 1);
    }

    layers(frame) {
        const { clips, starts } = this.state;
        const layers = [];
        for (let i = 0; i < clips.length; i += 1) {
            const frames = clips[i].frames;
            const local = frame - starts[i];
            if (local < -0.001 || local > frames - 1 + 0.001) continue;
            const clamped = Math.min(Math.max(local, 0), frames - 1);
            const prev = i > 0 ? (clips[i - 1].overlap || 0) : 0;
            const next = clips[i].overlap || 0;
            let alpha = 1;
            if (prev > 0 && clamped < prev) alpha = clamped / prev;
            const tail = (frames - 1) - clamped;
            if (next > 0 && tail < next) alpha = Math.min(alpha, tail / next);
            if (alpha <= 0.001) continue;
            layers.push({ index: i, local: clamped, alpha });
        }
        const sum = layers.reduce((total, layer) => total + layer.alpha, 0) || 1;
        layers.forEach((layer) => { layer.alpha /= sum; });
        return layers;
    }

    warm(frame) {
        if (!this.stage || !this.state) return;
        this.layers(frame).forEach((layer) => {
            const clip = this.state.clips[layer.index];
            if (clip.kind === 'still') {
                this.image(this.stage, clip, 0);
                return;
            }
            const base = Math.floor(layer.local);
            for (let i = base - 1; i <= base + 8; i += 1) {
                const full = clip.blobs?.[i];
                const small = full ? null : clip.small?.[i];
                const src = full || small;
                if (i >= 0 && i < clip.frames && src) this.image(this.stage, clip, i, src, full ? 'f' : 's');
            }
        });
    }

    paint() {
        const canvas = this.stage.querySelector('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx || !canvas.width) return;
        const prepared = this.layers(this.drawn).map((layer) => this.prepare(layer)).filter(Boolean);
        if (!prepared.length) {
            const poster = this.preparePoster(this.stage);
            if (!poster || !poster.complete || !poster.naturalWidth) return;
            ctx.setTransform(1, 0, 0, 1, 0, 0);
            ctx.globalAlpha = 1;
            this.cover(ctx, poster, 1, 1, 0);
            return;
        }
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = this.stage.querySelector('.stage__sticky')?.style.backgroundColor || '#14110e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        prepared.forEach((layer, index) => {
            if (index === 0) {
                this.cover(ctx, layer.img, 1, layer.zoom, layer.pan);
                if (layer.next) this.cover(ctx, layer.next, layer.mix, layer.zoom, layer.pan);
                return;
            }
            const top = layer.mix > 0.5 && layer.next ? layer.next : layer.img;
            this.cover(ctx, top, layer.alpha, layer.zoom, layer.pan);
        });
        ctx.globalAlpha = 1;
    }

    prepare(layer) {
        const clip = this.state.clips[layer.index];
        if (clip.kind === 'still') {
            const img = this.image(this.stage, clip, 0);
            if (!img || !img.complete || !img.naturalWidth) return null;
            const progress = layer.local / Math.max(1, clip.frames - 1);
            return {
                img,
                next: null,
                mix: 0,
                alpha: layer.alpha,
                zoom: 1 + progress * (clip.zoom || 0.16),
                pan: (progress - 0.5) * (clip.pan || 0),
            };
        }
        const i0 = Math.floor(layer.local);
        const i1 = Math.min(i0 + 1, clip.frames - 1);
        const img = this.frameImage(clip, i0) || (i1 !== i0 ? this.frameImage(clip, i1) : null);
        if (!img) return null;
        const next = i1 === i0 ? null : this.frameImage(clip, i1);
        return { img, next, mix: next ? layer.local - i0 : 0, alpha: layer.alpha, zoom: 1, pan: 0 };
    }

    frameImage(clip, index) {
        const full = clip.blobs?.[index];
        const small = !full ? clip.small?.[index] : null;
        const src = full || small;
        if (!src) return null;
        const img = this.image(this.stage, clip, index, src, full ? 'f' : 's');
        if (!img || !img.complete || !img.naturalWidth) return null;
        return img;
    }

    cover(ctx, img, alpha, zoom, pan) {
        if (alpha <= 0.001) return;
        const cw = ctx.canvas.width;
        const ch = ctx.canvas.height;
        const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight) * zoom;
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.globalAlpha = alpha;
        ctx.drawImage(img, (cw - dw) / 2 + pan * cw, (ch - dh) / 2, dw, dh);
    }

    placeCues(progressFrame) {
        if (!this.state) return;
        const progress = this.state.total <= 1 ? 0 : progressFrame / (this.state.total - 1);
        this.stage.querySelectorAll('.stage__cue').forEach((cue) => {
            const from = Number(cue.dataset.from);
            const to = Number(cue.dataset.to);
            const span = Math.max(0.0001, to - from);
            const u = (progress - from) / span;
            const fade = 0.16;
            const lead = from < 0.01 ? 0 : fade;
            const hold = cue.dataset.hold === '1';
            let opacity = 0;
            let y = 18;
            if (hold && progress >= from) {
                const spanIn = 0.012;
                const t = from < 0.01 ? 1 : Math.min(1, (progress - from) / spanIn);
                opacity = t;
                y = 18 * (1 - t);
            } else if (u >= 0 && u <= 1) {
                if (lead > 0 && u < lead) {
                    opacity = u / lead;
                    y = 18 * (1 - opacity);
                } else if (u > 1 - fade) {
                    opacity = (1 - u) / fade;
                    y = -14 * (1 - opacity);
                } else {
                    opacity = 1;
                    y = 0;
                }
            }
            const center = cue.classList.contains('stage__cue--center');
            const middle = cue.classList.contains('stage__cue--middle');
            const shift = center && middle ? 'translate(-50%, -50%) ' : center ? 'translateX(-50%) ' : middle ? 'translateY(-50%) ' : '';
            cue.style.opacity = String(opacity);
            cue.style.transform = `${shift}translate3d(0, ${y.toFixed(2)}px, 0)`;
            cue.style.pointerEvents = opacity > 0.8 ? 'auto' : 'none';
        });
        this.stage.querySelectorAll('.scroll-hint').forEach((hint) => {
            hint.classList.toggle('is-gone', this.target() > 0.6);
        });
    }

    resizeCanvas() {
        if (!this.stage) return;
        const canvas = this.stage.querySelector('canvas');
        const sticky = this.stage.querySelector('.stage__sticky');
        if (!canvas || !sticky) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = sticky.clientWidth || window.innerWidth;
        const height = sticky.clientHeight || window.innerHeight;
        const nextW = Math.max(1, Math.round(width * dpr));
        const nextH = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== nextW || canvas.height !== nextH) {
            canvas.width = nextW;
            canvas.height = nextH;
        }
    }

    ensure(clip) {
        if (!clip) return Promise.resolve();
        if (clip.kind === 'still') return this.whenStill(clip);
        if (clip.fullDone) return clip.fullDone;
        if (!clip.blobs) clip.blobs = new Array(clip.frames);
        const jobs = [];
        for (let i = 0; i < clip.frames; i += 1) jobs.push(() => this.fetchInto(clip, i, 'full'));
        clip.fullDone = this.pool(jobs, 4).then(() => { clip.ready = true; });
        return clip.fullDone;
    }

    warmClip(clip, count) {
        if (!clip || clip.kind !== 'frames') return this.ensure(clip);
        const limit = Math.min(count, clip.frames);
        const tier = clip.s ? 's' : 'full';
        if (tier === 's' && !Array.isArray(clip.small)) clip.small = new Array(clip.frames);
        if (tier === 'full' && !Array.isArray(clip.blobs)) clip.blobs = new Array(clip.frames);
        const jobs = [];
        for (let i = 0; i < limit; i += 1) jobs.push(() => this.fetchInto(clip, i, tier));
        return this.pool(jobs, 6);
    }

    fetchInto(clip, index, tier) {
        const slot = tier === 's' ? 'small' : 'blobs';
        const marks = tier === 's' ? 'smallJobs' : 'fullJobs';
        if (!clip[slot]) clip[slot] = new Array(clip.frames);
        if (clip[slot][index]) return Promise.resolve();
        if (!clip[marks]) clip[marks] = [];
        if (clip[marks][index]) return clip[marks][index];
        const pending = fetch(this.url(clip, index, tier)).then((response) => {
            if (!response.ok) throw new Error(String(response.status));
            return response.blob();
        }).then((blob) => {
            clip[slot][index] = URL.createObjectURL(blob);
        }).catch(() => {
            clip[marks][index] = null;
        });
        clip[marks][index] = pending;
        return pending;
    }

    url(clip, index, tier = 'full') {
        const base = tier === 's' ? clip.s : (this.desktop ? clip.d : clip.m);
        const file = index + 1 + (clip.offset || 0);
        return `${base}/${String(file).padStart(4, '0')}.webp`;
    }

    preparePoster(stage) {
        const src = stage?.dataset?.poster;
        if (!src) return null;
        if (!stage._poster) {
            const img = new Image();
            img.decoding = 'async';
            img.src = src;
            stage._poster = img;
        }
        return stage._poster;
    }

    whenImage(img) {
        if (img.complete && img.naturalWidth) return Promise.resolve();
        return new Promise((resolve) => {
            img.addEventListener('load', () => resolve(), { once: true });
            img.addEventListener('error', () => resolve(), { once: true });
        });
    }

    whenStill(clip) {
        if (!clip.done) {
            clip.done = new Promise((resolve) => {
                const img = this.image(this.stage || this.visible(), clip, 0, clip.src, 'still');
                if (!img) { resolve(); return; }
                this.whenImage(img).then(() => { clip.ready = true; resolve(); });
            });
        }
        return clip.done;
    }

    paintStage(stage) {
        const previous = this.stage;
        this.stage = stage;
        this.state = this.bind(stage);
        this.resizeCanvas();
        this.paint();
        this.stage = previous;
        if (previous) this.state = this.bind(previous);
    }

    image(stage, clip, index, src = null, tier = 'f') {
        if (!stage || !clip) return null;
        const key = `${stage.dataset.stage}:${clip.id}:${index}:${tier}:${this.desktop ? 'd' : 'm'}`;
        if (this.cache.has(key)) {
            const existing = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, existing);
            return existing;
        }
        const resolved = src || (clip.kind === 'still' ? clip.src : null);
        if (!resolved) return null;
        const img = new Image();
        img.decoding = 'async';
        img.src = resolved;
        this.cache.set(key, img);
        while (this.cache.size > this.cacheLimit) {
            const oldest = this.cache.keys().next().value;
            const old = this.cache.get(oldest);
            this.cache.delete(oldest);
            if (old) old.src = '';
        }
        return img;
    }

    pool(jobs, size) {
        let cursor = 0;
        const worker = async () => {
            while (cursor < jobs.length) {
                const job = jobs[cursor];
                cursor += 1;
                try { await job(); } catch (e) { /* a missed frame falls back to the nearest decoded one */ }
            }
        };
        return Promise.all(Array.from({ length: Math.min(size, jobs.length) }, worker)).then(() => {});
    }

    releaseStage(stage) {
        const state = stage._scrub;
        if (!state) return;
        state.clips.forEach((clip) => this.releaseClip(stage, clip));
    }

    releaseClip(stage, clip) {
        if (!clip || clip.kind !== 'frames') return;
        const prefix = `${stage.dataset.stage}:${clip.id}:`;
        [...this.cache.keys()].forEach((key) => {
            if (!key.startsWith(prefix)) return;
            const img = this.cache.get(key);
            this.cache.delete(key);
            if (img) img.src = '';
        });
        (clip.blobs || []).forEach((url) => { if (url) URL.revokeObjectURL(url); });
        (clip.small || []).forEach((url) => { if (typeof url === 'string') URL.revokeObjectURL(url); });
        clip.blobs = null;
        clip.small = null;
        clip.fullDone = null;
        clip.fullJobs = null;
        clip.smallJobs = null;
        clip.ready = false;
        clip.done = null;
    }
}
