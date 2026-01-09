'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Brain,
  Activity,
  Wifi,
  WifiOff,
  RefreshCw,
  Loader2,
  Maximize2,
  Minimize2,
  Settings,
  Zap,
  Clock,
  Hash,
  MessageSquare,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AgentNode, AgentNodeDefs } from './AgentNode';
import { ConnectionLine, ConnectionLineDefs } from './ConnectionLine';
import {
  useOrchestratorState,
  type AgentType,
  type OrchestratorState,
  type AgentState,
  type ConnectionStatus,
} from './hooks/useOrchestratorState';

interface OrchestratorVisualizerProps {
  sessionId: string;
  className?: string;
}

// Agent configuration with positions in a neural network layout
interface AgentConfig {
  type: AgentType;
  label: string;
  x: number;
  y: number;
  layer: 'input' | 'hidden' | 'output';
}

// Define agent layout - circular arrangement around the brain
const AGENTS: AgentConfig[] = [
  // Top layer - Analysis agents
  { type: 'code_analyzer', label: 'Code Analyzer', x: 200, y: 80, layer: 'input' },
  { type: 'test_planner', label: 'Test Planner', x: 400, y: 80, layer: 'input' },

  // Middle layer - Execution agents
  { type: 'ui_tester', label: 'UI Tester', x: 120, y: 200, layer: 'hidden' },
  { type: 'api_tester', label: 'API Tester', x: 480, y: 200, layer: 'hidden' },
  { type: 'db_tester', label: 'DB Tester', x: 300, y: 300, layer: 'hidden' },

  // Bottom layer - Post-processing agents
  { type: 'self_healer', label: 'Self Healer', x: 200, y: 380, layer: 'output' },
  { type: 'reporter', label: 'Reporter', x: 400, y: 380, layer: 'output' },
];

// Center position for orchestrator
const CENTER = { x: 300, y: 200 };
const SVG_WIDTH = 600;
const SVG_HEIGHT = 460;

// Connection definitions
interface ConnectionDef {
  from: AgentType;
  to: AgentType;
  bidirectional?: boolean;
}

const CONNECTIONS: ConnectionDef[] = [
  // Orchestrator to all agents
  { from: 'orchestrator', to: 'code_analyzer', bidirectional: true },
  { from: 'orchestrator', to: 'test_planner', bidirectional: true },
  { from: 'orchestrator', to: 'ui_tester', bidirectional: true },
  { from: 'orchestrator', to: 'api_tester', bidirectional: true },
  { from: 'orchestrator', to: 'db_tester', bidirectional: true },
  { from: 'orchestrator', to: 'self_healer', bidirectional: true },
  { from: 'orchestrator', to: 'reporter', bidirectional: true },

  // Inter-agent connections
  { from: 'code_analyzer', to: 'test_planner' },
  { from: 'test_planner', to: 'ui_tester' },
  { from: 'test_planner', to: 'api_tester' },
  { from: 'test_planner', to: 'db_tester' },
  { from: 'ui_tester', to: 'self_healer' },
  { from: 'api_tester', to: 'self_healer' },
  { from: 'db_tester', to: 'self_healer' },
  { from: 'self_healer', to: 'reporter' },
];

// State display labels
const stateLabels: Record<OrchestratorState, { label: string; color: string }> = {
  idle: { label: 'IDLE', color: 'text-muted-foreground' },
  analyzing: { label: 'ANALYZING', color: 'text-blue-500' },
  planning: { label: 'PLANNING', color: 'text-cyan-500' },
  executing: { label: 'EXECUTING', color: 'text-green-500' },
  healing: { label: 'HEALING', color: 'text-rose-500' },
  reporting: { label: 'REPORTING', color: 'text-indigo-500' },
  completed: { label: 'COMPLETED', color: 'text-green-500' },
  failed: { label: 'FAILED', color: 'text-red-500' },
};

// Agent glow colors for CSS
const agentGlowColors: Record<AgentType, string> = {
  orchestrator: 'rgba(139, 92, 246, 0.6)',
  code_analyzer: 'rgba(59, 130, 246, 0.6)',
  test_planner: 'rgba(6, 182, 212, 0.6)',
  ui_tester: 'rgba(34, 197, 94, 0.6)',
  api_tester: 'rgba(249, 115, 22, 0.6)',
  db_tester: 'rgba(245, 158, 11, 0.6)',
  self_healer: 'rgba(244, 63, 94, 0.6)',
  reporter: 'rgba(99, 102, 241, 0.6)',
};

// Connection status badge
function ConnectionStatusBadge({
  status,
  onReconnect,
}: {
  status: ConnectionStatus;
  onReconnect?: () => void;
}) {
  const configs: Record<
    ConnectionStatus,
    { icon: typeof Wifi; color: string; bg: string; label: string; animate?: boolean }
  > = {
    connected: { icon: Wifi, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Live' },
    connecting: {
      icon: Loader2,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      label: 'Connecting',
      animate: true,
    },
    reconnecting: {
      icon: RefreshCw,
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
      label: 'Reconnecting',
      animate: true,
    },
    error: { icon: WifiOff, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Error' },
    disconnected: {
      icon: WifiOff,
      color: 'text-muted-foreground',
      bg: 'bg-muted',
      label: 'Offline',
    },
  };

  const config = configs[status] || configs.disconnected;
  const Icon = config.icon;

  return (
    <button
      onClick={status === 'error' || status === 'disconnected' ? onReconnect : undefined}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
        config.bg,
        (status === 'error' || status === 'disconnected') &&
          onReconnect &&
          'hover:opacity-80 cursor-pointer'
      )}
    >
      <Icon className={cn('h-3.5 w-3.5', config.color, config.animate && 'animate-spin')} />
      <span className={config.color}>{config.label}</span>
    </button>
  );
}

// Background neural network pattern with enhanced particles
function NeuralBackground({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  // Generate random particle positions once
  const particles = useMemo(
    () =>
      Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        cx: Math.random() * SVG_WIDTH,
        cy: Math.random() * SVG_HEIGHT,
        r: 1 + Math.random() * 2,
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 2,
        depth: 0.5 + Math.random() * 0.5, // Parallax depth factor
      })),
    []
  );

  return (
    <g className="neural-background">
      {/* Animated background gradient */}
      <defs>
        <radialGradient id="brain-glow" cx="50%" cy="50%" r="50%">
          <motion.stop
            offset="0%"
            animate={{
              stopColor: ['rgba(139, 92, 246, 0.15)', 'rgba(139, 92, 246, 0.25)', 'rgba(139, 92, 246, 0.15)'],
            }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          <stop offset="100%" stopColor="rgba(139, 92, 246, 0)" />
        </radialGradient>

        <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
          <path
            d="M 30 0 L 0 0 0 30"
            fill="none"
            stroke="currentColor"
            strokeWidth="0.5"
            className="text-muted-foreground/10"
          />
        </pattern>
      </defs>

      {/* Grid pattern */}
      <rect width="100%" height="100%" fill="url(#grid)" />

      {/* Central glow */}
      <ellipse
        cx={CENTER.x}
        cy={CENTER.y}
        rx={150}
        ry={150}
        fill="url(#brain-glow)"
      />

      {/* Decorative neurons/dots with parallax effect */}
      {particles.map((particle) => (
        <motion.circle
          key={particle.id}
          cx={particle.cx + mouseX * particle.depth * 0.02}
          cy={particle.cy + mouseY * particle.depth * 0.02}
          r={particle.r}
          className="fill-muted-foreground/20"
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: particle.duration,
            repeat: Infinity,
            delay: particle.delay,
          }}
        />
      ))}
    </g>
  );
}

// Enhanced tooltip showing agent stats
interface EnhancedTooltipProps {
  agent: AgentType;
  agentState: AgentState | undefined;
  label: string;
  x: number;
  y: number;
  visible: boolean;
  tokensUsed?: number;
  duration?: string;
}

function EnhancedTooltip({
  agent,
  agentState,
  label,
  x,
  y,
  visible,
  tokensUsed = 0,
  duration = '--',
}: EnhancedTooltipProps) {
  // Position tooltip above the node
  const tooltipY = y - 100;
  const tooltipX = Math.max(80, Math.min(x, SVG_WIDTH - 80));

  return (
    <AnimatePresence>
      {visible && (
        <motion.foreignObject
          x={tooltipX - 75}
          y={tooltipY}
          width={150}
          height={90}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-popover border border-border rounded-lg shadow-xl p-2.5 text-xs">
            <div className="font-semibold text-foreground mb-1.5">{label}</div>
            <div className="space-y-1 text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Hash className="h-3 w-3" />
                <span>Tokens: {tokensUsed.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                <span>Duration: {duration}</span>
              </div>
              {agentState?.lastMessage && (
                <div className="flex items-start gap-1.5">
                  <MessageSquare className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="truncate max-w-[110px]">{agentState.lastMessage}</span>
                </div>
              )}
            </div>
          </div>
        </motion.foreignObject>
      )}
    </AnimatePresence>
  );
}

// Node glow component for activity states
interface NodeGlowProps {
  x: number;
  y: number;
  status: 'idle' | 'active' | 'completed' | 'error';
  agentType: AgentType;
}

function NodeGlow({ x, y, status, agentType }: NodeGlowProps) {
  if (status === 'idle') return null;

  const glowColor = status === 'error'
    ? 'rgba(239, 68, 68, 0.6)'
    : status === 'completed'
      ? 'rgba(34, 197, 94, 0.5)'
      : agentGlowColors[agentType];

  return (
    <g className={cn(
      'node-glow',
      status === 'active' && 'node-glow-active'
    )}>
      {/* Outer glow ring */}
      <motion.circle
        cx={x}
        cy={y}
        r={45}
        fill="none"
        stroke={glowColor}
        strokeWidth={status === 'active' ? 3 : 2}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={
          status === 'active'
            ? {
                opacity: [0.4, 0.8, 0.4],
                scale: [1, 1.15, 1],
              }
            : {
                opacity: 0.5,
                scale: 1,
              }
        }
        transition={{
          duration: status === 'active' ? 1.5 : 0.3,
          repeat: status === 'active' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        style={{
          filter: `blur(4px) drop-shadow(0 0 8px ${glowColor})`,
        }}
      />

      {/* Inner glow */}
      {status === 'active' && (
        <motion.circle
          cx={x}
          cy={y}
          r={38}
          fill={glowColor.replace('0.6', '0.1')}
          animate={{
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </g>
  );
}

// Enhanced connection with particle effects
interface EnhancedConnectionProps {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  fromAgent: AgentType;
  toAgent: AgentType;
  isActive: boolean;
  isBidirectional?: boolean;
  mouseX: number;
  mouseY: number;
}

function EnhancedConnection({
  fromX,
  fromY,
  toX,
  toY,
  fromAgent,
  toAgent,
  isActive,
  isBidirectional,
  mouseX,
  mouseY,
}: EnhancedConnectionProps) {
  // Calculate curved path
  const midX = (fromX + toX) / 2;
  const midY = (fromY + toY) / 2;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const curveFactor = distance * 0.15;
  const perpX = -dy / distance;
  const perpY = dx / distance;
  const controlX = midX + perpX * curveFactor;
  const controlY = midY + perpY * curveFactor;

  // Apply subtle parallax to connections
  const parallaxOffset = 0.01;
  const pFromX = fromX + mouseX * parallaxOffset;
  const pFromY = fromY + mouseY * parallaxOffset;
  const pToX = toX + mouseX * parallaxOffset;
  const pToY = toY + mouseY * parallaxOffset;
  const pControlX = controlX + mouseX * parallaxOffset;
  const pControlY = controlY + mouseY * parallaxOffset;

  const path = `M ${pFromX} ${pFromY} Q ${pControlX} ${pControlY} ${pToX} ${pToY}`;

  // Generate particles for this connection
  const particleCount = isActive ? 5 : 0;
  const particles = useMemo(
    () =>
      Array.from({ length: particleCount }).map((_, i) => ({
        id: i,
        delay: i * (1 / particleCount),
      })),
    [particleCount]
  );

  return (
    <g className={cn('connection-animated', isActive && 'active')}>
      {/* Render particles along the path */}
      {isActive && particles.map((particle) => (
        <motion.circle
          key={particle.id}
          r={2.5}
          className="particle"
          fill={agentGlowColors[fromAgent]}
          style={{
            filter: `drop-shadow(0 0 3px ${agentGlowColors[fromAgent]})`,
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 1, 1, 0],
          }}
          transition={{
            duration: 1.5,
            delay: particle.delay,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            begin={`${particle.delay}s`}
            path={path}
          />
        </motion.circle>
      ))}

      {/* Bidirectional particles (flowing back) */}
      {isActive && isBidirectional && particles.slice(0, 3).map((particle) => (
        <motion.circle
          key={`back-${particle.id}`}
          r={2}
          className="particle"
          fill={agentGlowColors[toAgent]}
          style={{
            filter: `drop-shadow(0 0 3px ${agentGlowColors[toAgent]})`,
          }}
          initial={{ opacity: 0 }}
          animate={{
            opacity: [0, 0.8, 0.8, 0],
          }}
          transition={{
            duration: 1.5,
            delay: particle.delay + 0.25,
            repeat: Infinity,
            ease: 'linear',
          }}
        >
          <animateMotion
            dur="1.5s"
            repeatCount="indefinite"
            begin={`${particle.delay + 0.25}s`}
            path={path}
            keyPoints="1;0"
            keyTimes="0;1"
          />
        </motion.circle>
      ))}
    </g>
  );
}

// Mini-map component for large graph navigation
interface MiniMapProps {
  agents: Record<AgentType, AgentState>;
  currentAgent: AgentType;
  viewportX?: number;
  viewportY?: number;
}

function MiniMap({ agents, currentAgent, viewportX = 0, viewportY = 0 }: MiniMapProps) {
  const scale = 0.15;
  const width = SVG_WIDTH * scale;
  const height = SVG_HEIGHT * scale;

  return (
    <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm border rounded-lg p-1.5 shadow-lg">
      <svg width={width} height={height} viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}>
        {/* Background */}
        <rect width="100%" height="100%" className="fill-muted/30" rx={4} />

        {/* Center brain */}
        <circle
          cx={CENTER.x}
          cy={CENTER.y}
          r={20}
          className={cn(
            'fill-violet-500/40 stroke-violet-500 stroke-1',
            currentAgent === 'orchestrator' && 'fill-violet-500/70'
          )}
        />

        {/* Agent nodes */}
        {AGENTS.map((agent) => {
          const state = agents[agent.type];
          const isActive = state?.status === 'active';
          const isCompleted = state?.status === 'completed';
          const isError = state?.status === 'error';

          return (
            <circle
              key={agent.type}
              cx={agent.x}
              cy={agent.y}
              r={12}
              className={cn(
                'stroke-1',
                isActive && 'fill-primary/70 stroke-primary',
                isCompleted && 'fill-green-500/50 stroke-green-500',
                isError && 'fill-red-500/50 stroke-red-500',
                !isActive && !isCompleted && !isError && 'fill-muted-foreground/20 stroke-muted-foreground/30'
              )}
            />
          );
        })}

        {/* Connections as simple lines */}
        {CONNECTIONS.map((conn, idx) => {
          const from = conn.from === 'orchestrator' ? CENTER : AGENTS.find(a => a.type === conn.from);
          const to = conn.to === 'orchestrator' ? CENTER : AGENTS.find(a => a.type === conn.to);
          if (!from || !to) return null;

          const fromPos = 'x' in from ? from : { x: CENTER.x, y: CENTER.y };
          const toPos = 'x' in to ? to : { x: CENTER.x, y: CENTER.y };

          return (
            <line
              key={idx}
              x1={fromPos.x}
              y1={fromPos.y}
              x2={toPos.x}
              y2={toPos.y}
              className="stroke-muted-foreground/20 stroke-[0.5]"
            />
          );
        })}
      </svg>
      <div className="text-[8px] text-muted-foreground text-center mt-0.5">Mini-map</div>
    </div>
  );
}

// Center brain node with state display
function CenterBrainNode({
  state,
  currentStep,
  totalSteps,
  isActive,
  mouseX,
  mouseY,
}: {
  state: OrchestratorState;
  currentStep: number;
  totalSteps: number;
  isActive: boolean;
  mouseX: number;
  mouseY: number;
}) {
  const stateConfig = stateLabels[state];

  // Apply subtle parallax to center brain
  const parallaxX = CENTER.x + mouseX * 0.015;
  const parallaxY = CENTER.y + mouseY * 0.015;

  return (
    <g transform={`translate(${parallaxX}, ${parallaxY})`}>
      {/* Outer pulse rings */}
      {isActive && (
        <>
          <motion.circle
            r={70}
            fill="none"
            stroke="url(#brain-gradient)"
            strokeWidth={2}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.6, 0, 0.6],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
          <motion.circle
            r={85}
            fill="none"
            stroke="url(#brain-gradient)"
            strokeWidth={1}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.4, 0, 0.4],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 0.5,
            }}
          />
          <motion.circle
            r={100}
            fill="none"
            stroke="url(#brain-gradient)"
            strokeWidth={0.5}
            animate={{
              scale: [1, 1.4, 1],
              opacity: [0.3, 0, 0.3],
            }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
          />
        </>
      )}

      {/* Main brain circle with glow */}
      <motion.circle
        r={55}
        className={cn(
          'fill-background stroke-2 stroke-violet-500',
          isActive && 'node-glow-active'
        )}
        style={{
          filter: isActive ? 'drop-shadow(0 0 20px rgba(139, 92, 246, 0.5))' : undefined,
        }}
        animate={
          isActive
            ? {
                scale: [1, 1.02, 1],
              }
            : {}
        }
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Inner glow */}
      <motion.circle
        r={50}
        className="fill-violet-500/10"
        animate={
          isActive
            ? {
                opacity: [0.1, 0.3, 0.1],
              }
            : {}
        }
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      {/* Brain icon */}
      <foreignObject x={-20} y={-35} width={40} height={40}>
        <div className="w-full h-full flex items-center justify-center">
          <motion.div
            animate={
              isActive
                ? {
                    scale: [1, 1.1, 1],
                  }
                : {}
            }
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            <Brain className="h-8 w-8 text-violet-500" />
          </motion.div>
        </div>
      </foreignObject>

      {/* State label */}
      <text y={15} textAnchor="middle" className={cn('text-xs font-bold fill-current', stateConfig.color)}>
        {stateConfig.label}
      </text>

      {/* Step counter */}
      <text y={32} textAnchor="middle" className="text-[10px] fill-muted-foreground">
        Step {currentStep}/{totalSteps || '?'}
      </text>

      {/* Activity indicator */}
      {isActive && (
        <motion.circle
          cx={45}
          cy={-45}
          r={8}
          className="fill-green-500"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [1, 0.7, 1],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}
    </g>
  );
}

// Main visualizer component
export function OrchestratorVisualizer({ sessionId, className }: OrchestratorVisualizerProps) {
  const {
    logs,
    steps,
    currentAgent,
    currentStep,
    totalSteps,
    orchestratorState,
    agents,
    connectionStatus,
    reconnect,
    isConnected,
  } = useOrchestratorState(sessionId);

  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [hoveredAgent, setHoveredAgent] = useState<AgentType | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mouse position for parallax effect
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Smooth spring values for parallax
  const mouseX = useSpring(0, { stiffness: 100, damping: 30 });
  const mouseY = useSpring(0, { stiffness: 100, damping: 30 });

  // Track mouse movement for parallax
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      // Calculate offset from center (-1 to 1 range)
      const x = ((e.clientX - rect.left) - centerX) / centerX;
      const y = ((e.clientY - rect.top) - centerY) / centerY;

      mouseX.set(x * 15);
      mouseY.set(y * 15);
      setMousePosition({ x: x * 15, y: y * 15 });
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [mouseX, mouseY]);

  // Get agent position (including orchestrator)
  const getAgentPosition = useCallback(
    (type: AgentType) => {
      if (type === 'orchestrator') return CENTER;
      const agent = AGENTS.find((a) => a.type === type);
      return agent ? { x: agent.x, y: agent.y } : CENTER;
    },
    []
  );

  // Check if a connection should be active
  const isConnectionActive = useCallback(
    (from: AgentType, to: AgentType) => {
      const fromStatus = agents[from]?.status || 'idle';
      const toStatus = agents[to]?.status || 'idle';
      return fromStatus === 'active' || toStatus === 'active';
    },
    [agents]
  );

  // Determine if orchestrator is active
  const isOrchestratorActive = orchestratorState !== 'idle' && orchestratorState !== 'completed' && orchestratorState !== 'failed';

  // Calculate duration for tooltip
  const calculateDuration = useCallback((agentState: AgentState | undefined) => {
    if (!agentState?.startTime) return '--';
    const start = new Date(agentState.startTime);
    const end = agentState.endTime ? new Date(agentState.endTime) : new Date();
    const diffMs = end.getTime() - start.getTime();
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-background border rounded-xl overflow-hidden',
        isFullscreen && 'fixed inset-4 z-50 shadow-2xl',
        className
      )}
    >
      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes glow-pulse {
          0%, 100% {
            filter: drop-shadow(0 0 8px currentColor);
            opacity: 0.8;
          }
          50% {
            filter: drop-shadow(0 0 20px currentColor);
            opacity: 1;
          }
        }

        @keyframes neural-pulse {
          0%, 100% {
            stroke-opacity: 0.3;
          }
          50% {
            stroke-opacity: 0.8;
          }
        }

        .node-glow-active {
          animation: glow-pulse 1.5s ease-in-out infinite;
        }

        .connection-animated.active {
          animation: neural-pulse 1.5s ease-in-out infinite;
        }

        .particle {
          will-change: transform, opacity;
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Brain className="h-5 w-5 text-violet-500" />
            {isOrchestratorActive && (
              <motion.span
                className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-green-500"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            )}
          </div>
          <div>
            <h2 className="text-sm font-semibold">Orchestrator Visualization</h2>
            <p className="text-xs text-muted-foreground">Real-time agent activity with parallax</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <ConnectionStatusBadge status={connectionStatus} onReconnect={reconnect} />

          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* SVG Visualization with parallax container */}
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <motion.svg
          viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`}
          className="w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          style={{
            transform: `perspective(1000px) rotateX(${mousePosition.y * 0.1}deg) rotateY(${mousePosition.x * -0.1}deg)`,
          }}
        >
          {/* Definitions */}
          <defs>
            <radialGradient id="brain-gradient">
              <stop offset="0%" stopColor="rgb(139, 92, 246)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="rgb(139, 92, 246)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <AgentNodeDefs />
          <ConnectionLineDefs />

          {/* Background with parallax */}
          <NeuralBackground mouseX={mousePosition.x} mouseY={mousePosition.y} />

          {/* Connection lines (render before nodes) */}
          <g className="connections">
            {CONNECTIONS.map((conn, index) => {
              const fromPos = getAgentPosition(conn.from);
              const toPos = getAgentPosition(conn.to);
              const active = isConnectionActive(conn.from, conn.to);

              return (
                <g key={`${conn.from}-${conn.to}`}>
                  <ConnectionLine
                    fromX={fromPos.x}
                    fromY={fromPos.y}
                    toX={toPos.x}
                    toY={toPos.y}
                    fromAgent={conn.from}
                    toAgent={conn.to}
                    fromStatus={agents[conn.from]?.status || 'idle'}
                    toStatus={agents[conn.to]?.status || 'idle'}
                    isActive={active}
                    isBidirectional={conn.bidirectional}
                  />
                  {/* Enhanced particle effects on active connections */}
                  <EnhancedConnection
                    fromX={fromPos.x}
                    fromY={fromPos.y}
                    toX={toPos.x}
                    toY={toPos.y}
                    fromAgent={conn.from}
                    toAgent={conn.to}
                    isActive={active}
                    isBidirectional={conn.bidirectional}
                    mouseX={mousePosition.x}
                    mouseY={mousePosition.y}
                  />
                </g>
              );
            })}
          </g>

          {/* Node glow effects */}
          <g className="node-glows">
            {AGENTS.map((agent) => (
              <NodeGlow
                key={`glow-${agent.type}`}
                x={agent.x + mousePosition.x * 0.01}
                y={agent.y + mousePosition.y * 0.01}
                status={agents[agent.type]?.status || 'idle'}
                agentType={agent.type}
              />
            ))}
          </g>

          {/* Agent nodes with entrance animations */}
          <g className="agents">
            {AGENTS.map((agent, index) => (
              <motion.g
                key={agent.type}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{
                  type: 'spring',
                  stiffness: 260,
                  damping: 20,
                  delay: index * 0.1,
                }}
                style={{
                  transform: `translate(${mousePosition.x * 0.01}px, ${mousePosition.y * 0.01}px)`,
                }}
                onMouseEnter={() => setHoveredAgent(agent.type)}
                onMouseLeave={() => setHoveredAgent(null)}
              >
                <AgentNode
                  type={agent.type}
                  status={agents[agent.type]?.status || 'idle'}
                  label={agent.label}
                  x={agent.x}
                  y={agent.y}
                  lastMessage={agents[agent.type]?.lastMessage}
                  onClick={() => setSelectedAgent(agent.type)}
                />
              </motion.g>
            ))}
          </g>

          {/* Center brain node */}
          <CenterBrainNode
            state={orchestratorState}
            currentStep={currentStep}
            totalSteps={totalSteps}
            isActive={isOrchestratorActive}
            mouseX={mousePosition.x}
            mouseY={mousePosition.y}
          />

          {/* Enhanced tooltips */}
          {AGENTS.map((agent) => (
            <EnhancedTooltip
              key={`tooltip-${agent.type}`}
              agent={agent.type}
              agentState={agents[agent.type]}
              label={agent.label}
              x={agent.x}
              y={agent.y}
              visible={hoveredAgent === agent.type}
              tokensUsed={Math.floor(Math.random() * 10000)} // Replace with actual token data
              duration={calculateDuration(agents[agent.type])}
            />
          ))}
        </motion.svg>

        {/* Mini-map */}
        <MiniMap
          agents={agents}
          currentAgent={currentAgent}
        />

        {/* Overlay for loading state */}
        <AnimatePresence>
          {connectionStatus === 'connecting' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center"
            >
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-violet-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Connecting to session...</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer with active agent info */}
      <div className="px-4 py-3 border-t bg-muted/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Active Agent:</span>
            </div>
            <span
              className={cn(
                'text-sm font-semibold',
                currentAgent === 'orchestrator' && 'text-violet-500',
                currentAgent === 'code_analyzer' && 'text-blue-500',
                currentAgent === 'test_planner' && 'text-cyan-500',
                currentAgent === 'ui_tester' && 'text-green-500',
                currentAgent === 'api_tester' && 'text-orange-500',
                currentAgent === 'db_tester' && 'text-amber-500',
                currentAgent === 'self_healer' && 'text-rose-500',
                currentAgent === 'reporter' && 'text-indigo-500'
              )}
            >
              {AGENTS.find((a) => a.type === currentAgent)?.label || 'Orchestrator'}
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {Object.values(agents).filter((a) => a.status === 'completed').length} agents completed
            </span>
            <span>
              {logs.length} events logged
            </span>
          </div>
        </div>

        {/* Current agent message */}
        {agents[currentAgent]?.lastMessage && (
          <motion.p
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 text-xs text-muted-foreground italic truncate"
          >
            &quot;{agents[currentAgent].lastMessage}&quot;
          </motion.p>
        )}
      </div>
    </div>
  );
}

export default OrchestratorVisualizer;
