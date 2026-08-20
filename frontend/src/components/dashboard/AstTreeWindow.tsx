import React, { useState } from 'react';
import { GitBranch, Sparkles, Loader2 } from 'lucide-react';
import { getAst, AstNode } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useCode } from '../../contexts/CodeContext';
import './AstTreeWindow.css';

interface NodeItem {
  id: string;
  name: string;
  type: string;
  x: number;
  y: number;
  color?: string;
}

interface EdgeItem {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
}

export default function AstTreeWindow() {
  const { code, language } = useCode();
  const [selectedNode, setSelectedNode] = useState<string>('root');
  const [generating, setGenerating] = useState(false);
  const [nodes, setNodes] = useState<NodeItem[]>([]);
  const [edges, setEdges] = useState<EdgeItem[]>([]);
  const [canvasWidth, setCanvasWidth] = useState(340);
  const [canvasHeight, setCanvasHeight] = useState(350);
  const { showToast } = useToast();

  const layoutTree = (rootNode: AstNode) => {
    const newNodes: NodeItem[] = [];
    const newEdges: EdgeItem[] = [];
    let yStep = 55;
    
    function calcWidth(n: AstNode): number {
      if (!n.children || n.children.length === 0) return 1;
      return n.children.reduce((sum, c) => sum + calcWidth(c), 0);
    }
    
    const totalLeaves = calcWidth(rootNode);
    const widthPerLeaf = 80;
    const computedWidth = Math.max(340, totalLeaves * widthPerLeaf);
    let maxDepth = 0;
    
    function traverse(n: AstNode, depth: number, leftBound: number, rightBound: number): {x: number, y: number} {
      maxDepth = Math.max(maxDepth, depth);
      const x = (leftBound + rightBound) / 2;
      const y = depth * yStep + 25;
      
      const colors = ['#C85A32', '#8B5A2B', '#4C7A5D', '#E08A3C'];
      const color = colors[depth % colors.length];
      
      newNodes.push({
        id: n.id,
        name: (n.name || n.type || '').substring(0, 10),
        type: n.type,
        x,
        y,
        color
      });
      
      if (n.children && n.children.length > 0) {
        let currentLeft = leftBound;
        const totalChildrenLeaves = calcWidth(n);
        
        n.children.forEach(c => {
          const cLeaves = calcWidth(c);
          const ratio = cLeaves / totalChildrenLeaves;
          const cRight = currentLeft + (rightBound - leftBound) * ratio;
          
          const childPos = traverse(c, depth + 1, currentLeft, cRight);
          
          newEdges.push({
            id: n.id + '-' + c.id,
            x1: x, y1: y + 10,
            x2: childPos.x, y2: childPos.y - 10,
            color: colors[(depth + 1) % colors.length]
          });
          
          currentLeft = cRight;
        });
      }
      
      return {x, y};
    }
    
    traverse(rootNode, 0, 0, computedWidth);
    setNodes(newNodes);
    setEdges(newEdges);
    setCanvasWidth(computedWidth);
    setCanvasHeight(Math.max(350, (maxDepth + 1) * yStep + 50));
  };

  const handleGenerateAst = async () => {
    setGenerating(true);
    try {
      const result = await getAst(code, language);
      if (result && result.ast) {
        layoutTree(result.ast);
        setSelectedNode(result.ast.id);
        showToast('AST Syntax Tree generated successfully', 'success');
      }
    } catch (e: any) {
      showToast(e.message || 'Error generating AST', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="clay-panel ast-tree-window-panel">
      {/* Header Bar */}
      <div className="ast-window-header">
        <div className="ast-header-left">
          <GitBranch size={14} className="text-terracotta" />
          <span className="ast-window-title">+ AST EXPLORER</span>
        </div>

        <button 
          className="btn btn-primary btn-sm"
          onClick={handleGenerateAst}
          disabled={generating}
        >
          {generating ? <Loader2 size={11} className="spin-icon" /> : <Sparkles size={11} />}
          <span>Generate AST</span>
        </button>
      </div>

      {/* SVG Canvas Tree View */}
      <div className="ast-canvas-container" style={{ overflow: 'auto' }}>
        {nodes.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>
            Click Generate AST to view the syntax tree.
          </div>
        ) : (
        <svg 
          className="ast-tree-svg" 
          viewBox={`0 0 ${canvasWidth} ${canvasHeight}`}
          preserveAspectRatio="xMidYMid meet"
          style={{ width: '100%', height: '100%', minWidth: canvasWidth, minHeight: canvasHeight }}
        >
          {/* Bezier Connectors */}
          <g className="tree-edges">
            {edges.map(e => (
              <path 
                key={e.id}
                d={`M ${e.x1} ${e.y1} C ${e.x1} ${(e.y1 + e.y2)/2}, ${e.x2} ${(e.y1 + e.y2)/2}, ${e.x2} ${e.y2}`} 
                fill="none" 
                stroke={e.color} 
                strokeWidth="1.5" 
              />
            ))}
          </g>

          {/* Render Node Capsules */}
          {nodes.map(n => {
            const isSel = selectedNode === n.id;
            return (
              <g 
                key={n.id} 
                className={`tree-node-group ${isSel ? 'selected' : ''}`}
                onClick={() => setSelectedNode(n.id)}
                transform={`translate(${n.x}, ${n.y})`}
                style={{ cursor: 'pointer' }}
              >
                <rect
                  x="-36"
                  y="-10"
                  width="72"
                  height="20"
                  rx="10"
                  fill={isSel ? '#C85A32' : '#F5ECE3'}
                  stroke={n.color || '#8B5A2B'}
                  strokeWidth={isSel ? 1.8 : 1.1}
                />
                <text
                  x="0"
                  y="3"
                  textAnchor="middle"
                  fill={isSel ? '#FAF4EE' : '#2D231E'}
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                >
                  {n.name}
                </text>
              </g>
            );
          })}
        </svg>
        )}
        {/* Selected Node Status Subtext */}
        <div className="ast-footer-status" style={{ position: 'sticky', bottom: 0, background: 'var(--bg-panel)' }}>
          <span>Active AST Node: <strong>{nodes.find(n => n.id === selectedNode)?.name || 'None'}</strong></span>
          <span className="ast-scope-tag">{nodes.find(n => n.id === selectedNode)?.type || 'N/A'}</span>
        </div>
      </div>
    </div>
  );
}
