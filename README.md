Ultimate Fretboard v3 ( https://lebluesman.github.io/Instrument/ )

A web-based interactive fretboard, practice tool and luthier helper for the Oud, Guitar, Bass and Violin — with full support for Arabic maqams, ajnas and Turkish makams (quarter tones and commas).

It works on desktop, phone and tablet, and can be installed as an app (Android: "Install app", iPhone: Share → "Add to Home Screen"). It also works offline once installed.

Previous versions are still available: v2 at https://lebluesman.github.io/Instrument/v2/ and v1 at https://lebluesman.github.io/Instrument/old/

Key Features:

Playable neck: tap, slide (glissando) and strum with several fingers. Fretless necks (oud, violin) play any pitch, quarter tones included; fretted necks snap to the frets.

Automatic layout: vertical neck on a phone held upright, horizontal on desktop or in landscape. Choose the visible frets and the starting position, left-handed mode, full screen, or hide the menu with the logo.

Scales & Maqams: Western scales, 17 Arabic maqams (Rast, Bayati, Hijaz, Saba, Sikah, Huzam, Iraq, Nakriz, Nawa Athar, Suznak…), Turkish makams in 53-TET commas, and Algerian Andalusian modes.

Ajnas view: each maqam shows its lower and upper jins in different colors, with the ghammaz (pivot note) highlighted.

Play button: hear the scale up and down, or the chord as an arpeggio then a strum, with the notes lighting up on the neck.

Scale detector: tap notes and get every scale / maqam containing them (identical scales are grouped).

Chords: major, minor, 7, maj7, m7, m7♭5, dim, aug, sus2, sus4.

Practice panel:
- Drone: root + fifth held continuously to practise intonation.
- Metronome with oriental rhythms: Maqsum, Baladi, Saidi, Wahda, Ayyub, Malfuf, Masmoudi, Samai thaqil.
- Tuner using the microphone, showing the note, the cents and the nearest string of the current tuning.
- Quiz: find a note on the neck, or name a highlighted note.

Sound: plucked-string synthesis (Karplus-Strong) for oud, guitar and electric guitar, plus violin and synth voices, reverb and infinite sustain. No audio samples.

Luthier tools: any tuning, scale length in cm and fret positions measured from the nut.

Presets: 10 built-in instruments (Arabic, Turkish, Iraqi, Greek, Maghreb… ouds, guitar, bass, violin) and your own saved presets.

Share: create a link that opens the app with the same tuning, maqam and settings.

Bilingual: English and French.

Tech Stack:

Vanilla JavaScript (ES6+)

HTML5 Canvas (layered rendering engine)

Web Audio API (Karplus-Strong synthesis, drone, metronome, microphone pitch detection)

Progressive Web App (manifest + service worker)

No external frameworks or libraries.
