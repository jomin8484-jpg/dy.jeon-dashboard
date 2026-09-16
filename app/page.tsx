'use client';
import { useState, useEffect } from 'react';

// ── 타입 ──────────────────────────────────────
interface Todo {
  ID: string; 프로젝트ID: string; 제목: string; 상태: string; 우선순위: string;
  마감일: string; 메모: string; 생성일: string;
}
interface Memo {
  ID: string; 제목: string; 내용: string; 태그: string; 생성일: string; 수정일: string;
}
interface Project {
  ID: string; 프로젝트명: string; 설명: string; 상태: string;
  진행률: string; 시작일: string; 목표일: string; 메모: string;
}

const PASSWORD = 'selvatico2026';

// 날짜 형식 변환 — '2026. 9. 15' → '2026-09-15'
const toISO = (d: string) => {
  if (!d) return '';
  d = d.replace(/^'/, '').trim();
  // 이미 YYYY-MM-DD 형식이면 그대로
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  // 'YYYY. M. D' 형식 변환
  const m = d.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}`;
  return d;
};

export default function Home() {
  const [auth, setAuth] = useState(false);
  const [pw, setPw] = useState('');
  const [pwError, setPwError] = useState(false);
  const [tab, setTab] = useState<'board' | 'memo'>('board');

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
  const [newTaskTitle, setNewTaskTitle] = useState('');

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
        시작일: toISO(x.시작일 || ''),
        목표일: toISO(x.목표일 || ''),
      })) : []);
    }).finally(() => setLoading(false));
  }, [auth]);

  const nextId = (list: any[]) => {
    if (list.length === 0) return '1';
    return String(Math.max(...list.map(x => Number(x.ID) || 0)) + 1);
  };

  const openAdd = () => {
    setEditItem(null);

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
    const url = tab === 'memo' ? '/api/memo' : '/api/project';
    const method = editItem ? 'PUT' : 'POST';
    const body = editItem ? { ...form, ID: editItem.ID } : { ...form, ID: nextId(tab === 'memo' ? memos : projects) };
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowModal(false);
    // 새로고침
    const res = await fetch(url).then(r => r.json());
    if (tab === 'memo') setMemos(Array.isArray(res) ? res.filter((x: Memo) => x.ID) : []);
    if (tab === 'board') setProjects(Array.isArray(res) ? res.filter((x: Project) => x.ID).map((x: Project) => ({ ...x, 시작일: toISO(x.시작일||''), 목표일: toISO(x.목표일||'') })) : []);
  };

  const handleDelete = async (item: any) => {
    if (!confirm('삭제할까요?')) return;
    const url = tab === 'memo' ? '/api/memo' : '/api/project';
    await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID: item.ID }) });
    const res = await fetch(url).then(r => r.json());
    if (tab === 'memo') { setMemos(Array.isArray(res) ? res.filter((x: Memo) => x.ID) : []); setSelectedMemo(null); }
    if (tab === 'board') setProjects(Array.isArray(res) ? res.filter((x: Project) => x.ID).map((x: Project) => ({ ...x, 시작일: toISO(x.시작일||''), 목표일: toISO(x.목표일||'') })) : []);
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
            {(['board', 'memo'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                background: tab === t ? '#3B82F6' : 'transparent',
                color: tab === t ? '#fff' : '#94A3B8',
              }}>
                {t === 'board' ? '📋 업무보드' : '📝 메모'}
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

          const handleStatusChange = async (todo: Todo, newStatus: string) => {
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
                setProjects(Array.isArray(pres) ? pres.filter((x: Project) => x.ID).map((x: Project) => ({ ...x, 시작일: toISO(x.시작일||''), 목표일: toISO(x.목표일||'') })) : []);
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
                  <p style={{ fontSize: '11px', color: '#64748B', margin: '6px 0 0' }}>{toISO(selectedProj.시작일)} ~ {toISO(selectedProj.목표일)}</p>
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
                    <div key={todo.ID} style={{ background: '#1E293B', borderRadius: '10px', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: '12px', border: `1px solid ${isDone ? '#1E293B' : todo.상태 === '진행중' ? '#3B82F6' : '#334155'}`, opacity: isDone ? 0.6 : 1, boxShadow: todo.상태 === '진행중' ? '0 0 0 1px #3B82F630' : 'none' }}>
                      {/* 상태 드롭다운 */}
                      <select
                        value={todo.상태}
                        onChange={e => handleStatusChange(todo, e.target.value)}
                        style={{
                          padding: '3px 6px', borderRadius: '6px', border: 'none', fontSize: '11px', fontWeight: 500, cursor: 'pointer', outline: 'none', flexShrink: 0,
                          background: todo.상태 === '완료' ? '#16532430' : todo.상태 === '진행중' ? '#1E3A5F' : '#334155',
                          color: todo.상태 === '완료' ? '#22C55E' : todo.상태 === '진행중' ? '#60A5FA' : '#94A3B8',
                          colorScheme: 'dark',
                        }}
                      >
                        {['대기', '진행중', '완료'].map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
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
                          {todo.마감일 && <span>· {toISO(todo.마감일)}</span>}
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
          const selectedProj = selectedProjId ? projects.find(p => p.ID === selectedProjId) : null;
          const projTodos = selectedProjId ? todos.filter(t => t.프로젝트ID === selectedProjId) : [];
          const completedCount = projTodos.filter(t => t.상태 === '완료').length;
          const progress = projTodos.length > 0 ? Math.round(completedCount / projTodos.length * 100) : 0;

          const handleStatusChange = async (todo: Todo, newStatus: string) => {
            await fetch('/api/todo', {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...todo, 상태: newStatus }),
            });
            const res = await fetch('/api/todo').then(r => r.json());
            const newTodos = Array.isArray(res) ? res.filter((x: Todo) => x.ID) : [];
            setTodos(newTodos);
            if (selectedProjId) {
              const pt = newTodos.filter((t: Todo) => t.프로젝트ID === selectedProjId);
              const done = pt.filter((t: Todo) => t.상태 === '완료').length;
              const newProgress = pt.length > 0 ? Math.round(done / pt.length * 100) : 0;
              const proj = projects.find(p => p.ID === selectedProjId);
              if (proj) {
                await fetch('/api/project', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...proj, 진행률: String(newProgress) }) });
                const pres = await fetch('/api/project').then(r => r.json());
                setProjects(Array.isArray(pres) ? pres.filter((x: Project) => x.ID).map((x: Project) => ({ ...x, 시작일: toISO(x.시작일||''), 목표일: toISO(x.목표일||'') })) : []);
              }
            }
          };

          const handleAddTask = async () => {
            if (!selectedProjId || !newTaskTitle.trim()) return;
            const newId = nextId(todos);
            await fetch('/api/todo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID: newId, 프로젝트ID: selectedProjId, 제목: newTaskTitle.trim(), 상태: '대기', 우선순위: '보통', 마감일: '', 메모: '' }) });
            setNewTaskTitle('');
            const res = await fetch('/api/todo').then(r => r.json());
            setTodos(Array.isArray(res) ? res.filter((x: Todo) => x.ID) : []);
          };

          const handleDeleteTask = async (todo: Todo) => {
            if (!confirm('삭제할까요?')) return;
            await fetch('/api/todo', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID: todo.ID }) });
            const res = await fetch('/api/todo').then(r => r.json());
            setTodos(Array.isArray(res) ? res.filter((x: Todo) => x.ID) : []);
          };

          return (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>📋 업무보드</h2>
                <button onClick={openAdd} style={{ padding: '8px 16px', background: '#3B82F6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ 업무 추가</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: selectedProj ? '260px 1fr' : '1fr', gap: '16px' }}>
                {/* 왼쪽: 업무 목록 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {projects.length === 0 && <p style={{ color: '#64748B', textAlign: 'center', padding: '40px 0' }}>업무를 추가해보세요</p>}
                  {projects.map((proj, i) => {
                    const color = PROJ_COLORS[i % PROJ_COLORS.length];
                    const pt = todos.filter(t => t.프로젝트ID === proj.ID);
                    const done = pt.filter(t => t.상태 === '완료').length;
                    const pct = pt.length > 0 ? Math.round(done / pt.length * 100) : parseInt(proj.진행률) || 0;
                    const isSelected = selectedProjId === proj.ID;
                    return (
                      <div key={proj.ID} onClick={() => setSelectedProjId(isSelected ? null : proj.ID)}
                        style={{ background: isSelected ? '#1E3A5F' : '#1E293B', borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', border: `1px solid ${isSelected ? '#3B82F6' : color + '40'}`, transition: 'all 0.15s' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#F1F5F9', flex: 1 }}>{proj.프로젝트명}</span>
                          <span style={{ fontSize: '10px', padding: '1px 6px', borderRadius: '8px', background: `${statusColor[proj.상태]||'#94A3B8'}20`, color: statusColor[proj.상태]||'#94A3B8', whiteSpace: 'nowrap' }}>{proj.상태}</span>
                        </div>
                        {proj.설명 && <p style={{ fontSize: '11px', color: '#64748B', margin: '0 0 6px', paddingLeft: '16px' }}>{proj.설명}</p>}
                        <div style={{ paddingLeft: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                            <span style={{ fontSize: '10px', color: '#64748B' }}>{done}/{pt.length} 완료</span>
                            <span style={{ fontSize: '10px', color: color, fontWeight: 600 }}>{pct}%</span>
                          </div>
                          <div style={{ height: '3px', background: '#334155', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '2px' }} />
                          </div>
                          {(proj.시작일 || proj.목표일) && (
                            <p style={{ fontSize: '10px', color: '#475569', margin: '4px 0 0' }}>{proj.시작일} ~ {proj.목표일}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 오른쪽: 선택된 업무 체크리스트 */}
                {selectedProj && (
                  <div style={{ background: '#1E293B', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
                    {/* 헤더 */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                      <div>
                        <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 4px' }}>{selectedProj.프로젝트명}</h3>
                        {selectedProj.설명 && <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>{selectedProj.설명}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button onClick={() => { openEdit(selectedProj); }} style={{ padding: '5px 10px', background: '#334155', border: 'none', borderRadius: '6px', color: '#94A3B8', fontSize: '12px', cursor: 'pointer' }}>수정</button>
                        <button onClick={() => { if (confirm('삭제할까요?')) handleDelete(selectedProj); }} style={{ padding: '5px 10px', background: '#7F1D1D', border: 'none', borderRadius: '6px', color: '#FCA5A5', fontSize: '12px', cursor: 'pointer' }}>삭제</button>
                      </div>
                    </div>

                    {/* 진행률 */}
                    <div style={{ marginBottom: '16px', padding: '10px 12px', background: '#0F172A', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <span style={{ fontSize: '12px', color: '#64748B' }}>진행률</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#3B82F6' }}>{progress}%</span>
                      </div>
                      <div style={{ height: '5px', background: '#334155', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${progress}%`, background: '#3B82F6', borderRadius: '3px', transition: 'width 0.3s' }} />
                      </div>
                      <p style={{ fontSize: '11px', color: '#475569', margin: '6px 0 0' }}>{projTodos.length}개 항목 · 완료 {completedCount}개</p>
                    </div>

                    {/* 체크리스트 */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '12px' }}>
                      {projTodos.length === 0 && <p style={{ color: '#64748B', fontSize: '13px', textAlign: 'center', padding: '20px 0' }}>아래에서 태스크를 추가해보세요</p>}
                      {projTodos.map(todo => {
                        const isDone = todo.상태 === '완료';
                        return (
                          <div key={todo.ID} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#1E293B', borderRadius: '8px', border: `1px solid ${todo.상태 === '진행중' ? '#3B82F6' : isDone ? '#1E293B' : '#334155'}`, opacity: isDone ? 0.6 : 1 }}>
                            <select value={todo.상태} onChange={e => handleStatusChange(todo, e.target.value)}
                              style={{ padding: '2px 5px', borderRadius: '5px', border: 'none', fontSize: '10px', fontWeight: 500, cursor: 'pointer', outline: 'none', flexShrink: 0, colorScheme: 'dark',
                                background: todo.상태 === '완료' ? '#16532430' : todo.상태 === '진행중' ? '#1E3A5F' : '#334155',
                                color: todo.상태 === '완료' ? '#22C55E' : todo.상태 === '진행중' ? '#60A5FA' : '#94A3B8' }}>
                              {['대기','진행중','완료'].map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <span style={{ flex: 1, fontSize: '13px', color: isDone ? '#64748B' : '#F1F5F9', textDecoration: isDone ? 'line-through' : 'none' }}>{todo.제목}</span>
                            {todo.마감일 && <span style={{ fontSize: '10px', color: '#64748B', flexShrink: 0 }}>{toISO(todo.마감일)}</span>}
                            <button onClick={() => handleDeleteTask(todo)} style={{ background: 'none', border: 'none', color: '#475569', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}>🗑️</button>
                          </div>
                        );
                      })}
                    </div>

                    {/* 태스크 빠른 추가 */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        placeholder="태스크 추가..."
                        value={newTaskTitle}
                        onChange={e => setNewTaskTitle(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                        style={{ flex: 1, padding: '8px 12px', background: '#0F172A', border: '1px solid #334155', borderRadius: '8px', color: '#F1F5F9', fontSize: '13px', outline: 'none', colorScheme: 'dark' }}
                      />
                      <button onClick={handleAddTask} style={{ padding: '8px 14px', background: '#3B82F6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>추가</button>
                    </div>
                  </div>
                )}
              </div>
            </>
          );
      </div>

      {/* ── 모달 ── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#1E293B', borderRadius: '16px', padding: '28px', width: '440px', maxWidth: '90vw', border: '1px solid #334155' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 20px' }}>
              {editItem ? '수정' : '추가'} — {tab === 'memo' ? '메모' : '업무보드'}
            </h3>

            {false && (
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
