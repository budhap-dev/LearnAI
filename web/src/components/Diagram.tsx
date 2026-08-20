import type { ComponentType } from 'react';
import {
  ContextBudgetBar, KnowsVsGuesses, NextTokenLoop, TemperatureReshape, TokenPipeline,
  TrainingPipeline, TransformerBlock, VectorSpace,
} from './diagrams/llm';
import {
  AiAsComponent, AiNestedSets, AiStack, FailureTaxonomy, ThreeKindsOfLearning, TrainVsInfer,
} from './diagrams/foundations';
import {
  CacheHitMiss, ModalityPipeline, ModelRouter, RequestSequence, StreamingTimeline, ToolRoundTrip, TraceWaterfall,
} from './diagrams/apis';
import {
  AgentFailures, AgentLoopStops, McpTopology, MemoryTiers, PatternGallery, SupervisorGate,
} from './diagrams/agents';
import {
  EvalGate, EvalLoop, GoldenLifecycle, JudgeBias, RolloutLadder, ScorerLadder,
} from './diagrams/evals';
import {
  ChunkOverlap, GroundedVsUngrounded, HybridFusion, RagDecisionMatrix, RagEvalTriad, RagPipeline, TwoStageRetrieval,
} from './diagrams/rag';
import {
  ClassicVsLlm, ConfusionMatrixDiagram, DecisionBoundary, KMeansSteps, MlLifecycle, NeuralNet,
} from './diagrams/classicml';
import {
  AccuracyVsThinking, PatternCards, PromptAnatomy, PromptLifecycle, SchemaValidateRetry, TrustBoundary,
} from './diagrams/prompting';

/**
 * Every diagram the notes can reference, by name. A note embeds one with a fence:
 *
 *     ```diagram
 *     token-pipeline
 *     ```
 *
 * On GitHub the fence degrades to a code block naming the diagram; on the site it renders
 * as themed, inline SVG. The build step checks each fence names a diagram declared in the
 * lesson's frontmatter; this registry is where the names resolve to components.
 */
const REGISTRY: Record<string, ComponentType> = {
  'token-pipeline': TokenPipeline,
  'next-token-loop': NextTokenLoop,
  'vector-space': VectorSpace,
  'transformer-block': TransformerBlock,
  'context-budget-bar': ContextBudgetBar,
  'training-pipeline': TrainingPipeline,
  'temperature-reshape': TemperatureReshape,
  'knows-vs-guesses': KnowsVsGuesses,
  'ai-nested-sets': AiNestedSets,
  'train-vs-infer': TrainVsInfer,
  'three-kinds-of-learning': ThreeKindsOfLearning,
  'ai-as-component': AiAsComponent,
  'ai-stack': AiStack,
  'failure-taxonomy': FailureTaxonomy,
  'classic-vs-llm': ClassicVsLlm,
  'decision-boundary': DecisionBoundary,
  'confusion-matrix': ConfusionMatrixDiagram,
  'kmeans-steps': KMeansSteps,
  'ml-lifecycle': MlLifecycle,
  'neural-net': NeuralNet,
  'prompt-anatomy': PromptAnatomy,
  'pattern-cards': PatternCards,
  'schema-validate-retry': SchemaValidateRetry,
  'prompt-lifecycle': PromptLifecycle,
  'accuracy-vs-thinking': AccuracyVsThinking,
  'trust-boundary': TrustBoundary,
  'request-sequence': RequestSequence,
  'streaming-timeline': StreamingTimeline,
  'tool-round-trip': ToolRoundTrip,
  'modality-pipeline': ModalityPipeline,
  'cache-hit-miss': CacheHitMiss,
  'model-router': ModelRouter,
  'trace-waterfall': TraceWaterfall,
  'rag-decision-matrix': RagDecisionMatrix,
  'rag-pipeline': RagPipeline,
  'chunk-overlap': ChunkOverlap,
  'hybrid-fusion': HybridFusion,
  'two-stage-retrieval': TwoStageRetrieval,
  'grounded-vs-ungrounded': GroundedVsUngrounded,
  'rag-eval-triad': RagEvalTriad,
  'pattern-gallery': PatternGallery,
  'agent-loop-stops': AgentLoopStops,
  'mcp-topology': McpTopology,
  'memory-tiers': MemoryTiers,
  'supervisor-gate': SupervisorGate,
  'agent-failures': AgentFailures,
  'eval-loop': EvalLoop,
  'golden-lifecycle': GoldenLifecycle,
  'scorer-ladder': ScorerLadder,
  'judge-bias': JudgeBias,
  'eval-gate': EvalGate,
  'rollout-ladder': RolloutLadder,
};

export function Diagram({ name }: { name: string }) {
  const Found = REGISTRY[name];
  if (!Found) return <p className="missing">Unknown diagram “{name}”.</p>;
  return <Found />;
}
