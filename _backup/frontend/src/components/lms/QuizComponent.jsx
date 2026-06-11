// frontend/src/components/lms/QuizComponent.jsx
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function QuizComponent({ quiz, moduleTitle, previousScore, onComplete }) {
  const [phase,     setPhase]     = useState('intro');   // intro|taking|review|done
  const [current,   setCurrent]   = useState(0);
  const [selected,  setSelected]  = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [answers,   setAnswers]   = useState([]);
  const [score,     setScore]     = useState(null);

  // Ensure quiz is an array and has items
  const q = Array.isArray(quiz) && quiz.length > 0 ? quiz[current] : null;

  if (!Array.isArray(quiz) || quiz.length === 0) return (
    <div style={{textAlign:'center',padding:40,color:'var(--lms-t2)'}}>
      No quiz questions available for this module.
    </div>
  );

  const confirmAnswer = () => {
    if (!selected) return;
    setConfirmed(true);
  };

  const nextQ = () => {
    const newAnswers = [...answers, {
      q:       q?.question || '',
      selected,
      correct:    q?.answer || '',
      isCorrect:  selected === (q?.answer || ''),
      explanation: q?.explanation || '',
    }];
    setAnswers(newAnswers);

    if (current + 1 < quiz.length) {
      setCurrent(i => i + 1);
      setSelected(null);
      setConfirmed(false);
    } else {
      const pct = Math.round((newAnswers.filter(a => a.isCorrect).length / quiz.length) * 100);
      setScore(pct);
      setPhase('review');
    }
  };

  const reset = () => { setCurrent(0); setSelected(null); setConfirmed(false); setAnswers([]); setScore(null); setPhase('taking'); };

  const finish = () => { onComplete?.(score); setPhase('done'); };

  /* INTRO */
  if (phase === 'intro') return (
    <div style={{textAlign:'center',padding:'40px 20px'}}>
      <div style={{width:60,height:60,background:'var(--lms-accentL)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
        <svg width="26" height="26" fill="none" stroke="var(--lms-accent)" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
      </div>
      <h3 style={{fontFamily:'var(--lms-display)',fontSize:20,fontWeight:800,margin:'0 0 6px',color:'var(--lms-text)'}}>Module Quiz</h3>
      <p style={{fontSize:14,color:'var(--lms-t2)',margin:'0 0 20px'}}>{moduleTitle}</p>
      <div style={{display:'flex',justifyContent:'center',gap:24,marginBottom:24,fontSize:13,color:'var(--lms-t2)'}}>
        <span>{quiz.length} question{quiz.length!==1?'s':''}</span>
        {previousScore != null && <span>Best: <strong style={{color:previousScore>=70?'var(--lms-green)':'var(--lms-red)'}}>{previousScore}%</strong></span>}
      </div>
      <button onClick={() => setPhase('taking')} style={{padding:'12px 32px',background:'var(--lms-accent)',color:'#fff',border:'none',borderRadius:'var(--lms-r)',fontSize:14,fontWeight:700,cursor:'pointer',transition:'opacity .18s'}}>
        Start Quiz →
      </button>
    </div>
  );

  /* DONE */
  if (phase === 'done') return (
    <div style={{textAlign:'center',padding:'40px 20px'}}>
      <div style={{fontSize:40,marginBottom:12}}>{score>=70?'🎉':'📚'}</div>
      <h3 style={{fontFamily:'var(--lms-display)',fontSize:22,fontWeight:800,margin:'0 0 8px',color:'var(--lms-text)'}}>{score>=70?'Well done!':'Keep learning!'}</h3>
      <div style={{fontSize:48,fontWeight:900,fontFamily:'var(--lms-display)',color:score>=70?'var(--lms-green)':'var(--lms-amber)',margin:'8px 0'}}>{score}%</div>
      <p style={{fontSize:14,color:'var(--lms-t2)',marginBottom:20}}>{answers.filter(a=>a.isCorrect).length}/{quiz.length} correct</p>
      <button onClick={reset} style={{padding:'10px 24px',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-rs)',background:'none',color:'var(--lms-t2)',cursor:'pointer',fontSize:13,fontWeight:600}}>
        Try Again
      </button>
    </div>
  );

  /* REVIEW */
  if (phase === 'review') return (
    <div style={{paddingBottom:8}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
        <div>
          <h3 style={{fontFamily:'var(--lms-display)',fontSize:18,fontWeight:800,margin:'0 0 4px',color:'var(--lms-text)'}}>Quiz Results</h3>
          <p style={{fontSize:13,color:'var(--lms-t2)',margin:0}}>{answers.filter(a=>a.isCorrect).length}/{quiz.length} correct</p>
        </div>
        <div style={{fontFamily:'var(--lms-display)',fontSize:40,fontWeight:900,color:score>=70?'var(--lms-green)':'var(--lms-amber)'}}>{score}%</div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
        {answers.map((a,i) => (
          <div key={i} style={{padding:14,borderRadius:'var(--lms-rs)',border:`1px solid ${a.isCorrect?'var(--lms-green)':'var(--lms-red)'}`,background:a.isCorrect?'var(--lms-greenL)':'var(--lms-redL)'}}>
            <div style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:a.isCorrect?0:6}}>
              <span style={{fontSize:14,flexShrink:0}}>{a.isCorrect?'✅':'❌'}</span>
              <span style={{fontSize:13,fontWeight:600,color:'var(--lms-text)',lineHeight:1.4}}>Q{i+1}. {a.q}</span>
            </div>
            {!a.isCorrect && (
              <div style={{paddingLeft:22,fontSize:12,display:'flex',flexDirection:'column',gap:2}}>
                <div style={{color:'var(--lms-red)'}}>Your answer: <strong>{a.selected}</strong></div>
                <div style={{color:'var(--lms-green)'}}>Correct: <strong>{a.correct}</strong></div>
              </div>
            )}
            {a.explanation && (
              <div style={{marginTop:8,paddingLeft:22,fontSize:12,color:'var(--lms-t2)',lineHeight:1.5,background:'rgba(0,0,0,.04)',borderRadius:4,padding:'8px 12px'}}>
                💡 {a.explanation}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{display:'flex',gap:10}}>
        <button onClick={reset} style={{padding:'10px 20px',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-rs)',background:'none',color:'var(--lms-t2)',cursor:'pointer',fontSize:13,fontWeight:600,display:'flex',alignItems:'center',gap:6}}>
          ↺ Retry
        </button>
        <button onClick={finish} style={{flex:1,padding:'10px 24px',background:'var(--lms-accent)',color:'#fff',border:'none',borderRadius:'var(--lms-rs)',fontSize:13,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
          Continue →
        </button>
      </div>
    </div>
  );

  /* TAKING */
  if (!q) return null;
  const isCorrect = selected === q.answer;

  return (
    <div>
      {/* Progress */}
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:24}}>
        <div style={{flex:1,height:5,background:'var(--lms-s3)',borderRadius:100,overflow:'hidden'}}>
          <div style={{height:'100%',width:`${(current/quiz.length)*100}%`,background:'var(--lms-accent)',borderRadius:100,transition:'width .4s ease'}}/>
        </div>
        <span style={{fontSize:12,fontWeight:700,color:'var(--lms-t3)',whiteSpace:'nowrap'}}>{current+1}/{quiz.length}</span>
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{opacity:0,x:16}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-16}} transition={{duration:.18}}>
          <p style={{fontSize:16,fontWeight:700,color:'var(--lms-text)',lineHeight:1.5,marginBottom:20,fontFamily:'var(--lms-display)'}}>{q.question}</p>

          <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:20}}>
            {(q.options || []).map((opt, i) => {
              let bg = 'var(--lms-surface)', border = 'var(--lms-border)', color = 'var(--lms-text)';
              if (confirmed) {
                if (opt === q.answer)                { bg='var(--lms-greenL)'; border='var(--lms-green)'; color='var(--lms-green)'; }
                else if (opt === selected)           { bg='var(--lms-redL)';   border='var(--lms-red)';   color='var(--lms-red)'; }
              } else if (opt === selected)           { bg='var(--lms-accentL)'; border='var(--lms-accent)'; color='var(--lms-accent)'; }
              return (
                <button key={i}
                  disabled={confirmed}
                  onClick={() => setSelected(opt)}
                  style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',border:`1.5px solid ${border}`,borderRadius:'var(--lms-rs)',background:bg,cursor:confirmed?'default':'pointer',fontFamily:'var(--lms-body)',fontSize:14,color,textAlign:'left',transition:'all .15s'}}>
                  <span style={{width:28,height:28,borderRadius:'50%',background:'var(--lms-s3)',border:`1.5px solid ${border}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,flexShrink:0,color}}>
                    {String.fromCharCode(65+i)}
                  </span>
                  <span style={{flex:1,lineHeight:1.4}}>{opt}</span>
                  {confirmed && opt === q.answer && <svg width="15" height="15" fill="none" stroke="var(--lms-green)" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                  {confirmed && opt === selected && opt !== q.answer && <svg width="15" height="15" fill="none" stroke="var(--lms-red)" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>}
                </button>
              );
            })}
          </div>

          {confirmed && q.explanation && (
            <motion.div initial={{opacity:0,y:5}} animate={{opacity:1,y:0}}
              style={{padding:14,borderRadius:'var(--lms-rs)',background:isCorrect?'var(--lms-greenL)':'var(--lms-redL)',border:`1px solid ${isCorrect?'var(--lms-green)':'var(--lms-red)'}`,marginBottom:16}}>
              <div style={{fontWeight:700,fontSize:13,marginBottom:4,color:'var(--lms-text)'}}>{isCorrect?'✅ Correct!':'❌ Not quite'}</div>
              <div style={{fontSize:13,lineHeight:1.55,color:'var(--lms-t2)'}}>{q.explanation}</div>
            </motion.div>
          )}

          <div style={{display:'flex',justifyContent:'flex-end'}}>
            {!confirmed
              ? <button onClick={confirmAnswer} disabled={!selected} style={{padding:'11px 28px',background:'var(--lms-accent)',color:'#fff',border:'none',borderRadius:'var(--lms-rs)',fontSize:14,fontWeight:700,cursor:selected?'pointer':'not-allowed',opacity:selected?1:.4,transition:'opacity .18s'}}>
                  Check Answer
                </button>
              : <button onClick={nextQ} style={{padding:'11px 28px',background:'var(--lms-green)',color:'#fff',border:'none',borderRadius:'var(--lms-rs)',fontSize:14,fontWeight:700,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}>
                  {current+1 < quiz.length ? 'Next →' : 'See Results'}
                </button>
            }
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}