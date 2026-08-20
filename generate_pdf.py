import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

pdf_filename = r"D:\CodeForge_PRO_Project_Workflow_and_Analysis.pdf"

doc = SimpleDocTemplate(
    pdf_filename,
    pagesize=letter,
    rightMargin=36,
    leftMargin=36,
    topMargin=36,
    bottomMargin=36
)

styles = getSampleStyleSheet()

# Custom Palette
DARK_CHARCOAL = colors.HexColor('#2D231E')
TERRACOTTA = colors.HexColor('#C85A32')
EMERALD = colors.HexColor('#2A5A3D')
WARM_BG = colors.HexColor('#FAF4EE')
BORDER_COLOR = colors.HexColor('#E4D9CE')
AMBER = colors.HexColor('#8B5A2B')
TEXT_DARK = colors.HexColor('#2D231E')
TEXT_MUTED = colors.HexColor('#5C4D44')

# Custom Styles
title_style = ParagraphStyle(
    'DocTitle',
    parent=styles['Heading1'],
    fontName='Helvetica-Bold',
    fontSize=18,
    leading=22,
    textColor=colors.white
)

subtitle_style = ParagraphStyle(
    'DocSubTitle',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9.5,
    leading=13,
    textColor=colors.HexColor('#D6C7BC')
)

h2_style = ParagraphStyle(
    'SectionH2',
    parent=styles['Heading2'],
    fontName='Helvetica-Bold',
    fontSize=12,
    leading=16,
    textColor=DARK_CHARCOAL,
    spaceBefore=12,
    spaceAfter=6
)

body_style = ParagraphStyle(
    'BodyTextCustom',
    parent=styles['Normal'],
    fontName='Helvetica',
    fontSize=9,
    leading=13,
    textColor=TEXT_DARK
)

code_style = ParagraphStyle(
    'CodeText',
    parent=styles['Normal'],
    fontName='Courier',
    fontSize=8,
    leading=11,
    textColor=DARK_CHARCOAL
)

story = []

# --- 1. HEADER BANNER ---
header_data = [[
    Paragraph("<font color='#E88D67'><b>TECHNICAL WORKFLOW & SYSTEM ANALYSIS REPORT</b></font><br/>"
              "<font size=16 color='#FAF4EE'><b>CodeForge PRO v2.5</b></font><br/>"
              "<font size=9 color='#D6C7BC'>Multi-Language Code Compiler, Google Gemini 2.5 AI Intelligence Engine & Code DNA Platform</font>", title_style)
]]

header_table = Table(header_data, colWidths=[540])
header_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), DARK_CHARCOAL),
    ('PADDING', (0,0), (-1,-1), 14),
    ('LINELEFT', (0,0), (-1,-1), 5, TERRACOTTA),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
]))
story.append(header_table)
story.append(Spacer(1, 14))

# --- 2. TEAM ROSTER ---
story.append(Paragraph("👥 Hackathon Project Team Members", h2_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=BORDER_COLOR, spaceBefore=2, spaceAfter=8))

team_members = [
    [Paragraph("<b>Akshat Aryan</b><br/><font color='#8B5A2B' size=8>Team Lead & Architect</font><br/><font color='#6E5D53' size=7.5>Reg: 240101120201</font>", body_style),
     Paragraph("<b>Arun Dev</b><br/><font color='#8B5A2B' size=8>Polyglot Compiler Eng.</font><br/><font color='#6E5D53' size=7.5>Reg: 240101120184</font>", body_style),
     Paragraph("<b>Aquib Hussain</b><br/><font color='#8B5A2B' size=8>Security & RBAC Lead</font><br/><font color='#6E5D53' size=7.5>Reg: 240101120192</font>", body_style)],
    [Paragraph("<b>Warish Khan</b><br/><font color='#8B5A2B' size=8>Frontend & Monaco Specialist</font><br/><font color='#6E5D53' size=7.5>Reg: 240101120186</font>", body_style),
     Paragraph("<b>Mohit</b><br/><font color='#8B5A2B' size=8>Gemini AI Pipeline Lead</font><br/><font color='#6E5D53' size=7.5>Reg: 240101120207</font>", body_style),
     Paragraph("<b>Abhay</b><br/><font color='#8B5A2B' size=8>Telemetry Engineer</font><br/><font color='#6E5D53' size=7.5>Reg: 240101120220</font>", body_style)]
]

team_table = Table(team_members, colWidths=[180, 180, 180])
team_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), WARM_BG),
    ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
    ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('PADDING', (0,0), (-1,-1), 8),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
]))
story.append(team_table)
story.append(Spacer(1, 14))

# --- 3. EXECUTIVE SUMMARY ---
story.append(Paragraph("📌 Executive Summary & Architectural Overview", h2_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=BORDER_COLOR, spaceBefore=2, spaceAfter=8))
exec_summary = (
    "<b>CodeForge PRO v2.5</b> is a high-performance, polyglot code compilation and AI analysis platform. "
    "It integrates sub-200ms multi-language code execution (Python, JS, TS, C++, Java, Go) with Google Gemini 2.5 Flash AI, "
    "offering real-time static analysis, live Monaco Editor IntelliSense hover tooltips, and a 4-axis code quality radar graph."
)
story.append(Paragraph(exec_summary, body_style))
story.append(Spacer(1, 14))

# --- 4. END-TO-END WORKFLOW ---
story.append(Paragraph("🔄 End-to-End System Execution Workflow", h2_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=BORDER_COLOR, spaceBefore=2, spaceAfter=8))

workflow_data = [
    [Paragraph("<font color='#C85A32'><b>Step 1: Code Input & Monaco IntelliSense Hover</b></font>", body_style),
     Paragraph("User enters code in Monaco IDE. Hovering over any symbol triggers <font color='#C85A32'>/api/ai-review/hover</font>, yielding sub-millisecond AI explanations.", body_style)],
    [Paragraph("<font color='#C85A32'><b>Step 2: Lexical Tokenization & Pattern Parsing</b></font>", body_style),
     Paragraph("<font color='#C85A32'>LexerService.tokenize()</font> categorizes code into 5 token buckets (Keywords, Identifiers, Operators, Literals, Punctuation) with line coordinates.", body_style)],
    [Paragraph("<font color='#C85A32'><b>Step 3: Multi-Language Execution Engine</b></font>", body_style),
     Paragraph("Backend executes code via local sandboxed CLI runner or public Piston API (<font color='#C85A32'>https://emkc.org/api/v2/piston</font>) in sub-200ms.", body_style)],
    [Paragraph("<font color='#C85A32'><b>Step 4: Gemini 2.5 Flash AI Analysis Engine</b></font>", body_style),
     Paragraph("Google Gemini 2.5 Flash calculates Cyclomatic Complexity, Maintainability Index, Duplication %, and Structural Similarity % across 3 rotated API keys.", body_style)]
]

wf_table = Table(workflow_data, colWidths=[200, 340])
wf_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), colors.white),
    ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
    ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('LINELEFT', (0,0), (0,-1), 4, TERRACOTTA),
    ('PADDING', (0,0), (-1,-1), 8),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
]))
story.append(wf_table)
story.append(Spacer(1, 14))

# Page Break for clean multi-page flow
story.append(PageBreak())

# --- 5. DEEP ANALYSIS OF 4 QUALITY METRICS ---
story.append(Paragraph("📊 Complete Analysis of 4 Quality Signal Categories", h2_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=BORDER_COLOR, spaceBefore=2, spaceAfter=8))

metrics_data = [
    [Paragraph("<b>1. Cyclomatic Complexity</b> <font color='#2A5A3D' size=8>[Control Flow Paths]</font>", body_style),
     Paragraph("Measures independent execution paths by counting decision statements (<i>if, while, for, case</i>). Target: Optimal &#8804; 5. Minimizes branch bug risk.", body_style)],
    [Paragraph("<b>2. Maintainability Index</b> <font color='#C85A32' size=8>[Score 0 - 100]</font>", body_style),
     Paragraph("Evaluates structural maintainability from active line count, cognitive weight, and variable scope density. Target: Grade A+ &#8805; 85.", body_style)],
    [Paragraph("<b>3. Code Duplication</b> <font color='#8B5A2B' size=8>[Percentage %]</font>", body_style),
     Paragraph("Scans AST statement patterns for redundant logic, copy-pasted blocks, or duplicate statements. Target: Optimal 0% duplication.", body_style)],
    [Paragraph("<b>4. Code Similarity</b> <font color='#2A5A3D' size=8>[Code DNA Match]</font>", body_style),
     Paragraph("Compares control flow structural isomorphism against benchmark reference solutions. Target: &lt; 50% match indicates an original implementation.", body_style)]
]

m_table = Table(metrics_data, colWidths=[210, 330])
m_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), WARM_BG),
    ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
    ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('PADDING', (0,0), (-1,-1), 9),
    ('VALIGN', (0,0), (-1,-1), 'TOP')
]))
story.append(m_table)
story.append(Spacer(1, 14))

# --- 6. DATABASE ER SCHEMA DIAGRAM ---
story.append(Paragraph("🗄️ Database ER Relationship Diagram", h2_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=BORDER_COLOR, spaceBefore=2, spaceAfter=8))

er_text = """+-------------------+        1:N        +-----------------------+
|       USER        |------------------<|      SUBMISSION       |
+-------------------+                   +-----------------------+
| id (PK)           |                   | id (PK)               |
| email             |                   | userId (FK)           |
| displayName       |                   | problemId (FK)        |
| role              |                   | languageId            |
| createdAt         |                   | status                |
+-------------------+                   +-----------------------+
          |                                         |
          | 1:N                                     | 1:1
          v                                         v
+-------------------+                   +-----------------------+
|    AI_ANALYSIS    |                   |       EXECUTION       |
+-------------------+                   +-----------------------+
| id (PK)           |                   | id (PK)               |
| userId (FK)       |                   | submissionId (FK)     |
| type              |                   | stdout                |
| sourceCode        |                   | stderr                |
| result (JSON)     |                   | runTimeMs             |
+-------------------+                   +-----------------------+"""

er_data = [[Paragraph(f"<font fontName='Courier' size=7.5 color='#FAF4EE'><pre>{er_text}</pre></font>", body_style)]]
er_table = Table(er_data, colWidths=[540])
er_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,-1), DARK_CHARCOAL),
    ('PADDING', (0,0), (-1,-1), 10),
    ('BOX', (0,0), (-1,-1), 1, DARK_CHARCOAL)
]))
story.append(er_table)
story.append(Spacer(1, 14))

# --- 7. SRS REQUIREMENTS TABLE ---
story.append(Paragraph("📋 Software Requirements Specification (SRS Table)", h2_style))
story.append(HRFlowable(width="100%", thickness=1.5, color=BORDER_COLOR, spaceBefore=2, spaceAfter=8))

srs_headers = [Paragraph("<b>Req ID</b>", body_style), Paragraph("<b>Requirement Name</b>", body_style), Paragraph("<b>Specification & Target Metric</b>", body_style), Paragraph("<b>Status</b>", body_style)]
srs_rows = [
    [Paragraph("<b>FR-01</b>", body_style), Paragraph("Polyglot Engine", body_style), Paragraph("Execute JS, TS, Py, C++, Java, Go in sandboxed CLI runner with sub-200ms latency.", body_style), Paragraph("<font color='#2A5A3D'><b>PASSED ✅</b></font>", body_style)],
    [Paragraph("<b>FR-02</b>", body_style), Paragraph("Gemini AI & Hover", body_style), Paragraph("Real-time code explanation, debugging, and Monaco hover tooltips via Gemini Flash API.", body_style), Paragraph("<font color='#2A5A3D'><b>PASSED ✅</b></font>", body_style)],
    [Paragraph("<b>FR-03</b>", body_style), Paragraph("4 Quality Signals", body_style), Paragraph("Calculate Cyclomatic Complexity, Maintainability Index, Duplication %, and Similarity %.", body_style), Paragraph("<font color='#2A5A3D'><b>PASSED ✅</b></font>", body_style)],
    [Paragraph("<b>NFR-01</b>", body_style), Paragraph("Key Rotation", body_style), Paragraph("Multi-tier key rotation across 3 Gemini API keys with automatic model fallback.", body_style), Paragraph("<font color='#2A5A3D'><b>PASSED ✅</b></font>", body_style)],
    [Paragraph("<b>NFR-02</b>", body_style), Paragraph("VS Code Ready", body_style), Paragraph("Pre-configured .vscode/launch.json for 1-click F5 full-stack debug launch.", body_style), Paragraph("<font color='#2A5A3D'><b>PASSED ✅</b></font>", body_style)],
]

srs_table_data = [srs_headers] + srs_rows
srs_table = Table(srs_table_data, colWidths=[55, 110, 295, 80])
srs_table.setStyle(TableStyle([
    ('BACKGROUND', (0,0), (-1,0), DARK_CHARCOAL),
    ('TEXTCOLOR', (0,0), (-1,0), colors.white),
    ('BACKGROUND', (0,1), (-1,-1), colors.white),
    ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, WARM_BG]),
    ('BOX', (0,0), (-1,-1), 1, BORDER_COLOR),
    ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
    ('PADDING', (0,0), (-1,-1), 7),
    ('VALIGN', (0,0), (-1,-1), 'MIDDLE')
]))
story.append(srs_table)
story.append(Spacer(1, 16))

# Footer Note
story.append(Paragraph("<font size=8 color='#8B5A2B'>CodeForge PRO v2.5 — Project Documentation & Technical Workflow Report | Saved to <b>D:\\CodeForge_PRO_Project_Workflow_and_Analysis.pdf</b></font>", ParagraphStyle('FooterStyle', alignment=1)))

# Build PDF
doc.build(story)
print("PDF Successfully Generated at D:\\CodeForge_PRO_Project_Workflow_and_Analysis.pdf")
