import { useState } from 'react';
import { ArrowRight, Check, Eye, EyeOff, FileText, LockKeyhole, Mail, ShieldCheck, Sparkles, Upload, X } from 'lucide-react';
import { apiFetch } from './api.js';

export default function Auth({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isSignup = mode === 'signup';

  const submit = async event => {
    event.preventDefault(); setError(''); setBusy(true);
    try {
      const response = await apiFetch(`/api/auth/${isSignup ? 'register' : 'login'}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not sign in. Please try again.');
      onAuthenticated(result.user);
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Can’t reach the server. Make sure the backend is running and try again.' : err.message);
    } finally { setBusy(false); }
  };

  const switchMode = next => { setMode(next); setError(''); };

  return <div className="auth-shell">
    <section className="auth-story">
      <div className="auth-brand"><span className="brand-mark"><Sparkles size={17}/></span><span>clarity<span className="brand-dot">.</span></span></div>
      <div className="story-main"><div className="story-pill"><span/> A CALMER WAY TO WORK WITH DOCUMENTS</div><h1>Less searching.<br/><span>More understanding.</span></h1><p>Bring your documents together, ask the questions that matter, and find your way to a clearer answer.</p><div className="story-visual"><div className="visual-glow"/><div className="visual-card visual-back"><div className="mini-lines"><i/><i/><i/></div><div className="mini-lines lower"><i/><i/></div></div><div className="visual-card visual-front"><div className="visual-file"><FileText size={18}/></div><div className="visual-doc-lines"><b/><i/><i/><i/><i/></div><div className="visual-answer"><span><Sparkles size={11}/> A QUICK ANSWER</span><i/><i/></div></div><div className="visual-bubble"><Sparkles size={15}/></div><div className="visual-check"><Check size={14}/></div></div><div className="story-points"><span><Check size={13}/> Answers grounded in your files</span><span><Check size={13}/> Your documents, kept private</span></div></div>
      <div className="story-footer"><span><ShieldCheck size={13}/> Your workspace is yours alone</span><span>Thoughtful work starts here.</span></div>
    </section>
    <section className="auth-panel"><div className="auth-panel-top"><span>{isSignup ? 'YOUR NEW WORKSPACE' : 'WELCOME BACK'}</span><span className="auth-secure"><LockKeyhole size={12}/> SECURE SIGN IN</span></div><div className="auth-form-wrap"><div className="auth-mobile-brand"><span className="brand-mark"><Sparkles size={16}/></span><span>clarity<span className="brand-dot">.</span></span></div><div className="auth-heading-icon">{isSignup ? <Sparkles size={19}/> : <LockKeyhole size={18}/>}</div><h2>{isSignup ? 'Create your account' : 'Welcome back'}</h2><p className="auth-subtitle">{isSignup ? 'A clearer way to work with every document.' : 'Sign in to pick up where you left off.'}</p>
      <div className="auth-mode-switch"><button className={!isSignup ? 'chosen' : ''} onClick={() => switchMode('login')} type="button">Sign in</button><button className={isSignup ? 'chosen' : ''} onClick={() => switchMode('signup')} type="button">Create account</button></div>
      <form className="auth-form" onSubmit={submit}>
        {isSignup && <label className="auth-field"><span>Your name</span><div className="auth-input-wrap"><input autoComplete="name" value={name} onChange={e => setName(e.target.value)} placeholder="Jordan Davis" required minLength={2} maxLength={80}/></div></label>}
        <label className="auth-field"><span>Email address</span><div className="auth-input-wrap"><Mail size={15}/><input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" required maxLength={254}/></div></label>
        <label className="auth-field"><span>Password</span><div className="auth-input-wrap"><LockKeyhole size={15}/><input type={showPassword ? 'text' : 'password'} autoComplete={isSignup ? 'new-password' : 'current-password'} value={password} onChange={e => setPassword(e.target.value)} placeholder={isSignup ? 'At least 8 characters' : 'Enter your password'} required minLength={isSignup ? 8 : 1} maxLength={200}/><button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={15}/> : <Eye size={15}/>}</button></div>{isSignup && <small className="password-hint">Use at least 8 characters.</small>}</label>
        {error && <div className="auth-error"><X size={14}/>{error}</div>}
        <button className="auth-submit" type="submit" disabled={busy}>{busy ? <span className="auth-spinner"/> : <>{isSignup ? 'Create your account' : 'Sign in to Clarity'}<ArrowRight size={16}/></>}{busy && (isSignup ? 'Creating account…' : 'Signing in…')}</button>
      </form><div className="auth-divider"><span/> <i>MADE FOR THE DOCUMENTS THAT MATTER</i> <span/></div><div className="auth-privacy"><ShieldCheck size={14}/><span>Your documents are private to your account.</span></div>
      <p className="auth-terms">By continuing, you agree to use Clarity responsibly and keep your account secure.</p>
      <div className="auth-mobile-footer"><Upload size={13}/> Upload a document. Ask a question. Find clarity.</div>
      </div><div className="auth-panel-bottom"><span>© 2025 Clarity Workspace</span><span>Private by design</span></div>
    </section>
  </div>;
}
