"use client";

import type { LanguageId } from "./preferences";

// =================================================================
// i18n — languages + lightweight UI string table.
// Covers the chrome of the app (menus, settings labels). Chat content
// stays in whatever language the user types.
// =================================================================

export interface LanguageMeta {
  id: LanguageId;
  label: string;
  /** BCP-47 tag for Intl / <html lang>. */
  tag: string;
}

export const LANGUAGES: LanguageMeta[] = [
  { id: "en-US", label: "English (United States)", tag: "en-US" },
  { id: "fr-FR", label: "Fran\u00e7ais (France)", tag: "fr-FR" },
  { id: "de-DE", label: "Deutsch (Deutschland)", tag: "de-DE" },
  { id: "hi-IN", label: "Hindi", tag: "hi-IN" },
  { id: "id-ID", label: "Indonesia", tag: "id-ID" },
  { id: "it-IT", label: "Italiano", tag: "it-IT" },
  { id: "zh-CN", label: "Chinese (\u7b80\u4f53)", tag: "zh-CN" },
  { id: "zh-TW", label: "Mandarin (\u7e41\u9ad4)", tag: "zh-TW" },
  { id: "pt-PT", label: "Portugu\u00eas", tag: "pt-PT" },
  { id: "es-LATAM", label: "Espa\u00f1ol", tag: "es-419" },
  { id: "es-ES", label: "Espa\u00f1ol (Espa\u00f1a)", tag: "es-ES" },
];

export function languageMeta(id: LanguageId): LanguageMeta {
  return LANGUAGES.find((l) => l.id === id) || LANGUAGES[0];
}

type Dict = Record<string, string>;

const en: Dict = {
  "menu.settings": "Settings",
  "menu.language": "Language",
  "menu.newChat": "New chat",
  "menu.projects": "Projects",
  "menu.memory": "Memory",
  "menu.signOut": "Sign out",
  "menu.signIn": "Sign in",
  "set.general": "General",
  "set.themes": "Themes",
  "set.motion": "Motion",
  "set.language": "Language",
  "set.style": "Style",
  "set.notifications": "Notifications",
  "set.account": "Account",
  "set.privacy": "Privacy",
  "set.memoryPrefs": "Memory",
  "set.import": "Import",
  "set.tools": "Tools",
  "set.models": "Models",
  "set.providers": "Providers",
  "not.responseDone": "Response complete",
  "not.clickToView": "Open chat",
};

const fr: Dict = {
  "menu.settings": "Param\u00e8tres",
  "menu.language": "Langue",
  "menu.newChat": "Nouvelle discussion",
  "menu.projects": "Projets",
  "menu.memory": "M\u00e9moire",
  "menu.signOut": "D\u00e9connexion",
  "menu.signIn": "Connexion",
  "set.general": "G\u00e9n\u00e9ral",
  "set.themes": "Th\u00e8mes",
  "set.motion": "Animations",
  "set.language": "Langue",
  "set.style": "Style",
  "set.notifications": "Notifications",
  "set.account": "Compte",
  "set.privacy": "Confidentialit\u00e9",
  "set.memoryPrefs": "M\u00e9moire",
  "set.import": "Importer",
  "set.tools": "Outils",
  "set.models": "Mod\u00e8les",
  "set.providers": "Fournisseurs",
  "not.responseDone": "R\u00e9ponse termin\u00e9e",
  "not.clickToView": "Ouvrir la discussion",
};

const de: Dict = {
  "menu.settings": "Einstellungen",
  "menu.language": "Sprache",
  "menu.newChat": "Neuer Chat",
  "menu.projects": "Projekte",
  "menu.memory": "Ged\u00e4chtnis",
  "menu.signOut": "Abmelden",
  "menu.signIn": "Anmelden",
  "set.general": "Allgemein",
  "set.themes": "Designs",
  "set.motion": "Animationen",
  "set.language": "Sprache",
  "set.style": "Stil",
  "set.notifications": "Benachrichtigungen",
  "set.account": "Konto",
  "set.privacy": "Datenschutz",
  "set.memoryPrefs": "Ged\u00e4chtnis",
  "set.import": "Importieren",
  "set.tools": "Werkzeuge",
  "set.models": "Modelle",
  "set.providers": "Anbieter",
  "not.responseDone": "Antwort abgeschlossen",
  "not.clickToView": "Chat \u00f6ffnen",
};

const es: Dict = {
  "menu.settings": "Configuraci\u00f3n",
  "menu.language": "Idioma",
  "menu.newChat": "Nuevo chat",
  "menu.projects": "Proyectos",
  "menu.memory": "Memoria",
  "menu.signOut": "Cerrar sesi\u00f3n",
  "menu.signIn": "Iniciar sesi\u00f3n",
  "set.general": "General",
  "set.themes": "Temas",
  "set.motion": "Animaciones",
  "set.language": "Idioma",
  "set.style": "Estilo",
  "set.notifications": "Notificaciones",
  "set.account": "Cuenta",
  "set.privacy": "Privacidad",
  "set.memoryPrefs": "Memoria",
  "set.import": "Importar",
  "set.tools": "Herramientas",
  "set.models": "Modelos",
  "set.providers": "Proveedores",
  "not.responseDone": "Respuesta completada",
  "not.clickToView": "Abrir chat",
};

const it: Dict = {
  "menu.settings": "Impostazioni",
  "menu.language": "Lingua",
  "menu.newChat": "Nuova chat",
  "menu.projects": "Progetti",
  "menu.memory": "Memoria",
  "menu.signOut": "Esci",
  "menu.signIn": "Accedi",
  "set.general": "Generale",
  "set.themes": "Temi",
  "set.motion": "Animazioni",
  "set.language": "Lingua",
  "set.style": "Stile",
  "set.notifications": "Notifiche",
  "set.account": "Account",
  "set.privacy": "Privacy",
  "set.memoryPrefs": "Memoria",
  "set.import": "Importa",
  "set.tools": "Strumenti",
  "set.models": "Modelli",
  "set.providers": "Provider",
  "not.responseDone": "Risposta completata",
  "not.clickToView": "Apri chat",
};

const pt: Dict = {
  "menu.settings": "Defini\u00e7\u00f5es",
  "menu.language": "Idioma",
  "menu.newChat": "Nova conversa",
  "menu.projects": "Projetos",
  "menu.memory": "Mem\u00f3ria",
  "menu.signOut": "Terminar sess\u00e3o",
  "menu.signIn": "Iniciar sess\u00e3o",
  "set.general": "Geral",
  "set.themes": "Temas",
  "set.motion": "Anima\u00e7\u00f5es",
  "set.language": "Idioma",
  "set.style": "Estilo",
  "set.notifications": "Notifica\u00e7\u00f5es",
  "set.account": "Conta",
  "set.privacy": "Privacidade",
  "set.memoryPrefs": "Mem\u00f3ria",
  "set.import": "Importar",
  "set.tools": "Ferramentas",
  "set.models": "Modelos",
  "set.providers": "Fornecedores",
  "not.responseDone": "Resposta conclu\u00edda",
  "not.clickToView": "Abrir conversa",
};

const DICTS: Partial<Record<LanguageId, Dict>> = {
  "en-US": en,
  "fr-FR": fr,
  "de-DE": de,
  "es-LATAM": es,
  "es-ES": es,
  "it-IT": it,
  "pt-PT": pt,
};

export function t(key: string, lang: LanguageId): string {
  const d = DICTS[lang] || en;
  return d[key] ?? en[key] ?? key;
}
