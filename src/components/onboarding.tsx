"use client";

import React, { useState, useEffect } from "react";
import { usePreferences } from "@/lib/preferences";
import { useProviderStore, useChatStore } from "@/lib/store";
import { useMemoryStore } from "@/lib/memory-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { hostFetch } from "@/lib/host-client";
import {
  Globe,
  Bot,
  Terminal,
  FolderOpen,
  Monitor,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check,
  Languages,
  RefreshCw,
  Cpu
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LANGUAGES, languageMeta } from "@/lib/i18n";
import type { LanguageId } from "@/lib/preferences";

// ═══════════════════════════════════════════════
// Onboarding Translations
// ═══════════════════════════════════════════════
type LangCode = "en" | "nl";

interface TranslationDict {
  welcome: string;
  welcome_sub: string;
  select_lang: string;
  theme_label: string;
  theme_dark: string;
  theme_light: string;
  theme_system: string;
  next: string;
  back: string;
  finish: string;
  steps: string[];
  provider_title: string;
  provider_sub: string;
  local_model: string;
  local_model_sub: string;
  cloud_model: string;
  cloud_model_sub: string;
  ollama_sub: string;
  ollama_detecting: string;
  ollama_found: string;
  ollama_not_found: string;
  ollama_label: string;
  ollama_placeholder: string;
  ollama_test: string;
  ollama_success: string;
  ollama_error: string;
  cloud_select_label: string;
  cloud_api_key: string;
  cloud_base_url: string;
  workspace_title: string;
  workspace_sub: string;
  workspace_label: string;
  workspace_placeholder: string;
  workspace_check: string;
  workspace_ok: string;
  workspace_missing: string;
  workspace_create: string;
  workspace_creating: string;
  workspace_created: string;
  osmode_title: string;
  osmode_sub: string;
  osmode_label: string;
  osmode_desc: string;
  osmode_on: string;
  osmode_off: string;
  import_title: string;
  import_sub: string;
  import_prompt_desc: string;
  import_copy_btn: string;
  import_copied: string;
  import_paste_label: string;
  import_paste_placeholder: string;
  import_btn: string;
  import_loading: string;
  import_skip: string;
  import_success: string;
  import_error: string;
  complete_title: string;
  complete_sub: string;
  complete_btn: string;
}

const translations: Record<LangCode, TranslationDict> = {
  nl: {
    welcome: "Welkom bij Veltrix OS",
    welcome_sub: "Laten we uw gepersonaliseerde AI-werkruimte in een paar stappen configureren.",
    select_lang: "Kies uw taal:",
    theme_label: "Kies een thema preset:",
    theme_dark: "Donker",
    theme_light: "Licht",
    theme_system: "Systeem",
    next: "Volgende",
    back: "Vorige",
    finish: "Afronden",
    steps: ["Taal & Stijl", "Model Provider", "Werkruimte", "OS Modus", "Gegevens", "Klaar"],
    provider_title: "Configureer uw AI-provider",
    provider_sub: "Kies of u Veltrix wilt koppelen aan een lokale model-server of een cloud API.",
    local_model: "Lokaal Model (Ollama / LM Studio)",
    local_model_sub: "Volledig privé, draait lokaal op uw eigen hardware.",
    cloud_model: "Cloud API Provider (OpenAI, Anthropic, enz.)",
    cloud_model_sub: "Snelle, krachtige modellen via een API-sleutel.",
    ollama_sub: "We controleren nu of de lokale Ollama-service actief is op uw machine.",
    ollama_detecting: "Ollama zoeken...",
    ollama_found: "Ollama is gedetecteerd en actief op uw machine!",
    ollama_not_found: "Ollama kon niet automatisch worden gevonden. Zorg dat de Ollama-app is gestart.",
    ollama_label: "Uitvoerbaar Ollama-pad (optioneel):",
    ollama_placeholder: "Bijv. C:\\Users\\naam\\AppData\\Local\\Programs\\Ollama\\ollama.exe",
    ollama_test: "Test Verbinding",
    ollama_success: "Succesvol verbonden! Modellen gevonden: ",
    ollama_error: "Kan geen verbinding maken met Ollama. Start Ollama of voer het juiste pad in.",
    cloud_select_label: "Selecteer API Provider:",
    cloud_api_key: "API Sleutel (sk-...):",
    cloud_base_url: "Aangepaste Base URL (optioneel):",
    workspace_title: "Agent Werkruimte Map",
    workspace_sub: "Geef het pad op waar de Veltrix Agent bestanden mag maken, lezen en scripts mag uitvoeren.",
    workspace_label: "Pad naar werkruimte folder:",
    workspace_placeholder: "Bijv. C:\\Users\\naam\\veltrix-workspace",
    workspace_check: "Map Controleren",
    workspace_ok: "De map bestaat en is klaar voor gebruik!",
    workspace_missing: "Deze map bestaat nog niet. Wilt u dat we deze map aanmaken?",
    workspace_create: "Map Aanmaken",
    workspace_creating: "Aanmaken...",
    workspace_created: "Map is succesvol aangemaakt op uw machine!",
    osmode_title: "Ultra Agent OS Modus",
    osmode_sub: "Kies hoe u standaard wilt communiceren met uw AI-agent.",
    osmode_label: "Interactieve Desktop OS Omgeving inschakelen?",
    osmode_desc: "Dit geeft u een virtuele desktopomgeving met een terminal, bestandsbeheerder en een browser die de agent live kan besturen om taken op te lossen. (Sterk aanbevolen)",
    osmode_on: "Ja, start direct in OS-modus (Aanbevolen)",
    osmode_off: "Nee, start in de traditionele chat-modus",
    import_title: "Importeer eerdere AI gegevens",
    import_sub: "U kunt herinneringen of chatgeschiedenis importeren uit andere AI-assistenten.",
    import_prompt_desc: "Kopieer deze prompt, geef het aan uw oude AI en plak de resulterende tekst hieronder om uw herinneringen mee te nemen:",
    import_copy_btn: "Kopieer Prompt",
    import_copied: "Gekopieerd!",
    import_paste_label: "Plak de export of JSON gegevens hieronder:",
    import_paste_placeholder: "Plak de tekst van uw oude AI of een Veltrix-back-upbestand...",
    import_btn: "Importeer Gegevens",
    import_loading: "Importeren...",
    import_skip: "Sla import over",
    import_success: "Gegevens succesvol geïmporteerd in Veltrix!",
    import_error: "Import mislukt. Controleer de indeling van de geplakte tekst.",
    complete_title: "U bent helemaal klaar!",
    complete_sub: "Veltrix OS is succesvol geconfigureerd. Veel plezier met uw nieuwe AI-agent!",
    complete_btn: "Veltrix OS Starten"
  },
  en: {
    welcome: "Welcome to Veltrix OS",
    welcome_sub: "Let's configure your personalized AI workspace in a few simple steps.",
    select_lang: "Choose your language:",
    theme_label: "Choose a theme preset:",
    theme_dark: "Dark",
    theme_light: "Light",
    theme_system: "System",
    next: "Next",
    back: "Back",
    finish: "Finish",
    steps: ["Language & Style", "Model Provider", "Workspace", "OS Mode", "Data", "Ready"],
    provider_title: "Configure your AI Provider",
    provider_sub: "Choose whether Veltrix will connect to a local model server or a cloud API.",
    local_model: "Local Model (Ollama / LM Studio)",
    local_model_sub: "100% private, running locally on your hardware.",
    cloud_model: "Cloud API Provider (OpenAI, Anthropic, etc.)",
    cloud_model_sub: "Fast, state-of-the-art models via API keys.",
    ollama_sub: "Checking if your local Ollama service is active.",
    ollama_detecting: "Searching for Ollama...",
    ollama_found: "Ollama was detected and is active on your host!",
    ollama_not_found: "Ollama was not detected at standard locations. Make sure the Ollama app is running.",
    ollama_label: "Ollama Executable Path (optional):",
    ollama_placeholder: "E.g. C:\\Users\\name\\AppData\\Local\\Programs\\Ollama\\ollama.exe",
    ollama_test: "Test Connection",
    ollama_success: "Successfully connected! Models discovered: ",
    ollama_error: "Unable to connect to Ollama. Start Ollama or input the correct path.",
    cloud_select_label: "Select API Provider:",
    cloud_api_key: "API Key (sk-...):",
    cloud_base_url: "Custom Base URL (optional):",
    workspace_title: "Agent Workspace Directory",
    workspace_sub: "Define where the Veltrix Agent is allowed to create, read, and write files.",
    workspace_label: "Path to workspace folder:",
    workspace_placeholder: "E.g. C:\\Users\\name\\veltrix-workspace",
    workspace_check: "Check Path",
    workspace_ok: "Directory exists and is ready to use!",
    workspace_missing: "This directory does not exist yet. Would you like Veltrix to create it?",
    workspace_create: "Create Folder",
    workspace_creating: "Creating...",
    workspace_created: "Workspace folder has been successfully created on your machine!",
    osmode_title: "Ultra Agent OS Mode",
    osmode_sub: "Choose how you want to interact with your AI agent by default.",
    osmode_label: "Enable Interactive Desktop OS Environment?",
    osmode_desc: "This gives you a simulated desktop environment with a terminal, file manager, and a browser that the agent can control in real-time to solve complex tasks. (Highly recommended)",
    osmode_on: "Yes, start in OS-Mode by default (Recommended)",
    osmode_off: "No, start in traditional chat-mode",
    import_title: "Import legacy AI data",
    import_sub: "You can import past conversations or memories from other AI assistants.",
    import_prompt_desc: "Copy this prompt, feed it to your old AI, and paste its output below to transfer your memories:",
    import_copy_btn: "Copy Prompt",
    import_copied: "Copied!",
    import_paste_label: "Paste the export or JSON data below:",
    import_paste_placeholder: "Paste text or a Veltrix export file...",
    import_btn: "Import Data",
    import_loading: "Importing...",
    import_skip: "Skip import",
    import_success: "Data successfully imported into Veltrix!",
    import_error: "Import failed. Please check the format of the pasted text.",
    complete_title: "You're all set!",
    complete_sub: "Veltrix OS is fully configured. Enjoy working with your autonomous AI agent!",
    complete_btn: "Launch Veltrix OS"
  }
};

const exportPrompt = [
  "Export all of my stored memories and any context you've learned about me from past conversations. Preserve my words verbatim where possible, especially for instructions and preferences.",
  "",
  "## Categories (output in this order):",
  "1. **Instructions**: Rules I've explicitly asked you to follow going forward.",
  "2. **Identity**: Name, location, preferences, languages, interests.",
  "3. **Career**: Current and past roles, skills.",
  "4. **Projects**: Projects I built or committed to.",
  "5. **Preferences**: Opinions, tastes, and working-style preferences.",
  "",
  "## Format:",
  "Use section headers. List one entry per line as:",
  "[YYYY-MM-DD] - Entry content here. (or [unknown] if no date)",
  "",
  "Wrap the entire export in a single code block."
].join("\n");

export function Onboarding({ onComplete }: { onComplete: (osModeByDefault: boolean) => void }) {
  // Global stores
  const prefs = usePreferences();
  const providerStore = useProviderStore();

  // States
  const [step, setStep] = useState(0);
  const [languageId, setLanguageId] = useState<LanguageId>("en-US");
  const [lang, setLang] = useState<LangCode>("en");

  // Step 1 states
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">("dark");
  
  // Step 2 states
  const [isLocal, setIsLocal] = useState(true);
  const [selectedCloudProvider, setSelectedCloudProvider] = useState<string>("openai");
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [ollamaExecPath, setOllamaExecPath] = useState("");
  const [ollamaStatus, setOllamaStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [ollamaInfo, setOllamaInfo] = useState("");
  
  // Step 3 states
  const [workspace, setWorkspace] = useState("");
  const [workspaceStatus, setWorkspaceStatus] = useState<"idle" | "checking" | "ok" | "missing" | "creating" | "created" | "error">("idle");
  const [workspaceError, setWorkspaceError] = useState("");
  
  // Step 4 states
  const [osModeEnabled, setOsModeEnabled] = useState(true);
  
  // Step 5 states
  const [pastedData, setPastedData] = useState("");
  const [importStatus, setImportStatus] = useState<"idle" | "busy" | "success" | "error">("idle");
  const [importMessage, setImportMessage] = useState("");
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const createConversation = useChatStore((s) => s.createConversation);
  const addMessage = useChatStore((s) => s.addMessage);
  const setActiveConv = useChatStore((s) => s.setActive);
  const createMemory = useMemoryStore((s) => s.create);

  // Auto-detect language on load
  useEffect(() => {
    if (typeof window === "undefined") return;
    const browserLang = navigator.language.toLowerCase();
    const matched =
      LANGUAGES.find((l) => browserLang === l.tag.toLowerCase()) ||
      LANGUAGES.find((l) => browserLang.startsWith(l.tag.split("-")[0].toLowerCase()));
    if (matched) {
      setLanguageId(matched.id);
    }
    if (browserLang.startsWith("nl")) {
      setLang("nl");
    }
  }, []);

  // Pre-fill default workspace path on load
  useEffect(() => {
    const fetchDefaultPaths = async () => {
      try {
        const res = await hostFetch("/api/host/fs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "home" }),
        });
        const data = await res.json();
        if (data.home) {
          const separator = data.home.includes("/") ? "/" : "\\";
          setWorkspace(`${data.home}${separator}veltrix-workspace`);
        } else if (data.path) {
          const separator = data.path.includes("/") ? "/" : "\\";
          setWorkspace(`${data.path}${separator}workspace`);
        }
      } catch (e) {
        setWorkspace("C:\\veltrix-workspace");
      }
    };
    fetchDefaultPaths();
  }, []);

  // Helper translations shortcut
  const t = translations[lang];

  // Actions
  const handleCopyPrompt = () => {
    try {
      navigator.clipboard.writeText(exportPrompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } catch (e) {}
  };

  const handleTestOllama = async () => {
    setOllamaStatus("testing");
    setOllamaInfo("");
    
    // First: check port via proxy
    try {
      const checkRes = await fetch("/api/proxy?target=http%3A%2F%2F127.0.0.1%3A11434%2Fapi%2Ftags");
      if (checkRes.ok) {
        const checkData = await checkRes.json();
        const models = checkData.models || [];
        if (models.length > 0) {
          setOllamaStatus("success");
          setOllamaInfo(models.map((m: any) => m.name).join(", "));
          
          // update provider store
          providerStore.updateProvider("ollama", { enabled: true, baseUrl: "http://localhost:11434" });
          providerStore.refreshModels("ollama");
          return;
        }
      }
    } catch (e) {}

    // Second: if port check fails or empty, let's run command on host to check/start
    const cmd = ollamaExecPath.trim() ? `"${ollamaExecPath.trim()}" --version` : "ollama --version";
    try {
      const execRes = await hostFetch("/api/host/exec", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: cmd, timeoutMs: 4000 }),
      });
      const data = await execRes.json();
      if (data.exitCode === 0) {
        setOllamaStatus("success");
        setOllamaInfo(data.stdout || "Ollama CLI active");
        
        // update config
        providerStore.updateProvider("ollama", { enabled: true });
        providerStore.refreshModels("ollama");
      } else {
        setOllamaStatus("error");
      }
    } catch (e) {
      setOllamaStatus("error");
    }
  };

  const handleCheckWorkspace = async () => {
    if (!workspace.trim()) return;
    setWorkspaceStatus("checking");
    setWorkspaceError("");
    try {
      const res = await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "stat", path: workspace.trim() }),
      });
      const data = await res.json();
      if (data.exists && data.isDir) {
        setWorkspaceStatus("ok");
      } else if (data.exists && !data.isDir) {
        setWorkspaceStatus("error");
        setWorkspaceError(lang === "nl" ? "Dit pad is een bestand, geen map." : "This path points to a file, not a directory.");
      } else {
        setWorkspaceStatus("missing");
      }
    } catch (e: any) {
      setWorkspaceStatus("error");
      setWorkspaceError(e.message || "Failed to check directory.");
    }
  };

  const handleCreateWorkspace = async () => {
    setWorkspaceStatus("creating");
    try {
      const res = await hostFetch("/api/host/fs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mkdir", path: workspace.trim() }),
      });
      const data = await res.json();
      if (data.created) {
        setWorkspaceStatus("created");
      } else {
        setWorkspaceStatus("error");
        setWorkspaceError(data.error || "Could not create directory.");
      }
    } catch (e: any) {
      setWorkspaceStatus("error");
      setWorkspaceError(e.message || "Failed to create directory.");
    }
  };

  // Import memories or JSON logs
  const handleImport = () => {
    const text = pastedData.trim();
    if (!text) return;
    setImportStatus("busy");
    setImportMessage("");

    try {
      const isJson = text.startsWith("[") || text.startsWith("{") || (text.includes("```") && (text.includes("[") || text.includes("{")));
      if (isJson) {
        // Try parsing JSON conversation
        let raw = text;
        const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
        if (fence) raw = fence[1].trim();
        const start = raw.search(/[\[{]/);
        if (start !== -1) raw = raw.slice(start);
        
        const data = JSON.parse(raw);
        const convs = Array.isArray(data) ? data : Array.isArray(data?.conversations) ? data.conversations : data?.messages ? [data] : [];
        
        if (convs.length === 0) {
          setImportStatus("error");
          setImportMessage(lang === "nl" ? "Geen geldige chatconversaties gevonden in JSON." : "No valid chat conversations found in JSON.");
          return;
        }

        let firstId = "";
        for (const c of convs) {
          const title = c.title || c.name || "Imported Chat";
          const id = createConversation();
          if (!firstId) firstId = id;
          
          const msgs = c.messages || c.chat_messages || [];
          for (const m of msgs) {
            const role = (m.role || m.author || "user") === "assistant" ? "assistant" : "user";
            const content = typeof m.content === "string" ? m.content : (m.content?.parts?.join("\n") || m.text || "");
            if (content) {
              addMessage(id, { role, content });
            }
          }
        }
        if (firstId) setActiveConv(firstId);
        setImportStatus("success");
        setImportMessage(lang === "nl" ? `Succesvol ${convs.length} chats geïmporteerd!` : `Successfully imported ${convs.length} chats!`);
      } else {
        // Parse structured legacy AI memories
        const lines = text.split(/\r?\n/);
        let category = "Preferences";
        const catStrength: Record<string, number> = {
          instructions: 0.85, identity: 0.8, career: 0.7, projects: 0.75, preferences: 0.65,
        };
        const memories: { title: string; content: string; strength: number; tags: string[] }[] = [];
        
        for (const raw of lines) {
          const line = raw.trim();
          if (!line) continue;
          const hdr = line.match(/^(?:##\s*)?(?:\d+\.\s*)?\**\s*(instructions|identity|career|projects|preferences)\s*\**\s*:?$/i);
          if (hdr) { category = hdr[1].toLowerCase(); continue; }
          const entry = line.match(/^\[(?:\d{4}-\d{2}-\d{2}|unknown)\]\s*-\s*(.+)$/i);
          if (entry) {
            const content = entry[1].trim();
            if (content.length >= 3) {
              memories.push({
                title: content.slice(0, 90),
                content: line,
                strength: catStrength[category] ?? 0.6,
                tags: [category]
              });
            }
          }
        }

        const convId = createConversation();
        addMessage(convId, { role: "user", content: "Here is everything my previous assistant knew about me. Read it and remember it:\n\n" + text });
        
        let stored = 0;
        for (const m of memories) {
          const node = createMemory({
            projectId: "global",
            title: m.title,
            content: m.content,
            kind: "long",
            strength: m.strength,
            tags: m.tags,
            sourceConvIds: [convId]
          });
          if (node) stored++;
        }
        setActiveConv(convId);
        setImportStatus("success");
        setImportMessage(lang === "nl" 
          ? `Geïmporteerd in Veltrix! ${stored} herinneringen opgeslagen in uw profiel.`
          : `Imported into Veltrix! Stored ${stored} memories in your profile.`
        );
      }
    } catch (e: any) {
      setImportStatus("error");
      setImportMessage(e.message || "Failed to parse data.");
    }
  };

  const handleFinish = () => {
    // 1. Save language
    prefs.setLanguage(languageId);

    // 2. Save theme preset
    prefs.setAppearance({
      colorMode: themeMode,
      themePreset: "feltrix-original"
    });

    // 3. Save provider setup
    if (isLocal) {
      providerStore.setProvider("ollama");
      prefs.setCapabilities({ defaultProvider: "ollama" });
      if (ollamaExecPath.trim()) {
        prefs.setOllamaPath(ollamaExecPath.trim());
      }
    } else {
      providerStore.setProvider(selectedCloudProvider as any);
      providerStore.updateProvider(selectedCloudProvider as any, {
        enabled: true,
        apiKey: apiKey.trim() || undefined,
        baseUrl: baseUrl.trim() || undefined
      });
      prefs.setCapabilities({ defaultProvider: selectedCloudProvider });
    }

    // 4. Save workspace path
    if (workspace.trim()) {
      prefs.setWorkspacePath(workspace.trim());
    }

    // 5. Save OS Mode setting
    prefs.setUltraAgentOsMode(osModeEnabled);

    // 6. Complete onboarding!
    prefs.setOnboardingCompleted(true);
    
    // Trigger parent callback
    onComplete(osModeEnabled);
  };

  const nextStep = () => {
    setStep(s => s + 1);
  };

  const prevStep = () => {
    setStep(s => s - 1);
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-zinc-950/80 backdrop-blur-md overflow-y-auto p-4 select-none">
      {/* Decorative colored glow orbs in the background */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-accent/10 rounded-full filter blur-[100px] animate-pulse-soft pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full filter blur-[120px] animate-pulse-soft pointer-events-none" style={{ animationDelay: "1s" }} />

      <div className="relative w-full max-w-2xl rounded-2xl bg-surface/75 border border-border/80 shadow-[0_20px_50px_rgba(0,0,0,0.4)] backdrop-blur-xl animate-pop-in overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header decoration */}
        <div className="h-1.5 w-full bg-gradient-to-r from-accent via-indigo-500 to-accent-hover" />

        {/* Wizard Steps indicator */}
        <div className="px-6 pt-5 pb-3 border-b border-border/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-accent animate-spin-smooth" style={{ animationDuration: "3s" }} />
            <span className="font-bold tracking-wide text-foreground text-sm uppercase">Veltrix Setup</span>
          </div>
          <div className="flex items-center gap-1.5">
            {t.steps.map((s, idx) => (
              <React.Fragment key={idx}>
                {idx > 0 && <div className={cn("w-3 h-0.5 rounded-full", step >= idx ? "bg-accent/70" : "bg-border/30")} />}
                <div
                  className={cn(
                    "h-6 px-2 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300",
                    step === idx
                      ? "bg-accent text-white scale-105 shadow-sm"
                      : step > idx
                      ? "bg-accent/20 text-accent border border-accent/30"
                      : "bg-surface-2 text-muted-fg border border-border/30"
                  )}
                >
                  {idx + 1}
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Wizard Panel Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 scrollbar-thin">
          
          {/* STEP 0: WELCOME & LANGUAGE */}
          {step === 0 && (
            <div className="space-y-6 animate-slide-up">
              <div className="text-center space-y-2">
                <div className="mx-auto h-16 w-16 bg-accent/10 border border-accent/20 rounded-2xl flex items-center justify-center shadow-inner mb-4">
                  <Globe className="h-8 w-8 text-accent animate-pulse-soft" />
                </div>
                <h1 className="text-2xl md:text-3xl font-serif text-foreground bg-gradient-to-r from-foreground via-foreground to-accent bg-clip-text">
                  {t.welcome}
                </h1>
                <p className="text-sm text-muted-fg max-w-md mx-auto">
                  {t.welcome_sub}
                </p>
              </div>

              <div className="max-w-md mx-auto bg-surface-2/50 border border-border/40 rounded-xl p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider flex items-center gap-1.5">
                    <Languages className="h-3.5 w-3.5" /> {t.select_lang}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
                    {LANGUAGES.map((l) => {
                      const active = languageId === l.id;
                      return (
                        <button
                          key={l.id}
                          onClick={() => {
                            setLanguageId(l.id);
                            if (l.id.startsWith("nl")) setLang("nl");
                            else setLang("en");
                          }}
                          className={cn(
                            "py-3 px-2 rounded-lg border text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 text-center",
                            active
                              ? "bg-accent border-accent text-white shadow-md scale-[1.02]"
                              : "bg-surface border-border hover:border-border-hover text-foreground"
                          )}
                          title={`${l.label} (${l.tag})`}
                        >
                          {l.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/30">
                  <label className="text-xs font-semibold text-muted-fg uppercase tracking-wider block">
                    {t.theme_label}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["dark", "light", "system"] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setThemeMode(mode)}
                        className={cn(
                          "py-2 rounded-lg border text-xs font-semibold transition-all duration-150 capitalize",
                          themeMode === mode
                            ? "bg-surface-3 border-accent text-foreground ring-1 ring-accent/30"
                            : "bg-surface border-border hover:border-border-hover text-muted-fg"
                        )}
                      >
                        {mode === "dark" ? t.theme_dark : mode === "light" ? t.theme_light : t.theme_system}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: PROVIDER CHOICE */}
          {step === 1 && (
            <div className="space-y-5 animate-slide-up">
              <div className="space-y-1">
                <h2 className="text-xl font-serif text-foreground">{t.provider_title}</h2>
                <p className="text-xs text-muted-fg">{t.provider_sub}</p>
              </div>

              <div className="grid md:grid-cols-2 gap-3.5">
                {/* Local option */}
                <button
                  onClick={() => setIsLocal(true)}
                  className={cn(
                    "p-5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-40",
                    isLocal
                      ? "bg-accent/5 border-accent ring-1 ring-accent/40 shadow-sm"
                      : "bg-surface-2/40 border-border hover:border-border-hover"
                  )}
                >
                  <div className="h-8 w-8 bg-accent/10 border border-accent/20 rounded-lg flex items-center justify-center mb-3">
                    <Terminal className="h-4.5 w-4.5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t.local_model}</h3>
                    <p className="text-[11px] text-muted-fg mt-1 leading-snug">{t.local_model_sub}</p>
                  </div>
                </button>

                {/* Cloud option */}
                <button
                  onClick={() => setIsLocal(false)}
                  className={cn(
                    "p-5 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-40",
                    !isLocal
                      ? "bg-accent/5 border-accent ring-1 ring-accent/40 shadow-sm"
                      : "bg-surface-2/40 border-border hover:border-border-hover"
                  )}
                >
                  <div className="h-8 w-8 bg-indigo-500/10 border border-indigo-500/20 rounded-lg flex items-center justify-center mb-3">
                    <Globe className="h-4.5 w-4.5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t.cloud_model}</h3>
                    <p className="text-[11px] text-muted-fg mt-1 leading-snug">{t.cloud_model_sub}</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: PROVIDER CONFIGURATION */}
          {step === 2 && (
            <div className="space-y-5 animate-slide-up">
              {isLocal ? (
                // Local config: Ollama
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-serif text-foreground">{t.local_model}</h2>
                    <p className="text-xs text-muted-fg">{t.ollama_sub}</p>
                  </div>

                  <div className="bg-surface-2/50 border border-border/40 rounded-xl p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Loader2 className={cn("h-4 w-4 text-accent animate-spin", ollamaStatus !== "testing" && "hidden")} />
                        <span className="text-xs font-semibold text-muted-fg uppercase tracking-wider">Status:</span>
                      </div>
                      
                      {ollamaStatus === "success" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success font-medium animate-fade-in">
                          <CheckCircle2 className="h-4 w-4" /> {t.ollama_found}
                        </span>
                      ) : ollamaStatus === "error" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-destructive font-medium animate-fade-in">
                          <AlertCircle className="h-4 w-4" /> {t.ollama_not_found}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-fg font-medium">Idle</span>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-fg block">
                        {t.ollama_label}
                      </label>
                      <Input
                        value={ollamaExecPath}
                        onChange={(e) => setOllamaExecPath(e.target.value)}
                        placeholder={t.ollama_placeholder}
                        className="font-mono text-xs h-9"
                      />
                    </div>

                    <Button
                      onClick={handleTestOllama}
                      disabled={ollamaStatus === "testing"}
                      className="w-full bg-accent hover:bg-accent-hover text-white text-xs h-9 font-semibold transition-all duration-150"
                    >
                      {ollamaStatus === "testing" ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                          {t.ollama_detecting}
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 mr-2" />
                          {t.ollama_test}
                        </>
                      )}
                    </Button>

                    {ollamaInfo && (
                      <div className="bg-surface-3 p-3 rounded-lg border border-border/50 text-[11px] font-mono leading-relaxed max-h-24 overflow-y-auto text-foreground/90 animate-fade-in">
                        <span className="text-success font-semibold">{t.ollama_success}</span>
                        {ollamaInfo}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                // Cloud config: API Key
                <div className="space-y-4">
                  <div className="space-y-1">
                    <h2 className="text-xl font-serif text-foreground">{t.cloud_model}</h2>
                    <p className="text-xs text-muted-fg">{t.provider_sub}</p>
                  </div>

                  <div className="bg-surface-2/50 border border-border/40 rounded-xl p-5 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-fg block">{t.cloud_select_label}</label>
                      <select
                        value={selectedCloudProvider}
                        onChange={(e) => setSelectedCloudProvider(e.target.value)}
                        className="w-full h-9 rounded-lg bg-surface border border-border px-3 py-1.5 text-xs font-semibold text-foreground focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30"
                      >
                        <option value="openai">OpenAI (GPT-4o, etc.)</option>
                        <option value="anthropic">Anthropic (Claude 3.5, etc.)</option>
                        <option value="openrouter">OpenRouter (DeepSeek, Llama, etc.)</option>
                        <option value="openai-compatible">Custom (OpenAI Compatible)</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-fg block">{t.cloud_api_key}</label>
                      <Input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="font-mono text-xs h-9"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-fg block">{t.cloud_base_url}</label>
                      <Input
                        value={baseUrl}
                        onChange={(e) => setBaseUrl(e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        className="font-mono text-xs h-9"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: WORKSPACE CONFIG */}
          {step === 3 && (
            <div className="space-y-4 animate-slide-up">
              <div className="space-y-1">
                <h2 className="text-xl font-serif text-foreground">{t.workspace_title}</h2>
                <p className="text-xs text-muted-fg">{t.workspace_sub}</p>
              </div>

              <div className="bg-surface-2/50 border border-border/40 rounded-xl p-5 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-fg block flex items-center gap-1.5">
                    <FolderOpen className="h-4 w-4 text-accent" /> {t.workspace_label}
                  </label>
                  <Input
                    value={workspace}
                    onChange={(e) => {
                      setWorkspace(e.target.value);
                      setWorkspaceStatus("idle");
                    }}
                    placeholder={t.workspace_placeholder}
                    className="font-mono text-xs h-9"
                  />
                </div>

                {workspaceStatus === "checking" && (
                  <div className="flex items-center gap-2 text-xs text-muted-fg font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    Checking directory existence...
                  </div>
                )}

                {workspaceStatus === "ok" && (
                  <div className="flex items-center gap-2 text-xs text-success font-medium bg-success/10 border border-success/20 p-2.5 rounded-lg animate-fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t.workspace_ok}</span>
                  </div>
                )}

                {workspaceStatus === "missing" && (
                  <div className="space-y-3 bg-warning/10 border border-warning/20 p-3 rounded-lg animate-fade-in">
                    <p className="text-xs text-warning leading-snug">{t.workspace_missing}</p>
                    <Button
                      onClick={handleCreateWorkspace}
                      className="bg-accent hover:bg-accent-hover text-white text-xs h-8 px-4 font-semibold"
                    >
                      {t.workspace_create}
                    </Button>
                  </div>
                )}

                {workspaceStatus === "creating" && (
                  <div className="flex items-center gap-2 text-xs text-muted-fg font-medium">
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                    {t.workspace_creating}
                  </div>
                )}

                {workspaceStatus === "created" && (
                  <div className="flex items-center gap-2 text-xs text-success font-medium bg-success/10 border border-success/20 p-2.5 rounded-lg animate-fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{t.workspace_created}</span>
                  </div>
                )}

                {workspaceStatus === "error" && (
                  <div className="flex items-start gap-2 text-xs text-destructive font-medium bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg leading-snug animate-fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{workspaceError || "An error occurred."}</span>
                  </div>
                )}

                {workspaceStatus === "idle" && (
                  <Button
                    onClick={handleCheckWorkspace}
                    className="w-full bg-accent hover:bg-accent-hover text-white text-xs h-9 font-semibold animate-fade-in"
                  >
                    {t.workspace_check}
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* STEP 4: OS MODE SELECTION */}
          {step === 4 && (
            <div className="space-y-5 animate-slide-up">
              <div className="space-y-1">
                <h2 className="text-xl font-serif text-foreground">{t.osmode_title}</h2>
                <p className="text-xs text-muted-fg">{t.osmode_sub}</p>
              </div>

              <div className="bg-surface-2/50 border border-border/40 rounded-xl p-5 space-y-4">
                <div className="flex items-start gap-3">
                  <div className="h-9 w-9 bg-accent/15 border border-accent/20 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <Monitor className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{t.osmode_label}</h3>
                    <p className="text-xs text-muted-fg mt-1.5 leading-relaxed">{t.osmode_desc}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => setOsModeEnabled(true)}
                    className={cn(
                      "py-4 px-3 rounded-lg border text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center gap-1.5",
                      osModeEnabled
                        ? "bg-accent border-accent text-white shadow-md scale-[1.02]"
                        : "bg-surface border-border hover:border-border-hover text-muted-fg"
                    )}
                  >
                    <Cpu className="h-4.5 w-4.5" />
                    {t.osmode_on}
                  </button>
                  <button
                    onClick={() => setOsModeEnabled(false)}
                    className={cn(
                      "py-4 px-3 rounded-lg border text-xs font-bold transition-all duration-200 flex flex-col items-center justify-center gap-1.5",
                      !osModeEnabled
                        ? "bg-accent border-accent text-white shadow-md scale-[1.02]"
                        : "bg-surface border-border hover:border-border-hover text-muted-fg"
                    )}
                  >
                    <Bot className="h-4.5 w-4.5" />
                    {t.osmode_off}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: IMPORT DATA */}
          {step === 5 && (
            <div className="space-y-4 animate-slide-up">
              <div className="space-y-1">
                <h2 className="text-xl font-serif text-foreground">{t.import_title}</h2>
                <p className="text-xs text-muted-fg">{t.import_sub}</p>
              </div>

              <div className="bg-surface-2/50 border border-border/40 rounded-xl p-5 space-y-4">
                <div className="space-y-2">
                  <span className="text-xs font-medium text-foreground block">{t.import_prompt_desc}</span>
                  <pre className="text-[10px] leading-snug text-muted-fg bg-surface border border-border rounded-lg p-2.5 max-h-24 overflow-y-auto scrollbar-thin whitespace-pre-wrap">
                    {exportPrompt}
                  </pre>
                  <Button
                    variant="secondary"
                    onClick={handleCopyPrompt}
                    className="h-8 text-xs font-semibold"
                  >
                    {copiedPrompt ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Database className="h-3.5 w-3.5 mr-1.5" />}
                    {copiedPrompt ? t.import_copied : t.import_copy_btn}
                  </Button>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/30">
                  <label className="text-xs font-medium text-muted-fg block">{t.import_paste_label}</label>
                  <textarea
                    value={pastedData}
                    onChange={(e) => setPastedData(e.target.value)}
                    rows={4}
                    placeholder={t.import_paste_placeholder}
                    className="w-full rounded-lg bg-surface border border-border px-3 py-2 text-xs font-mono text-foreground placeholder:text-muted-fg/40 focus:outline-none focus:border-accent/50 resize-none scrollbar-thin"
                  />
                </div>

                {importStatus === "success" && (
                  <div className="flex items-center gap-2 text-xs text-success font-medium bg-success/10 border border-success/20 p-2.5 rounded-lg animate-fade-in">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span>{importMessage || t.import_success}</span>
                  </div>
                )}

                {importStatus === "error" && (
                  <div className="flex items-center gap-2 text-xs text-destructive font-medium bg-destructive/10 border border-destructive/20 p-2.5 rounded-lg animate-fade-in">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{importMessage || t.import_error}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={handleImport}
                    disabled={importStatus === "busy" || !pastedData.trim()}
                    className="flex-1 bg-accent hover:bg-accent-hover text-white text-xs h-9 font-semibold"
                  >
                    {importStatus === "busy" ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        {t.import_loading}
                      </>
                    ) : (
                      t.import_btn
                    )}
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={nextStep}
                    className="text-xs h-9 font-semibold text-muted-fg hover:text-foreground hover:bg-surface-2"
                  >
                    {t.import_skip}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: READY SCREEN */}
          {step === 6 && (
            <div className="space-y-6 text-center animate-bounce-in">
              <div className="mx-auto h-16 w-16 bg-success/15 border border-success/20 rounded-2xl flex items-center justify-center shadow-lg">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-serif text-foreground bg-gradient-to-r from-foreground via-foreground to-success bg-clip-text">
                  {t.complete_title}
                </h2>
                <p className="text-sm text-muted-fg max-w-sm mx-auto">
                  {t.complete_sub}
                </p>
              </div>

              <div className="max-w-md mx-auto bg-surface-2/40 border border-border/30 rounded-xl p-4 text-left space-y-2 text-xs text-muted-fg">
                <div className="flex justify-between border-b border-border/20 pb-1.5">
                  <span className="font-semibold">{t.steps[0]}:</span>
                  <span className="capitalize font-mono">{languageMeta(languageId).label}</span>
                </div>
                <div className="flex justify-between border-b border-border/20 pb-1.5">
                  <span className="font-semibold">{t.steps[1]}:</span>
                  <span className="font-mono">{isLocal ? "Ollama (Local)" : selectedCloudProvider}</span>
                </div>
                <div className="flex justify-between border-b border-border/20 pb-1.5">
                  <span className="font-semibold">{t.steps[2]}:</span>
                  <span className="font-mono truncate max-w-[200px]">{workspace || "(default)"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold">{t.steps[3]}:</span>
                  <span className="font-mono">{osModeEnabled ? "Ultra OS Mode" : "Traditional Chat"}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer controls */}
        <div className="px-6 py-4 border-t border-border/30 bg-surface-2/40 flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 0}
            className="text-xs h-9 px-4 font-semibold text-muted-fg hover:text-foreground disabled:opacity-30 transition-all duration-150"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t.back}
          </Button>

          {step < 6 ? (
            <Button
              onClick={nextStep}
              className="bg-accent hover:bg-accent-hover text-white text-xs h-9 px-5 font-semibold shadow-md active:scale-95 transition-all duration-150"
            >
              {t.next}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          ) : (
            <Button
              onClick={handleFinish}
              className="bg-gradient-to-r from-accent to-accent-hover hover:shadow-[0_0_15px_rgba(198,97,63,0.4)] text-white text-xs h-9 px-6 font-bold active:scale-95 transition-all duration-200"
            >
              {t.complete_btn}
              <Check className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
