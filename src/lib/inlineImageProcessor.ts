// Utility for processing images to be embedded inline with Resend
export interface InlineImageAttachment {
  content_id: string;
  filename: string;
  path?: string; // Remote URL
  content?: Buffer; // Local content
}

export class InlineImageProcessor {
  private imageCounter = 0;

  // Generate unique content ID for each image
  private generateContentId(prefix: string = 'img'): string {
    this.imageCounter++;
    return `${prefix}-${Date.now()}-${this.imageCounter}`;
  }

  // Process a logo URL to be used as inline image
  public processLogoForInline(logoUrl: string | null): { 
    contentId: string | null; 
    attachment: InlineImageAttachment | null;
    cidUrl: string | null;
  } {
    if (!logoUrl) {
      return { contentId: null, attachment: null, cidUrl: null };
    }

    // Check if it's a valid URL
    try {
      new URL(logoUrl);
    } catch {
      // Invalid URL, don't process
      return { contentId: null, attachment: null, cidUrl: null };
    }

    const contentId = this.generateContentId('logo');
    const attachment: InlineImageAttachment = {
      content_id: contentId,
      filename: `logo-${contentId}.png`,
      path: logoUrl
    };

    return {
      contentId,
      attachment,
      cidUrl: `cid:${contentId}`
    };
  }

  // Replace image URLs in HTML with CID references
  public replaceImageUrlsWithCids(
    html: string, 
    imageMap: Map<string, string>
  ): string {
    let processedHtml = html;
    
    imageMap.forEach((cidUrl, originalUrl) => {
      // Replace all occurrences of the original URL with the CID URL
      const regex = new RegExp(originalUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
      processedHtml = processedHtml.replace(regex, cidUrl);
    });

    return processedHtml;
  }

  // Process all images in email content for inline embedding
  public processEmailImages(
    html: string,
    logoUrl: string | null
  ): {
    processedHtml: string;
    attachments: InlineImageAttachment[];
  } {
    const attachments: InlineImageAttachment[] = [];
    const imageMap = new Map<string, string>();

    // Process logo if provided
    if (logoUrl) {
      const logoResult = this.processLogoForInline(logoUrl);
      if (logoResult.contentId && logoResult.attachment && logoResult.cidUrl) {
        attachments.push(logoResult.attachment);
        imageMap.set(logoUrl, logoResult.cidUrl);
      }
    }

    // Find and process other images in the HTML
    const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]*>/gi;
    let match;
    
    while ((match = imgRegex.exec(html)) !== null) {
      const imageUrl = match[1];
      
      // Skip if we already processed this image (like the logo)
      if (imageMap.has(imageUrl)) {
        continue;
      }

      // Only process external URLs (not data: URLs or cid: URLs)
      if (imageUrl.startsWith('http') && this.isValidImageUrl(imageUrl)) {
        const contentId = this.generateContentId('image');
        const attachment: InlineImageAttachment = {
          content_id: contentId,
          filename: `image-${contentId}.png`,
          path: imageUrl
        };

        attachments.push(attachment);
        imageMap.set(imageUrl, `cid:${contentId}`);
      }
    }

    // Replace URLs with CID references
    const processedHtml = this.replaceImageUrlsWithCids(html, imageMap);

    return {
      processedHtml,
      attachments
    };
  }

  // Validate if URL looks like a valid image
  private isValidImageUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();
      
      // Check for common image extensions
      return /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(pathname) ||
             // Or common image hosting patterns
             /\/(image|img|photo|picture|media)/i.test(pathname) ||
             // Or if the URL suggests it's an image
             parsed.searchParams.has('format') ||
             parsed.searchParams.has('w') && parsed.searchParams.has('h');
    } catch {
      return false;
    }
  }

  // Reset counter for new email processing
  public reset(): void {
    this.imageCounter = 0;
  }
}

// Default processor instance
export const inlineImageProcessor = new InlineImageProcessor();