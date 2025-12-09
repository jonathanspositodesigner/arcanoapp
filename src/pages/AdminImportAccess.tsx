import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Upload, FileSpreadsheet, Users, Package, AlertCircle, CheckCircle, AlertTriangle, SkipForward, Wrench } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import * as XLSX from "xlsx";

interface ParsedClient {
  email: string;
  name: string;
  phone: string;
  accesses: {
    slug: string;
    type: 'pack' | 'bonus' | 'curso' | 'ferramenta';
    product_name: string;
  }[];
  deactivated: string[];
}

// XLSX product mapping - all accesses are VITALÍCIO
const XLSX_ACCESS_MAPPING: Record<string, { slug: string; type: 'pack' | 'bonus' | 'curso' | 'ferramenta' }> = {
  // PACKS
  "Pack Arcano Vol. 1": { slug: "pack-arcano-vol-1", type: "pack" },
  "Pack Arcano Vol. 2": { slug: "pack-arcano-vol-2", type: "pack" },
  "Pack Arcano Vol. 3": { slug: "pack-arcano-vol-3", type: "pack" },
  "Pack Especial Agendas": { slug: "pack-agendas", type: "pack" },
  "Pack Especial de Carnaval Vol. 1": { slug: "pack-de-carnaval", type: "pack" },
  "Pack Especial Halloween 2025": { slug: "pack-de-halloween", type: "pack" },
  "Pack Especial Fim de Ano": { slug: "pack-fim-de-ano", type: "pack" },
  
  // CURSOS
  "Seja bem vindo à BAA": { slug: "curso-boas-vindas", type: "curso" },
  "Como Editar no After Effects": { slug: "curso-after-effects", type: "curso" },
  "Como Editar no Photoshop": { slug: "curso-photoshop", type: "curso" },
  "Como editar no Canva": { slug: "curso-canva", type: "curso" },
  "Imersão Eventos.IA - Aprenda a Gerar Selos 3D para Eventos": { slug: "eventoia-como-criar-selos-3d-animados", type: "curso" },
  "Motion sem sair do Photoshop + Plugin": { slug: "curso-motion-photoshop", type: "curso" },
  "Tratamento de Fotos Pelo Celular": { slug: "curso-tratamento-fotos", type: "curso" },
  
  // BÔNUS
  "Selos 3D": { slug: "bonus-selos-3d", type: "bonus" },
  "Pack Extra - Artes Animadas Canva": { slug: "bonus-artes-animadas-canva", type: "bonus" },
  "+ 2200 Fontes para eventos": { slug: "2200-fontes-para-eventos", type: "bonus" },
  "Pack + 19 Videos Animados para Evento After Effects": { slug: "bonus-19-videos-animados", type: "bonus" },
  "Pack + 190 Videos Animados para Evento Canva": { slug: "bonus-190-videos-animados", type: "bonus" },
  "Estilos de Titulos 3d": { slug: "bonus-estilos-titulos-3d", type: "bonus" },
  "Documentos Para Designers": { slug: "bonus-documentos-designers", type: "bonus" },
  "16GB de Elementos Png": { slug: "bonus-16gb-elementos-png", type: "bonus" },
  "+ 500 Texturas para eventos": { slug: "bonus-500-texturas", type: "bonus" },
  "Pack Extra - Flyers Animados After Effects": { slug: "bonus-flyers-animados-ae", type: "bonus" },
  "33 Estilos de Letras 3D": { slug: "bonus-33-estilos-letras-3d", type: "bonus" },
  "Elementos para Festa Junina em PNG": { slug: "bonus-festa-junina-png", type: "bonus" },
  
  // CURSOS (adicionais)
  "Grids Secretos para flyers profissionais": { slug: "curso-grids-secretos", type: "curso" },
  
  // FERRAMENTAS DE IA
  "I.A que muda a roupa": { slug: "ia-muda-roupa", type: "ferramenta" },
  "I.A que muda a pose de fotos": { slug: "ia-muda-pose", type: "ferramenta" },
  "Remova fundo e aumente a qualidade das fotos!": { slug: "upscaller-arcano", type: "ferramenta" },
};

// Products to ignore
const XLSX_IGNORED_PRODUCTS = [
  "Pack Especial: São João",
  "Elixir do Design Vol. 1- (Iniciante)",
  "Acesso ao Canva Pro",
  "Atualizações de Artes - Pack Arcano 1",
  "Atualizações Pack Agendas",
  "Atualizações de Artes - Pack de Carnaval",
  "Artes Grátis",
];

const AdminImportAccess = () => {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [parsedClients, setParsedClients] = useState<ParsedClient[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [importResult, setImportResult] = useState<{ 
    success: number; 
    errors: { email: string; error: string }[]; 
    created: number; 
    updated: number; 
  } | null>(null);
  const [unmappedProducts, setUnmappedProducts] = useState<Map<string, number>>(new Map());
  const [stats, setStats] = useState({
    totalRows: 0,
    uniqueClients: 0,
    totalAccesses: 0,
    mappedAccesses: 0,
    unmappedAccesses: 0,
    ignoredAccesses: 0,
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

  const parseXLSX = (file: File): Promise<any[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setImportResult(null);
    setUnmappedProducts(new Map());

    try {
      const data = await parseXLSX(uploadedFile);
      
      const clientsMap = new Map<string, ParsedClient>();
      const unmappedMap = new Map<string, number>();
      let mappedCount = 0;
      let unmappedCount = 0;
      let ignoredCount = 0;

      for (const row of data) {
        const email = (row["Email"] || row["email"] || "").toString().toLowerCase().trim();
        const name = (row["Nome"] || row["name"] || "").toString().trim();
        const phone = (row["Celular"] || row["Phone"] || row["phone"] || "").toString().trim();
        const activeCourses = (row["Cursos Ativados"] || "").toString();
        const deactivatedCourses = (row["Cursos Desativados"] || "").toString();

        if (!email) continue;

        // Parse activated and deactivated courses
        const activeList = activeCourses.split(",").map(s => s.trim()).filter(Boolean);
        const deactivatedList = deactivatedCourses.split(",").map(s => s.trim()).filter(Boolean);

        if (!clientsMap.has(email)) {
          clientsMap.set(email, {
            email,
            name,
            phone,
            accesses: [],
            deactivated: deactivatedList,
          });
        }

        const client = clientsMap.get(email)!;
        if (!client.name && name) client.name = name;
        if (!client.phone && phone) client.phone = phone;

        for (const product of activeList) {
          // Skip if in deactivated list
          if (deactivatedList.includes(product)) continue;
          
          // Skip ignored products
          if (XLSX_IGNORED_PRODUCTS.some(p => product.includes(p) || p.includes(product))) {
            ignoredCount++;
            continue;
          }

          // Try to find mapping
          let mapping = XLSX_ACCESS_MAPPING[product];
          if (!mapping) {
            // Try partial match
            for (const [key, value] of Object.entries(XLSX_ACCESS_MAPPING)) {
              if (product.includes(key) || key.includes(product)) {
                mapping = value;
                break;
              }
            }
          }

          if (!mapping) {
            unmappedCount++;
            const currentCount = unmappedMap.get(product) || 0;
            unmappedMap.set(product, currentCount + 1);
            continue;
          }

          // Check if already has this access
          if (!client.accesses.find(a => a.slug === mapping.slug)) {
            mappedCount++;
            client.accesses.push({
              slug: mapping.slug,
              type: mapping.type,
              product_name: product,
            });
          }
        }
      }

      const clients = Array.from(clientsMap.values()).filter(c => c.accesses.length > 0);
      const totalAccesses = clients.reduce((sum, c) => sum + c.accesses.length, 0);

      setParsedClients(clients);
      setUnmappedProducts(unmappedMap);
      setStats({
        totalRows: data.length,
        uniqueClients: clients.length,
        totalAccesses,
        mappedAccesses: mappedCount,
        unmappedAccesses: unmappedCount,
        ignoredAccesses: ignoredCount,
      });

      if (unmappedCount > 0) {
        toast.warning(`Planilha processada: ${clients.length} clientes, mas ${unmappedCount} produtos não mapeados!`);
      } else {
        toast.success(`Planilha processada: ${clients.length} clientes com ${totalAccesses} acessos`);
      }
    } catch (error) {
      console.error("Error parsing XLSX:", error);
      toast.error("Erro ao processar planilha. Verifique o formato do arquivo.");
    }
  };

  const handleImport = async () => {
    if (parsedClients.length === 0) {
      toast.error("Nenhum cliente para importar");
      return;
    }

    setImporting(true);
    setImportResult(null);
    setImportProgress({ current: 0, total: parsedClients.length });

    const results = { success: 0, errors: [] as { email: string; error: string }[], created: 0, updated: 0 };

    for (let i = 0; i < parsedClients.length; i++) {
      const client = parsedClients[i];
      setImportProgress({ current: i + 1, total: parsedClients.length });

      try {
        // Check if user exists
        let userId: string | null = null;
        
        // First check profiles table
        const { data: existingProfile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", client.email)
          .maybeSingle();

        if (existingProfile) {
          userId = existingProfile.id;
          results.updated++;
        } else {
          // Create new user in Auth
          const { data: { session } } = await supabase.auth.getSession();
          
          const response = await supabase.functions.invoke("create-pack-client", {
            body: {
              email: client.email,
              name: client.name,
              phone: client.phone,
            },
          });

          if (response.error) {
            throw new Error(response.error.message || "Failed to create user");
          }

          userId = response.data?.user_id;
          if (!userId) {
            throw new Error("No user ID returned");
          }
          results.created++;
        }

        // Update profile with name and phone if needed
        if (client.name || client.phone) {
          await supabase
            .from("profiles")
            .upsert({
              id: userId,
              email: client.email,
              name: client.name || null,
              phone: client.phone || null,
            }, { onConflict: "id" });
        }

        // Insert pack purchases (all as VITALÍCIO)
        for (const access of client.accesses) {
          // Check if purchase already exists
          const { data: existingPurchase } = await supabase
            .from("user_pack_purchases")
            .select("id")
            .eq("user_id", userId)
            .eq("pack_slug", access.slug)
            .maybeSingle();

          if (!existingPurchase) {
            await supabase
              .from("user_pack_purchases")
              .insert({
                user_id: userId,
                pack_slug: access.slug,
                access_type: "vitalicio",
                has_bonus_access: true, // All users with any access get bonus
                purchased_at: new Date().toISOString(),
                expires_at: null, // Vitalício = no expiration
                is_active: true,
              });
          }
        }

        results.success++;
      } catch (error: any) {
        console.error(`Error importing ${client.email}:`, error);
        results.errors.push({ email: client.email, error: error.message || "Unknown error" });
      }
    }

    setImporting(false);
    setImportResult(results);
    
    if (results.errors.length === 0) {
      toast.success(`Importação concluída! ${results.created} criados, ${results.updated} atualizados.`);
    } else {
      toast.warning(`Importação concluída com ${results.errors.length} erros.`);
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
            <h1 className="text-2xl font-bold text-foreground">Importar Acessos via XLSX</h1>
            <p className="text-muted-foreground">Importe acessos de clientes a partir da planilha de turmas (todos como vitalício)</p>
          </div>
        </div>

        {/* Upload Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload da Planilha XLSX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={importing}
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
                  <FileSpreadsheet className="h-4 w-4" />
                  {file.name}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {stats.totalRows > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold">{stats.totalRows}</div>
                <div className="text-xs text-muted-foreground">Linhas na planilha</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-500">{stats.uniqueClients}</div>
                <div className="text-xs text-muted-foreground">Clientes únicos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-blue-500">{stats.totalAccesses}</div>
                <div className="text-xs text-muted-foreground">Total de acessos</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-green-500">{stats.mappedAccesses}</div>
                <div className="text-xs text-muted-foreground">Mapeados</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-yellow-500">{stats.unmappedAccesses}</div>
                <div className="text-xs text-muted-foreground">Não mapeados</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <div className="text-2xl font-bold text-gray-500">{stats.ignoredAccesses}</div>
                <div className="text-xs text-muted-foreground">Ignorados</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Unmapped Products Warning */}
        {unmappedProducts.size > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-500/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-yellow-600">
                <AlertTriangle className="h-5 w-5" />
                Produtos não mapeados ({unmappedProducts.size} tipos)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-40">
                <div className="space-y-1">
                  {Array.from(unmappedProducts.entries())
                    .sort((a, b) => b[1] - a[1])
                    .map(([product, count]) => (
                      <div key={product} className="text-sm flex justify-between">
                        <span className="truncate max-w-[80%]">{product}</span>
                        <span className="text-muted-foreground">{count}x</span>
                      </div>
                    ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Client Preview */}
        {parsedClients.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Preview dos Clientes ({parsedClients.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {parsedClients.slice(0, 50).map((client, idx) => (
                    <div key={idx} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{client.email}</div>
                          <div className="text-sm text-muted-foreground">
                            {client.name} {client.phone && `| ${client.phone}`}
                          </div>
                        </div>
                        <span className="text-sm bg-primary/20 text-primary px-2 py-1 rounded">
                          {client.accesses.length} acessos
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {client.accesses.map((access, i) => (
                          <span 
                            key={i} 
                            className={`text-xs px-2 py-0.5 rounded ${
                              access.type === 'pack' ? 'bg-blue-500/20 text-blue-500' :
                              access.type === 'curso' ? 'bg-purple-500/20 text-purple-500' :
                              access.type === 'bonus' ? 'bg-orange-500/20 text-orange-500' :
                              'bg-green-500/20 text-green-500'
                            }`}
                          >
                            {access.slug}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                  {parsedClients.length > 50 && (
                    <div className="text-center text-muted-foreground py-4">
                      E mais {parsedClients.length - 50} clientes...
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Import Progress */}
        {importing && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Importando clientes...</span>
                  <span className="text-muted-foreground">
                    {importProgress.current} / {importProgress.total}
                  </span>
                </div>
                <Progress value={(importProgress.current / importProgress.total) * 100} />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Import Result */}
        {importResult && (
          <Card className={importResult.errors.length > 0 ? "border-yellow-500/50" : "border-green-500/50"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {importResult.errors.length > 0 ? (
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
                Resultado da Importação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
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
                  <div className="text-2xl font-bold text-red-500">{importResult.errors.length}</div>
                  <div className="text-xs text-muted-foreground">Erros</div>
                </div>
              </div>
              {importResult.errors.length > 0 && (
                <ScrollArea className="h-40">
                  <div className="space-y-1">
                    {importResult.errors.map((err, i) => (
                      <div key={i} className="text-sm text-red-500">
                        {err.email}: {err.error}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        )}

        {/* Import Button */}
        {parsedClients.length > 0 && !importing && (
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => { setFile(null); setParsedClients([]); setStats({ totalRows: 0, uniqueClients: 0, totalAccesses: 0, mappedAccesses: 0, unmappedAccesses: 0, ignoredAccesses: 0 }); }}>
              Limpar
            </Button>
            <Button onClick={handleImport} disabled={importing}>
              <Upload className="h-4 w-4 mr-2" />
              Importar {parsedClients.length} Clientes (Vitalício)
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminImportAccess;
