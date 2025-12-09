import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, Users, Package, AlertCircle, CheckCircle, AlertTriangle, SkipForward } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { useImportProgress } from "@/hooks/useImportProgress";

interface ParsedClient {
  email: string;
  name: string;
  phone: string;
  packs: {
    pack_slug: string;
    access_type: "3_meses" | "6_meses" | "1_ano" | "vitalicio";
    has_bonus_access: boolean;
    purchase_date: string;
    product_name: string;
    import_hash: string;
  }[];
}

// Product mapping based on CSV analysis - using correct database slugs
const PRODUCT_MAPPING: Record<string, { packs: string[]; access_type: "3_meses" | "6_meses" | "1_ano" | "vitalicio"; has_bonus: boolean }> = {
  // === PACK ARCANO VOL.1 - TODAS AS VARIAÇÕES ===
  "Pack Arcano I - Baú Arcano": { packs: ["pack-arcano-vol-1"], access_type: "1_ano", has_bonus: true },
  "Pack Arcano I - Bag Iniciante": { packs: ["pack-arcano-vol-1"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano I - Artes Premium para Eventos": { packs: ["pack-arcano-vol-1"], access_type: "6_meses", has_bonus: false },
  "[OB] Pack Arcano I + 55 Artes para Eventos": { packs: ["pack-arcano-vol-1"], access_type: "1_ano", has_bonus: true },
  "BAA- Pack Arcano Vol. 1 (Basic)": { packs: ["pack-arcano-vol-1"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano 1 - Plano Completo": { packs: ["pack-arcano-vol-1"], access_type: "1_ano", has_bonus: true },
  "Garanta Acesso Vitalício as artes!": { packs: ["pack-arcano-vol-1"], access_type: "vitalicio", has_bonus: true },
  "Pack Arcano Vol. 1": { packs: ["pack-arcano-vol-1"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano I": { packs: ["pack-arcano-vol-1"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano Vol.1": { packs: ["pack-arcano-vol-1"], access_type: "6_meses", has_bonus: false },
  "BAA - Pack Arcano Vol. 1": { packs: ["pack-arcano-vol-1"], access_type: "6_meses", has_bonus: false },
  "BAA - Pack Arcano Vol. 1 (Completo)": { packs: ["pack-arcano-vol-1"], access_type: "1_ano", has_bonus: true },
  
  // === PACK ARCANO VOL.2 - TODAS AS VARIAÇÕES ===
  "Pack Arcano II - Pacote Completo": { packs: ["pack-arcano-vol-2"], access_type: "1_ano", has_bonus: true },
  "Pack Arcano II - Pacote Básico": { packs: ["pack-arcano-vol-2"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano II - Garanta Acesso Vitalício as artes!": { packs: ["pack-arcano-vol-2"], access_type: "vitalicio", has_bonus: true },
  "Pack Arcano II": { packs: ["pack-arcano-vol-2"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano Vol. 2": { packs: ["pack-arcano-vol-2"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano Vol.2": { packs: ["pack-arcano-vol-2"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano 2 - Plano Completo": { packs: ["pack-arcano-vol-2"], access_type: "1_ano", has_bonus: true },
  "Pack Arcano 2 - Plano Básico": { packs: ["pack-arcano-vol-2"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano II - Básico": { packs: ["pack-arcano-vol-2"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano II - Completo": { packs: ["pack-arcano-vol-2"], access_type: "1_ano", has_bonus: true },
  "Garanta Acesso Vitalício ao Pack Arcano Vol. 2": { packs: ["pack-arcano-vol-2"], access_type: "vitalicio", has_bonus: true },
  
  // === PACK ARCANO VOL.3 - TODAS AS VARIAÇÕES ===
  "Pack Arcano III - Plano Completo": { packs: ["pack-arcano-vol-3"], access_type: "1_ano", has_bonus: true },
  "Pack Arcano III - Básico": { packs: ["pack-arcano-vol-3"], access_type: "6_meses", has_bonus: false },
  "Garanta Acesso Vitalício ao Pack Arcano Vol. 3": { packs: ["pack-arcano-vol-3"], access_type: "vitalicio", has_bonus: true },
  "Pack Arcano III": { packs: ["pack-arcano-vol-3"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano Vol. 3": { packs: ["pack-arcano-vol-3"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano Vol.3": { packs: ["pack-arcano-vol-3"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano 3 - Plano Completo": { packs: ["pack-arcano-vol-3"], access_type: "1_ano", has_bonus: true },
  "Pack Arcano 3 - Plano Básico": { packs: ["pack-arcano-vol-3"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano III - Completo": { packs: ["pack-arcano-vol-3"], access_type: "1_ano", has_bonus: true },
  "Pack Arcano III - Pacote Completo": { packs: ["pack-arcano-vol-3"], access_type: "1_ano", has_bonus: true },
  "Pack Arcano III - Pacote Básico": { packs: ["pack-arcano-vol-3"], access_type: "6_meses", has_bonus: false },
  
  // === PACK AGENDAS - TODAS AS VARIAÇÕES ===
  "Pack Agendas Arcanas - Completo": { packs: ["pack-agendas"], access_type: "1_ano", has_bonus: true },
  "Pack Agendas Arcanas - Básico": { packs: ["pack-agendas"], access_type: "6_meses", has_bonus: false },
  "Pack Agendas - Garanta Acesso Vitalício as artes!": { packs: ["pack-agendas"], access_type: "vitalicio", has_bonus: true },
  "Pack de Agendas": { packs: ["pack-agendas"], access_type: "6_meses", has_bonus: false },
  "Combo Básico - Pack Agendas R$27": { packs: ["pack-agendas"], access_type: "6_meses", has_bonus: false },
  "Pack Agendas": { packs: ["pack-agendas"], access_type: "6_meses", has_bonus: false },
  "Pack Agendas Arcanas": { packs: ["pack-agendas"], access_type: "6_meses", has_bonus: false },
  "Pack de Agendas Para Artistas R$17 - 6 Meses": { packs: ["pack-agendas"], access_type: "6_meses", has_bonus: false },
  "Pack de Agendas Para Artistas": { packs: ["pack-agendas"], access_type: "6_meses", has_bonus: false },
  "Pack Agendas - Básico": { packs: ["pack-agendas"], access_type: "6_meses", has_bonus: false },
  "Pack Agendas - Completo": { packs: ["pack-agendas"], access_type: "1_ano", has_bonus: true },
  "Garanta Acesso Vitalício ao Pack Agendas": { packs: ["pack-agendas"], access_type: "vitalicio", has_bonus: true },
  
  // === PACK CARNAVAL - TODAS AS VARIAÇÕES ===
  "Carnaval Arcano 1 - Pack Especial de Carnaval - Básico": { packs: ["pack-de-carnaval"], access_type: "6_meses", has_bonus: false },
  "Carnaval Arcano 1 - Pack Especial de Carnaval": { packs: ["pack-de-carnaval"], access_type: "1_ano", has_bonus: true },
  "Carnaval Arcano 1 - Pack Especial de Carnaval - Completo": { packs: ["pack-de-carnaval"], access_type: "1_ano", has_bonus: true },
  "Carnaval Arcano 1 - Pack Especial de Carnaval - Baú Arcano": { packs: ["pack-de-carnaval"], access_type: "1_ano", has_bonus: true },
  "Carnaval Arcano 1 - Básico": { packs: ["pack-de-carnaval"], access_type: "6_meses", has_bonus: false },
  "Pack Especial de Carnaval": { packs: ["pack-de-carnaval"], access_type: "6_meses", has_bonus: false },
  "Pack de Carnaval - Completo": { packs: ["pack-de-carnaval"], access_type: "1_ano", has_bonus: true },
  "Pack de Carnaval": { packs: ["pack-de-carnaval"], access_type: "6_meses", has_bonus: false },
  "Pack Carnaval": { packs: ["pack-de-carnaval"], access_type: "6_meses", has_bonus: false },
  "Carnaval Arcano": { packs: ["pack-de-carnaval"], access_type: "6_meses", has_bonus: false },
  "Carnaval Arcano 1": { packs: ["pack-de-carnaval"], access_type: "6_meses", has_bonus: false },
  "Pack Especial de Carnaval - Básico": { packs: ["pack-de-carnaval"], access_type: "6_meses", has_bonus: false },
  "Pack Especial de Carnaval - Completo": { packs: ["pack-de-carnaval"], access_type: "1_ano", has_bonus: true },
  "Garanta Acesso Vitalício ao Pack de Carnaval": { packs: ["pack-de-carnaval"], access_type: "vitalicio", has_bonus: true },
  
  // === PACK HALLOWEEN - TODAS AS VARIAÇÕES ===
  "Pack Especial de Halloween 2025": { packs: ["pack-de-halloween"], access_type: "vitalicio", has_bonus: true },
  "Pack Especial de Halloween": { packs: ["pack-de-halloween"], access_type: "vitalicio", has_bonus: true },
  "Pack de Halloween": { packs: ["pack-de-halloween"], access_type: "vitalicio", has_bonus: true },
  "Pack Halloween": { packs: ["pack-de-halloween"], access_type: "vitalicio", has_bonus: true },
  "Halloween Arcano": { packs: ["pack-de-halloween"], access_type: "vitalicio", has_bonus: true },
  
  // === PACK FIM DE ANO - TODAS AS VARIAÇÕES ===
  "Pack Especial de Fim de ano": { packs: ["pack-fim-de-ano"], access_type: "vitalicio", has_bonus: true },
  "Pack Especial de Fim de Ano": { packs: ["pack-fim-de-ano"], access_type: "vitalicio", has_bonus: true },
  "Pack de Fim de Ano": { packs: ["pack-fim-de-ano"], access_type: "vitalicio", has_bonus: true },
  "Pack Fim de Ano": { packs: ["pack-fim-de-ano"], access_type: "vitalicio", has_bonus: true },
  
  // === PACKS 1 AO 3 TRIMESTRAL (3 MESES) ===
  "PACKS 1 AO 3 - TRIMESTRAL": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-arcano-vol-3"], access_type: "3_meses", has_bonus: false },
  "Packs 1 ao 3 - Trimestral": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-arcano-vol-3"], access_type: "3_meses", has_bonus: false },
  
  // === COMBOS ===
  "Combo: 3 Packs pelo preço de 1": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-agendas"], access_type: "1_ano", has_bonus: true },
  "Combo Arcano: +155 Artes Editáveis PSD e Canva": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-arcano-vol-3"], access_type: "vitalicio", has_bonus: true },
  "Black Arcana - 6 Packs + Todos os Bônus": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-arcano-vol-3", "pack-agendas", "pack-de-carnaval", "pack-de-halloween"], access_type: "vitalicio", has_bonus: true },
  "Combo 3 Packs": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-agendas"], access_type: "1_ano", has_bonus: true },
  "Black Arcana": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-arcano-vol-3", "pack-agendas", "pack-de-carnaval", "pack-de-halloween"], access_type: "vitalicio", has_bonus: true },
  "Combo Arcano": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-arcano-vol-3"], access_type: "vitalicio", has_bonus: true },
  
  // === UPSELLS VITALÍCIO ===
  "Garanta Acesso Vitalício": { packs: [], access_type: "vitalicio", has_bonus: true },
  "Acesso Vitalício": { packs: [], access_type: "vitalicio", has_bonus: true },
  
  // === CURSOS E BÔNUS ===
  "Pack + 19 Videos Animados para Evento After Effects": { packs: ["bonus-19-videos-animados"], access_type: "1_ano", has_bonus: true },
  "Pack + 190 Videos Animados": { packs: ["bonus-190-videos-animados"], access_type: "vitalicio", has_bonus: false },
  "Pack + 190 Videos Animados para Evento Canva": { packs: ["bonus-190-videos-animados"], access_type: "vitalicio", has_bonus: false },
  "Upscaller Arcano": { packs: ["upscaller-arcano"], access_type: "vitalicio", has_bonus: false },
  "Upscaler Arcano": { packs: ["upscaller-arcano"], access_type: "vitalicio", has_bonus: false },
  "Curso de Como Fazer Artes Animadas no Photoshop": { packs: ["curso-artes-animadas-photoshop"], access_type: "1_ano", has_bonus: false },
  "MODULOS BOAS VINDAS": { packs: ["curso-boas-vindas"], access_type: "vitalicio", has_bonus: false },
  "Imersão: Evento.ia - Aprenda a Gerar Selos 3D com Inteligência Artifical": { packs: ["eventoia-como-criar-selos-3d-animados"], access_type: "vitalicio", has_bonus: false },
  "Runa da Animação: Curso de motion sem sair do Photoshop": { packs: ["curso-artes-animadas-photoshop"], access_type: "1_ano", has_bonus: false },
  "Curso Artes Animadas Photoshop": { packs: ["curso-artes-animadas-photoshop"], access_type: "1_ano", has_bonus: false },
  "19 Videos Animados": { packs: ["bonus-19-videos-animados"], access_type: "1_ano", has_bonus: true },
  "190 Videos Animados": { packs: ["bonus-190-videos-animados"], access_type: "vitalicio", has_bonus: false },
  "Evento.ia": { packs: ["eventoia-como-criar-selos-3d-animados"], access_type: "vitalicio", has_bonus: false },
  
  // === FORJA DE SELOS 3D ILIMITADA ===
  "I.A Ilimitada que Gera Selos 3D Animados": { packs: ["forja-selos-3d-ilimitada"], access_type: "vitalicio", has_bonus: false },
  
  // === ASSINATURA PREMIUM ANUAL - ACESSO TOTAL ===
  "Assinatura 1 ano Arcano Premium": { 
    packs: [
      "pack-arcano-vol-1", 
      "pack-arcano-vol-2", 
      "pack-arcano-vol-3", 
      "pack-agendas", 
      "pack-de-carnaval", 
      "pack-de-halloween", 
      "pack-fim-de-ano",
      "bonus-19-videos-animados",
      "bonus-190-videos-animados",
      "upscaller-arcano",
      "curso-artes-animadas-photoshop",
      "curso-boas-vindas",
      "eventoia-como-criar-selos-3d-animados",
      "forja-selos-3d-ilimitada"
    ], 
    access_type: "1_ano", 
    has_bonus: true 
  },
};

// Products to ignore (not mapped to any pack)
const IGNORED_PRODUCTS = [
  "Pack com + 30 Artes Premium para São João",
  "Assinatura Mensal Arcano Premium",
];

// Generate unique hash for import tracking
const generateImportHash = (email: string, productName: string, purchaseDate: string): string => {
  const normalized = `${email.toLowerCase().trim()}|${productName.trim()}|${purchaseDate.split('T')[0]}`;
  // Simple hash function
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    const char = normalized.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
};

const AdminImportClients = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: { email: string; error: string }[]; created: number; updated: number; skipped: number } | null>(null);
  const { startImport, setProgress: setGlobalProgress, finishImport } = useImportProgress();
  const [unmappedProducts, setUnmappedProducts] = useState<Map<string, number>>(new Map());
  const [existingHashes, setExistingHashes] = useState<Set<string>>(new Set());
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [stats, setStats] = useState({
    totalSales: 0,
    paidSales: 0,
    ignoredSales: 0,
    mappedSales: 0,
    unmappedSales: 0,
    uniqueClients: 0,
    totalPacks: 0,
    alreadyImported: 0,
    newToImport: 0,
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/admin-login");
        return;
      }

      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (!roleData) {
        navigate("/admin-login");
        return;
      }

      setIsAdmin(true);
    } catch (error) {
      console.error("Error checking admin status:", error);
      navigate("/admin-login");
    } finally {
      setLoading(false);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n");
    if (lines.length < 2) return [];

    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const data: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Handle CSV with quoted fields
      const values: string[] = [];
      let current = "";
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          values.push(current.trim());
          current = "";
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      if (values.length === headers.length) {
        const row: Record<string, string> = {};
        headers.forEach((header, idx) => {
          row[header] = values[idx]?.replace(/"/g, "") || "";
        });
        data.push(row);
      }
    }

    return data;
  };

  // Fetch existing import hashes from database
  const fetchExistingHashes = async (hashes: string[]): Promise<Set<string>> => {
    const existingSet = new Set<string>();
    
    // Fetch in batches of 500
    const batchSize = 500;
    for (let i = 0; i < hashes.length; i += batchSize) {
      const batch = hashes.slice(i, i + batchSize);
      const { data } = await supabase
        .from("import_log")
        .select("import_hash")
        .in("import_hash", batch);
      
      if (data) {
        data.forEach((row: { import_hash: string }) => existingSet.add(row.import_hash));
      }
    }
    
    return existingSet;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportResult(null);
    setUnmappedProducts(new Map());
    setCheckingExisting(true);

    const text = await uploadedFile.text();
    const data = parseCSV(text);
    setRawData(data);

    // Process the data - using Portuguese column names from CSV
    const totalSales = data.length;
    const paidSales = data.filter((row) => row["Status da venda"] === "paid" || row.status === "paid");
    
    let ignoredCount = 0;
    let mappedCount = 0;
    let unmappedCount = 0;
    const unmappedMap = new Map<string, number>();
    const clientsMap = new Map<string, ParsedClient>();
    const allHashes: string[] = [];
    const hashToRowMap = new Map<string, { email: string; productName: string; purchaseDate: string; mapping: any; name: string; phone: string }>();

    // First pass: collect all hashes
    for (const row of paidSales) {
      const productName = row["Nome do produto"] || row.product_name || row.product || "";
      const email = (row["Email do cliente"] || row.customer_email || row.email || "").toLowerCase().trim();
      
      let purchaseDate = row["Data de pagamento"] || row.created_at || row.date || "";
      
      if (!purchaseDate && row["Data"]) {
        const brazilDate = row["Data"];
        const match = brazilDate.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
        if (match) {
          const [, day, month, year, hour, minute, second] = match;
          purchaseDate = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        }
      }
      
      if (!purchaseDate) {
        purchaseDate = new Date().toISOString();
      }

      if (!email) continue;
      if (IGNORED_PRODUCTS.some((p) => productName.includes(p))) {
        ignoredCount++;
        continue;
      }

      let mapping = PRODUCT_MAPPING[productName];
      if (!mapping) {
        for (const [key, value] of Object.entries(PRODUCT_MAPPING)) {
          if (productName.includes(key) || key.includes(productName)) {
            mapping = value;
            break;
          }
        }
      }

      if (!mapping) {
        unmappedCount++;
        const currentCount = unmappedMap.get(productName) || 0;
        unmappedMap.set(productName, currentCount + 1);
        continue;
      }

      mappedCount++;

      const name = row["Nome do cliente"] || row.customer_name || row.name || "";
      const phone = row["Telefone"] || row.customer_phone || row.phone || "";
      const hash = generateImportHash(email, productName, purchaseDate);
      
      allHashes.push(hash);
      hashToRowMap.set(hash, { email, productName, purchaseDate, mapping, name, phone });
    }

    // Fetch existing hashes from database
    const existingHashSet = await fetchExistingHashes(allHashes);
    setExistingHashes(existingHashSet);

    // Second pass: build clients, skipping already imported
    let alreadyImported = 0;
    let newToImport = 0;

    for (const [hash, rowData] of hashToRowMap) {
      if (existingHashSet.has(hash)) {
        alreadyImported++;
        continue;
      }

      newToImport++;
      const { email, productName, purchaseDate, mapping, name, phone } = rowData;

      if (!clientsMap.has(email)) {
        clientsMap.set(email, {
          email,
          name,
          phone,
          packs: [],
        });
      }

      const client = clientsMap.get(email)!;
      
      if (!client.name && name) client.name = name;
      if (!client.phone && phone) client.phone = phone;

      for (const packSlug of mapping.packs) {
        const existingPack = client.packs.find((p) => p.pack_slug === packSlug);
        
        if (existingPack) {
          const accessPriority = { "vitalicio": 4, "1_ano": 3, "6_meses": 2, "3_meses": 1 };
          const newPriority = accessPriority[mapping.access_type];
          const existingPriority = accessPriority[existingPack.access_type];
          
          if (newPriority > existingPriority) {
            existingPack.access_type = mapping.access_type;
            existingPack.has_bonus_access = existingPack.has_bonus_access || mapping.has_bonus;
            existingPack.import_hash = hash;
          } else if (newPriority === existingPriority) {
            if (new Date(purchaseDate) > new Date(existingPack.purchase_date)) {
              existingPack.purchase_date = purchaseDate;
              existingPack.import_hash = hash;
            }
          }
          existingPack.has_bonus_access = existingPack.has_bonus_access || mapping.has_bonus;
        } else {
          client.packs.push({
            pack_slug: packSlug,
            access_type: mapping.access_type,
            has_bonus_access: mapping.has_bonus,
            purchase_date: purchaseDate,
            product_name: productName,
            import_hash: hash,
          });
        }
      }
    }

    const clients = Array.from(clientsMap.values());
    const totalPacks = clients.reduce((sum, c) => sum + c.packs.length, 0);

    setParsedClients(clients);
    setUnmappedProducts(unmappedMap);
    setCheckingExisting(false);
    setStats({
      totalSales,
      paidSales: paidSales.length,
      ignoredSales: ignoredCount,
      mappedSales: mappedCount,
      unmappedSales: unmappedCount,
      uniqueClients: clients.length,
      totalPacks,
      alreadyImported,
      newToImport,
    });

    if (alreadyImported > 0) {
      toast.info(`${alreadyImported} registros já importados anteriormente serão ignorados`);
    }

    if (unmappedCount > 0) {
      toast.warning(`CSV processado: ${clients.length} clientes novos, mas ${unmappedCount} vendas não mapeadas!`);
    } else if (clients.length > 0) {
      toast.success(`CSV processado: ${clients.length} clientes com ${totalPacks} packs novos para importar`);
    } else if (alreadyImported > 0) {
      toast.info(`Todos os ${alreadyImported} registros já foram importados anteriormente!`);
    }
  };

  const handleImport = async () => {
    if (parsedClients.length === 0) {
      toast.error("Nenhum cliente novo para importar");
      return;
    }

    setImporting(true);
    setImportProgress(0);
    
    const batchSize = 50;
    const totalBatches = Math.ceil(parsedClients.length / batchSize);
    startImport(totalBatches);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      let totalSuccess = 0;
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;
      const allErrors: { email: string; error: string }[] = [];

      for (let i = 0; i < totalBatches; i++) {
        const batch = parsedClients.slice(i * batchSize, (i + 1) * batchSize);
        
        const response = await supabase.functions.invoke("import-pack-clients", {
          body: { clients: batch },
        });

        if (response.error) {
          console.error("Batch error:", response.error);
          batch.forEach((c) => allErrors.push({ email: c.email, error: response.error.message }));
        } else {
          const result = response.data;
          totalSuccess += result.success || 0;
          totalCreated += result.created || 0;
          totalUpdated += result.updated || 0;
          totalSkipped += result.skipped || 0;
          if (result.errors) allErrors.push(...result.errors);
        }

        const progress = Math.round(((i + 1) / totalBatches) * 100);
        setImportProgress(progress);
        setGlobalProgress(i + 1, totalBatches);
      }

      setImportResult({
        success: totalSuccess,
        created: totalCreated,
        updated: totalUpdated,
        skipped: totalSkipped + stats.alreadyImported,
        errors: allErrors,
      });

      if (allErrors.length === 0) {
        toast.success(`Importação concluída: ${totalSuccess} clientes processados`);
      } else {
        toast.warning(`Importação concluída com ${allErrors.length} erros`);
      }
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Erro na importação");
    } finally {
      setImporting(false);
      finishImport();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/admin-pack-purchases")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Importar Clientes via CSV</h1>
            <p className="text-muted-foreground">Importe clientes e seus packs a partir de um arquivo CSV da Greenn</p>
          </div>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload do Arquivo CSV
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={checkingExisting}
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer disabled:opacity-50"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </div>
              )}
              {checkingExisting && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Verificando registros existentes...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        {parsedClients.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{stats.totalSales}</div>
                <div className="text-xs text-muted-foreground">Total Vendas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-500">{stats.paidSales}</div>
                <div className="text-xs text-muted-foreground">Vendas Pagas</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-500">{stats.newToImport}</div>
                <div className="text-xs text-muted-foreground">Novos</div>
              </CardContent>
            </Card>
            <Card className="bg-muted/50">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-muted-foreground flex items-center justify-center gap-1">
                  <SkipForward className="h-5 w-5" />
                  {stats.alreadyImported}
                </div>
                <div className="text-xs text-muted-foreground">Já Importados</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-foreground">{stats.uniqueClients}</div>
                <div className="text-xs text-muted-foreground">Clientes Novos</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Already imported message */}
        {stats.alreadyImported > 0 && parsedClients.length === 0 && (
          <Card className="border-blue-500/50 bg-blue-500/10">
            <CardContent className="p-6 text-center">
              <SkipForward className="h-12 w-12 mx-auto text-blue-500 mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Todos os registros já foram importados!
              </h3>
              <p className="text-muted-foreground">
                {stats.alreadyImported} registros deste CSV já existem no sistema.
                Não há nada novo para importar.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Unmapped Products Warning */}
        {unmappedProducts.size > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-500">
                <AlertTriangle className="h-5 w-5" />
                Produtos Não Mapeados ({stats.unmappedSales})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-1">
                  {Array.from(unmappedProducts.entries()).map(([product, count]) => (
                    <div key={product} className="flex justify-between text-sm">
                      <span className="text-muted-foreground truncate mr-4">{product}</span>
                      <span className="text-yellow-500 font-medium">{count}x</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground mt-4">
                Adicione estes produtos ao PRODUCT_MAPPING para importá-los.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Clients Preview */}
        {parsedClients.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Clientes para Importar ({parsedClients.length})
              </CardTitle>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Importar Clientes
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {importing && (
                <div className="mb-4">
                  <Progress value={importProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground mt-1 text-center">{importProgress}%</p>
                </div>
              )}
              <ScrollArea className="h-64">
                <div className="space-y-2">
                  {parsedClients.slice(0, 50).map((client, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                      <div>
                        <div className="font-medium text-foreground">{client.email}</div>
                        <div className="text-xs text-muted-foreground">{client.name || "Sem nome"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-foreground">{client.packs.length} packs</span>
                      </div>
                    </div>
                  ))}
                  {parsedClients.length > 50 && (
                    <div className="text-center text-sm text-muted-foreground py-2">
                      ... e mais {parsedClients.length - 50} clientes
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Import Result */}
        {importResult && (
          <Card className={importResult.errors.length === 0 ? "border-green-500/50 bg-green-500/10" : "border-yellow-500/50 bg-yellow-500/10"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.errors.length === 0 ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                )}
                Resultado da Importação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500">{importResult.success}</div>
                  <div className="text-xs text-muted-foreground">Sucesso</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-500">{importResult.created}</div>
                  <div className="text-xs text-muted-foreground">Criados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-500">{importResult.updated}</div>
                  <div className="text-xs text-muted-foreground">Atualizados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-muted-foreground">{importResult.skipped}</div>
                  <div className="text-xs text-muted-foreground">Ignorados</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-500">{importResult.errors.length}</div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <ScrollArea className="h-32">
                  <div className="space-y-1">
                    {importResult.errors.map((err, idx) => (
                      <div key={idx} className="text-sm text-red-500">
                        {err.email}: {err.error}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminImportClients;