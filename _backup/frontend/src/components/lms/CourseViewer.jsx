// frontend/src/components/lms/CourseViewer.jsx
// KEY FIX: always fetches the FULL course by ID (includes content, quiz, terms, exam)
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import QuizComponent from './QuizComponent';
import ExamComponent from './ExamComponent';
import { GlobalStyles } from '../../pages/Training';

const hdrs = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const API  = () => import.meta.env.VITE_API_URL;

const LEVEL_COLORS = {
  beginner:     { text:'#16a34a', bg:'rgba(34,197,94,.1)',   border:'rgba(34,197,94,.25)'   },
  intermediate: { text:'#d97706', bg:'rgba(245,158,11,.1)',  border:'rgba(245,158,11,.25)'  },
  expert:       { text:'#7c3aed', bg:'rgba(167,139,250,.1)', border:'rgba(167,139,250,.25)' },
};

// ── safe content renderer — handles undefined/null content gracefully ──────
function renderContent(raw) {
  const text = (raw != null ? String(raw) : '').trim();
  if (!text) return <p style={{color:'var(--lms-t3)',fontStyle:'italic',fontSize:14}}>No content available for this module.</p>;

  return text.split('\n').map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} style={{height:6}} />;
    // All-caps short lines → section heading
    if (/^[A-Z0-9 &()/:–\-·]{5,65}$/.test(t) && t === t.toUpperCase() && t.length < 65) {
      return <h3 key={i} style={{fontFamily:'var(--lms-display)',fontSize:12,fontWeight:800,letterSpacing:'.07em',color:'var(--lms-accent)',margin:'22px 0 8px',textTransform:'uppercase',borderBottom:'2px solid var(--lms-s3)',paddingBottom:4}}>{t}</h3>;
    }
    // Bullet lines
    if (/^[●•·▪▸✓✗\-–]\s/.test(t) || /^\d+[.):]\s/.test(t)) {
      const content = t.replace(/^[●•·▪▸✓✗\-–]\s|^\d+[.):]\s/,'');
      return <div key={i} style={{display:'flex',gap:8,margin:'4px 0',lineHeight:1.65}}>
        <span style={{color:'var(--lms-accent)',flexShrink:0,marginTop:3,fontSize:12}}>›</span>
        <span style={{fontSize:14.5,color:'var(--lms-t2)',lineHeight:1.7}}>{content}</span>
      </div>;
    }
    return <p key={i} style={{fontSize:14.5,lineHeight:1.75,color:'var(--lms-text)',margin:'0 0 8px'}}>{t}</p>;
  });
}

export default function CourseViewer({ courseId, progress, onBack, onProgressUpdate, dark }) {
  const [course,         setCourse]         = useState(null);
  const [fetchError,     setFetchError]     = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [moduleIdx,      setModuleIdx]      = useState(0);
  const [activeTab,      setActiveTab]      = useState('content');
  const [showExam,       setShowExam]       = useState(false);
  const [completedIds,   setCompletedIds]   = useState(new Set());
  const [modProgress,    setModProgress]    = useState([]);
  const [courseProgress, setCourseProgress] = useState(0);
  const [savingModule,   setSavingModule]   = useState(false);
  const contentRef = useRef(null);

  // ── KEY FIX: always load FULL course (modules with content) ───────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true); setFetchError(false);
    axios.get(`${API()}/api/learning/courses/${courseId}`, hdrs())
      .then(res => {
        if (cancelled) return;
        const c = res.data.course;
        if (!c) { setFetchError(true); return; }
        // Guarantee every module has content string
        c.modules = (c.modules || []).map(m => ({
          ...m,
          content:  m.content  != null ? String(m.content)  : '',
          title:    m.title    != null ? String(m.title)    : 'Untitled Module',
          quiz:     Array.isArray(m.quiz)  ? m.quiz  : [],
          terms:    Array.isArray(m.terms) ? m.terms : [],
          objectives: Array.isArray(m.objectives) ? m.objectives : [],
        }));
        setCourse(c);
      })
      .catch(() => { if (!cancelled) setFetchError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [courseId]);

  useEffect(() => {
    if (progress) {
      setCompletedIds(new Set((progress.completedModules || []).map(String)));
      setModProgress(progress.moduleProgress || []);
      setCourseProgress(progress.progress || 0);
    }
  }, [progress]);

  useEffect(() => {
    setActiveTab('content');
    contentRef.current?.scrollTo({ top:0, behavior:'smooth' });
  }, [moduleIdx]);

  if (loading) return (
    <>
      <GlobalStyles dark={dark} />
      <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:16}}>
        <div style={{width:40,height:40,border:'3px solid var(--lms-border)',borderTopColor:'var(--lms-accent)',borderRadius:'50%',animation:'cv-spin .7s linear infinite'}}/>
        <p style={{color:'var(--lms-t2)',fontSize:14}}>Loading course…</p>
        <style>{`@keyframes cv-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </>
  );

  if (fetchError || !course) return (
    <>
      <GlobalStyles dark={dark} />
      <div style={{padding:48,textAlign:'center',maxWidth:480,margin:'0 auto'}}>
        <div style={{width:56,height:56,borderRadius:'50%',background:'var(--lms-redL)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}>
          <svg width="24" height="24" fill="none" stroke="var(--lms-red)" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 style={{fontFamily:'var(--lms-display)',fontSize:18,marginBottom:8,color:'var(--lms-text)'}}>Course not found</h3>
        <p style={{color:'var(--lms-t2)',fontSize:14,marginBottom:20}}>This course couldn't be loaded. Please go back and try again.</p>
        <button onClick={onBack} className="cv-btn-primary">← Back to Catalog</button>
      </div>
    </>
  );

  const modules = course.modules || [];
  const mod     = modules[moduleIdx];

  if (!modules.length || !mod) return (
    <>
      <GlobalStyles dark={dark} />
      <div style={{padding:48,textAlign:'center',maxWidth:480,margin:'0 auto'}}>
        <p style={{color:'var(--lms-t2)',marginBottom:20,fontSize:15}}>This course has no modules yet. Check back soon!</p>
        <button onClick={onBack} className="cv-btn-primary">← Back to Catalog</button>
      </div>
    </>
  );

  const isComplete = id => completedIds.has(String(id));
  const modProg    = modProgress.find(mp => String(mp.moduleId) === String(mod._id));
  const allDone    = modules.every(m => isComplete(m._id));
  const bestExam   = progress?.bestExamScore || 0;
  const passed     = bestExam >= (course.passingScore || 70);
  const lm         = LEVEL_COLORS[course.level] || LEVEL_COLORS.beginner;

  const markComplete = async (quizScore = null) => {
    if (!mod || savingModule) return;
    setSavingModule(true);
    try {
      const body = { courseId: course._id, moduleId: mod._id };
      if (quizScore != null) body.quizScore = quizScore;
      const res = await axios.post(`${API()}/api/learning/module-progress`, body, hdrs());
      const upd = res.data.progress;
      setCompletedIds(new Set((upd.completedModules || []).map(String)));
      setModProgress(upd.moduleProgress || []);
      setCourseProgress(upd.progress || 0);
      onProgressUpdate?.();
      toast.success('Progress saved!');
      // auto-advance to next module after short delay
      if (quizScore == null && moduleIdx < modules.length - 1) {
        setTimeout(() => setModuleIdx(i => i + 1), 700);
      }
    } catch { toast.error('Failed to save progress'); }
    finally  { setSavingModule(false); }
  };

  const embedUrl = (url) => {
    if (!url) return null;
    if (url.includes('playlist?list=')) {
      const id = url.split('list=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/videoseries?list=${id}&rel=0&modestbranding=1`;
    }
    if (url.includes('watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
    }
    return null;
  };

  const tabs = [
    { id:'content', label:'Lesson',      icon:'📖', show:true },
    { id:'video',   label:'Video',       icon:'▶',  show:!!(mod.videoUrl) },
    { id:'terms',   label:'Key Terms',   icon:'📝', show:!!(mod.terms?.length) },
    { id:'quiz',    label:'Module Quiz', icon:'✅',  show:!!(mod.quiz?.length) },
  ].filter(t => t.show);

  if (showExam) return (
    <>
      <GlobalStyles dark={dark} />
      <ExamComponent
        course={course}
        onBack={() => setShowExam(false)}
        onComplete={(score) => {
          setShowExam(false);
          onProgressUpdate?.();
          score >= (course.passingScore || 70)
            ? toast.success(`🎓 Passed! Score: ${score}%`, { duration: 4000 })
            : toast.error(`Score: ${score}% – Need ${course.passingScore || 70}% to pass`, { duration: 4000 });
        }}
      />
    </>
  );

  return (
    <>
      <GlobalStyles dark={dark} />
      <style>{`
        .cv-btn-primary{display:inline-flex;align-items:center;gap:6px;padding:10px 22px;background:var(--lms-accent);color:#fff;border:none;border-radius:var(--lms-rs);font-size:14px;font-weight:600;cursor:pointer;transition:opacity .18s;}
        .cv-btn-primary:hover{opacity:.88;}
        .cv-root{min-height:100vh;background:var(--lms-s2);}
        .cv-body{max-width:1380px;margin:0 auto;padding:24px;display:grid;grid-template-columns:260px 1fr;gap:20px;align-items:start;}
        @media(max-width:900px){.cv-body{grid-template-columns:1fr;}.cv-sidebar{display:none;}}

        /* SIDEBAR */
        .cv-sidebar{background:var(--lms-surface);border:1.5px solid var(--lms-border);border-radius:var(--lms-r);overflow:hidden;position:sticky;top:76px;align-self:start;box-shadow:var(--lms-shadow);}
        .cv-sidebar-head{padding:13px 15px;background:var(--lms-s2);border-bottom:1px solid var(--lms-border);display:flex;justify-content:space-between;align-items:center;}
        .cv-sidebar-head h3{font-size:12px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--lms-t3);}
        .cv-sidebar-head span{font-size:12px;font-weight:700;color:var(--lms-accent);}
        .cv-mod-list{max-height:480px;overflow-y:auto;}
        .cv-mod-row{display:flex;align-items:flex-start;gap:10px;width:100%;padding:11px 14px;border:none;background:none;cursor:pointer;font-family:var(--lms-body);text-align:left;border-bottom:1px solid var(--lms-border);transition:background .14s;}
        .cv-mod-row:hover{background:var(--lms-s2);}
        .cv-mod-row.active{background:var(--lms-accentL);}
        .cv-mod-row.done .cv-mod-title-text{color:var(--lms-green);}
        .cv-mod-num{width:22px;height:22px;border-radius:50%;background:var(--lms-s3);border:1.5px solid var(--lms-border);display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;color:var(--lms-t3);flex-shrink:0;margin-top:1px;}
        .cv-mod-row.active .cv-mod-num{background:var(--lms-accent);border-color:var(--lms-accent);color:#fff;}
        .cv-mod-row.done .cv-mod-num{background:var(--lms-greenL);border-color:var(--lms-green);}
        .cv-mod-title-text{font-size:13px;font-weight:500;color:var(--lms-text);line-height:1.4;}
        .cv-mod-row.active .cv-mod-title-text{color:var(--lms-accent);font-weight:600;}
        .cv-mod-time{font-size:11px;color:var(--lms-t3);margin-top:3px;}

        /* EXAM BOX */
        .cv-exam-box{padding:15px;border-top:1px solid var(--lms-border);background:linear-gradient(135deg,var(--lms-amberL),transparent);}
        .cv-exam-box-head{display:flex;align-items:center;gap:7px;font-size:13px;font-weight:700;color:var(--lms-amber);margin-bottom:6px;}
        .cv-exam-box p{font-size:12px;color:var(--lms-t2);margin-bottom:10px;line-height:1.4;}
        .cv-exam-trigger{width:100%;padding:9px 14px;background:var(--lms-amber);color:#fff;border:none;border-radius:var(--lms-rs);font-size:13px;font-weight:700;cursor:pointer;transition:opacity .18s;}
        .cv-exam-trigger:hover:not(:disabled){opacity:.88;}
        .cv-exam-trigger:disabled{background:var(--lms-border);color:var(--lms-t3);cursor:not-allowed;}

        /* CONTENT AREA */
        .cv-content-card{background:var(--lms-surface);border:1.5px solid var(--lms-border);border-radius:var(--lms-r);overflow:hidden;box-shadow:var(--lms-shadow);}
        .cv-content-head{padding:24px 26px 18px;border-bottom:1px solid var(--lms-border);}
        .cv-content-kicker{font-size:11px;font-weight:700;letter-spacing:.07em;color:var(--lms-accent);text-transform:uppercase;margin-bottom:6px;}
        .cv-content-title{font-family:var(--lms-display);font-size:22px;font-weight:800;color:var(--lms-text);line-height:1.25;margin-bottom:12px;}
        .cv-objectives{background:var(--lms-accentL);border-radius:var(--lms-rs);padding:12px 15px;margin-bottom:4px;}
        .cv-obj-label{font-size:11px;font-weight:800;letter-spacing:.06em;color:var(--lms-accent);text-transform:uppercase;margin-bottom:7px;}
        .cv-obj-item{display:flex;align-items:flex-start;gap:7px;font-size:13px;color:var(--lms-t2);margin-bottom:4px;line-height:1.5;}
        .cv-obj-dot{width:5px;height:5px;border-radius:50%;background:var(--lms-accent);flex-shrink:0;margin-top:5px;}

        /* TABS */
        .cv-tabs{display:flex;gap:0;border-bottom:1px solid var(--lms-border);background:var(--lms-s2);padding:0 20px;overflow-x:auto;}
        .cv-tab{display:flex;align-items:center;gap:6px;padding:11px 16px;background:none;border:none;font-size:13px;font-weight:500;color:var(--lms-t2);cursor:pointer;border-bottom:2.5px solid transparent;margin-bottom:-1px;transition:all .18s;white-space:nowrap;}
        .cv-tab:hover{color:var(--lms-accent);}
        .cv-tab.on{color:var(--lms-accent);border-bottom-color:var(--lms-accent);font-weight:700;background:var(--lms-surface);}
        .cv-tab-ico{font-size:12px;}

        /* TAB CONTENT */
        .cv-tab-body{padding:24px 26px;min-height:360px;}

        /* COMPLETION */
        .cv-complete-strip{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 20px;background:var(--lms-greenL);border-top:1px solid var(--lms-border);}
        .cv-complete-done{display:flex;align-items:center;gap:8px;font-size:13px;font-weight:700;color:var(--lms-green);}
        .cv-complete-btn{display:flex;align-items:center;gap:7px;padding:9px 20px;background:var(--lms-green);color:#fff;border:none;border-radius:var(--lms-rs);font-size:13px;font-weight:700;cursor:pointer;transition:opacity .18s;}
        .cv-complete-btn:hover:not(:disabled){opacity:.85;}
        .cv-complete-btn:disabled{opacity:.5;cursor:not-allowed;}

        /* NAV */
        .cv-nav-strip{display:flex;justify-content:space-between;align-items:center;padding:14px 20px;border-top:1px solid var(--lms-border);background:var(--lms-s2);}
        .cv-nav-btn{display:flex;align-items:center;gap:5px;padding:9px 18px;border:1.5px solid var(--lms-border);border-radius:var(--lms-rs);background:var(--lms-surface);font-size:13px;font-weight:600;cursor:pointer;color:var(--lms-t2);transition:all .18s;}
        .cv-nav-btn:hover:not(:disabled){border-color:var(--lms-accent);color:var(--lms-accent);}
        .cv-nav-btn:disabled{opacity:.35;cursor:not-allowed;}
        .cv-nav-btn.next{background:var(--lms-accent);color:#fff;border-color:var(--lms-accent);}
        .cv-nav-btn.next:hover:not(:disabled){opacity:.88;}

        /* TERMS */
        .cv-terms-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;}
        .cv-term{background:var(--lms-s2);border:1.5px solid var(--lms-border);border-radius:var(--lms-rs);padding:14px;border-left:3px solid var(--lms-accent);}
        .cv-term-word{font-size:13px;font-weight:700;color:var(--lms-accent);margin-bottom:5px;}
        .cv-term-def{font-size:13px;color:var(--lms-t2);line-height:1.55;}

        /* PROGRESS BAR */
        .cv-prog-bar-wrap{height:4px;background:var(--lms-border);overflow:hidden;}
        .cv-prog-bar-fill{height:100%;background:var(--lms-accent);transition:width .6s ease;}
        .cv-prog-bar-fill.complete{background:var(--lms-green);}

        /* COMPLETION BADGE */
        .cv-done-badge{display:inline-flex;align-items:center;gap:5px;background:var(--lms-greenL);border:1px solid var(--lms-green);color:var(--lms-green);font-size:12px;font-weight:700;padding:3px 10px;border-radius:100px;}
      `}</style>

      <div className="cv-root">
        {/* Progress bar */}
        <div className="cv-prog-bar-wrap">
          <div className="cv-prog-bar-fill" style={{width:`${courseProgress}%`}} />
        </div>

        <div className="cv-body">
          {/* ── SIDEBAR ── */}
          <aside className="cv-sidebar">
            <div className="cv-sidebar-head">
              <h3>Course Content</h3>
              <span>{completedIds.size}/{modules.length} done</span>
            </div>
            <div className="cv-mod-list">
              {modules.map((m, i) => {
                const done   = isComplete(m._id);
                const active = i === moduleIdx;
                return (
                  <button key={m._id || i}
                    className={`cv-mod-row${active?' active':''}${done?' done':''}`}
                    onClick={() => setModuleIdx(i)}>
                    <div className="cv-mod-num">
                      {done
                        ? <svg width="12" height="12" fill="none" stroke="var(--lms-green)" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                        : i + 1
                      }
                    </div>
                    <div>
                      <div className="cv-mod-title-text">{m.title || `Module ${i+1}`}</div>
                      {m.estimatedMinutes && <div className="cv-mod-time">{m.estimatedMinutes} min</div>}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Exam CTA */}
            {course.exam?.length > 0 && (
              <div className="cv-exam-box">
                <div className="cv-exam-box-head">
                  <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
                  {passed ? 'Exam Passed ✓' : 'Course Exam'}
                </div>
                <p>{course.exam.length} questions · {course.passingScore||70}% to pass{bestExam > 0 ? ` · Best: ${bestExam}%` : ''}</p>
                {!allDone && <p style={{color:'var(--lms-amber)',fontSize:11,marginBottom:8}}>⚠ Complete all modules first</p>}
                <button className="cv-exam-trigger" disabled={!allDone} onClick={() => setShowExam(true)}>
                  {passed ? 'Retake Exam' : allDone ? 'Start Exam →' : 'Locked'}
                </button>
              </div>
            )}
          </aside>

          {/* ── MAIN CONTENT ── */}
          <main>
            <div className="cv-content-card" ref={contentRef}>
              {/* Header */}
              <div className="cv-content-head">
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:12}}>
                  <div style={{flex:1}}>
                    <div className="cv-content-kicker">Module {moduleIdx+1} of {modules.length} · <span style={{color:'var(--lms-t2)',textTransform:'none',fontWeight:500,letterSpacing:0}}>{course.title}</span></div>
                    <h1 className="cv-content-title">{mod.title || `Module ${moduleIdx+1}`}</h1>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:8,flexShrink:0}}>
                    <span style={{padding:'3px 10px',borderRadius:100,fontSize:11,fontWeight:700,color:lm.text,background:lm.bg,border:`1px solid ${lm.border}`,textTransform:'capitalize'}}>{course.level}</span>
                    {isComplete(mod._id) && <span className="cv-done-badge"><svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Done</span>}
                  </div>
                </div>

                {/* Learning objectives */}
                {mod.objectives?.length > 0 && (
                  <div className="cv-objectives">
                    <div className="cv-obj-label">Learning Objectives</div>
                    {mod.objectives.map((o,i) => (
                      <div key={i} className="cv-obj-item">
                        <span className="cv-obj-dot"/>
                        <span>{o}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Tabs */}
              <div className="cv-tabs">
                {tabs.map(t => (
                  <button key={t.id} className={`cv-tab${activeTab===t.id?' on':''}`} onClick={() => setActiveTab(t.id)}>
                    <span className="cv-tab-ico">{t.icon}</span>{t.label}
                  </button>
                ))}
              </div>

              {/* Tab body */}
              <AnimatePresence mode="wait">
                <motion.div key={activeTab} initial={{opacity:0,y:6}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-6}} transition={{duration:.16}} className="cv-tab-body">

                  {activeTab === 'content' && (
                    <div style={{maxWidth:760}}>
                      {renderContent(mod.content)}
                      {!isComplete(mod._id) && (
                        <button
                          className="cv-complete-btn"
                          style={{marginTop:28}}
                          onClick={() => markComplete()}
                          disabled={savingModule}
                        >
                          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                          {savingModule ? 'Saving…' : 'Mark as Complete'}
                        </button>
                      )}
                    </div>
                  )}

                  {activeTab === 'video' && mod.videoUrl && (
                    <div>
                      {embedUrl(mod.videoUrl)
                        ? <iframe src={embedUrl(mod.videoUrl)} title={mod.title||'Video'} frameBorder="0" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture" allowFullScreen style={{width:'100%',aspectRatio:'16/9',borderRadius:var_lms_rs,display:'block'}}/>
                        : <a href={mod.videoUrl} target="_blank" rel="noopener noreferrer" style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:48,background:'var(--lms-s2)',borderRadius:'var(--lms-rs)',border:'2px dashed var(--lms-border)',textDecoration:'none',color:'var(--lms-accent)',fontWeight:600,gap:8}}>
                            <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                            Open Resource ↗
                            <span style={{fontSize:12,color:'var(--lms-t3)',fontWeight:400}}>{mod.videoUrl}</span>
                          </a>
                      }
                    </div>
                  )}

                  {activeTab === 'terms' && (mod.terms?.length > 0) && (
                    <div className="cv-terms-grid">
                      {mod.terms.map((t,i) => (
                        <motion.div key={i} className="cv-term" initial={{opacity:0,scale:.97}} animate={{opacity:1,scale:1}} transition={{delay:i*.03}}>
                          <div className="cv-term-word">{t.term}</div>
                          <div className="cv-term-def">{t.definition}</div>
                        </motion.div>
                      ))}
                    </div>
                  )}

                  {activeTab === 'quiz' && (mod.quiz?.length > 0) && (
                    <QuizComponent
                      quiz={mod.quiz}
                      moduleTitle={mod.title}
                      previousScore={modProg?.quizScore}
                      onComplete={(score) => markComplete(score)}
                    />
                  )}

                </motion.div>
              </AnimatePresence>

              {/* Completion strip (shown if completed) */}
              {isComplete(mod._id) && activeTab === 'content' && (
                <div className="cv-complete-strip">
                  <span className="cv-complete-done">
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                    Module Complete
                  </span>
                  {moduleIdx < modules.length - 1
                    ? <button className="cv-complete-btn" onClick={() => setModuleIdx(i => i + 1)}>Next Module →</button>
                    : allDone && course.exam?.length > 0
                      ? <button className="cv-complete-btn" style={{background:'var(--lms-amber)'}} onClick={() => setShowExam(true)}>Take Course Exam →</button>
                      : <span style={{fontSize:13,color:'var(--lms-green)',fontWeight:700}}>🎓 All modules complete!</span>
                  }
                </div>
              )}

              {/* Navigation row */}
              <div className="cv-nav-strip">
                <button className="cv-nav-btn" onClick={() => setModuleIdx(i => Math.max(0,i-1))} disabled={moduleIdx===0}>
                  ← Prev
                </button>
                <span style={{fontSize:12,color:'var(--lms-t3)',fontWeight:600}}>
                  {moduleIdx+1} / {modules.length} · {courseProgress}% complete
                </span>
                <button className="cv-nav-btn next" onClick={() => setModuleIdx(i => Math.min(modules.length-1,i+1))} disabled={moduleIdx===modules.length-1}>
                  Next →
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
}

// tiny helper to avoid template literal in JSX attr
const var_lms_rs = 'var(--lms-rs)';