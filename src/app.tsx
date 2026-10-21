import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Plus, BarChart3, Users, X, 
  Calendar as CalendarIcon, MessageSquare, 
  LayoutDashboard, Send, CheckSquare, Square, 
  Lock, KeyRound, LogOut, Trash2, Clock
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, updateDoc, addDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';

const STUDENT_PASSWORD = "2cliceoparini";
const REP_PASSWORD = "r@ppresentanti26";

const firebaseConfig = {
  apiKey: "AIzaSyDXwLXCYQQbAJNJp8o2boe8z8uTGCEj3m0",
  authDomain: "capp-63cd9.firebaseapp.com",
  projectId: "capp-63cd9",
  storageBucket: "capp-63cd9.firebasestorage.app",
  messagingSenderId: "1025677468917",
  appId: "1:1025677468917:web:40d6b7dc3756af449b11bc",
  measurementId: "G-6YJQEC1ZNJ"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'app-2c-parini';

export default function ClassApp() {
  const [user, setUser] = useState(null);
  const [isRepView, setIsRepView] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [showRepModal, setShowRepModal] = useState(false);
  const [repPassword, setRepPassword] = useState('');
  const [repError, setRepError] = useState('');

  const [activeTab, setActiveTab] = useState('polls');
  const [toastMessage, setToastMessage] = useState(null);

  const [polls, setPolls] = useState([]);
  const [events, setEvents] = useState([]);
  const [anonymousMessages, setAnonymousMessages] = useState([]);
  const [todos, setTodos] = useState([]);

  const [showNewPollForm, setShowNewPollForm] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [newPollDeadline, setNewPollDeadline] = useState('');

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (error) { console.error(error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    
    const savedRole = localStorage.getItem('classAppRole');
    if (savedRole === 'student') { setIsAuthenticated(true); setIsRepView(false); }
    else if (savedRole === 'rep') { setIsAuthenticated(true); setIsRepView(true); }

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const publicBasePath = ['artifacts', appId, 'public', 'data'];
    
    const unsubPolls = onSnapshot(collection(db, ...publicBasePath, 'polls'), 
      (snapshot) => {
        const pollsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        pollsData.sort((a, b) => b.createdAt - a.createdAt);
        setPolls(pollsData);
      }
    );

    const unsubEvents = onSnapshot(collection(db, ...publicBasePath, 'events'), 
      (snapshot) => {
        const eventsData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        eventsData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setEvents(eventsData);
      }
    );

    const unsubMessages = onSnapshot(collection(db, ...publicBasePath, 'messages'), 
      (snapshot) => {
        const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        msgs.sort((a, b) => b.createdAt - a.createdAt);
        setAnonymousMessages(msgs);
      }
    );

    const unsubTodos = onSnapshot(collection(db, 'artifacts', appId, 'users', user.uid, 'todos'), 
      (snapshot) => {
        const todosData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        todosData.sort((a, b) => a.createdAt - b.createdAt);
        setTodos(todosData);
      }
    );

    return () => { unsubPolls(); unsubEvents(); unsubMessages(); unsubTodos(); };
  }, [user]);
    const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAppLogin = (e) => {
    e.preventDefault();
    const input = loginPassword.trim();
    if (input === STUDENT_PASSWORD) {
      setIsAuthenticated(true); setIsRepView(false); setLoginError('');
      localStorage.setItem('classAppRole', 'student');
      showToast("Accesso effettuato!");
    } else if (input === REP_PASSWORD) {
      setIsAuthenticated(true); setIsRepView(true); setLoginError('');
      localStorage.setItem('classAppRole', 'rep');
      showToast("Accesso Rappresentante effettuato!");
    } else { setLoginError("Password errata. Riprova!"); }
  };

  const handleToggleRepView = () => {
    if (isRepView) {
      setIsRepView(false);
      if (activeTab === 'dashboard') setActiveTab('polls');
      showToast("Passato a Vista Studente");
    } else { setRepPassword(''); setRepError(''); setShowRepModal(true); }
  };

  const handleUnlockRep = (e) => {
    e.preventDefault();
    if (repPassword.trim() === REP_PASSWORD) {
      setIsRepView(true); setShowRepModal(false); setRepError('');
      localStorage.setItem('classAppRole', 'rep');
      showToast("Modalità Rappresentante sbloccata!");
    } else { setRepError("Password errata!"); }
  };

  const handleLogout = () => {
    setIsAuthenticated(false); setIsRepView(false); setLoginPassword('');
    localStorage.removeItem('classAppRole');
    showToast("App bloccata.");
  };

  const handleAddPoll = async () => {
    if (!newPollQuestion.trim() || !user) return;
    const validOptions = newPollOptions.filter(o => o.trim() !== '');
    if (validOptions.length < 2) { showToast("Inserisci almeno 2 opzioni!"); return; }

    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'polls'), {
        question: newPollQuestion, totalVotes: 0, votedUsers: [],
        expiresAt: newPollDeadline ? new Date(newPollDeadline).getTime() : null,
        options: validOptions.map(opt => ({ text: opt, votes: 0, percentage: 0 })),
        createdAt: Date.now()
      });
      setNewPollQuestion(''); setNewPollOptions(['', '']); setNewPollDeadline(''); setShowNewPollForm(false);
      showToast("Sondaggio creato!");
    } catch (err) { console.error(err); showToast("Errore!"); }
  };

  const handleDeletePoll = async (id) => {
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'polls', id)); showToast("Sondaggio eliminato."); } 
    catch (err) { console.error(err); }
  };

  const handleVote = async (pollId, optionIndex) => {
    if (!user) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    
    if (poll.expiresAt && Date.now() > poll.expiresAt) { showToast("Questo sondaggio è scaduto!"); return; }
    const hasVoted = poll.votedUsers?.includes(user.uid);
    if (hasVoted) return;

    const newOptions = [...poll.options];
    newOptions[optionIndex].votes += 1;
    const newTotal = poll.totalVotes + 1;
    newOptions.forEach(opt => opt.percentage = Math.round((opt.votes / newTotal) * 100) || 0);

    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'polls', pollId), {
        totalVotes: newTotal, options: newOptions, votedUsers: [...(poll.votedUsers || []), user.uid]
      });
      showToast("Voto registrato!");
    } catch (err) { console.error(err); }
  };

  const [newEvent, setNewEvent] = useState({ date: '', subject: '', type: 'Scritto' });
  const handleAddEvent = async () => {
    if (!newEvent.date || !newEvent.subject || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { ...newEvent, createdAt: Date.now() });
      setNewEvent({ date: '', subject: '', type: 'Scritto' }); showToast("Verifica salvata.");
    } catch (err) { console.error(err); }
  };

  const [newMsg, setNewMsg] = useState('');
  const handleSendAnonMsg = async () => {
    if (!newMsg.trim() || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), { text: newMsg, date: new Date().toISOString().split('T')[0], createdAt: Date.now() });
      setNewMsg(''); showToast("Inviato anonimamente.");
    } catch (err) { console.error(err); }
  };

  const [newTodo, setNewTodo] = useState('');
  const handleAddTodo = async () => {
    if (!newTodo.trim() || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'todos'), { text: newTodo, done: false, createdAt: Date.now() });
      setNewTodo('');
    } catch (err) { console.error(err); }
  };

  const toggleTodo = async (id, currentStatus) => {
    if (!user) return;
    try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'todos', id), { done: !currentStatus }); } 
    catch (err) { console.error(err); }
  };
    const renderPolls = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="mb-6"><h2 className="text-3xl font-black tracking-tight text-white">Dashboard</h2><p className="text-sm text-cyan-200/60 font-medium">L'hub della classe</p></div>
      {isRepView && (
        <div className="mb-8">
          <button onClick={() => setShowNewPollForm(!showNewPollForm)} className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 rounded-2xl p-4 font-bold flex items-center justify-center gap-2 transition-all backdrop-blur-md">
            {showNewPollForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {showNewPollForm ? "Annulla" : "Crea Nuovo Sondaggio"}
          </button>
          {showNewPollForm && (
            <div className="mt-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl">
              <input type="text" placeholder="Domanda del sondaggio..." className="w-full bg-black/30 border border-white/10 text-white placeholder-white/30 rounded-xl p-3 mb-4 focus:ring-2 focus:ring-cyan-500 outline-none" value={newPollQuestion} onChange={e => setNewPollQuestion(e.target.value)} />
              <div className="space-y-3 mb-4">{newPollOptions.map((opt, i) => <input key={i} type="text" placeholder={`Opzione ${i + 1}`} className="w-full bg-black/30 border border-white/10 text-white placeholder-white/30 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none" value={opt} onChange={e => { const opts = [...newPollOptions]; opts[i] = e.target.value; setNewPollOptions(opts); }} />)}</div>
              <button onClick={() => setNewPollOptions([...newPollOptions, ''])} className="text-cyan-400 text-sm font-medium mb-5 flex items-center gap-1 hover:text-cyan-300"><Plus className="w-4 h-4" /> Aggiungi opzione</button>
              <div className="mb-5"><label className="block text-white/60 text-xs mb-2 uppercase tracking-wider font-bold">Scadenza (Opzionale)</label><input type="datetime-local" className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none color-scheme-dark" value={newPollDeadline} onChange={e => setNewPollDeadline(e.target.value)} /></div>
              <button onClick={handleAddPoll} className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold p-3 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]">Pubblica Ora</button>
            </div>
          )}
        </div>
      )}
      <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-white"><BarChart3 className="w-6 h-6 text-cyan-400" /> Attivi & Recenti</h3>
      {polls.length === 0 && <p className="text-white/40 text-center py-10">Nessun sondaggio al momento.</p>}
      {polls.map((poll) => {
        const hasVoted = poll.votedUsers?.includes(user?.uid);
        const isExpired = poll.expiresAt && Date.now() > poll.expiresAt;
        return (
          <div key={poll.id} className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/10 transition-all duration-300 relative overflow-hidden group">
            {isRepView && <button onClick={() => handleDeletePoll(poll.id)} className="absolute top-4 right-4 text-white/20 hover:text-red-400 transition-colors z-20"><Trash2 className="w-5 h-5" /></button>}
            <h3 className="text-lg font-semibold mb-2 text-white pr-8">{poll.question}</h3>
            {poll.expiresAt && <div className={`flex items-center gap-1.5 text-xs font-medium mb-4 ${isExpired ? 'text-red-400' : 'text-emerald-400'}`}><Clock className="w-3.5 h-3.5" /> {isExpired ? 'Scaduto' : `Scade il ${new Date(poll.expiresAt).toLocaleString('it-IT', {day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit'})}`}</div>}
            <div className="space-y-3 mt-4">{poll.options.map((option, idx) => <button key={idx} onClick={() => handleVote(poll.id, idx)} disabled={hasVoted || isExpired} className="w-full relative overflow-hidden bg-white/5 border border-white/10 rounded-xl p-3 text-left transition-all duration-300 hover:bg-white/10 active:scale-[0.98] disabled:opacity-100 disabled:active:scale-100 shadow-sm">{(hasVoted || isExpired) && <div className="absolute top-0 left-0 h-full bg-cyan-500/20 transition-all duration-1000 ease-out rounded-xl" style={{ width: `${option.percentage}%` }} />}<div className="relative flex justify-between items-center z-10"><span className="font-medium text-white/90">{option.text}</span>{(hasVoted || isExpired) && <span className="text-sm font-bold text-cyan-300">{option.percentage}%</span>}</div></button>)}</div>
          </div>
        );
      })}
    </div>
  );

  const renderCalendar = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-white"><CalendarIcon className="w-6 h-6 text-fuchsia-400" /> Calendario</h2>
      {isRepView && <div className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl mb-6 border border-fuchsia-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"><h3 className="font-bold text-fuchsia-300 mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Aggiungi Verifica</h3><div className="space-y-3"><div className="flex gap-2"><input type="date" className="flex-1 p-3 rounded-xl border border-white/10 bg-black/30 text-white text-sm color-scheme-dark outline-none focus:ring-2 focus:ring-fuchsia-500" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} /><select className="flex-1 p-3 rounded-xl border border-white/10 bg-black/30 text-white text-sm outline-none focus:ring-2 focus:ring-fuchsia-500" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}><option className="bg-slate-900">Scritto</option><option className="bg-slate-900">Orale</option><option className="bg-slate-900">Versione</option></select></div><input type="text" placeholder="Materia (es. Latino)" className="w-full p-3 rounded-xl border border-white/10 bg-black/30 text-white text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 placeholder-white/30" value={newEvent.subject} onChange={e => setNewEvent({...newEvent, subject: e.target.value})} /><button onClick={handleAddEvent} className="w-full bg-fuchsia-500 hover:bg-fuchsia-400 text-white p-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(217,70,239,0.4)]">Salva</button></div></div>}
      <div className="space-y-3">{events.length === 0 && <p className="text-white/40 text-center py-10">Nessuna verifica programmata.</p>}{events.map(event => <div key={event.id} className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/10 flex items-center gap-4"><div className="bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 rounded-2xl p-2 text-center min-w-[65px] backdrop-blur-md"><div className="text-xs uppercase font-bold tracking-wider">{new Date(event.date).toLocaleDateString('it-IT', { month: 'short' })}</div><div className="text-2xl font-black">{new Date(event.date).getDate()}</div></div><div><h4 className="font-bold text-white text-lg">{event.subject}</h4><p className="text-sm text-white/50 font-medium">{event.type}</p></div></div>)}</div>
    </div>
  );

  const renderAnonymousBox = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-white"><MessageSquare className="w-6 h-6 text-violet-400" /> Scatola Nera</h2>
      {!isRepView ? <div className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"><p className="text-sm text-white/50 mb-4">Messaggio <strong className="text-violet-400">100% anonimo</strong>, lo leggono solo i Rep.</p><textarea className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-violet-500 outline-none resize-none mb-3 text-white placeholder-white/20" placeholder="Scrivi qui..." value={newMsg} onChange={e => setNewMsg(e.target.value)}></textarea><button onClick={handleSendAnonMsg} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)]"><Send className="w-4 h-4" /> Invia ai Rep</button></div> : <div className="space-y-4">{anonymousMessages.length === 0 && <p className="text-white/40 text-center py-10">Nessun messaggio.</p>}{anonymousMessages.map(msg => <div key={msg.id} className="bg-violet-500/10 backdrop-blur-md border border-violet-500/20 p-5 rounded-3xl relative"><span className="text-xs text-violet-300/50 absolute top-4 right-4">{new Date(msg.date).toLocaleDateString('it-IT')}</span><p className="text-white/80 pr-16 text-sm leading-relaxed">{msg.text}</p></div>)}</div>}
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-white"><LayoutDashboard className="w-6 h-6 text-emerald-400" /> Area Privata</h2>
      <div className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-emerald-500/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"><h3 className="font-bold text-emerald-300 mb-4">Appunti / Da fare</h3><div className="space-y-3 mb-5">{todos.length === 0 && <p className="text-sm text-white/30">Nessun appunto.</p>}{todos.map(todo => <div key={todo.id} onClick={() => toggleTodo(todo.id, todo.done)} className="flex items-start gap-3 cursor-pointer group"><div className="mt-0.5 text-emerald-400">{todo.done ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />}</div><span className={`text-sm transition-all ${todo.done ? 'line-through text-white/30' : 'text-white/90 font-medium'}`}>{todo.text}</span></div>)}</div><div className="flex gap-2"><input type="text" placeholder="Nuova nota..." className="flex-1 p-3 rounded-xl border border-white/10 bg-black/30 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 placeholder-white/30" value={newTodo} onChange={e => setNewTodo(e.target.value)} /><button onClick={handleAddTodo} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 p-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]"><Plus className="w-5 h-5" /></button></div></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col relative max-w-md mx-auto shadow-2xl border-x border-white/5 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0"><div className="absolute -top-[20%] -left-[10%] w-[70%] h-[50%] rounded-full bg-cyan-600/20 blur-[120px]" /><div className="absolute top-[40%] -right-[20%] w-[60%] h-[40%] rounded-full bg-fuchsia-600/20 blur-[100px]" /><div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[40%] rounded-full bg-violet-600/20 blur-[100px]" /></div>
      <header className="bg-white/5 backdrop-blur-xl px-5 py-4 flex justify-between items-center sticky top-0 z-20 border-b border-white/10 shadow-sm relative"><div className="flex items-center gap-3"><div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-2 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.5)]"><Users className="text-white w-5 h-5" /></div><h1 className="text-lg font-black tracking-tight text-white drop-shadow-md">App 2C Parini</h1></div>{isAuthenticated && (<div className="flex items-center gap-2"><button onClick={handleToggleRepView} className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all shadow-lg active:scale-95 border ${isRepView ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-white/10 text-white/70 border-white/10'}`}>{isRepView ? '👤 Rep' : '👥 Studente'}</button><button onClick={handleLogout} className="p-1.5 text-white/40 hover:text-white/90 rounded-lg active:scale-90 transition-colors"><LogOut className="w-4 h-4" /></button></div>)}</header>
      {user && !isAuthenticated && <div className="flex-1 p-6 flex flex-col justify-center items-center relative z-10"><div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 w-full max-w-xs text-center"><div className="bg-cyan-500/20 border border-cyan-500/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"><Lock className="w-8 h-8" /></div><h2 className="text-2xl font-black mb-2 text-white">Accesso</h2><p className="text-xs text-white/50 mb-8">Inserisci la chiave d'accesso per entrare nel portale.</p><form onSubmit={handleAppLogin} className="space-y-4"><input type="password" placeholder="Password..." value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full px-5 py-4 rounded-2xl border border-white/10 bg-black/40 text-white text-center text-sm outline-none focus:ring-2 focus:ring-cyan-500 placeholder-white/30" />{loginError && <p className="text-xs text-red-400 font-bold">{loginError}</p>}<button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-4 rounded-2xl active:scale-95 text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] flex justify-center gap-2 transition-all hover:brightness-110"><KeyRound className="w-4 h-4" /> Entra</button></form></div></div>}
      {user && isAuthenticated && <main className="flex-1 p-5 pb-28 overflow-y-auto relative z-10 scroll-smooth">{activeTab === 'polls' && renderPolls()} {activeTab === 'calendar' && renderCalendar()} {activeTab === 'box' && renderAnonymousBox()} {activeTab === 'dashboard' && isRepView && renderDashboard()}</main>}
      {toastMessage && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/20 text-white px-5 py-3 rounded-full text-sm font-bold shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] z-50 flex items-center gap-2 animate-in slide-in-from-top-5"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> {toastMessage}</div>}
      {showRepModal && <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50"><div className="bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] p-8 w-full max-w-xs shadow-2xl relative border border-white/10"><button onClick={() => setShowRepModal(false)} className="absolute top-6 right-6 text-white/30 hover:text-white"><X className="w-5 h-5" /></button><h3 className="text-xl font-black text-white mb-6 text-center">Sblocca Rep</h3><form onSubmit={handleUnlockRep} className="space-y-4"><input type="password" placeholder="Password Segreta" value={repPassword} onChange={(e) => setRepPassword(e.target.value)} className="w-full px-4 py-4 rounded-2xl border border-white/10 bg-black/50 text-white text-center text-sm outline-none focus:ring-2 focus:ring-cyan-500" />{repError && <p className="text-xs text-red-400 text-center font-bold">{repError}</p>}<button type="submit" className="w-full bg-white text-black font-black py-4 rounded-2xl active:scale-95 text-sm shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all">Sblocca</button></form></div></div>}
      {user && isAuthenticated && <nav className="bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 fixed bottom-0 w-full max-w-md pb-safe z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"><div className="flex justify-around items-center p-3"><button onClick={() => setActiveTab('polls')} className={`flex flex-col items-center p-2 w-16 transition-all active:scale-90 ${activeTab === 'polls' ? 'text-cyan-400 scale-110' : 'text-white/40'}`}><BarChart3 className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Sondaggi</span></button><button onClick={() => setActiveTab('calendar')} className={`flex flex-col items-center p-2 w-16 transition-all active:scale-90 ${activeTab === 'calendar' ? 'text-fuchsia-400 scale-110' : 'text-white/40'}`}><CalendarIcon className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Verifiche</span></button><button onClick={() => setActiveTab('box')} className={`flex flex-col items-center p-2 w-16 transition-all active:scale-90 ${activeTab === 'box' ? 'text-violet-400 scale-110' : 'text-white/40'}`}><MessageSquare className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Box</span></button>{isRepView && <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-2 w-16 transition-all active:scale-90 ${activeTab === 'dashboard' ? 'text-emerald-400 scale-110' : 'text-white/40'}`}><LayoutDashboard className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Privato</span></button>}</div></nav>}
    </div>
  );
}
