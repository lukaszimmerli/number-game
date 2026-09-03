import React, { useState, useEffect, useRef } from 'react';
import { Volume2, ArrowRight, Check, X, RefreshCw, Headphones, BookOpen, Eye, Gamepad2, Hash } from 'lucide-react';

export default function App() {
  const [mode, setMode] = useState('learn'); // 'learn', 'quiz', 'game' or 'browse'
  const [currentNumber, setCurrentNumber] = useState(0);
  const [inputValue, setInputValue] = useState('');
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState(null); // 'correct', 'incorrect', 'revealed', null
  const [range, setRange] = useState({ min: 0, max: 100 });

  const [isPlaying, setIsPlaying] = useState(false);

  // Spiel-Modus
  const [gameOptions, setGameOptions] = useState([]);
  const [gameScore, setGameScore] = useState(0);

  const inputRef = useRef(null);
  const danishVoiceRef = useRef(null);
  const currentAudioRef = useRef(null);

  // Helper to convert number to Danish text
  const getDanishWord = (n) => {
    const units = ["nul", "en", "to", "tre", "fire", "fem", "seks", "syv", "otte", "ni", "ti", "elleve", "tolv", "tretten", "fjorten", "femten", "seksten", "sytten", "atten", "nitten"];
    const tens = ["", "", "tyve", "tredive", "fyrre", "halvtreds", "tres", "halvfjerds", "firs", "halvfems"];

    if (n < 20) return units[n];
    if (n === 100) return "hundrede";

    const unit = n % 10;
    const ten = Math.floor(n / 10);

    if (unit === 0) return tens[ten];
    return `${units[unit]}og${tens[ten]}`; // z. B. enogtyve (1 und 20)
  };

  // Dänische Systemstimme suchen (Stimmen laden asynchron)
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const pick = () => {
      const voices = window.speechSynthesis.getVoices();
      if (!voices.length) return;
      const da = voices.find(v => v.lang === 'da-DK')
        || voices.find(v => (v.lang || '').replace('_', '-').toLowerCase().startsWith('da'));
      danishVoiceRef.current = da || null;
    };
    pick();
    window.speechSynthesis.addEventListener('voiceschanged', pick);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pick);
      window.speechSynthesis.cancel();
    };
  }, []);

  const speakWithBrowser = (text) => {
    if (!('speechSynthesis' in window)) {
      setIsPlaying(false);
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'da-DK';
    if (danishVoiceRef.current) utterance.voice = danishVoiceRef.current;
    utterance.rate = 0.85;
    utterance.onend = () => setIsPlaying(false);
    utterance.onerror = () => setIsPlaying(false);
    // Notbremse, falls onend nie feuert
    setTimeout(() => setIsPlaying(false), Math.max(2500, text.length * 180));
    window.speechSynthesis.speak(utterance);
  };

  // Gratis: der öffentliche Endpunkt hinter dem Audio-Knopf von Google Übersetzer.
  // Kein Key, kein Kontingent — liefert eine echte dänische Stimme.
  // WICHTIG: Google antwortet mit 404, sobald die Anfrage einen Referer-Header trägt.
  // Das <meta name="referrer" content="no-referrer"> in index.html unterdrückt ihn —
  // ohne dieses Tag fällt der Player still auf die Systemstimme zurück.
  const speakWithTranslate = async (text) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=da&q=${encodeURIComponent(text)}`;
    const audio = new Audio(url);
    currentAudioRef.current = audio;
    audio.onended = () => setIsPlaying(false);
    // Schlägt das Laden fehl (404/Adblocker), lehnt play() ab -> nächste Stufe
    await audio.play();
  };

  // Laufende Wiedergabe abbrechen, damit "Weiter" sofort die neue Zahl spielt
  const stopAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  // Play audio for a specific number
  const playAudio = async (num = currentNumber) => {
    stopAudio();
    const textToSpeak = getDanishWord(num);
    if (!textToSpeak) return;
    setIsPlaying(true);

    // Normalfall: gratis über Google Übersetzer
    try {
      await speakWithTranslate(textToSpeak);
      return;
    } catch (e) {
      console.warn('Gratis-Endpunkt nicht verfügbar, nutze Systemstimme:', e.message);
    }

    // Notfall: Systemstimme
    speakWithBrowser(textToSpeak);
  };

  // Generate a new random number based on range
  const generateNewNumber = (autoPlay = false) => {
    const newNum = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    setCurrentNumber(newNum);
    setInputValue('');
    setFeedback(null);
    if (autoPlay) {
      setTimeout(() => playAudio(newNum), 300);
    }
  };

  // Alle Zahlen des Bereichs für die Übersicht
  const allNumbers = Array.from(
    { length: range.max - range.min + 1 },
    (_, i) => range.min + i
  );

  // Übersicht: Zahl antippen -> auswählen und sofort abspielen
  const selectNumber = (n) => {
    setCurrentNumber(n);
    playAudio(n);
  };

  // Neue Spielrunde: eine Zahl plus drei Ablenker
  const setupGameRound = () => {
    const correctNum = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
    setCurrentNumber(correctNum);
    setFeedback(null);

    const options = [correctNum];
    while (options.length < 4) {
      const rand = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
      if (!options.includes(rand)) options.push(rand);
    }
    setGameOptions(options.sort(() => Math.random() - 0.5));
    setTimeout(() => playAudio(correctNum), 300);
  };

  const handleGameGuess = (selectedNum) => {
    if (feedback) return;
    if (selectedNum === currentNumber) {
      setFeedback('correct');
      setGameScore(s => s + 10);
    } else {
      setFeedback('incorrect');
    }
    setTimeout(() => setupGameRound(), 1200);
  };

  const handleReveal = () => {
    setFeedback('revealed');
    setInputValue(currentNumber.toString());
    setStreak(0);
  };

  const handleQuizSubmit = () => {
    if (!inputValue || feedback === 'revealed') return;

    const guess = parseInt(inputValue, 10);
    if (guess === currentNumber) {
      setFeedback('correct');
      setStreak(s => s + 1);
      setTimeout(() => generateNewNumber(true), 1000);
    } else {
      setFeedback('incorrect');
      setStreak(0);
      setTimeout(() => {
        setFeedback(null);
        setInputValue('');
        inputRef.current?.focus();
      }, 1200);
    }
  };

  useEffect(() => {
    if (mode === 'game') {
      setupGameRound();
    } else if (mode === 'browse') {
      // Auswahl aus dem vorherigen Modus behalten, nichts automatisch abspielen
      setFeedback(null);
    } else {
      generateNewNumber(mode === 'quiz');
      if (mode === 'quiz') {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [mode]);


  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans flex flex-col items-center justify-center p-4">

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-100">

        {/* Header Tabs */}
        <div className="flex bg-slate-100 p-2 gap-2">
          <button
            onClick={() => setMode('learn')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-semibold text-sm transition-all ${mode === 'learn' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <BookOpen size={18} /> Lernen
          </button>
          <button
            onClick={() => setMode('quiz')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-semibold text-sm transition-all ${mode === 'quiz' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Headphones size={18} /> Quiz
          </button>
          <button
            onClick={() => setMode('game')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-semibold text-sm transition-all ${mode === 'game' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Gamepad2 size={18} /> Spiel
          </button>
          <button
            onClick={() => setMode('browse')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-2xl font-semibold text-sm transition-all ${mode === 'browse' ? 'bg-white shadow-sm text-red-600' : 'text-slate-500 hover:bg-slate-200'}`}
          >
            <Hash size={18} /> Zahlen
          </button>
        </div>

        {/* Content Area */}
        <div className="px-6 pt-8 pb-6">

          {/* LERN-MODUS */}
          {mode === 'learn' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">
              <div className="text-center mb-8 w-full">
                <span className="block text-[38vw] sm:text-[200px] leading-[0.8] font-bold text-slate-900 tracking-[-0.06em] tabular-nums">
                  {currentNumber}
                </span>
                <p className="text-3xl sm:text-4xl font-medium text-red-600 mt-6 capitalize break-words">
                  {getDanishWord(currentNumber)}
                </p>
              </div>

              <div className="flex gap-4 w-full">
                <button
                  onClick={() => playAudio()}
                  disabled={isPlaying}
                  className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-bold transition-colors active:scale-95 ${
                    isPlaying ? 'bg-red-100 text-red-400' : 'bg-red-50 text-red-600 hover:bg-red-100'
                  }`}
                >
                  <Volume2 size={24} className={isPlaying ? 'animate-pulse' : ''} />
                  {isPlaying ? 'Spielt...' : 'Anhören'}
                </button>
                <button
                  onClick={() => generateNewNumber(true)}
                  className="flex-1 flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-colors active:scale-95"
                >
                  Weiter <ArrowRight size={20} />
                </button>
              </div>
            </div>
          )}

          {/* QUIZ-MODUS */}
          {mode === 'quiz' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">

              <div className="flex justify-between w-full mb-6 items-center">
                <span className="text-slate-500 font-medium">Tippe, was du hörst</span>
                <span className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                  🔥 Serie: {streak}
                </span>
              </div>

              <button
                onClick={() => playAudio()}
                disabled={isPlaying}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-red-200 transition-all mb-8 text-white ${
                  isPlaying ? 'bg-red-400 scale-95' : 'bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95'
                }`}
              >
                <Volume2 size={40} className={isPlaying ? 'animate-pulse' : ''} />
              </button>

              <div className="w-full relative">
                <input
                  ref={inputRef}
                  // type="text" statt "number": keine Spinner-Pfeile im Feld.
                  // inputMode/pattern halten den Ziffernblock auf Mobilgeräten,
                  // der Filter im onChange ersetzt die wegfallende Zahlenprüfung.
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value.replace(/\D/g, ''))}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleQuizSubmit(); }}
                  placeholder="Ziffern eingeben..."
                  className={`w-full text-center text-4xl font-bold py-4 rounded-2xl border-2 outline-none transition-colors ${
                    feedback === 'correct' ? 'border-green-400 bg-green-50 text-green-700' :
                    feedback === 'incorrect' ? 'border-red-400 bg-red-50 text-red-700' :
                    feedback === 'revealed' ? 'border-amber-400 bg-amber-50 text-amber-700' :
                    'border-slate-200 focus:border-red-500'
                  }`}
                  disabled={feedback === 'correct' || feedback === 'revealed'}
                />

                {feedback === 'correct' && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-green-500">
                    <Check size={32} strokeWidth={3} />
                  </div>
                )}
                {feedback === 'incorrect' && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-red-500">
                    <X size={32} strokeWidth={3} />
                  </div>
                )}
              </div>

              {feedback === 'revealed' && (
                <p className="text-amber-600 font-semibold mt-3 animate-in fade-in">
                  Geschrieben: <span className="capitalize">{getDanishWord(currentNumber)}</span>
                </p>
              )}

              <div className="flex gap-2 w-full mt-6">
                <button
                  onClick={() => playAudio()}
                  type="button"
                  className="flex-1 py-3 text-slate-600 bg-slate-100 font-medium hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  <RefreshCw size={16} /> Nochmals
                </button>

                {feedback !== 'revealed' ? (
                  <button
                    onClick={handleReveal}
                    type="button"
                    className="flex-1 py-3 text-amber-700 bg-amber-50 font-medium hover:bg-amber-100 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm"
                  >
                    <Eye size={16} /> Aufdecken
                  </button>
                ) : (
                  <button
                    onClick={() => generateNewNumber(true)}
                    type="button"
                    className="flex-1 py-3 text-white bg-slate-900 font-medium hover:bg-slate-800 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm"
                  >
                    Weiter <ArrowRight size={16} />
                  </button>
                )}

                <button
                  onClick={() => generateNewNumber(true)}
                  type="button"
                  className="py-3 px-4 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm"
                >
                  Überspringen
                </button>
              </div>
            </div>
          )}

          {/* SPIEL-MODUS */}
          {mode === 'game' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">

              <div className="flex justify-between w-full mb-6 items-center">
                <span className="text-slate-500 font-medium">Welche Zahl hörst du?</span>
                <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold text-sm flex items-center gap-1">
                  ⭐ Punkte: {gameScore}
                </span>
              </div>

              <button
                onClick={() => playAudio()}
                disabled={isPlaying}
                className={`w-24 h-24 rounded-full flex items-center justify-center shadow-lg shadow-red-200 transition-all mb-8 text-white ${
                  isPlaying ? 'bg-red-400 scale-95' : 'bg-red-600 hover:bg-red-700 hover:scale-105 active:scale-95'
                }`}
              >
                <Volume2 size={40} className={isPlaying ? 'animate-pulse' : ''} />
              </button>

              <div className="grid grid-cols-2 gap-3 w-full">
                {gameOptions.map((opt) => {
                  let btnStyle = 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100';
                  if (feedback) {
                    if (opt === currentNumber) {
                      btnStyle = 'bg-green-50 border-green-400 text-green-700';
                    } else {
                      btnStyle = 'bg-slate-50 border-slate-200 text-slate-400 opacity-50';
                    }
                  }
                  return (
                    <button
                      key={opt}
                      onClick={() => handleGameGuess(opt)}
                      disabled={feedback !== null}
                      className={`py-5 text-3xl font-bold rounded-2xl border-2 transition-colors active:scale-95 ${btnStyle}`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>

              <div className="h-8 flex items-center mt-3">
                {feedback && (
                  <p className={`font-semibold animate-in fade-in ${feedback === 'correct' ? 'text-green-600' : 'text-red-500'}`}>
                    <span className="capitalize">{getDanishWord(currentNumber)}</span>
                  </p>
                )}
              </div>

              <div className="flex gap-2 w-full mt-3">
                <button
                  onClick={() => playAudio()}
                  type="button"
                  className="flex-1 py-3 text-slate-600 bg-slate-100 font-medium hover:bg-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5 text-sm"
                >
                  <RefreshCw size={16} /> Erneut abspielen
                </button>

                <button
                  onClick={() => setupGameRound()}
                  type="button"
                  className="py-3 px-4 text-slate-500 font-medium hover:bg-slate-100 rounded-xl transition-colors text-sm"
                >
                  Überspringen
                </button>
              </div>
            </div>
          )}

          {/* ZAHLEN-ÜBERSICHT: Zahl auswählen und anhören */}
          {mode === 'browse' && (
            <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300">

              <div className="flex justify-between w-full mb-4 items-center">
                <span className="text-slate-500 font-medium">Zahl antippen zum Anhören</span>
                <button
                  onClick={() => playAudio()}
                  type="button"
                  className="text-red-600 hover:bg-red-50 rounded-full p-2 transition-colors"
                  aria-label="Erneut abspielen"
                >
                  <Volume2 size={20} className={isPlaying ? 'animate-pulse' : ''} />
                </button>
              </div>

              <div className="text-center mb-5">
                <span className="block text-7xl font-bold text-slate-900 tracking-tighter tabular-nums leading-none">
                  {currentNumber}
                </span>
                <p className="text-2xl font-medium text-red-600 mt-2 capitalize break-words">
                  {getDanishWord(currentNumber)}
                </p>
              </div>

              <div className="grid grid-cols-6 gap-2 w-full max-h-60 overflow-y-auto pr-1">
                {allNumbers.map((n) => (
                  <button
                    key={n}
                    onClick={() => selectNumber(n)}
                    className={`py-2.5 text-base font-bold rounded-xl border-2 tabular-nums transition-colors active:scale-95 ${
                      n === currentNumber
                        ? 'bg-red-600 border-red-600 text-white'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
