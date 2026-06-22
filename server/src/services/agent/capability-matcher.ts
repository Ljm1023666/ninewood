import fs from 'fs';
import nodePath from 'path';
import { fileURLToPath } from 'url';

const __dirname = nodePath.dirname(fileURLToPath(import.meta.url));
const CAPABILITIES_FILE = nodePath.resolve(
  __dirname,
  '../../../ai-knowledge/03-agent-capabilities.yaml',
);

export type SideEffectLevel = 'none' | 'navigate' | 'write_once' | 'write_batch';
export type RiskLevel = 'read' | 'low' | 'medium' | 'high' | 'forbidden';

export interface DeliverySpec {
  summary_template?: string;
  verification?: { path?: string; label?: string };
  rollback?: { hint?: string; utterance?: string; tool?: string; within_minutes?: number | null };
  auto_navigate?: boolean;
}

export interface Capability {
  id: string;
  layer: string;
  tool: string | null;
  risk: RiskLevel;
  side_effect: SideEffectLevel;
  intent_signals: string[];
  plan_template?: string | null;
  composite_chain?: unknown;
  rule_ids?: string[];
  requires_confirm: boolean;
  batchable?: boolean;
  batch_limit?: number;
  est_duration?: string;
  delivery: DeliverySpec;
  fallback_faq?: string | null;
  notes?: string;
}

export interface ForbiddenEntry {
  id: string;
  signals: string[];
  message: string;
  redirect?: string;
  redirect_pattern?: string;
  fallback_page?: string;
}

export interface MatchedCapability { capability: Capability; score: number; }
export interface ForbiddenHit { entry: ForbiddenEntry; matchedSignal: string; }

interface ParsedYaml { forbidden: ForbiddenEntry[]; capabilities: Capability[]; }

let cache: ParsedYaml | null = null;

function normalize(text: string): string {
  return (text || '').replace(/\s+/g, '').toLowerCase();
}

function signalMatches(signal: string, utterance: string): boolean {
  const s = normalize(signal);
  const u = normalize(utterance);
  if (!s) return false;
  return u.includes(s);
}

function getBlockHeaderIndent(line: string): number | null {
  const m = line.match(/^([ \t]*)(forbidden|capabilities|delivery_templates):\s*$/);
  if (!m) return null;
  return m[1].length;
}

function startNewItem(
  line: string,
  section: 'forbidden' | 'capabilities' | null,
): { item: ForbiddenEntry | Capability; kind: 'forbidden' | 'capability' } | null {
  const m = line.match(/^[ \t]*-[ \t]+id:[ \t]*(.+?)\s*$/);
  if (!m) return null;
  const id = m[1].replace(/^["']|["']$/g, '');
  if (section === 'forbidden') {
    return { item: { id, signals: [], message: '' }, kind: 'forbidden' };
  }
  if (section === 'capabilities') {
    return {
      item: {
        id,
        layer: 'operational',
        tool: null,
        risk: 'read',
        side_effect: 'none',
        intent_signals: [],
        requires_confirm: false,
        delivery: {},
      },
      kind: 'capability',
    };
  }
  return null;
}

function assignScalar(
  item: ForbiddenEntry | Capability,
  kind: 'forbidden' | 'capability',
  key: string,
  value: string,
): void {
  if (kind === 'forbidden') {
    const f = item as ForbiddenEntry;
    if (key === 'signals') return;
    if (key === 'message') f.message = value;
    else if (key === 'redirect') f.redirect = value;
    else if (key === 'redirect_pattern') f.redirect_pattern = value;
    else if (key === 'fallback_page') f.fallback_page = value;
    return;
  }
  const c = item as Capability;
  if (key === 'tool') c.tool = value === 'null' ? null : value;
  else if (key === 'layer') c.layer = value;
  else if (key === 'risk') c.risk = value as RiskLevel;
  else if (key === 'side_effect') c.side_effect = value as SideEffectLevel;
  else if (key === 'plan_template') c.plan_template = value === 'null' ? null : value;
  else if (key === 'fallback_faq') c.fallback_faq = value === 'null' ? null : value;
  else if (key === 'est_duration') c.est_duration = value;
  else if (key === 'requires_confirm') c.requires_confirm = value === 'true';
  else if (key === 'batchable') c.batchable = value === 'true';
  else if (key === 'batch_limit') c.batch_limit = Number(value);
  else if (key === 'notes') c.notes = value;
}

function parseDeliveryBlock(raw: string): DeliverySpec {
  const lines = raw.split(/\r?\n/);
  const out: DeliverySpec = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    if (trimmed === "auto_navigate:" || trimmed.startsWith("auto_navigate:")) {
      const m = trimmed.match(/^auto_navigate:\s*(.+?)\s*$/);
      if (m) out.auto_navigate = m[1] === "true";
      continue;
    }
    if (trimmed === "summary_template:" || trimmed.startsWith("summary_template:")) {
      const m = trimmed.match(/^summary_template:\s*(.+?)\s*$/);
      if (m) out.summary_template = m[1].replace(/^["']|["']$/g, "");
      continue;
    }
    if (trimmed === "verification:") {
      out.verification = {};
      continue;
    }
    if (trimmed.startsWith("verification ")) continue;
    if (trimmed.startsWith("path:") && out.verification) {
      const m = trimmed.match(/^path:\s*(.+)\s*$/);
      if (m) out.verification.path = m[1].trim().replace(/^["']|["']$/g, "");
      continue;
    }
    if (trimmed.startsWith("label:") && out.verification) {
      const m = trimmed.match(/^label:\s*(.+)\s*$/);
      if (m) out.verification.label = m[1].trim().replace(/^["']|["']$/g, "");
      continue;
    }
    if (trimmed === "rollback:") {
      out.rollback = {};
      continue;
    }
    if (trimmed.startsWith("rollback ")) continue;
    if (out.rollback) {
      const m = trimmed.match(/^([a-zA-Z_]+):\s*(.+?)\s*$/);
      if (m) {
        const k = m[1];
        let v = m[2].replace(/^["']|["']$/g, "");
        if (k === "hint") out.rollback.hint = v;
        else if (k === "utterance") out.rollback.utterance = v;
        else if (k === "tool") out.rollback.tool = v;
        else if (k === "within_minutes") {
          out.rollback.within_minutes = v === "null" ? null : Number(v);
        }
      }
    }
  }
  return out;
}

function parseCapabilitiesYaml(raw: string): ParsedYaml {
  const lines = raw.split(/\r?\n/);
  const forbidden: ForbiddenEntry[] = [];
  const capabilities: Capability[] = [];

  let section: 'forbidden' | 'capabilities' | null = null;
  let current: ForbiddenEntry | Capability | null = null;
  let currentKind: 'forbidden' | 'capability' | null = null;
  let arrayKey: string | null = null;
  let arrayIndent = -1;
  let deliveryIndent = -1;
  let inDelivery = false;
  let deliveryStart = -1;

  function flushDelivery(endIdx: number) {
    if (!inDelivery) return;
    if (currentKind === 'capability' && deliveryStart > 0 && deliveryStart < endIdx) {
      const sub = lines.slice(deliveryStart, endIdx).join('\n');
      (current as Capability).delivery = parseDeliveryBlock(sub);
    }
    inDelivery = false;
    deliveryStart = -1;
  }

  function commit() {
    flushDelivery(lines.length);
    if (!current) return;
    if (currentKind === 'forbidden') forbidden.push(current as ForbiddenEntry);
    else if (currentKind === 'capability') capabilities.push(current as Capability);
    current = null;
    currentKind = null;
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    const indentMatch = raw.match(/^([ \t]*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    const trimmed = raw.trim();

    const blockIndent = getBlockHeaderIndent(raw);
    if (blockIndent !== null) {
      commit();
      section = trimmed.replace(':', '') as 'forbidden' | 'capabilities';
      arrayKey = null;
      inDelivery = false;
      continue;
    }

    // 在切换 capability 之前先结束当前 delivery 块,确保 delivery 归属于上一个 capability
    if (inDelivery && indent <= deliveryIndent) {
      flushDelivery(i);
    }

    if (section && /^-\s+id:/.test(trimmed) && indent <= 2) {
      commit();
      const started = startNewItem(raw, section);
      if (started) {
        current = started.item;
        currentKind = started.kind;
      } else {
        current = null;
        currentKind = null;
      }
      arrayKey = null;
      continue;
    }

    if (!current || !currentKind) continue;

    if (trimmed === 'delivery:') {
      inDelivery = true;
      deliveryIndent = indent;
      deliveryStart = i + 1;
      arrayKey = null;
      continue;
    }
    if (inDelivery && indent > deliveryIndent) {
      // 仍在 delivery 块内
      continue;
    }
    if (inDelivery) {
      flushDelivery(i);
    }

    if (arrayKey && indent >= arrayIndent && trimmed.startsWith('-')) {
      const value = trimmed.replace(/^-\s+/, '').replace(/^["']|["']$/g, '');
      if (currentKind === 'forbidden' && arrayKey === 'signals') {
        (current as ForbiddenEntry).signals.push(value);
      } else if (currentKind === 'capability' && (arrayKey === 'intent_signals' || arrayKey === 'rule_ids')) {
        (current as unknown as Record<string, string[]>)[arrayKey].push(value);
      }
      continue;
    } else {
      arrayKey = null;
    }

    const m = trimmed.match(/^([a-zA-Z_]+):[ \t]*(.*?)\s*$/);
    if (!m) continue;
    const key = m[1];
    let rest = m[2];

    const hashIdx = rest.indexOf('#');
    if (hashIdx >= 0) {
      rest = rest.slice(0, hashIdx).trim();
    }

    if (rest === '') {
      arrayKey = key;
      arrayIndent = indent + 2;
      if (currentKind === 'forbidden' && key === 'signals') {
        (current as ForbiddenEntry).signals = [];
      } else if (currentKind === 'capability' && (key === 'intent_signals' || key === 'rule_ids')) {
        (current as unknown as Record<string, string[]>)[key] = [];
      }
      continue;
    }

    if (rest.startsWith('[') && rest.endsWith(']')) {
      const inner = rest.slice(1, -1).trim();
      const values = inner
        ? inner.split(',').map((v) => v.trim().replace(/^["']|["']$/g, ''))
        : [];
      if (currentKind === 'forbidden' && key === 'signals') {
        (current as ForbiddenEntry).signals = values;
      } else if (currentKind === 'capability' && (key === 'intent_signals' || key === 'rule_ids')) {
        (current as unknown as Record<string, string[]>)[key] = values;
      }
      continue;
    }

    const value = rest.replace(/^["']|["']$/g, '');
    assignScalar(current, currentKind, key, value);
  }

  commit();
  return { forbidden, capabilities };
}

function loadParsed(): ParsedYaml {
  if (cache) return cache;
  if (!fs.existsSync(CAPABILITIES_FILE)) {
    console.warn('[capability-matcher] 03 yaml not found:', CAPABILITIES_FILE);
    cache = { forbidden: [], capabilities: [] };
    return cache;
  }
  try {
    const raw = fs.readFileSync(CAPABILITIES_FILE, 'utf-8');
    cache = parseCapabilitiesYaml(raw);
  } catch (e: any) {
    console.error('[capability-matcher] parse failed:', e.message);
    cache = { forbidden: [], capabilities: [] };
  }
  return cache;
}

export function invalidateCapabilityCache(): void {
  cache = null;
}

export function matchForbidden(utterance: string): ForbiddenHit | null {
  const { forbidden } = loadParsed();
  for (const entry of forbidden) {
    for (const signal of entry.signals) {
      if (signalMatches(signal, utterance)) {
        return { entry, matchedSignal: signal };
      }
    }
  }
  return null;
}

export function matchCapabilities(utterance: string): MatchedCapability[] {
  const { capabilities } = loadParsed();
  const u = normalize(utterance);
  if (!u) return [];
  const out: MatchedCapability[] = [];
  for (const cap of capabilities) {
    let score = 0;
    for (const s of cap.intent_signals) {
      const sn = normalize(s);
      if (sn && u.includes(sn)) score += 1;
    }
    if (score > 0) out.push({ capability: cap, score });
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

export function getCapabilityById(id: string): Capability | null {
  return loadParsed().capabilities.find((c) => c.id === id) ?? null;
}

export function getCapabilityByTool(toolName: string): Capability | null {
  return loadParsed().capabilities.find((c) => c.tool === toolName) ?? null;
}

export function listCapabilities(): Capability[] {
  return [...loadParsed().capabilities];
}

export function listForbidden(): ForbiddenEntry[] {
  return [...loadParsed().forbidden];
}
