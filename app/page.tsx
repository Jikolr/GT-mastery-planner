'use client';

import { useEffect, useMemo, useState } from 'react';
import { CLASS_IDS, CLASS_NAMES, STAT_IDS, STAT_NAMES, bonusPercent, canUpgrade, classTotal, classTotals, deficitFor, emptyLevels, formatDuration, hoursUntilAffordable, targetDate, totalPlannedCost, unlockedCap, upgradeCost, type ClassId, type Levels, type StatId } from './game/mastery';

const STORAGE_KEY = 'gt-mastery-planner-v1';
const number = new Intl.NumberFormat();
const money = (value:number) => `${number.format(value)} GP`;
const clone = (levels:Levels):Levels => structuredClone(levels);
type Saved = { guardianPoints:number; income:number; initial:Levels; planned:Levels };
type Notice = { type:'lock'|'cost'|'ok'; text:string } | null;

function safeSaved(): Saved | null {
  try { const raw=localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) as Saved : null; } catch { return null; }
}

export default function Home() {
  const [guardianPoints,setGuardianPoints]=useState(12500000);
  const [income,setIncome]=useState(11808);
  const [initial,setInitial]=useState<Levels>(emptyLevels);
  const [planned,setPlanned]=useState<Levels>(emptyLevels);
  const [draft,setDraft]=useState<Levels>(emptyLevels);
  const [editing,setEditing]=useState(false);
  const [hydrated,setHydrated]=useState(false);
  const [notice,setNotice]=useState<Notice>(null);
  const [clock,setClock]=useState(() => new Date());

  useEffect(()=>{ const timer=setTimeout(()=>{const saved=safeSaved();if(saved){setGuardianPoints(saved.guardianPoints);setIncome(saved.income);setInitial(saved.initial);setPlanned(saved.planned);setDraft(saved.initial);}setHydrated(true);},0);return()=>clearTimeout(timer); },[]);
  useEffect(()=>{ if(hydrated)localStorage.setItem(STORAGE_KEY,JSON.stringify({guardianPoints,income,initial,planned})); },[guardianPoints,income,initial,planned,hydrated]);
  useEffect(()=>{ const timer=setInterval(()=>setClock(new Date()),60000);return()=>clearInterval(timer); },[]);

  const cost=useMemo(()=>totalPlannedCost(initial,planned),[initial,planned]);
  const remaining=guardianPoints-cost;
  const deficit=deficitFor(remaining);
  const hours=hoursUntilAffordable(deficit,income);
  const eta=deficit>0?targetDate(clock,deficit,income):null;
  const cap=unlockedCap(planned);
  const totals=classTotals(planned);

  function add(classId:ClassId,statId:StatId){
    const check=canUpgrade(planned,classId,statId);
    if(!check.allowed){
      if(check.reason==='cost-unavailable')setNotice({type:'cost',text:`Upgrade cost for level ${planned[classId][statId]+1} is not available yet.`});
      else { const names=(check.blockers??[]).map(id=>`${CLASS_NAMES[id]} → Mastery ${check.cap}`).join(', ');setNotice({type:'lock',text:`${CLASS_NAMES[classId]} cannot exceed mastery ${check.cap} yet. Requires: ${names}.`}); }
      return;
    }
    setPlanned(old=>{const next=clone(old);next[classId][statId]++;return next;});setNotice(null);
  }
  function subtract(classId:ClassId,statId:StatId){ if(planned[classId][statId]<=initial[classId][statId])return;setPlanned(old=>{const next=clone(old);next[classId][statId]--;return next;});setNotice(null); }
  function openEditor(){setDraft(clone(initial));setEditing(true);}
  function confirmEditor(){setInitial(clone(draft));setPlanned(clone(draft));setEditing(false);setNotice({type:'ok',text:'Current levels saved. Your previous plan was reset.'});}
  function resetPlan(){setPlanned(clone(initial));setNotice({type:'ok',text:'Planned upgrades reset to your current levels.'});}
  function clearAll(){const blank=emptyLevels();setGuardianPoints(0);setIncome(0);setInitial(blank);setPlanned(clone(blank));setDraft(clone(blank));localStorage.removeItem(STORAGE_KEY);setNotice({type:'ok',text:'All planner data cleared.'});}

  return <main className="app-shell">
    <header className="topbar"><div className="brand-mark">GT</div><div><p className="eyebrow">Guardian Tales Utility</p><h1>Mastery Planner</h1></div><span className="save-state"><i/> Saved locally</span></header>
    <section className={`summary-card ${remaining<0?'is-negative':''}`}>
      <div className="summary-heading"><div><p className="eyebrow">Your resources</p><h2>Plan without limits</h2></div><div className="actions"><button className="ghost-button" onClick={resetPlan}>Reset plan</button><button className="primary-button" onClick={openEditor}>Edit current levels</button></div></div>
      <div className="summary-grid">
        <label><span>Current Guardian Points</span><input inputMode="numeric" value={guardianPoints} onChange={e=>setGuardianPoints(Math.max(0,Number(e.target.value.replace(/\D/g,''))||0))}/></label>
        <label><span>Guardian Points / hour</span><input inputMode="numeric" value={income} onChange={e=>setIncome(Math.max(0,Number(e.target.value.replace(/\D/g,''))||0))}/></label>
        <div className="metric"><span>Planned upgrade cost</span><strong>{money(cost)}</strong></div>
        <div className="metric highlight"><span>Remaining Guardian Points</span><strong>{remaining<0?'−':''}{money(Math.abs(remaining))}</strong></div>
      </div>
      {deficit>0&&<div className="deficit-strip"><div><span>Missing Guardian Points</span><strong>{money(deficit)}</strong></div>{hours===null?<div className="eta-error"><span>Unable to calculate ETA</span><strong>Income must be greater than 0.</strong></div>:<><div><span>Time required</span><strong>{formatDuration(hours)}</strong></div><div><span>Enough points on</span><strong>{eta?.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'})}</strong></div></>}</div>}
    </section>
    {notice&&<div className={`notice ${notice.type}`} role="status"><span>{notice.type==='lock'?'◆':notice.type==='cost'?'!':'✓'}</span><p>{notice.text}</p><button onClick={()=>setNotice(null)} aria-label="Dismiss message">×</button></div>}
    <section className="mastery-intro"><div><p className="eyebrow">Mastery tracks</p><h2>Shape your next upgrades</h2></div><p>The current shared unlock cap is <b>{cap}</b>. Guardian Point balance never blocks planning; mastery gates always do.</p></section>
    <div className="class-grid">{CLASS_IDS.map((classId,index)=>{
      const total=totals[classId], locked=total>=cap;
      return <article className={`class-card class-${index} ${locked?'locked':''}`} key={classId}>
        <div className="class-header"><div className="class-icon">{CLASS_NAMES[classId][0]}</div><div><h3>{CLASS_NAMES[classId]}</h3><p>Class Mastery <strong>{total}</strong> / {cap}</p></div><span className="ready-pill">{locked?'Locked':'Ready'}</span></div>
        <div className="progress"><span style={{width:`${Math.min(100,total/cap*100)}%`}}/></div>
        {STAT_IDS.map(statId=>{const level=planned[classId][statId];const check=canUpgrade(planned,classId,statId);return <div className="stat-row" key={statId}>
          <div className="stat-info"><strong>{STAT_NAMES[statId]}</strong><span>Initial {initial[classId][statId]} · Bonus +{bonusPercent(statId,level).toFixed(1)}%</span><small>{upgradeCost(level+1)===null?'Next cost unavailable':`Next: ${money(upgradeCost(level+1)!)}`}</small></div>
          <div className="stepper"><button onClick={()=>subtract(classId,statId)} disabled={level<=initial[classId][statId]} aria-label={`Undo ${CLASS_NAMES[classId]} ${STAT_NAMES[statId]}`}>−</button><b>{level}</b><button onClick={()=>add(classId,statId)} className={!check.allowed?'blocked':''} aria-label={`Increase ${CLASS_NAMES[classId]} ${STAT_NAMES[statId]}`}>+</button></div>
        </div>})}
        {locked&&<p className="lock-hint">All classes must reach mastery {cap} to unlock levels {cap+1}–{cap+10}.</p>}
      </article>})}</div>
    <footer><button onClick={clearAll}>Clear all saved data</button><span>Costs available through individual stat level 69.</span></footer>
    {editing&&<div className="modal-backdrop" role="presentation"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-title"><div className="modal-head"><div><p className="eyebrow">Real account state</p><h2 id="edit-title">Edit current levels</h2></div><button onClick={()=>setEditing(false)} aria-label="Close">×</button></div><p className="modal-copy">Enter each stat’s real level. Saving resets all planned upgrades so the plan stays consistent.</p><div className="level-editor">{CLASS_IDS.map(classId=><fieldset key={classId}><legend>{CLASS_NAMES[classId]}</legend>{STAT_IDS.map(statId=><label key={statId}><span>{STAT_NAMES[statId]}</span><input type="number" min="0" max="69" value={draft[classId][statId]} onChange={e=>setDraft(old=>{const next=clone(old);next[classId][statId]=Math.max(0,Math.min(69,Math.floor(Number(e.target.value)||0)));return next;})}/></label>)}<strong>Mastery {classTotal(draft,classId)}</strong></fieldset>)}</div><div className="modal-actions"><button className="ghost-button" onClick={()=>setEditing(false)}>Cancel</button><button className="primary-button" onClick={confirmEditor}>Save & reset plan</button></div></section></div>}
  </main>;
}
