import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, Plus, BarChart3, Users, X, 
  Calendar as CalendarIcon, MessageSquare, 
  LayoutDashboard, Send, CheckSquare, Square, 
  Lock, KeyRound, LogOut, Trash2, Clock,
  Eye, EyeOff, Tag, Filter, PieChart, TrendingUp, GraduationCap,
  Sparkles, BrainCircuit, Loader2
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, updateDoc, addDoc, collection, onSnapshot, deleteDoc } from 'firebase/firestore';

const STUDENT_PASSWORD = "2cliceoparini";
const REP_PASSWORD = "r@ppresentanti26";

// Le tue chiavi Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDXwLXCYQQbAJNJp8o2boe8z8uTGCEj3m0",
  authDomain: "capp-63cd9.firebaseapp.com",
  projectId: "capp-63cd9",
  storageBucket: "capp-63cd9.firebasestorage.app",
  messagingSenderId: "1025677468917",
  appId: "1:1025677468917:web:40d6b7dc3756af449b11bc",
  measurementId: "G-6YJQEC1ZNJ"
};

// La tua chiave Groq (Livello 3 AI)
const GROQ_API_KEY = "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";

const CATEGORIES = [
  { id: 'professori', label: 'Professori', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
  { id: 'strutture', label: 'Strutture e Aula', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  { id: 'rapporti', label: 'Rapporti in Classe', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  { id: 'eventi', label: 'Gite ed Eventi', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  { id: 'varie', label: 'Altro / Varie', color: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
];

const TEACHERS = [
  { id: 'summa', name: 'Prof.ssa Summa', subject: 'Italiano e Latino' },
  { id: 'magni', name: 'Prof. Magni', subject: 'Scienze Naturali' },
  { id: 'pentenero', name: 'Prof. Pentenero', subject: 'Scienze Motorie' },
  { id: 'venturi', name: 'Prof.ssa Venturi', subject: 'Inglese' },
  { id: 'focaroli', name: 'Prof.ssa Focaroli', subject: 'Greco' },
  { id: 'galbiati', name: 'Prof.ssa Galbiati', subject: 'Matematica' },
];

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'app-2c-parini';

export default function ClassApp() {
  const [user, setUser] = useState(null);
  const [isRepView, setIsRepView] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  
  const [showRepModal, setShowRepModal] = useState(false);
  const [repPassword, setRepPassword] = useState('');
  const [showRepPassword, setShowRepPassword] = useState(false);
  const [repError, setRepError] = useState('');

  const [isDataLoading, setIsDataLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('polls');
  const [toastMessage, setToastMessage] = useState(null);

  const [polls, setPolls] = useState([]);
  const [events, setEvents] = useState([]);
  const [anonymousMessages, setAnonymousMessages] = useState([]);
  const [todos, setTodos] = useState([]);

  // Form Sondaggi
  const [showNewPollForm, setShowNewPollForm] = useState(false);
  const [newPollQuestion, setNewPollQuestion] = useState('');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);
  const [newPollDeadline, setNewPollDeadline] = useState('');

  // Messaggi e Ticket
  const [selectedCategory, setSelectedCategory] = useState('professori');
  const [selectedTeacher, setSelectedTeacher] = useState('summa');
  const [msgFilterStatus, setMsgFilterStatus] = useState('all');

  // AI State
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

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

  useEffect(() => {
    if (isAuthenticated) {
      setIsDataLoading(true);
      const timer = setTimeout(() => setIsDataLoading(false), 800);
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, activeTab]);
    const triggerVibration = () => {
    if (typeof window !== 'undefined' && window.navigator && window.navigator.vibrate) {
      window.navigator.vibrate(40);
    }
  };

  const handleTabSwitch = (tab) => {
    triggerVibration();
    setActiveTab(tab);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleAppLogin = (e) => {
    e.preventDefault();
    triggerVibration();
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
    triggerVibration();
    if (isRepView) {
      setIsRepView(false);
      if (activeTab === 'dashboard') setActiveTab('polls');
      showToast("Passato a Vista Studente");
    } else { setRepPassword(''); setRepError(''); setShowRepPassword(false); setShowRepModal(true); }
  };

  const handleUnlockRep = (e) => {
    e.preventDefault();
    triggerVibration();
    if (repPassword.trim() === REP_PASSWORD) {
      setIsRepView(true); setShowRepModal(false); setRepError('');
      localStorage.setItem('classAppRole', 'rep');
      showToast("Modalità Rappresentante sbloccata!");
    } else { setRepError("Password errata!"); }
  };

  const handleLogout = () => {
    triggerVibration();
    setIsAuthenticated(false); setIsRepView(false); setLoginPassword(''); setShowLoginPassword(false);
    localStorage.removeItem('classAppRole');
    showToast("App bloccata.");
  };

  const handleAddPoll = async () => {
    triggerVibration();
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
    triggerVibration();
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'polls', id)); showToast("Sondaggio eliminato."); } 
    catch (err) { console.error(err); }
  };

  const handleVote = async (pollId, optionIndex) => {
    triggerVibration();
    if (!user) return;
    const poll = polls.find(p => p.id === pollId);
    if (!poll) return;
    
    if (poll.expiresAt && Date.now() > poll.expiresAt) { showToast("Sondaggio scaduto!"); return; }
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
    triggerVibration();
    if (!newEvent.date || !newEvent.subject || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'events'), { ...newEvent, createdAt: Date.now() });
      setNewEvent({ date: '', subject: '', type: 'Scritto' }); showToast("Verifica salvata.");
    } catch (err) { console.error(err); }
  };

  const [newMsg, setNewMsg] = useState('');
  const handleSendAnonMsg = async () => {
    triggerVibration();
    if (!newMsg.trim() || !user) return;
    try {
      const msgData = {
        text: newMsg, 
        category: selectedCategory,
        teacherId: selectedCategory === 'professori' ? selectedTeacher : null,
        status: 'nuovo',
        date: new Date().toISOString().split('T')[0], 
        createdAt: Date.now() 
      };
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'messages'), msgData);
      setNewMsg(''); showToast("Inviato anonimamente alla classe.");
    } catch (err) { console.error(err); }
  };

  const handleUpdateTicketStatus = async (msgId, currentStatus) => {
    triggerVibration();
    const nextStatus = currentStatus === 'nuovo' ? 'in_lavorazione' : currentStatus === 'in_lavorazione' ? 'risolto' : 'nuovo';
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'messages', msgId), { status: nextStatus });
      showToast(`Stato aggiornato: ${nextStatus.replace('_', ' ')}`);
    } catch (err) { console.error(err); }
  };

  const [newTodo, setNewTodo] = useState('');
  const handleAddTodo = async () => {
    triggerVibration();
    if (!newTodo.trim() || !user) return;
    try {
      await addDoc(collection(db, 'artifacts', appId, 'users', user.uid, 'todos'), { text: newTodo, done: false, createdAt: Date.now() });
      setNewTodo('');
    } catch (err) { console.error(err); }
  };

  const toggleTodo = async (id, currentStatus) => {
    triggerVibration();
    if (!user) return;
    try { await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'todos', id), { done: !currentStatus }); } 
    catch (err) { console.error(err); }
  };

  // ==========================================
  // FUNZIONE MAGICA: INTEGRAZIONE GROQ AI
  // ==========================================
  const generateAISummary = async () => {
    triggerVibration();
    if (anonymousMessages.length === 0) {
      showToast("Non ci sono messaggi da analizzare!");
      return;
    }
    
    setIsGeneratingAI(true);
    setAiSummary('');
    
    try {
      const messagesData = anonymousMessages.map(m => {
        let context = `[Categoria: ${m.category}]`;
        if (m.teacherId) {
          const t = TEACHERS.find(x => x.id === m.teacherId);
          if (t) context += ` [Docente: ${t.name}]`;
        }
        return `- ${context} Testo: "${m.text}" (Stato: ${m.status})`;
      }).join('\n');

      const prompt = `Ecco i messaggi anonimi (Scatola Nera) ricevuti dalla 2C del Liceo Parini:
${messagesData}

Sei l'assistente AI dei rappresentanti di classe. Il tuo compito è leggere tutto e generare un "Executive Summary" (una sintesi chiara e utile) per aiutarli a gestire la classe. 
Struttura la risposta in questo modo:
1. 🚨 **Punti Critici Principali**: Quali sono le lamentele o i problemi più urgenti?
2. 👩‍🏫 **Feedback sui Docenti**: C'è qualche docente che sta ricevendo molte segnalazioni? Spiega brevemente il motivo.
3. 💡 **Proposte per i Rappresentanti**: Suggerisci 2 strategie pratiche o argomenti da portare al prossimo consiglio di classe per risolvere questi problemi.

Rispondi in modo conciso, professionale ma amichevole. Usa un tono da "alleato dei rappresentanti". Non fare introduzioni inutili, vai dritto al sodo.`;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            { role: 'system', content: 'Sei un assistente smart per studenti liceali.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.6,
          max_tokens: 800
        })
      });

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        setAiSummary(data.choices[0].message.content);
      } else {
        showToast("Errore di risposta dall'AI.");
      }
    } catch (error) {
      console.error(error);
      showToast("Errore di connessione con Groq.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const SkeletonCard = () => (
    <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10 animate-pulse w-full">
      <div className="h-5 bg-white/20 rounded-full w-2/3 mb-5"></div>
      <div className="space-y-3"><div className="h-12 bg-white/10 rounded-xl w-full"></div><div className="h-12 bg-white/10 rounded-xl w-full"></div></div>
    </div>
  );

  const hour = new Date().getHours();
  const getDynamicBackground = () => {
    if (hour >= 6 && hour < 12) {
      return (<div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-1000"><div className="absolute -top-[20%] -left-[10%] w-[70%] h-[50%] rounded-full bg-sky-400/20 blur-[120px]" /><div className="absolute top-[40%] -right-[20%] w-[60%] h-[40%] rounded-full bg-cyan-300/20 blur-[100px]" /><div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[40%] rounded-full bg-emerald-400/10 blur-[100px]" /></div>);
    } else if (hour >= 12 && hour < 19) {
      return (<div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-1000"><div className="absolute -top-[20%] -left-[10%] w-[70%] h-[50%] rounded-full bg-cyan-600/20 blur-[120px]" /><div className="absolute top-[40%] -right-[20%] w-[60%] h-[40%] rounded-full bg-fuchsia-600/20 blur-[100px]" /><div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[40%] rounded-full bg-violet-600/20 blur-[100px]" /></div>);
    } else {
      return (<div className="absolute inset-0 pointer-events-none overflow-hidden z-0 transition-colors duration-1000"><div className="absolute -top-[20%] -left-[10%] w-[70%] h-[50%] rounded-full bg-indigo-900/40 blur-[120px]" /><div className="absolute top-[40%] -right-[20%] w-[60%] h-[40%] rounded-full bg-purple-900/30 blur-[100px]" /><div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[40%] rounded-full bg-slate-800/50 blur-[100px]" /></div>);
    }
  };
    const renderPolls = () => (
    <div className="space-y-6 animate-slide-up">
      <div className="mb-6"><h2 className="text-3xl font-black tracking-tight text-white">Dashboard</h2><p className="text-sm text-cyan-200/60 font-medium">L'hub della classe</p></div>
      {isRepView && (
        <div className="mb-8">
          <button onClick={() => { triggerVibration(); setShowNewPollForm(!showNewPollForm); }} className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-300 rounded-2xl p-4 font-bold flex items-center justify-center gap-2 transition-all backdrop-blur-md">
            {showNewPollForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />} {showNewPollForm ? "Annulla" : "Crea Nuovo Sondaggio"}
          </button>
          {showNewPollForm && (
            <div className="mt-4 bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-2xl animate-slide-up">
              <input type="text" placeholder="Domanda del sondaggio..." className="w-full bg-black/30 border border-white/10 text-white placeholder-white/30 rounded-xl p-3 mb-4 focus:ring-2 focus:ring-cyan-500 outline-none" value={newPollQuestion} onChange={e => setNewPollQuestion(e.target.value)} />
              <div className="space-y-3 mb-4">{newPollOptions.map((opt, i) => <input key={i} type="text" placeholder={`Opzione ${i + 1}`} className="w-full bg-black/30 border border-white/10 text-white placeholder-white/30 rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none" value={opt} onChange={e => { const opts = [...newPollOptions]; opts[i] = e.target.value; setNewPollOptions(opts); }} />)}</div>
              <button onClick={() => { triggerVibration(); setNewPollOptions([...newPollOptions, '']); }} className="text-cyan-400 text-sm font-medium mb-5 flex items-center gap-1 hover:text-cyan-300"><Plus className="w-4 h-4" /> Aggiungi opzione</button>
              <div className="mb-5"><label className="block text-white/60 text-xs mb-2 uppercase tracking-wider font-bold">Scadenza (Opzionale)</label><input type="datetime-local" className="w-full bg-black/30 border border-white/10 text-white rounded-xl p-3 focus:ring-2 focus:ring-cyan-500 outline-none color-scheme-dark" value={newPollDeadline} onChange={e => setNewPollDeadline(e.target.value)} /></div>
              <button onClick={handleAddPoll} className="w-full bg-cyan-500 hover:bg-cyan-400 text-slate-900 font-bold p-3 rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]">Pubblica Ora</button>
            </div>
          )}
        </div>
      )}
      <h3 className="text-xl font-bold flex items-center gap-2 mb-4 text-white"><BarChart3 className="w-6 h-6 text-cyan-400" /> Attivi & Recenti</h3>
      {isDataLoading ? <div className="space-y-4"><SkeletonCard /><SkeletonCard /></div> : (
        <>
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
        </>
      )}
    </div>
  );

  const renderCalendar = () => (
    <div className="space-y-6 animate-slide-up">
      <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-white"><CalendarIcon className="w-6 h-6 text-fuchsia-400" /> Calendario</h2>
      {isRepView && <div className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl mb-6 border border-fuchsia-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]"><h3 className="font-bold text-fuchsia-300 mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Aggiungi Verifica</h3><div className="space-y-3"><div className="flex gap-2"><input type="date" className="flex-1 p-3 rounded-xl border border-white/10 bg-black/30 text-white text-sm color-scheme-dark outline-none focus:ring-2 focus:ring-fuchsia-500" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} /><select className="flex-1 p-3 rounded-xl border border-white/10 bg-black/30 text-white text-sm outline-none focus:ring-2 focus:ring-fuchsia-500" value={newEvent.type} onChange={e => setNewEvent({...newEvent, type: e.target.value})}><option className="bg-slate-900">Scritto</option><option className="bg-slate-900">Orale</option><option className="bg-slate-900">Versione</option></select></div><input type="text" placeholder="Materia (es. Latino)" className="w-full p-3 rounded-xl border border-white/10 bg-black/30 text-white text-sm outline-none focus:ring-2 focus:ring-fuchsia-500 placeholder-white/30" value={newEvent.subject} onChange={e => setNewEvent({...newEvent, subject: e.target.value})} /><button onClick={handleAddEvent} className="w-full bg-fuchsia-500 hover:bg-fuchsia-400 text-white p-3 rounded-xl font-bold transition-all shadow-[0_0_15px_rgba(217,70,239,0.4)]">Salva</button></div></div>}
      {isDataLoading ? <SkeletonCard /> : <div className="space-y-3">{events.length === 0 && <p className="text-white/40 text-center py-10">Nessuna verifica programmata.</p>}{events.map(event => <div key={event.id} className="bg-white/5 backdrop-blur-xl p-4 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/10 flex items-center gap-4"><div className="bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 rounded-2xl p-2 text-center min-w-[65px] backdrop-blur-md"><div className="text-xs uppercase font-bold tracking-wider">{new Date(event.date).toLocaleDateString('it-IT', { month: 'short' })}</div><div className="text-2xl font-black">{new Date(event.date).getDate()}</div></div><div><h4 className="font-bold text-white text-lg">{event.subject}</h4><p className="text-sm text-white/50 font-medium">{event.type}</p></div></div>)}</div>}
    </div>
  );

  const renderAnonymousBox = () => {
    const filteredMsgs = anonymousMessages.filter(m => msgFilterStatus === 'all' || (m.status || 'nuovo') === msgFilterStatus);
    return (
      <div className="space-y-6 animate-slide-up">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-white"><MessageSquare className="w-6 h-6 text-violet-400" /> Scatola Nera</h2>
        {!isRepView ? (
          <div className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
            <p className="text-sm text-white/50 mb-3">Messaggio <strong className="text-violet-400">100% anonimo</strong> per i Rep.</p>
            
            <label className="block text-xs font-bold text-white/60 uppercase tracking-wider mb-2">1. Seleziona Categoria</label>
            <div className="flex flex-wrap gap-2 mb-4">
              {CATEGORIES.map(cat => (
                <button key={cat.id} type="button" onClick={() => setSelectedCategory(cat.id)} className={`text-xs px-3 py-1.5 rounded-xl font-bold border transition-all ${selectedCategory === cat.id ? 'bg-violet-500 text-white border-violet-400 shadow-[0_0_10px_rgba(139,92,246,0.5)]' : 'bg-black/30 text-white/50 border-white/10'}`}>{cat.label}</button>
              ))}
            </div>

            {selectedCategory === 'professori' && (
              <div className="mb-4 animate-slide-up">
                <label className="block text-xs font-bold text-rose-300 uppercase tracking-wider mb-2 flex items-center gap-1.5"><GraduationCap className="w-4 h-4 text-rose-400" /> 2. Seleziona Docente</label>
                <select 
                  className="w-full bg-black/50 border border-rose-500/30 text-rose-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-rose-500 color-scheme-dark"
                  value={selectedTeacher}
                  onChange={e => setSelectedTeacher(e.target.value)}
                >
                  {TEACHERS.map(t => (
                    <option key={t.id} value={t.id} className="bg-slate-900 text-white">{t.name} ({t.subject})</option>
                  ))}
                </select>
              </div>
            )}

            <textarea className="w-full bg-black/30 border border-white/10 rounded-2xl p-4 min-h-[120px] focus:ring-2 focus:ring-violet-500 outline-none resize-none mb-3 text-white placeholder-white/20" placeholder="Scrivi qui la tua segnalazione o critica costruttiva..." value={newMsg} onChange={e => setNewMsg(e.target.value)}></textarea>
            <button onClick={handleSendAnonMsg} className="w-full bg-violet-600 hover:bg-violet-500 text-white font-bold py-3 rounded-xl flex justify-center items-center gap-2 transition-all shadow-[0_0_15px_rgba(124,58,237,0.4)]"><Send className="w-4 h-4" /> Invia ai Rep</button>
          </div>
        ) : (
          <div>
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
              <button onClick={() => setMsgFilterStatus('all')} className={`text-xs px-3 py-1.5 rounded-xl font-bold border ${msgFilterStatus === 'all' ? 'bg-white text-black border-white' : 'bg-black/30 text-white/40 border-white/10'}`}>Tutti ({anonymousMessages.length})</button>
              <button onClick={() => setMsgFilterStatus('nuovo')} className={`text-xs px-3 py-1.5 rounded-xl font-bold border ${msgFilterStatus === 'nuovo' ? 'bg-red-500/30 text-red-300 border-red-500' : 'bg-black/30 text-white/40 border-white/10'}`}>🔴 Nuovi</button>
              <button onClick={() => setMsgFilterStatus('in_lavorazione')} className={`text-xs px-3 py-1.5 rounded-xl font-bold border ${msgFilterStatus === 'in_lavorazione' ? 'bg-amber-500/30 text-amber-300 border-amber-500' : 'bg-black/30 text-white/40 border-white/10'}`}>🟡 In Lav.</button>
              <button onClick={() => setMsgFilterStatus('risolto')} className={`text-xs px-3 py-1.5 rounded-xl font-bold border ${msgFilterStatus === 'risolto' ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500' : 'bg-black/30 text-white/40 border-white/10'}`}>🟢 Risolti</button>
            </div>

            {isDataLoading ? <SkeletonCard /> : (
              <div className="space-y-4">
                {filteredMsgs.length === 0 && <p className="text-white/40 text-center py-10">Nessun messaggio in questo stato.</p>}
                {filteredMsgs.map(msg => {
                  const catObj = CATEGORIES.find(c => c.id === msg.category) || CATEGORIES[4];
                  const teacherObj = TEACHERS.find(t => t.id === msg.teacherId);
                  const statusKey = msg.status || 'nuovo';
                  return (
                    <div key={msg.id} className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-3xl relative">
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[10px] uppercase font-bold px-2.5 py-1 rounded-lg border ${catObj.color}`}>{catObj.label}</span>
                          {teacherObj && (
                            <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
                              <GraduationCap className="w-3 h-3" /> {teacherObj.name}
                            </span>
                          )}
                        </div>
                        <button onClick={() => handleUpdateTicketStatus(msg.id, statusKey)} className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${statusKey === 'nuovo' ? 'bg-red-500/20 text-red-300 border-red-500/40' : statusKey === 'in_lavorazione' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'}`}>
                          {statusKey === 'nuovo' ? '🔴 Nuovo' : statusKey === 'in_lavorazione' ? '🟡 In corso' : '🟢 Risolto'}
                        </button>
                      </div>
                      <p className="text-white/90 text-sm leading-relaxed mb-3">{msg.text}</p>
                      <span className="text-[10px] text-white/30">{new Date(msg.date).toLocaleDateString('it-IT')}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderDashboard = () => {
    const totalMsgs = anonymousMessages.length;
    const resolvedCount = anonymousMessages.filter(m => m.status === 'risolto').length;
    const pendingCount = anonymousMessages.filter(m => m.status === 'nuovo' || !m.status).length;
    const inProgressCount = anonymousMessages.filter(m => m.status === 'in_lavorazione').length;
    const resolutionRate = totalMsgs > 0 ? Math.round((resolvedCount / totalMsgs) * 100) : 0;

    return (
      <div className="space-y-6 animate-slide-up">
        <h2 className="text-2xl font-bold flex items-center gap-2 mb-4 text-white"><LayoutDashboard className="w-6 h-6 text-emerald-400" /> Area Privata Rep</h2>
        
        {/* 🤖 SEZIONE AI ANALYTICS */}
        <div className="bg-gradient-to-br from-indigo-500/20 to-purple-500/20 backdrop-blur-xl p-5 rounded-3xl border border-indigo-500/30 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative overflow-hidden">
          <div className="absolute -top-[20px] -right-[20px] w-[100px] h-[100px] bg-indigo-500/20 rounded-full blur-[30px]" />
          
          <h3 className="font-bold text-indigo-300 text-sm mb-3 flex items-center gap-2 z-10 relative">
            <BrainCircuit className="w-5 h-5 text-indigo-400" /> Sintesi AI della Scatola Nera
          </h3>
          
          <p className="text-xs text-white/60 mb-4 z-10 relative">L'Intelligenza Artificiale legge tutti i {totalMsgs} ticket anonimi e crea un riassunto dei problemi principali.</p>
          
          {aiSummary ? (
            <div className="bg-black/30 rounded-2xl p-4 border border-white/10 z-10 relative text-sm text-white/90 whitespace-pre-line leading-relaxed shadow-inner">
              {aiSummary}
            </div>
          ) : (
            <button 
              onClick={generateAISummary}
              disabled={isGeneratingAI || totalMsgs === 0}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-400 hover:to-purple-500 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(99,102,241,0.4)] disabled:opacity-50 disabled:cursor-not-allowed z-10 relative"
            >
              {isGeneratingAI ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isGeneratingAI ? 'Analisi in corso...' : 'Genera Sintesi AI'}
            </button>
          )}
        </div>

        {/* Analytics Summary */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
            <span className="text-xs text-white/40 font-bold uppercase">Totale Segnalazioni</span>
            <div className="text-3xl font-black text-cyan-400 mt-1">{totalMsgs}</div>
          </div>
          <div className="bg-white/5 backdrop-blur-xl p-4 rounded-2xl border border-white/10">
            <span className="text-xs text-white/40 font-bold uppercase">Tasso Risoluzione</span>
            <div className="text-3xl font-black text-emerald-400 mt-1">{resolutionRate}%</div>
          </div>
        </div>

        {/* Grafico Categorie */}
        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-white/10">
          <h3 className="font-bold text-white text-sm mb-4 flex items-center gap-2"><PieChart className="w-4 h-4 text-cyan-400" /> Distribuzione Problemi</h3>
          <div className="space-y-3">
            {CATEGORIES.map(cat => {
              const count = anonymousMessages.filter(m => m.category === cat.id).length;
              const pct = totalMsgs > 0 ? Math.round((count / totalMsgs) * 100) : 0;
              return (
                <div key={cat.id}>
                  <div className="flex justify-between text-xs font-bold mb-1">
                    <span className="text-white/80">{cat.label}</span>
                    <span className="text-cyan-300">{count} ({pct}%)</span>
                  </div>
                  <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full transition-all duration-1000" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Docenti Specifici */}
        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-rose-500/30">
          <h3 className="font-bold text-rose-300 text-sm mb-4 flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-rose-400" /> Analisi per Professore
          </h3>
          <div className="space-y-4">
            {TEACHERS.map(teacher => {
              const teacherMsgs = anonymousMessages.filter(m => m.category === 'professori' && m.teacherId === teacher.id);
              return (
                <div key={teacher.id} className="bg-black/30 rounded-2xl p-4 border border-white/5">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <h4 className="font-bold text-white text-sm">{teacher.name}</h4>
                      <span className="text-[10px] text-white/40">{teacher.subject}</span>
                    </div>
                    <span className={`text-xs font-black px-2.5 py-1 rounded-full border ${teacherMsgs.length > 0 ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-white/5 text-white/30 border-white/10'}`}>
                      {teacherMsgs.length} segnalazion{teacherMsgs.length === 1 ? 'e' : 'i'}
                    </span>
                  </div>
                  {teacherMsgs.length === 0 ? (
                    <p className="text-[11px] text-emerald-400/70 italic mt-1">Nessuna critica presente.</p>
                  ) : (
                    <div className="space-y-2 mt-3 pt-2 border-t border-white/10">
                      {teacherMsgs.map(m => (
                        <div key={m.id} className="bg-white/
                          <p className="text-white/80 leading-relaxed">{m.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Appunti Privati */}
        <div className="bg-white/5 backdrop-blur-xl p-5 rounded-3xl border border-emerald-500/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)]">
          <h3 className="font-bold text-emerald-300 mb-4">Appunti Segreti Rep</h3>
          {isDataLoading ? <div className="h-24 bg-white/5 rounded-2xl animate-pulse mb-4"></div> : (
            <div className="space-y-3 mb-5">{todos.length === 0 && <p className="text-sm text-white/30">Nessun appunto presente.</p>}{todos.map(todo => <div key={todo.id} onClick={() => toggleTodo(todo.id, todo.done)} className="flex items-start gap-3 cursor-pointer group"><div className="mt-0.5 text-emerald-400">{todo.done ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5 opacity-50 group-hover:opacity-100 transition-opacity" />}</div><span className={`text-sm transition-all ${todo.done ? 'line-through text-white/30' : 'text-white/90 font-medium'}`}>{todo.text}</span></div>)}</div>
          )}
          <div className="flex gap-2"><input type="text" placeholder="Nuova nota..." className="flex-1 p-3 rounded-xl border border-white/10 bg-black/30 text-white text-sm outline-none focus:ring-2 focus:ring-emerald-500 placeholder-white/30" value={newTodo} onChange={e => setNewTodo(e.target.value)} /><button onClick={handleAddTodo} className="bg-emerald-500 hover:bg-emerald-400 text-slate-900 p-3 rounded-xl transition-all shadow-[0_0_15px_rgba(16,185,129,0.4)]"><Plus className="w-5 h-5" /></button></div>
        </div>
      </div>
    );
  };

  return (
    <>
      <style>{`
        @keyframes slideUpFade { 0% { opacity: 0; transform: translateY(20px); } 100% { opacity: 1; transform: translateY(0); } }
        .animate-slide-up { animation: slideUpFade 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .scrollbar-none::-webkit-scrollbar { display: none; }
      `}</style>
      <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased flex flex-col relative max-w-md mx-auto shadow-2xl border-x border-white/5 overflow-hidden">
        {getDynamicBackground()}
        <header className="bg-white/5 backdrop-blur-xl px-5 py-4 flex justify-between items-center sticky top-0 z-20 border-b border-white/10 shadow-sm relative"><div className="flex items-center gap-3"><div className="bg-gradient-to-br from-cyan-400 to-blue-600 p-2 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.5)]"><Users className="text-white w-5 h-5" /></div><h1 className="text-lg font-black tracking-tight text-white drop-shadow-md">App 2C Parini</h1></div>{isAuthenticated && (<div className="flex items-center gap-2"><button onClick={handleToggleRepView} className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all shadow-lg active:scale-95 border ${isRepView ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50' : 'bg-white/10 text-white/70 border-white/10'}`}>{isRepView ? '👤 Rep' : '👥 Studente'}</button><button onClick={handleLogout} className="p-1.5 text-white/40 hover:text-white/90 rounded-lg active:scale-90 transition-colors"><LogOut className="w-4 h-4" /></button></div>)}</header>
        
        {user && !isAuthenticated && <div className="flex-1 p-6 flex flex-col justify-center items-center relative z-10 animate-slide-up"><div className="bg-white/10 backdrop-blur-2xl p-8 rounded-[2.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 w-full max-w-xs text-center"><div className="bg-cyan-500/20 border border-cyan-500/30 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]"><Lock className="w-8 h-8" /></div><h2 className="text-2xl font-black mb-2 text-white">Accesso</h2><p className="text-xs text-white/50 mb-8">Inserisci la chiave d'accesso per entrare nel portale.</p><form onSubmit={handleAppLogin} className="space-y-4">
          <div className="relative">
            <input type={showLoginPassword ? "text" : "password"} placeholder="Password..." value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full pl-5 pr-12 py-4 rounded-2xl border border-white/10 bg-black/40 text-white text-center text-sm outline-none focus:ring-2 focus:ring-cyan-500 placeholder-white/30" />
            <button type="button" onClick={() => setShowLoginPassword(!showLoginPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-cyan-400 transition-colors">{showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
          </div>
          {loginError && <p className="text-xs text-red-400 font-bold">{loginError}</p>}<button type="submit" className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-4 rounded-2xl active:scale-95 text-sm shadow-[0_0_20px_rgba(6,182,212,0.4)] flex justify-center gap-2 transition-all hover:brightness-110"><KeyRound className="w-4 h-4" /> Entra</button></form></div></div>}
        
        {user && isAuthenticated && <main className="flex-1 p-5 pb-28 overflow-y-auto relative z-10 scroll-smooth">{activeTab === 'polls' && renderPolls()} {activeTab === 'calendar' && renderCalendar()} {activeTab === 'box' && renderAnonymousBox()} {activeTab === 'dashboard' && isRepView && renderDashboard()}</main>}
        
        {toastMessage && <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-xl border border-white/20 text-white px-5 py-3 rounded-full text-sm font-bold shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] z-50 flex items-center gap-2 animate-in slide-in-from-top-5"><CheckCircle2 className="w-4 h-4 text-cyan-400" /> {toastMessage}</div>}
        
        {showRepModal && <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in"><div className="bg-slate-900/90 backdrop-blur-2xl rounded-[2.5rem] p-8 w-full max-w-xs shadow-2xl relative border border-white/10 animate-slide-up"><button onClick={() => setShowRepModal(false)} className="absolute top-6 right-6 text-white/30 hover:text-white"><X className="w-5 h-5" /></button><h3 className="text-xl font-black text-white mb-6 text-center">Sblocca Rep</h3><form onSubmit={handleUnlockRep} className="space-y-4">
          <div className="relative">
            <input type={showRepPassword ? "text" : "password"} placeholder="Password Segreta" value={repPassword} onChange={(e) => setRepPassword(e.target.value)} className="w-full pl-5 pr-12 py-4 rounded-2xl border border-white/10 bg-black/50 text-white text-center text-sm outline-none focus:ring-2 focus:ring-cyan-500" />
            <button type="button" onClick={() => setShowRepPassword(!showRepPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-cyan-400 transition-colors">{showRepPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
          </div>
          {repError && <p className="text-xs text-red-400 text-center font-bold">{repError}</p>}<button type="submit" className="w-full bg-white text-black font-black py-4 rounded-2xl active:scale-95 text-sm shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all">Sblocca</button></form></div></div>}
        
        {user && isAuthenticated && <nav className="bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 fixed bottom-0 w-full max-w-md pb-safe z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"><div className="flex justify-around items-center p-3"><button onClick={() => handleTabSwitch('polls')} className={`flex flex-col items-center p-2 w-16 transition-all active:scale-90 ${activeTab === 'polls' ? 'text-cyan-400 scale-110' : 'text-white/40'}`}><BarChart3 className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Sondaggi</span></button><button onClick={() => handleTabSwitch('calendar')} className={`flex flex-col items-center p-2 w-16 transition-all active:scale-90 ${activeTab === 'calendar' ? 'text-fuchsia-400 scale-110' : 'text-white/40'}`}><CalendarIcon className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Verifiche</span></button><button onClick={() => handleTabSwitch('box')} className={`flex flex-col items-center p-2 w-16 transition-all active:scale-90 ${activeTab === 'box' ? 'text-violet-400 scale-110' : 'text-white/40'}`}><MessageSquare className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Box</span></button>{isRepView && <button onClick={() => handleTabSwitch('dashboard')} className={`flex flex-col items-center p-2 w-16 transition-all active:scale-90 ${activeTab === 'dashboard' ? 'text-emerald-400 scale-110' : 'text-white/40'}`}><LayoutDashboard className="w-6 h-6 mb-1" /><span className="text-[10px] font-bold">Analytics</span></button>}</div></nav>}
      </div>
    </>
  );
}
