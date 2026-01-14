import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X, Check, Share, Plus, MoreVertical, Download, Info, ExternalLink, AlertTriangle } from "lucide-react";

type DeviceType = "ios" | "android" | "desktop";
type BrowserType = "safari" | "chrome" | "firefox" | "edge" | "samsung" | "opera" | "brave" | "duckduckgo" | "instagram" | "facebook" | "other";

interface Step {
  title: string;
  description: string;
}

interface DeviceBrowserConfig {
  steps: Step[];
  label: string;
  isInAppBrowser?: boolean;
}

// iOS Safari
const iosSafariSteps: Step[] = [
  { title: "Toque no ícone Compartilhar", description: "Na barra inferior do Safari, toque no ícone de compartilhar" },
  { title: "Adicionar à Tela de Início", description: "Role o menu e toque em \"Adicionar à Tela de Início\"" },
  { title: "Confirme a instalação", description: "Toque em \"Adicionar\" no canto superior direito" },
];

// iOS Chrome (same for Brave, Opera on iOS)
const iosChromeSteps: Step[] = [
  { title: "Toque no ícone Compartilhar", description: "No topo da tela, perto do nome do site" },
  { title: "Role o menu para baixo", description: "Procure a opção \"Adicionar à Tela de Início\"" },
  { title: "Confirme a instalação", description: "Toque em \"Adicionar\" para confirmar" },
];

// iOS Firefox
const iosFirefoxSteps: Step[] = [
  { title: "Toque no menu (três linhas)", description: "No canto inferior direito do Firefox" },
  { title: "Toque em \"Compartilhar\"", description: "No menu que aparecer" },
  { title: "Adicionar à Tela de Início", description: "Role e toque em \"Adicionar à Tela de Início\"" },
];

// iOS DuckDuckGo
const iosDuckDuckGoSteps: Step[] = [
  { title: "Toque no ícone de compartilhar", description: "Na barra inferior do DuckDuckGo" },
  { title: "Toque em \"Adicionar à Tela de Início\"", description: "Role o menu e encontre essa opção" },
  { title: "Confirme a instalação", description: "Toque em \"Adicionar\" para confirmar" },
];

// In-App Browser (Instagram, Facebook) steps
const inAppBrowserSteps: Step[] = [
  { title: "Toque nos três pontinhos", description: "No canto superior direito da tela" },
  { title: "Abra no navegador externo", description: "Toque em \"Abrir no navegador\" ou similar" },
  { title: "Continue no navegador", description: "O site abrirá no Safari/Chrome, siga o tutorial normal" },
];

// Android Chrome
const androidChromeSteps: Step[] = [
  { title: "Toque nos três pontinhos", description: "No canto superior direito do Chrome" },
  { title: "Toque em \"Instalar app\"", description: "No menu que aparecer, procure por \"Instalar app\"" },
  { title: "Confirme a instalação", description: "Toque em \"Instalar\" no popup de confirmação" },
];

// Android Samsung Internet
const androidSamsungSteps: Step[] = [
  { title: "Toque no menu (três linhas)", description: "No canto inferior direito do Samsung Internet" },
  { title: "Toque em \"Adicionar página a\"", description: "Role o menu e encontre essa opção" },
  { title: "Selecione \"Tela inicial\"", description: "Confirme para adicionar o ícone" },
];

// Android Firefox
const androidFirefoxSteps: Step[] = [
  { title: "Toque nos três pontinhos", description: "No canto superior direito do Firefox" },
  { title: "Toque em \"Instalar\"", description: "Procure a opção \"Instalar\" no menu" },
  { title: "Confirme a instalação", description: "Toque em \"Adicionar\" para confirmar" },
];

// Android Opera
const androidOperaSteps: Step[] = [
  { title: "Toque no ícone do Opera", description: "No canto inferior direito (ícone vermelho)" },
  { title: "Toque em \"Adicionar à tela inicial\"", description: "Role o menu e encontre essa opção" },
  { title: "Confirme a instalação", description: "Toque em \"Adicionar\" para confirmar" },
];

// Android Brave
const androidBraveSteps: Step[] = [
  { title: "Toque nos três pontinhos", description: "No canto inferior direito do Brave" },
  { title: "Toque em \"Instalar app\"", description: "No menu que aparecer, procure por \"Instalar app\"" },
  { title: "Confirme a instalação", description: "Toque em \"Instalar\" no popup de confirmação" },
];

// Android DuckDuckGo
const androidDuckDuckGoSteps: Step[] = [
  { title: "Toque nos três pontinhos", description: "No canto superior direito do DuckDuckGo" },
  { title: "Toque em \"Adicionar à Tela Inicial\"", description: "Role o menu e encontre essa opção" },
  { title: "Confirme a instalação", description: "Toque em \"Adicionar\" para confirmar" },
];

// Desktop Chrome
const desktopChromeSteps: Step[] = [
  { title: "Clique no ícone de instalação", description: "Na barra de endereço do Chrome, à direita" },
  { title: "Clique em \"Instalar\"", description: "No popup que aparecer, confirme a instalação" },
  { title: "Pronto!", description: "O app será instalado e abrirá automaticamente" },
];

// Desktop Edge
const desktopEdgeSteps: Step[] = [
  { title: "Clique nos três pontinhos", description: "No canto superior direito do Edge" },
  { title: "Vá em \"Apps\" > \"Instalar este site como app\"", description: "Ou clique no ícone na barra de endereço" },
  { title: "Confirme a instalação", description: "Clique em \"Instalar\" no popup" },
];

// Desktop Firefox (limited PWA support)
const desktopFirefoxSteps: Step[] = [
  { title: "Firefox tem suporte limitado", description: "Recomendamos usar Chrome ou Edge para melhor experiência" },
  { title: "Adicione aos favoritos", description: "Pressione Ctrl+D para salvar nos favoritos" },
  { title: "Acesse facilmente", description: "Use os favoritos para acessar rapidamente" },
];

// Desktop Opera
const desktopOperaSteps: Step[] = [
  { title: "Clique no ícone de instalação", description: "Na barra de endereço do Opera, à direita" },
  { title: "Clique em \"Instalar\"", description: "No popup que aparecer, confirme a instalação" },
  { title: "Pronto!", description: "O app será instalado e abrirá automaticamente" },
];

// Desktop Brave
const desktopBraveSteps: Step[] = [
  { title: "Clique no ícone de instalação", description: "Na barra de endereço do Brave, à direita" },
  { title: "Clique em \"Instalar\"", description: "No popup que aparecer, confirme a instalação" },
  { title: "Pronto!", description: "O app será instalado e abrirá automaticamente" },
];

// Desktop DuckDuckGo (limited support)
const desktopDuckDuckGoSteps: Step[] = [
  { title: "DuckDuckGo tem suporte limitado", description: "Recomendamos usar Chrome ou Edge para instalar" },
  { title: "Adicione aos favoritos", description: "Pressione Ctrl+D (ou Cmd+D no Mac)" },
  { title: "Acesse facilmente", description: "Use os favoritos para acessar rapidamente" },
];

function detectInAppBrowser(): BrowserType | null {
  const ua = navigator.userAgent.toLowerCase();
  
  // Check for Instagram in-app browser
  if (ua.includes("instagram")) return "instagram";
  // Check for Facebook in-app browser
  if (ua.includes("fban") || ua.includes("fbav") || ua.includes("fb_iab")) return "facebook";
  // Check for other common in-app browsers
  if (ua.includes("line/") || ua.includes("twitter") || ua.includes("tiktok")) return "instagram"; // treat similar
  
  return null;
}

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  
  // First check for in-app browsers
  const inAppBrowser = detectInAppBrowser();
  if (inAppBrowser) return inAppBrowser;
  
  // Check for DuckDuckGo first
  if (ua.includes("duckduckgo")) return "duckduckgo";
  // Check for Brave (has "brave" in ua on some versions, or check for brave object)
  if (ua.includes("brave") || (navigator as any).brave) return "brave";
  // Check for Opera (includes "opr/" or "opera")
  if (ua.includes("opr/") || ua.includes("opera")) return "opera";
  // Check for Samsung Internet (it also includes "chrome" in UA)
  if (ua.includes("samsungbrowser")) return "samsung";
  // Check for Edge (it also includes "chrome" in UA)
  if (ua.includes("edg/") || ua.includes("edge")) return "edge";
  // Check for Firefox
  if (ua.includes("firefox") || ua.includes("fxios")) return "firefox";
  // Check for Chrome (includes CriOS for iOS Chrome)
  if (ua.includes("chrome") || ua.includes("crios")) return "chrome";
  // Check for Safari (must be after Chrome check since Chrome includes "safari" in UA)
  if (ua.includes("safari") && !ua.includes("chrome")) return "safari";
  
  return "other";
}

function detectDevice(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  
  if (/ipad|iphone|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function getStepsForConfig(device: DeviceType, browser: BrowserType, t: (key: string) => string): DeviceBrowserConfig {
  // Check for in-app browsers first (Instagram, Facebook, etc.)
  if (browser === "instagram" || browser === "facebook") {
    const label = browser === "instagram" ? t('installTutorial.browsers.instagram') : t('installTutorial.browsers.facebook');
    return { 
      steps: [
        { title: t('installTutorial.steps.inApp.step1Title'), description: t('installTutorial.steps.inApp.step1Desc') },
        { title: t('installTutorial.steps.inApp.step2Title'), description: t('installTutorial.steps.inApp.step2Desc') },
        { title: t('installTutorial.steps.inApp.step3Title'), description: t('installTutorial.steps.inApp.step3Desc') },
      ], 
      label,
      isInAppBrowser: true
    };
  }

  if (device === "ios") {
    if (browser === "chrome" || browser === "brave" || browser === "opera") {
      const browserName = browser === "chrome" ? "Chrome" : browser === "brave" ? "Brave" : "Opera";
      return { 
        steps: [
          { title: t('installTutorial.steps.ios.chrome.step1Title'), description: t('installTutorial.steps.ios.chrome.step1Desc') },
          { title: t('installTutorial.steps.ios.chrome.step2Title'), description: t('installTutorial.steps.ios.chrome.step2Desc') },
          { title: t('installTutorial.steps.ios.chrome.step3Title'), description: t('installTutorial.steps.ios.chrome.step3Desc') },
        ], 
        label: `${browserName} no iPhone` 
      };
    }
    if (browser === "firefox") return { 
      steps: [
        { title: t('installTutorial.steps.ios.safari.step1Title'), description: t('installTutorial.steps.ios.safari.step1Desc') },
        { title: t('installTutorial.steps.ios.safari.step2Title'), description: t('installTutorial.steps.ios.safari.step2Desc') },
        { title: t('installTutorial.steps.ios.safari.step3Title'), description: t('installTutorial.steps.ios.safari.step3Desc') },
      ], 
      label: t('installTutorial.browsers.firefoxIphone') 
    };
    if (browser === "duckduckgo") return { 
      steps: [
        { title: t('installTutorial.steps.ios.safari.step1Title'), description: t('installTutorial.steps.ios.safari.step1Desc') },
        { title: t('installTutorial.steps.ios.safari.step2Title'), description: t('installTutorial.steps.ios.safari.step2Desc') },
        { title: t('installTutorial.steps.ios.safari.step3Title'), description: t('installTutorial.steps.ios.safari.step3Desc') },
      ], 
      label: t('installTutorial.browsers.duckduckgoIphone') 
    };
    return { 
      steps: [
        { title: t('installTutorial.steps.ios.safari.step1Title'), description: t('installTutorial.steps.ios.safari.step1Desc') },
        { title: t('installTutorial.steps.ios.safari.step2Title'), description: t('installTutorial.steps.ios.safari.step2Desc') },
        { title: t('installTutorial.steps.ios.safari.step3Title'), description: t('installTutorial.steps.ios.safari.step3Desc') },
      ], 
      label: t('installTutorial.browsers.safariIphone') 
    };
  }
  
  if (device === "android") {
    if (browser === "samsung") return { 
      steps: [
        { title: t('installTutorial.steps.android.chrome.step1Title'), description: t('installTutorial.steps.android.chrome.step1Desc') },
        { title: t('installTutorial.steps.android.chrome.step2Title'), description: t('installTutorial.steps.android.chrome.step2Desc') },
        { title: t('installTutorial.steps.android.chrome.step3Title'), description: t('installTutorial.steps.android.chrome.step3Desc') },
      ], 
      label: t('installTutorial.browsers.samsungInternet') 
    };
    if (browser === "firefox") return { 
      steps: [
        { title: t('installTutorial.steps.android.chrome.step1Title'), description: t('installTutorial.steps.android.chrome.step1Desc') },
        { title: t('installTutorial.steps.android.chrome.step2Title'), description: t('installTutorial.steps.android.chrome.step2Desc') },
        { title: t('installTutorial.steps.android.chrome.step3Title'), description: t('installTutorial.steps.android.chrome.step3Desc') },
      ], 
      label: t('installTutorial.browsers.firefoxAndroid') 
    };
    if (browser === "opera") return { 
      steps: [
        { title: t('installTutorial.steps.android.chrome.step1Title'), description: t('installTutorial.steps.android.chrome.step1Desc') },
        { title: t('installTutorial.steps.android.chrome.step2Title'), description: t('installTutorial.steps.android.chrome.step2Desc') },
        { title: t('installTutorial.steps.android.chrome.step3Title'), description: t('installTutorial.steps.android.chrome.step3Desc') },
      ], 
      label: t('installTutorial.browsers.operaAndroid') 
    };
    if (browser === "brave") return { 
      steps: [
        { title: t('installTutorial.steps.android.chrome.step1Title'), description: t('installTutorial.steps.android.chrome.step1Desc') },
        { title: t('installTutorial.steps.android.chrome.step2Title'), description: t('installTutorial.steps.android.chrome.step2Desc') },
        { title: t('installTutorial.steps.android.chrome.step3Title'), description: t('installTutorial.steps.android.chrome.step3Desc') },
      ], 
      label: t('installTutorial.browsers.braveAndroid') 
    };
    if (browser === "duckduckgo") return { 
      steps: [
        { title: t('installTutorial.steps.android.chrome.step1Title'), description: t('installTutorial.steps.android.chrome.step1Desc') },
        { title: t('installTutorial.steps.android.chrome.step2Title'), description: t('installTutorial.steps.android.chrome.step2Desc') },
        { title: t('installTutorial.steps.android.chrome.step3Title'), description: t('installTutorial.steps.android.chrome.step3Desc') },
      ], 
      label: t('installTutorial.browsers.duckduckgoAndroid') 
    };
    return { 
      steps: [
        { title: t('installTutorial.steps.android.chrome.step1Title'), description: t('installTutorial.steps.android.chrome.step1Desc') },
        { title: t('installTutorial.steps.android.chrome.step2Title'), description: t('installTutorial.steps.android.chrome.step2Desc') },
        { title: t('installTutorial.steps.android.chrome.step3Title'), description: t('installTutorial.steps.android.chrome.step3Desc') },
      ], 
      label: t('installTutorial.browsers.chromeAndroid') 
    };
  }
  
  // Desktop
  if (browser === "edge") return { 
    steps: [
      { title: t('installTutorial.steps.desktop.chrome.step1Title'), description: t('installTutorial.steps.desktop.chrome.step1Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step2Title'), description: t('installTutorial.steps.desktop.chrome.step2Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step3Title'), description: t('installTutorial.steps.desktop.chrome.step3Desc') },
    ], 
    label: t('installTutorial.browsers.edgeDesktop') 
  };
  if (browser === "firefox") return { 
    steps: [
      { title: t('installTutorial.steps.desktop.chrome.step1Title'), description: t('installTutorial.steps.desktop.chrome.step1Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step2Title'), description: t('installTutorial.steps.desktop.chrome.step2Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step3Title'), description: t('installTutorial.steps.desktop.chrome.step3Desc') },
    ], 
    label: t('installTutorial.browsers.firefoxDesktop') 
  };
  if (browser === "opera") return { 
    steps: [
      { title: t('installTutorial.steps.desktop.chrome.step1Title'), description: t('installTutorial.steps.desktop.chrome.step1Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step2Title'), description: t('installTutorial.steps.desktop.chrome.step2Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step3Title'), description: t('installTutorial.steps.desktop.chrome.step3Desc') },
    ], 
    label: "Opera" 
  };
  if (browser === "brave") return { 
    steps: [
      { title: t('installTutorial.steps.desktop.chrome.step1Title'), description: t('installTutorial.steps.desktop.chrome.step1Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step2Title'), description: t('installTutorial.steps.desktop.chrome.step2Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step3Title'), description: t('installTutorial.steps.desktop.chrome.step3Desc') },
    ], 
    label: "Brave" 
  };
  if (browser === "duckduckgo") return { 
    steps: [
      { title: t('installTutorial.steps.desktop.chrome.step1Title'), description: t('installTutorial.steps.desktop.chrome.step1Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step2Title'), description: t('installTutorial.steps.desktop.chrome.step2Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step3Title'), description: t('installTutorial.steps.desktop.chrome.step3Desc') },
    ], 
    label: "DuckDuckGo" 
  };
  return { 
    steps: [
      { title: t('installTutorial.steps.desktop.chrome.step1Title'), description: t('installTutorial.steps.desktop.chrome.step1Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step2Title'), description: t('installTutorial.steps.desktop.chrome.step2Desc') },
      { title: t('installTutorial.steps.desktop.chrome.step3Title'), description: t('installTutorial.steps.desktop.chrome.step3Desc') },
    ], 
    label: t('installTutorial.browsers.chromeDesktop') 
  };
}

// iOS Safari Mockup
const IOSMockup = ({ step }: { step: number }) => (
  <div className="relative w-full max-w-[280px] mx-auto">
    {/* iPhone Frame */}
    <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
      {/* Screen */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-[2rem] overflow-hidden">
        {/* Status Bar */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <div className="w-20 h-4 bg-gray-900 rounded-full" />
        </div>
        
        {/* Safari Content */}
        <div className="h-[320px] bg-white dark:bg-gray-900 relative">
          {/* URL Bar */}
          <div className="h-10 bg-gray-100 dark:bg-gray-800 flex items-center px-3 gap-2">
            <div className="flex-1 bg-white dark:bg-gray-700 rounded-lg h-7 flex items-center px-2">
              <span className="text-[10px] text-gray-500 truncate">arcanoapp.voxvisual.com.br</span>
            </div>
          </div>
          
          {/* Page Content Placeholder */}
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          
          {/* Share Menu Overlay - Step 2 */}
          {step === 1 && (
            <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-lg p-4 animate-slide-up">
              <div className="flex gap-4 overflow-x-auto pb-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
                    <span className="text-white text-lg">M</span>
                  </div>
                  <span className="text-[8px]">Mensagens</span>
                </div>
                <div className="flex flex-col items-center gap-1 min-w-[60px]">
                  <div className="w-12 h-12 bg-green-500 rounded-xl" />
                  <span className="text-[8px]">WhatsApp</span>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-lg relative">
                  <Plus className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Adicionar à Tela de Início</span>
                  {/* Pulse indicator */}
                  <div className="absolute -right-1 -top-1">
                    <span className="relative flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-2">
                  <div className="h-5 w-5 bg-gray-300 rounded" />
                  <span className="text-sm text-gray-500">Copiar</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Add to Home Popup - Step 3 */}
          {step === 2 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-xl w-[90%] p-4 shadow-xl">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">A</span>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">ArcanoApp</p>
                    <p className="text-[10px] text-gray-500">arcanoapp.voxvisual...</p>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <button className="px-4 py-2 text-sm text-gray-500">Cancelar</button>
                  <button className="px-4 py-2 text-sm text-primary font-semibold relative">
                    Adicionar
                    {/* Pulse indicator */}
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Safari Bottom Bar */}
        <div className="h-12 bg-gray-100 dark:bg-gray-800 flex items-center justify-around px-4 border-t border-gray-200 dark:border-gray-700">
          <ChevronLeft className="h-5 w-5 text-primary" />
          <ChevronRight className="h-5 w-5 text-gray-400" />
          <div className="relative">
            <Share className="h-5 w-5 text-primary" />
            {/* Pulse indicator for Step 1 */}
            {step === 0 && (
              <>
                <span className="absolute -right-2 -top-2 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                {/* Animated Arrow */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce-arrow">
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-red-500" />
                </div>
              </>
            )}
          </div>
          <div className="w-5 h-5 border border-primary rounded" />
          <div className="flex gap-0.5">
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
            <div className="w-1.5 h-1.5 bg-primary rounded-full" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

// iOS Chrome Mockup - Share button at TOP, opens iOS share sheet
const IOSChromeMockup = ({ step }: { step: number }) => (
  <div className="relative w-full max-w-[280px] mx-auto">
    {/* iPhone Frame */}
    <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
      {/* Screen */}
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden">
        {/* Status Bar */}
        <div className="h-6 bg-gray-100 dark:bg-gray-800 flex items-center justify-between px-6">
          <span className="text-[10px] text-gray-600 font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 bg-gray-600 rounded-sm" />
          </div>
        </div>
        
        {/* Chrome Top Bar with URL and Share */}
        <div className="bg-gray-100 dark:bg-gray-800 px-3 py-2 flex items-center gap-2">
          <ChevronLeft className="h-5 w-5 text-blue-500 flex-shrink-0" />
          {/* URL Bar */}
          <div className="flex-1 bg-white dark:bg-gray-700 rounded-full h-8 flex items-center px-3 gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0" />
            <span className="text-[10px] text-gray-600 dark:text-gray-400 truncate">arcanoapp.voxvisual.com.br</span>
          </div>
          {/* Share Button - Highlighted on step 0 */}
          <div className="relative">
            <Share className="h-5 w-5 text-blue-500" />
            {step === 0 && (
              <>
                <span className="absolute -right-1 -top-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                {/* Animated Arrow pointing down */}
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-red-500" />
                </div>
              </>
            )}
          </div>
          <Plus className="h-5 w-5 text-blue-500 flex-shrink-0" />
        </div>
        
        {/* Chrome Content Area */}
        <div className="h-[280px] bg-white dark:bg-gray-900 relative">
          {/* Page Content Placeholder */}
          <div className="p-4 space-y-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded mt-4" />
          </div>
          
          {/* iOS Share Sheet - Step 2 (scroll to find option) */}
          {step === 1 && (
            <div className="absolute inset-0 bg-black/40">
              <div className="absolute bottom-0 left-0 right-0 bg-gray-100 dark:bg-gray-800 rounded-t-xl animate-slide-up">
                {/* Drag Handle */}
                <div className="w-10 h-1 bg-gray-400 rounded-full mx-auto mt-2" />
                
                {/* Site Info Header */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">A</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">ArcanoApp</p>
                    <p className="text-[10px] text-gray-500">arcanoapp.voxvisual.com.br</p>
                  </div>
                  <X className="h-5 w-5 text-gray-400" />
                </div>
                
                {/* Share Options - AirDrop, Messages, etc */}
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex gap-3 overflow-x-auto pb-1">
                    <div className="flex flex-col items-center gap-1 min-w-[50px]">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[10px]">📡</span>
                      </div>
                      <span className="text-[8px] text-gray-600">AirDrop</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 min-w-[50px]">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[10px]">💬</span>
                      </div>
                      <span className="text-[8px] text-gray-600">Mensagens</span>
                    </div>
                    <div className="flex flex-col items-center gap-1 min-w-[50px]">
                      <div className="w-10 h-10 bg-blue-400 rounded-full flex items-center justify-center">
                        <span className="text-white text-[10px]">✉️</span>
                      </div>
                      <span className="text-[8px] text-gray-600">E-mail</span>
                    </div>
                  </div>
                </div>
                
                {/* List Options - with scroll indicator */}
                <div className="bg-white dark:bg-gray-700 rounded-lg mx-2 mt-2 mb-2">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-600">
                    <span className="text-xs text-gray-900 dark:text-white">Copiar</span>
                    <div className="w-4 h-4 bg-gray-300 rounded" />
                  </div>
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs text-gray-900 dark:text-white">Adicionar à Lista de leitura</span>
                    <div className="w-4 h-4 bg-gray-300 rounded" />
                  </div>
                </div>
                
                {/* Enhanced Scroll indicator with animation */}
                <div className="flex flex-col items-center gap-1 py-2">
                  <div className="relative h-6 w-4 border-2 border-red-400 rounded-full flex justify-center">
                    <div className="w-1 h-1.5 bg-red-500 rounded-full mt-1 animate-[scrollDown_1.5s_ease-in-out_infinite]" />
                  </div>
                  <div className="flex items-center gap-1">
                    <ChevronRight className="h-3 w-3 rotate-90 text-red-500 animate-bounce" />
                    <span className="text-[10px] text-red-500 font-semibold">Role para baixo</span>
                    <ChevronRight className="h-3 w-3 rotate-90 text-red-500 animate-bounce" />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* iOS Share Sheet Scrolled - Step 3 (showing Add to Home Screen) */}
          {step === 2 && (
            <div className="absolute inset-0 bg-black/40">
              <div className="absolute bottom-0 left-0 right-0 bg-gray-100 dark:bg-gray-800 rounded-t-xl animate-fade-in">
                {/* Drag Handle */}
                <div className="w-10 h-1 bg-gray-400 rounded-full mx-auto mt-2" />
                
                {/* Site Info Header */}
                <div className="flex items-center gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
                  <div className="w-10 h-10 bg-gray-300 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                    <span className="text-xs font-bold text-gray-600">A</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-medium text-gray-900 dark:text-white">ArcanoApp</p>
                    <p className="text-[10px] text-gray-500">arcanoapp.voxvisual.com.br</p>
                  </div>
                  <X className="h-5 w-5 text-gray-400" />
                </div>
                
                {/* Options after scrolling */}
                <div className="bg-white dark:bg-gray-700 rounded-lg mx-2 mt-2 mb-2">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-600">
                    <span className="text-xs text-gray-900 dark:text-white">Adicionar aos favoritos</span>
                    <div className="w-4 h-4 text-gray-400">⭐</div>
                  </div>
                  <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-600">
                    <span className="text-xs text-gray-900 dark:text-white">Buscar na página</span>
                    <div className="w-4 h-4 text-gray-400">🔍</div>
                  </div>
                </div>
                
                {/* Add to Home Screen - Highlighted */}
                <div className="bg-white dark:bg-gray-700 rounded-lg mx-2 mb-2 relative">
                  <div className="flex items-center justify-between px-3 py-3 bg-primary/10 rounded-lg border-2 border-primary">
                    <span className="text-xs font-semibold text-primary">Adicionar à Tela de Início</span>
                    <Plus className="h-4 w-4 text-primary" />
                    {/* Pulse indicator */}
                    <span className="absolute -right-1 -top-1 flex h-4 w-4">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                    </span>
                  </div>
                </div>
                
                <div className="bg-white dark:bg-gray-700 rounded-lg mx-2 mb-3">
                  <div className="flex items-center justify-between px-3 py-2">
                    <span className="text-xs text-gray-900 dark:text-white">Imprimir</span>
                    <div className="w-4 h-4 text-gray-400">🖨️</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Chrome Bottom Navigation */}
        <div className="h-12 bg-gray-100 dark:bg-gray-800 flex items-center justify-around px-6 border-t border-gray-200 dark:border-gray-700">
          <ChevronLeft className="h-5 w-5 text-gray-400" />
          <ChevronRight className="h-5 w-5 text-gray-400" />
          <div className="w-6 h-6 border-2 border-blue-500 rounded flex items-center justify-center">
            <span className="text-[10px] text-blue-500 font-bold">2</span>
          </div>
          <MoreVertical className="h-5 w-5 text-gray-600" />
        </div>
        
        {/* Home Indicator */}
        <div className="h-5 bg-white dark:bg-gray-900 flex items-center justify-center">
          <div className="w-32 h-1 bg-gray-900 dark:bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

// In-App Browser Mockup (Instagram, Facebook, etc.)
const InAppBrowserMockup = ({ step }: { step: number }) => (
  <div className="relative w-full max-w-[280px] mx-auto">
    {/* iPhone Frame */}
    <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
      {/* Screen */}
      <div className="bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden">
        {/* Status Bar */}
        <div className="h-6 bg-gray-100 dark:bg-gray-800 flex items-center justify-between px-6">
          <span className="text-[10px] text-gray-600 font-medium">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 bg-gray-600 rounded-sm" />
          </div>
        </div>
        
        {/* In-App Browser Header (Instagram style) */}
        <div className="bg-white dark:bg-gray-900 px-3 py-2 flex items-center justify-between border-b border-gray-200 dark:border-gray-700">
          <X className="h-5 w-5 text-gray-800 dark:text-white" />
          <div className="flex-1 text-center">
            <p className="text-[10px] text-gray-600">arcanoapp.voxvisual.com.br</p>
            <p className="text-[8px] text-pink-500">Instagram</p>
          </div>
          <div className="relative">
            <MoreVertical className="h-5 w-5 text-gray-800 dark:text-white" />
            {step === 0 && (
              <>
                <span className="absolute -right-1 -top-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-red-500" />
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Content Area */}
        <div className="h-[280px] bg-gray-50 dark:bg-gray-800 relative">
          {/* Page Content Placeholder */}
          <div className="p-4 space-y-3">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mt-4" />
          </div>
          
          {/* Menu Dropdown - Step 2 */}
          {step === 1 && (
            <div className="absolute top-0 right-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 animate-scale-in w-48">
              <div className="py-1">
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Share className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Compartilhar</span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 bg-primary/10 relative">
                  <ExternalLink className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium text-primary">Abrir no navegador</span>
                  <span className="absolute -right-1 -top-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Plus className="h-4 w-4 text-gray-600" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Copiar link</span>
                </div>
              </div>
            </div>
          )}
          
          {/* Success Message - Step 3 */}
          {step === 2 && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mx-4 text-center shadow-xl">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="font-bold text-lg mb-2">Abrindo no navegador...</h3>
                <p className="text-sm text-gray-500 mb-4">O site abrirá no Safari ou Chrome.<br/>Siga o tutorial normal para instalar.</p>
                <div className="flex gap-2 justify-center">
                  <span className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-xs font-medium">Safari</span>
                  <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-medium">Chrome</span>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Bottom Navigation (Instagram style) */}
        <div className="h-12 bg-white dark:bg-gray-900 flex items-center justify-around px-6 border-t border-gray-200 dark:border-gray-700">
          <ChevronLeft className="h-5 w-5 text-gray-600" />
          <ChevronRight className="h-5 w-5 text-gray-400" />
          <Share className="h-5 w-5 text-gray-600" />
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-pink-500 to-yellow-500" />
        </div>
        
        {/* Home Indicator */}
        <div className="h-5 bg-white dark:bg-gray-900 flex items-center justify-center">
          <div className="w-32 h-1 bg-gray-900 dark:bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

// Android Chrome Mockup
const AndroidMockup = ({ step }: { step: number }) => (
  <div className="relative w-full max-w-[280px] mx-auto">
    {/* Android Frame */}
    <div className="bg-gray-900 rounded-[1.5rem] p-1.5 shadow-2xl">
      {/* Screen */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-[1.25rem] overflow-hidden">
        {/* Chrome Tab Bar */}
        <div className="h-10 bg-gray-200 dark:bg-gray-700 flex items-center px-2 gap-2">
          <div className="flex-1 bg-white dark:bg-gray-600 rounded-full h-7 flex items-center px-3">
            <span className="text-[10px] text-gray-500 truncate">arcanoapp.voxvisual.com.br</span>
          </div>
          <div className="relative">
            <MoreVertical className="h-5 w-5 text-gray-600 dark:text-gray-300" />
            {/* Pulse indicator for Step 1 */}
            {step === 0 && (
              <>
                <span className="absolute -right-1 -top-1 flex h-4 w-4">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500"></span>
                </span>
                {/* Animated Arrow */}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 animate-bounce-arrow">
                  <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-red-500" />
                </div>
              </>
            )}
          </div>
        </div>
        
        {/* Page Content */}
        <div className="h-[320px] bg-white dark:bg-gray-900 relative">
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          
          {/* Chrome Menu Dropdown - Step 1 transition to Step 2 */}
          {step === 1 && (
            <div className="absolute top-0 right-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-48 animate-slide-down">
              <div className="py-2">
                <div className="px-4 py-2 text-sm text-gray-500">Nova guia</div>
                <div className="px-4 py-2 text-sm text-gray-500">Nova guia anônima</div>
                <div className="px-4 py-2 text-sm text-gray-500">Favoritos</div>
                <div className="px-4 py-2 text-sm font-medium relative bg-primary/10 text-primary flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Instalar app
                  {/* Pulse indicator */}
                  <span className="absolute right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
                <div className="px-4 py-2 text-sm text-gray-500">Downloads</div>
              </div>
            </div>
          )}
          
          {/* Install Popup - Step 3 */}
          {step === 2 && (
            <div className="absolute inset-0 bg-black/50 flex items-end animate-fade-in">
              <div className="bg-white dark:bg-gray-800 rounded-t-2xl w-full p-4 shadow-xl animate-slide-up">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold">A</span>
                  </div>
                  <div>
                    <p className="font-semibold">Instalar ArcanoApp?</p>
                    <p className="text-xs text-gray-500">arcanoapp.voxvisual.com.br</p>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button className="px-6 py-2 text-sm text-gray-500">Cancelar</button>
                  <button className="px-6 py-2 text-sm bg-primary text-white rounded-full font-semibold relative">
                    Instalar
                    {/* Pulse indicator */}
                    <span className="absolute -right-1 -top-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Android Navigation Bar */}
        <div className="h-10 bg-gray-100 dark:bg-gray-800 flex items-center justify-center gap-16">
          <div className="w-4 h-4 border-2 border-gray-400 rounded" />
          <div className="w-4 h-4 bg-gray-400 rounded-full" />
          <div className="w-0 h-0 border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent border-r-[10px] border-r-gray-400" />
        </div>
      </div>
    </div>
  </div>
);

// Desktop Chrome Mockup
const DesktopMockup = ({ step, browser }: { step: number; browser: BrowserType }) => (
  <div className="relative w-full max-w-[400px] mx-auto">
    {/* Browser Window */}
    <div className="bg-gray-200 dark:bg-gray-700 rounded-lg shadow-2xl overflow-hidden">
      {/* Title Bar */}
      <div className="h-8 bg-gray-300 dark:bg-gray-600 flex items-center px-3 gap-2">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 bg-red-500 rounded-full" />
          <div className="w-3 h-3 bg-yellow-500 rounded-full" />
          <div className="w-3 h-3 bg-green-500 rounded-full" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-500 rounded-md h-5 w-64 flex items-center px-2 gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span className="text-[10px] text-gray-500 dark:text-gray-300">arcanoapp.voxvisual.com.br</span>
            <div className="ml-auto relative">
              <Download className="h-3 w-3 text-gray-400" />
              {/* Pulse indicator for Step 1 */}
              {step === 0 && (
                <>
                  <span className="absolute -right-1 -top-1 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                  {/* Animated Arrow */}
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 animate-bounce-arrow">
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[10px] border-t-red-500" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <MoreVertical className="h-4 w-4 text-gray-500" />
      </div>
      
      {/* Browser Content */}
      <div className="h-[200px] bg-white dark:bg-gray-900 relative">
        <div className="p-4 space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded mt-4" />
        </div>
        
        {/* Install Popup - Step 2 */}
        {step === 1 && (
          <div className="absolute top-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-64 p-4 animate-scale-in border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">A</span>
              </div>
              <div>
                <p className="font-semibold text-sm">Instalar ArcanoApp?</p>
                <p className="text-[10px] text-gray-500">arcanoapp.voxvisual.com.br</p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button className="px-3 py-1.5 text-xs text-gray-500">Cancelar</button>
              <button className="px-4 py-1.5 text-xs bg-primary text-white rounded font-semibold relative">
                Instalar
                {/* Pulse indicator */}
                <span className="absolute -right-1 -top-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                </span>
              </button>
            </div>
          </div>
        )}
        
        {/* Success - Step 3 */}
        {step === 2 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center animate-fade-in">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 text-center animate-scale-in">
              <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="h-8 w-8 text-white" />
              </div>
              <p className="font-semibold text-lg">App Instalado!</p>
              <p className="text-xs text-gray-500 mt-1">Procure o ícone na sua área de trabalho</p>
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const InstallTutorialInteractive = () => {
  const { t } = useTranslation('tools');
  const [deviceType, setDeviceType] = useState<DeviceType>("android");
  const [browserType, setBrowserType] = useState<BrowserType>("chrome");
  const [currentStep, setCurrentStep] = useState(0);
  const [showBrowserSelector, setShowBrowserSelector] = useState(false);

  useEffect(() => {
    // Detect device and browser
    setDeviceType(detectDevice());
    setBrowserType(detectBrowser());
  }, []);

  const config = getStepsForConfig(deviceType, browserType, t);
  const steps = config.steps;
  const totalSteps = steps.length;

  // Auto-advance animation - cycles through steps automatically
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep(prev => (prev + 1) % totalSteps);
    }, 3000); // 3 seconds per step

    return () => clearInterval(interval);
  }, [totalSteps]);

  const handleBrowserChange = (browser: BrowserType) => {
    setBrowserType(browser);
    setCurrentStep(0);
    setShowBrowserSelector(false);
  };

  const getBrowsersForDevice = (): { value: BrowserType; label: string }[] => {
    if (deviceType === "ios") {
      return [
        { value: "safari", label: "Safari" },
        { value: "chrome", label: "Chrome" },
        { value: "firefox", label: "Firefox" },
        { value: "brave", label: "Brave" },
        { value: "opera", label: "Opera" },
        { value: "duckduckgo", label: "DuckDuckGo" },
      ];
    }
    if (deviceType === "android") {
      return [
        { value: "chrome", label: "Chrome" },
        { value: "firefox", label: "Firefox" },
        { value: "samsung", label: "Samsung Internet" },
        { value: "opera", label: "Opera" },
        { value: "brave", label: "Brave" },
        { value: "duckduckgo", label: "DuckDuckGo" },
      ];
    }
    // Desktop
    return [
      { value: "chrome", label: "Chrome" },
      { value: "edge", label: "Microsoft Edge" },
      { value: "firefox", label: "Firefox" },
      { value: "opera", label: "Opera" },
      { value: "brave", label: "Brave" },
      { value: "duckduckgo", label: "DuckDuckGo" },
    ];
  };

  const renderMockup = () => {
    // In-app browser mockup (Instagram, Facebook)
    if (browserType === "instagram" || browserType === "facebook") {
      return <InAppBrowserMockup step={currentStep} />;
    }
    
    // iOS mockups
    if (deviceType === "ios") {
      if (browserType === "chrome" || browserType === "brave" || browserType === "opera") {
        return <IOSChromeMockup step={currentStep} />;
      }
      return <IOSMockup step={currentStep} />;
    }
    
    // Android mockups
    if (deviceType === "android") {
      return <AndroidMockup step={currentStep} />;
    }
    
    // Desktop mockups
    return <DesktopMockup step={currentStep} browser={browserType} />;
  };

  return (
    <Card className="p-6 overflow-hidden">
      {/* All Steps Display */}
      <div className="space-y-6 mb-6">
        {steps.map((step, index) => (
          <div 
            key={index}
            className={`transition-all duration-500 ${
              index === currentStep 
                ? "opacity-100 scale-100" 
                : "opacity-40 scale-95"
            }`}
          >
            {/* Step Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                index === currentStep 
                  ? "bg-primary text-primary-foreground" 
                  : index < currentStep 
                  ? "bg-primary/60 text-primary-foreground" 
                  : "bg-muted text-muted-foreground"
              }`}>
                {index < currentStep ? <Check className="h-4 w-4" /> : index + 1}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            </div>

            {/* Show Mockup only for current step */}
            {index === currentStep && (
              <div className="animate-fade-in">
                {renderMockup()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Progress indicator */}
      <div className="flex justify-center gap-2 mb-6">
        {steps.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentStep(index)}
            className={`h-2 rounded-full transition-all duration-300 cursor-pointer hover:opacity-80 ${
              index === currentStep
                ? "w-8 bg-primary"
                : "w-2 bg-muted-foreground/30"
            }`}
          />
        ))}
      </div>

      {/* Device Type Selector - At bottom */}
      <div className="flex justify-center gap-2 mb-4">
        <Button
          variant={deviceType === "ios" ? "default" : "outline"}
          size="sm"
          onClick={() => { setDeviceType("ios"); setBrowserType("safari"); setCurrentStep(0); }}
          className={deviceType === "ios" ? "bg-gradient-primary" : ""}
        >
          {t('installTutorial.deviceButtons.iphone')}
        </Button>
        <Button
          variant={deviceType === "android" ? "default" : "outline"}
          size="sm"
          onClick={() => { setDeviceType("android"); setBrowserType("chrome"); setCurrentStep(0); }}
          className={deviceType === "android" ? "bg-gradient-primary" : ""}
        >
          {t('installTutorial.deviceButtons.android')}
        </Button>
        <Button
          variant={deviceType === "desktop" ? "default" : "outline"}
          size="sm"
          onClick={() => { setDeviceType("desktop"); setBrowserType("chrome"); setCurrentStep(0); }}
          className={deviceType === "desktop" ? "bg-gradient-primary" : ""}
        >
          {t('installTutorial.deviceButtons.computer')}
        </Button>
      </div>

      {/* In-App Browser Warning */}
      {config.isInAppBrowser && (
        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg flex items-start gap-2 mb-4">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">{t('installTutorial.inAppWarning.title')}</p>
            <p className="text-xs text-amber-600 dark:text-amber-300 mt-0.5">
              {t('installTutorial.inAppWarning.description', { browser: browserType === "instagram" ? "Instagram" : "Facebook" })}
            </p>
          </div>
        </div>
      )}

      {/* Detected Browser Info with Edit Button */}
      <div className={`flex items-center justify-center gap-2 text-sm text-muted-foreground rounded-lg py-2 px-3 ${config.isInAppBrowser ? 'bg-amber-100 dark:bg-amber-900/30' : 'bg-muted/50'}`}>
        <Info className="h-4 w-4 flex-shrink-0" />
        <span>{t('installTutorial.detected')}: <strong className="text-foreground">{config.label}</strong></span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowBrowserSelector(!showBrowserSelector)}
          className="h-6 px-2 text-xs ml-1"
        >
          {showBrowserSelector ? t('installTutorial.close') : t('installTutorial.change')}
        </Button>
      </div>

      {/* Browser Selector (collapsible) */}
      {showBrowserSelector && (
        <div className="mt-4 p-3 bg-muted/30 rounded-lg animate-fade-in">
          <p className="text-xs text-muted-foreground mb-2 text-center">{t('installTutorial.selectBrowser')}:</p>
          <div className="flex flex-wrap justify-center gap-2">
            {getBrowsersForDevice().map((browser) => (
              <Button
                key={browser.value}
                variant={browserType === browser.value ? "default" : "outline"}
                size="sm"
                onClick={() => handleBrowserChange(browser.value)}
                className={`text-xs ${browserType === browser.value ? "bg-gradient-primary" : ""}`}
              >
                {browser.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default InstallTutorialInteractive;
