import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { X, Download, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../lib/utils';

interface QrModalProps {
  isOpen: boolean;
  onClose: () => void;
  url: string;
  shortCode: string;
}

export const QrModal: React.FC<QrModalProps> = ({ isOpen, onClose, url, shortCode }) => {
  const [copied, setCopied] = React.useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(url);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadPng = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    canvas.width = 512;
    canvas.height = 512;

    img.onload = () => {
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 32, 32, 448, 448);
        const pngFile = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `mini-url-qr-${shortCode}.png`;
        downloadLink.href = pngFile;
        downloadLink.click();
      }
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-forest-950/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-sm rounded-2xl bg-forest-900 border border-palette-sage/25 p-6 shadow-2xl space-y-5 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-palette-sage/70 hover:text-white hover:bg-forest-800 transition-colors touch-manipulation"
        >
          <X className="h-4 w-4" />
        </button>

        <div>
          <h3 className="text-lg font-bold text-white">Dynamic QR Code</h3>
          <p className="text-xs text-palette-mint font-mono mt-0.5 truncate">{url}</p>
        </div>

        {/* QR Code Container */}
        <div className="flex justify-center p-4 bg-white rounded-xl shadow-inner max-w-[240px] mx-auto border-4 border-palette-mint/30">
          <QRCodeSVG
            ref={svgRef}
            value={url}
            size={200}
            level="H"
            includeMargin={true}
            fgColor="#060a07"
            bgColor="#ffffff"
          />
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={handleDownloadPng}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-bold text-forest-950 bg-gradient-to-r from-palette-emerald via-palette-mint to-palette-cream hover:opacity-95 transition-all shadow-sm touch-manipulation cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download PNG</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-lg text-xs font-bold text-palette-cream bg-forest-950 hover:bg-forest-800 border border-palette-sage/25 transition-colors touch-manipulation"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-palette-mint" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
