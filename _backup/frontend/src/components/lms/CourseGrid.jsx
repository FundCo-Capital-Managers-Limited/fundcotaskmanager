// frontend/src/components/lms/CourseGrid.jsx
import React from 'react';
import { motion } from 'framer-motion';

const LVL = {
  beginner:     { label:'Beginner',     color:'#16a34a', bg:'rgba(22,163,74,.1)',   border:'rgba(22,163,74,.25)'   },
  intermediate: { label:'Intermediate', color:'#d97706', bg:'rgba(217,119,6,.1)',   border:'rgba(217,119,6,.25)'   },
  expert:       { label:'Expert',       color:'#7c3aed', bg:'rgba(124,58,237,.1)',  border:'rgba(124,58,237,.25)'  },
};

const AC_COLORS = {
  General:   '#60a5fa', EML:'#34d399', GroSolar:'#fbbf24', Agronomie:'#86efac', SSM:'#c084fc',
};

function Skeleton() {
  return (
    <div style={{background:'var(--lms-surface)',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-r)',padding:20,animation:'sk-pulse 1.4s ease-in-out infinite'}}>
      {[40,80,60,100,50].map((w,i) => <div key={i} style={{height:i===1?18:12,background:'var(--lms-s3)',borderRadius:6,width:`${w}%`,marginBottom:10}}/>)}
      <style>{`@keyframes sk-pulse{0%,100%{opacity:1}50%{opacity:.45}}`}</style>
    </div>
  );
}

function CourseCard({ course, prog, onSelect, idx }) {
  const p       = prog?.progress || 0;
  const lm      = LVL[course.level] || LVL.beginner;
  const nMods   = course.modules?.length || 0;
  const estHrs  = Math.ceil(nMods * 2);
  const cert    = prog?.certificationEarned;
  const started = p > 0;

  return (
    <motion.div
      initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{delay:idx*.045,duration:.28}}
      onClick={() => onSelect(course)}
      role="button" tabIndex={0} onKeyDown={e=>e.key==='Enter'&&onSelect(course)}
      aria-label={`Open: ${course.title}`}
      style={{
        background:'var(--lms-surface)',border:'1.5px solid var(--lms-border)',
        borderRadius:'var(--lms-r)',padding:20,cursor:'pointer',
        display:'flex',flexDirection:'column',
        transition:'box-shadow .2s,border-color .2s,transform .15s',
      }}
      whileHover={{boxShadow:'var(--lms-shadowH)',y:-2}}
    >
      {/* Top badges */}
      <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:12}}>
        <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:100,color:lm.color,background:lm.bg,border:`1px solid ${lm.border}`}}>{lm.label}</span>
        <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:100,color:AC_COLORS[course.assetco]||'var(--lms-accent)',background:'var(--lms-s2)',border:'1px solid var(--lms-border)'}}>{course.assetco}</span>
        {course.required && (
          <span style={{fontSize:11,fontWeight:700,padding:'3px 9px',borderRadius:100,color:'#dc2626',background:'#fee2e2',border:'1px solid #fca5a5',display:'flex',alignItems:'center',gap:3}}>
            <svg width="9" height="9" fill="currentColor" viewBox="0 0 24 24"><path d="M12 1C5.9 1 1 5.9 1 12s4.9 11 11 11 11-4.9 11-11S18.1 1 12 1zm.5 6h-1v6h1V7zm0 8h-1v1.5h1V15z"/></svg>Required
          </span>
        )}
      </div>

      {/* Title */}
      <h3 style={{fontFamily:'var(--lms-display)',fontSize:15,fontWeight:800,color:'var(--lms-text)',margin:'0 0 7px',lineHeight:1.35,display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'}}>{course.title}</h3>

      {/* Description */}
      <p style={{fontSize:13,color:'var(--lms-t2)',lineHeight:1.55,margin:'0 0 14px',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',flex:1}}>{course.description}</p>

      {/* Meta row */}
      <div style={{display:'flex',flexWrap:'wrap',gap:10,marginBottom:14,fontSize:12,color:'var(--lms-t3)'}}>
        <span style={{display:'flex',alignItems:'center',gap:4}}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          {nMods} module{nMods!==1?'s':''}
        </span>
        <span style={{display:'flex',alignItems:'center',gap:4}}>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          ~{estHrs}h
        </span>
        {course.exam?.length > 0 && (
          <span style={{display:'flex',alignItems:'center',gap:4}}>
            <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            {course.exam.length}Q exam
          </span>
        )}
      </div>

      {/* Progress */}
      <div style={{marginTop:'auto'}}>
        <div style={{height:5,background:'var(--lms-s3)',borderRadius:100,overflow:'hidden',marginBottom:8}}>
          <div style={{height:'100%',width:`${p}%`,background:p===100?'var(--lms-green)':'var(--lms-accent)',borderRadius:100,transition:'width .6s ease'}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',fontSize:12}}>
          <span style={{fontWeight:700,color:p===100?'var(--lms-green)':'var(--lms-accent)'}}>{p}% complete</span>
          <span style={{display:'flex',alignItems:'center',gap:5}}>
            {cert && <span style={{color:'var(--lms-amber)',display:'flex',alignItems:'center',gap:3,fontSize:11,fontWeight:700}}>
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>Certified
            </span>}
            {p===100
              ? <span style={{color:'var(--lms-green)',fontWeight:700,display:'flex',alignItems:'center',gap:3}}><svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>Done</span>
              : started
                ? <span style={{color:'var(--lms-accent)',fontWeight:600}}>Continue →</span>
                : <span style={{color:'var(--lms-t3)'}}>Start ▶</span>
            }
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default function CourseGrid({ courses, progressMap, loading, onSelect }) {
  if (loading) return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
      {Array.from({length:6}).map((_,i) => <Skeleton key={i}/>)}
    </div>
  );

  if (!courses.length) return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}}
      style={{textAlign:'center',padding:'64px 24px',background:'var(--lms-surface)',border:'2px dashed var(--lms-border)',borderRadius:'var(--lms-r)'}}>
      <svg width="40" height="40" fill="none" stroke="var(--lms-t3)" strokeWidth="1.5" viewBox="0 0 24 24" style={{marginBottom:14,display:'block',margin:'0 auto 14px'}}>
        <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
      </svg>
      <h3 style={{fontFamily:'var(--lms-display)',fontSize:17,margin:'0 0 8px',color:'var(--lms-text)'}}>No courses found</h3>
      <p style={{color:'var(--lms-t2)',fontSize:14}}>Try different keywords or clear your filters.</p>
    </motion.div>
  );

  const order = ['beginner','intermediate','expert'];
  const groups = {};
  courses.forEach(c => { if (!groups[c.level]) groups[c.level]=[]; groups[c.level].push(c); });

  return (
    <>
      {order.filter(l => groups[l]?.length).map(level => (
        <section key={level} style={{marginBottom:36}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16}}>
            <span style={{width:10,height:10,borderRadius:'50%',background:LVL[level].color,display:'inline-block',flexShrink:0}}/>
            <h2 style={{fontFamily:'var(--lms-display)',fontSize:17,fontWeight:800,color:'var(--lms-text)',margin:0}}>{LVL[level].label} Training</h2>
            <span style={{fontSize:12,color:'var(--lms-t3)',background:'var(--lms-s3)',border:'1px solid var(--lms-border)',borderRadius:100,padding:'2px 9px'}}>{groups[level].length} course{groups[level].length!==1?'s':''}</span>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:16}}>
            {groups[level].map((c,i) => (
              <CourseCard key={c._id} course={c} prog={progressMap[String(c._id)]} onSelect={onSelect} idx={i}/>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}