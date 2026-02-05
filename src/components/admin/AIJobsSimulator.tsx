import React, { useState, useCallback, useRef } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { 
  Play, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  Loader2,
  RefreshCw,
  Shuffle,
  BarChart3,
  Users,
  Clock,
  Zap
} from "lucide-react";
import { toast } from "sonner";

// ==================== TYPES ====================
type ToolType = 'upscaler' | 'pose_changer' | 'veste_ai' | 'video_upscaler';
type JobStatus = 'pending' | 'queued' | 'starting' | 'running' | 'completed' | 'failed' | 'cancelled';
type EventType = 'CREATE_JOB' | 'WEBHOOK_SUCCESS' | 'WEBHOOK_FAILURE' | 'WEBHOOK_DUPLICATE' | 'CANCEL_JOB' | 'PROCESS_NEXT';

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

interface SimEvent {
  type: EventType;
  jobId?: string;
  userId?: string;
  toolType?: ToolType;
  timestamp: number;
  result?: string;
}

interface InvariantResult {
  name: string;
  passed: boolean;
  message?: string;
}

interface SimulationReport {
  seed: number;
  totalEvents: number;
  totalJobs: number;
  violations: InvariantResult[];
  eventLog: SimEvent[];
  passed: boolean;
}

// ==================== INVARIANT CHECKERS ====================
function checkMaxConcurrent(jobs: Map<string, SimJob>): InvariantResult {
  const activeJobs = [...jobs.values()].filter(
    j => j.status === 'running' || j.status === 'starting'
  );
  return {
    name: 'MAX_CONCURRENT_3',
    passed: activeJobs.length <= 3,
    message: activeJobs.length > 3 ? `${activeJobs.length} jobs ativos (limite: 3)` : undefined,
  };
}

function checkOneJobPerUser(jobs: Map<string, SimJob>): InvariantResult {
  const activeByUser = new Map<string, string[]>();
  for (const job of jobs.values()) {
    if (['queued', 'starting', 'running'].includes(job.status)) {
      const existing = activeByUser.get(job.userId) || [];
      existing.push(job.id);
      activeByUser.set(job.userId, existing);
    }
  }
  for (const [userId, jobIds] of activeByUser) {
    if (jobIds.length > 1) {
      return {
        name: 'ONE_JOB_PER_USER',
        passed: false,
        message: `User ${userId} tem ${jobIds.length} jobs ativos`
      };
    }
  }
  return { name: 'ONE_JOB_PER_USER', passed: true };
}

function checkCreditConsistency(jobs: Map<string, SimJob>, users: Map<string, SimUser>): InvariantResult {
  for (const user of users.values()) {
    for (const job of jobs.values()) {
      if (job.userId !== user.id) continue;
      if (['failed', 'cancelled'].includes(job.status) && job.creditsCharged && !job.creditsRefunded) {
        return {
          name: 'CREDIT_REFUND_ON_FAILURE',
          passed: false,
          message: `Job ${job.id} falhou mas créditos não estornados`
        };
      }
    }
    if (user.creditBalance < 0) {
      return {
        name: 'CREDIT_NO_NEGATIVE',
        passed: false,
        message: `User ${user.id} tem saldo negativo: ${user.creditBalance}`
      };
    }
  }
  return { name: 'CREDIT_CONSISTENCY', passed: true };
}

// ==================== SIMULATOR ENGINE ====================
class JobQueueSimulator {
  jobs: Map<string, SimJob> = new Map();
  users: Map<string, SimUser> = new Map();
  webhooksSent: Set<string> = new Set();
  eventLog: SimEvent[] = [];
  violations: InvariantResult[] = [];
  seed: number;
  jobCounter = 0;

  constructor(seed: number) {
    this.seed = seed;
  }

  addUser(userId: string, credits: number) {
    this.users.set(userId, { id: userId, creditBalance: credits, initialBalance: credits });
  }

  getActiveCount(): number {
    return [...this.jobs.values()].filter(j => j.status === 'running' || j.status === 'starting').length;
  }

  getQueuePosition(): number {
    return [...this.jobs.values()].filter(j => j.status === 'queued').length + 1;
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
    this.eventLog.push({ type: 'CREATE_JOB', jobId, userId, toolType, timestamp: Date.now(), result: job.status });
    this.validateInvariants();
    return jobId;
  }

  webhookSuccess(jobId: string, duplicate = false): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (this.webhooksSent.has(jobId) && duplicate) {
      this.eventLog.push({ type: 'WEBHOOK_DUPLICATE', jobId, timestamp: Date.now(), result: 'ignored' });
      return true;
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) return true;

    job.status = 'completed';
    this.webhooksSent.add(jobId);
    this.eventLog.push({ type: 'WEBHOOK_SUCCESS', jobId, timestamp: Date.now(), result: 'completed' });
    this.processNext();
    this.validateInvariants();
    return true;
  }

  webhookFailure(jobId: string, duplicate = false): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    if (this.webhooksSent.has(jobId) && duplicate) {
      this.eventLog.push({ type: 'WEBHOOK_DUPLICATE', jobId, timestamp: Date.now(), result: 'ignored' });
      return true;
    }

    if (['completed', 'failed', 'cancelled'].includes(job.status)) return true;

    job.status = 'failed';
    if (job.creditsCharged && !job.creditsRefunded) {
      const user = this.users.get(job.userId);
      if (user) {
        user.creditBalance += job.creditCost;
        job.creditsRefunded = true;
      }
    }

    this.webhooksSent.add(jobId);
    this.eventLog.push({ type: 'WEBHOOK_FAILURE', jobId, timestamp: Date.now(), result: 'failed+refunded' });
    this.processNext();
    this.validateInvariants();
    return true;
  }

  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || ['completed', 'failed', 'cancelled'].includes(job.status)) return false;

    job.status = 'cancelled';
    if (job.creditsCharged && !job.creditsRefunded) {
      const user = this.users.get(job.userId);
      if (user) {
        user.creditBalance += job.creditCost;
        job.creditsRefunded = true;
      }
    }

    this.eventLog.push({ type: 'CANCEL_JOB', jobId, timestamp: Date.now(), result: 'cancelled+refunded' });
    this.processNext();
    this.validateInvariants();
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

    this.eventLog.push({ type: 'PROCESS_NEXT', jobId: next.id, timestamp: Date.now(), result: 'promoted' });
    return next.id;
  }

  validateInvariants() {
    const checks = [
      checkMaxConcurrent(this.jobs),
      checkOneJobPerUser(this.jobs),
      checkCreditConsistency(this.jobs, this.users),
    ];
    for (const check of checks) {
      if (!check.passed) this.violations.push(check);
    }
  }

  getReport(): SimulationReport {
    return {
      seed: this.seed,
      totalEvents: this.eventLog.length,
      totalJobs: this.jobs.size,
      violations: this.violations,
      eventLog: this.eventLog,
      passed: this.violations.length === 0,
    };
  }
}

// ==================== PRNG ====================
function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ==================== SCENARIOS ====================
const TOOL_TYPES: ToolType[] = ['upscaler', 'pose_changer', 'veste_ai', 'video_upscaler'];

interface Scenario {
  name: string;
  description: string;
  run: (sim: JobQueueSimulator) => void;
}

const deterministicScenarios: Scenario[] = [
  {
    name: 'CAP_0_ACTIVE',
    description: 'Job com 0 ativos inicia imediatamente',
    run: (sim) => {
      sim.addUser('u1', 100);
      const jid = sim.createJob('u1', 'upscaler', 60);
      const j = sim.jobs.get(jid!);
      if (j?.status !== 'running') throw new Error('Deveria estar running');
    }
  },
  {
    name: 'CAP_3_ACTIVE',
    description: '4º job entra na fila',
    run: (sim) => {
      for (let i = 1; i <= 4; i++) sim.addUser(`u${i}`, 1000);
      sim.createJob('u1', 'upscaler', 60);
      sim.createJob('u2', 'pose_changer', 60);
      sim.createJob('u3', 'veste_ai', 60);
      const j4 = sim.createJob('u4', 'video_upscaler', 60);
      const job = sim.jobs.get(j4!);
      if (job?.status !== 'queued') throw new Error('4º job deveria estar queued');
    }
  },
  {
    name: 'FIFO_ORDER',
    description: 'Fila processa em ordem FIFO',
    run: (sim) => {
      for (let i = 1; i <= 5; i++) sim.addUser(`u${i}`, 1000);
      const j1 = sim.createJob('u1', 'upscaler', 60);
      sim.createJob('u2', 'upscaler', 60);
      sim.createJob('u3', 'upscaler', 60);
      const j4 = sim.createJob('u4', 'upscaler', 60);
      sim.createJob('u5', 'upscaler', 60);
      sim.webhookSuccess(j1!);
      const job4 = sim.jobs.get(j4!);
      if (job4?.status !== 'running') throw new Error('j4 deveria ser promovido');
    }
  },
  {
    name: 'ONE_PER_USER',
    description: 'Bloqueia 2º job do mesmo user',
    run: (sim) => {
      sim.addUser('u1', 1000);
      sim.createJob('u1', 'upscaler', 60);
      const j2 = sim.createJob('u1', 'pose_changer', 60);
      if (j2 !== null) throw new Error('2º job deveria ser bloqueado');
    }
  },
  {
    name: 'ERROR_TERMINAL',
    description: 'Erro é terminal e libera vaga',
    run: (sim) => {
      for (let i = 1; i <= 4; i++) sim.addUser(`u${i}`, 1000);
      const j1 = sim.createJob('u1', 'upscaler', 60);
      sim.createJob('u2', 'upscaler', 60);
      sim.createJob('u3', 'upscaler', 60);
      const j4 = sim.createJob('u4', 'upscaler', 60);
      sim.webhookFailure(j1!);
      const job1 = sim.jobs.get(j1!);
      const job4 = sim.jobs.get(j4!);
      if (job1?.status !== 'failed') throw new Error('j1 deveria estar failed');
      if (job4?.status !== 'running') throw new Error('j4 deveria ter sido promovido');
    }
  },
  {
    name: 'WEBHOOK_IDEMPOTENT',
    description: 'Webhook duplicado não duplica reembolso',
    run: (sim) => {
      sim.addUser('u1', 1000);
      const j1 = sim.createJob('u1', 'upscaler', 60);
      sim.webhookFailure(j1!);
      const balanceAfterFirst = sim.users.get('u1')!.creditBalance;
      sim.webhookFailure(j1!, true);
      const balanceAfterDup = sim.users.get('u1')!.creditBalance;
      if (balanceAfterDup !== balanceAfterFirst) throw new Error('Duplicou reembolso');
    }
  },
  {
    name: 'CANCEL_REFUND',
    description: 'Cancelamento estorna créditos',
    run: (sim) => {
      sim.addUser('u1', 100);
      const j1 = sim.createJob('u1', 'upscaler', 60);
      sim.cancelJob(j1!);
      const balance = sim.users.get('u1')!.creditBalance;
      if (balance !== 100) throw new Error(`Créditos não estornados: ${balance}`);
    }
  },
  ...TOOL_TYPES.map(tool => ({
    name: `TOOL_${tool.toUpperCase()}`,
    description: `Workflow ${tool} funciona`,
    run: (sim: JobQueueSimulator) => {
      sim.addUser('u1', 1000);
      const jid = sim.createJob('u1', tool, 60);
      sim.webhookSuccess(jid!);
      const j = sim.jobs.get(jid!);
      if (j?.status !== 'completed') throw new Error(`${tool} não completou`);
    }
  }))
];

// ==================== COMPONENT ====================
const AIJobsSimulator: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<{ name: string; passed: boolean; error?: string }[]>([]);
  const [fuzzResults, setFuzzResults] = useState<SimulationReport | null>(null);
  const [fuzzIterations, setFuzzIterations] = useState(50);
  const [customSeed, setCustomSeed] = useState('');
  const [progress, setProgress] = useState(0);

  const runDeterministic = useCallback(async () => {
    setIsRunning(true);
    setResults([]);
    setProgress(0);

    const newResults: typeof results = [];
    for (let i = 0; i < deterministicScenarios.length; i++) {
      const scenario = deterministicScenarios[i];
      const sim = new JobQueueSimulator(12345);
      try {
        scenario.run(sim);
        const hasViolations = sim.violations.length > 0;
        newResults.push({
          name: scenario.name,
          passed: !hasViolations,
          error: hasViolations ? sim.violations.map(v => v.message).join(', ') : undefined
        });
      } catch (e) {
        newResults.push({ name: scenario.name, passed: false, error: (e as Error).message });
      }
      setProgress(((i + 1) / deterministicScenarios.length) * 100);
      setResults([...newResults]);
      await new Promise(r => setTimeout(r, 50));
    }

    setIsRunning(false);
    const passedCount = newResults.filter(r => r.passed).length;
    if (passedCount === newResults.length) {
      toast.success(`✅ Todos ${passedCount} cenários passaram!`);
    } else {
      toast.error(`❌ ${newResults.length - passedCount} cenários falharam`);
    }
  }, []);

  const runFuzz = useCallback(async () => {
    setIsRunning(true);
    setFuzzResults(null);
    setProgress(0);

    const seed = customSeed ? parseInt(customSeed) : Date.now();
    const random = mulberry32(seed);
    const users = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8'];
    const sim = new JobQueueSimulator(seed);

    for (const uid of users) sim.addUser(uid, 10000);

    const runningJobIds: string[] = [];

    for (let i = 0; i < fuzzIterations; i++) {
      const eventType = random();
      const userId = users[Math.floor(random() * users.length)];
      const toolType = TOOL_TYPES[Math.floor(random() * TOOL_TYPES.length)];

      if (eventType < 0.4) {
        const jid = sim.createJob(userId, toolType, 60);
        if (jid) runningJobIds.push(jid);
      } else if (eventType < 0.6 && runningJobIds.length > 0) {
        const idx = Math.floor(random() * runningJobIds.length);
        sim.webhookSuccess(runningJobIds[idx]);
      } else if (eventType < 0.75 && runningJobIds.length > 0) {
        const idx = Math.floor(random() * runningJobIds.length);
        sim.webhookFailure(runningJobIds[idx]);
      } else if (eventType < 0.85 && runningJobIds.length > 0) {
        const idx = Math.floor(random() * runningJobIds.length);
        sim.webhookSuccess(runningJobIds[idx], true);
      } else if (runningJobIds.length > 0) {
        const idx = Math.floor(random() * runningJobIds.length);
        sim.cancelJob(runningJobIds[idx]);
      }

      if (i % 10 === 0) {
        setProgress((i / fuzzIterations) * 100);
        await new Promise(r => setTimeout(r, 10));
      }
    }

    const report = sim.getReport();
    setFuzzResults(report);
    setIsRunning(false);
    setProgress(100);

    if (report.passed) {
      toast.success(`✅ Fuzz test passou! Seed: ${seed}`);
    } else {
      toast.error(`❌ Fuzz test falhou! ${report.violations.length} violações`);
    }
  }, [fuzzIterations, customSeed]);

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="p-6">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-3">
            <Button onClick={runDeterministic} disabled={isRunning} className="gap-2">
              {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Rodar Cenários
            </Button>
            <Button onClick={runFuzz} disabled={isRunning} variant="outline" className="gap-2">
              <Shuffle className="h-4 w-4" />
              Fuzz Test
            </Button>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Seed (opcional)"
              value={customSeed}
              onChange={(e) => setCustomSeed(e.target.value)}
              className="w-32"
            />
            <Input
              type="number"
              placeholder="Iterações"
              value={fuzzIterations}
              onChange={(e) => setFuzzIterations(parseInt(e.target.value) || 50)}
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

      {/* Stats */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary" />
              <div>
                <p className="text-2xl font-bold">{results.length}</p>
                <p className="text-xs text-muted-foreground">Cenários</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-green-500/30 bg-green-500/5">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold text-green-500">{passedCount}</p>
                <p className="text-xs text-muted-foreground">Passaram</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border-red-500/30 bg-red-500/5">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold text-red-500">{failedCount}</p>
                <p className="text-xs text-muted-foreground">Falharam</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Resultados Determinísticos</h4>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {results.map((r, i) => (
                <div key={i} className={`p-3 rounded-lg flex items-center justify-between ${r.passed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <div className="flex items-center gap-2">
                    {r.passed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-mono text-sm">{r.name}</span>
                  </div>
                  {r.error && <span className="text-xs text-red-400">{r.error}</span>}
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      {/* Fuzz Results */}
      {fuzzResults && (
        <Card className="p-4">
          <h4 className="font-semibold mb-3">Resultados Fuzz Test</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Seed</p>
              <p className="font-mono text-sm">{fuzzResults.seed}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Eventos</p>
              <p className="font-bold">{fuzzResults.totalEvents}</p>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <p className="text-xs text-muted-foreground">Jobs</p>
              <p className="font-bold">{fuzzResults.totalJobs}</p>
            </div>
            <div className={`p-3 rounded-lg ${fuzzResults.passed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className={`font-bold ${fuzzResults.passed ? 'text-green-500' : 'text-red-500'}`}>
                {fuzzResults.passed ? 'PASSOU' : 'FALHOU'}
              </p>
            </div>
          </div>

          {fuzzResults.violations.length > 0 && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="font-medium text-red-400 mb-2">Violações encontradas:</p>
              {fuzzResults.violations.map((v, i) => (
                <p key={i} className="text-xs text-red-300">• {v.name}: {v.message}</p>
              ))}
            </div>
          )}

          <ScrollArea className="h-48 mt-4">
            <div className="space-y-1">
              {fuzzResults.eventLog.slice(-30).map((e, i) => (
                <div key={i} className="text-xs font-mono p-1 bg-muted/20 rounded flex justify-between">
                  <span>{e.type}</span>
                  <span className="text-muted-foreground">{e.jobId || ''} → {e.result || ''}</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}
    </div>
  );
};

export default AIJobsSimulator;
