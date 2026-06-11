// frontend/src/components/lms/ExamComponent.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { GlobalStyles } from '../../pages/Training';

const hdrs = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const API  = () => import.meta.env.VITE_API_URL;

const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

export default function ExamComponent({ course, onBack, onComplete, dark }) {
  const [phase,     setPhase]     = useState('loading'); // loading|intro|taking|grading|result
  const [questions, setQuestions] = useState([]);
  const [passing,   setPassing]   = useState(70);
  const [current,   setCurrent]   = useState(0);
  const [answers,   setAnswers]   = useState([]);
  const [flagged,   setFlagged]   = useState(new Set());
  const [elapsed,   setElapsed]   = useState(0);
  const [result,    setResult]    = useState(null);
  const [reviewIdx, setReviewIdx] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    axios.get(`${API()}/api/learning/exam/${course._id}`, hdrs())
      .then(res => {
        const qs = res.data.questions || [];
        setQuestions(qs);
        setAnswers(new Array(qs.length).fill(null));
        setPassing(res.data.passingScore || 70);
        setPhase('intro');
      })
      .catch(() => { toast.error('Failed to load exam'); onBack(); });
  }, []);

  const startTimer  = useCallback(() => { timerRef.current = setInterval(() => setElapsed(e => e+1), 1000); }, []);
  const stopTimer   = useCallback(() => clearInterval(timerRef.current), []);
  useEffect(() => () => stopTimer(), []);

  const startExam = () => { setPhase('taking'); startTimer(); };

  const select  = opt => { const a=[...answers]; a[current]=opt; setAnswers(a); };
  const flag    = ()  => setFlagged(prev => { const n=new Set(prev); n.has(current)?n.delete(current):n.add(current); return n; });

  const submit = async () => {
    stopTimer();
    setPhase('grading');
    try {
      const res = await axios.post(`${API()}/api/learning/exam/submit`, {
        courseId: course._id, answers: answers.map(a=>a||''), timeSpent: elapsed,
      }, hdrs());
      setResult(res.data);
      setPhase('result');
    } catch {
      toast.error('Submission failed — check your connection');
      setPhase('taking'); startTimer();
    }
  };

  const retry = () => { setAnswers(new Array(questions.length).fill(null)); setFlagged(new Set()); setCurrent(0); setElapsed(0); setResult(null); setPhase('intro'); };

  const answered = answers.filter(a=>a!==null).length;
  const q        = questions[current];

  if (phase==='loading'||phase==='grading') return (
    <>
      <GlobalStyles dark={dark} />
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:16}}>
        <div style={{width:40,height:40,border:'3px solid var(--lms-border)',borderTopColor:'var(--lms-accent)',borderRadius:'50%',animation:'ex-spin .7s linear infinite'}}/>
        <p style={{color:'var(--lms-t2)',fontSize:14}}>{phase==='loading'?'Loading exam…':'Grading your answers…'}</p>
        <style>{`@keyframes ex-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  );

  if (phase==='intro') return (
    <>
      <GlobalStyles dark={dark} />
      <div style={{maxWidth:580,margin:'0 auto',padding:'48px 24px'}}>
        <div style={{background:'var(--lms-surface)',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-r)',padding:40,textAlign:'center',boxShadow:'var(--lms-shadow)'}}>
          <div style={{width:72,height:72,background:'var(--lms-amberL)',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px'}}>
            <svg width="32" height="32" fill="none" stroke="var(--lms-amber)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
          </div>
          <h2 style={{fontFamily:'var(--lms-display)',fontSize:26,fontWeight:900,margin:'0 0 8px',color:'var(--lms-text)'}}>Course Exam</h2>
          <p style={{fontSize:14,color:'var(--lms-t2)',margin:'0 0 28px',lineHeight:1.5}}>{course.title}</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:28}}>
            {[
              {n:questions.length,l:'Questions'},
              {n:`${passing}%`,l:'Pass Mark'},
              {n:'No limit',l:'Time'},
            ].map(s=>(
              <div key={s.l} style={{background:'var(--lms-s2)',borderRadius:'var(--lms-rs)',padding:16}}>
                <div style={{fontFamily:'var(--lms-display)',fontSize:24,fontWeight:800,color:'var(--lms-accent)',lineHeight:1}}>{s.n}</div>
                <div style={{fontSize:12,color:'var(--lms-t3)',marginTop:4}}>{s.l}</div>
              </div>
            ))}
          </div>
          <div style={{background:'var(--lms-s2)',borderRadius:'var(--lms-rs)',padding:16,textAlign:'left',marginBottom:24}}>
            {['Select one answer per question','Flag questions to review later','Review all answers before submitting','Full explanations shown after submission'].map((r,i)=>(
              <div key={i} style={{display:'flex',alignItems:'center',gap:8,fontSize:13,color:'var(--lms-t2)',padding:'4px 0'}}>
                <svg width="13" height="13" fill="none" stroke="var(--lms-green)" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>{r}
              </div>
            ))}
          </div>
          <button onClick={startExam} style={{width:'100%',padding:'14px',background:'var(--lms-amber)',color:'#fff',border:'none',borderRadius:'var(--lms-r)',fontSize:16,fontWeight:800,cursor:'pointer',transition:'opacity .18s'}}>
            Begin Exam →
          </button>
        </div>
      </div>
    </>
  );

  if (phase==='result'&&result) {
    const {score,passed,correct,total,answers:graded,questions:qs} = result;
    const rq = qs?.[reviewIdx] || {};
    const ra = graded?.[reviewIdx] || {};
    return (
      <>
        <GlobalStyles dark={dark} />
        <div style={{maxWidth:840,margin:'0 auto',padding:'24px'}}>
          {/* Banner */}
          <div style={{background:passed?'var(--lms-greenL)':'var(--lms-redL)',border:`1.5px solid ${passed?'var(--lms-green)':'var(--lms-red)'}`,borderRadius:'var(--lms-r)',padding:'24px 28px',display:'flex',alignItems:'center',gap:20,marginBottom:20}}>
            <div style={{fontSize:40}}>{passed?'🎓':'📚'}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:'var(--lms-display)',fontSize:20,fontWeight:800,color:'var(--lms-text)',marginBottom:4}}>{passed?'Congratulations — You Passed!':'Not quite — Keep going!'}</div>
              <div style={{fontSize:14,color:'var(--lms-t2)'}}>Score: <strong>{score}%</strong> · {correct}/{total} correct · Time: {fmt(elapsed)}</div>
              {!passed && <div style={{fontSize:13,color:'var(--lms-t2)',marginTop:4}}>You need {passing}% to pass. Review the explanations below and try again.</div>}
            </div>
            <div style={{fontFamily:'var(--lms-display)',fontSize:52,fontWeight:900,color:passed?'var(--lms-green)':'var(--lms-red)',lineHeight:1}}>{score}%</div>
          </div>

          {/* Stats */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
            {[
              {n:correct,l:'Correct',c:'var(--lms-green)'},
              {n:total-correct,l:'Incorrect',c:'var(--lms-red)'},
              {n:fmt(elapsed),l:'Time Taken',c:'var(--lms-accent)'},
            ].map(s=>(
              <div key={s.l} style={{background:'var(--lms-surface)',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-r)',padding:'16px 20px',display:'flex',alignItems:'center',gap:14}}>
                <span style={{fontFamily:'var(--lms-display)',fontSize:28,fontWeight:900,color:s.c,lineHeight:1}}>{s.n}</span>
                <span style={{fontSize:13,color:'var(--lms-t2)'}}>{s.l}</span>
              </div>
            ))}
          </div>

          {/* Review */}
          {qs?.length>0 && (
            <div style={{background:'var(--lms-surface)',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-r)',padding:24,marginBottom:20}}>
              <h3 style={{fontFamily:'var(--lms-display)',fontSize:17,fontWeight:800,margin:'0 0 16px',color:'var(--lms-text)'}}>Question Review</h3>
              {/* dot nav */}
              <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:18}}>
                {graded.map((a,i)=>(
                  <button key={i} onClick={()=>setReviewIdx(i)}
                    style={{width:32,height:32,borderRadius:6,border:`1.5px solid ${a.correct?'var(--lms-green)':'var(--lms-red)'}`,background:a.correct?'var(--lms-greenL)':'var(--lms-redL)',color:a.correct?'var(--lms-green)':'var(--lms-red)',fontSize:11,fontWeight:800,cursor:'pointer',boxShadow:i===reviewIdx?'0 0 0 2.5px var(--lms-accent)':'none'}}>
                    {i+1}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div key={reviewIdx} initial={{opacity:0,x:8}} animate={{opacity:1,x:0}} exit={{opacity:0,x:-8}} transition={{duration:.14}}
                  style={{background:'var(--lms-s2)',borderRadius:'var(--lms-rs)',padding:20}}>
                  <div style={{fontSize:11,fontWeight:700,color:'var(--lms-t3)',letterSpacing:'.06em',textTransform:'uppercase',marginBottom:8}}>Question {reviewIdx+1} of {total}</div>
                  <div style={{fontSize:16,fontWeight:700,color:'var(--lms-text)',marginBottom:16,lineHeight:1.5,fontFamily:'var(--lms-display)'}}>{rq.question}</div>
                  <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:14}}>
                    {(rq.options||[]).map((opt,i)=>{
                      const isCorrectOpt = opt===rq.answer;
                      const isWrongPick  = opt===ra.selectedAnswer && !isCorrectOpt;
                      return (
                        <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 14px',borderRadius:'var(--lms-rs)',border:`1.5px solid ${isCorrectOpt?'var(--lms-green)':isWrongPick?'var(--lms-red)':'var(--lms-border)'}`,background:isCorrectOpt?'var(--lms-greenL)':isWrongPick?'var(--lms-redL)':'var(--lms-surface)',fontSize:13}}>
                          <span style={{width:22,height:22,borderRadius:'50%',background:'var(--lms-s3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0}}>{String.fromCharCode(65+i)}</span>
                          <span style={{flex:1}}>{opt}</span>
                          {isCorrectOpt && <svg width="14" height="14" fill="none" stroke="var(--lms-green)" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>}
                          {isWrongPick  && <svg width="14" height="14" fill="none" stroke="var(--lms-red)" strokeWidth="2.5" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>}
                        </div>
                      );
                    })}
                  </div>
                  {ra.explanation && (
                    <div style={{background:'var(--lms-accentL)',border:'1px solid var(--lms-border)',borderRadius:'var(--lms-rx)',padding:'10px 14px',fontSize:13,color:'var(--lms-t2)',lineHeight:1.5,display:'flex',gap:8}}>
                      <span style={{flexShrink:0}}>💡</span>{ra.explanation}
                    </div>
                  )}
                  <div style={{display:'flex',justifyContent:'space-between',marginTop:14}}>
                    <button onClick={()=>setReviewIdx(i=>Math.max(0,i-1))} disabled={reviewIdx===0} style={{padding:'7px 14px',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-rs)',background:'none',fontSize:12,fontWeight:600,cursor:'pointer',color:'var(--lms-t2)',opacity:reviewIdx===0?.4:1}}>← Prev</button>
                    <button onClick={()=>setReviewIdx(i=>Math.min(total-1,i+1))} disabled={reviewIdx===total-1} style={{padding:'7px 14px',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-rs)',background:'none',fontSize:12,fontWeight:600,cursor:'pointer',color:'var(--lms-t2)',opacity:reviewIdx===total-1?.4:1}}>Next →</button>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          )}

          {/* Actions */}
          <div style={{display:'flex',gap:12}}>
            <button onClick={retry} style={{display:'flex',alignItems:'center',gap:6,padding:'12px 22px',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-r)',background:'none',fontSize:14,fontWeight:600,cursor:'pointer',color:'var(--lms-t2)'}}>↺ Retake</button>
            <button onClick={()=>onComplete?.(score)} style={{flex:1,padding:'12px',background:'var(--lms-accent)',color:'#fff',border:'none',borderRadius:'var(--lms-r)',fontSize:14,fontWeight:700,cursor:'pointer'}}>
              {passed?'🎓 Claim Certificate':'Back to Course'}
            </button>
          </div>
        </div>
      </>
    );
  }

  /* TAKING */
  if (!q) return null;
  return (
    <>
      <GlobalStyles dark={dark} />
      {/* Exam header */}
      <div style={{position:'sticky',top:0,zIndex:100,background:'var(--lms-surface)',borderBottom:'1.5px solid var(--lms-border)',height:52,display:'flex',alignItems:'center',padding:'0 24px',gap:16}}>
        <button onClick={()=>{if(window.confirm('Exit exam? Progress will be lost.')){{stopTimer();onBack();}}}} style={{background:'none',border:'1px solid var(--lms-border)',borderRadius:6,padding:'6px 12px',fontSize:12,cursor:'pointer',color:'var(--lms-t2)',display:'flex',alignItems:'center',gap:4,whiteSpace:'nowrap'}}>
          ← Exit
        </button>
        <div style={{flex:1,display:'flex',alignItems:'center',gap:10}}>
          <span style={{fontSize:13,fontWeight:700,color:'var(--lms-accent)',whiteSpace:'nowrap'}}>Q {current+1}/{questions.length}</span>
          <div style={{flex:1,height:5,background:'var(--lms-s3)',borderRadius:100,overflow:'hidden'}}>
            <div style={{height:'100%',width:`${(answered/questions.length)*100}%`,background:'var(--lms-accent)',transition:'width .4s ease'}}/>
          </div>
          <span style={{fontSize:12,color:'var(--lms-t3)',whiteSpace:'nowrap'}}>{answered} answered</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:5,fontSize:14,fontWeight:800,color:'var(--lms-text)',fontFamily:'var(--lms-display)',flexShrink:0}}>
          <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          {fmt(elapsed)}
        </div>
      </div>

      <div style={{maxWidth:1100,margin:'0 auto',padding:24,display:'grid',gridTemplateColumns:'200px 1fr',gap:20,alignItems:'start'}}>
        {/* Q Navigator */}
        <div style={{background:'var(--lms-surface)',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-r)',padding:14,position:'sticky',top:68,boxShadow:'var(--lms-shadow)'}}>
          <div style={{fontSize:10,fontWeight:800,letterSpacing:'.07em',color:'var(--lms-t3)',textTransform:'uppercase',marginBottom:10}}>Questions</div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:5,marginBottom:12}}>
            {questions.map((_,i)=>(
              <button key={i} onClick={()=>setCurrent(i)} title={`Q${i+1}${answers[i]?'':'  – unanswered'}${flagged.has(i)?' 🚩':''}`}
                style={{width:'100%',aspectRatio:'1',borderRadius:5,border:'1.5px solid',borderColor:i===current?'var(--lms-accent)':answers[i]?'var(--lms-green)':flagged.has(i)?'var(--lms-amber)':'var(--lms-border)',background:i===current?'var(--lms-accentL)':answers[i]?'var(--lms-greenL)':flagged.has(i)?'var(--lms-amberL)':'var(--lms-s2)',color:i===current?'var(--lms-accent)':answers[i]?'var(--lms-green)':flagged.has(i)?'var(--lms-amber)':'var(--lms-t3)',fontSize:11,fontWeight:700,cursor:'pointer',boxShadow:i===current?'0 0 0 2px var(--lms-glow)':'none',transition:'all .15s'}}>
                {i+1}
              </button>
            ))}
          </div>
          <div style={{fontSize:11,color:'var(--lms-t3)',display:'flex',flexDirection:'column',gap:4}}>
            <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:10,height:10,borderRadius:3,background:'var(--lms-greenL)',border:'1.5px solid var(--lms-green)',display:'inline-block'}}/> Answered ({answered})</div>
            <div style={{display:'flex',alignItems:'center',gap:6}}><span style={{width:10,height:10,borderRadius:3,background:'var(--lms-amberL)',border:'1.5px solid var(--lms-amber)',display:'inline-block'}}/> Flagged ({flagged.size})</div>
          </div>
        </div>

        {/* Question card */}
        <div style={{background:'var(--lms-surface)',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-r)',padding:28,boxShadow:'var(--lms-shadow)'}}>
          {q.moduleRef && <div style={{fontSize:11,color:'var(--lms-t3)',background:'var(--lms-s2)',border:'1px solid var(--lms-border)',borderRadius:100,padding:'3px 10px',display:'inline-flex',alignItems:'center',gap:4,marginBottom:12,fontWeight:600}}>📖 {q.moduleRef}</div>}
          {flagged.has(current) && <div style={{fontSize:11,color:'var(--lms-amber)',background:'var(--lms-amberL)',border:'1px solid var(--lms-amber)',borderRadius:100,padding:'3px 10px',display:'inline-flex',alignItems:'center',gap:4,marginBottom:12,marginLeft:6,fontWeight:700}}>🚩 Flagged</div>}

          <AnimatePresence mode="wait">
            <motion.div key={current} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.15}}>
              <p style={{fontSize:18,fontWeight:800,color:'var(--lms-text)',lineHeight:1.5,marginBottom:24,fontFamily:'var(--lms-display)'}}>{q.question}</p>
              <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:24}}>
                {(q.options||[]).map((opt,i)=>(
                  <button key={i} onClick={()=>select(opt)}
                    style={{display:'flex',alignItems:'center',gap:14,padding:'16px 18px',border:`1.5px solid ${answers[current]===opt?'var(--lms-accent)':'var(--lms-border)'}`,borderRadius:'var(--lms-rs)',background:answers[current]===opt?'var(--lms-accentL)':'var(--lms-surface)',cursor:'pointer',fontFamily:'var(--lms-body)',fontSize:14,color:'var(--lms-text)',textAlign:'left',transition:'all .15s'}}>
                    <span style={{width:30,height:30,borderRadius:'50%',background:answers[current]===opt?'var(--lms-accent)':'var(--lms-s3)',border:`1.5px solid ${answers[current]===opt?'var(--lms-accent)':'var(--lms-border)'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:answers[current]===opt?'#fff':'var(--lms-t3)',flexShrink:0,transition:'all .15s'}}>
                      {String.fromCharCode(65+i)}
                    </span>
                    <span style={{flex:1,lineHeight:1.4,color:answers[current]===opt?'var(--lms-accent)':'var(--lms-text)',fontWeight:answers[current]===opt?600:400}}>{opt}</span>
                    {answers[current]===opt && <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--lms-accent)"><circle cx="12" cy="12" r="10"/><polyline points="16 8 10 14 8 12" stroke="#fff" strokeWidth="2.5" fill="none" strokeLinecap="round"/></svg>}
                  </button>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>

          {/* Action row */}
          <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
            <button onClick={()=>setCurrent(i=>Math.max(0,i-1))} disabled={current===0}
              style={{padding:'9px 16px',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-rs)',background:'none',fontSize:13,fontWeight:600,cursor:'pointer',color:'var(--lms-t2)',opacity:current===0?.35:1}}>← Prev</button>
            <button onClick={flag}
              style={{padding:'9px 14px',border:`1.5px solid ${flagged.has(current)?'var(--lms-amber)':'var(--lms-border)'}`,borderRadius:'var(--lms-rs)',background:flagged.has(current)?'var(--lms-amberL)':'none',fontSize:13,fontWeight:600,cursor:'pointer',color:flagged.has(current)?'var(--lms-amber)':'var(--lms-t2)',display:'flex',alignItems:'center',gap:5}}>
              🚩 {flagged.has(current)?'Unflag':'Flag'}
            </button>
            {current<questions.length-1
              ? <button onClick={()=>setCurrent(i=>i+1)} style={{marginLeft:'auto',padding:'9px 18px',background:'var(--lms-accent)',color:'#fff',border:'none',borderRadius:'var(--lms-rs)',fontSize:13,fontWeight:700,cursor:'pointer'}}>Next →</button>
              : <button onClick={()=>{const u=answers.filter(a=>a===null).length;if(u>0&&!window.confirm(`${u} unanswered. Submit anyway?`))return;submit();}} style={{marginLeft:'auto',padding:'9px 20px',background:'var(--lms-green)',color:'#fff',border:'none',borderRadius:'var(--lms-rs)',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit Exam ✓</button>
            }
          </div>

          {answered===questions.length && (
            <motion.div initial={{opacity:0,y:6}} animate={{opacity:1,y:0}}
              style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:14,padding:'12px 16px',background:'var(--lms-greenL)',border:'1px solid var(--lms-green)',borderRadius:'var(--lms-rs)'}}>
              <span style={{fontSize:13,fontWeight:700,color:'var(--lms-green)',display:'flex',alignItems:'center',gap:6}}>
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                All {questions.length} questions answered!
              </span>
              <button onClick={submit} style={{padding:'8px 20px',background:'var(--lms-green)',color:'#fff',border:'none',borderRadius:'var(--lms-rs)',fontSize:13,fontWeight:700,cursor:'pointer'}}>Submit →</button>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
}