import { QRCodeSVG } from 'qrcode.react';
import { LanyardTemplate, LanyardBlock, LanyardPreviewData } from "@/types/lanyard-template";

interface LanyardPreviewProps {
  template: LanyardTemplate;
  previewData: LanyardPreviewData;
  scale?: number;
  className?: string;
}

export const LanyardPreview = ({
  template,
  previewData,
  scale = 1,
  className = ""
}: LanyardPreviewProps) => {
  const { dimensions, background, blocks } = template;

  const width = dimensions.width * scale * 3; // 3px per mm for good resolution
  const height = dimensions.height * scale * 3;

  const renderBlock = (block: LanyardBlock) => {
    const blockStyle = {
      position: 'absolute' as const,
      left: `${block.position.x}%`,
      top: `${block.position.y}%`,
      width: `${block.size.width}%`,
      height: `${block.size.height}%`,
      fontSize: `${(block.style.fontSize || 12) * scale}px`,
      fontWeight: block.style.fontWeight || 'normal',
      color: block.style.color || '#000000',
      textAlign: block.style.textAlign || 'center',
      backgroundColor: block.style.backgroundColor === 'transparent' ? 'transparent' : (block.style.backgroundColor || 'transparent'),
      borderRadius: `${(block.style.borderRadius || 0) * scale}px`,
      padding: `${(block.style.padding || 4) * scale}px`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: block.style.textAlign === 'left' ? 'flex-start' :
                     block.style.textAlign === 'right' ? 'flex-end' : 'center',
      overflow: 'hidden',
      boxSizing: 'border-box' as const,
      fontFamily: '"Manrope", sans-serif',
      lineHeight: '1.2'
    };

    const getBlockContent = () => {
      switch (block.type) {
        case 'attendee_name':
          const nameBlock = block as any;
          if (nameBlock.customFormat) {
            return nameBlock.customFormat
              .replace('@FirstName', previewData.attendeeName.split(' ')[0] || '')
              .replace('@LastName', previewData.attendeeName.split(' ').slice(1).join(' ') || '')
              .replace('@FullName', previewData.attendeeName);
          }
          return previewData.attendeeName;

        case 'event_title':
          return (block as any).customText || previewData.eventTitle;

        case 'event_date':
          const dateBlock = block as any;
          const eventDate = new Date(previewData.eventDate);
          if (dateBlock.dateFormat === 'short') {
            return eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
          } else if (dateBlock.dateFormat === 'long') {
            return eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
          }
          return previewData.eventDate;

        case 'event_time':
          const timeBlock = block as any;
          const eventTime = new Date(`2024-01-01 ${previewData.eventTime}`);
          if (timeBlock.timeFormat === '24h') {
            return eventTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
          }
          return previewData.eventTime;

        case 'ticket_type':
          const ticketBlock = block as any;
          return `${ticketBlock.customPrefix || ''}${previewData.ticketType}`.trim();

        case 'qr_code':
          return null; // Handled separately

        case 'organization_logo':
          const orgBlock = block as any;
          return previewData.organizationLogo ? null : (orgBlock.fallbackText || 'ORG LOGO');

        case 'event_logo':
          const eventBlock = block as any;
          return previewData.eventLogo ? null : (eventBlock.fallbackText || 'EVENT LOGO');

        case 'special_access':
          const accessBlock = block as any;
          if (accessBlock.showOnlyForVIP && !previewData.ticketType.toLowerCase().includes('vip')) {
            return '';
          }
          return accessBlock.accessText || previewData.specialAccess || 'SPECIAL ACCESS';

        case 'custom_text':
          return (block as any).text || 'Custom Text';

        case 'divider_line':
          return null; // Handled separately

        default:
          return 'Block';
      }
    };

    // Handle divider line
    if (block.type === 'divider_line') {
      return (
        <div
          key={block.id}
          style={{
            position: 'absolute',
            left: `${block.position.x}%`,
            top: `${block.position.y}%`,
            width: `${block.size.width}%`,
            height: `${((block as any).lineThickness || 1) * scale}px`,
            backgroundColor: (block as any).lineColor || '#e2e8f0',
            borderRadius: `${(block.style.borderRadius || 0) * scale}px`
          }}
        />
      );
    }

    // Handle QR code
    if (block.type === 'qr_code') {
      const qrData = (block as any).includeTicketCode ?
        `${previewData.ticketCode}|${previewData.attendeeName}|${previewData.eventTitle}` :
        previewData.ticketCode;

      return (
        <div key={block.id} style={blockStyle}>
          <QRCodeSVG
            value={qrData}
            size={(block as any).qrSize || Math.min(blockStyle.width as number, blockStyle.height as number)}
            level="M"
            includeMargin={false}
            style={{
              width: '100%',
              height: '100%',
              maxWidth: '100%',
              maxHeight: '100%'
            }}
          />
        </div>
      );
    }

    // Handle logos
    if (block.type === 'organization_logo' && previewData.organizationLogo) {
      return (
        <div key={block.id} style={blockStyle}>
          <img
            src={previewData.organizationLogo}
            alt="Organization Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      );
    }

    if (block.type === 'event_logo' && previewData.eventLogo) {
      return (
        <div key={block.id} style={blockStyle}>
          <img
            src={previewData.eventLogo}
            alt="Event Logo"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain'
            }}
          />
        </div>
      );
    }

    const content = getBlockContent();
    if (!content) return null;

    return (
      <div key={block.id} style={blockStyle}>
        <span style={{
          fontSize: 'inherit',
          fontWeight: 'inherit',
          wordBreak: 'break-word',
          hyphens: 'auto'
        }}>
          {content}
        </span>
      </div>
    );
  };

  return (
    <div
      className={`relative border-2 border-gray-200 shadow-lg bg-white ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        backgroundColor: background.color || '#ffffff',
        backgroundImage: background.imageUrl ? `url(${background.imageUrl})` : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        fontFamily: '"Manrope", sans-serif'
      }}
    >
      {blocks.map(renderBlock)}

      {/* Lanyard hole simulation */}
      <div
        style={{
          position: 'absolute',
          top: '8px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: '#f0f0f0',
          border: '2px solid #ddd',
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)'
        }}
      />
    </div>
  );
};

export default LanyardPreview;