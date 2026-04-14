import React, { useState, useCallback } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  Loader2,
  Shuffle,
  ChevronDown,
  ChevronUp,
  Users,
  Layers,
  CreditCard,
  Shield,
  ListOrdered,
  Ban,
  RotateCcw,
  Copy
} from "lucide-react";
import { toast } from "sonner";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

// ==================== TYPES ====================
type ToolType = 'upscaler' | 'pose_changer' | 'veste_ai' | 'video_upscaler';
type JobStatus = 'pending' | 'queued' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';

interface SimJob {
  id: string;
  userId: string;
  toolType: ToolType;
  status: JobStatus;
  createdAt: number;
  creditCost: number;
  creditsCharged: boolean;
  creditsRefunded: boolean;
  position: number;
}

interface SimUser {
  id: string;
  creditBalance: number;
  initialBalance: number;
}

interface ScenarioResult {
  id: string;
  nome: string;
  descricao: string;
  oQueTestou: string;
  esperado: string;
  resultado: string;
  passou: boolean;
  erro?: string;
  icon: React.ReactNode;
  categoria: 'capacidade' | 'fila' | 'usuario' | 'erro' | 'creditos' | 'ferramentas';
}

// ==================== SIMULATOR ENGINE ====================
class JobQueueSimulator {
  jobs: Map<string, SimJob> = new Map();
  users: Map<string, SimUser> = new Map();
  webhooksSent: Set<string> = new Set();
  jobCounter = 0;

  addUser(userId: string, credits: number) {
    this.users.set(userId, { id: userId, creditBalance: credits, initialBalance: credits });
  }

  getActiveCount(): number {
    return [...this.jobs.values()].filter(j => j.status === 'running' || j.status === 'starting').length;
  }

  getQueuedCount(): number {
    return [...this.jobs.values()].filter(j => j.status === 'queued').length;
  }

  getQueuePosition(): number {
    return this.getQueuedCount() + 1;
  }

  createJob(userId: string, toolType: ToolType, creditCost: number): string | null {
    const hasActive = [...this.jobs.values()].some(
      j => j.userId === userId && ['queued', 'starting', 'running'].includes(j.status)
    );
    if (hasActive) return null;

    const user = this.users.get(userId);
    if (!user || user.creditBalance < creditCost) return null;

    const jobId = `job_${++this.jobCounter}`;
    const activeCount = this.getActiveCount();
    const job: SimJob = {
      id: jobId,
      userId,
      toolType,
      status: activeCount < 3 ? 'running' : 'queued',
      createdAt: Date.now() + this.jobCounter,
      creditCost,
      creditsCharged: true,
      creditsRefunded: false,
      position: activeCount >= 3 ? this.getQueuePosition() : 0,
    };

    user.creditBalance -= creditCost;
    this.jobs.set(jobId, job);
    return jobId;
  }

  webhookSuccess(jobId: string, duplicate = false): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (this.webhooksSent.has(jobId) && duplicate) {
      return true; // Ignorar duplicado
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) return true;

    job.status = 'completed';
    this.webhooksSent.add(jobId);
    this.processNext();
    return true;
  }

  webhookFailure(jobId: string, duplicate = false): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (this.webhooksSent.has(jobId) && duplicate) {
      return true;
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) return true;

    job.status = 'failed';
    // Reembolsar se na fila (não se já estava rodando)
    if (job.creditsCharged && !job.creditsRefunded && job.position > 0) {
      const user = this.users.get(job.userId);
      if (user) {
        user.creditBalance += job.creditCost;
        job.creditsRefunded = true;
      }
    }

    this.webhooksSent.add(jobId);
    this.processNext();
    return true;
  }

  cancelJob(jobId: string, wasQueued: boolean): boolean {
    const job = this.jobs.get(jobId);
    if (!job || ['completed', 'failed', 'cancelled'].includes(job.status)) return false;

    job.status = 'cancelled';
    // Só reembolsa se estava na fila
    if (job.creditsCharged && !job.creditsRefunded && wasQueued) {
      const user = this.users.get(job.userId);
      if (user) {
        user.creditBalance += job.creditCost;
        job.creditsRefunded = true;
      }
    }
    this.processNext();
    return true;
  }

  processNext(): string | null {
    if (this.getActiveCount() >= 3) return null;

    const queued = [...this.jobs.values()]
      .filter(j => j.status === 'queued')
      .sort((a, b) => a.createdAt - b.createdAt);

    if (queued.length === 0) return null;

    const next = queued[0];
    next.status = 'running';
    next.position = 0;

    queued.slice(1).forEach((j, i) => { j.position = i + 1; });
    return next.id;
  }
}

// ==================== CENÁRIOS ====================
interface TestScenario {
  id: string;
  nome: string;
  descricao: string;
  oQueTestou: string;
  esperado: string;
  categoria: 'capacidade' | 'fila' | 'usuario' | 'erro' | 'creditos' | 'ferramentas';
  icon: React.ReactNode;
  run: (sim: JobQueueSimulator) => { passou: boolean; resultado: string; erro?: string };
}

const cenarios: TestScenario[] = [
  // CAPACIDADE
  {
    id: 'cap_1',
    nome: '1º Job - Inicia Direto',
    descricao: 'Com 0 jobs ativos, o primeiro deve começar imediatamente',
    oQueTestou: 'Criou 1 usuário com 100 créditos. Criou 1 job de 60 créditos.',
    esperado: 'Job deve ter status "running" (processando)',
    categoria: 'capacidade',
    icon: <Layers className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      const jobId = sim.createJob('Maria', 'upscaler', 60);
      const job = sim.jobs.get(jobId!);
      
      if (job?.status === 'running') {
        return { passou: true, resultado: `✅ Job iniciou direto (status: running)` };
      }
      return { passou: false, resultado: `Job está com status "${job?.status}"`, erro: 'Deveria estar running' };
    }
  },
  {
    id: 'cap_2',
    nome: '2º Job - Também Inicia',
    descricao: 'Com 1 job ativo, o segundo também deve começar (limite é 3)',
    oQueTestou: 'Criou 2 usuários diferentes. Cada um criou 1 job.',
    esperado: 'Ambos os jobs devem estar "running"',
    categoria: 'capacidade',
    icon: <Layers className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      sim.addUser('João', 100);
      const j1 = sim.createJob('Maria', 'upscaler', 60);
      const j2 = sim.createJob('João', 'pose_changer', 60);
      const job1 = sim.jobs.get(j1!);
      const job2 = sim.jobs.get(j2!);
      
      if (job1?.status === 'running' && job2?.status === 'running') {
        return { passou: true, resultado: `✅ 2 jobs rodando simultaneamente` };
      }
      return { passou: false, resultado: `Job1: ${job1?.status}, Job2: ${job2?.status}`, erro: 'Ambos deveriam estar running' };
    }
  },
  {
    id: 'cap_3',
    nome: '3º Job - Último Slot',
    descricao: 'Com 2 jobs ativos, o terceiro preenche o último slot',
    oQueTestou: 'Criou 3 usuários diferentes. Cada um criou 1 job.',
    esperado: 'Todos os 3 jobs devem estar "running"',
    categoria: 'capacidade',
    icon: <Layers className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      sim.addUser('João', 100);
      sim.addUser('Pedro', 100);
      sim.createJob('Maria', 'upscaler', 60);
      sim.createJob('João', 'pose_changer', 60);
      const j3 = sim.createJob('Pedro', 'veste_ai', 60);
      const job3 = sim.jobs.get(j3!);
      const activeCount = sim.getActiveCount();
      
      if (activeCount === 3 && job3?.status === 'running') {
        return { passou: true, resultado: `✅ 3 jobs rodando (limite cheio)` };
      }
      return { passou: false, resultado: `${activeCount} ativos, Job3: ${job3?.status}`, erro: 'Deveria ter 3 running' };
    }
  },
  {
    id: 'cap_4',
    nome: '4º Job - Vai pra Fila',
    descricao: 'Com 3 jobs ativos (limite), o 4º deve entrar na fila',
    oQueTestou: 'Criou 4 usuários diferentes. Cada um criou 1 job.',
    esperado: '4º job deve estar "queued" na posição #1',
    categoria: 'capacidade',
    icon: <Layers className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      sim.addUser('João', 100);
      sim.addUser('Pedro', 100);
      sim.addUser('Ana', 100);
      sim.createJob('Maria', 'upscaler', 60);
      sim.createJob('João', 'pose_changer', 60);
      sim.createJob('Pedro', 'veste_ai', 60);
      const j4 = sim.createJob('Ana', 'video_upscaler', 60);
      const job4 = sim.jobs.get(j4!);
      
      if (job4?.status === 'queued' && job4.position === 1) {
        return { passou: true, resultado: `✅ 4º job na fila, posição #1` };
      }
      return { passou: false, resultado: `Status: ${job4?.status}, Posição: ${job4?.position}`, erro: 'Deveria estar queued na posição 1' };
    }
  },
  {
    id: 'cap_5',
    nome: '5º Job - Fila Posição 2',
    descricao: 'O 5º job deve entrar na posição #2 da fila',
    oQueTestou: 'Criou 5 usuários diferentes. Cada um criou 1 job.',
    esperado: '5º job deve estar "queued" na posição #2',
    categoria: 'capacidade',
    icon: <Layers className="h-4 w-4" />,
    run: (sim) => {
      for (let i = 1; i <= 5; i++) sim.addUser(`User${i}`, 100);
      for (let i = 1; i <= 4; i++) sim.createJob(`User${i}`, 'upscaler', 60);
      const j5 = sim.createJob('User5', 'upscaler', 60);
      const job5 = sim.jobs.get(j5!);
      
      if (job5?.status === 'queued' && job5.position === 2) {
        return { passou: true, resultado: `✅ 5º job na fila, posição #2` };
      }
      return { passou: false, resultado: `Status: ${job5?.status}, Posição: ${job5?.position}`, erro: 'Deveria estar queued na posição 2' };
    }
  },
  
  // FILA FIFO
  {
    id: 'fifo_1',
    nome: 'FIFO - Primeiro da Fila Sobe',
    descricao: 'Quando um job termina, o primeiro da fila deve ser promovido',
    oQueTestou: 'Criou 5 jobs. Finalizou o 1º. Verificou se o 4º (primeiro da fila) foi promovido.',
    esperado: '4º job deve virar "running" quando o 1º terminar',
    categoria: 'fila',
    icon: <ListOrdered className="h-4 w-4" />,
    run: (sim) => {
      for (let i = 1; i <= 5; i++) sim.addUser(`User${i}`, 100);
      const j1 = sim.createJob('User1', 'upscaler', 60);
      sim.createJob('User2', 'upscaler', 60);
      sim.createJob('User3', 'upscaler', 60);
      const j4 = sim.createJob('User4', 'upscaler', 60);
      sim.createJob('User5', 'upscaler', 60);
      
      // Antes de finalizar
      const job4Antes = { ...sim.jobs.get(j4!)! };
      
      // Finalizar job 1
      sim.webhookSuccess(j1!);
      
      const job4Depois = sim.jobs.get(j4!);
      
      if (job4Antes.status === 'queued' && job4Depois?.status === 'running') {
        return { passou: true, resultado: `✅ 4º job promovido (queued → running)` };
      }
      return { passou: false, resultado: `Antes: ${job4Antes.status}, Depois: ${job4Depois?.status}`, erro: 'Job 4 deveria ter sido promovido' };
    }
  },
  {
    id: 'fifo_2',
    nome: 'FIFO - Posições Atualizam',
    descricao: 'Quando alguém sobe, as posições da fila devem atualizar',
    oQueTestou: 'Criou 5 jobs. Finalizou o 1º. Verificou se o 5º passou da posição 2 para 1.',
    esperado: '5º job deve ir da posição #2 para #1',
    categoria: 'fila',
    icon: <ListOrdered className="h-4 w-4" />,
    run: (sim) => {
      for (let i = 1; i <= 5; i++) sim.addUser(`User${i}`, 100);
      const j1 = sim.createJob('User1', 'upscaler', 60);
      sim.createJob('User2', 'upscaler', 60);
      sim.createJob('User3', 'upscaler', 60);
      sim.createJob('User4', 'upscaler', 60);
      const j5 = sim.createJob('User5', 'upscaler', 60);
      
      const posAntes = sim.jobs.get(j5!)!.position;
      sim.webhookSuccess(j1!);
      const posDepois = sim.jobs.get(j5!)!.position;
      
      if (posAntes === 2 && posDepois === 1) {
        return { passou: true, resultado: `✅ Posição atualizada (2 → 1)` };
      }
      return { passou: false, resultado: `Antes: #${posAntes}, Depois: #${posDepois}`, erro: 'Deveria ir de 2 para 1' };
    }
  },
  
  // UM JOB POR USUÁRIO
  {
    id: 'user_1',
    nome: 'Bloqueia 2º Job do Mesmo Usuário',
    descricao: 'Um usuário não pode ter 2 jobs ativos ao mesmo tempo',
    oQueTestou: 'Criou 1 usuário. Tentou criar 2 jobs seguidos.',
    esperado: '2º job deve ser BLOQUEADO (retornar null)',
    categoria: 'usuario',
    icon: <Users className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 200);
      const j1 = sim.createJob('Maria', 'upscaler', 60);
      const j2 = sim.createJob('Maria', 'pose_changer', 60);
      
      if (j1 !== null && j2 === null) {
        return { passou: true, resultado: `✅ 2º job foi bloqueado corretamente` };
      }
      return { passou: false, resultado: `Job1: ${j1}, Job2: ${j2}`, erro: 'Job2 deveria ser null' };
    }
  },
  {
    id: 'user_2',
    nome: 'Libera Após Conclusão',
    descricao: 'Após job completar, usuário pode criar outro',
    oQueTestou: 'Criou job, finalizou, criou outro job.',
    esperado: '2º job deve ser criado com sucesso',
    categoria: 'usuario',
    icon: <Users className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 200);
      const j1 = sim.createJob('Maria', 'upscaler', 60);
      sim.webhookSuccess(j1!);
      const j2 = sim.createJob('Maria', 'pose_changer', 60);
      
      if (j2 !== null) {
        return { passou: true, resultado: `✅ Novo job criado após conclusão` };
      }
      return { passou: false, resultado: `Job2: ${j2}`, erro: 'Deveria permitir novo job' };
    }
  },
  
  // ERROS
  {
    id: 'erro_1',
    nome: 'Erro é Terminal',
    descricao: 'Quando um job falha, ele vai para status "failed" definitivo',
    oQueTestou: 'Criou job, simulou falha via webhook.',
    esperado: 'Job deve ficar "failed"',
    categoria: 'erro',
    icon: <XCircle className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      const j1 = sim.createJob('Maria', 'upscaler', 60);
      sim.webhookFailure(j1!);
      const job = sim.jobs.get(j1!);
      
      if (job?.status === 'failed') {
        return { passou: true, resultado: `✅ Job marcado como "failed"` };
      }
      return { passou: false, resultado: `Status: ${job?.status}`, erro: 'Deveria estar failed' };
    }
  },
  {
    id: 'erro_2',
    nome: 'Erro Libera Vaga',
    descricao: 'Quando um job falha, deve liberar a vaga para a fila',
    oQueTestou: 'Criou 4 jobs (3 rodando + 1 na fila). Falhou o 1º.',
    esperado: '4º job deve ser promovido para "running"',
    categoria: 'erro',
    icon: <XCircle className="h-4 w-4" />,
    run: (sim) => {
      for (let i = 1; i <= 4; i++) sim.addUser(`User${i}`, 100);
      const j1 = sim.createJob('User1', 'upscaler', 60);
      sim.createJob('User2', 'upscaler', 60);
      sim.createJob('User3', 'upscaler', 60);
      const j4 = sim.createJob('User4', 'upscaler', 60);
      
      sim.webhookFailure(j1!);
      const job4 = sim.jobs.get(j4!);
      
      if (job4?.status === 'running') {
        return { passou: true, resultado: `✅ 4º job promovido após falha do 1º` };
      }
      return { passou: false, resultado: `Job4 status: ${job4?.status}`, erro: 'Deveria estar running' };
    }
  },
  {
    id: 'erro_3',
    nome: 'Webhook Duplicado Ignorado',
    descricao: 'Se o mesmo webhook chegar 2x, deve ignorar o segundo',
    oQueTestou: 'Criou job, enviou webhook de falha 2x.',
    esperado: 'Saldo não deve mudar após segundo webhook',
    categoria: 'erro',
    icon: <Copy className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      const j1 = sim.createJob('Maria', 'upscaler', 60);
      
      sim.webhookFailure(j1!);
      const saldoApos1 = sim.users.get('Maria')!.creditBalance;
      
      sim.webhookFailure(j1!, true); // Duplicado
      const saldoApos2 = sim.users.get('Maria')!.creditBalance;
      
      if (saldoApos1 === saldoApos2) {
        return { passou: true, resultado: `✅ Duplicado ignorado (saldo: ${saldoApos1})` };
      }
      return { passou: false, resultado: `Saldo mudou: ${saldoApos1} → ${saldoApos2}`, erro: 'Não deveria mudar' };
    }
  },
  
  // CRÉDITOS
  {
    id: 'cred_1',
    nome: 'Créditos Descontados ao Criar',
    descricao: 'Ao criar um job, os créditos devem ser descontados',
    oQueTestou: 'Usuário com 100 créditos criou job de 60.',
    esperado: 'Saldo deve ser 40',
    categoria: 'creditos',
    icon: <CreditCard className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      sim.createJob('Maria', 'upscaler', 60);
      const saldo = sim.users.get('Maria')!.creditBalance;
      
      if (saldo === 40) {
        return { passou: true, resultado: `✅ Saldo correto: 40 créditos` };
      }
      return { passou: false, resultado: `Saldo: ${saldo}`, erro: 'Deveria ser 40' };
    }
  },
  {
    id: 'cred_2',
    nome: 'Cancelamento na Fila = Reembolso',
    descricao: 'Se cancelar enquanto está na FILA, créditos são devolvidos',
    oQueTestou: 'Criou 4 jobs. O 4º ficou na fila. Cancelou o 4º.',
    esperado: 'Créditos do 4º devem ser devolvidos',
    categoria: 'creditos',
    icon: <RotateCcw className="h-4 w-4" />,
    run: (sim) => {
      for (let i = 1; i <= 4; i++) sim.addUser(`User${i}`, 100);
      sim.createJob('User1', 'upscaler', 60);
      sim.createJob('User2', 'upscaler', 60);
      sim.createJob('User3', 'upscaler', 60);
      const j4 = sim.createJob('User4', 'upscaler', 60);
      
      const saldoAntes = sim.users.get('User4')!.creditBalance;
      sim.cancelJob(j4!, true); // wasQueued = true
      const saldoDepois = sim.users.get('User4')!.creditBalance;
      
      if (saldoAntes === 40 && saldoDepois === 100) {
        return { passou: true, resultado: `✅ Reembolso feito (40 → 100)` };
      }
      return { passou: false, resultado: `Antes: ${saldoAntes}, Depois: ${saldoDepois}`, erro: 'Deveria voltar para 100' };
    }
  },
  {
    id: 'cred_3',
    nome: 'Cancelamento Rodando = SEM Reembolso',
    descricao: 'Se cancelar enquanto está RODANDO, créditos NÃO são devolvidos',
    oQueTestou: 'Criou job (já começou a rodar). Cancelou.',
    esperado: 'Créditos NÃO devem ser devolvidos',
    categoria: 'creditos',
    icon: <Ban className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      const j1 = sim.createJob('Maria', 'upscaler', 60);
      
      const saldoAntes = sim.users.get('Maria')!.creditBalance;
      sim.cancelJob(j1!, false); // wasQueued = false (estava rodando)
      const saldoDepois = sim.users.get('Maria')!.creditBalance;
      
      if (saldoAntes === 40 && saldoDepois === 40) {
        return { passou: true, resultado: `✅ Sem reembolso (saldo mantido: 40)` };
      }
      return { passou: false, resultado: `Antes: ${saldoAntes}, Depois: ${saldoDepois}`, erro: 'Não deveria reembolsar' };
    }
  },
  {
    id: 'cred_4',
    nome: 'Saldo Insuficiente = Bloqueio',
    descricao: 'Não deve criar job se não tiver créditos suficientes',
    oQueTestou: 'Usuário com 30 créditos tentou criar job de 60.',
    esperado: 'Job deve ser BLOQUEADO',
    categoria: 'creditos',
    icon: <Ban className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 30);
      const j1 = sim.createJob('Maria', 'upscaler', 60);
      
      if (j1 === null) {
        return { passou: true, resultado: `✅ Job bloqueado por saldo insuficiente` };
      }
      return { passou: false, resultado: `Job criado: ${j1}`, erro: 'Não deveria criar' };
    }
  },
  
  // FERRAMENTAS
  {
    id: 'tool_upscaler',
    nome: 'Upscaler Funciona',
    descricao: 'Testar fluxo completo do Upscaler',
    oQueTestou: 'Criou job de upscaler, finalizou com sucesso.',
    esperado: 'Status final: "completed"',
    categoria: 'ferramentas',
    icon: <Shield className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      const j1 = sim.createJob('Maria', 'upscaler', 60);
      sim.webhookSuccess(j1!);
      const job = sim.jobs.get(j1!);
      
      if (job?.status === 'completed' && job.toolType === 'upscaler') {
        return { passou: true, resultado: `✅ Upscaler completou com sucesso` };
      }
      return { passou: false, resultado: `Status: ${job?.status}`, erro: 'Deveria estar completed' };
    }
  },
  {
    id: 'tool_pose',
    nome: 'Pose Changer Funciona',
    descricao: 'Testar fluxo completo do Pose Changer',
    oQueTestou: 'Criou job de pose_changer, finalizou com sucesso.',
    esperado: 'Status final: "completed"',
    categoria: 'ferramentas',
    icon: <Shield className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      const j1 = sim.createJob('Maria', 'pose_changer', 60);
      sim.webhookSuccess(j1!);
      const job = sim.jobs.get(j1!);
      
      if (job?.status === 'completed' && job.toolType === 'pose_changer') {
        return { passou: true, resultado: `✅ Pose Changer completou com sucesso` };
      }
      return { passou: false, resultado: `Status: ${job?.status}`, erro: 'Deveria estar completed' };
    }
  },
  {
    id: 'tool_veste',
    nome: 'Veste AI Funciona',
    descricao: 'Testar fluxo completo do Veste AI',
    oQueTestou: 'Criou job de veste_ai, finalizou com sucesso.',
    esperado: 'Status final: "completed"',
    categoria: 'ferramentas',
    icon: <Shield className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      const j1 = sim.createJob('Maria', 'veste_ai', 60);
      sim.webhookSuccess(j1!);
      const job = sim.jobs.get(j1!);
      
      if (job?.status === 'completed' && job.toolType === 'veste_ai') {
        return { passou: true, resultado: `✅ Veste AI completou com sucesso` };
      }
      return { passou: false, resultado: `Status: ${job?.status}`, erro: 'Deveria estar completed' };
    }
  },
  {
    id: 'tool_video',
    nome: 'Video Upscaler Funciona',
    descricao: 'Testar fluxo completo do Video Upscaler',
    oQueTestou: 'Criou job de video_upscaler, finalizou com sucesso.',
    esperado: 'Status final: "completed"',
    categoria: 'ferramentas',
    icon: <Shield className="h-4 w-4" />,
    run: (sim) => {
      sim.addUser('Maria', 100);
      const j1 = sim.createJob('Maria', 'video_upscaler', 60);
      sim.webhookSuccess(j1!);
      const job = sim.jobs.get(j1!);
      
      if (job?.status === 'completed' && job.toolType === 'video_upscaler') {
        return { passou: true, resultado: `✅ Video Upscaler completou com sucesso` };
      }
      return { passou: false, resultado: `Status: ${job?.status}`, erro: 'Deveria estar completed' };
    }
  },
];

// ==================== CATEGORIAS ====================
const categoriaInfo: Record<string, { nome: string; cor: string; icon: React.ReactNode }> = {
  capacidade: { nome: '📊 Capacidade (Limite de 3)', cor: 'border-blue-500/30 bg-blue-500/5', icon: <Layers className="h-5 w-5 text-blue-400" /> },
  fila: { nome: '📋 Fila FIFO', cor: 'border-white/10 bg-white/50/5', icon: <ListOrdered className="h-5 w-5 text-gray-400" /> },
  usuario: { nome: '👤 Um Job por Usuário', cor: 'border-amber-500/30 bg-amber-500/5', icon: <Users className="h-5 w-5 text-amber-400" /> },
  erro: { nome: '❌ Tratamento de Erros', cor: 'border-red-500/30 bg-red-500/5', icon: <XCircle className="h-5 w-5 text-red-400" /> },
  creditos: { nome: '💳 Créditos e Reembolso', cor: 'border-green-500/30 bg-green-500/5', icon: <CreditCard className="h-5 w-5 text-green-400" /> },
  ferramentas: { nome: '🛠️ Ferramentas', cor: 'border-cyan-500/30 bg-cyan-500/5', icon: <Shield className="h-5 w-5 text-cyan-400" /> },
};

// ==================== COMPONENT ====================
const AIJobsSimulator: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['capacidade', 'fila', 'usuario', 'erro', 'creditos', 'ferramentas']));
  const [fuzzIterations, setFuzzIterations] = useState(100);
  const [fuzzResult, setFuzzResult] = useState<{ passed: boolean; eventos: number; problemas: string[] } | null>(null);

  const toggleCategory = (cat: string) => {
    const next = new Set(expandedCategories);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setExpandedCategories(next);
  };

  const runAllTests = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);
    setFuzzResult(null);

    const newResults: ScenarioResult[] = [];
    
    for (let i = 0; i < cenarios.length; i++) {
      const scenario = cenarios[i];
      const sim = new JobQueueSimulator();
      
      try {
        const testResult = scenario.run(sim);
        newResults.push({
          id: scenario.id,
          nome: scenario.nome,
          descricao: scenario.descricao,
          oQueTestou: scenario.oQueTestou,
          esperado: scenario.esperado,
          resultado: testResult.resultado,
          passou: testResult.passou,
          erro: testResult.erro,
          icon: scenario.icon,
          categoria: scenario.categoria,
        });
      } catch (e) {
        newResults.push({
          id: scenario.id,
          nome: scenario.nome,
          descricao: scenario.descricao,
          oQueTestou: scenario.oQueTestou,
          esperado: scenario.esperado,
          resultado: `❌ Erro: ${(e as Error).message}`,
          passou: false,
          erro: (e as Error).message,
          icon: scenario.icon,
          categoria: scenario.categoria,
        });
      }
      
      setProgress(((i + 1) / cenarios.length) * 100);
      setResults([...newResults]);
      await new Promise(r => setTimeout(r, 80));
    }

    setIsRunning(false);
    const passados = newResults.filter(r => r.passou).length;
    
    if (passados === newResults.length) {
      toast.success(`🎉 Todos os ${passados} cenários passaram!`);
    } else {
      toast.error(`⚠️ ${newResults.length - passados} de ${newResults.length} cenários falharam`);
    }
  }, []);

  const runFuzzTest = useCallback(async () => {
    setIsRunning(true);
    setFuzzResult(null);
    setProgress(0);

    const sim = new JobQueueSimulator();
    const users = ['Ana', 'Bruno', 'Carla', 'Diego', 'Eva', 'Fabio', 'Gabi', 'Hugo'];
    const tools: ToolType[] = ['upscaler', 'pose_changer', 'veste_ai', 'video_upscaler'];
    
    for (const u of users) sim.addUser(u, 10000);
    
    const problemas: string[] = [];
    const jobIds: string[] = [];
    
    for (let i = 0; i < fuzzIterations; i++) {
      const rand = Math.random();
      const user = users[Math.floor(Math.random() * users.length)];
      const tool = tools[Math.floor(Math.random() * tools.length)];
      
      if (rand < 0.4) {
        const jid = sim.createJob(user, tool, 60);
        if (jid) jobIds.push(jid);
      } else if (rand < 0.7 && jobIds.length > 0) {
        const idx = Math.floor(Math.random() * jobIds.length);
        sim.webhookSuccess(jobIds[idx]);
      } else if (rand < 0.85 && jobIds.length > 0) {
        const idx = Math.floor(Math.random() * jobIds.length);
        sim.webhookFailure(jobIds[idx]);
      } else if (jobIds.length > 0) {
        const idx = Math.floor(Math.random() * jobIds.length);
        const job = sim.jobs.get(jobIds[idx]);
        sim.cancelJob(jobIds[idx], job?.status === 'queued');
      }
      
      // Verificar invariantes
      const activeCount = sim.getActiveCount();
      if (activeCount > 3) {
        problemas.push(`Evento ${i}: ${activeCount} jobs ativos (máximo é 3)`);
      }
      
      // Verificar 1 job por user
      const activeByUser = new Map<string, number>();
      for (const job of sim.jobs.values()) {
        if (['queued', 'starting', 'running'].includes(job.status)) {
          activeByUser.set(job.userId, (activeByUser.get(job.userId) || 0) + 1);
        }
      }
      for (const [uid, count] of activeByUser) {
        if (count > 1) {
          problemas.push(`Evento ${i}: ${uid} tem ${count} jobs ativos`);
        }
      }
      
      if (i % 10 === 0) {
        setProgress((i / fuzzIterations) * 100);
        await new Promise(r => setTimeout(r, 5));
      }
    }
    
    setFuzzResult({
      passed: problemas.length === 0,
      eventos: fuzzIterations,
      problemas: problemas.slice(0, 10), // Mostrar só os 10 primeiros
    });
    
    setIsRunning(false);
    setProgress(100);
    
    if (problemas.length === 0) {
      toast.success(`✅ Teste aleatório passou! ${fuzzIterations} eventos simulados`);
    } else {
      toast.error(`❌ ${problemas.length} problemas encontrados`);
    }
  }, [fuzzIterations]);

  const passados = results.filter(r => r.passou).length;
  const falharam = results.filter(r => !r.passou).length;

  const resultsByCategory = cenarios.reduce((acc, c) => {
    if (!acc[c.categoria]) acc[c.categoria] = [];
    const result = results.find(r => r.id === c.id);
    if (result) acc[c.categoria].push(result);
    return acc;
  }, {} as Record<string, ScenarioResult[]>);

  return (
    <div className="space-y-6">
      {/* Controles */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
            <Button onClick={runAllTests} disabled={isRunning} className="gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Rodar Todos os Cenários
            </Button>
            <Button onClick={runFuzzTest} disabled={isRunning} variant="outline" className="gap-2">
              <Shuffle className="h-4 w-4" />
              Teste Aleatório
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Eventos aleatórios:</span>
            <Input
              type="number"
              value={fuzzIterations}
              onChange={(e) => setFuzzIterations(parseInt(e.target.value) || 100)}
              className="w-24"
            />
          </div>
        </div>

        {isRunning && (
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{Math.round(progress)}%</p>
          </div>
        )}
      </Card>

      {/* Resumo Final */}
      {results.length > 0 && (
        <Card className={`p-6 border-2 ${falharam === 0 ? 'border-green-500 bg-green-500/5' : 'border-red-500 bg-red-500/5'}`}>
          <div className="text-center">
            {falharam === 0 ? (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-green-500">🎉 TUDO FUNCIONANDO!</h3>
                <p className="text-muted-foreground mt-2">
                  Todos os {passados} cenários passaram com sucesso.
                </p>
              </>
            ) : (
              <>
                <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                <h3 className="text-2xl font-bold text-red-500">⚠️ PROBLEMAS ENCONTRADOS</h3>
                <p className="text-muted-foreground mt-2">
                  {falharam} de {results.length} cenários falharam. Veja os detalhes abaixo.
                </p>
              </>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-green-500/10 rounded-lg text-center">
              <p className="text-3xl font-bold text-green-500">{passados}</p>
              <p className="text-sm text-muted-foreground">Passaram ✓</p>
            </div>
            <div className="p-4 bg-red-500/10 rounded-lg text-center">
              <p className="text-3xl font-bold text-red-500">{falharam}</p>
              <p className="text-sm text-muted-foreground">Falharam ✗</p>
            </div>
          </div>
        </Card>
      )}

      {/* Resultado do Teste Aleatório */}
      {fuzzResult && (
        <Card className={`p-6 border-2 ${fuzzResult.passed ? 'border-green-500 bg-green-500/5' : 'border-red-500 bg-red-500/5'}`}>
          <h4 className="font-bold text-lg mb-2">
            {fuzzResult.passed ? '✅ Teste Aleatório PASSOU' : '❌ Teste Aleatório FALHOU'}
          </h4>
          <p className="text-muted-foreground mb-4">
            Foram simulados {fuzzResult.eventos} eventos aleatórios (criar jobs, finalizar, falhar, cancelar).
          </p>
          {fuzzResult.problemas.length > 0 && (
            <div className="space-y-1">
              <p className="font-medium text-red-400">Problemas encontrados:</p>
              {fuzzResult.problemas.map((p, i) => (
                <p key={i} className="text-sm text-red-300">• {p}</p>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Resultados por Categoria */}
      {results.length > 0 && (
        <div className="space-y-4">
          <h3 className="font-bold text-lg">Detalhes por Categoria</h3>
          
          {Object.entries(categoriaInfo).map(([catId, catInfo]) => {
            const catResults = resultsByCategory[catId] || [];
            if (catResults.length === 0) return null;
            
            const catPassou = catResults.filter(r => r.passou).length;
            const catFalhou = catResults.filter(r => !r.passou).length;
            const isExpanded = expandedCategories.has(catId);
            
            return (
              <Collapsible key={catId} open={isExpanded} onOpenChange={() => toggleCategory(catId)}>
                <Card className={`overflow-hidden ${catInfo.cor}`}>
                  <CollapsibleTrigger className="w-full p-4 flex items-center justify-between hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-3">
                      {catInfo.icon}
                      <span className="font-semibold">{catInfo.nome}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        <span className="text-green-500 font-bold">{catPassou}</span>
                        {catFalhou > 0 && (
                          <span className="text-red-500 font-bold"> / {catFalhou} ❌</span>
                        )}
                      </span>
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </CollapsibleTrigger>
                  
                  <CollapsibleContent>
                    <div className="p-4 pt-0 space-y-3">
                      {catResults.map((result) => (
                        <div
                          key={result.id}
                          className={`p-4 rounded-lg border ${
                            result.passou
                              ? 'border-green-500/30 bg-green-500/5'
                              : 'border-red-500/30 bg-red-500/5'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {result.passou ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                            )}
                            <div className="flex-1 space-y-2">
                              <div>
                                <p className="font-semibold">{result.nome}</p>
                                <p className="text-sm text-muted-foreground">{result.descricao}</p>
                              </div>
                              
                              <div className="grid gap-2 text-sm">
                                <div className="p-2 bg-muted/30 rounded">
                                  <span className="text-muted-foreground">O que testou: </span>
                                  <span>{result.oQueTestou}</span>
                                </div>
                                <div className="p-2 bg-muted/30 rounded">
                                  <span className="text-muted-foreground">Esperado: </span>
                                  <span>{result.esperado}</span>
                                </div>
                                <div className={`p-2 rounded ${result.passou ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                                  <span className="text-muted-foreground">Resultado: </span>
                                  <span className={result.passou ? 'text-green-400' : 'text-red-400'}>
                                    {result.resultado}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AIJobsSimulator;
