import React, { useState, useRef, useEffect } from 'react';
import { Bot, X, Send, Image as ImageIcon, Loader2, Trash2, ShoppingCart, History, Plus } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

interface Message {
    role: 'user' | 'ai';
    content: string;
    image?: string;
    data?: any;
    timestamp: number;
}

export default function Chatbot() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [position, setPosition] = useState({ x: window.innerWidth - 70, y: window.innerHeight - 80 });
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const [sessionId, setSessionId] = useState<number | null>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [isHistoryMode, setIsHistoryMode] = useState(false);
    const [showCommands, setShowCommands] = useState(false);
    const navigate = useNavigate();

    const commands = [
        { icon: <Send className="h-3 w-3" />, label: 'Create Sales Invoice', cmd: '/sales' },
        { icon: <ShoppingCart className="h-3 w-3" />, label: 'Create Purchase Invoice', cmd: '/purchase' },
        { icon: <Trash2 className="h-3 w-3" />, label: 'Clear Chat sessions', cmd: '/clear' },
    ];

    // Responsive bounds handling
    useEffect(() => {
        const handleResize = () => {
            setPosition(prev => ({
                x: Math.min(prev.x, window.innerWidth - 70),
                y: Math.min(prev.y, window.innerHeight - 80)
            }));
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0 && !sessionId) {
            setMessages([{
                role: 'ai',
                content: 'Hello! I am your AI Inventory Assistant. How can I help you? Use / for commands.',
                timestamp: Date.now()
            }]);
        }
    }, [sessionId]);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages, isOpen, isHistoryMode]);

    const fetchSessions = async () => {
        try {
            const resp = await api.get('/chatbot/sessions');
            setSessions(resp.data);
            setIsHistoryMode(true);
        } catch (e) {
            toast.error("Failed to load history");
        }
    };

    const startNewChat = () => {
        setSessionId(null);
        setMessages([{
            role: 'ai',
            content: 'Hello! I am your AI Inventory Assistant. How can I help you? Use / for commands.',
            timestamp: Date.now()
        }]);
        setIsHistoryMode(false);
    };

    const loadSession = async (id: number) => {
        try {
            const resp = await api.get(`/chatbot/sessions/${id}`);
            const history = resp.data.map((m: any) => {
                let parsedData = null;
                try {
                    const rawText = m.role === 'ai' ? m.content : "";
                    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/{[\s\S]*}/);
                    if (jsonMatch) parsedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                } catch (e) { }

                return {
                    role: m.role,
                    content: parsedData?.summary || m.content,
                    image: m.image ? `data:image/jpeg;base64,${m.image}` : undefined,
                    data: parsedData,
                    timestamp: new Date(m.timestamp).getTime()
                };
            });
            setMessages(history);
            setSessionId(id);
            setIsHistoryMode(false);
        } catch (e) {
            toast.error("Failed to load session");
        }
    };

    const deleteSession = async (id: number) => {
        try {
            await api.delete(`/chatbot/sessions/${id}`);
            setSessions(prev => prev.filter(s => s.id !== id));
            if (sessionId === id) startNewChat();
            toast.success("Session deleted");
        } catch (e) {
            toast.error("Delete failed");
        }
    }

    const handleCommandClick = (cmd: string) => {
        if (cmd === '/sales') navigate('/invoices/new?type=sales');
        else if (cmd === '/purchase') navigate('/invoices/new?type=purchase');
        else if (cmd === '/clear') {
            startNewChat();
            toast.success("New chat started");
        }
        setInput('');
        setShowCommands(false);
        if (cmd !== '/clear') setIsOpen(false);
    };

    const handleInput = (val: string) => {
        setInput(val);
        setShowCommands(val === '/');
    };

    const handleSend = async () => {
        const trimmedInput = input.trim();
        if (!trimmedInput && !selectedImage) return;

        if (trimmedInput.startsWith('/')) {
            handleCommandClick(trimmedInput.toLowerCase());
            return;
        }

        const userMessage = input;
        const userImage = selectedImage;
        const mimeType = userImage ? userImage.match(/data:(.*?);/)?.[1] || 'image/jpeg' : '';

        setMessages(prev => [...prev, {
            role: 'user',
            content: userMessage || 'Sent an image',
            image: userImage || undefined,
            timestamp: Date.now()
        }]);

        setInput('');
        setSelectedImage(null);
        setIsLoading(true);

        try {
            const response = await api.post('/chatbot', {
                session_id: sessionId,
                message: userMessage,
                image: userImage ? userImage.split(',')[1] : '',
                mime_type: mimeType
            });

            const sId = response.data.session_id;
            setSessionId(sId);

            const rawText = response.data.gemini?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

            let extractedData = null;
            try {
                extractedData = JSON.parse(rawText);
            } catch (e) {
                try {
                    const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/{[\s\S]*}/);
                    if (jsonMatch) extractedData = JSON.parse(jsonMatch[1] || jsonMatch[0]);
                } catch (e2) { }
            }

            const aiContent = extractedData?.summary || (typeof rawText === 'string' && !rawText.startsWith('{') ? rawText : "Data processed successfully.");

            setMessages(prev => [...prev, {
                role: 'ai',
                content: aiContent,
                data: extractedData,
                timestamp: Date.now()
            }]);
        } catch (error: any) {
            setMessages(prev => [...prev, {
                role: 'ai',
                content: `Error: ${error.message || 'Failed to connect'}`,
                timestamp: Date.now()
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const hasMovedRef = useRef(false);

    const handleDragStart = (e: React.MouseEvent) => {
        hasMovedRef.current = false;
        const startX = e.clientX - position.x;
        const startY = e.clientY - position.y;
        const initialX = e.clientX;
        const initialY = e.clientY;

        const onMouseMove = (moveEvent: MouseEvent) => {
            const dist = Math.sqrt(
                Math.pow(moveEvent.clientX - initialX, 2) +
                Math.pow(moveEvent.clientY - initialY, 2)
            );

            if (dist > 5) {
                hasMovedRef.current = true;
                setIsDragging(true);
            }

            setPosition({
                x: Math.max(10, Math.min(window.innerWidth - 60, moveEvent.clientX - startX)),
                y: Math.max(10, Math.min(window.innerHeight - 60, moveEvent.clientY - startY))
            });
        };

        const onMouseUp = () => {
            // Delay resetting isDragging slightly so the onClick handler can catch it
            setTimeout(() => setIsDragging(false), 50);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    };

    return (
        <>
            {/* Draggable Bubble */}
            {!isOpen && (
                <div
                    className="fixed z-[9999] pointer-events-none"
                    style={{ left: position.x, top: position.y }}
                >
                    <div
                        onMouseDown={handleDragStart}
                        onClick={() => !isDragging && setIsOpen(true)}
                        className="pointer-events-auto h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-blue-600 hover:bg-blue-700 shadow-2xl flex items-center justify-center text-white cursor-move transition-all hover:scale-110 active:scale-95 group relative"
                    >
                        <Bot className="h-6 w-6 sm:h-7 sm:w-7" />
                        <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-black/80 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden sm:block">
                            Move me
                        </div>
                    </div>
                </div>
            )}

            {/* Chat Window - Positioned safely */}
            {isOpen && (
                <div className="fixed inset-0 sm:inset-auto sm:bottom-6 sm:right-6 z-[10000] flex items-center justify-center sm:block">
                    <Card className={`
                        flex flex-col shadow-2xl overflow-hidden border-blue-100
                        w-full h-full sm:w-[380px] md:w-[450px] sm:h-[600px]
                        rounded-none sm:rounded-2xl transition-all duration-300 animate-in slide-in-from-bottom-5
                    `}>
                        <CardHeader className="bg-blue-600 text-white p-3 flex flex-row items-center justify-between space-y-0 shrink-0">
                            <CardTitle className="text-sm font-bold flex items-center gap-2">
                                <Bot className="h-4 w-4" /> AI Inventory
                            </CardTitle>
                            <div className="flex gap-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => isHistoryMode ? setIsHistoryMode(false) : fetchSessions()}
                                    className="h-7 w-7 text-white hover:bg-white/20"
                                    title="History"
                                >
                                    <History className="h-4 w-4" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={startNewChat}
                                    className="h-7 w-7 text-white hover:bg-white/20"
                                    title="New Chat"
                                >
                                    <Plus className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-7 w-7 text-white hover:bg-white/20">
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-0 flex flex-col bg-slate-50 overflow-hidden relative">
                            {isHistoryMode ? (
                                <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <h3 className="font-bold text-slate-800 text-sm">Chat History</h3>
                                        <Button variant="outline" size="sm" onClick={startNewChat} className="h-7 text-[10px] gap-1">
                                            <Plus className="h-3 w-3" /> New Chat
                                        </Button>
                                    </div>
                                    {sessions.length === 0 ? (
                                        <div className="text-center py-10 text-slate-400 text-xs">No history found</div>
                                    ) : (
                                        sessions.map((s) => (
                                            <div
                                                key={s.id}
                                                className={`group relative p-3 rounded-xl border transition-all cursor-pointer ${sessionId === s.id ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100 hover:border-blue-100'
                                                    }`}
                                                onClick={() => loadSession(s.id)}
                                            >
                                                <div className="text-sm font-medium text-slate-700 truncate pr-6">{s.title || "Untitled Chat"}</div>
                                                <div className="text-[10px] text-slate-400 mt-1">{new Date(s.updated_at).toLocaleDateString()} {new Date(s.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); deleteSession(s.id); }}
                                                    className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            ) : (
                                <>
                                    <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                                        {messages.map((m, i) => (
                                            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                                <div className={`max-w-[85%] rounded-2xl p-3 shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                                                    }`}>
                                                    {m.image && <img src={m.image} alt="Upload" className="max-w-full rounded-lg mb-2 border border-white/20" />}
                                                    <div className="text-sm whitespace-pre-wrap">{m.content}</div>
                                                    {m.data && (
                                                        <div className="mt-3 pt-3 border-t border-gray-100">
                                                            <div className="bg-slate-50 rounded overflow-hidden mb-2 border border-blue-50">
                                                                <table className="w-full text-[10px]">
                                                                    <thead><tr className="bg-blue-50/50"><th className="p-1 px-2 text-left">Item</th><th className="p-1 text-right">Price</th></tr></thead>
                                                                    <tbody>
                                                                        {m.data.items?.map((item: any, idx: number) => (
                                                                            <tr key={idx} className="border-t border-slate-100">
                                                                                <td className="p-1 px-2 truncate">{item.system_name || item.name}</td>
                                                                                <td className="p-1 text-right font-mono">{item.unit_price}</td>
                                                                            </tr>
                                                                        ))}
                                                                    </tbody>
                                                                </table>
                                                            </div>
                                                            <Button size="sm" className="w-full h-8 text-[11px] bg-blue-600 hover:bg-blue-700" onClick={() => window.dispatchEvent(new CustomEvent('fill-invoice', { detail: m.data }))}>
                                                                Confirm & Insert Items
                                                            </Button>
                                                        </div>
                                                    )}
                                                    <div className="text-[9px] mt-1 opacity-50 text-right">{new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                                </div>
                                            </div>
                                        ))}
                                        {isLoading && <div className="flex justify-center p-2"><Loader2 className="h-6 w-6 animate-spin text-blue-600" /></div>}
                                    </div>
                                    <div className="p-3 bg-white border-t space-y-2 shrink-0 relative">
                                        {showCommands && (
                                            <div className="absolute bottom-full left-0 w-full p-2 animate-in slide-in-from-bottom-2">
                                                <div className="bg-white rounded-xl shadow-xl border border-blue-50 overflow-hidden">
                                                    {commands.map((c, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => handleCommandClick(c.cmd)}
                                                            className="w-full flex items-center gap-3 p-3 text-left hover:bg-blue-50 transition-colors group"
                                                        >
                                                            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                                {c.icon}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium text-slate-700">{c.label}</div>
                                                                <div className="text-[10px] text-slate-400 font-mono">{c.cmd}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {selectedImage && (
                                            <div className="relative inline-block">
                                                <img src={selectedImage} alt="Preview" className="h-12 w-12 object-cover rounded border-2 border-primary" />
                                                <button onClick={() => setSelectedImage(null)} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 shadow-md"><X className="h-3 w-3" /></button>
                                            </div>
                                        )}
                                        <div className="flex gap-2 items-end">
                                            <Button variant="outline" size="icon" onClick={() => fileInputRef.current?.click()} className="h-10 w-10 shrink-0 rounded-xl border-slate-200"><ImageIcon className="h-5 w-5 text-slate-500" /></Button>
                                            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) {
                                                    const reader = new FileReader();
                                                    reader.onloadend = () => setSelectedImage(reader.result as string);
                                                    reader.readAsDataURL(file);
                                                }
                                            }} />
                                            <div className="relative flex-1">
                                                <Input
                                                    placeholder="Type / for commands..."
                                                    value={input}
                                                    onChange={(e) => handleInput(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                                                    className="h-10 pr-10 rounded-xl bg-slate-50 border-none focus-visible:ring-1 focus-visible:ring-blue-400"
                                                />
                                                <Button
                                                    onClick={handleSend}
                                                    size="icon"
                                                    disabled={isLoading}
                                                    className="absolute right-1 top-1 h-8 w-8 bg-blue-600 hover:bg-blue-700 rounded-lg shrink-0 transition-transform active:scale-95"
                                                >
                                                    <Send className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </>
    );
}
