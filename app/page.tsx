'use client';
import { useState, useEffect } from 'react';

// ── 타입 ──────────────────────────────────────
interface Todo {
  ID: string; 제목: string; 카테고리: string; 우선순위: string;
  상태: string; 마감일: string; 메모: string; 생성일: string;
}
interface Memo {
  ID: string; 제목: string; 내용: string; 태그: string; 생성일: string; 수정일: string;
}
interface Project {
  ID: string; 프로젝트명: string; 설명: string; 상태: string;
  진행률: string; 시작일: string; 목표일: string; 메모: string;
}

const PASSWORD = 'selvatico2026';

export default function Home() {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<'board' | 'task' | 'memo'>('board');

  // 데이터
  const [todos, setTodos] = useState<Todo[]>([]);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);

  // 모달
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  // 메모 선택
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);

  const [selectedProjId, setSelectedProjId] = useState<string | null>(null);

  // 프로젝트 달력
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [hoveredProj, setHoveredProj] = useState<string | null>(null);

  // 로그인 유지
  useEffect(() => {
    if (sessionStorage.getItem('pd_auth') === 'true') setAuth(true);
  }, []);

  const handleLogin = () => {
    if (pw === PASSWORD) {
      setAuth(true);
      sessionStorage.setItem('pd_auth', 'true');
    } else {
      setPwError(true);
      setTimeout(() => setPwError(false), 2000);
    }
  };

  // 데이터 로드
  useEffect(() => {
    if (!auth) return;
    setLoading(true);
    Promise.all([
      fetch('/api/todo').then(r => r.json()),
      fetch('/api/memo').then(r => r.json()),
      fetch('/api/project').then(r => r.json()),
    ]).then(([t, m, p]) => {
      setTodos(Array.isArray(t) ? t.filter((x: Todo) => x.ID) : []);
      setMemos(Array.isArray(m) ? m.filter((x: Memo) => x.ID) : []);
      setProjects(Array.isArray(p) ? p.filter((x: Project) => x.ID).map((x: Project) => ({
        ...x,
        시작일: (x.시작일 || '').replace(/^'/, ''),
        목표일: (x.목표일 || '').replace(/^'/, ''),
      })) : []);
    }).finally(() => setLoading(false));
  }, [auth]);

  const nextId = (list: any[]) => {
    if (list.length === 0) return '1';
    return String(Math.max(...list.map(x => Number(x.ID) || 0)) + 1);
  };

  const openAdd = () => {
    setEditItem(null);
    if (tab === 'task') setForm({ 프로젝트ID: selectedProjId || '', 제목: '', 우선순위: '보통', 상태: '대기', 마감일: '', 메모: '' });
    if (tab === 'memo') setForm({ 제목: '', 내용: '', 태그: '' });
    if (tab === 'board') setForm({ 프로젝트명: '', 설명: '', 상태: '진행중', 진행률: '0', 시작일: '', 목표일: '', 메모: '' });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ ...item });
    setShowModal(true);
  };

  const handleSave = async () => {
    const url = tab === 'task' ? '/api/todo' : tab === 'memo' ? '/api/memo' : '/api/project';
    const method = editItem ? 'PUT' : 'POST';
    const body = editItem ? { ...form, ID: editItem.ID } : { ...form, ID: nextId(tab === 'task' ? todos : tab === 'memo' ? memos : projects) };
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowModal(false);
    // 새로고침
    const res = await fetch(url).then(r => r.json());
    if (tab === 'task') setTodos(Array.isArray(res) ? res.filter((x: Todo) => x.ID) : []);
    if (tab === 'memo') setMemos(Array.isArray(res) ? res.filter((x: Memo) => x.ID) : []);
    if (tab === 'board') setProjects(Array.isArray(res) ? res.filter((x: Project) => x.ID) : []);
  };

  const handleDelete = async (item: any) => {
    if (!confirm('삭제할까요?')) return;
    const url = tab === 'task' ? '/api/todo' : tab === 'memo' ? '/api/memo' : '/api/project';
    await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID: item.ID }) });
    const res = await fetch(url).then(r => r.json());
    if (tab === 'task') setTodos(Array.isArray(res) ? res.filter((x: Todo) => x.ID) : []);
    if (tab === 'memo') { setMemos(Array.isArray(res) ? res.filter((x: Memo) => x.ID) : []); setSelectedMemo(null); }
    if (tab === 'board') setProjects(Array.isArray(res) ? res.filter((x: Project) => x.ID) : []);
  };

  const statusColor: Record<string, string> = {
    '대기': '#94A3B8', '진행중': '#3B82F6', '완료': '#22C55E', '보류': '#F59E0B',
  };
  const priorityColor: Record<string, string> = { '높음': '#EF4444', '보통': '#3B82F6', '낮음': '#94A3B8' };
  const progressColor = (p: number) => p >= 80 ? '#22C55E' : p >= 40 ? '#3B82F6' : '#94A3B8';

  // ── 로그인 화면 ──────────────────────────────
  if (!auth) return (
    <div style={{ minHeight: '100vh', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ background: '#1E293B', borderRadius: '16px', padding: '48px 40px', width: '340px', boxShadow: '0 25px 50px rgba(0,0,0,0.5)' }}>
        <p style={{ fontSize: '11px', color: '#64748B', letterSpacing: '0.15em', margin: '0 0 8px' }}>PERSONAL WORKSPACE</p>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#F1F5F9', margin: '0 0 32px' }}>전동열</h1>
        <input
          type="password"
          placeholder="비밀번호 입력"
          value={pw}
          onChange={e => setPw(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          style={{ width: '100%', padding: '12px 16px', background: '#0F172A', border: `1px solid ${pwError ? '#EF4444' : '#334155'}`, borderRadius: '8px', color: '#F1F5F9', fontSize: '14px', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
        />
        {pwError && <p style={{ color: '#EF4444', fontSize: '12px', margin: '0 0 12px' }}>비밀번호가 틀렸어요.</p>}
        <button
          onClick={handleLogin}
          style={{ width: '100%', padding: '12px', background: '#3B82F6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', marginTop: '8px' }}
        >
          로그인
        </button>
      </div>
    </div>
  );

  // ── 메인 대시보드 ─────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#0F172A', fontFamily: 'Arial, sans-serif', color: '#F1F5F9' }}>
      {/* 헤더 */}
      <div style={{ background: '#1E293B', borderBottom: '1px solid #334155', padding: '0 24px' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '56px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '16px', fontWeight: 700, color: '#F1F5F9' }}>전동열</span>
            <span style={{ fontSize: '12px', color: '#64748B' }}>Workspace</span>
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {(['board', 'task', 'memo'] as const).map(t => (
              <button key={t} onClick={() => { setTab(t); if (t !== 'task') setSelectedProjId(null); }} style={{
                padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                background: tab === t ? '#3B82F6' : 'transparent',
                color: tab === t ? '#fff' : '#94A3B8',
              }}>
                {t === 'board' ? '📋 업무보드' : t === 'task' ? '📌 태스크' : '📝 메모'}
              </button>
            ))}
          </div>
          <button onClick={() => { sessionStorage.removeItem('pd_auth'); setAuth(false); }}
            style={{ background: 'none', border: 'none', color: '#64748B', fontSize: '12px', cursor: 'pointer' }}>로그아웃</button>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '24px' }}>
        {loading && <p style={{ color: '#64748B', textAlign: 'center' }}>불러오는 중...</p>}

        {/* ── 할일 탭 ── */}
        {tab === 'task' && (() => {
          const PROJ_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#A855F7','#06B6D4','#F97316'];
          const selectedProj = selectedProjId ? projects.find(p => p.ID === selectedProjId) : null;
          const filteredTodos = selectedProjId ? todos.filter(t => t.프로젝트ID === selectedProjId) : todos;
          const completedCount = filteredTodos.filter(t => t.상태 === '완료').length;
          const progress = filteredTodos.length > 0 ? Math.round(completedCount / filteredTodos.length * 100) : 0;

          const handleCheck = async (todo: Todo) => {
            const newStatus = todo.상태 === '완료' ? '대기' : '완료';
            await fetch('/api/todo', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...todo, 상태: newStatus }),
            });
            const res = await fetch('/api/todo').then(r => r.json());
            const newTodos = Array.isArray(res) ? res.filter((x: Todo) => x.ID) : [];
            setTodos(newTodos);
            if (selectedProjId) {
              const projTodos = newTodos.filter((t: Todo) => t.프로젝트ID === selectedProjId);
              const done = projTodos.filter((t: Todo) => t.상태 === '완료').length;
              const newProgress = projTodos.length > 0 ? Math.round(done / projTodos.length * 100) : 0;
              const proj = projects.find(p => p.ID === selectedProjId);
              if (proj) {
                await fetch('/api/project', {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ ...proj, 진행률: String(newProgress) }),
                });
                const pres = await fetch('/api/project').then(r => r.json());
                setProjects(Array.isArray(pres) ? pres.filter((x: Project) => x.ID).map((x: Project) => ({ ...x, 시작일: (x.시작일||'').replace(/^'/,''), 목표일: (x.목표일||'').replace(/^'/,'') })) : []);
              }
            }
          };

          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>📌 태스크</h2>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                    {filteredTodos.length}개 · 완료 {completedCount}개
                  </p>
                </div>
                <button onClick={openAdd} style={{ padding: '8px 16px', background: '#3B82F6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ 추가</button>
              </div>

              {/* 프로젝트 필터 탭 */}
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <button onClick={() => setSelectedProjId(null)} style={{ padding: '5px 12px', borderRadius: '16px', border: 'none', cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: !selectedProjId ? '#3B82F6' : '#1E293B', color: !selectedProjId ? '#fff' : '#94A3B8' }}>전체</button>
                {projects.map((p, i) => (
                  <button key={p.ID} onClick={() => setSelectedProjId(p.ID)} style={{ padding: '5px 12px', borderRadius: '16px', border: `1px solid ${PROJ_COLORS[i % PROJ_COLORS.length]}`, cursor: 'pointer', fontSize: '12px', fontWeight: 500, background: selectedProjId === p.ID ? PROJ_COLORS[i % PROJ_COLORS.length] : 'transparent', color: selectedProjId === p.ID ? '#fff' : PROJ_COLORS[i % PROJ_COLORS.length] }}>{p.프로젝트명}</button>
                ))}
              </div>

              {/* 선택된 프로젝트 진행률 */}
              {selectedProj && (
                <div style={{ background: '#1E293B', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9' }}>{selectedProj.프로젝트명}</span>
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#3B82F6' }}>{progress}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${progress}%`, background: '#3B82F6', borderRadius: '3px', transition: 'width 0.3s' }} />
                  </div>
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0' }}>{selectedProj.시작일} ~ {selectedProj.목표일}</p>
                </div>
              )}

              {/* 체크리스트 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {filteredTodos.length === 0 && <p style={{ color: '#64748B', textAlign: 'center', padding: '40px 0' }}>태스크를 추가해보세요</p>}
                {filteredTodos.map(todo => {
                  const isDone = todo.상태 === '완료';
                  const projIdx = projects.findIndex(p => p.ID === todo.프로젝트ID);
                  const projColor = projIdx >= 0 ? PROJ_COLORS[projIdx % PROJ_COLORS.length] : '#64748B';
                  return (
                    <div key={todo.ID} style={{ background: '#1E293B', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${isDone ? '#1E293B' : '#334155'}`, opacity: isDone ? 0.6 : 1 }}>
                      <div onClick={() => handleCheck(todo)} style={{ width: '20px', height: '20px', borderRadius: '50%', border: `2px solid ${isDone ? '#22C55E' : '#475569'}`, background: isDone ? '#22C55E' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'all 0.2s' }}>
                        {isDone && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 500, color: isDone ? '#64748B' : '#F1F5F9', textDecoration: isDone ? 'line-through' : 'none' }}>{todo.제목}</span>
                          {!selectedProjId && todo.프로젝트ID && (
                            <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: projColor + '20', color: projColor, flexShrink: 0 }}>
                              {projects.find(p => p.ID === todo.프로젝트ID)?.프로젝트명 || ''}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#64748B', marginTop: '2px' }}>
                          {todo.우선순위 && <span style={{ color: priorityColor[todo.우선순위] || '#64748B' }}>{todo.우선순위}</span>}
                          {todo.마감일 && <span>· {todo.마감일}</span>}
                          {todo.메모 && <span>· {todo.메모}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                        <button onClick={() => openEdit(todo)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
                        <button onClick={() => handleDelete(todo)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {/* ── 메모 탭 ── */}
        {tab === 'memo' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>📝 메모</h2>
              <button onClick={openAdd} style={{ padding: '8px 16px', background: '#3B82F6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ 추가</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: selectedMemo ? '280px 1fr' : '1fr', gap: '16px' }}>
              {/* 목록 */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {memos.length === 0 && <p style={{ color: '#64748B', textAlign: 'center', padding: '40px 0' }}>메모를 추가해보세요</p>}
                {memos.map(memo => (
                  <div key={memo.ID} onClick={() => setSelectedMemo(memo)} style={{
                    background: selectedMemo?.ID === memo.ID ? '#1E40AF' : '#1E293B',
                    borderRadius: '10px', padding: '12px 14px', cursor: 'pointer',
                    border: `1px solid ${selectedMemo?.ID === memo.ID ? '#3B82F6' : '#334155'}`,
                  }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, margin: '0 0 4px', color: '#F1F5F9' }}>{memo.제목}</p>
                    <p style={{ fontSize: '11px', color: '#94A3B8', margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{memo.내용}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '10px', color: '#64748B' }}>{memo.수정일}</span>
                      {memo.태그 && <span style={{ fontSize: '10px', color: '#3B82F6' }}>#{memo.태그}</span>}
                    </div>
                  </div>
                ))}
              </div>
              {/* 상세 */}
              {selectedMemo && (
                <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>{selectedMemo.제목}</h3>
                      <span style={{ fontSize: '11px', color: '#64748B' }}>{selectedMemo.수정일} 수정</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openEdit(selectedMemo)} style={{ padding: '6px 12px', background: '#334155', border: 'none', borderRadius: '6px', color: '#F1F5F9', fontSize: '12px', cursor: 'pointer' }}>수정</button>
                      <button onClick={() => handleDelete(selectedMemo)} style={{ padding: '6px 12px', background: '#7F1D1D', border: 'none', borderRadius: '6px', color: '#FCA5A5', fontSize: '12px', cursor: 'pointer' }}>삭제</button>
                    </div>
                  </div>
                  <p style={{ fontSize: '14px', color: '#CBD5E1', lineHeight: '1.8', whiteSpace: 'pre-wrap', margin: 0 }}>{selectedMemo.내용}</p>
                  {selectedMemo.태그 && <p style={{ marginTop: '16px', fontSize: '12px', color: '#3B82F6' }}>#{selectedMemo.태그}</p>}
                </div>
              )}
            </div>
          </>
        )}

        {/* ── 프로젝트 탭 ── */}
        {tab === 'board' && (() => {
          const PROJ_COLORS = ['#3B82F6','#22C55E','#F59E0B','#EF4444','#A855F7','#06B6D4','#F97316'];
          const calNow = new Date();
          const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
          const firstDay = new Date(calYear, calMonth, 1).getDay();
          const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
          const getProjectsForDate = (day: number) => {
            const dateStr = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
            return projects.filter(p => p.시작일 && p.목표일 && dateStr >= p.시작일 && dateStr <= p.목표일);
          };
          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>📋 업무보드</h2>
                <button onClick={openAdd} style={{ padding: '8px 16px', background: '#3B82F6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ 추가</button>
              </div>

              {/* 달력 */}
              {(() => {
                const firstDay = new Date(calYear, calMonth, 1).getDay();
                const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
                const prevDays = new Date(calYear, calMonth, 0).getDate();
                const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
                const today = new Date().toLocaleDateString('en-CA');

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

                // 트랙 배정 (겹치는 프로젝트는 다른 트랙)
                const validProjs = projects.filter(p => p.시작일 && p.목표일 && p.시작일 <= monthEnd && p.목표일 >= monthStart)
                  .map(p => ({ ...p, colorIndex: projects.findIndex(x => x.ID === p.ID) }));
                const sorted = [...validProjs].sort((a,b) => a.시작일.localeCompare(b.시작일));
                const tracks: string[][] = [];
                const trackedProjs = sorted.map(proj => {
                  let t = 0;
                  while (tracks[t] && tracks[t].some(end => proj.시작일 <= end)) t++;
                  if (!tracks[t]) tracks[t] = [];
                  tracks[t].push(proj.목표일);
                  return { ...proj, track: t };
                });

                const TRACK_TOP = 28;
                const TRACK_H = 20;
                const TRACK_GAP = 3;

                return (
                  <div style={{ border: '1px solid #334155', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px', background: '#1E293B' }}>
                    {/* 헤더 */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: '1px solid #334155' }}>
                      <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear((y:number) => y-1); } else setCalMonth((m:number) => m-1); }}
                        style={{ background: '#334155', border: 'none', borderRadius: '6px', color: '#F1F5F9', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}>‹</button>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9' }}>{calYear}년 {calMonth+1}월</span>
                        <button onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); }}
                          style={{ background: '#334155', border: 'none', borderRadius: '6px', padding: '3px 10px', fontSize: '11px', color: '#94A3B8', cursor: 'pointer' }}>오늘</button>
                      </div>
                      <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear((y:number) => y+1); } else setCalMonth((m:number) => m+1); }}
                        style={{ background: '#334155', border: 'none', borderRadius: '6px', color: '#F1F5F9', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}>›</button>
                    </div>
                    {/* 요일 헤더 */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', background: '#0F172A', borderBottom: '1px solid #334155' }}>
                      {['일','월','화','수','목','금','토'].map((d,i) => (
                        <div key={d} style={{ textAlign: 'center', padding: '6px 0', fontSize: '11px', fontWeight: 500, color: i===0 ? '#EF4444' : i===6 ? '#60A5FA' : '#64748B' }}>{d}</div>
                      ))}
                    </div>
                    {/* 달력 바디 */}
                    {rows.map((week, ri) => {
                      const weekProjs = trackedProjs.filter(p => week.some(c => c.date >= p.시작일 && c.date <= p.목표일));
                      const maxTrack = weekProjs.length > 0 ? Math.max(...weekProjs.map(p => p.track)) : -1;
                      const rowH = TRACK_TOP + (maxTrack + 1) * (TRACK_H + TRACK_GAP) + 8;
                      return (
                        <div key={ri} style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: ri < rows.length-1 ? '1px solid #334155' : 'none', position: 'relative', minHeight: `${Math.max(rowH, 72)}px` }}>
                          {week.map((cell, ci) => (
                            <div key={ci} style={{ borderRight: ci < 6 ? '1px solid #334155' : 'none', padding: '4px 3px', background: cell.current ? '#1E293B' : '#0F172A', minHeight: '72px' }}>
                              <div style={{
                                fontSize: '11px', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%',
                                background: cell.date === today ? '#3B82F6' : 'transparent',
                                color: cell.date === today ? '#fff' : !cell.current ? '#475569' : ci===0 ? '#EF4444' : ci===6 ? '#60A5FA' : '#94A3B8',
                                fontWeight: cell.date === today ? 700 : 400,
                              }}>{cell.day}</div>
                            </div>
                          ))}
                          {/* 프로젝트 바 */}
                          {trackedProjs.map((proj, pi) => {
                            const rowStart = week[0].date;
                            const rowEnd = week[6].date;
                            if (proj.시작일 > rowEnd || proj.목표일 < rowStart) return null;
                            const barStart = proj.시작일 > rowStart ? proj.시작일 : rowStart;
                            const barEnd = proj.목표일 < rowEnd ? proj.목표일 : rowEnd;
                            const si = week.findIndex(c => c.date === barStart);
                            const ei = week.findIndex(c => c.date === barEnd);
                            if (si < 0 || ei < 0) return null;
                            const span = ei - si + 1;
                            const isFirst = proj.시작일 === barStart;
                            const isLast = proj.목표일 === barEnd;
                            const color = PROJ_COLORS[(proj as any).colorIndex % PROJ_COLORS.length];
                            const isHovered = hoveredProj === proj.ID;
                            const isDimmed = hoveredProj !== null && !isHovered;
                            return (
                              <div key={`${proj.ID}-${ri}`}
                                onMouseEnter={() => setHoveredProj(proj.ID)}
                                onMouseLeave={() => setHoveredProj(null)}
                                style={{
                                position: 'absolute',
                                top: `${TRACK_TOP + proj.track * (TRACK_H + TRACK_GAP)}px`,
                                left: `calc(${si * (100/7)}% + 2px)`,
                                width: `calc(${span * (100/7)}% - 4px)`,
                                height: `${TRACK_H}px`,
                                background: color + '33',
                                borderTop: `2px solid ${color}`,
                                borderBottom: `2px solid ${color}`,
                                borderLeft: isFirst ? `2px solid ${color}` : 'none',
                                borderRight: isLast ? `2px solid ${color}` : 'none',
                                borderRadius: isFirst && isLast ? '4px' : isFirst ? '4px 0 0 4px' : isLast ? '0 4px 4px 0' : '0',
                                display: 'flex', alignItems: 'center', paddingLeft: isFirst ? '6px' : '2px',
                                overflow: 'hidden', boxSizing: 'border-box', cursor: 'pointer',
                                opacity: isDimmed ? 0.2 : 1,
                                filter: isHovered ? 'brightness(1.2)' : 'none',
                                transition: 'opacity 0.15s, filter 0.15s',
                                zIndex: isHovered ? 10 : 1,
                              }}>
                                {isFirst && <span style={{ fontSize: '10px', fontWeight: 500, color, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{proj.프로젝트명}</span>}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                    {/* 범례 */}
                    {projects.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', padding: '10px 16px', borderTop: '1px solid #334155' }}>
                        {projects.map((p, i) => (
                          <div key={p.ID} style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: PROJ_COLORS[i % PROJ_COLORS.length] }} />
                            <span style={{ fontSize: '11px', color: '#94A3B8' }}>{p.프로젝트명}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
              {/* 프로젝트 카드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {projects.length === 0 && <p style={{ color: '#64748B', textAlign: 'center', padding: '40px 0' }}>프로젝트를 추가해보세요</p>}
                {projects.map((proj, i) => {
                  const pct = parseInt(proj.진행률) || 0;
                  const color = PROJ_COLORS[i % PROJ_COLORS.length];
                  return (
                    <div key={proj.ID} onClick={() => { setSelectedProjId(proj.ID); setTab('task'); }} style={{ background: '#1E293B', borderRadius: '12px', padding: '16px', border: `1px solid ${color}40`, cursor: 'pointer', transition: 'border-color 0.15s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <h3 style={{ fontSize: '15px', fontWeight: 600, margin: 0 }}>{proj.프로젝트명}</h3>
                        </div>
                        <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: `${statusColor[proj.상태] || '#94A3B8'}20`, color: statusColor[proj.상태] || '#94A3B8' }}>{proj.상태}</span>
                      </div>
                      {proj.설명 && <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 12px' }}>{proj.설명}</p>}
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '11px', color: '#64748B' }}>진행률</span>
                          <span style={{ fontSize: '11px', color, fontWeight: 600 }}>{pct}%</span>
                        </div>
                        <div style={{ height: '4px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '11px', color: '#64748B' }}>{proj.시작일} ~ {proj.목표일}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={() => openEdit(proj)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '14px' }}>✏️</button>
                          <button onClick={() => handleDelete(proj)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
                        </div>
                      </div>
                      {proj.메모 && <p style={{ fontSize: '11px', color: '#64748B', margin: '8px 0 0', borderTop: '1px solid #334155', paddingTop: '8px' }}>{proj.메모}</p>}
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}
      </div>

      {/* ── 모달 ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1E293B', borderRadius: '16px', padding: '28px', width: '440px', maxWidth: '90vw', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px' }}>
              {editItem ? '수정' : '추가'} — {tab === 'task' ? '태스크' : tab === 'memo' ? '메모' : '업무보드'}
            </h3>

            {tab === 'task' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <select value={form.프로젝트ID || ''} onChange={e => setForm({ ...form, 프로젝트ID: e.target.value })} style={inputStyle}>
                  <option value=''>프로젝트 선택 (선택)</option>
                  {projects.map(p => <option key={p.ID} value={p.ID}>{p.프로젝트명}</option>)}
                </select>
                <input placeholder="제목" value={form.제목 || ''} onChange={e => setForm({ ...form, 제목: e.target.value })} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <select value={form.우선순위 || '보통'} onChange={e => setForm({ ...form, 우선순위: e.target.value })} style={inputStyle}>
                    {['높음', '보통', '낮음'].map(v => <option key={v}>{v}</option>)}
                  </select>
                  <select value={form.상태 || '대기'} onChange={e => setForm({ ...form, 상태: e.target.value })} style={inputStyle}>
                    {['대기', '진행중', '완료', '보류'].map(v => <option key={v}>{v}</option>)}
                  </select>
                  <input type="date" value={form.마감일 || ''} onChange={e => setForm({ ...form, 마감일: e.target.value })} style={inputStyle} />
                </div>
                <input placeholder="메모 (선택)" value={form.메모 || ''} onChange={e => setForm({ ...form, 메모: e.target.value })} style={inputStyle} />
              </div>
            )}

            {tab === 'memo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input placeholder="제목" value={form.제목 || ''} onChange={e => setForm({ ...form, 제목: e.target.value })} style={inputStyle} />
                <textarea placeholder="내용" value={form.내용 || ''} onChange={e => setForm({ ...form, 내용: e.target.value })} style={{ ...inputStyle, height: '140px', resize: 'vertical' }} />
                <input placeholder="태그 (선택)" value={form.태그 || ''} onChange={e => setForm({ ...form, 태그: e.target.value })} style={inputStyle} />
              </div>
            )}

            {tab === 'board' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input placeholder="프로젝트명" value={form.프로젝트명 || ''} onChange={e => setForm({ ...form, 프로젝트명: e.target.value })} style={inputStyle} />
                <input placeholder="설명" value={form.설명 || ''} onChange={e => setForm({ ...form, 설명: e.target.value })} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <select value={form.상태 || '진행중'} onChange={e => setForm({ ...form, 상태: e.target.value })} style={inputStyle}>
                    {['진행중', '완료', '보류', '대기'].map(v => <option key={v}>{v}</option>)}
                  </select>
                  <input placeholder="진행률 (0~100)" value={form.진행률 || '0'} onChange={e => setForm({ ...form, 진행률: e.target.value })} style={inputStyle} />
                  <input type="date" value={form.시작일 || ''} onChange={e => setForm({ ...form, 시작일: e.target.value })} style={inputStyle} />
                  <input type="date" value={form.목표일 || ''} onChange={e => setForm({ ...form, 목표일: e.target.value })} style={inputStyle} />
                </div>
                <textarea placeholder="메모 (선택)" value={form.메모 || ''} onChange={e => setForm({ ...form, 메모: e.target.value })} style={{ ...inputStyle, height: '80px', resize: 'vertical' }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '10px', background: '#334155', border: 'none', borderRadius: '8px', color: '#94A3B8', fontSize: '13px', cursor: 'pointer' }}>취소</button>
              <button onClick={handleSave} style={{ flex: 2, padding: '10px', background: '#3B82F6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>저장</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 12px', background: '#0F172A', border: '1px solid #334155',
  borderRadius: '8px', color: '#F1F5F9', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  colorScheme: 'dark',
};
