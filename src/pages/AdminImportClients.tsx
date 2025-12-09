import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileText, Users, Package, AlertCircle, CheckCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";

interface ParsedClient {
  email: string;
  name: string;
  phone: string;
  packs: {
    pack_slug: string;
    access_type: "6_meses" | "1_ano" | "vitalicio";
    has_bonus_access: boolean;
    purchase_date: string;
    product_name: string;
  }[];
}

// Product mapping based on the confirmed plan - using correct database slugs
const PRODUCT_MAPPING: Record<string, { packs: string[]; access_type: "6_meses" | "1_ano" | "vitalicio"; has_bonus: boolean }> = {
  // === PACK ARCANO VOL.1 ===
  "Pack Arcano I - Baú Arcano": { packs: ["pack-arcano-vol-1"], access_type: "1_ano", has_bonus: true },
  "Pack Arcano I - Bag Iniciante": { packs: ["pack-arcano-vol-1"], access_type: "6_meses", has_bonus: false },
  "[OB] Pack Arcano I + 55 Artes para Eventos": { packs: ["pack-arcano-vol-1"], access_type: "1_ano", has_bonus: true },
  "Garanta Acesso Vitalício as artes!": { packs: ["pack-arcano-vol-1"], access_type: "vitalicio", has_bonus: true },
  
  // === PACK ARCANO VOL.2 ===
  "Pack Arcano II - Pacote Completo": { packs: ["pack-arcano-vol-2"], access_type: "1_ano", has_bonus: true },
  "Pack Arcano II - Pacote Básico": { packs: ["pack-arcano-vol-2"], access_type: "6_meses", has_bonus: false },
  "Pack Arcano II - Garanta Acesso Vitalício as artes!": { packs: ["pack-arcano-vol-2"], access_type: "vitalicio", has_bonus: true },
  
  // === PACK ARCANO VOL.3 ===
  "Pack Arcano III - Plano Completo": { packs: ["pack-arcano-vol-3"], access_type: "1_ano", has_bonus: true },
  "Pack Arcano III - Básico": { packs: ["pack-arcano-vol-3"], access_type: "6_meses", has_bonus: false },
  "Garanta Acesso Vitalício ao Pack Arcano Vol. 3": { packs: ["pack-arcano-vol-3"], access_type: "vitalicio", has_bonus: true },
  
  // === PACK AGENDAS ===
  "Pack Agendas Arcanas - Completo": { packs: ["pack-agendas"], access_type: "1_ano", has_bonus: true },
  "Pack Agendas Arcanas - Básico": { packs: ["pack-agendas"], access_type: "6_meses", has_bonus: false },
  "Pack Agendas - Garanta Acesso Vitalício as artes!": { packs: ["pack-agendas"], access_type: "vitalicio", has_bonus: true },
  
  // === PACK CARNAVAL ===
  "Carnaval Arcano 1 - Pack Especial de Carnaval - Básico": { packs: ["pack-de-carnaval"], access_type: "6_meses", has_bonus: false },
  "Carnaval Arcano 1 - Pack Especial de Carnaval": { packs: ["pack-de-carnaval"], access_type: "1_ano", has_bonus: true },
  
  // === PACK HALLOWEEN (VITALÍCIO) ===
  "Pack Especial de Halloween 2025": { packs: ["pack-de-halloween"], access_type: "vitalicio", has_bonus: true },
  
  // === COMBOS ===
  "Combo: 3 Packs pelo preço de 1": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-agendas"], access_type: "1_ano", has_bonus: true },
  "Combo Arcano: +155 Artes Editáveis PSD e Canva": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-arcano-vol-3"], access_type: "vitalicio", has_bonus: true },
  "Black Arcana - 6 Packs + Todos os Bônus": { packs: ["pack-arcano-vol-1", "pack-arcano-vol-2", "pack-arcano-vol-3", "pack-agendas", "pack-de-carnaval", "pack-de-halloween"], access_type: "vitalicio", has_bonus: true },
  
  // === CURSOS E BÔNUS ===
  "Pack + 19 Videos Animados para Evento After Effects": { packs: ["bonus-19-videos-animados"], access_type: "1_ano", has_bonus: true },
  "Curso de Como Fazer Artes Animadas no Photoshop": { packs: ["curso-artes-animadas-photoshop"], access_type: "1_ano", has_bonus: false },
  "MODULOS BOAS VINDAS": { packs: ["curso-boas-vindas"], access_type: "vitalicio", has_bonus: false },
  "Imersão: Evento.ia - Aprenda a Gerar Selos 3D com Inteligência Artifical": { packs: ["eventoia-como-criar-selos-3d-animados"], access_type: "vitalicio", has_bonus: false },
};

// Products to ignore
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
  const [stats, setStats] = useState({
    totalSales: 0,
    paidSales: 0,
    ignoredSales: 0,
    mappedSales: 0,
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

    const text = await uploadedFile.text();
    const data = parseCSV(text);
    setRawData(data);

    // Process the data - using Portuguese column names from CSV
    const totalSales = data.length;
    const paidSales = data.filter((row) => row["Status da venda"] === "paid" || row.status === "paid");
    
    let ignoredCount = 0;
    let mappedCount = 0;
    const clientsMap = new Map<string, ParsedClient>();

    for (const row of paidSales) {
      const productName = row["Nome do produto"] || row.product_name || row.product || "";
      const email = (row["Email do cliente"] || row.customer_email || row.email || "").toLowerCase().trim();
      const name = row["Nome do cliente"] || row.customer_name || row.name || "";
      const phone = row["Telefone"] || row.customer_phone || row.phone || "";
      const purchaseDate = row["Data"] || row.created_at || row.date || new Date().toISOString();

      // Check if product should be ignored
      if (IGNORED_PRODUCTS.some((p) => productName.includes(p))) {
        ignoredCount++;
        continue;
      }

      // Find matching product mapping
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
        console.warn(`Unmapped product: ${productName}`);
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
          // Keep the most recent purchase date
          if (new Date(purchaseDate) > new Date(existingPack.purchase_date)) {
            existingPack.purchase_date = purchaseDate;
            existingPack.access_type = mapping.access_type;
            existingPack.has_bonus_access = existingPack.has_bonus_access || mapping.has_bonus;
          }
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
    setStats({
      totalSales,
      paidSales: paidSales.length,
      ignoredSales: ignoredCount,
      mappedSales: mappedCount,
      uniqueClients: clients.length,
      totalPacks,
    });

    toast.success(`CSV processado: ${clients.length} clientes únicos encontrados`);
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
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold">{stats.totalSales}</p>
                <p className="text-xs text-muted-foreground">Total de Vendas</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{stats.paidSales}</p>
                <p className="text-xs text-muted-foreground">Vendas Pagas</p>
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
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-purple-500">{stats.uniqueClients}</p>
                <p className="text-xs text-muted-foreground">Clientes Únicos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-500">{stats.totalPacks}</p>
                <p className="text-xs text-muted-foreground">Total de Packs</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Preview Section */}
        {parsedClients.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Preview dos Clientes ({parsedClients.length})
              </CardTitle>
              <Button onClick={handleImport} disabled={importing}>
                {importing ? "Importando..." : "Importar Todos"}
              </Button>
            </CardHeader>
            <CardContent>
              {importing && (
                <div className="mb-4">
                  <Progress value={importProgress} className="w-full" />
                  <p className="text-sm text-muted-foreground mt-2 text-center">{importProgress}% concluído</p>
                </div>
              )}

              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {parsedClients.slice(0, 100).map((client, idx) => (
                    <div key={idx} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{client.name || "Sem nome"}</p>
                          <p className="text-sm text-muted-foreground">{client.email}</p>
                          {client.phone && <p className="text-xs text-muted-foreground">{client.phone}</p>}
                        </div>
                        <div className="flex items-center gap-1">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">{client.packs.length} packs</span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {client.packs.map((pack, pIdx) => (
                          <span
                            key={pIdx}
                            className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                          >
                            {pack.pack_slug} ({pack.access_type})
                            {pack.has_bonus_access && " +bônus"}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {parsedClients.length > 100 && (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      ... e mais {parsedClients.length - 100} clientes
                    </p>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Results Section */}
        {importResult && (
          <Card>
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-500">{importResult.success}</p>
                  <p className="text-xs text-muted-foreground">Sucesso</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-500">{importResult.created}</p>
                  <p className="text-xs text-muted-foreground">Criados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-500">{importResult.updated}</p>
                  <p className="text-xs text-muted-foreground">Atualizados</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-500">{importResult.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Erros</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="mt-4">
                  <p className="font-medium mb-2">Erros:</p>
                  <ScrollArea className="h-[200px]">
                    <div className="space-y-1">
                      {importResult.errors.map((err, idx) => (
                        <div key={idx} className="text-sm text-red-500">
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
