import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X, Check, Share, Plus, MoreVertical, Download, Info } from "lucide-react";

type DeviceType = "ios" | "android" | "desktop";
type BrowserType = "safari" | "chrome" | "firefox" | "edge" | "samsung" | "opera" | "brave" | "duckduckgo" | "other";

interface Step {
  title: string;
  description: string;
}

interface DeviceBrowserConfig {
  steps: Step[];
  label: string;
}

// iOS Safari
const iosSafariSteps: Step[] = [
  { title: "Toque no ícone Compartilhar", description: "Na barra inferior do Safari, toque no ícone de compartilhar" },
  { title: "Adicionar à Tela de Início", description: "Role o menu e toque em \"Adicionar à Tela de Início\"" },
  { title: "Confirme a instalação", description: "Toque em \"Adicionar\" no canto superior direito" },
];

// iOS Chrome (same for Brave, Opera on iOS)
const iosChromeSteps: Step[] = [
  { title: "Toque nos três pontinhos", description: "No canto superior direito do navegador" },
  { title: "Toque em \"Adicionar à Tela de Início\"", description: "Role o menu e encontre essa opção" },
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

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent.toLowerCase();
  
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

function getStepsForConfig(device: DeviceType, browser: BrowserType): DeviceBrowserConfig {
  if (device === "ios") {
    if (browser === "chrome" || browser === "brave" || browser === "opera") return { steps: iosChromeSteps, label: `${browser === "chrome" ? "Chrome" : browser === "brave" ? "Brave" : "Opera"} no iPhone` };
    if (browser === "firefox") return { steps: iosFirefoxSteps, label: "Firefox no iPhone" };
    if (browser === "duckduckgo") return { steps: iosDuckDuckGoSteps, label: "DuckDuckGo no iPhone" };
    return { steps: iosSafariSteps, label: "Safari no iPhone" };
  }
  
  if (device === "android") {
    if (browser === "samsung") return { steps: androidSamsungSteps, label: "Samsung Internet" };
    if (browser === "firefox") return { steps: androidFirefoxSteps, label: "Firefox no Android" };
    if (browser === "opera") return { steps: androidOperaSteps, label: "Opera no Android" };
    if (browser === "brave") return { steps: androidBraveSteps, label: "Brave no Android" };
    if (browser === "duckduckgo") return { steps: androidDuckDuckGoSteps, label: "DuckDuckGo no Android" };
    return { steps: androidChromeSteps, label: "Chrome no Android" };
  }
  
  // Desktop
  if (browser === "edge") return { steps: desktopEdgeSteps, label: "Microsoft Edge" };
  if (browser === "firefox") return { steps: desktopFirefoxSteps, label: "Firefox" };
  if (browser === "opera") return { steps: desktopOperaSteps, label: "Opera" };
  if (browser === "brave") return { steps: desktopBraveSteps, label: "Brave" };
  if (browser === "duckduckgo") return { steps: desktopDuckDuckGoSteps, label: "DuckDuckGo" };
  return { steps: desktopChromeSteps, label: "Chrome" };
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

// iOS Chrome Mockup - Menu is in TOP RIGHT (different from Safari)
const IOSChromeMockup = ({ step }: { step: number }) => (
  <div className="relative w-full max-w-[280px] mx-auto">
    {/* iPhone Frame */}
    <div className="bg-gray-900 rounded-[2.5rem] p-2 shadow-2xl">
      {/* Screen */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-[2rem] overflow-hidden">
        {/* Status Bar */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
          <div className="w-20 h-4 bg-gray-900 rounded-full" />
        </div>
        
        {/* Chrome Header with 3 dots */}
        <div className="h-12 bg-white dark:bg-gray-900 flex items-center px-3 gap-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full h-8 flex items-center px-3">
            <span className="text-[10px] text-gray-500 truncate">arcanoapp.voxvisual.com.br</span>
          </div>
          <div className="relative">
            <MoreVertical className="h-5 w-5 text-gray-600" />
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
        
        {/* Chrome Content */}
        <div className="h-[296px] bg-white dark:bg-gray-900 relative">
          {/* Page Content Placeholder */}
          <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
            <div className="h-24 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
          
          {/* Chrome Menu Dropdown - Step 2 */}
          {step === 1 && (
            <div className="absolute top-0 right-2 bg-white dark:bg-gray-800 rounded-lg shadow-xl w-52 animate-slide-down border border-gray-200 dark:border-gray-700">
              <div className="py-2">
                <div className="px-4 py-2.5 text-sm text-gray-600">Nova guia</div>
                <div className="px-4 py-2.5 text-sm text-gray-600">Nova guia anônima</div>
                <div className="px-4 py-2.5 text-sm text-gray-600">Favoritos</div>
                <div className="px-4 py-2.5 text-sm font-medium relative bg-primary/10 text-primary flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Adicionar à Tela de Início
                  {/* Pulse indicator */}
                  <span className="absolute right-2 flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                  </span>
                </div>
                <div className="px-4 py-2.5 text-sm text-gray-600">Downloads</div>
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
        
        {/* Chrome Bottom Bar */}
        <div className="h-10 bg-gray-100 dark:bg-gray-800 flex items-center justify-around px-4 border-t border-gray-200 dark:border-gray-700">
          <ChevronLeft className="h-5 w-5 text-gray-400" />
          <ChevronRight className="h-5 w-5 text-gray-400" />
          <Share className="h-5 w-5 text-gray-400" />
          <div className="flex gap-0.5">
            <div className="w-4 h-4 border border-gray-400 rounded text-[8px] flex items-center justify-center">2</div>
          </div>
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
  const [deviceType, setDeviceType] = useState<DeviceType>("android");
  const [browserType, setBrowserType] = useState<BrowserType>("chrome");
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    // Detect device and browser
    setDeviceType(detectDevice());
    setBrowserType(detectBrowser());
  }, []);

  const config = getStepsForConfig(deviceType, browserType);
  const steps = config.steps;
  const totalSteps = steps.length;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
  };

  const renderMockup = () => {
    // iOS mockups
    if (deviceType === "ios") {
      if (browserType === "chrome") {
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
      {/* Detected Browser Info */}
      <div className="flex items-center justify-center gap-2 mb-4 text-sm text-muted-foreground bg-muted/50 rounded-lg py-2 px-3">
        <Info className="h-4 w-4" />
        <span>Detectado: <strong className="text-foreground">{config.label}</strong></span>
      </div>

      {/* Device Type Selector */}
      <div className="flex justify-center gap-2 mb-6">
        <Button
          variant={deviceType === "ios" ? "default" : "outline"}
          size="sm"
          onClick={() => { setDeviceType("ios"); setCurrentStep(0); }}
          className={deviceType === "ios" ? "bg-gradient-primary" : ""}
        >
          iPhone
        </Button>
        <Button
          variant={deviceType === "android" ? "default" : "outline"}
          size="sm"
          onClick={() => { setDeviceType("android"); setCurrentStep(0); }}
          className={deviceType === "android" ? "bg-gradient-primary" : ""}
        >
          Android
        </Button>
        <Button
          variant={deviceType === "desktop" ? "default" : "outline"}
          size="sm"
          onClick={() => { setDeviceType("desktop"); setCurrentStep(0); }}
          className={deviceType === "desktop" ? "bg-gradient-primary" : ""}
        >
          Computador
        </Button>
      </div>

      {/* Progress Bar */}
      <div className="flex justify-center gap-2 mb-6">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`h-2 rounded-full transition-all duration-300 ${
              index === currentStep
                ? "w-8 bg-primary"
                : index < currentStep
                ? "w-2 bg-primary"
                : "w-2 bg-gray-300 dark:bg-gray-600"
            }`}
          />
        ))}
      </div>

      {/* Step Title */}
      <div className="text-center mb-6">
        <p className="text-sm text-muted-foreground mb-1">Passo {currentStep + 1} de {totalSteps}</p>
        <h3 className="text-xl font-bold text-foreground">{steps[currentStep].title}</h3>
        <p className="text-muted-foreground mt-1">{steps[currentStep].description}</p>
      </div>

      {/* Mockup */}
      <div className="mb-6">
        {renderMockup()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center">
        <Button
          variant="ghost"
          onClick={handlePrev}
          disabled={currentStep === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </Button>

        {currentStep === totalSteps - 1 ? (
          <Button onClick={handleReset} variant="outline" className="gap-1">
            <X className="h-4 w-4" />
            Recomeçar
          </Button>
        ) : (
          <Button onClick={handleNext} className="bg-gradient-primary gap-1">
            Próximo
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </Card>
  );
};

export default InstallTutorialInteractive;
