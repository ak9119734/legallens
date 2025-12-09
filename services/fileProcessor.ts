import { getDocument, GlobalWorkerOptions, version } from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set the worker source to the same version as the library from CDN
// This is critical for pdfjs-dist to work in the browser without a bundler
GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version || '4.0.379'}/build/pdf.worker.min.mjs`;

export const extractTextFromFile = async (file: File): Promise<string> => {
  return new Promise(async (resolve, reject) => {
    try {
      console.log(`Processing file: ${file.name} (${file.type})`);

      // 1. Handle Plain Text / Markdown
      if (file.type === 'text/plain' || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(new Error("Failed to read text file"));
        reader.readAsText(file);
        return;
      }

      // 2. Handle PDF
      if (file.type === 'application/pdf') {
        try {
          const arrayBuffer = await file.arrayBuffer();
          // Load the PDF document
          const loadingTask = getDocument({ data: arrayBuffer });
          const pdf = await loadingTask.promise;
          
          let fullText = '';

          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              // @ts-ignore - str exists on TextItem
              .map((item: any) => item.str)
              .join(' ');
            fullText += `--- Page ${i} ---\n${pageText}\n\n`;
          }

          // Check if text extraction yielded results (if not, it might be a scan)
          if (fullText.replace(/\s/g, '').length < 50) {
             console.warn("PDF has little to no text, assuming scanned image.");
             throw new Error("Scanned PDF detected"); 
          }

          resolve(fullText);
        } catch (error) {
           console.warn("PDF Text extraction failed or scanned PDF detected. Note: Client-side OCR for full PDF pages is heavy and limited in this demo.", error);
           // In a full production app, we would render PDF pages to canvas and OCR them.
           reject(new Error("Could not extract text from PDF. It might be a scanned image or password protected."));
        }
        return;
      }

      // 3. Handle Images (OCR)
      if (file.type.startsWith('image/')) {
         try {
           console.log("Starting OCR...");
           const result = await Tesseract.recognize(
             file,
             'eng',
             { logger: m => console.log(m) }
           );
           resolve(result.data.text);
         } catch (error) {
           console.error("OCR Error:", error);
           reject(new Error("OCR processing failed."));
         }
         return;
      }

      reject(new Error("Unsupported file type. Please use .txt, .pdf, .jpg, or .png."));
    } catch (e) {
      console.error("File processing error:", e);
      reject(e);
    }
  });
};