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
  const [tab, setTab] = useState<'project' | 'todo' | 'memo'>('project');

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

  // 프로젝트 달력
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());

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
      setProjects(Array.isArray(p) ? p.filter((x: Project) => x.ID) : []);
    }).finally(() => setLoading(false));
  }, [auth]);

  const nextId = (list: any[]) => {
    if (list.length === 0) return '1';
    return String(Math.max(...list.map(x => Number(x.ID) || 0)) + 1);
  };

  const openAdd = () => {
    setEditItem(null);
    if (tab === 'todo') setForm({ 제목: '', 카테고리: '업무', 우선순위: '보통', 상태: '대기', 마감일: '', 메모: '' });
    if (tab === 'memo') setForm({ 제목: '', 내용: '', 태그: '' });
    if (tab === 'project') setForm({ 프로젝트명: '', 설명: '', 상태: '진행중', 진행률: '0', 시작일: '', 목표일: '', 메모: '' });
    setShowModal(true);
  };

  const openEdit = (item: any) => {
    setEditItem(item);
    setForm({ ...item });
    setShowModal(true);
  };

  const handleSave = async () => {
    const url = tab === 'todo' ? '/api/todo' : tab === 'memo' ? '/api/memo' : '/api/project';
    const method = editItem ? 'PUT' : 'POST';
    const body = editItem ? { ...form, ID: editItem.ID } : { ...form, ID: nextId(tab === 'todo' ? todos : tab === 'memo' ? memos : projects) };
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowModal(false);
    // 새로고침
    const res = await fetch(url).then(r => r.json());
    if (tab === 'todo') setTodos(Array.isArray(res) ? res.filter((x: Todo) => x.ID) : []);
    if (tab === 'memo') setMemos(Array.isArray(res) ? res.filter((x: Memo) => x.ID) : []);
    if (tab === 'project') setProjects(Array.isArray(res) ? res.filter((x: Project) => x.ID) : []);
  };

  const handleDelete = async (item: any) => {
    if (!confirm('삭제할까요?')) return;
    const url = tab === 'todo' ? '/api/todo' : tab === 'memo' ? '/api/memo' : '/api/project';
    await fetch(url, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ID: item.ID }) });
    const res = await fetch(url).then(r => r.json());
    if (tab === 'todo') setTodos(Array.isArray(res) ? res.filter((x: Todo) => x.ID) : []);
    if (tab === 'memo') { setMemos(Array.isArray(res) ? res.filter((x: Memo) => x.ID) : []); setSelectedMemo(null); }
    if (tab === 'project') setProjects(Array.isArray(res) ? res.filter((x: Project) => x.ID) : []);
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
            {(['project', 'todo', 'memo'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: 500,
                background: tab === t ? '#3B82F6' : 'transparent',
                color: tab === t ? '#fff' : '#94A3B8',
              }}>
                {t === 'project' ? '🚀 프로젝트' : t === 'todo' ? '✅ 할일' : '📝 메모'}
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
        {tab === 'todo' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>할일</h2>
                <p style={{ fontSize: '12px', color: '#64748B', margin: 0 }}>
                  전체 {todos.length}개 · 완료 {todos.filter(t => t.상태 === '완료').length}개 · 진행중 {todos.filter(t => t.상태 === '진행중').length}개
                </p>
              </div>
              <button onClick={openAdd} style={{ padding: '8px 16px', background: '#3B82F6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ 추가</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {todos.length === 0 && <p style={{ color: '#64748B', textAlign: 'center', padding: '40px 0' }}>할일을 추가해보세요</p>}
              {todos.map(todo => (
                <div key={todo.ID} style={{ background: '#1E293B', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', border: '1px solid #334155' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: statusColor[todo.상태] || '#94A3B8', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: todo.상태 === '완료' ? '#64748B' : '#F1F5F9', textDecoration: todo.상태 === '완료' ? 'line-through' : 'none' }}>{todo.제목}</span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: `${priorityColor[todo.우선순위]}20`, color: priorityColor[todo.우선순위] || '#94A3B8' }}>{todo.우선순위}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '11px', color: '#64748B' }}>
                      <span>{todo.카테고리}</span>
                      {todo.마감일 && <span>· D-{Math.ceil((new Date(todo.마감일).getTime() - Date.now()) / 86400000)}</span>}
                      {todo.메모 && <span>· {todo.메모}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '6px', background: `${statusColor[todo.상태]}20`, color: statusColor[todo.상태] || '#94A3B8' }}>{todo.상태}</span>
                    <button onClick={() => openEdit(todo)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>✏️</button>
                    <button onClick={() => handleDelete(todo)} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', fontSize: '14px', padding: '0 4px' }}>🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── 메모 탭 ── */}
        {tab === 'memo' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>메모</h2>
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
        {tab === 'project' && (() => {
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
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>프로젝트</h2>
                <button onClick={openAdd} style={{ padding: '8px 16px', background: '#3B82F6', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ 추가</button>
              </div>

              {/* 달력 */}
              <div style={{ background: '#1E293B', borderRadius: '12px', padding: '16px', border: '1px solid #334155', marginBottom: '16px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y-1); } else setCalMonth(m => m-1); }}
                    style={{ background: '#334155', border: 'none', borderRadius: '6px', color: '#F1F5F9', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}>‹</button>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#F1F5F9' }}>{calYear}년 {calMonth+1}월</span>
                  <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y+1); } else setCalMonth(m => m+1); }}
                    style={{ background: '#334155', border: 'none', borderRadius: '6px', color: '#F1F5F9', width: '28px', height: '28px', cursor: 'pointer', fontSize: '14px' }}>›</button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: '4px' }}>
                  {['일','월','화','수','목','금','토'].map((d, i) => (
                    <div key={d} style={{ textAlign: 'center', fontSize: '11px', color: i===0 ? '#EF4444' : i===6 ? '#60A5FA' : '#64748B', padding: '4px 0', fontWeight: 500 }}>{d}</div>
                  ))}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: '2px' }}>
                  {Array.from({ length: totalCells }, (_, i) => {
                    const day = i - firstDay + 1;
                    const isValid = day >= 1 && day <= daysInMonth;
                    const isToday = isValid && new Date(calYear, calMonth, day).toDateString() === calNow.toDateString();
                    const projs = isValid ? getProjectsForDate(day) : [];
                    const dow = i % 7;
                    return (
                      <div key={i} style={{ minHeight: '58px', padding: '4px', borderRadius: '6px', background: isToday ? '#1E3A5F' : '#0F172A', border: `1px solid ${isToday ? '#3B82F6' : '#1E293B'}` }}>
                        {isValid && (
                          <>
                            <div style={{ fontSize: '11px', fontWeight: isToday ? 700 : 400, color: isToday ? '#60A5FA' : dow===0 ? '#EF4444' : dow===6 ? '#60A5FA' : '#94A3B8', marginBottom: '2px' }}>{day}</div>
                            {projs.slice(0,2).map((p, pi) => (
                              <div key={pi} style={{ fontSize: '9px', background: PROJ_COLORS[projects.indexOf(p) % PROJ_COLORS.length]+'30', color: PROJ_COLORS[projects.indexOf(p) % PROJ_COLORS.length], borderRadius: '3px', padding: '1px 4px', marginBottom: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.프로젝트명}</div>
                            ))}
                            {projs.length > 2 && <div style={{ fontSize: '9px', color: '#64748B' }}>+{projs.length-2}</div>}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {projects.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #334155' }}>
                    {projects.map((p, i) => (
                      <div key={p.ID} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: PROJ_COLORS[i % PROJ_COLORS.length] }} />
                        <span style={{ fontSize: '11px', color: '#94A3B8' }}>{p.프로젝트명}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 프로젝트 카드 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                {projects.length === 0 && <p style={{ color: '#64748B', textAlign: 'center', padding: '40px 0' }}>프로젝트를 추가해보세요</p>}
                {projects.map((proj, i) => {
                  const pct = parseInt(proj.진행률) || 0;
                  const color = PROJ_COLORS[i % PROJ_COLORS.length];
                  return (
                    <div key={proj.ID} style={{ background: '#1E293B', borderRadius: '12px', padding: '16px', border: `1px solid ${color}40` }}>
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
              {editItem ? '수정' : '추가'} — {tab === 'todo' ? '할일' : tab === 'memo' ? '메모' : '프로젝트'}
            </h3>

            {tab === 'todo' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <input placeholder="제목" value={form.제목 || ''} onChange={e => setForm({ ...form, 제목: e.target.value })} style={inputStyle} />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                  <select value={form.카테고리 || '업무'} onChange={e => setForm({ ...form, 카테고리: e.target.value })} style={inputStyle}>
                    {['업무', '개인', '미팅', '기타'].map(v => <option key={v}>{v}</option>)}
                  </select>
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

            {tab === 'project' && (
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
