"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Monitor, FolderOpen, Terminal as TermIcon, Globe, MessageSquare, 
  Settings, X, Minus, Square, Maximize2, Minimize2, ChevronLeft, 
  ChevronRight, RotateCw, Folder, File, FileText, Plus, Trash2, 
  Edit3, Save, Search, LogOut, Cpu, ArrowUp, ArrowDown, Play, 
  CornerDownLeft, Volume2, Wifi, Sparkles, RefreshCw, MoreVertical, LayoutGrid,
  Eye, EyeOff, ShieldAlert
} from "lucide-react";
import { useChatStore, useProviderStore, type Conversation } from "@/lib/store";
import { cn } from "@/lib/utils";
import { hostFetch } from "@/lib/host-client";

interface WindowState {
  id: string;
  title: string;
  icon: React.ComponentType<any>;
  isOpen: boolean;
  isMinimized: boolean;
  isMaximized: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
  appType: "browser" | "explorer" | "terminal" | "chat" | "editor" | "control";
  meta?: Record<string, any>;
}

interface DesktopEnvProps {
  onClose: () => void;
  handleSend: (text: string) => Promise<void>;
  handleStop: () => void;
  isStreaming: boolean;
  activeConv: Conversation | null;
}

export function DesktopEnv({ onClose, handleSend, handleStop, isStreaming, activeConv }: DesktopEnvProps) {
  const [windows, setWindows] = useState<WindowState[]>([]);
  const [activeWindowId, setActiveWindowId] = useState<string | null>(null);
  const [nextZIndex, setNextZIndex] = useState(10);
  const [startMenuOpen, setStartMenuOpen] = useState(false);
  const [time, setTime] = useState("");
  
  // Custom Wallpapers
  const [wallpaper, setWallpaper] = useState("feltrix-grid");
  // Custom Accent Colors
  const [accent, setAccent] = useState<"orange" | "indigo" | "emerald" | "sky">("orange");
  
  // Tray clock Quick Settings
  const [trayMenuOpen, setTrayMenuOpen] = useState(false);
  const [muteStatus, setMuteStatus] = useState(false);
  const [wifiStatus, setWifiStatus] = useState(true);

  // Desktop right-click context menu
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; isOpen: boolean } | null>(null);
  const [windowsBackup, setWindowsBackup] = useState<WindowState[] | null>(null);

  // Spotlight mouse gradient
  const [spotlight, setSpotlight] = useState({ x: 0, y: 0 });
  const desktopRef = useRef<HTMLDivElement>(null);

  // Clock tick
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update spotlight coordinates
  const handleMouseMove = (e: React.MouseEvent) => {
    if (desktopRef.current) {
      const rect = desktopRef.current.getBoundingClientRect();
      setSpotlight({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
    }
  };

  // Accent color applier
  useEffect(() => {
    const root = document.documentElement;
    if (accent === "indigo") {
      root.style.setProperty("--accent", "99 102 241");
      root.style.setProperty("--accent-hover", "79 70 229");
    } else if (accent === "emerald") {
      root.style.setProperty("--accent", "16 185 129");
      root.style.setProperty("--accent-hover", "5 150 105");
    } else if (accent === "sky") {
      root.style.setProperty("--accent", "14 165 233");
      root.style.setProperty("--accent-hover", "2 132 199");
    } else { // orange
      root.style.setProperty("--accent", "198 97 63");
      root.style.setProperty("--accent-hover", "217 119 87");
    }
  }, [accent]);

  // Default windows setup
  useEffect(() => {
    const initialWindows: WindowState[] = [
      {
        id: "chat",
        title: "Agent Chat",
        icon: MessageSquare,
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        x: 40,
        y: 40,
        w: 420,
        h: 600,
        zIndex: 5,
        appType: "chat"
      },
      {
        id: "browser",
        title: "Chromium Browser (Cache Enabled)",
        icon: Globe,
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        x: 490,
        y: 40,
        w: 800,
        h: 600,
        zIndex: 4,
        appType: "browser"
      },
      {
        id: "explorer",
        title: "File Explorer",
        icon: FolderOpen,
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 100,
        y: 100,
        w: 650,
        h: 480,
        zIndex: 3,
        appType: "explorer"
      },
      {
        id: "terminal",
        title: "Veltrix Terminal",
        icon: TermIcon,
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 150,
        y: 150,
        w: 600,
        h: 400,
        zIndex: 2,
        appType: "terminal"
      },
      {
        id: "control",
        title: "Control Panel",
        icon: Settings,
        isOpen: false,
        isMinimized: false,
        isMaximized: false,
        x: 200,
        y: 200,
        w: 520,
        h: 420,
        zIndex: 1,
        appType: "control"
      }
    ];
    setWindows(initialWindows);
    setActiveWindowId("chat");
  }, []);

  // Window Focus manager
  const focusWindow = (id: string) => {
    setActiveWindowId(id);
    setWindows(prev => {
      return prev.map(w => {
        if (w.id === id) {
          return { ...w, isMinimized: false, zIndex: nextZIndex };
        }
        return w;
      });
    });
    setNextZIndex(z => z + 1);
  };

  const openApp = (appType: WindowState["appType"], meta?: Record<string, any>) => {
    setStartMenuOpen(false);
    
    if (appType === "editor") {
      const editorId = `editor-${meta?.filePath || Date.now()}`;
      const existing = windows.find(w => w.id === editorId);
      if (existing) {
        focusWindow(editorId);
        return;
      }
      
      const newWin: WindowState = {
        id: editorId,
        title: `Editor - ${meta?.fileName || "Untitled"}`,
        icon: Edit3,
        isOpen: true,
        isMinimized: false,
        isMaximized: false,
        x: 200,
        y: 100,
        w: 650,
        h: 500,
        zIndex: nextZIndex,
        appType: "editor",
        meta
      };
      setWindows(prev => [...prev, newWin]);
      setActiveWindowId(editorId);
      setNextZIndex(z => z + 1);
      return;
    }

    const win = windows.find(w => w.id === appType);
    if (win) {
      if (!win.isOpen) {
        setWindows(prev => prev.map(w => w.id === appType ? { ...w, isOpen: true, isMinimized: false, zIndex: nextZIndex } : w));
      } else {
        focusWindow(appType);
      }
      focusWindow(appType);
    }
  };

  const closeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isOpen: false } : w));
    if (id.startsWith("editor-")) {
      setWindows(prev => prev.filter(w => w.id !== id));
    }
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  const minimizeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMinimized: true } : w));
    if (activeWindowId === id) {
      setActiveWindowId(null);
    }
  };

  const toggleMaximizeWindow = (id: string) => {
    setWindows(prev => prev.map(w => w.id === id ? { ...w, isMaximized: !w.isMaximized } : w));
  };

  // Window dragging using direct DOM styles for lag-free rendering (60fps)
  const startDrag = (id: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("input") || target.closest("textarea")) return;
    
    const win = windows.find(w => w.id === id);
    if (!win || win.isMaximized) return;

    focusWindow(id);

    const winEl = document.getElementById(`win-${id}`);
    if (!winEl) return;

    const initialX = e.clientX;
    const initialY = e.clientY;
    const startX = win.x;
    const startY = win.y;

    let currentX = startX;
    let currentY = startY;

    document.body.style.cursor = "move";
    winEl.style.transition = "none";

    const handleMouseMoveDrag = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - initialX;
      const dy = moveEvent.clientY - moveEvent.clientY; // simple anchor logic
      currentX = startX + (moveEvent.clientX - initialX);
      currentY = startY + (moveEvent.clientY - initialY);
      
      winEl.style.left = `${currentX}px`;
      winEl.style.top = `${currentY}px`;
    };

    const handleMouseUpDrag = () => {
      document.body.style.cursor = "";
      winEl.style.transition = "";
      
      setWindows(prev => prev.map(w => w.id === id ? { ...w, x: currentX, y: currentY } : w));
      
      document.removeEventListener("mousemove", handleMouseMoveDrag);
      document.removeEventListener("mouseup", handleMouseUpDrag);
    };

    document.addEventListener("mousemove", handleMouseMoveDrag);
    document.addEventListener("mouseup", handleMouseUpDrag);
  };

  // Window resizing using direct DOM styles
  const startResize = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const win = windows.find(w => w.id === id);
    if (!win || win.isMaximized) return;

    focusWindow(id);

    const winEl = document.getElementById(`win-${id}`);
    if (!winEl) return;

    const initialX = e.clientX;
    const initialY = e.clientY;
    const startW = win.w;
    const startH = win.h;

    let currentW = startW;
    let currentH = startH;

    document.body.style.cursor = "se-resize";
    winEl.style.transition = "none";

    const handleMouseMoveResize = (moveEvent: MouseEvent) => {
      const dx = moveEvent.clientX - initialX;
      const dy = moveEvent.clientY - initialY;
      currentW = Math.max(450, startW + dx);
      currentH = Math.max(350, startH + dy);
      
      winEl.style.width = `${currentW}px`;
      winEl.style.height = `${currentH}px`;
    };

    const handleMouseUpResize = () => {
      document.body.style.cursor = "";
      winEl.style.transition = "";
      
      setWindows(prev => prev.map(w => w.id === id ? { ...w, w: currentW, h: currentH } : w));
      
      document.removeEventListener("mousemove", handleMouseMoveResize);
      document.removeEventListener("mouseup", handleMouseUpResize);
    };

    document.addEventListener("mousemove", handleMouseMoveResize);
    document.addEventListener("mouseup", handleMouseUpResize);
  };

  // Show desktop toggler
  const toggleShowDesktop = () => {
    const anyOpen = windows.some(w => w.isOpen && !w.isMinimized);
    if (anyOpen) {
      setWindowsBackup([...windows]);
      setWindows(prev => prev.map(w => ({ ...w, isMinimized: true })));
    } else if (windowsBackup) {
      setWindows(windowsBackup);
      setWindowsBackup(null);
    }
  };

  // Desktop context menu handler
  const handleDesktopContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      isOpen: true
    });
  };

  // Create document helper
  const createDesktopDoc = async () => {
    setContextMenu(null);
    const fileName = prompt("Enter file name (e.g. document.txt):");
    if (!fileName) return;

    try {
      const res = await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "home" }),
      });
      const data = await res.json();
      const divider = data.path.includes('\\') ? '\\' : '/';
      const filePath = `${data.path}${divider}${fileName}`;

      await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", path: filePath, content: "" }),
      });

      openApp("editor", { filePath, fileName, content: "" });
    } catch {
      alert("Error creating file.");
    }
  };

  const createDesktopDir = async () => {
    setContextMenu(null);
    const folderName = prompt("Enter folder name:");
    if (!folderName) return;

    try {
      const res = await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "home" }),
      });
      const data = await res.json();
      const divider = data.path.includes('\\') ? '\\' : '/';
      const filePath = `${data.path}${divider}${folderName}`;

      await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mkdir", path: filePath }),
      });
      
      openApp("explorer");
    } catch {
      alert("Error creating folder.");
    }
  };

  const closeAllWindows = () => {
    setContextMenu(null);
    setWindows(prev => prev.map(w => ({ ...w, isOpen: false })));
  };

  // Custom Wallpaper Style mapping
  const getWallpaperStyle = (name: string) => {
    switch (name) {
      case "cyberglow":
        return {
          backgroundColor: "#050409",
          backgroundImage: "radial-gradient(circle at 80% 20%, rgba(236, 72, 153, 0.12) 0%, transparent 50%), radial-gradient(circle at 20% 80%, rgba(59, 130, 246, 0.12) 0%, transparent 50%)"
        };
      case "deep-space":
        return {
          backgroundColor: "#020205",
          backgroundImage: "radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.08) 0%, transparent 60%), radial-gradient(rgba(255, 255, 255, 0.08) 1.5px, transparent 0)",
          backgroundSize: "100% 100%, 40px 40px"
        };
      case "cozy-room":
        return {
          background: "radial-gradient(circle at 50% 120%, rgba(217, 119, 6, 0.15) 0%, #0a0705 70%)"
        };
      case "minimal-dark":
        return {
          backgroundColor: "#070708"
        };
      default: // feltrix-grid
        return {
          backgroundColor: "#0c0a0f",
          backgroundImage: "radial-gradient(circle at 100% 100%, rgba(198, 97, 63, 0.08) 0%, transparent 40%), radial-gradient(circle at 0% 0%, rgba(99, 102, 241, 0.06) 0%, transparent 45%), radial-gradient(rgba(255, 255, 255, 0.04) 1px, transparent 0)",
          backgroundSize: "100% 100%, 100% 100%, 20px 20px"
        };
    }
  };

  // Render a specific window app content
  const renderAppContent = (win: WindowState) => {
    switch (win.appType) {
      case "chat":
        return <AgentChatApp handleSend={handleSend} handleStop={handleStop} isStreaming={isStreaming} activeConv={activeConv} openApp={openApp} />;
      case "browser":
        return (
          <ChromiumBrowserApp 
            isActive={activeWindowId === win.id && win.isOpen && !win.isMinimized} 
            handleSend={handleSend}
            isStreaming={isStreaming}
            activeConv={activeConv}
            openApp={openApp}
          />
        );
      case "explorer":
        return <FileExplorerApp openEditor={(filePath, fileName, content) => openApp("editor", { filePath, fileName, content })} />;
      case "terminal":
        return <TerminalApp />;
      case "editor":
        return <TextEditorApp meta={win.meta} onClose={() => closeWindow(win.id)} />;
      case "control":
        return <ControlPanelApp wallpaper={wallpaper} setWallpaper={setWallpaper} accent={accent} setAccent={setAccent} setWindows={setWindows} windows={windows} />;
      default:
        return <div className="p-4 text-muted-fg">App not found</div>;
    }
  };

  return (
    <div 
      ref={desktopRef}
      onMouseMove={handleMouseMove}
      onContextMenu={handleDesktopContextMenu}
      onClick={() => { setContextMenu(null); setTrayMenuOpen(false); }}
      style={{
        ...getWallpaperStyle(wallpaper),
        ["--x" as any]: `${spotlight.x}px`,
        ["--y" as any]: `${spotlight.y}px`
      }}
      className="relative flex flex-col h-screen w-screen overflow-hidden text-foreground select-none bg-grid-glow font-sans"
    >
      {/* Desktop Workspace Icons Grid */}
      <div className="flex-1 p-6 grid grid-flow-col auto-cols-[100px] grid-rows-[repeat(auto-fill,100px)] gap-6 z-0">
        <DesktopIcon 
          title="Agent Chat" 
          icon={MessageSquare} 
          onDoubleClick={() => openApp("chat")} 
          active={windows.find(w => w.id === "chat")?.isOpen}
        />
        <DesktopIcon 
          title="Chromium Web" 
          icon={Globe} 
          onDoubleClick={() => openApp("browser")} 
          active={windows.find(w => w.id === "browser")?.isOpen}
        />
        <DesktopIcon 
          title="File Explorer" 
          icon={FolderOpen} 
          onDoubleClick={() => openApp("explorer")} 
          active={windows.find(w => w.id === "explorer")?.isOpen}
        />
        <DesktopIcon 
          title="Host Terminal" 
          icon={TermIcon} 
          onDoubleClick={() => openApp("terminal")} 
          active={windows.find(w => w.id === "terminal")?.isOpen}
        />
        <DesktopIcon 
          title="Control Panel" 
          icon={Settings} 
          onDoubleClick={() => openApp("control")} 
          active={windows.find(w => w.id === "control")?.isOpen}
        />
      </div>

      {/* Render Open Windows */}
      {windows.map(win => {
        if (!win.isOpen) return null;
        const isActive = activeWindowId === win.id;
        
        return (
          <div
            key={win.id}
            id={`win-${win.id}`}
            onClick={() => focusWindow(win.id)}
            style={{
              zIndex: win.zIndex,
              left: win.isMaximized ? 0 : win.x,
              top: win.isMaximized ? 0 : win.y,
              width: win.isMaximized ? "100%" : win.w,
              height: win.isMaximized ? "calc(100vh - 48px)" : win.h,
              display: win.isMinimized ? "none" : "flex",
            }}
            className={cn(
              "absolute flex flex-col rounded-xl overflow-hidden border transition-all duration-75 animate-window-open",
              isActive ? "os-window-active border-accent/40 bg-zinc-950/70" : "os-window-inactive border-border os-glass"
            )}
          >
            {/* Window Header */}
            <div 
              onMouseDown={(e) => startDrag(win.id, e)}
              onDoubleClick={() => toggleMaximizeWindow(win.id)}
              className={cn(
                "flex items-center justify-between h-10 px-4 cursor-move select-none shrink-0 border-b",
                isActive ? "bg-surface-3/45 border-accent/20" : "bg-surface-2/30 border-border/40"
              )}
            >
              <div className="flex items-center gap-2 text-xs font-semibold tracking-wide">
                <win.icon className={cn("h-3.5 w-3.5", isActive ? "text-accent" : "text-muted-fg")} />
                <span className={isActive ? "text-foreground" : "text-muted-fg"}>{win.title}</span>
              </div>
              
              {/* Window Controls */}
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                <button 
                  onClick={() => minimizeWindow(win.id)}
                  className="flex items-center justify-center h-5 w-5 rounded-md hover:bg-surface-3/50 text-muted-fg hover:text-foreground transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <button 
                  onClick={() => toggleMaximizeWindow(win.id)}
                  className="flex items-center justify-center h-5 w-5 rounded-md hover:bg-surface-3/50 text-muted-fg hover:text-foreground transition-colors"
                >
                  {win.isMaximized ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                </button>
                <button 
                  onClick={() => closeWindow(win.id)}
                  className="flex items-center justify-center h-5 w-5 rounded-md hover:bg-destructive/80 text-muted-fg hover:text-white transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            </div>

            {/* Window Content */}
            <div className="flex-1 min-h-0 bg-surface/90 backdrop-blur-md overflow-hidden flex flex-col">
              {renderAppContent(win)}
            </div>

            {/* Resize handle (bottom right) */}
            {!win.isMaximized && (
              <div 
                onMouseDown={(e) => startResize(win.id, e)}
                className="absolute bottom-0 right-0 h-4 w-4 cursor-se-resize flex items-end justify-end p-0.5 z-50 group"
              >
                <svg className="h-2.5 w-2.5 text-muted-fg group-hover:text-accent transition-colors" viewBox="0 0 10 10">
                  <path d="M10,0 L10,10 L0,10 Z" fill="currentColor" opacity="0.4" />
                </svg>
              </div>
            )}
          </div>
        );
      })}

      {/* Taskbar */}
      <div className="h-12 w-full os-taskbar flex items-center justify-between px-4 z-40 shrink-0">
        <div className="flex items-center gap-3">
          {/* Start Menu Trigger */}
          <button
            onClick={(e) => { e.stopPropagation(); setStartMenuOpen(!startMenuOpen); }}
            className={cn(
              "flex items-center justify-center h-9 px-3.5 rounded-lg border text-sm font-semibold transition-all duration-200 press-spring",
              startMenuOpen 
                ? "bg-accent border-accent text-white shadow-[0_0_15px_rgba(198,97,63,0.4)]" 
                : "bg-surface-3/60 border-border/80 hover:bg-surface-3 hover:border-border-hover"
            )}
          >
            <Cpu className="h-4 w-4 mr-2" />
            <span>Veltrix OS</span>
          </button>

          {/* Quick Launch Icons / Running tasks */}
          <div className="flex items-center gap-1.5 border-l border-border/50 pl-3">
            {windows.map(win => {
              if (!win.isOpen) return null;
              const isActive = activeWindowId === win.id && !win.isMinimized;
              return (
                <button
                  key={win.id}
                  onClick={() => isActive ? minimizeWindow(win.id) : focusWindow(win.id)}
                  className={cn(
                    "flex items-center gap-2 h-8 px-2.5 rounded-md text-xs font-medium transition-all",
                    isActive 
                      ? "bg-surface-3 text-foreground border border-accent/30" 
                      : "text-muted-fg hover:text-foreground hover:bg-surface-2/40 border border-transparent"
                  )}
                >
                  <win.icon className={cn("h-3.5 w-3.5", isActive ? "text-accent" : "text-muted-fg")} />
                  <span className="hidden sm:inline truncate max-w-[100px]">{win.title.split(" (")[0]}</span>
                  <span className={cn(
                    "h-1.5 w-1.5 rounded-full ml-0.5",
                    isActive ? "bg-accent" : "bg-muted-fg/40"
                  )} />
                </button>
              );
            })}
          </div>
        </div>

        {/* System Clock & Info Tray */}
        <div className="flex items-center gap-3 text-xs text-muted-fg font-medium">
          {/* Agent status */}
          <div className="flex items-center gap-1.5 border-r border-border/40 pr-3">
            <span className={cn(
              "h-2 w-2 rounded-full",
              isStreaming ? "bg-accent animate-pulse" : "bg-success"
            )} />
            <span className="hidden md:inline">{isStreaming ? "Agent is busy..." : "Agent ready"}</span>
          </div>
          
          <div 
            onClick={(e) => { e.stopPropagation(); setTrayMenuOpen(!trayMenuOpen); }}
            className="flex items-center gap-2 bg-surface-3/45 hover:bg-surface-3/70 border border-border/30 rounded-lg px-3 py-1.5 tracking-wider text-[11px] font-mono text-foreground/80 cursor-pointer transition-colors"
          >
            {wifiStatus ? <Wifi className="h-3 w-3 text-success" /> : <Wifi className="h-3 w-3 text-muted-fg" />}
            {muteStatus ? <Volume2 className="h-3 w-3 text-destructive" /> : <Volume2 className="h-3 w-3 text-accent" />}
            <span>{time}</span>
          </div>
          
          {/* Show Desktop Button */}
          <div 
            onClick={toggleShowDesktop}
            className="h-10 w-2.5 border-l border-border/40 hover:bg-white/10 active:bg-white/15 cursor-pointer rounded-r transition-all"
            title="Show Desktop"
          />
        </div>
      </div>

      {/* Start Menu Dropdown */}
      {startMenuOpen && (
        <>
          <div className="absolute inset-0 z-35" onClick={() => setStartMenuOpen(false)} />
          <div className="absolute bottom-14 left-4 w-80 rounded-xl border border-border/80 os-glass p-4 z-40 flex flex-col shadow-2xl animate-window-open origin-bottom-left">
            <div className="flex items-center gap-3 pb-3 border-b border-border/50">
              <div className="h-10 w-10 rounded-lg bg-accent/15 flex items-center justify-center border border-accent/20">
                <Cpu className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-bold text-foreground">Veltrix Insane OS</p>
                <p className="text-[10px] text-muted-fg font-mono">v0.1.0 (Local Sandbox)</p>
              </div>
            </div>

            {/* Quick stats / Host information */}
            <div className="py-3 border-b border-border/50 text-[11px] font-mono space-y-1 text-muted-fg">
              <p><span className="text-foreground/70">Provider:</span> {useProviderStore.getState().activeProvider}</p>
              <p className="truncate"><span className="text-foreground/70">Model:</span> {useProviderStore.getState().activeModel || "No model selected"}</p>
            </div>

            {/* Application Shortcuts */}
            <div className="py-3 flex-1 space-y-1">
              <button 
                onClick={() => openApp("chat")} 
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-3/50 text-left text-xs font-medium"
              >
                <MessageSquare className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-foreground">Agent Chat</p>
                  <p className="text-[10px] text-muted-fg">Interactive agent supervisor panel</p>
                </div>
              </button>
              <button 
                onClick={() => openApp("browser")} 
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-3/50 text-left text-xs font-medium"
              >
                <Globe className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-foreground">Chromium Web Browser</p>
                  <p className="text-[10px] text-muted-fg">Persistent session & local cache</p>
                </div>
              </button>
              <button 
                onClick={() => openApp("explorer")} 
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-3/50 text-left text-xs font-medium"
              >
                <FolderOpen className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-foreground">File Explorer</p>
                  <p className="text-[10px] text-muted-fg">Browse & edit local host files</p>
                </div>
              </button>
              <button 
                onClick={() => openApp("terminal")} 
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-3/50 text-left text-xs font-medium"
              >
                <TermIcon className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-foreground">Host Terminal</p>
                  <p className="text-[10px] text-muted-fg">Run CLI shell commands</p>
                </div>
              </button>
              <button 
                onClick={() => openApp("control")} 
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-surface-3/50 text-left text-xs font-medium"
              >
                <Settings className="h-4 w-4 text-accent" />
                <div>
                  <p className="text-foreground">Control Panel</p>
                  <p className="text-[10px] text-muted-fg">Customize desktop backgrounds & colors</p>
                </div>
              </button>
            </div>

            {/* Switch to standard chat */}
            <button
              onClick={onClose}
              className="mt-2 w-full flex items-center justify-between px-3 py-2 border border-destructive/20 bg-destructive/10 hover:bg-destructive/25 text-destructive rounded-lg text-xs font-bold transition-all press-spring"
            >
              <span>Switch to Chat Mode</span>
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </>
      )}

      {/* Tray Settings Dropdown */}
      {trayMenuOpen && (
        <div 
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-14 right-4 w-72 rounded-xl border border-border/80 os-glass p-4 z-40 flex flex-col shadow-2xl animate-window-open origin-bottom-right"
        >
          <p className="text-xs font-bold text-foreground mb-3">Quick Settings</p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <button 
              onClick={() => setMuteStatus(!muteStatus)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all gap-1.5",
                muteStatus ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-surface-2 hover:bg-surface-3 text-foreground"
              )}
            >
              <Volume2 className="h-4 w-4" />
              <span>{muteStatus ? "Muted" : "Sound On"}</span>
            </button>
            
            <button 
              onClick={() => setWifiStatus(!wifiStatus)}
              className={cn(
                "flex flex-col items-center justify-center p-3 rounded-lg border text-xs font-medium transition-all gap-1.5",
                wifiStatus ? "bg-accent/15 border-accent/25 text-accent font-semibold" : "bg-surface-2 hover:bg-surface-3 text-muted-fg"
              )}
            >
              <Wifi className="h-4 w-4" />
              <span>{wifiStatus ? "Connected" : "Disconnected"}</span>
            </button>
          </div>

          <div className="space-y-3 pt-3 border-t border-border/40 text-[11px]">
            <div className="flex justify-between items-center text-muted-fg">
              <span>Simulated CPU load:</span>
              <span className="font-mono text-foreground font-semibold">12%</span>
            </div>
            <div className="w-full bg-surface-3 h-1.5 rounded-full overflow-hidden">
              <div className="bg-accent h-full rounded-full" style={{ width: "12%" }} />
            </div>

            <div className="flex justify-between items-center text-muted-fg pt-1">
              <span>Simulated Memory load:</span>
              <span className="font-mono text-foreground font-semibold">3.2 GB / 16 GB</span>
            </div>
            <div className="w-full bg-surface-3 h-1.5 rounded-full overflow-hidden">
              <div className="bg-accent h-full rounded-full" style={{ width: "20%" }} />
            </div>
          </div>
        </div>
      )}

      {/* Desktop Context Menu */}
      {contextMenu?.isOpen && (
        <div
          style={{ left: contextMenu.x, top: contextMenu.y }}
          className="absolute w-48 rounded-lg border border-border/80 os-glass p-1.5 z-50 flex flex-col shadow-2xl animate-window-open origin-top-left"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => { setContextMenu(null); openApp("control"); }}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-surface-3/50 text-left text-xs text-foreground"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Personalize Wallpaper</span>
          </button>
          
          <button 
            onClick={createDesktopDoc}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-surface-3/50 text-left text-xs text-foreground"
          >
            <FileText className="h-3.5 w-3.5 text-accent" />
            <span>New Text Document</span>
          </button>
          
          <button 
            onClick={createDesktopDir}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-surface-3/50 text-left text-xs text-foreground"
          >
            <Folder className="h-3.5 w-3.5 text-accent" />
            <span>New Folder</span>
          </button>

          <div className="h-px bg-border/40 my-1" />

          <button 
            onClick={() => { setContextMenu(null); window.location.reload(); }}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-surface-3/50 text-left text-xs text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5 text-muted-fg" />
            <span>Refresh Workspace</span>
          </button>

          <button 
            onClick={closeAllWindows}
            className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded hover:bg-surface-3/50 text-left text-xs text-destructive"
          >
            <X className="h-3.5 w-3.5 text-destructive" />
            <span>Close All Windows</span>
          </button>
        </div>
      )}
    </div>
  );
}

// =================================══════════════
// SUPPORTING COMPONENTS & APPLICATIONS
// =================================══════════════

// Desktop Icon Component
interface DesktopIconProps {
  title: string;
  icon: React.ComponentType<any>;
  onDoubleClick: () => void;
  active?: boolean;
}

function DesktopIcon({ title, icon: Icon, onDoubleClick, active }: DesktopIconProps) {
  return (
    <div 
      onDoubleClick={onDoubleClick}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-xl cursor-pointer hover:bg-white/5 active:bg-white/10 group transition-all duration-150 border border-transparent select-none text-center",
        active && "bg-white/5 border-white/5"
      )}
    >
      <div className="h-12 w-12 rounded-xl bg-surface-2/40 border border-border/20 group-hover:border-accent/40 flex items-center justify-center shadow-lg group-hover:scale-105 group-hover:shadow-[0_0_15px_rgba(198,97,63,0.15)] transition-all duration-150 relative">
        <Icon className="h-6 w-6 text-accent group-hover:text-accent-hover transition-colors" />
        {active && (
          <span className="absolute bottom-1 right-1 h-2 w-2 rounded-full bg-success ring-2 ring-black" />
        )}
      </div>
      <span className="mt-2 text-xs font-medium text-foreground/90 group-hover:text-foreground text-shadow-sm truncate max-w-[85px] leading-tight select-none">
        {title}
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════
// APP: AGENT CHAT / CONTROL PANEL
// ═══════════════════════════════════════════════
interface AgentChatAppProps {
  handleSend: (text: string) => Promise<void>;
  handleStop: () => void;
  isStreaming: boolean;
  activeConv: Conversation | null;
  openApp: (appType: WindowState["appType"], meta?: Record<string, any>) => void;
}

function AgentChatApp({ handleSend, handleStop, isStreaming, activeConv, openApp }: AgentChatAppProps) {
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConv?.messages]);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || isStreaming) return;
    handleSend(inputText);
    setInputText("");
  };

  return (
    <div className="flex flex-col h-full bg-surface/30">
      {/* Active Conversation Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!activeConv || activeConv.messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-3">
            <MessageSquare className="h-8 w-8 text-accent opacity-60 animate-pulse" />
            <p className="text-xs font-semibold text-foreground/80">Veltrix Agent Shell</p>
            <p className="text-[11px] text-muted-fg max-w-[280px]">
              Type a command below. The AI agent will execute tools lokaal and control the browser or file system live on screen.
            </p>
          </div>
        ) : (
          activeConv.messages.map((msg, i) => (
            <div 
              key={msg.id || i}
              className={cn(
                "flex flex-col max-w-[85%] rounded-xl p-3 border text-xs leading-relaxed",
                msg.role === "user" 
                  ? "bg-accent/10 border-accent/20 text-foreground ml-auto" 
                  : "bg-surface-2/40 border-border/50 text-foreground/90 mr-auto"
              )}
            >
              <div className="font-mono text-[9px] text-muted-fg/80 uppercase tracking-widest mb-1">
                {msg.role}
              </div>
              <div className="whitespace-pre-wrap select-text break-words">
                {msg.content}
              </div>
              {msg.thinking && (
                <div className="mt-2 pt-2 border-t border-border/30 text-[10px] text-muted-fg/70 font-mono italic">
                  Thinking: {msg.thinking.slice(0, 100)}...
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input panel */}
      <form onSubmit={onSubmit} className="p-3 border-t border-border/40 bg-surface-2/20 flex gap-2 shrink-0">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Command the AI (e.g. 'open browser and search...')"
          className="flex-1 h-9 px-3 rounded-lg border border-border/80 bg-surface/50 text-xs focus:outline-none focus:border-accent/60 placeholder:text-muted-fg/60 text-foreground"
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={handleStop}
            className="px-3 bg-destructive hover:bg-destructive/90 text-white rounded-lg text-xs font-semibold flex items-center justify-center shrink-0"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            className="px-3.5 bg-accent hover:bg-accent-hover text-white rounded-lg text-xs font-semibold flex items-center justify-center shrink-0 press-spring"
          >
            <Play className="h-3 w-3" />
          </button>
        )}
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════
// APP: CHROMIUM BROWSER APP
// ═══════════════════════════════════════════════
function ChromiumBrowserApp({ 
  isActive, 
  handleSend, 
  isStreaming, 
  activeConv, 
  openApp 
}: { 
  isActive: boolean;
  handleSend?: (text: string) => Promise<void>;
  isStreaming?: boolean;
  activeConv?: Conversation | null;
  openApp?: (appType: WindowState["appType"]) => void;
}) {
  const [url, setUrl] = useState("https://news.ycombinator.com");
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [inputText, setInputText] = useState("");
  const [activeTabId, setActiveTabId] = useState(0);
  
  // Smart dynamic polling timer state
  const [lastActive, setLastActive] = useState(Date.now());

  // AI Watcher and Captcha Solver states
  const [isAiWatching, setIsAiWatching] = useState(true);
  const [captchaState, setCaptchaState] = useState<{
    detected: boolean;
    type: string;
    details: string;
    autoSolving: boolean;
    solved: boolean;
  } | null>(null);

  // Keep track of the last page URL where we initiated/completed auto-solving
  // to avoid infinite loops on the same URL if it fails.
  const solvedUrlRef = useRef<string | null>(null);

  const recordActivity = () => {
    setLastActive(Date.now());
  };

  const refreshScreenshot = useCallback(async () => {
    if (!isActive) return;
    try {
      const res = await hostFetch("/api/host/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "screenshot", tabId: activeTabId }),
      });
      const data = await res.json();
      if (data.screenshot) {
        setScreenshotUrl(data.screenshot);
        setUrl(data.url || url);
        
        // Handle captcha detection results
        if (data.captcha && data.captcha.detected) {
          setCaptchaState((prev) => ({
            detected: true,
            type: data.captcha.type,
            details: data.captcha.details,
            autoSolving: prev?.autoSolving || false,
            solved: prev?.solved && prev.type === data.captcha.type ? true : false,
          }));
        } else {
          setCaptchaState(null);
        }
      }
    } catch {}
  }, [activeTabId, isActive, url]);

  // Smart event-driven adaptive polling loop
  useEffect(() => {
    if (!isActive) return;
    
    refreshScreenshot();
    let timeoutId: NodeJS.Timeout;
    
    const poll = async () => {
      await refreshScreenshot();
      
      const timeSinceActive = Date.now() - lastActive;
      let delay = 3500; // Slow sleep state (3.5s)
      if (timeSinceActive < 5000) {
        delay = 600; // Fast response (0.6s) during interaction
      } else if (timeSinceActive < 15000) {
        delay = 1800; // Medium transition (1.8s)
      }
      
      timeoutId = setTimeout(poll, delay);
    };

    timeoutId = setTimeout(poll, 600);
    return () => clearTimeout(timeoutId);
  }, [isActive, lastActive, refreshScreenshot]);

  const handleNavigate = async (targetUrl = url) => {
    recordActivity();
    let cleanUrl = targetUrl.trim();
    if (!cleanUrl) return;

    const isSearch = cleanUrl.includes(" ") || (!cleanUrl.includes(".") && !cleanUrl.startsWith("localhost"));
    if (isSearch) {
      cleanUrl = "https://www.google.com/search?q=" + encodeURIComponent(cleanUrl);
    } else if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = "https://" + cleanUrl;
    }

    setLoading(true);
    try {
      await hostFetch("/api/host/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "navigate", url: cleanUrl, tabId: activeTabId }),
      });
      setUrl(cleanUrl);
      await refreshScreenshot();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowserClick = async (e: React.MouseEvent<HTMLImageElement>) => {
    recordActivity();
    const rect = e.currentTarget.getBoundingClientRect();
    const xPct = (e.clientX - rect.left) / rect.width;
    const yPct = (e.clientY - rect.top) / rect.height;

    const browserX = Math.round(xPct * 1280);
    const browserY = Math.round(yPct * 900);

    setLoading(true);
    try {
      await hostFetch("/api/host/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "click", tabId: activeTabId, x: browserX, y: browserY }),
      });
      await refreshScreenshot();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowserScroll = async (dy: number) => {
    recordActivity();
    try {
      await hostFetch("/api/host/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "scroll", tabId: activeTabId, dy }),
      });
      await refreshScreenshot();
    } catch {}
  };

  const handleTypeText = async () => {
    if (!inputText) return;
    recordActivity();
    setLoading(true);
    try {
      await hostFetch("/api/host/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "type", tabId: activeTabId, text: inputText }),
      });
      setInputText("");
      await refreshScreenshot();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendKey = async (key: string) => {
    recordActivity();
    setLoading(true);
    try {
      await hostFetch("/api/host/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "press", tabId: activeTabId, key }),
      });
      await refreshScreenshot();
    } catch {}
    finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-900 overflow-hidden text-zinc-100 select-none">
      {/* Navigation Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-zinc-800 border-b border-zinc-700 shrink-0">
        <button 
          onClick={() => handleSendKey("Alt+ArrowLeft")}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100"
          title="Back"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button 
          onClick={() => handleSendKey("Alt+ArrowRight")}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100"
          title="Forward"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
        <button 
          onClick={() => handleNavigate()}
          className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100"
          title="Refresh"
        >
          <RotateCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
        </button>

        {/* Address Bar */}
        <div className="flex-1 flex items-center bg-zinc-950 border border-zinc-700 rounded px-2.5 h-7">
          <Globe className="h-3.5 w-3.5 text-zinc-500 mr-2 shrink-0" />
          <input
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleNavigate()}
            className="flex-1 bg-transparent text-xs text-zinc-200 outline-none w-full"
            placeholder="Type URL or search query..."
          />
        </div>

        {/* Keyboard Input simulator for remote screen */}
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleTypeText()}
            placeholder="Type text..."
            className="w-24 bg-zinc-950 border border-zinc-700 rounded px-2 text-[10px] h-7 outline-none text-zinc-200"
          />
          <button 
            onClick={handleTypeText}
            className="px-2 h-7 bg-accent hover:bg-accent-hover text-white rounded text-[10px] font-semibold"
          >
            Type
          </button>
        </div>

        {/* Quick Send Keys */}
        <div className="flex items-center gap-0.5 border-l border-zinc-700 pl-1.5">
          <button onClick={() => handleSendKey("Enter")} className="px-1.5 h-7 rounded border border-zinc-700 hover:bg-zinc-700 text-[10px]" title="Press Enter">↵</button>
          <button onClick={() => handleSendKey("Tab")} className="px-1.5 h-7 rounded border border-zinc-700 hover:bg-zinc-700 text-[10px]" title="Press Tab">⇥</button>
          <button onClick={() => handleSendKey("Backspace")} className="px-1.5 h-7 rounded border border-zinc-700 hover:bg-zinc-700 text-[10px]" title="Press Backspace">⌫</button>
        </div>
      </div>

      {/* Main Screen Stream Frame - Pixel-Perfect Aspect-Ratio Aligned */}
      <div 
        className="flex-1 bg-zinc-950 overflow-hidden relative flex justify-center items-center"
        onWheel={(e) => handleBrowserScroll(e.deltaY > 0 ? 150 : -150)}
      >
        <div className="relative w-full max-h-full aspect-[1280/900] max-w-[1280px] flex items-center justify-center">
          {screenshotUrl ? (
            <img
              src={screenshotUrl}
              alt="Browser Stream"
              onClick={handleBrowserClick}
              className="w-full h-full object-contain cursor-crosshair select-none"
            />
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 text-zinc-500">
              <div className="spinner-ring border-zinc-500" />
              <p className="text-xs">Initializing chromium browser context...</p>
            </div>
          )}
        </div>

        {loading && (
          <div className="absolute top-3 right-3 flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900/90 border border-zinc-700 shadow-xl text-[10px] text-zinc-300 font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-ping" />
            <span>Syncing action...</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════
// APP: FILE EXPLORER APP
// ═══════════════════════════════════════════════
interface FileExplorerAppProps {
  openEditor: (filePath: string, fileName: string, content: string) => void;
}

function FileExplorerApp({ openEditor }: FileExplorerAppProps) {
  const [currentPath, setCurrentPath] = useState("");
  const [files, setFiles] = useState<{ name: string; kind: "dir" | "file"; size: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [newFileName, setNewFileName] = useState("");
  const [creatingType, setCreatingType] = useState<"file" | "dir" | null>(null);
  
  // Search query to lookup files
  const [filterQuery, setFilterQuery] = useState("");
  
  // Context menu for selected file
  const [fileContextMenu, setFileContextMenu] = useState<{ name: string; x: number; y: number } | null>(null);

  const fetchFiles = async (p?: string) => {
    setLoading(true);
    setFileContextMenu(null);
    try {
      const res = await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list", path: p }),
      });
      const data = await res.json();
      if (data.path) {
        setCurrentPath(data.path);
        setFiles(data.entries || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const navigateUp = () => {
    const parent = currentPath.substring(0, currentPath.lastIndexOf('\\')) || currentPath.substring(0, currentPath.lastIndexOf('/'));
    if (parent) fetchFiles(parent);
  };

  const handleFolderDoubleClick = (folderName: string) => {
    const divider = currentPath.includes('\\') ? '\\' : '/';
    const path = currentPath.endsWith(divider) ? `${currentPath}${folderName}` : `${currentPath}${divider}${folderName}`;
    fetchFiles(path);
  };

  const handleFileDoubleClick = async (fileName: string) => {
    const divider = currentPath.includes('\\') ? '\\' : '/';
    const filePath = currentPath.endsWith(divider) ? `${currentPath}${fileName}` : `${currentPath}${divider}${fileName}`;
    
    try {
      const res = await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "read", path: filePath }),
      });
      const data = await res.json();
      openEditor(filePath, fileName, data.content || "");
    } catch {
      alert("Error reading file.");
    }
  };

  const createItem = async () => {
    if (!newFileName || !creatingType) return;
    const divider = currentPath.includes('\\') ? '\\' : '/';
    const filePath = currentPath.endsWith(divider) ? `${currentPath}${newFileName}` : `${currentPath}${divider}${newFileName}`;

    try {
      if (creatingType === "file") {
        await hostFetch("/api/host/fs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "write", path: filePath, content: "" }),
        });
      } else {
        await hostFetch("/api/host/fs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "mkdir", path: filePath }),
        });
      }
      setNewFileName("");
      setCreatingType(null);
      fetchFiles(currentPath);
    } catch (err) {
      console.error(err);
    }
  };

  const deleteItem = async (name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    const divider = currentPath.includes('\\') ? '\\' : '/';
    const filePath = currentPath.endsWith(divider) ? `${currentPath}${name}` : `${currentPath}${divider}${name}`;
    
    try {
      await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", path: filePath }),
      });
      fetchFiles(currentPath);
    } catch (err) {
      console.error(err);
    }
  };

  const renameItem = async (oldName: string) => {
    const newName = prompt(`Rename ${oldName} to:`, oldName);
    if (!newName || newName === oldName) return;

    const divider = currentPath.includes('\\') ? '\\' : '/';
    const fromPath = `${currentPath}${divider}${oldName}`;
    const toPath = `${currentPath}${divider}${newName}`;

    try {
      await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rename", from: fromPath, to: toPath }),
      });
      fetchFiles(currentPath);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileContextMenu = (e: React.MouseEvent, name: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFileContextMenu({
      name,
      x: e.clientX,
      y: e.clientY
    });
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(filterQuery.toLowerCase()));

  return (
    <div 
      className="flex flex-col h-full bg-surface border-t border-border"
      onClick={() => setFileContextMenu(null)}
    >
      {/* Search and Navigation */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 px-3 py-2 bg-surface-2/45 border-b border-border/80 shrink-0 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button 
            onClick={navigateUp}
            className="p-1 rounded hover:bg-surface-3 border border-border/40 text-muted-fg hover:text-foreground shrink-0"
            title="Up Directory"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-muted-fg select-text truncate shrink-1 bg-surface-3/50 px-2 py-1 rounded border border-border/30 text-[11px] text-foreground w-full">
            {currentPath}
          </span>
        </div>

        {/* File filter query input */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-fg" />
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Search files..."
              className="pl-7 pr-2.5 h-7 w-32 border rounded bg-surface border-border outline-none text-foreground focus:border-accent/40 text-xs"
            />
          </div>
          
          <button 
            onClick={() => setCreatingType("file")} 
            className="h-7 px-2 bg-accent/10 hover:bg-accent/15 border border-accent/20 text-accent rounded flex items-center gap-0.5 font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> File
          </button>
          <button 
            onClick={() => setCreatingType("dir")} 
            className="h-7 px-2 bg-accent/10 hover:bg-accent/15 border border-accent/20 text-accent rounded flex items-center gap-0.5 font-semibold"
          >
            <Plus className="h-3.5 w-3.5" /> Folder
          </button>
        </div>
      </div>

      {/* Creating item modal panel inline */}
      {creatingType && (
        <div className="px-3 py-2 bg-accent/5 border-b border-accent/20 flex items-center gap-2 text-xs shrink-0">
          <span className="font-semibold text-accent/80">New {creatingType === "file" ? "File" : "Folder"}:</span>
          <input
            type="text"
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder={`Enter name...`}
            className="h-7 px-2 border rounded bg-surface border-border outline-none text-foreground flex-1 max-w-[200px]"
            onKeyDown={(e) => e.key === "Enter" && createItem()}
          />
          <button onClick={createItem} className="px-2.5 h-7 bg-accent hover:bg-accent-hover text-white rounded font-medium">Create</button>
          <button onClick={() => setCreatingType(null)} className="px-2.5 h-7 bg-surface-3 hover:bg-surface-3/80 border border-border rounded text-muted-fg">Cancel</button>
        </div>
      )}

      {/* Explorer Content list */}
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="h-full w-full flex flex-col items-center justify-center text-muted-fg gap-2">
            <div className="spinner-ring" />
            <span className="text-xs">Reading directories...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-border/20 text-xs">
            {filteredFiles.map(file => (
              <div 
                key={file.name}
                className="flex items-center justify-between py-2 px-3 hover:bg-surface-2/45 rounded-lg group select-none cursor-pointer"
                onDoubleClick={() => file.kind === "dir" ? handleFolderDoubleClick(file.name) : handleFileDoubleClick(file.name)}
                onContextMenu={(e) => handleFileContextMenu(e, file.name)}
              >
                <div className="flex items-center gap-3">
                  {file.kind === "dir" ? (
                    <Folder className="h-4 w-4 text-accent fill-accent/10 shrink-0" />
                  ) : (
                    <FileText className="h-4 w-4 text-muted-fg shrink-0" />
                  )}
                  <span className="text-foreground font-medium truncate max-w-[320px]">{file.name}</span>
                </div>
                
                <div className="flex items-center gap-4 text-muted-fg font-mono text-[10px]">
                  {file.kind === "file" && (
                    <span>{(file.size / 1024).toFixed(1)} KB</span>
                  )}
                  <button
                    onClick={(e) => handleFileContextMenu(e, file.name)}
                    className="p-1 rounded hover:bg-surface-3 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
            {filteredFiles.length === 0 && (
              <p className="text-center text-muted-fg py-8 italic">No items found matching filter</p>
            )}
          </div>
        )}
      </div>

      {/* Local Context Menu for Files */}
      {fileContextMenu && (
        <div
          style={{ left: fileContextMenu.x, top: fileContextMenu.y }}
          className="absolute w-36 rounded-lg border border-border/80 os-glass p-1 z-50 flex flex-col shadow-2xl animate-window-open"
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            onClick={() => {
              const file = files.find(f => f.name === fileContextMenu.name);
              if (file?.kind === "dir") handleFolderDoubleClick(fileContextMenu.name);
              else handleFileDoubleClick(fileContextMenu.name);
              setFileContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-3/50 text-left text-xs text-foreground"
          >
            Open
          </button>
          
          <button 
            onClick={() => {
              renameItem(fileContextMenu.name);
              setFileContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-3/50 text-left text-xs text-foreground"
          >
            Rename
          </button>
          
          <div className="h-px bg-border/40 my-1" />

          <button 
            onClick={() => {
              deleteItem(fileContextMenu.name);
              setFileContextMenu(null);
            }}
            className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-surface-3/50 text-left text-xs text-destructive font-semibold"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════
// APP: TEXT EDITOR APP
// ═══════════════════════════════════════════════
interface TextEditorAppProps {
  meta?: Record<string, any>;
  onClose: () => void;
}

function TextEditorApp({ meta, onClose }: TextEditorAppProps) {
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (meta?.content) setContent(meta.content);
  }, [meta]);

  const handleSave = async () => {
    if (!meta?.filePath) return;
    setSaving(true);
    try {
      await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "write", path: meta.filePath, content }),
      });
      alert("File saved successfully!");
    } catch {
      alert("Error saving file.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-200">
      {/* Editor toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-zinc-900 border-b border-zinc-800 shrink-0 text-xs font-mono">
        <span className="text-zinc-400 select-text truncate pr-4">{meta?.filePath || "Untitled"}</span>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="h-7 px-3 bg-accent hover:bg-accent-hover text-white rounded font-bold flex items-center gap-1.5 transition-all select-none press-spring disabled:opacity-50"
        >
          <Save className="h-3.5 w-3.5" /> {saving ? "Saving..." : "Save File"}
        </button>
      </div>

      {/* Editor textarea */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="flex-1 bg-zinc-950 p-4 outline-none resize-none font-mono text-xs leading-relaxed select-text w-full text-zinc-100 border-none focus:ring-0 focus:outline-none"
        spellCheck="false"
      />
    </div>
  );
}

// ═══════════════════════════════════════════════
// APP: HOST TERMINAL APP
// ═══════════════════════════════════════════════
function TerminalApp() {
  const [cwd, setCwd] = useState("");
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [commandHistory, setCommandHistory] = useState<string[]>([]);
  const [executing, setExecuting] = useState(false);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initCwd = async () => {
      try {
        const res = await hostFetch("/api/host/fs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "home" }),
        });
        const data = await res.json();
        setCwd(data.path || "");
        setHistory([`Veltrix Terminal. CWD initialized to ${data.path || "process folder"}.`]);
      } catch {
        setHistory(["Terminal ready. CWD initialized."]);
      }
    };
    initCwd();
  }, []);

  useEffect(() => {
    terminalEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const handleCommandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || executing) return;

    const cmd = command.trim();
    setCommandHistory(prev => [...prev, cmd]);
    setHistoryIndex(-1);
    setExecuting(true);
    setHistory(prev => [...prev, `veltrix@host:${cwd}$ ${cmd}`]);
    setCommand("");

    if (cmd.startsWith("cd ")) {
      const targetDir = cmd.substring(3).trim();
      try {
        const res = await hostFetch("/api/host/fs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "stat", path: targetDir ? `${cwd}/${targetDir}` : cwd }),
        });
        const data = await res.json();
        if (data.exists && data.isDir) {
          setCwd(data.path);
          setHistory(prev => [...prev, `Changed directory to: ${data.path}`]);
        } else {
          setHistory(prev => [...prev, `cd: path not found: ${targetDir}`]);
        }
      } catch (err) {
        setHistory(prev => [...prev, `cd: failed: ${String(err)}`]);
      }
      setExecuting(false);
      return;
    }

    try {
      const res = await hostFetch("/api/host/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, cwd }),
      });
      const data = await res.json();
      
      if (data.stdout) {
        setHistory(prev => [...prev, data.stdout]);
      }
      if (data.stderr) {
        setHistory(prev => [...prev, `ERROR: ${data.stderr}`]);
      }
      if (data.error) {
        setHistory(prev => [...prev, `SPAWN ERROR: ${data.error}`]);
      }
      if (data.timedOut) {
        setHistory(prev => [...prev, `Process timed out after 30 seconds.`]);
      }
    } catch (err) {
      setHistory(prev => [...prev, `Connection error: ${String(err)}`]);
    } finally {
      setExecuting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (commandHistory.length === 0) return;
      const nextIdx = historyIndex === -1 ? commandHistory.length - 1 : Math.max(0, historyIndex - 1);
      setHistoryIndex(nextIdx);
      setCommand(commandHistory[nextIdx]);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (historyIndex === -1) return;
      const nextIdx = historyIndex + 1;
      if (nextIdx >= commandHistory.length) {
        setHistoryIndex(-1);
        setCommand("");
      } else {
        setHistoryIndex(nextIdx);
        setCommand(commandHistory[nextIdx]);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 font-mono text-green-500 overflow-hidden border-t border-border/30">
      <div className="flex-1 overflow-y-auto p-4 space-y-2 select-text scrollbar-thin">
        {history.map((line, idx) => (
          <pre key={idx} className="whitespace-pre-wrap break-all text-xs font-mono">{line}</pre>
        ))}
        {executing && (
          <pre className="text-zinc-500 text-xs font-mono animate-pulse">Running process on host...</pre>
        )}
        <div ref={terminalEndRef} />
      </div>

      <form onSubmit={handleCommandSubmit} className="flex items-center gap-1.5 px-4 py-2 border-t border-zinc-800 bg-zinc-900/40 shrink-0 select-none">
        <span className="text-xs shrink-0 select-none">veltrix@host:{cwd.substring(cwd.lastIndexOf('\\') + 1) || cwd.substring(cwd.lastIndexOf('/') + 1) || "/"}$</span>
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={executing}
          className="flex-1 bg-transparent text-xs outline-none border-none focus:outline-none focus:ring-0 text-green-400 font-mono select-text"
          autoFocus
          spellCheck="false"
        />
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════
// APP: CONTROL PANEL APP
// ═══════════════════════════════════════════════
interface ControlPanelAppProps {
  wallpaper: string;
  setWallpaper: (name: string) => void;
  accent: "orange" | "indigo" | "emerald" | "sky";
  setAccent: (name: "orange" | "indigo" | "emerald" | "sky") => void;
  setWindows: React.Dispatch<React.SetStateAction<WindowState[]>>;
  windows: WindowState[];
}

function ControlPanelApp({ wallpaper, setWallpaper, accent, setAccent, setWindows, windows }: ControlPanelAppProps) {
  const wallpapers = [
    { id: "feltrix-grid", name: "Matrix Grid", desc: "Default dark theme grid" },
    { id: "cyberglow", name: "Cyberpunk Glow", desc: "Pink & blue neon aura" },
    { id: "deep-space", name: "Deep Space", desc: "Constellation of stars" },
    { id: "cozy-room", name: "Cozy Amber", desc: "Warm gold room gradient" },
    { id: "minimal-dark", name: "Charcoal Dark", desc: " Sleek distraction-free dark" },
  ];

  const accents = [
    { id: "orange", name: "Amber Orange", color: "bg-[#c6613f]" },
    { id: "indigo", name: "Purple Retro", color: "bg-[#6366f1]" },
    { id: "emerald", name: "Emerald Neon", color: "bg-[#10b981]" },
    { id: "sky", name: "Sky Blue", color: "bg-[#0ea5e9]" },
  ] as const;

  const importBrowserProfile = async (browser: "chrome" | "edge") => {
    if (!confirm(`Importing your default ${browser} profile will close the virtual browser and copy your cookies, logins, and sessions. Continue?`)) return;
    try {
      const res = await hostFetch("/api/host/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "import_profile", browser }),
      });
      const data = await res.json();
      if (res.ok && data.imported) {
        alert(`${browser} profile successfully imported! Start the Chromium Browser to use your active accounts.`);
      } else {
        alert(`Error importing profile: ${data.error || "Profile not found or currently locked. Close Chrome/Edge and try again."}`);
      }
    } catch (err) {
      alert(`Import failed: ${String(err)}`);
    }
  };

  const cleanBrowserCache = async () => {
    if (!confirm("Are you sure you want to clean the Playwright session cache? This will log you out from active websites.")) return;
    try {
      const res = await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "home" }),
      });
      const data = await res.json();
      const divider = data.path.includes('\\') ? '\\' : '/';
      const cachePath = `${data.path}${divider}.playwright-data`;
      
      await hostFetch("/api/host/browser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "close" }),
      });

      await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", path: cachePath }),
      });
      
      alert("Cache and browser profile successfully cleaned!");
    } catch {
      alert("Failed cleaning browser cache directory.");
    }
  };

  return (
    <div className="flex-1 p-5 overflow-y-auto space-y-6 text-xs bg-surface scrollbar-thin select-none">
      {/* Personalization Section */}
      <div>
        <p className="text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
          <Sparkles className="h-4 w-4 text-accent" />
          <span>Desktop Personalization</span>
        </p>
        <p className="text-muted-fg mb-3 text-[11px]">Select a wallpaper theme style to change the desktop workspace look.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {wallpapers.map(w => (
            <button
              key={w.id}
              onClick={() => setWallpaper(w.id)}
              className={cn(
                "p-3 rounded-lg border text-left transition-all",
                wallpaper === w.id 
                  ? "bg-accent/10 border-accent/40" 
                  : "bg-surface-2 hover:bg-surface-3 border-border/50"
              )}
            >
              <p className="font-semibold text-foreground">{w.name}</p>
              <p className="text-[10px] text-muted-fg/80 mt-0.5">{w.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Accent Colors */}
      <div>
        <p className="text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
          <LayoutGrid className="h-4 w-4 text-accent" />
          <span>Accent Colors</span>
        </p>
        <p className="text-muted-fg mb-3 text-[11px]">Choose a theme accent color which applies system-wide to buttons, icons, and focus highlights.</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {accents.map(ac => (
            <button
              key={ac.id}
              onClick={() => setAccent(ac.id)}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border transition-all text-left",
                accent === ac.id 
                  ? "bg-surface-3 border-accent/40 font-semibold" 
                  : "bg-surface-2 hover:bg-surface-3 border-border/50"
              )}
            >
              <span className={cn("h-3.5 w-3.5 rounded-full shrink-0", ac.color)} />
              <span className="text-[11px] truncate">{ac.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Profile Import Section */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-sm font-bold text-foreground mb-1.5 flex items-center gap-1.5">
          <Globe className="h-4 w-4 text-accent" />
          <span>Local Browser Profile Importer</span>
        </p>
        <p className="text-muted-fg mb-3 text-[11px]">Copy sessions, cookies, history, and login data from your default system browser (Chrome/Edge) to synchronize logins lokaal in Veltrix.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-4 rounded-lg bg-surface-2 border border-border/60 flex flex-col justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">Import Google Chrome Profile</p>
              <p className="text-[10px] text-muted-fg/80 mt-0.5">Copies profile files from your local Google Chrome installation.</p>
            </div>
            <button 
              onClick={() => importBrowserProfile("chrome")}
              className="px-3 py-1.5 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/25 rounded-lg font-bold transition-all press-spring self-start"
            >
              Import Chrome Data
            </button>
          </div>
          <div className="p-4 rounded-lg bg-surface-2 border border-border/60 flex flex-col justify-between gap-3">
            <div>
              <p className="font-semibold text-foreground">Import Microsoft Edge Profile</p>
              <p className="text-[10px] text-muted-fg/80 mt-0.5">Copies profile files from your local Microsoft Edge installation.</p>
            </div>
            <button 
              onClick={() => importBrowserProfile("edge")}
              className="px-3 py-1.5 bg-accent/15 hover:bg-accent/25 text-accent border border-accent/25 rounded-lg font-bold transition-all press-spring self-start"
            >
              Import Edge Data
            </button>
          </div>
        </div>
      </div>

      {/* System maintenance */}
      <div className="pt-4 border-t border-border/50">
        <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5 text-destructive">
          <Trash2 className="h-4 w-4 text-destructive" />
          <span>System Utilities & Cleaners</span>
        </p>
        <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-foreground">Clean Browser Session Profile</p>
            <p className="text-[10px] text-muted-fg/80 mt-0.5">Deletes local caching, saved browser passwords, history, and active sessions.</p>
          </div>
          <button 
            onClick={cleanBrowserCache}
            className="px-3 py-2 bg-destructive/10 hover:bg-destructive/25 text-destructive rounded-lg font-bold border border-destructive/20 shrink-0 self-start sm:self-center transition-all press-spring"
          >
            Clear Profile Cache
          </button>
        </div>
      </div>
    </div>
  );
}
