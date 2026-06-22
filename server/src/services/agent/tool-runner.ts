import { randomUUID } from 'node:crypto'
import type { ToolResult } from './tool-registry.js'
import { toolRegistry } from './tool-registry.js'
import type { AgentAccessMode } from './access-mode.js'
import {
  describeToolStart,
  describeToolDone,
  isWriteTool,
  type StoredToolCall,
} from './tool-narration.js'
import type { ExecutedTool } from './follow-up-tools.js'
import { extractNavigatePath } from './follow-up-tools.js'
import { renderDeliveryForTool } from './delivery-template.js'
import { getCapabilityByTool } from './capability-matcher.js'
import { shouldEmitToolReport } from './agent-tool-synthesis.js'

type EventSender = (event: string, data: unknown) => void

type ProcessToolsContext = {
  userId: string
  conversationId: string
  accessMode: AgentAccessMode
  send: EventSender
}

type ProcessToolsResult = {
  storedCalls: StoredToolCall[]
  toolResults: ToolResult[]
  executed: ExecutedTool[]
  navigatePaths: string[]
}

/** 执行一批工具（含 SSE 事件与步骤 narrating） */
export async function processToolInvocations(
  invocations: Array<{ name: string; arguments: Record<string, unknown> }>,
  ctx: ProcessToolsContext,
): Promise<ProcessToolsResult> {
  const storedCalls: StoredToolCall[] = []
  const toolResults: ToolResult[] = []
  const executed: ExecutedTool[] = []
  const navigatePaths: string[] = []

  for (const inv of invocations) {
    const { name, arguments: args } = inv
    const toolCallId = randomUUID()
    const startStep = describeToolStart(name, args)
    let stored: StoredToolCall = {
      id: toolCallId,
      name,
      arguments: args,
      status: 'running',
      steps: [startStep],
    }
    storedCalls.push(stored)

    ctx.send('tool_call', { id: toolCallId, name, arguments: args })
    ctx.send('tool_step', { id: toolCallId, name, phase: 'start', text: startStep })
    ctx.send('text', { delta: `\n> ${startStep}\n` })

    if (ctx.accessMode === 'readonly' && isWriteTool(name)) {
      const blocked = '只读模式下无法执行写操作，请切换到「请求批准」或「完全访问」。'
      stored = {
        ...stored,
        status: 'executed',
        success: false,
        result: blocked,
        steps: [...stored.steps, blocked],
      }
      storedCalls[storedCalls.length - 1] = stored
      const result: ToolResult = { success: false, message: blocked }
      toolResults.push(result)
      executed.push({ name, arguments: args, result })
      ctx.send('tool_result', {
        id: toolCallId,
        name,
        success: false,
        message: blocked,
      })
      continue
    }

    const needsApproval =
      ctx.accessMode === 'approval' && isWriteTool(name)

    if (needsApproval) {
      // Wave C：先发 plan 仪式（基于 03 yaml capability），再走 tool_pending 批准
      const cap = getCapabilityByTool(name)
      if (cap && (cap.requires_confirm || cap.side_effect === 'write_once' || cap.side_effect === 'write_batch')) {
        ctx.send('plan', {
          toolCallId,
          name,
          capabilityId: cap.id,
          title: cap.id,
          steps: [
            {
              key: 'create',
              label: cap.id === 'create_demand' ? '创建需求' :
                cap.id === 'update_demand' ? '更新需求' :
                  cap.id === 'withdraw_demand' ? '下架需求' :
                    cap.id === 'apply_for_demand' ? '提交接单申请' :
                      cap.id === 'accept_applicant' ? '接受申请人' :
                        cap.id === 'reject_applicant' ? '拒绝申请' : cap.id,
            },
            { key: 'confirm', label: '等待你确认' },
            { key: 'submit', label: '提交执行' },
          ],
          delivery: {
            summaryTemplate: cap.delivery.summary_template,
            verification: cap.delivery.verification,
            rollback: cap.delivery.rollback,
            autoNavigate: cap.delivery.auto_navigate ?? false,
          },
        })
      }
      const pendingMessage = describeToolDone(
        name,
        `等待你批准：${startStep.replace(/^正在/, '')}`,
        true,
      )
      stored = {
        ...stored,
        status: 'pending',
        success: false,
        result: pendingMessage,
        data: { pending: true },
        steps: [...stored.steps, pendingMessage],
      }
      storedCalls[storedCalls.length - 1] = stored
      const result: ToolResult = {
        success: false,
        message: pendingMessage,
        data: { pending: true, name, arguments: args },
      }
      toolResults.push(result)
      executed.push({ name, arguments: args, result })
      ctx.send('tool_pending', {
        id: toolCallId,
        name,
        arguments: args,
        message: pendingMessage,
      })
      ctx.send('tool_result', {
        id: toolCallId,
        name,
        success: false,
        data: { pending: true, arguments: args },
        message: pendingMessage,
      })
      continue
    }

    const result = await toolRegistry.execute(name, args, {
      userId: ctx.userId,
      conversationId: ctx.conversationId,
      // Task 10：注入 SSE 发送器，draft_automation_task 用它推 task_draft 事件
      send: ctx.send,
    })
    const doneStep = describeToolDone(name, result.message, false)
    stored = {
      ...stored,
      status: 'executed',
      success: result.success,
      result: result.message,
      data: result.data,
      steps: [...stored.steps, doneStep],
    }
    storedCalls[storedCalls.length - 1] = stored
    toolResults.push(result)
    executed.push({ name, arguments: args, result })

    ctx.send('tool_step', { id: toolCallId, name, phase: 'done', text: doneStep })
    ctx.send('text', { delta: `\n> ${doneStep}\n` })
    ctx.send('tool_result', {
      id: toolCallId,
      name,
      success: result.success,
      data: result.data,
      error: result.error,
      message: result.message,
    })

    // Wave C：写操作 / 导航链才发 report；纯查阅（read_knowledge 等）不发「全部完成」卡
    if (result.success) {
      const cap = getCapabilityByTool(name)
      if (shouldEmitToolReport(cap?.side_effect)) {
        const delivery = renderDeliveryForTool(name, {
          ...args,
          ...((result.data as Record<string, unknown>) ?? {}),
        })
        if (delivery && (delivery.summary || delivery.verification || delivery.rollback)) {
          ctx.send('report', {
            toolCallId,
            name,
            summary: delivery.summary,
            verification: delivery.verification,
            rollback: delivery.rollback,
            autoNavigate: delivery.autoNavigate,
          })
        }
      }
    }

    const navPath = extractNavigatePath(result)
    if (navPath) {
      navigatePaths.push(navPath)
      ctx.send('navigate', { path: navPath })
    }
  }

  return { storedCalls, toolResults, executed, navigatePaths }
}
