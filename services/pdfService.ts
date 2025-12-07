
export const loadScript = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = reject;
    document.body.appendChild(script);
  });
};

// Function to generate canvas from element
const getCanvas = async (element: HTMLElement) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js');
  
  // @ts-ignore
  const html2canvas = window.html2canvas;
  
  // Wait for rendering stability
  await new Promise(resolve => setTimeout(resolve, 500));

  return await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
  });
};

// Function to create PDF object
const createJsPDF = async (canvas: HTMLCanvasElement) => {
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js');
  
  // @ts-ignore
  const { jsPDF } = window.jspdf;

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pdfWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
  heightLeft -= pdfHeight;

  while (heightLeft >= 0) {
    position = heightLeft - imgHeight;
    pdf.addPage();
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;
  }
  
  return pdf;
};

// 1. Save Single PDF directly
export const generatePDF = async (element: HTMLElement, fileName: string) => {
  try {
    const canvas = await getCanvas(element);
    const pdf = await createJsPDF(canvas);
    pdf.save(fileName);
  } catch (error) {
    console.error("Error generating PDF:", error);
    throw error;
  }
};

// 2. Return PDF as Blob (for ZIP/Bulk)
export const generatePDFBlob = async (element: HTMLElement): Promise<Blob> => {
  try {
    const canvas = await getCanvas(element);
    const pdf = await createJsPDF(canvas);
    return pdf.output('blob');
  } catch (error) {
    console.error("Error generating PDF Blob:", error);
    throw error;
  }
};

// 3. Helper to load ZIP library
export const loadZipLibrary = async () => {
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
    await loadScript('https://cdnjs.cloudflare.com/ajax/libs/FileSaver.js/2.0.5/FileSaver.min.js');
};
