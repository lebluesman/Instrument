/* --- 1. DATA & TRANSLATIONS --- */
const INSTRUMENTS = {
    'oud': { type: 'triangle', attack: 0.01, decay: 0.35, sustain: 0, release: 0.4, filterStart: 3000, filterEnd: 150, q: 1 },
    'guitar': { type: 'sawtooth', attack: 0.015, decay: 0.8, sustain: 0.1, release: 1.2, filterStart: 3500, filterEnd: 400, q: 0 },
    'electric': { type: 'square', attack: 0.005, decay: 0.3, sustain: 0.7, release: 1.5, filterStart: 4500, filterEnd: 1500, q: 4 },
    'violin': { type: 'sawtooth', attack: 0.3, decay: 0.1, sustain: 1.0, release: 0.6, filterStart: 2200, filterEnd: 2200, q: 2 },
    'synth': { type: 'sine', attack: 0.05, decay: 0.2, sustain: 0.6, release: 1.0, filterStart: 8000, filterEnd: 100, q: 8 }
};

const NOTES_EN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const NOTES_FR = ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si'];

/* BASE DE DONNEES DES GAMMES
   Les valeurs sont des intervalles cumulés en tons (1 = 1/2 ton standard).
   Exemple: 0, 2, 4 = Do, Ré, Mi.
   Pour les Maqams, on utilise 0.5 pour les quarts de ton.
   Ex: 3.5 = Mi demi-bémol (entre Mib et Mi)
*/
const SCALES = {
    'western': {
        'major': { name: "Major (Ionian)", intervals: [0, 2, 4, 5, 7, 9, 11] },
        'minor': { name: "Natural Minor (Aeolian)", intervals: [0, 2, 3, 5, 7, 8, 10] },
        'pent_maj': { name: "Pentatonic Major", intervals: [0, 2, 4, 7, 9] },
        'pent_min': { name: "Pentatonic Minor", intervals: [0, 3, 5, 7, 10] },
        'blues': { name: "Blues", intervals: [0, 3, 5, 6, 7, 10] },
        'harmonic_min': { name: "Harmonic Minor", intervals: [0, 2, 3, 5, 7, 8, 11] },
        'mixolydian': { name: "Mixolydian", intervals: [0, 2, 4, 5, 7, 9, 10] },
        'dorian': { name: "Dorian", intervals: [0, 2, 3, 5, 7, 9, 10] },
        'phrygian': { name: "Phrygian", intervals: [0, 1, 3, 5, 7, 8, 10] }
    },
    'oriental': {
        'rast': { name: "Maqam Rast", intervals: [0, 2, 3.5, 5, 7, 9, 10.5] }, // E demi-bémol, B demi-bémol
        'bayati': { name: "Maqam Bayati", intervals: [0, 1.5, 3, 5, 7, 8, 10] }, // E demi-bémol
        'hijaz': { name: "Maqam Hijaz", intervals: [0, 1, 4, 5, 7, 8, 10] },
        'saba': { name: "Maqam Saba", intervals: [0, 1.5, 3, 4, 7, 8, 10] }, // E demi-bémol, Gb (diminished 4th?) - simplifié
        'kurd': { name: "Maqam Kurd", intervals: [0, 1, 3, 5, 7, 8, 10] },
        'ajam': { name: "Maqam Ajam", intervals: [0, 2, 4, 5, 7, 9, 11] }, // Comme Majeur
        'nahawand': { name: "Maqam Nahawand", intervals: [0, 2, 3, 5, 7, 8, 10] }, // Comme Mineur
        'sikah': { name: "Maqam Sikah", intervals: [0, 1.5, 3.5, 5, 7, 8.5, 10.5] } // Approximatif pour visualizer
    },
    'andalous': {
        'mezmoum': { name: "Mezmoum (Majeur)", intervals: [0, 2, 4, 5, 7, 9, 11] },
        'raml_maya': { name: "Raml Maya (Éolien)", intervals: [0, 2, 3, 5, 7, 8, 10] },
        'zidane': { name: "Zidane (Hijaz)", intervals: [0, 1, 4, 5, 7, 8, 10] },
        'sika': { name: "Sika (Phrygien)", intervals: [0, 1, 3, 5, 7, 8, 10] },
        'moual': { name: "Moual (Lydien)", intervals: [0, 2, 4, 6, 7, 9, 11] },
        'arak': { name: "Arak (Mixolydien)", intervals: [0, 2, 4, 5, 7, 9, 10] },
        'sihli': { name: "Sihli (Min. Harmonique)", intervals: [0, 2, 3, 5, 7, 8, 11] },
        'ghrib': { name: "Grhib (Dorien)", intervals: [0, 2, 3, 5, 7, 9, 10] },
        'djarka': { name: "Djarka (Majeur)", intervals: [0, 2, 4, 5, 7, 9, 11] }
    }
};
};

const DICTIONARY = {
    'fr': {
        instrument: "Instrument",
        sustain: "Sustain ∞",
        chord_label: "Accords",
        scale_label: "Gammes / Maqams",
        genre_western: "Occidental",
        genre_oriental: "Oriental / Arabe",
        genre_andalous: "Andalous (Alg)",
        major: "Majeur",
        minor: "Mineur",
        diminished: "Diminué",
        augmented: "Augmenté",
        tuning: "Accordage",
        scale: "Long. (cm)",
        btn_notes: "Notes",
        btn_measures: "Mesures",
        opt_oud: "Oud (Bois)",
        opt_guitar: "Guitare (Nylon)",
        opt_electric: "Électrique",
        opt_violin: "Violon",
        opt_synth: "Synthé",
        p_oud_arabe: "Oud Arabe (Standard Do-Do)",
        p_oud_turc: "Oud Turc (Standard Ré-Ré)",
        p_oud_old: "Oud Ancien (Fa-Fa)",
        p_oud_iraq: "Oud Irakien (Bashir)",
        p_oud_greek: "Oud Grec (Outi)",
        p_oud_maghreb: "Oud Maghrébin (5 cordes)",
        p_oud_modern: "Oud Moderne (Solo)",
        p_guitar: "Guitare",
        p_bass: "Basse",
        p_custom: "-- Perso --"
    },
    'en': {
        instrument: "Instrument",
        sustain: "Sustain ∞",
        chord_label: "Chords",
        scale_label: "Scales / Maqams",
        genre_western: "Western",
        genre_oriental: "Oriental / Arabic",
        genre_andalous: "Andalous (Alg)",
        major: "Major",
        minor: "Minor",
        diminished: "Diminished",
        augmented: "Augmented",
        tuning: "Tuning",
        scale: "Scale (cm)",
        btn_notes: "Notes",
        btn_measures: "Measures",
        opt_oud: "Oud (Wood)",
        opt_guitar: "Guitar (Nylon)",
        opt_electric: "Electric",
        opt_violin: "Violin",
        opt_synth: "Synth",
        p_oud_arabe: "Arabic Oud (Standard C-C)",
        p_oud_turc: "Turkish Oud (Standard D-D)",
        p_oud_old: "Old Oud (F-F)",
        p_oud_iraq: "Iraqi Oud (Bashir)",
        p_oud_greek: "Greek Oud (Outi)",
        p_oud_maghreb: "Maghreb Oud (5 strings)",
        p_oud_modern: "Modern Oud (Solo)",
        p_guitar: "Guitar",
        p_bass: "Bass",
        p_custom: "-- Custom --"
    }
};

/* --- 2. AUDIO ENGINE --- */
class AudioEngine {
    constructor() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.3;
        this.masterGain.connect(this.ctx.destination);
        this.activeNodes = [];
    }

    resume() { if (this.ctx.state === 'suspended') this.ctx.resume(); }

    stopAll() {
        const t = this.ctx.currentTime;
        this.activeNodes.forEach(node => {
            try {
                node.gain.gain.cancelScheduledValues(t);
                node.gain.gain.setValueAtTime(node.gain.gain.value, t);
                node.gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
                node.osc.stop(t + 0.11);
            } catch (e) { }
        });
        this.activeNodes = [];
    }

    play(freq, instrumentKey, isSustainMode) {
        this.resume();
        const t = this.ctx.currentTime;
        if (isSustainMode) this.stopAll();

        const preset = INSTRUMENTS[instrumentKey];
        const osc = this.ctx.createOscillator();
        osc.type = preset.type;
        osc.frequency.setValueAtTime(freq, t);

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.Q.value = preset.q;
        filter.frequency.setValueAtTime(preset.filterStart, t);
        filter.frequency.exponentialRampToValueAtTime(preset.filterEnd, t + preset.decay + preset.release);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(1, t + preset.attack);

        if (isSustainMode) {
            gain.gain.exponentialRampToValueAtTime(preset.sustain || 0.8, t + preset.attack + preset.decay);
        } else {
            gain.gain.exponentialRampToValueAtTime(0.001, t + preset.attack + preset.release + 2.0);
        }

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGain);

        osc.start(t);
        if (!isSustainMode) {
            osc.stop(t + preset.attack + preset.release + 3.0);
        } else {
            this.activeNodes.push({ osc: osc, gain: gain });
        }
    }
}

/* --- 3. APP LOGIC --- */
class App {
    constructor() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.audio = new AudioEngine();

        this.config = {
            scaleLength: 64.8,
            showNotes: true,
            showMeasurements: true,
            tuning: [],
            margin: 60,
            stringSpacing: 60,
            pxPerCm: 10,

            // État Accords
            chordRoot: 0,
            chordType: 'off',
            chordNotes: [], // Stocke des entiers 0-11

            // État Gammes
            scaleRoot: 0,
            scaleGenre: 'off',
            scaleName: '',
            scaleIntervals: [], // Stocke des floats (ex: 0, 1.5, 3...)

            language: 'fr'
        };

        this.visuals = {
            width: 0, height: 0,
            strings: [],
            isDragging: false,
            lastFreq: 0,
            lastString: -1
        };

        this.CHORD_INTERVALS = {
            'maj': [0, 4, 7], 'min': [0, 3, 7], '7': [0, 4, 7, 10],
            'maj7': [0, 4, 7, 11], 'min7': [0, 3, 7, 10], 'dim': [0, 3, 6], 'aug': [0, 4, 8]
        };

        this.presets = {
            'oud_arabe': { scale: 60, tuning: "C4, G3, D3, A2, F2, C2" },
            'oud_turc': { scale: 58.5, tuning: "G4, D4, A3, E3, A2, D2" },
            'oud_ancien': { scale: 61.5, tuning: "F4, C4, G3, D3, A2, F2" },
            'oud_irakien': { scale: 60, tuning: "G#4, D#4, A#3, F3, C3, F2" },
            'oud_grec': { scale: 58.5, tuning: "G4, D4, A3, E3, A2, D2" },
            'oud_maghreb': { scale: 60, tuning: "C4, G3, D3, A2, G2" },
            'oud_moderne': { scale: 60, tuning: "C#4, G#3, D#3, A#2, F2, C2" },
            'guitare': { scale: 64.8, tuning: "E4, B3, G3, D3, A2, E2" },
            'basse': { scale: 86.4, tuning: "G2, D2, A1, E1" }
        };

        this.CURRENT_LABELS = NOTES_FR;
        this.init();
    }

    init() {
        window.addEventListener('resize', () => this.resize());
        this.canvas.addEventListener('mousedown', (e) => { this.visuals.isDragging = true; this.handleInput(e, true); });
        this.canvas.addEventListener('mousemove', (e) => { if (this.visuals.isDragging) this.handleInput(e, true); });
        window.addEventListener('mouseup', () => {
            this.visuals.isDragging = false;
            this.visuals.lastString = -1;
            this.visuals.lastFreq = 0;
            document.getElementById('feedback').style.opacity = 0;
        });

        this.setLanguage('fr');
        this.loadPreset();

        this.loop();
    }

    setLanguage(lang) {
        const oldLang = this.config.language;
        this.config.language = lang;

        const oldLabels = (oldLang === 'fr') ? NOTES_FR : NOTES_EN;
        const newLabels = (lang === 'fr') ? NOTES_FR : NOTES_EN;
        this.CURRENT_LABELS = newLabels;

        const dict = DICTIONARY[lang];
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (dict[key]) el.innerText = dict[key];
        });

        // 1. Remplir les Selecteurs de Notes (Accords et Gammes)
        const populateSelect = (id) => {
            const el = document.getElementById(id);
            const current = el.value || 0;
            el.innerHTML = '';
            this.CURRENT_LABELS.forEach((note, index) => {
                const opt = document.createElement('option');
                opt.value = index;
                opt.text = note;
                el.add(opt);
            });
            el.value = current;
        };

        populateSelect('chordRoot');
        populateSelect('scaleRoot');

        // 2. Conversion Accordage (C2 -> Do2)
        const tuningInput = document.getElementById('tuning');
        const currentTuning = tuningInput.value;
        if (currentTuning) {
            const notes = currentTuning.split(',');
            const newTuning = notes.map(s => {
                s = s.trim();
                const match = s.match(/^(Do#?|Ré#?|Re#?|Mi|Fa#?|Sol#?|La#?|Si|C#?|D#?|E|F#?|G#?|A#?|B)(\d)$/i);
                if (match) {
                    const noteName = match[1];
                    const octave = match[2];
                    let index = -1;
                    const upperName = noteName.toUpperCase().replace('É', 'E');
                    const idxFr = NOTES_FR.findIndex(n => n.toUpperCase().replace('É', 'E') === upperName);
                    if (idxFr !== -1) index = idxFr;
                    else {
                        const idxEn = NOTES_EN.findIndex(n => n.toUpperCase() === upperName);
                        if (idxEn !== -1) index = idxEn;
                    }
                    if (index !== -1) return newLabels[index] + octave;
                }
                return s;
            }).join(', ');
            tuningInput.value = newTuning;
        }

        this.draw();
    }

    // --- LOGIQUE GAMMES (NOUVEAU) ---
    updateGenre() {
        this.config.scaleGenre = document.getElementById('scaleGenre').value;
        const scaleNameSelect = document.getElementById('scaleName');
        scaleNameSelect.innerHTML = '';

        if (this.config.scaleGenre === 'off') {
            scaleNameSelect.style.display = 'none';
        } else {
            scaleNameSelect.style.display = 'inline-block';
            const scales = SCALES[this.config.scaleGenre];
            for (const [key, data] of Object.entries(scales)) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.text = data.name;
                scaleNameSelect.add(opt);
            }
        }
        this.updateScale();
    }

    updateScale() {
        this.config.scaleRoot = parseInt(document.getElementById('scaleRoot').value);
        this.config.scaleGenre = document.getElementById('scaleGenre').value;
        const scaleKey = document.getElementById('scaleName').value;

        // Désactive les accords si on active une gamme pour éviter la confusion visuelle
        if (this.config.scaleGenre !== 'off') {
            document.getElementById('chordType').value = 'off';
            this.config.chordType = 'off';
        }

        this.config.scaleIntervals = [];

        if (this.config.scaleGenre !== 'off' && scaleKey) {
            const scaleData = SCALES[this.config.scaleGenre][scaleKey];
            if (scaleData) {
                this.config.scaleIntervals = scaleData.intervals;
            }
        }
        this.draw();
    }

    // --- LOGIQUE ACCORDS ---
    updateChord() {
        this.config.chordRoot = parseInt(document.getElementById('chordRoot').value);
        this.config.chordType = document.getElementById('chordType').value;

        // Désactive les gammes si on active un accord
        if (this.config.chordType !== 'off') {
            document.getElementById('scaleGenre').value = 'off';
            this.config.scaleGenre = 'off';
            document.getElementById('scaleName').style.display = 'none';
            this.config.scaleIntervals = [];
        }

        this.config.chordNotes = [];
        if (this.config.chordType !== 'off') {
            const intervals = this.CHORD_INTERVALS[this.config.chordType];
            this.config.chordNotes = intervals.map(interval => (this.config.chordRoot + interval) % 12);
        }
        this.draw();
    }

    loadPreset() {
        const val = document.getElementById('presetSelect').value;
        if (val === 'custom') return;
        const p = this.presets[val];
        document.getElementById('scaleLength').value = p.scale;
        document.getElementById('tuning').value = p.tuning;
        this.setLanguage(this.config.language); // Force traduction
        this.updateParams();
    }

    updateParams() {
        const rawTuning = document.getElementById('tuning').value;
        this.config.scaleLength = parseFloat(document.getElementById('scaleLength').value);

        const notes = rawTuning.split(',');
        this.config.tuning = notes.map(s => {
            s = s.trim();
            const match = s.match(/^(Do#?|Ré#?|Re#?|Mi|Fa#?|Sol#?|La#?|Si|C#?|D#?|E|F#?|G#?|A#?|B)(\d)$/i);
            let freq = 110; let baseIndex = 0; let octave = 2;

            if (match) {
                const noteName = match[1].toUpperCase().replace('É', 'E');
                octave = parseInt(match[2]);
                let idx = NOTES_EN.indexOf(noteName);
                if (idx === -1) idx = NOTES_FR.findIndex(n => n.toUpperCase().replace('É', 'E') === noteName);
                if (idx !== -1) baseIndex = idx;

                const midi = (octave + 1) * 12 + baseIndex;
                freq = 440 * Math.pow(2, (midi - 69) / 12);
            }
            return { name: s, freq: freq, baseIndex: baseIndex, octave: octave };
        });

        this.visuals.strings = this.config.tuning.map(() => ({ amp: 0, phase: 0, active: false }));
        this.resize();
    }

    resize() {
        const parent = this.canvas.parentElement;
        this.canvas.width = parent.clientWidth;
        this.canvas.height = parent.clientHeight;
        this.visuals.width = this.canvas.width;
        this.visuals.height = this.canvas.height;
        const cmVisible = this.config.scaleLength * 0.75;
        this.config.pxPerCm = (this.visuals.width - 100) / cmVisible;
        this.draw();
    }

    toggleNotes() {
        this.config.showNotes = !this.config.showNotes;
        document.getElementById('btnNotes').classList.toggle('active');
        this.draw();
    }

    toggleMeasurements() {
        this.config.showMeasurements = !this.config.showMeasurements;
        document.getElementById('btnMeasure').classList.toggle('active');
        this.draw();
    }

    silence() { this.audio.stopAll(); }

    handleInput(e, isDrag = false) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const numStr = this.config.tuning.length;
        const totalH = numStr * this.config.stringSpacing;
        const startY = (this.visuals.height - totalH) / 2;
        let bestStr = -1; let minDist = 30;

        for (let i = 0; i < numStr; i++) {
            const sy = startY + (i * this.config.stringSpacing) + 20;
            const dist = Math.abs(y - sy);
            if (dist < minDist) { minDist = dist; bestStr = i; }
        }

        if (bestStr !== -1) {
            let distPx = x - this.config.margin;
            let distCm = distPx / this.config.pxPerCm;
            if (distCm < 0) distCm = 0;

            const openFreq = this.config.tuning[bestStr].freq;
            const L_vibrante = this.config.scaleLength - distCm;
            let finalF = openFreq * 4;
            if (L_vibrante > 0.5) finalF = openFreq * (this.config.scaleLength / L_vibrante);

            const freqDiff = Math.abs(finalF - this.visuals.lastFreq);
            const strDiff = bestStr !== this.visuals.lastString;

            if (!isDrag || strDiff || freqDiff > 2) {
                const soundType = document.getElementById('soundType').value;
                const isSustain = document.getElementById('sustainMode').checked;
                this.audio.play(finalF, soundType, isSustain);

                this.visuals.strings[bestStr].active = true;
                this.visuals.strings[bestStr].amp = 5;
                this.visuals.lastFreq = finalF;
                this.visuals.lastString = bestStr;

                const semitonesFromA4 = 12 * Math.log2(finalF / 440);
                const midiNum = Math.round(69 + semitonesFromA4);
                const noteIndex = midiNum % 12;
                const noteName = this.CURRENT_LABELS[noteIndex];

                const fb = document.getElementById('feedback');
                fb.innerText = `${noteName} (${Math.round(finalF)} Hz)`;
                fb.style.opacity = 1;

                if (isDrag) { fb.style.top = (y - 40) + "px"; fb.style.left = x + "px"; }
                else { fb.style.top = "20px"; fb.style.left = "50%"; }

                clearTimeout(this.fbTimeout);
                this.fbTimeout = setTimeout(() => { if (!this.visuals.isDragging) fb.style.opacity = 0; }, 1500);
            }
        }
    }

    loop() {
        requestAnimationFrame(() => this.loop());
        let dirty = false;
        this.visuals.strings.forEach(s => {
            if (s.active) {
                s.phase += 0.5; s.amp *= 0.94;
                if (s.amp < 0.1) s.active = false;
                dirty = true;
            }
        });
        if (dirty) this.draw();
    }

    draw() {
        const { ctx, config, visuals } = this;
        const w = visuals.width; const h = visuals.height;

        ctx.fillStyle = '#111'; ctx.fillRect(0, 0, w, h);
        const numStr = config.tuning.length;
        const totalH = numStr * config.stringSpacing;
        const startY = (h - totalH) / 2;
        const boardH = totalH + 40;

        const grad = ctx.createLinearGradient(0, startY, 0, startY + boardH);
        grad.addColorStop(0, '#3e2723'); grad.addColorStop(1, '#221510');
        ctx.fillStyle = grad; ctx.fillRect(config.margin, startY, w, boardH);

        ctx.fillStyle = '#ddd'; ctx.fillRect(config.margin - 6, startY, 6, boardH);

        // --- DESSIN DES FRETTES ET NOTES ---
        // On boucle par pas de 0.5 pour capturer les quarts de ton
        for (let i = 0.5; i <= 24; i += 0.5) {

            // Calcul position (Formule standard)
            // Pour les quarts de ton (ex: 1.5), la formule mathématique reste valide
            const cm = config.scaleLength - (config.scaleLength / Math.pow(2, i / 12));
            const px = config.margin + (cm * config.pxPerCm);
            if (px > w) break;

            // On ne dessine les barres de frettes que pour les nombres entiers (1, 2, 3...)
            if (Number.isInteger(i)) {
                ctx.beginPath(); ctx.moveTo(px, startY); ctx.lineTo(px, startY + boardH);
                ctx.strokeStyle = 'rgba(255,255,255,0.1)'; ctx.stroke();

                if (config.showMeasurements) {
                    ctx.fillStyle = '#d4af37'; ctx.font = '9px monospace'; ctx.textAlign = 'center';
                    ctx.fillText(cm.toFixed(2) + 'cm', px, startY - 10);
                }
            }

            // --- LOGIQUE D'AFFICHAGE DES NOTES (Accords OU Gammes) ---
            const isScaleMode = config.scaleGenre !== 'off';
            const isChordMode = config.chordType !== 'off';

            if (config.showNotes || isScaleMode || isChordMode) {
                config.tuning.forEach((str, idx) => {
                    const sy = startY + (idx * config.stringSpacing) + 20;

                    // Calcul de la note à cette position précise (i)
                    // Note: baseIndex est un entier. i peut être un float (ex: 1.5).
                    const rawIndex = str.baseIndex + i;
                    const noteIndex = Math.floor(rawIndex) % 12; // Index de base (ex: Do)
                    const isMicro = !Number.isInteger(i); // Est-ce un quart de ton ?

                    let shouldDraw = false;
                    let color = '#aaa';
                    let label = "";

                    // 1. Mode Normal (Tout afficher)
                    if (config.showNotes && !isScaleMode && !isChordMode && !isMicro) {
                        shouldDraw = true;
                        label = this.CURRENT_LABELS[noteIndex];
                        if ([3, 5, 7, 9, 12, 15, 17].includes(i)) color = '#d4af37';
                    }

                    // 2. Mode Accords (Entiers seulement)
                    if (isChordMode && !isMicro) {
                        const isChordNote = config.chordNotes.includes(noteIndex);
                        if (isChordNote) {
                            shouldDraw = true;
                            label = this.CURRENT_LABELS[noteIndex];
                            color = (noteIndex === config.chordRoot) ? '#e74c3c' : '#3498db'; // Rouge/Bleu
                        }
                    }

                    // 3. Mode Gammes (Support Microtonal)
                    if (isScaleMode) {
                        // On doit vérifier si l'intervalle actuel par rapport à la racine correspond à la gamme
                        // Intervalle sur la corde = (Note Corde + Frette) - Racine Gamme
                        // On travaille en modulo 12 avec décimales
                        let interval = (rawIndex - config.scaleRoot) % 12;
                        if (interval < 0) interval += 12;

                        // Vérification (avec petite tolérance pour les floats)
                        const inScale = config.scaleIntervals.some(int => Math.abs(int - interval) < 0.1);

                        if (inScale) {
                            shouldDraw = true;
                            // Couleur Verte pour les gammes
                            color = (Math.abs(interval) < 0.1) ? '#e74c3c' : '#2ecc71'; // Rouge racine / Vert autres

                            if (isMicro) {
                                // Label spécial pour quart de ton
                                const baseLabel = this.CURRENT_LABELS[noteIndex];
                                label = baseLabel + "½"; // Symbole demi
                            } else {
                                label = this.CURRENT_LABELS[noteIndex];
                            }
                        }
                    }

                    if (shouldDraw) {
                        ctx.beginPath();
                        ctx.arc(px, sy - 5, 9, 0, Math.PI * 2);
                        ctx.fillStyle = color;
                        ctx.fill();

                        ctx.fillStyle = '#fff';
                        ctx.font = (isScaleMode || isChordMode) ? 'bold 11px Arial' : '10px Arial';
                        ctx.textAlign = 'center';
                        ctx.fillText(label, px, sy - 2);
                    }
                });
            }
        }

        // --- CORDES A VIDE ---
        config.tuning.forEach((str, i) => {
            const y = startY + (i * config.stringSpacing) + 20;
            const st = visuals.strings[i];
            ctx.beginPath(); ctx.moveTo(config.margin - 6, y);
            if (st.active) {
                for (let k = config.margin; k < w; k += 10) ctx.lineTo(k, y + Math.sin(k * 0.2 + st.phase) * st.amp);
            } else { ctx.lineTo(w, y); }

            ctx.strokeStyle = i < 2 ? '#aaa' : '#d4af37'; ctx.lineWidth = 1.5 + (i * 0.3); ctx.stroke();

            // Notes à vide (Accords ou Gammes)
            const noteIndex = str.baseIndex % 12;
            let highlight = false;
            let hColor = '#3498db';

            // Check Accord
            if (config.chordType !== 'off' && config.chordNotes.includes(noteIndex)) {
                highlight = true;
                hColor = (noteIndex === config.chordRoot) ? '#e74c3c' : '#3498db';
            }
            // Check Gamme (Note à vide ne peut pas être microtonale sauf accordage spécifique, on suppose standard)
            if (config.scaleGenre !== 'off') {
                let interval = (str.baseIndex - config.scaleRoot) % 12;
                if (interval < 0) interval += 12;
                if (config.scaleIntervals.includes(interval)) {
                    highlight = true;
                    hColor = (interval === 0) ? '#e74c3c' : '#2ecc71';
                }
            }

            if (highlight) {
                ctx.beginPath(); ctx.arc(config.margin - 16, y, 10, 0, Math.PI * 2);
                ctx.fillStyle = hColor; ctx.fill();
            }

            ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
            ctx.font = highlight ? 'bold 12px Arial' : '12px Arial';
            ctx.fillText(str.name, config.margin - 12, y + 4);
        });
    }
}


const app = new App();
