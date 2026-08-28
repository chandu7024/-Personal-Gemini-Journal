import React, { useState, useEffect, useRef } from "react";
import * as d3 from "d3";
import {
  Sparkles,
  X,
  RefreshCw,
  Clock,
  Compass,
  ArrowRight,
  Shield,
  Layers,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Calendar,
  BookOpen,
  HelpCircle,
  Activity,
  Zap,
  Tag,
  ChevronRight
} from "lucide-react";
import {
  JournalEntry,
  SubconsciousTimelineData,
  ConstellationNode,
  ConstellationLink,
  SemanticEcho,
  TimeWindow
} from "../types";

interface SubconsciousConstellationModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: JournalEntry[];
  onSelectEntry?: (entryId: string) => void;
}

export const SubconsciousConstellationModal: React.FC<SubconsciousConstellationModalProps> = ({
  isOpen,
  onClose,
  entries,
  onSelectEntry,
}) => {
  const [timeWindow, setTimeWindow] = useState<TimeWindow>("all");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SubconsciousTimelineData | null>(null);
  const [selectedNode, setSelectedNode] = useState<ConstellationNode | null>(null);
  const [activeTab, setActiveTab] = useState<"graph" | "echoes">("graph");
  const [filterType, setFilterType] = useState<string>("all");

  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Fetch or generate constellation graph
  const generateConstellation = async (windowChoice: TimeWindow = timeWindow) => {
    if (entries.length === 0) return;
    setLoading(true);
    setError(null);

    // Filter entries by time window
    const now = new Date();
    const filteredEntries = entries.filter((e) => {
      if (windowChoice === "all") return true;
      const entryDate = new Date(e.createdAt);
      const diffDays = (now.getTime() - entryDate.getTime()) / (1000 * 3600 * 24);
      if (windowChoice === "7d") return diffDays <= 7;
      if (windowChoice === "30d") return diffDays <= 30;
      if (windowChoice === "90d") return diffDays <= 90;
      return true;
    });

    const targetList = filteredEntries.length > 0 ? filteredEntries : entries;

    try {
      const response = await fetch("/api/analytics/constellation-graph", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: targetList.map((e) => ({
            id: e.id,
            title: e.title,
            createdAt: e.createdAt,
            mood: e.mood,
            tags: e.tags,
            snippet: e.snippet || (e.summary ? e.summary.executiveSummary : ""),
          })),
          timeframe: windowChoice,
        }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || `Server responded with status ${response.status}`);
      }

      const resJson = await response.json();
      if (resJson.success && resJson.data) {
        setData(resJson.data);
        if (resJson.data.nodes && resJson.data.nodes.length > 0) {
          setSelectedNode(resJson.data.nodes[0]);
        }
      } else {
        throw new Error(resJson.error || "Malformed response from Constellation Engine.");
      }
    } catch (err: any) {
      console.error("[Constellation] Fetch failed:", err);
      setError(err.message || "Failed to synthesize subconscious constellation.");
    } finally {
      setLoading(false);
    }
  };

  // Initial load when modal opens
  useEffect(() => {
    if (isOpen && !data && entries.length > 0) {
      generateConstellation(timeWindow);
    }
  }, [isOpen, entries.length]);

  // Valence color mapping helper
  const getValenceColor = (valence: string) => {
    switch (valence) {
      case "empowered":
        return { fill: "#10b981", stroke: "#059669", bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" };
      case "reflective":
        return { fill: "#6366f1", stroke: "#4f46e5", bg: "bg-indigo-500/10 text-indigo-600 border-indigo-500/20" };
      case "vulnerable":
        return { fill: "#f59e0b", stroke: "#d97706", bg: "bg-amber-500/10 text-amber-600 border-amber-500/20" };
      case "anxious":
        return { fill: "#f43f5e", stroke: "#e11d48", bg: "bg-rose-500/10 text-rose-600 border-rose-500/20" };
      case "creative":
        return { fill: "#ec4899", stroke: "#db2777", bg: "bg-pink-500/10 text-pink-600 border-pink-500/20" };
      default:
        return { fill: "#64748b", stroke: "#475569", bg: "bg-slate-500/10 text-slate-600 border-slate-500/20" };
    }
  };

  const getNodeTypeBadge = (type: string) => {
    switch (type) {
      case "breakthrough":
        return { label: "Breakthrough Anchor", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300" };
      case "core_belief":
        return { label: "Core Belief", color: "bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300" };
      case "emotional_filter":
        return { label: "Emotional Filter", color: "bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300" };
      case "recurring_trigger":
        return { label: "Recurring Trigger", color: "bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300" };
      case "life_domain":
        return { label: "Life Domain", color: "bg-cyan-100 text-cyan-800 dark:bg-cyan-950/50 dark:text-cyan-300" };
      default:
        return { label: "Identity Theme", color: "bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300" };
    }
  };

  // D3 Force Directed Graph Rendering
  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes || data.nodes.length === 0 || activeTab !== "graph") {
      return;
    }

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 560;

    // Filter nodes if user selected a filter
    const visibleNodes: ConstellationNode[] = (filterType === "all"
      ? data.nodes
      : data.nodes.filter((n) => n.type === filterType)
    ).map((d) => ({ ...d }));

    const visibleNodeIds = new Set(visibleNodes.map((n) => n.id));

    const visibleLinks: any[] = data.links
      .filter((l) => {
        const srcId = typeof l.source === "object" ? (l.source as any).id : l.source;
        const tgtId = typeof l.target === "object" ? (l.target as any).id : l.target;
        return visibleNodeIds.has(srcId) && visibleNodeIds.has(tgtId);
      })
      .map((l) => ({
        source: typeof l.source === "object" ? (l.source as any).id : l.source,
        target: typeof l.target === "object" ? (l.target as any).id : l.target,
        relationship: l.relationship,
        strength: l.strength,
        insight: l.insight,
      }));

    // SVG Main Container with Zoom / Pan
    const g = svg.append("g").attr("class", "constellation-graph-root");

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // Initial Zoom Center
    svg.call(
      zoom.transform,
      d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85).translate(-width / 2, -height / 2)
    );

    // Defs for Glow Filters and Gradients
    const defs = svg.append("defs");
    
    // Filter for glowing effect
    const filter = defs.append("filter").attr("id", "glow").attr("x", "-50%").attr("y", "-50%").attr("width", "200%").attr("height", "200%");
    filter.append("feGaussianBlur").attr("stdDeviation", "4").attr("result", "coloredBlur");
    const feMerge = filter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // Force Simulation
    const simulation = d3
      .forceSimulation<ConstellationNode>(visibleNodes)
      .force(
        "link",
        d3
          .forceLink<ConstellationNode, any>(visibleLinks)
          .id((d) => d.id)
          .distance((d) => 130 - (d.strength || 0.5) * 40)
      )
      .force("charge", d3.forceManyBody().strength(-350))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius((d: any) => 24 + (d.strength || 5) * 3))
      .alphaDecay(0.04);

    // Links Render
    const linkGroup = g.append("g").attr("class", "links");
    const link = linkGroup
      .selectAll("line")
      .data(visibleLinks)
      .enter()
      .append("line")
      .attr("stroke", "#94a3b8")
      .attr("stroke-opacity", 0.45)
      .attr("stroke-width", (d) => Math.max(1.5, (d.strength || 0.5) * 3.5))
      .attr("stroke-dasharray", (d) => (d.relationship === "triggers" ? "4,4" : "none"));

    // Link Labels / Relationship tags
    const linkText = linkGroup
      .selectAll("text")
      .data(visibleLinks)
      .enter()
      .append("text")
      .attr("font-size", "10px")
      .attr("fill", "#64748b")
      .attr("text-anchor", "middle")
      .attr("dy", -4)
      .text((d) => d.relationship.replace(/_/g, " "));

    // Nodes Render
    const nodeGroup = g.append("g").attr("class", "nodes");

    const node = nodeGroup
      .selectAll("g")
      .data(visibleNodes)
      .enter()
      .append("g")
      .attr("class", "node-group cursor-pointer")
      .on("click", (_event, d) => {
        setSelectedNode(d);
      })
      .call(
        d3
          .drag<SVGGElement, ConstellationNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          })
      );

    // Outer Glow Ring for Selected / Active node
    node
      .append("circle")
      .attr("r", (d) => 18 + (d.strength || 5) * 2.2 + 8)
      .attr("fill", (d) => getValenceColor(d.valence).fill)
      .attr("fill-opacity", (d) => (selectedNode?.id === d.id ? 0.25 : 0.08))
      .attr("stroke", (d) => getValenceColor(d.valence).stroke)
      .attr("stroke-width", (d) => (selectedNode?.id === d.id ? 2 : 0))
      .attr("stroke-dasharray", "3,3")
      .attr("filter", "url(#glow)");

    // Main Circle
    node
      .append("circle")
      .attr("r", (d) => 18 + (d.strength || 5) * 2.2)
      .attr("fill", (d) => getValenceColor(d.valence).fill)
      .attr("stroke", "#ffffff")
      .attr("stroke-width", 2.5)
      .attr("class", "transition-transform hover:scale-110");

    // Node Icons/Letters
    node
      .append("text")
      .attr("text-anchor", "middle")
      .attr("dy", ".35em")
      .attr("fill", "#ffffff")
      .attr("font-weight", "bold")
      .attr("font-size", (d) => `${10 + (d.strength || 5) * 0.8}px`)
      .text((d) => d.label.slice(0, 1).toUpperCase());

    // Node Labels
    node
      .append("text")
      .attr("dy", (d) => 28 + (d.strength || 5) * 2.2)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "600")
      .attr("fill", "#1e293b")
      .attr("class", "dark:fill-slate-200 select-none")
      .text((d) => (d.label.length > 18 ? `${d.label.slice(0, 16)}…` : d.label));

    // Simulation Tick Updates
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkText
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data, filterType, activeTab, selectedNode?.id]);

  // Zoom Controls
  const handleZoomIn = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.3);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.7);
    }
  };

  const handleResetZoom = () => {
    if (svgRef.current && zoomBehaviorRef.current) {
      const width = svgRef.current.clientWidth || 800;
      const height = svgRef.current.clientHeight || 560;
      d3.select(svgRef.current)
        .transition()
        .duration(400)
        .call(
          zoomBehaviorRef.current.transform,
          d3.zoomIdentity.translate(width / 2, height / 2).scale(0.85).translate(-width / 2, -height / 2)
        );
    }
  };

  if (!isOpen) return null;

  return (
    <div
      id="subconscious-constellation-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-3 sm:p-6 overflow-y-auto"
    >
      <div className="relative w-full max-w-6xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-md shadow-indigo-500/20 text-white">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Subconscious Timeline & Constellation Graph
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                  Gemini 3.6 Semantic Engine
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Visualizing latent psychological themes, subconscious links, and cross-entry echoes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher Tabs */}
            <div className="flex items-center p-1 bg-slate-200/60 dark:bg-slate-800 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveTab("graph")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "graph"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Compass className="w-3.5 h-3.5" />
                Constellation Graph
              </button>
              <button
                onClick={() => setActiveTab("echoes")}
                className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
                  activeTab === "echoes"
                    ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm font-semibold"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Subconscious Echoes
                {data?.echoes && data.echoes.length > 0 && (
                  <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[10px] flex items-center justify-center ml-0.5">
                    {data.echoes.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={() => generateConstellation(timeWindow)}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Regenerate Constellation"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-500" : ""}`} />
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Core Evolution Statement Banner */}
        {data && (
          <div className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/30 dark:via-purple-950/30 dark:to-pink-950/30 px-6 py-2.5 border-b border-indigo-100/60 dark:border-indigo-900/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-indigo-900 dark:text-indigo-200">
              <Zap className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">Evolutionary Trajectory:</span>
              <span className="italic text-slate-700 dark:text-slate-300">{data.coreEvolutionStatement}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Time Window Buttons */}
              {(["7d", "30d", "90d", "all"] as TimeWindow[]).map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    setTimeWindow(w);
                    generateConstellation(w);
                  }}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    timeWindow === w
                      ? "bg-indigo-600 text-white font-semibold shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/50"
                  }`}
                >
                  {w === "7d" ? "7D" : w === "30d" ? "30D" : w === "90d" ? "90D" : "All"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Modal Main Body */}
        <div className="flex-1 min-h-[500px] flex flex-col md:flex-row overflow-hidden relative">
          {loading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 flex items-center justify-center text-indigo-600 mb-3 animate-pulse">
                <Sparkles className="w-6 h-6 animate-spin" />
              </div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                Synthesizing Subconscious Semantic Constellation...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Gemini 3.6 Flash is extracting core beliefs, emotional filters, and latent echoes
              </p>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white/90 dark:bg-slate-900/90 p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-3">
                <Shield className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1">
                Constellation Synthesis Error
              </h3>
              <p className="text-xs text-rose-600 dark:text-rose-400 max-w-md mb-4">{error}</p>
              <button
                onClick={() => generateConstellation(timeWindow)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-md transition-all"
              >
                Retry Analysis
              </button>
            </div>
          )}

          {/* TAB 1: Constellation Graph */}
          {activeTab === "graph" && (
            <>
              {/* Visual Stage Container */}
              <div ref={containerRef} className="flex-1 relative bg-slate-950 flex flex-col overflow-hidden">
                {/* SVG Visualizer */}
                <svg ref={svgRef} className="w-full h-full min-h-[460px] select-none" />

                {/* Graph Floating Controls */}
                <div className="absolute bottom-4 left-4 flex items-center gap-1.5 bg-slate-900/85 backdrop-blur-md border border-slate-800 p-1.5 rounded-xl shadow-lg text-white text-xs">
                  <button
                    onClick={handleZoomIn}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleZoomOut}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleResetZoom}
                    className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 hover:text-white transition-colors"
                    title="Reset Center"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>

                  <div className="h-4 w-px bg-slate-700 mx-1" />

                  {/* Filter by Category */}
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="bg-slate-800 border-none text-[11px] text-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 outline-none"
                  >
                    <option value="all">All Theme Types</option>
                    <option value="core_belief">Core Beliefs</option>
                    <option value="breakthrough">Breakthrough Anchors</option>
                    <option value="emotional_filter">Emotional Filters</option>
                    <option value="recurring_trigger">Recurring Triggers</option>
                    <option value="life_domain">Life Domains</option>
                  </select>
                </div>

                {/* Legend Overlay */}
                <div className="absolute top-4 left-4 bg-slate-900/85 backdrop-blur-md border border-slate-800/80 px-3 py-2 rounded-xl text-[11px] text-slate-300 shadow-lg hidden sm:flex items-center gap-3">
                  <span className="font-semibold text-slate-400">Valence:</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Empowered</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-indigo-400" /> Reflective</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400" /> Vulnerable</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-400" /> Anxious</span>
                </div>
              </div>

              {/* Node Inspector Drawer */}
              <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between overflow-y-auto max-h-[500px]">
                {selectedNode ? (
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${getNodeTypeBadge(selectedNode.type).color}`}>
                          {getNodeTypeBadge(selectedNode.type).label}
                        </span>
                        <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${getValenceColor(selectedNode.valence).bg}`}>
                          {selectedNode.valence}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {selectedNode.label}
                      </h3>
                      <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                        <span className="flex items-center gap-1">
                          <Activity className="w-3 h-3 text-indigo-500" />
                          Gravity: {selectedNode.strength}/10
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          Observed: {selectedNode.firstObservedDate}
                        </span>
                      </div>
                    </div>

                    {/* Subconscious Insight */}
                    <div className="p-3 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900 dark:text-indigo-300 mb-1">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        Subconscious Dynamic
                      </div>
                      <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                        {selectedNode.subconsciousInsight}
                      </p>
                    </div>

                    {/* Socratic Question */}
                    <div className="p-3 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-purple-900 dark:text-purple-300 mb-1">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        Socratic Inquiry Anchor
                      </div>
                      <p className="text-xs italic text-slate-700 dark:text-slate-300 leading-relaxed">
                        "{selectedNode.socraticInquiry}"
                      </p>
                    </div>

                    {/* Associated Entries */}
                    {selectedNode.associatedEntryTitles && selectedNode.associatedEntryTitles.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                          Associated Reflections ({selectedNode.associatedEntryTitles.length})
                        </div>
                        <div className="space-y-1.5">
                          {selectedNode.associatedEntryTitles.map((title, i) => {
                            const entryId = selectedNode.associatedEntryIds?.[i];
                            return (
                              <button
                                key={i}
                                onClick={() => {
                                  if (entryId && onSelectEntry) {
                                    onSelectEntry(entryId);
                                    onClose();
                                  }
                                }}
                                className="w-full text-left p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 border border-slate-200/60 dark:border-slate-800 transition-colors flex items-center justify-between group"
                              >
                                <span className="text-xs text-slate-700 dark:text-slate-300 font-medium truncate">
                                  {title}
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4 text-slate-400">
                    <Compass className="w-8 h-8 mb-2 opacity-40" />
                    <p className="text-xs">Select any node on the graph to inspect its subconscious profile.</p>
                  </div>
                )}

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 text-center">
                  Drag nodes to adjust physics • Scroll to zoom
                </div>
              </div>
            </>
          )}

          {/* TAB 2: Subconscious Echoes Timeline */}
          {activeTab === "echoes" && (
            <div className="flex-1 p-6 bg-slate-50/50 dark:bg-slate-900/50 overflow-y-auto max-h-[540px]">
              <div className="max-w-4xl mx-auto space-y-4">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs mb-6">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    Cross-Entry Mindset Resonances (Subconscious Echoes)
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                    Gemini cross-references your current thoughts with historical reflection patterns to highlight recurring patterns and celebrate how your mindset has evolved.
                  </p>
                </div>

                {data?.echoes && data.echoes.length > 0 ? (
                  <div className="space-y-4">
                    {data.echoes.map((echo) => (
                      <div
                        key={echo.id}
                        className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-xs hover:border-indigo-300 dark:hover:border-indigo-800 transition-all"
                      >
                        <div className="flex items-start justify-between gap-4 mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 text-[11px] font-bold">
                                Theme: {echo.currentTheme}
                              </span>
                              <span className="text-xs text-slate-400">
                                Echoed from: <strong className="text-slate-700 dark:text-slate-300">{echo.pastEntryTitle}</strong> ({echo.pastEntryDate})
                              </span>
                            </div>
                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                              {echo.echoDescription}
                            </h4>
                          </div>

                          <div className="flex flex-col items-end flex-shrink-0">
                            <span className="text-[10px] font-semibold text-slate-400 uppercase">Resonance</span>
                            <span className="text-sm font-black text-indigo-600 dark:text-indigo-400">
                              {echo.resonanceScore}%
                            </span>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 rounded-lg">
                            <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5" />
                              Observed Mindset Evolution
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300">
                              {echo.observedEvolution}
                            </p>
                          </div>

                          <div className="p-3 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 rounded-lg">
                            <div className="text-xs font-bold text-indigo-800 dark:text-indigo-300 mb-1 flex items-center gap-1">
                              <Compass className="w-3.5 h-3.5" />
                              Recommended Grounding Anchor
                            </div>
                            <p className="text-xs text-slate-700 dark:text-slate-300">
                              {echo.recommendedAnchor}
                            </p>
                          </div>
                        </div>

                        {echo.pastEntryId && (
                          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex justify-end">
                            <button
                              onClick={() => {
                                if (onSelectEntry) {
                                  onSelectEntry(echo.pastEntryId);
                                  onClose();
                                }
                              }}
                              className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 group"
                            >
                              <BookOpen className="w-3.5 h-3.5" />
                              Open Echoed Reflection
                              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-12 text-center bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                    <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      No Cross-Entry Echoes Detected Yet
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Write 2 or more reflections to allow the Socratic Semantic Engine to detect subconscious patterns over time.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span>Encrypted with Cloud Firestore User Isolation</span>
          </div>

          <div className="flex items-center gap-3">
            <span>Analyzed {data?.totalEntriesAnalyzed || entries.length} reflections</span>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
