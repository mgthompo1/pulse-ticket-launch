import React from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { LanyardTemplate, LanyardBlock, LanyardPreviewData } from "@/types/lanyard-template";

interface LanyardPreviewProps {
  template: LanyardTemplate;
  previewData: LanyardPreviewData;
  scale?: number;
  className?: string;
}

export const LanyardPreviewSimple: React.FC<LanyardPreviewProps> = ({
  template,
  previewData,
  scale = 1,
  className = ""
}) => {
  const { dimensions, background, blocks } = template;

  // Base dimensions in pixels (3px per mm is good for screen display)
  const baseScale = 3;
  const width = dimensions.width * baseScale * scale;
  const height = dimensions.height * baseScale * scale;

  const renderBlock = (block: LanyardBlock) => {
    const blockStyle: React.CSSProperties = {
      position: 'absolute',
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
      boxSizing: 'border-box',
      fontFamily: '"Inter", "Manrope", sans-serif',
      lineHeight: 1.2,
      wordBreak: 'break-word'
    };

    const getBlockContent = () => {
      switch (block.type) {
        case 'attendee_name':
          return previewData.attendeeName;

        case 'event_title':
          return (block as any).customText || previewData.eventTitle;

        case 'event_date':
          return previewData.eventDate;

        case 'event_time':
          return previewData.eventTime;

        case 'ticket_type':
          const prefix = (block as any).customPrefix || '';
          return `${prefix}${previewData.ticketType}`.trim();

        case 'organization_logo':
          if (previewData.organizationLogo) {
            return (
              <img
                src={previewData.organizationLogo}
                alt="Organization Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            );
          }
          return (block as any).fallbackText || 'ORG LOGO';

        case 'event_logo':
          if (previewData.eventLogo) {
            return (
              <img
                src={previewData.eventLogo}
                alt="Event Logo"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain'
                }}
              />
            );
          }
          return (block as any).fallbackText || 'EVENT LOGO';

        case 'special_access':
          const accessBlock = block as any;
          if (accessBlock.showOnlyForVIP && !previewData.ticketType.toLowerCase().includes('vip')) {
            return '';
          }
          return accessBlock.accessText || previewData.specialAccess || 'SPECIAL ACCESS';

        case 'custom_text':
          return (block as any).text || 'Custom Text';

        case 'qr_code':
          const qrBlock = block as any;
          const qrData = qrBlock.includeTicketCode ?
            `${previewData.ticketCode}|${previewData.attendeeName}|${previewData.eventTitle}` :
            previewData.ticketCode;

          return (
            <QRCodeSVG
              value={qrData}
              size={Math.min(parseInt(blockStyle.width as string) || 80, parseInt(blockStyle.height as string) || 80)}
              level="M"
              includeMargin={false}
              style={{
                width: '100%',
                height: '100%',
                maxWidth: '100%',
                maxHeight: '100%'
              }}
            />
          );

        default:
          return 'Block';
      }
    };

    // Handle divider line
    if (block.type === 'divider_line') {
      const lineStyle: React.CSSProperties = {
        position: 'absolute',
        left: `${block.position.x}%`,
        top: `${block.position.y}%`,
        width: `${block.size.width}%`,
        height: `${((block as any).lineThickness || 1) * scale}px`,
        backgroundColor: (block as any).lineColor || '#e2e8f0',
        borderRadius: `${(block.style.borderRadius || 0) * scale}px`
      };

      return <div key={block.id} style={lineStyle} />;
    }

    const content = getBlockContent();
    if (!content) return null;

    return (
      <div key={block.id} style={blockStyle}>
        {typeof content === 'string' ? (
          <span style={{
            fontSize: 'inherit',
            fontWeight: 'inherit',
            textAlign: 'inherit',
            width: '100%'
          }}>
            {content}
          </span>
        ) : (
          content
        )}
      </div>
    );
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: `${width}px`,
    height: `${height}px`,
    backgroundColor: background.color || '#ffffff',
    backgroundImage: background.imageUrl ? `url(${background.imageUrl})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
    fontFamily: '"Inter", "Manrope", sans-serif'
  };

  return (
    <div className={className} style={containerStyle}>
      {/* Lanyard hole */}
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
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)',
          zIndex: 10
        }}
      />

      {/* Render all blocks */}
      {blocks.map(renderBlock)}
    </div>
  );
};

export default LanyardPreviewSimple;