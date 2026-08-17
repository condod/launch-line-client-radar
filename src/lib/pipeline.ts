import type { PipelineStatus, ProspectRecord } from '../types';

export const PIPELINE_STAGES: PipelineStatus[] = [
  'New',
  'Researched',
  'Contacted',
  'Follow-up',
  'Meeting booked',
  'Proposal sent',
  'Won',
  'Lost',
  'Do not contact'
];

export const CLOSED_PIPELINE_STAGES: PipelineStatus[] = ['Won', 'Lost', 'Do not contact'];

export function isClosedPipelineStage(stage: PipelineStatus): boolean {
  return CLOSED_PIPELINE_STAGES.includes(stage);
}

export function groupProspectsByStage(prospects: ProspectRecord[]): Record<PipelineStatus, ProspectRecord[]> {
  return PIPELINE_STAGES.reduce<Record<PipelineStatus, ProspectRecord[]>>((acc, stage) => {
    acc[stage] = prospects
      .filter((lead) => lead.pipelineStatus === stage)
      .sort((a, b) => b.scores.priority_score - a.scores.priority_score);
    return acc;
  }, {} as Record<PipelineStatus, ProspectRecord[]>);
}
