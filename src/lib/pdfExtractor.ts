import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

export interface ExtractedDocumentContent {
  extractedText: string;
  images: Array<{ data: string; mimeType: string }>;
  pageCount: number;
  sourceKind: 'pdf-text' | 'pdf-scanned' | 'image';
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error(`Falha ao ler o arquivo "${file.name}".`));
    reader.readAsDataURL(file);
  });
}

async function extractFromPdfFile(file: File): Promise<ExtractedDocumentContent> {
  const buffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: new Uint8Array(buffer) });
  const pdf = await loadingTask.promise;
  const pageCount = pdf.numPages;

  const textParts: string[] = [];
  for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const lines: string[] = [];
    let currentLine = '';
    let lastY: number | null = null;

    for (const item of content.items) {
      if (!('str' in item)) continue;
      const y = Array.isArray(item.transform) ? item.transform[5] : null;
      if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
        if (currentLine.trim()) lines.push(currentLine.trim());
        currentLine = item.str;
      } else {
        currentLine += (currentLine && item.str && !currentLine.endsWith(' ') && !item.str.startsWith(' ') ? ' ' : '') + item.str;
      }
      if (y !== null) lastY = y;
    }
    if (currentLine.trim()) lines.push(currentLine.trim());
    const pageText = lines.join('\n').trim();
    if (pageText) {
      textParts.push(pageCount > 1 ? `--- Página ${pageNum} ---\n${pageText}` : pageText);
    }
  }

  const combinedText = textParts.join('\n\n').trim();
  if (combinedText.length >= 40) {
    return {
      extractedText: combinedText,
      images: [],
      pageCount,
      sourceKind: 'pdf-text',
    };
  }

  // PDF escaneado / baseado em imagens: renderizar até 5 páginas para visão da IA
  const maxPages = Math.min(pageCount, 5);
  const images: Array<{ data: string; mimeType: string }> = [];
  for (let pageNum = 1; pageNum <= maxPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.75 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.86);
    images.push({ data: dataUrl, mimeType: 'image/jpeg' });
  }

  if (images.length === 0) {
    throw new Error('Não foi possível ler o texto nem renderizar páginas deste PDF.');
  }

  return {
    extractedText: combinedText,
    images,
    pageCount,
    sourceKind: 'pdf-scanned',
  };
}

/**
 * Extrai texto (para PDFs digitais) ou imagens de páginas/fotos (para PDFs escaneados, JPG/PNG/WEBP)
 * para processamento posterior pela IA na geração do cardápio do paciente.
 */
export async function extractPdfOrImages(files: FileList | File[]): Promise<ExtractedDocumentContent> {
  const list = Array.from(files);
  if (list.length === 0) {
    throw new Error('Nenhum arquivo selecionado.');
  }

  const first = list[0];
  const isPdf = first.type === 'application/pdf' || first.name.toLowerCase().endsWith('.pdf');
  if (isPdf) {
    return extractFromPdfFile(first);
  }

  const imageFiles = list.filter(
    (f) => f.type.startsWith('image/') || /\.(png|jpe?g|webp|gif)$/i.test(f.name)
  ).slice(0, 6);

  if (imageFiles.length === 0) {
    throw new Error('Formato não suportado. Selecione um arquivo PDF ou uma imagem (JPG, PNG, WEBP).');
  }

  const images: Array<{ data: string; mimeType: string }> = [];
  for (const img of imageFiles) {
    const dataUrl = await fileToDataUrl(img);
    if (dataUrl) {
      images.push({ data: dataUrl, mimeType: img.type || 'image/jpeg' });
    }
  }

  return {
    extractedText: '',
    images,
    pageCount: images.length,
    sourceKind: 'image',
  };
}
