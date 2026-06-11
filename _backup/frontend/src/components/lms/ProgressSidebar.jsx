// frontend/src/components/lms/ProgressSidebar.jsx
import React from 'react';
import { motion } from 'framer-motion';

const BADGES = [
  { id:'starter',  label:'Starter',  threshold:1,   color:'#64748b', check: (p,pct) => p.length>0 },
  { id:'bronze',   label:'Bronze',   threshold:25,  color:'#b45309', check: (_,pct) => pct>=25  },
  { id:'silver',   label:'Silver',   threshold:50,  color:'#6b7280', check: (_,pct) => pct>=50  },
  { id:'gold',     label:'Gold',     threshold:75,  color:'#d97706', check: (_,pct) => pct>=75  },
  { id:'platinum', label:'Platinum', threshold:100, color:'#2563eb', check: (_,pct) => pct>=100 },
];

export default function ProgressSidebar({ progress, courses, stats, onSelect }) {
  const overall  = stats?.overallProgress || 0;
  const certCount = progress.filter(p => p.certificationEarned).length;

  const progressMap = progress.reduce((acc, p) => {
    acc[String(p.courseId?._id || p.courseId)] = p;
    return acc;
  }, {});

  const earnedBadges = BADGES.filter(b => b.check(progress, overall));

  const requiredPending = courses.filter(c => c.required &&
    (progressMap[String(c._id)]?.progress || 0) < 100
  ).length;

  return (
    <div style={{background:'var(--lms-surface)',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-r)',overflow:'hidden',boxShadow:'var(--lms-shadow)'}}>
      {/* Header */}
      <div style={{padding:'13px 16px',background:'var(--lms-s2)',borderBottom:'1px solid var(--lms-border)',display:'flex',alignItems:'center',gap:7,fontSize:12,fontWeight:800,letterSpacing:'.05em',textTransform:'uppercase',color:'var(--lms-t3)'}}>
        <svg width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        Your Progress
      </div>

      {/* Ring + mini stats */}
      <div style={{padding:'18px 16px',borderBottom:'1px solid var(--lms-border)',display:'flex',alignItems:'center',gap:16}}>
        {/* SVG ring */}
        <div style={{position:'relative',width:80,height:80,flexShrink:0}}>
          <svg width="80" height="80" style={{transform:'rotate(-90deg)'}}>
            <circle cx="40" cy="40" r="33" fill="none" stroke="var(--lms-s3)" strokeWidth="7"/>
            <circle cx="40" cy="40" r="33" fill="none"
              stroke={overall===100?'var(--lms-green)':'var(--lms-accent)'} strokeWidth="7"
              strokeDasharray={`${2*Math.PI*33*overall/100} ${2*Math.PI*33}`}
              strokeLinecap="round"
              style={{transition:'stroke-dasharray .8s ease'}}/>
          </svg>
          <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
            <span style={{fontFamily:'var(--lms-display)',fontSize:17,fontWeight:900,color:'var(--lms-accent)',lineHeight:1}}>{overall}%</span>
            <span style={{fontSize:9,color:'var(--lms-t3)',marginTop:2}}>Done</span>
          </div>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontFamily:'var(--lms-display)',fontSize:20,fontWeight:900,color:'var(--lms-green)',lineHeight:1}}>{stats?.completedCourses||0}</span>
            <span style={{fontSize:12,color:'var(--lms-t2)'}}>Courses<br/>complete</span>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{fontFamily:'var(--lms-display)',fontSize:20,fontWeight:900,color:'var(--lms-amber)',lineHeight:1}}>{certCount}</span>
            <span style={{fontSize:12,color:'var(--lms-t2)'}}>Certifi-<br/>cations</span>
          </div>
        </div>
      </div>

      {/* Badges */}
      <div style={{padding:'14px 16px',borderBottom:'1px solid var(--lms-border)'}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--lms-t3)',marginBottom:10,display:'flex',alignItems:'center',gap:5}}>
          <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>
          Achievements
        </div>
        <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
          {BADGES.map((b,i) => {
            const earned = earnedBadges.find(e=>e.id===b.id);
            return (
              <motion.div key={b.id} title={earned?`Earned: ${b.label}`:`${b.label} — ${b.threshold}% overall required`}
                initial={{scale:.8,opacity:0}} animate={{scale:1,opacity:1}} transition={{delay:i*.06}}
                style={{display:'flex',alignItems:'center',gap:5,padding:'4px 10px',borderRadius:100,fontSize:11,fontWeight:600,border:'1.5px solid',borderColor:earned?b.color:'var(--lms-border)',color:earned?b.color:'var(--lms-t3)',background:earned?'transparent':'var(--lms-s2)',opacity:earned?1:.55,cursor:'default'}}>
                <svg width="11" height="11" fill={earned?b.color:'var(--lms-t3)'} viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" fill={earned?b.color:'var(--lms-t3)'}/></svg>
                {b.label}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Course progress list */}
      <div style={{padding:'14px 16px',borderBottom:'1px solid var(--lms-border)'}}>
        <div style={{fontSize:10,fontWeight:800,letterSpacing:'.07em',textTransform:'uppercase',color:'var(--lms-t3)',marginBottom:10}}>Course Breakdown</div>
        <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:200,overflowY:'auto'}}>
          {courses.slice(0,10).map(c => {
            const p   = progressMap[String(c._id)];
            const pct = p?.progress || 0;
            const cert = p?.certificationEarned;
            return (
              <button key={c._id} onClick={()=>onSelect?.(c)}
                style={{background:'none',border:'none',cursor:'pointer',fontFamily:'var(--lms-body)',textAlign:'left',padding:'4px 0',borderRadius:'var(--lms-rx)',transition:'background .12s'}}
                onMouseEnter={e=>e.currentTarget.style.background='var(--lms-s2)'}
                onMouseLeave={e=>e.currentTarget.style.background='none'}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:6,marginBottom:4}}>
                  <span style={{fontSize:12,fontWeight:500,color:'var(--lms-text)',display:'-webkit-box',WebkitLineClamp:1,WebkitBoxOrient:'vertical',overflow:'hidden',flex:1}}>{c.title}</span>
                  <div style={{display:'flex',alignItems:'center',gap:4,flexShrink:0}}>
                    {cert && <svg width="11" height="11" fill="var(--lms-amber)" viewBox="0 0 24 24"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" fill="var(--lms-amber)"/></svg>}
                    <span style={{fontSize:11,fontWeight:700,color:pct===100?'var(--lms-green)':'var(--lms-t3)'}}>{pct}%</span>
                  </div>
                </div>
                <div style={{height:3,background:'var(--lms-s3)',borderRadius:100,overflow:'hidden'}}>
                  <div style={{height:'100%',width:`${pct}%`,background:pct===100?'var(--lms-green)':'var(--lms-accent)',borderRadius:100,transition:'width .6s ease'}}/>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Required alert */}
      {requiredPending > 0 && (
        <div style={{padding:'12px 16px',background:'var(--lms-amberL)',display:'flex',alignItems:'flex-start',gap:10}}>
          <svg width="14" height="14" fill="none" stroke="var(--lms-amber)" strokeWidth="2" viewBox="0 0 24 24" style={{flexShrink:0,marginTop:1}}><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          <div>
            <div style={{fontSize:12,fontWeight:700,color:'var(--lms-amber)'}}>
              {requiredPending} required course{requiredPending>1?'s':''} pending
            </div>
            <div style={{fontSize:11,color:'var(--lms-t2)',marginTop:2,lineHeight:1.4}}>
              Complete all required training to stay compliant.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}