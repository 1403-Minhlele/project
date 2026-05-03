import React, { useState, useEffect } from 'react';
import {
  Terminal, Shield, Lock, Send, Database, FileText,
  Link as LinkIcon, ExternalLink, Loader2, PlusSquare,
  Tag, Key, LogOut, Unlock, ArrowLeft, Maximize, AlertTriangle, Mail
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './index.css';

// --- COMPONENT CHÍNH ---
export default function App() {
  const [writeups, setWriteups] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [selectedWriteup, setSelectedWriteup] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  
  // NÂNG CẤP: Đưa trạng thái của Explorer lên App để đồng bộ với URL
  const [explorerView, setExplorerView] = useState('menu');

  useEffect(() => {
    fetch('https://project-3g8c.onrender.com/api/writeups', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setWriteups(data);
        setIsLoadingDB(false);
      })
      .catch(err => console.error("Lỗi lấy dữ liệu:", err));
  }, []);

  // --- HÀM ĐIỀU HƯỚNG CHUẨN ---
  const navigate = (path, action) => {
    if (window.location.pathname !== path) {
      window.history.pushState({ path }, '', path);
    }
    action();
  };

  // --- XỬ LÝ NÚT BACK/FORWARD (FIXED) ---
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;

      // 1. Nếu là đường dẫn Admin
      if (path === '/admin') {
        setShowAdmin(true);
        setSelectedWriteup(null);
      } 
      // 2. Nếu là các đường dẫn trong Explore Hub
      else if (['/writeups', '/research', '/contact'].includes(path)) {
        setShowAdmin(false);
        setSelectedWriteup(null);
        setExplorerView(path.replace('/', ''));
      } 
      // 3. Nếu đang đọc bài viết
      else if (path === '/reading') {
        // Nếu nhấn back/forward mà mất dữ liệu bài viết (do F5 hoặc lỗi state) thì về danh sách
        if (!selectedWriteup) {
          window.history.replaceState(null, '', '/writeups');
          setExplorerView('writeups');
        }
      } 
      // 4. Mặc định về Trang chủ
      else {
        setShowAdmin(false);
        setSelectedWriteup(null);
        setExplorerView('menu');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedWriteup]); // Lắng nghe selectedWriteup để tránh lỗi mất data khi back

  return (
    <div className="bg-slate-950 min-h-screen font-sans selection:bg-emerald-500/30 text-slate-300 overflow-x-hidden">
      <nav className="fixed w-full z-50 bg-slate-950/90 backdrop-blur-md py-4 border-b border-emerald-900/50 shadow-lg shadow-emerald-900/20">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
          <button
            onClick={() => navigate('/', () => { setSelectedWriteup(null); setShowAdmin(false); setExplorerView('menu'); })}
            className="text-xl md:text-2xl font-bold font-mono flex items-center gap-2 text-white hover:text-emerald-400 transition-colors"
          >
            <Terminal className="text-emerald-400" /> Krinoa<span className="text-emerald-400 animate-pulse">_</span>
          </button>

          <button
            onClick={() => navigate(showAdmin ? '/' : '/admin', () => { setSelectedWriteup(null); setShowAdmin(!showAdmin); })}
            className={`flex items-center gap-2 font-mono text-sm transition-colors ${showAdmin ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`}
          >
            <Unlock size={20} /> <span className="hidden md:inline">{showAdmin ? 'Close Admin' : 'Sudo Root'}</span>
          </button>
        </div>
      </nav>

      {selectedWriteup ? (
        <WriteupReader wu={selectedWriteup} onBack={() => navigate('/writeups', () => { setSelectedWriteup(null); setExplorerView('writeups'); })} />
      ) : showAdmin ? (
        <AdminPanel
          onAdd={(newWu) => setWriteups([newWu, ...writeups])}
          writeups={writeups}
          setWriteups={setWriteups}
          onBack={() => navigate('/', () => setShowAdmin(false))}
        />
      ) : (
        <>
          <Hero />
          {/* TRUYỀN STATE ĐIỀU HƯỚNG XUỐNG CHO LIST */}
          <WriteupsList 
            writeups={writeups} 
            isLoading={isLoadingDB} 
            currentView={explorerView}
            setCurrentView={setExplorerView}
            onView={(wu) => navigate('/reading', () => setSelectedWriteup(wu))} 
            navigate={navigate}
          />
        </>
      )}
    </div>
  );
}

// --- COMPONENT ĐỌC BÀI VIẾT (Giữ nguyên) ---

// --- COMPONENT XỬ LÝ ẢNH THÔNG MINH (TỰ ĐỘNG VƯỢT TƯỜNG LỬA) ---
const MarkdownImage = ({ src, alt, baseUrl }) => {
  const [imgSrc, setImgSrc] = useState('');
  const [fallbackLevel, setFallbackLevel] = useState(0);

  useEffect(() => {
    let finalSrc = src;
    if (!finalSrc) return;

    // 1. Nắn link GitHub (nếu lỡ copy nhầm link web)
    if (finalSrc.includes('github.com') && finalSrc.includes('/blob/')) {
      finalSrc = finalSrc.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    // 2. Nắn link tương đối (ảnh nằm cùng thư mục trên Repo)
    else if (!finalSrc.startsWith('http') && !finalSrc.startsWith('data:')) {
      finalSrc = finalSrc.replace(/^\.\//, '').replace(/^\//, '');
      finalSrc = baseUrl + finalSrc;
    }

    // 3. Xử lý Tiếng Việt có dấu và khoảng trắng bằng encodeURI chuẩn xác
    try {
      finalSrc = encodeURI(decodeURI(finalSrc));
    } catch (e) {
      finalSrc = finalSrc.replace(/ /g, '%20');
    }

    // 4. Mặc định dùng Proxy 1 cho các link hay bị chặn (HackMD, Imgur)
    if (finalSrc.includes('hackmd.io') || finalSrc.includes('imgur.com')) {
      setImgSrc(`https://wsrv.nl/?url=${finalSrc}`);
    } else {
      setImgSrc(finalSrc);
    }
  }, [src, baseUrl]);

  // HÀM TỰ ĐỘNG CHUYỂN PROXY KHI BỊ LỖI
  const handleError = (e) => {
    if (fallbackLevel === 0) {
      console.warn(`[!] Proxy 1 thất bại, đổi sang Proxy 2 (Codetabs) cho ảnh: ${src}`);

      let rawSrc = src;
      if (rawSrc.includes('github.com') && rawSrc.includes('/blob/')) {
        rawSrc = rawSrc.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
      } else if (!rawSrc.startsWith('http') && !rawSrc.startsWith('data:')) {
        rawSrc = baseUrl + rawSrc.replace(/^\.\//, '').replace(/^\//, '');
      }
      try { rawSrc = encodeURI(decodeURI(rawSrc)); } catch (err) { rawSrc = rawSrc.replace(/ /g, '%20'); }

      // Chuyển sang proxy thứ 2 chuyên dụng hơn
      setImgSrc(`https://api.codetabs.com/v1/proxy?quest=${rawSrc}`);
      setFallbackLevel(1);
    } else {
      console.error(`❌ Bó tay! Ảnh này đã không còn tồn tại hoặc bị khóa từ nguồn: ${src}`);
      e.target.style.display = 'none'; // Ẩn luôn hình vỡ để web không bị xấu
    }
  };

  if (!imgSrc) return null;

  return (
    <img
      src={imgSrc}
      alt={alt || "CTF Evidence"}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="mx-auto rounded-lg border border-slate-700 shadow-[0_0_20px_rgba(16,185,129,0.1)] max-w-full my-6 hover:border-emerald-500 transition-colors"
      onError={handleError}
    />
  );
};

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
    <section className="pt-24 pb-12 px-4 md:px-6 min-h-screen flex flex-col bg-slate-950 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] pointer-events-none"></div>

      <div className="max-w-6xl mx-auto w-full relative z-10 flex flex-col h-[75vh] md:h-[85vh]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
          <div>
            <button onClick={onBack} className="flex items-center gap-2 text-emerald-500 hover:text-emerald-400 font-mono text-sm mb-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 transition-colors">
              <ArrowLeft size={16} /> Return to Main System
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-white font-mono flex items-center gap-2 leading-tight">
              <FileText className="text-emerald-400 shrink-0" /> <span className="break-words">{wu.title}</span>
            </h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {wu.tags?.map(tag => (
              <span key={tag} className="text-[10px] md:text-xs border border-slate-700 px-2 py-1 rounded bg-slate-900 text-slate-400 font-mono">
                #{tag}
              </span>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative flex flex-col items-center justify-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 z-20"></div>

          {isError ? (
            <div className="text-center p-4 md:p-8 z-10">
              <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">Lỗi phân giải đường dẫn</h3>
              <p className="text-slate-400 font-mono text-sm">Target URL không hợp lệ.</p>
            </div>
          ) : isGithub ? (
            <div className="w-full h-full overflow-y-auto p-4 md:p-10 custom-scrollbar text-left items-start justify-start flex-1 bg-slate-950/50 relative">
              {isFetchingMd ? (
                <div className="flex justify-center items-center h-full text-emerald-500 font-mono text-sm md:text-base">
                  <Loader2 className="animate-spin mr-3" /> Đang kéo dữ liệu từ máy chủ...
                </div>
              ) : (
                <div className="max-w-4xl mx-auto w-full prose prose-sm md:prose-base prose-invert prose-emerald prose-pre:bg-slate-900 prose-pre:border prose-pre:border-slate-800 prose-img:rounded-xl">
                  <ReactMarkdown
                    components={{
                      img: (props) => <MarkdownImage src={props.src} alt={props.alt} baseUrl={baseUrl} />
                    }}
                  >
                    {mdContent}
                  </ReactMarkdown>
                </div>
              )}
              <div className="absolute top-4 right-4 z-30">
                <a href={finalUrl} target="_blank" rel="noreferrer" className="bg-slate-900/80 backdrop-blur text-slate-400 border border-slate-700 hover:text-emerald-400 px-3 py-1.5 rounded font-mono text-[10px] md:text-xs shadow-lg transition-colors flex items-center gap-2">
                  <Terminal size={14} /> <span className="hidden md:inline">View Source</span>
                </a>
              </div>
            </div>
          ) : (
            <>
              <iframe src={finalUrl} title={wu.title} className="w-full h-full bg-white z-10" frameBorder="0" allowFullScreen></iframe>
              <div className="absolute top-4 right-4 z-30 flex gap-2">
                <a href={finalUrl} target="_blank" rel="noreferrer" className="bg-slate-900/80 backdrop-blur text-emerald-400 border border-emerald-500/50 hover:bg-emerald-900 px-3 py-2 md:px-4 rounded font-mono text-[10px] md:text-xs shadow-lg transition-colors flex items-center gap-2">
                  <span className="hidden md:inline">Mở Tab Mới</span> <ExternalLink size={14} />
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        .prose h1, .prose h2, .prose h3 { color: #f8fafc; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; border-bottom: 1px solid #1e293b; padding-bottom: 0.3em; word-wrap: break-word; }
        .prose p { color: #cbd5e1; line-height: 1.7; margin-bottom: 1em; word-wrap: break-word; }
        .prose a { color: #34d399; text-decoration: none; word-wrap: break-word; }
        .prose a:hover { text-decoration: underline; }
        .prose code { background-color: #0f172a; padding: 0.2em 0.4em; border-radius: 4px; color: #f472b6; font-family: monospace; font-size: 0.9em; border: 1px solid #1e293b; word-wrap: break-word; }
        .prose pre { background-color: #0f172a; padding: 1em; border-radius: 8px; overflow-x: auto; margin-bottom: 1em; border: 1px solid #1e293b; max-width: 100%;}
        .prose pre code { background-color: transparent; padding: 0; color: #e2e8f0; border: none; white-space: pre; word-wrap: normal; }
        .prose ul { list-style-type: disc; padding-left: 1.5em; color: #cbd5e1; margin-bottom: 1em; }
        .prose ol { list-style-type: decimal; padding-left: 1.5em; color: #cbd5e1; margin-bottom: 1em; }
        .prose blockquote { border-left: 4px solid #34d399; padding-left: 1em; font-style: italic; color: #94a3b8; background: #022c2220; padding: 0.5em 1em; border-radius: 0 4px 4px 0;}
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        @media (min-width: 768px) { .custom-scrollbar::-webkit-scrollbar { width: 8px; } }
      `}} />
    </section>
  );
};


// --- HIỆU ỨNG GÕ PHÍM (Giữ nguyên) ---
const TypewriterText = ({ text, delay = 0, speed = 40 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isStarted, setIsStarted] = useState(false);
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  useEffect(() => {
    if (!isStarted) return;

    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(text.substring(0, i + 1));
      i++;
      if (i === text.length) {
        clearInterval(intervalId);
        setIsDone(true);
      }
    }, speed);

    return () => clearInterval(intervalId);
  }, [text, speed, isStarted]);

  return (
    <span>
      {displayedText}
      <span className={`${isDone ? 'animate-pulse text-emerald-400' : 'text-emerald-400'}`}>_</span>
    </span>
  );
};

// --- HERO SECTION (Giữ nguyên) ---
const Hero = () => (
  <section className="pt-24 md:pt-32 pb-16 md:pb-20 px-4 md:px-6 border-b border-slate-900 bg-slate-950">
    <div className="max-w-7xl mx-auto text-center">
      <Terminal className="text-emerald-400 mx-auto mb-4" size={48} />
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">Lê Vũ Khánh Minh</h1>
      <h2 className="text-lg md:text-xl font-mono text-emerald-400 mb-8">Security Researcher</h2>

      <div className="mt-8 md:mt-10 flex justify-center gap-6">
        <a href="https://github.com/1403-Minhlele" target="_blank" rel="noreferrer"
          className="text-slate-400 hover:text-white transition-all transform hover:scale-110 flex flex-col items-center gap-2 group">
          <div className="p-3 bg-slate-900 rounded-full border border-slate-800 group-hover:border-emerald-500 shadow-lg transition-colors">
            <LinkIcon size={24} />
          </div>
          <span className="text-[10px] font-mono tracking-widest">GITHUB</span>
        </a>

        <a href="mailto:levukhanhminhtink29@gmail.com"
          className="text-slate-400 hover:text-white transition-all transform hover:scale-110 flex flex-col items-center gap-2 group">
          <div className="p-3 bg-slate-900 rounded-full border border-slate-800 group-hover:border-emerald-500 shadow-lg transition-colors">
            <Mail size={24} />
          </div>
          <span className="text-[10px] font-mono tracking-widest">GMAIL</span>
        </a>

        <a href="https://www.facebook.com/minh.le.102455" target="_blank" rel="noreferrer"
          className="text-slate-400 hover:text-blue-500 transition-all transform hover:scale-110 flex flex-col items-center gap-2 group">
          <div className="p-3 bg-slate-900 rounded-full border border-slate-800 group-hover:border-blue-500 shadow-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </div>
          <span className="text-[10px] font-mono tracking-widest font-bold">FACEBOOK</span>
        </a>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mt-12">
        <div className="bg-slate-900/50 p-5 md:p-6 rounded-lg border border-slate-800 text-left flex flex-col justify-center shadow-lg">
          <h3 className="text-emerald-400 font-mono mb-3 flex items-center gap-2 border-b border-slate-800 pb-2 text-sm md:text-base">
            <Shield size={18} /> root@identity:~$
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed font-mono space-y-3">
            <span className="block">Sinh viên năm nhất chuyên ngành An toàn thông tin tại UIT.</span>
            <span className="block">Đam mê Digital Forensics, Incident Response và các giải đấu CTF.</span>
            <span className="block">Kỹ năng: Digital Forensics, Reverse Engineering, Python, C++.</span>
            <span className="block">Mục tiêu: Nghiên cứu về bảo mật, phát hiện và phân tích mã độc, đồng thời chia sẻ kiến thức qua các bài viết và write-up.</span>
          </p>
        </div>

        <div className="md:col-span-2 bg-slate-900/80 p-5 md:p-6 rounded-lg border border-emerald-800 shadow-[0_0_30px_rgba(16,185,129,0.2)] flex flex-col justify-center space-y-4">
          <p className="text-base md:text-lg font-mono text-emerald-400">
            <TypewriterText text="Hi, I am from ATTT2025.2, University of Information Technology, VNU.HCM" speed={40} delay={0} />
          </p>
          <p className="text-sm md:text-base font-mono text-slate-300">
            <TypewriterText
              text="This website is my personal portfolio and learning space where I share write-ups, research, and insights on cybersecurity topics. It serves as a platform to document my journey in the field of information security, showcase my skills, and connect with like-minded individuals. Feel free to explore the write-ups section for detailed analyses of various security challenges and solutions I've encountered during my studies and CTF competitions."
              speed={30}
              delay={3500}
            />
          </p>
        </div>
      </div>
    </div>
  </section>
);

// --- KHU VỰC EXPLORE & QUẢN LÝ DANH SÁCH ---
const WriteupsList = ({ writeups, isLoading, onView, currentView, setCurrentView, navigate }) => {
  // --- LOGIC CHO PHẦN CONTACT (TÍCH HỢP SẴN) ---
  const [message, setMessage] = useState('');
  const [contactStatus, setContactStatus] = useState('');
  const [cooldown, setCooldown] = useState(0);

  // Quản lý đếm ngược 15 phút cooldown
  useEffect(() => {
    const timer = setInterval(() => {
      const lastSent = localStorage.getItem('lastPayloadSent');
      if (lastSent) {
        const timePassed = Date.now() - parseInt(lastSent, 10);
        if (timePassed < 900000) setCooldown(900000 - timePassed);
        else setCooldown(0);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Hàm chuyển category đồng bộ với URL hệ thống
  const navigateToCategory = (view) => {
    const path = view === 'menu' ? '/' : `/${view}`;
    navigate(path, () => setCurrentView(view));
  };

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    if (cooldown > 0) return;
    setContactStatus('TRANSMITTING...');
    try {
      const res = await fetch('https://api.web3forms.com/submit', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ 
          access_key: "56275818-1600-487e-bb39-ab2be95edf94", 
          message, 
          from_name: "ANONYMOUS_EXPLORER" 
        }) 
      });
      if (res.ok) { 
        setContactStatus('DELIVERED'); 
        setMessage(''); 
        localStorage.setItem('lastPayloadSent', Date.now().toString()); 
        setCooldown(900000); 
      }
    } catch (err) { setContactStatus('ERROR'); }
    setTimeout(() => setContactStatus(''), 5000);
  };

  // --- MÀN HÌNH 1: GIAO DIỆN EXPLORE MENU (ẢNH 2) ---
  if (currentView === 'menu') {
    return (
      <section className="py-16 md:py-24 bg-slate-950 border-t border-slate-900 text-left relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 md:px-6 relative z-10">
          <h2 className="text-xs md:text-sm font-mono text-slate-500 tracking-[0.2em] mb-6 uppercase">Explore</h2>
          <div className="flex flex-col gap-4">
            
            {/* Chức năng 1: Writeups */}
            <div className="bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-xl p-5 md:p-6 hover:border-emerald-500/30 transition-all group shadow-lg">
              <h3 className="text-lg md:text-xl text-slate-200 font-mono mb-1 group-hover:text-emerald-400 transition-colors">Writeups</h3>
              <p className="text-[10px] md:text-xs text-slate-600 font-mono mb-3 uppercase">/WRITEUPS</p>
              <p className="text-slate-400 font-mono text-sm mb-5">Click here to View my WriteUp (Published solve notes and CTF retrospectives).</p>
              <button onClick={() => navigateToCategory('writeups')} className="px-4 py-2 rounded-full border border-emerald-900/50 bg-emerald-950/30 text-emerald-400 font-mono text-[10px] md:text-xs hover:bg-emerald-900/50 hover:border-emerald-500/50 transition-colors flex items-center gap-2 w-fit">
                OPEN ~/WRITEUPS.URL
              </button>
            </div>

            {/* Chức năng 2: Research */}
            <div className="bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-xl p-5 md:p-6 hover:border-emerald-500/30 transition-all group shadow-lg">
              <h3 className="text-lg md:text-xl text-slate-200 font-mono mb-1 group-hover:text-emerald-400 transition-colors">Research</h3>
              <p className="text-[10px] md:text-xs text-slate-600 font-mono mb-3 uppercase">/RESEARCH</p>
              <p className="text-slate-400 font-mono text-sm mb-5">Click here to view my research (Deep dives into Digital Forensics & Incident Response).</p>
              <button onClick={() => navigateToCategory('research')} className="px-4 py-2 rounded-full border border-emerald-900/50 bg-emerald-950/30 text-emerald-400 font-mono text-[10px] md:text-xs hover:bg-emerald-900/50 hover:border-emerald-500/50 transition-colors flex items-center gap-2 w-fit">
                OPEN ~/RESEARCH.URL
              </button>
            </div>

            {/* Chức năng 3: Contact (Gộp từ SecureContact) */}
            <div className="bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-xl p-5 md:p-6 hover:border-emerald-500/30 transition-all group shadow-lg">
              <h3 className="text-lg md:text-xl text-slate-200 font-mono mb-1 group-hover:text-emerald-400 transition-colors">Contact</h3>
              <p className="text-[10px] md:text-xs text-slate-600 font-mono mb-3 uppercase">/CONTACT</p>
              <p className="text-slate-400 font-mono text-sm mb-5">Transmit an anonymous message directly to my terminal dashboard.</p>
              <button onClick={() => navigateToCategory('contact')} className="px-4 py-2 rounded-full border border-emerald-900/50 bg-emerald-950/30 text-emerald-400 font-mono text-[10px] md:text-xs hover:bg-emerald-900/50 hover:border-emerald-500/50 transition-colors flex items-center gap-2 w-fit">
                OPEN ~/CONTACT.URL
              </button>
            </div>

          </div>
        </div>
      </section>
    );
  }

  // --- MÀN HÌNH 2: GIAO DIỆN CHI TIẾT (WRITEUPS / CONTACT / RESEARCH) ---
  return (
    <section className="py-16 md:py-24 bg-slate-900 border-t border-slate-800 min-h-[60vh] text-left relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b9810a_1px,transparent_1px),linear-gradient(to_bottom,#10b9810a_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none"></div>

      <div className="max-w-5xl mx-auto px-4 md:px-6 relative z-10">
        <button onClick={() => navigateToCategory('menu')} className="mb-8 text-emerald-500/70 hover:text-emerald-400 flex items-center gap-2 font-mono text-sm transition-colors px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit shadow-md hover:bg-emerald-500/20">
          <ArrowLeft size={16} /> Return to Explore
        </button>
        
        {/* VIEW: DANH SÁCH BÀI VIẾT SQL STYLE */}
        {currentView === 'writeups' && (
          <>
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white flex items-center gap-2 mb-6 md:mb-8"><Database className="text-emerald-400" /> SELECT * FROM writeups;</h2>
            {isLoading ? (
              <div className="text-emerald-500 flex text-sm items-center font-mono"><Loader2 className="animate-spin mr-2" /> Accessing Secure Database...</div>
            ) : (
              <div className="grid gap-4 md:gap-6">
                {writeups.map((wu) => (
                  <div key={wu._id || wu.id} className="bg-slate-950 border border-slate-800 p-4 md:p-6 rounded-lg flex flex-col md:flex-row justify-between shadow-xl hover:border-emerald-500/50 transition-colors group">
                    <div className="mb-4 md:mb-0">
                      <p className="text-xs md:text-sm font-mono text-emerald-500/60 mb-1">{wu.date} - {wu.type}</p>
                      <h3 className="text-base md:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{wu.title}</h3>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {wu.tags?.map(tag => <span key={tag} className="text-[10px] border border-slate-700 px-2 py-1 rounded bg-slate-900 text-slate-400 font-mono">#{tag}</span>)}
                      </div>
                    </div>
                    <button onClick={() => onView(wu)} className="w-full md:w-auto px-4 py-2 bg-slate-900 text-emerald-400 border border-emerald-900 rounded font-mono text-sm hover:bg-emerald-900/30 flex items-center gap-2 justify-center shrink-0 h-fit">
                      Execute <Terminal size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* VIEW: FORM LIÊN HỆ ẨN DANH */}
        {currentView === 'contact' && (
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl md:text-2xl font-bold text-emerald-400 mb-6 font-mono flex items-center gap-2">
              <Mail className="text-emerald-400" /> ./contact_handler.sh --anonymous
            </h2>
            <form onSubmit={handleContactSubmit} className="bg-slate-950 p-6 md:p-8 rounded-lg border border-emerald-900/30 shadow-2xl space-y-4">
              <textarea 
                required rows="6" 
                placeholder="Type your message to Krinoa terminal..." 
                className="w-full bg-slate-900 p-4 rounded text-emerald-400 border border-slate-800 focus:border-emerald-500 outline-none font-mono transition-all resize-none shadow-inner" 
                value={message} 
                onChange={e => setMessage(e.target.value)} 
                disabled={cooldown > 0}
              ></textarea>
              <button disabled={cooldown > 0} className="w-full p-4 bg-emerald-500/10 text-emerald-400 rounded-lg font-bold border border-emerald-500/30 hover:bg-emerald-500/20 transition-all uppercase tracking-widest disabled:opacity-50 flex justify-center gap-2 items-center">
                {cooldown > 0 ? <><Lock size={16} /> SYSTEM_LOCKED ({Math.floor(cooldown/60000)}m)</> : <><Send size={16} /> Transmit Payload</>}
              </button>
              {contactStatus && <p className="text-center font-mono text-xs uppercase text-emerald-500 animate-pulse mt-4">{contactStatus}</p>}
            </form>
          </div>
        )}

        {/* VIEW: RESEARCH MODULE (DỰ PHÒNG) */}
        {currentView === 'research' && (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-slate-700 rounded-xl bg-slate-950/50 shadow-2xl">
            <Shield className="text-slate-700 mb-4 animate-pulse" size={64} />
            <h2 className="text-xl font-bold font-mono text-slate-400 mb-2 uppercase tracking-tighter">Encrypted Module</h2>
            <p className="text-slate-500 font-mono text-sm text-center px-4 max-w-sm">Hệ thống đang mã hóa dữ liệu nghiên cứu. <br/>Vui lòng quay lại sau!</p>
          </div>
        )}
      </div>
    </section>
  );
};
// --- BẢNG QUẢN TRỊ VIÊN (FULL SCREEN) ---
const AdminPanel = ({ onAdd, writeups, setWriteups, onBack }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem('adminToken'));
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');

  const [newWu, setNewWu] = useState({ title: '', link: '', type: 'GITHUB', tagsStr: '' });
  const [status, setStatus] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');

    fetch('https://project-3g8c.onrender.com/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginData)
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          localStorage.setItem('adminToken', data.token);
          setLoginSuccessMsg('[+] ACCESS GRANTED...');
          setIsAuthenticating(false);
          setTimeout(() => {
            setIsLoggedIn(true);
            setLoginSuccessMsg('');
            setLoginData({ username: '', password: '' });
          }, 1500);
        } else {
          setIsAuthenticating(false);
          setLoginError('[-] WRONG CREDENTIALS');
        }
      })
      .catch(err => {
        setIsAuthenticating(false);
        setLoginError('[-] SERVER DISCONNECTED');
      });
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsLoggedIn(false);
  };

  const handleAdd = (e) => {
    e.preventDefault();
    const tagsArray = newWu.tagsStr.split(',').map(t => t.trim()).filter(t => t);
    const payload = { ...newWu, tags: tagsArray.length ? tagsArray : ['General'], date: new Date().toLocaleDateString() };
    const token = localStorage.getItem('adminToken');

    fetch('https://project-3g8c.onrender.com/api/writeups', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    })
      .then(res => res.json())
      .then(data => {
        onAdd(data);
        setStatus('DB UPDATED SUCCESSFULLY');
        setNewWu({ title: '', link: '', type: 'GITHUB', tagsStr: '' });
        setTimeout(() => setStatus(''), 3000);
      });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("❗ CẢNH BÁO: Bạn có chắc chắn muốn xóa bài viết này không? Hành động này không thể hoàn tác!")) return;
    
    const token = localStorage.getItem('adminToken');

    try {
      const res = await fetch(`https://project-3g8c.onrender.com/api/writeups/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("text/html")) {
         throw new Error("Lỗi Server Render: Máy chủ vẫn đang chạy code cũ, chưa cập nhật API xóa mới!");
      }

      const data = await res.json();

      if (!res.ok || data.success === false) {
         throw new Error(data.error || "Không thể xóa từ Database!");
      }
      setWriteups(prev => prev.filter(wu => (wu._id || wu.id) !== id));
      alert("✅ " + data.message);

    } catch (err) {
      alert("❌ THẤT BẠI: " + err.message);
    }
  };

  // NẾU CHƯA ĐĂNG NHẬP: HIỆN FORM LOGIN (FULL SCREEN)
  if (!isLoggedIn) {
    return (
      <section className="pt-32 pb-16 min-h-screen bg-slate-950">
        <div className="max-w-md mx-auto px-4 md:px-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={onBack} className="text-slate-500 hover:text-emerald-400 flex items-center gap-2 text-sm font-mono transition-colors">
              <ArrowLeft size={16} /> Back to Home
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-rose-500 flex items-center gap-2"><Key /> Sudo Root</h2>
          </div>

          <form onSubmit={handleLogin} className={`bg-slate-900 p-5 md:p-6 rounded-lg border ${loginError ? 'border-rose-500 animate-pulse' : 'border-rose-900/50'} space-y-4 shadow-2xl transition-colors`}>
            <input required disabled={isAuthenticating || loginSuccessMsg} type="text" placeholder="Username" className="w-full bg-slate-950 p-3 rounded text-white outline-none focus:border-rose-500 border border-slate-800 disabled:opacity-50 text-sm md:text-base" value={loginData.username} onChange={e => setLoginData({ ...loginData, username: e.target.value })} />
            <input required disabled={isAuthenticating || loginSuccessMsg} type="password" placeholder="Password" className="w-full bg-slate-950 p-3 rounded text-white outline-none focus:border-rose-500 border border-slate-800 disabled:opacity-50 text-sm md:text-base" value={loginData.password} onChange={e => setLoginData({ ...loginData, password: e.target.value })} />
            <button disabled={isAuthenticating || loginSuccessMsg} className="w-full p-3 bg-rose-500/20 text-rose-400 rounded font-bold hover:bg-rose-500/30 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 text-sm md:text-base">
              {isAuthenticating ? <><Loader2 className="animate-spin" size={18} /> AUTHENTICATING...</> : 'AUTHENTICATE'}
            </button>
            {loginError && (
              <div className="bg-rose-950/50 border border-rose-500/50 p-3 rounded flex items-center gap-2 text-rose-500 font-mono text-xs md:text-sm">
                <AlertTriangle size={16} className="shrink-0" /> {loginError}
              </div>
            )}
            {loginSuccessMsg && (
              <div className="bg-emerald-950/50 border border-emerald-500/50 p-3 rounded flex items-center gap-2 text-emerald-500 font-mono text-xs md:text-sm animate-pulse">
                <Unlock size={16} className="shrink-0" /> {loginSuccessMsg}
              </div>
            )}
          </form>
        </div>
      </section>
    );
  }

  // NẾU ĐÃ ĐĂNG NHẬP: HIỆN DASHBOARD (FULL SCREEN)
  return (
    <section className="pt-32 pb-16 min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#10b9811a_1px,transparent_1px),linear-gradient(to_bottom,#10b9811a_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none opacity-20"></div>

      <div className="max-w-3xl mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-emerald-900/50 pb-4 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-emerald-400 flex items-center gap-2"><Lock /> SYSTEM OVERRIDE</h2>
            <div className="text-xs md:text-sm text-emerald-500/70 font-mono mt-1">
              <TypewriterText text="Welcome back, Administrator." speed={30} delay={500} />
            </div>
          </div>
          <button onClick={handleLogout} className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded border border-rose-500/30 text-sm hover:bg-rose-500/20 transition-colors"><LogOut size={16} /> Disconnect</button>
        </div>

        <form onSubmit={handleAdd} className="bg-slate-900 p-5 md:p-6 rounded-lg border border-emerald-500/30 space-y-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <input required type="text" placeholder="Entry Title..." className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 p-3 rounded text-white outline-none transition-colors text-sm md:text-base" value={newWu.title} onChange={e => setNewWu({ ...newWu, title: e.target.value })} />

          <div className="flex flex-col md:flex-row gap-4">
            <input required type="text" placeholder="Target Link (https://)..." className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 p-3 rounded text-white outline-none transition-colors text-sm md:text-base" value={newWu.link} onChange={e => setNewWu({ ...newWu, link: e.target.value })} />
            <select className="w-full md:w-auto bg-slate-950 border border-slate-800 focus:border-emerald-500 p-3 rounded text-white outline-none text-sm md:text-base shrink-0" value={newWu.type} onChange={e => setNewWu({ ...newWu, type: e.target.value })}>
              <option>Github / HackMD</option><option>Markdown</option>
            </select>
          </div>

          <input type="text" placeholder="Tags (Cách nhau dấu phẩy)" className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 p-3 rounded text-white outline-none transition-colors text-sm md:text-base" value={newWu.tagsStr} onChange={e => setNewWu({ ...newWu, tagsStr: e.target.value })} />
          <button className="w-full p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 rounded font-bold hover:bg-emerald-500/20 transition-colors uppercase tracking-widest flex justify-center items-center gap-2 text-sm md:text-base"><Database size={18} /> Inject Record</button>
          {status && <p className="text-emerald-500 text-center font-mono text-sm md:text-base animate-pulse bg-emerald-500/10 p-2 rounded">{status}</p>}
        </form>

        <div className="mt-12 space-y-4">
          <h3 className="text-lg font-mono text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Database size={16} /> Quản lý danh sách hiện có
          </h3>
          {writeups.map((wu) => (
            <div key={wu._id || wu.id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded border border-slate-800">
              <div>
                <p className="text-white font-medium">{wu.title}</p>
                <p className="text-xs text-slate-500 font-mono">{wu.date}</p>
              </div>
              <button
                onClick={() => handleDelete(wu._id || wu.id)}
                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
                title="Xóa bài này"
              >
                <AlertTriangle size={20} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
