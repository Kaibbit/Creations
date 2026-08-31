'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

const VERSION = '0.6.3';
const BOOKS = [
  { id: 'mateus', name: 'Mateus', chapters: 28 },
  { id: 'marcos', name: 'Marcos', chapters: 16 },
  { id: 'lucas', name: 'Lucas', chapters: 24 },
  { id: 'joao', name: 'João', chapters: 21 },
  { id: 'atos', name: 'Atos', chapters: 28 },
];
const k = (book, chapter) => `${book}-${chapter}`;
const getBook = (id) => BOOKS.find((b) => b.id === id);

function fallback() {
  return {
    title: 'Estudo guiado',
    intro: 'Leia o capítulo inteiro antes de responder. O conteúdo específico deste livro ainda será desenvolvido.',
    o: ['Quem são os personagens centrais e o que fazem?', 'Quais palavras, contrastes ou ações se destacam?', 'Qual acontecimento parece estruturar o capítulo?'],
    i: ['O que o capítulo revela sobre Jesus, Deus ou o Reino?', 'Qual conclusão é sustentada pelo próprio texto?', 'Que pergunta de interpretação ficou em aberto?'],
    refs: [], x: ['Que outro texto bíblico ajuda a iluminar este capítulo?'],
    p: ['Que princípio pode ser aplicado hoje sem retirar o texto do contexto?', 'O que este capítulo confronta ou reforça em sua forma de pensar?', 'Qual resposta concreta você pretende levar deste estudo?'],
    con: 'Em poucas palavras, qual foi sua principal conclusão sobre este capítulo?',
  };
}

export default function JornadaApp() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState({});
  const [progress, setProgress] = useState({});
  const [answers, setAnswers] = useState({});
  const [notes, setNotes] = useState({});
  const [view, setView] = useState({ name: 'home' });
  const [auth, setAuth] = useState(null);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');
  const [saveState, setSaveState] = useState('idle');

  const notify = useCallback((text) => {
    setToast(text);
    clearTimeout(notify.timer);
    notify.timer = setTimeout(() => setToast(''), 2800);
  }, []);

  const loadUser = useCallback(async (userId) => {
    if (!userId) return;
    const [p, e] = await Promise.all([
      supabase.from('chapter_progress').select('*').eq('user_id', userId),
      supabase.from('study_entries').select('*').eq('user_id', userId),
    ]);
    const np = {}, na = {}, nn = {};
    for (const row of p.data || []) np[k(row.book, row.chapter)] = { read: !!row.read_completed, study: !!row.study_completed };
    for (const row of e.data || []) {
      const key = k(row.book, row.chapter);
      if (row.section === 'anotacao') nn[key] = row.content || '';
      else {
        na[key] ||= {};
        na[key][row.section] ||= {};
        na[key][row.section][row.entry_key] = row.content || '';
      }
    }
    setProgress(np); setAnswers(na); setNotes(nn);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      const c = await supabase.from('study_content').select('chapter,data').eq('book', 'marcos').order('chapter');
      if (active && !c.error) {
        const map = {}; for (const row of c.data || []) map[row.chapter] = row.data; setContent(map);
      }
      const { data } = await supabase.auth.getSession();
      if (active) setSession(data.session || null);
      if (data.session?.user?.id) await loadUser(data.session.user.id);
      const params = new URLSearchParams(window.location.search);
      if (params.get('reset') === '1') { setAuth('reset'); setMessage(''); }
      if (active) setLoading(false);
    })();
    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      if (event === 'PASSWORD_RECOVERY') { setAuth('reset'); setMessage(''); }
      setSession(next);
      if (next?.user?.id) loadUser(next.user.id);
      else { setProgress({}); setAnswers({}); setNotes({}); }
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [loadUser]);

  const countBook = useCallback((id) => {
    const book = getBook(id); let n = 0;
    for (let c = 1; c <= book.chapters; c++) if (progress[k(id, c)]?.study) n++;
    return n;
  }, [progress]);
  const total = useMemo(() => BOOKS.reduce((n, b) => n + countBook(b.id), 0), [countBook]);
  const nextMark = useMemo(() => { for (let c = 1; c <= 16; c++) if (!progress[k('marcos', c)]?.study) return c; return 16; }, [progress]);
  const go = (name, extra = {}) => { setView({ name, ...extra }); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  async function saveEntry(book, chapter, section, entryKey, value) {
    if (!session?.user?.id) return;
    setSaveState('saving');
    const { error } = await supabase.from('study_entries').upsert({ user_id: session.user.id, book, chapter: +chapter, section, entry_key: String(entryKey), content: value, updated_at: new Date().toISOString() }, { onConflict: 'user_id,book,chapter,section,entry_key' });
    if (error) { setSaveState('error'); notify('Falha ao salvar resposta.'); }
    else { setSaveState('saved'); setTimeout(() => setSaveState('idle'), 1400); }
  }

  async function saveProgress(book, chapter, state) {
    if (!session?.user?.id) return;
    setSaveState('saving');
    const { error } = await supabase.from('chapter_progress').upsert({ user_id: session.user.id, book, chapter: +chapter, read_completed: !!state.read, study_completed: !!state.study, updated_at: new Date().toISOString() }, { onConflict: 'user_id,book,chapter' });
    if (error) { setSaveState('error'); notify('Falha ao salvar progresso.'); }
    else { setSaveState('saved'); setTimeout(() => setSaveState('idle'), 1400); }
  }

  const setAnswer = (book, chapter, section, index, value) => {
    const key = k(book, chapter);
    setAnswers((old) => ({ ...old, [key]: { ...(old[key] || {}), [section]: { ...(old[key]?.[section] || {}), [String(index)]: value } } }));
  };

  async function complete(book, chapter) {
    if (!session) { setAuth('login'); notify('Entre para salvar seu estudo.'); return; }
    const key = k(book, chapter), groups = answers[key] || {}, jobs = [];
    for (const [section, vals] of Object.entries(groups)) for (const [idx, value] of Object.entries(vals || {})) jobs.push(saveEntry(book, chapter, section, idx, value));
    if ((notes[key] || '').trim()) jobs.push(saveEntry(book, chapter, 'anotacao', 'note', notes[key]));
    await Promise.all(jobs);
    const state = { read: true, study: true };
    setProgress((old) => ({ ...old, [key]: state }));
    await saveProgress(book, chapter, state);
    notify('Estudo salvo e concluído.');
  }

  async function logout() {
    await supabase.auth.signOut({ scope: 'local' });
    setSession(null); setProgress({}); setAnswers({}); setNotes({}); go('home'); notify('Você saiu da conta.');
  }

  async function submitAuth(e) {
    e.preventDefault(); setMessage('');
    const f = new FormData(e.currentTarget), email = String(f.get('email') || '').trim().toLowerCase(), password = String(f.get('password') || ''), name = String(f.get('name') || '');
    if (auth === 'forgot') {
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/?reset=1` });
      setMessage(error ? error.message : 'Enviamos o link de recuperação para o seu e-mail.'); return;
    }
    if (auth === 'reset') {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) setMessage(error.message);
      else {
        setAuth(null); setMessage('');
        window.history.replaceState({}, '', window.location.pathname);
        notify('Senha atualizada com sucesso.');
      }
      return;
    }
    if (auth === 'register') {
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: window.location.origin } });
      if (error) setMessage(error.message); else if (!data.session) setMessage('Conta criada. Confirme o e-mail e depois entre.'); else { setSession(data.session); setAuth(null); notify('Conta criada.'); }
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMessage(error.message); else { setSession(data.session); await loadUser(data.user.id); setAuth(null); notify('Conta conectada.'); }
  }

  if (loading) return <main className="page centered"><div className="panel loadingPanel"><span className="spinner"/><strong>Carregando Jornada Bíblica…</strong><span className="muted">Next Beta {VERSION}</span></div></main>;

  let main;
  if (view.name === 'bible') main = <main className="page"><div className="eyebrow">Biblioteca</div><h1>Evangelhos + Atos</h1><p className="lead">Marcos está completo. Os demais livros serão adicionados sobre a mesma estrutura.</p><BookCards books={BOOKS} count={countBook} onOpen={(id) => go('book', { id })}/></main>;
  else if (view.name === 'book') {
    const b = getBook(view.id);
    main = <main className="page"><button className="textButton" onClick={() => go('bible')}>← Livros</button><div className="bookHeader"><div><div className="eyebrow">Livro</div><h1>{b.name}</h1><p className="lead">{b.id === 'marcos' ? 'Estudo guiado completo disponível.' : 'Conteúdo guiado em desenvolvimento.'}</p></div><div className="progressBadge">{countBook(b.id)}/{b.chapters}</div></div><div className="chapterGrid">{Array.from({ length: b.chapters }, (_, i) => { const c = i + 1, state = progress[k(b.id, c)] || {}, started = Object.keys(answers[k(b.id,c)] || {}).length || (notes[k(b.id,c)] || '').trim(); const status = state.study ? 'studied' : state.read ? 'read' : started ? 'progress' : ''; return <button key={c} className={`chapterButton ${status}`} onClick={() => go('study', { id: b.id, chapter: c })}><b>{c}</b><small>{state.study ? '✓' : status === 'progress' ? '…' : state.read ? 'L' : ''}</small></button>; })}</div></main>;
  } else if (view.name === 'study') {
    const b = getBook(view.id), chapter = +view.chapter, key = k(b.id, chapter), ct = b.id === 'marcos' && content[chapter] ? content[chapter] : fallback(), state = progress[key] || {}, a = answers[key] || {};
    main = <main className="page studyPage"><div className="studyToolbar"><button className="textButton" onClick={() => go('book', { id: b.id })}>← {b.name}</button><span className={`saveIndicator ${saveState}`}>{saveState === 'saving' ? 'Salvando…' : saveState === 'saved' ? '✓ Salvo' : saveState === 'error' ? 'Falha ao salvar' : '☁ Sincronização ativa'}</span></div><article className="panel studyPanel"><div className="eyebrow">{b.name} • Next Beta {VERSION}</div><h1>{b.name} {chapter}</h1><h2>{ct.title}</h2><p className="lead">{ct.intro}</p><Section icon="📖" title="Leitura"><p className="muted">Leia o capítulo na Bíblia de sua preferência antes de avançar.</p><label className="checkRow"><input type="checkbox" checked={!!state.read} onChange={async (e) => { const next = { ...state, read: e.target.checked }; setProgress((o) => ({ ...o, [key]: next })); if (session) await saveProgress(b.id, chapter, next); }}/><span>Li o capítulo inteiro</span></label></Section><Questions icon="👀" title="Observação" list={ct.o} values={a.observacao} onChange={(i,v) => setAnswer(b.id,chapter,'observacao',i,v)} onBlur={(i,v) => saveEntry(b.id,chapter,'observacao',i,v)}/><Questions icon="🔎" title="Interpretação" list={ct.i} values={a.interpretacao} onChange={(i,v) => setAnswer(b.id,chapter,'interpretacao',i,v)} onBlur={(i,v) => saveEntry(b.id,chapter,'interpretacao',i,v)}/><Section icon="🔗" title="Conexões">{ct.refs?.length ? <div className="referenceBox"><b>Leituras relacionadas</b><p>{ct.refs.join(' • ')}</p></div> : null}<Questions compact list={ct.x} values={a.conexao} onChange={(i,v) => setAnswer(b.id,chapter,'conexao',i,v)} onBlur={(i,v) => saveEntry(b.id,chapter,'conexao',i,v)}/></Section><Questions icon="💭" title="Aplicação" list={ct.p} values={a.aplicacao} onChange={(i,v) => setAnswer(b.id,chapter,'aplicacao',i,v)} onBlur={(i,v) => saveEntry(b.id,chapter,'aplicacao',i,v)}/><Section icon="✍️" title="Conclusão"><label className="questionLabel">{ct.con}</label><textarea value={a.conclusao?.['0'] || ''} onChange={(e) => setAnswer(b.id,chapter,'conclusao',0,e.target.value)} onBlur={(e) => saveEntry(b.id,chapter,'conclusao',0,e.target.value)} placeholder="Registre sua conclusão…"/></Section><Section icon="📝" title="Anotações livres"><textarea value={notes[key] || ''} onChange={(e) => setNotes((o) => ({ ...o, [key]: e.target.value }))} onBlur={(e) => saveEntry(b.id,chapter,'anotacao','note',e.target.value)} placeholder="Dúvidas, referências, oração ou outros pensamentos…"/></Section><div className="studyActions"><button className="primaryButton" onClick={() => complete(b.id, chapter)}>{state.study ? '✓ Estudo concluído' : 'Salvar tudo e concluir'}</button>{chapter < b.chapters ? <button className="secondaryButton" onClick={() => go('study', { id: b.id, chapter: chapter + 1 })}>Próximo capítulo →</button> : null}</div></article></main>;
  } else if (view.name === 'notes') {
    const items = [];
    for (const b of BOOKS) for (let c=1;c<=b.chapters;c++) { const key=k(b.id,c), con=answers[key]?.conclusao?.['0'] || '', note=notes[key] || ''; if (con.trim() || note.trim()) items.push({ b,c,key,con,note }); }
    main = <main className="page"><div className="eyebrow">Seu estudo</div><h1>Caderno</h1><p className="lead">Conclusões e anotações reunidas em um só lugar.</p><div className="notesList">{items.length ? items.map((x) => <article className="noteCard" key={x.key}><div className="noteHeader"><b>{x.b.name} {x.c}</b><button className="textButton" onClick={() => go('study',{id:x.b.id,chapter:x.c})}>Abrir →</button></div>{x.con.trim() ? <><span className="noteLabel">Conclusão</span><p>{x.con}</p></> : null}{x.note.trim() ? <><span className="noteLabel">Anotações</span><p>{x.note}</p></> : null}</article>) : <div className="panel emptyState">Nenhuma conclusão ou anotação salva ainda.</div>}</div></main>;
  } else if (view.name === 'profile') main = <main className="page"><div className="eyebrow">Conta</div><h1>Perfil</h1><div className="panel profilePanel">{session ? <><div className="profileEmail">{session.user.email}</div><div className="profileStat"><strong>{total}/117</strong><span>capítulos estudados</span></div><button className="primaryButton" onClick={logout}>Sair da conta</button></> : <><p>Entre para sincronizar seus estudos entre aparelhos.</p><button className="primaryButton" onClick={() => setAuth('login')}>Entrar / criar conta</button></>}<span className="muted">Next Beta {VERSION}</span></div></main>;
  else main = <main className="page"><section className="hero"><div className="eyebrow light">Estudo bíblico guiado • Next Beta {VERSION}</div><h1>Conheça Jesus.<br/>Entenda o texto.</h1><p>Marcos está completo com leitura, observação, interpretação, conexões, aplicação, conclusão e caderno pessoal.</p><div className="heroActions"><button className="heroButton" onClick={() => go('study',{id:'marcos',chapter:nextMark})}>{total ? `Continuar em Marcos ${nextMark}` : 'Começar Marcos'} →</button>{!session ? <button className="heroSecondary" onClick={() => setAuth('register')}>Criar conta</button> : null}</div><div className="heroProgress"><strong>{total}</strong><span>/117 capítulos estudados</span></div></section><section className="sectionBlock"><div className="sectionHeading"><div><div className="eyebrow">Biblioteca</div><h2>Livros</h2></div><button className="textButton" onClick={() => go('bible')}>Ver todos →</button></div><BookCards books={BOOKS} count={countBook} onOpen={(id) => go('book',{id})}/></section></main>;

  return <><header className="topbar"><button className="logoButton" onClick={() => go('home')}>◈ Jornada Bíblica</button>{session ? <div className="accountArea"><span className="syncLabel">☁ {session.user.email}</span><button className="smallButton" onClick={logout}>Sair</button></div> : <button className="smallButton primarySmall" onClick={() => setAuth('login')}>Entrar</button>}</header>{main}<nav className="bottomNav"><button className={view.name==='home'?'active':''} onClick={() => go('home')}>Início</button><button className={['bible','book','study'].includes(view.name)?'active':''} onClick={() => go('bible')}>Bíblia</button><button className={view.name==='notes'?'active':''} onClick={() => go('notes')}>Caderno</button><button className={view.name==='profile'?'active':''} onClick={() => go('profile')}>Perfil</button></nav>{auth ? <AuthModal mode={auth} message={message} onClose={() => {setAuth(null);setMessage('');}} onMode={(x) => {setAuth(x);setMessage('');}} onSubmit={submitAuth}/> : null}{toast ? <div className="toast">{toast}</div> : null}</>;
}

function BookCards({ books, count, onOpen }) { return <div className="bookCards">{books.map((b) => { const n=count(b.id), pct=Math.round(n/b.chapters*100); return <button className="bookCard" key={b.id} onClick={() => onOpen(b.id)}><div className="bookCardTop"><b>{b.name}</b><span>{pct}%</span></div><div className="progressTrack"><i style={{width:`${pct}%`}}/></div><small>{n}/{b.chapters} capítulos</small></button>; })}</div>; }
function Section({ icon, title, children }) { return <section className="studySection"><div className="sectionTag"><span>{icon}</span>{title}</div>{children}</section>; }
function Questions({ icon, title, list=[], values={}, onChange, onBlur, compact=false }) { const fields=list.map((q,i) => <div className="question" key={`${i}-${q}`}><label className="questionLabel">{q}</label><textarea value={values?.[String(i)] || ''} onChange={(e) => onChange(i,e.target.value)} onBlur={(e) => onBlur(i,e.target.value)} placeholder="Escreva sua resposta…"/></div>); return compact ? <div>{fields}</div> : <Section icon={icon} title={title}>{fields}</Section>; }
function AuthModal({ mode, message, onClose, onMode, onSubmit }) { const title=mode==='register'?'Criar conta':mode==='forgot'?'Recuperar senha':mode==='reset'?'Nova senha':'Entrar'; return <div className="modalBackdrop"><div className="authModal"><button className="modalClose" onClick={onClose}>×</button><div className="eyebrow">Jornada Bíblica</div><h2>{title}</h2><form className="authForm" onSubmit={onSubmit}>{mode==='register'?<input name="name" required placeholder="Nome"/>:null}{mode!=='reset'?<input name="email" type="email" required placeholder="E-mail"/>:null}{mode!=='forgot'?<input name="password" type="password" minLength={6} required placeholder={mode==='reset'?'Nova senha':'Senha'} autoComplete={['register','reset'].includes(mode)?'new-password':'current-password'}/>:null}<button className="primaryButton" type="submit">{mode==='forgot'?'Enviar link':mode==='reset'?'Atualizar senha':title}</button></form>{message?<p className="authMessage">{message}</p>:null}{mode==='login'?<div className="authLinks"><button onClick={() => onMode('register')}>Quero criar uma conta</button><button onClick={() => onMode('forgot')}>Esqueci minha senha</button></div>:['register','forgot'].includes(mode)?<button className="backLogin" onClick={() => onMode('login')}>← Voltar para entrar</button>:null}</div></div>; }