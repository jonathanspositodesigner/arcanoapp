import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { 
  Search, MessageCircle, Mail, Check, X, StickyNote, 
  RefreshCw, ChevronLeft, ChevronRight, DollarSign, Users,
  Clock, TrendingUp, Send, FileText
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface AbandonedCheckout {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  cpf: string | null;
  product_id: number | null;
  product_name: string | null;
  offer_name: string | null;
  amount: number | null;
  checkout_link: string | null;
  checkout_step: number | null;
  remarketing_status: string;
  contacted_at: string | null;
  notes: string | null;
  abandoned_at: string;
}

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  sender_name: string | null;
  sender_email: string | null;
}

const ITEMS_PER_PAGE = 20;

const AbandonedCheckoutsContent = () => {
  const [checkouts, setCheckouts] = useState<AbandonedCheckout[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("pending");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    emailsEnviados: 0,
    conversoesRemarketing: 0,
    potentialValue: 0
  });
  
  const [notesModalOpen, setNotesModalOpen] = useState(false);
  const [selectedCheckout, setSelectedCheckout] = useState<AbandonedCheckout | null>(null);
  const [notesText, setNotesText] = useState("");

  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailContent, setEmailContent] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  const fetchCheckouts = async () => {
    setLoading(true);
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      // Para aba "Convertidos", buscar apenas conversões reais de remarketing automático
      if (statusFilter === 'converted') {
        // Busca checkouts com email automático enviado
        const { data: checkoutsComEmail, error } = await supabase
          .from('abandoned_checkouts')
          .select('*')
          .not('remarketing_email_sent_at', 'is', null)
          .order('remarketing_email_sent_at', { ascending: false });

        if (error) throw error;

        // Filtra apenas os que têm compra APÓS o email de remarketing
        const conversoesReais: AbandonedCheckout[] = [];
        
        for (const checkout of checkoutsComEmail || []) {
          const emailSentAt = checkout.remarketing_email_sent_at;
          
          // Busca o profile pelo email
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', checkout.email)
            .single();
          
          if (profile) {
            // Verifica se tem compra em premium_artes_users após o email
            const { count: premiumCount } = await supabase
              .from('premium_artes_users')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id)
              .gt('created_at', emailSentAt);
            
            // Verifica se tem compra em user_pack_purchases após o email
            const { count: packCount } = await supabase
              .from('user_pack_purchases')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id)
              .gt('created_at', emailSentAt);
            
            if ((premiumCount && premiumCount > 0) || (packCount && packCount > 0)) {
              conversoesReais.push(checkout as AbandonedCheckout);
            }
          }
        }

        // Aplicar filtro de busca
        let filtered = conversoesReais;
        if (searchTerm) {
          filtered = conversoesReais.filter(c => 
            c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            c.name?.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }

        // Paginação manual
        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE;
        
        setCheckouts(filtered.slice(from, to));
        setTotalCount(filtered.length);
      } else {
        // Lógica normal para outros filtros
        let query = supabase
          .from('abandoned_checkouts')
          .select('*', { count: 'exact' })
          .lt('abandoned_at', fifteenMinutesAgo)
          .order('abandoned_at', { ascending: false });

        if (statusFilter !== 'all') {
          query = query.eq('remarketing_status', statusFilter);
        }

        if (searchTerm) {
          query = query.or(`email.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
        }

        const from = (currentPage - 1) * ITEMS_PER_PAGE;
        const to = from + ITEMS_PER_PAGE - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) throw error;
        setCheckouts(data || []);
        setTotalCount(count || 0);
      }
    } catch (error) {
      console.error('Error fetching checkouts:', error);
      toast.error("Erro ao carregar checkouts abandonados");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();
      
      const { count: totalReal } = await supabase
        .from('abandoned_checkouts')
        .select('*', { count: 'exact', head: true })
        .lt('abandoned_at', fifteenMinutesAgo)
        .neq('remarketing_status', 'converted');

      const { count: pending } = await supabase
        .from('abandoned_checkouts')
        .select('*', { count: 'exact', head: true })
        .lt('abandoned_at', fifteenMinutesAgo)
        .eq('remarketing_status', 'pending');

      // Conta emails automáticos enviados
      const { count: emailsEnviados } = await supabase
        .from('abandoned_checkouts')
        .select('*', { count: 'exact', head: true })
        .not('remarketing_email_sent_at', 'is', null);

      // Busca checkouts com email automático enviado para verificar conversões
      const { data: checkoutsComEmail } = await supabase
        .from('abandoned_checkouts')
        .select('email, remarketing_email_sent_at')
        .not('remarketing_email_sent_at', 'is', null);

      let conversoesRemarketing = 0;
      
      if (checkoutsComEmail && checkoutsComEmail.length > 0) {
        // Para cada checkout com email enviado, verifica se o email existe em profiles
        // e se tem compra após a data do email
        for (const checkout of checkoutsComEmail) {
          const emailSentAt = checkout.remarketing_email_sent_at;
          
          // Busca o profile pelo email
          const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', checkout.email)
            .single();
          
          if (profile) {
            // Verifica se tem compra em premium_artes_users após o email
            const { count: premiumCount } = await supabase
              .from('premium_artes_users')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id)
              .gt('created_at', emailSentAt);
            
            // Verifica se tem compra em user_pack_purchases após o email
            const { count: packCount } = await supabase
              .from('user_pack_purchases')
              .select('*', { count: 'exact', head: true })
              .eq('user_id', profile.id)
              .gt('created_at', emailSentAt);
            
            if ((premiumCount && premiumCount > 0) || (packCount && packCount > 0)) {
              conversoesRemarketing++;
            }
          }
        }
      }

      const { data: pendingData } = await supabase
        .from('abandoned_checkouts')
        .select('amount')
        .lt('abandoned_at', fifteenMinutesAgo)
        .eq('remarketing_status', 'pending');

      const potentialValue = pendingData?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0;

      setStats({
        total: totalReal || 0,
        pending: pending || 0,
        emailsEnviados: emailsEnviados || 0,
        conversoesRemarketing,
        potentialValue
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchEmailTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setEmailTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  useEffect(() => {
    fetchCheckouts();
    fetchStats();
    fetchEmailTemplates();
  }, [currentPage, statusFilter, searchTerm]);

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('abandoned_checkouts')
        .update({ 
          remarketing_status: newStatus,
          contacted_at: ['contacted_whatsapp', 'contacted_email', 'converted'].includes(newStatus) 
            ? new Date().toISOString() 
            : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;
      toast.success("Status atualizado");
      fetchCheckouts();
      fetchStats();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error("Erro ao atualizar status");
    }
  };

  const saveNotes = async () => {
    if (!selectedCheckout) return;
    
    try {
      const { error } = await supabase
        .from('abandoned_checkouts')
        .update({ 
          notes: notesText,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedCheckout.id);

      if (error) throw error;
      toast.success("Notas salvas");
      setNotesModalOpen(false);
      fetchCheckouts();
    } catch (error) {
      console.error('Error saving notes:', error);
      toast.error("Erro ao salvar notas");
    }
  };

  const openWhatsApp = (checkout: AbandonedCheckout) => {
    if (!checkout.phone) {
      toast.error("Este lead não tem telefone cadastrado");
      return;
    }
    
    const name = checkout.name?.split(' ')[0] || 'cliente';
    const product = checkout.product_name || 'nosso produto';
    const message = encodeURIComponent(
      `Olá ${name}! 👋\n\nVi que você se interessou pelo ${product}. Posso te ajudar a finalizar sua compra?`
    );
    
    window.open(`https://api.whatsapp.com/send/?phone=${checkout.phone}&text=${message}`, '_blank');
    updateStatus(checkout.id, 'contacted_whatsapp');
  };

  const openEmailModal = (checkout: AbandonedCheckout) => {
    setSelectedCheckout(checkout);
    setSelectedTemplateId("");
    setEmailSubject("");
    setEmailContent("");
    setEmailModalOpen(true);
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplateId(templateId);
    
    if (templateId === "custom") {
      setEmailSubject("");
      setEmailContent("");
      return;
    }

    const template = emailTemplates.find(t => t.id === templateId);
    if (template) {
      let subject = template.subject;
      let content = template.content;
      
      const name = selectedCheckout?.name?.split(' ')[0] || 'cliente';
      const product = selectedCheckout?.product_name || 'nosso produto';
      const checkoutLink = selectedCheckout?.checkout_link || '';
      
      subject = subject.replace(/\{\{nome\}\}/gi, name);
      subject = subject.replace(/\{\{produto\}\}/gi, product);
      
      content = content.replace(/\{\{nome\}\}/gi, name);
      content = content.replace(/\{\{produto\}\}/gi, product);
      content = content.replace(/\{\{link\}\}/gi, checkoutLink);
      
      setEmailSubject(subject);
      setEmailContent(content);
    }
  };

  const sendEmail = async () => {
    if (!selectedCheckout || !emailSubject || !emailContent) {
      toast.error("Preencha o assunto e conteúdo do email");
      return;
    }

    setSendingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke('send-single-email', {
        body: {
          to_email: selectedCheckout.email,
          to_name: selectedCheckout.name || undefined,
          subject: emailSubject,
          content: emailContent
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.error);

      toast.success("Email enviado com sucesso!");
      setEmailModalOpen(false);
      updateStatus(selectedCheckout.id, 'contacted_email');
    } catch (error: any) {
      console.error('Error sending email:', error);
      toast.error(`Erro ao enviar email: ${error.message}`);
    } finally {
      setSendingEmail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
      contacted_whatsapp: "bg-green-500/20 text-green-500 border-green-500/30",
      contacted_email: "bg-blue-500/20 text-blue-500 border-blue-500/30",
      converted: "bg-emerald-500/20 text-emerald-500 border-emerald-500/30",
      ignored: "bg-gray-500/20 text-gray-500 border-gray-500/30"
    };
    
    const labels: Record<string, string> = {
      pending: "Pendente",
      contacted_whatsapp: "WhatsApp",
      contacted_email: "Email",
      converted: "Convertido",
      ignored: "Ignorado"
    };
    
    return (
      <Badge className={`${styles[status] || styles.pending} border`}>
        {labels[status] || status}
      </Badge>
    );
  };

  const getStepBadge = (step: number | null) => {
    if (!step) return null;
    const stepLabels: Record<number, string> = {
      1: "Dados pessoais",
      2: "Endereço",
      3: "Pagamento",
      4: "Revisão",
      5: "Finalização"
    };
    return (
      <Badge variant="outline" className="text-xs">
        Etapa {step}: {stepLabels[step] || 'Desconhecida'}
      </Badge>
    );
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const conversionRate = stats.emailsEnviados > 0 ? ((stats.conversoesRemarketing / stats.emailsEnviados) * 100).toFixed(1) : '0';

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Checkouts Abandonados</h1>
          <p className="text-muted-foreground">Gerencie leads para remarketing</p>
        </div>
        <Button onClick={() => { fetchCheckouts(); fetchStats(); }} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-full">
              <Users className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Abandonados</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-500/20 rounded-full">
              <Clock className="h-5 w-5 text-yellow-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-full">
              <TrendingUp className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{conversionRate}%</p>
              <p className="text-xs text-muted-foreground">
                Remarketing ({stats.conversoesRemarketing}/{stats.emailsEnviados})
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-500/20 rounded-full">
              <DollarSign className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                R$ {stats.potentialValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-xs text-muted-foreground">Valor Potencial</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por email ou nome..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              className="pl-10"
            />
          </div>
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <TabsList>
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="contacted_whatsapp">WhatsApp</TabsTrigger>
              <TabsTrigger value="contacted_email">Email</TabsTrigger>
              <TabsTrigger value="converted">Convertidos Remarketing</TabsTrigger>
              <TabsTrigger value="ignored">Ignorados</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lead</TableHead>
                <TableHead>Produto</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Etapa</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : checkouts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum checkout abandonado encontrado
                  </TableCell>
                </TableRow>
              ) : (
                checkouts.map((checkout) => (
                  <TableRow key={checkout.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{checkout.name || 'Sem nome'}</p>
                        <p className="text-sm text-muted-foreground">{checkout.email}</p>
                        {checkout.phone && (
                          <p className="text-xs text-muted-foreground">{checkout.phone}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="max-w-[200px]">
                        <p className="text-sm truncate">{checkout.product_name || '-'}</p>
                        {checkout.offer_name && checkout.offer_name !== checkout.product_name && (
                          <p className="text-xs text-muted-foreground truncate">{checkout.offer_name}</p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {checkout.amount ? (
                        <span className="font-medium">
                          R$ {checkout.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      ) : '-'}
                    </TableCell>
                    <TableCell>
                      {getStepBadge(checkout.checkout_step)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(checkout.remarketing_status)}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">
                        {format(new Date(checkout.abandoned_at), "dd/MM/yy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openWhatsApp(checkout)}
                          className="h-8 w-8 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </Button>

                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEmailModal(checkout)}
                          className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-500/10"
                          title="Enviar Email"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateStatus(checkout.id, 'converted')}
                          className="h-8 w-8 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10"
                          title="Marcar como convertido"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => updateStatus(checkout.id, 'ignored')}
                          className="h-8 w-8 text-gray-500 hover:text-gray-600 hover:bg-gray-500/10"
                          title="Ignorar"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => {
                            setSelectedCheckout(checkout);
                            setNotesText(checkout.notes || '');
                            setNotesModalOpen(true);
                          }}
                          className="h-8 w-8"
                          title="Adicionar notas"
                        >
                          <StickyNote className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t">
            <p className="text-sm text-muted-foreground">
              Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Notes Modal */}
      <Dialog open={notesModalOpen} onOpenChange={setNotesModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Notas para {selectedCheckout?.name || selectedCheckout?.email}</DialogTitle>
          </DialogHeader>
          <Textarea
            value={notesText}
            onChange={(e) => setNotesText(e.target.value)}
            placeholder="Adicione observações sobre este lead..."
            rows={4}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveNotes}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Modal */}
      <Dialog open={emailModalOpen} onOpenChange={setEmailModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Enviar Email para {selectedCheckout?.name || selectedCheckout?.email}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Template selector */}
            <div className="space-y-2">
              <Label>Modelo de Email</Label>
              <Select value={selectedTemplateId} onValueChange={handleTemplateSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um modelo ou escreva do zero" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Escrever do zero
                    </div>
                  </SelectItem>
                  {emailTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Use {"{{nome}}"}, {"{{produto}}"} e {"{{link}}"} como placeholders
              </p>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label>Assunto *</Label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder="Assunto do email..."
              />
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label>Conteúdo do email</Label>
              <Textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Conteúdo do email..."
                rows={8}
              />
            </div>

            {/* Preview info */}
            {selectedCheckout && (
              <div className="p-3 bg-muted/50 rounded-lg text-sm">
                <p><strong>Para:</strong> {selectedCheckout.email}</p>
                {selectedCheckout.product_name && (
                  <p><strong>Produto abandonado:</strong> {selectedCheckout.product_name}</p>
                )}
                {selectedCheckout.checkout_link && (
                  <p><strong>Link do checkout:</strong> <span className="text-xs break-all">{selectedCheckout.checkout_link}</span></p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEmailModalOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={sendEmail} 
              disabled={sendingEmail || !emailSubject || !emailContent}
            >
              {sendingEmail ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AbandonedCheckoutsContent;
