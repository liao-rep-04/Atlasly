import { useState } from 'react';
import { Share2, Mail, MessageCircle, Copy, Check, X } from 'lucide-react';

/**
 * Share button that works everywhere: tries the native OS share sheet
 * first (navigator.share — this is what surfaces Messages/iMessage, Mail,
 * WhatsApp, etc. on mobile, and is increasingly supported on desktop
 * Safari/Chrome/Edge too), and falls back to an explicit Email/Text/Copy
 * modal on browsers without it (most desktop Chrome/Firefox today).
 */
const ShareButton = ({
  title = 'Atlasly',
  text = 'Check out Atlasly — plan trips with maps, photos, and more!',
  url,
  className = 'btn-outline',
  label = 'Share',
  iconOnly = false,
}) => {
  const [showFallback, setShowFallback] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = url || window.location.origin;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url: shareUrl });
        return;
      } catch (err) {
        if (err.name === 'AbortError') return; // user dismissed the native sheet
        // Some browsers advertise navigator.share but reject certain payloads —
        // fall through to the manual modal rather than leaving the user stuck
      }
    }
    setShowFallback(true);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (permissions, non-HTTPS); the mailto/sms
      // links below still work, so this failing silently is acceptable
    }
  };

  const mailtoHref = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(
    `${text}\n\n${shareUrl}`
  )}`;
  const smsHref = `sms:?body=${encodeURIComponent(`${text} ${shareUrl}`)}`;

  return (
    <>
      <button className={className} onClick={handleShare} title="Share">
        <Share2 className={`w-4 h-4 ${iconOnly ? '' : 'mr-2'}`} />
        {!iconOnly && label}
      </button>

      {showFallback && (
        <div
          className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
          onClick={() => setShowFallback(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Share</h3>
              <button
                className="p-1 text-neutral-400 hover:text-neutral-700"
                onClick={() => setShowFallback(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-2">
              <a href={mailtoHref} className="btn-outline w-full justify-start">
                <Mail className="w-4 h-4 mr-2" />
                Email
              </a>
              <a href={smsHref} className="btn-outline w-full justify-start">
                <MessageCircle className="w-4 h-4 mr-2" />
                Text Message
              </a>
              <button className="btn-outline w-full justify-start" onClick={handleCopy}>
                {copied ? (
                  <Check className="w-4 h-4 mr-2 text-green-600" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ShareButton;
