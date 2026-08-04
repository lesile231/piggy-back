import { eq, asc, gt, and } from "drizzle-orm";
import type { Database } from "@/lib/db/client";
import { flows, flowSteps, flowOptions } from "@/lib/db/schema";

export interface FlowRecord {
  id: string;
  name: string;
  icon: string | null;
  displayNames: unknown;
  sortOrder: number;
}

export interface FlowStepRecord {
  id: string;
  flowId: string;
  stepOrder: number;
  type: string;
  messages: unknown;
  apiAction: string | null;
  config: unknown;
}

export interface FlowOptionRecord {
  id: string;
  labels: unknown;
  value: string;
  nextStepId: string | null;
  sortOrder: number;
}

export class FlowRepository {
  constructor(private db: Database) {}

  async getActiveFlows(): Promise<FlowRecord[]> {
    return await this.db
      .select({
        id: flows.id,
        name: flows.name,
        icon: flows.icon,
        displayNames: flows.displayNames,
        sortOrder: flows.sortOrder,
      })
      .from(flows)
      .where(eq(flows.isActive, true))
      .orderBy(asc(flows.sortOrder));
  }

  async getFirstStep(flowId: string): Promise<FlowStepRecord | null> {
    const results = await this.db
      .select({
        id: flowSteps.id,
        flowId: flowSteps.flowId,
        stepOrder: flowSteps.stepOrder,
        type: flowSteps.type,
        messages: flowSteps.messages,
        apiAction: flowSteps.apiAction,
        config: flowSteps.config,
      })
      .from(flowSteps)
      .where(eq(flowSteps.flowId, flowId))
      .orderBy(asc(flowSteps.stepOrder))
      .limit(1);

    return (results[0] as FlowStepRecord | undefined) ?? null;
  }

  async getStep(stepId: string): Promise<FlowStepRecord | null> {
    const results = await this.db
      .select({
        id: flowSteps.id,
        flowId: flowSteps.flowId,
        stepOrder: flowSteps.stepOrder,
        type: flowSteps.type,
        messages: flowSteps.messages,
        apiAction: flowSteps.apiAction,
        config: flowSteps.config,
      })
      .from(flowSteps)
      .where(eq(flowSteps.id, stepId))
      .limit(1);

    return (results[0] as FlowStepRecord | undefined) ?? null;
  }

  async getNextStep(flowId: string, currentOrder: number): Promise<FlowStepRecord | null> {
    const results = await this.db
      .select({
        id: flowSteps.id,
        flowId: flowSteps.flowId,
        stepOrder: flowSteps.stepOrder,
        type: flowSteps.type,
        messages: flowSteps.messages,
        apiAction: flowSteps.apiAction,
        config: flowSteps.config,
      })
      .from(flowSteps)
      .where(and(eq(flowSteps.flowId, flowId), gt(flowSteps.stepOrder, currentOrder)))
      .orderBy(asc(flowSteps.stepOrder))
      .limit(1);

    return (results[0] as FlowStepRecord | undefined) ?? null;
  }

  async getStepOptions(stepId: string): Promise<FlowOptionRecord[]> {
    return await this.db
      .select({
        id: flowOptions.id,
        labels: flowOptions.labels,
        value: flowOptions.value,
        nextStepId: flowOptions.nextStepId,
        sortOrder: flowOptions.sortOrder,
      })
      .from(flowOptions)
      .where(eq(flowOptions.stepId, stepId))
      .orderBy(asc(flowOptions.sortOrder));
  }
}
