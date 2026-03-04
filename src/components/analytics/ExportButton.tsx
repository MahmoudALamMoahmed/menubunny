import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Download, FileImage, FileText, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ExportButtonProps {
  targetRef: React.RefObject<HTMLDivElement>;
  restaurantName?: string;
}

export default function ExportButton({ targetRef, restaurantName }: ExportButtonProps) {
  const [exporting, setExporting] = useState<'image' | 'pdf' | null>(null);

  const getFileName = (ext: string) => {
    const date = new Date().toISOString().slice(0, 10);
    const name = restaurantName?.replace(/\s+/g, '-') || 'analytics';
    return `${name}-report-${date}.${ext}`;
  };

  const captureCanvas = async () => {
    if (!targetRef.current) {
      console.error('Export: targetRef.current is null');
      throw new Error('No target element');
    }

    const el = targetRef.current;
    console.log('Export: element found', el.scrollWidth, 'x', el.scrollHeight);

    // Wait for fonts
    await document.fonts.ready;

    // Give browser a frame to settle
    await new Promise(r => setTimeout(r, 500));

    // Convert all SVGs inside the target to canvas elements for reliable capture
    const svgs = el.querySelectorAll('svg');
    console.log('Export: found', svgs.length, 'SVGs');

    const canvas = await html2canvas(el, {
      scale: 1.5,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: true, // enable logging temporarily for debug
    });

    console.log('Export: canvas generated', canvas.width, 'x', canvas.height);

    if (!canvas.width || !canvas.height) {
      throw new Error('Empty canvas generated');
    }

    return canvas;
  };

  const exportAsImage = async () => {
    setExporting('image');
    try {
      const canvas = await captureCanvas();
      const link = document.createElement('a');
      link.download = getFileName('png');
      link.href = canvas.toDataURL('image/png', 1.0);
      link.click();
      toast.success('تم تصدير التقرير كصورة بنجاح');
    } catch (err) {
      console.error('Export image error:', err);
      toast.error('حدث خطأ أثناء تصدير الصورة');
    } finally {
      setExporting(null);
    }
  };

  const exportAsPDF = async () => {
    setExporting('pdf');
    try {
      const canvas = await captureCanvas();
      

      const imgWidth = canvas.width;
      const imgHeight = canvas.height;

      // A4 dimensions in mm
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 10;
      const contentWidth = pdfWidth - margin * 2;

      const scaledHeight = (imgHeight * contentWidth) / imgWidth;

      const pdf = new jsPDF({
        orientation: scaledHeight > pdfHeight ? 'portrait' : 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      // If content is taller than one page, split across pages
      const pageContentHeight = pdfHeight - margin * 2;
      let remainingHeight = scaledHeight;
      let sourceY = 0;
      let page = 0;

      while (remainingHeight > 0) {
        if (page > 0) {
          pdf.addPage();
        }

        const sliceHeight = Math.min(remainingHeight, pageContentHeight);
        const sourceSliceHeight = (sliceHeight / scaledHeight) * imgHeight;

        // Create a temporary canvas for this slice
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = imgWidth;
        sliceCanvas.height = sourceSliceHeight;
        const ctx = sliceCanvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(
            canvas,
            0, sourceY, imgWidth, sourceSliceHeight,
            0, 0, imgWidth, sourceSliceHeight
          );
        }

        const sliceData = sliceCanvas.toDataURL('image/png', 1.0);
        pdf.addImage(sliceData, 'PNG', margin, margin, contentWidth, sliceHeight);

        sourceY += sourceSliceHeight;
        remainingHeight -= sliceHeight;
        page++;
      }

      pdf.save(getFileName('pdf'));
      toast.success('تم تصدير التقرير كملف PDF بنجاح');
    } catch (err) {
      console.error('Export PDF error:', err);
      toast.error('حدث خطأ أثناء تصدير الملف');
    } finally {
      setExporting(null);
    }
  };

  const isExporting = exporting !== null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" disabled={isExporting} className="flex items-center gap-2">
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          {isExporting
            ? exporting === 'pdf' ? 'جاري تصدير PDF...' : 'جاري تصدير الصورة...'
            : 'تصدير التقرير'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={exportAsImage} className="flex items-center gap-2 cursor-pointer">
          <FileImage className="w-4 h-4" />
          تصدير كصورة (PNG)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={exportAsPDF} className="flex items-center gap-2 cursor-pointer">
          <FileText className="w-4 h-4" />
          تصدير كملف PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
