/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { Undo2, RotateCcw, Plus, ChevronLeft } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { BallResult, MatchState, BallType } from './types';

export default function App() {
  const [view, setView] = useState<'intro' | 'setup' | 'scoring'>('intro');
  const [showCommentary, setShowCommentary] = useState(false);
  const [totalOvers, setTotalOvers] = useState<number>(5);
  const [totalWickets, setTotalWickets] = useState<number>(10);
  const [team1Name, setTeam1Name] = useState<string>('Team 1');
  const [team2Name, setTeam2Name] = useState<string>('Team 2');
  const [battingFirst, setBattingFirst] = useState<1 | 2>(1);
  const [lastFinishedInnings, setLastFinishedInnings] = useState<number>(0);
  const [match, setMatch] = useState<MatchState>({
    team1Name: 'Team 1',
    team2Name: 'Team 2',
    totalOvers: 5,
    totalWickets: 10,
    innings: 1,
    firstInningsScore: null,
    runs: 0,
    wickets: 0,
    balls: 0,
    history: [],
  });

  const getBallCommentary = (ball: BallResult) => {
    if (ball.type === 'wicket') {
      return ball.runs > 0 ? `OUT! Run out after scoring ${ball.runs} runs.` : "OUT! The batsman has to go.";
    }
    if (ball.type === 'wide') return "WIDE! Extra run for the batting side.";
    if (ball.type === 'noball') return "NO BALL! One run and a free hit!";
    
    if (ball.runs === 6) return "SIX! Massive hit, that's gone all the way!";
    if (ball.runs === 4) return "FOUR! Cracking shot through the gap.";
    if (ball.runs === 0) return "Dot ball. Solid defense.";
    return `${ball.runs} run${ball.runs > 1 ? 's' : ''} taken. Good rotation of strike.`;
  };

  const startMatch = () => {
    const t1 = team1Name || 'Team 1';
    const t2 = team2Name || 'Team 2';
    
    setMatch({
      team1Name: battingFirst === 1 ? t1 : t2,
      team2Name: battingFirst === 1 ? t2 : t1,
      totalOvers,
      totalWickets,
      innings: 1,
      firstInningsScore: null,
      runs: 0,
      wickets: 0,
      balls: 0,
      history: [],
    });
    setView('scoring');
  };

  const startSecondInnings = () => {
    setMatch((prev) => ({
      ...prev,
      innings: 2,
      firstInningsScore: prev.runs,
      runs: 0,
      wickets: 0,
      balls: 0,
      history: [],
    }));
  };

  const [showEvent, setShowEvent] = useState<{ text: string; color: string } | null>(null);
  const [wicketSelection, setWicketSelection] = useState<'type' | 'runs' | null>(null);

  const playSound = (type: BallType | number) => {
    try {
      // Additional Sound Effects
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const now = ctx.currentTime;

      const playTone = (freq: number, duration: number, vol: number, type: OscillatorType = 'sine') => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + duration);
        osc.start(now);
        osc.stop(now + duration);
      };

      if (type === 'wicket') {
        playTone(440, 0.5, 0.2, 'sawtooth');
        setTimeout(() => playTone(220, 0.5, 0.2, 'sawtooth'), 100);
      } else if (type === 4) {
        // Celebration for 4
        playTone(660, 0.3, 0.1);
        setTimeout(() => playTone(880, 0.3, 0.1), 100);
        setTimeout(() => playTone(1100, 0.4, 0.1), 200);
      } else if (type === 6) {
        // Big celebration for 6
        playTone(880, 0.3, 0.1);
        setTimeout(() => playTone(1100, 0.3, 0.1), 100);
        setTimeout(() => playTone(1320, 0.3, 0.1), 200);
        setTimeout(() => playTone(1760, 0.5, 0.1), 300);
      } else if (type === 'wide' || type === 'noball') {
        playTone(330, 0.1, 0.05, 'square');
      } else {
        // Subtle feedback for others
        playTone(440 + (typeof type === 'number' ? type * 50 : 0), 0.1, 0.03);
      }
    } catch (e) {
      console.error('Audio error', e);
    }
  };

  const triggerEvent = (text: string, color: string) => {
    setShowEvent({ text, color });
    setTimeout(() => setShowEvent(null), 1200);
  };

  const speak = (text: string, rate: number = 1.1) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  const announceSummary = () => {
    const currentTeam = match.innings === 1 ? match.team1Name : match.team2Name;
    const overs = `${Math.floor(match.balls / 6)}.${match.balls % 6}`;
    const summary = `${currentTeam} scored ${match.runs} runs for ${match.wickets} wickets in ${overs} overs.`;
    
    if (match.innings === 1) {
      speak(summary + " End of first innings.");
    } else {
      let winnerText = "";
      if (match.firstInningsScore !== null) {
        if (match.runs > match.firstInningsScore) {
          winnerText = `${match.team2Name} won the match!`;
        } else if (match.runs < match.firstInningsScore) {
          winnerText = `${match.team1Name} won the match!`;
        } else {
          winnerText = "The match is a tie!";
        }
      }
      speak(summary + " " + winnerText);
    }
  };

  const addBall = (result: BallResult) => {
    // Trigger Sound
    if (result.type === 'wicket') {
      playSound('wicket');
      triggerEvent('WICKET!', 'bg-rose-500');
    } else if (result.runs === 4 && !result.isExtra) {
      playSound(4);
      triggerEvent('FOUR!', 'bg-slate-900');
    } else if (result.runs === 6 && !result.isExtra) {
      playSound(6);
      triggerEvent('SIX!', 'bg-slate-900');
    } else if (result.type === 'wide') {
      playSound('wide');
    } else if (result.type === 'noball') {
      playSound('noball');
    } else {
      playSound(result.runs);
    }

    // Voice Announcement
    const type = result.type;
    const runs = result.runs;
    let speechText = '';

    if (type === 'wicket') {
      speechText = runs > 0 ? `Wicket and ${runs} runs` : 'Wicket';
    } else if (type === 'wide') {
      speechText = 'Wide';
    } else if (type === 'noball') {
      speechText = 'No ball';
    } else if (runs === 0) {
      speechText = 'Dot ball';
    } else if (runs === 1) {
      speechText = 'One';
    } else if (runs === 2) {
      speechText = 'Two';
    } else if (runs === 3) {
      speechText = 'Three';
    } else if (runs === 4) {
      speechText = 'Four';
    } else if (runs === 6) {
      speechText = 'Sixer. Out of the match';
    }

    if (speechText) {
      speak(speechText, runs === 6 ? 0.8 : 1.1);
    }

    setMatch((prev) => ({
      ...prev,
      runs: prev.runs + result.runs,
      wickets: prev.wickets + (result.type === 'wicket' ? 1 : 0),
      balls: prev.balls + (result.type === 'legal' || result.type === 'wicket' ? 1 : 0),
      history: [...prev.history, result],
    }));
  };

  const undoLastBall = () => {
    if (match.history.length === 0) return;
    const last = match.history[match.history.length - 1];
    setMatch((prev) => ({
      ...prev,
      runs: prev.runs - last.runs,
      wickets: prev.wickets - (last.type === 'wicket' ? 1 : 0),
      balls: prev.balls - (last.type === 'legal' || last.type === 'wicket' ? 1 : 0),
      history: prev.history.slice(0, -1),
    }));
  };

  const isMatchFinished = useMemo(() => {
    if (match.innings === 1) {
      return match.balls >= totalOvers * 6 || match.wickets >= totalWickets;
    } else {
      // Second innings: target reached or all out/overs finished
      const targetReached = match.firstInningsScore !== null && match.runs > match.firstInningsScore;
      return targetReached || match.balls >= totalOvers * 6 || match.wickets >= totalWickets;
    }
  }, [match, totalOvers, totalWickets]);

  // Announce summary when innings/match finishes
  useEffect(() => {
    if (isMatchFinished && lastFinishedInnings !== match.innings) {
      setLastFinishedInnings(match.innings);
      announceSummary();
    }
  }, [isMatchFinished, lastFinishedInnings, match.innings]);

  const resetMatch = () => {
    setView('intro');
    setMatch({
      team1Name: 'Team 1',
      team2Name: 'Team 2',
      totalOvers: 5,
      totalWickets: 10,
      innings: 1,
      firstInningsScore: null,
      runs: 0,
      wickets: 0,
      balls: 0,
      history: [],
    });
  };

  const currentOverBalls = useMemo(() => {
    const totalLegalBalls = match.balls;
    // If we are at exactly 6, 12, etc. balls, we might be at the start of a new over
    // or just finished the previous one. 
    // We want to show the current active over.
    const completedOvers = Math.floor(totalLegalBalls / 6);
    
    // If the over is exactly finished (e.g. 6, 12 balls) and match is not finished,
    // we show the next over (which will be empty initially).
    // If match is finished, we show the last over.
    const effectiveCompletedOvers = isMatchFinished 
      ? Math.max(0, completedOvers - 1) 
      : completedOvers;

    let legalCount = 0;
    let overStartIdx = 0;
    const targetLegalStart = effectiveCompletedOvers * 6;
    
    for (let i = 0; i < match.history.length; i++) {
      if (legalCount === targetLegalStart) {
        overStartIdx = i;
        break;
      }
      if (match.history[i].type === 'legal' || match.history[i].type === 'wicket') {
        legalCount++;
      }
    }
    
    return match.history.slice(overStartIdx);
  }, [match.history, match.balls, isMatchFinished]);

  const legalBallsInCurrentOver = match.balls % 6;
  // If we just finished an over (legalBallsInCurrentOver === 0) but match is not finished,
  // we want to show 6 new empty boxes.
  const remainingLegalBalls = isMatchFinished ? 0 : 6 - legalBallsInCurrentOver;
  const totalOverBoxes = currentOverBalls.length + remainingLegalBalls;

  const oversDisplay = `${Math.floor(match.balls / 6)}.${match.balls % 6}`;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col selection:bg-slate-200">
      <AnimatePresence mode="wait">
        {view === 'intro' && (
          <motion.div
            key="intro"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8"
          >
            <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-16">SCORER</h1>
            
            <button
              onClick={() => setView('setup')}
              className="w-20 h-20 rounded-full bg-white border border-slate-200 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all active:scale-90 shadow-sm"
            >
              <Plus className="w-8 h-8" />
            </button>
            <p className="mt-8 text-slate-400 font-bold uppercase tracking-[0.4em] text-[10px]">New Match</p>
          </motion.div>
        )}

        {view === 'setup' && (
          <motion.div
            key="setup"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto"
          >
            <div className="w-full max-w-xs bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 my-8">
              <div className="mb-10">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6 text-center">Team Names</h2>
                <div className="space-y-3">
                  <input
                    type="text"
                    value={team1Name}
                    onChange={(e) => setTeam1Name(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 text-center text-sm font-black focus:ring-0"
                    placeholder="Team 1 Name"
                  />
                  <input
                    type="text"
                    value={team2Name}
                    onChange={(e) => setTeam2Name(e.target.value)}
                    className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 text-center text-sm font-black focus:ring-0"
                    placeholder="Team 2 Name"
                  />
                </div>
              </div>

              <div className="mb-10">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6 text-center">Match Overs</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[5, 10, 15, 20].map((num) => (
                    <button
                      key={num}
                      onClick={() => setTotalOvers(num)}
                      className={`py-4 rounded-2xl text-lg font-black transition-all border ${
                        totalOvers === num ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={totalOvers}
                  onChange={(e) => setTotalOvers(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 text-center text-xl font-black focus:ring-0"
                  placeholder="Custom Overs"
                />
              </div>

              <div className="mb-10">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6 text-center">Wickets (Players)</h2>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {[5, 10, 11, 12].map((num) => (
                    <button
                      key={num}
                      onClick={() => setTotalWickets(num)}
                      className={`py-4 rounded-2xl text-lg font-black transition-all border ${
                        totalWickets === num ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  value={totalWickets}
                  onChange={(e) => setTotalWickets(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 px-4 text-center text-xl font-black focus:ring-0"
                  placeholder="Custom Wickets"
                />
              </div>

              <div className="mb-10">
                <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-6 text-center">Who is Batting First?</h2>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBattingFirst(1)}
                    className={`py-4 px-2 rounded-2xl text-xs font-black transition-all border truncate ${
                      battingFirst === 1 ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'
                    }`}
                  >
                    {team1Name || 'Team 1'}
                  </button>
                  <button
                    onClick={() => setBattingFirst(2)}
                    className={`py-4 px-2 rounded-2xl text-xs font-black transition-all border truncate ${
                      battingFirst === 2 ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-400 border-slate-100'
                    }`}
                  >
                    {team2Name || 'Team 2'}
                  </button>
                </div>
              </div>

              <button
                onClick={startMatch}
                className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl active:scale-95 transition-transform"
              >
                START
              </button>
              <button onClick={() => setView('intro')} className="w-full py-4 text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-2">
                Cancel
              </button>
            </div>
          </motion.div>
        )}

        {view === 'scoring' && (
          <motion.div
            key="scoring"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col max-w-md mx-auto w-full bg-white"
          >
            {/* Minimal Header */}
            <header className="px-6 py-4 flex items-center justify-between border-b border-slate-50">
              <button onClick={() => setView('intro')} className="p-2">
                <ChevronLeft className="w-5 h-5 text-slate-300" />
              </button>
              <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-300">
                {isMatchFinished ? 'Finished' : 'Live'}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowCommentary(!showCommentary)} className="p-2">
                  <Plus className={`w-4 h-4 text-slate-300 transition-transform ${showCommentary ? 'rotate-45' : ''}`} />
                </button>
                <button onClick={resetMatch} className="p-2">
                  <RotateCcw className="w-4 h-4 text-slate-300" />
                </button>
              </div>
            </header>

            {/* Score Display */}
            <main className="flex-1 px-8 flex flex-col relative">
              <AnimatePresence>
                {showEvent && (
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 1.5, opacity: 0 }}
                    className={`absolute inset-0 z-50 flex items-center justify-center pointer-events-none`}
                  >
                    <div className={`${showEvent.color} text-white px-12 py-6 rounded-[3rem] shadow-2xl`}>
                      <span className="text-6xl font-black italic tracking-tighter">{showEvent.text}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="py-10 text-center">
                {match.innings === 2 && match.firstInningsScore !== null && (
                  <div className="mb-4">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300">
                      Target: {match.firstInningsScore + 1}
                    </span>
                    <p className="text-xs font-bold text-slate-400 mt-1">
                      Need {Math.max(0, (match.firstInningsScore + 1) - match.runs)} runs from {totalOvers * 6 - match.balls} balls
                    </p>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mb-6">
                  <span className="text-9xl font-black tracking-tighter text-slate-900">{match.runs}</span>
                  <span className="text-3xl font-black text-slate-200 mt-auto mb-4">/ {match.wickets} <span className="text-slate-100 text-sm">({totalWickets})</span></span>
                </div>
                <div className="flex items-center justify-center gap-8">
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">
                      {match.innings === 1 ? match.team1Name : match.team2Name}
                    </p>
                    <p className="text-xl font-black text-slate-900">{oversDisplay} <span className="text-slate-200 text-xs">/ {totalOvers}</span></p>
                  </div>
                  <div className="w-px h-8 bg-slate-100" />
                  <div className="text-center">
                    <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.3em] mb-1">Run Rate</p>
                    <p className="text-xl font-black text-slate-900">{match.balls > 0 ? ((match.runs / match.balls) * 6).toFixed(1) : '0.0'}</p>
                  </div>
                </div>
              </div>

              {/* Over Boxes - Dynamic & High Visibility */}
              <div className="mb-10">
                <div className="flex flex-wrap justify-center gap-2">
                  {Array.from({ length: totalOverBoxes }).map((_, i) => {
                    const ball = currentOverBalls[i];
                    return (
                      <motion.div
                        key={i}
                        initial={ball ? { scale: 0.8, opacity: 0 } : false}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black transition-all border-2 ${
                          ball
                            ? ball.type === 'wicket'
                              ? 'bg-rose-500 text-white border-rose-500'
                              : ball.isExtra
                              ? 'bg-amber-400 text-white border-amber-400'
                              : 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-transparent border-slate-200'
                        }`}
                      >
                        {ball ? ball.display : ''}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Commentary View Overlay */}
              <AnimatePresence>
                {showCommentary && (
                  <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="absolute inset-x-0 top-0 bottom-0 bg-white z-40 flex flex-col p-8 overflow-y-auto"
                  >
                    <div className="flex items-center justify-between mb-8">
                      <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Match Commentary</h3>
                      <button onClick={() => setShowCommentary(false)} className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-500">Close</button>
                    </div>
                    <div className="space-y-6">
                      {match.history.length === 0 ? (
                        <p className="text-center text-slate-300 text-xs py-20 font-bold italic">No balls bowled yet...</p>
                      ) : (
                        [...match.history].reverse().map((ball, idx) => {
                          const ballNum = match.history.length - idx;
                          const overNum = Math.floor((ballNum - 1) / 6);
                          const ballInOver = ((ballNum - 1) % 6) + 1;
                          
                          return (
                            <div key={idx} className="flex gap-4 items-start">
                              <div className="w-12 text-[10px] font-black text-slate-300 pt-1">
                                {overNum}.{ballInOver}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-slate-900 mb-1">{getBallCommentary(ball)}</p>
                                <div className="flex items-center gap-2">
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase ${
                                    ball.type === 'wicket' ? 'bg-rose-100 text-rose-600' : 
                                    ball.isExtra ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-500'
                                  }`}>
                                    {ball.display}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {isMatchFinished && (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="mt-auto mb-10 p-8 bg-slate-50 rounded-[2rem] text-center border border-slate-100">
                  <p className="text-2xl font-black mb-2 text-slate-900">{match.runs} / {match.wickets}</p>
                  
                  {match.innings === 1 ? (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-6">End of {match.team1Name} Innings</p>
                      <button 
                        onClick={startSecondInnings} 
                        className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-lg shadow-slate-200"
                      >
                        START {match.team2Name.toUpperCase()} INNINGS
                      </button>
                      <button 
                        onClick={() => setShowCommentary(true)} 
                        className="w-full py-4 text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-2"
                      >
                        View Commentary
                      </button>
                    </>
                  ) : (
                    <>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-300 mb-6">
                        {match.firstInningsScore !== null && match.runs > match.firstInningsScore 
                          ? `${match.team2Name} Won!` 
                          : match.firstInningsScore !== null && match.runs < match.firstInningsScore 
                          ? `${match.team1Name} Won!` 
                          : 'Match Tied!'}
                      </p>
                      <button 
                        onClick={resetMatch} 
                        className="w-full py-5 bg-slate-900 text-white font-black rounded-2xl shadow-lg shadow-slate-200"
                      >
                        NEW MATCH
                      </button>
                      <button 
                        onClick={() => setShowCommentary(true)} 
                        className="w-full py-4 text-slate-400 font-bold text-[10px] uppercase tracking-[0.4em] mt-2"
                      >
                        View Commentary
                      </button>
                    </>
                  )}
                </motion.div>
              )}
            </main>

            {/* Keypad - Utilitarian Minimalist */}
            {!isMatchFinished && (
              <footer className="p-6 bg-slate-50 border-t border-slate-100">
                <div className="grid grid-cols-4 gap-2">
                  {[0, 1, 2, 3, 4, 6].map((run) => (
                    <button
                      key={run}
                      onClick={() => addBall({ type: 'legal', runs: run, isExtra: false, display: run === 0 ? '•' : run.toString() })}
                      className={`h-14 rounded-xl flex items-center justify-center text-2xl font-black transition-all active:scale-95 bg-white border border-slate-200 shadow-sm ${
                        run === 0 ? 'text-slate-300' : 'text-slate-900'
                      }`}
                    >
                      {run}
                    </button>
                  ))}
                  <button
                    onClick={() => setWicketSelection('type')}
                    className="h-14 rounded-xl bg-rose-500 text-white flex items-center justify-center text-2xl font-black active:scale-95 shadow-sm border border-rose-600"
                  >
                    W
                  </button>
                  <button
                    onClick={undoLastBall}
                    disabled={match.history.length === 0}
                    className="h-14 rounded-xl bg-white text-slate-300 flex items-center justify-center disabled:opacity-30 active:scale-95 border border-slate-200 shadow-sm"
                  >
                    <Undo2 className="w-5 h-5" />
                  </button>
                  
                  <button
                    onClick={() => addBall({ type: 'wide', runs: 1, isExtra: true, display: 'WD' })}
                    className="col-span-2 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] tracking-[0.4em] active:scale-95 shadow-sm"
                  >
                    WIDE
                  </button>
                  <button
                    onClick={() => addBall({ type: 'noball', runs: 1, isExtra: true, display: 'NB' })}
                    className="col-span-2 h-14 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-[10px] tracking-[0.4em] active:scale-95 shadow-sm"
                  >
                    NO BALL
                  </button>
                </div>
              </footer>
            )}
          </motion.div>
        )}
        {/* Wicket Selection Modal */}
        <AnimatePresence>
          {wicketSelection && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6"
              onClick={() => setWicketSelection(null)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="w-full max-w-xs bg-white rounded-[2.5rem] p-8 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="text-center mb-8">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Wicket Type</h3>
                </div>

                {wicketSelection === 'type' ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        addBall({ type: 'wicket', runs: 0, isExtra: false, display: 'W' });
                        setWicketSelection(null);
                      }}
                      className="w-full py-5 bg-slate-50 hover:bg-slate-100 text-slate-900 font-black rounded-2xl transition-colors text-sm"
                    >
                      WICKET + NO RUN
                    </button>
                    <button
                      onClick={() => setWicketSelection('runs')}
                      className="w-full py-5 bg-rose-500 text-white font-black rounded-2xl shadow-lg shadow-rose-100 text-sm"
                    >
                      WICKET + RUN
                    </button>
                    <button
                      onClick={() => setWicketSelection(null)}
                      className="w-full py-4 text-slate-300 font-bold text-[10px] uppercase tracking-[0.4em] mt-2"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] text-center mb-6">Runs Scored?</p>
                    <div className="grid grid-cols-4 gap-3 mb-6">
                      {[0, 1, 2, 3, 4, 6].map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            addBall({ type: 'wicket', runs: r, isExtra: false, display: `W${r > 0 ? r : ''}` });
                            setWicketSelection(null);
                          }}
                          className="aspect-square bg-slate-900 text-white rounded-xl flex items-center justify-center font-black text-sm"
                        >
                          {r}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setWicketSelection('type')}
                      className="w-full py-4 text-slate-300 font-bold text-[10px] uppercase tracking-[0.4em]"
                    >
                      Back
                    </button>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </AnimatePresence>
    </div>
  );
}
