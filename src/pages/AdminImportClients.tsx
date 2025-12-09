import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, Users, Package, AlertCircle, CheckCircle, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

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
};

// Products to ignore (not mapped to any pack)
const IGNORED_PRODUCTS = [
  "Pack com + 30 Artes Premium para São João",
  "Assinatura Mensal Arcano Premium",
];

const AdminImportClients = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [rawData, setRawData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; errors: { email: string; error: string }[]; created: number; updated: number } | null>(null);
  const [unmappedProducts, setUnmappedProducts] = useState<Map<string, number>>(new Map());
  const [stats, setStats] = useState({
    totalSales: 0,
    paidSales: 0,
    ignoredSales: 0,
    mappedSales: 0,
    unmappedSales: 0,
    uniqueClients: 0,
    totalPacks: 0,
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportResult(null);
    setUnmappedProducts(new Map());

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

    for (const row of paidSales) {
      const productName = row["Nome do produto"] || row.product_name || row.product || "";
      const email = (row["Email do cliente"] || row.customer_email || row.email || "").toLowerCase().trim();
      const name = row["Nome do cliente"] || row.customer_name || row.name || "";
      const phone = row["Telefone"] || row.customer_phone || row.phone || "";
      
      // Use "Data de pagamento" (YYYY-MM-DD format) instead of "Data" (DD/MM/YYYY format)
      let purchaseDate = row["Data de pagamento"] || row.created_at || row.date || "";
      
      // Fallback to "Data" column with Brazilian date format conversion
      if (!purchaseDate && row["Data"]) {
        const brazilDate = row["Data"];
        // Convert DD/MM/YYYY HH:MM:SS to ISO format
        const match = brazilDate.match(/^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/);
        if (match) {
          const [, day, month, year, hour, minute, second] = match;
          purchaseDate = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
        }
      }
      
      // Final fallback to current date
      if (!purchaseDate) {
        purchaseDate = new Date().toISOString();
      }

      // Skip empty emails
      if (!email) {
        continue;
      }

      // Check if product should be ignored
      if (IGNORED_PRODUCTS.some((p) => productName.includes(p))) {
        ignoredCount++;
        continue;
      }

      // Find matching product mapping - try exact match first
      let mapping = PRODUCT_MAPPING[productName];
      
      // Try partial match if exact match not found
      if (!mapping) {
        for (const [key, value] of Object.entries(PRODUCT_MAPPING)) {
          if (productName.includes(key) || key.includes(productName)) {
            mapping = value;
            break;
          }
        }
      }

      if (!mapping) {
        // Track unmapped products
        unmappedCount++;
        const currentCount = unmappedMap.get(productName) || 0;
        unmappedMap.set(productName, currentCount + 1);
        console.warn(`Unmapped product (${unmappedCount}): "${productName}"`);
        continue;
      }

      mappedCount++;

      // Get or create client entry
      if (!clientsMap.has(email)) {
        clientsMap.set(email, {
          email,
          name,
          phone,
          packs: [],
        });
      }

      const client = clientsMap.get(email)!;
      
      // Update name/phone if empty
      if (!client.name && name) client.name = name;
      if (!client.phone && phone) client.phone = phone;

      // Add packs from this purchase
      for (const packSlug of mapping.packs) {
        // Check if pack already exists for this client
        const existingPack = client.packs.find((p) => p.pack_slug === packSlug);
        
        if (existingPack) {
          // Keep the better access type (vitalicio > 1_ano > 6_meses > 3_meses)
          const accessPriority = { "vitalicio": 4, "1_ano": 3, "6_meses": 2, "3_meses": 1 };
          const newPriority = accessPriority[mapping.access_type];
          const existingPriority = accessPriority[existingPack.access_type];
          
          if (newPriority > existingPriority) {
            existingPack.access_type = mapping.access_type;
            existingPack.has_bonus_access = existingPack.has_bonus_access || mapping.has_bonus;
          } else if (newPriority === existingPriority) {
            // Same access type - keep the most recent purchase date
            if (new Date(purchaseDate) > new Date(existingPack.purchase_date)) {
              existingPack.purchase_date = purchaseDate;
            }
          }
          // Always merge bonus access
          existingPack.has_bonus_access = existingPack.has_bonus_access || mapping.has_bonus;
        } else {
          client.packs.push({
            pack_slug: packSlug,
            access_type: mapping.access_type,
            has_bonus_access: mapping.has_bonus,
            purchase_date: purchaseDate,
            product_name: productName,
          });
        }
      }
    }

    const clients = Array.from(clientsMap.values());
    const totalPacks = clients.reduce((sum, c) => sum + c.packs.length, 0);

    setParsedClients(clients);
    setUnmappedProducts(unmappedMap);
    setStats({
      totalSales,
      paidSales: paidSales.length,
      ignoredSales: ignoredCount,
      mappedSales: mappedCount,
      unmappedSales: unmappedCount,
      uniqueClients: clients.length,
      totalPacks,
    });

    if (unmappedCount > 0) {
      toast.warning(`CSV processado: ${clients.length} clientes, mas ${unmappedCount} vendas não mapeadas!`);
    } else {
      toast.success(`CSV processado: ${clients.length} clientes únicos encontrados`);
    }
  };

  const handleImport = async () => {
    if (parsedClients.length === 0) {
      toast.error("Nenhum cliente para importar");
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      // Process in batches of 50
      const batchSize = 50;
      const totalBatches = Math.ceil(parsedClients.length / batchSize);
      
      let totalSuccess = 0;
      let totalCreated = 0;
      let totalUpdated = 0;
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
          if (result.errors) allErrors.push(...result.errors);
        }

        setImportProgress(Math.round(((i + 1) / totalBatches) * 100));
      }

      setImportResult({
        success: totalSuccess,
        created: totalCreated,
        updated: totalUpdated,
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
                className="block w-full text-sm text-muted-foreground
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-md file:border-0
                  file:text-sm file:font-semibold
                  file:bg-primary file:text-primary-foreground
                  hover:file:bg-primary/90
                  cursor-pointer"
              />
              {file && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FileText className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Section */}
        {parsedClients.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats.totalSales}</p>
                <p className="text-xs text-muted-foreground">Total Vendas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{stats.paidSales}</p>
                <p className="text-xs text-muted-foreground">Pagas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-yellow-500">{stats.ignoredSales}</p>
                <p className="text-xs text-muted-foreground">Ignoradas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-500">{stats.mappedSales}</p>
                <p className="text-xs text-muted-foreground">Mapeadas</p>
              </CardContent>
            </Card>
            <Card className={stats.unmappedSales > 0 ? "border-red-500" : ""}>
              <CardContent className="p-4 text-center">
                <p className={`text-2xl font-bold ${stats.unmappedSales > 0 ? "text-red-500" : "text-muted-foreground"}`}>
                  {stats.unmappedSales}
                </p>
                <p className="text-xs text-muted-foreground">Não Mapeadas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-500">{stats.uniqueClients}</p>
                <p className="text-xs text-muted-foreground">Clientes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-cyan-500">{stats.totalPacks}</p>
                <p className="text-xs text-muted-foreground">Packs</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Unmapped Products Warning */}
        {unmappedProducts.size > 0 && (
          <Card className="border-red-500 bg-red-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-500">
                <AlertTriangle className="h-5 w-5" />
                Produtos Não Mapeados ({stats.unmappedSales} vendas)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Os seguintes produtos não foram reconhecidos e suas vendas serão ignoradas:
              </p>
              <ScrollArea className="h-40">
                <div className="space-y-1">
                  {Array.from(unmappedProducts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([product, count]) => (
                      <div key={product} className="flex justify-between text-sm">
                        <span className="font-mono text-xs truncate max-w-[80%]">{product}</span>
                        <span className="text-red-500 font-bold">{count}x</span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Clients Preview */}
        {parsedClients.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Preview dos Clientes ({parsedClients.length})
              </CardTitle>
              <Button 
                onClick={handleImport} 
                disabled={importing}
                className="gap-2"
              >
                {importing ? (
                  <>Importando... {importProgress}%</>
                ) : (
                  <>
                    <Package className="h-4 w-4" />
                    Importar Todos
                  </>
                )}
              </Button>
            </CardHeader>
            <CardContent>
              {importing && (
                <div className="mb-4">
                  <Progress value={importProgress} className="h-2" />
                </div>
              )}
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {parsedClients.slice(0, 100).map((client, idx) => (
                    <div key={idx} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium">{client.name || "Sem nome"}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                          {client.phone && (
                            <p className="text-xs text-muted-foreground">{client.phone}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{client.packs.length} pack(s)</p>
                          <div className="flex flex-wrap gap-1 justify-end mt-1">
                            {client.packs.map((pack, packIdx) => (
                              <span 
                                key={packIdx} 
                                className={`text-xs px-2 py-0.5 rounded ${
                                  pack.access_type === "vitalicio" 
                                    ? "bg-purple-500/20 text-purple-400"
                                    : pack.access_type === "1_ano"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : pack.access_type === "6_meses"
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-yellow-500/20 text-yellow-400"
                                }`}
                              >
                                {pack.pack_slug} ({pack.access_type})
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {parsedClients.length > 100 && (
                    <p className="text-center text-muted-foreground text-sm py-4">
                      ... e mais {parsedClients.length - 100} clientes
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Import Result */}
        {importResult && (
          <Card className={importResult.errors.length > 0 ? "border-yellow-500" : "border-green-500"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.errors.length > 0 ? (
                  <AlertCircle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                Resultado da Importação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-green-500">{importResult.success}</p>
                  <p className="text-sm text-muted-foreground">Sucesso</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-blue-500">{importResult.created}</p>
                  <p className="text-sm text-muted-foreground">Criados</p>
                </div>
                <div className="text-center p-3 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-purple-500">{importResult.updated}</p>
                  <p className="text-sm text-muted-foreground">Atualizados</p>
                </div>
              </div>
              
              {importResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium text-red-500 mb-2">
                    Erros ({importResult.errors.length}):
                  </p>
                  <ScrollArea className="h-40">
                    <div className="space-y-1">
                      {importResult.errors.map((err, idx) => (
                        <div key={idx} className="text-sm text-red-400">
                          {err.email}: {err.error}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AdminImportClients;
