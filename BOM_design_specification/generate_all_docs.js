const { Document, Packer, Paragraph, TextRun, Header, Footer, Table, TableRow, TableCell,
  AlignmentType, HeadingLevel, PageNumber, PageBreak, WidthType, ShadingType,
  BorderStyle, TableOfContents, NumberFormat, SectionType } = require("docx");
const fs = require("fs");

// ═══════════════════════════════════════════════════════════════
// SHARED UTILITIES
// ═══════════════════════════════════════════════════════════════

const P = {
  primary: "0A1628", body: "1A2B40", secondary: "6878A0",
  accent: "5B8DB8", surface: "F4F8FC",
  cover: { titleColor: "FFFFFF", subtitleColor: "B0B8C0", metaColor: "90989F", footerColor: "687078" },
  table: { headerBg: "5B8DB8", headerText: "FFFFFF", accentLine: "5B8DB8", innerLine: "D0DDE8", surface: "EDF3F8" }
};

const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };
const thinBorder = { style: BorderStyle.SINGLE, size: 1, color: "D0D0D0" };
const tableBorders = {
  top: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
  bottom: { style: BorderStyle.SINGLE, size: 2, color: P.table.accentLine },
  left: thinBorder, right: thinBorder,
  insideHorizontal: thinBorder, insideVertical: thinBorder
};

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 120 },
    children: [new TextRun({ text, bold: true, size: 32, color: P.primary, font: { ascii: "Calibri", eastAsia: "SimHei" } })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 100 },
    children: [new TextRun({ text, bold: true, size: 28, color: P.primary, font: { ascii: "Calibri", eastAsia: "SimHei" } })]
  });
}
function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 240, after: 80 },
    children: [new TextRun({ text, bold: true, size: 26, color: P.primary, font: { ascii: "Calibri", eastAsia: "SimHei" } })]
  });
}
function p(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    spacing: { line: 312, after: 60 },
    children: [new TextRun({ text, size: 24, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}
function pNoIndent(text) {
  return new Paragraph({
    spacing: { line: 312, after: 60 },
    children: [new TextRun({ text, size: 24, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  });
}
function pBold(text) {
  return new Paragraph({
    spacing: { line: 312, after: 60 },
    children: [new TextRun({ text, size: 24, bold: true, color: P.primary, font: { ascii: "Calibri", eastAsia: "SimHei" } })]
  });
}
function bullet(text) {
  return new Paragraph({
    spacing: { line: 312, after: 40 },
    indent: { left: 480 },
    children: [
      new TextRun({ text: "\u2022 ", size: 24, color: P.accent, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text, size: 24, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ]
  });
}
function bulletSub(text) {
  return new Paragraph({
    spacing: { line: 312, after: 30 },
    indent: { left: 960 },
    children: [
      new TextRun({ text: "- ", size: 24, color: P.secondary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } }),
      new TextRun({ text, size: 24, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })
    ]
  });
}

function makeHeaderCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text, bold: true, size: 21, color: P.table.headerText, font: { ascii: "Calibri", eastAsia: "SimHei" } })] })]
  });
}
function makeCell(text, widthPct, opts = {}) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    shading: opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading } : undefined,
    margins: { top: 60, bottom: 60, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, size: 21, color: P.body, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
    })]
  });
}
function makeTable(headers, rows, colWidths) {
  const headerRow = new TableRow({
    tableHeader: true, cantSplit: true,
    children: headers.map((h, i) => makeHeaderCell(h, colWidths[i]))
  });
  const dataRows = rows.map((row, ri) =>
    new TableRow({
      cantSplit: true,
      children: row.map((cell, ci) => makeCell(cell, colWidths[ci], { shading: ri % 2 === 0 ? P.table.surface : undefined }))
    })
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: tableBorders,
    rows: [headerRow, ...dataRows]
  });
}

function buildCover(title, subtitle, metaLines) {
  const children = [];
  // Top spacing
  children.push(new Paragraph({ spacing: { before: 4000 }, children: [] }));
  // Title
  const titleLines = title.length > 18 ? [title.slice(0, Math.floor(title.length / 2)), title.slice(Math.floor(title.length / 2))] : [title];
  for (const line of titleLines) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { line: Math.ceil(40 * 23), lineRule: "atLeast", after: 80 },
      children: [new TextRun({ text: line, size: 80, bold: true, color: P.cover.titleColor, font: { ascii: "Calibri", eastAsia: "SimHei" } })]
    }));
  }
  // Accent line
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: P.accent, space: 10 } },
    indent: { left: 3000, right: 3000 },
    children: []
  }));
  // Subtitle
  if (subtitle) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 300 },
      children: [new TextRun({ text: subtitle, size: 32, color: P.cover.subtitleColor, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
    }));
  }
  // Meta lines
  for (const line of metaLines) {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80, after: 40 },
      children: [new TextRun({ text: line, size: 22, color: P.cover.metaColor, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
    }));
  }
  // Footer
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 2000 },
    children: [new TextRun({ text: "BOMMaster Project", size: 20, color: P.cover.footerColor, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })]
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: allNoBorders,
    rows: [new TableRow({
      height: { value: 16838, rule: "exact" },
      children: [new TableCell({
        width: { size: 100, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: "0B1C2C" },
        verticalAlign: "top",
        borders: allNoBorders,
        children
      })]
    })]
  });
}

function createDoc(coverTitle, coverSubtitle, coverMeta, bodyChildren) {
  return new Document({
    styles: {
      default: {
        document: {
          run: { font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" }, size: 24, color: P.body },
          paragraph: { spacing: { line: 312 } }
        },
        heading1: { run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: P.primary } },
        heading2: { run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28, bold: true, color: P.primary } },
        heading3: { run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 26, bold: true, color: P.primary } }
      }
    },
    sections: [
      // Cover section
      {
        properties: {
          page: { margin: { top: 0, bottom: 0, left: 0, right: 0 }, size: { width: 11906, height: 16838 } }
        },
        children: [buildCover(coverTitle, coverSubtitle, coverMeta)]
      },
      // TOC section
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: NumberFormat.UPPER_ROMAN }
          }
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary })] })] })
        },
        children: [
          new Paragraph({ spacing: { before: 200, after: 200 }, children: [new TextRun({ text: "\u76ee\u5f55", size: 36, bold: true, color: P.primary, font: { ascii: "Calibri", eastAsia: "SimHei" } })] }),
          new TableOfContents("\u76ee\u5f55", { hyperlink: true, headingStyleRange: "1-3" }),
          new Paragraph({ children: [new PageBreak()] }),
          new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 100 }, children: [new TextRun({ text: "\uff08\u8bf7\u53f3\u952e\u76ee\u5f55\u2192\u201c\u66f4\u65b0\u57df\u201d\u4ee5\u5237\u65b0\u9875\u7801\uff09", size: 18, italics: true, color: P.secondary, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })] })
        ]
      },
      // Body section
      {
        properties: {
          page: {
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: NumberFormat.DECIMAL }
          }
        },
        footers: {
          default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: P.secondary })] })] })
        },
        children: bodyChildren
      }
    ]
  });
}

async function saveDoc(doc, filename) {
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filename, buffer);
  console.log(`Generated: ${filename}`);
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT 1: PRD
// ═══════════════════════════════════════════════════════════════

function buildPRD() {
  const children = [];

  children.push(h1("1. \u9879\u76ee\u6982\u8ff0"));
  children.push(p("\u672c\u6587\u6863\u5b9a\u4e49 BOMMaster \u7cfb\u7edf\u7684\u4ea7\u54c1\u9700\u6c42\uff0c\u8be5\u7cfb\u7edf\u65e8\u5728\u89e3\u51b3\u786c\u4ef6\u7814\u53d1\u56e2\u961f\u5728 BOM\uff08\u7269\u6599\u6e05\u5355\uff09\u7ba1\u7406\u8fc7\u7a0b\u4e2d\u9047\u5230\u7684\u6838\u5fc3\u75db\u70b9\uff1a\u4f20\u7edf Excel \u7ba1\u7406\u65b9\u5f0f\u5bfc\u81f4\u7684\u7248\u672c\u6df7\u4e71\u3001\u66ff\u4ee3\u6599\u8ffd\u8e2a\u56f0\u96be\u3001\u591a\u4eba\u534f\u4f5c\u51b2\u7a81\u7b49\u95ee\u9898\u3002\u7cfb\u7edf\u91c7\u7528 Tauri + Vue 3 + SQLite \u6280\u672f\u6808\uff0c\u63d0\u4f9b\u684c\u9762\u7ea7\u522b\u7684\u9ad8\u6027\u80fd\u4f53\u9a8c\uff0c\u652f\u6301\u79bb\u7ebf\u4f7f\u7528\u3002"));

  children.push(h2("1.1 \u9879\u76ee\u57fa\u672c\u4fe1\u606f"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u5185\u5bb9"],
    [
      ["\u9879\u76ee\u540d\u79f0", "BOMMaster"],
      ["\u76ee\u6807\u7528\u6237", "\u786c\u4ef6\u5de5\u7a0b\u5e08\u3001\u91c7\u8d2d\u4eba\u5458\u3001NPI\u9879\u76ee\u7ecf\u7406"],
      ["\u5e73\u53f0\u8981\u6c42", "Windows 10/11 \u684c\u9762\u5e94\u7528\uff0c\u652f\u6301\u79bb\u7ebf\u4f7f\u7528"],
      ["\u6280\u672f\u6808", "Tauri v2 + Vue 3 + TypeScript + SQLite + Prisma"],
      ["\u5f53\u524d\u7248\u672c", "v1.0.0"],
      ["\u6587\u6863\u7248\u672c", "v1.0"]
    ],
    [30, 70]
  ));

  children.push(h2("1.2 \u6838\u5fc3\u75db\u70b9\u4e0e\u89e3\u51b3\u65b9\u6848"));
  children.push(makeTable(
    ["\u75db\u70b9", "\u73b0\u72b6\u63cf\u8ff0", "\u89e3\u51b3\u65b9\u6848"],
    [
      ["\u7248\u672c\u6df7\u4e71", "\u591a\u4eba\u7ef4\u62a4\u540c\u4e00 Excel \u6587\u4ef6\uff0c\u65e0\u7248\u672c\u63a7\u5236\uff0c\u66f9\u6539\u65e0\u6cd5\u8ffd\u6eaf", "\u5f15\u5165 BOM \u7248\u672c\u7ba1\u7406\uff0c\u6bcf\u6b21\u53d8\u66f4\u81ea\u52a8\u751f\u6210\u65b0\u7248\u672c\uff0c\u652f\u6301\u53d8\u66f4\u5386\u53f2\u67e5\u770b"],
      ["\u66ff\u4ee3\u6599\u8ffd\u8e2a\u56f0\u96be", "\u66ff\u4ee3\u6599\u5173\u7cfb\u6563\u843d\u5728\u591a\u4e2a Excel \u4e2d\uff0c\u65e0\u7edf\u4e00\u7ba1\u7406", "\u5efa\u7acb\u66ff\u4ee3\u6599\u5173\u7cfb\u56fe\u8c31\uff0c\u652f\u6301\u4e00\u952e\u67e5\u770b\u6240\u6709\u66ff\u4ee3\u6599\u53ca\u5176\u72b6\u6001"],
      ["\u591a\u4eba\u534f\u4f5c\u51b2\u7a81", "\u6587\u4ef6\u9501\u5bfc\u81f4\u6570\u636e\u4e22\u5931\u6216\u8986\u76d6", "\u57fa\u4e8e\u672c\u5730\u6570\u636e\u5e93\u7684\u5355\u673a\u64cd\u4f5c\uff0c\u907f\u514d\u5e76\u53d1\u5199\u5165\u51b2\u7a81"],
      ["\u5c42\u7ea7\u5173\u7cfb\u4e0d\u6e05\u6670", "Excel \u65e0\u6cd5\u76f4\u89c2\u5c55\u793a\u591a\u5c42\u7ea7 BOM \u7ed3\u6784", "\u63d0\u4f9b\u53ef\u89c6\u5316\u6811\u72b6\u56fe\u5c55\u793a\uff0c\u652f\u6301\u62d6\u62fd\u3001\u6298\u53e0\u3001\u641c\u7d22"],
      ["\u6570\u636e\u8fc1\u79fb\u56f0\u96be", "\u65e7\u7cfb\u7edf\u6570\u636e\u5bfc\u5165\u65b0\u7cfb\u7edf\u8017\u65f6\u8017\u529b", "\u652f\u6301 Excel \u5bfc\u5165\u5bfc\u51fa\uff0c\u63d0\u4f9b\u5b57\u6bb5\u6620\u5c04\u529f\u80fd"]
    ],
    [15, 40, 45]
  ));

  children.push(h2("1.3 \u7528\u6237\u89d2\u8272\u5b9a\u4e49"));
  children.push(makeTable(
    ["\u89d2\u8272", "\u804c\u8d23\u8bf4\u660e", "\u6838\u5fc3\u64cd\u4f5c"],
    [
      ["\u786c\u4ef6\u5de5\u7a0b\u5e08", "\u8d1f\u8d23 BOM \u7684\u521b\u5efa\u3001\u7f16\u8f91\u3001\u7248\u672c\u7ba1\u7406", "\u521b\u5efa/\u7f16\u8f91 BOM\u3001\u7ba1\u7406\u66ff\u4ee3\u6599\u3001\u5bfc\u5165\u5bfc\u51fa"],
      ["\u91c7\u8d2d\u4eba\u5458", "\u6839\u636e BOM \u8fdb\u884c\u7269\u6599\u91c7\u8d2d\u548c\u72b6\u6001\u8ddf\u8e2a", "\u67e5\u770b BOM\u3001\u66f4\u65b0\u7269\u6599\u72b6\u6001\u3001\u67e5\u770b\u66ff\u4ee3\u6599"],
      ["NPI\u9879\u76ee\u7ecf\u7406", "\u7edf\u7b79\u6574\u4e2a\u4ea7\u54c1\u7684 BOM \u7ba1\u7406\u548c\u53d8\u66f4\u5ba1\u6279", "\u5ba1\u6279\u53d8\u66f4\u3001\u67e5\u770b\u7248\u672c\u5386\u53f2\u3001BOM \u5bf9\u6bd4"]
    ],
    [20, 40, 40]
  ));

  // US-001
  children.push(h1("2. \u7528\u6237\u6545\u4e8b\u4e0e\u9a8c\u6536\u6807\u51c6"));
  children.push(h2("2.1 US-001: \u521b\u5efa\u591a\u5c42\u7ea7 BOM"));
  children.push(pBold("\u7528\u6237\u6545\u4e8b\uff1a\u4f5c\u4e3a\u4e00\u4e2a\u786c\u4ef6\u5de5\u7a0b\u5e08\uff0c\u6211\u60f3\u8981\u521b\u5efa\u591a\u5c42\u7ea7 BOM\uff0c\u4ee5\u4fbf\u4e8e\u53cd\u6620 PCBA\u3001\u5355\u677f\u3001\u5143\u5668\u4ef6\u7684\u771f\u5b9e\u7236\u5b50\u88c5\u914d\u5173\u7cfb\u3002"));
  children.push(pBold("\u4f18\u5148\u7ea7\uff1aP0 (Must have)"));
  children.push(pBold("\u524d\u7f6e\u6761\u4ef6\uff1a\u7528\u6237\u5df2\u521b\u5efa\u4e00\u4e2a\u9879\u76ee\u3002"));
  children.push(p("\u9a8c\u6536\u6807\u51c6\uff1a"));
  children.push(bullet("\u63d0\u4f9b\u53ef\u89c6\u5316\u6811\u72b6\u56fe\u5c55\u793a BOM \u5c42\u7ea7\uff0c\u652f\u6301\u8282\u70b9\u5c55\u5f00/\u6298\u53e0\u3001\u62d6\u62fd\u6392\u5e8f\u3001\u641c\u7d22\u8282\u70b9\u3002"));
  children.push(bullet("\u652f\u6301\u5728\u4efb\u610f\u8282\u70b9\u53f3\u952e\u6dfb\u52a0\u201c\u5b50\u8282\u70b9\u201d\uff08\u4e0b\u7ea7 BOM\uff09\u6216\u201c\u6302\u6599\u201d\uff08\u53f6\u5b50\u8282\u70b9\uff09\u3002"));
  children.push(bullet("BOM \u5c42\u7ea7\u6700\u591a\u652f\u6301 10 \u7ea7\u6df1\u5ea6\uff0c\u8d85\u8fc7\u65f6\u9700\u5f39\u7a97\u8b66\u544a\u3002"));
  children.push(bullet("\u540c\u4e00\u7236\u8282\u70b9\u4e0b\uff0c\u4e0d\u5141\u8bb8\u6dfb\u52a0\u91cd\u590d\u7684\u5b50 BOM \u6216\u5143\u5668\u4ef6\u578b\u53f7\u3002"));
  children.push(bullet("\u652f\u6301\u901a\u8fc7\u952e\u76d8\u5feb\u6377\u952e Ctrl+N \u65b0\u5efa\u5b50\u8282\u70b9\uff0cDelete \u5220\u9664\u8282\u70b9\u3002"));
  children.push(bullet("\u5220\u9664\u542b\u5b50\u8282\u70b9\u7684\u7236\u8282\u70b9\u65f6\uff0c\u9700\u4e8c\u6b21\u786e\u8ba4\u5e76\u63d0\u793a\u5f71\u54cd\u8303\u56f4\u3002"));
  children.push(pBold("\u5f02\u5e38\u6d41\uff1a\u82e5\u7528\u6237\u5c1d\u8bd5\u6dfb\u52a0\u8d85\u8fc7 10 \u7ea7\u7684\u8282\u70b9\uff0c\u62e6\u622a\u64cd\u4f5c\u5e76\u63d0\u793a\u201c\u5df2\u8fbe\u6700\u5927\u5c42\u7ea7\u201d\u3002"));

  // US-002
  children.push(h2("2.2 US-002: \u5bfc\u5165 Excel BOM"));
  children.push(pBold("\u7528\u6237\u6545\u4e8b\uff1a\u4f5c\u4e3a\u4e00\u4e2a\u786c\u4ef6\u5de5\u7a0b\u5e08\uff0c\u6211\u60f3\u8981\u901a\u8fc7\u4e0a\u4f20 Excel \u6587\u4ef6\u5bfc\u5165 BOM\uff0c\u4ee5\u4fbf\u4e8e\u5feb\u901f\u5c06\u65e7\u7cfb\u7edf\u6570\u636e\u8fc1\u79fb\u81f3\u672c\u7cfb\u7edf\u3002"));
  children.push(pBold("\u4f18\u5148\u7ea7\uff1aP0 (Must have)"));
  children.push(p("\u9a8c\u6536\u6807\u51c6\uff1a"));
  children.push(bullet("\u652f\u6301\u62d6\u62fd\u6216\u70b9\u51fb\u4e0a\u4f20 .xlsx / .xls \u6587\u4ef6\uff0c\u5355\u6587\u4ef6\u5927\u5c0f\u9650\u5236 50MB\u3002"));
  children.push(bullet("\u4e0a\u4f20\u540e\u8fdb\u5165\u201c\u5b57\u6bb5\u6620\u5c04\u201d\u9875\u9762\uff0c\u7528\u6237\u9700\u5c06 Excel \u5217\u540d\uff08\u5982\u201cPart Number\u201d\uff09\u6620\u5c04\u4e3a\u7cfb\u7edf\u5b57\u6bb5\uff08\u5982\u201c\u578b\u53f7\u201d\uff09\u3002"));
  children.push(bullet("\u63d0\u4f9b\u6570\u636e\u9884\u89c8\u8868\u683c\uff0c\u6821\u9a8c\u5fc5\u586b\u9879\uff08\u578b\u53f7\u3001\u6570\u91cf\uff09\uff0c\u7f3a\u5931\u5fc5\u586b\u9879\u7684\u884c\u6807\u7ea2\u63d0\u793a\u3002"));
  children.push(bullet("\u7528\u6237\u786e\u8ba4\u6620\u5c04\u65e0\u8bef\u540e\uff0c\u70b9\u51fb\u201c\u786e\u8ba4\u5bfc\u5165\u201d\u5199\u5165\u6570\u636e\u5e93\u3002"));
  children.push(bullet("\u652f\u6301\u5bfc\u5165\u6a21\u677f\u4fdd\u5b58\uff0c\u7528\u6237\u53ef\u5c06\u5f53\u524d\u5b57\u6bb5\u6620\u5c04\u5173\u7cfb\u4fdd\u5b58\u4e3a\u6a21\u677f\uff0c\u4e0b\u6b21\u5bfc\u5165\u65f6\u81ea\u52a8\u5e94\u7528\u3002"));
  children.push(bullet("\u5bfc\u5165\u8fc7\u7a0b\u4e2d\u663e\u793a\u8fdb\u5ea6\u6761\uff0c\u5bfc\u5165\u5b8c\u6210\u540e\u663e\u793a\u6210\u529f/\u5931\u8d25/\u8df3\u8fc7\u7684\u884c\u6570\u7edf\u8ba1\u3002"));
  children.push(pBold("\u5f02\u5e38\u6d41\uff1a\u6587\u4ef6\u683c\u5f0f\u4e0d\u7b26\u3001\u5fc5\u586b\u5b57\u6bb5\u7f3a\u5931\u3001\u6570\u636e\u91cf\u8d85\u8fc7\u9650\u5236\u65f6\uff0c\u7ed9\u51fa\u660e\u786e\u7684\u9519\u8bef\u63d0\u793a\u3002"));

  // US-003
  children.push(h2("2.3 US-003: BOM \u7248\u672c\u7ba1\u7406"));
  children.push(pBold("\u7528\u6237\u6545\u4e8b\uff1a\u4f5c\u4e3a\u4e00\u4e2a\u786c\u4ef6\u5de5\u7a0b\u5e08\uff0c\u6211\u60f3\u8981\u5bf9 BOM \u8fdb\u884c\u7248\u672c\u7ba1\u7406\uff0c\u4ee5\u4fbf\u4e8e\u8ffd\u8e2a\u6bcf\u6b21\u53d8\u66f4\u5e76\u652f\u6301\u56de\u6eda\u3002"));
  children.push(pBold("\u4f18\u5148\u7ea7\uff1aP0 (Must have)"));
  children.push(p("\u9a8c\u6536\u6807\u51c6\uff1a"));
  children.push(bullet("\u6bcf\u6b21\u4fdd\u5b58 BOM \u4fee\u6539\u65f6\u81ea\u52a8\u751f\u6210\u65b0\u7248\u672c\uff0c\u7248\u672c\u53f7\u683c\u5f0f\u4e3a v1.0\u3001v1.1\u3001v2.0 \u7b49\u3002"));
  children.push(bullet("\u652f\u6301\u624b\u52a8\u6307\u5b9a\u7248\u672c\u53f7\u9012\u589e\u7c7b\u578b\uff1a\u4e3b\u7248\u672c\uff08Major\uff09\u3001\u6b21\u7248\u672c\uff08Minor\uff09\u3001\u4fee\u8ba2\u7248\uff08Patch\uff09\u3002"));
  children.push(bullet("\u63d0\u4f9b\u7248\u672c\u5386\u53f2\u5217\u8868\uff0c\u663e\u793a\u6bcf\u4e2a\u7248\u672c\u7684\u53d8\u66f4\u65f6\u95f4\u3001\u64cd\u4f5c\u4eba\u3001\u53d8\u66f4\u6458\u8981\u3002"));
  children.push(bullet("\u652f\u6301\u5c06\u4efb\u610f\u7248\u672c\u8bbe\u4e3a\u5f53\u524d\u6d3b\u52a8\u7248\u672c\uff0c\u652f\u6301\u56de\u6eda\u5230\u6307\u5b9a\u7248\u672c\u3002"));
  children.push(bullet("\u7248\u672c\u5bf9\u6bd4\u529f\u80fd\uff1a\u9009\u62e9\u4e24\u4e2a\u7248\u672c\u8fdb\u884c\u5dee\u5f02\u5bf9\u6bd4\uff0c\u9ad8\u4eae\u663e\u793a\u589e\u5220\u6539\u7684\u8282\u70b9\u3002"));
  children.push(bullet("\u7248\u672c\u53d8\u66f4\u65f6\u5fc5\u987b\u586b\u5199\u53d8\u66f4\u6458\u8981\uff08\u4e0d\u5c11\u4e8e 5 \u4e2a\u5b57\u7b26\uff09\u3002"));

  // US-004
  children.push(h2("2.4 US-004: \u66ff\u4ee3\u6599\u7ba1\u7406"));
  children.push(pBold("\u7528\u6237\u6545\u4e8b\uff1a\u4f5c\u4e3a\u4e00\u4e2a\u786c\u4ef6\u5de5\u7a0b\u5e08\uff0c\u6211\u60f3\u8981\u7ba1\u7406\u5143\u5668\u4ef6\u7684\u66ff\u4ee3\u6599\u5173\u7cfb\uff0c\u4ee5\u4fbf\u4e8e\u5728\u4e3b\u6599\u7f3a\u8d27\u65f6\u5feb\u901f\u627e\u5230\u53ef\u66ff\u4ee3\u65b9\u6848\u3002"));
  children.push(pBold("\u4f18\u5148\u7ea7\uff1aP0 (Must have)"));
  children.push(p("\u9a8c\u6536\u6807\u51c6\uff1a"));
  children.push(bullet("\u652f\u6301\u4e3a\u4efb\u610f\u5143\u5668\u4ef6\u6dfb\u52a0\u66ff\u4ee3\u6599\uff0c\u8bbe\u5b9a\u66ff\u4ee3\u4f18\u5148\u7ea7\uff08\u9996\u9009/\u5907\u9009/\u4e34\u65f6\uff09\u3002"));
  children.push(bullet("\u66ff\u4ee3\u6599\u5173\u7cfb\u4ee5\u56fe\u8c31\u5f62\u5f0f\u5c55\u793a\uff0c\u652f\u6301\u67e5\u770b\u67d0\u5143\u5668\u4ef6\u7684\u5168\u90e8\u66ff\u4ee3\u94fe\u3002"));
  children.push(bullet("\u66ff\u4ee3\u6599\u72b6\u6001\u7ba1\u7406\uff1a\u6d3b\u8dc3\uff08Active\uff09\u3001\u5f85\u5ba1\u6279\uff08Pending\uff09\u3001\u5df2\u505c\u7528\uff08Deprecated\uff09\u3002"));
  children.push(bullet("\u652f\u6301\u6279\u91cf\u5bfc\u5165\u66ff\u4ee3\u6599\u5173\u7cfb\uff08\u901a\u8fc7 Excel\uff09\u3002"));
  children.push(bullet("\u5f53\u4e3b\u6599\u72b6\u6001\u53d8\u66f4\u65f6\uff0c\u81ea\u52a8\u901a\u77e5\u5173\u8054\u7684\u66ff\u4ee3\u6599\u72b6\u6001\u66f4\u65b0\u3002"));

  // US-005
  children.push(h2("2.5 US-005: BOM \u5bfc\u51fa"));
  children.push(pBold("\u7528\u6237\u6545\u4e8b\uff1a\u4f5c\u4e3a\u4e00\u4e2a\u786c\u4ef6\u5de5\u7a0b\u5e08\uff0c\u6211\u60f3\u8981\u5c06 BOM \u5bfc\u51fa\u4e3a Excel \u6587\u4ef6\uff0c\u4ee5\u4fbf\u4e8e\u4e0e\u4f9b\u5e94\u5546\u6216\u5176\u4ed6\u7cfb\u7edf\u5171\u4eab\u6570\u636e\u3002"));
  children.push(pBold("\u4f18\u5148\u7ea7\uff1aP1 (Should have)"));
  children.push(p("\u9a8c\u6536\u6807\u51c6\uff1a"));
  children.push(bullet("\u652f\u6301\u5bfc\u51fa\u4e3a .xlsx \u683c\u5f0f\uff0c\u5305\u542b\u5b8c\u6574\u7684 BOM \u5c42\u7ea7\u7ed3\u6784\u3002"));
  children.push(bullet("\u63d0\u4f9b\u591a\u79cd\u5bfc\u51fa\u6a21\u677f\uff1a\u6807\u51c6 BOM \u6a21\u677f\u3001\u91c7\u8d2d BOM \u6a21\u677f\u3001\u751f\u4ea7 BOM \u6a21\u677f\u3002"));
  children.push(bullet("\u652f\u6301\u81ea\u5b9a\u4e49\u5bfc\u51fa\u5b57\u6bb5\u9009\u62e9\uff0c\u7528\u6237\u53ef\u52fe\u9009\u9700\u8981\u5bfc\u51fa\u7684\u5b57\u6bb5\u3002"));
  children.push(bullet("\u5bfc\u51fa\u6587\u4ef6\u540d\u81ea\u52a8\u751f\u6210\uff0c\u683c\u5f0f\u4e3a\u201c{ProjectName}_BOM_v{Version}_{Date}.xlsx\u201d\u3002"));

  // US-006
  children.push(h2("2.6 US-006: BOM \u641c\u7d22\u4e0e\u7b5b\u9009"));
  children.push(pBold("\u7528\u6237\u6545\u4e8b\uff1a\u4f5c\u4e3a\u4e00\u4e2a\u786c\u4ef6\u5de5\u7a0b\u5e08\uff0c\u6211\u60f3\u8981\u5feb\u901f\u641c\u7d22\u548c\u7b5b\u9009 BOM \u4e2d\u7684\u5143\u5668\u4ef6\uff0c\u4ee5\u4fbf\u4e8e\u5feb\u901f\u5b9a\u4f4d\u7279\u5b9a\u7269\u6599\u3002"));
  children.push(pBold("\u4f18\u5148\u7ea7\uff1aP1 (Should have)"));
  children.push(p("\u9a8c\u6536\u6807\u51c6\uff1a"));
  children.push(bullet("\u652f\u6301\u6309\u578b\u53f7\u3001\u63cf\u8ff0\u3001\u5c01\u88c5\u3001\u5382\u5bb6\u7b49\u5b57\u6bb5\u8fdb\u884c\u5168\u6587\u641c\u7d22\u3002"));
  children.push(bullet("\u652f\u6301\u6309\u7269\u6599\u72b6\u6001\uff08\u6d3b\u8dc3/\u505c\u4ea7/\u5f85\u5ba1\u6279\uff09\u3001\u7c7b\u522b\u3001\u5c42\u7ea7\u8fdb\u884c\u7b5b\u9009\u3002"));
  children.push(bullet("\u641c\u7d22\u7ed3\u679c\u5728\u6811\u72b6\u56fe\u4e2d\u9ad8\u4eae\u663e\u793a\u5339\u914d\u8282\u70b9\uff0c\u5e76\u81ea\u52a8\u5c55\u5f00\u5176\u7236\u7ea7\u8282\u70b9\u3002"));
  children.push(bullet("\u652f\u6301\u641c\u7d22\u5386\u53f2\u8bb0\u5f55\uff0c\u5feb\u901f\u91cd\u590d\u641c\u7d22\u3002"));

  // US-007
  children.push(h2("2.7 US-007: \u9879\u76ee\u7ba1\u7406"));
  children.push(pBold("\u7528\u6237\u6545\u4e8b\uff1a\u4f5c\u4e3a\u4e00\u4e2a NPI \u9879\u76ee\u7ecf\u7406\uff0c\u6211\u60f3\u8981\u7ba1\u7406\u591a\u4e2a\u9879\u76ee\u7684 BOM\uff0c\u4ee5\u4fbf\u4e8e\u7edf\u4e00\u7ba1\u7406\u4e0d\u540c\u4ea7\u54c1\u7684\u7269\u6599\u6e05\u5355\u3002"));
  children.push(pBold("\u4f18\u5148\u7ea7\uff1aP1 (Should have)"));
  children.push(p("\u9a8c\u6536\u6807\u51c6\uff1a"));
  children.push(bullet("\u652f\u6301\u521b\u5efa\u3001\u7f16\u8f91\u3001\u5220\u9664\u9879\u76ee\uff0c\u9879\u76ee\u5305\u542b\u540d\u79f0\u3001\u7f16\u53f7\u3001\u63cf\u8ff0\u3001\u72b6\u6001\u7b49\u5c5e\u6027\u3002"));
  children.push(bullet("\u9879\u76ee\u72b6\u6001\u6d41\u8f6c\uff1a\u8bbe\u8ba1\u4e2d \u2192 \u5df2\u53d1\u5e03 \u2192 \u5df2\u5f52\u6863\uff0c\u72b6\u6001\u53d8\u66f4\u9700\u8bb0\u5f55\u65e5\u5fd7\u3002"));
  children.push(bullet("\u6bcf\u4e2a\u9879\u76ee\u53ef\u5173\u8054\u591a\u4e2a BOM\uff0c\u652f\u6301\u4ece\u9879\u76ee\u5217\u8868\u5feb\u901f\u8fdb\u5165 BOM \u7f16\u8f91\u3002"));
  children.push(bullet("\u652f\u6301\u9879\u76ee\u7ea7\u522b\u7684\u5143\u5668\u4ef6\u7edf\u8ba1\uff1a\u603b\u6570\u3001\u6d3b\u8dc3\u6570\u3001\u505c\u4ea7\u6570\u3001\u66ff\u4ee3\u6599\u8986\u76d6\u7387\u3002"));

  // US-008
  children.push(h2("2.8 US-008: \u53d8\u66f4\u5ba1\u6279\u6d41\u7a0b"));
  children.push(pBold("\u7528\u6237\u6545\u4e8b\uff1a\u4f5c\u4e3a\u4e00\u4e2a NPI \u9879\u76ee\u7ecf\u7406\uff0c\u6211\u60f3\u8981\u5bf9 BOM \u7684\u91cd\u5927\u53d8\u66f4\u8fdb\u884c\u5ba1\u6279\uff0c\u4ee5\u4fbf\u4e8e\u63a7\u5236\u53d8\u66f4\u8d28\u91cf\u3002"));
  children.push(pBold("\u4f18\u5148\u7ea7\uff1aP2 (Nice to have)"));
  children.push(p("\u9a8c\u6536\u6807\u51c6\uff1a"));
  children.push(bullet("\u652f\u6301\u53d1\u8d77\u53d8\u66f4\u7533\u8bf7\uff08ECN\uff09\uff0c\u586b\u5199\u53d8\u66f4\u539f\u56e0\u3001\u5f71\u54cd\u8303\u56f4\u3001\u5ba1\u6279\u4eba\u3002"));
  children.push(bullet("\u5ba1\u6279\u72b6\u6001\u6d41\u8f6c\uff1a\u5f85\u5ba1\u6279 \u2192 \u5df2\u6279\u51c6 \u2192 \u5df2\u62d2\u7edd\uff0c\u5ba1\u6279\u7ed3\u679c\u901a\u77e5\u7533\u8bf7\u4eba\u3002"));
  children.push(bullet("\u5ba1\u6279\u901a\u8fc7\u540e\u81ea\u52a8\u751f\u6210\u65b0\u7248\u672c BOM\u3002"));

  // Non-functional
  children.push(h1("3. \u975e\u529f\u80fd\u6027\u9700\u6c42"));
  children.push(h2("3.1 \u6027\u80fd\u8981\u6c42"));
  children.push(makeTable(
    ["\u6307\u6807", "\u8981\u6c42", "\u6d4b\u8bd5\u65b9\u6cd5"],
    [
      ["BOM \u6811\u52a0\u8f7d", "\u542b 10,000 \u8282\u70b9\u7684 BOM \u6a21\u578b\u52a0\u8f7d\u65f6\u95f4 \u2264 3 \u79d2", "\u6784\u9020\u5927\u89c4\u6a21\u6d4b\u8bd5\u6570\u636e\u6d4b\u91cf"],
      ["Excel \u5bfc\u5165", "10,000 \u884c BOM \u6570\u636e\u89e3\u6790\u4e0e\u5199\u5165\u65f6\u95f4 \u2264 5 \u79d2", "\u8ba1\u65f6\u6d4b\u8bd5"],
      ["\u641c\u7d22\u54cd\u5e94", "\u5168\u6587\u641c\u7d22\u7ed3\u679c\u8fd4\u56de\u65f6\u95f4 \u2264 500ms", "\u641c\u7d22\u6027\u80fd\u6d4b\u8bd5"],
      ["\u5185\u5b58\u5360\u7528", "\u5e94\u7528\u7a7a\u95f2\u72b6\u6001\u5185\u5b58 \u2264 200MB", "\u4efb\u52a1\u7ba1\u7406\u5668\u76d1\u63a7"],
      ["\u542f\u52a8\u65f6\u95f4", "\u51b7\u542f\u52a8\u5230\u4e3b\u754c\u9762\u53ef\u7528 \u2264 3 \u79d2", "\u8ba1\u65f6\u6d4b\u8bd5"]
    ],
    [25, 45, 30]
  ));

  children.push(h2("3.2 \u6570\u636e\u5b89\u5168"));
  children.push(bullet("\u672c\u5730\u6570\u636e\u5e93\u81ea\u52a8\u5907\u4efd\uff0c\u9ed8\u8ba4\u6bcf 24 \u5c0f\u65f6\u5907\u4efd\u4e00\u6b21\uff0c\u4fdd\u7559\u6700\u8fd1 7 \u5929\u7684\u5907\u4efd\u6587\u4ef6\u3002"));
  children.push(bullet("\u5220\u9664\u64cd\u4f5c\u9700\u4e8c\u6b21\u786e\u8ba4\uff0c\u5220\u9664\u540e\u6570\u636e\u8fdb\u5165\u56de\u6536\u7ad9\uff0c30 \u5929\u5185\u53ef\u6062\u590d\u3002"));
  children.push(bullet("\u6570\u636e\u5e93\u6587\u4ef6\u52a0\u5bc6\u5b58\u50a8\uff0c\u9632\u6b62\u672a\u6388\u6743\u8bbf\u95ee\u3002"));
  children.push(bullet("\u5173\u952e\u64cd\u4f5c\uff08\u5220\u9664\u3001\u7248\u672c\u56de\u6eda\uff09\u9700\u5199\u5165\u5ba1\u8ba1\u65e5\u5fd7\u3002"));

  children.push(h2("3.3 \u53ef\u7528\u6027"));
  children.push(bullet("\u754c\u9762\u8bed\u8a00\uff1a\u7b80\u4f53\u4e2d\u6587\uff0c\u9396\u7559\u56fd\u9645\u5316\u63a5\u53e3\u3002"));
  children.push(bullet("\u5feb\u6377\u952e\u652f\u6301\uff1a\u5e38\u7528\u64cd\u4f5c\u5747\u63d0\u4f9b\u952e\u76d8\u5feb\u6377\u952e\u3002"));
  children.push(bullet("\u54cd\u5e94\u5f0f\u5e03\u5c40\uff1a\u652f\u6301\u7a97\u53e3\u7f29\u653e\uff0c\u6700\u5c0f\u5bbd\u5ea6 1024px\u3002"));
  children.push(bullet("\u65e0\u969c\u788d\u8bbe\u8ba1\uff1a\u652f\u6301\u952e\u76d8\u5bfc\u822a\uff0c\u6240\u6709\u4ea4\u4e92\u5143\u7d20\u53ef\u901a\u8fc7 Tab \u952e\u8bbf\u95ee\u3002"));

  children.push(h2("3.4 \u517c\u5bb9\u6027"));
  children.push(bullet("\u64cd\u4f5c\u7cfb\u7edf\uff1aWindows 10 (21H2+) \u3001Windows 11\u3002"));
  children.push(bullet("\u5c4f\u5e55\u5206\u8fa8\u7387\uff1a\u652f\u6301 1366x768 \u53ca\u4ee5\u4e0a\u5206\u8fa8\u7387\u3002"));
  children.push(bullet("Excel \u517c\u5bb9\uff1a\u652f\u6301 Excel 2007 \u53ca\u4ee5\u4e0a\u7248\u672c\u751f\u6210\u7684 .xlsx/.xls \u6587\u4ef6\u3002"));

  children.push(h1("4. \u6570\u636e\u5b9e\u4f53\u5b9a\u4e49"));
  children.push(p("\u4ee5\u4e0b\u5b9a\u4e49\u4e86\u7cfb\u7edf\u4e2d\u7684\u6838\u5fc3\u6570\u636e\u5b9e\u4f53\u53ca\u5176\u5173\u952e\u5c5e\u6027\uff0c\u4e3a\u6570\u636e\u5e93\u8bbe\u8ba1\u548c API \u63a5\u53e3\u8bbe\u8ba1\u63d0\u4f9b\u57fa\u7840\u3002"));

  children.push(h2("4.1 \u9879\u76ee (Project)"));
  children.push(makeTable(
    ["\u5b57\u6bb5", "\u7c7b\u578b", "\u5fc5\u586b", "\u8bf4\u660e"],
    [
      ["id", "String (UUID)", "\u662f", "\u9879\u76ee\u552f\u4e00\u6807\u8bc6"],
      ["name", "String", "\u662f", "\u9879\u76ee\u540d\u79f0\uff0c\u6700\u5927 100 \u5b57\u7b26"],
      ["code", "String", "\u662f", "\u9879\u76ee\u7f16\u53f7\uff0c\u552f\u4e00\uff0c\u683c\u5f0f\u5982 PRJ-2024-001"],
      ["description", "String", "\u5426", "\u9879\u76ee\u63cf\u8ff0"],
      ["status", "Enum", "\u662f", "DRAFT/ACTIVE/ARCHIVED"],
      ["createdAt", "DateTime", "\u662f", "\u521b\u5efa\u65f6\u95f4"],
      ["updatedAt", "DateTime", "\u662f", "\u66f4\u65b0\u65f6\u95f4"]
    ],
    [20, 20, 10, 50]
  ));

  children.push(h2("4.2 BOM \u8282\u70b9 (BomNode)"));
  children.push(makeTable(
    ["\u5b57\u6bb5", "\u7c7b\u578b", "\u5fc5\u586b", "\u8bf4\u660e"],
    [
      ["id", "String (UUID)", "\u662f", "\u8282\u70b9\u552f\u4e00\u6807\u8bc6"],
      ["projectId", "String (UUID)", "\u662f", "\u6240\u5c5e\u9879\u76ee ID"],
      ["parentId", "String (UUID)", "\u5426", "\u7236\u8282\u70b9 ID\uff0c\u6839\u8282\u70b9\u4e3a null"],
      ["nodeType", "Enum", "\u662f", "ASSEMBLY/COMPONENT"],
      ["level", "Int", "\u662f", "\u5c42\u7ea7\u6df1\u5ea6\uff0c\u6839\u8282\u70b9\u4e3a 0"],
      ["sortOrder", "Int", "\u662f", "\u540c\u7ea7\u6392\u5e8f\u5e8f\u53f7"],
      ["componentId", "String (UUID)", "\u5426", "\u5173\u8054\u5143\u5668\u4ef6 ID\uff08\u53f6\u5b50\u8282\u70b9\uff09"],
      ["referenceDesignator", "String", "\u5426", "\u4f4d\u53f7\u6807\u8bc6\uff0c\u5982 R1\u3001C3"],
      ["quantity", "Int", "\u662f", "\u6570\u91cf\uff0c\u9ed8\u8ba4 1"],
      ["versionId", "String (UUID)", "\u662f", "\u6240\u5c5e BOM \u7248\u672c ID"]
    ],
    [22, 18, 10, 50]
  ));

  children.push(h2("4.3 \u5143\u5668\u4ef6 (Component)"));
  children.push(makeTable(
    ["\u5b57\u6bb5", "\u7c7b\u578b", "\u5fc5\u586b", "\u8bf4\u660e"],
    [
      ["id", "String (UUID)", "\u662f", "\u5143\u5668\u4ef6\u552f\u4e00\u6807\u8bc6"],
      ["partNumber", "String", "\u662f", "\u578b\u53f7\uff0c\u552f\u4e00\uff0c\u6700\u5927 50 \u5b57\u7b26"],
      ["name", "String", "\u662f", "\u5143\u5668\u4ef6\u540d\u79f0"],
      ["category", "String", "\u5426", "\u7c7b\u522b\uff0c\u5982\u7535\u963b\u3001\u7535\u5bb9\u3001IC"],
      ["package", "String", "\u5426", "\u5c01\u88c5\u89c4\u683c\uff0c\u5982 0402\u30010.5mm QFP"],
      ["manufacturer", "String", "\u5429", "\u5236\u9020\u5546"],
      ["description", "String", "\u5426", "\u63cf\u8ff0"],
      ["status", "Enum", "\u662f", "ACTIVE/EOL/PENDING/OBSOLETE"],
      ["specs", "JSON", "\u5426", "\u6280\u672f\u53c2\u6570\uff0c\u5982 {\"resistance\": \"10k\", \"tolerance\": \"1%\"}"]
    ],
    [22, 18, 10, 50]
  ));

  children.push(h2("4.4 \u66ff\u4ee3\u6599\u5173\u7cfb (AlternativePart)"));
  children.push(makeTable(
    ["\u5b57\u6bb5", "\u7c7b\u578b", "\u5fc5\u586b", "\u8bf4\u660e"],
    [
      ["id", "String (UUID)", "\u662f", "\u5173\u7cfb\u552f\u4e00\u6807\u8bc6"],
      ["primaryComponentId", "String (UUID)", "\u662f", "\u4e3b\u6599\u5143\u5668\u4ef6 ID"],
      ["alternativeComponentId", "String (UUID)", "\u662f", "\u66ff\u4ee3\u6599\u5143\u5668\u4ef6 ID"],
      ["priority", "Enum", "\u662f", "PRIMARY/SECONDARY/TEMPORARY"],
      ["status", "Enum", "\u662f", "ACTIVE/PENDING/DEPRECATED"],
      ["notes", "String", "\u5426", "\u66ff\u4ee3\u8bf4\u660e"]
    ],
    [25, 20, 10, 45]
  ));

  children.push(h2("4.5 BOM \u7248\u672c (BomVersion)"));
  children.push(makeTable(
    ["\u5b57\u6bb5", "\u7c7b\u578b", "\u5fc5\u586b", "\u8bf4\u660e"],
    [
      ["id", "String (UUID)", "\u662f", "\u7248\u672c\u552f\u4e00\u6807\u8bc6"],
      ["projectId", "String (UUID)", "\u662f", "\u6240\u5c5e\u9879\u76ee ID"],
      ["version", "String", "\u662f", "\u7248\u672c\u53f7\uff0c\u5982 v1.0\u3001v1.1"],
      ["changeSummary", "String", "\u662f", "\u53d8\u66f4\u6458\u8981\uff0c\u6700\u5c11 5 \u5b57\u7b26"],
      ["isActive", "Boolean", "\u662f", "\u662f\u5426\u4e3a\u5f53\u524d\u6d3b\u52a8\u7248\u672c"],
      ["createdBy", "String", "\u662f", "\u521b\u5efa\u4eba"],
      ["createdAt", "DateTime", "\u662f", "\u521b\u5efa\u65f6\u95f4"]
    ],
    [22, 18, 10, 50]
  ));

  children.push(h1("5. \u5168\u5c40\u4e1a\u52a1\u89c4\u5219"));
  children.push(h2("5.1 \u7248\u672c\u53f7\u89c4\u5219"));
  children.push(p("BOM \u7248\u672c\u53f7\u91c7\u7528\u8bed\u4e49\u5316\u7248\u672c\u63a7\u5236\uff0c\u683c\u5f0f\u4e3a v{Major}.{Minor}\u3002\u5176\u4e2d Major \u7248\u672c\u53f7\u5728 BOM \u7ed3\u6784\u53d1\u751f\u91cd\u5927\u53d8\u66f4\u65f6\u9012\u589e\uff08\u5982\u65b0\u589e/\u5220\u9664\u5b50\u88c5\u914d\u4f53\uff09\uff0cMinor \u7248\u672c\u53f7\u5728\u5143\u5668\u4ef6\u5c5e\u6027\u53d8\u66f4\u65f6\u9012\u589e\uff08\u5982\u4fee\u6539\u6570\u91cf\u3001\u66f4\u6362\u578b\u53f7\uff09\u3002\u7cfb\u7edf\u81ea\u52a8\u68c0\u6d4b\u53d8\u66f4\u7c7b\u578b\u5e76\u5efa\u8bae\u7248\u672c\u53f7\u9012\u589e\u65b9\u5f0f\uff0c\u7528\u6237\u53ef\u624b\u52a8\u8986\u76d6\u3002"));

  children.push(h2("5.2 \u5143\u5668\u4ef6\u72b6\u6001\u673a"));
  children.push(p("\u5143\u5668\u4ef6\u72b6\u6001\u5305\u62ec\uff1aACTIVE\uff08\u6d3b\u8dc3\uff0c\u6b63\u5e38\u4f7f\u7528\uff09\u3001EOL\uff08\u5373\u5c06\u505c\u4ea7\uff0c\u5efa\u8bae\u5bfb\u627e\u66ff\u4ee3\u6599\uff09\u3001PENDING\uff08\u5f85\u5ba1\u6279\uff0c\u65b0\u5f15\u5165\u5c1a\u672a\u786e\u8ba4\uff09\u3001OBSOLETE\uff08\u5df2\u505c\u4ea7\uff0c\u4e0d\u5f97\u65b0\u589e\u4f7f\u7528\uff09\u3002\u72b6\u6001\u53d8\u66f4\u9700\u8bb0\u5f55\u5ba1\u8ba1\u65e5\u5fd7\uff0c\u5f53\u5143\u5668\u4ef6\u72b6\u6001\u53d8\u4e3a EOL \u6216 OBSOLETE \u65f6\uff0c\u7cfb\u7edf\u81ea\u52a8\u68c0\u67e5\u5176\u5728\u6240\u6709 BOM \u4e2d\u7684\u4f7f\u7528\u60c5\u51b5\u5e76\u53d1\u51fa\u8b66\u544a\u3002"));

  children.push(h2("5.3 \u5220\u9664\u7b56\u7565"));
  children.push(p("\u7cfb\u7edf\u91c7\u7528\u8f6f\u5220\u9664\u7b56\u7565\uff0c\u6240\u6709\u5220\u9664\u64cd\u4f5c\u4ec5\u8bbe\u7f6e deletedAt \u5b57\u6bb5\uff0c\u4e0d\u7269\u7406\u5220\u9664\u6570\u636e\u3002\u5df2\u5220\u9664\u6570\u636e\u5728\u56de\u6536\u7ad9\u4e2d\u4fdd\u7559 30 \u5929\uff0c\u671f\u95f4\u53ef\u6062\u590d\u3002\u8d85\u8fc7 30 \u5929\u540e\u7cfb\u7edf\u81ea\u52a8\u6c38\u4e45\u5220\u9664\u3002\u5220\u9664\u542b\u5b50\u8282\u70b9\u7684\u7236\u8282\u70b9\u65f6\uff0c\u9700\u4e8c\u6b21\u786e\u8ba4\u5e76\u5c55\u793a\u5f71\u54cd\u8303\u56f4\uff08\u5305\u62ec\u5b50\u8282\u70b9\u6570\u91cf\u548c\u5173\u8054\u5143\u5668\u4ef6\u6570\u91cf\uff09\u3002"));

  return createDoc(
    "BOM\u7ba1\u7406\u7cfb\u7edf",
    "\u4ea7\u54c1\u9700\u6c42\u6587\u6863 (PRD)",
    ["\u7248\u672c: v1.0", "\u65e5\u671f: 2026-05-28", "\u72b6\u6001: \u5df2\u5ba1\u6279"],
    children
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT 2: TechStack
// ═══════════════════════════════════════════════════════════════

function buildTechStack() {
  const children = [];

  children.push(h1("1. \u6280\u672f\u67b6\u6784\u6982\u8ff0"));
  children.push(p("BOMMaster \u91c7\u7528\u524d\u540e\u7aef\u5206\u79bb\u7684\u684c\u9762\u5e94\u7528\u67b6\u6784\uff0c\u901a\u8fc7 Tauri v2 \u8fdb\u884c\u6574\u5408\u3002\u524d\u7aef\u57fa\u4e8e Vue 3 + TypeScript \u6784\u5efa\u7528\u6237\u754c\u9762\uff0c\u540e\u7aef\u57fa\u4e8e Tauri Rust \u5904\u7406\u672c\u5730\u6587\u4ef6\u64cd\u4f5c\u548c\u7cfb\u7edf\u8c03\u7528\uff0c\u6570\u636e\u5c42\u4f7f\u7528 SQLite + Prisma ORM\u3002\u8fd9\u79cd\u67b6\u6784\u65e2\u4fdd\u8bc1\u4e86 Web \u6280\u672f\u7684\u5f00\u53d1\u6548\u7387\uff0c\u53c8\u5229\u7528\u4e86 Rust \u7684\u9ad8\u6027\u80fd\u548c\u5b89\u5168\u6027\uff0c\u540c\u65f6 SQLite \u7684\u5355\u6587\u4ef6\u7279\u6027\u5b8c\u7f8e\u9002\u914d\u684c\u9762\u5355\u673a\u5e94\u7528\u573a\u666f\u3002"));

  children.push(h2("1.1 \u67b6\u6784\u5206\u5c42\u56fe"));
  children.push(makeTable(
    ["\u5c42\u7ea7", "\u6280\u672f", "\u804c\u8d23"],
    [
      ["\u8868\u73b0\u5c42 (UI)", "Vue 3 + Element Plus", "\u7528\u6237\u754c\u9762\u6e32\u67d3\u3001\u4ea4\u4e92\u903b\u8f91\u3001\u72b6\u6001\u7ba1\u7406"],
      ["\u901a\u4fe1\u5c42 (IPC)", "Tauri IPC Bridge", "\u524d\u540e\u7aef\u901a\u4fe1\u6865\u6881\uff0c\u5b89\u5168\u6c99\u7bb1"],
      ["\u4e1a\u52a1\u903b\u8f91\u5c42", "TypeScript Services", "BOM \u4e1a\u52a1\u89c4\u5219\u3001\u6570\u636e\u6821\u9a8c\u3001\u7248\u672c\u63a7\u5236"],
      ["\u6570\u636e\u8bbf\u95ee\u5c42", "Prisma ORM", "\u6570\u636e\u5e93\u64cd\u4f5c\u3001\u8fc1\u79fb\u7ba1\u7406\u3001\u7c7b\u578b\u5b89\u5168"],
      ["\u5b58\u50a8\u5c42", "SQLite", "\u672c\u5730\u6570\u636e\u6301\u4e45\u5316\u5b58\u50a8"],
      ["\u7cfb\u7edf\u5c42", "Tauri Rust Core", "\u6587\u4ef6\u7cfb\u7edf\u3001\u7cfb\u7edf API\u3001\u5e95\u5c42\u6027\u80fd\u64cd\u4f5c"]
    ],
    [20, 30, 50]
  ));

  children.push(h1("2. \u6280\u672f\u6808\u660e\u7ec6"));

  children.push(h2("2.1 \u6838\u5fc3\u6846\u67b6"));
  children.push(makeTable(
    ["\u5206\u7c7b", "\u6280\u672f/\u6846\u67b6", "\u7248\u672c", "\u9009\u578b\u7406\u7531"],
    [
      ["\u684c\u9762\u5bb9\u5668", "Tauri", "v2.x", "\u6bd4 Electron \u66f4\u8f7b\u91cf\uff0c\u6253\u5305\u4f53\u79ef\u5c0f\uff08~10MB\uff09\uff0c\u5e95\u5c42 Rust \u6027\u80fd\u6781\u9ad8\uff0c\u9002\u5408\u672c\u5730\u6587\u4ef6\u64cd\u4f5c"],
      ["\u524d\u7aef\u6846\u67b6", "Vue 3", "v3.4+", "\u7ec4\u5408\u5f0f API \u903b\u8f91\u590d\u7528\u6027\u5f3a\uff0c\u751f\u6001\u5b8c\u5584\uff0c\u793e\u533a\u6d3b\u8dc3"],
      ["UI\u7ec4\u4ef6\u5e93", "Element Plus", "v2.x", "\u63d0\u4f9b\u6210\u719f\u7684 Table\u3001Tree\u3001Dialog \u7ec4\u4ef6\uff0c\u9002\u5408\u540e\u53f0\u7ba1\u7406\u7c7b\u754c\u9762"],
      ["\u5f00\u53d1\u8bed\u8a00", "TypeScript", "v5.x", "\u5f3a\u7c7b\u578b\u68c0\u67e5\uff0c\u51cf\u5c11\u8fd0\u884c\u65f6\u9519\u8bef\uff0c\u63d0\u5347\u4ee3\u7801\u53ef\u7ef4\u62a4\u6027"],
      ["\u6784\u5efa\u5de5\u5177", "Vite", "v5.x", "\u6781\u901f\u7684\u70ed\u66f4\u65b0 (HMR)\uff0c\u63d0\u5347\u5f00\u53d1\u4f53\u9a8c"],
      ["\u672c\u5730\u6570\u636e\u5e93", "SQLite", "v3.x", "\u5355\u6587\u4ef6\u3001\u96f6\u914d\u7f6e\u3001\u9ad8\u6027\u80fd\u5173\u7cfb\u578b\u6570\u636e\u5e93\uff0c\u5b8c\u7f8e\u9002\u914d\u684c\u9762\u5355\u673a\u5e94\u7528"],
      ["ORM\u5de5\u5177", "Prisma", "v5.x", "\u7c7b\u578b\u5b89\u5168\u7684\u6570\u636e\u5e93\u64cd\u4f5c\uff0c\u65e0\u9700\u624b\u5199 SQL\uff0c\u8fc1\u79fb\u7ba1\u7406\u65b9\u4fbf"]
    ],
    [15, 18, 10, 57]
  ));

  children.push(h2("2.2 \u72b6\u6001\u7ba1\u7406"));
  children.push(makeTable(
    ["\u5206\u7c7b", "\u6280\u672f/\u6846\u67b6", "\u7248\u672c", "\u9009\u578b\u7406\u7531"],
    [
      ["\u5168\u5c40\u72b6\u6001\u7ba1\u7406", "Pinia", "v2.x", "Vue 3 \u5b98\u65b9\u63a8\u8350\u72b6\u6001\u7ba1\u7406\uff0c\u652f\u6301 TypeScript\uff0c\u6a21\u5757\u5316\u8bbe\u8ba1"],
      ["\u7ec4\u5408\u5f0f\u51fd\u6570", "VueUse", "v10.x", "\u63d0\u4f9b\u5e38\u7528\u7ec4\u5408\u5f0f\u5de5\u5177\u51fd\u6570\uff0c\u51cf\u5c11\u91cd\u590d\u4ee3\u7801"]
    ],
    [20, 18, 10, 52]
  ));

  children.push(h2("2.3 \u6587\u4ef6\u5904\u7406"));
  children.push(makeTable(
    ["\u5206\u7c7b", "\u6280\u672f/\u6846\u67b6", "\u7248\u672c", "\u9009\u578b\u7406\u7531"],
    [
      ["Excel \u89e3\u6790", "ExcelJS", "v4.x", "\u7eaf JavaScript \u5b9e\u73b0\uff0c\u652f\u6301\u8bfb\u5199 .xlsx\uff0c\u65e0\u9700\u7cfb\u7edf\u4f9d\u8d56\uff0c\u9002\u5408 Tauri \u73af\u5883"],
      ["Excel \u5bfc\u51fa", "ExcelJS", "v4.x", "\u540c\u4e0a\uff0c\u652f\u6301\u6837\u5f0f\u3001\u5408\u5e76\u5355\u5143\u683c\u7b49\u9ad8\u7ea7\u529f\u80fd"],
      ["\u6587\u4ef6\u7cfb\u7edf\u8bbf\u95ee", "Tauri FS API", "v2.x", "\u901a\u8fc7 Tauri \u5b89\u5168\u6c99\u7bb1\u8bbf\u95ee\u672c\u5730\u6587\u4ef6\uff0c\u907f\u514d\u76f4\u63a5 Node.js fs"]
    ],
    [20, 18, 10, 52]
  ));

  children.push(h2("2.4 \u56fe\u8868\u4e0e\u53ef\u89c6\u5316"));
  children.push(makeTable(
    ["\u5206\u7c7b", "\u6280\u672f/\u6846\u67b6", "\u7248\u672c", "\u9009\u578b\u7406\u7531"],
    [
      ["BOM \u6811\u53ef\u89c6\u5316", "vue3-tree-org", "v2.x", "\u652f\u6301 Vue 3 \u7684\u7ec4\u7ec7\u67b6\u6784\u56fe\u7ec4\u4ef6\uff0c\u652f\u6301\u62d6\u62fd\u3001\u81ea\u5b9a\u4e49\u8282\u70b9"],
      ["\u66ff\u4ee3\u6599\u5173\u7cfb\u56fe", "ECharts", "v5.x", "\u529f\u80fd\u5f3a\u5927\u7684\u56fe\u8868\u5e93\uff0c\u652f\u6301\u5173\u7cfb\u56fe\u3001\u56fe\u8c31\u53ef\u89c6\u5316"],
      ["\u7edf\u8ba1\u56fe\u8868", "ECharts", "v5.x", "\u652f\u6301\u997c\u56fe\u3001\u67f1\u72b6\u56fe\u3001\u6298\u7ebf\u56fe\u7b49\u5e38\u89c1\u56fe\u8868\u7c7b\u578b"]
    ],
    [20, 18, 10, 52]
  ));

  children.push(h2("2.5 \u5de5\u5177\u5e93"));
  children.push(makeTable(
    ["\u5206\u7c7b", "\u6280\u672f/\u6846\u67b6", "\u7248\u672c", "\u9009\u578b\u7406\u7531"],
    [
      ["HTTP \u5ba2\u6237\u7aef", "axios", "v1.x", "\u7528\u4e8e\u672a\u6765\u53ef\u80fd\u7684\u4e91\u7aef\u540c\u6b65\u529f\u80fd\uff0c\u62e6\u622a\u5668\u652f\u6301"],
      ["\u65e5\u671f\u5904\u7406", "dayjs", "v1.x", "\u8f7b\u91cf\u7ea7\u65e5\u671f\u5e93\uff0c\u652f\u6301\u63d2\u4ef6\u6269\u5c55"],
      ["\u5de5\u5177\u51fd\u6570", "lodash-es", "v4.x", "ES Module \u7248\u672c\uff0c\u652f\u6301 Tree Shaking\uff0c\u51cf\u5c11\u6253\u5305\u4f53\u79ef"],
      ["\u56fd\u9645\u5316", "vue-i18n", "v9.x", "Vue 3 \u5b98\u65b9\u56fd\u9645\u5316\u63d2\u4ef6\uff0c\u9884\u7559\u591a\u8bed\u8a00\u652f\u6301\u63a5\u53e3"],
      ["\u6570\u636e\u6821\u9a8c", "zod", "v3.x", "TypeScript \u4f18\u5148\u7684\u6570\u636e\u6821\u9a8c\u5e93\uff0c\u4e0e Prisma \u7c7b\u578b\u5b8c\u7f8e\u914d\u5408"]
    ],
    [20, 18, 10, 52]
  ));

  children.push(h2("2.6 \u6d4b\u8bd5\u6846\u67b6"));
  children.push(makeTable(
    ["\u5206\u7c7b", "\u6280\u672f/\u6846\u67b6", "\u7248\u672c", "\u9009\u578b\u7406\u7531"],
    [
      ["\u5355\u5143\u6d4b\u8bd5", "Vitest", "v1.x", "Vite \u539f\u751f\u6d4b\u8bd5\u6846\u67b6\uff0c\u901f\u5ea6\u5feb\uff0c\u914d\u7f6e\u7b80\u5355"],
      ["\u7ec4\u4ef6\u6d4b\u8bd5", "Vue Test Utils", "v2.x", "Vue \u5b98\u65b9\u7ec4\u4ef6\u6d4b\u8bd5\u5de5\u5177"],
      ["E2E \u6d4b\u8bd5", "Playwright", "v1.x", "\u8de8\u6d4f\u89c8\u5668\u652f\u6301\uff0c\u9002\u5408\u684c\u9762\u5e94\u7528\u6d4b\u8bd5"],
      ["\u4ee3\u7801\u8986\u76d6\u7387", "c8", "v8.x", "V8 \u539f\u751f\u8986\u76d6\u7387\u5de5\u5177\uff0c\u901f\u5ea6\u5feb"]
    ],
    [20, 18, 10, 52]
  ));

  children.push(h2("2.7 \u4ee3\u7801\u8d28\u91cf"));
  children.push(makeTable(
    ["\u5206\u7c7b", "\u6280\u672f/\u6846\u67b6", "\u7248\u672c", "\u9009\u578b\u7406\u7531"],
    [
      ["\u4ee3\u7801\u68c0\u67e5", "ESLint", "v8.x", "\u5f3a\u5236\u4ee3\u7801\u98ce\u683c\u4e00\u81f4\u6027"],
      ["\u4ee3\u7801\u683c\u5f0f\u5316", "Prettier", "v3.x", "\u81ea\u52a8\u683c\u5f0f\u5316\uff0c\u51cf\u5c11\u4ee3\u7801\u5ba1\u67e5\u8d1f\u62c5"],
      ["Git Hooks", "husky + lint-staged", "\u6700\u65b0", "\u63d0\u4ea4\u524d\u81ea\u52a8\u68c0\u67e5\uff0c\u4fdd\u8bc1\u4ee3\u7801\u8d28\u91cf"],
      ["\u63d0\u4ea4\u89c4\u8303", "commitlint", "\u6700\u65b0", "\u5f3a\u5236 Angular \u89c4\u8303\u63d0\u4ea4\u4fe1\u606f"]
    ],
    [20, 18, 10, 52]
  ));

  children.push(h1("3. \u73af\u5883\u8981\u6c42"));
  children.push(makeTable(
    ["\u73af\u5883", "\u8981\u6c42", "\u5907\u6ce8"],
    [
      ["Node.js", ">= 18.x", "\u63a8\u8350 LTS \u7248\u672c"],
      ["Rust", ">= 1.70", "Tauri v2 \u7f16\u8bd1\u9700\u8981"],
      ["Windows SDK", "Windows 10/11 SDK", "Tauri \u7f16\u8bd1\u4f9d\u8d56"],
      ["\u5305\u7ba1\u7406\u5668", "pnpm >= 8.x", "\u63a8\u8350\u4f7f\u7528 pnpm\uff0c\u78c1\u76d8\u5360\u7528\u5c0f"],
      ["IDE", "VS Code + Volar", "\u5b98\u65b9\u63a8\u8350 Vue 3 \u5f00\u53d1\u73af\u5883"]
    ],
    [25, 35, 40]
  ));

  children.push(h1("4. \u9879\u76ee\u76ee\u5f55\u7ed3\u6784"));
  children.push(p("\u4ee5\u4e0b\u4e3a\u63a8\u8350\u7684\u9879\u76ee\u76ee\u5f55\u7ed3\u6784\uff0cAI Agent \u5e94\u4e25\u683c\u6309\u7167\u6b64\u7ed3\u6784\u751f\u6210\u4ee3\u7801\uff1a"));
  children.push(makeTable(
    ["\u76ee\u5f55/\u6587\u4ef6", "\u8bf4\u660e"],
    [
      ["src-tauri/", "Tauri Rust \u540e\u7aef\u4ee3\u7801"],
      ["src-tauri/src/main.rs", "\u5e94\u7528\u5165\u53e3"],
      ["src-tauri/src/commands/", "Tauri IPC \u547d\u4ee4\u5904\u7406"],
      ["src-tauri/src/db/", "\u6570\u636e\u5e93\u521d\u59cb\u5316\u4e0e\u8fc1\u79fb"],
      ["src/", "Vue 3 \u524d\u7aef\u4ee3\u7801"],
      ["src/views/", "\u9875\u9762\u7ec4\u4ef6\uff08ProjectList\u3001BomEditor\u3001ComponentDetail \u7b49\uff09"],
      ["src/components/", "\u901a\u7528\u7ec4\u4ef6\uff08BomTree\u3001FieldMapper\u3001VersionDiff \u7b49\uff09"],
      ["src/composables/", "\u7ec4\u5408\u5f0f\u51fd\u6570\uff08useBom\u3001useProject\u3001useImport \u7b49\uff09"],
      ["src/stores/", "Pinia \u72b6\u6001\u5e93\uff08projectStore\u3001bomStore\u3001componentStore\uff09"],
      ["src/services/", "\u4e1a\u52a1\u903b\u8f91\u5c42\uff08bom.service\u3001project.service\u3001import.service\uff09"],
      ["src/types/", "TypeScript \u7c7b\u578b\u5b9a\u4e49"],
      ["src/utils/", "\u5de5\u5177\u51fd\u6570\uff08format\u3001validator\u3001excelHelper\uff09"],
      ["src/assets/", "\u9759\u6001\u8d44\u6e90\uff08\u56fe\u7247\u3001\u6837\u5f0f\uff09"],
      ["prisma/", "Prisma schema \u548c\u8fc1\u79fb\u6587\u4ef6"],
      ["prisma/schema.prisma", "\u6570\u636e\u5e93\u6a21\u578b\u5b9a\u4e49"],
      ["prisma/seed.ts", "\u79cd\u5b50\u6570\u636e"],
      ["tests/", "\u6d4b\u8bd5\u6587\u4ef6"],
      ["tests/unit/", "\u5355\u5143\u6d4b\u8bd5"],
      ["tests/e2e/", "E2E \u6d4b\u8bd5"]
    ],
    [40, 60]
  ));

  children.push(h1("5. \u5173\u952e\u6280\u672f\u51b3\u7b56"));
  children.push(h2("5.1 \u524d\u540e\u7aef\u901a\u4fe1\u673a\u5236"));
  children.push(p("Tauri v2 \u91c7\u7528 IPC\uff08\u8fdb\u7a0b\u95f4\u901a\u4fe1\uff09\u673a\u5236\u5b9e\u73b0\u524d\u540e\u7aef\u901a\u4fe1\u3002\u524d\u7aef\u901a\u8fc7 @tauri-apps/api \u7684 invoke \u65b9\u6cd5\u8c03\u7528\u540e\u7aef Rust \u547d\u4ee4\uff0c\u540e\u7aef\u901a\u8fc7 tauri::command \u5b8f\u5b9a\u4e49\u53ef\u88ab\u8c03\u7528\u7684\u547d\u4ee4\u3002\u6240\u6709\u6570\u636e\u4f20\u9012\u5747\u901a\u8fc7 JSON \u5e8f\u5217\u5316/\u53cd\u5e8f\u5217\u5316\uff0c\u5fc5\u987b\u5728\u4e24\u7aef\u5b9a\u4e49\u4e00\u81f4\u7684 TypeScript/Rust \u7c7b\u578b\u3002\u7981\u6b62\u524d\u7aef\u76f4\u63a5\u8bbf\u95ee\u6587\u4ef6\u7cfb\u7edf\u6216\u6570\u636e\u5e93\uff0c\u5fc5\u987b\u901a\u8fc7 IPC \u547d\u4ee4\u95f4\u63a5\u8bbf\u95ee\u3002"));

  children.push(h2("5.2 \u6570\u636e\u5e93\u8bbf\u95ee\u7b56\u7565"));
  children.push(p("Prisma \u4f5c\u4e3a ORM \u5c42\u8fd0\u884c\u5728 Node.js \u4fa7\uff08\u901a\u8fc7 Tauri \u7684 sidecar \u6216\u5185\u5d4c Node.js \u8fd0\u884c\u65f6\uff09\uff0c\u6240\u6709\u6570\u636e\u5e93\u64cd\u4f5c\u901a\u8fc7 Prisma Client \u8fdb\u884c\u3002\u7981\u6b62\u5728\u4e1a\u52a1\u4ee3\u7801\u4e2d\u76f4\u63a5\u4f7f\u7528\u539f\u59cb SQL\uff0c\u5fc5\u987b\u901a\u8fc7 Prisma \u7684\u67e5\u8be2 API\u3002\u6570\u636e\u5e93\u8fc1\u79fb\u4f7f\u7528 Prisma Migrate \u7ba1\u7406\uff0c\u6bcf\u6b21 schema \u53d8\u66f4\u5747\u9700\u751f\u6210\u8fc1\u79fb\u6587\u4ef6\u3002"));

  children.push(h2("5.3 \u5927\u6587\u4ef6\u5904\u7406\u7b56\u7565"));
  children.push(p("Excel \u6587\u4ef6\u89e3\u6790\u91c7\u7528\u6d41\u5f0f\u5904\u7406\u7b56\u7565\uff0c\u907f\u514d\u5c06\u6574\u4e2a\u6587\u4ef6\u52a0\u8f7d\u5230\u5185\u5b58\u3002\u5bf9\u4e8e\u8d85\u8fc7 10,000 \u884c\u7684\u6587\u4ef6\uff0c\u91c7\u7528\u5206\u6279\u8bfb\u53d6\u548c\u5199\u5165\u7b56\u7565\uff0c\u6bcf\u6279 1000 \u884c\u8fdb\u884c\u4e00\u6b21\u6570\u636e\u5e93\u5199\u5165\uff0c\u5e76\u5728 UI \u4e0a\u5b9e\u65f6\u66f4\u65b0\u8fdb\u5ea6\u3002\u8d85\u5927\u6587\u4ef6\u7684\u89e3\u6790\u4efb\u52a1\u5e94\u5728 Rust \u4fa7\u6267\u884c\uff0c\u5229\u7528 Rust \u7684\u9ad8\u6027\u80fd\u7279\u6027\u5904\u7406\u6570\u636e\u5bc6\u96c6\u578b\u64cd\u4f5c\u3002"));

  return createDoc(
    "BOM\u7ba1\u7406\u7cfb\u7edf",
    "\u6280\u672f\u6808\u9009\u578b\u6587\u6863",
    ["\u7248\u672c: v1.0", "\u65e5\u671f: 2026-05-28"],
    children
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT 3: Architecture
// ═══════════════════════════════════════════════════════════════

function buildArchitecture() {
  const children = [];

  children.push(h1("1. \u67b6\u6784\u539f\u5219"));
  children.push(p("\u672c\u7cfb\u7edf\u9075\u5faa\u4ee5\u4e0b\u6838\u5fc3\u67b6\u6784\u539f\u5219\uff0c\u6240\u6709\u4ee3\u7801\u751f\u6210\u5fc5\u987b\u4e25\u683c\u9075\u5b88\uff1a"));
  children.push(bullet("\u4e25\u683c\u5206\u5c42\uff1a\u8868\u73b0\u5c42(UI)\u3001\u4e1a\u52a1\u903b\u8f91\u5c42(Service)\u3001\u6570\u636e\u8bbf\u95ee\u5c42(DAL)\u4e25\u7981\u8de8\u5c42\u8c03\u7528\u3002\u8868\u73b0\u5c42\u53ea\u80fd\u8c03\u7528 Service \u5c42\uff0cService \u5c42\u53ea\u80fd\u8c03\u7528 DAL \u5c42\uff0c\u4e0d\u5f97\u8df3\u5c42\u3002"));
  children.push(bullet("\u9ad8\u5185\u805a\u4f4e\u8026\u5408\uff1a\u6a21\u5757\u95f4\u901a\u8fc7\u63a5\u53e3/\u4e8b\u4ef6\u901a\u4fe1\uff0c\u907f\u514d\u76f4\u63a5\u4f9d\u8d56\u5177\u4f53\u5b9e\u73b0\u3002\u6bcf\u4e2a\u6a21\u5757\u5e94\u53ef\u72ec\u7acb\u6d4b\u8bd5\u3001\u72ec\u7acb\u66ff\u6362\u3002"));
  children.push(bullet("\u5355\u5411\u6570\u636e\u6d41\uff1a\u6570\u636e\u4ece DAL \u2192 Service \u2192 UI \u5355\u5411\u6d41\u52a8\uff0c\u4e0a\u5c42\u4e0d\u5e94\u76f4\u63a5\u4fee\u6539\u4e0b\u5c42\u6570\u636e\uff0c\u800c\u662f\u901a\u8fc7\u63a5\u53e3\u89e6\u53d1\u53d8\u66f4\u3002"));
  children.push(bullet("\u5173\u6ce8\u70b9\u5206\u79bb\uff1a\u4e1a\u52a1\u903b\u8f91\u4e0e\u6280\u672f\u5b9e\u73b0\u5206\u79bb\uff0c\u5982\u6570\u636e\u6821\u9a8c\u4e0e\u6570\u636e\u5e93\u64cd\u4f5c\u5206\u5f00\u3001UI \u7ec4\u4ef6\u4e0e\u4e1a\u52a1\u903b\u8f91\u5206\u5f00\u3002"));

  children.push(h1("2. \u7cfb\u7edf\u5206\u5c42\u67b6\u6784"));
  children.push(h2("2.1 \u5206\u5c42\u8be6\u89e3"));
  children.push(makeTable(
    ["\u5c42\u7ea7", "\u804c\u8d23", "\u6838\u5fc3\u7ec4\u4ef6", "\u5141\u8bb8\u8c03\u7528"],
    [
      ["\u8868\u73b0\u5c42 (UI Layer)", "\u7528\u6237\u754c\u9762\u6e32\u67d3\u3001\u7528\u6237\u4ea4\u4e92\u3001\u72b6\u6001\u5c55\u793a", "Vue Components + Pinia Stores", "\u53ea\u80fd\u8c03\u7528 Service \u5c42"],
      ["\u4e1a\u52a1\u903b\u8f91\u5c42 (Service Layer)", "\u4e1a\u52a1\u89c4\u5219\u6267\u884c\u3001\u6570\u636e\u6821\u9a8c\u3001\u6d41\u7a0b\u63a7\u5236", "TypeScript Service Classes", "\u53ea\u80fd\u8c03\u7528 DAL \u5c42\u548c IPC \u5c42"],
      ["\u901a\u4fe1\u5c42 (IPC Layer)", "\u524d\u540e\u7aef\u901a\u4fe1\u6865\u6881\u3001\u5b89\u5168\u6c99\u7bb1", "Tauri IPC Commands", "\u53cc\u5411\u8f6c\u53d1 Service \u5c42\u8c03\u7528"],
      ["\u6570\u636e\u8bbf\u95ee\u5c42 (DAL Layer)", "\u6570\u636e\u5e93 CRUD\u3001\u67e5\u8be2\u6784\u5efa\u3001\u4e8b\u52a1\u7ba1\u7406", "Prisma Client + Repositories", "\u53ea\u80fd\u8bbf\u95ee SQLite"],
      ["\u7cfb\u7edf\u5c42 (System Layer)", "\u6587\u4ef6\u7cfb\u7edf\u3001\u7cfb\u7edf API\u3001\u5e95\u5c42\u64cd\u4f5c", "Tauri Rust Core", "\u64cd\u4f5c\u7cfb\u7edf\u7ea7\u8d44\u6e90"]
    ],
    [18, 25, 25, 32]
  ));

  children.push(h2("2.2 \u5c42\u95f4\u8c03\u7528\u89c4\u5219"));
  children.push(p("\u4e25\u683c\u7981\u6b62\u4ee5\u4e0b\u8c03\u7528\u5173\u7cfb\uff0c\u8fdd\u53cd\u5c06\u88ab\u89c6\u4e3a\u67b6\u6784\u7ea2\u7ebf\uff1a"));
  children.push(bullet("UI \u5c42\u76f4\u63a5\u8c03\u7528 Prisma Client\uff08\u5fc5\u987b\u901a\u8fc7 Service \u5c42\u5c01\u88c5\uff09"));
  children.push(bullet("UI \u5c42\u76f4\u63a5\u8c03\u7528 Tauri IPC \u547d\u4ee4\uff08\u5fc5\u987b\u901a\u8fc7 Service \u5c42\u5c01\u88c5\uff09"));
  children.push(bullet("Service \u5c42\u76f4\u63a5\u64cd\u4f5c DOM\uff08\u5fc5\u987b\u901a\u8fc7 Pinia Store \u89e6\u53d1 UI \u66f4\u65b0\uff09"));
  children.push(bullet("DAL \u5c42\u5305\u542b\u4e1a\u52a1\u903b\u8f91\uff08\u5982\u7248\u672c\u53f7\u751f\u6210\u3001\u72b6\u6001\u6821\u9a8c\uff09"));

  children.push(h1("3. \u6a21\u5757\u5212\u5206"));
  children.push(h2("3.1 \u6838\u5fc3\u6a21\u5757"));
  children.push(makeTable(
    ["\u6a21\u5757\u540d\u79f0", "\u804c\u8d23", "\u5bf9\u5e94 Service", "\u5bf9\u5e94 Store"],
    [
      ["\u9879\u76ee\u7ba1\u7406\u6a21\u5757", "\u9879\u76ee\u7684 CRUD\u3001\u72b6\u6001\u6d41\u8f6c\u3001\u7edf\u8ba1\u4fe1\u606f", "ProjectService", "useProjectStore"],
      ["BOM \u7f16\u8f91\u6a21\u5757", "BOM \u6811\u7684\u521b\u5efa\u3001\u7f16\u8f91\u3001\u5220\u9664\u3001\u6392\u5e8f", "BomService", "useBomStore"],
      ["\u7248\u672c\u7ba1\u7406\u6a21\u5757", "\u7248\u672c\u521b\u5efa\u3001\u5bf9\u6bd4\u3001\u56de\u6eda\u3001\u5386\u53f2\u67e5\u8be2", "VersionService", "useVersionStore"],
      ["\u5143\u5668\u4ef6\u7ba1\u7406\u6a21\u5757", "\u5143\u5668\u4ef6\u7684 CRUD\u3001\u72b6\u6001\u7ba1\u7406\u3001\u641c\u7d22", "ComponentService", "useComponentStore"],
      ["\u66ff\u4ee3\u6599\u7ba1\u7406\u6a21\u5757", "\u66ff\u4ee3\u5173\u7cfb\u7684\u5efa\u7acb\u3001\u67e5\u8be2\u3001\u72b6\u6001\u66f4\u65b0", "AlternativeService", "useAlternativeStore"],
      ["\u5bfc\u5165\u5bfc\u51fa\u6a21\u5757", "Excel \u5bfc\u5165\u3001\u5bfc\u51fa\u3001\u5b57\u6bb5\u6620\u5c04", "ImportExportService", "useImportStore"],
      ["\u5ba1\u6279\u6d41\u7a0b\u6a21\u5757", "ECN \u7533\u8bf7\u3001\u5ba1\u6279\u3001\u901a\u77e5", "ApprovalService", "useApprovalStore"]
    ],
    [18, 25, 25, 32]
  ));

  children.push(h2("3.2 \u6a21\u5757\u95f4\u4f9d\u8d56\u5173\u7cfb"));
  children.push(p("\u6a21\u5757\u95f4\u4f9d\u8d56\u9075\u5faa\u5355\u5411\u539f\u5219\uff0c\u4e0a\u5c42\u6a21\u5757\u53ef\u4f9d\u8d56\u4e0b\u5c42\u6a21\u5757\uff0c\u7981\u6b62\u5faa\u73af\u4f9d\u8d56\u3002\u5177\u4f53\u4f9d\u8d56\u5173\u7cfb\u5982\u4e0b\uff1a"));
  children.push(bullet("BOM \u7f16\u8f91\u6a21\u5757 \u2192 \u9879\u76ee\u7ba1\u7406\u6a21\u5757\uff08\u83b7\u53d6\u9879\u76ee\u4fe1\u606f\uff09\u3001\u5143\u5668\u4ef6\u7ba1\u7406\u6a21\u5757\uff08\u83b7\u53d6\u5143\u5668\u4ef6\u4fe1\u606f\uff09\u3001\u7248\u672c\u7ba1\u7406\u6a21\u5757\uff08\u81ea\u52a8\u521b\u5efa\u7248\u672c\uff09"));
  children.push(bullet("\u7248\u672c\u7ba1\u7406\u6a21\u5757 \u2192 BOM \u7f16\u8f91\u6a21\u5757\uff08\u83b7\u53d6\u7248\u672c\u5bf9\u5e94\u7684 BOM \u6570\u636e\uff09"));
  children.push(bullet("\u66ff\u4ee3\u6599\u7ba1\u7406\u6a21\u5757 \u2192 \u5143\u5668\u4ef6\u7ba1\u7406\u6a21\u5757\uff08\u83b7\u53d6\u5143\u5668\u4ef6\u4fe1\u606f\uff09"));
  children.push(bullet("\u5bfc\u5165\u5bfc\u51fa\u6a21\u5757 \u2192 BOM \u7f16\u8f91\u6a21\u5757\uff08\u5199\u5165\u5bfc\u5165\u6570\u636e\uff09\u3001\u5143\u5668\u4ef6\u7ba1\u7406\u6a21\u5757\uff08\u521b\u5efa\u5143\u5668\u4ef6\uff09"));
  children.push(bullet("\u5ba1\u6279\u6d41\u7a0b\u6a21\u5757 \u2192 \u7248\u672c\u7ba1\u7406\u6a21\u5757\uff08\u5ba1\u6279\u901a\u8fc7\u540e\u751f\u6210\u65b0\u7248\u672c\uff09"));

  children.push(h1("4. \u6570\u636e\u6d41\u8bbe\u8ba1"));
  children.push(h2("4.1 BOM \u7f16\u8f91\u6570\u636e\u6d41"));
  children.push(p("\u7528\u6237\u5728 UI \u5c42\u89e6\u53d1\u64cd\u4f5c\uff08\u5982\u6dfb\u52a0\u8282\u70b9\uff09\u2192 UI \u5c42\u8c03\u7528 Service \u5c42\u7684\u5bf9\u5e94\u65b9\u6cd5\uff08\u5982 BomService.addNode()\uff09\u2192 Service \u5c42\u6267\u884c\u4e1a\u52a1\u6821\u9a8c\uff08\u5c42\u7ea7\u6df1\u5ea6\u68c0\u67e5\u3001\u91cd\u590d\u68c0\u67e5\uff09\u2192 Service \u5c42\u8c03\u7528 DAL \u5c42\u5199\u5165\u6570\u636e\u5e93\u2192 Service \u5c42\u901a\u77e5 VersionService \u521b\u5efa\u65b0\u7248\u672c\u2192 Service \u5c42\u66f4\u65b0 Pinia Store \u2192 UI \u5c42\u54cd\u5e94\u5f0f\u66f4\u65b0\u3002"));

  children.push(h2("4.2 Excel \u5bfc\u5165\u6570\u636e\u6d41"));
  children.push(p("\u7528\u6237\u4e0a\u4f20\u6587\u4ef6 \u2192 UI \u5c42\u8c03\u7528 Tauri IPC \u547d\u4ee4\u8bfb\u53d6\u6587\u4ef6 \u2192 Rust \u4fa7\u8fd4\u56de\u6587\u4ef6\u8def\u5f84 \u2192 UI \u5c42\u8c03\u7528 ImportExportService.parseExcel() \u2192 Service \u5c42\u4f7f\u7528 ExcelJS \u89e3\u6790\u6587\u4ef6 \u2192 \u8fd4\u56de\u89e3\u6790\u7ed3\u679c\u5230 UI \u5c42\u5c55\u793a\u5b57\u6bb5\u6620\u5c04\u754c\u9762 \u2192 \u7528\u6237\u786e\u8ba4\u6620\u5c04 \u2192 ImportExportService.executeImport() \u5206\u6279\u5199\u5165\u6570\u636e\u5e93 \u2192 \u5b9e\u65f6\u66f4\u65b0\u8fdb\u5ea6\u3002"));

  children.push(h1("5. Tauri IPC \u67b6\u6784"));
  children.push(h2("5.1 IPC \u547d\u4ee4\u5b9a\u4e49\u89c4\u8303"));
  children.push(p("\u6240\u6709 Tauri IPC \u547d\u4ee4\u9075\u5faa\u7edf\u4e00\u7684\u547d\u540d\u548c\u53c2\u6570\u89c4\u8303\uff0c\u786e\u4fdd\u524d\u540e\u7aef\u63a5\u53e3\u4e00\u81f4\u6027\uff1a"));
  children.push(bullet("\u547d\u4ee4\u547d\u540d\uff1a\u91c7\u7528 plugin:module:action \u683c\u5f0f\uff0c\u5982 plugin:fs:read_file\u3001plugin:bom:import_excel"));
  children.push(bullet("\u53c2\u6570\u4f20\u9012\uff1a\u6240\u6709\u53c2\u6570\u5fc5\u987b\u901a\u8fc7\u5f3a\u7c7b\u578b\u7684 TypeScript \u63a5\u53e3\u5b9a\u4e49\uff0cRust \u4fa7\u4f7f\u7528 serde \u53cd\u5e8f\u5217\u5316\u3002"));
  children.push(bullet("\u8fd4\u56de\u503c\uff1a\u7edf\u4e00\u4f7f\u7528 Result<T, AppError> \u7c7b\u578b\uff0c\u6210\u529f\u8fd4\u56de\u6570\u636e\uff0c\u5931\u8d25\u8fd4\u56de\u7ed3\u6784\u5316\u9519\u8bef\u4fe1\u606f\u3002"));

  children.push(h2("5.2 \u5df2\u5b9a\u4e49\u7684 IPC \u547d\u4ee4"));
  children.push(makeTable(
    ["\u547d\u4ee4\u540d", "\u53c2\u6570", "\u8fd4\u56de\u503c", "\u8bf4\u660e"],
    [
      ["plugin:fs:read_file", "{ path: string }", "Result<Uint8Array>", "\u8bfb\u53d6\u672c\u5730\u6587\u4ef6"],
      ["plugin:fs:write_file", "{ path: string, data: Uint8Array }", "Result<void>", "\u5199\u5165\u672c\u5730\u6587\u4ef6"],
      ["plugin:fs:pick_file", "{ filters: FileFilter[] }", "Result<string[]>", "\u6253\u5f00\u6587\u4ef6\u9009\u62e9\u5bf9\u8bdd\u6846"],
      ["plugin:fs:pick_save", "{ defaultPath: string }", "Result<string>", "\u6253\u5f00\u4fdd\u5b58\u5bf9\u8bdd\u6846"],
      ["plugin:bom:import_excel", "{ filePath: string, mapping: FieldMapping }", "Result<ImportResult>", "\u5bfc\u5165 Excel BOM"],
      ["plugin:bom:export_excel", "{ bomId: string, template: string }", "Result<string>", "\u5bfc\u51fa BOM \u4e3a Excel"],
      ["plugin:db:backup", "{}", "Result<string>", "\u624b\u52a8\u89e6\u53d1\u6570\u636e\u5e93\u5907\u4efd"],
      ["plugin:db:restore", "{ backupPath: string }", "Result<void>", "\u4ece\u5907\u4efd\u6062\u590d\u6570\u636e\u5e93"]
    ],
    [25, 30, 20, 25]
  ));

  children.push(h1("6. \u72b6\u6001\u7ba1\u7406\u67b6\u6784"));
  children.push(h2("6.1 Pinia Store \u8bbe\u8ba1\u539f\u5219"));
  children.push(bullet("\u6bcf\u4e2a\u6838\u5fc3\u6a21\u5757\u5bf9\u5e94\u4e00\u4e2a Pinia Store\uff0c\u5b58\u50a8\u8be5\u6a21\u5757\u7684\u72b6\u6001\u548c\u64cd\u4f5c\u3002"));
  children.push(bullet("Store \u4e2d\u7981\u6b62\u76f4\u63a5\u8c03\u7528 Prisma \u6216 IPC\uff0c\u5fc5\u987b\u901a\u8fc7 Service \u5c42\u95f4\u63a5\u8c03\u7528\u3002"));
  children.push(bullet("Store \u53ea\u5b58\u50a8 UI \u72b6\u6001\uff08\u5f53\u524d\u9009\u4e2d\u9879\u76ee\u3001\u5c55\u5f00\u7684\u8282\u70b9\u7b49\uff09\uff0c\u4e0d\u5b58\u50a8\u4e1a\u52a1\u903b\u8f91\u3002"));
  children.push(bullet("\u5f02\u6b65\u64cd\u4f5c\u4f7f\u7528 async action\uff0c\u52a0\u8f7d\u72b6\u6001\u4f7f\u7528 loading/error \u53cc\u5b57\u6bb5\u6a21\u5f0f\u3002"));

  children.push(h2("6.2 Store \u5217\u8868"));
  children.push(makeTable(
    ["Store \u540d\u79f0", "\u6838\u5fc3 State", "\u6838\u5fc3 Actions"],
    [
      ["useProjectStore", "projects[], currentProject, loading, error", "fetchProjects, createProject, updateProject, deleteProject"],
      ["useBomStore", "bomTree, selectedNode, expandedKeys, loading", "loadBomTree, addNode, updateNode, deleteNode, moveNode"],
      ["useVersionStore", "versions[], currentVersion, diffResult", "fetchVersions, createVersion, compareVersions, rollbackVersion"],
      ["useComponentStore", "components[], searchQuery, filters", "fetchComponents, createComponent, updateStatus, searchComponents"],
      ["useAlternativeStore", "alternatives[], relationGraph", "fetchAlternatives, addAlternative, updatePriority, removeAlternative"],
      ["useImportStore", "importProgress, fieldMapping, previewData", "parseExcel, confirmMapping, executeImport, saveTemplate"]
    ],
    [20, 40, 40]
  ));

  children.push(h1("7. \u9519\u8bef\u5904\u7406\u67b6\u6784"));
  children.push(h2("7.1 \u9519\u8bef\u5206\u7c7b"));
  children.push(makeTable(
    ["\u9519\u8bef\u7c7b\u578b", "\u9519\u8bef\u7801\u8303\u56f4", "\u5904\u7406\u7b56\u7565", "\u793a\u4f8b"],
    [
      ["\u4e1a\u52a1\u9519\u8bef", "B1000-B1999", "\u8fd4\u56de\u53cb\u597d\u63d0\u793a\uff0c\u4e0d\u91cd\u8bd5", "B1001: \u5c42\u7ea7\u8d85\u8fc7\u6700\u5927\u6df1\u5ea6"],
      ["\u6570\u636e\u6821\u9a8c\u9519\u8bef", "B2000-B2999", "\u8fd4\u56de\u5177\u4f53\u5b57\u6bb5\u9519\u8bef\u4fe1\u606f", "B2001: \u578b\u53f7\u4e0d\u80fd\u4e3a\u7a7a"],
      ["\u6570\u636e\u5e93\u9519\u8bef", "D3000-D3999", "\u8bb0\u5f55\u65e5\u5fd7\uff0c\u63d0\u793a\u7528\u6237\u91cd\u8bd5", "D3001: \u552f\u4e00\u7ea6\u675f\u51b2\u7a81"],
      ["\u6587\u4ef6\u64cd\u4f5c\u9519\u8bef", "F4000-F4999", "\u8bb0\u5f55\u65e5\u5fd7\uff0c\u63d0\u793a\u7528\u6237\u68c0\u67e5\u6587\u4ef6", "F4001: \u6587\u4ef6\u683c\u5f0f\u4e0d\u652f\u6301"],
      ["\u7cfb\u7edf\u9519\u8bef", "S5000-S5999", "\u8bb0\u5f55\u65e5\u5fd7\uff0c\u5efa\u8bae\u91cd\u542f\u5e94\u7528", "S5001: \u6570\u636e\u5e93\u8fde\u63a5\u5931\u8d25"]
    ],
    [18, 18, 30, 34]
  ));

  children.push(h2("7.2 \u9519\u8bef\u5904\u7406\u6d41\u7a0b"));
  children.push(p("\u6240\u6709\u5f02\u6b65\u64cd\u4f5c\u5fc5\u987b\u4f7f\u7528 try-catch \u5305\u88f9\u3002\u5728 Service \u5c42\u6355\u83b7\u5e95\u5c42\u5f02\u5e38\uff08Prisma \u5f02\u5e38\u3001IPC \u5f02\u5e38\uff09\u5e76\u8f6c\u6362\u4e3a\u4e1a\u52a1\u9519\u8bef\u7801\u3002\u5728 UI \u5c42\u6355\u83b7 Service \u5c42\u629b\u51fa\u7684\u4e1a\u52a1\u9519\u8bef\uff0c\u901a\u8fc7 ElMessage \u5c55\u793a\u53cb\u597d\u63d0\u793a\u3002\u6240\u6709\u9519\u8bef\u5fc5\u987b\u901a\u8fc7 console.error \u8bb0\u5f55\u5b8c\u6574\u5806\u6808\uff0c\u4fbf\u4e8e\u8c03\u8bd5\u3002\u7981\u6b62\u4f7f\u7528 alert() \u5c55\u793a\u9519\u8bef\u3002"));

  children.push(h1("8. \u5b89\u5168\u67b6\u6784"));
  children.push(h2("8.1 Tauri \u5b89\u5168\u6c99\u7bb1"));
  children.push(p("Tauri v2 \u91c7\u7528\u80fd\u529b\u57fa\u7840\u7684\u5b89\u5168\u6a21\u578b\uff0c\u6240\u6709\u7cfb\u7edf\u7ea7\u64cd\u4f5c\uff08\u6587\u4ef6\u8bbf\u95ee\u3001\u7f51\u7edc\u8bf7\u6c42\u3001\u7cfb\u7edf\u8c03\u7528\uff09\u5747\u9700\u5728 tauri.conf.json \u4e2d\u663e\u5f0f\u58f0\u660e\u6743\u9650\u3002\u524d\u7aef\u4ee3\u7801\u5728\u6c99\u7bb1\u4e2d\u8fd0\u884c\uff0c\u65e0\u6cd5\u76f4\u63a5\u8bbf\u95ee\u7cfb\u7edf\u8d44\u6e90\uff0c\u5fc5\u987b\u901a\u8fc7 IPC \u547d\u4ee4\u4e0e\u540e\u7aef\u901a\u4fe1\u3002\u8fd9\u79cd\u67b6\u6784\u786e\u4fdd\u4e86\u5373\u4f7f\u524d\u7aef\u4ee3\u7801\u5b58\u5728\u6f0f\u6d1e\uff0c\u4e5f\u65e0\u6cd5\u5bf9\u7528\u6237\u7cfb\u7edf\u9020\u6210\u5371\u5bb3\u3002"));

  children.push(h2("8.2 \u6570\u636e\u5b89\u5168"));
  children.push(bullet("\u6570\u636e\u5e93\u6587\u4ef6\u5b58\u50a8\u5728\u7528\u6237 AppData \u76ee\u5f55\uff0c\u4e0d\u4e0e\u5e94\u7528\u7a0b\u5e8f\u5b89\u88c5\u76ee\u5f55\u6df7\u653e\u3002"));
  children.push(bullet("\u6570\u636e\u5e93\u6587\u4ef6\u91c7\u7528 SQLite \u52a0\u5bc6\u6269\u5c55\uff08SQLCipher\uff09\uff0c\u9632\u6b62\u672a\u6388\u6743\u8bbf\u95ee\u3002"));
  children.push(bullet("\u81ea\u52a8\u5907\u4efd\u6587\u4ef6\u5b58\u50a8\u5728\u72ec\u7acb\u76ee\u5f55\uff0c\u4e0e\u4e3b\u6570\u636e\u5e93\u7269\u7406\u9694\u79bb\u3002"));
  children.push(bullet("\u5173\u952e\u64cd\u4f5c\u5ba1\u8ba1\u65e5\u5fd7\u8bb0\u5f55\u5728\u72ec\u7acb\u7684 AuditLog \u8868\u4e2d\uff0c\u4e0d\u53ef\u4fee\u6539\u3002"));

  return createDoc(
    "BOM\u7ba1\u7406\u7cfb\u7edf",
    "\u7cfb\u7edf\u67b6\u6784\u8bbe\u8ba1\u6587\u6863",
    ["\u7248\u672c: v1.0", "\u65e5\u671f: 2026-05-28"],
    children
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT 4: DatabaseDesign
// ═══════════════════════════════════════════════════════════════

function buildDatabaseDesign() {
  const children = [];

  children.push(h1("1. \u6570\u636e\u5e93\u6982\u8ff0"));
  children.push(p("BOMMaster \u4f7f\u7528 SQLite v3.x \u4f5c\u4e3a\u672c\u5730\u6570\u636e\u5e93\uff0c\u901a\u8fc7 Prisma v5.x ORM \u8fdb\u884c\u6570\u636e\u5e93\u64cd\u4f5c\u548c\u8fc1\u79fb\u7ba1\u7406\u3002\u6570\u636e\u5e93\u6587\u4ef6\u5b58\u50a8\u5728\u7528\u6237 AppData \u76ee\u5f55\u4e0b\uff0c\u91c7\u7528 SQLCipher \u52a0\u5bc6\u3002\u672c\u6587\u6863\u5b9a\u4e49\u4e86\u6240\u6709\u6570\u636e\u8868\u7ed3\u6784\u3001\u5b57\u6bb5\u7c7b\u578b\u3001\u7ea6\u675f\u6761\u4ef6\u548c\u7d22\u5f15\u8bbe\u8ba1\uff0c\u4e3a AI Agent \u751f\u6210 Prisma Schema \u548c\u6570\u636e\u5e93\u64cd\u4f5c\u4ee3\u7801\u63d0\u4f9b\u5b8c\u6574\u4f9d\u636e\u3002"));

  children.push(h2("1.1 \u8868\u5173\u7cfb\u6982\u89c8"));
  children.push(makeTable(
    ["\u5b9e\u4f53", "\u4e3b\u8988\u5173\u7cfb", "\u8bf4\u660e"],
    [
      ["Project", "1:N \u2192 BomVersion", "\u4e00\u4e2a\u9879\u76ee\u62e5\u6709\u591a\u4e2a BOM \u7248\u672c"],
      ["BomVersion", "1:N \u2192 BomNode", "\u4e00\u4e2a\u7248\u672c\u5305\u542b\u591a\u4e2a BOM \u8282\u70b9"],
      ["BomNode", "1:N \u2192 BomNode (self)", "\u8282\u70b9\u7684\u7236\u5b50\u5173\u7cfb\uff08\u81ea\u5f15\u7528\uff09"],
      ["BomNode", "N:1 \u2192 Component", "\u53f6\u5b50\u8282\u70b9\u5173\u8054\u5143\u5668\u4ef6"],
      ["Component", "1:N \u2192 AlternativePart", "\u5143\u5668\u4ef6\u7684\u66ff\u4ee3\u6599\u5173\u7cfb"],
      ["BomVersion", "1:N \u2192 ChangeLog", "\u7248\u672c\u53d8\u66f4\u65e5\u5fd7"],
      ["Project", "1:N \u2192 AuditLog", "\u9879\u76ee\u7ea7\u5ba1\u8ba1\u65e5\u5fd7"]
    ],
    [20, 35, 45]
  ));

  children.push(h1("2. \u8868\u7ed3\u6784\u5b9a\u4e49"));

  // Project table
  children.push(h2("2.1 Project (\u9879\u76ee\u8868)"));
  children.push(p("\u5b58\u50a8\u9879\u76ee\u57fa\u672c\u4fe1\u606f\uff0c\u662f\u7cfb\u7edf\u7684\u9876\u5c42\u5b9e\u4f53\uff0c\u6240\u6709 BOM \u6570\u636e\u5747\u6302\u8f7d\u5728\u9879\u76ee\u4e0b\u3002"));
  children.push(makeTable(
    ["\u5b57\u6bb5\u540d", "\u7c7b\u578b", "\u7ea6\u675f", "\u9ed8\u8ba4\u503c", "\u8bf4\u660e"],
    [
      ["id", "String", "PK, UUID", "auto-generated()", "\u4e3b\u952e"],
      ["name", "String", "NOT NULL, UNIQUE", "-", "\u9879\u76ee\u540d\u79f0\uff0c\u6700\u5927 100 \u5b57\u7b26"],
      ["code", "String", "NOT NULL, UNIQUE", "-", "\u9879\u76ee\u7f16\u53f7\uff0c\u683c\u5f0f PRJ-YYYY-NNN"],
      ["description", "String", "OPTIONAL", "null", "\u9879\u76ee\u63cf\u8ff0"],
      ["status", "Enum", "NOT NULL", "DRAFT", "DRAFT/ACTIVE/ARCHIVED"],
      ["createdAt", "DateTime", "NOT NULL", "now()", "\u521b\u5efa\u65f6\u95f4"],
      ["updatedAt", "DateTime", "NOT NULL", "now()", "\u66f4\u65b0\u65f6\u95f4\uff0c\u81ea\u52a8\u66f4\u65b0"],
      ["deletedAt", "DateTime", "OPTIONAL", "null", "\u8f6f\u5220\u9664\u6807\u8bb0"]
    ],
    [15, 15, 22, 18, 30]
  ));

  // BomVersion table
  children.push(h2("2.2 BomVersion (BOM\u7248\u672c\u8868)"));
  children.push(p("\u5b58\u50a8 BOM \u7684\u7248\u672c\u4fe1\u606f\uff0c\u6bcf\u6b21 BOM \u53d8\u66f4\u81ea\u52a8\u521b\u5efa\u65b0\u7248\u672c\u3002\u540c\u4e00\u9879\u76ee\u4e0b\u53ea\u6709\u4e00\u4e2a isActive=true \u7684\u7248\u672c\u3002"));
  children.push(makeTable(
    ["\u5b57\u6bb5\u540d", "\u7c7b\u578b", "\u7ea6\u675f", "\u9ed8\u8ba4\u503c", "\u8bf4\u660e"],
    [
      ["id", "String", "PK, UUID", "auto-generated()", "\u4e3b\u952e"],
      ["projectId", "String", "FK \u2192 Project.id, NOT NULL", "-", "\u6240\u5c5e\u9879\u76ee"],
      ["version", "String", "NOT NULL", "-", "\u7248\u672c\u53f7\uff0c\u5982 v1.0\u3001v1.1"],
      ["changeSummary", "String", "NOT NULL, minLength(5)", "-", "\u53d8\u66f4\u6458\u8981"],
      ["changeType", "Enum", "NOT NULL", "MINOR", "MAJOR/MINOR/PATCH"],
      ["isActive", "Boolean", "NOT NULL", "true", "\u662f\u5426\u4e3a\u5f53\u524d\u6d3b\u52a8\u7248\u672c"],
      ["createdBy", "String", "NOT NULL", "-", "\u521b\u5efa\u4eba\u7528\u6237\u540d"],
      ["createdAt", "DateTime", "NOT NULL", "now()", "\u521b\u5efa\u65f6\u95f4"]
    ],
    [15, 15, 25, 15, 30]
  ));

  // BomNode table
  children.push(h2("2.3 BomNode (BOM\u8282\u70b9\u8868)"));
  children.push(p("\u5b58\u50a8 BOM \u6811\u7684\u8282\u70b9\u4fe1\u606f\uff0c\u91c7\u7528\u90bb\u63a5\u8868\u6a21\u578b\u5b58\u50a8\u6811\u7ed3\u6784\uff0c\u901a\u8fc7 parentId \u5b57\u6bb5\u5b9e\u73b0\u7236\u5b50\u5173\u7cfb\u3002\u6bcf\u4e2a\u8282\u70b9\u5fc5\u987b\u5173\u8054\u5230\u4e00\u4e2a BOM \u7248\u672c\u3002"));
  children.push(makeTable(
    ["\u5b57\u6bb5\u540d", "\u7c7b\u578b", "\u7ea6\u675f", "\u9ed8\u8ba4\u503c", "\u8bf4\u660e"],
    [
      ["id", "String", "PK, UUID", "auto-generated()", "\u4e3b\u952e"],
      ["versionId", "String", "FK \u2192 BomVersion.id, NOT NULL", "-", "\u6240\u5c5e BOM \u7248\u672c"],
      ["parentId", "String", "FK \u2192 BomNode.id, OPTIONAL", "null", "\u7236\u8282\u70b9\uff0c\u6839\u8282\u70b9\u4e3a null"],
      ["nodeType", "Enum", "NOT NULL", "-", "ASSEMBLY/COMPONENT"],
      ["level", "Int", "NOT NULL, CHECK(level>=0 AND level<=10)", "-", "\u5c42\u7ea7\u6df1\u5ea6\uff0c\u6839\u8282\u70b9\u4e3a 0"],
      ["sortOrder", "Int", "NOT NULL", "0", "\u540c\u7ea7\u6392\u5e8f\u5e8f\u53f7"],
      ["componentId", "String", "FK \u2192 Component.id, OPTIONAL", "null", "\u5173\u8054\u5143\u5668\u4ef6\uff08\u53f6\u5b50\u8282\u70b9\u5fc5\u586b\uff09"],
      ["referenceDesignator", "String", "OPTIONAL", "null", "\u4f4d\u53f7\u6807\u8bc6\uff0c\u5982 R1\u3001C3"],
      ["quantity", "Int", "NOT NULL, CHECK(quantity>0)", "1", "\u6570\u91cf"],
      ["note", "String", "OPTIONAL", "null", "\u5907\u6ce8"],
      ["createdAt", "DateTime", "NOT NULL", "now()", "\u521b\u5efa\u65f6\u95f4"],
      ["updatedAt", "DateTime", "NOT NULL", "now()", "\u66f4\u65b0\u65f6\u95f4"],
      ["deletedAt", "DateTime", "OPTIONAL", "null", "\u8f6f\u5220\u9664\u6807\u8bb0"]
    ],
    [18, 15, 25, 12, 30]
  ));

  // Component table
  children.push(h2("2.4 Component (\u5143\u5668\u4ef6\u8868)"));
  children.push(p("\u5b58\u50a8\u5143\u5668\u4ef6\u7684\u57fa\u672c\u4fe1\u606f\u548c\u6280\u672f\u53c2\u6570\uff0c\u662f\u7cfb\u7edf\u4e2d\u88ab\u5f15\u7528\u6700\u591a\u7684\u5b9e\u4f53\u3002\u540c\u4e00\u578b\u53f7\u7684\u5143\u5668\u4ef6\u5728\u6570\u636e\u5e93\u4e2d\u53ea\u5b58\u5728\u4e00\u6761\u8bb0\u5f55\uff0c\u901a\u8fc7 BomNode \u5b9e\u73b0\u591a\u5904\u5f15\u7528\u3002"));
  children.push(makeTable(
    ["\u5b57\u6bb5\u540d", "\u7c7b\u578b", "\u7ea6\u675f", "\u9ed8\u8ba4\u503c", "\u8bf4\u660e"],
    [
      ["id", "String", "PK, UUID", "auto-generated()", "\u4e3b\u952e"],
      ["partNumber", "String", "NOT NULL, UNIQUE", "-", "\u578b\u53f7\uff0c\u552f\u4e00\u6807\u8bc6"],
      ["name", "String", "NOT NULL", "-", "\u5143\u5668\u4ef6\u540d\u79f0"],
      ["category", "String", "OPTIONAL", "null", "\u7c7b\u522b\uff0c\u5982\u7535\u963b\u3001\u7535\u5bb9\u3001IC"],
      ["packageType", "String", "OPTIONAL", "null", "\u5c01\u88c5\u89c4\u683c\uff0c\u5982 0402\u30010.5mm QFP"],
      ["manufacturer", "String", "OPTIONAL", "null", "\u5236\u9020\u5546"],
      ["description", "String", "OPTIONAL", "null", "\u63cf\u8ff0"],
      ["status", "Enum", "NOT NULL", "ACTIVE", "ACTIVE/EOL/PENDING/OBSOLETE"],
      ["specs", "Json", "OPTIONAL", "null", "\u6280\u672f\u53c2\u6570 JSON"],
      ["createdAt", "DateTime", "NOT NULL", "now()", "\u521b\u5efa\u65f6\u95f4"],
      ["updatedAt", "DateTime", "NOT NULL", "now()", "\u66f4\u65b0\u65f6\u95f4"],
      ["deletedAt", "DateTime", "OPTIONAL", "null", "\u8f6f\u5220\u9664\u6807\u8bb0"]
    ],
    [18, 12, 22, 15, 33]
  ));

  // AlternativePart table
  children.push(h2("2.5 AlternativePart (\u66ff\u4ee3\u6599\u5173\u7cfb\u8868)"));
  children.push(p("\u5b58\u50a8\u5143\u5668\u4ef6\u4e4b\u95f4\u7684\u66ff\u4ee3\u5173\u7cfb\uff0c\u652f\u6301\u591a\u5c42\u7ea7\u66ff\u4ee3\u94fe\u3002\u540c\u4e00\u5bf9\u5143\u5668\u4ef6\u4e0d\u5141\u8bb8\u91cd\u590d\u5efa\u7acb\u66ff\u4ee3\u5173\u7cfb\u3002"));
  children.push(makeTable(
    ["\u5b57\u6bb5\u540d", "\u7c7b\u578b", "\u7ea6\u675f", "\u9ed8\u8ba4\u503c", "\u8bf4\u660e"],
    [
      ["id", "String", "PK, UUID", "auto-generated()", "\u4e3b\u952e"],
      ["primaryComponentId", "String", "FK \u2192 Component.id, NOT NULL", "-", "\u4e3b\u6599\u5143\u5668\u4ef6"],
      ["alternativeComponentId", "String", "FK \u2192 Component.id, NOT NULL", "-", "\u66ff\u4ee3\u6599\u5143\u5668\u4ef6"],
      ["priority", "Enum", "NOT NULL", "SECONDARY", "PRIMARY/SECONDARY/TEMPORARY"],
      ["status", "Enum", "NOT NULL", "ACTIVE", "ACTIVE/PENDING/DEPRECATED"],
      ["notes", "String", "OPTIONAL", "null", "\u66ff\u4ee3\u8bf4\u660e"],
      ["createdAt", "DateTime", "NOT NULL", "now()", "\u521b\u5efa\u65f6\u95f4"],
      ["UNIQUE", "-", "UNIQUE(primaryComponentId, alternativeComponentId)", "-", "\u9632\u6b62\u91cd\u590d\u5173\u7cfb"]
    ],
    [20, 12, 25, 15, 28]
  ));

  // ChangeLog table
  children.push(h2("2.6 ChangeLog (\u53d8\u66f4\u65e5\u5fd7\u8868)"));
  children.push(p("\u8bb0\u5f55 BOM \u6bcf\u6b21\u53d8\u66f4\u7684\u8be6\u7ec6\u4fe1\u606f\uff0c\u4e0e BomVersion \u4e00\u5bf9\u591a\u5173\u7cfb\uff0c\u63d0\u4f9b\u5b8c\u6574\u7684\u53d8\u66f4\u5ba1\u8ba1\u8f68\u8ff9\u3002"));
  children.push(makeTable(
    ["\u5b57\u6bb5\u540d", "\u7c7b\u578b", "\u7ea6\u675f", "\u9ed8\u8ba4\u503c", "\u8bf4\u660e"],
    [
      ["id", "String", "PK, UUID", "auto-generated()", "\u4e3b\u952e"],
      ["versionId", "String", "FK \u2192 BomVersion.id, NOT NULL", "-", "\u5173\u8054\u7248\u672c"],
      ["nodeId", "String", "FK \u2192 BomNode.id, OPTIONAL", "null", "\u53d8\u66f4\u7684\u8282\u70b9"],
      ["action", "Enum", "NOT NULL", "-", "CREATE/UPDATE/DELETE/MOVE"],
      ["field", "String", "OPTIONAL", "null", "\u53d8\u66f4\u7684\u5b57\u6bb5\u540d"],
      ["oldValue", "String", "OPTIONAL", "null", "\u53d8\u66f4\u524d\u7684\u503c"],
      ["newValue", "String", "OPTIONAL", "null", "\u53d8\u66f4\u540e\u7684\u503c"],
      ["createdAt", "DateTime", "NOT NULL", "now()", "\u53d8\u66f4\u65f6\u95f4"]
    ],
    [18, 12, 25, 15, 30]
  ));

  // AuditLog table
  children.push(h2("2.7 AuditLog (\u5ba1\u8ba1\u65e5\u5fd7\u8868)"));
  children.push(p("\u8bb0\u5f55\u7cfb\u7edf\u7ea7\u5173\u952e\u64cd\u4f5c\u7684\u5ba1\u8ba1\u65e5\u5fd7\uff0c\u4e0d\u53ef\u4fee\u6539\uff0c\u7528\u4e8e\u5b89\u5168\u5ba1\u8ba1\u548c\u95ee\u9898\u8ffd\u6eaf\u3002"));
  children.push(makeTable(
    ["\u5b57\u6bb5\u540d", "\u7c7b\u578b", "\u7ea6\u675f", "\u9ed8\u8ba4\u503c", "\u8bf4\u660e"],
    [
      ["id", "String", "PK, UUID", "auto-generated()", "\u4e3b\u952e"],
      ["projectId", "String", "FK \u2192 Project.id, OPTIONAL", "null", "\u5173\u8054\u9879\u76ee"],
      ["action", "String", "NOT NULL", "-", "\u64cd\u4f5c\u7c7b\u578b\uff0c\u5982 PROJECT_DELETE\u3001VERSION_ROLLBACK"],
      ["entity", "String", "NOT NULL", "-", "\u64cd\u4f5c\u5b9e\u4f53\uff0c\u5982 Project\u3001BomNode"],
      ["entityId", "String", "NOT NULL", "-", "\u5b9e\u4f53 ID"],
      ["operator", "String", "NOT NULL", "-", "\u64cd\u4f5c\u4eba"],
      ["detail", "Json", "OPTIONAL", "null", "\u64cd\u4f5c\u8be6\u60c5 JSON"],
      ["createdAt", "DateTime", "NOT NULL", "now()", "\u64cd\u4f5c\u65f6\u95f4"]
    ],
    [18, 12, 25, 15, 30]
  ));

  // ImportTemplate table
  children.push(h2("2.8 ImportTemplate (\u5bfc\u5165\u6a21\u677f\u8868)"));
  children.push(p("\u5b58\u50a8\u7528\u6237\u4fdd\u5b58\u7684 Excel \u5bfc\u5165\u5b57\u6bb5\u6620\u5c04\u6a21\u677f\uff0c\u65b9\u4fbf\u7528\u6237\u91cd\u590d\u4f7f\u7528\u5df2\u4fdd\u5b58\u7684\u6620\u5c04\u5173\u7cfb\u3002"));
  children.push(makeTable(
    ["\u5b57\u6bb5\u540d", "\u7c7b\u578b", "\u7ea6\u675f", "\u9ed8\u8ba4\u503c", "\u8bf4\u660e"],
    [
      ["id", "String", "PK, UUID", "auto-generated()", "\u4e3b\u952e"],
      ["name", "String", "NOT NULL", "-", "\u6a21\u677f\u540d\u79f0"],
      ["mapping", "Json", "NOT NULL", "-", "\u5b57\u6bb5\u6620\u5c04\u5173\u7cfb JSON"],
      ["createdBy", "String", "NOT NULL", "-", "\u521b\u5efa\u4eba"],
      ["createdAt", "DateTime", "NOT NULL", "now()", "\u521b\u5efa\u65f6\u95f4"]
    ],
    [18, 12, 22, 18, 30]
  ));

  children.push(h1("3. \u7d22\u5f15\u8bbe\u8ba1"));
  children.push(p("\u4ee5\u4e0b\u7d22\u5f15\u57fa\u4e8e\u9884\u671f\u7684\u67e5\u8be2\u6a21\u5f0f\u8bbe\u8ba1\uff0cAI Agent \u5fc5\u987b\u5728 Prisma Schema \u4e2d\u5b9a\u4e49\u8fd9\u4e9b\u7d22\u5f15\uff1a"));
  children.push(makeTable(
    ["\u7d22\u5f15\u540d", "\u8868", "\u5b57\u6bb5", "\u7c7b\u578b", "\u7528\u9014"],
    [
      ["idx_project_code", "Project", "code", "UNIQUE", "\u9879\u76ee\u7f16\u53f7\u552f\u4e00\u67e5\u8be2"],
      ["idx_project_status", "Project", "status", "NORMAL", "\u6309\u72b6\u6001\u7b5b\u9009\u9879\u76ee"],
      ["idx_bomversion_project", "BomVersion", "projectId", "NORMAL", "\u67e5\u8be2\u9879\u76ee\u4e0b\u7684\u6240\u6709\u7248\u672c"],
      ["idx_bomversion_active", "BomVersion", "projectId, isActive", "COMPOSITE", "\u67e5\u627e\u9879\u76ee\u7684\u5f53\u524d\u6d3b\u52a8\u7248\u672c"],
      ["idx_bomnode_version", "BomNode", "versionId", "NORMAL", "\u67e5\u8be2\u7248\u672c\u4e0b\u7684\u6240\u6709\u8282\u70b9"],
      ["idx_bomnode_parent", "BomNode", "parentId", "NORMAL", "\u67e5\u8be2\u8282\u70b9\u7684\u5b50\u8282\u70b9"],
      ["idx_bomnode_component", "BomNode", "componentId", "NORMAL", "\u67e5\u8be2\u5143\u5668\u4ef6\u5728\u54ea\u4e9b BOM \u4e2d\u4f7f\u7528"],
      ["idx_component_partnumber", "Component", "partNumber", "UNIQUE", "\u578b\u53f7\u552f\u4e00\u67e5\u8be2"],
      ["idx_component_status", "Component", "status", "NORMAL", "\u6309\u72b6\u6001\u7b5b\u9009\u5143\u5668\u4ef6"],
      ["idx_component_category", "Component", "category", "NORMAL", "\u6309\u7c7b\u522b\u7b5b\u9009\u5143\u5668\u4ef6"],
      ["idx_alternative_primary", "AlternativePart", "primaryComponentId", "NORMAL", "\u67e5\u8be2\u4e3b\u6599\u7684\u66ff\u4ee3\u6599"],
      ["idx_changelog_version", "ChangeLog", "versionId", "NORMAL", "\u67e5\u8be2\u7248\u672c\u7684\u53d8\u66f4\u65e5\u5fd7"],
      ["idx_auditlog_project", "AuditLog", "projectId", "NORMAL", "\u67e5\u8be2\u9879\u76ee\u7684\u5ba1\u8ba1\u65e5\u5fd7"]
    ],
    [25, 15, 22, 15, 23]
  ));

  children.push(h1("4. Prisma Schema \u793a\u4f8b"));
  children.push(p("\u4ee5\u4e0b\u4e3a Project \u548c BomNode \u7684 Prisma Schema \u793a\u4f8b\uff0cAI Agent \u5e94\u53c2\u7167\u6b64\u683c\u5f0f\u751f\u6210\u5b8c\u6574\u7684 Schema\uff1a"));
  children.push(pNoIndent("generator client {"));
  children.push(pNoIndent("  provider = \"prisma-client-js\""));
  children.push(pNoIndent("}"));
  children.push(pNoIndent("datasource db {"));
  children.push(pNoIndent("  provider = \"sqlite\""));
  children.push(pNoIndent("  url      = env(\"DATABASE_URL\")"));
  children.push(pNoIndent("}"));
  children.push(pNoIndent("model Project {"));
  children.push(pNoIndent("  id          String   @id @default(uuid())"));
  children.push(pNoIndent("  name        String   @unique @db.VarChar(100)"));
  children.push(pNoIndent("  code        String   @unique"));
  children.push(pNoIndent("  description String?"));
  children.push(pNoIndent("  status      ProjectStatus @default(DRAFT)"));
  children.push(pNoIndent("  createdAt   DateTime @default(now())"));
  children.push(pNoIndent("  updatedAt   DateTime @updatedAt"));
  children.push(pNoIndent("  deletedAt   DateTime?"));
  children.push(pNoIndent("  versions    BomVersion[]"));
  children.push(pNoIndent("  auditLogs   AuditLog[]"));
  children.push(pNoIndent("}"));

  children.push(h1("5. \u6570\u636e\u5e93\u521d\u59cb\u5316\u4e0e\u8fc1\u79fb"));
  children.push(h2("5.1 \u521d\u59cb\u5316\u7b56\u7565"));
  children.push(p("\u5e94\u7528\u9996\u6b21\u542f\u52a8\u65f6\uff0c\u68c0\u67e5 AppData \u76ee\u5f55\u4e0b\u662f\u5426\u5b58\u5728\u6570\u636e\u5e93\u6587\u4ef6\u3002\u82e5\u4e0d\u5b58\u5728\uff0c\u6267\u884c Prisma Migrate deploy \u521b\u5efa\u6570\u636e\u5e93\u5e76\u8fd0\u884c\u79cd\u5b50\u6570\u636e\u3002\u82e5\u5b58\u5728\uff0c\u68c0\u67e5 schema \u7248\u672c\u5e76\u6267\u884c\u5fc5\u8981\u7684\u8fc1\u79fb\u3002\u6570\u636e\u5e93\u6587\u4ef6\u8def\u5f84\u4e3a\uff1a{APP_DATA}/bommaster/bommaster.db\uff0c\u5907\u4efd\u76ee\u5f55\u4e3a\uff1a{APP_DATA}/bommaster/backups/\u3002"));

  children.push(h2("5.2 \u8fc1\u79fb\u7ba1\u7406"));
  children.push(p("\u6240\u6709\u6570\u636e\u5e93\u7ed3\u6784\u53d8\u66f4\u5fc5\u987b\u901a\u8fc7 Prisma Migrate \u7ba1\u7406\u3002\u6bcf\u6b21 schema \u53d8\u66f4\u540e\u6267\u884c npx prisma migrate dev --name {description} \u751f\u6210\u8fc1\u79fb\u6587\u4ef6\u3002\u751f\u4ea7\u73af\u5883\u4f7f\u7528 npx prisma migrate deploy \u6267\u884c\u8fc1\u79fb\u3002\u7981\u6b62\u624b\u52a8\u4fee\u6539\u6570\u636e\u5e93\u7ed3\u6784\uff0c\u6240\u6709\u53d8\u66f4\u5fc5\u987b\u6709\u5bf9\u5e94\u7684\u8fc1\u79fb\u6587\u4ef6\u3002"));

  children.push(h1("6. \u79cd\u5b50\u6570\u636e"));
  children.push(p("\u5f00\u53d1\u73af\u5883\u5e94\u5305\u542b\u4ee5\u4e0b\u79cd\u5b50\u6570\u636e\uff0c\u7528\u4e8e\u5f00\u53d1\u548c\u6d4b\u8bd5\uff1a"));
  children.push(bullet("\u9ed8\u8ba4\u9879\u76ee\uff1a\u540d\u79f0\u201c\u793a\u4f8b\u9879\u76ee\u201d\uff0c\u7f16\u53f7 PRJ-2026-001\uff0c\u72b6\u6001 ACTIVE"));
  children.push(bullet("\u793a\u4f8b BOM\uff1a\u5305\u542b 3 \u5c42\u7ea7\u7ed3\u6784\uff0c\u6839\u8282\u70b9\u4e3a PCBA\uff0c\u5b50\u88c5\u914d\u4f53\u4e3a\u5355\u677f\u548c\u5916\u58f3\uff0c\u53f6\u5b50\u8282\u70b9\u4e3a\u5404\u7c7b\u5143\u5668\u4ef6"));
  children.push(bullet("\u793a\u4f8b\u5143\u5668\u4ef6\uff1a\u5305\u542b\u7535\u963b\u3001\u7535\u5bb9\u3001IC \u7b49\u5404\u7c7b\u522b\u5143\u5668\u4ef6\u5404 5 \u4e2a"));
  children.push(bullet("\u793a\u4f8b\u66ff\u4ee3\u6599\uff1a\u4e3a\u81f3\u5c11 2 \u4e2a\u5143\u5668\u4ef6\u5efa\u7acb\u66ff\u4ee3\u5173\u7cfb"));

  return createDoc(
    "BOM\u7ba1\u7406\u7cfb\u7edf",
    "\u6570\u636e\u5e93\u8bbe\u8ba1\u6587\u6863",
    ["\u7248\u672c: v1.0", "\u65e5\u671f: 2026-05-28"],
    children
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT 5: APISpec
// ═══════════════════════════════════════════════════════════════

function buildAPISpec() {
  const children = [];

  children.push(h1("1. \u5168\u5c40\u7ea6\u5b9a"));
  children.push(h2("1.1 \u57fa\u7840\u4fe1\u606f"));
  children.push(bullet("\u57fa\u7840\u8def\u5f84\uff1a/api/v1"));
  children.push(bullet("\u6570\u636e\u683c\u5f0f\uff1aJSON"));
  children.push(bullet("\u7f16\u7801\uff1aUTF-8"));
  children.push(bullet("\u65f6\u95f4\u683c\u5f0f\uff1aISO 8601\uff08\u5982 2026-05-28T10:30:00Z\uff09"));

  children.push(h2("1.2 \u7edf\u4e00\u54cd\u5e94\u7ed3\u6784"));
  children.push(p("\u6240\u6709\u63a5\u53e3\u5fc5\u987b\u8fd4\u56de\u4ee5\u4e0b\u7edf\u4e00\u683c\u5f0f\uff1a"));
  children.push(pBold("\u6210\u529f\u54cd\u5e94\uff1a"));
  children.push(pNoIndent("{ \"code\": 0, \"message\": \"success\", \"data\": { ... } }"));
  children.push(pBold("\u5931\u8d25\u54cd\u5e94\uff1a"));
  children.push(pNoIndent("{ \"code\": \"B1001\", \"message\": \"\u5c42\u7ea7\u8d85\u8fc7\u6700\u5927\u6df1\u5ea6\", \"details\": { \"maxLevel\": 10, \"currentLevel\": 10 } }"));
  children.push(pBold("\u5206\u9875\u54cd\u5e94\uff1a"));
  children.push(pNoIndent("{ \"code\": 0, \"message\": \"success\", \"data\": { \"items\": [...], \"total\": 100, \"page\": 1, \"pageSize\": 20 } }"));

  children.push(h2("1.3 \u5206\u9875\u53c2\u6570"));
  children.push(makeTable(
    ["\u53c2\u6570", "\u7c7b\u578b", "\u9ed8\u8ba4\u503c", "\u8bf4\u660e"],
    [
      ["page", "number", "1", "\u9875\u7801\uff0c\u4ece 1 \u5f00\u59cb"],
      ["pageSize", "number", "20", "\u6bcf\u9875\u6570\u91cf\uff0c\u6700\u5927 100"],
      ["sortBy", "string", "createdAt", "\u6392\u5e8f\u5b57\u6bb5"],
      ["sortOrder", "string", "desc", "asc/desc"]
    ],
    [20, 20, 20, 40]
  ));

  children.push(h2("1.4 \u9519\u8bef\u7801\u89c4\u8303"));
  children.push(makeTable(
    ["\u9519\u8bef\u7801\u8303\u56f4", "\u7c7b\u522b", "\u793a\u4f8b"],
    [
      ["0", "\u6210\u529f", "-"],
      ["B1000-B1999", "\u4e1a\u52a1\u9519\u8bef", "B1001: \u5c42\u7ea7\u8d85\u8fc7\u6700\u5927\u6df1\u5ea6"],
      ["B2000-B2999", "\u6570\u636e\u6821\u9a8c\u9519\u8bef", "B2001: \u578b\u53f7\u4e0d\u80fd\u4e3a\u7a7a"],
      ["D3000-D3999", "\u6570\u636e\u5e93\u9519\u8bef", "D3001: \u552f\u4e00\u7ea6\u675f\u51b2\u7a81"],
      ["F4000-F4999", "\u6587\u4ef6\u64cd\u4f5c\u9519\u8bef", "F4001: \u6587\u4ef6\u683c\u5f0f\u4e0d\u652f\u6301"],
      ["S5000-S5999", "\u7cfb\u7edf\u9519\u8bef", "S5001: \u6570\u636e\u5e93\u8fde\u63a5\u5931\u8d25"]
    ],
    [25, 25, 50]
  ));

  // Project APIs
  children.push(h1("2. \u9879\u76ee\u7ba1\u7406\u63a5\u53e3"));
  children.push(h2("2.1 \u521b\u5efa\u9879\u76ee"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "POST /api/v1/projects"],
      ["\u8bf4\u660e", "\u521b\u5efa\u65b0\u9879\u76ee"],
      ["\u8bf7\u6c42\u4f53", '{ "name": "PRJ-2026-001", "code": "PRJ-2026-001", "description": "\u65b0\u4ea7\u54c1BOM" }'],
      ["\u54cd\u5e94\u4f53", '{ "code": 0, "data": { "id": "uuid", "name": "...", "status": "DRAFT", "createdAt": "..." } }'],
      ["\u9519\u8bef\u7801", "B2001: \u540d\u79f0\u4e0d\u80fd\u4e3a\u7a7a; D3001: \u7f16\u53f7\u5df2\u5b58\u5728"]
    ],
    [20, 80]
  ));

  children.push(h2("2.2 \u83b7\u53d6\u9879\u76ee\u5217\u8868"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "GET /api/v1/projects"],
      ["\u8bf4\u660e", "\u83b7\u53d6\u9879\u76ee\u5217\u8868\uff0c\u652f\u6301\u5206\u9875\u548c\u7b5b\u9009"],
      ["\u67e5\u8be2\u53c2\u6570", "page, pageSize, status, keyword"],
      ["\u54cd\u5e94\u4f53", '{ "code": 0, "data": { "items": [...], "total": 10, "page": 1 } }']
    ],
    [20, 80]
  ));

  children.push(h2("2.3 \u83b7\u53d6\u9879\u76ee\u8be6\u60c5"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "GET /api/v1/projects/:id"],
      ["\u8bf4\u660e", "\u83b7\u53d6\u6307\u5b9a\u9879\u76ee\u7684\u8be6\u7ec6\u4fe1\u606f"],
      ["\u8def\u5f84\u53c2\u6570", "id: \u9879\u76ee UUID"],
      ["\u54cd\u5e94\u4f53", '{ "code": 0, "data": { "id": "uuid", "name": "...", "versions": [...] } }'],
      ["\u9519\u8bef\u7801", "B1002: \u9879\u76ee\u4e0d\u5b58\u5728"]
    ],
    [20, 80]
  ));

  children.push(h2("2.4 \u66f4\u65b0\u9879\u76ee"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "PUT /api/v1/projects/:id"],
      ["\u8bf4\u660e", "\u66f4\u65b0\u9879\u76ee\u4fe1\u606f"],
      ["\u8bf7\u6c42\u4f53", '{ "name": "\u65b0\u540d\u79f0", "description": "\u65b0\u63cf\u8ff0", "status": "ACTIVE" }'],
      ["\u9519\u8bef\u7801", "B1002: \u9879\u76ee\u4e0d\u5b58\u5728; B2002: \u72b6\u6001\u8f6c\u6362\u4e0d\u5408\u6cd5"]
    ],
    [20, 80]
  ));

  children.push(h2("2.5 \u5220\u9664\u9879\u76ee"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "DELETE /api/v1/projects/:id"],
      ["\u8bf4\u660e", "\u8f6f\u5220\u9664\u9879\u76ee\uff0c\u8bbe\u7f6e deletedAt \u5b57\u6bb5"],
      ["\u9519\u8bef\u7801", "B1002: \u9879\u76ee\u4e0d\u5b58\u5728; B1003: \u9879\u76ee\u4e0b\u6709\u6d3b\u8dc3 BOM\uff0c\u7981\u6b62\u5220\u9664"]
    ],
    [20, 80]
  ));

  // BOM APIs
  children.push(h1("3. BOM \u7ba1\u7406\u63a5\u53e3"));
  children.push(h2("3.1 \u83b7\u53d6 BOM \u6811"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "GET /api/v1/projects/:projectId/bom-tree"],
      ["\u8bf4\u660e", "\u83b7\u53d6\u6307\u5b9a\u9879\u76ee\u5f53\u524d\u6d3b\u52a8\u7248\u672c\u7684 BOM \u6811"],
      ["\u67e5\u8be2\u53c2\u6570", "versionId: \u6307\u5b9a\u7248\u672c\uff08\u53ef\u9009\uff0c\u9ed8\u8ba4\u5f53\u524d\u6d3b\u52a8\u7248\u672c\uff09"],
      ["\u54cd\u5e94\u4f53", '{ "code": 0, "data": { "id": "uuid", "nodeType": "ASSEMBLY", "children": [...] } }']
    ],
    [20, 80]
  ));

  children.push(h2("3.2 \u6dfb\u52a0 BOM \u8282\u70b9"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "POST /api/v1/bom-nodes"],
      ["\u8bf4\u660e", "\u5728\u6307\u5b9a\u7236\u8282\u70b9\u4e0b\u6dfb\u52a0\u5b50\u8282\u70b9"],
      ["\u8bf7\u6c42\u4f53", '{ "parentId": "uuid", "nodeType": "COMPONENT", "componentId": "uuid", "quantity": 2, "referenceDesignator": "R1,R2" }'],
      ["\u9519\u8bef\u7801", "B1001: \u5c42\u7ea7\u8d85\u8fc7\u6700\u5927\u6df1\u5ea6; B1004: \u540c\u7ea7\u8282\u70b9\u91cd\u590d; B2001: \u5fc5\u586b\u5b57\u6bb5\u7f3a\u5931"]
    ],
    [20, 80]
  ));

  children.push(h2("3.3 \u66f4\u65b0 BOM \u8282\u70b9"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "PUT /api/v1/bom-nodes/:id"],
      ["\u8bf7\u6c42\u4f53", '{ "quantity": 3, "referenceDesignator": "R1,R2,R3", "note": "\u66f4\u6539\u6570\u91cf" }'],
      ["\u526f\u4f5c\u7528", "\u81ea\u52a8\u521b\u5efa\u65b0 BOM \u7248\u672c\uff0c\u8bb0\u5f55 ChangeLog"]
    ],
    [20, 80]
  ));

  children.push(h2("3.4 \u5220\u9664 BOM \u8282\u70b9"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "DELETE /api/v1/bom-nodes/:id"],
      ["\u8bf4\u660e", "\u8f6f\u5220\u9664\u8282\u70b9\u53ca\u5176\u6240\u6709\u5b50\u8282\u70b9"],
      ["\u67e5\u8be2\u53c2\u6570", "confirm: boolean\uff08\u662f\u5426\u786e\u8ba4\u5220\u9664\u542b\u5b50\u8282\u70b9\u7684\u7236\u8282\u70b9\uff09"],
      ["\u526f\u4f5c\u7528", "\u81ea\u52a8\u521b\u5efa\u65b0 BOM \u7248\u672c\uff0c\u8bb0\u5f55 ChangeLog"]
    ],
    [20, 80]
  ));

  children.push(h2("3.5 \u79fb\u52a8 BOM \u8282\u70b9"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "PUT /api/v1/bom-nodes/:id/move"],
      ["\u8bf7\u6c42\u4f53", '{ "newParentId": "uuid", "newSortOrder": 2 }'],
      ["\u9519\u8bef\u7801", "B1001: \u79fb\u52a8\u540e\u5c42\u7ea7\u8d85\u8fc7\u6700\u5927\u6df1\u5ea6; B1005: \u4e0d\u80fd\u5c06\u8282\u70b9\u79fb\u52a8\u5230\u81ea\u5df1\u7684\u5b50\u8282\u70b9\u4e0b"]
    ],
    [20, 80]
  ));

  // Version APIs
  children.push(h1("4. \u7248\u672c\u7ba1\u7406\u63a5\u53e3"));
  children.push(h2("4.1 \u83b7\u53d6\u7248\u672c\u5386\u53f2"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "GET /api/v1/projects/:projectId/versions"],
      ["\u8bf4\u660e", "\u83b7\u53d6\u9879\u76ee\u7684\u6240\u6709 BOM \u7248\u672c\u5386\u53f2"],
      ["\u54cd\u5e94\u4f53", '{ "code": 0, "data": { "items": [{ "id": "uuid", "version": "v1.0", "changeSummary": "...", "isActive": true }] } }']
    ],
    [20, 80]
  ));

  children.push(h2("4.2 \u7248\u672c\u5bf9\u6bd4"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "GET /api/v1/versions/compare"],
      ["\u8bf4\u660e", "\u5bf9\u6bd4\u4e24\u4e2a\u7248\u672c\u7684\u5dee\u5f02"],
      ["\u67e5\u8be2\u53c2\u6570", "sourceVersionId, targetVersionId"],
      ["\u54cd\u5e94\u4f53", '{ "code": 0, "data": { "added": [...], "removed": [...], "modified": [...] } }']
    ],
    [20, 80]
  ));

  children.push(h2("4.3 \u7248\u672c\u56de\u6eda"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "POST /api/v1/versions/:id/rollback"],
      ["\u8bf4\u660e", "\u5c06\u6307\u5b9a\u7248\u672c\u8bbe\u4e3a\u5f53\u524d\u6d3b\u52a8\u7248\u672c"],
      ["\u526f\u4f5c\u7528", "\u5f53\u524d\u6d3b\u52a8\u7248\u672c\u7684 isActive \u8bbe\u4e3a false\uff0c\u76ee\u6807\u7248\u672c\u8bbe\u4e3a true"],
      ["\u9519\u8bef\u7801", "B1006: \u7248\u672c\u4e0d\u5b58\u5728"]
    ],
    [20, 80]
  ));

  // Component APIs
  children.push(h1("5. \u5143\u5668\u4ef6\u7ba1\u7406\u63a5\u53e3"));
  children.push(h2("5.1 \u521b\u5efa\u5143\u5668\u4ef6"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "POST /api/v1/components"],
      ["\u8bf7\u6c42\u4f53", '{ "partNumber": "RC0402FR-0710KL", "name": "10k\u03a9\u7535\u963b", "category": "\u7535\u963b", "packageType": "0402", "manufacturer": "YAGEO", "status": "ACTIVE" }'],
      ["\u9519\u8bef\u7801", "D3001: \u578b\u53f7\u5df2\u5b58\u5728; B2001: \u5fc5\u586b\u5b57\u6bb5\u7f3a\u5931"]
    ],
    [20, 80]
  ));

  children.push(h2("5.2 \u641c\u7d22\u5143\u5668\u4ef6"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "GET /api/v1/components/search"],
      ["\u67e5\u8be2\u53c2\u6570", "keyword, category, status, page, pageSize"],
      ["\u8bf4\u660e", "\u652f\u6301\u6309\u578b\u53f7\u3001\u540d\u79f0\u3001\u5c01\u88c5\u3001\u5382\u5bb6\u5168\u6587\u641c\u7d22"]
    ],
    [20, 80]
  ));

  children.push(h2("5.3 \u66f4\u65b0\u5143\u5668\u4ef6\u72b6\u6001"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "PATCH /api/v1/components/:id/status"],
      ["\u8bf7\u6c42\u4f53", '{ "status": "EOL" }'],
      ["\u526f\u4f5c\u7528", "\u68c0\u67e5\u8be5\u5143\u5668\u4ef6\u5728\u6240\u6709 BOM \u4e2d\u7684\u4f7f\u7528\u60c5\u51b5\uff0c\u8fd4\u56de\u5f71\u54cd\u8303\u56f4\u8b66\u544a"]
    ],
    [20, 80]
  ));

  // Alternative APIs
  children.push(h1("6. \u66ff\u4ee3\u6599\u7ba1\u7406\u63a5\u53e3"));
  children.push(h2("6.1 \u6dfb\u52a0\u66ff\u4ee3\u6599\u5173\u7cfb"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "POST /api/v1/alternatives"],
      ["\u8bf7\u6c42\u4f53", '{ "primaryComponentId": "uuid", "alternativeComponentId": "uuid", "priority": "SECONDARY", "notes": "\u5c01\u88c5\u517c\u5bb9" }'],
      ["\u9519\u8bef\u7801", "D3002: \u66ff\u4ee3\u5173\u7cfb\u5df2\u5b58\u5728; B1007: \u4e0d\u80fd\u5c06\u5143\u5668\u4ef6\u8bbe\u4e3a\u81ea\u5df1\u7684\u66ff\u4ee3\u6599"]
    ],
    [20, 80]
  ));

  children.push(h2("6.2 \u83b7\u53d6\u66ff\u4ee3\u6599\u94fe"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "GET /api/v1/components/:id/alternatives"],
      ["\u8bf4\u660e", "\u83b7\u53d6\u6307\u5b9a\u5143\u5668\u4ef6\u7684\u5168\u90e8\u66ff\u4ee3\u6599\uff0c\u652f\u6301\u9012\u5f52\u67e5\u8be2\u66ff\u4ee3\u94fe"],
      ["\u67e5\u8be2\u53c2\u6570", "depth: \u67e5\u8be2\u6df1\u5ea6\uff08\u9ed8\u8ba4 3\uff0c\u6700\u5927 5\uff09"]
    ],
    [20, 80]
  ));

  // Import/Export APIs
  children.push(h1("7. \u5bfc\u5165\u5bfc\u51fa\u63a5\u53e3"));
  children.push(h2("7.1 \u89e3\u6790 Excel \u6587\u4ef6"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "POST /api/v1/import/parse"],
      ["\u8bf7\u6c42\u4f53", "multipart/form-data\uff0c\u5b57\u6bb5 file \u4e3a Excel \u6587\u4ef6"],
      ["\u54cd\u5e94\u4f53", '{ "code": 0, "data": { "columns": ["Part Number", "Qty", "Value"], "rows": [...], "requiredFields": ["partNumber", "quantity"] } }'],
      ["\u9519\u8bef\u7801", "F4001: \u6587\u4ef6\u683c\u5f0f\u4e0d\u652f\u6301; F4002: \u6587\u4ef6\u5927\u5c0f\u8d85\u8fc7\u9650\u5236"]
    ],
    [20, 80]
  ));

  children.push(h2("7.2 \u6267\u884c\u5bfc\u5165"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "POST /api/v1/import/execute"],
      ["\u8bf7\u6c42\u4f53", '{ "projectId": "uuid", "mapping": { "Part Number": "partNumber", "Qty": "quantity" }, "rows": [...] }'],
      ["\u54cd\u5e94\u4f53", '{ "code": 0, "data": { "success": 950, "failed": 30, "skipped": 20, "errors": [...] } }']
    ],
    [20, 80]
  ));

  children.push(h2("7.3 \u5bfc\u51fa BOM"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "POST /api/v1/export/bom"],
      ["\u8bf7\u6c42\u4f53", '{ "projectId": "uuid", "versionId": "uuid", "template": "standard", "fields": ["partNumber", "quantity", "referenceDesignator"] }'],
      ["\u54cd\u5e94\u4f53", "\u8fd4\u56de .xlsx \u6587\u4ef6\u6d41"]
    ],
    [20, 80]
  ));

  children.push(h2("7.4 \u4fdd\u5b58\u5bfc\u5165\u6a21\u677f"));
  children.push(makeTable(
    ["\u5c5e\u6027", "\u503c"],
    [
      ["\u65b9\u6cd5", "POST /api/v1/import/templates"],
      ["\u8bf7\u6c42\u4f53", '{ "name": "\u6807\u51c6\u7535\u963bBOM\u6a21\u677f", "mapping": { ... } }'],
      ["\u8bf4\u660e", "\u4fdd\u5b58\u5f53\u524d\u5b57\u6bb5\u6620\u5c04\u5173\u7cfb\u4e3a\u6a21\u677f\uff0c\u4e0b\u6b21\u5bfc\u5165\u65f6\u53ef\u76f4\u63a5\u4f7f\u7528"]
    ],
    [20, 80]
  ));

  return createDoc(
    "BOM\u7ba1\u7406\u7cfb\u7edf",
    "API\u63a5\u53e3\u89c4\u8303\u6587\u6863",
    ["\u7248\u672c: v1.0", "\u65e5\u671f: 2026-05-28"],
    children
  );
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT 6: CodingStandards
// ═══════════════════════════════════════════════════════════════

function buildCodingStandards() {
  const children = [];

  children.push(h1("1. TypeScript \u4e25\u683c\u6a21\u5f0f"));
  children.push(p("\u6240\u6709\u4ee3\u7801\u5fc5\u987b\u5728 tsconfig.json \u4e2d\u5f00\u542f strict: true\u3002\u7edd\u5bf9\u7981\u6b62\u4f7f\u7528 any \u7c7b\u578b\uff0c\u5982\u9047\u7c7b\u578b\u672a\u77e5\uff0c\u5fc5\u987b\u4f7f\u7528 unknown \u5e76\u8fdb\u884c\u7c7b\u578b\u5b88\u536b\u3002\u907f\u514d\u4f7f\u7528\u9690\u5f0f\u7684\u7c7b\u578b\u63a8\u65ad\uff0c\u51fd\u6570\u53c2\u6570\u548c\u8fd4\u56de\u503c\u5fc5\u987b\u663e\u5f0f\u58f0\u660e\u7c7b\u578b\u3002\u7981\u6b62\u4f7f\u7528 @ts-ignore \u548c @ts-nocheck\uff0c\u5fc5\u987b\u901a\u8fc7\u6b63\u786e\u7684\u7c7b\u578b\u5b9a\u4e49\u89e3\u51b3\u7c7b\u578b\u9519\u8bef\u3002\u4f18\u5148\u4f7f\u7528 interface \u5b9a\u4e49\u5bf9\u8c61\u7c7b\u578b\uff0c\u4f7f\u7528 type \u5b9a\u4e49\u8054\u5408\u7c7b\u578b\u548c\u4ea4\u53c9\u7c7b\u578b\u3002"));

  children.push(h1("2. \u547d\u540d\u89c4\u8303"));
  children.push(h2("2.1 \u57fa\u672c\u89c4\u5219"));
  children.push(makeTable(
    ["\u7c7b\u522b", "\u89c4\u5219", "\u793a\u4f8b"],
    [
      ["\u53d8\u91cf/\u51fd\u6570", "camelCase", "getBomTree, isLeafNode, componentList"],
      ["\u7c7b/\u63a5\u53e3/\u7c7b\u578b", "PascalCase", "BomTreeNode, ComponentEntity, ProjectStatus"],
      ["\u5e38\u91cf", "UPPER_SNAKE_CASE", "MAX_TREE_DEPTH, DEFAULT_PAGE_SIZE"],
      ["\u679a\u4e3e", "PascalCase + PascalCase members", "ProjectStatus { DRAFT, Active, Archived }"],
      ["\u79c1\u6709\u5c5e\u6027", "camelCase + _ \u524d\u7f00", "_internalState, _cache"]
    ],
    [20, 30, 50]
  ));

  children.push(h2("2.2 \u6587\u4ef6\u547d\u540d"));
  children.push(makeTable(
    ["\u6587\u4ef6\u7c7b\u578b", "\u547d\u540d\u89c4\u5219", "\u793a\u4f8b"],
    [
      ["Vue \u7ec4\u4ef6", "PascalCase.vue", "BomTree.vue, FieldMapper.vue, VersionDiff.vue"],
      ["Composable", "use + PascalCase.ts", "useBom.ts, useProject.ts, useImport.ts"],
      ["Service", "camelCase.service.ts", "bom.service.ts, project.service.ts"],
      ["Store", "camelCase.store.ts", "bom.store.ts, project.store.ts"],
      ["\u7c7b\u578b\u5b9a\u4e49", "camelCase.types.ts", "bom.types.ts, component.types.ts"],
      ["\u5de5\u5177\u51fd\u6570", "camelCase.ts", "format.ts, validator.ts, excelHelper.ts"],
      ["Prisma Model", "PascalCase", "Project, BomNode, Component"]
    ],
    [20, 30, 50]
  ));

  children.push(h1("3. \u67b6\u6784\u7ea2\u7ebf (AI Agent \u5f3a\u89c4\u5219)"));
  children.push(p("\u4ee5\u4e0b\u89c4\u5219\u4e3a\u67b6\u6784\u7ea7\u522b\u7684\u5f3a\u5236\u7ea6\u675f\uff0cAI Agent \u751f\u6210\u4ee3\u7801\u65f6\u5fc5\u987b\u4e25\u683c\u9075\u5b88\uff0c\u8fdd\u53cd\u5c06\u5bfc\u81f4\u4ee3\u7801\u5ba1\u67e5\u4e0d\u901a\u8fc7\uff1a"));

  children.push(h2("3.1 \u7981\u6b62\u8de8\u5c42\u8c03\u7528"));
  children.push(p(".vue \u6587\u4ef6\u4e2d\u4e25\u7981\u51fa\u73b0 prisma.xxx.findMany() \u7684\u8c03\u7528\u3002\u5fc5\u987b\u901a\u8fc7 services/ \u5c42\u5c01\u88c5\u3002\u540c\u6837\uff0c.vue \u6587\u4ef6\u4e2d\u4e25\u7981\u76f4\u63a5\u8c03\u7528 Tauri IPC \u547d\u4ee4\uff08\u5982 invoke('plugin:fs:read_file')\uff09\uff0c\u5fc5\u987b\u901a\u8fc7 Service \u5c42\u5c01\u88c5\u3002\u8fd9\u786e\u4fdd\u4e86 UI \u5c42\u4e0e\u6570\u636e\u5c42\u7684\u89e3\u8026\uff0c\u4fbf\u4e8e\u6d4b\u8bd5\u548c\u7ef4\u62a4\u3002"));

  children.push(h2("3.2 \u7981\u6b62\u786c\u7f16\u7801"));
  children.push(p("\u9b54\u6cd5\u6570\u5b57\u5fc5\u987b\u63d0\u53d6\u4e3a\u5e38\u91cf\u3002\u9519\u8bef\u5199\u6cd5\uff1aif (level > 10)\uff1b\u6b63\u786e\u5199\u6cd5\uff1aif (level > MAX_TREE_DEPTH)\u3002\u5b57\u7b26\u4e32\u5e38\u91cf\u5fc5\u987b\u63d0\u53d6\u4e3a\u679a\u4e3e\u6216\u5e38\u91cf\u3002\u9519\u8bef\u5199\u6cd5\uff1astatus === 'ACTIVE'\uff1b\u6b63\u786e\u5199\u6cd5\uff1astatus === ComponentStatus.ACTIVE\u3002API \u8def\u5f84\u5fc5\u987b\u63d0\u53d6\u4e3a\u5e38\u91cf\u3002\u9519\u8bef\u5199\u6cd5\uff1afetch('/api/v1/projects')\uff1b\u6b63\u786e\u5199\u6cd5\uff1afetch(API_BASE + API_ENDPOINTS.PROJECTS)\u3002"));

  children.push(h2("3.3 \u7ec4\u4ef6\u5355\u4e00\u804c\u8d23"));
  children.push(p("\u5355\u4e2a Vue \u7ec4\u4ef6\u4ee3\u7801\u884c\u6570\u8d85\u8fc7 300 \u884c\u65f6\uff0c\u5fc5\u987b\u8003\u8651\u62c6\u5206\u4e3a\u5b50\u7ec4\u4ef6\u3002\u6bcf\u4e2a\u7ec4\u4ef6\u53ea\u8d1f\u8d23\u4e00\u4e2a\u804c\u8d23\uff1aBomTree \u53ea\u8d1f\u8d23\u6811\u7684\u6e32\u67d3\u548c\u4ea4\u4e92\uff0cBomNodeDetail \u53ea\u8d1f\u8d23\u8282\u70b9\u8be6\u60c5\u7684\u5c55\u793a\u548c\u7f16\u8f91\u3002\u5171\u4eab\u903b\u8f91\u63d0\u53d6\u5230 composable \u4e2d\uff0c\u5982 useBom()\u3001useProject()\u3002"));

  children.push(h1("4. Vue 3 \u7ec4\u4ef6\u6a21\u5f0f"));
  children.push(h2("4.1 \u7ec4\u5408\u5f0f API \u89c4\u8303"));
  children.push(p("\u6240\u6709 Vue \u7ec4\u4ef6\u5fc5\u987b\u4f7f\u7528 <script setup lang=\"ts\"> \u8bed\u6cd5\u3002\u7ec4\u4ef6\u5185\u90e8\u903b\u8f91\u6309\u4ee5\u4e0b\u987a\u5e8f\u7ec4\u7ec7\uff1a1. Props \u5b9a\u4e49\uff08\u4f7f\u7528 withDefaults + defineProps\uff09\uff1b2. Emits \u5b9a\u4e49\uff08defineEmits\uff09\uff1b3. Composables \u5f15\u7528\uff1b4. \u54cd\u5e94\u5f0f\u6570\u636e\uff08ref/reactive/computed\uff09\uff1b5. \u65b9\u6cd5\u51fd\u6570\uff1b6. \u751f\u547d\u5468\u671f\u94a9\u5b50\uff08watch/onMounted \u7b49\uff09\u3002\u7981\u6b62\u4f7f\u7528 Options API\u3002"));

  children.push(h2("4.2 Props \u5b9a\u4e49\u89c4\u8303"));
  children.push(p("Props \u5fc5\u987b\u4f7f\u7528 TypeScript \u63a5\u53e3\u5b9a\u4e49\uff0c\u5e76\u4f7f\u7528 withDefaults \u63d0\u4f9b\u9ed8\u8ba4\u503c\u3002\u6240\u6709 Props \u5fc5\u987b\u6dfb\u52a0 JSDoc \u6ce8\u91ca\u8bf4\u660e\u7528\u9014\u3002\u7981\u6b62\u4f7f\u7528 Object \u7c7b\u578b\u7684 props \u9ed8\u8ba4\u503c\uff0c\u5fc5\u987b\u4f7f\u7528\u5de5\u5382\u51fd\u6570\u3002\u793a\u4f8b\uff1ainterface Props { nodeId: string; editable?: boolean; } const props = withDefaults(defineProps<Props>(), { editable: true });"));

  children.push(h2("4.3 \u4e8b\u4ef6\u5904\u7406\u89c4\u8303"));
  children.push(p("\u7ec4\u4ef6\u95f4\u901a\u4fe1\u4f18\u5148\u4f7f\u7528 Props + Emits \u6a21\u5f0f\u3002\u8de8\u5c42\u7ea7\u901a\u4fe1\u4f7f\u7528 Pinia Store\u3002\u5168\u5c40\u4e8b\u4ef6\u4f7f\u7528 mitt \u4e8b\u4ef6\u603b\u7ebf\uff08\u4ec5\u7528\u4e8e\u65e0\u5173\u7cfb\u6a21\u5757\u95f4\u7684\u901a\u77e5\uff09\u3002\u4e8b\u4ef6\u540d\u91c7\u7528 update:xxx / change:xxx \u683c\u5f0f\uff0c\u5982 @update:node\u3001@change:selection\u3002\u7981\u6b62\u5728\u5b50\u7ec4\u4ef6\u4e2d\u76f4\u63a5\u4fee\u6539\u7236\u7ec4\u4ef6\u7684\u72b6\u6001\u3002"));

  children.push(h1("5. Prisma \u4f7f\u7528\u89c4\u8303"));
  children.push(h2("5.1 \u67e5\u8be2\u89c4\u8303"));
  children.push(bullet("\u7981\u6b62\u5728\u4e1a\u52a1\u4ee3\u7801\u4e2d\u76f4\u63a5\u4f7f\u7528\u539f\u59cb SQL\uff0c\u5fc5\u987b\u901a\u8fc7 Prisma \u7684\u67e5\u8be2 API\u3002"));
  children.push(bullet("\u590d\u6742\u67e5\u8be2\u5fc5\u987b\u5c01\u88c5\u5728 Service \u5c42\uff0c\u4e0d\u5f97\u5728 UI \u5c42\u6784\u5efa\u67e5\u8be2\u6761\u4ef6\u3002"));
  children.push(bullet("\u6279\u91cf\u64cd\u4f5c\u5fc5\u987b\u4f7f\u7528 Prisma \u7684 createMany/updateMany/deleteMany\uff0c\u7981\u6b62\u5728\u5faa\u73af\u4e2d\u9010\u6761\u64cd\u4f5c\u3002"));
  children.push(bullet("\u4e8b\u52a1\u64cd\u4f5c\u5fc5\u987b\u4f7f\u7528 prisma.$transaction()\uff0c\u786e\u4fdd\u6570\u636e\u4e00\u81f4\u6027\u3002"));
  children.push(bullet("\u8f6f\u5220\u9664\u67e5\u8be2\u5fc5\u987b\u5305\u542b where: { deletedAt: null } \u6761\u4ef6\u3002"));

  children.push(h2("5.2 \u8fc1\u79fb\u89c4\u8303"));
  children.push(bullet("\u6bcf\u6b21 schema \u53d8\u66f4\u540e\u5fc5\u987b\u6267\u884c npx prisma migrate dev --name {description}\u3002"));
  children.push(bullet("\u8fc1\u79fb\u540d\u79f0\u4f7f\u7528\u63cf\u8ff0\u6027\u82f1\u6587\uff0c\u5982 add_audit_log_table\u3001add_deleted_at_to_project\u3002"));
  children.push(bullet("\u7981\u6b62\u4fee\u6539\u5df2\u6267\u884c\u7684\u8fc1\u79fb\u6587\u4ef6\uff0c\u5fc5\u987b\u521b\u5efa\u65b0\u7684\u8fc1\u79fb\u3002"));
  children.push(bullet("\u6570\u636e\u8fc1\u79fb\u5fc5\u987b\u5728\u8fc1\u79fb\u6587\u4ef6\u4e2d\u5904\u7406\uff0c\u4e0d\u5f97\u4f7f\u7528\u79cd\u5b50\u811a\u672c\u4fee\u6539\u751f\u4ea7\u6570\u636e\u3002"));

  children.push(h1("6. Tauri IPC \u89c4\u8303"));
  children.push(h2("6.1 \u547d\u4ee4\u5b9a\u4e49\u89c4\u8303"));
  children.push(p("Rust \u4fa7\u547d\u4ee4\u5fc5\u987b\u4f7f\u7528 #[tauri::command] \u5b8f\u6807\u8bb0\uff0c\u53c2\u6570\u548c\u8fd4\u56de\u503c\u5fc5\u987b\u4f7f\u7528 serde \u5e8f\u5217\u5316\u7684\u7c7b\u578b\u3002\u6240\u6709\u547d\u4ee4\u5fc5\u987b\u5728 src-tauri/src/commands/ \u76ee\u5f55\u4e0b\u5b9a\u4e49\uff0c\u6309\u6a21\u5757\u5206\u6587\u4ef6\u7ec4\u7ec7\uff08fs.rs\u3001bom.rs\u3001db.rs\uff09\u3002\u524d\u7aef\u8c03\u7528\u5fc5\u987b\u901a\u8fc7 Service \u5c42\u5c01\u88c5\uff0c\u7981\u6b62\u5728 .vue \u6587\u4ef6\u4e2d\u76f4\u63a5\u8c03\u7528 invoke()\u3002"));

  children.push(h2("6.2 \u7c7b\u578b\u540c\u6b65"));
  children.push(p("\u524d\u540e\u7aef\u7684\u6570\u636e\u7c7b\u578b\u5fc5\u987b\u4fdd\u6301\u4e00\u81f4\u3002TypeScript \u4fa7\u5b9a\u4e49\u8bf7\u6c42/\u54cd\u5e94\u63a5\u53e3\uff0cRust \u4fa7\u5b9a\u4e49\u5bf9\u5e94\u7684 struct\u3002\u5efa\u8bae\u4f7f\u7528 ts-rs \u6216\u7c7b\u4f3c\u5de5\u5177\u81ea\u52a8\u4ece Rust \u7c7b\u578b\u751f\u6210 TypeScript \u63a5\u53e3\u5b9a\u4e49\uff0c\u907f\u514d\u624b\u52a8\u7ef4\u62a4\u4e24\u5957\u7c7b\u578b\u3002\u6240\u6709 IPC \u547d\u4ee4\u7684\u53c2\u6570\u548c\u8fd4\u56de\u503c\u5fc5\u987b\u6709\u5bf9\u5e94\u7684 TypeScript \u7c7b\u578b\u5b9a\u4e49\u6587\u4ef6\u3002"));

  children.push(h1("7. \u9519\u8bef\u5904\u7406\u89c4\u8303"));
  children.push(h2("7.1 \u5f02\u6b65\u64cd\u4f5c"));
  children.push(p("\u6240\u6709\u6d89\u53ca\u5f02\u6b65\u64cd\u4f5c\uff08Prisma \u67e5\u8be2\u3001\u6587\u4ef6\u8bfb\u53d6\u3001IPC \u8c03\u7528\uff09\u7684\u4ee3\u7801\uff0c\u5fc5\u987b\u4f7f\u7528 try-catch \u5305\u88f9\u3002\u6355\u83b7\u5230\u9519\u8bef\u65f6\uff0c\u5fc5\u987b\u4f7f\u7528 console.error \u8bb0\u5f55\u5b8c\u6574\u5806\u6808\uff0c\u5e76\u901a\u8fc7 UI \u6846\u67b6\uff08\u5982 ElMessage\uff09\u5411\u7528\u6237\u5c55\u793a\u53cb\u597d\u7684\u9519\u8bef\u63d0\u793a\uff0c\u7981\u6b62\u76f4\u63a5 alert()\u3002\u5728 Service \u5c42\u6355\u83b7\u5e95\u5c42\u5f02\u5e38\u5e76\u8f6c\u6362\u4e3a\u4e1a\u52a1\u9519\u8bef\u7801\uff0c\u5728 UI \u5c42\u6355\u83b7 Service \u5c42\u629b\u51fa\u7684\u4e1a\u52a1\u9519\u8bef\u5e76\u5c55\u793a\u3002"));

  children.push(h2("7.2 \u9519\u8bef\u8fb9\u754c"));
  children.push(p("Service \u5c42\u662f\u9519\u8bef\u5904\u7406\u7684\u6838\u5fc3\u8fb9\u754c\u3002DAL \u5c42\u6355\u83b7\u7684 Prisma \u5f02\u5e38\u5fc5\u987b\u5728 Service \u5c42\u8f6c\u6362\u4e3a\u4e1a\u52a1\u9519\u8bef\uff0c\u4e0d\u5f97\u5411\u4e0a\u5c42\u900f\u4f20\u5e95\u5c42\u5f02\u5e38\u3002IPC \u5c42\u6355\u83b7\u7684\u7f51\u7edc/\u7cfb\u7edf\u5f02\u5e38\u5fc5\u987b\u5728 Service \u5c42\u8f6c\u6362\u4e3a\u7528\u6237\u53ef\u7406\u89e3\u7684\u63d0\u793a\u3002UI \u5c42\u53ea\u5904\u7406 Service \u5c42\u629b\u51fa\u7684\u4e1a\u52a1\u9519\u8bef\uff0c\u4e0d\u5904\u7406\u5e95\u5c42\u5f02\u5e38\u3002"));

  children.push(h1("8. \u6d4b\u8bd5\u89c4\u8303"));
  children.push(h2("8.1 \u6d4b\u8bd5\u8986\u76d6\u7387\u8981\u6c42"));
  children.push(makeTable(
    ["\u5c42\u7ea7", "\u6700\u4f4e\u8986\u76d6\u7387", "\u91cd\u70b9\u6d4b\u8bd5\u5185\u5bb9"],
    [
      ["Service \u5c42", "80%", "\u4e1a\u52a1\u89c4\u5219\u3001\u6570\u636e\u6821\u8bc1\u3001\u9519\u8bef\u5904\u7406"],
      ["Composable", "70%", "\u72b6\u6001\u7ba1\u7406\u3001\u5f02\u6b65\u64cd\u4f5c\u3001\u8fb9\u754c\u6761\u4ef6"],
      ["\u7ec4\u4ef6", "60%", "\u7528\u6237\u4ea4\u4e92\u3001\u4e8b\u4ef6\u89e6\u53d1\u3001Props \u4f20\u9012"],
      ["E2E", "\u6838\u5fc3\u6d41\u7a0b", "\u5bfc\u5165\u6d41\u7a0b\u3001BOM \u7f16\u8f91\u6d41\u7a0b\u3001\u7248\u672c\u7ba1\u7406\u6d41\u7a0b"]
    ],
    [20, 20, 60]
  ));

  children.push(h2("8.2 \u6d4b\u8bd5\u547d\u540d\u89c4\u8303"));
  children.push(p("\u6d4b\u8bd5\u6587\u4ef6\u547d\u540d\uff1a{sourceFile}.test.ts\uff0c\u4e0e\u6e90\u6587\u4ef6\u540c\u76ee\u5f55\u6216 __tests__ \u76ee\u5f55\u3002\u6d4b\u8bd5\u7528\u4f8b\u547d\u540d\uff1adescribe('{\u6a21\u5757\u540d}') + it('should {expected behavior} when {condition}')\u3002\u793a\u4f8b\uff1adescribe('BomService') + it('should reject adding node when level exceeds max depth')\u3002\u6bcf\u4e2a\u6d4b\u8bd5\u7528\u4f8b\u5fc5\u987b\u5305\u542b Arrange-Act-Assert \u4e09\u6bb5\u5f0f\u7ed3\u6784\u3002"));

  children.push(h1("9. Git \u63d0\u4ea4\u89c4\u8303"));
  children.push(h2("9.1 Commit Message \u89c4\u8303"));
  children.push(p("Git Commit Message \u9075\u5faa Angular \u89c4\u8303\uff0c\u683c\u5f0f\u4e3a\uff1a<type>(<scope>): <subject>\u3002\u5176\u4e2d type \u5305\u62ec\uff1afeat\uff08\u65b0\u529f\u80fd\uff09\u3001fix\uff08\u4fee\u590d\uff09\u3001refactor\uff08\u91cd\u6784\uff09\u3001docs\uff08\u6587\u6863\uff09\u3001test\uff08\u6d4b\u8bd5\uff09\u3001chore\uff08\u6784\u5efa/\u5de5\u5177\uff09\u3002scope \u4e3a\u5f71\u54cd\u7684\u6a21\u5757\uff0c\u5982 bom\u3001project\u3001import\u3002subject \u4f7f\u7528\u82f1\u6587\uff0c\u4e0d\u8d85\u8fc7 72 \u5b57\u7b26\u3002\u793a\u4f8b\uff1afeat(bom): add node drag-and-drop sorting support\u3001fix(import): resolve Excel date field parsing error\u3002"));

  children.push(h2("9.2 \u5206\u652f\u89c4\u8303"));
  children.push(makeTable(
    ["\u5206\u652f\u7c7b\u578b", "\u547d\u540d\u89c4\u5219", "\u793a\u4f8b"],
    [
      ["\u4e3b\u5206\u652f", "main", "main"],
      ["\u5f00\u53d1\u5206\u652f", "develop", "develop"],
      ["\u529f\u80fd\u5206\u652f", "feature/{description}", "feature/bom-tree-editor"],
      ["\u4fee\u590d\u5206\u652f", "fix/{description}", "fix/excel-import-validation"],
      ["\u53d1\u5e03\u5206\u652f", "release/{version}", "release/v1.0.0"]
    ],
    [20, 35, 45]
  ));

  children.push(h1("10. AI Agent \u63d0\u793a\u8bcd\u89c4\u8303"));
  children.push(h2("10.1 \u4ee3\u7801\u751f\u6210\u63d0\u793a\u8bcd\u6a21\u677f"));
  children.push(p("\u5f53\u4f7f\u7528 AI Agent \u751f\u6210\u4ee3\u7801\u65f6\uff0c\u5efa\u8bae\u4f7f\u7528\u4ee5\u4e0b\u63d0\u793a\u8bcd\u6a21\u677f\uff0c\u786e\u4fdd\u751f\u6210\u7684\u4ee3\u7801\u7b26\u5408\u672c\u9879\u76ee\u89c4\u8303\uff1a"));
  children.push(pNoIndent("\u3010\u6a21\u677f\u3011"));
  children.push(pNoIndent("\u8bf7\u6839\u636e BOMMaster \u9879\u76ee\u89c4\u8303\u751f\u6210\u4ee3\u7801\uff1a"));
  children.push(pNoIndent("1. \u4f7f\u7528 TypeScript strict \u6a21\u5f0f\uff0c\u7981\u6b62 any \u7c7b\u578b"));
  children.push(pNoIndent("2. \u9075\u5faa\u5206\u5c42\u67b6\u6784\uff1aUI \u2192 Service \u2192 DAL\uff0c\u7981\u6b62\u8de8\u5c42\u8c03\u7528"));
  children.push(pNoIndent("3. Vue \u7ec4\u4ef6\u4f7f\u7528 <script setup lang=\"ts\">"));
  children.push(pNoIndent("4. \u6570\u636e\u5e93\u64cd\u4f5c\u901a\u8fc7 Prisma ORM\uff0c\u7981\u6b62\u539f\u59cb SQL"));
  children.push(pNoIndent("5. \u6240\u6709\u5f02\u6b65\u64cd\u4f5c\u4f7f\u7528 try-catch\uff0c\u9519\u8bef\u901a\u8fc7 ElMessage \u5c55\u793a"));
  children.push(pNoIndent("6. \u5e38\u91cf\u63d0\u53d6\uff0c\u7981\u6b62\u786c\u7f16\u7801"));
  children.push(pNoIndent("\u3010\u4efb\u52a1\u3011{specific task description}"));
  children.push(pNoIndent("\u3010\u53c2\u8003\u6587\u6863\u3011{relevant doc sections}"));

  children.push(h2("10.2 \u6a21\u5757\u751f\u6210\u6307\u5f15"));
  children.push(makeTable(
    ["\u751f\u6210\u76ee\u6807", "\u5fc5\u987b\u53c2\u8003\u7684\u6587\u6863", "\u5173\u952e\u7ea6\u675f"],
    [
      ["\u6570\u636e\u5e93\u8868/\u8fc1\u79fb", "\u6570\u636e\u5e93\u8bbe\u8ba1\u6587\u6863 \u00a72-\u00a75", "Prisma Schema\u3001\u7d22\u5f15\u3001\u8fc1\u79fb\u89c4\u8303"],
      ["Service \u5c42\u4e1a\u52a1\u903b\u8f91", "PRD \u00a72 + \u67b6\u6784\u6587\u6863 \u00a73", "\u5206\u5c42\u8c03\u7528\u3001\u9519\u8bef\u5904\u7406\u3001\u4e8b\u52a1\u7ba1\u7406"],
      ["API \u63a5\u53e3", "API\u89c4\u8303\u6587\u6863 \u00a72-\u00a77", "\u7edf\u4e00\u54cd\u5e94\u683c\u5f0f\u3001\u9519\u8bef\u7801\u3001\u5206\u9875"],
      ["Vue \u7ec4\u4ef6", "PRD \u00a72 + \u7f16\u7801\u89c4\u8303 \u00a74", "script setup\u3001Props \u89c4\u8303\u3001\u5355\u4e00\u804c\u8d23"],
      ["Tauri IPC \u547d\u4ee4", "\u67b6\u6784\u6587\u6863 \u00a75 + \u7f16\u7801\u89c4\u8303 \u00a76", "\u7c7b\u578b\u540c\u6b65\u3001\u5b89\u5168\u6c99\u7bb1\u3001\u547d\u4ee4\u547d\u540d"],
      ["Pinia Store", "\u67b6\u6784\u6587\u6863 \u00a76", "\u72b6\u6001\u4e0e\u64cd\u4f5c\u5206\u79bb\u3001\u5f02\u6b65\u64cd\u4f5c\u89c4\u8303"]
    ],
    [20, 35, 45]
  ));

  return createDoc(
    "BOM\u7ba1\u7406\u7cfb\u7edf",
    "\u7f16\u7801\u4e0eAI Agent\u63d0\u793a\u8bcd\u89c4\u8303",
    ["\u7248\u672c: v1.0", "\u65e5\u671f: 2026-05-28"],
    children
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════

async function main() {
  const outDir = "/home/z/my-project/download";

  await saveDoc(buildPRD(), `${outDir}/BOMMaster_\u4ea7\u54c1\u9700\u6c42\u6587\u6863_PRD.docx`);
  await saveDoc(buildTechStack(), `${outDir}/BOMMaster_\u6280\u672f\u6808\u9009\u578b\u6587\u6863_TechStack.docx`);
  await saveDoc(buildArchitecture(), `${outDir}/BOMMaster_\u7cfb\u7edf\u67b6\u6784\u8bbe\u8ba1\u6587\u6863_Architecture.docx`);
  await saveDoc(buildDatabaseDesign(), `${outDir}/BOMMaster_\u6570\u636e\u5e93\u8bbe\u8ba1\u6587\u6863_DatabaseDesign.docx`);
  await saveDoc(buildAPISpec(), `${outDir}/BOMMaster_API\u63a5\u53e3\u89c4\u8303\u6587\u6863_APISpec.docx`);
  await saveDoc(buildCodingStandards(), `${outDir}/BOMMaster_\u7f16\u7801\u4e0eAI_Agent\u63d0\u793a\u8bcd\u89c4\u8303_CodingStandards.docx`);

  console.log("\nAll 6 documents generated successfully!");
}

main().catch(console.error);
