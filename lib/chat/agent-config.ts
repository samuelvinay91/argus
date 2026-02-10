/**
 * Agent Configuration
 *
 * UI metadata for all 30+ AI agents in the Skopaq system.
 * Maps agent types to display names, icons, colors, and capabilities
 * for the agent visibility panel.
 */

import {
  Code2,
  Wand2,
  Eye,
  TestTube,
  FileSearch,
  Bug,
  Shield,
  Gauge,
  Accessibility,
  Sparkles,
  Globe,
  Database,
  GitBranch,
  AlertTriangle,
  Workflow,
  Brain,
  Cpu,
  Network,
  BookOpen,
  Search,
  Wrench,
  Zap,
  BarChart3,
  FileCode,
  Settings,
  Layers,
  Activity,
  Target,
  Boxes,
  type LucideIcon,
} from 'lucide-react';

// =============================================================================
// TYPES
// =============================================================================

export interface AgentUIConfig {
  /** Display name for the agent */
  name: string;
  /** Optional description */
  description?: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Tailwind color class (without prefix) */
  color: string;
  /** Background color with opacity */
  bgColor: string;
  /** Agent capabilities for filtering/searching */
  capabilities: string[];
  /** Category for grouping */
  category: AgentCategory;
}

export type AgentCategory =
  | 'testing'
  | 'analysis'
  | 'healing'
  | 'intelligence'
  | 'integration'
  | 'infrastructure';

export type AgentType =
  | 'code_analyzer'
  | 'self_healer'
  | 'visual_ai'
  | 'ui_tester'
  | 'api_tester'
  | 'db_tester'
  | 'nlp_test_creator'
  | 'test_planner'
  | 'test_impact_analyzer'
  | 'smart_test_selector'
  | 'flaky_test_detector'
  | 'performance_analyzer'
  | 'security_scanner'
  | 'accessibility_checker'
  | 'auto_discovery'
  | 'reporter'
  | 'sre_agent'
  | 'agent_as_judge'
  | 'meta_judge'
  | 'corrective_rag'
  | 'adaptive_rag_router'
  | 'tool_discovery'
  | 'tool_creator'
  | 'git_analyzer'
  | 'mr_analyzer'
  | 'supervisor'
  | 'router'
  | 'memory_manager'
  | 'planning_middleware'
  | 'workflow_composer';

// =============================================================================
// AGENT CONFIGURATIONS
// =============================================================================

export const AGENT_CONFIG: Record<AgentType, AgentUIConfig> = {
  // === Testing Agents ===
  code_analyzer: {
    name: 'Code Analyzer',
    description: 'Analyzes source code structure and patterns',
    icon: Code2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    capabilities: ['code_analysis', 'git_blame', 'dependency_analysis'],
    category: 'analysis',
  },

  self_healer: {
    name: 'Self-Healer',
    description: '99.9% accuracy in fixing broken tests',
    icon: Wand2,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    capabilities: ['selector_fix', 'auto_healing', 'pattern_matching'],
    category: 'healing',
  },

  visual_ai: {
    name: 'Visual AI',
    description: 'Screenshot comparison and visual testing',
    icon: Eye,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    capabilities: ['visual_testing', 'screenshot_capture', 'visual_diff'],
    category: 'testing',
  },

  ui_tester: {
    name: 'UI Tester',
    description: 'Browser-based UI testing with Playwright',
    icon: TestTube,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    capabilities: ['browser_testing', 'element_interaction', 'form_testing'],
    category: 'testing',
  },

  api_tester: {
    name: 'API Tester',
    description: 'REST/GraphQL API testing with validation',
    icon: Network,
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
    capabilities: ['api_testing', 'schema_validation', 'response_testing'],
    category: 'testing',
  },

  db_tester: {
    name: 'DB Tester',
    description: 'Database state and integrity validation',
    icon: Database,
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
    capabilities: ['db_testing', 'data_validation', 'query_testing'],
    category: 'testing',
  },

  nlp_test_creator: {
    name: 'NLP Test Creator',
    description: 'Natural language to test conversion',
    icon: Sparkles,
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
    capabilities: ['nlp_parsing', 'test_generation', 'intent_detection'],
    category: 'intelligence',
  },

  test_planner: {
    name: 'Test Planner',
    description: 'Creates prioritized test plans',
    icon: Workflow,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    capabilities: ['test_planning', 'priority_analysis', 'coverage_planning'],
    category: 'analysis',
  },

  test_impact_analyzer: {
    name: 'Test Impact Analyzer',
    description: 'AI-powered test impact analysis',
    icon: Target,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    capabilities: ['impact_analysis', 'change_detection', 'risk_assessment'],
    category: 'analysis',
  },

  smart_test_selector: {
    name: 'Smart Test Selector',
    description: 'Risk-based test selection',
    icon: Zap,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
    capabilities: ['test_selection', 'risk_scoring', 'optimization'],
    category: 'intelligence',
  },

  flaky_test_detector: {
    name: 'Flaky Test Detector',
    description: 'Identifies unstable tests',
    icon: AlertTriangle,
    color: 'text-orange-400',
    bgColor: 'bg-orange-400/10',
    capabilities: ['flaky_detection', 'stability_analysis', 'pattern_detection'],
    category: 'analysis',
  },

  performance_analyzer: {
    name: 'Performance Analyzer',
    description: 'Performance testing and optimization',
    icon: Gauge,
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
    capabilities: ['performance_testing', 'metrics_collection', 'bottleneck_detection'],
    category: 'testing',
  },

  security_scanner: {
    name: 'Security Scanner',
    description: 'Security vulnerability scanning',
    icon: Shield,
    color: 'text-red-600',
    bgColor: 'bg-red-600/10',
    capabilities: ['security_scanning', 'vulnerability_detection', 'compliance_check'],
    category: 'testing',
  },

  accessibility_checker: {
    name: 'Accessibility Checker',
    description: 'WCAG compliance testing',
    icon: Accessibility,
    color: 'text-blue-600',
    bgColor: 'bg-blue-600/10',
    capabilities: ['a11y_testing', 'wcag_validation', 'aria_checking'],
    category: 'testing',
  },

  auto_discovery: {
    name: 'Auto Discovery',
    description: 'Autonomous app crawling and discovery',
    icon: Search,
    color: 'text-violet-500',
    bgColor: 'bg-violet-500/10',
    capabilities: ['element_discovery', 'flow_detection', 'app_mapping'],
    category: 'analysis',
  },

  reporter: {
    name: 'Reporter',
    description: 'Generates reports and creates tickets',
    icon: BarChart3,
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    capabilities: ['report_generation', 'ticket_creation', 'notification'],
    category: 'integration',
  },

  // === Advanced Agentic AI Patterns ===
  sre_agent: {
    name: 'SRE Agent',
    description: 'Unified incident correlation and runbooks',
    icon: Activity,
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
    capabilities: ['incident_correlation', 'runbook_execution', 'mttr_optimization'],
    category: 'infrastructure',
  },

  agent_as_judge: {
    name: 'Agent-as-Judge',
    description: 'Multi-agent evaluation with debate',
    icon: Brain,
    color: 'text-fuchsia-500',
    bgColor: 'bg-fuchsia-500/10',
    capabilities: ['quality_evaluation', 'debate_protocol', 'consensus_building'],
    category: 'intelligence',
  },

  meta_judge: {
    name: 'Meta Judge',
    description: 'Arbitrates judge disagreements',
    icon: Layers,
    color: 'text-purple-600',
    bgColor: 'bg-purple-600/10',
    capabilities: ['arbitration', 'meta_evaluation', 'conflict_resolution'],
    category: 'intelligence',
  },

  corrective_rag: {
    name: 'Corrective RAG',
    description: 'Self-correcting retrieval (CRAG)',
    icon: FileSearch,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    capabilities: ['retrieval', 'self_correction', 'relevance_assessment'],
    category: 'intelligence',
  },

  adaptive_rag_router: {
    name: 'Adaptive RAG Router',
    description: 'Dynamic retrieval strategy selection',
    icon: GitBranch,
    color: 'text-sky-500',
    bgColor: 'bg-sky-500/10',
    capabilities: ['strategy_selection', 'query_routing', 'adaptive_retrieval'],
    category: 'intelligence',
  },

  tool_discovery: {
    name: 'Tool Discovery',
    description: 'Discovers tools from API docs (ToolLLM)',
    icon: Wrench,
    color: 'text-stone-500',
    bgColor: 'bg-stone-500/10',
    capabilities: ['tool_discovery', 'api_parsing', 'capability_mapping'],
    category: 'infrastructure',
  },

  tool_creator: {
    name: 'Tool Creator',
    description: 'Creates tools for capability gaps (CREATOR)',
    icon: Settings,
    color: 'text-zinc-500',
    bgColor: 'bg-zinc-500/10',
    capabilities: ['tool_creation', 'gap_analysis', 'code_generation'],
    category: 'infrastructure',
  },

  git_analyzer: {
    name: 'Git Analyzer',
    description: 'Git history and blame analysis',
    icon: GitBranch,
    color: 'text-gray-600',
    bgColor: 'bg-gray-600/10',
    capabilities: ['git_blame', 'history_analysis', 'commit_tracking'],
    category: 'analysis',
  },

  mr_analyzer: {
    name: 'MR/PR Analyzer',
    description: 'Merge request and pull request analysis',
    icon: FileCode,
    color: 'text-green-600',
    bgColor: 'bg-green-600/10',
    capabilities: ['pr_analysis', 'code_review', 'change_detection'],
    category: 'integration',
  },

  // === Orchestration Agents ===
  supervisor: {
    name: 'Supervisor',
    description: 'Multi-agent orchestration',
    icon: Cpu,
    color: 'text-blue-700',
    bgColor: 'bg-blue-700/10',
    capabilities: ['agent_routing', 'task_delegation', 'orchestration'],
    category: 'infrastructure',
  },

  router: {
    name: 'Router',
    description: 'Intelligent model and task routing',
    icon: Network,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-600/10',
    capabilities: ['model_routing', 'task_classification', 'load_balancing'],
    category: 'infrastructure',
  },

  memory_manager: {
    name: 'Memory Manager',
    description: 'Episodic and procedural memory',
    icon: BookOpen,
    color: 'text-amber-600',
    bgColor: 'bg-amber-600/10',
    capabilities: ['memory_storage', 'context_retrieval', 'learning'],
    category: 'intelligence',
  },

  planning_middleware: {
    name: 'Planning Middleware',
    description: 'TodoList-based planning (Deep Agent)',
    icon: Workflow,
    color: 'text-violet-600',
    bgColor: 'bg-violet-600/10',
    capabilities: ['task_decomposition', 'planning', 'progress_tracking'],
    category: 'infrastructure',
  },

  workflow_composer: {
    name: 'Workflow Composer',
    description: 'Dynamic workflow composition',
    icon: Boxes,
    color: 'text-pink-600',
    bgColor: 'bg-pink-600/10',
    capabilities: ['workflow_creation', 'agent_coordination', 'parallel_execution'],
    category: 'infrastructure',
  },
};

// =============================================================================
// CATEGORY CONFIGURATIONS
// =============================================================================

export const CATEGORY_CONFIG: Record<AgentCategory, { name: string; color: string; bgColor: string }> = {
  testing: {
    name: 'Testing',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  analysis: {
    name: 'Analysis',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  healing: {
    name: 'Self-Healing',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  intelligence: {
    name: 'Intelligence',
    color: 'text-pink-500',
    bgColor: 'bg-pink-500/10',
  },
  integration: {
    name: 'Integration',
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
  },
  infrastructure: {
    name: 'Infrastructure',
    color: 'text-amber-500',
    bgColor: 'bg-amber-500/10',
  },
};

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Get agent config by type, with fallback for unknown agents
 */
export function getAgentConfig(agentType: string): AgentUIConfig {
  const config = AGENT_CONFIG[agentType as AgentType];
  if (config) return config;

  // Fallback for unknown agent types
  return {
    name: agentType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    icon: Cpu,
    color: 'text-gray-500',
    bgColor: 'bg-gray-500/10',
    capabilities: [],
    category: 'infrastructure',
  };
}

/**
 * Get agents by category
 */
export function getAgentsByCategory(category: AgentCategory): AgentType[] {
  return Object.entries(AGENT_CONFIG)
    .filter(([_, config]) => config.category === category)
    .map(([type]) => type as AgentType);
}

/**
 * Get agents by capability
 */
export function getAgentsByCapability(capability: string): AgentType[] {
  return Object.entries(AGENT_CONFIG)
    .filter(([_, config]) => config.capabilities.includes(capability))
    .map(([type]) => type as AgentType);
}

/**
 * Search agents by name or capability
 */
export function searchAgents(query: string): AgentType[] {
  const lowerQuery = query.toLowerCase();
  return Object.entries(AGENT_CONFIG)
    .filter(([type, config]) =>
      type.toLowerCase().includes(lowerQuery) ||
      config.name.toLowerCase().includes(lowerQuery) ||
      config.capabilities.some((cap) => cap.toLowerCase().includes(lowerQuery))
    )
    .map(([type]) => type as AgentType);
}

/**
 * Get all agent types as a flat list
 */
export function getAllAgentTypes(): AgentType[] {
  return Object.keys(AGENT_CONFIG) as AgentType[];
}

export default AGENT_CONFIG;
