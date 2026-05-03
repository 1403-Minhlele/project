import React, { useState, useEffect, useRef, useCallback, memo } from 'react';
import {
  Terminal, Shield, Lock, Send, Database, FileText,
  Link as LinkIcon, ExternalLink, Loader2, Tag, Key,
  LogOut, Unlock, ArrowLeft, AlertTriangle, Mail
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './index.css';

// --- CONSTANTS ---
const API_BASE = 'https://project-3g8c.onrender.com/api';
const CONTACT_COOLDOWN_MS = 900_000; // 15 phút
// Lưu ý: Chuyển key này sang biến môi trường trong dự án thực
// VITE_WEB3FORMS_KEY=... trong file .env
const WEB3FORMS_KEY = import.meta.env.VITE_WEB3FORMS_KEY ?? '56275818-1600-487e-bb39-ab2be95edf94';

// --- UTILS ---
const getAdminToken = () => sessionStorage.getItem('adminToken'); // sessionStorage an toàn hơn localStorage
const setAdminToken = (token) => sessionStorage.setItem('adminToken', token);
const removeAdminToken = () => sessionStorage.removeItem('adminToken');

// --- CUSTOM CURSOR (Fish Shell Vibe) ---
const CustomCursor = memo(() => {
  const cursorDotRef = useRef(null);
  const cursorOutlineRef = useRef(null);
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const mouse = useRef({ x: -100, y: -100 });
  const outline = useRef({ x: -100, y: -100 });
  const rafId = useRef(null);

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;

    // Ẩn con trỏ mặc định
    document.body.style.cursor = 'none';

    const updateMousePosition = (e) => {
      mouse.current = { x: e.clientX, y: e.clientY };
      if (cursorDotRef.current) {
        cursorDotRef.current.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0) translate(-50%,-50%)`;
      }
    };

    const handleMouseOver = (e) => {
      setIsHovering(!!e.target.closest('a,button,input,textarea,select'));
    };

    const handleMouseDown = () => setIsClicking(true);
    const handleMouseUp = () => setIsClicking(false);

    window.addEventListener('mousemove', updateMousePosition, { passive: true });
    window.addEventListener('mouseover', handleMouseOver, { passive: true });
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);

    const render = () => {
      outline.current.x += (mouse.current.x - outline.current.x) * 0.2;
      outline.current.y += (mouse.current.y - outline.current.y) * 0.2;
      if (cursorOutlineRef.current) {
        cursorOutlineRef.current.style.transform = `translate3d(${outline.current.x}px,${outline.current.y}px,0) translate(-50%,-50%)`;
      }
      rafId.current = requestAnimationFrame(render);
    };
    rafId.current = requestAnimationFrame(render);

    return () => {
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', updateMousePosition);
      window.removeEventListener('mouseover', handleMouseOver);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      cancelAnimationFrame(rafId.current);
    };
  }, []);

  return (
    <>
      <div
        ref={cursorDotRef}
        className={`hidden md:flex items-center justify-center fixed top-0 left-0 w-0 h-0 pointer-events-none z-[9999] font-mono font-bold text-xl text-emerald-400 transition-opacity duration-200 ${
          isHovering ? 'opacity-0' : 'opacity-100 animate-pulse drop-shadow-[0_0_5px_#10b981]'
        }`}
      >
        <span className="absolute">&gt;</span>
      </div>
      <div
        ref={cursorOutlineRef}
        className={`hidden md:flex items-center justify-center fixed top-0 left-0 w-0 h-0 pointer-events-none z-[9998] font-mono font-bold transition-colors duration-300 ${
          isClicking ? 'text-rose-500' : 'text-emerald-500/70'
        }`}
      >
        <span className={`absolute transition-all duration-300 ease-out ${isHovering ? 'right-4 text-2xl text-emerald-400 drop-shadow-[0_0_5px_#10b981]' : 'right-2 text-base'}`}>[</span>
        <span className={`absolute transition-all duration-300 ease-out ${isHovering ? 'left-4 text-2xl text-emerald-400 drop-shadow-[0_0_5px_#10b981]' : 'left-2 text-base'}`}>]</span>
      </div>
    </>
  );
});
CustomCursor.displayName = 'CustomCursor';

// --- TYPEWRITER ---
const TypewriterText = memo(({ text, delay = 0, speed = 40 }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    let startTimer;
    let intervalId;

    startTimer = setTimeout(() => {
      let i = 0;
      intervalId = setInterval(() => {
        i++;
        setDisplayedText(text.substring(0, i));
        if (i >= text.length) {
          clearInterval(intervalId);
          setIsDone(true);
        }
      }, speed);
    }, delay);

    // Cleanup cả 2 timer
    return () => {
      clearTimeout(startTimer);
      clearInterval(intervalId);
    };
  }, [text, speed, delay]);

  return (
    <span>
      {displayedText}
      <span className={isDone ? 'animate-pulse text-emerald-400' : 'text-emerald-400'}>_</span>
    </span>
  );
});
TypewriterText.displayName = 'TypewriterText';

// --- MARKDOWN IMAGE với fallback ---
const MarkdownImage = memo(({ src, alt, baseUrl }) => {
  const [imgSrc, setImgSrc] = useState('');
  const [fallbackLevel, setFallbackLevel] = useState(0);

  const resolveUrl = useCallback((rawSrc) => {
    if (!rawSrc) return '';
    let url = rawSrc;

    if (url.includes('github.com') && url.includes('/blob/')) {
      url = url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    } else if (!url.startsWith('http') && !url.startsWith('data:')) {
      url = baseUrl + url.replace(/^\.\//, '').replace(/^\//, '');
    }

    try { url = encodeURI(decodeURI(url)); } catch { url = url.replace(/ /g, '%20'); }
    return url;
  }, [baseUrl]);

  useEffect(() => {
    const resolved = resolveUrl(src);
    if (!resolved) return;
    const needsProxy = resolved.includes('hackmd.io') || resolved.includes('imgur.com');
    setImgSrc(needsProxy ? `https://wsrv.nl/?url=${resolved}` : resolved);
    setFallbackLevel(0);
  }, [src, resolveUrl]);

  const handleError = useCallback((e) => {
    if (fallbackLevel === 0) {
      const resolved = resolveUrl(src);
      setImgSrc(`https://api.codetabs.com/v1/proxy?quest=${resolved}`);
      setFallbackLevel(1);
    } else {
      e.target.style.display = 'none';
    }
  }, [fallbackLevel, src, resolveUrl]);

  if (!imgSrc) return null;

  return (
    <img
      src={imgSrc}
      alt={alt || 'CTF Evidence'}
      loading="lazy"
      referrerPolicy="no-referrer"
      className="mx-auto rounded-lg border border-slate-700 shadow-[0_0_20px_rgba(16,185,129,0.1)] max-w-full my-6 hover:border-emerald-500 transition-colors"
      onError={handleError}
    />
  );
});
MarkdownImage.displayName = 'MarkdownImage';

// --- WRITEUP READER ---
const WriteupReader = memo(({ wu, onBack }) => {
  const [mdContent, setMdContent] = useState('');
  const [isFetchingMd, setIsFetchingMd] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const parseLink = useCallback((rawLink) => {
    try {
      const match = rawLink?.match(/\]\((https?:\/\/[^\s)]+)\)/);
      const extracted = match ? match[1] : rawLink;
      new URL(extracted);
      return { finalUrl: extracted, isError: false };
    } catch {
      return { finalUrl: '', isError: true };
    }
  }, []);

  const { finalUrl, isError } = parseLink(wu.link);
  const isGithub = finalUrl.includes('github.com');

  const rawUrl = isGithub && !isError
    ? finalUrl.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/')
    : '';
  const baseUrl = rawUrl ? rawUrl.substring(0, rawUrl.lastIndexOf('/') + 1) : '';

  useEffect(() => {
    if (!isGithub || isError || !rawUrl) return;

    const controller = new AbortController();
    setIsFetchingMd(true);
    setFetchError('');

    fetch(rawUrl, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error('Không thể tải file');
        return res.text();
      })
      .then(text => {
        setMdContent(text);
        setIsFetchingMd(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setFetchError('Không thể kéo nội dung từ GitHub. Đảm bảo Repository của bạn đang để chế độ Public.');
        setIsFetchingMd(false);
      });

    return () => controller.abort();
  }, [rawUrl, isGithub, isError]);

  return (
    <section className="pt-24 pb-12 px-4 md:px-6 min-h-screen flex flex-col bg-slate-950 relative">
      <div className="max-w-6xl mx-auto w-full relative z-10 flex flex-col h-[75vh] md:h-[85vh]">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 border-b border-slate-800 pb-4">
          <div>
            <button
              onClick={onBack}
              aria-label="Quay lại danh sách"
              className="flex items-center gap-2 text-emerald-500/70 hover:text-emerald-400 font-mono text-sm transition-colors px-5 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit shadow-md hover:bg-emerald-500/20 mb-4 whitespace-nowrap"
            >
              <ArrowLeft size={16} /> Return to Main System
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-white font-mono flex items-center gap-2 leading-tight">
              <FileText className="text-emerald-400 shrink-0" />
              <span className="break-words">{wu.title}</span>
            </h2>
          </div>
          <div className="flex gap-2 flex-wrap">
            {wu.tags?.map(tag => (
              <span key={tag} className="text-[10px] md:text-xs border border-slate-700 px-2 py-1 rounded bg-slate-900 text-slate-400 font-mono">#{tag}</span>
            ))}
          </div>
        </div>

        <div className="flex-1 w-full bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl relative flex flex-col items-center justify-center">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 to-cyan-500 z-20" />

          {isError ? (
            <div className="text-center p-4 md:p-8 z-10">
              <AlertTriangle size={48} className="text-rose-500 mx-auto mb-4" />
              <h3 className="text-lg md:text-xl font-bold text-white mb-2">Lỗi phân giải đường dẫn</h3>
              <p className="text-slate-400 font-mono text-sm">Target URL không hợp lệ.</p>
            </div>
          ) : isGithub ? (
            <div className="w-full h-full overflow-y-auto p-4 md:p-10 custom-scrollbar text-left flex-1 bg-slate-950/50 relative">
              {isFetchingMd ? (
                <div className="flex justify-center items-center h-full text-emerald-500 font-mono text-sm">
                  <Loader2 className="animate-spin mr-3" /> Đang kéo dữ liệu từ máy chủ...
                </div>
              ) : fetchError ? (
                <div className="flex flex-col items-center justify-center h-full gap-4">
                  <AlertTriangle size={40} className="text-rose-500" />
                  <p className="text-slate-400 font-mono text-sm text-center max-w-sm">{fetchError}</p>
                </div>
              ) : (
                <div className="max-w-4xl mx-auto w-full prose">
                  <ReactMarkdown
                    components={{ img: (props) => <MarkdownImage src={props.src} alt={props.alt} baseUrl={baseUrl} /> }}
                  >
                    {mdContent}
                  </ReactMarkdown>
                </div>
              )}
              <div className="absolute top-4 right-4 z-30">
                <a
                  href={finalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label="Xem source trên GitHub"
                  className="bg-slate-900/80 backdrop-blur text-slate-400 border border-slate-700 hover:text-emerald-400 px-3 py-1.5 rounded font-mono text-[10px] md:text-xs shadow-lg transition-colors flex items-center gap-2"
                >
                  <Terminal size={14} /> <span className="hidden md:inline">View Source</span>
                </a>
              </div>
            </div>
          ) : (
            <>
              <iframe
                src={finalUrl}
                title={wu.title}
                className="w-full h-full bg-white z-10"
                frameBorder="0"
                allowFullScreen
                sandbox="allow-scripts allow-same-origin allow-popups"
              />
              <div className="absolute top-4 right-4 z-30">
                <a
                  href={finalUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="bg-slate-900/80 backdrop-blur text-emerald-400 border border-emerald-500/50 hover:bg-emerald-900 px-3 py-2 md:px-4 rounded font-mono text-[10px] md:text-xs shadow-lg transition-colors flex items-center gap-2"
                >
                  <span className="hidden md:inline">Mở Tab Mới</span> <ExternalLink size={14} />
                </a>
              </div>
            </>
          )}
        </div>
      </div>

      {/* CSS định dạng Markdown — giữ nguyên như bản gốc */}
      <style dangerouslySetInnerHTML={{
        __html: `
        .prose h1, .prose h2, .prose h3 { color: #f8fafc; font-weight: bold; margin-top: 1.5em; margin-bottom: 0.5em; border-bottom: 1px solid #1e293b; padding-bottom: 0.3em; word-wrap: break-word; }
        .prose h4, .prose h5, .prose h6 { color: #e2e8f0; font-weight: 600; margin-top: 1.2em; margin-bottom: 0.4em; word-wrap: break-word; }
        .prose p { color: #cbd5e1; line-height: 1.7; margin-bottom: 1em; word-wrap: break-word; }
        .prose strong { color: #f1f5f9; font-weight: 700; }
        .prose em { color: #a5b4fc; font-style: italic; }
        .prose a { color: #34d399; text-decoration: none; word-wrap: break-word; }
        .prose a:hover { text-decoration: underline; color: #6ee7b7; }
        .prose code { background-color: #0f172a; padding: 0.2em 0.4em; border-radius: 4px; color: #f472b6; font-family: 'JetBrains Mono','Fira Code',monospace; font-size: 0.875em; border: 1px solid #1e293b; word-wrap: break-word; }
        .prose pre { background-color: #0f172a; padding: 1em 1.25em; border-radius: 8px; overflow-x: auto; margin: 1.25em 0; border: 1px solid #1e293b; max-width: 100%; }
        .prose pre code { background-color: transparent; padding: 0; color: #e2e8f0; border: none; font-size: 0.85em; white-space: pre; word-wrap: normal; }
        .prose ul { list-style-type: disc; padding-left: 1.5em; color: #cbd5e1; margin: 0.85em 0; }
        .prose ol { list-style-type: decimal; padding-left: 1.5em; color: #cbd5e1; margin: 0.85em 0; }
        .prose li { margin: 0.35em 0; }
        .prose li > ul, .prose li > ol { margin: 0.25em 0; }
        .prose blockquote { border-left: 4px solid #34d399; padding: 0.5em 1em; font-style: italic; color: #94a3b8; background: rgba(2,44,34,0.3); border-radius: 0 4px 4px 0; margin: 1em 0; }
        .prose table { width: 100%; border-collapse: collapse; margin: 1.25em 0; font-size: 0.9em; }
        .prose thead tr { background: #1e293b; }
        .prose th { color: #34d399; font-weight: 600; padding: 0.6em 1em; text-align: left; border: 1px solid #334155; }
        .prose td { padding: 0.5em 1em; border: 1px solid #1e293b; color: #cbd5e1; }
        .prose tbody tr:nth-child(even) { background: rgba(30,41,59,0.4); }
        .prose hr { border: none; border-top: 1px solid #1e293b; margin: 2em 0; }
        .prose img { max-width: 100%; border-radius: 8px; border: 1px solid #334155; box-shadow: 0 0 20px rgba(16,185,129,0.1); margin: 1.5em auto; display: block; transition: border-color 0.2s; }
        .prose img:hover { border-color: #10b981; }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #0f172a; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        @media (min-width: 768px) { .custom-scrollbar::-webkit-scrollbar { width: 8px; } }
      `}} />
    </section>
  );
});
WriteupReader.displayName = 'WriteupReader';

// --- HERO ---
const Hero = memo(() => (
  <section className="pt-24 md:pt-32 pb-8 md:pb-12 px-4 md:px-6 bg-slate-950">
    <div className="max-w-7xl mx-auto text-center">
      <Terminal className="text-emerald-400 mx-auto mb-4" size={48} aria-hidden="true" />
      <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">Lê Vũ Khánh Minh</h1>
      <h2 className="text-lg md:text-xl font-mono text-emerald-400 mb-8">Security Enthusiast</h2>

      <div className="mt-8 md:mt-10 flex justify-center gap-6">
        <a
          href="https://github.com/1403-Minhlele"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="GitHub profile"
          className="text-slate-400 hover:text-white transition-all transform hover:scale-110 flex flex-col items-center gap-2 group"
        >
          <div className="p-3 bg-slate-900 rounded-full border border-slate-800 group-hover:border-emerald-500 shadow-lg transition-colors">
            <LinkIcon size={24} aria-hidden="true" />
          </div>
          <span className="text-[10px] font-mono tracking-widest">GITHUB</span>
        </a>
        <a
          href="mailto:levukhanhminhtink29@gmail.com"
          aria-label="Gửi email"
          className="text-slate-400 hover:text-white transition-all transform hover:scale-110 flex flex-col items-center gap-2 group"
        >
          <div className="p-3 bg-slate-900 rounded-full border border-slate-800 group-hover:border-emerald-500 shadow-lg transition-colors">
            <Mail size={24} aria-hidden="true" />
          </div>
          <span className="text-[10px] font-mono tracking-widest">GMAIL</span>
        </a>
        <a
          href="https://www.facebook.com/minh.le.102455"
          target="_blank"
          rel="noreferrer noopener"
          aria-label="Facebook profile"
          className="text-slate-400 hover:text-blue-500 transition-all transform hover:scale-110 flex flex-col items-center gap-2 group"
        >
          <div className="p-3 bg-slate-900 rounded-full border border-slate-800 group-hover:border-blue-500 shadow-lg transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
            </svg>
          </div>
          <span className="text-[10px] font-mono tracking-widest font-bold">FACEBOOK</span>
        </a>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch mt-12">
        <div className="bg-slate-900/50 p-5 md:p-6 rounded-lg border border-emerald-800 text-left flex flex-col justify-center shadow-lg shadow-[0_0_30px_rgba(16,185,129,0.2)]">
          <h3 className="text-emerald-400 font-mono mb-3 flex items-center gap-2 border-b border-slate-800 pb-2 text-sm md:text-base">
            <Shield size={18} aria-hidden="true" /> root@identity:~$
          </h3>
          <p className="text-sm text-slate-400 leading-relaxed font-mono space-y-3">
            <span className="block">Sinh viên năm nhất chuyên ngành An toàn thông tin tại UIT.</span>
            <span className="block">Đam mê Digital Forensics, Incident Response và các giải đấu CTF.</span>
            <span className="block">Kỹ năng: Digital Forensics, Reverse Engineering, Python, C++.</span>
            <span className="block">Mục tiêu: Nghiên cứu về bảo mật, phát hiện và phân tích mã độc.</span>
          </p>
        </div>
        <div className="md:col-span-2 bg-slate-900/80 p-5 md:p-6 rounded-lg border border-emerald-800 shadow-[0_0_30px_rgba(16,185,129,0.2)] flex flex-col justify-center space-y-4">
          <p className="text-base md:text-lg font-mono text-emerald-400">
            <TypewriterText text="Hi, I am from ATTT2025.2, University of Information Technology, VNU.HCM" speed={40} delay={0} />
          </p>
          <p className="text-sm md:text-base font-mono text-slate-300">
            <TypewriterText text="This website is my personal portfolio and learning space where I share write-ups, research, and insights on cybersecurity topics. Feel free to explore!" speed={30} delay={3500} />
          </p>
        </div>
      </div>
    </div>
  </section>
));
Hero.displayName = 'Hero';

// --- CONTACT FORM ---
const ContactForm = memo(() => {
  const [message, setMessage] = useState('');
  const [contactStatus, setContactStatus] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    const tick = () => {
      const lastSent = localStorage.getItem('lastPayloadSent');
      if (lastSent) {
        const remaining = CONTACT_COOLDOWN_MS - (Date.now() - parseInt(lastSent, 10));
        setCooldown(remaining > 0 ? remaining : 0);
      }
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (cooldown > 0 || !message.trim()) return;

    setContactStatus('TRANSMITTING...');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          message: message.trim(),
          from_name: 'ANONYMOUS_EXPLORER',
        }),
      });
      if (res.ok) {
        setContactStatus('DELIVERED');
        setMessage('');
        localStorage.setItem('lastPayloadSent', Date.now().toString());
        setCooldown(CONTACT_COOLDOWN_MS);
      } else {
        setContactStatus('ERROR: Server rejected');
      }
    } catch {
      setContactStatus('ERROR: Network failure');
    }
    setTimeout(() => setContactStatus(''), 5000);
  };

  const minutesLeft = Math.ceil(cooldown / 60000);

  return (
    <div className="bg-slate-900/80 p-5 md:p-6 rounded-lg border border-emerald-800/50 shadow-[0_0_30px_rgba(16,185,129,0.1)] flex flex-col h-full">
      <div className="flex justify-between items-center mb-6">
        <span className="text-xs md:text-sm font-mono text-slate-500 tracking-[0.2em] uppercase">Contact</span>
      </div>
      <div className="flex-1 flex flex-col">
        <h3 className="text-sm text-emerald-400 font-mono mb-4 flex items-center gap-2 border-b border-slate-800 pb-3">
          <Mail size={16} aria-hidden="true" /> Contact Me Directly
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 gap-3">
          <label htmlFor="contact-msg" className="sr-only">Tin nhắn</label>
          <textarea
            id="contact-msg"
            required
            rows="5"
            placeholder="Type your message..."
            className="w-full flex-1 bg-slate-950/50 p-3.5 rounded text-emerald-400 border border-slate-800 focus:border-emerald-500 outline-none font-mono text-sm transition-all resize-none shadow-inner custom-scrollbar"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={cooldown > 0}
            maxLength={2000}
          />
          <button
            type="submit"
            disabled={cooldown > 0}
            aria-label={cooldown > 0 ? `Chờ ${minutesLeft} phút` : 'Gửi tin nhắn'}
            className="w-full py-3 mt-1 bg-emerald-500/10 text-emerald-400 rounded-md font-mono text-xs font-bold border border-emerald-500/30 hover:bg-emerald-500/20 transition-all uppercase tracking-widest disabled:opacity-50 flex justify-center gap-2 items-center"
          >
            {cooldown > 0
              ? <><Lock size={14} aria-hidden="true" /> SYSTEM LOCKED ({minutesLeft}m)</>
              : <><Send size={14} aria-hidden="true" /> Transmit Payload</>
            }
          </button>
          {contactStatus && (
            <p role="status" aria-live="polite" className="text-center font-mono text-[10px] uppercase text-emerald-500 animate-pulse mt-1">
              {contactStatus}
            </p>
          )}
        </form>
      </div>
    </div>
  );
});
ContactForm.displayName = 'ContactForm';

// --- LIST / EXPLORER ---
const List = memo(({ writeups, isLoading, fetchError, onView, currentView, setCurrentView, navigate }) => {
  const navigateToCategory = useCallback((view) => {
    const path = view === 'menu' ? '/' : `/${view}`;
    navigate(path, () => setCurrentView(view));
  }, [navigate, setCurrentView]);

  if (currentView === 'menu') {
    return (
      <section className="pt-4 pb-16 md:pt-8 md:pb-24 bg-slate-950 text-left relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 md:px-6 grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
          <div className="md:col-span-2 bg-slate-900/80 p-5 md:p-6 rounded-lg border border-emerald-800/50 shadow-[0_0_30px_rgba(16,185,129,0.1)] flex flex-col space-y-4">
            <h2 className="text-xs md:text-sm font-mono text-slate-500 tracking-[0.2em] mb-2 uppercase">Explore</h2>
            <div className="flex flex-col gap-4">
              {[
                { key: 'writeups', label: 'Writeups', desc: 'Click here to view my Write-Up.', cmd: '~public@user: cd ~/.WRITEUPS' },
                { key: 'research', label: 'Research', desc: 'Click here to view my research.', cmd: '~public@user: cd ~/.RESEARCH' },
              ].map(({ key, label, desc, cmd }) => (
                <div key={key} className="bg-slate-900/30 backdrop-blur-sm border border-slate-800 rounded-xl p-5 md:p-6 hover:border-emerald-500/30 transition-all group">
                  <h3 className="text-lg md:text-xl text-slate-200 font-mono mb-1 group-hover:text-emerald-400 transition-colors">{label}</h3>
                  <p className="text-[10px] md:text-xs text-slate-600 font-mono mb-3 uppercase">/{key.toUpperCase()}</p>
                  <p className="text-slate-400 font-mono text-sm mb-5">{desc}</p>
                  <button
                    onClick={() => navigateToCategory(key)}
                    className="px-4 py-3 rounded-full border border-emerald-900/50 bg-emerald-950/30 text-emerald-400 font-mono text-[12px] md:text-xs hover:bg-emerald-900/50 hover:border-emerald-500/50 transition-colors flex items-center gap-2 w-fit whitespace-nowrap"
                  >
                    {cmd}
                  </button>
                </div>
              ))}
            </div>
          </div>
          <ContactForm />
        </div>
      </section>
    );
  }

  return (
    <section className="pt-32 pb-16 md:pt-40 md:pb-24 bg-slate-950 min-h-screen text-left relative">
      <div className="max-w-5xl mx-auto px-4 md:px-6 relative z-10">
        <button
          onClick={() => navigateToCategory('menu')}
          aria-label="Quay lại Explore"
          className="mb-8 text-emerald-500/70 hover:text-emerald-400 flex items-center gap-2 font-mono text-sm transition-colors px-5 py-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full w-fit shadow-md hover:bg-emerald-500/20 whitespace-nowrap"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Return to Explore
        </button>

        {currentView === 'writeups' && (
          <>
            <h2 className="text-xl md:text-2xl font-bold font-mono text-white flex items-center gap-2 mb-6 md:mb-8">
              <Database className="text-emerald-400" aria-hidden="true" /> SELECT * FROM writeups;
            </h2>
            {isLoading ? (
              <div className="text-emerald-500 flex text-sm items-center font-mono">
                <Loader2 className="animate-spin mr-2" aria-hidden="true" /> Accessing Secure Database...
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4 border border-dashed border-rose-900/50 rounded-xl">
                <AlertTriangle className="text-rose-500" size={40} aria-hidden="true" />
                <p className="text-slate-400 font-mono text-sm text-center">{fetchError}</p>
              </div>
            ) : writeups.length === 0 ? (
              <p className="text-slate-500 font-mono text-sm">No records found.</p>
            ) : (
              <div className="grid gap-4 md:gap-6" role="list">
                {writeups.map((wu) => (
                  <article
                    key={wu._id || wu.id}
                    role="listitem"
                    className="bg-slate-950 border border-slate-800 p-4 md:p-6 rounded-lg flex flex-col md:flex-row justify-between shadow-xl hover:border-emerald-500/50 transition-colors group"
                  >
                    <div className="mb-4 md:mb-0">
                      <p className="text-xs md:text-sm font-mono text-emerald-500/60 mb-1">{wu.date} - {wu.type}</p>
                      <h3 className="text-base md:text-lg font-bold text-white group-hover:text-emerald-400 transition-colors">{wu.title}</h3>
                      <div className="flex gap-2 mt-2 flex-wrap" aria-label="Tags">
                        {wu.tags?.map(tag => (
                          <span key={tag} className="text-[10px] border border-slate-700 px-2 py-1 rounded bg-slate-900 text-slate-400 font-mono">#{tag}</span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => onView(wu)}
                      aria-label={`Đọc writeup: ${wu.title}`}
                      className="w-full md:w-auto px-4 py-2 bg-slate-900 text-emerald-400 border border-emerald-900 rounded font-mono text-sm hover:bg-emerald-900/30 flex items-center gap-2 justify-center shrink-0 h-fit"
                    >
                      Execute <Terminal size={14} aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </>
        )}

        {currentView === 'research' && (
          <div className="flex flex-col items-center justify-center py-24 border border-dashed border-slate-700 rounded-xl bg-slate-950/50 shadow-2xl">
            <Shield className="text-slate-700 mb-4 animate-pulse" size={64} aria-hidden="true" />
            <h2 className="text-xl font-bold font-mono text-slate-400 mb-2 uppercase tracking-tighter">Encrypted Module</h2>
            <p className="text-slate-500 font-mono text-sm text-center px-4 max-w-sm">
              Hệ thống đang mã hóa dữ liệu nghiên cứu. <br />Vui lòng quay lại sau!
            </p>
          </div>
        )}
      </div>
    </section>
  );
});
List.displayName = 'List';

// --- ADMIN PANEL ---
const AdminPanel = memo(({ onAdd, writeups, setWriteups, onBack }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(!!getAdminToken());
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [loginSuccessMsg, setLoginSuccessMsg] = useState('');
  const [newWu, setNewWu] = useState({ title: '', link: '', type: 'GITHUB', tagsStr: '' });
  const [status, setStatus] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsAuthenticating(true);
    setLoginError('');
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });
      const data = await res.json();
      if (data.success) {
        setAdminToken(data.token);
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
    } catch {
      setIsAuthenticating(false);
      setLoginError('[-] SERVER DISCONNECTED');
    }
  };

  const handleLogout = useCallback(() => {
    removeAdminToken();
    setIsLoggedIn(false);
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    const tagsArray = newWu.tagsStr.split(',').map(t => t.trim()).filter(Boolean);
    const payload = {
      ...newWu,
      tags: tagsArray.length ? tagsArray : ['General'],
      date: new Date().toLocaleDateString('vi-VN'),
    };
    try {
      const res = await fetch(`${API_BASE}/writeups`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to add');
      const data = await res.json();
      onAdd(data);
      setStatus('DB UPDATED SUCCESSFULLY');
      setNewWu({ title: '', link: '', type: 'GITHUB', tagsStr: '' });
      setTimeout(() => setStatus(''), 3000);
    } catch {
      setStatus('ERROR: Could not save to DB');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = useCallback(async (id, title) => {
    if (!window.confirm(`❗ Bạn có chắc muốn xóa "${title}"? Hành động này không thể hoàn tác!`)) return;
    try {
      const res = await fetch(`${API_BASE}/writeups/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      const data = await res.json();
      if (!res.ok || data.success === false) throw new Error(data.error || 'Không thể xóa!');
      setWriteups(prev => prev.filter(wu => (wu._id || wu.id) !== id));
      alert(`✅ ${data.message}`);
    } catch (err) {
      alert(`❌ THẤT BẠI: ${err.message}`);
    }
  }, [setWriteups]);

  if (!isLoggedIn) {
    return (
      <section className="pt-32 pb-16 min-h-screen bg-slate-950 flex flex-col items-center">
        <div className="max-w-md w-full mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <button
              onClick={onBack}
              aria-label="Quay lại trang chủ"
              className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-full text-slate-400 hover:text-emerald-400 flex items-center gap-2 text-sm font-mono transition-colors shadow-md w-fit whitespace-nowrap"
            >
              <ArrowLeft size={16} aria-hidden="true" /> Return to Home
            </button>
            <h2 className="text-xl md:text-2xl font-bold text-rose-500 flex items-center gap-2">
              <Key aria-hidden="true" /> Sudo Root
            </h2>
          </div>

          <form
            onSubmit={handleLogin}
            className={`bg-slate-900/80 backdrop-blur-sm p-6 md:p-8 rounded-2xl border ${loginError ? 'border-rose-500' : 'border-rose-900/50'} space-y-5 shadow-2xl transition-colors`}
            aria-label="Admin login form"
          >
            <label htmlFor="admin-user" className="sr-only">Username</label>
            <input
              id="admin-user"
              required
              disabled={!!(isAuthenticating || loginSuccessMsg)}
              type="text"
              placeholder="Username"
              autoComplete="username"
              className="w-full bg-slate-950 p-3.5 rounded-xl text-white outline-none focus:border-rose-500 border border-slate-800 disabled:opacity-50 text-sm md:text-base"
              value={loginData.username}
              onChange={(e) => setLoginData(prev => ({ ...prev, username: e.target.value }))}
            />
            <label htmlFor="admin-pass" className="sr-only">Password</label>
            <input
              id="admin-pass"
              required
              disabled={!!(isAuthenticating || loginSuccessMsg)}
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              className="w-full bg-slate-950 p-3.5 rounded-xl text-white outline-none focus:border-rose-500 border border-slate-800 disabled:opacity-50 text-sm md:text-base"
              value={loginData.password}
              onChange={(e) => setLoginData(prev => ({ ...prev, password: e.target.value }))}
            />
            <button
              type="submit"
              disabled={!!(isAuthenticating || loginSuccessMsg)}
              className="w-full p-3.5 bg-rose-500/20 text-rose-400 rounded-xl font-bold hover:bg-rose-500/30 transition-colors disabled:opacity-50 flex justify-center items-center gap-2 text-sm md:text-base tracking-widest uppercase"
            >
              {isAuthenticating ? <><Loader2 className="animate-spin" size={18} aria-hidden="true" /> AUTHENTICATING...</> : 'AUTHENTICATE'}
            </button>
            {loginError && (
              <div role="alert" className="bg-rose-950/50 border border-rose-500/50 p-3 rounded-xl flex items-center gap-2 text-rose-500 font-mono text-xs md:text-sm">
                <AlertTriangle size={16} className="shrink-0" aria-hidden="true" /> {loginError}
              </div>
            )}
            {loginSuccessMsg && (
              <div role="status" className="bg-emerald-950/50 border border-emerald-500/50 p-3 rounded-xl flex items-center gap-2 text-emerald-500 font-mono text-xs md:text-sm animate-pulse">
                <Unlock size={16} className="shrink-0" aria-hidden="true" /> {loginSuccessMsg}
              </div>
            )}
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="pt-32 pb-16 min-h-screen bg-slate-950 relative overflow-hidden">
      <div className="max-w-3xl mx-auto px-4 md:px-6 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 border-b border-emerald-900/50 pb-4 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-emerald-400 flex items-center gap-2">
              <Lock aria-hidden="true" /> SYSTEM OVERRIDE
            </h2>
            <div className="text-xs md:text-sm text-emerald-500/70 font-mono mt-1">
              <TypewriterText text="Welcome back, Administrator." speed={30} delay={500} />
            </div>
          </div>
          <button
            onClick={handleLogout}
            aria-label="Đăng xuất"
            className="w-full md:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded border border-rose-500/30 text-sm hover:bg-rose-500/20 transition-colors"
          >
            <LogOut size={16} aria-hidden="true" /> Disconnect
          </button>
        </div>

        <form onSubmit={handleAdd} className="bg-slate-900 p-5 md:p-6 rounded-lg border border-emerald-500/30 space-y-4 shadow-[0_0_15px_rgba(16,185,129,0.1)]" aria-label="Thêm writeup mới">
          <label htmlFor="wu-title" className="sr-only">Tiêu đề</label>
          <input
            id="wu-title"
            required
            type="text"
            placeholder="Entry Title..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 p-3 rounded text-white outline-none transition-colors text-sm md:text-base"
            value={newWu.title}
            onChange={(e) => setNewWu(prev => ({ ...prev, title: e.target.value }))}
          />
          <div className="flex flex-col md:flex-row gap-4">
            <label htmlFor="wu-link" className="sr-only">Link</label>
            <input
              id="wu-link"
              required
              type="url"
              placeholder="Target Link (https://)..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 p-3 rounded text-white outline-none transition-colors text-sm md:text-base"
              value={newWu.link}
              onChange={(e) => setNewWu(prev => ({ ...prev, link: e.target.value }))}
            />
            <label htmlFor="wu-type" className="sr-only">Loại</label>
            <select
              id="wu-type"
              className="w-full md:w-auto bg-slate-950 border border-slate-800 focus:border-emerald-500 p-3 rounded text-white outline-none text-sm md:text-base shrink-0"
              value={newWu.type}
              onChange={(e) => setNewWu(prev => ({ ...prev, type: e.target.value }))}
            >
              <option>Github / HackMD</option>
              <option>Markdown</option>
            </select>
          </div>
          <label htmlFor="wu-tags" className="sr-only">Tags</label>
          <input
            id="wu-tags"
            type="text"
            placeholder="Tags (cách nhau dấu phẩy)"
            className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 p-3 rounded text-white outline-none transition-colors text-sm md:text-base"
            value={newWu.tagsStr}
            onChange={(e) => setNewWu(prev => ({ ...prev, tagsStr: e.target.value }))}
          />
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full p-4 bg-emerald-500/10 text-emerald-400 border border-emerald-500/50 rounded font-bold hover:bg-emerald-500/20 transition-colors uppercase tracking-widest flex justify-center items-center gap-2 text-sm md:text-base disabled:opacity-50"
          >
            {isSubmitting ? <><Loader2 className="animate-spin" size={18} aria-hidden="true" /> Injecting...</> : <><Database size={18} aria-hidden="true" /> Inject Record</>}
          </button>
          {status && (
            <p role="status" className={`text-center font-mono text-sm md:text-base animate-pulse p-2 rounded ${status.startsWith('ERROR') ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-500 bg-emerald-500/10'}`}>
              {status}
            </p>
          )}
        </form>

        <div className="mt-12 space-y-4">
          <h3 className="text-lg font-mono text-slate-400 border-b border-slate-800 pb-2 flex items-center gap-2">
            <Database size={16} aria-hidden="true" /> Quản lý danh sách hiện có
          </h3>
          {writeups.length === 0 && <p className="text-slate-600 font-mono text-sm">Chưa có bài nào.</p>}
          {writeups.map((wu) => (
            <div key={wu._id || wu.id} className="flex justify-between items-center bg-slate-900/50 p-4 rounded border border-slate-800">
              <div>
                <p className="text-white font-medium">{wu.title}</p>
                <p className="text-xs text-slate-500 font-mono">{wu.date}</p>
              </div>
              <button
                onClick={() => handleDelete(wu._id || wu.id, wu.title)}
                aria-label={`Xóa writeup: ${wu.title}`}
                className="p-2 text-rose-500 hover:bg-rose-500/10 rounded transition-colors"
              >
                <AlertTriangle size={20} aria-hidden="true" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
});
AdminPanel.displayName = 'AdminPanel';

// --- APP ROOT ---
export default function App() {
  const [writeups, setWriteups] = useState([]);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selectedWriteup, setSelectedWriteup] = useState(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [explorerView, setExplorerView] = useState('menu');

  // Fetch với AbortController
  useEffect(() => {
    const controller = new AbortController();
    setIsLoadingDB(true);
    setFetchError('');

    fetch(`${API_BASE}/writeups`, {
      cache: 'no-store',
      signal: controller.signal,
    })
      .then(res => {
        if (!res.ok) throw new Error(`Server error: ${res.status}`);
        return res.json();
      })
      .then(data => {
        setWriteups(data);
        setIsLoadingDB(false);
      })
      .catch(err => {
        if (err.name === 'AbortError') return;
        setFetchError('Không thể kết nối database. Vui lòng thử lại sau.');
        setIsLoadingDB(false);
      });

    return () => controller.abort();
  }, []);

  const navigate = useCallback((path, action) => {
    if (window.location.pathname !== path) {
      window.history.pushState({ path }, '', path);
    }
    action();
  }, []);

  // Xử lý back button
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        setShowAdmin(true);
        setSelectedWriteup(null);
      } else if (['/writeups', '/research', '/contact'].includes(path)) {
        setShowAdmin(false);
        setSelectedWriteup(null);
        setExplorerView(path.slice(1));
      } else if (path === '/reading') {
        if (!selectedWriteup) {
          window.history.replaceState(null, '', '/writeups');
          setExplorerView('writeups');
        }
      } else {
        setShowAdmin(false);
        setSelectedWriteup(null);
        setExplorerView('menu');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [selectedWriteup]);

  const handleAddNewWriteup = useCallback((newWriteup) => {
    setWriteups(prev => [newWriteup, ...prev]);
  }, []);

  const handleViewWriteup = useCallback((wu) => {
    navigate('/reading', () => setSelectedWriteup(wu));
  }, [navigate]);

  const handleBack = useCallback(() => {
    navigate('/writeups', () => {
      setSelectedWriteup(null);
      setExplorerView('writeups');
    });
  }, [navigate]);

  const handleAdminToggle = useCallback(() => {
    navigate(showAdmin ? '/' : '/admin', () => {
      setSelectedWriteup(null);
      setShowAdmin(prev => !prev);
    });
  }, [navigate, showAdmin]);

  const handleAdminBack = useCallback(() => {
    navigate('/', () => setShowAdmin(false));
  }, [navigate]);

  return (
    <div className="bg-slate-950 min-h-screen font-sans selection:bg-emerald-500/30 text-slate-300 overflow-x-hidden">
      <CustomCursor />

      <nav className="fixed w-full z-50 bg-slate-950/90 backdrop-blur-md py-4 border-b border-emerald-900/50 shadow-lg shadow-emerald-900/20" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex justify-between items-center">
          <button
            onClick={() => navigate('/', () => {
              setSelectedWriteup(null);
              setShowAdmin(false);
              setExplorerView('menu');
            })}
            aria-label="Trang chủ"
            className="text-xl md:text-2xl font-bold font-mono flex items-center gap-2 text-white hover:text-emerald-400 transition-colors"
          >
            <Terminal className="text-emerald-400" aria-hidden="true" /> Krinoa<span className="text-emerald-400 animate-pulse" aria-hidden="true">_</span>
          </button>

          <button
            onClick={handleAdminToggle}
            aria-label={showAdmin ? 'Đóng admin panel' : 'Mở admin panel'}
            aria-pressed={showAdmin}
            className={`flex items-center gap-2 font-mono text-sm transition-colors ${showAdmin ? 'text-emerald-400' : 'text-slate-500 hover:text-emerald-400'}`}
          >
            <Unlock size={20} aria-hidden="true" />
            <span className="hidden md:inline">{showAdmin ? 'Close Admin' : 'Sudo Root'}</span>
          </button>
        </div>
      </nav>

      <main>
        {selectedWriteup ? (
          <WriteupReader wu={selectedWriteup} onBack={handleBack} />
        ) : showAdmin ? (
          <AdminPanel
            onAdd={handleAddNewWriteup}
            writeups={writeups}
            setWriteups={setWriteups}
            onBack={handleAdminBack}
          />
        ) : (
          <>
            {explorerView === 'menu' && <Hero />}
            <List
              writeups={writeups}
              isLoading={isLoadingDB}
              fetchError={fetchError}
              currentView={explorerView}
              setCurrentView={setExplorerView}
              onView={handleViewWriteup}
              navigate={navigate}
            />
          </>
        )}
      </main>
    </div>
  );
}