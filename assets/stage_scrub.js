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
            const release = this.hold();
            this.boot(next).finally(release);
        }
        this.dirty = true;
    }

    prime(branchId) {
        const stage = this.root.querySelector(`#branch-${CSS.escape(branchId)} [data-stage]`);
        if (!stage) return;
        const state = this.bind(stage);
        this.ensure(state.clips[0]);
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
        return this.ensure(first).then(() => {
            if (first.kind === 'frames') {
                const img = this.image(stage, first, 0);
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
                if (i >= 0 && i < clip.frames && clip.blobs?.[i]) this.image(this.stage, clip, i);
            }
        });
    }

    paint() {
        const canvas = this.stage.querySelector('canvas');
        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx || !canvas.width) return;
        const prepared = this.layers(this.drawn).map((layer) => this.prepare(layer)).filter(Boolean);
        if (!prepared.length) return;
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
        if (!clip.blobs?.[index]) return null;
        const img = this.image(this.stage, clip, index);
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
            let opacity = 0;
            let y = 18;
            if (u >= 0 && u <= 1) {
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
            const shift = cue.classList.contains('stage__cue--center') ? 'translateX(-50%) ' : '';
            cue.style.opacity = String(opacity);
            cue.style.transform = `${shift}translate3d(0, ${y.toFixed(2)}px, 0)`;
            cue.style.pointerEvents = opacity > 0.8 ? 'auto' : 'none';
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
        if (clip.kind === 'still') {
            if (!clip.done) {
                clip.done = new Promise((resolve) => {
                    const img = this.image(this.stage || this.visible(), clip, 0);
                    if (!img) { resolve(); return; }
                    if (img.complete && img.naturalWidth) { clip.ready = true; resolve(); return; }
                    img.addEventListener('load', () => { clip.ready = true; resolve(); }, { once: true });
                    img.addEventListener('error', () => resolve(), { once: true });
                });
            }
            return clip.done;
        }
        if (clip.done) return clip.done;
        clip.blobs = new Array(clip.frames);
        const jobs = [];
        for (let i = 0; i < clip.frames; i += 1) {
            const index = i;
            jobs.push(() => fetch(this.url(clip, index)).then((response) => {
                if (!response.ok) throw new Error(String(response.status));
                return response.blob();
            }).then((blob) => {
                clip.blobs[index] = URL.createObjectURL(blob);
            }));
        }
        clip.done = this.pool(jobs, 6).then(() => { clip.ready = true; });
        return clip.done;
    }

    url(clip, index) {
        const base = this.desktop ? clip.d : clip.m;
        return `${base}/${String(index + 1).padStart(4, '0')}.webp`;
    }

    image(stage, clip, index) {
        if (!stage || !clip) return null;
        const key = `${stage.dataset.stage}:${clip.id}:${index}:${this.desktop ? 'd' : 'm'}`;
        if (this.cache.has(key)) {
            const existing = this.cache.get(key);
            this.cache.delete(key);
            this.cache.set(key, existing);
            return existing;
        }
        const src = clip.kind === 'still' ? clip.src : clip.blobs?.[index];
        if (!src) return null;
        const img = new Image();
        img.decoding = 'async';
        img.src = src;
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
        if (!clip || clip.kind !== 'frames' || !clip.blobs) return;
        const prefix = `${stage.dataset.stage}:${clip.id}:`;
        [...this.cache.keys()].forEach((key) => {
            if (!key.startsWith(prefix)) return;
            const img = this.cache.get(key);
            this.cache.delete(key);
            if (img) img.src = '';
        });
        clip.blobs.forEach((url) => { if (url) URL.revokeObjectURL(url); });
        clip.blobs = null;
        clip.ready = false;
        clip.done = null;
    }
}
