"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  RotateCcw,
  Search,
  Filter,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  BookOpen,
  X,
  Share2,
} from "lucide-react";
import { OrnamentDivider } from "@/components/motifs/OrnamentDivider";

interface GraphNode {
  id: string;
  name: string;
  definition: string;
  value: number;
  stability: number;
  difficulty: number;
  risk: "critical" | "warning" | "healthy";
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  subjectColor: string;
  cardCount: number;
  // Position properties
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

interface GraphLink {
  id: string;
  source: string;
  target: string;
  reason?: string | null;
}

export const ConceptGraph: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [links, setLinks] = useState<GraphLink[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Selected Node for Drawer
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 500 });

  useEffect(() => {
    fetch("/api/boardroom/graph")
      .then((res) => res.json())
      .then((data) => {
        setNodes(data.nodes || []);
        setLinks(data.links || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Update container dimensions
  useEffect(() => {
    if (containerRef.current) {
      setDimensions({
        width: containerRef.current.clientWidth || 800,
        height: 540,
      });
    }
  }, [loading]);

  // Filter nodes
  const filteredNodes = nodes.filter((n) => {
    const matchesSubject = selectedSubject === "all" || n.subjectCode === selectedSubject;
    const matchesRisk = selectedRisk === "all" || n.risk === selectedRisk;
    const matchesSearch =
      !searchQuery ||
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.definition.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSubject && matchesRisk && matchesSearch;
  });

  const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
  const filteredLinks = links.filter(
    (l) => filteredNodeIds.has(l.source) && filteredNodeIds.has(l.target)
  );

  // Simple deterministic circular/force cluster positioning
  const positionedNodes: GraphNode[] = filteredNodes.map((node, index) => {
    const total = Math.max(filteredNodes.length, 1);
    const angle = (index / total) * 2 * Math.PI;
    const radius = Math.min(dimensions.width, dimensions.height) * 0.35;
    const cx = dimensions.width / 2;
    const cy = dimensions.height / 2;

    // Slight jitter based on node id
    const seed = node.id.charCodeAt(node.id.length - 1) % 40;
    const offsetR = radius + (seed - 20) * 2;

    const x = cx + offsetR * Math.cos(angle);
    const y = cy + offsetR * Math.sin(angle);

    return { ...node, x, y };
  });

  const nodeMap = new Map(positionedNodes.map((n) => [n.id, n]));

  // Distinct subjects
  const subjectCodes = Array.from(new Set(nodes.map((n) => n.subjectCode)));

  // Color helper based on risk
  const getNodeColor = (risk: string) => {
    switch (risk) {
      case "critical":
        return "#B3261E"; // Sindoor red
      case "warning":
        return "#D99A1E"; // Turmeric amber
      default:
        return "#3F7D4E"; // Leaf green
    }
  };

  // Node radius based on value
  const getNodeRadius = (value: number) => {
    return Math.max(16, Math.min(32, 16 + (value / 100) * 16));
  };

  // Cluster review: Find all connected nodes to currently selected node
  const getClusterNodeIds = (nodeId: string): string[] => {
    const connected = new Set<string>([nodeId]);
    for (const link of links) {
      if (link.source === nodeId) connected.add(link.target);
      if (link.target === nodeId) connected.add(link.source);
    }
    return Array.from(connected);
  };

  if (loading) {
    return (
      <div className="p-12 text-center rounded border border-border bg-surface font-body space-y-2">
        <Sparkles size={32} className="mx-auto text-turmeric animate-spin opacity-50" />
        <h3 className="font-heading text-lg text-text">Assembling Academic Graph...</h3>
        <p className="text-xs text-text-muted font-mono">
          Connecting ideas across subjects and review strength.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4 font-body">
      {/* Top Filter Bar */}
      <div className="p-3 rounded border border-border bg-surface flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Department Filter */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-text-muted">Division:</span>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              className="p-1 rounded bg-bg border border-border text-text font-mono focus:outline-none focus:border-sindoor"
            >
              <option value="all">All Departments ({nodes.length} Assets)</option>
              {subjectCodes.map((code) => (
                <option key={code} value={code}>
                  {code}
                </option>
              ))}
            </select>
          </div>

          {/* Solvency Hazard Filter */}
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            <span className="text-text-muted">Risk:</span>
            <select
              value={selectedRisk}
              onChange={(e) => setSelectedRisk(e.target.value)}
              className="p-1 rounded bg-bg border border-border text-text font-mono focus:outline-none focus:border-sindoor"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical Depreciation (&lt; 50)</option>
              <option value="warning">Moderate ($50 - 74)</option>
              <option value="healthy">Healthy Solvency (&ge; 75)</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <div className="relative w-48 sm:w-64">
          <Search size={13} className="absolute left-2.5 top-2.5 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search concepts..."
            className="w-full pl-7 pr-3 py-1.5 rounded bg-bg border border-border text-xs text-text focus:outline-none focus:border-sindoor"
          />
        </div>
      </div>

      {/* Main Canvas + Side Inspection Drawer */}
      <div className="relative rounded-lg border border-border bg-surface overflow-hidden">
        {/* Legend */}
        <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-3 p-2 rounded bg-surface/90 backdrop-blur border border-border font-mono text-[10px]">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-leaf" />
            <span className="text-text">Healthy (&ge; 75)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-turmeric" />
            <span className="text-text">Moderate (50-74)</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-sindoor" />
            <span className="text-text">Critical (&lt; 50)</span>
          </div>
          <span className="text-text-muted">Node Radius = Mastery Value</span>
        </div>

        {/* SVG Force Network Visualizer */}
        <div ref={containerRef} className="w-full h-[540px] bg-bg/40 relative">
          <svg
            width={dimensions.width}
            height={dimensions.height}
            className="w-full h-full select-none"
          >
            {/* Draw Links */}
            <g className="links stroke-border opacity-40">
              {filteredLinks.map((link) => {
                const s = nodeMap.get(link.source);
                const t = nodeMap.get(link.target);
                if (!s || !t || s.x === undefined || t.x === undefined) return null;

                return (
                  <line
                    key={link.id}
                    x1={s.x}
                    y1={s.y}
                    x2={t.x}
                    y2={t.y}
                    strokeWidth="1.5"
                    strokeDasharray="4 2"
                  />
                );
              })}
            </g>

            {/* Draw Nodes */}
            <g className="nodes">
              {positionedNodes.map((node) => {
                const r = getNodeRadius(node.value);
                const color = getNodeColor(node.risk);
                const isSelected = selectedNode?.id === node.id;

                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x}, ${node.y})`}
                    onClick={() => setSelectedNode(node)}
                    className="cursor-pointer group"
                  >
                    {/* Pulsing hazard ring if critical */}
                    {node.risk === "critical" && (
                      <circle
                        r={r + 5}
                        fill="none"
                        stroke={color}
                        strokeWidth="1.5"
                        strokeOpacity="0.4"
                        className="animate-ping"
                      />
                    )}

                    {/* Outer Circle */}
                    <circle
                      r={r}
                      fill={color}
                      fillOpacity={isSelected ? 0.35 : 0.2}
                      stroke={color}
                      strokeWidth={isSelected ? 3 : 1.5}
                      className="transition-all duration-200 group-hover:scale-110"
                    />

                    {/* Department Tag Inside Node */}
                    <text
                      textAnchor="middle"
                      dy="-0.2em"
                      className="fill-text font-mono text-[9px] font-bold pointer-events-none"
                    >
                      {node.subjectCode}
                    </text>

                    {/* Mastery Value Inside Node */}
                    <text
                      textAnchor="middle"
                      dy="1.1em"
                      className="fill-text-muted font-mono text-[8px] pointer-events-none"
                    >
                      ₹{node.value.toFixed(0)}
                    </text>

                    {/* Concept Name Label below node */}
                    <text
                      textAnchor="middle"
                      dy={r + 13}
                      className="fill-text font-heading text-[11px] font-medium pointer-events-none drop-shadow-xs"
                    >
                      {node.name.length > 20 ? `${node.name.slice(0, 18)}...` : node.name}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {/* Side Drawer Inspection Panel */}
          {selectedNode && (
            <div className="absolute right-0 top-0 bottom-0 w-80 sm:w-96 bg-surface/95 backdrop-blur-md border-l border-border p-5 overflow-y-auto space-y-4 shadow-xl z-20 animate-in slide-in-from-right duration-200">
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-turmeric/10 text-turmeric font-bold uppercase">
                    {selectedNode.subjectCode} Department
                  </span>
                  <h3 className="font-heading text-xl text-text font-normal mt-1">
                    {selectedNode.name}
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 rounded text-text-muted hover:text-text"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Solvency and Stability Stats */}
              <div className="grid grid-cols-2 gap-2 text-left font-body">
                <div className="p-2.5 rounded bg-bg border border-border">
                  <span className="font-mono text-[9px] uppercase text-text-muted">Mastery Value</span>
                  <div className="font-mono text-lg font-bold text-sindoor mt-0.5">
                    ₹{selectedNode.value.toFixed(1)}
                  </div>
                </div>

                <div className="p-2.5 rounded bg-bg border border-border">
                  <span className="font-mono text-[9px] uppercase text-text-muted">Memory Strength</span>
                  <div className="font-mono text-lg font-bold text-leaf mt-0.5">
                    {selectedNode.stability.toFixed(1)}d
                  </div>
                </div>
              </div>

              {/* Definition */}
              <div className="space-y-1">
                <span className="font-mono text-[10px] uppercase text-text-muted tracking-wider">
                  Academic Definition
                </span>
                <p className="text-xs text-text leading-relaxed font-body bg-bg/50 p-3 rounded border border-border">
                  {selectedNode.definition}
                </p>
              </div>

              <OrnamentDivider stroke="#B3261E" className="opacity-30" />

              {/* Actions */}
              <div className="space-y-2 pt-1">
                <Link
                  href={`/review?mode=weakest_first&subjectId=${selectedNode.subjectId}`}
                  className="w-full py-2 px-3 rounded bg-sindoor text-white font-mono text-xs font-semibold hover:bg-sindoor-dark transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <RotateCcw size={13} />
                  <span>Review Asset Now</span>
                </Link>

                <Link
                  href={`/review?mode=weakest_first&subjectId=${selectedNode.subjectId}`}
                  className="w-full py-2 px-3 rounded border border-border bg-surface text-text font-mono text-xs font-medium hover:bg-bg transition-colors flex items-center justify-center gap-2"
                >
                  <Share2 size={13} className="text-turmeric" />
                  <span>Review Connected Cluster ({getClusterNodeIds(selectedNode.id).length} Assets)</span>
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
