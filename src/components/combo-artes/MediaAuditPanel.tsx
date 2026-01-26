import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle, XCircle, RefreshCw } from "lucide-react";

interface MediaStatus {
  url: string;
  section: string;
  type: "image" | "video";
  status: "pending" | "loaded" | "error";
}

interface MediaAuditPanelProps {
  mediaItems: Array<{ url: string; section: string; type: "image" | "video" }>;
}

export const MediaAuditPanel = ({ mediaItems }: MediaAuditPanelProps) => {
  const [statuses, setStatuses] = useState<Map<string, MediaStatus>>(new Map());
  const [isMinimized, setIsMinimized] = useState(false);
  const [testKey, setTestKey] = useState(0);

  const testMedia = useCallback(() => {
    const newStatuses = new Map<string, MediaStatus>();
    
    mediaItems.forEach(({ url, section, type }) => {
      newStatuses.set(url, { url, section, type, status: "pending" });
    });
    
    setStatuses(newStatuses);

    // Test each media item
    mediaItems.forEach(({ url, section, type }) => {
      if (type === "image") {
        const img = new Image();
        img.onload = () => {
          setStatuses(prev => {
            const updated = new Map(prev);
            updated.set(url, { url, section, type, status: "loaded" });
            return updated;
          });
        };
        img.onerror = () => {
          setStatuses(prev => {
            const updated = new Map(prev);
            updated.set(url, { url, section, type, status: "error" });
            return updated;
          });
        };
        img.src = url;
      } else {
        // For videos, try to fetch metadata
        fetch(url, { method: "HEAD", mode: "cors" })
          .then(res => {
            setStatuses(prev => {
              const updated = new Map(prev);
              updated.set(url, { 
                url, 
                section, 
                type, 
                status: res.ok ? "loaded" : "error" 
              });
              return updated;
            });
          })
          .catch(() => {
            setStatuses(prev => {
              const updated = new Map(prev);
              updated.set(url, { url, section, type, status: "error" });
              return updated;
            });
          });
      }
    });
  }, [mediaItems]);

  useEffect(() => {
    testMedia();
  }, [testMedia, testKey]);

  const statusArray = Array.from(statuses.values());
  const loaded = statusArray.filter(s => s.status === "loaded").length;
  const errors = statusArray.filter(s => s.status === "error");
  const pending = statusArray.filter(s => s.status === "pending").length;
  const total = statusArray.length;

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className={`fixed bottom-4 right-4 z-[9999] px-4 py-2 rounded-full font-bold shadow-lg ${
          errors.length > 0 
            ? "bg-red-600 text-white" 
            : pending > 0 
              ? "bg-yellow-500 text-black"
              : "bg-green-600 text-white"
        }`}
      >
        {errors.length > 0 ? `❌ ${errors.length} erros` : pending > 0 ? `⏳ ${pending}` : "✅ OK"}
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[9999] w-96 max-h-[60vh] bg-black/95 border border-white/20 rounded-lg shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-white/10 bg-black">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white">Media Auditor</span>
          <button
            onClick={() => setTestKey(k => k + 1)}
            className="p-1 hover:bg-white/10 rounded"
            title="Re-test"
          >
            <RefreshCw className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <button onClick={() => setIsMinimized(true)} className="p-1 hover:bg-white/10 rounded">
          <X className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      {/* Stats */}
      <div className="p-3 border-b border-white/10 grid grid-cols-3 gap-2 text-center text-sm">
        <div>
          <div className="text-2xl font-bold text-white">{total}</div>
          <div className="text-gray-400">Total</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-green-400">{loaded}</div>
          <div className="text-gray-400">OK</div>
        </div>
        <div>
          <div className="text-2xl font-bold text-red-400">{errors.length}</div>
          <div className="text-gray-400">Erros</div>
        </div>
      </div>

      {/* Error list */}
      {errors.length > 0 && (
        <div className="max-h-64 overflow-y-auto p-2">
          <div className="text-xs text-red-400 font-semibold mb-2 px-1">
            URLs com erro:
          </div>
          {errors.map((item, idx) => (
            <div 
              key={idx} 
              className="text-xs p-2 mb-1 bg-red-900/30 rounded border border-red-800/50"
            >
              <div className="flex items-center gap-1 text-red-300 mb-1">
                <XCircle className="w-3 h-3" />
                <span className="font-medium">{item.section}</span>
                <span className="text-gray-500">({item.type})</span>
              </div>
              <div className="text-gray-400 break-all font-mono text-[10px]">
                {item.url}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Success message */}
      {errors.length === 0 && pending === 0 && (
        <div className="p-4 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" />
          <div className="text-green-400 font-bold">Todas as mídias carregadas!</div>
        </div>
      )}

      {/* Loading message */}
      {pending > 0 && (
        <div className="p-4 text-center">
          <RefreshCw className="w-8 h-8 text-yellow-400 mx-auto mb-2 animate-spin" />
          <div className="text-yellow-400">Testando {pending} mídia(s)...</div>
        </div>
      )}
    </div>
  );
};
