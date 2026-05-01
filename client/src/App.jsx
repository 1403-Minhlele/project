import React, { useState, useEffect } from 'react';
import { 
  Terminal, Shield, Lock, Send, Database, FileText, 
  Link as LinkIcon, ExternalLink, Loader2, PlusSquare, 
  Tag, Key, LogOut, Unlock, ArrowLeft, Maximize, AlertTriangle
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './index.css';

// --- COMPONENT CHÍNH ---
export default function App() {
  const [writeups, setWriteups] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [selectedWriteup, setSelectedWriteup] = useState(null);

  useEffect(() => {
    fetch('https://project-3g8c.onrender.com/api/writeups')
      .then(res => res.json())
      .then(data => {
        setWriteups(data);
        setIsLoadingDB(false);
      })
      .catch(err => console.error("Lỗi lấy dữ liệu:", err));
  }, []);

  const handleAddNewWriteup = (newWriteup) => {
    setWriteups([newWriteup, ...writeups]); 
  };

  return (
    <div className="bg-slate-950 min-h-screen font-sans selection:bg-emerald-500/30 text-slate-300">
      <nav className="fixed w-full z-50 bg-slate-950/90 backdrop-blur-md py-4 border-b border-emerald-900/50 shadow-lg shadow-emerald-900/20">
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <button onClick={() => setSelectedWriteup(null)} className="text-2xl font-bold font-mono flex items-center gap-2 text-white hover:text-emerald-400 transition-colors">
            <Terminal className="text-emerald-400" /> Krinoa<span className="text-emerald-400 animate-pulse">_</span>
          </button>
        </div>
      </nav>

      {selectedWriteup ? (
        <WriteupReader wu={selectedWriteup} onBack={() => setSelectedWriteup(null)} />
      ) : (
        <>
          <Hero />
          <WriteupsList writeups={writeups} isLoading={isLoadingDB} onView={setSelectedWriteup} />
          <AdminPanel onAdd={handleAddNewWriteup} />
          <SecureContact />
        </>
      )}
    </div>
  );
}

// --- COMPONENT ĐỌC BÀI VIẾT ---
const WriteupReader = ({ wu, onBack }) => {
  const [mdContent, setMdContent] = useState('');
  const [isFetchingMd, setIsFetchingMd] = useState(false);

  const getSafeData = (rawLink) => {
    let finalUrl = '';
    let isError = false;
    try {
      const regex = /\]\((https?:\/\/[^\s)]+)\)/;
      const match = rawLink?.match(regex);
      let extracted = match ? match[1] : rawLink;
      new URL(extracted); 
      finalUrl = extracted;
    } catch (e) {
      isError = true; 
    }
    return { finalUrl, isError };
  };

  const { finalUrl, isError } = getSafeData(wu.link);
  const isGithub = finalUrl.includes('github.com');
  
  let rawUrl = '';
  let baseUrl = ''; 
  
  if (isGithub && !isError) {
    rawUrl = finalUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    baseUrl = rawUrl.substring(0, rawUrl.lastIndexOf('/') + 1);
  }

  useEffect(() => {
    if (isGithub && !isError) {
      setIsFetchingMd(true);
      fetch(rawUrl)
        .then(res => {
          if (!res.ok) throw new Error("Không thể tải file");
          return res.text();
        })
        .then(text => {
          setMdContent(text);
          setIsFetchingMd(false);
        })
        .catch(err => {
          console.error(err);
          setMdContent("# ❌ Lỗi\nKhông thể kéo nội dung từ GitHub. Đảm bảo kho lưu trữ (Repository) của bạn đang để chế độ Public.");
          setIsFetchingMd(false);
        });
    }
  }, [rawUrl, isGithub, isError]);

  return (
    <section className="pt-24 pb-12 px-6 min-h-screen flex flex-col bg-slate-950 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto w-full relative z-10 flex flex-col h-[85vh]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
          <div>
            <button onClick={onBack} className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 font-mono text-sm mb-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 transition-colors">
              <ArrowLeft size={16} /> Return to Main System
            </button>
            <h2 className="text-2xl font-bold text-white font-mono flex items-center gap-2">
              <FileText className="text-emerald-400" /> {wu.title}
            </h2>
          </div>
          <div className="flex gap-2">
            {wu.tags?.map(tag => (
              <span key={tag} className="text-xs border border-slate-700 px-2 py-1 rounded bg-slate-900 text-slate-400 font-mono">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative flex flex-col items-center justify-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 z-20"></div>
          
          {isError ? (
             <div className="text-center p-8 z-10">
               <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
               <h3 className="text-xl font-bold text-white mb-2">Lỗi phân giải đường dẫn</h3>
               <p className="text-slate-400 font-mono text-sm">Target URL không hợp lệ.</p>
             </div>
          ) : isGithub ? (
             <div className="w-full h-full overflow-y-auto p-6 md:p-10 custom-scrollbar text-left items-start justify-start flex-1 bg-slate-950/50 relative">
               {isFetchingMd ? (
                 <div className="flex justify-center items-center h-full text-emerald-500 font-mono">
                   <Loader2 className="animate-spin mr-3" /> Đang kéo dữ liệu từ máy chủ...
                 </div>
               ) : (
                 <div className="max-w-4xl mx-auto w-full prose prose-invert prose-emerald prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-img:rounded-xl">
                   <ReactMarkdown
                     components={{
                       img: ({node, ...props}) => {
                         let imgSrc = props.src;
                         if (imgSrc && !imgSrc.startsWith('http')) {
                           if (imgSrc.startsWith('./')) imgSrc = imgSrc.replace('./', '');
                           if (imgSrc.startsWith('/')) imgSrc = imgSrc.substring(1);
                           imgSrc = baseUrl + imgSrc;
                         }
                         return (
                           <img 
                             {...props} 
                             src={imgSrc} 
                             alt={props.alt || "writeup-img"} 
                             loading="lazy"
                             className="mx-auto rounded-lg border border-slate-700 shadow-lg" 
                           />
                         );
                       }
                     }}
                   >
                     {mdContent}
                   </ReactMarkdown>
                 </div>
               )}
               <div className="absolute top-4 right-4 z-30">
                 <a href={finalUrl} target="_blank" rel="noreferrer" className="bg-slate-900/80 backdrop-blur text-slate-400 border border-slate-700 hover:text-emerald-400 px-3 py-1.5 rounded font-mono text-xs shadow-lg transition-colors flex items-center gap-2">
                   <Terminal size={14} /> View Source
                 </a>
               </div>
             </div>
          ) : (
            <>
              <iframe src={finalUrl} title={wu.title} className="w-full h-full bg-white z-10" frameBorder="0" allowFullScreen></iframe>
              <div className="absolute top-4 right-4 z-30 flex gap-2">
                <a href={finalUrl} target="_blank" rel="noreferrer" className="bg-slate-900/80 backdrop-blur text-emerald-400 border border-emerald-500/50 hover:bg-emerald-900 px-4 py-2 rounded font-mono text-xs shadow-lg transition-colors flex items-center gap-2">
                   Mở Tab Mới <ExternalLink size={14} />
                </a>
              </div>
            </>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .prose h1, .prose h2, .prose h3 { color: #f8fafc; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; border-bottom: 1px solid #1e293b; padding-bottom: 0.3em; }
        .prose p { color: #cbd5e1; line-height: 1.7; margin-bottom: 1em; }
        .prose a { color: #34d399; text-decoration: none; }
        .prose a:hover { text-decoration: underline; }
        .prose code { background-color: #0f172a; padding: 0.2em 0.4em; border-radius: 4px; color: #f472b6; font-family: monospace; font-size: 0.9em; border: 1px solid #1e293b; }
        .prose pre { background-color: #0f172a; padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; border: 1px solid #1e293b;}
        .prose pre code { background-color: transparent; padding: 0; color: #e2e8f0; border: none; }
        .prose ul { list-style-type: disc; padding-left: 1.5em; color: #cbd5e1; margin-bottom: 1em; }
        .prose ol { list-style-type: decimal; padding-left: 1.5em; color: #cbd5e1; margin-bottom: 1em; }
        .prose blockquote { border-left: 4px solid #34d399; padding-left: 1em; font-style: italic; color: #94a3b8; background: #022c2220; padding: 0.5em 1em; border-radius: 0 4px 4px 0;}
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
      `}} />
    </section>
  );
};


// --- [MỚI] HIỆU ỨNG GÕ PHÍM (TYPEWRITER COMPONENT) ---
const TypewriterText = ({ text, delay = 0, speed = 40 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // Đợi một khoảng thời gian (delay) rồi mới bắt đầu gõ
  useEffect(() => {
    const timer = setTimeout(() => setIsStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  // Logic gõ từng chữ cái
  useEffect(() => {
    if (!isStarted) return;
    
    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i === text.length) {
        clearInterval(intervalId);
        setIsDone(true); // Gõ xong thì đổi trạng thái
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed, isStarted]);

  return (
    <span>
      {displayedText}
      {/* Con trỏ nhấp nháy, nếu gõ xong rồi thì vẫn nhấp nháy để tạo cảm giác Terminal đang chạy */}
      <span className={`${isDone ? 'animate-pulse text-emerald-400' : 'text-emerald-400'}`}>_</span>
    </span>
  );
};


// --- CÁC COMPONENT CŨ GIỮ NGUYÊN ĐÃ ĐƯỢC CẬP NHẬT GIAO DIỆN HERO ---
const Hero = () => (
  <section className="pt-32 pb-20 px-6 border-b border-slate-900 bg-slate-950">
    <div className="max-w-7xl mx-auto text-center">
      <Terminal className="text-emerald-400 mx-auto mb-4" size={48} />
      <h1 className="text-5xl font-bold text-white mb-4">Lê Vũ Khánh Minh</h1>
      <h2 className="text-xl font-mono text-emerald-400 mb-8">Security Researcher</h2>
      
      {/* KHU VỰC CHỨA CHỮ ĐÁNH MÁY */}
      <div className="max-w-4xl mx-auto text-center bg-slate-900/80 p-6 rounded-lg border border-emerald-800 shadow-[0_0_30px_rgba(16,185,129,0.3)] space-y-4">
        
        {/* Dòng 1: Gõ ngay lập tức */}
        <p className="text-lg font-mono text-emerald-400">
          <TypewriterText text="Hi, I am from ATTT2025.2, University of Information Technology, VNU.HCM" speed={40} delay={0} />
        </p>

        {/* Dòng 2: Chờ dòng 1 gõ xong (khoảng 3500ms) rồi mới bắt đầu gõ tiếp */}
        <p className="text-base font-mono text-slate-300">
          <TypewriterText 
            text="This website is my 'vibe code' web development project aimed at learning about webdev, security vulnerabilities, and uploading CTF write-ups." 
            speed={30} 
            delay={3500} 
          />
        </p>
      </div>
      
    </div>
  </section>
);

const WriteupsList = ({ writeups, isLoading, onView }) => (
  <section className="py-24 bg-slate-900 border-t border-slate-800">
    <div className="max-w-5xl mx-auto px-6">
      <h2 className="text-2xl font-bold font-mono text-white flex items-center gap-2 mb-8">
        <Database className="text-emerald-400" /> SELECT * FROM writeups;
      </h2>
      {isLoading ? (
        <div className="text-emerald-500 flex"><Loader2 className="animate-spin mr-2"/> Fetching DB...</div>
      ) : (
        <div className="grid gap-6">
          {writeups.map((wu) => (
            <div key={wu._id || wu.id} className="bg-slate-950 border border-slate-800 p-6 rounded-lg flex flex-col md:flex-row justify-between shadow-xl hover:border-emerald-500/50 transition-colors">
              <div>
                <p className="text-sm font-mono text-emerald-500 mb-2">{wu.date} - {wu.type}</p>
                <h3 className="text-lg font-bold text-white">{wu.title}</h3>
                <div className="flex gap-2 mt-2 flex-wrap">
                  {wu.tags?.map(tag => <span key={tag} className="text-xs border border-slate-700 px-2 py-1 rounded bg-slate-900 text-slate-400">#{tag}</span>)}
                </div>
              </div>
              <button 
                onClick={() => onView(wu)}
                className="mt-4 md:mt-0 px-4 py-2 bg-slate-900 text-emerald-400 border border-emerald-900 rounded font-mono text-sm hover:bg-emerald-900/30 h-fit flex items-center gap-2 justify-center"
              >
                Execute <Terminal size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  </section>
);

const AdminPanel = ({ onAdd }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('adminToken'));
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [newWu, setNewWu] = useState({ title: '', link: '', type: 'HackMD', tagsStr: '' });
  const [status, setStatus] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    fetch('http://localhost:5000/api/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginData)
    })
    .then(res => res.json())
    .then(data => {
      if (data.success) {
        localStorage.setItem('adminToken', data.token); setIsLoggedIn(true); setLoginError('');
      } else { setLoginError('Sai tài khoản hoặc mật khẩu!'); }
    });
  };

  const handleLogout = () => { localStorage.removeItem('adminToken'); setIsLoggedIn(false); };

  const handleAdd = (e) => {
    e.preventDefault();
    const tagsArray = newWu.tagsStr.split(',').map(t => t.trim()).filter(t => t);
    const payload = {
      title: newWu.title, link: newWu.link, type: newWu.type,
      tags: tagsArray.length ? tagsArray : ['Uncategorized'],
      date: new Date().toLocaleDateString('vi-VN')
    };
    
    const token = localStorage.getItem('adminToken');

    fetch('http://localhost:5000/api/writeups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify(payload)
    })
    .then(res => { if(res.status === 403) throw new Error("Hết phiên đăng nhập!"); return res.json(); })
    .then(data => {
      onAdd(payload); setStatus('DB Inserted Successfully!');
      setNewWu({ title: '', link: '', type: 'HackMD', tagsStr: '' });
      setTimeout(() => setStatus(''), 3000);
    })
    .catch(err => { alert(err.message); handleLogout(); });
  };

  if (!isLoggedIn) {
    return (
      <section id="admin" className="py-24 bg-slate-950 border-t border-slate-800">
        <div className="max-w-md mx-auto px-6">
          <h2 className="text-2xl font-bold text-rose-500 mb-6 flex items-center gap-2 justify-center"><Key /> SUDO ROOT LOGIN</h2>
          <form onSubmit={handleLogin} className="bg-slate-900 p-6 rounded-lg border border-rose-900/50 space-y-4 shadow-2xl">
            <input required type="text" placeholder="Username" className="w-full bg-slate-950 p-3 rounded text-white outline-none focus:border-rose-500 border border-slate-800" value={loginData.username} onChange={e => setLoginData({...loginData, username: e.target.value})} />
            <input required type="password" placeholder="Password" className="w-full bg-slate-950 p-3 rounded text-white outline-none focus:border-rose-500 border border-slate-800" value={loginData.password} onChange={e => setLoginData({...loginData, password: e.target.value})} />
            <button className="w-full p-3 bg-rose-500/20 text-rose-400 rounded font-bold hover:bg-rose-500/30 transition-colors">AUTHENTICATE</button>
            {loginError && <p className="text-rose-500 text-center text-sm">{loginError}</p>}
          </form>
        </div>
      </section>
    );
  }

  return (
    <section id="admin" className="py-24 bg-slate-950 border-t border-slate-800">
      <div className="max-w-3xl mx-auto px-6">
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-emerald-400 flex items-center gap-2"><Lock/> Admin Panel (Authenticated)</h2>
            <button onClick={handleLogout} className="flex items-center gap-2 text-rose-500 text-sm hover:underline"><LogOut size={16}/> Logout</button>
        </div>
        <form onSubmit={handleAdd} className="bg-slate-900 p-6 rounded-lg border border-emerald-900/50 space-y-4">
          <input required type="text" placeholder="Tiêu đề..." className="w-full bg-slate-950 border border-slate-800 p-3 rounded text-white" value={newWu.title} onChange={e => setNewWu({...newWu, title: e.target.value})} />
          <div className="flex gap-4">
            <input required type="text" placeholder="Link (Bắt đầu bằng https://)..." className="w-full bg-slate-950 border border-slate-800 p-3 rounded text-white" value={newWu.link} onChange={e => setNewWu({...newWu, link: e.target.value})} />
            <select className="bg-slate-950 border border-slate-800 p-3 rounded text-white" value={newWu.type} onChange={e => setNewWu({...newWu, type: e.target.value})}>
              <option>Github / HackMD</option><option>Markdown</option>
            </select>
          </div>
          <input type="text" placeholder="Tags (Cach nhau dau phay)" className="w-full bg-slate-950 border border-slate-800 p-3 rounded text-white" value={newWu.tagsStr} onChange={e => setNewWu({...newWu, tagsStr: e.target.value})} />
          <button className="w-full p-3 bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 rounded font-bold hover:bg-emerald-500/30 transition-colors">INSERT RECORD TO DATABASE</button>
          {status && <p className="text-emerald-500 text-center animate-pulse">{status}</p>}
        </form>
      </div>
    </section>
  );
};

const SecureContact = () => {
  const [formData, setFormData] = useState({ email: '', message: '' });
  const [status, setStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    fetch('http://localhost:5000/api/contact', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
    })
    .then(res => res.json())
    .then(data => { setStatus(data.message); setFormData({ email: '', message: '' }); setTimeout(() => setStatus(''), 5000); });
  };

  return (
    <section className="py-24 bg-slate-900 border-t border-slate-800">
      <div className="max-w-3xl mx-auto px-6">
        <h2 className="text-2xl font-bold text-emerald-400 mb-6 flex items-center gap-2"><Terminal /> ./secure_contact.sh</h2>
        <form onSubmit={handleSubmit} className="bg-slate-950 p-6 rounded-lg border border-slate-800 space-y-4">
          <input required type="email" placeholder="Email của bạn..." className="w-full bg-slate-900 p-3 rounded text-emerald-400 border border-slate-800 outline-none focus:border-emerald-500" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
          <textarea required rows="3" placeholder="Nội dung (Payload)..." className="w-full bg-slate-900 p-3 rounded text-emerald-400 border border-slate-800 outline-none focus:border-emerald-500" value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})}></textarea>
          <button className="w-full p-3 bg-emerald-500/20 text-emerald-400 rounded font-bold border border-emerald-500/50 hover:bg-emerald-500/30 transition-colors">FIRE PAYLOAD</button>
          {status && <p className="text-emerald-500 text-center">{status}</p>}
        </form>
      </div>
    </section>
  );
};