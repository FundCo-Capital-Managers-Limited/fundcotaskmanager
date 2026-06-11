// frontend/src/components/lms/AIChat.jsx
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';

const hdrs = () => ({ headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
const API  = () => import.meta.env.VITE_API_URL;

const DEFAULT_SUGGESTIONS = [
  'What training should I start with?',
  'Explain what PuE means',
  'Summarise the LOTO procedure',
  'What is the GroSolar SaaS model?',
];

export default function AIChat({ courseId=null, moduleId=null, compact=false }) {
  const [question,  setQuestion]  = useState('');
  const [history,   setHistory]   = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [collapsed, setCollapsed] = useState(compact);
  const chatEndRef = useRef(null);
  const inputRef   = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior:'smooth' });
  }, [history]);

  const send = async (q) => {
    const text = (q || question).trim();
    if (!text || loading) return;
    setHistory(h => [...h, { role:'user', text }]);
    setLoading(true);
    setQuestion('');
    try {
      const res = await axios.post(`${API()}/api/learning/ai-query`, {
        question: text, courseId, moduleId,
      }, hdrs());
      setHistory(h => [...h, { role:'assistant', text: res.data.answer }]);
    } catch {
      setHistory(h => [...h, { role:'assistant', text:"Sorry, I'm having trouble connecting. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{background:'var(--lms-surface)',border:'1.5px solid var(--lms-border)',borderRadius:'var(--lms-r)',overflow:'hidden',boxShadow:'var(--lms-shadow)'}}>
      {/* Header */}
      <div onClick={()=>setCollapsed(v=>!v)}
        style={{padding:'12px 14px',background:'var(--lms-s2)',borderBottom:'1px solid var(--lms-border)',display:'flex',alignItems:'center',gap:8,cursor:'pointer',userSelect:'none'}}>
        <div style={{width:30,height:30,borderRadius:'50%',background:'linear-gradient(135deg,#1d4ed8,#7c3aed)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="14" height="14" fill="#fff" viewBox="0 0 24 24"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z" opacity=".3"/><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 0 2h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1 0-2h1a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2z"/></svg>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:13,fontWeight:700,color:'var(--lms-text)'}}>AI Mentor</div>
          <div style={{fontSize:10,color:'var(--lms-t3)'}}>FundCo Knowledge Assistant</div>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <div style={{width:7,height:7,borderRadius:'50%',background:'#22c55e',border:'1.5px solid var(--lms-surface)'}} title="Online"/>
          <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{color:'var(--lms-t3)',transform:collapsed?'rotate(180deg)':'',transition:'transform .2s'}}><polyline points="18 15 12 9 6 15"/></svg>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div initial={{height:0,opacity:0}} animate={{height:'auto',opacity:1}} exit={{height:0,opacity:0}} transition={{duration:.2}} style={{overflow:'hidden'}}>
            {/* Messages */}
            <div style={{height:220,overflowY:'auto',padding:12,display:'flex',flexDirection:'column',gap:8,background:'linear-gradient(to bottom,var(--lms-s2),var(--lms-surface))'}}>
              {history.length===0 && (
                <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',textAlign:'center',color:'var(--lms-t3)',fontSize:13,gap:8}}>
                  <svg width="28" height="28" fill="none" stroke="var(--lms-t3)" strokeWidth="1.5" viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>Ask me anything about FundCo training materials, SOPs, or company knowledge.</span>
                </div>
              )}
              {history.map((msg,i) => (
                <div key={i} style={{
                  maxWidth:'88%',padding:'9px 12px',borderRadius:10,fontSize:13,lineHeight:1.55,
                  ...(msg.role==='user'
                    ? {background:'var(--lms-accent)',color:'#fff',marginLeft:'auto',borderBottomRightRadius:3}
                    : {background:'var(--lms-s2)',color:'var(--lms-text)',border:'1px solid var(--lms-border)',borderBottomLeftRadius:3}
                  )
                }}>
                  {msg.text.split('\n').map((line,j) => line.trim() ? <p key={j} style={{margin:'0 0 3px'}}>{line}</p> : null)}
                </div>
              ))}
              {loading && (
                <div style={{background:'var(--lms-s2)',border:'1px solid var(--lms-border)',borderRadius:10,borderBottomLeftRadius:3,padding:'10px 14px',maxWidth:'60%',display:'flex',gap:5,alignItems:'center'}}>
                  {[0,1,2].map(i=>(
                    <div key={i} style={{width:6,height:6,borderRadius:'50%',background:'var(--lms-accent)',animation:`aic-dot 1.2s ease-in-out ${i*.18}s infinite`}}/>
                  ))}
                </div>
              )}
              <div ref={chatEndRef}/>
            </div>

            {/* Suggestions */}
            {history.length<2 && (
              <div style={{padding:'8px 10px',display:'flex',flexWrap:'wrap',gap:5,borderTop:'1px solid var(--lms-border)'}}>
                {DEFAULT_SUGGESTIONS.map((s,i)=>(
                  <button key={i} onClick={()=>send(s)}
                    style={{padding:'4px 10px',background:'var(--lms-accentL)',border:'1px solid var(--lms-border)',borderRadius:100,fontSize:11,fontWeight:500,color:'var(--lms-accent)',cursor:'pointer',transition:'all .15s',whiteSpace:'nowrap'}}>
                    {s}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <form style={{display:'flex',borderTop:'1px solid var(--lms-border)'}} onSubmit={e=>{e.preventDefault();send();}}>
              <input ref={inputRef} value={question} onChange={e=>setQuestion(e.target.value)}
                placeholder="Ask the AI Mentor…" disabled={loading}
                style={{flex:1,padding:'11px 14px',border:'none',outline:'none',fontSize:13,background:'var(--lms-surface)',color:'var(--lms-text)'}}/>
              <button type="submit" disabled={!question.trim()||loading}
                style={{padding:'0 16px',background:'var(--lms-accent)',color:'#fff',border:'none',cursor:'pointer',transition:'opacity .18s',opacity:!question.trim()||loading?.45:1,display:'flex',alignItems:'center'}}>
                {loading
                  ? <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" style={{animation:'aic-spin .7s linear infinite'}}><circle cx="12" cy="12" r="10" strokeDasharray="31.4" strokeDashoffset="10"/></svg>
                  : <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                }
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes aic-dot{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
        @keyframes aic-spin{to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}