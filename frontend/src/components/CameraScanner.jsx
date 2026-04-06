import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
    MultiFormatReader,
    BinaryBitmap,
    HybridBinarizer,
    HTMLCanvasElementLuminanceSource,
    DecodeHintType,
    BarcodeFormat,
    NotFoundException,
} from '@zxing/library';
import { X, CameraOff, FlipHorizontal, CheckCircle, AlertCircle, Loader2, Barcode, Bug, RefreshCw, Sparkles, Brain } from 'lucide-react';
import toast from 'react-hot-toast';
import { visionAPI } from '../services/api';

/**
 * CameraScanner — hybrid Barcode + AI Product Scanner
 * 
 * 1. Barcode Mode: Uses ZXing to detect standard barcodes (EAN, UPC, etc)
 * 2. AI Vision Mode: Uses Gemini Vision to identify product image and match with inventory
 */

const hints = new Map();
hints.set(DecodeHintType.TRY_HARDER, true);
hints.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A, BarcodeFormat.UPC_E,
    BarcodeFormat.CODE_128, BarcodeFormat.CODE_39,
    BarcodeFormat.CODE_93, BarcodeFormat.ITF,
    BarcodeFormat.CODABAR, BarcodeFormat.QR_CODE,
    BarcodeFormat.DATA_MATRIX, BarcodeFormat.AZTEC,
    BarcodeFormat.PDF_417,
]);
const zxingReader = new MultiFormatReader();
zxingReader.setHints(hints);

const playBeep = (ok = true) => {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = ok ? 880 : 330;
        g.gain.setValueAtTime(0.3, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
    } catch (_) { }
};

const CameraScanner = ({ inventory, onItemScanned, onClose }) => {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const timerRef = useRef(null);
    const lockRef = useRef(false);

    const [cameras, setCameras] = useState([]);
    const [camId, setCamId] = useState(undefined);
    const [isLive, setIsLive] = useState(false);
    const [starting, setStarting] = useState(false);
    const [denied, setDenied] = useState(false);
    const [lastScan, setLastScan] = useState(null);
    const [rawDebug, setRawDebug] = useState(null);
    const [debug, setDebug] = useState(false);
    const [frames, setFrames] = useState(0);

    // AI Vision State
    const [isIdentifying, setIsIdentifying] = useState(false);
    const [aiResult, setAiResult] = useState(null);

    const findByBarcode = useCallback((raw) => {
        const code = String(raw).trim().toLowerCase();
        return inventory.find(item =>
            item.barcode && String(item.barcode).trim().toLowerCase() === code
        );
    }, [inventory]);

    const handleDecode = useCallback((text) => {
        const raw = String(text).trim();
        setRawDebug(raw);
        if (lockRef.current) return;
        lockRef.current = true;

        const hit = findByBarcode(raw);
        if (hit) {
            playBeep(true);
            setLastScan({ barcode: raw, item: hit, status: 'found' });
            onItemScanned(hit);
            toast.success(`✅ Added: ${hit.item_name}`, { duration: 2000, position: 'top-center' });
        } else {
            playBeep(false);
            setLastScan({ barcode: raw, item: null, status: 'not_found' });
        }
        setTimeout(() => { lockRef.current = false; }, 2500);
    }, [findByBarcode, onItemScanned]);

    const scanFrame = useCallback(() => {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas || isIdentifying) return;
        if (video.readyState < 2 || video.videoWidth === 0) return;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0);

        setFrames(f => f + 1);

        try {
            const luminance = new HTMLCanvasElementLuminanceSource(canvas);
            const bitmap = new BinaryBitmap(new HybridBinarizer(luminance));
            const result = zxingReader.decodeWithState(bitmap);
            if (result) handleDecode(result.getText());
        } catch (e) {
            if (!(e instanceof NotFoundException)) console.warn('ZXing error:', e);
        } finally {
            zxingReader.reset();
        }
    }, [handleDecode, isIdentifying]);

    const stopAll = useCallback(() => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
        if (videoRef.current) { videoRef.current.srcObject = null; }
        setIsLive(false);
    }, []);

    const startScanner = useCallback(async (deviceId) => {
        stopAll();
        setStarting(true);
        setRawDebug(null);
        setFrames(0);

        try {
            const constraints = {
                video: {
                    ...(deviceId ? { deviceId: { exact: deviceId } } : { facingMode: 'environment' }),
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                }
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            streamRef.current = stream;
            const video = videoRef.current;
            video.srcObject = stream;
            video.setAttribute('playsinline', true);
            await new Promise((resolve, reject) => {
                video.onloadedmetadata = () => { video.play().then(resolve).catch(reject); };
                video.onerror = reject;
                setTimeout(reject, 8000);
            });
            setIsLive(true);
            timerRef.current = setInterval(scanFrame, 300);
        } catch (err) {
            console.error('Camera error:', err);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') setDenied(true);
            else toast.error('Camera error: ' + (err.message || String(err)));
        } finally {
            setStarting(false);
        }
    }, [stopAll, scanFrame]);

    const handleAIVision = async () => {
        if (!isLive || isIdentifying) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) return;

        try {
            setIsIdentifying(true);
            setAiResult(null);

            // Capture high-quality frame
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0);
            const imageBase64 = canvas.toDataURL('image/jpeg', 0.8);

            // Get inventory names for context
            const inventoryNames = inventory.map(item => item.item_name);

            toast.loading('AI is identifying product...', { id: 'ai-vision' });

            const response = await visionAPI.identifyProduct({
                imageBase64,
                inventoryNames
            });

            if (response.success) {
                const { productName, matchedInventoryItem, confidence } = response;
                setAiResult({ productName, matchedInventoryItem, confidence });

                if (matchedInventoryItem) {
                    const hit = inventory.find(i => i.item_name === matchedInventoryItem);
                    if (hit) {
                        playBeep(true);
                        onItemScanned(hit);
                        toast.success(`AI Matched: ${hit.item_name} (${confidence} confidence)`, { id: 'ai-vision' });
                    }
                } else {
                    playBeep(false);
                    toast.error(`AI identified "${productName}" but it's not in your inventory.`, { id: 'ai-vision' });
                }
            } else {
                toast.error(response.message || 'AI Identification failed', { id: 'ai-vision' });
            }
        } catch (err) {
            console.error('AI Vision error:', err);
            toast.error('AI Recognition service unavailable', { id: 'ai-vision' });
        } finally {
            setIsIdentifying(false);
        }
    };

    useEffect(() => {
        let sc = false;
        (async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true });
                const devs = await navigator.mediaDevices.enumerateDevices();
                const cams = devs.filter(d => d.kind === 'videoinput');
                if (sc) return;
                setCameras(cams);
                const back = cams.find(d => /back|rear|environment/i.test(d.label));
                setCamId(back?.deviceId ?? cams[0]?.deviceId ?? null);
            } catch (err) {
                if (sc) return;
                if (err.name === 'NotAllowedError') setDenied(true);
                else setCamId(null);
            }
        })();
        return () => { sc = true; };
    }, []);

    useEffect(() => {
        if (camId === undefined || denied) return;
        startScanner(camId);
        return () => stopAll();
    }, [camId, denied]);

    const barcodeCount = inventory.filter(i => i.barcode?.trim()).length;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-white dark:bg-neutral-900 rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/10">

                {/* Header */}
                <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-2xl bg-white/20 backdrop-blur-md shadow-inner">
                            <Sparkles className="h-5 w-5 text-white animate-pulse" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">AI Vision Scanner</h2>
                            <p className="text-[11px] text-white/70 font-semibold uppercase tracking-wider">
                                {isIdentifying ? 'AI is thinking...' : 'Live Object & Barcode Detection'}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setDebug(v => !v)}
                            className={`p-2 rounded-xl text-white/70 hover:text-white transition-all ${debug ? 'bg-white/30' : 'bg-white/10'}`}
                            title="Debug System">
                            <Bug className="h-5 w-5" />
                        </button>
                        <button onClick={() => { stopAll(); onClose(); }}
                            className="p-2.5 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition-all shadow-lg active:scale-95">
                            <X className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Camera Viewport */}
                <div className="relative bg-black group" style={{ aspectRatio: '16/10' }}>
                    <video ref={videoRef} className="w-full h-full object-cover" muted playsInline autoPlay />
                    <canvas ref={canvasRef} className="hidden" />

                    {/* Scan Line Overlays */}
                    {isLive && !isIdentifying && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <div className="relative w-80 h-56 transition-all duration-500 scale-100 group-hover:scale-105">
                                <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-violet-400 rounded-tl-2xl shadow-[0_0_15px_rgba(167,139,250,0.5)]" />
                                <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-violet-400 rounded-tr-2xl shadow-[0_0_15px_rgba(167,139,250,0.5)]" />
                                <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-violet-400 rounded-bl-2xl shadow-[0_0_15px_rgba(167,139,250,0.5)]" />
                                <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-violet-400 rounded-br-2xl shadow-[0_0_15px_rgba(167,139,250,0.5)]" />
                                <div className="absolute left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-violet-300 to-transparent shadow-[0_0_20px_6px_rgba(139,92,246,0.8)]"
                                    style={{ animation: 'scanln 2.5s ease-in-out infinite', top: '5%' }} />
                            </div>
                        </div>
                    )}

                    {/* Identification pulse */}
                    {isIdentifying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-violet-600/20 backdrop-blur-[2px]">
                            <div className="flex flex-col items-center gap-4">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-25" />
                                    <div className="bg-white p-6 rounded-full shadow-2xl relative">
                                        <Brain className="h-10 w-10 text-violet-600 animate-bounce" />
                                    </div>
                                </div>
                                <p className="text-white font-black text-lg tracking-widest animate-pulse">ANALYZING PRODUCT...</p>
                            </div>
                        </div>
                    )}

                    {/* Camera Offline states */}
                    {denied && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 text-white p-8 text-center gap-4">
                            <div className="bg-red-500/20 p-5 rounded-full border border-red-500/30">
                                <CameraOff className="h-16 w-16 text-red-500" />
                            </div>
                            <div>
                                <p className="font-black text-2xl mb-2">Camera Blocked</p>
                                <p className="text-sm text-neutral-400 max-w-xs mx-auto">
                                    Please enable camera permissions in your browser settings to use the smart scanner.
                                </p>
                            </div>
                        </div>
                    )}

                    {starting && !denied && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950 text-white gap-4">
                            <RefreshCw className="h-12 w-12 animate-spin text-violet-500" />
                            <p className="font-bold tracking-widest text-violet-400">INITIALIZING AI SCANNER</p>
                        </div>
                    )}

                    {/* AI Button Overlay */}
                    {isLive && !isIdentifying && (
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                            <button
                                onClick={handleAIVision}
                                className="bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/30 text-white px-8 py-3 rounded-full font-black text-sm flex items-center gap-3 transition-all active:scale-90 hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] shadow-2xl"
                            >
                                <Sparkles className="h-5 w-5 text-yellow-300" />
                                IDENTIFY BY AI
                            </button>
                        </div>
                    )}
                </div>

                {/* AI & Debug Results */}
                <div className="bg-neutral-50 dark:bg-neutral-800/50">
                    {debug && (
                        <div className="px-6 py-3 border-b border-white/5 bg-black space-y-1 text-white/80">
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-mono uppercase tracking-widest text-violet-400">System Debug Log</p>
                                <p className="text-[10px] font-mono text-neutral-500">Live Frames: {frames}</p>
                            </div>
                            <p className="text-[13px] font-mono leading-tight">
                                <span className="text-emerald-400">▶ DETECTOR:</span> {rawDebug || 'WAITING_FOR_BARCODE...'}
                            </p>
                        </div>
                    )}

                    {/* Identification Status Bar */}
                    <div className="px-6 py-5 min-h-[100px] flex items-center">
                        {aiResult ? (
                            <div className="flex items-center gap-4 w-full bg-indigo-500/10 p-4 rounded-2xl border border-indigo-500/20">
                                <div className={`p-3 rounded-xl ${aiResult.matchedInventoryItem ? 'bg-emerald-500' : 'bg-amber-500'} shadow-lg`}>
                                    {aiResult.matchedInventoryItem ? <CheckCircle className="h-6 w-6 text-white" /> : <AlertCircle className="h-6 w-6 text-white" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-[10px] text-indigo-400 font-black uppercase tracking-tighter">AI Result ({aiResult.confidence} confidence)</p>
                                            <p className="text-lg font-black text-neutral-900 dark:text-white leading-tight">
                                                {aiResult.productName}
                                            </p>
                                        </div>
                                    </div>
                                    {aiResult.matchedInventoryItem ? (
                                        <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                                            <Sparkles className="h-3 w-3" /> MATCHED WITH: {aiResult.matchedInventoryItem}
                                        </p>
                                    ) : (
                                        <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 mt-1">
                                            NOT FOUND IN INVENTORY. PLEASE ADD IT FIRST.
                                        </p>
                                    )}
                                </div>
                            </div>
                        ) : lastScan ? (
                            <div className="flex items-center gap-4 w-full bg-emerald-500/5 p-4 rounded-2xl border border-emerald-500/10">
                                <div className={`p-3 rounded-xl ${lastScan.status === 'found' ? 'bg-emerald-600' : 'bg-neutral-600'} shadow-lg`}>
                                    <Barcode className="h-6 w-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-tighter">Barcode Scan</p>
                                    <p className="text-lg font-black text-neutral-900 dark:text-white leading-tight">
                                        {lastScan.status === 'found' ? lastScan.item.item_name : 'New Barcode Detected'}
                                    </p>
                                    <p className="text-xs font-mono text-neutral-500 mt-1">{lastScan.barcode}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center w-full space-y-2">
                                <p className="text-lg font-black text-neutral-400 tracking-tight">AI VISION IS ACTIVE</p>
                                <p className="text-xs text-neutral-500 font-medium px-8 leading-relaxed">
                                    Show the product packaging to the camera and click the <span className="text-violet-600 font-black">IDENTIFY BY AI</span> button.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Manual & Settings Footer */}
                <div className="p-6 bg-white dark:bg-neutral-900 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* manual input */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block ml-1">Manual Input</label>
                            <div className="flex gap-2">
                                <input
                                    id="manual-barcode-input"
                                    type="text"
                                    placeholder="Enter barcode..."
                                    className="flex-1 font-mono text-sm bg-neutral-100 dark:bg-neutral-800 border-none rounded-xl px-4 py-3 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 transition-all shadow-inner"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            const v = e.target.value.trim();
                                            if (v) { handleDecode(v); e.target.value = ''; }
                                        }
                                    }}
                                />
                            </div>
                        </div>

                        {/* cam switcher */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-neutral-400 uppercase tracking-widest block ml-1">Camera Source</label>
                            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1 shadow-inner">
                                <FlipHorizontal className="h-4 w-4 text-neutral-400 ml-3" />
                                <select
                                    value={camId || ''}
                                    onChange={e => setCamId(e.target.value)}
                                    className="flex-1 text-xs bg-transparent border-none rounded-xl px-3 py-2 font-black text-neutral-700 dark:text-neutral-300 focus:ring-0 cursor-pointer"
                                >
                                    {cameras.map(c => <option key={c.deviceId} value={c.deviceId}>{c.label || `Camera ${c.deviceId.slice(0, 4)}`}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 p-4 rounded-2xl bg-neutral-900 text-white flex items-center justify-between shadow-2xl">
                        <div>
                            <p className="text-[10px] font-black text-violet-400 uppercase tracking-widest mb-1">PRO TIP</p>
                            <p className="text-xs font-semibold leading-snug max-w-[200px]">Hold the product steady for AI Vision to identify it perfectly.</p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-violet-600 flex items-center justify-center">
                            <Brain className="h-6 w-6 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes scanln {
                    0%   { top: 5%; opacity: 0.2; }
                    50%  { top: 90%; opacity: 1; }
                    100% { top: 5%; opacity: 0.2; }
                }
            `}</style>
        </div>
    );
};

export default CameraScanner;
