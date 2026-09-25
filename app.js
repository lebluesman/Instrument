'use strict';
/* =========================================================================
   Ultimate Fretboard v3
   Manche interactif : Canvas 2D (rendu en couches) + Web Audio, sans dépendance.
   ========================================================================= */

// Version lue dans l'URL du script (app.js?v=…), la même que celle du service worker
const APP_VERSION = (() => {
    try { return new URL(document.currentScript.src).searchParams.get('v') || ''; } catch (e) { return ''; }
})();

/* ---------- 1. DONNÉES ---------- */
const NOTES = {
    en: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'],
    fr: ['Do', 'Do#', 'Ré', 'Ré#', 'Mi', 'Fa', 'Fa#', 'Sol', 'Sol#', 'La', 'La#', 'Si']
};
const IS_NATURAL = [1, 0, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1];

// osc : [forme d'onde, niveau, désaccord en cents] — utilisé pour le sustain et les sons non pincés
// ks  : corde pincée (Karplus-Strong) — tau = durée de résonance, bright = brillance de l'attaque,
//       pos = position du pincement, body = résonances de caisse [fréquence, gain dB, Q]
const INSTRUMENTS = {
    oud: {
        osc: [['triangle', 1, 0], ['sawtooth', .22, 4]], attack: .004, ring: 1.9, hold: .55, release: .35, fStart: 3400, fEnd: 300, q: 1.5,
        ks: { tau: .55, bright: .75, pos: .11, stretch: .42, dur: 2.8, body: [[190, 6, 1.1], [420, -3, 1.2], [3000, 3, 1.4]] }
    },
    guitar: {
        osc: [['triangle', 1, 0], ['sawtooth', .16, -5]], attack: .006, ring: 2.6, hold: .5, release: .5, fStart: 2700, fEnd: 480, q: .8,
        ks: { tau: .95, bright: .42, pos: .17, stretch: .5, dur: 3.8, body: [[105, 5, 1.3], [230, 3, 1.5], [2500, -3, 1]] }
    },
    electric: {
        osc: [['square', .5, 0], ['sawtooth', .45, 7]], attack: .003, ring: 3.2, hold: .7, release: .6, fStart: 4800, fEnd: 1300, q: 4,
        ks: { tau: 1.6, bright: .92, pos: .08, stretch: .55, dur: 4.6, body: [[800, 3, .7]], drive: 3 }
    },
    violin: { osc: [['sawtooth', .8, 0], ['sawtooth', .4, -8]], attack: .2, ring: 1.7, hold: .9, release: .45, fStart: 2400, fEnd: 2000, q: 2, vibrato: [5.5, 9], bowed: true },
    synth:  { osc: [['sine', 1, 0], ['square', .12, 12]], attack: .03, ring: 2.2, hold: .6, release: .8, fStart: 7000, fEnd: 240, q: 7 }
};

// Ajnas (tétracordes / pentacordes) en demi-tons depuis leur tonique
const JINS = {
    rast:     { name: 'Rast', iv: [0, 2, 3.5, 5, 7] },
    bayati:   { name: 'Bayati', iv: [0, 1.5, 3, 5] },
    hijaz:    { name: 'Hijaz', iv: [0, 1, 4, 5] },
    saba:     { name: 'Saba', iv: [0, 1.5, 3, 4] },
    kurd:     { name: 'Kurd', iv: [0, 1, 3, 5] },
    nahawand: { name: 'Nahawand', iv: [0, 2, 3, 5, 7] },
    ajam:     { name: 'Ajam', iv: [0, 2, 4, 5, 7] },
    sikah:    { name: 'Sikah', iv: [0, 1.5, 3.5] },
    nikriz:   { name: 'Nikriz', iv: [0, 2, 3, 6, 7] }
};

// 1 comma turc (Arel-Ezgi-Uzdilek) = 1/53 d'octave
const K = x => x * 12 / 53;

// ajnas : [jins grave, jins aigu, ghammaz (degré où commence le jins aigu)]
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
        rast:         { fr: 'Maqam Rast', en: 'Maqam Rast', iv: [0, 2, 3.5, 5, 7, 9, 10.5], ajnas: ['rast', 'rast', 7] },
        suznak:       { fr: 'Maqam Suznak', en: 'Maqam Suznak', iv: [0, 2, 3.5, 5, 7, 8, 11], ajnas: ['rast', 'hijaz', 7] },
        bayati:       { fr: 'Maqam Bayati', en: 'Maqam Bayati', iv: [0, 1.5, 3, 5, 7, 8, 10], ajnas: ['bayati', 'nahawand', 5] },
        husseini:     { fr: 'Maqam Husseini', en: 'Maqam Husseini', iv: [0, 1.5, 3, 5, 7, 8.5, 10], ajnas: ['bayati', 'bayati', 7] },
        bayati_shuri: { fr: 'Maqam Bayati Shuri', en: 'Maqam Bayati Shuri', iv: [0, 1.5, 3, 5, 6, 9, 10], ajnas: ['bayati', 'hijaz', 5] },
        hijaz:        { fr: 'Maqam Hijaz', en: 'Maqam Hijaz', iv: [0, 1, 4, 5, 7, 8, 10], ajnas: ['hijaz', 'nahawand', 5] },
        shahnaz:      { fr: 'Maqam Shahnaz', en: 'Maqam Shahnaz', iv: [0, 1, 4, 5, 7, 8, 11], ajnas: ['hijaz', 'hijaz', 7] },
        hijazkar:     { fr: 'Maqam Hijazkar', en: 'Maqam Hijazkar', iv: [0, 1, 4, 5, 7, 8, 11], ajnas: ['hijaz', 'hijaz', 7] },
        saba:         { fr: 'Maqam Saba', en: 'Maqam Saba', iv: [0, 1.5, 3, 4, 7, 8, 10], ajnas: ['saba', 'hijaz', 3] },
        kurd:         { fr: 'Maqam Kurd', en: 'Maqam Kurd', iv: [0, 1, 3, 5, 7, 8, 10], ajnas: ['kurd', 'nahawand', 5] },
        ajam:         { fr: 'Maqam Ajam', en: 'Maqam Ajam', iv: [0, 2, 4, 5, 7, 9, 11], ajnas: ['ajam', 'ajam', 7] },
        nahawand:     { fr: 'Maqam Nahawand', en: 'Maqam Nahawand', iv: [0, 2, 3, 5, 7, 8, 10], ajnas: ['nahawand', 'kurd', 7] },
        nakriz:       { fr: 'Maqam Nakriz', en: 'Maqam Nakriz', iv: [0, 2, 3, 6, 7, 9, 10], ajnas: ['nikriz', 'nahawand', 7] },
        nawa_athar:   { fr: 'Maqam Nawa Athar', en: 'Maqam Nawa Athar', iv: [0, 2, 3, 6, 7, 8, 11], ajnas: ['nikriz', 'hijaz', 7] },
        sikah:        { fr: 'Maqam Sikah', en: 'Maqam Sikah', iv: [0, 1.5, 3.5, 5.5, 7, 8.5, 10.5], ajnas: ['sikah', 'rast', 3.5] },
        huzam:        { fr: 'Maqam Huzam', en: 'Maqam Huzam', iv: [0, 1.5, 3.5, 4.5, 7.5, 8.5, 10.5], ajnas: ['sikah', 'hijaz', 3.5] },
        iraq:         { fr: 'Maqam Iraq', en: 'Maqam Iraq', iv: [0, 1.5, 3.5, 5, 6.5, 8.5, 10.5], ajnas: ['sikah', 'bayati', 3.5] }
    },
    turkish: {
        rast:     { fr: 'Rast', en: 'Rast', iv: [0, 9, 17, 22, 31, 40, 48].map(K) },
        ussak:    { fr: 'Uşşak', en: 'Uşşak', iv: [0, 8, 13, 22, 31, 35, 44].map(K) },
        huseyni:  { fr: 'Hüseyni', en: 'Hüseyni', iv: [0, 8, 13, 22, 31, 39, 44].map(K) },
        hicaz:    { fr: 'Hicaz', en: 'Hicaz', iv: [0, 5, 17, 22, 31, 39, 44].map(K) },
        karcigar: { fr: 'Karcığar', en: 'Karcığar', iv: [0, 8, 13, 22, 27, 39, 44].map(K) },
        segah:    { fr: 'Segâh', en: 'Segâh', iv: [0, 5, 14, 23, 31, 36, 45].map(K) },
        huzzam:   { fr: 'Hüzzam', en: 'Hüzzam', iv: [0, 5, 14, 18, 31, 36, 45].map(K) },
        saba:     { fr: 'Saba', en: 'Saba', iv: [0, 8, 13, 17, 30, 35, 44].map(K) },
        kurdi:    { fr: 'Kürdî', en: 'Kürdî', iv: [0, 4, 13, 22, 31, 35, 44].map(K) },
        nihavend: { fr: 'Nihâvend', en: 'Nihâvend', iv: [0, 9, 13, 22, 31, 35, 48].map(K) }
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

// Rythmes : D = dum, T = tek, k = tek léger, A = clic accentué, c = clic, . = silence ; div = pas par temps
const RHYTHMS = {
    click4:   { fr: 'Clic 4/4', en: 'Click 4/4', div: 1, steps: 'Accc' },
    click3:   { fr: 'Clic 3/4', en: 'Click 3/4', div: 1, steps: 'Acc' },
    maqsum:   { fr: 'Maqsum (4/4)', en: 'Maqsum (4/4)', div: 2, steps: 'DT.TD.T.' },
    baladi:   { fr: 'Baladi (4/4)', en: 'Baladi (4/4)', div: 2, steps: 'DD.TD.T.' },
    saidi:    { fr: 'Saïdi (4/4)', en: 'Saidi (4/4)', div: 2, steps: 'DT.DD.T.' },
    wahda:    { fr: 'Wahda (4/4)', en: 'Wahda (4/4)', div: 2, steps: 'D...T.k.' },
    ayyub:    { fr: 'Ayyub (2/4)', en: 'Ayyub (2/4)', div: 2, steps: 'D.DT' },
    malfuf:   { fr: 'Malfuf (2/4)', en: 'Malfuf (2/4)', div: 4, steps: 'D..T..T.' },
    masmoudi: { fr: 'Masmoudi kabir (8/4)', en: 'Masmoudi kabir (8/4)', div: 2, steps: 'DD..T.D.D...T...' },
    samai:    { fr: 'Samaï thaqil (10/8)', en: 'Samai thaqil (10/8)', div: 2, steps: 'D...T.DDT.' }
};

const I18N = {
    fr: {
        mode_free: 'Libre', mode_chord: 'Accords', mode_scale: 'Gammes', mode_detect: 'Détecteur',
        notes: 'Notes', measures: 'Mesures', hint_free: 'Touchez ou glissez sur les cordes — plusieurs doigts possibles',
        root: 'Fondamentale', chord_type: 'Type d’accord', genre: 'Famille', scale: 'Gamme', sound: 'Son',
        sustain: 'Sustain infini', stop: 'Tout arrêter (Échap)', focus: 'Plein écran', exit_focus: 'Quitter le plein écran',
        settings: 'Réglages', close: 'Fermer', clear: 'Effacer', play: 'Écouter',
        hide_menu: 'Masquer le menu', show_menu: 'Afficher le menu', install: 'Installer l’application',
        update_ready: 'Nouvelle version disponible', update_now: 'Mettre à jour',
        detect_hint: 'Touchez des notes sur le manche…',
        detect_empty: 'Les gammes et maqams contenant vos notes apparaîtront ici.',
        detect_none: 'Aucune gamme connue ne contient toutes ces notes.',
        lg_root: 'Fondamentale', lg_chord: 'Accord', lg_scale: 'Gamme', lg_quarter: 'Micro-intervalle', lg_selected: 'Sélection',
        lg_ghammaz: 'Ghammaz', ajnas: 'Ajnas',
        micro_fix: 'Micro-intervalles : passer en fretless',
        genre_western: 'Occidental', genre_oriental: 'Maqams arabes', genre_turkish: 'Makams turcs (commas)', genre_andalous: 'Andalou (Algérie)',
        snd_oud: 'Oud', snd_guitar: 'Guitare nylon', snd_electric: 'Électrique', snd_violin: 'Violon', snd_synth: 'Synthé',
        sec_instrument: 'Instrument', preset: 'Préréglage', custom: 'Personnalisé',
        preset_save: 'Enregistrer comme préréglage', preset_delete: 'Supprimer', preset_name: 'Nom du préréglage :',
        preset_saved: 'Préréglage enregistré', preset_confirm_del: 'Supprimer ce préréglage ?',
        tuning: 'Accordage (de l’aigu au grave)',
        tuning_help: 'Ex. : Do4, Sol3, Ré3 ou C4, G3, D3 — dièses (#) et bémols (b) acceptés.',
        tuning_bad: 'Note non reconnue : ',
        length: 'Longueur de corde vibrante (cm)', neck: 'Manche', fretted: 'Fretté', fretless: 'Fretless',
        neck_help: 'Fretless : manche lisse, on joue n’importe où, quarts de ton compris (oud, violon). Fretté : chaque note se cale sur la frette, les quarts de ton ne sont pas jouables.',
        sec_display: 'Affichage', frets: 'Cases visibles', auto: 'Auto', orientation: 'Orientation',
        horizontal: 'Horizontale', vertical: 'Verticale', position: 'Position',
        position_help: 'Case de départ affichée : pratique sur téléphone pour agrandir les cases aiguës. Flèches ← → au clavier.',
        show_notes: 'Noms des notes', show_measures: 'Mesures (cm depuis le sillet)',
        lefty: 'Gaucher (manche inversé)', fullscreen: 'Plein écran',
        sec_sound: 'Son', volume: 'Volume', reverb: 'Réverbération',
        ios_note: 'Sur iPhone / iPad, désactivez le mode silencieux pour entendre le son.',
        sec_share: 'Partager', share_btn: 'Partager cette configuration',
        share_help: 'Crée un lien qui ouvre l’appli avec le même accordage, le même maqam et les mêmes réglages.',
        link_copied: 'Lien copié !', link_loaded: 'Configuration partagée chargée',
        sec_lang: 'Langue', old_version: 'Versions précédentes :',
        practice: 'Pratique', sec_drone: 'Bourdon', drone_follow: 'Tonique actuelle',
        drone_help: 'Tonique + quinte tenues en continu, pour travailler la justesse des quarts de ton.',
        start: 'Démarrer', stop_word: 'Arrêter',
        sec_metro: 'Métronome et rythmes', tempo: 'Tempo', rhythm: 'Rythme',
        metro_help: 'Dum = grave, Tek = aigu. Le tempo règle aussi la vitesse du bouton ▶.',
        sec_tuner: 'Accordeur', tuner_start: 'Démarrer l’accordeur (micro)', tuner_stop: 'Arrêter l’accordeur',
        tuner_listen: 'Jouez une note…', tuner_nomic: 'Micro indisponible (autorisation refusée ou page non sécurisée).',
        tuner_string: 'Corde',
        sec_quiz: 'Quiz', quiz_find_btn: 'Trouver la note sur le manche', quiz_name_btn: 'Nommer la note affichée',
        quiz_naturals: 'Notes naturelles seulement', quiz_find: 'Trouve :', quiz_name: 'Quelle note ?',
        quiz_skip: 'Passer', quiz_end: 'Terminer'
    },
    en: {
        mode_free: 'Free', mode_chord: 'Chords', mode_scale: 'Scales', mode_detect: 'Detector',
        notes: 'Notes', measures: 'Measures', hint_free: 'Tap or slide on the strings — multi-touch supported',
        root: 'Root', chord_type: 'Chord type', genre: 'Family', scale: 'Scale', sound: 'Sound',
        sustain: 'Infinite sustain', stop: 'Stop everything (Esc)', focus: 'Full screen', exit_focus: 'Exit full screen',
        settings: 'Settings', close: 'Close', clear: 'Clear', play: 'Play',
        hide_menu: 'Hide menu', show_menu: 'Show menu', install: 'Install the app',
        update_ready: 'New version available', update_now: 'Update',
        detect_hint: 'Tap notes on the neck…',
        detect_empty: 'Scales and maqams containing your notes will show up here.',
        detect_none: 'No known scale contains all of these notes.',
        lg_root: 'Root', lg_chord: 'Chord', lg_scale: 'Scale', lg_quarter: 'Microtone', lg_selected: 'Selected',
        lg_ghammaz: 'Ghammaz', ajnas: 'Ajnas',
        micro_fix: 'Microtones: switch to fretless',
        genre_western: 'Western', genre_oriental: 'Arabic maqams', genre_turkish: 'Turkish makams (commas)', genre_andalous: 'Andalusian (Algeria)',
        snd_oud: 'Oud', snd_guitar: 'Nylon guitar', snd_electric: 'Electric', snd_violin: 'Violin', snd_synth: 'Synth',
        sec_instrument: 'Instrument', preset: 'Preset', custom: 'Custom',
        preset_save: 'Save as preset', preset_delete: 'Delete', preset_name: 'Preset name:',
        preset_saved: 'Preset saved', preset_confirm_del: 'Delete this preset?',
        tuning: 'Tuning (high to low)',
        tuning_help: 'E.g. C4, G3, D3 or Do4, Sol3, Ré3 — sharps (#) and flats (b) accepted.',
        tuning_bad: 'Unknown note: ',
        length: 'Scale length (cm)', neck: 'Neck', fretted: 'Fretted', fretless: 'Fretless',
        neck_help: 'Fretless: smooth neck, play anywhere including quarter tones (oud, violin). Fretted: each note snaps to the fret, quarter tones cannot be played.',
        sec_display: 'Display', frets: 'Visible frets', auto: 'Auto', orientation: 'Orientation',
        horizontal: 'Horizontal', vertical: 'Vertical', position: 'Position',
        position_help: 'First fret shown: handy on phones to enlarge the high frets. ← → arrow keys on a keyboard.',
        show_notes: 'Note names', show_measures: 'Measurements (cm from nut)',
        lefty: 'Left-handed (mirrored neck)', fullscreen: 'Full screen',
        sec_sound: 'Sound', volume: 'Volume', reverb: 'Reverb',
        ios_note: 'On iPhone / iPad, turn off silent mode to hear sound.',
        sec_share: 'Share', share_btn: 'Share this setup',
        share_help: 'Creates a link that opens the app with the same tuning, maqam and settings.',
        link_copied: 'Link copied!', link_loaded: 'Shared setup loaded',
        sec_lang: 'Language', old_version: 'Previous versions:',
        practice: 'Practice', sec_drone: 'Drone', drone_follow: 'Current root',
        drone_help: 'Root + fifth held continuously, to practise quarter-tone intonation.',
        start: 'Start', stop_word: 'Stop',
        sec_metro: 'Metronome & rhythms', tempo: 'Tempo', rhythm: 'Rhythm',
        metro_help: 'Dum = low, Tek = high. The tempo also sets the speed of the ▶ button.',
        sec_tuner: 'Tuner', tuner_start: 'Start tuner (microphone)', tuner_stop: 'Stop tuner',
        tuner_listen: 'Play a note…', tuner_nomic: 'Microphone unavailable (permission denied or insecure page).',
        tuner_string: 'String',
        sec_quiz: 'Quiz', quiz_find_btn: 'Find the note on the neck', quiz_name_btn: 'Name the highlighted note',
        quiz_naturals: 'Natural notes only', quiz_find: 'Find:', quiz_name: 'Which note?',
        quiz_skip: 'Skip', quiz_end: 'End'
    }
};

const COLORS = {
    root:    { fill: '#f2545b', text: '#fff' },
    chord:   { fill: '#4f8ff7', text: '#fff' },
    scale:   { fill: '#16b981', text: '#fff' },
    lower:   { fill: '#8b5cf6', text: '#fff' },
    upper:   { fill: '#0ea5e9', text: '#fff' },
    ghammaz: { fill: '#0ea5e9', text: '#fff', ring: '#fff' },
    detect:  { fill: '#f5a524', text: '#1b1406', ring: '#fff' },
    quiz:    { fill: '#e4b55a', text: '#1b1406', ring: '#fff' },
    free:      { fill: 'rgba(245,240,230,.17)', text: '#f3efe6', plain: true },
    freeSharp: { fill: 'rgba(245,240,230,.07)', text: 'rgba(243,239,230,.62)', plain: true }
};

const INLAYS = [3, 5, 7, 9, 12, 15, 17, 19, 21, 24];
const MAX_POS = 15;
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
const isWhole = v => Math.abs(v - Math.round(v)) < 1e-6;
const posCm = (L, semis) => L * (1 - Math.pow(2, -semis / 12));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const shuffle = arr => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

// Nom d'une note (valeur 0..12). Quarts de ton à l'orientale (Mi½♭, Fa½♯) ; commas turcs : note la plus proche + ↓/↑
function noteParts(v, lang) {
    const names = NOTES[lang];
    v = mod12(v);
    const q = snapQ(v);
    if (Math.abs(v - q) > .06) {
        const r = Math.round(v);
        return { base: names[r % 12], acc: v < r ? '↓' : '↑' };
    }
    v = mod12(q);
    if (Number.isInteger(v)) return { base: names[v], acc: '' };
    const up = Math.ceil(v) % 12;
    return IS_NATURAL[up] ? { base: names[up], acc: '½♭' } : { base: names[Math.floor(v)], acc: '½♯' };
}
const noteText = (v, lang) => { const p = noteParts(v, lang); return p.base + p.acc; };

function octaveOf(midi, parts) {
    const m = parts.acc === '½♭' ? Math.ceil(midi) : parts.acc === '½♯' ? Math.floor(midi) : Math.round(midi);
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

// Détection de hauteur (méthode McLeod / NSDF) pour l'accordeur
function detectPitch(x, sr) {
    const N = 2048;
    const minLag = Math.floor(sr / 1400), maxLag = Math.min(x.length - N - 2, Math.ceil(sr / 38));
    let energy = 0;
    for (let j = 0; j < N; j++) energy += x[j] * x[j];
    if (Math.sqrt(energy / N) < .008) return null;
    const nsdf = new Float32Array(maxLag + 2);
    for (let lag = minLag; lag <= maxLag + 1; lag++) {
        let ac = 0, m = 0;
        for (let j = 0; j < N; j++) { const a = x[j], b = x[j + lag]; ac += a * b; m += a * a + b * b; }
        nsdf[lag] = m ? 2 * ac / m : 0;
    }
    let start = minLag;
    while (start < maxLag && nsdf[start] > 0) start++;
    let max = 0;
    for (let lag = start; lag <= maxLag; lag++) max = Math.max(max, nsdf[lag]);
    if (max < .6) return null;
    for (let lag = start + 1; lag <= maxLag; lag++) {
        const b = nsdf[lag];
        if (b >= .9 * max && b >= nsdf[lag - 1] && b >= nsdf[lag + 1]) {
            const a = nsdf[lag - 1], c = nsdf[lag + 1], den = a - 2 * b + c;
            return sr / (lag + (den ? (a - c) / (2 * den) : 0));
        }
    }
    return null;
}

// Corde pincée (Karplus-Strong). Période entière + correction par playbackRate = hauteur exacte.
function renderPluck(sr, freq, k) {
    const P = Math.max(2, Math.floor(sr / freq - k.stretch));
    const len = Math.floor(sr * k.dur);
    const out = new Float32Array(len);

    // Excitation : bruit filtré (brillance) + filtre en peigne (position du pincement)
    const exc = new Float32Array(P);
    let lp = 0;
    for (let i = 0; i < P; i++) { lp += k.bright * ((Math.random() * 2 - 1) - lp); exc[i] = lp; }
    const d = Math.max(1, Math.round(k.pos * P));
    let mean = 0;
    const e2 = new Float32Array(P);
    for (let i = 0; i < P; i++) { e2[i] = exc[i] - (i >= d ? exc[i - d] : 0); mean += e2[i]; }
    mean /= P;
    let peak = 0;
    for (let i = 0; i < P; i++) { e2[i] -= mean; peak = Math.max(peak, Math.abs(e2[i])); }
    const norm = peak ? .9 / peak : 1;

    // Les graves résonnent plus longtemps
    const tau = k.tau * clamp(Math.pow(196 / freq, .4), .45, 2.2);
    const rho = Math.exp(-(P + k.stretch) / (sr * tau));
    const a = 1 - k.stretch, b = k.stretch;
    for (let n = 0; n < len; n++) {
        const x = n < P ? e2[n] * norm : 0;
        const y1 = n >= P ? out[n - P] : 0, y2 = n > P ? out[n - P - 1] : 0;
        out[n] = x + rho * (a * y1 + b * y2);
    }
    // Suppression de la composante continue + fondu de fin
    let px = 0, py = 0;
    const fade = Math.floor(sr * .05);
    for (let n = 0; n < len; n++) {
        const x = out[n];
        py = x - px + .995 * py;
        px = x;
        out[n] = n > len - fade ? py * (len - n) / fade : py;
    }
    return { data: out, period: P + k.stretch };
}

/* ---------- 3. MOTEUR AUDIO ---------- */
// Voix « synthé » (oscillateurs) : sustain, violon, synthé
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

// Voix « corde pincée » (Karplus-Strong) : oud, guitare, électrique
class PluckVoice {
    constructor(engine, freq, key) {
        const ctx = engine.ctx, p = INSTRUMENTS[key], k = p.ks, t = ctx.currentTime;
        this.engine = engine; this.ctx = ctx; this.p = p; this.released = false;

        const r = renderPluck(ctx.sampleRate, freq, k);
        const buf = ctx.createBuffer(1, r.data.length, ctx.sampleRate);
        buf.getChannelData(0).set(r.data);
        this.period = r.period;
        this.src = ctx.createBufferSource();
        this.src.buffer = buf;
        this.src.playbackRate.value = freq * this.period / ctx.sampleRate;

        let node = this.src;
        for (const [f, gain, q] of k.body) {
            const bq = ctx.createBiquadFilter();
            bq.type = 'peaking';
            bq.frequency.value = f; bq.gain.value = gain; bq.Q.value = q;
            node.connect(bq); node = bq;
        }
        if (k.drive) {
            const ws = ctx.createWaveShaper();
            ws.curve = engine.driveCurve(k.drive);
            node.connect(ws); node = ws;
        }
        this.out = ctx.createGain();
        this.out.gain.value = .42 * clamp(Math.pow(196 / freq, .2), .75, 1.35);
        node.connect(this.out);
        this.out.connect(engine.bus);

        this.end = t + r.data.length / ctx.sampleRate / this.src.playbackRate.value;
        this.src.onended = () => this.dispose();
        this.src.start(t);
        engine.voices.add(this);
    }

    get alive() { return !this.released && this.ctx.currentTime < this.end - .3; }

    setFreq(f) {
        const t = this.ctx.currentTime;
        this.src.playbackRate.cancelScheduledValues(t);
        this.src.playbackRate.setTargetAtTime(f * this.period / this.ctx.sampleRate, t, .012);
    }

    release(dur = .12) {
        if (this.released) return;
        this.released = true;
        const t = this.ctx.currentTime, g = this.out.gain;
        g.cancelScheduledValues(t);
        g.setValueAtTime(g.value, t);
        g.setTargetAtTime(0, t, Math.max(dur / 4, .008));
        try { this.src.stop(t + dur + .05); } catch (e) { /* déjà arrêté */ }
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
        this.drone = null;
        this.curves = {};
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

            this.noise = ctx.createBuffer(1, Math.floor(ctx.sampleRate * .2), ctx.sampleRate);
            const nd = this.noise.getChannelData(0);
            for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

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

    driveCurve(amount) {
        if (!this.curves[amount]) {
            const c = new Float32Array(1024), n = Math.tanh(amount);
            for (let i = 0; i < c.length; i++) { const x = i / (c.length - 1) * 2 - 1; c[i] = Math.tanh(amount * x) / n; }
            this.curves[amount] = c;
        }
        return this.curves[amount];
    }

    play(freq, key, sustain) {
        if (!this.unlock()) return null;
        if (this.voices.size >= 32) this.voices.values().next().value.release(.05);
        const p = INSTRUMENTS[key] || INSTRUMENTS.guitar;
        return !sustain && p.ks ? new PluckVoice(this, freq, key) : new Voice(this, freq, key, sustain);
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

    /* Bourdon : tonique + quinte + octave, filtre qui respire doucement */
    startDrone(freq, vol) {
        this.stopDrone();
        const ctx = this.unlock();
        if (!ctx) return;
        const t = ctx.currentTime;
        const out = ctx.createGain();
        out.gain.setValueAtTime(0, t);
        out.gain.linearRampToValueAtTime(vol * .35, t + 1.2);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = .8;
        const lfo = ctx.createOscillator(), lg = ctx.createGain();
        lfo.frequency.value = .13; lg.gain.value = 350;
        lfo.connect(lg); lg.connect(lp.frequency); lfo.start(t);
        const oscs = [['sawtooth', 1, 0, .5], ['sawtooth', 1, 6, .4], ['sawtooth', 2, -4, .2], ['sine', .5, 0, .6], ['triangle', 1.5, 2, .14]]
            .map(([type, ratio, det, lvl]) => {
                const o = ctx.createOscillator(), g = ctx.createGain();
                o.type = type; o.frequency.value = freq * ratio; o.detune.value = det; g.gain.value = lvl;
                o.connect(g); g.connect(lp); o.start(t);
                return { o, ratio };
            });
        lp.connect(out);
        out.connect(this.bus);
        this.drone = { oscs, out, lfo };
    }

    setDroneFreq(freq) {
        if (!this.drone) return;
        const t = this.ctx.currentTime;
        this.drone.oscs.forEach(({ o, ratio }) => o.frequency.setTargetAtTime(freq * ratio, t, .08));
    }

    setDroneVolume(v) {
        if (this.drone) this.drone.out.gain.setTargetAtTime(v * .35, this.ctx.currentTime, .1);
    }

    stopDrone() {
        if (!this.drone) return;
        const d = this.drone, t = this.ctx.currentTime;
        this.drone = null;
        d.out.gain.cancelScheduledValues(t);
        d.out.gain.setValueAtTime(d.out.gain.value, t);
        d.out.gain.linearRampToValueAtTime(0, t + .5);
        [...d.oscs.map(x => x.o), d.lfo].forEach(o => { try { o.stop(t + .55); } catch (e) { /* ignore */ } });
    }

    /* Percussions du métronome (hors réverbération) */
    hit(ch, t) {
        if (ch === '.') return;
        const ctx = this.ctx, g = ctx.createGain();
        g.connect(this.comp);
        if (ch === 'D') {
            const o = ctx.createOscillator();
            o.frequency.setValueAtTime(140, t);
            o.frequency.exponentialRampToValueAtTime(55, t + .16);
            g.gain.setValueAtTime(.0001, t);
            g.gain.exponentialRampToValueAtTime(1, t + .005);
            g.gain.exponentialRampToValueAtTime(.0001, t + .38);
            o.connect(g); o.start(t); o.stop(t + .4);
        } else if (ch === 'T' || ch === 'k') {
            const n = ctx.createBufferSource(), bp = ctx.createBiquadFilter();
            n.buffer = this.noise;
            bp.type = 'bandpass'; bp.frequency.value = ch === 'T' ? 3200 : 4300; bp.Q.value = 1.1;
            g.gain.setValueAtTime(ch === 'T' ? 1 : .45, t);
            g.gain.exponentialRampToValueAtTime(.0001, t + .07);
            n.connect(bp); bp.connect(g); n.start(t); n.stop(t + .09);
        } else {
            const o = ctx.createOscillator();
            o.frequency.value = ch === 'A' ? 1760 : 1175;
            g.gain.setValueAtTime(ch === 'A' ? .6 : .35, t);
            g.gain.exponentialRampToValueAtTime(.0001, t + .05);
            o.connect(g); o.start(t); o.stop(t + .06);
        }
    }
}

/* Métronome : ordonnancement précis sur l'horloge audio (lookahead) */
class Metronome {
    constructor(engine, onStep) {
        this.engine = engine;
        this.onStep = onStep;
        this.timer = null;
        this.uiTimers = [];
        this.bpm = 90;
        this.rhythm = 'maqsum';
    }

    get running() { return !!this.timer; }

    start() {
        const ctx = this.engine.unlock();
        if (!ctx) return;
        this.stepIdx = 0;
        this.next = ctx.currentTime + .1;
        this.uiTimers = [];
        this.timer = setInterval(() => this.tick(), 25);
        this.tick();
    }

    stop() {
        clearInterval(this.timer);
        this.timer = null;
        this.uiTimers.forEach(clearTimeout);
        this.uiTimers = [];
        this.onStep(-1);
    }

    setRhythm(r) { this.rhythm = r; this.stepIdx = 0; }

    tick() {
        const ctx = this.engine.ctx, r = RHYTHMS[this.rhythm];
        while (this.next < ctx.currentTime + .12) {
            const i = this.stepIdx % r.steps.length;
            this.engine.hit(r.steps[i], this.next);
            this.uiTimers.push(setTimeout(() => this.onStep(i), Math.max(0, (this.next - ctx.currentTime) * 1000)));
            this.next += 60 / this.bpm / r.div;
            this.stepIdx++;
        }
        if (this.uiTimers.length > 64) this.uiTimers = this.uiTimers.slice(-16);
    }
}

/* Accordeur : micro -> détection de hauteur */
class Tuner {
    constructor(engine, onPitch) {
        this.engine = engine;
        this.onPitch = onPitch;
        this.running = false;
    }

    async start() {
        const ctx = this.engine.unlock();
        if (!ctx || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error('nomic');
        this.stream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        });
        this.src = ctx.createMediaStreamSource(this.stream);
        this.an = ctx.createAnalyser();
        this.an.fftSize = 4096;
        this.mute = ctx.createGain();
        this.mute.gain.value = 0;
        this.src.connect(this.an);
        this.an.connect(this.mute);
        this.mute.connect(ctx.destination);   // certains navigateurs n'analysent qu'un graphe relié à la sortie
        this.buf = new Float32Array(this.an.fftSize);
        this.timer = setInterval(() => {
            this.an.getFloatTimeDomainData(this.buf);
            this.onPitch(detectPitch(this.buf, ctx.sampleRate));
        }, 70);
        this.running = true;
    }

    stop() {
        clearInterval(this.timer);
        if (this.stream) this.stream.getTracks().forEach(t => t.stop());
        try { this.src && this.src.disconnect(); this.mute && this.mute.disconnect(); } catch (e) { /* ignore */ }
        this.running = false;
    }
}

/* ---------- 4. ÉTAT ---------- */
const DEFAULTS = {
    lang: /^fr/i.test(navigator.language || 'fr') ? 'fr' : 'en',
    mode: 'free', sound: 'guitar', sustain: false,
    preset: 'guitare', tuning: 'E4, B3, G3, D3, A2, E2', length: 64.8, fretMode: 'fretted',
    frets: 'auto', orientation: 'auto', position: 0, lefty: false,
    showNotes: true, showMeasures: true, showAjnas: true,
    volume: .8, reverb: true, menuHidden: false,
    chordRoot: 0, chordType: 'maj',
    scaleRoot: 0, scaleGenre: 'western', scaleKey: 'major',
    detected: [], userPresets: [],
    droneRoot: 'auto', droneOct: '2', droneVol: .5,
    bpm: 90, rhythm: 'maqsum', quizNaturals: true
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
    if (!['2', '3'].includes(s.droneOct)) s.droneOct = '2';
    if (!RHYTHMS[s.rhythm]) s.rhythm = 'maqsum';
    if (!Array.isArray(s.detected)) s.detected = [];
    s.userPresets = Array.isArray(s.userPresets)
        ? s.userPresets.filter(p => p && typeof p.id === 'string' && typeof p.name === 'string' && typeof p.tuning === 'string')
        : [];
    if (s.preset.startsWith('u:') && !s.userPresets.some(p => 'u:' + p.id === s.preset)) s.preset = 'custom';
    s.length = clamp(+s.length || 64.8, 20, 130);
    s.volume = clamp(+s.volume, 0, 1);
    s.droneVol = clamp(+s.droneVol, 0, 1);
    s.bpm = clamp(Math.round(+s.bpm) || 90, 40, 240);
    s.position = clamp(Math.round(+s.position) || 0, 0, MAX_POS);
    s.scaleRoot = clamp(snapQ(+s.scaleRoot || 0), 0, 11.5);
    return s;
}

/* ---------- 5. APPLICATION ---------- */
class App {
    constructor() {
        this.s = loadState();
        const fromLink = this.applyHash();
        this.detected = new Set(this.s.detected.filter(v => typeof v === 'number'));
        this.audio = new AudioEngine(this.s.volume, this.s.reverb);
        this.metro = new Metronome(this.audio, i => this.onBeat(i));
        this.metro.bpm = this.s.bpm;
        this.metro.rhythm = this.s.rhythm;
        this.tuner = new Tuner(this.audio, f => this.onTuner(f));

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
        this.seq = null;
        this.quiz = null;
        this.tunerHist = [];
        this.tunerMiss = 0;

        this.applyTuning();
        if (fromLink) this.s.preset = this.matchPreset();
        this.bindUI();
        this.bindPointer();
        this.renderUI();

        if ('ResizeObserver' in window) new ResizeObserver(() => this.layout()).observe(this.stage);
        else window.addEventListener('resize', () => this.layout());
        this.layout();
        if (fromLink) setTimeout(() => this.notify(this.t('link_loaded')), 300);
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
        this.syncDrone();
    }

    notify(text) {
        const el = $('#msgToast');
        el.textContent = text;
        el.hidden = false;
        clearTimeout(this.msgTimer);
        this.msgTimer = setTimeout(() => { el.hidden = true; }, 2200);
    }

    /* ----- Lien de partage ----- */
    applyHash() {
        if (!/(^#|&)t=/.test(location.hash)) return false;
        const p = new URLSearchParams(location.hash.slice(1)), s = this.s;
        const parsed = parseTuning((p.get('t') || '').replace(/,/g, ' '));
        if (!parsed.strings.length || parsed.bad.length) return false;
        s.tuning = formatTuning(parsed.strings, s.lang);
        const num = (k, lo, hi) => { const v = parseFloat(p.get(k)); return isFinite(v) ? clamp(v, lo, hi) : null; };
        const l = num('l', 20, 130); if (l !== null) s.length = l;
        if (['fretted', 'fretless'].includes(p.get('f'))) s.fretMode = p.get('f');
        if (INSTRUMENTS[p.get('s')]) s.sound = p.get('s');
        if (['free', 'chord', 'scale', 'detect'].includes(p.get('m'))) s.mode = p.get('m');
        const cr = num('cr', 0, 11); if (cr !== null) s.chordRoot = Math.round(cr);
        if (CHORDS[p.get('ct')]) s.chordType = p.get('ct');
        const r = num('r', 0, 11.5); if (r !== null) s.scaleRoot = snapQ(r);
        const g = p.get('g'), k = p.get('k');
        if (SCALES[g] && SCALES[g][k]) { s.scaleGenre = g; s.scaleKey = k; }
        const pos = num('p', 0, MAX_POS); if (pos !== null) s.position = Math.round(pos);
        history.replaceState(null, '', location.pathname + location.search);
        return true;
    }

    shareLink() {
        const s = this.s;
        const p = new URLSearchParams({
            t: formatTuning(this.strings, 'en').replace(/ /g, ''), l: s.length, f: s.fretMode, s: s.sound,
            m: s.mode === 'quiz' ? 'free' : s.mode, cr: s.chordRoot, ct: s.chordType,
            r: s.scaleRoot, g: s.scaleGenre, k: s.scaleKey, p: s.position
        });
        const url = location.origin + location.pathname + '#' + p.toString();
        if (navigator.share) {
            navigator.share({ title: 'Ultimate Fretboard', url }).catch(() => {});
        } else if (navigator.clipboard) {
            navigator.clipboard.writeText(url).then(() => this.notify(this.t('link_copied')), () => window.prompt('', url));
        } else {
            window.prompt('', url);
        }
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

    allPresets() {
        const list = Object.entries(PRESETS).map(([k, p]) => ({ key: k, name: p[this.s.lang], len: p.len, tuning: p.tuning, fret: p.fret, sound: p.sound }));
        this.s.userPresets.forEach(p => list.push({ key: 'u:' + p.id, name: p.name, len: p.len, tuning: p.tuning, fret: p.fret, sound: p.sound, user: true }));
        return list;
    }

    matchPreset() {
        const cur = this.strings.map(s => s.midi).join(',');
        for (const p of this.allPresets()) {
            const midis = parseTuning(p.tuning).strings.map(s => s.midi).join(',');
            if (midis === cur && Math.abs(p.len - this.s.length) < .01) return p.key;
        }
        return 'custom';
    }

    loadPreset(key) {
        const p = this.allPresets().find(x => x.key === key);
        if (!p) { this.s.preset = 'custom'; this.refresh(); return; }
        Object.assign(this.s, { preset: key, length: p.len });
        if (['fretted', 'fretless'].includes(p.fret)) this.s.fretMode = p.fret;
        if (INSTRUMENTS[p.sound]) this.s.sound = p.sound;
        this.s.tuning = formatTuning(parseTuning(p.tuning).strings, this.s.lang);
        this.applyTuning();
        this.refresh();
    }

    savePreset() {
        const name = window.prompt(this.t('preset_name'), formatTuning(this.strings, this.s.lang).replace(/,/g, ''));
        if (!name || !name.trim()) return;
        const id = Date.now().toString(36);
        this.s.userPresets.push({
            id, name: name.trim().slice(0, 40), tuning: formatTuning(this.strings, 'en'),
            len: this.s.length, fret: this.s.fretMode, sound: this.s.sound
        });
        this.s.preset = 'u:' + id;
        this.refresh();
        this.notify(this.t('preset_saved'));
    }

    deletePreset() {
        if (!this.s.preset.startsWith('u:') || !window.confirm(this.t('preset_confirm_del'))) return;
        this.s.userPresets = this.s.userPresets.filter(p => 'u:' + p.id !== this.s.preset);
        this.s.preset = 'custom';
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

    setPosition(v) {
        this.s.position = clamp(Math.round(v), 0, MAX_POS);
        this.refresh();
    }

    setLang(lang) {
        this.s.lang = lang;
        this.s.tuning = formatTuning(this.strings, lang);
        this.refresh();
    }

    /* ----- Théorie ----- */
    scale() { return SCALES[this.s.scaleGenre][this.s.scaleKey]; }
    chordPcs() { return CHORDS[this.s.chordType].iv.map(v => mod12(this.s.chordRoot + v)); }
    scaleHasMicro() { return !Number.isInteger(this.s.scaleRoot) || this.scale().iv.some(v => !isWhole(v)); }
    ajnasOn() { return this.s.showAjnas && !!this.scale().ajnas; }

    // Degrés de la gamme avec leur rôle (fondamentale, jins grave / aigu, ghammaz)
    scaleDegrees() {
        const sc = this.scale(), root = this.s.scaleRoot, aj = this.ajnasOn() ? sc.ajnas : null;
        return sc.iv.map(iv => {
            let info = COLORS.scale;
            if (near(iv, 0)) info = COLORS.root;
            else if (aj) {
                const [lo, up, at] = aj;
                if (near(iv, at)) info = COLORS.ghammaz;
                else if (JINS[lo].iv.some(v => near(v, iv))) info = COLORS.lower;
                else if (JINS[up].iv.some(v => near(at + v, iv))) info = COLORS.upper;
            }
            return { iv, pc: mod12(root + iv), info };
        });
    }

    classify(pc) {
        const s = this.s, isInt = isWhole(pc);
        if (s.mode === 'quiz') return null;
        if (s.mode === 'chord') {
            if (isInt && this.chordPcs().some(v => near(v, pc))) return near(pc, s.chordRoot) ? COLORS.root : COLORS.chord;
            return null;
        }
        if (s.mode === 'scale') {
            const d = this.scaleDegrees().find(x => near(mod12(pc - x.pc + 6) - 6, 0));
            return d ? d.info : null;
        }
        if (s.mode === 'detect') {
            for (const v of this.detected) if (near(v, pc)) return COLORS.detect;
        }
        if (s.showNotes && isInt) return IS_NATURAL[Math.round(pc) % 12] ? COLORS.free : COLORS.freeSharp;
        return null;
    }

    findScales() {
        const notes = [...this.detected].sort((a, b) => a - b);
        if (!notes.length) return [];
        const groups = new Map();
        for (let r2 = 0; r2 < 24; r2++) {
            const root = r2 / 2;
            for (const [genre, list] of Object.entries(SCALES)) {
                if (genre === 'turkish') continue;   // commas : hors de la grille des quarts de ton
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
            this.quiz = null;
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
        $('#playScale').addEventListener('click', () => this.playScale());
        $('#playChord').addEventListener('click', () => this.playChord());

        $('#sound').addEventListener('change', e => { this.s.sound = e.target.value; this.save(); });
        $('#btnSustain').addEventListener('click', () => {
            this.s.sustain = !this.s.sustain;
            if (!this.s.sustain) this.stop(true);
            this.save();
            this.renderUI();
        });
        $('#btnStop').addEventListener('click', () => this.stopEverything());
        $('#fStop').addEventListener('click', () => this.stopEverything());
        $('#btnMenu').addEventListener('click', () => { this.s.menuHidden = true; this.refresh(); });
        $('#fMenu').addEventListener('click', () => { this.s.menuHidden = false; this.refresh(); });
        $('#btnFocus').addEventListener('click', () => this.setFocus(true));
        $('#fExit').addEventListener('click', () => this.setFocus(false));
        $('#fsRow').addEventListener('click', () => { this.openSheet(null); this.setFocus(true); });

        $('#btnSettings').addEventListener('click', () => this.openSheet('sheet'));
        $('#presetChip').addEventListener('click', () => this.openSheet('sheet'));
        $('#btnPractice').addEventListener('click', () => this.openSheet('practice'));
        $$('[data-close]').forEach(b => b.addEventListener('click', () => this.openSheet(null)));
        $('#backdrop').addEventListener('click', () => this.openSheet(null));

        $('#preset').addEventListener('change', e => this.loadPreset(e.target.value));
        $('#presetSave').addEventListener('click', () => this.savePreset());
        $('#presetDel').addEventListener('click', () => this.deletePreset());
        const tin = $('#tuning');
        tin.addEventListener('input', () => this.validateTuning(tin.value));
        tin.addEventListener('change', () => this.commitTuning(tin.value));
        tin.addEventListener('keydown', e => { if (e.key === 'Enter') tin.blur(); });
        const len = $('#scaleLength');
        len.addEventListener('change', () => this.setLength(parseFloat(len.value)));
        $$('[data-step]').forEach(b => b.addEventListener('click', () => this.setLength(this.s.length + parseFloat(b.dataset.step))));
        $$('[data-pos]').forEach(b => b.addEventListener('click', () => this.setPosition(this.s.position + parseInt(b.dataset.pos, 10))));
        $('#posPrev').addEventListener('click', () => this.setPosition(this.s.position - 1));
        $('#posNext').addEventListener('click', () => this.setPosition(this.s.position + 1));
        $('#volume').addEventListener('input', e => {
            this.s.volume = +e.target.value;
            this.audio.setVolume(this.s.volume);
            this.save();
        });
        $('#btnShare').addEventListener('click', () => this.shareLink());

        // Pratique : bourdon
        $('#btnDrone').addEventListener('click', () => {
            if (this.audio.drone) this.audio.stopDrone();
            else this.audio.startDrone(this.droneFreq(), this.s.droneVol);
            this.renderPractice();
        });
        $('#droneRoot').addEventListener('change', e => { this.s.droneRoot = e.target.value; this.save(); this.syncDrone(); });
        $('#droneVol').addEventListener('input', e => {
            this.s.droneVol = +e.target.value;
            this.audio.setDroneVolume(this.s.droneVol);
            this.save();
        });
        // Pratique : métronome
        $('#btnMetro').addEventListener('click', () => {
            if (this.metro.running) this.metro.stop(); else this.metro.start();
            this.renderPractice();
        });
        $('#rhythm').addEventListener('change', e => {
            this.s.rhythm = e.target.value;
            this.metro.setRhythm(this.s.rhythm);
            this.save();
            this.renderPractice();
        });
        $('#bpm').addEventListener('input', e => this.setBpm(+e.target.value));
        $$('[data-bpm]').forEach(b => b.addEventListener('click', () => this.setBpm(this.s.bpm + parseInt(b.dataset.bpm, 10))));
        // Pratique : accordeur
        $('#btnTuner').addEventListener('click', async () => {
            if (this.tuner.running) { this.tuner.stop(); this.onTuner(null, true); }
            else {
                try { await this.tuner.start(); this.onTuner(null, true); }
                catch (err) { $('#tunerInfo').textContent = this.t('tuner_nomic'); }
            }
            this.renderPractice();
        });
        // Pratique : quiz
        $('#quizFind').addEventListener('click', () => this.startQuiz('find'));
        $('#quizName').addEventListener('click', () => this.startQuiz('name'));
        $('#quizSkip').addEventListener('click', () => this.nextQuestion());
        $('#quizEnd').addEventListener('click', () => { this.quiz = null; this.s.mode = 'free'; this.refresh(); });

        document.addEventListener('keydown', e => {
            const typing = /^(INPUT|SELECT|TEXTAREA)$/.test((e.target && e.target.tagName) || '');
            if (e.key === 'Escape') {
                if (this.openId) this.openSheet(null);
                else if (document.body.classList.contains('focus')) this.setFocus(false);
                this.stopEverything();
            } else if (!typing && !this.openId && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
                this.setPosition(this.s.position + (e.key === 'ArrowRight' ? 1 : -1));
            }
        });
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement && this.focusFS) this.setFocus(false);
        });
        // Déverrouillage audio (iOS / Chrome) au premier geste
        ['pointerdown', 'touchend', 'keydown'].forEach(ev =>
            document.addEventListener(ev, () => this.audio.unlock(), { passive: true, capture: true }));
    }

    openSheet(id) {
        this.openId = id;
        ['sheet', 'practice'].forEach(x => {
            const el = $('#' + x), on = x === id;
            el.classList.toggle('open', on);
            el.setAttribute('aria-hidden', String(!on));
        });
        $('#backdrop').hidden = !id;
        if (id === 'sheet') this.validateTuning($('#tuning').value);
        if (id) this.renderPractice();
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
            [...this.allPresets().map(p => [p.key, (p.user ? '★ ' : '') + p.name]), ['custom', '— ' + this.t('custom') + ' —']], s.preset);
        $('#presetDel').hidden = !s.preset.startsWith('u:');

        const tin = $('#tuning');
        if (document.activeElement !== tin) { tin.value = s.tuning; this.validateTuning(tin.value); }
        const len = $('#scaleLength');
        if (document.activeElement !== len) len.value = s.length;
        $('#volume').value = s.volume;
        $('#posValue').textContent = s.position;
        $('#posLabel').innerHTML = `<span class="lbl">${this.t('position')} </span>${s.position}`;
        $('#posPrev').disabled = s.position <= 0;
        $('#posNext').disabled = s.position >= MAX_POS;

        // Ajnas
        const sc = this.scale();
        $('#ajnasChip').hidden = !sc.ajnas;
        const info = $('#ajnasInfo');
        if (this.ajnasOn()) {
            const [lo, up, at] = sc.ajnas;
            info.textContent = `${JINS[lo].name} (${noteText(s.scaleRoot, lang)}) + ${JINS[up].name} (${noteText(s.scaleRoot + at, lang)})`;
            info.hidden = false;
        } else info.hidden = true;
        $('#microFix').hidden = !(s.mode === 'scale' && s.fretMode === 'fretted' && this.scaleHasMicro());

        // Barre d'état
        const preset = this.allPresets().find(p => p.key === s.preset);
        $('#presetName').textContent = preset ? preset.name : this.t('custom');
        $('#tuningMini').textContent = `${formatTuning(this.strings, lang).replace(/,/g, '')} · ${s.length} cm · ${this.t(s.fretMode)}`;
        $('#appVersion').textContent = APP_VERSION ? 'v' + APP_VERSION : '';
        this.renderLegend();
        this.renderDetector();
        this.renderQuiz();
        this.renderPractice();
    }

    renderLegend() {
        const s = this.s, items = [];
        const add = (color, label, ring) => items.push([color, label, ring]);
        if (s.mode === 'chord') { add(COLORS.root.fill, this.t('lg_root')); add(COLORS.chord.fill, this.t('lg_chord')); }
        else if (s.mode === 'scale') {
            const degs = this.scaleDegrees(), has = c => degs.some(d => d.info === c);
            add(COLORS.root.fill, this.t('lg_root'));
            if (this.ajnasOn()) {
                const [lo, up] = this.scale().ajnas;
                add(COLORS.lower.fill, JINS[lo].name);
                add(COLORS.upper.fill, JINS[up].name);
                add('#ffffff', this.t('lg_ghammaz'), true);
            }
            if (has(COLORS.scale)) add(COLORS.scale.fill, this.t('lg_scale'));
            if (this.scaleHasMicro()) add('#e8e8e8', this.t('lg_quarter'), true);
        } else if (s.mode === 'detect') add(COLORS.detect.fill, this.t('lg_selected'));
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

    /* ----- Pratique : bourdon, métronome, accordeur ----- */
    droneFreq() {
        const s = this.s;
        let root = s.droneRoot === 'auto' ? (s.mode === 'chord' ? s.chordRoot : s.scaleRoot) : parseFloat(s.droneRoot);
        if (!isFinite(root)) root = 0;
        const midi = (parseInt(s.droneOct, 10) + 1) * 12 + root;
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    syncDrone() { if (this.audio.drone) this.audio.setDroneFreq(this.droneFreq()); }

    setBpm(v) {
        this.s.bpm = clamp(Math.round(v), 40, 240);
        this.metro.bpm = this.s.bpm;
        this.save();
        this.renderPractice();
    }

    onBeat(i) {
        $$('#beats span').forEach((el, k) => el.classList.toggle('on', k === i));
    }

    renderPractice() {
        const s = this.s, lang = s.lang;
        this.fillSelect($('#droneRoot'),
            [['auto', this.t('drone_follow')], ...Array.from({ length: 24 }, (_, i) => [String(i / 2), noteText(i / 2, lang)])], s.droneRoot);
        const droneOn = !!this.audio.drone;
        $('#btnDrone').textContent = this.t(droneOn ? 'stop_word' : 'start');
        $('#btnDrone').setAttribute('aria-pressed', String(droneOn));
        $('#droneVol').value = s.droneVol;

        this.fillSelect($('#rhythm'), Object.entries(RHYTHMS).map(([k, r]) => [k, r[lang]]), s.rhythm);
        const beats = $('#beats');
        if (beats.dataset.sig !== s.rhythm) {
            beats.innerHTML = '';
            for (const ch of RHYTHMS[s.rhythm].steps) {
                const el = document.createElement('span');
                el.className = ch === '.' ? 'rest' : ch;
                el.textContent = ch === 'D' ? 'D' : ch === 'T' ? 'T' : ch === 'k' ? 't' : ch === 'A' ? '●' : ch === 'c' ? '·' : '';
                beats.appendChild(el);
            }
            beats.dataset.sig = s.rhythm;
        }
        $('#btnMetro').textContent = this.t(this.metro.running ? 'stop_word' : 'start');
        $('#btnMetro').setAttribute('aria-pressed', String(this.metro.running));
        $('#bpm').value = s.bpm;
        $('#bpmLabel').textContent = s.bpm;

        $('#btnTuner').textContent = this.t(this.tuner.running ? 'tuner_stop' : 'tuner_start');
        $('#btnTuner').setAttribute('aria-pressed', String(this.tuner.running));

        $('#btnPractice').classList.toggle('running', droneOn || this.metro.running || this.tuner.running);
    }

    onTuner(freq, reset = false) {
        const note = $('#tunerNote'), needle = $('#tunerNeedle'), info = $('#tunerInfo');
        if (reset) {
            this.tunerHist = [];
            note.textContent = '–';
            needle.classList.remove('on');
            info.textContent = this.tuner.running ? this.t('tuner_listen') : '';
            return;
        }
        if (!freq) {
            if (++this.tunerMiss > 10) { note.textContent = '–'; needle.classList.remove('on'); info.textContent = this.t('tuner_listen'); }
            return;
        }
        this.tunerMiss = 0;
        const m = 69 + 12 * Math.log2(freq / 440);
        this.tunerHist.push(m);
        if (this.tunerHist.length > 5) this.tunerHist.shift();
        const midi = [...this.tunerHist].sort((a, b) => a - b)[Math.floor(this.tunerHist.length / 2)];
        const nearest = Math.round(midi), cents = Math.round((midi - nearest) * 100);
        note.innerHTML = `${NOTES[this.s.lang][mod12(nearest)]}<small>${Math.floor(nearest / 12) - 1}</small>`;
        needle.style.left = (50 + clamp(cents, -50, 50)) + '%';
        needle.classList.add('on');

        // Corde la plus proche de l'accordage courant
        let best = null;
        this.strings.forEach(str => { const d = midi - str.midi; if (!best || Math.abs(d) < Math.abs(best.d)) best = { str, d }; });
        if (best && Math.abs(best.d) <= 1.2) {
            const c = Math.round(best.d * 100);
            const name = NOTES[this.s.lang][mod12(best.str.midi)] + (Math.floor(best.str.midi / 12) - 1);
            info.innerHTML = `${this.t('tuner_string')} <b>${name}</b> : <span class="${Math.abs(c) < 5 ? 'good' : ''}">${c > 0 ? '+' : ''}${c}¢</span>`;
        } else {
            info.textContent = `${freq.toFixed(1)} Hz · ${cents > 0 ? '+' : ''}${cents}¢`;
        }
    }

    /* ----- Lecture automatique (gamme / accord) ----- */
    stopSequence() {
        if (!this.seq) return;
        this.seq.timers.forEach(clearTimeout);
        this.seq.btn.setAttribute('aria-pressed', 'false');
        this.seq = null;
    }

    runSequence(steps, btn) {
        this.stopSequence();
        if (!steps.length) return;
        btn.setAttribute('aria-pressed', 'true');
        const timers = steps.map(st => setTimeout(() => this.playAt(st.i, st.s), st.at));
        timers.push(setTimeout(() => this.stopSequence(), Math.max(...steps.map(s => s.at)) + 700));
        this.seq = { timers, btn };
    }

    // Meilleure position (corde, case) pour une hauteur donnée dans la zone visible
    positionFor(midi, prefer) {
        const g = this.g;
        let best = null, bestScore = Infinity;
        this.strings.forEach((str, i) => {
            const s = midi - str.midi;
            if (s < -1e-6) return;
            const ok = s < 1e-6 ? g.S === 0 : (s > g.S + 1e-6 && s <= g.S + g.F + 1e-6);
            if (!ok) return;
            let score = s - g.S;
            if (i === prefer && s - g.S <= 5.5) score -= 4;
            if (score < bestScore) { bestScore = score; best = { i, s }; }
        });
        return best;
    }

    playScale() {
        if (this.seq) { this.stopSequence(); return; }
        this.audio.unlock();
        const g = this.g, root = this.s.scaleRoot;
        const low = Math.min(...this.strings.map(s => s.midi)) + g.S;
        const base = low + mod12(root - low);
        const ivs = [...this.scale().iv].sort((a, b) => a - b);
        const step = Math.max(110, 30000 / this.s.bpm);
        // strict : toutes les notes doivent être jouables dans la zone visible, sinon null
        const build = (start, strict) => {
            const notes = [...ivs, 12].map(v => start + v);
            const run = notes.concat(notes.slice(0, -1).reverse());
            const steps = [];
            let prev = -1;
            for (const [k, midi] of run.entries()) {
                const pos = this.positionFor(midi, prev);
                if (!pos) { if (strict) return null; continue; }
                prev = pos.i;
                steps.push({ ...pos, at: k * step });
            }
            return steps;
        };
        // Une octave au-dessus de la plus grave (registre plus agréable), sinon l'octave grave
        const steps = build(base + 12, true) || build(base, true) || build(base, false);
        this.runSequence(steps, $('#playScale'));
    }

    playChord() {
        if (this.seq) { this.stopSequence(); return; }
        this.audio.unlock();
        const pcs = this.chordPcs(), S = this.g.S;
        const cands = S === 0 ? [0, 1, 2, 3, 4] : [S + 1, S + 2, S + 3, S + 4];
        const voicing = [];
        for (let i = this.strings.length - 1; i >= 0; i--) {
            const str = this.strings[i];
            const s = cands.find(c => pcs.some(p => near(p, mod12(str.midi + c))));
            if (s !== undefined) voicing.push({ i, s });
        }
        const step = Math.max(110, 30000 / this.s.bpm);
        const steps = voicing.map((v, k) => ({ ...v, at: k * step }));
        const strumAt = voicing.length * step + 350;
        voicing.forEach((v, k) => steps.push({ ...v, at: strumAt + k * 28 }));
        this.runSequence(steps, $('#playChord'));
    }

    /* ----- Quiz ----- */
    startQuiz(type) {
        this.stopSequence();
        this.quiz = { type, ok: 0, ko: 0, target: null, pos: null, choices: [], answered: false };
        this.s.mode = 'quiz';
        this.openSheet(null);
        this.audio.unlock();
        this.nextQuestion();
    }

    nextQuestion() {
        const q = this.quiz;
        if (!q) return;
        const pcs = [...Array(12).keys()].filter(p => !this.s.quizNaturals || IS_NATURAL[p]);
        q.answered = false;
        if (q.type === 'find') {
            let p;
            do { p = pick(pcs); } while (p === q.target && pcs.length > 1);
            q.target = p;
            q.pos = null;
        } else {
            const g = this.g, cands = [];
            this.strings.forEach((str, i) => {
                const frets = g.S === 0 ? [0] : [];
                for (let s = g.S + 1; s <= g.S + g.F; s++) frets.push(s);
                frets.forEach(s => { if (pcs.includes(mod12(str.midi + s))) cands.push({ i, s }); });
            });
            let pos;
            do { pos = pick(cands); } while (cands.length > 1 && q.pos && pos.i === q.pos.i && pos.s === q.pos.s);
            q.pos = pos;
            q.target = mod12(this.strings[pos.i].midi + pos.s);
            const others = shuffle(pcs.filter(p => p !== q.target)).slice(0, 3);
            q.choices = shuffle([q.target, ...others]);
            setTimeout(() => { if (this.quiz === q && q.pos === pos) this.playAt(pos.i, pos.s); }, 250);
        }
        this.refresh();
    }

    renderQuiz() {
        const q = this.quiz, lang = this.s.lang;
        if (!q) return;
        $('#quizQ').textContent = q.type === 'find' ? `${this.t('quiz_find')} ${NOTES[lang][q.target]}` : this.t('quiz_name');
        $('#quizScore').textContent = `✓ ${q.ok}  ✗ ${q.ko}`;
        const box = $('#quizChoices');
        box.innerHTML = '';
        if (q.type !== 'name') return;
        q.choices.forEach(pc => {
            const b = document.createElement('button');
            b.textContent = NOTES[lang][pc];
            b.addEventListener('click', () => this.answerQuiz(pc, b));
            box.appendChild(b);
        });
    }

    answerQuiz(pc, btn) {
        const q = this.quiz;
        if (!q || q.answered) return;
        const good = pc === q.target;
        btn.classList.add(good ? 'ok' : 'ko');
        if (good) {
            q.ok++;
            q.answered = true;
            $('#quizScore').textContent = `✓ ${q.ok}  ✗ ${q.ko}`;
            setTimeout(() => { if (this.quiz === q) this.nextQuestion(); }, 700);
        } else {
            q.ko++;
            $('#quizScore').textContent = `✓ ${q.ok}  ✗ ${q.ko}`;
            if (q.pos) this.playAt(q.pos.i, q.pos.s);
        }
    }

    quizTap(i, p, type) {
        const q = this.quiz;
        if (!q || q.answered) return;
        const pitch = this.pitchAt(i, p.u);
        const pc = mod12(Math.round(pitch.midi));
        const voice = this.audio.play(pitch.freq, this.s.sound, false);
        if (voice) setTimeout(() => voice.release(.3), 900);
        const v = this.vib[i];
        v.amp = 4; v.phase = 0; v.u = pitch.uVib; v.sus = false;
        const good = pc === q.target;
        this.marks.push({ i, u: pitch.uMark, life: 1, held: false, color: good ? '52,211,153' : '242,84,91' });
        this.showBubble(pitch, p, type);
        this.hideBubble(900);
        if (good) {
            q.ok++;
            q.answered = true;
            setTimeout(() => { if (this.quiz === q) this.nextQuestion(); }, 650);
        } else q.ko++;
        $('#quizScore').textContent = `✓ ${q.ok}  ✗ ${q.ko}`;
        this.requestRender();
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

        const S = clamp(s.position | 0, 0, MAX_POS), cmS = posCm(L, S);
        const ppcFor = F => neckLen / (posCm(L, S + F + .6) - cmS);
        let F = parseInt(s.frets, 10);
        if (!F) {
            const minGap = coarse ? 30 : 20;
            F = 12;
            for (const f of [24, 22, 21, 19, 17, 15]) {
                if ((posCm(L, S + f) - posCm(L, S + f - 1)) * ppcFor(f) >= minGap) { F = f; break; }
            }
        }

        const cross = this.strings.map((_, i) => crossStart + sp * ((vertical ? n - 1 - i : i) + .5));
        this.g = { W, H, dpr, vertical, lefty: s.lefty, M, C, head, neckLen, sp, neckW, crossStart, ppc: ppcFor(F), F, S, cmS, cross };

        const pw = Math.round(W * dpr), ph = Math.round(H * dpr);
        for (const cv of [this.canvas, this.base, this.over]) {
            if (cv.width !== pw || cv.height !== ph) { cv.width = pw; cv.height = ph; }
        }
        this.drawBase();
        this.drawOverlay();
        this.requestRender();
    }

    // (u = distance au sillet le long du manche, c = position transversale) -> (x, y). Gaucher = miroir.
    P(u, c) {
        const g = this.g;
        if (g.vertical) return [g.lefty ? g.W - c : c, g.head + u];
        return [g.lefty ? g.W - (g.head + u) : g.head + u, c];
    }
    rectUC(u0, u1, c0, c1) {
        const [x0, y0] = this.P(u0, c0), [x1, y1] = this.P(u1, c1);
        return [Math.min(x0, x1), Math.min(y0, y1), Math.abs(x1 - x0), Math.abs(y1 - y0)];
    }
    uOf(semis) { return (posCm(this.s.length, semis) - this.g.cmS) * this.g.ppc; }
    uMarkFor(s) {
        if (s < 1e-6) return -this.g.head / 2 - 1;
        if (this.s.fretMode === 'fretted' && isWhole(s)) return (this.uOf(s - 1) + this.uOf(s)) / 2;
        return this.uOf(s);
    }

    // Texte sur le côté du manche (A = côté des mesures, B = côté des numéros de case)
    sideText(ctx, txt, u, side) {
        const g = this.g, c0 = g.crossStart, c1 = c0 + g.neckW;
        if (g.vertical) {
            const [x, y] = this.P(u, side === 'A' ? c0 - 7 : c1 + 7);
            const [mx] = this.P(u, c0 + g.neckW / 2);
            ctx.textAlign = x < mx ? 'right' : 'left';
            ctx.fillText(txt, x, y);
        } else {
            const [x, y] = this.P(u, side === 'A' ? c0 - 10 : c1 + 11);
            ctx.textAlign = 'center';
            ctx.fillText(txt, x, y);
        }
    }

    /* ----- Rendu statique : bois, frettes, mesures ----- */
    drawBase() {
        const g = this.g, s = this.s, L = s.length, ctx = this.base.getContext('2d');
        const fretless = s.fretMode === 'fretless';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.base.width, this.base.height);
        ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);

        const c0 = g.crossStart, c1 = c0 + g.neckW, uEnd = g.neckLen, S = g.S;

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
        ctx.fillStyle = 'rgba(255,255,255,.07)';
        ctx.fillRect(...this.rectUC(0, uEnd, c0, c0 + 1.5));
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(...this.rectUC(0, uEnd, c1 - 2, c1));
        ctx.restore();

        // Frettes (manche fretté uniquement : un manche fretless est lisse, comme un oud)
        const zoneMid = n => (this.uOf(n - 1) + this.uOf(n)) / 2;
        for (let n = S + 1; n <= S + g.F + 1 && !fretless; n++) {
            const u = this.uOf(n);
            if (u > uEnd - 2) break;
            ctx.fillStyle = 'rgba(0,0,0,.4)';
            ctx.fillRect(...this.rectUC(u + 1.2, u + 3.2, c0, c1));
            ctx.fillStyle = '#8f9298';
            ctx.fillRect(...this.rectUC(u - 1.6, u + 1.6, c0, c1));
            ctx.fillStyle = '#eef0f3';
            ctx.fillRect(...this.rectUC(u - .7, u + .3, c0, c1));
        }
        for (const n of INLAYS) {
            if (n <= S || n > S + g.F || this.uOf(n) > uEnd) continue;
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

        // Sillet (ou bord de la position choisie)
        const [nx, ny, nw, nh] = this.rectUC(-6, 0, c0 - 2, c1 + 2);
        if (S === 0) {
            const [bx0, by0] = this.P(-6, 0), [bx1, by1] = this.P(0, 0);
            const bone = ctx.createLinearGradient(bx0, by0, bx1, by1);
            bone.addColorStop(0, '#cfc6b2'); bone.addColorStop(1, '#f3ecdc');
            ctx.fillStyle = bone;
        } else {
            ctx.fillStyle = 'rgba(228,181,90,.55)';
        }
        roundRect(ctx, nx, ny, nw, nh, 1.5);
        ctx.fill();

        // Mesures (cm depuis le sillet)
        ctx.textBaseline = 'middle';
        if (s.showMeasures) {
            ctx.font = `600 10px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`;
            ctx.fillStyle = 'rgba(228,181,90,.9)';
            let last = -1e9;
            for (let n = S + 1; n <= S + g.F; n++) {
                const u = this.uOf(n);
                if (u > uEnd - 2) break;
                const txt = posCm(L, n).toFixed(2);
                const need = g.vertical ? 13 : ctx.measureText(txt).width + 6;
                if (u - last < need) continue;
                last = u;
                this.sideText(ctx, txt, u, 'A');
            }
            ctx.fillStyle = 'rgba(228,181,90,.55)';
            this.sideText(ctx, 'cm', -14, 'A');
        }

        // Numéros de case
        ctx.font = `600 10px ${FONT}`;
        ctx.fillStyle = 'rgba(200,202,210,.55)';
        for (const n of INLAYS) {
            if (n <= S || n > S + g.F) continue;
            const u = fretless ? this.uOf(n) : zoneMid(n);
            if (u > uEnd) continue;
            this.sideText(ctx, String(n), u, 'B');
        }
        if (S > 0) {
            ctx.font = `800 11px ${FONT}`;
            ctx.fillStyle = '#e4b55a';
            this.sideText(ctx, String(S), 0, 'B');
        }
    }

    /* ----- Rendu statique : points de notes ----- */
    drawOverlay() {
        const g = this.g, s = this.s, ctx = this.over.getContext('2d');
        const fretless = s.fretMode === 'fretless', S = g.S, top = S + g.F + 1e-6;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, this.over.width, this.over.height);
        ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);

        const dotAt = (i, k, info, pc) => {
            const c = g.cross[i], whole = isWhole(k);
            let u, r;
            if (!fretless && whole) {
                u = (this.uOf(k - 1) + this.uOf(k)) / 2;
                r = Math.min(g.sp * .36, (this.uOf(k) - this.uOf(k - 1)) * .44, 15);
            } else {
                u = this.uOf(k);
                r = Math.min(g.sp * .36, (this.uOf(k + .5) - this.uOf(k - .5)) * .44, 15);
                if (!whole && !fretless) r *= .85;
            }
            if (u > g.neckLen - 4) return;
            this.drawDot(ctx, u, c, Math.max(r, 5.5), info, pc, !whole, !whole && !fretless);
        };

        if (s.mode === 'scale') {
            // Chaque degré de la gamme, à sa hauteur exacte (quarts de ton, commas…)
            const degs = this.scaleDegrees();
            this.strings.forEach((str, i) => degs.forEach(d => {
                for (let k = mod12(d.pc - str.midi); k <= top; k += 12) if (k > S + 1e-6) dotAt(i, k, d.info, d.pc);
            }));
        } else if (s.mode === 'quiz') {
            const q = this.quiz;
            if (q && q.type === 'name' && q.pos && q.pos.s > 0) dotAt(q.pos.i, q.pos.s, COLORS.quiz, null);
        } else {
            const micro = s.mode === 'detect' && [...this.detected].some(v => !Number.isInteger(v));
            this.strings.forEach((str, i) => {
                for (let k = S + .5; k <= top; k += .5) {
                    if (!Number.isInteger(k) && !micro) continue;
                    const pc = mod12(str.midi + k), info = this.classify(pc);
                    if (info) dotAt(i, k, info, pc);
                }
            });
        }

        // Cordes à vide (dans la tête)
        this.strings.forEach((str, i) => {
            const pc = mod12(str.midi);
            const q = this.quiz;
            const quizOpen = s.mode === 'quiz' && q && q.type === 'name' && q.pos && q.pos.s === 0 && q.pos.i === i;
            const info = quizOpen ? COLORS.quiz : this.classify(pc);
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
            const label = quizOpen ? '?' : NOTES[s.lang][pc] + (Math.floor(str.midi / 12) - 1);
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
            // Micro-intervalle non jouable sur un manche fretté
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
                ctx.lineWidth = info === COLORS.ghammaz ? 2.5 : 2;
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

        if (pc === null) { this.fitText(ctx, '?', x, y, r, textColor, 800); return; }
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
            const r = g.sp * .46, a = Math.max(0, m.life), rgb = m.color || '255,214,120';
            const glow = ctx.createRadialGradient(x, y, 0, x, y, r * 1.4);
            glow.addColorStop(0, `rgba(${rgb},${.5 * a})`);
            glow.addColorStop(1, `rgba(${rgb},0)`);
            ctx.fillStyle = glow;
            ctx.beginPath(); ctx.arc(x, y, r * 1.4, 0, TAU); ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = m.color ? `rgba(${rgb},${.95 * a})` : `rgba(255,236,190,${.85 * a})`;
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
        if (g.vertical) return { x, y, u: y - g.head, c: g.lefty ? g.W - x : x };
        return { x, y, u: (g.lefty ? g.W - x : x) - g.head, c: y };
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
            const d = Math.min(u / g.ppc + g.cmS, L * .94);
            const exact = 12 * Math.log2(L / (L - d));
            if (this.s.fretMode === 'fretted') {
                semis = Math.max(g.S + 1, Math.ceil(exact - 1e-9));
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
        if (this.s.mode === 'quiz' && this.quiz && this.quiz.type === 'find') {
            if (i >= 0) this.quizTap(i, p, e.pointerType);
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
            if (e.pointerType === 'mouse' && this.s.mode !== 'detect' && this.s.mode !== 'quiz') {
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

    // Joue la corde i à la case s (lecture automatique, quiz)
    playAt(i, s) {
        const str = this.strings[i];
        if (!str || !this.g) return;
        const prev = this.voiceByString[i];
        if (prev) prev.release(.05);
        this.voiceByString[i] = this.audio.play(str.freq * Math.pow(2, s / 12), this.s.sound, false);
        const v = this.vib[i];
        v.amp = Math.min(7, this.g.sp * .12 + 2);
        v.phase = 0;
        v.u = s < 1e-6 ? 0 : this.uOf(s);
        v.sus = false;
        this.marks.push({ i, u: this.uMarkFor(s), life: 1, held: false });
        this.requestRender();
    }

    toggleDetect(i, p, type) {
        const pitch = this.pitchAt(i, p.u);
        const snapped = snapQ(pitch.midi);
        const pc = mod12(snapped);
        const freq = this.strings[i].freq * Math.pow(2, (snapped - this.strings[i].midi) / 12);
        const existing = [...this.detected].find(v => near(v, pc));
        if (existing !== undefined) this.detected.delete(existing);
        else {
            this.detected.add(pc);
            const voice = this.audio.play(freq, this.s.sound, false);
            if (voice) setTimeout(() => voice.release(.25), 450);
            const v = this.vib[i];
            v.amp = 4; v.phase = 0; v.u = pitch.uVib; v.sus = false;
        }
        this.marks.push({ i, u: pitch.uMark, life: .9, held: false });
        this.showBubble({ ...pitch, midi: snapped, freq }, p, type);
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

    // Bouton STOP / Échap : notes, lecture auto, bourdon et métronome
    stopEverything() {
        this.stopSequence();
        this.stop();
        this.audio.stopDrone();
        if (this.metro.running) this.metro.stop();
        this.renderPractice();
    }
}

window.app = new App();

/* ---------- 6. APPLICATION INSTALLABLE (PWA) ---------- */
// Le service worker n'est disponible qu'en HTTPS (ou sur localhost)
if ('serviceWorker' in navigator && window.isSecureContext) {
    // Un nouveau service worker qui prend la main = une nouvelle version est prête
    const hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (hadController) $('#updateToast').hidden = false;
    });
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(reg => {
            // Une appli installée reste souvent ouverte en arrière-plan : on vérifie à chaque retour
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'visible') reg.update().catch(() => {});
            });
        }).catch(() => {});
    });
}
$('#btnUpdate').addEventListener('click', () => location.reload());

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
