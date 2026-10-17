import { useEffect, useMemo, useRef, useState } from 'react';
import { Activity, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, CircleHelp, Command, File, FileText, Files, FolderOpen, Gauge, Headphones, HelpCircle, Layers, Menu, MessageSquareText, MoreHorizontal, PanelLeftClose, Plus, Search, Send, Settings2, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import Auth from './Auth.jsx';

const starterDocs = [
  { id: 'brief', name: 'Product strategy brief.pdf', type: 'PDF', size: '2.4 MB', updated: 'Just now', color: 'violet', content: `Product Strategy Brief — Q3 2025\n\nExecutive summary\nOur next quarter focuses on making onboarding effortless for small teams. We will prioritize a guided workspace setup, collaborative document comments, and faster search. The goal is to help a new team reach its first useful outcome within ten minutes.\n\nKey priorities\n1. Guided onboarding: introduce a five-step checklist and workspace templates. Target: improve activation from 42% to 58%.\n2. Collaboration: add inline comments and shared collections. Target: 30% more weekly team sessions.\n3. Search performance: reduce p95 query latency to under 400ms.\n\nTimeline\nJuly: onboarding research and prototype. August: private beta for collaboration. September: launch and measure activation.\n\nRisks\nThe team has limited design capacity. Search indexing costs may increase with larger workspaces. Mitigation: stage the rollout and monitor usage-based costs weekly.\n\nBudget\nEngineering: $180,000. Research and design: $45,000. Infrastructure: $24,000. Total: $249,000.` },
  { id: 'research', name: 'Customer research notes.docx', type: 'DOC', size: '846 KB', updated: 'Yesterday', color: 'blue', content: `Customer Research Notes\n\nWe interviewed 18 small-team leads across design, consulting, and non-profit organizations.\n\nWhat we heard\n“Getting started shouldn’t feel like setting up another tool.”\nTeams want one clear next step after uploading a document. 12 of 18 participants said they currently copy key findings into a separate workspace.\n\nTop themes\n1. People need quick summaries they can trust.\n2. Finding a specific commitment in a long contract is frustrating.\n3. Teams want to share a useful answer with a source attached.\n\nRecommendation\nMake citations visible, keep the original document one click away, and let people ask follow-up questions without losing context.` },
  { id: 'contract', name: 'Vendor agreement 2025.pdf', type: 'PDF', size: '1.1 MB', updated: 'Oct 12', color: 'orange', content: `Vendor Services Agreement\n\nTerm. This agreement begins on January 1, 2025 and continues for an initial term of twelve months. It renews automatically for successive one-year periods unless either party provides written notice of non-renewal at least sixty days before the end of the then-current term.\n\nFees. Customer will pay an annual subscription fee of $18,000, billed quarterly in advance. Invoices are due within thirty days. Late balances accrue interest at 1.5% per month or the maximum amount permitted by law, whichever is lower.\n\nTermination. Either party may terminate for a material breach that remains uncured for thirty days after written notice. Customer may terminate for convenience after the initial term with sixty days written notice.\n\nData. Vendor will delete customer data within thirty days of termination and provide a downloadable export upon request. Vendor will notify Customer of a security incident without undue delay and no later than seventy-two hours after discovery.\n\nConfidentiality. Each party will protect the other's confidential information using reasonable care for three years after disclosure.` },
  { id: 'meeting', name: 'Team sync — June 18.txt', type: 'TXT', size: '24 KB', updated: 'Oct 10', color: 'green', content: `Team Sync — June 18\n\nAttendees: Maya, Eli, Jordan, Sam\n\nDecisions\n• Launch the workspace templates beta on August 12.\n• Keep the first-run checklist to five steps maximum.\n• Invite the research cohort to test inline comments.\n\nAction items\n• Maya: share updated onboarding prototype by June 23.\n• Eli: confirm search latency baseline by Friday.\n• Jordan: draft beta invitation email by June 25.\n• Sam: set up a weekly infrastructure cost report.` },
];

const starterQuestions = ['Summarize the key priorities', 'What are the main risks?', 'Find deadlines and action items'];
const IconDoc = ({ type, color, size = 17 }) => type === 'DOC' ? <FileText size={size} className={`doc-icon ${color}`} /> : type === 'TXT' ? <File size={size} className={`doc-icon ${color}`} /> : <FileText size={size} className={`doc-icon ${color}`} />;

function localAnswer(question, document) {
  const text = document.content;
  const lines = text.split(/\n+/).map(s => s.trim()).filter(Boolean);
  const q = question.toLowerCase();
  let chosen;
  if (/summar|overview|about|key point|main idea/.test(q)) chosen = lines.filter((line, i) => i > 0 && line.length > 38).slice(0, 4);
  else if (/risk|concern|challenge/.test(q)) chosen = lines.filter(line => /risk|mitigat|concern|challenge|cost|limited|security/i.test(line));
  else if (/deadline|date|when|timeline|action item|due/.test(q)) chosen = lines.filter(line => /january|july|august|september|october|friday|monday|tuesday|wednesday|thursday|june|deadline|by \w+|timeline|terminat|renew|notice|launch/i.test(line));
  else if (/budget|cost|fee|price|spend/.test(q)) chosen = lines.filter(line => /\$|budget|cost|fee|invoice|price/i.test(line));
  else if (/who|owner|assign|responsib/.test(q)) chosen = lines.filter(line => /•|:/.test(line) && line.length < 150);
  else if (/term|renew|contract|agreement/.test(q)) chosen = lines.filter(line => /term|renew|agreement|terminat|notice|fee|data|confidential/i.test(line));
  else {
    const terms = q.split(/\W+/).filter(t => t.length > 3 && !['what','when','where','which','does','this','that','from','with','about','document','please','could','would','have','there'].includes(t));
    chosen = lines.filter(line => terms.some(term => line.toLowerCase().includes(term)) && line.length > 24).slice(0, 5);
  }
  const unique = [...new Set(chosen || [])].slice(0, 5);
  if (!unique.length) return { text: `I couldn’t find a direct answer in “${document.name}.” Try asking about a topic, date, risk, or cost mentioned in the document.`, sources: [] };
  return { text: unique.join('\n\n'), sources: unique.slice(0, 3).map((line, i) => ({ excerpt: line.replace(/^[•\d.]+\s*/, '').slice(0, 98), page: i + 1 })) };
}

export default function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [documents, setDocuments] = useState(starterDocs);
  const [activeId, setActiveId] = useState('brief');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState('Overview');
  const [filter, setFilter] = useState('');
  const [toast, setToast] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);
  const fileRef = useRef(null);
  useEffect(() => {
    let current = true;
    fetch('/api/auth/me').then(response => response.ok ? response.json() : null).then(result => { if (current) setUser(result?.user || null); }).catch(() => { if (current) setUser(null); }).finally(() => { if (current) setAuthReady(true); });
    return () => { current = false; };
  }, []);
  const activeDoc = documents.find(doc => doc.id === activeId) || documents[0];
  const filteredDocs = useMemo(() => documents.filter(doc => doc.name.toLowerCase().includes(query.toLowerCase())), [documents, query]);
  const showToast = message => { setToast(message); window.setTimeout(() => setToast(''), 2500); };
  const signOut = async () => { try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {} finally { setUser(null); setMessages([]); } };

  const handleFiles = async files => {
    for (const file of Array.from(files || [])) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['txt', 'md', 'csv', 'json', 'pdf'].includes(ext)) { showToast(`${file.name}: use a PDF, TXT, MD, CSV or JSON file`); continue; }
      let content = '';
      if (ext !== 'pdf') content = await file.text();
      else {
        try {
          const pdfjs = await import('https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.min.mjs');
          pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.min.mjs';
          const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
          for (let n = 1; n <= pdf.numPages; n++) { const page = await pdf.getPage(n); const text = await page.getTextContent(); content += text.items.map(item => item.str).join(' ') + '\n'; }
        } catch { showToast(`Could not read ${file.name}. Check your connection or try a text file.`); continue; }
      }
      if (!content.trim()) { showToast(`${file.name} has no readable text`); continue; }
      const doc = { id: crypto.randomUUID(), name: file.name, type: ext === 'pdf' ? 'PDF' : ext === 'docx' ? 'DOC' : 'TXT', size: `${Math.max(1, Math.round(file.size / 1024))} KB`, updated: 'Just now', color: 'blue', content };
      setDocuments(prev => [doc, ...prev]); setActiveId(doc.id); setMessages([]); setTab('Overview'); showToast(`${file.name} added`);
    }
  };

  const ask = async (question = input) => {
    const clean = question.trim(); if (!clean || busy) return;
    setInput(''); setMessages(prev => [...prev, { role: 'user', text: clean }]); setBusy(true);
    try {
      const response = await fetch('/api/ask', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: clean, document: { name: activeDoc.name, content: activeDoc.content } }) });
      if (!response.ok) throw new Error('Assistant unavailable');
      const result = await response.json(); setMessages(prev => [...prev, { role: 'assistant', text: result.answer, sources: result.sources || [] }]);
    } catch {
      const result = localAnswer(clean, activeDoc); setMessages(prev => [...prev, { role: 'assistant', text: result.text, sources: result.sources, local: true }]);
    } finally { setBusy(false); }
  };

  const summarize = () => { setTab('Ask anything'); ask('Summarize the key points and main takeaways'); };
  const exportNotes = () => {
    const text = messages.map(m => `${m.role === 'user' ? 'You' : 'Assistant'}: ${m.text}`).join('\n\n');
    const blob = new Blob([`${activeDoc.name}\n\n${text || activeDoc.content}`], { type: 'text/plain' }); const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `${activeDoc.name.replace(/\.[^.]+$/, '')}-notes.txt`; link.click(); URL.revokeObjectURL(link.href); showToast('Notes downloaded');
  };

  if (!authReady) return <div className="auth-loading"><span className="brand-mark"><Sparkles size={17}/></span><span>Getting your workspace ready…</span></div>;
  if (!user) return <Auth onAuthenticated={setUser}/>;

  const initials = user.name.split(/\s+/).slice(0, 2).map(part => part[0]).join('').toUpperCase();
  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'} ${mobileMenu ? 'mobile-open' : ''}`}>
      <div className="brand-row"><div className="brand-mark"><Sparkles size={17} strokeWidth={2.3} /></div>{sidebarOpen && <><span className="brand-name">clarity<span className="brand-dot">.</span></span><button className="icon-button sidebar-hide" title="Collapse sidebar" onClick={() => setSidebarOpen(false)}><PanelLeftClose size={17}/></button></>}</div>
      {!sidebarOpen && <button className="icon-button expand-sidebar" onClick={() => setSidebarOpen(true)} title="Expand sidebar"><PanelLeftClose size={17}/></button>}
      <button className="new-chat" onClick={() => { setMessages([]); setTab('Ask anything'); document.getElementById('question-input')?.focus(); }}><Plus size={16}/>{sidebarOpen && <span>New conversation</span>}<kbd>{sidebarOpen && '⌘ K'}</kbd></button>
      {sidebarOpen && <><div className="side-label">WORKSPACE</div><button className="nav-item active-nav"><Layers size={16}/><span>My documents</span><span className="nav-count">{documents.length}</span></button><button className="nav-item" onClick={() => showToast('Your starred documents will appear here')}><Activity size={16}/><span>Recent activity</span></button><div className="side-label recent-label">YOUR LIBRARY <button title="Add documents" onClick={() => fileRef.current?.click()}><Plus size={15}/></button></div><div className="library-list">{documents.slice(0, 5).map(doc => <button className={`library-item ${activeId === doc.id ? 'selected' : ''}`} key={doc.id} onClick={() => { setActiveId(doc.id); setMessages([]); }}><IconDoc type={doc.type} color={doc.color} size={15}/><span>{doc.name}</span></button>)}</div></>}
      <div className="sidebar-spacer"/><div className="plan-card"><div className="plan-symbol"><Sparkles size={15}/></div>{sidebarOpen && <div><div className="plan-title">A little more clarity</div><div className="plan-caption">Your documents, in focus.</div></div>}<ChevronRight size={15} className="plan-arrow"/></div>
      <button className="profile-row" onClick={signOut} title="Sign out"><div className="avatar">{initials}</div>{sidebarOpen && <><div className="profile-info"><strong>{user.name}</strong><span>Sign out</span></div><MoreHorizontal size={18} className="profile-menu"/></>}</button>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><button className="mobile-menu-button icon-button" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={19}/></button><span>Workspace</span><ChevronRight size={14}/><span className="crumb-current">My documents</span><ChevronRight size={14}/><span className="crumb-file">{activeDoc.name}</span></div><div className="top-actions"><div className="secure-label"><ShieldCheck size={14}/> Your files stay private</div><button className="icon-button help-button" title="Help" onClick={() => showToast('Drop in a document and ask a question to get started')}><CircleHelp size={17}/></button><button className="avatar top-avatar" title={user.email}>{initials}</button></div></header>
      <div className="workspace-scroll"><section className="workspace">
        <div className="page-heading"><div className="heading-copy"><div className="eyebrow"><span className="eyebrow-dot"/>YOUR WORKSPACE <span className="eyebrow-slash">/</span> DOCUMENT INTELLIGENCE</div><h1>Good morning, Jordan<span className="heading-period">.</span></h1><p>Everything you need to understand your documents, in one place.</p></div><button className="upload-button" onClick={() => fileRef.current?.click()}><Upload size={16}/> Add documents</button></div>
        <div className="summary-grid"><article className="stat-card"><div className="stat-icon purple"><Files size={17}/></div><div><span className="stat-label">IN YOUR WORKSPACE</span><div className="stat-value">{documents.length} <span>documents</span></div></div><span className="stat-trend"><Activity size={13}/> Ready</span></article><article className="stat-card"><div className="stat-icon amber"><Sparkles size={17}/></div><div><span className="stat-label">AI ASSISTANT</span><div className="stat-value">Here to <span>help</span></div></div><span className="online-dot"/></article><article className="quote-card"><div className="quote-spark"><Sparkles size={15}/></div><div><div className="quote-kicker">A THOUGHT FOR TODAY</div><p>“Clarity comes from asking<br/> better questions.”</p></div><span className="quote-credit">— your workspace</span></article></div>

        <section className="assistant-card"><div className="assistant-top"><div className="assistant-avatar"><Sparkles size={19}/></div><div className="assistant-title"><div><h2>Your document assistant</h2><span className="ai-badge">AI POWERED</span></div><p>Ask anything across your selected document</p></div><button className="icon-button assistant-more" title="More options" onClick={exportNotes}><MoreHorizontal size={20}/></button></div><div className="assistant-content"><div className="assistant-left"><div className="source-label"><span className="source-dot"/> WORKING WITH</div><button className="selected-document"><span className="document-icon-wrap"><IconDoc type={activeDoc.type} color={activeDoc.color} size={18}/></span><span className="document-meta"><strong>{activeDoc.name}</strong><small>{activeDoc.type} document <span>·</span> {activeDoc.size}</small></span><ChevronDown size={15}/></button><div className="assistant-divider"/><div className="quick-label">A GOOD PLACE TO START</div><div className="suggestion-list">{starterQuestions.map((question, i) => <button key={question} className="suggestion" onClick={() => { setTab('Ask anything'); ask(question); }}><span className="suggestion-icon">{i === 0 ? <Sparkles size={15}/> : i === 1 ? <ShieldCheck size={15}/> : <Activity size={15}/>}</span><span>{question}</span><ArrowRight size={14} className="suggestion-arrow"/></button>)}</div></div><div className="assistant-right"><div className="conversation-head"><span><span className="live-dot"/> ASSISTANT CHAT</span><button onClick={() => setMessages([])}>{messages.length ? 'Clear chat' : 'New chat'} <Plus size={13}/></button></div><div className={`chat-body ${messages.length ? 'has-messages' : ''}`}>
          {!messages.length ? <div className="empty-chat"><div className="empty-art"><div className="art-orbit orbit-one"/><div className="art-orbit orbit-two"/><div className="art-center"><Sparkles size={23}/></div><span className="art-star star-a">✳</span><span className="art-star star-b">✧</span><span className="art-star star-c">·</span></div><div className="empty-title">Start with a question</div><p>Your answers will include references<br/>from the document.</p></div> : <div className="message-list">{messages.map((message, i) => <div key={i} className={`message ${message.role}`}><div className="message-avatar">{message.role === 'user' ? 'JD' : <Sparkles size={14}/>}</div><div className="message-body"><span className="message-author">{message.role === 'user' ? 'You' : 'Clarity'}{message.local && <span className="local-tag">QUICK ANSWER</span>}</span><p>{message.text}</p>{message.sources?.length > 0 && <div className="source-results"><span className="source-results-label">SOURCES IN {activeDoc.name.toUpperCase()}</span>{message.sources.map((source, j) => <div className="source-result" key={j}><BookOpen size={12}/><span>{source.excerpt}</span><small>p. {source.page}</small></div>)}</div>}</div></div>)}{busy && <div className="typing-indicator"><span/><span/><span/> Reading your document…</div>}</div>}
          </div><form className="chat-composer" onSubmit={e => { e.preventDefault(); ask(); }}><input id="question-input" value={input} onChange={e => setInput(e.target.value)} placeholder={`Ask about ${activeDoc.name}…`} /><button className="send-button" type="submit" disabled={!input.trim() || busy} aria-label="Send question"><ArrowUp size={17}/></button></form><div className="chat-footnote"><ShieldCheck size={12}/> Answers grounded in your document <span>·</span> Always review important details</div></div></div></section>

        <section className="documents-section"><div className="section-heading"><div><div className="section-title-line"><h2>Your documents</h2><span className="doc-count-pill">{documents.length}</span></div><p>Your knowledge, organized and ready when you are.</p></div><div className="document-controls"><label className="search-box"><Search size={15}/><input aria-label="Search documents" value={query} onChange={e => setQuery(e.target.value)} placeholder="Find a document"/><kbd>⌘ F</kbd></label><button className="filter-button" onClick={() => setFilter(filter ? '' : 'PDF')}><Settings2 size={15}/><span>{filter || 'Filter'}</span><ChevronDown size={13}/></button></div></div><div className="documents-table"><div className="table-head"><span>DOCUMENT NAME</span><span>TYPE</span><span>FILE SIZE</span><span>LAST UPDATED</span><span/></div>{filteredDocs.filter(doc => !filter || doc.type === filter).map(doc => <button key={doc.id} className={`document-row ${activeId === doc.id ? 'row-selected' : ''}`} onClick={() => { setActiveId(doc.id); setMessages([]); }}><span className="file-name-cell"><span className={`table-file-icon ${doc.color}`}><IconDoc type={doc.type} color={doc.color} size={17}/></span><span className="file-name-text"><strong>{doc.name}</strong><small>Ready to explore</small></span></span><span className="type-cell"><span className="type-badge">{doc.type}</span></span><span className="size-cell">{doc.size}</span><span className="date-cell">{doc.updated}</span><span className="row-chevron"><ChevronRight size={16}/></span></button>)}{!filteredDocs.length && <div className="no-documents"><Search size={18}/>No documents match “{query}”</div>}{documents.length === 0 && <div className="no-documents"><FolderOpen size={18}/>Add a document to get started.</div>}</div><div className="table-footer"><span>Showing <strong>{filteredDocs.filter(doc => !filter || doc.type === filter).length}</strong> of <strong>{documents.length}</strong> documents</span><div><button disabled title="Previous page"><ChevronLeft size={15}/></button><button className="page-number">1</button><button disabled title="Next page"><ChevronRight size={15}/></button></div></div></section>
        <footer className="page-footer"><span><Sparkles size={13}/> A little more clarity, every day.</span><span>Built for the way you think.</span></footer>
      </section></div>
    </main><input ref={fileRef} type="file" hidden multiple accept=".pdf,.txt,.md,.csv,.json" onChange={e => { handleFiles(e.target.files); e.target.value = ''; }}/>{toast && <div className="toast"><Check size={15}/>{toast}</div>}</div>;
}
