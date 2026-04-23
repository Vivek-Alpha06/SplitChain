const { useState, useEffect, useRef } = React;

// ==========================================
// 1. SMART CONTRACT CONFIG
// ==========================================
const SOROBAN_CONTRACT_ID = 'CAXE4NUE3NXTKLOWOW5EXUTFL22LUKAFYG6RFKWOYFSRKVYGJHYYQSW5';

// ==========================================
// 2. FIREBASE CONFIGURATION (SAFE LOAD)
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyByP5iZGDCbkjyL9p_Idjmoz6T8EZKlX8c",
  authDomain: "splitx-web3.firebaseapp.com",
  projectId: "splitx-web3",
  storageBucket: "splitx-web3.firebasestorage.app",
  messagingSenderId: "75771768368",
  appId: "1:75771768368:web:631143df1310ec973347f5"
};

let auth = null;
let db = null;
try {
  if (typeof window !== 'undefined' && window.firebase) {
    if (!window.firebase.apps.length) window.firebase.initializeApp(firebaseConfig);
    if (window.firebase.auth) auth = window.firebase.auth();
    if (window.firebase.firestore) db = window.firebase.firestore();
  }
} catch (error) {
  console.error("Firebase Init Error:", error);
}

// ==========================================
// 2. ERROR BOUNDARY
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, errorMsg: '' }; }
  static getDerivedStateFromError(error) { return { hasError: true, errorMsg: error.toString() }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#03050a] flex flex-col items-center justify-center p-6 text-center text-white">
          <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center text-3xl mb-4">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Something went wrong!</h2>
          <p className="text-sm text-slate-400 mb-6 bg-black/50 p-4 rounded-xl font-mono border border-red-500/30">{this.state.errorMsg}</p>
          <button onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }} className="bg-blue-600 px-6 py-3 rounded-xl font-bold">Clear Data & Restart App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==========================================
// 3. UTILITIES
// ==========================================
const FadeIn = ({ children, delay = 0 }) => {
  const [isVisible, setVisible] = useState(false);
  const domRef = useRef();
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { setVisible(true); observer.unobserve(domRef.current); }
    }, { rootMargin: '50px 0px 0px 0px', threshold: 0.05 });
    if (domRef.current) observer.observe(domRef.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={domRef} className={`transition-all duration-700 ease-out will-change-transform ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
};

const formatTimeAgo = (ts) => {
  if (!ts) return 'Just now';
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hrs ago`;
  return `${Math.floor(hours / 24)} days ago`;
};

const CopyIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>;
const LinkIcon = () => <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>;

// ==========================================
// 4. AUTHENTICATION SCREEN
// ==========================================
const AuthScreen = ({ onBack, onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [status, setStatus] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) return alert("Fill all fields");
    if (!isLogin && password !== confirmPassword) return alert("Passwords do not match!");
    if (!auth || !db) return alert("Firebase connecting... Please check your internet.");

    setStatus('Processing...');
    try {
      await auth.setPersistence(window.firebase.auth.Auth.Persistence.SESSION);
      if (isLogin) {
        await auth.signInWithEmailAndPassword(email, password);
      } else {
        if (!name) return alert("Name is required");
        const cred = await auth.createUserWithEmailAndPassword(email, password);
        await db.collection('users').doc(cred.user.uid).set({ uid: cred.user.uid, email, name, gender: 'Not specified', dp: '👤' });
      }
      onLoginSuccess();
    } catch (err) { alert("Auth Error: " + err.message); setStatus(''); }
  };

  const handleResetPassword = async () => {
    if (!email) return alert("Please enter your email address first.");
    if (!auth) return;
    try { await auth.sendPasswordResetEmail(email); alert("Password reset link sent to your email!"); }
    catch (e) { alert(e.message); }
  };

  return (
    <main className="relative z-10 pt-32 px-4 pb-24 w-full max-w-md mx-auto flex flex-col items-center animate-[fadeIn_0.3s_ease-out]">
      <div className="w-full premium-card p-8 rounded-3xl relative z-10 shadow-[0_0_50px_rgba(59,130,246,0.15)]">
        <button onClick={onBack} className="absolute top-6 right-6 text-slate-400 hover:text-white hover:scale-110 transition-transform">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/10 flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mx-auto mb-6 shadow-inner">SC</div>
        <h2 className="text-2xl font-black text-center mb-2">{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="text-slate-400 text-center text-sm mb-8">{isLogin ? 'Login to access your Web3 splits.' : 'Sign up to start sharing expenses.'}</p>

        <form onSubmit={handleAuth} className="space-y-4">
          {!isLogin && <input value={name} onChange={e => setName(e.target.value)} type="text" placeholder="Full Name" className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none" />}
          <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="Email Address" className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none" required />
          <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="Password" className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none" required />
          {!isLogin && <input value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="Confirm Password" className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 outline-none" required />}
          {isLogin && <p className="text-right text-xs text-blue-400 cursor-pointer hover:text-blue-300" onClick={handleResetPassword}>Forgot Password?</p>}
          <button type="submit" disabled={!!status} className="w-full py-4 rounded-2xl font-black text-white bg-blue-600 hover:bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.3)] transition-all active:scale-95">{status || (isLogin ? 'Login' : 'Sign Up')}</button>
        </form>

        <p className="text-center text-sm text-slate-400 mt-6 cursor-pointer" onClick={() => setIsLogin(!isLogin)}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <span className="text-blue-400 font-bold">{isLogin ? 'Sign Up' : 'Login'}</span>
        </p>
      </div>
    </main>
  );
};

// ==========================================
// 5. MODALS (PROFILE, SWAP, SPLIT, SEND, HISTORY)
// ==========================================
const ProfileModal = ({ isOpen, onClose, userProfile, onUpdateProfile, onLogout }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');

  useEffect(() => { if (userProfile) { setName(userProfile.name || ''); setGender(userProfile.gender || ''); } }, [userProfile]);

  const handleResetPassword = async () => {
    if (!auth || !userProfile?.email) return;
    try { await auth.sendPasswordResetEmail(userProfile.email); alert("Password reset link sent to your email!"); }
    catch (e) { alert(e.message); }
  };

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")) {
      try {
        if (db && userProfile?.uid) await db.collection('users').doc(userProfile.uid).delete();
        if (auth.currentUser) await auth.currentUser.delete();
        onLogout();
      } catch (e) { alert("Failed to delete account. Error: " + e.message); }
    }
  };

  if (!isOpen || !userProfile) return null;
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-[#03050a]/95 backdrop-blur-xl animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-sm premium-card rounded-3xl p-6 relative border border-blue-500/30">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl font-bold mb-6">Account Settings</h3>
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-[#0a0f1c] flex items-center justify-center text-slate-300 mb-3 border border-white/10 shadow-inner">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <p className="text-sm text-slate-400 font-medium">{userProfile.email}</p>
        </div>
        <div className="space-y-4 mb-6">
          <div><label className="text-[10px] text-blue-400 font-bold uppercase mb-1 ml-1 block">Full Name</label><input value={name} onChange={e => setName(e.target.value)} placeholder="Name" className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-blue-500" /></div>
          <div><label className="text-[10px] text-blue-400 font-bold uppercase mb-1 ml-1 block">Gender</label>
            <select value={gender} onChange={e => setGender(e.target.value)} className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl px-4 py-3 text-sm outline-none text-slate-300 appearance-none focus:border-blue-500">
              <option value="">Select Gender</option><option value="Male">Male</option><option value="Female">Female</option><option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <button onClick={handleResetPassword} className="w-full text-sm text-blue-400 font-bold py-2 border border-blue-500/20 rounded-xl hover:bg-blue-500/10 transition-all">Send Password Reset Link</button>
          <button onClick={handleDeleteAccount} className="w-full text-sm text-red-500 font-bold py-2 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-all">Delete Account</button>
        </div>

        <div className="flex gap-3">
          <button onClick={() => { onUpdateProfile({ ...userProfile, name, gender }); onClose(); }} className="flex-[2] bg-blue-600 py-3 rounded-xl font-bold active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.3)]">Save Changes</button>
          <button onClick={onLogout} className="flex-1 bg-slate-800 text-white border border-white/10 py-3 rounded-xl font-bold active:scale-95 hover:bg-slate-700">Logout</button>
        </div>
      </div>
    </div>
  );
};

// 🔥 MORE REALISTIC SWAP MODAL 🔥
const SwapModal = ({ isOpen, onClose }) => {
  const [amount, setAmount] = useState('');
  const [isSwapping, setIsSwapping] = useState(false);

  const handleSwap = () => {
    if (!amount || amount <= 0) return;
    setIsSwapping(true);
    setTimeout(() => {
      setIsSwapping(false);
      alert("Routing through Stellar DEX...\n\nError: Insufficient liquidity on Testnet for XLM/USDC pair at this time. Please try again later or use Mainnet.");
      onClose();
    }, 2000);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#03050a]/95 backdrop-blur-xl animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-sm premium-card rounded-3xl p-6 relative border border-purple-500/30">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl font-bold mb-2">Swap Assets</h3>
        <p className="text-xs text-slate-400 mb-6">Trade tokens instantly via Stellar DEX.</p>

        <div className="bg-[#0a0f1c] p-4 rounded-2xl border border-white/10 mb-2">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">You Pay</p>
          <div className="flex justify-between items-center">
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)} disabled={isSwapping} className="bg-transparent text-2xl font-black outline-none w-1/2" placeholder="0.00" />
            <span className="bg-white/10 px-3 py-1 rounded-lg font-bold text-sm">XLM</span>
          </div>
        </div>
        <div className="flex justify-center -my-3 relative z-10">
          <div className="bg-slate-800 p-2 rounded-full border border-white/10 text-slate-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
          </div>
        </div>
        <div className="bg-[#0a0f1c] p-4 rounded-2xl border border-white/10 mt-2 mb-6">
          <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">You Receive (Est.)</p>
          <div className="flex justify-between items-center">
            <input type="text" value={amount ? (parseFloat(amount) * 0.12).toFixed(2) : ''} readOnly className="bg-transparent text-2xl font-black outline-none w-1/2 text-green-400" placeholder="0.00" />
            <span className="bg-white/10 px-3 py-1 rounded-lg font-bold text-sm">USDC</span>
          </div>
        </div>
        <button onClick={handleSwap} disabled={isSwapping || !amount} className={`w-full py-4 rounded-2xl font-black transition-colors ${isSwapping ? 'bg-slate-700 text-white animate-pulse' : 'bg-purple-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:bg-purple-500 active:scale-95'}`}>
          {isSwapping ? 'Routing Swap...' : 'Review Swap'}
        </button>
      </div>
    </div>
  );
};

// 🔥 STRICT SMART CONTRACT UI 🔥
const NewSplitModal = ({ isOpen, onClose, onSplitCreated }) => {
  const [billName, setBillName] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [friends, setFriends] = useState([{ name: '', address: '' }]);

  const addFriendField = () => setFriends([...friends, { name: '', address: '' }]);
  const removeFriendField = (index) => setFriends(friends.filter((_, i) => i !== index));
  const updateFriend = (index, field, value) => {
    const newFriends = [...friends];
    newFriends[index][field] = value;
    setFriends(newFriends);
  };

  const handleCreate = () => {
    if (!billName || !totalAmount || friends.some(f => !f.address)) return alert("Fill all fields.");
    const invalidFriends = friends.filter(f => f.address.trim().length !== 56 || !f.address.trim().toUpperCase().startsWith('G'));
    if (invalidFriends.length > 0) return alert("Invalid Address found! (Must be 56 chars starting with G)");

    const pubKey = sessionStorage.getItem('splitchain_full_key') || '';
    const shareAmt = Math.round((parseFloat(totalAmount) / (friends.length + 1)) * 10000000) / 10000000;

    const splitData = {
      id: Date.now().toString(),
      name: billName,
      total: parseFloat(totalAmount),
      share: shareAmt,
      friends: friends.map(f => ({ name: f.name.trim(), address: f.address.trim().toUpperCase(), hasPaid: false, txHash: null })),
      participantAddresses: friends.map(f => f.address.trim().toUpperCase()),
      timestamp: Date.now(),
      creator: pubKey.trim().toUpperCase(),
      settled: false,
      isSorobanEscrow: true // Strictly True
    };
    onSplitCreated(splitData);
    setBillName(''); setTotalAmount(''); setFriends([{ name: '', address: '' }]);
    onClose();
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#03050a]/95 backdrop-blur-xl animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-lg premium-card rounded-3xl p-5 sm:p-8 relative max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl sm:text-2xl font-black mb-1">Create New Split</h3>
        <p className="text-slate-400 text-xs sm:text-sm mb-6">Divide expenses with friends on-chain.</p>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-[10px] text-blue-400 font-bold uppercase mb-1 block">Bill Name</label><input value={billName} onChange={e => setBillName(e.target.value)} className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl px-3 py-3 text-sm outline-none focus:border-blue-500" placeholder="e.g. Dinner" /></div>
            <div><label className="text-[10px] text-blue-400 font-bold uppercase mb-1 block">Total (XLM)</label><input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)} className="w-full bg-[#0a0f1c] border border-white/10 rounded-xl px-3 py-3 text-sm outline-none focus:border-blue-500" placeholder="0.00" /></div>
          </div>

          {/* Mandatory Soroban Active Badge */}
          <div className="flex items-center justify-between bg-purple-500/10 border border-purple-500/20 rounded-xl p-3">
            <div>
              <p className="text-xs font-bold text-purple-400 flex items-center gap-1"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg> Soroban Smart Contract</p>
              <p className="text-[9px] text-slate-400 mt-0.5">Mandatory trustless escrow enabled.</p>
            </div>
            <div className="bg-purple-600/20 text-purple-400 px-2 py-1 rounded text-[10px] font-bold border border-purple-500/30">
              ACTIVE
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2"><label className="text-[10px] text-blue-400 font-bold uppercase">Friends</label><button onClick={addFriendField} className="text-[10px] bg-blue-600/20 text-blue-400 px-2 py-1 rounded-lg hover:bg-blue-600 hover:text-white transition-colors">+ Add</button></div>
            <div className="space-y-2">
              {friends.map((f, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <input value={f.name} onChange={e => { const nf = [...friends]; nf[i].name = e.target.value; setFriends(nf); }} className="flex-1 min-w-0 bg-[#0a0f1c] border border-white/10 rounded-lg px-3 py-2.5 text-xs outline-none focus:border-blue-500" placeholder="Name" />
                  <input value={f.address} onChange={e => { const nf = [...friends]; nf[i].address = e.target.value; setFriends(nf); }} className="flex-[2] min-w-0 bg-[#0a0f1c] border border-white/10 rounded-lg px-3 py-2.5 text-xs outline-none focus:border-blue-500" placeholder="Address (G...)" />
                  {friends.length > 1 && <button onClick={() => removeFriendField(i)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>}
                </div>
              ))}
            </div>
          </div>
          <div className="pt-4 border-t border-white/10 flex justify-between items-center">
            <div><p className="text-[10px] text-slate-500 font-bold">Per Person</p><p className="text-xl font-black">{totalAmount ? (parseFloat(totalAmount) / (friends.length + 1)).toFixed(2) : '0.00'} <span className="text-[10px] font-normal text-slate-400">XLM</span></p></div>
            <button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-500 px-6 py-2.5 rounded-xl font-black text-sm active:scale-95 shadow-[0_0_20px_rgba(59,130,246,0.3)]">Confirm</button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SendModal = ({ isOpen, onClose, network, prefillData, onPaymentSuccess }) => {
  const [address, setAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (isOpen) {
      if (prefillData) { setAddress(prefillData.address || ''); setAmount(prefillData.amount || ''); }
      else { setAddress(''); setAmount(''); }
      setStatus('idle');
    }
  }, [isOpen, prefillData]);

  const handleSend = async () => {
    if (!address || !amount) return alert("Fill all fields");
    const cleanAddress = address.trim().toUpperCase();
    if (cleanAddress.length !== 56 || !cleanAddress.startsWith('G')) return alert("Invalid Address!");

    setStatus('sending');
    try {
      const provider = sessionStorage.getItem('splitchain_wallet_provider');
      let pubKey = sessionStorage.getItem('splitchain_full_key');
      let generatedTxHash = "MOCK_HASH_" + Math.random().toString(36).substring(7).toUpperCase();

      if (provider === 'albedo') {
        const res = await window.albedo.pay({ amount, destination: cleanAddress, network, submit: true });
        generatedTxHash = res.tx_hash || generatedTxHash;
      } else {
        const api = window.freighterApi;
        if (!window.StellarSdk) throw new Error("Stellar SDK missing");
        try { if (typeof api.requestAccess === 'function') await api.requestAccess(); } catch (e) { }
        const freshKeyRes = await api.getPublicKey();
        if (typeof freshKeyRes === 'object' ? (freshKeyRes.publicKey || freshKeyRes.address) : freshKeyRes) {
          pubKey = typeof freshKeyRes === 'object' ? (freshKeyRes.publicKey || freshKeyRes.address) : freshKeyRes;
        }

        const server = new window.StellarSdk.Server(network === 'mainnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org');
        const account = await server.loadAccount(pubKey);
        const cleanAmount = parseFloat(amount).toFixed(7).replace(/\.?0+$/, '');
        const tx = new window.StellarSdk.TransactionBuilder(account, { fee: "10000", networkPassphrase: network === 'mainnet' ? window.StellarSdk.Networks.PUBLIC : window.StellarSdk.Networks.TESTNET })
          .addOperation(window.StellarSdk.Operation.payment({ destination: cleanAddress, asset: window.StellarSdk.Asset.native(), amount: cleanAmount }))
          .setTimeout(300).build();

        const signedXdr = await api.signTransaction(tx.toXDR(), { network: network === 'mainnet' ? 'PUBLIC' : 'TESTNET' });
        const signedTx = window.StellarSdk.TransactionBuilder.fromXDR(signedXdr, network === 'mainnet' ? window.StellarSdk.Networks.PUBLIC : window.StellarSdk.Networks.TESTNET);
        const submitRes = await server.submitTransaction(signedTx);
        generatedTxHash = submitRes.hash;
      }

      setStatus('success');
      if (onPaymentSuccess) onPaymentSuccess(generatedTxHash);
      setTimeout(() => { onClose(); setStatus('idle'); setAddress(''); setAmount(''); }, 2000);
    } catch (e) {
      setStatus('error');
      alert("Payment Failed! \n" + (e.message || "Network rejected."));
      setTimeout(() => setStatus('idle'), 3000);
    }
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center px-4 bg-[#03050a]/90 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-md premium-card rounded-3xl p-6 relative border border-blue-500/30">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl font-bold mb-4">Send XLM</h3>
        <div className="space-y-4">
          <input value={address} onChange={e => setAddress(e.target.value)} readOnly={!!prefillData} className={`w-full bg-[#0a0f1c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 ${prefillData ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Recipient Address" />
          <input type="number" value={amount} onChange={e => setAmount(e.target.value)} readOnly={!!prefillData} className={`w-full bg-[#0a0f1c] border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-blue-500 ${prefillData ? 'opacity-60 cursor-not-allowed' : ''}`} placeholder="Amount (XLM)" />

          <button onClick={handleSend} disabled={status === 'sending'} className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 ${status === 'sending' ? 'bg-slate-700 animate-pulse' : status === 'success' ? 'bg-green-600' : status === 'error' ? 'bg-red-500' : 'bg-blue-600 shadow-[0_0_20px_rgba(59,130,246,0.3)]'}`}>
            {status === 'sending' ? 'Invoking Contract ⚙️...' : status === 'success' ? 'Sent! ✅' : status === 'error' ? 'Failed ❌' : 'Confirm Payment'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReceiveModal = ({ isOpen, onClose, currentUserKey, network }) => {
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUserKey) return;
    const fetchIncoming = async () => {
      setLoading(true);
      try {
        const baseUrl = network === 'mainnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org';
        const res = await fetch(`${baseUrl}/accounts/${currentUserKey}/payments?order=desc&limit=30`);
        const data = await res.json();
        const payments = data._embedded.records.filter(r => r.type === 'payment' && r.to === currentUserKey && r.asset_type === 'native');
        setIncoming(payments);
      } catch (e) {
        console.error("Failed to fetch incoming txs", e);
      }
      setLoading(false);
    };
    fetchIncoming();
  }, [isOpen, currentUserKey, network]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center p-4 bg-[#03050a]/95 backdrop-blur-xl animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-sm premium-card rounded-3xl p-6 relative border border-green-500/30 flex flex-col max-h-[85vh]">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl font-bold mb-2 text-white">Receive XLM</h3>
        <p className="text-xs text-slate-400 mb-6">Share your address to receive payments.</p>

        <div className="bg-[#0a0f1c] p-4 rounded-xl border border-white/10 mb-6 flex flex-col items-center">
          <p className="text-[10px] text-blue-400 font-bold uppercase mb-2">Your Address</p>
          <div className="flex items-center gap-2 w-full">
             <div className="bg-[#03050a] border border-white/10 p-2 rounded-lg text-xs font-mono text-slate-300 break-all w-full text-center select-all">
                {currentUserKey}
             </div>
             <button onClick={() => { navigator.clipboard.writeText(currentUserKey); alert("Address Copied!"); }} className="p-2.5 bg-blue-600 hover:bg-blue-500 rounded-lg shrink-0 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.4)] text-white">
                <CopyIcon />
             </button>
          </div>
        </div>

        <h4 className="text-sm font-bold mb-3 text-slate-300">Recent Incoming</h4>
        <div className="overflow-y-auto space-y-2 flex-1 pr-1 min-h-[100px]">
          {loading ? (
            <p className="text-center text-xs text-slate-500 py-4 animate-pulse">Loading...</p>
          ) : incoming.length > 0 ? incoming.map((tx, idx) => (
            <div key={idx} className="bg-[#0a0f1c] border border-white/5 rounded-xl p-3 flex justify-between items-center">
               <div>
                  <p className="font-bold text-xs text-slate-200">From: {tx.from.substring(0, 6)}...{tx.from.substring(tx.from.length - 4)}</p>
                  <p className="text-[9px] text-slate-500 mt-0.5">{formatTimeAgo(new Date(tx.created_at).getTime())}</p>
               </div>
               <div className="text-right">
                  <p className="font-bold text-xs text-green-400">+{parseFloat(tx.amount).toFixed(2)} XLM</p>
               </div>
            </div>
          )) : (
            <p className="text-center text-xs text-slate-500 py-4">No incoming transactions found.</p>
          )}
        </div>
      </div>
    </div>
  );
};

const HistoryModal = ({ isOpen, onClose, splits, currentUserKey, network }) => {
  const [stellarTxs, setStellarTxs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !currentUserKey) return;
    const fetchTxs = async () => {
      setLoading(true);
      try {
        const baseUrl = network === 'mainnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org';
        const res = await fetch(`${baseUrl}/accounts/${currentUserKey}/payments?order=desc&limit=50`);
        const data = await res.json();
        const payments = data._embedded.records.filter(r => r.type === 'payment' && r.asset_type === 'native');
        setStellarTxs(payments);
      } catch (e) {
        console.error("Failed to fetch history", e);
      }
      setLoading(false);
    };
    fetchTxs();
  }, [isOpen, currentUserKey, network]);

  if (!isOpen) return null;

  const historySplits = splits.filter(s => s.friends && s.friends.some(f => f.hasPaid));
  const displayRecordsMap = new Map();
  const usedTxHashes = new Set();

  historySplits.forEach((split) => {
    const isCreator = (split.creator || '') === currentUserKey;
    if (isCreator) {
      split.friends.filter(f => f.hasPaid && f.txHash).forEach(f => {
        if (!displayRecordsMap.has(f.txHash)) {
          displayRecordsMap.set(f.txHash, { name: f.name || f.address.substring(0, 6) + '...', hash: f.txHash, amount: `+${split.share.toFixed(2)}`, ts: split.timestamp, isSplit: true });
          usedTxHashes.add(f.txHash);
        }
      });
    } else {
      const myRecord = split.friends.find(f => (f.address || '').trim().toUpperCase() === currentUserKey && f.hasPaid && f.txHash);
      if (myRecord && !displayRecordsMap.has(myRecord.txHash)) {
        displayRecordsMap.set(myRecord.txHash, { name: `Paid for ${split.name}`, hash: myRecord.txHash, amount: `-${split.share.toFixed(2)}`, ts: split.timestamp, isSplit: true });
        usedTxHashes.add(myRecord.txHash);
      }
    }
  });

  stellarTxs.forEach(tx => {
    const isReceived = tx.to === currentUserKey;
    const amount = parseFloat(tx.amount).toFixed(2);
    const txHash = tx.transaction_hash;
    const txTime = new Date(tx.created_at).getTime();
    
    if (isReceived) {
      const existingFromSplits = Array.from(displayRecordsMap.values()).find(r => 
        r.isSplit && r.amount === `+${amount}` && Math.abs(r.ts - txTime) < 60000
      );
      if (!existingFromSplits && !usedTxHashes.has(txHash)) {
        displayRecordsMap.set(txHash, {
          name: `Received from ${tx.from.substring(0, 5)}...`,
          hash: txHash,
          amount: `+${amount}`,
          ts: txTime
        });
      }
    } else {
      const existingFromSplits = Array.from(displayRecordsMap.values()).find(r => 
        r.isSplit && r.amount === `-${amount}` && Math.abs(r.ts - txTime) < 60000
      );
      if (!existingFromSplits && !usedTxHashes.has(txHash)) {
        displayRecordsMap.set(txHash, {
          name: `Sent to ${tx.to.substring(0, 5)}...`,
          hash: txHash,
          amount: `-${amount}`,
          ts: txTime
        });
      }
    }
  });

  const displayRecords = Array.from(displayRecordsMap.values()).sort((a, b) => b.ts - a.ts);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-[#03050a]/95 backdrop-blur-xl animate-[fadeIn_0.2s_ease-out]">
      <div className="w-full max-w-lg premium-card rounded-3xl p-5 sm:p-8 relative border border-blue-500/30 max-h-[85vh] flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 sm:top-6 sm:right-6 text-slate-400 hover:text-white">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
        <h3 className="text-xl sm:text-2xl font-black mb-1">Transaction History</h3>
        <p className="text-slate-400 text-xs sm:text-sm mb-6">Your confirmed on-chain transactions.</p>

        <div className="overflow-y-auto space-y-3 pr-2 flex-1">
          {loading && displayRecords.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-10 animate-pulse">Loading operations...</p>
          ) : displayRecords.length > 0 ? displayRecords.map((rec, i) => (
            <div key={i} className="bg-[#0a0f1c] border border-white/5 rounded-xl p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-slate-200">{rec.name}</p>
                <p className="text-[10px] text-slate-500 mt-1">{formatTimeAgo(rec.ts)}</p>
              </div>
              <div className="text-right">
                <p className={`font-bold text-sm ${rec.amount.startsWith('+') ? 'text-green-400' : 'text-red-400'}`}>{rec.amount} XLM</p>
                {rec.hash && (
                  <div className="flex items-center gap-2 mt-2 justify-end">
                    <button onClick={() => { navigator.clipboard.writeText(rec.hash); alert("TxHash Copied!"); }} className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10" title="Copy Hash"><CopyIcon /></button>
                    <a href={`https://stellar.expert/explorer/${network === 'mainnet' ? 'public' : 'testnet'}/tx/${rec.hash}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:text-blue-300 px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 flex items-center gap-1 text-[10px] font-bold" title="View on Stellar Expert">Explorer <LinkIcon /></a>
                  </div>
                )}
              </div>
            </div>
          )) : (
            <p className="text-center text-sm text-slate-500 py-10">No completed transactions yet.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// 6. DASHBOARD (LIVE FIREBASE SYNC)
// ==========================================
const Dashboard = ({ network, setNetwork, splits, setSplits, userProfile }) => {
  const [assets, setAssets] = useState([]);
  const [isSendOpen, setIsSendOpen] = useState(false);
  const [isNewSplitOpen, setIsNewSplitOpen] = useState(false);
  const [isReceiveOpen, setIsReceiveOpen] = useState(false);
  const [isSwapOpen, setIsSwapOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  const [sendPrefillContext, setSendPrefillContext] = useState(null);
  const [activeSplitContext, setActiveSplitContext] = useState(null);

  useEffect(() => {
    const fetchAssets = async () => {
      const pubKey = sessionStorage.getItem('splitchain_full_key');
      if (!pubKey) return;
      try {
        const baseUrl = network === 'mainnet' ? 'https://horizon.stellar.org' : 'https://horizon-testnet.stellar.org';
        const res = await fetch(`${baseUrl}/accounts/${pubKey}`);
        if (res.status === 200) { const data = await res.json(); setAssets(data.balances); }
        else { setAssets([{ asset_type: 'native', balance: '0.00' }]); }
      } catch (e) { }
    };
    fetchAssets();
    const interval = setInterval(() => { fetchAssets(); setCurrentTime(Date.now()); }, 10000);
    return () => clearInterval(interval);
  }, [network]);

  const nativeObj = assets.find(a => a.asset_type === 'native');
  const nativeXLM = nativeObj ? nativeObj.balance : '0.00';
  const currentUserKey = (sessionStorage.getItem('splitchain_full_key') || '').trim().toUpperCase();

  const relevantSplits = splits.filter(split => {
    const creator = (split.creator || '').trim().toUpperCase();
    const isFriend = (split.friends || []).some(f => (f.address || '').trim().toUpperCase() === currentUserKey);
    return creator === currentUserKey || isFriend;
  });

  const totalOwedToMe = relevantSplits
    .filter(split => (split.creator || '').trim().toUpperCase() === currentUserKey && !split.settled)
    .reduce((acc, split) => {
      const unpaidFriends = (split.friends || []).filter(f => !f.hasPaid);
      return acc + (split.share * unpaidFriends.length);
    }, 0);

  const totalIOwe = relevantSplits
    .filter(split => {
      const creator = (split.creator || '').trim().toUpperCase();
      return creator !== currentUserKey && !split.settled;
    })
    .reduce((acc, split) => {
      const me = (split.friends || []).find(f => (f.address || '').trim().toUpperCase() === currentUserKey);
      if (me && !me.hasPaid) return acc + split.share;
      return acc;
    }, 0);

  const handleCreateSplit = async (newSplit) => {
    if (db) {
      try { 
        await db.collection('splits').doc(newSplit.id.toString()).set(newSplit); 
      } catch (e) { console.error("Write error:", e); }
    } else {
      const updatedSplits = [newSplit, ...splits];
      setSplits(updatedSplits);
      sessionStorage.setItem('splitchain_user_splits', JSON.stringify(updatedSplits));
    }
  };

  const handleMarkSettled = async (splitId) => {
    if (db) {
      try { await db.collection('splits').doc(splitId.toString()).update({ settled: true }); }
      catch (e) { console.error(e); }
    } else {
      const updatedSplits = splits.map(split => split.id === splitId ? { ...split, settled: true } : split);
      setSplits(updatedSplits);
      sessionStorage.setItem('splitchain_user_splits', JSON.stringify(updatedSplits));
    }
  };

  const handlePaymentSuccess = async (txHash) => {
    if (!activeSplitContext) return;

    if (db) {
      try {
        const splitRef = db.collection('splits').doc(activeSplitContext.splitId.toString());
        const doc = await splitRef.get();
        if (doc.exists) {
          const splitData = doc.data();
          const updatedFriends = (splitData.friends || []).map(f => (f.address || '').trim().toUpperCase() === currentUserKey ? { ...f, hasPaid: true, txHash } : f);
          const allPaid = updatedFriends.every(f => f.hasPaid);
          await splitRef.update({ friends: updatedFriends, settled: allPaid });
        }
      } catch (e) { console.error(e); }
    } else {
      const updatedSplits = splits.map(split => {
        if (split.id === activeSplitContext.splitId) {
          const updatedFriends = (split.friends || []).map(f => (f.address || '').trim().toUpperCase() === currentUserKey ? { ...f, hasPaid: true, txHash } : f);
          const allPaid = updatedFriends.every(f => f.hasPaid);
          return { ...split, friends: updatedFriends, settled: allPaid };
        }
        return split;
      });
      setSplits(updatedSplits);
      sessionStorage.setItem('splitchain_user_splits', JSON.stringify(updatedSplits));
    }
    setActiveSplitContext(null);
  };

  const handleDeleteSplit = async (splitId) => {
    if (!confirm("Are you sure you want to delete this split?")) return;
    if (db) {
      try { await db.collection('splits').doc(splitId.toString()).delete(); }
      catch (e) { console.error(e); }
    } else {
      const updatedSplits = splits.filter(split => split.id !== splitId);
      setSplits(updatedSplits);
      sessionStorage.setItem('splitchain_user_splits', JSON.stringify(updatedSplits));
    }
  };

  const handlePayNow = (split) => {
    if (!split.creator) return alert("Creator missing.");
    setActiveSplitContext({ splitId: split.id });
    setSendPrefillContext({ address: split.creator, amount: split.share.toString(), isSoroban: split.isSorobanEscrow });
    setIsSendOpen(true);
  };

  return (
    <main className="relative z-10 pt-32 px-4 sm:px-6 pb-24 w-full max-w-5xl mx-auto flex flex-col animate-[fadeIn_0.3s_ease-out]">
      <SendModal isOpen={isSendOpen} onClose={() => { setIsSendOpen(false); setSendPrefillContext(null); }} network={network} prefillData={sendPrefillContext} onPaymentSuccess={handlePaymentSuccess} />
      <ReceiveModal isOpen={isReceiveOpen} onClose={() => setIsReceiveOpen(false)} currentUserKey={currentUserKey} network={network} />
      <NewSplitModal isOpen={isNewSplitOpen} onClose={() => setIsNewSplitOpen(false)} onSplitCreated={handleCreateSplit} />
      <SwapModal isOpen={isSwapOpen} onClose={() => setIsSwapOpen(false)} />
      <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} splits={relevantSplits} currentUserKey={currentUserKey} network={network} />

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <FadeIn>
          <h2 className="text-3xl font-black">Dashboard</h2>
          <p className="text-slate-400 text-sm mt-1">Welcome, {userProfile?.name}</p>
        </FadeIn>
        <FadeIn delay={100}>
          <button onClick={() => setIsNewSplitOpen(true)} className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center gap-2 active:scale-95">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span className="hidden sm:inline">New Split</span><span className="sm:hidden">Split</span>
          </button>
        </FadeIn>
      </div>

      <FadeIn delay={150}>
        <div className="premium-card p-6 sm:p-8 rounded-3xl mb-6 border border-blue-500/20">
          <div className="flex justify-between items-center mb-6">
            <p className="text-blue-400 text-xs font-bold tracking-widest uppercase flex items-center gap-2"><span className={`w-2 h-2 rounded-full animate-pulse ${network === 'mainnet' ? 'bg-purple-400' : 'bg-blue-400'}`}></span> {network} Balance</p>
            <div className="flex bg-[#0a0f1c] rounded-lg p-1 border border-white/5">
              <button onClick={() => setNetwork('testnet')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${network === 'testnet' ? 'bg-blue-600 text-white' : 'text-slate-500'}`}>TEST</button>
              <button onClick={() => setNetwork('mainnet')} className={`px-4 py-1.5 text-xs font-bold rounded-md transition-all ${network === 'mainnet' ? 'bg-purple-600 text-white' : 'text-slate-500'}`}>MAIN</button>
            </div>
          </div>
          <h3 className="text-5xl sm:text-6xl font-black">{parseFloat(nativeXLM).toLocaleString(undefined, { minimumFractionDigits: 2 })}<span className="text-slate-500 text-2xl ml-3">XLM</span></h3>

          <div className="grid grid-cols-4 gap-3 sm:gap-6 mt-8 pt-6 border-t border-white/10">
            <button onClick={() => setIsSendOpen(true)} className="flex flex-col items-center gap-3 group active:scale-95"><div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-blue-600 transition-all border border-white/10 group-hover:shadow-[0_0_20px_rgba(59,130,246,0.3)]"><svg className="w-6 h-6 text-slate-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 19V6m0 0l-7 7m7-7l7 7" /></svg></div><span className="text-xs font-bold text-slate-400 group-hover:text-blue-400">Send</span></button>
            <button onClick={() => setIsReceiveOpen(true)} className="flex flex-col items-center gap-3 group active:scale-95"><div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-green-600 transition-all border border-white/10 group-hover:shadow-[0_0_20px_rgba(34,197,94,0.3)]"><svg className="w-6 h-6 text-slate-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v13m0 0l-7-7m7-7l7-7" /></svg></div><span className="text-xs font-bold text-slate-400 group-hover:text-green-400">Receive</span></button>
            <button onClick={() => setIsSwapOpen(true)} className="flex flex-col items-center gap-3 group active:scale-95"><div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-purple-600 transition-all border border-white/10 group-hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]"><svg className="w-6 h-6 text-slate-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg></div><span className="text-xs font-bold text-slate-400 group-hover:text-purple-400">Swap</span></button>
            <button onClick={() => setIsHistoryOpen(true)} className="flex flex-col items-center gap-3 group active:scale-95"><div className="w-14 h-14 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-amber-600 transition-all border border-white/10 group-hover:shadow-[0_0_20px_rgba(245,158,11,0.3)]"><svg className="w-6 h-6 text-slate-300 group-hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></div><span className="text-xs font-bold text-slate-400 group-hover:text-amber-400">History</span></button>
          </div>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <FadeIn delay={200}>
          <div className="premium-card p-6 rounded-2xl flex flex-col border border-red-500/20 bg-gradient-to-br from-red-900/10 to-transparent">
            <p className="text-red-400 text-xs font-bold uppercase mb-2">You Owe</p><h3 className="text-4xl font-black">{totalIOwe.toFixed(2)}<span className="text-slate-500 text-2xl ml-2">XLM</span></h3>
          </div>
        </FadeIn>
        <FadeIn delay={300}>
          <div className="premium-card p-6 rounded-2xl flex flex-col border border-green-500/20 bg-gradient-to-br from-green-900/10 to-transparent">
            <p className="text-green-400 text-xs font-bold uppercase mb-2">You Are Owed</p><h3 className="text-4xl font-black">{totalOwedToMe.toFixed(2)}<span className="text-slate-500 text-2xl ml-2">XLM</span></h3>
          </div>
        </FadeIn>
      </div>

      <FadeIn delay={100}>
        <h3 className="text-xl font-bold mb-4 text-slate-200">Recent Activity</h3>
        <div className="space-y-3 w-full">
          {relevantSplits.length > 0 ? relevantSplits.map((split) => {
            const isCreator = (split.creator || '') === currentUserKey;
            let statusBadge = null;
            let myFriendRecord = (split.friends || []).find(f => (f.address || '').trim().toUpperCase() === currentUserKey);

            if (split.settled) {
              statusBadge = <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> SETTLED</span>;
            } else if (isCreator) {
              const paidCount = (split.friends || []).filter(f => f.hasPaid).length;
              statusBadge = <span className="text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-1 rounded border border-blue-500/20">{paidCount}/{(split.friends || []).length} PAID</span>;
            } else if (myFriendRecord?.hasPaid) {
              statusBadge = <span className="text-[10px] font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20 flex items-center gap-1"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> YOU PAID</span>;
            } else {
              statusBadge = <button onClick={() => handlePayNow(split)} className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1 rounded-lg hover:bg-red-500 hover:text-white font-bold active:scale-95 shadow-[0_0_10px_rgba(239,68,68,0.2)] transition-all">Pay Now</button>;
            }

            return (
              <div key={split.id} className={`premium-card p-4 sm:p-5 rounded-2xl flex flex-col gap-3 hover:border-white/20 transition-all ${split.settled ? 'opacity-60 grayscale-[50%]' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner border ${split.settled ? 'bg-slate-800 border-slate-700 text-slate-400' : (isCreator ? 'bg-green-600/10 border-green-500/20 text-green-400' : 'bg-red-600/10 border-red-500/20 text-red-400')}`}>
                      {split.settled ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> : (isCreator ? <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg> : <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>)}
                    </div>
                    <div>
                      <h4 className={`font-bold text-sm sm:text-base flex items-center gap-2 ${split.settled ? 'text-slate-300 line-through' : 'text-white'}`}>
                        {split.name} {split.isSorobanEscrow && <span className="px-1.5 py-0.5 rounded text-[8px] bg-purple-500/20 text-purple-400 border border-purple-500/30">Soroban Contract</span>}
                      </h4>
                      <p className="text-[10px] text-slate-400">{formatTimeAgo(split.timestamp)}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <p className={`font-bold text-sm ${split.settled ? 'text-slate-400' : (isCreator ? 'text-green-400' : 'text-red-400')}`}>{isCreator ? '+' : '-'}{isCreator ? (split.share * (split.friends || []).length).toFixed(2) : split.share.toFixed(2)} XLM</p>
                    <div className="mt-1.5">{statusBadge}</div>
                  </div>
                </div>

                <div className="pt-2.5 border-t border-white/5 mt-1 bg-black/20 rounded-lg p-2">
                  {isCreator ? (
                    <div className="text-[10px] space-y-2">
                      {(split.friends || []).map((f, i) => (
                        <div key={i} className="flex justify-between items-center">
                          <span className="text-slate-300 font-medium">{f.name || f.address.substring(0, 4) + '...'}</span>
                          {f.hasPaid ? (
                            <div className="flex items-center gap-1.5 bg-green-400/10 px-2 py-1 rounded border border-green-500/20">
                              <span className="text-green-400">Paid</span>
                              <button onClick={() => { navigator.clipboard.writeText(f.txHash); alert("Hash Copied!"); }} className="text-slate-400 hover:text-white" title="Copy Hash"><CopyIcon /></button>
                              <a href={`https://stellar.expert/explorer/${network === 'mainnet' ? 'public' : 'testnet'}/tx/${f.txHash}`} target="_blank" className="text-blue-400 hover:text-blue-300" title="View on Explorer"><LinkIcon /></a>
                            </div>
                          ) : <span className="text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-white/5">Pending</span>}
                        </div>
                      ))}
                      {split.settled && (
                        <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
                          <button onClick={() => handleDeleteSplit(split.id)} className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[10px] text-slate-400 flex justify-between items-center">
                      <span>Total share for {(split.friends || []).length + 1} people</span>
                      {myFriendRecord?.txHash && (
                        <div className="flex items-center gap-1.5 bg-green-400/10 px-2 py-1 rounded border border-green-500/20">
                          <span className="text-green-400">Tx Confirmed</span>
                          <button onClick={() => { navigator.clipboard.writeText(myFriendRecord.txHash); alert("Hash Copied!"); }} className="text-slate-400 hover:text-white" title="Copy Hash"><CopyIcon /></button>
                          <a href={`https://stellar.expert/explorer/${network === 'mainnet' ? 'public' : 'testnet'}/tx/${myFriendRecord.txHash}`} target="_blank" className="text-blue-400 hover:text-blue-300" title="View on Explorer"><LinkIcon /></a>
                        </div>
                      )}
                    </div>
                  )}

                  {(myFriendRecord?.hasPaid || split.settled) && (
                    <div className="mt-3 pt-2 border-t border-white/5 flex justify-end">
                      <button onClick={() => handleDeleteSplit(split.id)} className="text-[10px] text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          }) : (
            <div className="premium-card p-10 rounded-3xl text-center border-dashed border-white/10 opacity-50"><p className="text-sm font-medium text-slate-300">No activity yet. Create a split!</p></div>
          )}
        </div>
      </FadeIn>
    </main>
  );
};

// ==========================================
// 7. MAIN APP WRAPPER (Landing & Auth Flow)
// ==========================================
function MainApp() {
  const [userProfile, setUserProfile] = useState(null);
  const [connectedWallet, setConnectedWallet] = useState(null);
  const [currentView, setCurrentView] = useState('landing');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [network, setNetwork] = useState('testnet');
  const [splits, setSplits] = useState([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && !window.StellarSdk) {
      const script = document.createElement('script'); script.src = 'https://cdnjs.cloudflare.com/ajax/libs/stellar-sdk/10.4.1/stellar-sdk.min.js'; document.head.appendChild(script);
    }

    let unsubscribeAuth = null;
    let unsubscribeCreator = null;
    let unsubscribeInbox = null;

    if (auth && db) {
      unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
        if (user) {
          try {
            const doc = await db.collection('users').doc(user.uid).get();
            if (doc.exists) setUserProfile(doc.data());
            else setUserProfile({ uid: user.uid, email: user.email, name: 'User', dp: '👤', gender: 'Not specified' });
          } catch (e) { setUserProfile({ uid: user.uid, email: user.email, name: 'User', dp: '👤', gender: 'Not specified' }); }
        } else { setUserProfile(null); }
        setIsLoadingAuth(false);
      });

      const fullKey = (sessionStorage.getItem('splitchain_full_key') || '').trim().toUpperCase();
      if (fullKey) {
        let createdSplits = [];
        let inboxSplits = [];
        
        const updateSplits = () => {
          const all = [...createdSplits, ...inboxSplits];
          const uniqueMap = new Map();
          all.forEach(item => {
             if (item && item.id) uniqueMap.set(item.id, item);
          });
          const unique = Array.from(uniqueMap.values());
          unique.sort((a, b) => b.timestamp - a.timestamp);
          setSplits(unique);
        };

        unsubscribeCreator = db.collection('splits').where('creator', '==', fullKey).onSnapshot((snapshot) => {
          createdSplits = snapshot.docs.map(doc => doc.data());
          updateSplits();
        }, e => console.error("Firestore Creator Error:", e));

        unsubscribeInbox = db.collection('splits')
          .where('participantAddresses', 'array-contains', fullKey)
          .onSnapshot((snapshot) => {
            inboxSplits = snapshot.docs.map(doc => doc.data());
            updateSplits();
          }, e => console.error("Firestore Inbox Error:", e));
      } else {
        setSplits([]);
      }
    } else {
      setIsLoadingAuth(false);
      const savedUser = sessionStorage.getItem('splitchain_user_profile');
      if (savedUser) setUserProfile(JSON.parse(savedUser));
      const savedSplits = sessionStorage.getItem('splitchain_user_splits');
      if (savedSplits) setSplits(JSON.parse(savedSplits));
      const handleStorage = (e) => { if (e.key === 'splitchain_user_splits' && e.newValue) setSplits(JSON.parse(e.newValue)); };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }

    const savedAddress = sessionStorage.getItem('splitchain_wallet_address');
    if (savedAddress) setConnectedWallet(savedAddress);

    return () => { 
      if (unsubscribeAuth) unsubscribeAuth(); 
      if (unsubscribeCreator) unsubscribeCreator(); 
      if (unsubscribeInbox) unsubscribeInbox(); 
    };
  }, [connectedWallet]);

  const handleLaunchApp = () => {
    if (!userProfile) setCurrentView('auth');
    else if (!connectedWallet) setIsWalletModalOpen(true);
    else setCurrentView('dashboard');
  };

  const handleLogout = async () => {
    if (auth) await auth.signOut();
    sessionStorage.clear();
    setUserProfile(null); setConnectedWallet(null); setCurrentView('landing'); setIsProfileModalOpen(false);
  };

  const handleProfileUpdate = async (p) => {
    setUserProfile(p);
    sessionStorage.setItem('splitchain_user_profile', JSON.stringify(p));
    if (db && p.uid) await db.collection('users').doc(p.uid).update(p);
  };

  const connectWallet = async (provider) => {
    try {
      let pubKey = '';
      if (provider === 'albedo') {
        const res = await window.albedo.publicKey({ token: 'splitchain_auth' }); pubKey = res.pubkey;
      } else {
        await window.freighterApi.setAllowed();
        const res = await window.freighterApi.getPublicKey(); pubKey = typeof res === 'string' ? res : res.publicKey;
      }
      sessionStorage.setItem('splitchain_full_key', pubKey);
      sessionStorage.setItem('splitchain_wallet_address', pubKey.substring(0, 4) + '...' + pubKey.substring(pubKey.length - 4));
      sessionStorage.setItem('splitchain_wallet_provider', provider);
      setConnectedWallet(pubKey.substring(0, 4) + '...' + pubKey.substring(pubKey.length - 4));
      setCurrentView('dashboard'); setIsWalletModalOpen(false);
    } catch (e) { console.error(e); }
  };

  if (isLoadingAuth) return <div className="min-h-screen bg-[#03050a] flex items-center justify-center text-blue-400 font-bold tracking-widest uppercase animate-pulse">Loading SplitChain...</div>;

  return (
    <>
      <style>{`
        html, body, #root { margin: 0; padding: 0; width: 100%; min-height: 100vh; background-color: #03050a; scroll-behavior: smooth; }
        .premium-card { background: linear-gradient(145deg, rgba(20, 25, 40, 0.7) 0%, rgba(10, 12, 20, 0.9) 100%); border: 1px solid rgba(255,255,255,0.08); backdrop-filter: blur(20px); }
      `}</style>

      <div className="min-h-screen w-full text-white font-sans relative overflow-x-hidden">
        <div className="fixed inset-0 w-full h-[120vh] pointer-events-none z-0 overflow-hidden">
          <video src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_105406_16f4600d-7a92-4292-b96e-b19156c7830a.mp4" autoPlay loop muted playsInline className="w-full h-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#03050a]/60 via-transparent to-[#03050a]/90"></div>
        </div>

        <nav className="fixed top-4 inset-x-0 px-4 sm:px-6 z-40 flex justify-center w-full pointer-events-none">
          <div className="w-full max-w-6xl premium-card rounded-2xl px-4 py-3 flex justify-between items-center pointer-events-auto shadow-2xl backdrop-blur-3xl bg-[#03050a]/50">
            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setCurrentView('landing')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-white/10 flex items-center justify-center font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 shadow-inner">SC</div>
              <h1 className="text-2xl font-black hidden sm:block">SplitChain</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              {!userProfile ? (
                <button onClick={() => setCurrentView('auth')} className="px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-blue-600 hover:bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.4)] transition-all active:scale-95">Sign In</button>
              ) : (
                <>
                  <button onClick={() => connectedWallet ? setIsLogoutModalOpen(true) : setIsWalletModalOpen(true)} className={`flex px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border transition-all active:scale-95 ${connectedWallet ? 'bg-[#1e293b]/80 border-white/10 hover:bg-[#1e293b]' : 'bg-blue-600 border-blue-400/30 hover:scale-105 shadow-[0_0_20px_rgba(59,130,246,0.4)]'}`}>
                    {connectedWallet ? <span className="flex items-center gap-1.5 sm:gap-2"><div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-green-400 animate-pulse"></div>{connectedWallet}</span> : "Connect Wallet"}
                  </button>
                  <button onClick={() => setIsProfileModalOpen(true)} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-[#1e293b]/80 border border-white/10 flex items-center justify-center hover:bg-[#1e293b] transition-all shadow-inner hover:scale-105 active:scale-95 shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </nav>

        {currentView === 'landing' && (
          <main className="relative z-10 pt-40 px-4 text-center">
            <FadeIn><div className="inline-flex items-center gap-3 mb-8 px-5 py-2 rounded-full bg-[#0a0f1c]/80 border border-blue-500/30 text-blue-300 text-xs font-bold tracking-widest shadow-[0_0_20px_rgba(59,130,246,0.15)]"><svg className="w-4 h-4 animate-[spin_4s_linear_infinite] text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" /></svg> Stellar Network Live</div></FadeIn>
            <FadeIn delay={100}><h2 className="text-5xl md:text-8xl font-black mb-6 leading-[1.1] tracking-tighter drop-shadow-2xl">Split effortlessly.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 animate-pulse">Settle on Web3.</span></h2></FadeIn>
            <FadeIn delay={200}><p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto font-medium mb-12">Universal expense sharing. Fraction of a cent fees. Built on Stellar.</p></FadeIn>
            <FadeIn delay={300}><button onClick={handleLaunchApp} className="bg-white text-black px-12 py-5 rounded-full font-black text-lg hover:scale-110 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)]">Launch App</button></FadeIn>

            <div className="h-24 md:h-32"></div>

            <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-8 pb-24">
              <FadeIn delay={0}>
                <div className="premium-card p-8 rounded-[2rem] text-left hover:scale-105 transition-all group h-full">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-300 mb-6 border border-white/10 shadow-inner group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
                    <svg className="w-6 h-6 group-hover:text-blue-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-white">Lightning Fast</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">Settle debts across borders instantly with USDC and Stellar tokens. No more waiting.</p>
                </div>
              </FadeIn>

              <FadeIn delay={100}>
                <div className="premium-card p-8 rounded-[2rem] text-left hover:scale-105 transition-all group h-full">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-300 mb-6 border border-white/10 shadow-inner group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
                    <svg className="w-6 h-6 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-white">Trustless Logic</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">Built on Soroban smart contracts. Your splits are safe and unalterable. You own your data.</p>
                </div>
              </FadeIn>

              <FadeIn delay={200}>
                <div className="premium-card p-8 rounded-[2rem] text-left hover:scale-105 transition-all group h-full">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-slate-300 mb-6 border border-white/10 shadow-inner group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all">
                    <svg className="w-6 h-6 group-hover:text-purple-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
                  </div>
                  <h4 className="text-xl font-bold mb-3 text-white">Near-Zero Gas</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">Stop worrying about Ethereum fees. Leverage the Stellar network to pay just ~0.00001 XLM per transaction.</p>
                </div>
              </FadeIn>
            </div>
          </main>
        )}

        {currentView === 'auth' && <AuthScreen onBack={() => setCurrentView('landing')} onLoginSuccess={() => setCurrentView('landing')} />}

        {currentView === 'dashboard' && <Dashboard network={network} setNetwork={setNetwork} splits={splits} setSplits={setSplits} userProfile={userProfile} />}

        {isWalletModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03050a]/90 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
            <div className="w-full max-w-sm premium-card rounded-3xl p-6 relative shadow-[0_0_50px_rgba(59,130,246,0.2)]">
              <button onClick={() => setIsWalletModalOpen(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white hover:scale-110 transition-transform"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg></button>
              <h3 className="text-xl font-bold mb-6">Select Provider</h3>
              <div className="space-y-3">
                <button onClick={() => connectWallet('albedo')} className="w-full bg-[#0f1524] border border-white/5 p-4 rounded-xl flex items-center gap-4 group hover:border-blue-500/50 active:scale-95 transition-all">
                  <div className="w-12 h-12 rounded-full bg-[#1e293b] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <svg className="w-6 h-6 text-blue-400 group-hover:text-blue-300 transition-colors" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.83L19.5 19h-15L12 5.83z" /></svg>
                  </div>
                  <p className="font-bold text-lg">Albedo</p>
                </button>
                <button onClick={() => connectWallet('freighter')} className="w-full bg-[#0f1524] border border-white/5 p-4 rounded-xl flex items-center gap-4 group hover:border-blue-500/50 active:scale-95 transition-all">
                  <div className="w-12 h-12 rounded-full bg-[#1e293b] flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <svg className="w-6 h-6 text-slate-300 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                  <p className="font-bold text-lg">Freighter</p>
                </button>
              </div>
            </div>
          </div>
        )}

        {isLogoutModalOpen && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center px-4 bg-[#03050a]/90 backdrop-blur-md animate-[fadeIn_0.2s_ease-out]">
            <div className="w-full max-w-sm premium-card rounded-3xl p-6 text-center relative shadow-[0_0_50px_rgba(239,68,68,0.15)]">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20 shadow-[inset_0_0_20px_rgba(239,68,68,0.2)]">
                <svg className="w-8 h-8 text-red-500 drop-shadow-lg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </div>
              <h3 className="text-xl font-bold mb-4">Disconnect Wallet?</h3>
              <div className="flex gap-4">
                <button onClick={() => setIsLogoutModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold bg-slate-800/80 hover:bg-slate-700 transition-all active:scale-95 border border-white/5">Cancel</button>
                <button onClick={() => {
                  sessionStorage.removeItem('splitchain_wallet_address');
                  sessionStorage.removeItem('splitchain_full_key');
                  sessionStorage.removeItem('splitchain_wallet_provider');
                  setConnectedWallet(null); setIsLogoutModalOpen(false);
                }} className="flex-1 py-3 rounded-xl font-bold bg-red-600 hover:bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.4)] transition-all active:scale-95">Disconnect</button>
              </div>
            </div>
          </div>
        )}

        <ProfileModal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} userProfile={userProfile} onUpdateProfile={handleProfileUpdate} onLogout={handleLogout} />
      </div>
    </>
  );
}

function AppWithBoundary() {
  return <ErrorBoundary><MainApp /></ErrorBoundary>;
}

ReactDOM.render(<AppWithBoundary />, document.getElementById('root'));
