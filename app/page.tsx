'use client';
import React, { useState, useEffect } from 'react';

interface BoardItem {
  ID: string; 프로젝트ID: string; 제목: string; 설명: string;
  유형: string; 상태: string; 우선순위: string; 시작일: string; 목표일: string; 메모: string;
}
interface Memo {
  ID: string; 미팅명: string; 날짜: string; 참석자: string; 내용: string; 액션아이템: string; 상태: string; 생성일: string; 수정일: string;
}

const PASSWORD = 'selvatico2026';

const toISO = (d: string) => {
  if (!d) return '';
  d = d.replace(/^'/, '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  const m = d.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  return d;
};

const PROJ_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#A855F7','#06B6D4','#F97316'];
const STATUS_COLOR: Record<string,string> = { '진행중':'#3B82F6','완료':'#22C55E','대기':'#94A3B8','보류':'#F59E0B' };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#faf8f4', border: '1px solid #e0d8c8',
  borderRadius: '8px', color: '#2c2620', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
};

export default function Home() {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<'home'|'board'|'memo'>('home');
  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProjId, setSelectedProjId] = useState<string|null>(null);
  const [hoveredProj, setHoveredProj] = useState<string|null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedMemo, setSelectedMemo] = useState<Memo|null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [editingItem, setEditingItem] = useState<BoardItem|null>(null);
  const [showAlarm, setShowAlarm] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');

  const [newGroupTitle, setNewGroupTitle] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [memoForm, setMemoForm] = useState({ 미팅명:'', 날짜:'', 참석자:'', 내용:'', 액션아이템:'' });
  const [editingMemoId, setEditingMemoId] = useState<string|null>(null);
  const [inlineMemoForm, setInlineMemoForm] = useState({ 미팅명:'', 날짜:'', 참석자:'', 내용:'', 액션아이템:'' });
  const [showBoardForm, setShowBoardForm] = useState(false);
  const [boardMemo, setBoardMemo] = useState('');
  const [editingProj, setEditingProj] = useState(false);
  const [editProjForm, setEditProjForm] = useState<any>({});
  const [savingMemo, setSavingMemo] = useState(false);
  const [showMemoForm, setShowMemoForm] = useState(false);
  const [memoSearch, setMemoSearch] = useState('');
  const [boardForm, setBoardForm] = useState({ 제목:'', 설명:'', 상태:'진행중', 시작일:'', 목표일:'', 메모:'' });

  useEffect(() => { if (sessionStorage.getItem('pd_auth')==='true') setAuth(true); }, []);
  useEffect(() => { setBoardMemo(selectedProj?.메모||''); }, [selectedProjId]);

  const loadBoard = async () => {
    const res = await fetch('/api/project').then(r => r.json());
    const items = Array.isArray(res) ? res.filter((x:BoardItem)=>x.ID).map((x:BoardItem)=>({...x, 시작일:toISO(x.시작일||''), 목표일:toISO(x.목표일||'')})) : [];
    setBoardItems(items);
    // 선택된 업무 없으면 첫 번째 업무 자동 선택
    setSelectedProjId(prev => {
      if (prev) return prev;
      const first = items.find(x => x.유형 === '업무');
      return first ? first.ID : null;
    });
  };



  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.all([fetch('/api/project').then(r=>r.json()), fetch('/api/memo').then(r=>r.json())])
      .then(([b,m]) => {
        const items = Array.isArray(b) ? b.filter((x:BoardItem)=>x.ID).map((x:BoardItem)=>({...x, 시작일:toISO(x.시작일||''), 목표일:toISO(x.목표일||'')})) : [];
        setBoardItems(items);
        setSelectedProjId(prev => {
          if (prev) return prev;
          const first = items.find((x:BoardItem) => x.유형 === '업무');
          return first ? first.ID : null;
        });
        setMemos(Array.isArray(m) ? m.filter((x:Memo)=>x.ID) : []);
      }).finally(()=>setLoading(false));
  }, [auth]);

  const nextId = (list:any[]) => list.length===0 ? '1' : String(Math.max(...list.map(x=>Number(x.ID)||0))+1);

  const handleLogin = () => {
    if (pw===PASSWORD) { setAuth(true); sessionStorage.setItem('pd_auth','true'); }
    else { setPwError(true); setTimeout(()=>setPwError(false),2000); }
  };

  const handleSave = async () => {
    const method = editItem ? 'PUT' : 'POST';
    const body = editItem
      ? { ...form, ID: editItem.ID, 유형: editItem.유형 || '업무', 프로젝트ID: editItem.프로젝트ID || '' }
      : { ...form, ID: nextId(boardItems), 유형: form.유형 || '업무', 프로젝트ID: '' };
    await fetch('/api/project', { method, headers:{'Content-Type':'application/json'}, body:JSON.stringify(body) });
    await loadBoard();
    setShowModal(false);
  };

  const handleDelete = async (item:any) => {
    if (!confirm('삭제할까요?')) return;
    if (item.미팅명 !== undefined) {
      await fetch('/api/memo', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ID:item.ID}) });
      const res = await fetch('/api/memo').then(r=>r.json());
      setMemos(Array.isArray(res) ? res.filter((x:Memo)=>x.ID) : []);
      setSelectedMemo(null);
    } else {
      await fetch('/api/project', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ID:item.ID}) });
      await loadBoard();
      if (selectedProjId===item.ID) setSelectedProjId(null);
    }
  };

  const handleStatusChange = async (item:BoardItem, newStatus:string) => {
    const allItems = await fetch('/api/project').then(r=>r.json());
    if (item.유형==='업무') {
      await fetch('/api/project', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...item, 상태:newStatus}) });
      if (newStatus==='완료') {
        const tasks = allItems.filter((x:BoardItem)=>x.프로젝트ID===item.ID && x.유형==='태스크');
        for (const t of tasks) await fetch('/api/project', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...t, 상태:'완료'}) });
      }
    } else {
      await fetch('/api/project', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...item, 상태:newStatus}) });
      if (item.프로젝트ID) {
        const updated = await fetch('/api/project').then(r=>r.json());
        const tasks = updated.filter((x:BoardItem)=>x.프로젝트ID===item.프로젝트ID && x.유형==='태스크');
        const done = tasks.filter((x:BoardItem)=>x.상태==='완료').length;
        const progress = tasks.length>0 ? Math.round(done/tasks.length*100) : 0;
        const proj = updated.find((x:BoardItem)=>x.ID===item.프로젝트ID);
        if (proj) {
          const newProjStatus = progress===100 ? '완료' : proj.상태==='완료' ? '진행중' : proj.상태;
          await fetch('/api/project', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...proj, 상태:newProjStatus}) });
        }
      }
    }
    await loadBoard();
  };

  const handleAddTask = async () => {
    if (!selectedProjId||!newTaskTitle.trim()) return;
    await fetch('/api/project', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ID:nextId(boardItems), 프로젝트ID:selectedProjId, 제목:newTaskTitle.trim(), 설명:'', 유형:'태스크', 상태:'대기', 우선순위:'보통', 시작일:'', 목표일:newTaskDue||'', 메모:''}) });
    setNewTaskTitle(''); setNewTaskDue('');
    await loadBoard();
  };

  const handleAddGroup = async () => {
    if (!selectedProjId||!newGroupTitle.trim()) return;
    await fetch('/api/project', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ID:nextId(boardItems), 프로젝트ID:selectedProjId, 제목:newGroupTitle.trim(), 설명:'', 유형:'그룹', 상태:'', 우선순위:'', 시작일:'', 목표일:'', 메모:''}) });
    setNewGroupTitle('');
    await loadBoard();
  };

  const handleSaveBoardMemo = async () => {
    if (!selectedProj) return;
    setSavingMemo(true);
    await fetch('/api/project',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...selectedProj,메모:boardMemo})});
    await loadBoard();
    setSavingMemo(false);
  };

  const handleDeleteAllItems = async () => {
    if (!selectedProjId) return;
    const targets = boardItems.filter(x => x.프로젝트ID === selectedProjId);
    if (targets.length === 0) { alert('삭제할 항목이 없어요.'); return; }
    if (!confirm(`그룹/태스크 ${targets.length}개를 전체 삭제할까요?\n업무는 유지됩니다.`)) return;
    for (const item of targets) {
      await fetch('/api/project', { method:'DELETE', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ID:item.ID}) });
    }
    await loadBoard();
  };

  const projectsRaw = boardItems.filter(x=>x.유형==='업무');
  const projects = (() => {
    const active = projectsRaw.filter(p => p.상태 !== '완료');
    const done = projectsRaw.filter(p => p.상태 === '완료');
    // 활성 업무: 목표일 오름차순 (임박 순), 목표일 없으면 뒤로
    const sortedActive = [...active].sort((a,b) => {
      if (!a.목표일 && !b.목표일) return 0;
      if (!a.목표일) return 1;
      if (!b.목표일) return -1;
      return a.목표일.localeCompare(b.목표일);
    });
    return [...sortedActive, ...done];
  })();
  const selectedProj = selectedProjId ? projects.find(p=>p.ID===selectedProjId) : null;
  const projItems = selectedProjId ? boardItems.filter(x=>x.프로젝트ID===selectedProjId) : [];
  // 선택된 프로젝트 메모 동기화
  if (selectedProj && boardMemo !== (selectedProj.메모||'') && !savingMemo) {
    // 초기 로드 시 메모 설정은 useEffect로 처리
  }
  const projTasks = projItems.filter(x=>x.유형==='태스크');
  const completedCount = projTasks.filter(x=>x.상태==='완료').length;
  const progress = projTasks.length>0 ? Math.round(completedCount/projTasks.length*100) : 0;

  const sidebarBtn = (t: 'home'|'board'|'memo', label: string) => (
    <button key={t} onClick={()=>setTab(t)} style={{ padding:'9px 12px', borderRadius:'8px', border:'none', cursor:'pointer', fontSize:'13px', fontWeight: tab===t ? 600 : 400, textAlign:'left', background: tab===t ? '#c4a882' : 'transparent', color: tab===t ? '#fff' : '#7a6e5e', transition:'all 0.15s', width:'100%' }}>{label}</button>
  );

  if (!auth) return (
    <div style={{ minHeight:'100vh', background:'#faf8f4', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Arial, sans-serif' }}>
      <div style={{ background:'#f2ede4', borderRadius:'16px', padding:'48px 40px', width:'340px', border:'1px solid #e0d8c8', boxShadow:'0 8px 30px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize:'11px', color:'#9a8e7e', letterSpacing:'0.15em', margin:'0 0 8px' }}>PERSONAL WORKSPACE</p>
        <h1 style={{ fontSize:'24px', fontWeight:700, color:'#2c2620', margin:'0 0 32px' }}>전동열</h1>
        <input type="password" placeholder="비밀번호 입력" value={pw}
          onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleLogin()}
          style={{ width:'100%', padding:'12px 16px', background:'#faf8f4', border:`1px solid ${pwError?'#e05a4e':'#e0d8c8'}`, borderRadius:'8px', color:'#2c2620', fontSize:'14px', outline:'none', boxSizing:'border-box', marginBottom:'8px' }} />
        {pwError && <p style={{ color:'#e05a4e', fontSize:'12px', margin:'0 0 12px' }}>비밀번호가 틀렸어요.</p>}
        <button onClick={handleLogin} style={{ width:'100%', padding:'12px', background:'#c4a882', border:'none', borderRadius:'8px', color:'#fff', fontSize:'14px', fontWeight:600, cursor:'pointer', marginTop:'8px' }}>로그인</button>
      </div>
    </div>
  );

  // 달력 공통 계산
  const calFirstDay = new Date(calYear, calMonth, 1).getDay();
  const calDaysInMonth = new Date(calYear, calMonth+1, 0).getDate();
  const calPrevDays = new Date(calYear, calMonth, 0).getDate();
  const calTotalCells = Math.ceil((calFirstDay+calDaysInMonth)/7)*7;
  const calToday = new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).toLocaleDateString('en-CA');
  const calCells: {date:string;day:number;current:boolean}[] = [];
  for (let i=0; i<calTotalCells; i++) {
    if (i<calFirstDay) { const d=calPrevDays-calFirstDay+i+1; const pm=calMonth===0?12:calMonth; const py=calMonth===0?calYear-1:calYear; calCells.push({date:`${py}-${String(pm).padStart(2,'0')}-${String(d).padStart(2,'0')}`,day:d,current:false}); }
    else if (i<calFirstDay+calDaysInMonth) { const d=i-calFirstDay+1; calCells.push({date:`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`,day:d,current:true}); }
    else { const d=i-calFirstDay-calDaysInMonth+1; const nm=calMonth===11?1:calMonth+2; const ny=calMonth===11?calYear+1:calYear; calCells.push({date:`${ny}-${String(nm).padStart(2,'0')}-${String(d).padStart(2,'0')}`,day:d,current:false}); }
  }
  const calRows: typeof calCells[] = [];
  for (let i=0; i<calCells.length; i+=7) calRows.push(calCells.slice(i,i+7));
  const monthStart=`${calYear}-${String(calMonth+1).padStart(2,'0')}-01`;
  const monthEnd=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(calDaysInMonth).padStart(2,'0')}`;
  const validProjs = projects.map(p=>({...p,colorIndex:projects.findIndex(x=>x.ID===p.ID)})).filter(p=>p.시작일&&p.목표일&&p.시작일<=monthEnd&&p.목표일>=monthStart);
  const sorted = [...validProjs].sort((a,b)=>a.시작일.localeCompare(b.시작일));
  const tracks: string[][] = [];
  const trackedProjs = sorted.map(proj=>{ let t=0; while(tracks[t]&&tracks[t].some(end=>proj.시작일<=end))t++; if(!tracks[t])tracks[t]=[]; tracks[t].push(proj.목표일); return {...proj,track:t}; });
  const TRACK_TOP=28, TRACK_H=20, TRACK_GAP=3;

  return (
    <div style={{ minHeight:'100vh', background:'#faf8f4', fontFamily:'Arial, sans-serif', color:'#2c2620', display:'flex' }}>
      {/* 사이드바 — PC */}
      <div style={{ width:'200px', minHeight:'100vh', background:'#f2ede4', borderRight:'1px solid #e0d8c8', display:'flex', flexDirection:'column', padding:'24px 12px', flexShrink:0 }}>
        <div style={{ marginBottom:'32px', paddingLeft:'8px' }}>
          <p style={{ fontSize:'16px', fontWeight:700, color:'#2c2620', margin:'0 0 2px' }}>전동열</p>
          <p style={{ fontSize:'11px', color:'#9a8e7e', margin:0 }}>Workspace</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:'4px', flex:1 }}>
          {sidebarBtn('home','🏠  홈')}
          {sidebarBtn('board','📋  업무보드')}
          {sidebarBtn('memo','📅  미팅')}
        </div>
        <button onClick={()=>{
          const rows = [['ID','프로젝트ID','제목','설명','유형','상태','우선순위','시작일','목표일','메모']];
          boardItems.forEach(item=>rows.push([item.ID,item.프로젝트ID,item.제목,item.설명,item.유형,item.상태,item.우선순위,item.시작일,item.목표일,item.메모]));
          const csv = rows.map(r=>r.map(c=>`"${(c||'').replace(/"/g,'""')}"`).join(',')).join('\n');
          const blob = new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'});
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href=url; a.download=`업무보드_${new Date().toLocaleDateString('en-CA')}.csv`; a.click();
          URL.revokeObjectURL(url);
        }} style={{ padding:'8px 12px', background:'none', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#9a8e7e', fontSize:'12px', cursor:'pointer', textAlign:'left', marginBottom:'6px' }}>📥 데이터 내보내기</button>
        <button onClick={()=>{ sessionStorage.removeItem('pd_auth'); setAuth(false); }} style={{ padding:'8px 12px', background:'none', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#9a8e7e', fontSize:'12px', cursor:'pointer', textAlign:'left' }}>로그아웃</button>
      </div>

      {/* 메인 */}
      <div style={{ flex:1, padding:'clamp(20px, 4vw, 48px) clamp(16px, 4vw, 40px)', overflowY:'auto', minWidth:0 }}>
        {loading && <p style={{ color:'#7a6e5e', textAlign:'center' }}>불러오는 중...</p>}

        {/* ── 종료 임박 알림 배너 (홈 탭 제외) ── */}
        {tab !== 'home' && (() => {
          const today = new Date();
          today.setHours(0,0,0,0);
          const urgent = projects.filter(p => {
            if (!p.목표일 || p.상태==='완료') return false;
            const end = new Date(p.목표일);
            end.setHours(0,0,0,0);
            const diff = Math.ceil((end.getTime()-today.getTime())/86400000);
            return diff >= 0 && diff <= 7;
          }).map(p => {
            const end = new Date(p.목표일);
            end.setHours(0,0,0,0);
            const diff = Math.ceil((end.getTime()-today.getTime())/86400000);
            return {...p, dday: diff};
          }).sort((a,b) => a.dday - b.dday);

          if (urgent.length === 0) return null;

          const getColor = (d: number) => d <= 1 ? '#c0392b' : d <= 3 ? '#e07020' : '#b08020';
          const getBg = (d: number) => d <= 1 ? '#fde8e8' : d <= 3 ? '#fef0e0' : '#fef9e0';
          const getEmoji = (d: number) => d <= 1 ? '🔴' : d <= 3 ? '🟠' : '🟡';

          return (
            <div style={{ marginBottom:'20px', borderRadius:'10px', border:`1px solid ${urgent[0].dday<=1?'#f5c6cb':urgent[0].dday<=3?'#ffd8a8':'#fff3cd'}`, overflow:'hidden' }}>
              <div onClick={()=>setShowAlarm(v=>!v)}
                style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:getBg(urgent[0].dday), cursor:'pointer' }}>
                <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                  <span style={{ fontSize:'14px' }}>⚠️</span>
                  <span style={{ fontSize:'13px', fontWeight:600, color:getColor(urgent[0].dday) }}>종료 임박 업무 {urgent.length}건</span>
                  {!showAlarm && (
                    <div style={{ display:'flex', gap:'6px' }}>
                      {urgent.slice(0,3).map(p => (
                        <span key={p.ID} style={{ fontSize:'11px', padding:'1px 7px', borderRadius:'10px', background:'rgba(0,0,0,0.08)', color:getColor(p.dday), fontWeight:500 }}>D-{p.dday}</span>
                      ))}
                    </div>
                  )}
                </div>
                <span style={{ fontSize:'12px', color:getColor(urgent[0].dday) }}>{showAlarm?'▲':'▼'}</span>
              </div>
              {showAlarm && (
                <div style={{ background:'#fffdf5', borderTop:`1px solid ${urgent[0].dday<=1?'#f5c6cb':urgent[0].dday<=3?'#ffd8a8':'#fff3cd'}` }}>
                  {urgent.map(p => (
                    <div key={p.ID} onClick={()=>{ setTab('board'); setSelectedProjId(p.ID); setShowAlarm(false); }}
                      style={{ display:'flex', alignItems:'center', gap:'10px', padding:'9px 14px', borderBottom:'1px solid #f0ece4', cursor:'pointer' }}
                      onMouseEnter={e=>(e.currentTarget.style.background='#f5f0e8')}
                      onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                      <span style={{ fontSize:'13px' }}>{getEmoji(p.dday)}</span>
                      <span style={{ fontSize:'13px', color:'#2c2620', flex:1 }}>{p.제목}</span>
                      <span style={{ fontSize:'12px', fontWeight:700, color:getColor(p.dday), flexShrink:0 }}>
                        {p.dday===0 ? 'D-Day' : `D-${p.dday}`}
                      </span>
                      <span style={{ fontSize:'11px', color:'#9a8e7e', flexShrink:0 }}>{p.목표일}</span>
                      <span style={{ fontSize:'11px', color:'#c4a882', flexShrink:0 }}>→</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        {/* ── 홈 탭 ── */}
        {tab==='home' && (
          <>
            <div style={{ marginBottom:'20px' }}>
              <h1 style={{ fontSize:'22px', fontWeight:700, color:'#2c2620', margin:'0 0 4px' }}>안녕하세요, 전동열 책임님 👋</h1>
              <p style={{ fontSize:'12px', color:'#7a6e5e', margin:0 }}>{new Date().toLocaleDateString('ko-KR', {year:'numeric',month:'long',day:'numeric',weekday:'long'})}</p>
            </div>

            {/* 요약 카드 */}
            {(() => {
              const todayStr = new Date().toLocaleDateString('en-CA');
              const inProgress = projects.filter(p=>p.상태==='진행중');
              const todayEnd = projects.filter(p=>p.목표일===todayStr&&p.상태!=='완료');

              // 이번 주 월~일
              const now = new Date(); now.setHours(0,0,0,0);
              const day = now.getDay();
              const weekStart = new Date(now); weekStart.setDate(now.getDate()-day);
              const weekEnd = new Date(now); weekEnd.setDate(now.getDate()+(6-day));
              const weekStartStr = weekStart.toLocaleDateString('en-CA');
              const weekEndStr = weekEnd.toLocaleDateString('en-CA');
              const weekMeetings = memos.filter(m=>m.날짜>=weekStartStr&&m.날짜<=weekEndStr&&m.상태!=='완료').sort((a,b)=>a.날짜.localeCompare(b.날짜));

              return (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px', marginBottom:'24px' }}>
                  {/* 진행중 업무 카드 */}
                  <div style={{ background:'#f2ede4', borderRadius:'12px', padding:'16px', border:'1px solid #e0d8c8' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                      <span style={{ fontSize:'14px' }}>📋</span>
                      <span style={{ fontSize:'13px', fontWeight:600, color:'#2c2620' }}>진행중인 업무</span>
                      <span style={{ fontSize:'11px', background:'#c4a882', color:'#fff', borderRadius:'10px', padding:'1px 8px', marginLeft:'auto' }}>{inProgress.length}개</span>
                    </div>
                    {inProgress.length===0 && <p style={{ fontSize:'12px', color:'#9a8e7e', margin:0 }}>진행중인 업무가 없어요</p>}
                    {inProgress.slice(0,4).map(p=>{
                      const end = p.목표일 ? new Date(p.목표일) : null;
                      end?.setHours(0,0,0,0);
                      const dday = end ? Math.ceil((end.getTime()-now.getTime())/86400000) : null;
                      return (
                        <div key={p.ID} onClick={()=>{ setTab('board'); setSelectedProjId(p.ID); }}
                          style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', borderBottom:'1px solid #e8e0d0', cursor:'pointer' }}>
                          <span style={{ fontSize:'12px', color:'#5a4e3e', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.제목}</span>
                          {dday!==null && <span style={{ fontSize:'10px', color:dday<=3?'#c0392b':dday<=7?'#e07020':'#9a8e7e', fontWeight:600, flexShrink:0 }}>{dday===0?'D-Day':`D-${dday}`}</span>}
                        </div>
                      );
                    })}
                    {inProgress.length>4 && <p style={{ fontSize:'11px', color:'#9a8e7e', margin:'6px 0 0' }}>+{inProgress.length-4}개 더</p>}
                  </div>

                  {/* 이번 주 미팅 카드 */}
                  <div style={{ background:'#f2ede4', borderRadius:'12px', padding:'16px', border:'1px solid #e0d8c8' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
                      <span style={{ fontSize:'14px' }}>📅</span>
                      <span style={{ fontSize:'13px', fontWeight:600, color:'#2c2620' }}>이번 주 미팅</span>
                      <span style={{ fontSize:'11px', background:'#c4a882', color:'#fff', borderRadius:'10px', padding:'1px 8px', marginLeft:'auto' }}>{weekMeetings.length}건</span>
                    </div>
                    {weekMeetings.length===0 && <p style={{ fontSize:'12px', color:'#9a8e7e', margin:0 }}>이번 주 미팅이 없어요</p>}
                    {weekMeetings.map(m=>(
                      <div key={m.ID} onClick={()=>{ setTab('memo'); setSelectedMemo(m); }}
                        style={{ display:'flex', alignItems:'center', gap:'8px', padding:'6px 0', borderBottom:'1px solid #e8e0d0', cursor:'pointer' }}>
                        <span style={{ fontSize:'10px', color:'#c4a882', fontWeight:600, flexShrink:0 }}>{m.날짜.slice(5).replace('-','/')}</span>
                        <span style={{ fontSize:'12px', color:'#5a4e3e', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.미팅명}</span>
                        {m.날짜===todayStr && <span style={{ fontSize:'10px', background:'#e05a4e', color:'#fff', borderRadius:'8px', padding:'1px 6px', flexShrink:0 }}>오늘</span>}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            <div style={{ border:'1px solid #e0d8c8', borderRadius:'12px', overflow:'hidden', background:'#f2ede4' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderBottom:'1px solid #e0d8c8' }}>
                <button onClick={()=>{ if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1); }} style={{ background:'#e0d8c8', border:'none', borderRadius:'6px', color:'#2c2620', width:'28px', height:'28px', cursor:'pointer', fontSize:'14px' }}>‹</button>
                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                  <span style={{ fontSize:'14px', fontWeight:600, color:'#2c2620' }}>{calYear}년 {calMonth+1}월</span>
                  <button onClick={()=>{ setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); }} style={{ background:'#e0d8c8', border:'none', borderRadius:'6px', padding:'3px 10px', fontSize:'11px', color:'#7a6e5e', cursor:'pointer' }}>오늘</button>
                </div>
                <button onClick={()=>{ if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1); }} style={{ background:'#e0d8c8', border:'none', borderRadius:'6px', color:'#2c2620', width:'28px', height:'28px', cursor:'pointer', fontSize:'14px' }}>›</button>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', background:'#ede8e0', borderBottom:'1px solid #e0d8c8' }}>
                {['일','월','화','수','목','금','토'].map((d,i)=>(
                  <div key={d} style={{ textAlign:'center', padding:'6px 0', fontSize:'11px', fontWeight:500, color:i===0?'#e05a4e':i===6?'#3B82F6':'#7a6e5e' }}>{d}</div>
                ))}
              </div>
              {calRows.map((week,ri)=>{
                const weekProjs=trackedProjs.filter(p=>week.some(c=>c.date>=p.시작일&&c.date<=p.목표일));
                const maxTrack=weekProjs.length>0?Math.max(...weekProjs.map(p=>p.track)):-1;
                const rowH=TRACK_TOP+(maxTrack+1)*(TRACK_H+TRACK_GAP)+8;
                return (
                  <div key={ri} style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', borderBottom:ri<calRows.length-1?'1px solid #e0d8c8':'none', position:'relative', minHeight:`${Math.max(rowH,72)}px` }}>
                    {week.map((cell,ci)=>(
                      <div key={ci} style={{ borderRight:ci<6?'1px solid #e0d8c8':'none', padding:'4px 3px', background:cell.current?'#f2ede4':'#ede8e0', minHeight:'72px' }}>
                        <div style={{ fontSize:'11px', width:'20px', height:'20px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:'50%', background:cell.date===calToday?'#c4a882':'transparent', color:cell.date===calToday?'#fff':!cell.current?'#b0a090':ci===0?'#e05a4e':ci===6?'#3B82F6':'#5a4e3e', fontWeight:cell.date===calToday?700:400 }}>{cell.day}</div>
                      </div>
                    ))}
                    {trackedProjs.map(proj=>{
                      const rowStart=week[0].date; const rowEnd=week[6].date;
                      if(proj.시작일>rowEnd||proj.목표일<rowStart) return null;
                      const barStart=proj.시작일>rowStart?proj.시작일:rowStart;
                      const barEnd=proj.목표일<rowEnd?proj.목표일:rowEnd;
                      const si=week.findIndex(c=>c.date===barStart);
                      const ei=week.findIndex(c=>c.date===barEnd);
                      if(si<0||ei<0) return null;
                      const span=ei-si+1;
                      const isFirst=proj.시작일===barStart; const isLast=proj.목표일===barEnd;
                      const color=PROJ_COLORS[proj.colorIndex%PROJ_COLORS.length];
                      const isHovered=hoveredProj===proj.ID; const isDimmed=hoveredProj!==null&&!isHovered;
                      const isDone=proj.상태==='완료';
                      return (
                        <div key={`${proj.ID}-${ri}`}
                          onMouseEnter={()=>setHoveredProj(proj.ID)} onMouseLeave={()=>setHoveredProj(null)}
                          style={{ position:'absolute', top:`${TRACK_TOP+proj.track*(TRACK_H+TRACK_GAP)}px`, left:`calc(${si*(100/7)}% + 2px)`, width:`calc(${span*(100/7)}% - 4px)`, height:`${TRACK_H}px`, background:isDone?'#cccccc80':color+'cc', borderRadius:isFirst&&isLast?'4px':isFirst?'4px 0 0 4px':isLast?'0 4px 4px 0':'0', display:'flex', alignItems:'center', paddingLeft:isFirst?'6px':'2px', overflow:'hidden', boxSizing:'border-box', cursor:'pointer', opacity:isDimmed?0.2:isDone?0.5:1, transition:'opacity 0.15s', zIndex:isHovered?10:1 }}>
                          {(isFirst||si===0) && <span style={{ fontSize:'10px', fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', textDecoration:isDone?'line-through':'none' }}>{proj.제목}</span>}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
              {projects.length>0 && (
                <div style={{ display:'flex', flexWrap:'wrap', gap:'10px', padding:'10px 16px', borderTop:'1px solid #e0d8c8' }}>
                  {projects.map((p,i)=>(
                    <div key={p.ID} style={{ display:'flex', alignItems:'center', gap:'5px' }}>
                      <div style={{ width:'10px', height:'10px', borderRadius:'2px', background:PROJ_COLORS[i%PROJ_COLORS.length] }} />
                      <span style={{ fontSize:'11px', color:'#7a6e5e' }}>{p.제목}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 업무보드 탭 ── */}
        {tab==='board' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
              <h2 style={{ fontSize:'18px', fontWeight:700, margin:0 }}>📋 업무보드</h2>
              <button onClick={()=>{ setShowBoardForm(v=>!v); setBoardForm({제목:'',설명:'',상태:'진행중',시작일:'',목표일:'',메모:''}); }}
                style={{ padding:'8px 16px', background:'#c4a882', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>{showBoardForm ? '✕ 닫기' : '+ 업무 추가'}</button>
            </div>

            {/* 업무 추가 폼 */}
            {showBoardForm && (
              <div style={{ background:'#f2ede4', borderRadius:'12px', padding:'16px', border:'1px solid #c4a882', marginBottom:'16px' }}>
                <div style={{ display:'flex', flexDirection:'column', gap:'10px' }}>
                  <input placeholder="업무명 *" value={boardForm.제목} onChange={e=>setBoardForm({...boardForm,제목:e.target.value})}
                    style={{ padding:'8px 12px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none' }} />
                  <input placeholder="설명 (선택)" value={boardForm.설명} onChange={e=>setBoardForm({...boardForm,설명:e.target.value})}
                    style={{ padding:'8px 12px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none' }} />
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                    <select value={boardForm.상태} onChange={e=>setBoardForm({...boardForm,상태:e.target.value})}
                      style={{ padding:'8px 10px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none' }}>
                      {['진행중','대기','보류'].map(v=><option key={v}>{v}</option>)}
                    </select>
                    <input type="date" value={boardForm.시작일} onChange={e=>setBoardForm({...boardForm,시작일:e.target.value})}
                      style={{ padding:'8px 10px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none', colorScheme:'light' }} />
                    <input type="date" value={boardForm.목표일} onChange={e=>setBoardForm({...boardForm,목표일:e.target.value})}
                      style={{ padding:'8px 10px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none', colorScheme:'light' }} />
                  </div>
                  <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                    <button onClick={()=>setShowBoardForm(false)} style={{ padding:'7px 14px', background:'#e0d8c8', border:'none', borderRadius:'8px', color:'#7a6e5e', fontSize:'13px', cursor:'pointer' }}>취소</button>
                    <button onClick={async()=>{
                      if (!boardForm.제목.trim()) return;
                      const newId = nextId(boardItems);
                      await fetch('/api/project',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ID:newId,프로젝트ID:'',제목:boardForm.제목,설명:boardForm.설명,유형:'업무',상태:boardForm.상태,우선순위:'',시작일:boardForm.시작일,목표일:boardForm.목표일,메모:''})});
                      setShowBoardForm(false);
                      setBoardForm({제목:'',설명:'',상태:'진행중',시작일:'',목표일:'',메모:''});
                      await loadBoard();
                    }} style={{ padding:'7px 18px', background:'#c4a882', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>저장</button>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display:'grid', gridTemplateColumns:selectedProj?'280px 1fr':'1fr', gap:'16px' }}>
              {/* 왼쪽 업무 목록 */}
              <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                {projects.length===0 && <p style={{ color:'#7a6e5e', textAlign:'center', padding:'40px 0' }}>업무를 추가해보세요</p>}
                {projects.map((proj,i)=>{
                  const color=PROJ_COLORS[i%PROJ_COLORS.length];
                  const pt=boardItems.filter(x=>x.프로젝트ID===proj.ID&&x.유형==='태스크');
                  const done=pt.filter(x=>x.상태==='완료').length;
                  const pct=pt.length>0?Math.round(done/pt.length*100):0;
                  const isSelected=selectedProjId===proj.ID;
                  return (
                    <div key={proj.ID}
                      onClick={()=>setSelectedProjId(proj.ID)}
                      style={{ background:isSelected?'#e8e0d0':'#f2ede4', borderRadius:'10px', padding:'12px 14px', cursor:'pointer', border:`2px solid ${isSelected?'#c4a882':color+'40'}`, transition:'border-color 0.15s', opacity:proj.상태==='완료'?0.5:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'4px' }}>

                        <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:color, flexShrink:0 }} />
                        <span style={{ fontSize:'13px', fontWeight:600, color:proj.상태==='완료'?'#9a8e7e':'#2c2620', flex:1, textDecoration:proj.상태==='완료'?'line-through':'none' }}>{proj.제목}</span>
                        <select value={proj.상태} onClick={e=>e.stopPropagation()} onChange={e=>{ e.stopPropagation(); handleStatusChange(proj,e.target.value); }}
                          style={{ padding:'2px 6px', borderRadius:'6px', border:'none', fontSize:'10px', fontWeight:500, cursor:'pointer', outline:'none', flexShrink:0,
                            background:proj.상태==='완료'?'#d4edda':proj.상태==='진행중'?'#dbeafe':'#f0ece4',
                            color:proj.상태==='완료'?'#2e5e2e':proj.상태==='진행중'?'#1a5fa0':'#7a6e5e' }}>
                          {['진행중','완료','보류','대기'].map(s=><option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      {proj.설명 && <p style={{ fontSize:'11px', color:'#7a6e5e', margin:'0 0 6px', paddingLeft:'16px' }}>{proj.설명}</p>}
                      <div style={{ paddingLeft:'16px' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'3px' }}>
                          <span style={{ fontSize:'10px', color:'#7a6e5e' }}>{done}/{pt.length} 완료</span>
                          <span style={{ fontSize:'10px', color, fontWeight:600 }}>{pct}%</span>
                        </div>
                        <div style={{ height:'3px', background:'#e0d8c8', borderRadius:'2px', overflow:'hidden' }}>
                          <div style={{ height:'100%', width:`${pct}%`, background:color, borderRadius:'2px' }} />
                        </div>
                        {(proj.시작일||proj.목표일) && <p style={{ fontSize:'10px', color:'#9a8e7e', margin:'4px 0 0' }}>{proj.시작일} ~ {proj.목표일}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 오른쪽 체크리스트 */}
              {selectedProj ? (
                <div style={{ background:'#f2ede4', borderRadius:'12px', padding:'20px', border:'1px solid #e0d8c8' }}>
                  {editingProj ? (
                    /* 인라인 수정 폼 */
                    <div style={{ marginBottom:'12px', padding:'12px', background:'#faf8f4', borderRadius:'10px', border:'1px solid #c4a882' }}>
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                        <input placeholder="업무명" value={editProjForm.제목||''} onChange={e=>setEditProjForm({...editProjForm,제목:e.target.value})}
                          style={{ padding:'7px 10px', background:'#fff', border:'1px solid #e0d8c8', borderRadius:'7px', color:'#2c2620', fontSize:'13px', outline:'none' }} />
                        <input placeholder="설명 (선택)" value={editProjForm.설명||''} onChange={e=>setEditProjForm({...editProjForm,설명:e.target.value})}
                          style={{ padding:'7px 10px', background:'#fff', border:'1px solid #e0d8c8', borderRadius:'7px', color:'#2c2620', fontSize:'13px', outline:'none' }} />
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
                          <select value={editProjForm.상태||'진행중'} onChange={e=>setEditProjForm({...editProjForm,상태:e.target.value})}
                            style={{ padding:'7px 8px', background:'#fff', border:'1px solid #e0d8c8', borderRadius:'7px', color:'#2c2620', fontSize:'12px', outline:'none' }}>
                            {['진행중','완료','보류','대기'].map(v=><option key={v}>{v}</option>)}
                          </select>
                          <input type="date" value={editProjForm.시작일||''} onChange={e=>setEditProjForm({...editProjForm,시작일:e.target.value})}
                            style={{ padding:'7px 8px', background:'#fff', border:'1px solid #e0d8c8', borderRadius:'7px', color:'#2c2620', fontSize:'12px', outline:'none', colorScheme:'light' }} />
                          <input type="date" value={editProjForm.목표일||''} onChange={e=>setEditProjForm({...editProjForm,목표일:e.target.value})}
                            style={{ padding:'7px 8px', background:'#fff', border:'1px solid #e0d8c8', borderRadius:'7px', color:'#2c2620', fontSize:'12px', outline:'none', colorScheme:'light' }} />
                        </div>
                        <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                          <button onClick={()=>setEditingProj(false)} style={{ padding:'6px 12px', background:'#e0d8c8', border:'none', borderRadius:'7px', color:'#7a6e5e', fontSize:'12px', cursor:'pointer' }}>취소</button>
                          <button onClick={async()=>{
                            await fetch('/api/project',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...selectedProj,...editProjForm})});
                            setEditingProj(false);
                            await loadBoard();
                          }} style={{ padding:'6px 16px', background:'#c4a882', border:'none', borderRadius:'7px', color:'#fff', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>저장</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:'12px' }}>
                      <div>
                        <h3 style={{ fontSize:'16px', fontWeight:700, margin:'0 0 4px' }}>{selectedProj.제목}</h3>
                        {selectedProj.설명 && <p style={{ fontSize:'12px', color:'#7a6e5e', margin:0 }}>{selectedProj.설명}</p>}
                      </div>
                      <div style={{ display:'flex', gap:'6px' }}>
                        <button onClick={handleDeleteAllItems}
                          style={{ padding:'5px 10px', background:'#fef3cd', border:'none', borderRadius:'6px', color:'#856404', fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap' }}>🗑️ 전체 삭제</button>
                        <button onClick={()=>{ setEditProjForm({...selectedProj}); setEditingProj(true); }}
                          style={{ padding:'5px 10px', background:'#e0d8c8', border:'none', borderRadius:'6px', color:'#2c2620', fontSize:'12px', cursor:'pointer' }}>수정</button>
                        <button onClick={()=>handleDelete(selectedProj)}
                          style={{ padding:'5px 10px', background:'#fde8e8', border:'none', borderRadius:'6px', color:'#c0392b', fontSize:'12px', cursor:'pointer' }}>삭제</button>
                      </div>
                    </div>
                  )}
                  {/* 진행률 */}
                  <div style={{ marginBottom:'12px', padding:'10px 12px', background:'#faf8f4', borderRadius:'8px' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:'5px' }}>
                      <span style={{ fontSize:'12px', color:'#7a6e5e' }}>진행률</span>
                      <span style={{ fontSize:'12px', fontWeight:700, color:'#c4a882' }}>{progress}%</span>
                    </div>
                    <div style={{ height:'5px', background:'#e0d8c8', borderRadius:'3px', overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${progress}%`, background:'#c4a882', borderRadius:'3px', transition:'width 0.3s' }} />
                    </div>
                    <p style={{ fontSize:'11px', color:'#9a8e7e', margin:'6px 0 0' }}>{projTasks.length}개 항목 · 완료 {completedCount}개</p>
                  </div>
                  {/* 추가 입력 */}
                  <div style={{ marginBottom:'12px', padding:'12px', background:'#faf8f4', borderRadius:'8px', border:'1px solid #e0d8c8' }}>
                    <div style={{ display:'flex', gap:'8px', marginBottom:'8px' }}>
                      <input placeholder="그룹 추가... (예: A. 준비사항)" value={newGroupTitle} onChange={e=>setNewGroupTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddGroup()}
                        style={{ flex:1, padding:'7px 12px', background:'#f2ede4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'12px', outline:'none' }} />
                      <button onClick={handleAddGroup} style={{ padding:'7px 12px', background:'#e0d8c8', border:'none', borderRadius:'8px', color:'#7a6e5e', fontSize:'12px', cursor:'pointer', whiteSpace:'nowrap' }}>+ 그룹</button>
                    </div>
                    <div style={{ display:'flex', gap:'8px' }}>
                      <input placeholder="태스크 추가..." value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddTask()}
                        style={{ flex:1, padding:'7px 12px', background:'#f2ede4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'12px', outline:'none' }} />
                      <input type="date" value={newTaskDue} onChange={e=>setNewTaskDue(e.target.value)}
                        style={{ padding:'7px 8px', background:'#f2ede4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'12px', outline:'none', colorScheme:'light', width:'130px' }} />
                      <button onClick={handleAddTask} style={{ padding:'7px 14px', background:'#c4a882', border:'none', borderRadius:'8px', color:'#fff', fontSize:'12px', fontWeight:600, cursor:'pointer', whiteSpace:'nowrap' }}>+ 태스크</button>
                    </div>
                  </div>
                  {/* 체크리스트 */}
                  <div style={{ display:'flex', flexDirection:'column', gap:'4px' }}>
                    {projItems.length===0 && <p style={{ color:'#7a6e5e', fontSize:'13px', textAlign:'center', padding:'20px 0' }}>그룹 또는 태스크를 추가해보세요</p>}
                    {projItems.map(item=>{
                      if (item.유형==='그룹') return (
                        <div key={item.ID} style={{ display:'flex', alignItems:'center', gap:'8px', padding:'8px 4px', marginTop:'8px' }}>
                          {editingItem?.ID===item.ID ? (
                            <>
                              <input value={editingTitle} onChange={e=>setEditingTitle(e.target.value)} onKeyDown={async e=>{ if(e.key==='Enter'){ await fetch('/api/project',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,제목:editingTitle})}); setEditingItem(null); await loadBoard(); } if(e.key==='Escape') setEditingItem(null); }}
                                style={{ flex:1, padding:'4px 8px', background:'#faf8f4', border:'1px solid #c4a882', borderRadius:'6px', color:'#2c2620', fontSize:'12px', outline:'none' }} autoFocus />
                              <button onClick={async()=>{ await fetch('/api/project',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,제목:editingTitle})}); setEditingItem(null); await loadBoard(); }} style={{ background:'#c4a882', border:'none', borderRadius:'5px', color:'#fff', cursor:'pointer', fontSize:'11px', padding:'3px 8px' }}>저장</button>
                              <button onClick={()=>setEditingItem(null)} style={{ background:'none', border:'none', color:'#9a8e7e', cursor:'pointer', fontSize:'11px' }}>취소</button>
                            </>
                          ) : (
                            <>
                              <span style={{ fontSize:'12px', fontWeight:700, color:'#7a6e5e', flex:1 }}>{item.제목}</span>
                              <button onClick={()=>{ setEditingItem(item); setEditingTitle(item.제목); }} style={{ background:'none', border:'none', color:'#b0a090', cursor:'pointer', fontSize:'12px' }}>✏️</button>
                              <button onClick={()=>handleDelete(item)} style={{ background:'none', border:'none', color:'#b0a090', cursor:'pointer', fontSize:'12px' }}>🗑️</button>
                            </>
                          )}
                        </div>
                      );
                      const isDone=item.상태==='완료';
                      return (
                        <div key={item.ID} style={{ display:'flex', alignItems:'center', gap:'10px', padding:'10px 12px', background:'#faf8f4', borderRadius:'8px', border:`1px solid ${item.상태==='진행중'?'#c4a882':isDone?'#faf8f4':'#e0d8c8'}`, opacity:isDone?0.6:1 }}>
                          <select value={item.상태} onChange={e=>handleStatusChange(item,e.target.value)}
                            style={{ padding:'2px 5px', borderRadius:'5px', border:'none', fontSize:'10px', fontWeight:500, cursor:'pointer', outline:'none', flexShrink:0,
                              background:item.상태==='완료'?'#d4edda':item.상태==='진행중'?'#dbeafe':'#e0d8c8',
                              color:item.상태==='완료'?'#2e5e2e':item.상태==='진행중'?'#1a5fa0':'#7a6e5e' }}>
                            {['대기','진행중','완료'].map(s=><option key={s} value={s}>{s}</option>)}
                          </select>
                          {editingItem?.ID===item.ID ? (
                            <>
                              <input value={editingTitle} onChange={e=>setEditingTitle(e.target.value)} onKeyDown={async e=>{ if(e.key==='Enter'){ await fetch('/api/project',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,제목:editingTitle})}); setEditingItem(null); await loadBoard(); } if(e.key==='Escape') setEditingItem(null); }}
                                style={{ flex:1, padding:'4px 8px', background:'#faf8f4', border:'1px solid #c4a882', borderRadius:'6px', color:'#2c2620', fontSize:'12px', outline:'none' }} autoFocus />
                              <button onClick={async()=>{ await fetch('/api/project',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...item,제목:editingTitle})}); setEditingItem(null); await loadBoard(); }} style={{ background:'#c4a882', border:'none', borderRadius:'5px', color:'#fff', cursor:'pointer', fontSize:'11px', padding:'3px 8px', flexShrink:0 }}>저장</button>
                              <button onClick={()=>setEditingItem(null)} style={{ background:'none', border:'none', color:'#9a8e7e', cursor:'pointer', fontSize:'11px', flexShrink:0 }}>취소</button>
                            </>
                          ) : (
                            <>
                              <span style={{ flex:1, fontSize:'13px', color:isDone?'#9a8e7e':'#2c2620', textDecoration:isDone?'line-through':'none' }}>{item.제목}</span>
                          {item.목표일 && (() => {
                            const due=new Date(item.목표일); due.setHours(0,0,0,0);
                            const now2=new Date(); now2.setHours(0,0,0,0);
                            const d=Math.ceil((due.getTime()-now2.getTime())/86400000);
                            return <span style={{ fontSize:'10px', color:d<0?'#c0392b':d<=3?'#e07020':'#9a8e7e', flexShrink:0, fontWeight:d<=3?600:400 }}>{d===0?'오늘':d<0?`${Math.abs(d)}일 초과`:`D-${d}`}</span>;
                          })()}
                              <button onClick={()=>{ setEditingItem(item); setEditingTitle(item.제목); }} style={{ background:'none', border:'none', color:'#b0a090', cursor:'pointer', fontSize:'13px', flexShrink:0 }}>✏️</button>
                              <button onClick={()=>handleDelete(item)} style={{ background:'none', border:'none', color:'#b0a090', cursor:'pointer', fontSize:'13px', flexShrink:0 }}>🗑️</button>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* 업무 메모/노트 */}
                  <div style={{ marginTop:'16px', paddingTop:'16px', borderTop:'1px solid #e0d8c8' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'6px' }}>
                      <span style={{ fontSize:'12px', fontWeight:600, color:'#7a6e5e' }}>📝 메모 / 노트</span>
                      <button onClick={handleSaveBoardMemo} style={{ fontSize:'11px', padding:'3px 10px', background:'#c4a882', border:'none', borderRadius:'6px', color:'#fff', cursor:'pointer' }}>저장</button>
                    </div>
                    <textarea value={boardMemo} onChange={e=>setBoardMemo(e.target.value)}
                      placeholder="업무 관련 메모를 자유롭게 입력하세요..."
                      style={{ width:'100%', padding:'10px 12px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none', boxSizing:'border-box', height:'100px', resize:'vertical', lineHeight:'1.6' }} />
                  </div>
                </div>
              ) : (
                <div style={{ background:'#f2ede4', borderRadius:'12px', padding:'40px 20px', border:'1px solid #e0d8c8', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <p style={{ color:'#9a8e7e', fontSize:'14px', textAlign:'center', margin:0 }}>← 왼쪽에서 업무를 선택하세요</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 미팅 탭 ── */}
        {tab==='memo' && (
          <>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h2 style={{ fontSize:'18px', fontWeight:700, margin:0 }}>📅 미팅</h2>
              <button onClick={()=>{ setShowMemoForm(v=>!v); setMemoForm({미팅명:'',날짜:'',참석자:'',내용:'',액션아이템:''}); setEditingMemoId(null); }}
                style={{ padding:'8px 16px', background:'#c4a882', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>{showMemoForm?'✕ 닫기':'+ 미팅 추가'}</button>
            </div>
            <input placeholder="🔍 미팅명, 참석자, 내용으로 검색..." value={memoSearch} onChange={e=>setMemoSearch(e.target.value)}
              style={{ width:'100%', padding:'9px 14px', background:'#f2ede4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none', boxSizing:'border-box', marginBottom:'16px' }} />
            {/* 입력폼 */}
            {showMemoForm && <div style={{ background:'#f2ede4', borderRadius:'12px', padding:'16px', border:'1px solid #c4a882', marginBottom:'24px' }}>
              {editingMemoId && (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'10px' }}>
                  <span style={{ fontSize:'12px', fontWeight:600, color:'#c4a882' }}>✏️ 수정 중</span>
                  <button onClick={()=>{ setMemoForm({미팅명:'',날짜:'',참석자:'',내용:'',액션아이템:''}); setEditingMemoId(null); }}
                    style={{ fontSize:'11px', color:'#9a8e7e', background:'none', border:'none', cursor:'pointer' }}>취소</button>
                </div>
              )}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', marginBottom:'8px' }}>
                <input placeholder="미팅명" value={memoForm.미팅명} onChange={e=>setMemoForm({...memoForm, 미팅명:e.target.value})}
                  style={{ padding:'8px 12px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none' }} />
                <input type="date" value={memoForm.날짜} onChange={e=>setMemoForm({...memoForm, 날짜:e.target.value})}
                  style={{ padding:'8px 12px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none', colorScheme:'light' }} />
              </div>
              <input placeholder="참석자" value={memoForm.참석자} onChange={e=>setMemoForm({...memoForm, 참석자:e.target.value})}
                style={{ width:'100%', padding:'8px 12px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none', boxSizing:'border-box', marginBottom:'8px' }} />
              <textarea placeholder="미팅 내용 / 논의사항" value={memoForm.내용} onChange={e=>setMemoForm({...memoForm, 내용:e.target.value})}
                style={{ width:'100%', padding:'8px 12px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none', boxSizing:'border-box', height:'100px', resize:'vertical', marginBottom:'8px', lineHeight:'1.6' }} />
              <textarea placeholder="액션아이템 (줄바꿈으로 구분 — 업무보드 전환 시 각 줄이 태스크로 생성)" value={memoForm.액션아이템} onChange={e=>setMemoForm({...memoForm, 액션아이템:e.target.value})}
                style={{ width:'100%', padding:'8px 12px', background:'#faf8f4', border:'1px solid #e0d8c8', borderRadius:'8px', color:'#2c2620', fontSize:'13px', outline:'none', boxSizing:'border-box', height:'80px', resize:'vertical', marginBottom:'10px', lineHeight:'1.6' }} />
              <div style={{ display:'flex', justifyContent:'flex-end' }}>
                <button onClick={async()=>{
                  if (!memoForm.미팅명.trim()) return;
                  const now=new Date().toISOString().slice(0,10);
                  if (editingMemoId) {
                    const target=memos.find(m=>m.ID===editingMemoId);
                    await fetch('/api/memo',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...target,...memoForm,수정일:now})});
                    setEditingMemoId(null);
                  } else {
                    await fetch('/api/memo',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ID:nextId(memos),...memoForm,생성일:now,수정일:now})});
                  }
                  setMemoForm({미팅명:'',날짜:'',참석자:'',내용:'',액션아이템:''});
                  setSelectedMemo(null);
                  setShowMemoForm(false);
                  const res=await fetch('/api/memo').then(r=>r.json());
                  setMemos(Array.isArray(res)?res.filter((x:Memo)=>x.ID):[]);
                }} style={{ padding:'8px 20px', background:'#c4a882', border:'none', borderRadius:'8px', color:'#fff', fontSize:'13px', fontWeight:600, cursor:'pointer' }}>저장</button>
              </div>
            </div>}

            {/* 미팅 목록 */}
            <div style={{ display:'flex', flexDirection:'column', gap:'12px' }}>
              {memos.length===0 && <p style={{ color:'#7a6e5e' }}>미팅 기록을 추가해보세요</p>}
              {[...memos]
                .filter(m => {
                  if (!memoSearch.trim()) return true;
                  const q = memoSearch.toLowerCase();
                  return (m.미팅명||'').toLowerCase().includes(q) || (m.참석자||'').toLowerCase().includes(q) || (m.내용||'').toLowerCase().includes(q) || (m.액션아이템||'').toLowerCase().includes(q);
                })
                .sort((a,b) => {
                  const aDone = a.상태==='완료', bDone = b.상태==='완료';
                  if (aDone && !bDone) return 1;
                  if (!aDone && bDone) return -1;
                  return (b.날짜||b.수정일||'').localeCompare(a.날짜||a.수정일||'');
                })
                .map(memo=>(
                <div key={memo.ID} style={{ background:'#f2ede4', borderRadius:'12px', border:`1px solid ${selectedMemo?.ID===memo.ID?'#c4a882':'#e0d8c8'}`, overflow:'hidden' }}>
                  <div onClick={()=>setSelectedMemo(selectedMemo?.ID===memo.ID?null:memo)}
                    style={{ padding:'14px 16px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', opacity:memo.상태==='완료'?0.5:1 }}>
                    <div>
                      <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'3px' }}>
                        <p style={{ fontSize:'14px', fontWeight:600, color:'#2c2620', margin:0 }}>{memo.미팅명}</p>
                        {memo.상태==='보관' && <span style={{ fontSize:'10px', background:'#dbeafe', color:'#1a5fa0', padding:'1px 6px', borderRadius:'8px' }}>📌 보관</span>}
                        {memo.상태==='완료' && <span style={{ fontSize:'10px', background:'#d4edda', color:'#2e5e2e', padding:'1px 6px', borderRadius:'8px' }}>✅ 완료</span>}
                      </div>
                      <div style={{ display:'flex', gap:'12px', fontSize:'11px', color:'#9a8e7e' }}>
                        {memo.날짜 && <span>📅 {memo.날짜}</span>}
                        {memo.참석자 && <span>👥 {memo.참석자}</span>}
                      </div>
                    </div>
                    <span style={{ fontSize:'12px', color:'#9a8e7e' }}>{selectedMemo?.ID===memo.ID?'▲':'▼'}</span>
                  </div>
                  {selectedMemo?.ID===memo.ID && (
                    <div style={{ padding:'0 16px 16px', borderTop:'1px solid #e0d8c8' }}>
                      {editingMemoId===memo.ID ? (
                        // 인라인 수정 폼
                        <div style={{ marginTop:'12px', display:'flex', flexDirection:'column', gap:'8px' }}>
                          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px' }}>
                            <input placeholder="미팅명" value={inlineMemoForm.미팅명} onChange={e=>setInlineMemoForm({...inlineMemoForm,미팅명:e.target.value})}
                              style={{ padding:'7px 10px', background:'#faf8f4', border:'1px solid #c4a882', borderRadius:'7px', color:'#2c2620', fontSize:'13px', outline:'none' }} />
                            <input type="date" value={inlineMemoForm.날짜} onChange={e=>setInlineMemoForm({...inlineMemoForm,날짜:e.target.value})}
                              style={{ padding:'7px 10px', background:'#faf8f4', border:'1px solid #c4a882', borderRadius:'7px', color:'#2c2620', fontSize:'13px', outline:'none', colorScheme:'light' }} />
                          </div>
                          <input placeholder="참석자" value={inlineMemoForm.참석자} onChange={e=>setInlineMemoForm({...inlineMemoForm,참석자:e.target.value})}
                            style={{ padding:'7px 10px', background:'#faf8f4', border:'1px solid #c4a882', borderRadius:'7px', color:'#2c2620', fontSize:'13px', outline:'none', width:'100%', boxSizing:'border-box' }} />
                          <textarea placeholder="미팅 내용" value={inlineMemoForm.내용} onChange={e=>setInlineMemoForm({...inlineMemoForm,내용:e.target.value})}
                            style={{ padding:'7px 10px', background:'#faf8f4', border:'1px solid #c4a882', borderRadius:'7px', color:'#2c2620', fontSize:'13px', outline:'none', width:'100%', boxSizing:'border-box', height:'80px', resize:'vertical', lineHeight:'1.6' }} />
                          <textarea placeholder="액션아이템" value={inlineMemoForm.액션아이템} onChange={e=>setInlineMemoForm({...inlineMemoForm,액션아이템:e.target.value})}
                            style={{ padding:'7px 10px', background:'#faf8f4', border:'1px solid #c4a882', borderRadius:'7px', color:'#2c2620', fontSize:'13px', outline:'none', width:'100%', boxSizing:'border-box', height:'60px', resize:'vertical', lineHeight:'1.6' }} />
                          <div style={{ display:'flex', gap:'8px', justifyContent:'flex-end' }}>
                            <button onClick={()=>setEditingMemoId(null)} style={{ padding:'6px 12px', background:'#e0d8c8', border:'none', borderRadius:'6px', color:'#7a6e5e', fontSize:'12px', cursor:'pointer' }}>취소</button>
                            <button onClick={async()=>{
                              const now=new Date().toISOString().slice(0,10);
                              await fetch('/api/memo',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...memo,...inlineMemoForm,수정일:now})});
                              setEditingMemoId(null);
                              const res=await fetch('/api/memo').then(r=>r.json());
                              setMemos(Array.isArray(res)?res.filter((x:Memo)=>x.ID):[]);
                            }} style={{ padding:'6px 14px', background:'#c4a882', border:'none', borderRadius:'6px', color:'#fff', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>저장</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          {memo.내용 && (
                            <div style={{ marginTop:'12px' }}>
                              <p style={{ fontSize:'11px', fontWeight:600, color:'#9a8e7e', margin:'0 0 6px' }}>📝 내용</p>
                              <p style={{ fontSize:'13px', color:'#5a4e3e', lineHeight:'1.8', whiteSpace:'pre-wrap', margin:0 }}>{memo.내용}</p>
                            </div>
                          )}
                          {memo.액션아이템 && (
                            <div style={{ marginTop:'12px', padding:'12px', background:'#faf8f4', borderRadius:'8px', border:'1px solid #e0d8c8' }}>
                              <p style={{ fontSize:'11px', fontWeight:600, color:'#9a8e7e', margin:'0 0 6px' }}>✅ 액션아이템</p>
                              <p style={{ fontSize:'13px', color:'#5a4e3e', lineHeight:'1.8', whiteSpace:'pre-wrap', margin:0 }}>{memo.액션아이템}</p>
                            </div>
                          )}
                        </>
                      )}
                      {editingMemoId!==memo.ID && <div style={{ display:'flex', gap:'8px', marginTop:'14px', justifyContent:'flex-end' }}>
                        <button onClick={async()=>{
                            if (!memo.액션아이템.trim()) { alert('액션아이템을 먼저 입력해주세요.'); return; }
                            const lines=memo.액션아이템.split('\n').filter((l:string)=>l.trim());
                            // 현재 최대 ID 가져오기
                            const cur=await fetch('/api/project').then(r=>r.json());
                            const curItems=Array.isArray(cur)?cur:[];
                            let newId=curItems.length===0?1:Math.max(...curItems.map((x:any)=>Number(x.ID)||0))+1;
                            const projId=String(newId++);
                            // 업무 추가
                            await fetch('/api/project',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ID:projId,프로젝트ID:'',제목:memo.미팅명,설명:`${memo.날짜} 미팅 후속`,유형:'업무',상태:'진행중',시작일:memo.날짜||'',목표일:'',메모:''})});
                            // 태스크 순차 추가
                            for (const line of lines) {
                              await fetch('/api/project',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ID:String(newId++),프로젝트ID:projId,제목:line.trim().replace(/^[-•*]\s*/,''),설명:'',유형:'태스크',상태:'대기',우선순위:'보통',시작일:'',목표일:'',메모:''})});
                            }
                            await loadBoard();
                            alert(`"${memo.미팅명}" 업무와 태스크 ${lines.length}개가 업무보드에 추가됐어요!`);
                        }} style={{ padding:'6px 14px', background:'#c4a882', border:'none', borderRadius:'6px', color:'#fff', fontSize:'12px', fontWeight:600, cursor:'pointer' }}>📋 업무보드로 전환</button>
                        <button onClick={async()=>{
                            const newStatus = memo.상태==='보관' ? '일반' : '보관';
                            await fetch('/api/memo',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...memo,상태:newStatus,수정일:new Date().toISOString().slice(0,10)})});
                            const res=await fetch('/api/memo').then(r=>r.json());
                            setMemos(Array.isArray(res)?res.filter((x:Memo)=>x.ID):[]);
                          }} style={{ padding:'6px 12px', background:memo.상태==='보관'?'#dbeafe':'#e0d8c8', border:'none', borderRadius:'6px', color:memo.상태==='보관'?'#1a5fa0':'#2c2620', fontSize:'12px', cursor:'pointer' }}>{memo.상태==='보관'?'📌 보관중':'📌 보관'}</button>
                        <button onClick={async()=>{
                            await fetch('/api/memo',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({...memo,상태:'완료',수정일:new Date().toISOString().slice(0,10)})});
                            const res=await fetch('/api/memo').then(r=>r.json());
                            setMemos(Array.isArray(res)?res.filter((x:Memo)=>x.ID):[]);
                            setSelectedMemo(null);
                          }} style={{ padding:'6px 12px', background:'#d4edda', border:'none', borderRadius:'6px', color:'#2e5e2e', fontSize:'12px', cursor:'pointer', display:memo.상태==='완료'?'none':'block' }}>✅ 완료</button>
                        <button onClick={e=>{ e.stopPropagation(); setInlineMemoForm({미팅명:memo.미팅명,날짜:memo.날짜,참석자:memo.참석자,내용:memo.내용,액션아이템:memo.액션아이템}); setEditingMemoId(memo.ID); setSelectedMemo(memo); }}
                          style={{ padding:'6px 12px', background:'#e0d8c8', border:'none', borderRadius:'6px', color:'#2c2620', fontSize:'12px', cursor:'pointer' }}>수정</button>
                        <button onClick={()=>handleDelete(memo)}
                          style={{ padding:'6px 12px', background:'#fde8e8', border:'none', borderRadius:'6px', color:'#c0392b', fontSize:'12px', cursor:'pointer' }}>삭제</button>
                      </div>}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}


      </div>
    </div>
  );
}
