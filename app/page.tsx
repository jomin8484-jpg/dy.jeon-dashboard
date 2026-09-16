'use client';
import { useState, useEffect } from 'react';

interface BoardItem {
  ID: string;
  프로젝트ID: string;
  제목: string;
  설명: string;
  유형: string; // '업무' | '그룹' | '태스크'
  상태: string;
  우선순위: string;
  시작일: string;
  목표일: string;
  메모: string;
}
interface Memo {
  ID: string; 제목: string; 내용: string; 태그: string; 생성일: string; 수정일: string;
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

const PROJ_COLORS = ['#c4a882','#5a9a6e','#F59E0B','#e05a4e','#A855F7','#06B6D4','#F97316'];
const STATUS_COLOR: Record<string, string> = { '진행중': '#c4a882', '완료': '#5a9a6e', '대기': '#9a8e7e', '보류': '#F59E0B' };
const PRIORITY_COLOR: Record<string, string> = { '높음': '#e05a4e', '보통': '#c4a882', '낮음': '#9a8e7e' };

export default function Home() {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<'home' | 'board' | 'memo'>('home');

  const [boardItems, setBoardItems] = useState<BoardItem[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedProjId, setSelectedProjId] = useState<string | null>(null);
  const [hoveredProj, setHoveredProj] = useState<string | null>(null);
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newGroupTitle, setNewGroupTitle] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  useEffect(() => {
    if (sessionStorage.getItem('pd_auth') === 'true') setAuth(true);
  }, []);

  const loadBoard = async () => {
    const res = await fetch('/api/project').then(r => r.json());
    setBoardItems(Array.isArray(res) ? res.filter((x: BoardItem) => x.ID).map((x: BoardItem) => ({
      ...x, 시작일: toISO(x.시작일||''), 목표일: toISO(x.목표일||'')
    })) : []);
  };

  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      fetch('/api/project').then(r => r.json()),
      fetch('/api/memo').then(r => r.json()),
    ]).then(([b, m]) => {
      setBoardItems(Array.isArray(b) ? b.filter((x: BoardItem) => x.ID).map((x: BoardItem) => ({
        ...x, 시작일: toISO(x.시작일||''), 목표일: toISO(x.목표일||'')
      })) : []);
      setMemos(Array.isArray(m) ? m.filter((x: Memo) => x.ID) : []);
    }).finally(() => setLoading(false));
  }, [auth]);

  const nextId = (list: any[]) => {
    if (list.length === 0) return '1';
    return String(Math.max(...list.map(x => Number(x.ID) || 0)) + 1);
  };

  const handleLogin = () => {
    if (pw === PASSWORD) { setAuth(true); sessionStorage.setItem('pd_auth', 'true'); }
    else { setPwError(true); setTimeout(() => setPwError(false), 2000); }
  };

  const handleSave = async () => {
    if (tab === 'memo') {
      const url = '/api/memo';
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { ...form, ID: editItem.ID } : { ...form, ID: nextId(memos) };
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const res = await fetch(url).then(r => r.json());
      setMemos(Array.isArray(res) ? res.filter((x: Memo) => x.ID) : []);
    } else {
      const method = editItem ? 'PUT' : 'POST';
      const body = editItem ? { ...form, ID: editItem.ID } : { ...form, ID: nextId(boardItems) };
      await fetch('/api/project', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      await loadBoard();
    }
    setShowModal(false);
  };

  const handleDelete = async (item: any) => {
    if (!confirm('삭제할까요?')) return;
    if (tab === 'memo') {
      await fetch('/api/memo', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID: item.ID }) });
      const res = await fetch('/api/memo').then(r => r.json());
      setMemos(Array.isArray(res) ? res.filter((x: Memo) => x.ID) : []);
      setSelectedMemo(null);
    } else {
      await fetch('/api/project', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID: item.ID }) });
      await loadBoard();
    }
  };

  const handleStatusChange = async (item: BoardItem, newStatus: string) => {
    const allItems = await fetch('/api/project').then(r => r.json());

    if (item.유형 === '업무') {
      // 업무 상태 변경
      await fetch('/api/project', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, 상태: newStatus }) });
      // 업무 완료 → 모든 태스크 완료
      if (newStatus === '완료') {
        const tasks = allItems.filter((x: BoardItem) => x.프로젝트ID === item.ID && x.유형 === '태스크');
        for (const task of tasks) {
          await fetch('/api/project', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...task, 상태: '완료' }) });
        }
      }
    } else {
      // 태스크 상태 변경
      await fetch('/api/project', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, 상태: newStatus }) });
      // 진행률 계산 및 업무 상태 자동 업데이트
      const projId = item.프로젝트ID;
      if (projId) {
        const updatedItems = await fetch('/api/project').then(r => r.json());
        const tasks = updatedItems.filter((x: BoardItem) => x.프로젝트ID === projId && x.유형 === '태스크');
        const done = tasks.filter((x: BoardItem) => x.상태 === '완료').length;
        const progress = tasks.length > 0 ? Math.round(done / tasks.length * 100) : 0;
        const proj = updatedItems.find((x: BoardItem) => x.ID === projId);
        if (proj) {
          // 100% 완료 시 업무도 자동 완료
          const newProjStatus = progress === 100 ? '완료' : proj.상태 === '완료' ? '진행중' : proj.상태;
          await fetch('/api/project', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...proj, 상태: newProjStatus }) });
        }
      }
    }
    await loadBoard();
  };

  const handleAddTask = async () => {
    if (!selectedProjId || !newTaskTitle.trim()) return;
    await fetch('/api/project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID: nextId(boardItems), 프로젝트ID: selectedProjId, 제목: newTaskTitle.trim(), 설명: '', 유형: '태스크', 상태: '대기', 우선순위: '보통', 시작일: '', 목표일: '', 메모: '' }) });
    setNewTaskTitle('');
    await loadBoard();
  };

  const handleAddGroup = async () => {
    if (!selectedProjId || !newGroupTitle.trim()) return;
    await fetch('/api/project', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID: nextId(boardItems), 프로젝트ID: selectedProjId, 제목: newGroupTitle.trim(), 설명: '', 유형: '그룹', 상태: '', 우선순위: '', 시작일: '', 목표일: '', 메모: '' }) });
    setNewGroupTitle('');
    await loadBoard();
  };

  // 업무 목록
  const projects = boardItems.filter(x => x.유형 === '업무');
  const selectedProj = selectedProjId ? projects.find(p => p.ID === selectedProjId) : null;
  const projItems = selectedProjId ? boardItems.filter(x => x.프로젝트ID === selectedProjId) : [];
  const projTasks = projItems.filter(x => x.유형 === '태스크');
  const completedCount = projTasks.filter(x => x.상태 === '완료').length;
  const progress = projTasks.length > 0 ? Math.round(completedCount / projTasks.length * 100) : 0;

  if (!auth) return (
    <div style={{ minHeight: '100vh', background: '#faf8f4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ background: '#f2ede4', borderRadius: '16px', padding: '48px 40px', width: '340px', boxShadow: '0 8px 30px rgba(0,0,0,0.08)' }}>
        <p style={{ fontSize: '11px', color: '#7a6e5e', letterSpacing: '0.15em', margin: '0 0 8px' }}>PERSONAL WORKSPACE</p>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#2c2620', margin: '0 0 32px' }}>전동열</h1>
        <input type="password" placeholder="비밀번호 입력" value={pw}
          onChange={e => setPw(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '12px 16px', background: '#faf8f4', border: `1px solid ${pwError ? '#e05a4e' : '#e0d8c8'}`, borderRadius: '8px', color: '#2c2620', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px', colorScheme: 'light' }} />
        {pwError && <p style={{ color: '#e05a4e', fontSize: '12px', margin: '0 0 12px' }}>비밀번호가 틀렸어요.</p>}
        <button onClick={handleLogin} style={{ width: '100%', padding: '12px', background: '#c4a882', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}>로그인</button>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#faf8f4', fontFamily: 'Arial, sans-serif', color: '#2c2620' }}>
      {/* 헤더 */}
      <div style={{ background: '#f2ede4', borderBottom: '1px solid #e0d8c8', padding: '0 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#2c2620' }}>전동열</span>
            <span style={{ fontSize: '12px', color: '#7a6e5e' }}>Workspace</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['home', 'board', 'memo'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500, background: tab === t ? '#c4a882' : 'transparent', color: tab === t ? '#fff' : '#9a8e7e' }}>
                {t === 'home' ? '🏠 홈' : t === 'board' ? '📋 업무보드' : '📝 메모'}
              </button>
            ))}
          </div>
          <button onClick={() => { sessionStorage.removeItem('pd_auth'); setAuth(false); }} style={{ background: 'none', border: 'none', color: '#7a6e5e', fontSize: '12px', cursor: 'pointer' }}>로그아웃</button>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
        {loading && <p style={{ color: '#7a6e5e', textAlign: 'center' }}>불러오는 중...</p>}

        {/* ── 홈 탭 ── */}
        {tab === 'home' && (() => {
          const calNow = new Date();
          const firstDay = new Date(calYear, calMonth, 1).getDay();
          const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
          const prevDays = new Date(calYear, calMonth, 0).getDate();
          const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
          const today = new Date(calNow.getFullYear(), calNow.getMonth(), calNow.getDate()).toLocaleDateString('en-CA');

          const cells: { date: string; day: number; current: boolean }[] = [];
          for (let i = 0; i < totalCells; i++) {
            if (i < firstDay) {
              const d = prevDays - firstDay + i + 1;
              const pm = calMonth === 0 ? 12 : calMonth;
              const py = calMonth === 0 ? calYear - 1 : calYear;
              cells.push({ date: `${py}-${String(pm).padStart(2,'0')}-${String(d).padStart(2,'0')}`, day: d, current: false });
            } else if (i < firstDay + daysInMonth) {
              const d = i - firstDay + 1;
              cells.push({ date: `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`, day: d, current: true });
            } else {
              const d = i - firstDay - daysInMonth + 1;
              const nm = calMonth === 11 ? 1 : calMonth + 2;
              const ny = calMonth === 11 ? calYear + 1 : calYear;
              cells.push({ date: `${ny}-${String(nm).padStart(2,'0')}-${String(d).padStart(2,'0')}`, day: d, current: false });
            }
          }
          const rows: typeof cells[] = [];
          for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i+7));

          const monthStart = `${calYear}-${String(calMonth+1).padStart(2,'0')}-01`;
          const monthEnd = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;

          const validProjs = projects
            .map(p => ({ ...p, colorIndex: projects.findIndex(x => x.ID === p.ID) }))
            .filter(p => p.시작일 && p.목표일 && p.시작일 <= monthEnd && p.목표일 >= monthStart);
          const sorted = [...validProjs].sort((a,b) => a.시작일.localeCompare(b.시작일));
          const tracks: string[][] = [];
          const trackedProjs = sorted.map(proj => {
            let t = 0;
            while (tracks[t] && tracks[t].some(end => proj.시작일 <= end)) t++;
            if (!tracks[t]) tracks[t] = [];
            tracks[t].push(proj.목표일);
            return { ...proj, track: t };
          });

          const TRACK_TOP = 28; const TRACK_H = 20; const TRACK_GAP = 3;

          return (
            <>
              <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#2c2620', margin: '0 0 4px' }}>안녕하세요, 전동열 책임님 👋</h1>
                <p style={{ fontSize: '12px', color: '#7a6e5e', margin: 0 }}>진행중인 업무 {projects.filter(p=>p.상태==='진행중').length}개</p>
              </div>
              <div style={{ border: '1px solid #e0d8c8', borderRadius: '12px', overflow: 'hidden', background: '#f2ede4' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #e0d8c8' }}>
                  <button onClick={() => { if (calMonth===0){setCalMonth(11);setCalYear((y:number)=>y-1);}else setCalMonth((m:number)=>m-1); }} style={{ background: '#e0d8c8', border: 'none', borderRadius: '6px', color: '#2c2620', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}>‹</button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#2c2620' }}>{calYear}년 {calMonth+1}월</span>
                    <button onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); }} style={{ background: '#e0d8c8', border: 'none', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#9a8e7e', cursor: 'pointer' }}>오늘</button>
                  </div>
                  <button onClick={() => { if (calMonth===11){setCalMonth(0);setCalYear((y:number)=>y+1);}else setCalMonth((m:number)=>m+1); }} style={{ background: '#e0d8c8', border: 'none', borderRadius: '6px', color: '#2c2620', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}>›</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#faf8f4', borderBottom: '1px solid #e0d8c8' }}>
                  {['일','월','화','수','목','금','토'].map((d,i) => (
                    <div key={d} style={{ textAlign: 'center', padding: '6px 0', fontSize: '11px', fontWeight: 500, color: i===0?'#e05a4e':i===6?'#a07850':'#7a6e5e' }}>{d}</div>
                  ))}
                </div>
                {rows.map((week, ri) => {
                  const weekProjs = trackedProjs.filter(p => week.some(c => c.date >= p.시작일 && c.date <= p.목표일));
                  const maxTrack = weekProjs.length > 0 ? Math.max(...weekProjs.map(p => p.track)) : -1;
                  const rowH = TRACK_TOP + (maxTrack+1)*(TRACK_H+TRACK_GAP) + 8;
                  return (
                    <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: ri<rows.length-1?'1px solid #e0d8c8':'none', position: 'relative', minHeight: `${Math.max(rowH,72)}px` }}>
                      {week.map((cell, ci) => (
                        <div key={ci} style={{ borderRight: ci<6?'1px solid #e0d8c8':'none', padding: '4px 3px', background: cell.current?'#f2ede4':'#faf8f4', minHeight: '72px' }}>
                          <div style={{ fontSize: '11px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: cell.date===today?'#c4a882':'transparent', color: cell.date===today?'#fff':!cell.current?'#8a7e6e':ci===0?'#e05a4e':ci===6?'#a07850':'#9a8e7e', fontWeight: cell.date===today?700:400 }}>{cell.day}</div>
                        </div>
                      ))}
                      {trackedProjs.map(proj => {
                        const rowStart = week[0].date; const rowEnd = week[6].date;
                        if (proj.시작일 > rowEnd || proj.목표일 < rowStart) return null;
                        const barStart = proj.시작일 > rowStart ? proj.시작일 : rowStart;
                        const barEnd = proj.목표일 < rowEnd ? proj.목표일 : rowEnd;
                        const si = week.findIndex(c => c.date === barStart);
                        const ei = week.findIndex(c => c.date === barEnd);
                        if (si<0||ei<0) return null;
                        const span = ei-si+1;
                        const isFirst = proj.시작일===barStart; const isLast = proj.목표일===barEnd;
                        const color = PROJ_COLORS[proj.colorIndex % PROJ_COLORS.length];
                        const isHovered = hoveredProj===proj.ID;
                        const isDimmed = hoveredProj!==null && !isHovered;
                        const isDone = proj.상태 === '완료';
                        return (
                          <div key={`${proj.ID}-${ri}`}
                            onMouseEnter={() => setHoveredProj(proj.ID)}
                            onMouseLeave={() => setHoveredProj(null)}
                            style={{ position: 'absolute', top: `${TRACK_TOP+proj.track*(TRACK_H+TRACK_GAP)}px`, left: `calc(${si*(100/7)}% + 2px)`, width: `calc(${span*(100/7)}% - 4px)`, height: `${TRACK_H}px`, background: isDone ? '#33333350' : color+'33', borderTop: `2px solid ${isDone ? '#555' : color}`, borderBottom: `2px solid ${isDone ? '#555' : color}`, borderLeft: isFirst?`2px solid ${isDone ? '#555' : color}`:'none', borderRight: isLast?`2px solid ${isDone ? '#555' : color}`:'none', borderRadius: isFirst&&isLast?'4px':isFirst?'4px 0 0 4px':isLast?'0 4px 4px 0':'0', display: 'flex', alignItems: 'center', paddingLeft: isFirst?'6px':'2px', overflow: 'hidden', boxSizing: 'border-box', cursor: 'pointer', opacity: isDimmed?0.2:isDone?0.4:1, transition: 'opacity 0.15s', zIndex: isHovered?10:1 }}>
                            {isFirst && <span style={{ fontSize: '10px', fontWeight: 500, color: isDone ? '#888' : color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: isDone ? 'line-through' : 'none' }}>{proj.제목}</span>}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
                {projects.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px 16px', borderTop: '1px solid #e0d8c8' }}>
                    {projects.map((p, i) => (
                      <div key={p.ID} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: PROJ_COLORS[i%PROJ_COLORS.length] }} />
                        <span style={{ fontSize: '11px', color: '#9a8e7e' }}>{p.제목}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          );
        })()}

        {/* ── 업무보드 탭 ── */}
        {tab === 'board' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>📋 업무보드</h2>
              <button onClick={() => { setEditItem(null); setForm({ 제목: '', 설명: '', 유형: '업무', 상태: '진행중', 시작일: '', 목표일: '', 메모: '' }); setShowModal(true); }}
                style={{ padding: '8px 16px', background: '#c4a882', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ 업무 추가</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: selectedProj ? '280px 1fr' : '1fr', gap: '16px' }}>
              {/* 왼쪽: 업무 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {projects.length === 0 && <p style={{ color: '#7a6e5e', textAlign: 'center', padding: '40px 0' }}>업무를 추가해보세요</p>}
                {projects.map((proj, i) => {
                  const color = PROJ_COLORS[i % PROJ_COLORS.length];
                  const pt = boardItems.filter(x => x.프로젝트ID===proj.ID && x.유형==='태스크');
                  const done = pt.filter(x => x.상태==='완료').length;
                  const pct = pt.length > 0 ? Math.round(done/pt.length*100) : 0;
                  const isSelected = selectedProjId===proj.ID;
                  return (
                    <div key={proj.ID} onClick={() => setSelectedProjId(isSelected?null:proj.ID)}
                      style={{ background: isSelected?'#e8f0fb':'#f2ede4', borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', border: `1px solid ${isSelected?'#c4a882':color+'40'}`, transition: 'all 0.15s' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#2c2620', flex: 1 }}>{proj.제목}</span>
                        <select value={proj.상태} onClick={e => e.stopPropagation()} onChange={e => { e.stopPropagation(); handleStatusChange(proj, e.target.value); }}
                          style={{ padding: '2px 6px', borderRadius: '6px', border: 'none', fontSize: '10px', fontWeight: 500, cursor: 'pointer', outline: 'none', flexShrink: 0, colorScheme: 'light',
                            background: proj.상태==='완료'?'#d4edda':proj.상태==='진행중'?'#e8f0fb':'#e0d8c8',
                            color: proj.상태==='완료'?'#5a9a6e':proj.상태==='진행중'?'#a07850':'#9a8e7e' }}>
                          {['진행중','완료','보류','대기'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      {proj.설명 && <p style={{ fontSize: '11px', color: '#7a6e5e', margin: '0 0 6px', paddingLeft: '16px' }}>{proj.설명}</p>}
                      <div style={{ paddingLeft: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '10px', color: '#7a6e5e' }}>{done}/{pt.length} 완료</span>
                          <span style={{ fontSize: '10px', color, fontWeight: 600 }}>{pct}%</span>
                        </div>
                        <div style={{ height: '3px', background: '#e0d8c8', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
                        </div>
                        {(proj.시작일||proj.목표일) && <p style={{ fontSize: '10px', color: '#8a7e6e', margin: '4px 0 0' }}>{proj.시작일} ~ {proj.목표일}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 오른쪽: 체크리스트 */}
              {selectedProj && (
                <div style={{ background: '#f2ede4', borderRadius: '12px', padding: '20px', border: '1px solid #e0d8c8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                    <div>
                      <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>{selectedProj.제목}</h3>
                      {selectedProj.설명 && <p style={{ fontSize: '12px', color: '#7a6e5e', margin: 0 }}>{selectedProj.설명}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => { setEditItem(selectedProj); setForm({ ...selectedProj }); setShowModal(true); }}
                        style={{ padding: '5px 10px', background: '#e0d8c8', border: 'none', borderRadius: '6px', color: '#9a8e7e', fontSize: '12px', cursor: 'pointer' }}>수정</button>
                      <button onClick={() => handleDelete(selectedProj)}
                        style={{ padding: '5px 10px', background: '#fde8e8', border: 'none', borderRadius: '6px', color: '#c0392b', fontSize: '12px', cursor: 'pointer' }}>삭제</button>
                    </div>
                  </div>

                  {/* 진행률 */}
                  <div style={{ marginBottom: '12px', padding: '10px 12px', background: '#faf8f4', borderRadius: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span style={{ fontSize: '12px', color: '#7a6e5e' }}>진행률</span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#c4a882' }}>{progress}%</span>
                    </div>
                    <div style={{ height: '5px', background: '#e0d8c8', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${progress}%`, background: '#c4a882', borderRadius: '3px', transition: 'width 0.3s' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: '#8a7e6e', margin: '6px 0 0' }}>{projTasks.length}개 항목 · 완료 {completedCount}개</p>
                  </div>

                  {/* 그룹/태스크 추가 — 상단 고정 */}
                  <div style={{ marginBottom: '12px', padding: '12px', background: '#faf8f4', borderRadius: '8px', border: '1px solid #e0d8c8' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                      <input placeholder="그룹 추가... (예: A. 준비사항)" value={newGroupTitle} onChange={e => setNewGroupTitle(e.target.value)} onKeyDown={e => e.key==='Enter' && handleAddGroup()}
                        style={{ flex: 1, padding: '7px 12px', background: '#f2ede4', border: '1px solid #e0d8c8', borderRadius: '8px', color: '#2c2620', fontSize: '12px', outline: 'none', colorScheme: 'light' }} />
                      <button onClick={handleAddGroup} style={{ padding: '7px 12px', background: '#e0d8c8', border: 'none', borderRadius: '8px', color: '#9a8e7e', fontSize: '12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 그룹</button>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input placeholder="태스크 추가..." value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} onKeyDown={e => e.key==='Enter' && handleAddTask()}
                        style={{ flex: 1, padding: '7px 12px', background: '#f2ede4', border: '1px solid #e0d8c8', borderRadius: '8px', color: '#2c2620', fontSize: '12px', outline: 'none', colorScheme: 'light' }} />
                      <button onClick={handleAddTask} style={{ padding: '7px 14px', background: '#c4a882', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>+ 태스크</button>
                    </div>
                  </div>

                  {/* 체크리스트 */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {projItems.length === 0 && <p style={{ color: '#7a6e5e', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>아래에서 그룹 또는 태스크를 추가해보세요</p>}
                    {projItems.map(item => {
                      if (item.유형 === '그룹') return (
                        <div key={item.ID} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 4px', marginTop: '8px' }}>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#9a8e7e', flex: 1 }}>{item.제목}</span>
                          <button onClick={() => handleDelete(item)} style={{ background: 'none', border: 'none', color: '#8a7e6e', cursor: 'pointer', fontSize: '12px' }}>🗑️</button>
                        </div>
                      );
                      const isDone = item.상태 === '완료';
                      return (
                        <div key={item.ID} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#faf8f4', borderRadius: '8px', border: `1px solid ${item.상태==='진행중'?'#c4a882':isDone?'#faf8f4':'#e0d8c8'}`, opacity: isDone?0.6:1 }}>
                          <select value={item.상태} onChange={e => handleStatusChange(item, e.target.value)}
                            style={{ padding: '2px 5px', borderRadius: '5px', border: 'none', fontSize: '10px', fontWeight: 500, cursor: 'pointer', outline: 'none', flexShrink: 0, colorScheme: 'light',
                              background: item.상태==='완료'?'#d4edda':item.상태==='진행중'?'#e8f0fb':'#e0d8c8',
                              color: item.상태==='완료'?'#5a9a6e':item.상태==='진행중'?'#a07850':'#9a8e7e' }}>
                            {['대기','진행중','완료'].map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <span style={{ flex: 1, fontSize: '13px', color: isDone?'#7a6e5e':'#2c2620', textDecoration: isDone?'line-through':'none' }}>{item.제목}</span>
                          <button onClick={() => handleDelete(item)} style={{ background: 'none', border: 'none', color: '#8a7e6e', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}>🗑️</button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 메모 탭 ── */}
        {tab === 'memo' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>📝 메모</h2>
              <button onClick={() => { setEditItem(null); setForm({ 제목: '', 내용: '', 태그: '' }); setShowModal(true); }}
                style={{ padding: '8px 16px', background: '#c4a882', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ 추가</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: selectedMemo ? '280px 1fr' : '1fr', gap: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {memos.length === 0 && <p style={{ color: '#7a6e5e', textAlign: 'center', padding: '40px 0' }}>메모를 추가해보세요</p>}
                {memos.map(memo => (
                  <div key={memo.ID} onClick={() => setSelectedMemo(memo)}
                    style={{ background: selectedMemo?.ID===memo.ID?'#dbeafe':'#f2ede4', borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', border: `1px solid ${selectedMemo?.ID===memo.ID?'#c4a882':'#e0d8c8'}` }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 4px', color: '#2c2620' }}>{memo.제목}</p>
                    <p style={{ fontSize: '11px', color: '#9a8e7e', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memo.내용}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10px', color: '#7a6e5e' }}>{memo.수정일}</span>
                      {memo.태그 && <span style={{ fontSize: '10px', color: '#c4a882' }}>#{memo.태그}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {selectedMemo && (
                <div style={{ background: '#f2ede4', borderRadius: '12px', padding: '20px', border: '1px solid #e0d8c8' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>{selectedMemo.제목}</h3>
                      <span style={{ fontSize: '11px', color: '#7a6e5e' }}>{selectedMemo.수정일} 수정</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => { setEditItem(selectedMemo); setForm({ ...selectedMemo }); setShowModal(true); }}
                        style={{ padding: '6px 12px', background: '#e0d8c8', border: 'none', borderRadius: '6px', color: '#2c2620', fontSize: '12px', cursor: 'pointer' }}>수정</button>
                      <button onClick={() => handleDelete(selectedMemo)}
                        style={{ padding: '6px 12px', background: '#fde8e8', border: 'none', borderRadius: '6px', color: '#c0392b', fontSize: '12px', cursor: 'pointer' }}>삭제</button>
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', color: '#5a4e3e', lineHeight: '1.8', whiteSpace: 'pre-wrap', margin: 0 }}>{selectedMemo.내용}</p>
                  {selectedMemo.태그 && <p style={{ marginTop: '16px', fontSize: '12px', color: '#c4a882' }}>#{selectedMemo.태그}</p>}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ── 모달 ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#f2ede4', borderRadius: '16px', padding: '28px', width: '440px', maxWidth: '90vw', border: '1px solid #e0d8c8' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px' }}>
              {editItem ? '수정' : '추가'} — {tab === 'memo' ? '메모' : '업무'}
            </h3>
            {tab === 'memo' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input placeholder="제목" value={form.제목||''} onChange={e => setForm({...form, 제목: e.target.value})} style={inputStyle} />
                <textarea placeholder="내용" value={form.내용||''} onChange={e => setForm({...form, 내용: e.target.value})} style={{ ...inputStyle, height: '140px', resize: 'vertical' }} />
                <input placeholder="태그 (선택)" value={form.태그||''} onChange={e => setForm({...form, 태그: e.target.value})} style={inputStyle} />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input placeholder="업무명" value={form.제목||''} onChange={e => setForm({...form, 제목: e.target.value})} style={inputStyle} />
                <input placeholder="설명 (선택)" value={form.설명||''} onChange={e => setForm({...form, 설명: e.target.value})} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <select value={form.상태||'진행중'} onChange={e => setForm({...form, 상태: e.target.value})} style={inputStyle}>
                    {['진행중','완료','보류','대기'].map(v => <option key={v}>{v}</option>)}
                  </select>
                  <input placeholder="진행률 (0~100)" value={form.진행률||'0'} onChange={e => setForm({...form, 진행률: e.target.value})} style={inputStyle} />
                  <input type="date" value={form.시작일||''} onChange={e => setForm({...form, 시작일: e.target.value})} style={inputStyle} />
                  <input type="date" value={form.목표일||''} onChange={e => setForm({...form, 목표일: e.target.value})} style={inputStyle} />
                </div>
                <textarea placeholder="메모 (선택)" value={form.메모||''} onChange={e => setForm({...form, 메모: e.target.value})} style={{ ...inputStyle, height: '80px', resize: 'vertical' }} />
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#e0d8c8', border: 'none', borderRadius: '8px', color: '#9a8e7e', fontSize: '13px', cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} style={{ flex: 2, padding: '10px', background: '#c4a882', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#faf8f4', border: '1px solid #e0d8c8',
  borderRadius: '8px', color: '#2c2620', fontSize: '13px', outline: 'none', boxSizing: 'border-box', colorScheme: 'light',
};
