'use strict';
/* =========================================================================
   Ultimate Fretboard v2
   Manche interactif : Canvas 2D (rendu en couches) + Web Audio, sans dépendance.
   ========================================================================= */

/* ---------- 1. DONNÉES ---------- */
const NOTES = {
    en: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    fr: ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
};
const IS_NATURAL = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];

// osc: [forme d'onde, niveau, désaccord en cents]
const INSTRUMENTS = {
    oud:      { osc: [['triangle', 1, 0], ['sawtooth', .22, 4]],  attack: .004, ring: 1.9, hold: .55, release: .35, fStart: 3400, fEnd: 300,  q: 1.5 },
    guitar:   { osc: [['triangle', 1, 0], ['sawtooth', .16, -5]], attack: .006, ring: 2.6, hold: .5,  release: .5,  fStart: 2700, fEnd: 480,  q: .8 },
    electric: { osc: [['square', .5, 0], ['sawtooth', .45, 7]],   attack: .003, ring: 3.2, hold: .7,  release: .6,  fStart: 4800, fEnd: 1300, q: 4 },
    violin:   { osc: [['sawtooth', .8, 0], ['sawtooth', .4, -8]], attack: .2,   ring: 1.7, hold: .9,  release: .45, fStart: 2400, fEnd: 2000, q: 2, vibrato: [5.5, 9], bowed: true },
    synth:    { osc: [['sine', 1, 0], ['square', .12, 12]],       attack: .03,  ring: 2.2, hold: .6,  release: .8,  fStart: 7000, fEnd: 240,  q: 7 }
};

const SCALES = {
    western: {
        major:        { fr: 'Majeur (ionien)', en: 'Major (Ionian)', iv: [0, 2, 4, 5, 7, 9, 11] },
        minor:        { fr: 'Mineur naturel (éolien)', en: 'Natural minor (Aeolian)', iv: [0, 2, 3, 5, 7, 8, 10] },
        pent_maj:     { fr: 'Pentatonique majeure', en: 'Major pentatonic', iv: [0, 2, 4, 7, 9] },
        pent_min:     { fr: 'Pentatonique mineure', en: 'Minor pentatonic', iv: [0, 3, 5, 7, 10] },
        blues:        { fr: 'Blues', en: 'Blues', iv: [0, 3, 5, 6, 7, 10] },
        harmonic_min: { fr: 'Mineur harmonique', en: 'Harmonic minor', iv: [0, 2, 3, 5, 7, 8, 11] },
        mixolydian:   { fr: 'Mixolydien', en: 'Mixolydian', iv: [0, 2, 4, 5, 7, 9, 10] },
        dorian:       { fr: 'Dorien', en: 'Dorian', iv: [0, 2, 3, 5, 7, 9, 10] },
        phrygian:     { fr: 'Phrygien', en: 'Phrygian', iv: [0, 1, 3, 5, 7, 8, 10] }
    },
    oriental: {
        rast:     { fr: 'Maqam Rast', en: 'Maqam Rast', iv: [0, 2, 3.5, 5, 7, 9, 10.5] },
        bayati:   { fr: 'Maqam Bayati', en: 'Maqam Bayati', iv: [0, 1.5, 3, 5, 7, 8, 10] },
        hijaz:    { fr: 'Maqam Hijaz', en: 'Maqam Hijaz', iv: [0, 1, 4, 5, 7, 8, 10] },
        saba:     { fr: 'Maqam Saba', en: 'Maqam Saba', iv: [0, 1.5, 3, 4, 7, 8, 10] },
        kurd:     { fr: 'Maqam Kurd', en: 'Maqam Kurd', iv: [0, 1, 3, 5, 7, 8, 10] },
        ajam:     { fr: 'Maqam Ajam', en: 'Maqam Ajam', iv: [0, 2, 4, 5, 7, 9, 11] },
        nahawand: { fr: 'Maqam Nahawand', en: 'Maqam Nahawand', iv: [0, 2, 3, 5, 7, 8, 10] },
        sikah:    { fr: 'Maqam Sikah', en: 'Maqam Sikah', iv: [0, 1.5, 3.5, 5, 7, 8.5, 10.5] }
    },
    andalous: {
        mezmoum:   { fr: 'Mezmoum (majeur)', en: 'Mezmoum (major)', iv: [0, 2, 4, 5, 7, 9, 11] },
        raml_maya: { fr: 'Raml Maya (éolien)', en: 'Raml Maya (Aeolian)', iv: [0, 2, 3, 5, 7, 8, 10] },
        zidane:    { fr: 'Zidane (hijaz)', en: 'Zidane (Hijaz)', iv: [0, 1, 4, 5, 7, 8, 10] },
        sika:      { fr: 'Sika (phrygien)', en: 'Sika (Phrygian)', iv: [0, 1, 3, 5, 7, 8, 10] },
        moual:     { fr: 'Moual (lydien)', en: 'Moual (Lydian)', iv: [0, 2, 4, 6, 7, 9, 11] },
        arak:      { fr: 'Arak (mixolydien)', en: 'Arak (Mixolydian)', iv: [0, 2, 4, 5, 7, 9, 10] },
        sihli:     { fr: 'Sihli (mineur harmonique)', en: 'Sihli (harmonic minor)', iv: [0, 2, 3, 5, 7, 8, 11] },
        ghrib:     { fr: 'Ghrib (dorien)', en: 'Ghrib (Dorian)', iv: [0, 2, 3, 5, 7, 9, 10] },
        djarka:    { fr: 'Djarka (majeur)', en: 'Djarka (major)', iv: [0, 2, 4, 5, 7, 9, 11] }
    }
};

const CHORDS = {
    maj:  { fr: 'Majeur', en: 'Major', iv: [0, 4, 7] },
    min:  { fr: 'Mineur', en: 'Minor', iv: [0, 3, 7] },
    '7':  { fr: '7 (dominante)', en: '7 (dominant)', iv: [0, 4, 7, 10] },
    maj7: { fr: 'Maj7', en: 'Maj7', iv: [0, 4, 7, 11] },
    min7: { fr: 'm7', en: 'm7', iv: [0, 3, 7, 10] },
    m7b5: { fr: 'm7♭5 (demi-diminué)', en: 'm7♭5 (half-diminished)', iv: [0, 3, 6, 10] },
    dim:  { fr: 'Diminué', en: 'Diminished', iv: [0, 3, 6] },
    aug:  { fr: 'Augmenté', en: 'Augmented', iv: [0, 4, 8] },
    sus2: { fr: 'Sus2', en: 'Sus2', iv: [0, 2, 7] },
    sus4: { fr: 'Sus4', en: 'Sus4', iv: [0, 5, 7] }
};

const PRESETS = {
    guitare:     { fr: 'Guitare', en: 'Guitar', len: 64.8, tuning: 'E4, B3, G3, D3, A2, E2', fret: 'fretted', sound: 'guitar' },
    oud_arabe:   { fr: 'Oud arabe (Do–Do)', en: 'Arabic oud (C–C)', len: 60, tuning: 'C4, G3, D3, A2, F2, C2', fret: 'fretless', sound: 'oud' },
    oud_turc:    { fr: 'Oud turc (Ré–Ré)', en: 'Turkish oud (D–D)', len: 58.5, tuning: 'G4, D4, A3, E3, A2, D2', fret: 'fretless', sound: 'oud' },
    oud_ancien:  { fr: 'Oud ancien (Fa–Fa)', en: 'Old oud (F–F)', len: 61.5, tuning: 'F4, C4, G3, D3, A2, F2', fret: 'fretless', sound: 'oud' },
    oud_irakien: { fr: 'Oud irakien (Bashir)', en: 'Iraqi oud (Bashir)', len: 60, tuning: 'G#4, D#4, A#3, F3, C3, F2', fret: 'fretless', sound: 'oud' },
    oud_grec:    { fr: 'Oud grec (Outi)', en: 'Greek oud (Outi)', len: 58.5, tuning: 'G4, D4, A3, E3, A2, D2', fret: 'fretless', sound: 'oud' },
    oud_maghreb: { fr: 'Oud maghrébin (5 cordes)', en: 'Maghreb oud (5 strings)', len: 60, tuning: 'C4, G3, D3, A2, G2', fret: 'fretless', sound: 'oud' },
    oud_moderne: { fr: 'Oud moderne (solo)', en: 'Modern oud (solo)', len: 60, tuning: 'C#4, G#3, D#3, A#2, F2, C2', fret: 'fretless', sound: 'oud' },
    basse:       { fr: 'Basse', en: 'Bass', len: 86.4, tuning: 'G2, D2, A1, E1', fret: 'fretted', sound: 'guitar' },
    violon:      { fr: 'Violon', en: 'Violin', len: 32.5, tuning: 'E5, A4, D4, G3', fret: 'fretless', sound: 'violin' }
};

const I18N = {
    fr: {
        mode_free: 'Libre', mode_chord: 'Accords', mode_scale: 'Gammes', mode_detect: 'Détecteur',
        notes: 'Notes', measures: 'Mesures', hint_free: 'Touchez ou glissez sur les cordes — plusieurs doigts possibles',
        root: 'Fondamentale', chord_type: 'Type d’accord', genre: 'Famille', scale: 'Gamme', sound: 'Son',
        sustain: 'Sustain infini', stop: 'Stop (Échap)', focus: 'Plein écran', exit_focus: 'Quitter le plein écran',
        settings: 'Réglages', close: 'Fermer', clear: 'Effacer',
        hide_menu: 'Masquer le menu', show_menu: 'Afficher le menu', install: 'Installer l’application',
        detect_hint: 'Touchez des notes sur le manche…',
        detect_empty: 'Les gammes et maqams contenant vos notes apparaîtront ici.',
        detect_none: 'Aucune gamme connue ne contient toutes ces notes.',
        lg_root: 'Fondamentale', lg_chord: 'Accord', lg_scale: 'Gamme', lg_quarter: '¼ de ton', lg_selected: 'Sélection',
        lg_natural: 'Naturelle', lg_sharp: 'Altérée',
        micro_fix: '¼ de ton : passer en fretless',
        genre_western: 'Occidental', genre_oriental: 'Oriental / arabe', genre_andalous: 'Andalou (Algérie)',
        snd_oud: 'Oud', snd_guitar: 'Guitare nylon', snd_electric: 'Électrique', snd_violin: 'Violon', snd_synth: 'Synthé',
        sec_instrument: 'Instrument', preset: 'Préréglage', custom: 'Personnalisé',
        tuning: 'Accordage (de l’aigu au grave)',
        tuning_help: 'Ex. : Do4, Sol3, Ré3 ou C4, G3, D3 — dièses (#) et bémols (b) acceptés.',
        tuning_bad: 'Note non reconnue : ',
        length: 'Longueur de corde vibrante (cm)', neck: 'Manche', fretted: 'Fretté', fretless: 'Fretless',
        neck_help: 'Fretless : hauteur continue et quarts de ton (oud, violon). Fretté : les notes se calent sur les frettes.',
        sec_display: 'Affichage', frets: 'Cases visibles', auto: 'Auto', orientation: 'Orientation',
        horizontal: 'Horizontale', vertical: 'Verticale',
        show_notes: 'Noms des notes', show_measures: 'Mesures (cm depuis le sillet)',
        sec_sound: 'Son', volume: 'Volume', reverb: 'Réverbération',
        ios_note: 'Sur iPhone / iPad, désactivez le mode silencieux pour entendre le son.',
        sec_lang: 'Langue', old_version: 'ancienne version'
    },
    en: {
        mode_free: 'Free', mode_chord: 'Chords', mode_scale: 'Scales', mode_detect: 'Detector',
        notes: 'Notes', measures: 'Measures', hint_free: 'Tap or slide on the strings — multi-touch supported',
        root: 'Root', chord_type: 'Chord type', genre: 'Family', scale: 'Scale', sound: 'Sound',
        sustain: 'Infinite sustain', stop: 'Stop (Esc)', focus: 'Full screen', exit_focus: 'Exit full screen',
        settings: 'Settings', close: 'Close', clear: 'Clear',
        hide_menu: 'Hide menu', show_menu: 'Show menu', install: 'Install the app',
        detect_hint: 'Tap notes on the neck…',
        detect_empty: 'Scales and maqams containing your notes will show up here.',
        detect_none: 'No known scale contains all of these notes.',
        lg_root: 'Root', lg_chord: 'Chord', lg_scale: 'Scale', lg_quarter: 'Quarter tone', lg_selected: 'Selected',
        lg_natural: 'Natural', lg_sharp: 'Sharp',
        micro_fix: 'Quarter tones: switch to fretless',
        genre_western: 'Western', genre_oriental: 'Oriental / Arabic', genre_andalous: 'Andalusian (Algeria)',
        snd_oud: 'Oud', snd_guitar: 'Nylon guitar', snd_electric: 'Electric', snd_violin: 'Violin', snd_synth: 'Synth',
        sec_instrument: 'Instrument', preset: 'Preset', custom: 'Custom',
        tuning: 'Tuning (high to low)',
        tuning_help: 'E.g. C4, G3, D3 or Do4, Sol3, Ré3 — sharps (#) and flats (b) accepted.',
        tuning_bad: 'Unknown note: ',
        length: 'Scale length (cm)', neck: 'Neck', fretted: 'Fretted', fretless: 'Fretless',
        neck_help: 'Fretless: continuous pitch and quarter tones (oud, violin). Fretted: notes snap to frets.',
        sec_display: 'Display', frets: 'Visible frets', auto: 'Auto', orientation: 'Orientation',
        horizontal: 'Horizontal', vertical: 'Vertical',
        show_notes: 'Note names', show_measures: 'Measurements (cm from nut)',
        sec_sound: 'Sound', volume: 'Volume', reverb: 'Reverb',
        ios_note: 'On iPhone / iPad, turn off silent mode to hear sound.',
        sec_lang: 'Language', old_version: 'previous version'
    }
};

const COLORS = {
    root:   { fill: '#f2545b', text: '#fff' },
    chord:  { fill: '#4f8ff7', text: '#fff' },
    scale:  { fill: '#16b981', text: '#fff' },
    detect: { fill: '#f5a524', text: '#1b1406', ring: '#fff' },
    free:   { fill: 'rgba(245,240,230,.17)', text: '#f3efe6', plain: true },
    freeSharp: { fill: 'rgba(245,240,230,.07)', text: 'rgba(243,239,230,.62)', plain: true }
};

const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const TAU = Math.PI * 2;
const FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const STORE_KEY = 'ultimate-fretboard-v2';

/* ---------- 2. OUTILS ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mod12 = v => ((v % 12) + 12) % 12;
const near = (a, b) => Math.abs(a - b) < 0.05;
const snapQ = v => Math.round(v * 2) / 2;
const posCm = (L, semis) => L * (1 - Math.pow(2, -semis / 12));

// Nom d'une note (valeur 0..11.5). Les quarts de ton suivent l'usage oriental : Mi½♭, Si½♭, Fa½♯…
function noteParts(v, lang) {
    const names = NOTES[lang];
    v = mod12(snapQ(v));
    if (Number.isInteger(v)) return { base: names[v], acc: '' };
    const up = Math.ceil(v) % 12;
    return IS_NATURAL[up] ? { base: names[up], acc: '½♭' } : { base: names[Math.floor(v)], acc: '½♯' };
}
const noteText = (v, lang) => { const p = noteParts(v, lang); return p.base + p.acc; };

function octaveOf(midi, parts) {
    const m = parts.acc === '½♭' ? Math.ceil(midi) : Math.floor(midi);
    return Math.floor(m / 12) - 1;
}

const NOTE_RE = /^(do|ré|re|mi|fa|sol|la|si|[a-g])(#|♯|b|♭)?(-?\d)$/i;
const NAME_IDX = { do: 0, re: 2, mi: 4, fa: 5, sol: 7, la: 9, si: 11, c: 0, d: 2, e: 4, f: 5, g: 7, a: 9, b: 11 };

function parseTuning(text) {
    const strings = [], bad = [];
    String(text).split(/[,;\s]+/).filter(Boolean).forEach(tok => {
        const m = tok.normalize('NFC').match(NOTE_RE);
        if (!m) { bad.push(tok); return; }
        const key = m[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
        const acc = m[2] ? (/[#♯]/.test(m[2]) ? 1 : -1) : 0;
        const midi = (parseInt(m[3], 10) + 1) * 12 + NAME_IDX[key] + acc;
        strings.push({ midi, freq: 440 * Math.pow(2, (midi - 69) / 12) });
    });
    return { strings, bad };
}

const formatTuning = (strings, lang) =>
    strings.map(s => NOTES[lang][mod12(s.midi)] + (Math.floor(s.midi / 12) - 1)).join(', ');

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
    r = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

/* ---------- 3. MOTEUR AUDIO ---------- */
class Voice {
    constructor(engine, freq, key, sustain) {
        const ctx = engine.ctx, p = INSTRUMENTS[key] || INSTRUMENTS.guitar, t = ctx.currentTime;
        this.engine = engine; this.ctx = ctx; this.p = p; this.released = false;

        this.filter = ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.Q.value = p.q;
        this.filter.frequency.setValueAtTime(Math.max(p.fStart, freq * 3), t);
        this.filter.frequency.exponentialRampToValueAtTime(Math.max(p.fEnd, freq * 1.2), t + p.ring * .8);

        this.out = ctx.createGain();
        this.oscs = p.osc.map(([type, level, detune]) => {
            const o = ctx.createOscillator(), g = ctx.createGain();
            o.type = type;
            o.frequency.setValueAtTime(freq, t);
            o.detune.value = detune;
            g.gain.value = level;
            o.connect(g); g.connect(this.filter);
            return o;
        });

        if (p.vibrato) {
            const lfo = ctx.createOscillator(), depth = ctx.createGain();
            lfo.frequency.value = p.vibrato[0];
            depth.gain.setValueAtTime(0, t);
            depth.gain.linearRampToValueAtTime(p.vibrato[1], t + .45);
            lfo.connect(depth);
            this.oscs.forEach(o => depth.connect(o.detune));
            lfo.start(t);
            this.lfo = lfo;
        }

        this.filter.connect(this.out);
        this.out.connect(engine.bus);

        // Les graves paraissent plus faibles : légère compensation
        const peak = .32 * clamp(Math.pow(196 / freq, .3), .65, 1.5);
        const g = this.out.gain;
        g.setValueAtTime(.0001, t);
        g.linearRampToValueAtTime(peak, t + p.attack);
        if (sustain) {
            g.setTargetAtTime(peak * p.hold, t + p.attack, .3);
            this.end = Infinity;
        } else if (p.bowed) {
            g.setValueAtTime(peak, t + .6);
            g.exponentialRampToValueAtTime(.0001, t + p.ring);
            this.end = t + p.ring;
        } else {
            g.exponentialRampToValueAtTime(.0001, t + p.attack + p.ring);
            this.end = t + p.attack + p.ring;
        }

        this.oscs.forEach(o => o.start(t));
        this.oscs[0].onended = () => this.dispose();
        if (this.end !== Infinity) this.stopAt(this.end + .05);
        engine.voices.add(this);
    }

    get alive() { return !this.released && this.ctx.currentTime < this.end - .3; }

    stopAt(time) {
        [...this.oscs, this.lfo].forEach(o => { if (o) try { o.stop(time); } catch (e) { /* déjà arrêté */ } });
    }

    setFreq(f) {
        const t = this.ctx.currentTime;
        this.oscs.forEach(o => { o.frequency.cancelScheduledValues(t); o.frequency.setTargetAtTime(f, t, .012); });
    }

    release(dur) {
        if (this.released) return;
        this.released = true;
        dur = dur ?? this.p.release;
        const t = this.ctx.currentTime, g = this.out.gain;
        if (g.cancelAndHoldAtTime) g.cancelAndHoldAtTime(t);
        else { g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); }
        g.setTargetAtTime(0, t, Math.max(dur / 4, .008));
        this.stopAt(t + dur + .05);
    }

    dispose() {
        this.engine.voices.delete(this);
        try { this.out.disconnect(); } catch (e) { /* ignore */ }
    }
}

class AudioEngine {
    constructor(volume, reverb) {
        this.ctx = null;
        this.voices = new Set();
        this.volume = volume;
        this.reverb = reverb;
    }

    // Crée / réveille le contexte audio (doit être appelé pendant un geste utilisateur, surtout sur iOS)
    unlock() {
        if (!this.ctx) {
            const AC = window.AudioContext || window.webkitAudioContext;
            if (!AC) return null;
            const ctx = this.ctx = new AC({ latencyHint: 'interactive' });
            this.bus = ctx.createGain();
            this.comp = ctx.createDynamicsCompressor();
            this.comp.threshold.value = -16;
            this.comp.knee.value = 12;
            this.comp.ratio.value = 4;
            this.comp.attack.value = .003;
            this.comp.release.value = .2;
            this.conv = ctx.createConvolver();
            this.conv.buffer = this.impulse(2.4, 2.8);
            this.wet = ctx.createGain();
            this.wet.gain.value = this.reverb ? .28 : 0;
            this.master = ctx.createGain();
            this.master.gain.value = this.volume;

            this.bus.connect(this.comp);
            this.bus.connect(this.conv);
            this.conv.connect(this.wet);
            this.wet.connect(this.comp);
            this.comp.connect(this.master);
            this.master.connect(ctx.destination);

            const silent = ctx.createBufferSource();
            silent.buffer = ctx.createBuffer(1, 1, 22050);
            silent.connect(ctx.destination);
            silent.start(0);
        }
        if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
        return this.ctx;
    }

    impulse(seconds, decay) {
        const rate = this.ctx.sampleRate, len = Math.floor(rate * seconds);
        const buf = this.ctx.createBuffer(2, len, rate);
        for (let ch = 0; ch < 2; ch++) {
            const d = buf.getChannelData(ch);
            for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
        }
        return buf;
    }

    play(freq, key, sustain) {
        if (!this.unlock()) return null;
        if (this.voices.size >= 32) this.voices.values().next().value.release(.05);
        return new Voice(this, freq, key, sustain);
    }

    stopAll(dur = .08) { this.voices.forEach(v => v.release(dur)); }

    setVolume(v) {
        this.volume = v;
        if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .03);
    }

    setReverb(on) {
        this.reverb = on;
        if (this.wet) this.wet.gain.setTargetAtTime(on ? .28 : 0, this.ctx.currentTime, .05);
    }
}

/* ---------- 4. ÉTAT ---------- */
const DEFAULTS = {
    lang: /^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en',
    mode: 'free', sound: 'guitar', sustain: false,
    preset: 'guitare', tuning: 'E4, B3, G3, D3, A2, E2', length: 64.8, fretMode: 'fretted',
    frets: 'auto', orientation: 'auto', showNotes: true, showMeasures: true,
    volume: .8, reverb: true, menuHidden: false,
    chordRoot: 0, chordType: 'maj',
    scaleRoot: 0, scaleGenre: 'western', scaleKey: 'major',
    detected: []
};

function loadState() {
    const s = { ...DEFAULTS };
    try {
        const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
        if (raw && typeof raw === 'object') {
            for (const k of Object.keys(DEFAULTS)) {
                if (k in raw && typeof raw[k] === typeof DEFAULTS[k]) s[k] = raw[k];
            }
        }
    } catch (e) { /* stockage indisponible */ }
    if (!I18N[s.lang]) s.lang = 'fr';
    if (!['free', 'chord', 'scale', 'detect'].includes(s.mode)) s.mode = 'free';
    if (!INSTRUMENTS[s.sound]) s.sound = 'guitar';
    if (!CHORDS[s.chordType]) s.chordType = 'maj';
    if (!SCALES[s.scaleGenre] || !SCALES[s.scaleGenre][s.scaleKey]) { s.scaleGenre = 'western'; s.scaleKey = 'major'; }
    if (!['fretted', 'fretless'].includes(s.fretMode)) s.fretMode = 'fretted';
    if (!['auto', '12', '15', '19', '24'].includes(s.frets)) s.frets = 'auto';
    if (!['auto', 'h', 'v'].includes(s.orientation)) s.orientation = 'auto';
    if (!Array.isArray(s.detected)) s.detected = [];
    s.length = clamp(+s.length || 64.8, 20, 130);
    s.volume = clamp(+s.volume, 0, 1);
    return s;
}

/* ---------- 5. APPLICATION ---------- */
class App {
    constructor() {
        this.s = loadState();
        this.detected = new Set(this.s.detected.filter(v => typeof v === 'number'));
        this.audio = new AudioEngine(this.s.volume, this.s.reverb);

        this.stage = $('#stage');
        this.canvas = $('#board');
        this.ctx = this.canvas.getContext('2d');
        this.base = document.createElement('canvas');   // bois, frettes, mesures
        this.over = document.createElement('canvas');   // points de notes
        this.bubble = $('#bubble');

        this.strings = [];
        this.vib = [];
        this.voiceByString = [];
        this.pointers = new Map();
        this.marks = [];
        this.hover = null;
        this.g = null;
        this.raf = 0;
        this.lastT = 0;

        this.applyTuning();
        this.bindUI();
        this.bindPointer();
        this.renderUI();

        if ('ResizeObserver' in window) new ResizeObserver(() => this.layout()).observe(this.stage);
        else window.addEventListener('resize', () => this.layout());
        this.layout();
    }

    t(key) { return I18N[this.s.lang][key] ?? key; }

    save() {
        this.s.detected = [...this.detected];
        try { localStorage.setItem(STORE_KEY, JSON.stringify(this.s)); } catch (e) { /* ignore */ }
    }

    refresh() {
        this.save();
        this.renderUI();
        this.layout();
    }

    /* ----- Accordage / préréglages ----- */
    applyTuning() {
        let { strings } = parseTuning(this.s.tuning);
        if (!strings.length) {
            this.s.tuning = PRESETS.guitare.tuning;
            strings = parseTuning(this.s.tuning).strings;
        }
        this.voiceByString.forEach(v => v && v.release(.1));
        this.strings = strings;
        this.voiceByString = strings.map(() => null);
        this.vib = strings.map(() => ({ amp: 0, phase: 0, u: 0, sus: false }));
        this.marks = [];
    }

    matchPreset() {
        const cur = this.strings.map(s => s.midi).join(',');
        for (const [key, p] of Object.entries(PRESETS)) {
            const midis = parseTuning(p.tuning).strings.map(s => s.midi).join(',');
            if (midis === cur && Math.abs(p.len - this.s.length) < .01) return key;
        }
        return 'custom';
    }

    loadPreset(key) {
        if (!PRESETS[key]) { this.s.preset = 'custom'; this.refresh(); return; }
        const p = PRESETS[key];
        Object.assign(this.s, { preset: key, length: p.len, fretMode: p.fret, sound: p.sound });
        this.s.tuning = formatTuning(parseTuning(p.tuning).strings, this.s.lang);
        this.applyTuning();
        this.refresh();
    }

    validateTuning(text) {
        const { strings, bad } = parseTuning(text);
        const help = $('#tuningHelp'), input = $('#tuning');
        const error = bad.length || !strings.length;
        help.textContent = bad.length ? this.t('tuning_bad') + bad.join(', ') : this.t('tuning_help');
        help.classList.toggle('error', !!error);
        input.classList.toggle('error', !!error);
        return !error;
    }

    commitTuning(text) {
        if (!this.validateTuning(text)) return;
        this.s.tuning = formatTuning(parseTuning(text).strings, this.s.lang);
        this.applyTuning();
        this.s.preset = this.matchPreset();
        this.refresh();
    }

    setLength(v) {
        if (!isFinite(v)) { this.renderUI(); return; }
        this.s.length = clamp(Math.round(v * 10) / 10, 20, 130);
        this.s.preset = this.matchPreset();
        this.refresh();
    }

    setLang(lang) {
        this.s.lang = lang;
        this.s.tuning = formatTuning(this.strings, lang);
        this.refresh();
    }

    /* ----- Théorie ----- */
    scaleIv() { return SCALES[this.s.scaleGenre][this.s.scaleKey].iv; }
    chordPcs() { return CHORDS[this.s.chordType].iv.map(v => mod12(this.s.chordRoot + v)); }
    scaleHasMicro() { return !Number.isInteger(this.s.scaleRoot) || this.scaleIv().some(v => !Number.isInteger(v)); }

    classify(pc) {
        const s = this.s, isInt = Number.isInteger(pc);
        if (s.mode === 'chord') {
            if (isInt && this.chordPcs().some(v => near(v, pc))) return near(pc, s.chordRoot) ? COLORS.root : COLORS.chord;
            return null;
        }
        if (s.mode === 'scale') {
            const iv = mod12(pc - s.scaleRoot);
            if (this.scaleIv().some(v => near(v, iv))) return near(iv, 0) || near(iv, 12) ? COLORS.root : COLORS.scale;
            return null;
        }
        if (s.mode === 'detect') {
            for (const v of this.detected) if (near(v, pc)) return COLORS.detect;
        }
        if (s.showNotes && isInt) return IS_NATURAL[pc] ? COLORS.free : COLORS.freeSharp;
        return null;
    }

    findScales() {
        const notes = [...this.detected].sort((a, b) => a - b);
        if (!notes.length) return [];
        const groups = new Map();
        for (let r2 = 0; r2 < 24; r2++) {
            const root = r2 / 2;
            for (const [genre, list] of Object.entries(SCALES)) {
                for (const [key, sc] of Object.entries(list)) {
                    if (!notes.every(n => sc.iv.some(v => near(v, mod12(n - root))))) continue;
                    const sig = root + '|' + sc.iv.join(',');
                    if (!groups.has(sig)) {
                        groups.set(sig, {
                            root, size: sc.iv.length, items: [],
                            hasRoot: notes.some(n => near(n, root)) ? 1 : 0,
                            micro: Number.isInteger(root) ? 0 : 1
                        });
                    }
                    groups.get(sig).items.push({ genre, key });
                }
            }
        }
        return [...groups.values()]
            .sort((a, b) => (b.hasRoot - a.hasRoot) || (a.size - b.size) || (a.micro - b.micro) || (a.root - b.root))
            .slice(0, 48);
    }

    /* ----- Interface (DOM) ----- */
    bindUI() {
        $$('#modes [data-mode]').forEach(b => b.addEventListener('click', () => {
            this.s.mode = b.dataset.mode;
            this.refresh();
        }));

        $$('[data-toggle]').forEach(b => b.addEventListener('click', () => {
            const k = b.dataset.toggle;
            this.s[k] = !this.s[k];
            if (k === 'reverb') this.audio.setReverb(this.s.reverb);
            this.refresh();
        }));

        $$('[data-seg]').forEach(seg => seg.addEventListener('click', e => {
            const b = e.target.closest('[data-value]');
            if (!b) return;
            if (seg.dataset.seg === 'lang') { this.setLang(b.dataset.value); return; }
            this.s[seg.dataset.seg] = b.dataset.value;
            this.refresh();
        }));

        $('#chordRoot').addEventListener('change', e => { this.s.chordRoot = +e.target.value; this.refresh(); });
        $('#chordType').addEventListener('change', e => { this.s.chordType = e.target.value; this.refresh(); });
        $('#scaleRoot').addEventListener('change', e => { this.s.scaleRoot = +e.target.value; this.refresh(); });
        $('#scaleGenre').addEventListener('change', e => {
            this.s.scaleGenre = e.target.value;
            this.s.scaleKey = Object.keys(SCALES[e.target.value])[0];
            this.refresh();
        });
        $('#scaleKey').addEventListener('change', e => { this.s.scaleKey = e.target.value; this.refresh(); });
        $('#microFix').addEventListener('click', () => { this.s.fretMode = 'fretless'; this.refresh(); });
        $('#detClear').addEventListener('click', () => { this.detected.clear(); this.refresh(); });

        $('#sound').addEventListener('change', e => { this.s.sound = e.target.value; this.save(); });
        $('#btnSustain').addEventListener('click', () => {
            this.s.sustain = !this.s.sustain;
            if (!this.s.sustain) this.stop(true);
            this.save();
            this.renderUI();
        });
        $('#btnStop').addEventListener('click', () => this.stop());
        $('#fStop').addEventListener('click', () => this.stop());
        $('#btnMenu').addEventListener('click', () => this.setMenuHidden(true));
        $('#fMenu').addEventListener('click', () => this.setMenuHidden(false));
        $('#btnFocus').addEventListener('click', () => this.setFocus(true));
        $('#fExit').addEventListener('click', () => this.setFocus(false));

        $('#btnSettings').addEventListener('click', () => this.openSheet(true));
        $('#presetChip').addEventListener('click', () => this.openSheet(true));
        $('#sheetClose').addEventListener('click', () => this.openSheet(false));
        $('#backdrop').addEventListener('click', () => this.openSheet(false));

        $('#preset').addEventListener('change', e => this.loadPreset(e.target.value));
        const tin = $('#tuning');
        tin.addEventListener('input', () => this.validateTuning(tin.value));
        tin.addEventListener('change', () => this.commitTuning(tin.value));
        tin.addEventListener('keydown', e => { if (e.key === 'Enter') tin.blur(); });
        const len = $('#scaleLength');
        len.addEventListener('change', () => this.setLength(parseFloat(len.value)));
        $$('[data-step]').forEach(b => b.addEventListener('click', () => this.setLength(this.s.length + parseFloat(b.dataset.step))));
        $('#volume').addEventListener('input', e => {
            this.s.volume = +e.target.value;
            this.audio.setVolume(this.s.volume);
            this.save();
        });

        document.addEventListener('keydown', e => {
            if (e.key !== 'Escape') return;
            if (this.sheetOpen) this.openSheet(false);
            else if (document.body.classList.contains('focus')) this.setFocus(false);
            this.stop();
        });
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.focusFS) this.setFocus(false);
        });
        // Déverrouillage audio (iOS / Chrome) au premier geste
        ['pointerdown', 'touchend', 'keydown'].forEach(ev =>
            document.addEventListener(ev, () => this.audio.unlock(), { passive: true, capture: true }));
    }

    openSheet(open) {
        this.sheetOpen = open;
        $('#sheet').classList.toggle('open', open);
        $('#sheet').setAttribute('aria-hidden', String(!open));
        $('#backdrop').hidden = !open;
        if (open) { this.validateTuning($('#tuning').value); setTimeout(() => $('#sheetClose').focus({ preventScroll: true }), 50); }
    }

    setMenuHidden(hidden) {
        this.s.menuHidden = hidden;
        this.refresh();
    }

    setFocus(on) {
        document.body.classList.toggle('focus', on);
        this.focusFS = false;
        const el = document.documentElement;
        if (on && el.requestFullscreen && !document.fullscreenElement) {
            el.requestFullscreen().then(() => { this.focusFS = true; }).catch(() => {});
        } else if (!on && document.fullscreenElement && document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        }
    }

    fillSelect(el, items, value) {
        const sig = items.map(i => i.join('=')).join('|');
        if (el.dataset.sig !== sig) {
            el.innerHTML = '';
            items.forEach(([v, label]) => el.add(new Option(label, v)));
            el.dataset.sig = sig;
        }
        el.value = String(value);
    }

    renderUI() {
        const s = this.s, lang = s.lang;
        document.documentElement.lang = lang;
        document.body.dataset.mode = s.mode;
        document.body.classList.toggle('menu-hidden', s.menuHidden);

        $$('[data-i18n]').forEach(el => { const v = this.t(el.dataset.i18n); if (v !== undefined) el.textContent = v; });
        $$('[data-i18n-title]').forEach(el => { const v = this.t(el.dataset.i18nTitle); el.title = v; el.setAttribute('aria-label', v); });

        $$('#modes [data-mode]').forEach(b => b.setAttribute('aria-selected', String(b.dataset.mode === s.mode)));
        $$('.ctx-pane').forEach(p => p.classList.toggle('on', p.dataset.pane === s.mode));
        $('#results').hidden = s.mode !== 'detect';
        $$('[data-toggle]').forEach(b => b.setAttribute('aria-pressed', String(!!s[b.dataset.toggle])));
        $$('[data-seg]').forEach(seg => {
            const cur = String(s[seg.dataset.seg]);
            $$('[data-value]', seg).forEach(b => b.setAttribute('aria-selected', String(b.dataset.value === cur)));
        });
        $('#btnSustain').setAttribute('aria-pressed', String(s.sustain));

        this.fillSelect($('#sound'), Object.keys(INSTRUMENTS).map(k => [k, this.t('snd_' + k)]), s.sound);
        this.fillSelect($('#chordRoot'), NOTES[lang].map((n, i) => [i, n]), s.chordRoot);
        this.fillSelect($('#chordType'), Object.entries(CHORDS).map(([k, c]) => [k, c[lang]]), s.chordType);
        this.fillSelect($('#scaleRoot'), Array.from({ length: 24 }, (_, i) => [i / 2, noteText(i / 2, lang)]), s.scaleRoot);
        this.fillSelect($('#scaleGenre'), Object.keys(SCALES).map(k => [k, this.t('genre_' + k)]), s.scaleGenre);
        this.fillSelect($('#scaleKey'), Object.entries(SCALES[s.scaleGenre]).map(([k, sc]) => [k, sc[lang]]), s.scaleKey);
        this.fillSelect($('#preset'),
            [...Object.entries(PRESETS).map(([k, p]) => [k, p[lang]]), ['custom', '— ' + this.t('custom') + ' —']], s.preset);

        const tin = $('#tuning');
        if (document.activeElement !== tin) { tin.value = s.tuning; this.validateTuning(tin.value); }
        const len = $('#scaleLength');
        if (document.activeElement !== len) len.value = s.length;
        $('#volume').value = s.volume;

        $('#microFix').hidden = !(s.mode === 'scale' && s.fretMode === 'fretted' && this.scaleHasMicro());

        // Barre d'état
        $('#presetName').textContent = PRESETS[s.preset] ? PRESETS[s.preset][lang] : this.t('custom');
        $('#tuningMini').textContent = `${formatTuning(this.strings, lang).replace(/,/g, '')} · ${s.length} cm · ${this.t(s.fretMode)}`;
        this.renderLegend();
        this.renderDetector();
    }

    renderLegend() {
        const s = this.s, items = [];
        const add = (color, key, ring) => items.push([color, this.t(key), ring]);
        if (s.mode === 'chord') { add(COLORS.root.fill, 'lg_root'); add(COLORS.chord.fill, 'lg_chord'); }
        else if (s.mode === 'scale') {
            add(COLORS.root.fill, 'lg_root'); add(COLORS.scale.fill, 'lg_scale');
            if (this.scaleHasMicro()) add('#e8e8e8', 'lg_quarter', true);
        } else if (s.mode === 'detect') add(COLORS.detect.fill, 'lg_selected');
        const el = $('#legend');
        el.innerHTML = '';
        items.forEach(([color, label, ring]) => {
            const span = document.createElement('span');
            span.className = 'lg';
            const i = document.createElement('i');
            i.style.setProperty('--c', color);
            if (ring) i.className = 'ring';
            const txt = document.createElement('span');
            txt.textContent = label;
            span.append(i, txt);
            el.appendChild(span);
        });
    }

    renderDetector() {
        const lang = this.s.lang;
        const chips = $('#detChips');
        chips.innerHTML = '';
        const notes = [...this.detected].sort((a, b) => a - b);
        if (!notes.length) {
            const h = document.createElement('span');
            h.className = 'hint';
            h.textContent = this.t('detect_hint');
            chips.appendChild(h);
        }
        notes.forEach(v => {
            const b = document.createElement('button');
            b.className = 'det-note';
            b.textContent = noteText(v, lang);
            b.addEventListener('click', () => { this.detected.delete(v); this.refresh(); });
            chips.appendChild(b);
        });
        $('#detClear').hidden = !notes.length;

        const res = $('#results');
        res.innerHTML = '';
        if (this.s.mode !== 'detect') return;
        const found = this.findScales();
        if (!found.length) {
            const d = document.createElement('div');
            d.className = 'empty';
            d.textContent = this.t(notes.length ? 'detect_none' : 'detect_empty');
            res.appendChild(d);
            return;
        }
        found.forEach(g => {
            const names = g.items.map(it => SCALES[it.genre][it.key][lang]);
            const b = document.createElement('button');
            b.className = 'result';
            const root = document.createElement('b');
            root.textContent = noteText(g.root, lang);
            const nm = document.createElement('span');
            nm.textContent = names[0];
            b.append(root, nm);
            if (names.length > 1) {
                const more = document.createElement('small');
                more.textContent = '· ' + names.slice(1).join(' · ');
                b.appendChild(more);
            }
            b.addEventListener('click', () => {
                Object.assign(this.s, { mode: 'scale', scaleGenre: g.items[0].genre, scaleKey: g.items[0].key, scaleRoot: g.root });
                this.refresh();
            });
            res.appendChild(b);
        });
    }

    /* ----- Géométrie ----- */
    layout() {
        const W = this.stage.clientWidth, H = this.stage.clientHeight;
        if (!W || !H) return;
        const s = this.s, n = this.strings.length, L = s.length;
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const coarse = matchMedia('(pointer: coarse)').matches;
        const vertical = s.orientation === 'v' || (s.orientation === 'auto' && H > W * 1.05);
        const M = vertical ? H : W, C = vertical ? W : H;

        const head = clamp(M * .085, 46, 72), endPad = 12;
        let padA = s.showMeasures ? (vertical ? 42 : 22) : 10;     // côté des mesures
        if (s.menuHidden) padA = Math.max(padA, 54);               // place pour le logo flottant
        const padB = vertical ? 24 : 20;                           // côté des numéros de case
        const avail = Math.max(40, C - padA - padB);
        const sp = clamp(avail / n, 16, coarse ? 80 : 66);
        const neckW = sp * n;
        const crossStart = padA + (avail - neckW) / 2;
        const neckLen = Math.max(60, M - head - endPad);
        const ppcFor = F => neckLen / posCm(L, F + .6);

        let F = parseInt(s.frets, 10);
        if (!F) {
            const minGap = coarse ? 30 : 20;
            F = 12;
            for (const f of [24, 22, 21, 19, 17, 15]) {
                if ((posCm(L, f) - posCm(L, f - 1)) * ppcFor(f) >= minGap) { F = f; break; }
            }
        }

        const cross = this.strings.map((_, i) => crossStart + sp * ((vertical ? n - 1 - i : i) + .5));
        this.g = { W, H, dpr, vertical, M, C, head, neckLen, sp, neckW, crossStart, ppc: ppcFor(F), F, cross };

        const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
        for (const cv of [this.canvas, this.base, this.over]) {
            if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
        }
        this.drawBase();
        this.drawOverlay();
        this.requestRender();
    }

    // (u = distance au sillet le long du manche, c = position transversale) -> (x, y)
    P(u, c) { const g = this.g; return g.vertical ? [c, g.head + u] : [g.head + u, c]; }
    rectUC(u0, u1, c0, c1) {
        const [x0, y0] = this.P(u0, c0), [x1, y1] = this.P(u1, c1);
        return [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)];
    }
    uOf(semis) { return posCm(this.s.length, semis) * this.g.ppc; }

    /* ----- Rendu statique : bois, frettes, mesures ----- */
    drawBase() {
        const g = this.g, s = this.s, L = s.length, ctx = this.base.getContext('2d');
        const fretless = s.fretMode === 'fretless';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.base.width, this.base.height);
        ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);

        const c0 = g.crossStart, c1 = c0 + g.neckW, uEnd = g.neckLen;

        // Tête
        let [x, y, w, h] = this.rectUC(-g.head + 4, 0, c0 - 6, c1 + 6);
        ctx.fillStyle = '#17181e';
        roundRect(ctx, x, y, w, h, 10);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,.05)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Touche (ombre portée + bois)
        [x, y, w, h] = this.rectUC(0, uEnd, c0, c1);
        const [gx0, gy0] = this.P(0, c0), [gx1, gy1] = this.P(0, c1);
        const wood = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
        if (fretless) { wood.addColorStop(0, '#16110e'); wood.addColorStop(.5, '#241c17'); wood.addColorStop(1, '#16110e'); }
        else { wood.addColorStop(0, '#2a180f'); wood.addColorStop(.5, '#3f2617'); wood.addColorStop(1, '#2a180f'); }
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,.6)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = wood;
        roundRect(ctx, x, y, w, h, 4);
        ctx.fill();
        ctx.restore();

        // Veinage (pseudo-aléatoire stable)
        ctx.save();
        roundRect(ctx, x, y, w, h, 4);
        ctx.clip();
        let seed = 12345;
        const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
        for (let k = 0; k < 70; k++) {
            const c = c0 + rnd() * g.neckW, a = rnd() * .06 + .02, amp = rnd() * 2.2, f = rnd() * .02 + .003, ph = rnd() * 6;
            ctx.strokeStyle = rnd() < .55 ? `rgba(0,0,0,${a * 1.8})` : `rgba(255,215,170,${a * .45})`;
            ctx.lineWidth = rnd() * 1.3 + .3;
            ctx.beginPath();
            for (let u = 0; u <= uEnd + 16; u += 16) {
                const [px, py] = this.P(u, c + Math.sin(u * f + ph) * amp);
                if (u === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        // Liserés
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.fillRect(...this.rectUC(0, uEnd, c0, c0 + 1.5));
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(...this.rectUC(0, uEnd, c1 - 2, c1));
        ctx.restore();

        // Frettes / repères
        const zoneMid = n => (this.uOf(n - 1) + this.uOf(n)) / 2;
        for (let n = 1; n <= g.F + 1; n++) {
            const u = this.uOf(n);
            if (u > uEnd - 2) break;
            if (fretless) {
                const strong = n % 12 === 0 ? .2 : [3, 5, 7, 9].includes(n % 12) ? .11 : .06;
                ctx.fillStyle = `rgba(255,240,220,${strong})`;
                ctx.fillRect(...this.rectUC(u - .5, u + .5, c0, c1));
            } else {
                ctx.fillStyle = 'rgba(0,0,0,.4)';
                ctx.fillRect(...this.rectUC(u + 1.2, u + 3.2, c0, c1));
                ctx.fillStyle = '#8f9298';
                ctx.fillRect(...this.rectUC(u - 1.6, u + 1.6, c0, c1));
                ctx.fillStyle = '#eef0f3';
                ctx.fillRect(...this.rectUC(u - .7, u + .3, c0, c1));
            }
        }
        for (const n of INLAYS) {
            if (n > g.F || this.uOf(n) > uEnd) continue;
            const double = n % 12 === 0;
            if (fretless) {
                const u = this.uOf(n);
                const cs = double ? [c1 - 5, c1 - 11] : [c1 - 5];
                cs.forEach(c => { const [px, py] = this.P(u, c); ctx.fillStyle = 'rgba(240,230,210,.45)'; ctx.beginPath(); ctx.arc(px, py, 2.2, 0, TAU); ctx.fill(); });
            } else {
                // Entre deux cordes pour ne pas gêner les points de notes
                const u = zoneMid(n), r = clamp(Math.min(g.sp * .13, (this.uOf(n) - this.uOf(n - 1)) * .2), 2.5, 7);
                const n2 = this.strings.length, mid = c0 + g.sp * Math.round(n2 / 2);
                const off = n2 >= 4 ? g.sp : g.sp / 2;
                const cs = double ? [mid - off, mid + off] : [mid];
                cs.forEach(c => {
                    const [px, py] = this.P(u, c);
                    const pearl = ctx.createRadialGradient(px - r * .3, py - r * .3, 0, px, py, r);
                    pearl.addColorStop(0, '#fbf7ee'); pearl.addColorStop(.7, '#cfc7b8'); pearl.addColorStop(1, '#a39a8a');
                    ctx.fillStyle = pearl;
                    ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.fill();
                });
            }
        }

        // Sillet
        const [nx, ny, nw, nh] = this.rectUC(-6, 0, c0 - 2, c1 + 2);
        const [bx0, by0] = this.P(-6, 0), [bx1, by1] = this.P(0, 0);
        const bone = ctx.createLinearGradient(bx0, by0, bx1, by1);
        bone.addColorStop(0, '#cfc6b2'); bone.addColorStop(1, '#f3ecdc');
        ctx.fillStyle = bone;
        roundRect(ctx, nx, ny, nw, nh, 1.5);
        ctx.fill();

        // Mesures (cm depuis le sillet)
        ctx.textBaseline = 'middle';
        if (s.showMeasures) {
            ctx.font = `600 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
            ctx.fillStyle = 'rgba(228,181,90,.9)';
            let last = -1e9;
            for (let n = 1; n <= g.F; n++) {
                const u = this.uOf(n);
                if (u > uEnd - 2) break;
                const txt = posCm(L, n).toFixed(2);
                const need = g.vertical ? 13 : ctx.measureText(txt).width + 6;
                if (u - last < need) continue;
                last = u;
                if (g.vertical) { ctx.textAlign = 'right'; ctx.fillText(txt, c0 - 7, g.head + u); }
                else { ctx.textAlign = 'center'; ctx.fillText(txt, g.head + u, c0 - 10); }
            }
            ctx.fillStyle = 'rgba(228,181,90,.55)';
            if (g.vertical) { ctx.textAlign = 'right'; ctx.fillText('cm', c0 - 7, g.head - 3 - 10); }
            else { ctx.textAlign = 'center'; ctx.fillText('cm', g.head - 14, c0 - 10); }
        }

        // Numéros de case
        ctx.font = `600 10px ${FONT}`;
        ctx.fillStyle = 'rgba(200,202,210,.55)';
        for (const n of INLAYS) {
            if (n > g.F) continue;
            const u = fretless ? this.uOf(n) : zoneMid(n);
            if (u > uEnd) continue;
            if (g.vertical) { ctx.textAlign = 'left'; ctx.fillText(n, c1 + 7, g.head + u); }
            else { ctx.textAlign = 'center'; ctx.fillText(n, g.head + u, c1 + 11); }
        }
    }

    /* ----- Rendu statique : points de notes ----- */
    drawOverlay() {
        const g = this.g, s = this.s, ctx = this.over.getContext('2d');
        const fretless = s.fretMode === 'fretless';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.over.width, this.over.height);
        ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);

        const micro = (s.mode === 'scale' && this.scaleHasMicro()) ||
            (s.mode === 'detect' && [...this.detected].some(v => !Number.isInteger(v)));

        this.strings.forEach((str, i) => {
            const c = g.cross[i];
            for (let k = .5; k <= g.F; k += .5) {
                const isInt = Number.isInteger(k);
                if (!isInt && !micro) continue;
                const pc = mod12(str.midi + k);
                const info = this.classify(pc);
                if (!info) continue;
                let u, r;
                if (!fretless && isInt) {
                    u = (this.uOf(k - 1) + this.uOf(k)) / 2;
                    r = Math.min(g.sp * .36, (this.uOf(k) - this.uOf(k - 1)) * .44, 15);
                } else {
                    u = this.uOf(k);
                    r = Math.min(g.sp * .36, (this.uOf(k + .5) - this.uOf(k - .5)) * .44, 15);
                    if (!isInt && !fretless) r *= .85;
                }
                if (u > g.neckLen - 4) continue;
                this.drawDot(ctx, u, c, Math.max(r, 5.5), info, pc, !isInt, !isInt && !fretless);
            }
        });

        // Cordes à vide (dans la tête)
        this.strings.forEach((str, i) => {
            const pc = mod12(str.midi);
            const info = this.classify(pc);
            const colored = info && !info.plain;
            const [x, y] = this.P(-g.head / 2 - 1, g.cross[i]);
            const r = Math.min(g.sp * .42, g.head * .38, 17);
            ctx.beginPath();
            ctx.arc(x, y, r, 0, TAU);
            ctx.fillStyle = colored ? info.fill : 'rgba(255,255,255,.06)';
            ctx.fill();
            ctx.lineWidth = colored && info.ring ? 2 : 1;
            ctx.strokeStyle = colored && info.ring ? info.ring : 'rgba(255,255,255,.14)';
            ctx.stroke();
            const label = NOTES[s.lang][pc] + (Math.floor(str.midi / 12) - 1);
            this.fitText(ctx, label, x, y, r, colored ? info.text : '#e9e6df', 700);
        });
    }

    fitText(ctx, text, x, y, r, color, weight = 600, max = 13) {
        let fs = Math.min(r * .95, max);
        ctx.font = `${weight} ${fs}px ${FONT}`;
        const w = ctx.measureText(text).width;
        if (w > r * 1.7) fs *= (r * 1.7) / w;
        if (fs < 6.5) return fs;
        ctx.font = `${weight} ${fs}px ${FONT}`;
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x, y + fs * .04);
        return fs;
    }

    drawDot(ctx, u, c, r, info, pc, isMicro, dashed) {
        const [x, y] = this.P(u, c);
        ctx.beginPath();
        ctx.arc(x, y + 1.5, r, 0, TAU);
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        let textColor = info.text;
        if (dashed) {
            // Quart de ton non jouable sur un manche fretté
            ctx.fillStyle = 'rgba(14,15,19,.8)';
            ctx.fill();
            ctx.setLineDash([3, 2.5]);
            ctx.lineWidth = 2;
            ctx.strokeStyle = info.fill;
            ctx.stroke();
            ctx.setLineDash([]);
            textColor = info.fill;
        } else {
            ctx.fillStyle = info.fill;
            ctx.fill();
            if (!info.plain) {
                const gloss = ctx.createRadialGradient(x - r * .35, y - r * .45, 0, x, y, r);
                gloss.addColorStop(0, 'rgba(255,255,255,.38)');
                gloss.addColorStop(.6, 'rgba(255,255,255,0)');
                ctx.fillStyle = gloss;
                ctx.fill();
            }
            if (info.ring) {
                ctx.lineWidth = 2;
                ctx.strokeStyle = info.ring;
                ctx.stroke();
            }
            if (isMicro) {
                ctx.beginPath();
                ctx.arc(x, y, r - 2.5, 0, TAU);
                ctx.setLineDash([2, 2]);
                ctx.lineWidth = 1.3;
                ctx.strokeStyle = 'rgba(255,255,255,.85)';
                ctx.stroke();
                ctx.setLineDash([]);
            }
        }

        // « Noms des notes » désactivé : on garde les points (accords, gammes, sélection) sans les noms
        if (!this.s.showNotes) return;
        const parts = noteParts(pc, this.s.lang);
        const weight = info.plain ? 600 : 700;
        if (parts.acc && r >= 10) {
            const fs = this.fitText(ctx, parts.base, x, y - r * .2, r * .85, textColor, weight, 12);
            ctx.font = `700 ${Math.max(6.5, fs * .62)}px ${FONT}`;
            ctx.fillText(parts.acc, x, y + r * .45);
        } else {
            this.fitText(ctx, parts.base, x, y, info === COLORS.freeSharp ? r * .9 : r, textColor, weight);
        }
    }

    /* ----- Rendu dynamique ----- */
    requestRender() {
        if (!this.raf) this.raf = requestAnimationFrame(t => this.tick(t));
    }

    tick(now) {
        this.raf = 0;
        if (!this.g) return;
        const dt = this.lastT ? Math.min(64, now - this.lastT) : 16.7;
        this.lastT = now;
        const k = dt / 16.7;
        let busy = false;

        this.vib.forEach((v, i) => {
            if (v.sus) {
                const voice = this.voiceByString[i];
                if (!voice || voice.released) v.sus = false;
            }
            if (v.amp > .12 || v.sus) {
                v.phase += 1.05 * k;
                v.amp = v.sus ? Math.max(v.amp * Math.pow(.97, k), 1.1) : v.amp * Math.pow(.945, k);
                busy = true;
            } else v.amp = 0;
        });
        this.marks = this.marks.filter(m => {
            if (!m.held) m.life -= .05 * k;
            return m.life > 0;
        });
        if (this.marks.length) busy = true;

        this.frame();
        if (busy) this.requestRender(); else this.lastT = 0;
    }

    frame() {
        const ctx = this.ctx, g = this.g;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.drawImage(this.base, 0, 0);
        ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
        this.drawStrings(ctx);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(this.over, 0, 0);
        ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
        this.drawMarks(ctx);
    }

    stringPath(i) {
        const g = this.g, v = this.vib[i], c = g.cross[i];
        const u0 = -6, uE = g.M - g.head;
        if (v.amp < .12) return [this.P(u0, c), this.P(uE, c)];
        const uf = clamp(v.u, 0, uE - 10);
        const pts = [this.P(u0, c), this.P(uf, c)];
        const disp = Math.sin(v.phase) * v.amp, N = 30;
        for (let k = 1; k <= N; k++) {
            const t = k / N;
            pts.push(this.P(uf + (uE - uf) * t, c + Math.sin(Math.PI * t) * disp));
        }
        return pts;
    }

    drawStrings(ctx) {
        const stroke = (pts, color, width, dx = 0, dy = 0) => {
            ctx.beginPath();
            pts.forEach(([x, y], k) => k ? ctx.lineTo(x + dx, y + dy) : ctx.moveTo(x + dx, y + dy));
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.stroke();
        };
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        this.strings.forEach((str, i) => {
            const v = this.vib[i];
            const w = clamp(1 + (72 - str.midi) * .075, 1, 4.4);
            const wound = str.midi < 55;
            const pts = this.stringPath(i);
            stroke(pts, 'rgba(0,0,0,.5)', w + 1, 1.2, 1.8);
            stroke(pts, wound ? '#c9a266' : '#dfe3ea', w);
            if (wound && w >= 1.8) {
                ctx.setLineDash([1.2, 1.5]);
                stroke(pts, 'rgba(70,45,20,.55)', w * .75);
                ctx.setLineDash([]);
            }
            stroke(pts, 'rgba(255,255,255,.35)', Math.max(.6, w * .3), -w * .15, -w * .15);
            if (v.amp > .3) {
                ctx.save();
                ctx.globalAlpha = Math.min(1, v.amp / 5) * .7;
                ctx.shadowColor = '#ffd88a';
                ctx.shadowBlur = 10;
                stroke(pts, '#fff2cf', Math.max(1, w * .6));
                ctx.restore();
            }
        });
    }

    drawMarks(ctx) {
        const g = this.g;
        for (const m of this.marks) {
            const c = g.cross[m.i];
            if (c === undefined) continue;
            const [x, y] = this.P(m.u, c);
            const r = g.sp * .46, a = Math.max(0, m.life);
            const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 1.4);
            glow.addColorStop(0, `rgba(255,214,120,${.5 * a})`);
            glow.addColorStop(1, 'rgba(255,214,120,0)');
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, TAU); ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = `rgba(255,236,190,${.85 * a})`;
            ctx.beginPath(); ctx.arc(x, y, r * .72, 0, TAU); ctx.stroke();
        }
        if (this.hover && this.pointers.size === 0) {
            const c = g.cross[this.hover.i];
            if (c !== undefined) {
                const [x, y] = this.P(this.hover.u, c);
                ctx.setLineDash([3, 3]);
                ctx.lineWidth = 1.5;
                ctx.strokeStyle = 'rgba(255,255,255,.45)';
                ctx.beginPath(); ctx.arc(x, y, g.sp * .34, 0, TAU); ctx.stroke();
                ctx.setLineDash([]);
            }
        }
    }

    /* ----- Jeu (souris, tactile, stylet — multi-touch) ----- */
    bindPointer() {
        const cv = this.canvas;
        cv.addEventListener('pointerdown', e => this.onDown(e));
        cv.addEventListener('pointermove', e => this.onMove(e));
        cv.addEventListener('pointerup', e => this.onUp(e));
        cv.addEventListener('pointercancel', e => this.onUp(e));
        cv.addEventListener('pointerleave', e => {
            if (e.pointerType === 'mouse' && this.hover) { this.hover = null; this.requestRender(); }
        });
        cv.addEventListener('contextmenu', e => e.preventDefault());
    }

    local(e) {
        const r = this.canvas.getBoundingClientRect(), g = this.g;
        const x = e.clientX - r.left, y = e.clientY - r.top;
        return g.vertical ? { x, y, u: y - g.head, c: x } : { x, y, u: x - g.head, c: y };
    }

    stringAt(p) {
        const g = this.g;
        if (p.u < -g.head || p.u > g.M - g.head) return -1;
        let best = -1, bd = Infinity;
        g.cross.forEach((sc, i) => { const d = Math.abs(p.c - sc); if (d < bd) { bd = d; best = i; } });
        return bd <= g.sp * .62 ? best : -1;
    }

    // Hauteur jouée à la position u sur la corde i
    pitchAt(i, u) {
        const g = this.g, L = this.s.length, str = this.strings[i];
        let semis = 0, uVib = 0, uMark = -g.head / 2 - 1;
        if (u > 0) {
            const d = Math.min(u / g.ppc, L * .94);
            const exact = 12 * Math.log2(L / (L - d));
            if (this.s.fretMode === 'fretted') {
                semis = Math.max(1, Math.ceil(exact - 1e-9));
                uVib = this.uOf(semis);
                uMark = (this.uOf(semis - 1) + uVib) / 2;
            } else {
                semis = exact;
                uVib = uMark = u;
            }
        }
        return { semis, midi: str.midi + semis, freq: str.freq * Math.pow(2, semis / 12), uVib, uMark };
    }

    onDown(e) {
        if (!this.g || (e.pointerType === 'mouse' && e.button !== 0)) return;
        e.preventDefault();
        this.audio.unlock();
        const p = this.local(e), i = this.stringAt(p);

        if (this.s.mode === 'detect') {
            if (i >= 0) this.toggleDetect(i, p, e.pointerType);
            return;
        }
        try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        const ptr = { string: -1, voice: null, mark: null, semis: null, type: e.pointerType };
        this.pointers.set(e.pointerId, ptr);
        this.hover = null;
        if (i >= 0) this.pluck(ptr, i, p);
    }

    onMove(e) {
        if (!this.g) return;
        const ptr = this.pointers.get(e.pointerId);
        const p = this.local(e);

        if (!ptr) {
            if (e.pointerType === 'mouse' && this.s.mode !== 'detect') {
                const i = this.stringAt(p);
                this.hover = i >= 0 ? { i, u: this.pitchAt(i, p.u).uMark } : null;
                this.requestRender();
            }
            return;
        }

        const i = this.stringAt(p);
        if (i < 0) { ptr.string = -1; return; }

        if (i !== ptr.string) {
            // Balayage : on gratte aussi les cordes sautées entre deux évènements
            if (ptr.string >= 0) {
                const dir = i > ptr.string ? 1 : -1;
                for (let k = ptr.string + dir; k !== i; k += dir) this.pluck(ptr, k, p, true);
            }
            this.pluck(ptr, i, p);
            return;
        }

        // Même corde : glissando
        const pitch = this.pitchAt(i, p.u);
        if (Math.abs(pitch.semis - ptr.semis) < .005) return;
        ptr.semis = pitch.semis;
        if (ptr.voice && ptr.voice.alive) {
            ptr.voice.setFreq(pitch.freq);
            const v = this.vib[i];
            v.u = pitch.uVib;
            v.amp = Math.max(v.amp, 1.5);
            if (ptr.mark) ptr.mark.u = pitch.uMark;
            this.showBubble(pitch, p, ptr.type);
            this.requestRender();
        } else {
            this.pluck(ptr, i, p);
        }
    }

    onUp(e) {
        const ptr = this.pointers.get(e.pointerId);
        if (!ptr) return;
        if (ptr.mark) ptr.mark.held = false;
        this.pointers.delete(e.pointerId);
        try { this.canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        if (!this.pointers.size) this.hideBubble(1100);
        this.requestRender();
    }

    pluck(ptr, i, p, passing = false) {
        const pitch = this.pitchAt(i, p.u);
        const prev = this.voiceByString[i];
        if (prev) prev.release(.05);                       // une corde = une note à la fois
        const voice = this.audio.play(pitch.freq, this.s.sound, this.s.sustain);
        this.voiceByString[i] = voice;

        const v = this.vib[i];
        v.amp = Math.min(7, this.g.sp * .12 + 2);
        v.phase = 0;
        v.u = pitch.uVib;
        v.sus = this.s.sustain;

        if (!passing) {
            if (ptr.mark) ptr.mark.held = false;
            ptr.mark = { i, u: pitch.uMark, life: 1, held: true };
            this.marks.push(ptr.mark);
            ptr.voice = voice;
            ptr.string = i;
            ptr.semis = pitch.semis;
            this.showBubble(pitch, p, ptr.type);
        } else {
            this.marks.push({ i, u: pitch.uMark, life: .7, held: false });
        }
        this.requestRender();
    }

    toggleDetect(i, p, type) {
        const pitch = this.pitchAt(i, p.u);
        const snapped = snapQ(pitch.midi);
        const pc = mod12(snapped);
        const existing = [...this.detected].find(v => near(v, pc));
        if (existing !== undefined) this.detected.delete(existing);
        else {
            this.detected.add(pc);
            const freq = this.strings[i].freq * Math.pow(2, (snapped - this.strings[i].midi) / 12);
            const voice = this.audio.play(freq, this.s.sound, false);
            if (voice) setTimeout(() => voice.release(.25), 450);
            const v = this.vib[i];
            v.amp = 4; v.phase = 0; v.u = pitch.uVib; v.sus = false;
        }
        this.marks.push({ i, u: pitch.uMark, life: .9, held: false });
        this.showBubble({ ...pitch, midi: snapped, freq: this.strings[i].freq * Math.pow(2, (snapped - this.strings[i].midi) / 12) }, p, type);
        this.hideBubble(900);
        this.refresh();
    }

    showBubble(pitch, p, type) {
        const b = this.bubble, g = this.g, lang = this.s.lang;
        const snapped = snapQ(pitch.midi);
        const parts = noteParts(snapped, lang);
        const cents = Math.round((pitch.midi - snapped) * 100);
        const centsTxt = this.s.fretMode === 'fretless' && cents ? `<em>${cents > 0 ? '+' : ''}${cents}¢</em>` : '';
        b.innerHTML = `<b>${parts.base}<sup>${parts.acc}</sup><small>${octaveOf(snapped, parts)}</small></b>` +
            `<span>${pitch.freq.toFixed(1)} Hz</span>${centsTxt}`;
        const off = type === 'mouse' ? 30 : 64;
        const x = clamp(p.x, 70, g.W - 70);
        let y = p.y - off;
        if (y < 50) y = p.y + off + 44;
        b.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
        b.classList.add('show');
        clearTimeout(this.bubbleTimer);
    }

    hideBubble(delay) {
        clearTimeout(this.bubbleTimer);
        this.bubbleTimer = setTimeout(() => this.bubble.classList.remove('show'), delay);
    }

    stop(soft = false) {
        this.audio.stopAll(soft ? .4 : .08);
        this.voiceByString = this.voiceByString.map(() => null);
        this.pointers.forEach(ptr => { ptr.voice = null; });
        this.vib.forEach(v => { v.sus = false; if (!soft) v.amp *= .3; });
        this.requestRender();
    }
}

window.app = new App();

/* ---------- 6. APPLICATION INSTALLABLE (PWA) ---------- */
// Le service worker n'est disponible qu'en HTTPS (ou sur localhost)
if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
let installPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    installPrompt = e;
    $('#btnInstall').hidden = false;
});
$('#btnInstall').addEventListener('click', async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice.catch(() => {});
    installPrompt = null;
    $('#btnInstall').hidden = true;
});
window.addEventListener('appinstalled', () => { $('#btnInstall').hidden = true; });
